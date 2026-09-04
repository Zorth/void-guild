import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { Doc } from './_generated/dataModel'

export interface AchievementDefinition {
  id: string
  title: string
  description: string
  category: 'normal' | 'hidden'
  icon: string
  reward: string
  checkEligibility: (data: UserEvaluationData) => boolean
}

export interface UserEvaluationData {
  userId: string
  userDoc: Doc<'users'> | null
  characters: Doc<'characters'>[]
  sessionsPlayedCount: number
  sessionsRanCount: number
  commendationCounts: {
    total: number
    roleplay: number
    tactics: number
    clutch: number
    heroic: number
    gm: number
  }
}

export const ACHIEVEMENTS_REGISTRY: AchievementDefinition[] = [
  {
    id: 'first_character',
    title: 'First Steps',
    description: 'Created your first player character in the Void Guild.',
    category: 'normal',
    icon: '⚔️',
    reward: '',
    checkEligibility: (data) => data.characters.length >= 1,
  },
  {
    id: 'character_trio',
    title: 'Roster of Heroes',
    description: 'Created 3 or more player characters.',
    category: 'normal',
    icon: '👥',
    reward: '',
    checkEligibility: (data) => data.characters.length >= 3,
  },
  {
    id: 'first_session',
    title: 'Into the Void',
    description: 'Participated in your first completed session.',
    category: 'normal',
    icon: '🌌',
    reward: '',
    checkEligibility: (data) => data.sessionsPlayedCount >= 1,
  },
  {
    id: 'veteran_player_5',
    title: 'Seasoned Adventurer',
    description: 'Played in 5 or more completed sessions.',
    category: 'normal',
    icon: '🛡️',
    reward: '',
    checkEligibility: (data) => data.sessionsPlayedCount >= 5,
  },
  {
    id: 'master_player_10',
    title: 'Guild Champion',
    description: 'Played in 10 or more completed sessions.',
    category: 'normal',
    icon: '🏆',
    reward: '',
    checkEligibility: (data) => data.sessionsPlayedCount >= 10,
  },
  {
    id: 'first_gm_session',
    title: 'Behind the Screen',
    description: 'Ran your first session as a Gamemaster/Voidmaster.',
    category: 'normal',
    icon: '📜',
    reward: '',
    checkEligibility: (data) => data.sessionsRanCount >= 1,
  },
  {
    id: 'veteran_gm_5',
    title: 'Master Storyteller',
    description: 'Ran 5 or more sessions as a Gamemaster/Voidmaster.',
    category: 'normal',
    icon: '👑',
    reward: '',
    checkEligibility: (data) => data.sessionsRanCount >= 5,
  },
  {
    id: 'level_5_char',
    title: 'Rising Power',
    description: 'Reach Level 5 or higher with any character.',
    category: 'normal',
    icon: '✨',
    reward: '',
    checkEligibility: (data) => data.characters.some((c) => c.lvl >= 5),
  },
  {
    id: 'level_10_char',
    title: 'Legendary Hero',
    description: 'Reach Level 10 or higher with any character.',
    category: 'normal',
    icon: '🔥',
    reward: '',
    checkEligibility: (data) => data.characters.some((c) => c.lvl >= 10),
  },
  {
    id: 'first_commendation',
    title: 'Party Favorite',
    description: 'Received your first character commendation from a party member.',
    category: 'normal',
    icon: '🌟',
    reward: '',
    checkEligibility: (data) => data.commendationCounts.total >= 1,
  },
  {
    id: 'secret_logo_clicks',
    title: 'Curious Clicker',
    description: 'Discovered the secret logo clicker easter egg.',
    category: 'hidden',
    icon: '🔍',
    reward: '',
    checkEligibility: (data) => (data.userDoc?.logoClicks || 0) >= 10,
  },
  {
    id: 'gm_favor',
    title: "Master's Favor",
    description: 'Awarded a GM Commendation by a Voidmaster.',
    category: 'hidden',
    icon: '👑',
    reward: '',
    checkEligibility: (data) => data.commendationCounts.gm >= 1,
  },
  {
    id: 'system_polymath',
    title: 'System Polymath',
    description: 'Own characters in both Pathfinder 2e and D&D 5e.',
    category: 'hidden',
    icon: '🎲',
    reward: '',
    checkEligibility: (data) =>
      data.characters.some((c) => c.system === 'PF') &&
      data.characters.some((c) => c.system === 'DnD'),
  },
]

