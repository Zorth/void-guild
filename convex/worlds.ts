import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

export const getWorldByOwner = query({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) {
      return null
    }
    const world = await ctx.db
      .query('worlds')
      .filter((q) => q.eq(q.field('owner'), user.subject))
      .first()
    return world
  },
})

export const createWorld = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) {
      throw new Error('Not authenticated')
    }
    // Check if the user already owns a world
    const existingWorld = await ctx.db
      .query('worlds')
      .filter((q) => q.eq(q.field('owner'), user.subject))
      .first()
    if (existingWorld) {
      throw new Error('You can only own one world.')
    }

    await ctx.db.insert('worlds', {
      name: args.name,
      owner: user.subject,
      link: undefined, // Initially no link
    })
  },
})

export const renameWorld = mutation({
  args: {
    worldId: v.id('worlds'),
    newName: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) {
      throw new Error('Not authenticated')
    }
    const world = await ctx.db.get(args.worldId)
    if (!world || world.owner !== user.subject) {
      throw new Error('World not found or you do not have permission to rename it.')
    }
    await ctx.db.patch(args.worldId, { name: args.newName })
  },
})
