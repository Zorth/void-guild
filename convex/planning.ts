import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { isGameMaster } from './roles'

export const getAvailabilityForMonth = query({
  args: { 
    startOfMonth: v.number(),
    endOfMonth: v.number()
  },
  handler: async (ctx, args) => {
    const rawAvailability = await ctx.db
      .query('availability')
      .withIndex('by_date', (q) => 
        q.gte('date', args.startOfMonth).lte('date', args.endOfMonth)
      )
      .collect()

    const uniqueUserIds = Array.from(new Set(rawAvailability.map((a) => a.userId)))
    const users = await Promise.all(
      uniqueUserIds.map((userId) =>
        ctx.db
          .query('users')
          .withIndex('by_userId', (q) => q.eq('userId', userId))
          .first()
      )
    )

    const userMap = new Map<string, boolean>()
    uniqueUserIds.forEach((uid, i) => {
      const u = users[i]
      if (u && u.isGM !== undefined) {
        userMap.set(uid, u.isGM)
      }
    })

    return rawAvailability.map((a) => {
      const dynamicIsGM = userMap.has(a.userId) ? userMap.get(a.userId)! : Boolean(a.isGM)
      return {
        ...a,
        isGM: dynamicIsGM,
      }
    })
  }
})

/**
 * Periodically called via crons to delete availability records older than 1 day.
 */
export const cleanupOldAvailability = mutation({
    args: {},
    handler: async (ctx) => {
        const yesterday = new Date();
        yesterday.setHours(0, 0, 0, 0);
        yesterday.setDate(yesterday.getDate() - 1);
        const threshold = yesterday.getTime();

        const oldRecords = await ctx.db
            .query('availability')
            .withIndex('by_date', (q) => q.lt('date', threshold))
            .collect();

        for (const record of oldRecords) {
            await ctx.db.delete(record._id);
        }
        
        return oldRecords.length;
    }
})

/**
 * Removes availability records for a user on the calendar day of a given timestamp.
 * Matches by Europe/Brussels calendar day within ±36 hours, or exact timestamp match.
 */
export async function removeUserAvailabilityOnDate(
  ctx: { db: any },
  userId: string,
  targetTimestamp?: number
) {
  if (!targetTimestamp) return

  const targetDate = new Date(targetTimestamp)
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels' })
  const targetDayStr = formatter.format(targetDate)

  const windowMs = 36 * 60 * 60 * 1000
  const minDate = targetTimestamp - windowMs
  const maxDate = targetTimestamp + windowMs

  const userAvails = await ctx.db
    .query('availability')
    .withIndex('by_user_date', (q: any) =>
      q.eq('userId', userId).gte('date', minDate).lte('date', maxDate)
    )
    .collect()

  for (const record of userAvails) {
    const recordDayStr = formatter.format(new Date(record.date))
    if (recordDayStr === targetDayStr || record.date === targetTimestamp) {
      await ctx.db.delete(record._id)
    }
  }
}

export const toggleAvailability = mutation({
  args: { date: v.number() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const existing = await ctx.db
      .query('availability')
      .withIndex('by_user_date', (q) => 
        q.eq('userId', identity.subject).eq('date', args.date)
      )
      .unique()

    if (existing) {
      await ctx.db.delete(existing._id)
    } else {
      const isGM = await isGameMaster(ctx)
      
      let displayName = identity.givenName;
      if (displayName && identity.familyName) {
        displayName += ` ${identity.familyName.charAt(0).toUpperCase()}.`;
      }
      if (!displayName) {
        displayName = (identity.username || identity.nickname || identity.name || 'Anonymous') as string;
      }

      await ctx.db.insert('availability', {
        userId: identity.subject,
        date: args.date,
        username: displayName,
        isGM,
      })
    }
  }
})

/**
 * Returns a summary of availability for the next 2 weeks, finding:
 * 1. The next date with at least 4 players (inc. 1 GM).
 * 2. The date with the most total availability.
 */
export const getPlanningSummary = query({
    args: {},
    handler: async (ctx) => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const startTime = now.getTime();
        const twoWeeksLater = startTime + (14 * 24 * 60 * 60 * 1000);

        const availability = await ctx.db
            .query('availability')
            .withIndex('by_date', (q) => q.gte('date', startTime).lte('date', twoWeeksLater))
            .collect();

        const uniqueUserIds = Array.from(new Set(availability.map((a) => a.userId)))
        const users = await Promise.all(
          uniqueUserIds.map((userId) =>
            ctx.db
              .query('users')
              .withIndex('by_userId', (q) => q.eq('userId', userId))
              .first()
          )
        )
        const userMap = new Map<string, boolean>()
        uniqueUserIds.forEach((uid, i) => {
          const u = users[i]
          if (u && u.isGM !== undefined) {
            userMap.set(uid, u.isGM)
          }
        })

        // Group by date
        const byDate = new Map<number, { date: number, users: string[], gms: string[] }>();
        for (const record of availability) {
            const entry = byDate.get(record.date) || { date: record.date, users: [], gms: [] };
            entry.users.push(record.username);
            const dynamicIsGM = userMap.has(record.userId) ? userMap.get(record.userId)! : Boolean(record.isGM);
            if (dynamicIsGM) entry.gms.push(record.username);
            byDate.set(record.date, entry);
        }

        const sortedDates = Array.from(byDate.values()).sort((a, b) => a.date - b.date);

        // 1. Next Available: 4+ people, 1+ GM
        const nextAvailable = sortedDates.find(d => d.users.length >= 4 && d.gms.length >= 1);

        // 2. Most Available: Max total users
        let mostAvailable = null;
        let maxUsers = 0;
        for (const d of sortedDates) {
            if (d.users.length > maxUsers) {
                maxUsers = d.users.length;
                mostAvailable = d;
            }
        }

        return {
            nextAvailable: nextAvailable ? {
                date: nextAvailable.date,
                count: nextAvailable.users.length,
                gmCount: nextAvailable.gms.length,
                users: nextAvailable.users
            } : null,
            mostAvailable: mostAvailable ? {
                date: mostAvailable.date,
                count: mostAvailable.users.length,
                gmCount: mostAvailable.gms.length,
                users: mostAvailable.users
            } : null
        };
    }
})

export const getUserAvailability = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []

    return await ctx.db
      .query('availability')
      .withIndex('by_user_date', (q) => q.eq('userId', identity.subject))
      .collect()
  }
})

/**
 * Repairs availability records where isGM does not match the user's actual isGM flag.
 */
export const repairAvailabilityGMStatus = mutation({
  args: {},
  handler: async (ctx) => {
    const allAvailability = await ctx.db.query('availability').collect()
    let updatedCount = 0

    const uniqueUserIds = Array.from(new Set(allAvailability.map((a) => a.userId)))
    const userDocs = await Promise.all(
      uniqueUserIds.map((uid) =>
        ctx.db
          .query('users')
          .withIndex('by_userId', (q) => q.eq('userId', uid))
          .first()
      )
    )
    const userMap = new Map<string, boolean>()
    uniqueUserIds.forEach((uid, i) => {
      const u = userDocs[i]
      if (u && u.isGM !== undefined) {
        userMap.set(uid, u.isGM)
      }
    })

    for (const rec of allAvailability) {
      if (userMap.has(rec.userId)) {
        const actualGM = userMap.get(rec.userId)!
        if (rec.isGM !== actualGM) {
          await ctx.db.patch(rec._id, { isGM: actualGM })
          updatedCount++
        }
      }
    }

    return { updatedCount }
  },
})
