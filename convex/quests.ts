import { query, mutation, QueryCtx } from './_generated/server'
import { v } from 'convex/values'

/**
 * Checks if the authenticated user has Admin permissions.
 */
async function isAdmin(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return false

  return (
    identity.admin === true ||
    identity.admin === 'true' ||
    (identity.publicMetadata as { admin?: boolean | string } | undefined)?.admin === true ||
    (identity.publicMetadata as { admin?: boolean | string } | undefined)?.admin === 'true'
  )
}

export const createQuest = mutation({
  args: {
    name: v.string(),
    level: v.number(),
    worldId: v.optional(v.id('worlds')),
    description: v.optional(v.string()),
    questgiver: v.optional(v.string()),
    reward: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) {
      throw new Error('Not authenticated')
    }

    const questId = await ctx.db.insert('quests', {
      ...args,
      owner: user.subject,
    })

    return questId
  },
})

export const updateQuest = mutation({
  args: {
    questId: v.id('quests'),
    name: v.string(),
    level: v.number(),
    worldId: v.optional(v.id('worlds')),
    description: v.optional(v.string()),
    questgiver: v.optional(v.string()),
    reward: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) {
      throw new Error('Not authenticated')
    }

    const quest = await ctx.db.get(args.questId)
    if (!quest) {
      throw new Error('Quest not found')
    }

    const isAdminUser = await isAdmin(ctx)
    let isWorldOwner = false
    if (quest.worldId) {
        const world = await ctx.db.get(quest.worldId)
        isWorldOwner = world?.owner === user.subject
    }

    if (quest.owner !== user.subject && !isWorldOwner && !isAdminUser) {
      throw new Error('You do not have permission to update this quest.')
    }

    const { questId, ...updateFields } = args
    await ctx.db.patch(questId, updateFields)
  },
})

export const deleteQuest = mutation({
  args: {
    questId: v.id('quests'),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) {
      throw new Error('Not authenticated')
    }

    const quest = await ctx.db.get(args.questId)
    if (!quest) {
      throw new Error('Quest not found')
    }

    const isAdminUser = await isAdmin(ctx)
    let isWorldOwner = false
    if (quest.worldId) {
        const world = await ctx.db.get(quest.worldId)
        isWorldOwner = world?.owner === user.subject
    }

    if (quest.owner !== user.subject && !isWorldOwner && !isAdminUser) {
      throw new Error('You do not have permission to delete this quest.')
    }

    await ctx.db.delete(args.questId)
  },
})

export const getQuestsByWorld = query({
  args: { worldId: v.optional(v.id('worlds')) },
  handler: async (ctx, args) => {
    const worldQuests = args.worldId 
        ? await ctx.db
            .query('quests')
            .withIndex('by_worldId', (q) => q.eq('worldId', args.worldId))
            .collect()
        : []
    
    const worldlessQuests = await ctx.db
        .query('quests')
        .withIndex('by_worldId', (q) => q.eq('worldId', undefined))
        .collect()

    return [...worldQuests, ...worldlessQuests].sort((a, b) => {
        if (a.level === 0 && b.level !== 0) return -1
        if (a.level !== 0 && b.level === 0) return 1
        return a.level - b.level
    })
  },
})

export const listAllQuests = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('quests').collect()
  },
})
