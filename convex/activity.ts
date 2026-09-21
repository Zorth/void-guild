import { query, mutation, internalMutation } from './_generated/server'
import { v } from 'convex/values'

export const listActivity = query({
  args: {},
  handler: async (ctx) => {
    // Take recent items first to avoid scanning large unindexed collections
    const items = await ctx.db
      .query('activity')
      .order('desc')
      .take(25)

    return items
      .filter((item) => item.type !== 'session_created')
      .slice(0, 7)
  }
})

export const logActivity = internalMutation({
  args: {
    type: v.string(),
    message: v.string(),
    userId: v.optional(v.string()),
    metadata: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('activity', {
      type: args.type,
      message: args.message,
      userId: args.userId,
      metadata: args.metadata,
    })

    // Prune old activity logs beyond the latest 50 entries to prevent database growth
    const allLogs = await ctx.db
      .query('activity')
      .order('desc')
      .take(100)

    if (allLogs.length > 50) {
      const logsToDelete = allLogs.slice(50)
      for (const log of logsToDelete) {
        await ctx.db.delete(log._id)
      }
    }
  }
})
