import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { Doc, Id } from './_generated/dataModel'
import { isAdmin } from './roles'

/**
 * Helper to get the YYYY-MM key and deadline for a given date or offset month.
 * Can take an explicit timestamp to avoid unparameterized clock reads in queries.
 */
export function getMonthInfo(offsetMonths: number = 0, timestamp?: number) {
  const d = new Date(timestamp ?? Date.now())
  d.setDate(1)
  d.setMonth(d.getMonth() + offsetMonths)
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  const monthKey = `${year}-${String(month).padStart(2, '0')}`
  
  // End of month is 23:59:59.999 of the last day
  const nextMonth = new Date(year, month, 0, 23, 59, 59, 999)
  const deadline = nextMonth.getTime()

  return { monthKey, year, month, deadline }
}

/**
 * Calculates Void Objective reward for tier 1/2/3 and character level.
 * 6*(1.5)^lvl, 9*(1.5)^lvl, 12*(1.5)^lvl rounded to 2 significant digits.
 */
export function calculateVoidReward(tier: number, level: number): number {
  if (tier < 1 || tier > 3) return 0
  const base = tier === 1 ? 6 : tier === 2 ? 9 : 12
  const raw = base * Math.pow(1.5, Math.max(1, level))
  if (raw === 0) return 0
  const magnitude = Math.floor(Math.log10(Math.abs(raw)))
  const factor = Math.pow(10, magnitude - 1)
  return Math.round(raw / factor) * factor
}

/**
 * Get the current active void objective.
 */
export const getCurrentObjective = query({
  args: {},
  handler: async (ctx) => {
    const { monthKey } = getMonthInfo(0)
    const objective = await ctx.db
      .query('voidObjectives')
      .withIndex('by_monthKey', (q) => q.eq('monthKey', monthKey))
      .unique()

    return objective
  },
})

/**
 * Get next month's void objective (for admin editing and preview).
 */
export const getNextMonthObjective = query({
  args: {},
  handler: async (ctx) => {
    const { monthKey } = getMonthInfo(1)
    const objective = await ctx.db
      .query('voidObjectives')
      .withIndex('by_monthKey', (q) => q.eq('monthKey', monthKey))
      .unique()

    return objective
  },
})

/**
 * Query active objective along with next month objective and admin check for the UI widget.
 */
export const getVoidObjectiveOverview = query({
  args: {},
  handler: async (ctx) => {
    const isAdminUser = await isAdmin(ctx)
    const currentMonth = getMonthInfo(0)
    const nextMonth = getMonthInfo(1)

    const currentObj = await ctx.db
      .query('voidObjectives')
      .withIndex('by_monthKey', (q) => q.eq('monthKey', currentMonth.monthKey))
      .unique()

    const nextObj = await ctx.db
      .query('voidObjectives')
      .withIndex('by_monthKey', (q) => q.eq('monthKey', nextMonth.monthKey))
      .unique()

    return {
      currentMonthKey: currentMonth.monthKey,
      nextMonthKey: nextMonth.monthKey,
      currentObjective: currentObj,
      nextObjective: nextObj,
      isAdmin: isAdminUser,
      currentDeadline: currentObj?.deadline || currentMonth.deadline,
    }
  },
})

/**
 * Get all contributors for a given monthKey.
 */
export const getContributors = query({
  args: { monthKey: v.string() },
  handler: async (ctx, args) => {
    const contributions = await ctx.db
      .query('voidObjectiveContributions')
      .withIndex('by_monthKey', (q) => q.eq('monthKey', args.monthKey))
      .take(500)

    const characterIds = contributions.map((c) => c.characterId)
    const characters = await Promise.all(characterIds.map((id) => ctx.db.get(id)))
    const charMap = new Map(characters.filter((c): c is Doc<'characters'> => Boolean(c)).map((c) => [c._id, c]))

    return contributions.map((c) => {
      const char = charMap.get(c.characterId)
      return {
        _id: c._id,
        characterId: c.characterId,
        characterName: char?.name || 'Unknown Character',
        characterLevel: char?.lvl || 1,
        characterRank: char?.rank || 'none',
        characterSystem: char?.system,
        amount: c.amount,
        rewardClaimed: !!c.rewardClaimed,
        claimedRewardGP: c.claimedRewardGP,
      }
    }).sort((a, b) => b.amount - a.amount)
  },
})

