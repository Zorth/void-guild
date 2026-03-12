import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

async function isGameMaster(ctx: any) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return false
  
  // Reuse logic from sessions.ts or just check here for simplicity
  return (
    identity.gamemaster === true ||
    identity.gamemaster === 'true' ||
    (identity.publicMetadata as { gamemaster?: boolean | string } | undefined)?.gamemaster === true ||
    (identity.publicMetadata as { gamemaster?: boolean | string } | undefined)?.gamemaster === 'true'
  )
}

export const getAvailabilityForMonth = query({
  args: { 
    startOfMonth: v.number(),
    endOfMonth: v.number()
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('availability')
      .withIndex('by_date', (q) => 
        q.gte('date', args.startOfMonth).lte('date', args.endOfMonth)
      )
      .collect()
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
      await ctx.db.insert('availability', {
        userId: identity.subject,
        date: args.date,
        username: identity.username || identity.nickname || identity.name || 'Anonymous',
        isGM,
      })
    }
  }
})
