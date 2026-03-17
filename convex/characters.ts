import { query, mutation, QueryCtx } from './_generated/server'
import { v } from 'convex/values'
import { internal } from './_generated/api'

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

export const listCharactersByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const characters = await ctx.db
      .query('characters')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
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

export const listAllCharactersPublic = query({
  args: {},
  handler: async (ctx) => {
    const characters = await ctx.db.query('characters').collect()
    return characters
  },
})

export const getCharactersByIds = query({
  args: { ids: v.array(v.id('characters')) },
  handler: async (ctx, args) => {
    const characters = await Promise.all(args.ids.map((id) => ctx.db.get(id)))
    return characters.filter((c) => c !== null)
  },
})

export const createCharacter = mutation({
  args: {
    name: v.string(),
    ancestry: v.optional(v.string()),
    class: v.optional(v.string()),
    websiteLink: v.optional(v.string()),
    system: v.optional(v.union(v.literal('PF'), v.literal('DnD'))),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) {
      throw new Error('Not authenticated')
    }
    const characterId = await ctx.db.insert('characters', {
      name: args.name,
      ancestry: args.ancestry,
      class: args.class,
      websiteLink: args.websiteLink,
      userId: user.subject,
      lvl: 1,
      xp: 0,
      rank: 'none',
      system: args.system || 'PF',
    })

    await ctx.scheduler.runAfter(0, internal.activity.logActivity, {
        type: 'character_created',
        message: `{user} created a new character: ${args.name}!`,
        userId: user.subject,
        metadata: { characterId, name: args.name }
    })
  },
})

export const updateCharacter = mutation({
  args: {
    characterId: v.id('characters'),
    ancestry: v.optional(v.string()),
    class: v.optional(v.string()),
    websiteLink: v.optional(v.string()),
    system: v.optional(v.union(v.literal('PF'), v.literal('DnD'))),
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
      system: args.system,
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
    rank: v.optional(v.string()),
    system: v.optional(v.union(v.literal('PF'), v.literal('DnD'))),
  },
  handler: async (ctx, args) => {
    const isAdminUser = await isAdmin(ctx)
    if (!isAdminUser) {
      throw new Error('Only admins can update any character')
    }

    const oldCharacter = await ctx.db.get(args.characterId)

    await ctx.db.patch(args.characterId, {
      name: args.name,
      lvl: args.lvl,
      xp: args.xp,
      ancestry: args.ancestry,
      class: args.class,
      websiteLink: args.websiteLink,
      rank: args.rank,
      system: args.system,
    })

    if (args.rank && args.rank !== 'none' && args.rank !== oldCharacter?.rank) {
        const rankName = args.rank.charAt(0).toUpperCase() + args.rank.slice(1);
        await ctx.scheduler.runAfter(0, internal.activity.logActivity, {
            type: 'rank_promotion',
            message: `${args.name} was promoted to ${rankName}!`,
            metadata: { characterId: args.characterId, rank: args.rank }
        })

        const isGuildmaster = args.rank === 'guildmaster';
        await ctx.scheduler.runAfter(0, internal.discord.sendActivityToDiscord, {
            embeds: [{
                title: isGuildmaster ? "👑 New Guildmaster!" : "🏅 New Journeyman!",
                description: `**${args.name}** has been promoted to the rank of **${rankName}**!`,
                color: isGuildmaster ? 0xf59e0b : 0xa855f7, // Amber vs Purple
                timestamp: new Date().toISOString(),
            }]
        })
    }

    if (oldCharacter && args.lvl > oldCharacter.lvl) {
        await ctx.scheduler.runAfter(0, internal.activity.logActivity, {
            type: 'level_up',
            message: `${args.name} reached Level ${args.lvl}!`,
            metadata: { characterId: args.characterId, newLvl: args.lvl }
        })
        await ctx.scheduler.runAfter(0, internal.discord.sendActivityToDiscord, {
            message: `**${args.name}** just reached level **${args.lvl}**!`
        })
    }
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
