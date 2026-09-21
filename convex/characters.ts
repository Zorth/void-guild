import { query, mutation, QueryCtx } from './_generated/server'
import { v } from 'convex/values'
import { internal } from './_generated/api'
import { isAdmin } from './roles'

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
    return characters.filter((c) => c !== null)
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
    const system = args.system || 'PF'
    const lvl = system === 'DnD' ? 3 : 1
    const characterId = await ctx.db.insert('characters', {
      name: args.name,
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
        message: `{user} created a new character: ${args.name}!`,
        userId: user.subject,
        metadata: { characterId, name: args.name }
    })
  },
})

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
    await ctx.db.patch(args.characterId, {
      name: args.name,
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

    await ctx.db.patch(args.characterId, {
      name: args.name,
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

    const quotesBySession = new Map<string, string[]>()
    for (const q of quotes) {
      const list = quotesBySession.get(q.sessionId) || []
      list.push(q.quote)
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

    return {
      character,
      owner: {
        userId: character.userId,
        imageUrl: owner?.imageUrl,
        name: owner?.name || owner?.username || 'Unknown Adventurer',
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
      sessions: sessionsWithContext,
    }
  },
})

