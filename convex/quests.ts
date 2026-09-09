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
    rewardType: v.optional(v.union(v.literal('party'), v.literal('per_person'))),
    rewardMoneyGP: v.optional(v.number()),
    rewardOther: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    characterId: v.optional(v.id('characters')),
    isSuggested: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) {
      throw new Error('Not authenticated')
    }

    let characterRank: string | undefined = undefined
    let isSponsored = false
    let sponsoredAmount: string | undefined = undefined
    let netCost: string | undefined = undefined

    const isSuggested = args.isSuggested ?? false
    let suggestionStatus: 'pending' | 'approved' | 'rejected' | undefined = undefined

    // Round rewardMoneyGP to 2 decimals if provided
    const roundedMoneyGP = args.rewardMoneyGP !== undefined && args.rewardMoneyGP !== null
      ? Math.round(args.rewardMoneyGP * 100) / 100
      : undefined

    // Determine final reward string
    let finalReward = args.reward
    if (roundedMoneyGP !== undefined || args.rewardOther) {
      const parts: string[] = []
      if (roundedMoneyGP !== undefined && roundedMoneyGP > 0) {
        const moneyFormatted = roundedMoneyGP % 1 === 0
          ? `${roundedMoneyGP.toLocaleString()} GP`
          : `${roundedMoneyGP.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GP`
        const typeSuffix = args.rewardType === 'per_person' ? ' / person' : ''
        parts.push(`${moneyFormatted}${typeSuffix}`)
      }
      if (args.rewardOther && args.rewardOther.trim()) {
        parts.push(args.rewardOther.trim())
      }
      if (parts.length > 0) {
        finalReward = parts.join(' + ')
      }
    }

    if (args.characterId) {
      const character = await ctx.db.get(args.characterId)
      if (!character || character.userId !== user.subject) {
        throw new Error('You do not own this character')
      }
      if (!args.worldId) {
        throw new Error('Character quests require selecting a world.')
      }

      characterRank = character.rank || 'none'

      if (isSuggested) {
        if (characterRank !== 'guildmaster') {
          throw new Error('Only Guildmasters can suggest quests to worlds/the Void Council.')
        }
        suggestionStatus = 'pending'
      } else {
        const questLevel = args.levelPF ?? args.levelDnD ?? 0
        const maxSponsoredLevel = Math.max(0, (character.lvl || 1) - 4)

        // Journeyman & Guildmaster perk: quests up to level - 4 get 1/5th (20%) sponsored by Guild of the Void
        if ((characterRank === 'journeyman' || characterRank === 'guildmaster') && questLevel <= maxSponsoredLevel) {
          isSponsored = true
          if (roundedMoneyGP !== undefined && roundedMoneyGP > 0) {
            const sponsorVal = Math.round((roundedMoneyGP / 5) * 100) / 100
            const netVal = Math.round((roundedMoneyGP - sponsorVal) * 100) / 100
            const formatGP = (n: number) => n % 1 === 0 ? `${n.toLocaleString()} GP` : `${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GP`
            const typeSuffix = args.rewardType === 'per_person' ? ' / person' : ''
            const otherSuffix = args.rewardOther && args.rewardOther.trim() ? ` + ${args.rewardOther.trim()}` : ''
            sponsoredAmount = `${formatGP(sponsorVal)}${typeSuffix}`
            netCost = `${formatGP(netVal)}${typeSuffix}${otherSuffix}`
          } else if (finalReward) {
            const rewardClean = finalReward.replace(/,/g, '')
            const match = rewardClean.match(/(\d+(?:\.\d+)?)\s*(sp|gp|cp|pp|gold|silver|copper|platinum)?/i)
            if (match) {
              const num = parseFloat(match[1])
              const unit = match[2] ? match[2].toUpperCase() : 'GP'
              const sponsorVal = Math.round((num / 5) * 100) / 100
              const netVal = Math.round((num - sponsorVal) * 100) / 100
              const typeSuffix = args.rewardType === 'per_person' ? ' / person' : ''
              sponsoredAmount = `${sponsorVal.toLocaleString()} ${unit}${typeSuffix}`
              netCost = `${netVal.toLocaleString()} ${unit}${typeSuffix}`
            } else {
              sponsoredAmount = '20% (1/5th) reimbursed by Guild'
              netCost = '80% (4/5ths) net cost'
            }
          } else {
            sponsoredAmount = '20% (1/5th) reimbursed by Guild'
            netCost = '80% (4/5ths) net cost'
          }
        }
      }
    }

    const { levelPF, levelDnD, isSuggested: _sug, rewardMoneyGP: _rm, ...otherFields } = args

    const questId = await ctx.db.insert('quests', {
      ...otherFields,
      reward: finalReward,
      rewardType: args.rewardType || 'party',
      rewardMoneyGP: roundedMoneyGP,
      rewardOther: args.rewardOther?.trim(),
      levelPF: levelPF === null ? undefined : levelPF,
      levelDnD: levelDnD === null ? undefined : levelDnD,
      owner: user.subject,
      characterRank,
      isSponsored,
      sponsoredAmount,
      netCost,
      isSuggested,
      suggestionStatus,
      reimbursementClaimed: false,
      paymentClaimed: false,
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
    rewardType: v.optional(v.union(v.literal('party'), v.literal('per_person'))),
    rewardMoneyGP: v.optional(v.number()),
    rewardOther: v.optional(v.string()),
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
    let netCost = quest.netCost

    // Round rewardMoneyGP to 2 decimals if provided
    const roundedMoneyGP = args.rewardMoneyGP !== undefined && args.rewardMoneyGP !== null
      ? Math.round(args.rewardMoneyGP * 100) / 100
      : undefined

    // Determine final reward string
    let finalReward = args.reward
    if (roundedMoneyGP !== undefined || args.rewardOther) {
      const parts: string[] = []
      if (roundedMoneyGP !== undefined && roundedMoneyGP > 0) {
        const moneyFormatted = roundedMoneyGP % 1 === 0
          ? `${roundedMoneyGP.toLocaleString()} GP`
          : `${roundedMoneyGP.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GP`
        const typeSuffix = args.rewardType === 'per_person' ? ' / person' : ''
        parts.push(`${moneyFormatted}${typeSuffix}`)
      }
      if (args.rewardOther && args.rewardOther.trim()) {
        parts.push(args.rewardOther.trim())
      }
      if (parts.length > 0) {
        finalReward = parts.join(' + ')
      }
    }

    if (args.characterId) {
      const character = await ctx.db.get(args.characterId)
      if (character) {
        characterRank = character.rank || 'none'
        const questLevel = (args.levelPF !== null ? args.levelPF : undefined) ?? (args.levelDnD !== null ? args.levelDnD : undefined) ?? 0
        const maxSponsoredLevel = Math.max(0, (character.lvl || 1) - 4)

        if ((characterRank === 'journeyman' || characterRank === 'guildmaster') && questLevel <= maxSponsoredLevel) {
          isSponsored = true
          if (roundedMoneyGP !== undefined && roundedMoneyGP > 0) {
            const sponsorVal = Math.round((roundedMoneyGP / 5) * 100) / 100
            const netVal = Math.round((roundedMoneyGP - sponsorVal) * 100) / 100
            const formatGP = (n: number) => n % 1 === 0 ? `${n.toLocaleString()} GP` : `${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GP`
            const typeSuffix = args.rewardType === 'per_person' ? ' / person' : ''
            const otherSuffix = args.rewardOther && args.rewardOther.trim() ? ` + ${args.rewardOther.trim()}` : ''
            sponsoredAmount = `${formatGP(sponsorVal)}${typeSuffix}`
            netCost = `${formatGP(netVal)}${typeSuffix}${otherSuffix}`
          } else if (finalReward) {
            const rewardClean = finalReward.replace(/,/g, '')
            const match = rewardClean.match(/(\d+(?:\.\d+)?)\s*(sp|gp|cp|pp|gold|silver|copper|platinum)?/i)
            if (match) {
              const num = parseFloat(match[1])
              const unit = match[2] ? match[2].toUpperCase() : 'GP'
              const sponsorVal = Math.round((num / 5) * 100) / 100
              const netVal = Math.round((num - sponsorVal) * 100) / 100
              const typeSuffix = args.rewardType === 'per_person' ? ' / person' : ''
              sponsoredAmount = `${sponsorVal.toLocaleString()} ${unit}${typeSuffix}`
              netCost = `${netVal.toLocaleString()} ${unit}${typeSuffix}`
            } else {
              sponsoredAmount = '20% (1/5th) reimbursed by Guild'
              netCost = '80% (4/5ths) net cost'
            }
          } else {
            sponsoredAmount = '20% (1/5th) reimbursed by Guild'
            netCost = '80% (4/5ths) net cost'
          }
        } else {
          isSponsored = false
          sponsoredAmount = undefined
          netCost = undefined
        }
      }
    }

    const { questId, levelPF, levelDnD, rewardMoneyGP: _rm, ...otherFields } = args
    
    await ctx.db.replace(questId, {
        ...quest,
        ...otherFields,
        worldId: args.worldId,
        reward: finalReward,
        rewardType: args.rewardType || quest.rewardType || 'party',
        rewardMoneyGP: roundedMoneyGP !== undefined ? roundedMoneyGP : quest.rewardMoneyGP,
        rewardOther: args.rewardOther !== undefined ? args.rewardOther.trim() : quest.rewardOther,
        levelPF: levelPF === null ? undefined : levelPF,
        levelDnD: levelDnD === null ? undefined : levelDnD,
        // Clear deprecated level if PF level is explicitly unset
        level: levelPF === null ? undefined : quest.level,
        characterRank,
        isSponsored,
        sponsoredAmount,
        netCost,
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
    const isAdminUser = await isAdmin(ctx)
    if (!character || (character.userId !== user.subject && !isAdminUser) || quest.characterId !== args.characterId) {
      throw new Error('You do not own this quest.')
    }

    await ctx.db.patch(args.questId, {
      reimbursementClaimed: !quest.reimbursementClaimed,
    })
  },
})

export const toggleQuestPaymentClaimed = mutation({
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
      paymentClaimed: !quest.paymentClaimed,
    })
  },
})

