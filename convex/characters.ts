import { query, mutation, QueryCtx, MutationCtx } from './_generated/server'
import { v } from 'convex/values'
import { internal } from './_generated/api'
import { Id } from './_generated/dataModel'
import { isAdmin, isMember } from './roles'
import { formatUserDisplayName } from './users'
import { getUserWorldStreaksMap } from './worlds'

export const listCharacters = query({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) {
      return null
    }

    const memberStatus = await isMember(ctx, user.subject)

    const characters = await ctx.db
      .query('characters')
      .filter((q) => q.eq(q.field('userId'), user.subject))
      .collect()
    
    return characters
      .map((c) => ({ ...c, isMember: memberStatus }))
      .sort((a, b) => (b.lvl * 1000 + b.xp) - (a.lvl * 1000 + a.xp))
  },
})

export const listCharactersByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const memberStatus = await isMember(ctx, args.userId)

    const characters = await ctx.db
      .query('characters')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .collect()
    
    return characters
      .map((c) => ({ ...c, isMember: memberStatus }))
      .sort((a, b) => (b.lvl * 1000 + b.xp) - (a.lvl * 1000 + a.xp))
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
    
    // Fetch user details for each character
    const userIds = Array.from(new Set(characters.map((c) => c.userId)))
    const usersMap = new Map<string, any>()
    await Promise.all(
      userIds.map(async (uId) => {
        const u = await ctx.db
          .query('users')
          .withIndex('by_userId', (q) => q.eq('userId', uId))
          .first()
        if (u) usersMap.set(uId, u)
      })
    )

    const charactersWithOwners = characters.map((c) => {
      const owner = usersMap.get(c.userId)
      const ownerName = owner ? (owner.name || owner.username || owner.email || 'Unknown User') : 'Unknown User'
      return {
        ...c,
        ownerName,
        ownerUsername: owner?.username || null,
        ownerEmail: owner?.email || null,
        isMember: Boolean(owner?.isMember || owner?.isAdmin),
      }
    })

    return charactersWithOwners.sort((a, b) => a.name.localeCompare(b.name))
  },
})

export const listAllCharactersPublic = query({
  args: {},
  handler: async (ctx) => {
    const characters = await ctx.db.query('characters').collect()
    return characters
  },
})

export const listGuildmasters = query({
  args: {},
  handler: async (ctx) => {
    const guildmasters = await ctx.db
      .query('characters')
      .withIndex('by_rank', (q) => q.eq('rank', 'guildmaster'))
      .collect()
    return guildmasters.sort((a, b) => a.name.localeCompare(b.name))
  },
})

export const getCharacterLeaderboardRanks = query({
  args: {},
  handler: async (ctx) => {
    const characters = await ctx.db.query('characters').collect()
    const sorted = [...characters].sort((a, b) => b.lvl - a.lvl || (b.xp ?? 0) - (a.xp ?? 0))
    const ranks: Record<string, number> = {}
    sorted.forEach((char, index) => {
      ranks[char._id] = index + 1
    })
    return ranks
  },
})

export const getCharactersByIds = query({
  args: { ids: v.array(v.id('characters')) },
  handler: async (ctx, args) => {
    const characters = await Promise.all(args.ids.map((id) => ctx.db.get(id)))
    const validChars = characters.filter((c) => c !== null)

    const userIds = Array.from(new Set(validChars.map((c) => c.userId)))
    const userMap = new Map<string, boolean>()
    await Promise.all(
      userIds.map(async (uId) => {
        const isMem = await isMember(ctx, uId)
        userMap.set(uId, isMem)
      })
    )

    return validChars.map((c) => ({
      ...c,
      isMember: userMap.get(c.userId) ?? false,
    }))
  },
})

export const getCharacterPerceptions = query({
  args: { characterIds: v.array(v.id('characters')) },
  handler: async (ctx, args) => {
    const result: Record<string, { bonus: number; proficiency?: string }> = {}

    await Promise.all(
      args.characterIds.map(async (charId) => {
        const details = await ctx.db
          .query('characterDetails')
          .withIndex('by_characterId', (q) => q.eq('characterId', charId))
          .first()

        if (details?.saves?.perception) {
          result[charId] = {
            bonus: details.saves.perception.bonus,
            proficiency: details.saves.perception.proficiency,
          }
        }
      })
    )

    return result
  },
})