export const syncAndGetAchievements = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) return null

    const userDoc = await ctx.db
      .query('users')
      .withIndex('by_userId', (q) => q.eq('userId', user.subject))
      .first()

    const isAdmin = userDoc?.isAdmin ?? false

    const characters = await ctx.db
      .query('characters')
      .withIndex('by_userId', (q) => q.eq('userId', user.subject))
      .collect()

    const charIds = new Set(characters.map((c) => c._id))

    // Sessions calculation
    const allLockedSessions = await ctx.db
      .query('sessions')
      .withIndex('by_locked', (q) => q.eq('locked', true))
      .collect()

    let sessionsPlayedCount = (userDoc?.extraSessionsPlayed || 0)
    let sessionsRanCount = (userDoc?.extraSessionsRan || 0)

    for (const s of allLockedSessions) {
      if (s.owner === user.subject) {
        sessionsRanCount += 1
      }
      if (s.characters && s.characters.some((id) => charIds.has(id))) {
        sessionsPlayedCount += 1
      }
    }

    // Commendations calculation
    const commendationCounts = {
      total: 0,
      roleplay: 0,
      tactics: 0,
      clutch: 0,
      heroic: 0,
      gm: 0,
    }

    for (const char of characters) {
      const comms = await ctx.db
        .query('commendations')
        .withIndex('by_toCharacter', (q) => q.eq('toCharacterId', char._id))
        .collect()

      for (const c of comms) {
        commendationCounts.total += 1
        if (c.category in commendationCounts) {
          commendationCounts[c.category as keyof typeof commendationCounts] += 1
        }
      }
    }

    const evalData: UserEvaluationData = {
      userId: user.subject,
      userDoc,
      characters,
      sessionsPlayedCount,
      sessionsRanCount,
      commendationCounts,
    }

    // Existing unlocked records in database
    const existingUnlockedDocs = await ctx.db
      .query('unlockedAchievements')
      .withIndex('by_userId', (q) => q.eq('userId', user.subject))
      .collect()

    const unlockedMap = new Map<string, number>()
    for (const u of existingUnlockedDocs) {
      unlockedMap.set(u.achievementId, u.unlockedAt)
    }

    const now = Date.now()

    // Auto-grant eligible achievements in database if not already persisted
    for (const def of ACHIEVEMENTS_REGISTRY) {
      if (!unlockedMap.has(def.id)) {
        if (def.checkEligibility(evalData)) {
          await ctx.db.insert('unlockedAchievements', {
            userId: user.subject,
            achievementId: def.id,
            unlockedAt: now,
          })
          unlockedMap.set(def.id, now)
        }
      }
    }

    // Filter achievements to return based on category & admin status
    const result = []

    for (const def of ACHIEVEMENTS_REGISTRY) {
      const unlockedAt = unlockedMap.get(def.id)
      const isUnlocked = unlockedAt !== undefined

      if (def.category === 'normal') {
        result.push({
          id: def.id,
          title: def.title,
          description: def.description,
          category: def.category,
          icon: def.icon,
          reward: def.reward,
          isUnlocked,
          unlockedAt: unlockedAt || null,
          isHidden: false,
        })
      } else if (def.category === 'hidden') {
        if (isUnlocked) {
          // Unlocked hidden achievement: visible to user with reward
          result.push({
            id: def.id,
            title: def.title,
            description: def.description,
            category: def.category,
            icon: def.icon,
            reward: def.reward,
            isUnlocked: true,
            unlockedAt: unlockedAt!,
            isHidden: true,
          })
        } else if (isAdmin) {
          // Locked hidden achievement: visible to admin marked as hidden
          result.push({
            id: def.id,
            title: def.title,
            description: def.description,
            category: def.category,
            icon: def.icon,
            reward: def.reward,
            isUnlocked: false,
            unlockedAt: null,
            isHidden: true,
          })
        }
      }
    }

    return {
      achievements: result,
      isAdmin,
      unlockedCount: result.filter((a) => a.isUnlocked).length,
      totalCount: result.length,
    }
  },
})

export const getUserUnlockedAchievementIds = query({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) return []
    const unlockedDocs = await ctx.db
      .query('unlockedAchievements')
      .withIndex('by_userId', (q) => q.eq('userId', user.subject))
      .collect()
    return unlockedDocs.map((u) => u.achievementId)
  },
})