export const approveSuggestedQuest = mutation({
  args: {
    questId: v.id('quests'),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Not authenticated')

    const quest = await ctx.db.get(args.questId)
    if (!quest) throw new Error('Quest not found')
    if (!quest.worldId) throw new Error('Quest has no associated world')

    const world = await ctx.db.get(quest.worldId)
    const isAdminUser = await isAdmin(ctx)
    if (!world || (world.owner !== user.subject && !isAdminUser)) {
      throw new Error('Only the world owner or an admin can approve suggested quests.')
    }

    // When approved, it becomes an official world quest paid in full by The Void (free of charge to character/poster)
    await ctx.db.patch(args.questId, {
      suggestionStatus: 'approved',
      isSuggested: false, // Now an official active quest on the world board
      isSponsored: true,
      sponsoredAmount: quest.reward ? `${quest.reward} (100% Paid in Full by The Void)` : 'Paid in Full by The Void',
      netCost: '0 GP (Free of charge)',
    })
  },
})

export const rejectSuggestedQuest = mutation({
  args: {
    questId: v.id('quests'),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Not authenticated')

    const quest = await ctx.db.get(args.questId)
    if (!quest) throw new Error('Quest not found')
    if (!quest.worldId) throw new Error('Quest has no associated world')

    const world = await ctx.db.get(quest.worldId)
    const isAdminUser = await isAdmin(ctx)
    if (!world || (world.owner !== user.subject && !isAdminUser)) {
      throw new Error('Only the world owner or an admin can reject suggested quests.')
    }

    await ctx.db.patch(args.questId, {
      suggestionStatus: 'rejected',
    })
  },
})

