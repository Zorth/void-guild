import { query, mutation, QueryCtx } from './_generated/server'
import { v } from 'convex/values'

/**
 * Checks if the authenticated user has Admin permissions.
 */
async function isAdmin(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return false
  
  // We prioritize the 'admin' claim from the JWT token (configured in Clerk JWT templates).
  return (
    identity.admin === true ||
    identity.admin === 'true' ||
    (identity.publicMetadata as { admin?: boolean | string } | undefined)?.admin === true ||
    (identity.publicMetadata as { admin?: boolean | string } | undefined)?.admin === 'true'
  )
}

export const listCharacters = query({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) {
      return null
    }
    const characters = await ctx.db
      .query('characters')
      .filter((q) => q.eq(q.field('userId'), user.subject))
      .collect()
    
    return characters.sort((a, b) => (b.lvl * 1000 + b.xp) - (a.lvl * 1000 + a.xp))
  },
})

export const listAllCharacters = query({
  args: {},
  handler: async (ctx) => {
    const isAdminUser = await isAdmin(ctx)
    if (!isAdminUser) {
      throw new Error('Only admins can list all characters')
    }
    const characters = await ctx.db.query('characters').collect()
    return characters.sort((a, b) => a.name.localeCompare(b.name))
  },
})

export const createCharacter = mutation({
  args: {
    name: v.string(),
    ancestry: v.optional(v.string()),
    class: v.optional(v.string()),
    websiteLink: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) {
      throw new Error('Not authenticated')
    }
    await ctx.db.insert('characters', {
      name: args.name,
      ancestry: args.ancestry,
      class: args.class,
      websiteLink: args.websiteLink,
      userId: user.subject,
      lvl: 1,
      xp: 0,
    })
  },
})

export const updateCharacter = mutation({
  args: {
    characterId: v.id('characters'),
    ancestry: v.optional(v.string()),
    class: v.optional(v.string()),
    websiteLink: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) {
      throw new Error('Not authenticated')
    }
    const character = await ctx.db.get(args.characterId)
    if (!character || character.userId !== user.subject) {
      throw new Error('Character not found or you do not have permission to edit it.')
    }
    await ctx.db.patch(args.characterId, {
      ancestry: args.ancestry,
      class: args.class,
      websiteLink: args.websiteLink,
    })
  },
})

export const adminUpdateCharacter = mutation({
  args: {
    characterId: v.id('characters'),
    name: v.string(),
    lvl: v.number(),
    xp: v.number(),
    ancestry: v.optional(v.string()),
    class: v.optional(v.string()),
    websiteLink: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const isAdminUser = await isAdmin(ctx)
    if (!isAdminUser) {
      throw new Error('Only admins can update any character')
    }
    await ctx.db.patch(args.characterId, {
      name: args.name,
      lvl: args.lvl,
      xp: args.xp,
      ancestry: args.ancestry,
      class: args.class,
      websiteLink: args.websiteLink,
    })
  },
})

export const deleteCharacter = mutation({
  args: {
    characterId: v.id('characters'),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) {
      throw new Error('Not authenticated')
    }
    const character = await ctx.db.get(args.characterId)
    if (!character || character.userId !== user.subject) {
      throw new Error('Character not found or you do not have permission to delete it.')
    }
    await ctx.db.delete(args.characterId)
  },
})