export const getPartyCharacterDetails = query({
  args: { characterIds: v.array(v.id('characters')) },
  handler: async (ctx, args) => {
    const result: Record<string, any> = {}

    await Promise.all(
      args.characterIds.map(async (charId) => {
        const details = await ctx.db
          .query('characterDetails')
          .withIndex('by_characterId', (q) => q.eq('characterId', charId))
          .first()

        if (details) {
          result[charId] = details
        }
      })
    )

    return result
  },
})

export const updateCharacterPerception = mutation({
  args: {
    characterId: v.id('characters'),
    bonus: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    const character = await ctx.db.get(args.characterId)
    if (!character) {
      throw new Error('Character not found')
    }

    const isAdminUser = await isAdmin(ctx)
    const isCharOwner = character.userId === identity.subject

    if (!isAdminUser && !isCharOwner) {
      const activeSessions = await ctx.db
        .query('sessions')
        .withIndex('by_locked', (q) => q.eq('locked', false))
        .collect()

      const isGmOfAttendingSession = activeSessions.some(
        (s) => s.owner === identity.subject && s.characters?.includes(args.characterId)
      )

      if (!isGmOfAttendingSession) {
        throw new Error('Unauthorized to update character perception')
      }
    }

    const existingDetails = await ctx.db
      .query('characterDetails')
      .withIndex('by_characterId', (q) => q.eq('characterId', args.characterId))
      .first()

    if (existingDetails) {
      const currentSaves = existingDetails.saves || {}
      const currentPerception = currentSaves.perception || { bonus: 0 }

      if (currentPerception.bonus === args.bonus) {
        return { success: true }
      }

      await ctx.db.patch(existingDetails._id, {
        saves: {
          ...currentSaves,
          perception: {
            ...currentPerception,
            bonus: args.bonus,
          },
        },
      })
    } else {
      await ctx.db.insert('characterDetails', {
        characterId: args.characterId,
        system: character.system === 'DnD' ? 'DnD' : 'PF2e',
        name: character.name,
        level: character.lvl,
        saves: {
          perception: {
            bonus: args.bonus,
          },
        },
        lastSyncedAt: Date.now(),
      })
    }

    return { success: true }
  },
})