/**
 * Admin upsert of a void objective (current month or next month).
 */
export const upsertObjective = mutation({
  args: {
    monthKey: v.string(),
    title: v.string(),
    description: v.string(),
    unit: v.optional(v.string()),
    tier1Goal: v.number(),
    tier2Goal: v.number(),
    tier3Goal: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Not authenticated')
    const isAdminUser = await isAdmin(ctx)
    if (!isAdminUser) throw new Error('Only admins can edit Void Objectives')

    if (args.tier1Goal <= 0 || args.tier2Goal <= args.tier1Goal || args.tier3Goal <= args.tier2Goal) {
      throw new Error('Tiers must be strictly increasing numbers (Tier 1 < Tier 2 < Tier 3)')
    }

    const existing = await ctx.db
      .query('voidObjectives')
      .withIndex('by_monthKey', (q) => q.eq('monthKey', args.monthKey))
      .unique()

    const [yStr, mStr] = args.monthKey.split('-')
    const year = parseInt(yStr, 10)
    const month = parseInt(mStr, 10)
    const deadline = new Date(year, month, 0, 23, 59, 59, 999).getTime()

    if (existing) {
      // Diff validation to eliminate zero-change write transactions
      const isDiff =
        existing.title !== args.title.trim() ||
        existing.description !== args.description.trim() ||
        existing.unit !== (args.unit?.trim() || undefined) ||
        existing.tier1Goal !== args.tier1Goal ||
        existing.tier2Goal !== args.tier2Goal ||
        existing.tier3Goal !== args.tier3Goal ||
        existing.deadline !== deadline

      if (isDiff) {
        await ctx.db.patch(existing._id, {
          title: args.title.trim(),
          description: args.description.trim(),
          unit: args.unit?.trim() || undefined,
          tier1Goal: args.tier1Goal,
          tier2Goal: args.tier2Goal,
          tier3Goal: args.tier3Goal,
          deadline,
        })
      }
      return existing._id
    } else {
      return await ctx.db.insert('voidObjectives', {
        monthKey: args.monthKey,
        title: args.title.trim(),
        description: args.description.trim(),
        unit: args.unit?.trim() || undefined,
        tier1Goal: args.tier1Goal,
        tier2Goal: args.tier2Goal,
        tier3Goal: args.tier3Goal,
        currentProgress: 0,
        deadline,
      })
    }
  },
})

/**
 * Record contribution to the Void Objective when a session ends/locks.
 * Adds all participating non-GM characters to the contributors list.
 */
export const contributeToObjective = mutation({
  args: {
    sessionId: v.id('sessions'),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Not authenticated')

    const session = await ctx.db.get(args.sessionId)
    if (!session) throw new Error('Session not found')

    const isAdminUser = await isAdmin(ctx)
    if (session.owner !== user.subject && !isAdminUser) {
      throw new Error('Only the session owner or an admin can record contributions')
    }

    if (args.amount <= 0) {
      return { success: true, updatedProgress: 0 }
    }

    const { monthKey, deadline } = getMonthInfo(0)
    let objective = await ctx.db
      .query('voidObjectives')
      .withIndex('by_monthKey', (q) => q.eq('monthKey', monthKey))
      .unique()

    if (!objective) {
      const defaultId = await ctx.db.insert('voidObjectives', {
        monthKey,
        title: 'Void Anomaly Cleansing',
        description: 'Banish the encroaching void creatures and cleanse the anomalies.',
        unit: 'progress',
        tier1Goal: 10,
        tier2Goal: 25,
        tier3Goal: 50,
        currentProgress: 0,
        deadline,
      })
      objective = await ctx.db.get(defaultId)
    }

    if (!objective) throw new Error('Could not find or create objective')

    const newProgress = objective.currentProgress + args.amount
    await ctx.db.patch(objective._id, { currentProgress: newProgress })

    const gmCharId = session.gmCharacter
    const playerCharacterIds = session.characters.filter((id) => id !== gmCharId)

    for (const charId of playerCharacterIds) {
      const existing = await ctx.db
        .query('voidObjectiveContributions')
        .withIndex('by_monthKey_character', (q) => q.eq('monthKey', monthKey).eq('characterId', charId))
        .unique()

      if (existing) {
        await ctx.db.patch(existing._id, {
          amount: existing.amount + args.amount,
          lastSessionId: session._id,
        })
      } else {
        await ctx.db.insert('voidObjectiveContributions', {
          monthKey,
          characterId: charId,
          amount: args.amount,
          rewardClaimed: false,
          lastSessionId: session._id,
        })
      }
    }

    return { success: true, updatedProgress: newProgress }
  },
})

