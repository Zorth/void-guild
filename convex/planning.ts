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
      .filter((q) => 
        q.and(
          q.gte(q.field('date'), args.startOfMonth),
          q.lte(q.field('date'), args.endOfMonth)
        )
      )
      .collect()
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
