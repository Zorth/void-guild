import { query, mutation, QueryCtx } from './_generated/server'
import { v } from 'convex/values'
import { isAdmin } from './roles'
export const createQuest = mutation({
  args: {
    name: v.string(),
    levelPF: v.optional(v.union(v.number(), v.null())),
    levelDnD: v.optional(v.union(v.number(), v.null())),
    worldId: v.optional(v.id('worlds')),
    description: v.optional(v.string()),
    questgiver: v.optional(v.string()),
    reward: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    characterId: v.optional(v.id('characters')),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) {
      throw new Error('Not authenticated')
    }

    if (args.characterId) {
      const character = await ctx.db.get(args.characterId)
      if (!character || character.userId !== user.subject) {
        throw new Error('You do not own this character')
      }
      if (!args.worldId) {
        throw new Error('Character quests require selecting a world.')
      }
    }

    const { levelPF, levelDnD, ...otherFields } = args

    const questId = await ctx.db.insert('quests', {
      ...otherFields,
      levelPF: levelPF === null ? undefined : levelPF,
      levelDnD: levelDnD === null ? undefined : levelDnD,
      owner: user.subject,
      isCompleted: false,
    })

    return questId
  },
})

export const updateQuest = mutation({
  args: {
    questId: v.id('quests'),
    name: v.string(),
    levelPF: v.union(v.number(), v.null()),
    levelDnD: v.union(v.number(), v.null()),
    worldId: v.optional(v.id('worlds')),
    description: v.optional(v.string()),
    questgiver: v.optional(v.string()),
    reward: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    characterId: v.optional(v.id('characters')),
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

    const { questId, levelPF, levelDnD, ...otherFields } = args
    
    await ctx.db.replace(questId, {
        ...quest,
        ...otherFields,
        levelPF: levelPF === null ? undefined : levelPF,
        levelDnD: levelDnD === null ? undefined : levelDnD,
        // Clear deprecated level if PF level is explicitly unset
        level: levelPF === null ? undefined : quest.level,
    })
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

    const activeQuests = [...worldQuests, ...worldlessQuests].filter(q => !q.isCompleted)
    
    return activeQuests.sort((a, b) => {
        const aLvl = a.levelPF ?? a.levelDnD ?? a.level ?? 0;
        const bLvl = b.levelPF ?? b.levelDnD ?? b.level ?? 0;

        if (aLvl === 0 && bLvl !== 0) return -1
        if (aLvl !== 0 && bLvl === 0) return 1
        return aLvl - bLvl
    })
  },
})

export const listAllQuests = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query('quests').collect()
    return all.filter(q => !q.isCompleted)
  },
})

export const getCharacterQuests = query({
  args: { characterId: v.optional(v.id('characters')) },
  handler: async (ctx, args) => {
    if (args.characterId) {
      const quests = await ctx.db
        .query('quests')
        .withIndex('by_characterId', (q) => q.eq('characterId', args.characterId))
        .collect()

      const decoratedQuests = await Promise.all(
        quests.map(async (q) => {
          let worldName = 'The Void'
          if (q.worldId) {
            const w = await ctx.db.get(q.worldId)
            if (w) worldName = w.name
          }
          let charName = ''
          if (q.characterId) {
            const c = await ctx.db.get(q.characterId)
            if (c) charName = c.name
          }
          return {
            ...q,
            worldName,
            characterName: charName,
          }
        })
      )

      return decoratedQuests
    }

    // Return all character quests
    const allQuests = await ctx.db.query('quests').collect()
    const charQuests = allQuests.filter(q => q.characterId !== undefined)

    return await Promise.all(
      charQuests.map(async (q) => {
        let worldName = 'The Void'
        if (q.worldId) {
          const w = await ctx.db.get(q.worldId)
          if (w) worldName = w.name
        }
        let charName = ''
        if (q.characterId) {
          const c = await ctx.db.get(q.characterId)
          if (c) charName = c.name
        }
        return {
          ...q,
          worldName,
          characterName: charName,
        }
      })
    )
  },
})

