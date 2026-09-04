import { mutation, query } from './_generated/server'
import { Doc, Id } from './_generated/dataModel'

export interface AchievementDefinition {
  id: string
  title: string
  description: string
  category: 'normal' | 'hidden'
  reward: string
  chainId?: string
  tier?: number
  maxTier?: number
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
  givenCommendationCounts: {
    total: number
    gm: number
  }
  isInterestedCount: number
  availabilityDaysCount: number
  maxCharacterStreak: number
  maxWorldStreak: number
  claimedLootCount: number
}

export const ACHIEVEMENTS_REGISTRY: AchievementDefinition[] = [
  {
    id: 'first_character',
    title: 'First Steps',
    description: 'Created your first player character in the Void Guild.',
    category: 'normal',
    reward: '',
    chainId: 'character_roster',
    tier: 1,
    maxTier: 2,
    checkEligibility: (data) => data.characters.length >= 1,
  },
  {
    id: 'character_trio',
    title: 'Roster of Heroes',
    description: 'Created 3 or more player characters.',
    category: 'hidden',
    reward: 'Teal Text Color Cosmetic',
    chainId: 'character_roster',
    tier: 2,
    maxTier: 2,
    checkEligibility: (data) => data.characters.length >= 3,
  },
  {
    id: 'first_session',
    title: 'Into the Void',
    description: 'Participated in your first completed session.',
    category: 'normal',
    reward: 'Sabon Classic Serif Font Cosmetic',
    chainId: 'sessions_played',
    tier: 1,
    maxTier: 3,
    checkEligibility: (data) => data.sessionsPlayedCount >= 1,
  },
  {
    id: 'veteran_player_5',
    title: 'Seasoned Adventurer',
    description: 'Played in 5 or more completed sessions.',
    category: 'hidden',
    reward: 'Medieval Sharp Font Cosmetic',
    chainId: 'sessions_played',
    tier: 2,
    maxTier: 3,
    checkEligibility: (data) => data.sessionsPlayedCount >= 5,
  },
  {
    id: 'master_player_10',
    title: 'Guild Champion',
    description: 'Played in 10 or more completed sessions.',
    category: 'hidden',
    reward: 'Taroca High-Fantasy Font Cosmetic',
    chainId: 'sessions_played',
    tier: 3,
    maxTier: 3,
    checkEligibility: (data) => data.sessionsPlayedCount >= 10,
  },
  {
    id: 'first_gm_session',
    title: 'Behind the Screen',
    description: 'Ran your first session as a Gamemaster/Voidmaster.',
    category: 'normal',
    reward: 'Voidmaster Screen (Rotating Void Border) Cosmetic',
    chainId: 'sessions_ran',
    tier: 1,
    maxTier: 2,
    checkEligibility: (data) => data.sessionsRanCount >= 1,
  },
  {
    id: 'veteran_gm_5',
    title: 'Master Storyteller',
    description: 'Ran 5 or more sessions as a Gamemaster/Voidmaster.',
    category: 'hidden',
    reward: 'Rotating Void Avatar Ring Cosmetic',
    chainId: 'sessions_ran',
    tier: 2,
    maxTier: 2,
    checkEligibility: (data) => data.sessionsRanCount >= 5,
  },
  {
    id: 'level_5_char',
    title: 'Rising Power',
    description: 'Reach Level 5 or higher with any character.',
    category: 'normal',
    reward: '',
    chainId: 'character_level',
    tier: 1,
    maxTier: 2,
    checkEligibility: (data) => data.characters.some((c) => c.lvl >= 5),
  },
  {
    id: 'level_10_char',
    title: 'Legendary Hero',
    description: 'Reach Level 10 or higher with any character.',
    category: 'hidden',
    reward: '',
    chainId: 'character_level',
    tier: 2,
    maxTier: 2,
    checkEligibility: (data) => data.characters.some((c) => c.lvl >= 10),
  },
  {
    id: 'rank_journeyman',
    title: 'Journeyman Adventurer',
    description: 'Promoted to Journeyman rank with any character.',
    category: 'normal',
    reward: 'Journeyman Silver Border, Silver Background Tint & Silver Avatar Ring Cosmetics',
    chainId: 'guild_rank',
    tier: 1,
    maxTier: 2,
    checkEligibility: (data) =>
      data.characters.some((c) => c.rank === 'journeyman' || c.rank === 'guildmaster'),
  },
  {
    id: 'rank_guildmaster',
    title: "Guildmaster's Pinnacle",
    description: 'Promoted to Guildmaster rank with any character.',
    category: 'normal',
    reward: 'Gold Card Border, Gold Text Color, Gold Background Tint & Gold Avatar Ring Cosmetics',
    chainId: 'guild_rank',
    tier: 2,
    maxTier: 2,
    checkEligibility: (data) => data.characters.some((c) => c.rank === 'guildmaster'),
  },
  {
    id: 'first_commendation',
    title: 'Party Favorite',
    description: 'Received your first character commendation from a party member.',
    category: 'hidden',
    reward: '',
    checkEligibility: (data) => data.commendationCounts.total >= 1,
  },
  {
    id: 'give_1_commendation',
    title: 'Generous Spirit',
    description: 'Gave your first commendation to a fellow party member.',
    category: 'normal',
    reward: '',
    chainId: 'commendations_given',
    tier: 1,
    maxTier: 3,
    checkEligibility: (data) => data.givenCommendationCounts.total >= 1,
  },
  {
    id: 'give_5_commendations',
    title: 'Patron of Valor',
    description: 'Gave 5 or more commendations to fellow party members.',
    category: 'hidden',
    reward: '',
    chainId: 'commendations_given',
    tier: 2,
    maxTier: 3,
    checkEligibility: (data) => data.givenCommendationCounts.total >= 5,
  },
  {
    id: 'give_10_commendations',
    title: 'Guild Encourager',
    description: 'Gave 10 or more commendations to fellow party members.',
    category: 'hidden',
    reward: '',
    chainId: 'commendations_given',
    tier: 3,
    maxTier: 3,
    checkEligibility: (data) => data.givenCommendationCounts.total >= 10,
  },
  {
    id: 'give_gm_commendation',
    title: "Voidmaster's Reward",
    description: 'Awarded a GM Commendation to a player as a Voidmaster.',
    category: 'hidden',
    reward: '',
    checkEligibility: (data) => data.givenCommendationCounts.gm >= 1,
  },
  {
    id: 'secret_logo_clicks',
    title: 'Curious Clicker',
    description: 'Discovered the secret logo clicker easter egg.',
    category: 'hidden',
    reward: 'Rainbow Name & Border Cosmetics',
    checkEligibility: (data) => (data.userDoc?.logoClicks || 0) >= 10,
  },
  {
    id: 'gm_favor',
    title: "Master's Favor",
    description: 'Awarded a GM Commendation by a Voidmaster.',
    category: 'hidden',
    reward: 'GM Favor Commendation Avatar Ring Cosmetic',
    checkEligibility: (data) => data.commendationCounts.gm >= 1,
  },
  {
    id: 'express_interest',
    title: 'Eager Adventurer',
    description: 'Marked yourself as interested in an upcoming session.',
    category: 'normal',
    reward: '',
    checkEligibility: (data) => data.isInterestedCount >= 1,
  },
  {
    id: 'availability_5_days',
    title: 'Duty Calls',
    description: 'Marked yourself as available for at least 5 days on the planning tool.',
    category: 'normal',
    reward: '',
    checkEligibility: (data) => data.availabilityDaysCount >= 5,
  },
  {
    id: 'visit_world',
    title: 'World Explorer',
    description: 'Visited a campaign world page.',
    category: 'normal',
    reward: '',
    checkEligibility: (data) => Boolean(data.userDoc?.visitedWorld),
  },
  {
    id: 'visit_wiki',
    title: 'Scholar of the Void',
    description: 'Visited the campaign wiki via the wiki button.',
    category: 'hidden',
    reward: '',
    checkEligibility: (data) => Boolean(data.userDoc?.visitedWiki),
  },
  {
    id: 'visit_leaderboard',
    title: 'Leaderboard Inspector',
    description: 'Visited the server leaderboard statistics page.',
    category: 'hidden',
    reward: 'Leaderboard Rank Badge Profile Avatar Cosmetic',
    checkEligibility: (data) => Boolean(data.userDoc?.visitedLeaderboard),
  },
  {
    id: 'system_polymath',
    title: 'System Polymath',
    description: 'Own characters in both Pathfinder 2e and D&D 5e.',
    category: 'hidden',
    reward: '',
    checkEligibility: (data) =>
      data.characters.some((c) => c.system === 'PF') &&
      data.characters.some((c) => c.system === 'DnD'),
  },
  {
    id: 'link_discord',
    title: 'Discord Connected',
    description: 'Linked your Discord account to your Void Guild profile.',
    category: 'normal',
    reward: '',
    checkEligibility: (data) => Boolean(data.userDoc?.discordId),
  },
  {
    id: 'tutorial_completed',
    title: 'Tutorial Completed!',
    description: 'Completed all basic adventuring milestones in the Void Guild.',
    category: 'normal',
    reward: 'Purple Card Border & Purple Name Color Cosmetics',
    checkEligibility: (data) => {
      const requiredIds = [
        'first_character',
        'first_session',
        'level_5_char',
        'express_interest',
        'availability_5_days',
        'visit_world',
        'loot_first',
      ]
      return requiredIds.every((id) => {
        const def = ACHIEVEMENTS_REGISTRY.find((a) => a.id === id)
        return def ? def.checkEligibility(data) : false
      })
    },
  },
  {
    id: 'character_streak_3',
    title: 'In Sync',
    description: 'Achieved a character streak of 3 consecutive sessions.',
    category: 'hidden',
    reward: '',
    chainId: 'character_streak',
    tier: 1,
    maxTier: 3,
    checkEligibility: (data) => data.maxCharacterStreak >= 3,
  },
  {
    id: 'character_streak_5',
    title: 'Unbreakable Bond',
    description: 'Achieved a character streak of 5 consecutive sessions.',
    category: 'hidden',
    reward: '',
    chainId: 'character_streak',
    tier: 2,
    maxTier: 3,
    checkEligibility: (data) => data.maxCharacterStreak >= 5,
  },
  {
    id: 'character_streak_10',
    title: 'Inseparable Adventurers',
    description: 'Achieved a character streak of 10 consecutive sessions.',
    category: 'hidden',
    reward: '',
    chainId: 'character_streak',
    tier: 3,
    maxTier: 3,
    checkEligibility: (data) => data.maxCharacterStreak >= 10,
  },
  {
    id: 'world_streak_3',
    title: 'Local Legend',
    description: 'Achieved a world streak of 3 consecutive sessions in the same world.',
    category: 'hidden',
    reward: '',
    chainId: 'world_streak',
    tier: 1,
    maxTier: 3,
    checkEligibility: (data) => data.maxWorldStreak >= 3,
  },
  {
    id: 'world_streak_5',
    title: 'Domain Champion',
    description: 'Achieved a world streak of 5 consecutive sessions in the same world.',
    category: 'hidden',
    reward: '',
    chainId: 'world_streak',
    tier: 2,
    maxTier: 3,
    checkEligibility: (data) => data.maxWorldStreak >= 5,
  },
  {
    id: 'world_streak_10',
    title: 'Master of the Realm',
    description: 'Achieved a world streak of 10 consecutive sessions in the same world.',
    category: 'hidden',
    reward: '',
    chainId: 'world_streak',
    tier: 3,
    maxTier: 3,
    checkEligibility: (data) => data.maxWorldStreak >= 10,
  },
  {
    id: 'loot_first',
    title: 'Treasure Seeker',
    description: 'Claimed your first piece of session loot.',
    category: 'normal',
    reward: '',
    chainId: 'session_loot',
    tier: 1,
    maxTier: 2,
    checkEligibility: (data) => data.claimedLootCount >= 1,
  },
  {
    id: 'loot_hoarder_5',
    title: 'Hoarder',
    description: 'Claimed 5 or more pieces of session loot.',
    category: 'hidden',
    reward: '',
    chainId: 'session_loot',
    tier: 2,
    maxTier: 2,
    checkEligibility: (data) => data.claimedLootCount >= 5,
  },
  {
    id: 'comm_roleplay',
    title: 'Roleplay Maestro',
    description: 'Received a Roleplay commendation for your character.',
    category: 'hidden',
    reward: 'Roleplay Commendation Avatar Ring Cosmetic',
    checkEligibility: (data) => data.commendationCounts.roleplay >= 1,
  },
  {
    id: 'comm_tactics',
    title: 'Tactical Mastermind',
    description: 'Received a Tactics commendation for your character.',
    category: 'hidden',
    reward: 'Tactics Commendation Avatar Ring Cosmetic',
    checkEligibility: (data) => data.commendationCounts.tactics >= 1,
  },
  {
    id: 'comm_clutch',
    title: 'Clutch Performer',
    description: 'Received a Clutch commendation for your character.',
    category: 'hidden',
    reward: 'Clutch Commendation Avatar Ring Cosmetic',
    checkEligibility: (data) => data.commendationCounts.clutch >= 1,
  },
  {
    id: 'comm_heroic',
    title: 'Heroic Legend',
    description: 'Received a Heroic commendation for your character.',
    category: 'hidden',
    reward: 'Heroic Commendation Avatar Ring Cosmetic',
    checkEligibility: (data) => data.commendationCounts.heroic >= 1,
  },
  {
    id: 'comm_jack_of_all_trades',
    title: 'Jack of All Trades',
    description: 'Received at least 1 commendation in every category (Roleplay, Tactics, Clutch, Heroic).',
    category: 'hidden',
    reward: '',
    checkEligibility: (data) =>
      data.commendationCounts.roleplay >= 1 &&
      data.commendationCounts.tactics >= 1 &&
      data.commendationCounts.clutch >= 1 &&
      data.commendationCounts.heroic >= 1,
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

    // Received Commendations calculation
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

    // Given Commendations calculation
    const givenCommendationsDocs = await ctx.db
      .query('commendations')
      .withIndex('by_fromUserId', (q) => q.eq('fromUserId', user.subject))
      .collect()

    const givenCommendationCounts = {
      total: givenCommendationsDocs.length,
      gm: givenCommendationsDocs.filter((c) => c.category === 'gm').length,
    }

    // Interested sessions calculation
    const allSessionsForInterest = await ctx.db.query('sessions').collect()
    let isInterestedCount = 0
    for (const s of allSessionsForInterest) {
      if (s.interestedPlayers && s.interestedPlayers.some((p) => p.userId === user.subject)) {
        isInterestedCount += 1
      }
    }

    // Availability calculation
    const userAvailabilityDocs = await ctx.db
      .query('availability')
      .withIndex('by_user_date', (q) => q.eq('userId', user.subject))
      .collect()

    const availabilityDaysCount = new Set(userAvailabilityDocs.map((a) => a.date)).size

    // Streak calculations
    const sortedLockedSessions = [...allLockedSessions].sort((a, b) => {
      if (a.date && b.date) return a.date - b.date
      if (a.date) return -1
      if (b.date) return 1
      return a._creationTime - b._creationTime
    })

    let maxWorldStreak = 0
    let maxCharacterStreak = 0

    const isAttendingSession = (charId: Id<'characters'>, s: typeof sortedLockedSessions[0]) => {
      return (s.characters && s.characters.includes(charId)) || s.gmCharacter === charId
    }

    for (const char of characters) {
      const charSessions = sortedLockedSessions.filter((s) => isAttendingSession(char._id, s))

      // World Streak per character
      let currentWorld: string | null = null
      let currentWorldStreak = 0
      for (const s of charSessions) {
        const wId = s.world ? s.world.toString() : null
        if (wId && wId === currentWorld) {
          currentWorldStreak++
        } else {
          currentWorld = wId
          currentWorldStreak = wId ? 1 : 0
        }
        if (currentWorldStreak > maxWorldStreak) {
          maxWorldStreak = currentWorldStreak
        }
      }

      // Single character session streak
      let singleCharStreak = 0
      for (const s of sortedLockedSessions) {
        if (isAttendingSession(char._id, s)) {
          singleCharStreak++
          if (singleCharStreak > maxCharacterStreak) {
            maxCharacterStreak = singleCharStreak
          }
        } else {
          singleCharStreak = 0
        }
      }

      // Mutual character streak with companion characters
      const companionIds = new Set<Id<'characters'>>()
      for (const s of charSessions) {
        if (s.characters) {
          for (const cId of s.characters) {
            if (cId !== char._id) {
              companionIds.add(cId)
            }
          }
        }
        if (s.gmCharacter && s.gmCharacter !== char._id) {
          companionIds.add(s.gmCharacter)
        }
      }

      for (const compId of companionIds) {
        const relevantSessions = sortedLockedSessions.filter(
          (s) => isAttendingSession(char._id, s) || isAttendingSession(compId, s)
        )
        let mutualStreak = 0
        for (const s of relevantSessions) {
          const hasChar = isAttendingSession(char._id, s)
          const hasComp = isAttendingSession(compId, s)
          if (hasChar && hasComp) {
            mutualStreak++
            if (mutualStreak > maxCharacterStreak) {
              maxCharacterStreak = mutualStreak
            }
          } else {
            mutualStreak = 0
          }
        }
      }
    }

    // Loot calculation
    let claimedLootCount = 0
    for (const s of allSessionsForInterest) {
      if (s.loot) {
        for (const item of s.loot) {
          if (item.claimedBy && charIds.has(item.claimedBy)) {
            claimedLootCount += 1
          }
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
      givenCommendationCounts,
      isInterestedCount,
      availabilityDaysCount,
      maxCharacterStreak,
      maxWorldStreak,
      claimedLootCount,
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
          reward: def.reward,
          isUnlocked,
          unlockedAt: unlockedAt || null,
          isHidden: false,
          chainId: def.chainId,
          tier: def.tier,
          maxTier: def.maxTier,
        })
      } else if (def.category === 'hidden') {
        if (isUnlocked) {
          // Unlocked hidden achievement: visible to user with reward
          result.push({
            id: def.id,
            title: def.title,
            description: def.description,
            category: def.category,
            reward: def.reward,
            isUnlocked: true,
            unlockedAt: unlockedAt!,
            isHidden: true,
            chainId: def.chainId,
            tier: def.tier,
            maxTier: def.maxTier,
          })
        } else if (isAdmin) {
          // Locked hidden achievement: visible to admin marked as hidden
          result.push({
            id: def.id,
            title: def.title,
            description: def.description,
            category: def.category,
            reward: def.reward,
            isUnlocked: false,
            unlockedAt: null,
            isHidden: true,
            chainId: def.chainId,
            tier: def.tier,
            maxTier: def.maxTier,
          })
        }
      }
    }

    const normalDefs = ACHIEVEMENTS_REGISTRY.filter((a) => a.category === 'normal')
    const unlockedNormalCount = normalDefs.filter((a) => unlockedMap.has(a.id)).length

    return {
      achievements: result,
      isAdmin,
      unlockedCount: unlockedNormalCount,
      totalCount: normalDefs.length,
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
