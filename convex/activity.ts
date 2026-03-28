import { query, mutation, internalMutation } from './_generated/server'
import { v } from 'convex/values'

export const listActivity = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('activity')
      .filter((q) => q.neq(q.field('type'), 'session_created'))
      .order('desc')
      .take(7)
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
  }
})