/**
 * Claim reward for a character who participated in an objective.
 */
export const claimReward = mutation({
  args: {
    contributionId: v.id('voidObjectiveContributions'),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Not authenticated')

    const contribution = await ctx.db.get(args.contributionId)
    if (!contribution) throw new Error('Contribution not found')

    const character = await ctx.db.get(contribution.characterId)
    if (!character || character.userId !== user.subject) {
      throw new Error('You do not own this character')
    }

    if (contribution.rewardClaimed) {
      throw new Error('Reward has already been claimed for this objective')
    }

    const objective = await ctx.db
      .query('voidObjectives')
      .withIndex('by_monthKey', (q) => q.eq('monthKey', contribution.monthKey))
      .unique()

    if (!objective) throw new Error('Objective record not found')

    let achievedTier = 0
    if (objective.currentProgress >= objective.tier3Goal) {
      achievedTier = 3
    } else if (objective.currentProgress >= objective.tier2Goal) {
      achievedTier = 2
    } else if (objective.currentProgress >= objective.tier1Goal) {
      achievedTier = 1
    }

    if (achievedTier === 0) {
      throw new Error('Objective did not reach Tier 1. No reward is available.')
    }

    const rewardGP = calculateVoidReward(achievedTier, character.lvl)

    await ctx.db.patch(contribution._id, {
      rewardClaimed: true,
      claimedTier: achievedTier,
      claimedRewardGP: rewardGP,
      claimedAt: Date.now(),
    })

    return {
      claimedTier: achievedTier,
      rewardGP,
    }
  },
})

/**
 * Get any claimable void objective rewards for the current user.
 */
export const getUserClaimableRewards = query({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) return []

    const userCharacters = await ctx.db
      .query('characters')
      .withIndex('by_userId', (q) => q.eq('userId', user.subject))
      .take(100)

    const now = Date.now()
    const results = []

    for (const char of userCharacters) {
      const contributions = await ctx.db
        .query('voidObjectiveContributions')
        .withIndex('by_character', (q) => q.eq('characterId', char._id))
        .take(50)

      for (const contrib of contributions) {
        if (contrib.rewardClaimed) continue

        const objective = await ctx.db
          .query('voidObjectives')
          .withIndex('by_monthKey', (q) => q.eq('monthKey', contrib.monthKey))
          .unique()

        if (!objective) continue

        const isMonthOver = now > objective.deadline
        const isCompleted = objective.currentProgress >= objective.tier3Goal

        if (isMonthOver || isCompleted) {
          let achievedTier = 0
          if (objective.currentProgress >= objective.tier3Goal) achievedTier = 3
          else if (objective.currentProgress >= objective.tier2Goal) achievedTier = 2
          else if (objective.currentProgress >= objective.tier1Goal) achievedTier = 1

          if (achievedTier > 0) {
            results.push({
              contributionId: contrib._id,
              characterId: char._id,
              characterName: char.name,
              characterLevel: char.lvl,
              monthKey: contrib.monthKey,
              objectiveTitle: objective.title,
              achievedTier,
              rewardGP: calculateVoidReward(achievedTier, char.lvl),
              deadline: objective.deadline,
            })
          }
        }
      }
    }

    return results
  },
})