export const updatePartyCharacterStats = mutation({
  args: {
    characterId: v.id('characters'),
    hitPoints: v.optional(
      v.object({
        max: v.number(),
        current: v.number(),
        temporary: v.number(),
        dieSize: v.optional(v.number()),
        ancestryHP: v.optional(v.number()),
        classHP: v.optional(v.number()),
        bonusHP: v.optional(v.number()),
      })
    ),
    armorClass: v.optional(
      v.object({
        total: v.number(),
        shieldBonus: v.optional(v.number()),
        unarmoredProf: v.optional(v.number()),
        equippedArmorName: v.optional(v.string()),
        shieldHardness: v.optional(v.number()),
        shieldCurrentHP: v.optional(v.number()),
        shieldMaxHP: v.optional(v.number()),
      })
    ),
    abilities: v.optional(
      v.object({
        str: v.number(),
        dex: v.number(),
        con: v.number(),
        int: v.number(),
        wis: v.number(),
        cha: v.number(),
      })
    ),
    saves: v.optional(
      v.object({
        fortitude: v.optional(
          v.object({
            bonus: v.number(),
            proficiency: v.optional(
              v.union(
                v.literal('U'),
                v.literal('T'),
                v.literal('E'),
                v.literal('M'),
                v.literal('L')
              )
            ),
            profValue: v.optional(v.number()),
            itemBonus: v.optional(v.number()),
          })
        ),
        reflex: v.optional(
          v.object({
            bonus: v.number(),
            proficiency: v.optional(
              v.union(
                v.literal('U'),
                v.literal('T'),
                v.literal('E'),
                v.literal('M'),
                v.literal('L')
              )
            ),
            profValue: v.optional(v.number()),
            itemBonus: v.optional(v.number()),
          })
        ),
        will: v.optional(
          v.object({
            bonus: v.number(),
            proficiency: v.optional(
              v.union(
                v.literal('U'),
                v.literal('T'),
                v.literal('E'),
                v.literal('M'),
                v.literal('L')
              )
            ),
            profValue: v.optional(v.number()),
            itemBonus: v.optional(v.number()),
          })
        ),
        perception: v.optional(
          v.object({
            bonus: v.number(),
            proficiency: v.optional(
              v.union(
                v.literal('U'),
                v.literal('T'),
                v.literal('E'),
                v.literal('M'),
                v.literal('L')
              )
            ),
            profValue: v.optional(v.number()),
            itemBonus: v.optional(v.number()),
          })
        ),
      })
    ),
    skills: v.optional(
      v.record(
        v.string(),
        v.object({
          name: v.string(),
          modifier: v.number(),
          proficiency: v.optional(
            v.union(
              v.literal('U'),
              v.literal('T'),
              v.literal('E'),
              v.literal('M'),
              v.literal('L')
            )
          ),
          ability: v.optional(v.string()),
          isLore: v.optional(v.boolean()),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    const character = await ctx.db.get(args.characterId)
    if (!character) {
      throw new Error('Character not found')
    }

    const isAdminUser = await isAdmin(ctx)
    const isCharOwner = character.userId === identity.subject

    if (!isAdminUser && !isCharOwner) {
      const activeSessions = await ctx.db
        .query('sessions')
        .withIndex('by_locked', (q) => q.eq('locked', false))
        .collect()

      const isGmOfAttendingSession = activeSessions.some(
        (s) => s.owner === identity.subject && s.characters?.includes(args.characterId)
      )

      if (!isGmOfAttendingSession) {
        throw new Error('Unauthorized to update character stats')
      }
    }

    const existingDetails = await ctx.db
      .query('characterDetails')
      .withIndex('by_characterId', (q) => q.eq('characterId', args.characterId))
      .first()

    const patchPayload: Record<string, any> = {
      lastSyncedAt: Date.now(),
    }
    if (args.hitPoints !== undefined) patchPayload.hitPoints = args.hitPoints
    if (args.armorClass !== undefined) patchPayload.armorClass = args.armorClass
    if (args.abilities !== undefined) patchPayload.abilities = args.abilities
    if (args.saves !== undefined) patchPayload.saves = args.saves
    if (args.skills !== undefined) patchPayload.skills = args.skills

    if (existingDetails) {
      await ctx.db.patch(existingDetails._id, patchPayload)
    } else {
      await ctx.db.insert('characterDetails', {
        characterId: args.characterId,
        system: character.system === 'DnD' ? 'DnD' : 'PF2e',
        name: character.name,
        level: character.lvl,
        lastSyncedAt: Date.now(),
        ...patchPayload,
      })
    }

    return { success: true }
  },
})


async function assertUniqueCharacterName(
  ctx: MutationCtx,
  name: string,
  excludeCharacterId?: Id<'characters'>
) {
  const trimmed = name.trim()
  if (!trimmed) {
    throw new Error('Character name cannot be empty.')
  }
  const allCharacters = await ctx.db.query('characters').collect()
  const exists = allCharacters.some(
    (c) =>
      (!excludeCharacterId || c._id !== excludeCharacterId) &&
      c.name.trim().toLowerCase() === trimmed.toLowerCase()
  )
  if (exists) {
    throw new Error(`A character named "${trimmed}" already exists. Please choose a unique name.`)
  }
}

export const createCharacter = mutation({
  args: {
    name: v.string(),
    ancestry: v.optional(v.string()),
    class: v.optional(v.string()),
    websiteLink: v.optional(v.string()),
    system: v.union(v.literal('PF'), v.literal('DnD')),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) {
      throw new Error('Not authenticated')
    }
    const trimmedName = args.name.trim()
    await assertUniqueCharacterName(ctx, trimmedName)

    const system = args.system || 'PF'
    const lvl = system === 'DnD' ? 3 : 1
    const characterId = await ctx.db.insert('characters', {
      name: trimmedName,
      ancestry: args.ancestry,
      class: args.class,
      websiteLink: args.websiteLink,
      userId: user.subject,
      lvl,
      xp: 0,
      rank: 'none',
      system,
    })

    await ctx.scheduler.runAfter(0, internal.activity.logActivity, {
        type: 'character_created',
        message: `{user} created a new character: ${trimmedName}!`,
        userId: user.subject,
        metadata: { characterId, name: trimmedName }
    })
  },
})

const COSMETIC_ACHIEVEMENT_REQUIREMENTS: Record<string, string> = {
  // Fonts
  sabon_serif: 'first_session',
  'font-sabon': 'first_session',
  medieval_sharp: 'veteran_player_5',
  'font-medieval': 'veteran_player_5',
  taroca_fantasy: 'master_player_10',
  'font-taroca': 'master_player_10',
  kobold_font: 'kobold_member',
  'font-kobold': 'kobold_member',
  rounded_sans: 'link_discord',
  'font-rounded': 'link_discord',
  cinzel_decorative: 'system_polymath',
  'font-cinzel-dec': 'system_polymath',

  // Colors
  purple_text: 'tutorial_completed',
  '#D8B4FE': 'tutorial_completed',
  teal_text: 'character_trio',
  '#2DD4BF': 'character_trio',
  tangerine_text: 'express_interest',
  '#FB923C': 'express_interest',
  emerald_text: 'availability_5_days',
  '#34D399': 'availability_5_days',
  sky_blue_text: 'visit_world',
  '#38BDF8': 'visit_world',
  amber_text: 'first_commendation',
  '#FBBF24': 'first_commendation',
  ruby_text: 'loot_hoarder_5',
  '#EF4444': 'loot_hoarder_5',
  gold_text: 'rank_guildmaster',
  'gold-text': 'rank_guildmaster',
  rainbow: 'secret_logo_clicks',
  'rainbow-text': 'secret_logo_clicks',
  blaze_text: 'character_streak_5',
  'blaze-fire-text': 'character_streak_5',
  platinum_text: 'black_void_bet_create',
  'platinum-text': 'black_void_bet_create',
  velvet_violet_text: 'black_void_bet_accept',
  'velvet-violet-text': 'black_void_bet_accept',

  // Borders
  bronze_border: 'loot_first',
  'bronze-card-border': 'loot_first',
  purple_border: 'tutorial_completed',
  'purple-card-border': 'tutorial_completed',
  silver_border: 'rank_journeyman',
  'silver-card-border': 'rank_journeyman',
  gold_border: 'rank_guildmaster',
  'gold-card-border': 'rank_guildmaster',
  void_border: 'first_gm_session',
  'void-rotating-border': 'first_gm_session',
  rainbow_border: 'secret_logo_clicks',
  'rainbow-border': 'secret_logo_clicks',
  in_sync_border: 'character_streak_3',
  'in-sync-card-border': 'character_streak_3',
  quest_beacon_border: 'create_character_quest',
  'quest-beacon-border': 'create_character_quest',
  jackpot_border: 'black_void_bet_win',
  'jackpot-card-border': 'black_void_bet_win',

  // Profile Rings
  sprout_ring: 'first_character',
  'sprout-avatar-ring': 'first_character',
  compass_ring: 'worlds_played_3',
  'compass-avatar-ring': 'worlds_played_3',
  multiverse_compass_ring: 'worlds_played_5',
  'multiverse-compass-avatar-ring': 'worlds_played_5',
  laurel_spirit_ring: 'give_1_commendation',
  'laurel-spirit-avatar-ring': 'give_1_commendation',
  laurel_patron_ring: 'give_5_commendations',
  'laurel-patron-avatar-ring': 'give_5_commendations',
  laurel_ring: 'give_10_commendations',
  'laurel-avatar-ring': 'give_10_commendations',
  silver_ring: 'rank_journeyman',
  'silver-avatar-ring': 'rank_journeyman',
  gold_ring: 'rank_guildmaster',
  'gold-avatar-ring': 'rank_guildmaster',
  void_ring: 'veteran_gm_5',
  'void-avatar-ring': 'veteran_gm_5',
  jack_of_all_trades: 'comm_jack_of_all_trades',
  'jack-seal-ring': 'comm_jack_of_all_trades',
  leaderboard_rank: 'visit_leaderboard',
  'leaderboard-rank-badge': 'visit_leaderboard',
  comm_roleplay: 'comm_roleplay',
  'comm-roleplay-badge': 'comm_roleplay',
  comm_tactics: 'comm_tactics',
  'comm-tactics-badge': 'comm_tactics',
  comm_clutch: 'comm_clutch',
  'comm-clutch-badge': 'comm_clutch',
  comm_heroic: 'comm_heroic',
  'comm-heroic-badge': 'comm_heroic',
  gm_favor: 'gm_favor',
  'comm-gm-badge': 'gm_favor',

  // Background Tints
  parchment_bg: 'visit_wiki',
  'parchment-bg-tint': 'visit_wiki',
  purple_tint: 'tutorial_completed',
  'rgba(147, 51, 234, 0.15)': 'tutorial_completed',
  cyan_particles: 'level_5_char',
  'cyan-particle-bg': 'level_5_char',
  crimson_particles: 'level_10_char',
  'crimson-particle-bg': 'level_10_char',
  silver_tint: 'rank_journeyman',
  'silver-bg-tint': 'rank_journeyman',
  gold_tint: 'rank_guildmaster',
  'gold-bg-tint': 'rank_guildmaster',
  void_nebula: 'void_objective_contribution',
  'void-nebula-bg': 'void_objective_contribution',
  blaze_inferno_bg: 'character_streak_10',
  'blaze-inferno-bg': 'character_streak_10',
  gold_coins_bg: 'black_void_auction_listing',
  'gold-coins-bg': 'black_void_auction_listing',
  arcane_runes_bg: 'black_void_service_listing',
  'arcane-runes-bg': 'black_void_service_listing',
  phantom_smoke_bg: 'black_void_bet_lose',
  'phantom-smoke-bg': 'black_void_bet_lose',
}

export const updateCharacter = mutation({
  args: {
    characterId: v.id('characters'),
    name: v.optional(v.string()),
    ancestry: v.optional(v.string()),
    class: v.optional(v.string()),
    websiteLink: v.optional(v.string()),
    system: v.union(v.literal('PF'), v.literal('DnD')),
    cosmetics: v.optional(v.object({
      nameFont: v.optional(v.string()),
      titleFont: v.optional(v.string()),
      subtitleFont: v.optional(v.string()),
      nameColor: v.optional(v.string()),
      titleColor: v.optional(v.string()),
      subtitleColor: v.optional(v.string()),
      borderShape: v.optional(v.string()),
      borderColor: v.optional(v.string()),
      profileBorder: v.optional(v.string()),
      bgColor: v.optional(v.string()),
      avatarUrl: v.optional(v.string()),
    })),
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

    const trimmedName = args.name !== undefined ? args.name.trim() : undefined
    if (trimmedName !== undefined && trimmedName.toLowerCase() !== character.name.trim().toLowerCase()) {
      await assertUniqueCharacterName(ctx, trimmedName, args.characterId)
    }

    if (args.cosmetics) {
      // Validate cosmetics are naturally unlocked for this user
      const userAchievements = await ctx.db
        .query('unlockedAchievements')
        .withIndex('by_userId', (q) => q.eq('userId', user.subject))
        .collect()
      const unlockedAchSet = new Set(userAchievements.map((u) => u.achievementId))
      const userIsMember = await isMember(ctx, user.subject)
      if (userIsMember) {
        unlockedAchSet.add('kobold_member')
      }

      const hasWorldCosmetic =
        args.cosmetics.borderShape?.startsWith('world_border_') ||
        args.cosmetics.profileBorder?.startsWith('world_ring_') ||
        args.cosmetics.bgColor?.startsWith('world_bg_')

      let worldStreaksMap: Record<string, { streak: number; isOwner: boolean }> = {}
      if (hasWorldCosmetic) {
        worldStreaksMap = await getUserWorldStreaksMap(ctx, user.subject)
      }

      const validateItem = (val: string | undefined, category: string) => {
        if (!val || val === 'default' || val === '' || val === 'font-sans' || val === 'rounded-lg border border-border' || val === 'border border-border') {
          return
        }

        // Check world streak cosmetics
        if (category === 'borderShape' && val.startsWith('world_border_')) {
          const wId = val.replace('world_border_', '')
          const w = worldStreaksMap[wId]
          const isUnlocked = Boolean(w?.isOwner || (w?.streak ?? 0) >= 10)
          if (!isUnlocked) {
            throw new Error(`Locked cosmetic equipped: World Sigil Sparkles Border (requires World Streak 10). Cannot save locked cosmetics.`)
          }
          return
        }

        if (category === 'profileBorder' && val.startsWith('world_ring_')) {
          const wId = val.replace('world_ring_', '')
          const w = worldStreaksMap[wId]
          const isUnlocked = Boolean(w?.isOwner || (w?.streak ?? 0) >= 3)
          if (!isUnlocked) {
            throw new Error(`Locked cosmetic equipped: World Sigil Ring (requires World Streak 3). Cannot save locked cosmetics.`)
          }
          return
        }

        if (category === 'bgColor' && val.startsWith('world_bg_')) {
          const wId = val.replace('world_bg_', '')
          const w = worldStreaksMap[wId]
          const isUnlocked = Boolean(w?.isOwner || (w?.streak ?? 0) >= 5)
          if (!isUnlocked) {
            throw new Error(`Locked cosmetic equipped: World Sigil Starlight Tint (requires World Streak 5). Cannot save locked cosmetics.`)
          }
          return
        }

        // Check achievement requirements
        const reqAch = COSMETIC_ACHIEVEMENT_REQUIREMENTS[val]
        if (reqAch && !unlockedAchSet.has(reqAch)) {
          throw new Error(`Locked cosmetic equipped: ${val} (requires achievement "${reqAch}"). Cannot save locked cosmetics.`)
        }
      }

      validateItem(args.cosmetics.nameFont, 'font')
      validateItem(args.cosmetics.titleFont, 'font')
      validateItem(args.cosmetics.subtitleFont, 'font')
      validateItem(args.cosmetics.nameColor, 'color')
      validateItem(args.cosmetics.titleColor, 'color')
      validateItem(args.cosmetics.subtitleColor, 'color')
      validateItem(args.cosmetics.borderShape, 'borderShape')
      validateItem(args.cosmetics.profileBorder, 'profileBorder')
      validateItem(args.cosmetics.bgColor, 'bgColor')

      if (args.cosmetics.avatarUrl && !userIsMember) {
        throw new Error('Custom character portrait is a Member benefit. Cannot save without active membership.')
      }
    }

    await ctx.db.patch(args.characterId, {
      name: trimmedName !== undefined ? trimmedName : character.name,
      ancestry: args.ancestry,
      class: args.class,
      websiteLink: args.websiteLink,
      system: args.system,
      cosmetics: args.cosmetics,
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
    system: v.union(v.literal('PF'), v.literal('DnD')),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const isAdminUser = await isAdmin(ctx)
    if (!isAdminUser) {
      throw new Error('Only admins can update any character')
    }

    const oldCharacter = await ctx.db.get(args.characterId)
    const trimmedName = args.name.trim()
    if (!oldCharacter || trimmedName.toLowerCase() !== oldCharacter.name.trim().toLowerCase()) {
      await assertUniqueCharacterName(ctx, trimmedName, args.characterId)
    }

    await ctx.db.patch(args.characterId, {
      name: trimmedName,
      lvl: args.lvl,
      xp: args.xp,
      ancestry: args.ancestry,
      class: args.class,
      websiteLink: args.websiteLink,
      rank: args.rank,
      system: args.system,
      title: args.title,
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

export const getCharacterProfile = query({
  args: { characterId: v.id('characters') },
  handler: async (ctx, args) => {
    const character = await ctx.db.get(args.characterId)
    if (!character) return null

    const identity = await ctx.auth.getUserIdentity()
    const isAdminUser = await isAdmin(ctx)
    const isOwner = identity ? identity.subject === character.userId : false

    // Fetch character's owner info for avatar
    const owner = await ctx.db
      .query('users')
      .withIndex('by_userId', (q) => q.eq('userId', character.userId))
      .first()

    // Fetch all commendations received by this character
    const commendations = await ctx.db
      .query('commendations')
      .withIndex('by_toCharacter', (q) => q.eq('toCharacterId', args.characterId))
      .collect()

    const commendationSummary = {
      total: commendations.length,
      roleplay: 0,
      tactics: 0,
      clutch: 0,
      heroic: 0,
      gm: 0,
    }

    for (const c of commendations) {
      if (c.category in commendationSummary) {
        commendationSummary[c.category as keyof typeof commendationSummary] += 1
      }
    }

    // Fetch all quotes by this character
    const quotes = await ctx.db
      .query('quotes')
      .withIndex('by_character', (q) => q.eq('characterId', args.characterId))
      .collect()

    // Resolve quoter user names
    const quoterUserIds = Array.from(new Set(quotes.map((q) => q.userId).filter(Boolean))) as string[]
    const quoterUserDocs = await Promise.all(
      quoterUserIds.map((uid) =>
        ctx.db
          .query('users')
          .withIndex('by_userId', (q) => q.eq('userId', uid))
          .first()
      )
    )
    const quoterMap = new Map<string, string>()
    quoterUserIds.forEach((uid, idx) => {
      const u = quoterUserDocs[idx]
      const name = u?.name || u?.username || 'Adventurer'
      quoterMap.set(uid, name)
    })

    interface QuoteProfileItem {
      _id: Id<'quotes'>
      quote: string
      quoterName?: string
      userId?: string
    }

    const quotesBySession = new Map<string, QuoteProfileItem[]>()
    for (const q of quotes) {
      const list = quotesBySession.get(q.sessionId) || []
      list.push({
        _id: q._id,
        quote: q.quote,
        userId: q.userId,
        quoterName: q.userId ? quoterMap.get(q.userId) || 'Adventurer' : undefined,
      })
      quotesBySession.set(q.sessionId, list)
    }

    // Fetch sessions
    // Locked sessions
    const lockedSessions = await ctx.db
      .query('sessions')
      .withIndex('by_locked', (q) => q.eq('locked', true))
      .collect()
    // Unlocked sessions
    const unlockedSessions = await ctx.db
      .query('sessions')
      .withIndex('by_locked', (q) => q.eq('locked', false))
      .collect()

    const allSessions = [...lockedSessions, ...unlockedSessions]

    // Sort chronologically ascending
    allSessions.sort((a, b) => {
      const dateA = a.date || a._creationTime
      const dateB = b.date || b._creationTime
      return dateA - dateB
    })

    const isAttending = (s: typeof allSessions[0]) => {
      return (
        Array.isArray(s.characters) &&
        s.characters.includes(args.characterId) &&
        s.gmCharacter !== args.characterId
      )
    }

    const attendingSessions = allSessions.filter(isAttending)

    // Calculate streaks:
    // 1. Current world streak (for the most recent session played)
    // 2. Max world streak across history
    // 3. Consecutive session attendance streak (among all locked sessions)
    let maxWorldStreak = 0
    let currentWorldStreak = 0
    let currentWorldName: string | undefined = undefined

    // Calculate world streaks over attended locked sessions
    const lockedAttendedSessions = attendingSessions.filter((s) => Boolean(s.locked))
    let trackedWorldId: string | null = null
    let tempWorldStreak = 0

    for (const s of lockedAttendedSessions) {
      const wId = s.world ? s.world.toString() : null
      if (wId && wId === trackedWorldId) {
        tempWorldStreak += 1
      } else {
        trackedWorldId = wId
        tempWorldStreak = wId ? 1 : 0
      }
      if (tempWorldStreak > maxWorldStreak) {
        maxWorldStreak = tempWorldStreak
      }
    }

    // Current world streak from the latest session backwards
    if (lockedAttendedSessions.length > 0) {
      const latest = lockedAttendedSessions[lockedAttendedSessions.length - 1]
      if (latest.world) {
        for (let i = lockedAttendedSessions.length - 1; i >= 0; i--) {
          if (lockedAttendedSessions[i].world === latest.world) {
            currentWorldStreak += 1
          } else {
            break
          }
        }
      }
    }

    // Attendance streak: consecutive locked sessions in the guild that this character attended
    // from the latest locked session backwards
    // Sessions where this character was the GM are ignored (do not break streak and do not increment streak)
    const sortedLocked = allSessions.filter((s) => Boolean(s.locked))
    let attendanceStreak = 0
    for (let i = sortedLocked.length - 1; i >= 0; i--) {
      const s = sortedLocked[i]
      if (s.gmCharacter === args.characterId) {
        // Ignored: GM session doesn't count for player streak, but also doesn't break it
        continue
      }
      if (isAttending(s)) {
        attendanceStreak += 1
      } else {
        break
      }
    }

    // Map worlds
    const worldIds = Array.from(
      new Set(attendingSessions.map((s) => s.world).filter(Boolean))
    )
    const worldDocs = await Promise.all(worldIds.map((wId) => ctx.db.get(wId)))
    const worldMap = new Map<string, string>()
    worldDocs.forEach((w) => {
      if (w) worldMap.set(w._id, w.name)
    })

    // Calculate "Best Friend" / Most played with companion:
    // Count how many locked sessions this character attended together with each other character (excluding GM character)
    const companionCounts = new Map<string, number>()
    for (const s of lockedAttendedSessions) {
      if (!Array.isArray(s.characters)) continue
      const gmCharId = s.gmCharacter ? s.gmCharacter.toString() : null
      for (const charId of s.characters) {
        const charIdStr = charId.toString()
        // Do not count oneself, and do not count the GM character
        if (charIdStr === args.characterId || charIdStr === gmCharId) continue
        companionCounts.set(charIdStr, (companionCounts.get(charIdStr) || 0) + 1)
      }
    }

    let bestFriend: {
      _id: Id<'characters'>
      name: string
      lvl: number
      class?: string
      ancestry?: string
      sharedSessionsCount: number
      avatarUrl?: string
    } | null = null

    if (companionCounts.size > 0) {
      let topCharId: string | null = null
      let topCount = 0
      for (const [cId, count] of companionCounts.entries()) {
        if (count > topCount) {
          topCount = count
          topCharId = cId
        }
      }
      if (topCharId && topCount > 0) {
        const friendDoc = await ctx.db.get(topCharId as Id<'characters'>)
        if (friendDoc) {
          const friendOwner = await ctx.db
            .query('users')
            .withIndex('by_userId', (q) => q.eq('userId', friendDoc.userId))
            .first()

          bestFriend = {
            _id: friendDoc._id,
            name: friendDoc.name,
            lvl: friendDoc.lvl,
            class: friendDoc.class,
            ancestry: friendDoc.ancestry,
            sharedSessionsCount: topCount,
            avatarUrl: friendDoc.cosmetics?.avatarUrl || friendOwner?.imageUrl,
          }
        }
      }
    }

    if (lockedAttendedSessions.length > 0) {
      const latest = lockedAttendedSessions[lockedAttendedSessions.length - 1]
      if (latest.world) {
        currentWorldName = worldMap.get(latest.world)
      }
    }

    // Prepare session history list (sorted descending by date)
    // Filter out private sessions if caller is not authorized
    const visibleSessions = attendingSessions.filter((s) => {
      if (!s.isPrivate) return true
      if (identity && identity.subject === s.owner) return true
      if (isAdminUser) return true
      if (isOwner) return true
      return false
    })

    const sessionsWithContext = visibleSessions.map((s) => {
      const sessionComms = commendations.filter((c) => c.sessionId === s._id)
      const commsBreakdown = {
        total: sessionComms.length,
        roleplay: sessionComms.filter((c) => c.category === 'roleplay').length,
        tactics: sessionComms.filter((c) => c.category === 'tactics').length,
        clutch: sessionComms.filter((c) => c.category === 'clutch').length,
        heroic: sessionComms.filter((c) => c.category === 'heroic').length,
        gm: sessionComms.filter((c) => c.category === 'gm').length,
      }
      const sessionQuotes = quotesBySession.get(s._id) || []

      return {
        _id: s._id,
        date: s.date,
        inGameDate: s.inGameDate,
        worldName: s.world ? worldMap.get(s.world) || 'Unknown World' : 'The Void',
        system: s.system,
        level: s.level,
        locked: s.locked,
        isGm: s.gmCharacter === args.characterId,
        commendations: commsBreakdown,
        quotes: sessionQuotes,
      }
    })

    sessionsWithContext.sort((a, b) => (b.date || 0) - (a.date || 0))

    const ownerDisplayName = formatUserDisplayName(owner?.name, owner?.username, character.userId)

    const ownerCharacters = await ctx.db
      .query('characters')
      .withIndex('by_userId', (q) => q.eq('userId', character.userId))
      .collect()

    const ownerCharIdSet = new Set(ownerCharacters.map((c) => c._id))
    const totalSessionsPlayed =
      (owner?.extraSessionsPlayed || 0) +
      allSessions.filter(
        (s) => Boolean(s.locked) && s.characters.some((cid) => ownerCharIdSet.has(cid))
      ).length

    const totalSessionsRan =
      (owner?.extraSessionsRan || 0) +
      allSessions.filter((s) => Boolean(s.locked) && s.owner === character.userId).length

    const ownerIsMember = await isMember(ctx, character.userId)

    return {
      character: {
        ...character,
        isMember: ownerIsMember,
      },
      owner: {
        userId: character.userId,
        imageUrl: owner?.imageUrl,
        name: ownerDisplayName,
        rawName: owner?.name || owner?.username || null,
        username: owner?.username || null,
        discordUsername: owner?.discordUsername || null,
        isMember: ownerIsMember,
        isGM: Boolean(owner?.isGM),
        isAdmin: Boolean(owner?.isAdmin),
        totalSessionsPlayed,
        totalSessionsRan,
        totalCharacters: ownerCharacters.length,
      },
      isOwner,
      isAdmin: isAdminUser,
      commendations: commendationSummary,
      streaks: {
        currentWorldStreak,
        maxWorldStreak,
        currentWorldName,
        attendanceStreak,
      },
      bestFriend,
      sessions: sessionsWithContext,
    }
  },
})

