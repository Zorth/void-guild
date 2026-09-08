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

    let characterRank: string | undefined = undefined
    let isSponsored = false
    let sponsoredAmount: string | undefined = undefined

    if (args.characterId) {
      const character = await ctx.db.get(args.characterId)
      if (!character || character.userId !== user.subject) {
        throw new Error('You do not own this character')
      }
      if (!args.worldId) {
        throw new Error('Character quests require selecting a world.')
      }

      characterRank = character.rank || 'none'
      const questLevel = args.levelPF ?? args.levelDnD ?? 0
      const maxSponsoredLevel = Math.max(0, (character.lvl || 1) - 4)

      // Journeyman & Guildmaster perk: quests up to level - 4 get 1/5th (20%) sponsored by Guild of the Void
      if ((characterRank === 'journeyman' || characterRank === 'guildmaster') && questLevel <= maxSponsoredLevel) {
        isSponsored = true
        if (args.reward) {
          // Attempt parsing gold / silver / currency amount
          // e.g. "5000 SP", "5,000 SP", "100 GP", "500 gold"
          const rewardClean = args.reward.replace(/,/g, '')
          const match = rewardClean.match(/(\d+(?:\.\d+)?)\s*(sp|gp|cp|pp|gold|silver|copper|platinum)?/i)
          if (match) {
            const num = parseFloat(match[1])
            const unit = match[2] ? match[2].toUpperCase() : 'GP'
            const sponsorVal = Math.round(num / 5)
            sponsoredAmount = `${sponsorVal.toLocaleString()} ${unit}`
          } else {
            sponsoredAmount = '20% (1/5th) reimbursed by Guild'
          }
        } else {
          sponsoredAmount = '20% (1/5th) reimbursed by Guild'
        }
      }
    }

    const { levelPF, levelDnD, ...otherFields } = args

    const questId = await ctx.db.insert('quests', {
      ...otherFields,
      levelPF: levelPF === null ? undefined : levelPF,
      levelDnD: levelDnD === null ? undefined : levelDnD,
      owner: user.subject,
      characterRank,
      isSponsored,
      sponsoredAmount,
      reimbursementClaimed: false,
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

    let characterRank = quest.characterRank
    let isSponsored = quest.isSponsored ?? false
    let sponsoredAmount = quest.sponsoredAmount

    if (args.characterId) {
      const character = await ctx.db.get(args.characterId)
      if (character) {
        characterRank = character.rank || 'none'
        const questLevel = (args.levelPF !== null ? args.levelPF : undefined) ?? (args.levelDnD !== null ? args.levelDnD : undefined) ?? 0
        const maxSponsoredLevel = Math.max(0, (character.lvl || 1) - 4)

        if ((characterRank === 'journeyman' || characterRank === 'guildmaster') && questLevel <= maxSponsoredLevel) {
          isSponsored = true
          if (args.reward) {
            const rewardClean = args.reward.replace(/,/g, '')
            const match = rewardClean.match(/(\d+(?:\.\d+)?)\s*(sp|gp|cp|pp|gold|silver|copper|platinum)?/i)
            if (match) {
              const num = parseFloat(match[1])
              const unit = match[2] ? match[2].toUpperCase() : 'GP'
              const sponsorVal = Math.round(num / 5)
              sponsoredAmount = `${sponsorVal.toLocaleString()} ${unit}`
            } else {
              sponsoredAmount = '20% (1/5th) reimbursed by Guild'
            }
          } else {
            sponsoredAmount = '20% (1/5th) reimbursed by Guild'
          }
        } else {
          isSponsored = false
          sponsoredAmount = undefined
        }
      }
    }

    const { questId, levelPF, levelDnD, ...otherFields } = args
    
    await ctx.db.replace(questId, {
        ...quest,
        ...otherFields,
        levelPF: levelPF === null ? undefined : levelPF,
        levelDnD: levelDnD === null ? undefined : levelDnD,
        // Clear deprecated level if PF level is explicitly unset
        level: levelPF === null ? undefined : quest.level,
        characterRank,
        isSponsored,
        sponsoredAmount,
    })
  },
})

export const toggleQuestReimbursementClaimed = mutation({
  args: {
    questId: v.id('quests'),
    characterId: v.id('characters'),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Not authenticated')

    const quest = await ctx.db.get(args.questId)
    if (!quest) throw new Error('Quest not found')

    const character = await ctx.db.get(args.characterId)
    if (!character || character.userId !== user.subject || quest.characterId !== args.characterId) {
      throw new Error('You do not own this quest.')
    }

    await ctx.db.patch(args.questId, {
      reimbursementClaimed: !quest.reimbursementClaimed,
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
          let charRank = q.characterRank || 'none'
          let charLvl = 1
          if (q.characterId) {
            const c = await ctx.db.get(q.characterId)
            if (c) {
              charName = c.name
              if (c.rank) charRank = c.rank
              if (c.lvl) charLvl = c.lvl
            }
          }
          return {
            ...q,
            worldName,
            characterName: charName,
            characterRank: charRank,
            characterLevel: charLvl,
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
        let charRank = q.characterRank || 'none'
        let charLvl = 1
        if (q.characterId) {
          const c = await ctx.db.get(q.characterId)
          if (c) {
            charName = c.name
            if (c.rank) charRank = c.rank
            if (c.lvl) charLvl = c.lvl
          }
        }
        return {
          ...q,
          worldName,
          characterName: charName,
          characterRank: charRank,
          characterLevel: charLvl,
        }
      })
    )
  },
})