export const getSuggestedQuestsByWorld = query({
  args: { worldId: v.id('worlds') },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) return []

    const world = await ctx.db.get(args.worldId)
    const isAdminUser = await isAdmin(ctx)
    const isWorldOwner = world?.owner === user.subject

    // Only world owner or admin can view pending suggestions
    if (!isWorldOwner && !isAdminUser) return []

    const worldQuests = await ctx.db
      .query('quests')
      .withIndex('by_worldId_isSuggested', (q) => q.eq('worldId', args.worldId).eq('isSuggested', true))
      .collect()

    const pendingSuggestions = worldQuests.filter(q => q.suggestionStatus === 'pending' && !q.isCompleted)

    return await Promise.all(
      pendingSuggestions.map(async (q) => {
        let charName = ''
        let charRank = 'guildmaster'
        let charLvl = 14
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
          characterName: charName,
          characterRank: charRank,
          characterLevel: charLvl,
        }
      })
    )
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
    
    // Global quests are quests without an associated world (worldId: undefined)
    const allQuests = await ctx.db.query('quests').collect()
    const worldlessQuests = allQuests.filter((q) => !q.worldId)

    const questMap = new Map<string, typeof allQuests[0]>()
    for (const q of worldQuests) {
      questMap.set(q._id, q)
    }
    for (const q of worldlessQuests) {
      questMap.set(q._id, q)
    }

    // Exclude completed quests and pending suggestions (pending suggestions are reviewed by world owner first)
    const activeQuests = Array.from(questMap.values()).filter(q => !q.isCompleted && !q.isSuggested)
    
    const questsWithChar = await Promise.all(
      activeQuests.map(async (q) => {
        let characterName: string | undefined = undefined
        let characterRank: string | undefined = q.characterRank
        if (q.characterId) {
          const c = await ctx.db.get(q.characterId)
          if (c) {
            characterName = c.name
            if (c.rank) characterRank = c.rank
          }
        }
        return {
          ...q,
          characterName,
          characterRank,
        }
      })
    )

    return questsWithChar.sort((a, b) => {
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

