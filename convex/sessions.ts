import { query, mutation, QueryCtx, MutationCtx } from './_generated/server'
import { v } from 'convex/values'
import { Doc, Id } from './_generated/dataModel'
import { internal } from './_generated/api'
import { isAdmin, isGameMaster, isMember, extractClaim } from './roles'
import { applyContributionHelper } from './voidObjectives'
import { formatUserDisplayName } from './users'
import { adjustCharacterMoney, parseGpAmount } from './moneyHelpers'
import { syncActiveSessionsForQuestChange } from './questSyncHelpers'
import { evaluateAndSyncUserAchievements } from './achievements'
import { removeUserAvailabilityOnDate } from './planning'
import { deletePinsForQuest } from './maps'

/**
 * XP gain based on session level and character level.
 * Level 1 and 2 sessions count as minimum level 3 for XP calculation.
 */
export function calculateXPGain(sessionLevel: number, characterLevel: number, isGM: boolean): number {
  if (isGM) return 250

  const effectiveSessionLevel = Math.max(3, sessionLevel)
  const L = effectiveSessionLevel - characterLevel
  let xpGain = 0
  if (L % 2 === 0) {
    xpGain = 250 * Math.pow(2, L / 2)
  } else {
    xpGain = 375 * Math.pow(2, (L - 1) / 2)
  }
  return Math.round(xpGain)
}

/**
 * Calculates new level and XP into that level after gain.
 */
function calculateNewStats(oldLvl: number, oldXp: number, gain: number) {
    const totalXp = (oldLvl - 1) * 1000 + oldXp + gain
    const newLvl = Math.floor(totalXp / 1000) + 1
    const newXp = totalXp % 1000
    return { lvl: Math.max(1, newLvl), xp: Math.max(0, newXp) }
}

export const debugIdentity = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return { status: 'not authenticated' }
    return {
      identity,
      tokenIdentifier: identity.tokenIdentifier,
      issuer: identity.issuer,
      subject: identity.subject,
      keys: Object.keys(identity),
      allProps: { ...identity }
    }
  },
})

export const isGameMasterQuery = query({
  args: {},
  handler: async (ctx) => {
    return await isGameMaster(ctx)
  },
})

export const isAdminQuery = query({
    args: {},
    handler: async (ctx) => {
      return await isAdmin(ctx)
    },
})

export function computeEffectiveLevel(session: Doc<'sessions'>, quest: Doc<'quests'> | null): number | undefined {
  if (session.isIntro) {
    return session.system === 'PF' ? 1 : 3
  }
  const numericSessionLevel = typeof session.level === 'number' ? session.level : undefined
  if (!quest) return numericSessionLevel
  const levelPF = quest.levelPF ?? quest.level
  const levelDnD = quest.levelDnD ?? quest.level

  if (session.system === 'PF') {
    return levelPF ?? numericSessionLevel
  }
  if (session.system === 'DnD') {
    return levelDnD ?? numericSessionLevel
  }
  if (levelPF !== undefined && levelDnD === undefined) return levelPF
  if (levelDnD !== undefined && levelPF === undefined) return levelDnD
  if (levelPF !== undefined && levelDnD !== undefined && levelPF === levelDnD) return levelPF
  return numericSessionLevel
}

export const listSessions = query({
  args: { past: v.boolean() },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) {
      return []
    }

    const allSessions = await ctx.db
      .query('sessions')
      .withIndex('by_locked', (q) => q.eq('locked', args.past))
      .collect()

    // Fetch caller's characters and admin status to evaluate private session visibility
    const userCharacters = await ctx.db
      .query('characters')
      .withIndex('by_userId', (q) => q.eq('userId', user.subject))
      .collect()
    const userCharIds = new Set(userCharacters.map((c) => c._id))
    const isAdminUser = await isAdmin(ctx)

    // Private sessions are unlisted and hidden from general session lists unless the user
    // is the session owner, has a character in the session, or is an admin.
    const sessions = allSessions.filter((s) => {
      if (!s.isPrivate) return true
      if (user.subject === s.owner) return true
      if (isAdminUser) return true
      if (s.characters && s.characters.some((id) => userCharIds.has(id))) return true
      return false
    })

    // Batch-fetch all referenced characters, worlds, and quests to prevent N+1 document reads
    const allCharIds = Array.from(new Set(sessions.flatMap((s) => s.characters || [])))
    const allWorldIds = Array.from(new Set(sessions.map((s) => s.world).filter((w): w is Id<'worlds'> => Boolean(w))))
    const allQuestIds = Array.from(new Set(sessions.map((s) => s.questId).filter((q): q is Id<'quests'> => Boolean(q))))

    const [charDocs, worldDocs, questDocs] = await Promise.all([
      Promise.all(allCharIds.map((id) => ctx.db.get(id))),
      Promise.all(allWorldIds.map((id) => ctx.db.get(id))),
      Promise.all(allQuestIds.map((id) => ctx.db.get(id))),
    ])

    const charMap = new Map<string, Doc<'characters'>>()
    charDocs.forEach((c) => { if (c) charMap.set(c._id, c) })

    const worldMap = new Map<string, Doc<'worlds'>>()
    worldDocs.forEach((w) => { if (w) worldMap.set(w._id, w) })

    const questMap = new Map<string, Doc<'quests'>>()
    questDocs.forEach((q) => { if (q) questMap.set(q._id, q) })

    const sessionsWithDetails = sessions.map((session) => {
      const characterDocs = (session.characters || [])
        .map((id) => charMap.get(id))
        .filter((c): c is Doc<'characters'> => Boolean(c))
      const worldDoc = session.world ? worldMap.get(session.world) ?? null : null
      let questDoc = session.questId && !session.isIntro ? questMap.get(session.questId) ?? null : null
      const isWorldOwner = worldDoc && user.subject === worldDoc.owner
      if (questDoc?.isHidden && !isWorldOwner && !isAdminUser) {
        questDoc = null
      }
      if (!session.locked && questDoc?.isCompleted) {
        questDoc = null
      }
      return {
        ...session,
        level: computeEffectiveLevel(session, questDoc),
        worldName: worldDoc ? worldDoc.name : 'Unknown World',
        characterNames: characterDocs.map((c) => c.name),
        isOwner: user.subject === session.owner,
        quest: questDoc,
      }
    })

    return sessionsWithDetails.sort((a, b) => {
      if (args.past) {
        return (b.date || 0) - (a.date || 0);
      }
      
      // Planning sessions first
      const aIsPlanning = a.planning || !a.date;
      const bIsPlanning = b.planning || !b.date;
      if (aIsPlanning && !bIsPlanning) return -1;
      if (!aIsPlanning && bIsPlanning) return 1;

      // Then by date
      if (a.date && b.date) return a.date - b.date;
      return 0;
    })
  },
})

export const publicListSessions = query({
  args: { past: v.boolean() },
  handler: async (ctx, args) => {
    const allSessions = await ctx.db
      .query('sessions')
      .withIndex('by_locked', (q) => q.eq('locked', args.past))
      .collect()

    // Public list strictly excludes private sessions
    const sessions = allSessions.filter(s => !s.isPrivate)

    // Batch-fetch all referenced characters, worlds, and quests to prevent N+1 document reads
    const allCharIds = Array.from(new Set(sessions.flatMap((s) => s.characters || [])))
    const allWorldIds = Array.from(new Set(sessions.map((s) => s.world).filter((w): w is Id<'worlds'> => Boolean(w))))
    const allQuestIds = Array.from(new Set(sessions.map((s) => s.questId).filter((q): q is Id<'quests'> => Boolean(q))))

    const [charDocs, worldDocs, questDocs] = await Promise.all([
      Promise.all(allCharIds.map((id) => ctx.db.get(id))),
      Promise.all(allWorldIds.map((id) => ctx.db.get(id))),
      Promise.all(allQuestIds.map((id) => ctx.db.get(id))),
    ])

    const charMap = new Map<string, Doc<'characters'>>()
    charDocs.forEach((c) => { if (c) charMap.set(c._id, c) })

    const worldMap = new Map<string, Doc<'worlds'>>()
    worldDocs.forEach((w) => { if (w) worldMap.set(w._id, w) })

    const questMap = new Map<string, Doc<'quests'>>()
    questDocs.forEach((q) => { if (q) questMap.set(q._id, q) })

    const sessionsWithDetails = sessions.map((session) => {
      const characterDocs = (session.characters || [])
        .map((id) => charMap.get(id))
        .filter((c): c is Doc<'characters'> => Boolean(c))
      const worldDoc = session.world ? worldMap.get(session.world) ?? null : null
      let questDoc = session.questId && !session.isIntro ? questMap.get(session.questId) ?? null : null
      if (questDoc?.isHidden) {
        questDoc = null
      }
      return {
        ...session,
        level: computeEffectiveLevel(session, questDoc),
        worldName: worldDoc ? worldDoc.name : 'Unknown World',
        characterNames: characterDocs.map((c) => c.name),
        isOwner: false,
        quest: questDoc,
      }
    })

    return sessionsWithDetails.sort((a, b) => {
        if (args.past) {
          return (b.date || 0) - (a.date || 0);
        }

        // Planning sessions first
        const aIsPlanning = a.planning || !a.date;
        const bIsPlanning = b.planning || !b.date;
        if (aIsPlanning && !bIsPlanning) return -1;
        if (!aIsPlanning && bIsPlanning) return 1;

        // Then by date
        if (a.date && b.date) return a.date - b.date;
        return 0;
    })
  },
})

export const listUserJoinedSessions = query({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) return null

    const userCharacters = await ctx.db
      .query('characters')
      .withIndex('by_userId', (q) => q.eq('userId', user.subject))
      .collect()
    
    const userCharacterIds = new Set(userCharacters.map(c => c._id))
    if (userCharacterIds.size === 0) return []

    const unlockedSessions = await ctx.db
      .query('sessions')
      .withIndex('by_locked', (q) => q.eq('locked', false))
      .collect()

    const recentLockedSessions = await ctx.db
      .query('sessions')
      .withIndex('by_locked', (q) => q.eq('locked', true))
      .order('desc')
      .take(15)

    const allSessions = [...unlockedSessions, ...recentLockedSessions]
    
    return allSessions.filter(session => 
        session.characters.some(charId => userCharacterIds.has(charId))
    ).map(session => ({
        _id: session._id,
        locked: session.locked,
        world: session.world,
        date: session.date
    }))
  }
})

export const getPublicSession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;

    const world = await ctx.db.get(session.world);
    const attendingCharacters = await Promise.all(
      session.characters.map((id) => ctx.db.get(id))
    );
    
    return {
      _id: session._id,
      date: session.date,
      worldName: world?.name || "Unknown World",
      system: session.system,
      level: session.level,
      maxPlayers: session.maxPlayers,
      attendingCharacters: attendingCharacters
        .filter((c): c is Doc<'characters'> => c !== null)
        .map(c => ({ name: c.name, lvl: c.lvl })),
      interestedCount: (session.interestedPlayers || []).length,
      planning: session.planning,
      isPrivate: session.isPrivate,
      isIntro: session.isIntro,
      location: session.location,
    };
  },
});

export const getAttendingCharacterRelationships = query({
  args: {
    sessionId: v.id('sessions'),
    userCharacterId: v.id('characters'),
  },
  handler: async (ctx, args) => {
    const currentSession = await ctx.db.get(args.sessionId)
    if (!currentSession) return {}

    const user = await ctx.auth.getUserIdentity()
    if (!user) return {}

    const myCharacter = await ctx.db.get(args.userCharacterId)
    if (!myCharacter || myCharacter.userId !== user.subject) return {}

    const lockedSessions = await ctx.db
      .query('sessions')
      .withIndex('by_locked', (q) => q.eq('locked', true))
      .collect()
    
    lockedSessions.sort((a, b) => {
      const dateA = a.date ?? a._creationTime
      const dateB = b.date ?? b._creationTime
      if (dateA !== dateB) return dateA - dateB
      return a._creationTime - b._creationTime
    })

    const currentSessionTime = currentSession.date || currentSession._creationTime

    const pastSessions = lockedSessions.filter(s => 
      s._id !== args.sessionId &&
      (s.date || s._creationTime) <= currentSessionTime
    )

    const worldIds = Array.from(new Set(lockedSessions.map(s => s.world).filter((w): w is Id<'worlds'> => Boolean(w))))
    const worlds = await Promise.all(worldIds.map(id => ctx.db.get(id)))
    const worldMap = new Map<string, string>()
    worlds.forEach(w => {
      if (w) worldMap.set(w._id, w.name)
    })

    const relationships: Record<string, {
      count: number;
      isNew: boolean;
      lastSession: {
        _id: Id<'sessions'>;
        date?: number;
        inGameDate?: { year: number; month: number; day: number; era?: string };
        worldName?: string;
      } | null;
      streak: number;
      worldCount?: number;
      isNewToWorld?: boolean;
      worldStreak?: number;
      worldName?: string;
    }> = {}

    const currentChars = Array.isArray(currentSession.characters) ? currentSession.characters : []
    const allAttendingIds = Array.from(new Set([
      ...currentChars,
      ...(currentSession.gmCharacter ? [currentSession.gmCharacter] : [])
    ]))

    // A character attends as a player ONLY if they are in s.characters AND NOT the GM character
    const isPlayerAttending = (charId: string, s: Doc<'sessions'>) => {
      if (s.gmCharacter && String(s.gmCharacter) === String(charId)) return false
      return Array.isArray(s.characters) && s.characters.some(id => String(id) === String(charId))
    }

    const isUserGMInCurrentSession = Boolean(
      currentSession.gmCharacter && String(currentSession.gmCharacter) === String(args.userCharacterId)
    )

    for (const charId of allAttendingIds) {
      let count = 0
      let isNew = false
      let lastSessionInfo = null
      let streak = 0

      const isTargetGMInCurrentSession = Boolean(
        currentSession.gmCharacter && String(currentSession.gmCharacter) === String(charId)
      )

      // Mutual player relationships: only between two different player characters (neither can be the GM)
      if (charId !== args.userCharacterId && !isUserGMInCurrentSession && !isTargetGMInCurrentSession) {
        const coPastSessions = pastSessions.filter(s =>
          isPlayerAttending(args.userCharacterId, s) && isPlayerAttending(charId, s)
        )
        const bothInCurrent =
          isPlayerAttending(args.userCharacterId, currentSession) &&
          isPlayerAttending(charId, currentSession)

        count = coPastSessions.length + (bothInCurrent ? 1 : 0)
        isNew = bothInCurrent && coPastSessions.length === 0

        if (coPastSessions.length > 0) {
          const last = coPastSessions[coPastSessions.length - 1]
          lastSessionInfo = {
            _id: last._id,
            date: last.date,
            inGameDate: last.inGameDate,
            worldName: last.world ? (worldMap.get(last.world) || 'Unknown World') : 'Unknown World',
          }
        }

        if (bothInCurrent) {
          streak += 1
        }

        // Filter past sessions to those where EITHER user character OR target character attended as a player
        const relevantPastSessions = pastSessions.filter(s =>
          isPlayerAttending(args.userCharacterId, s) || isPlayerAttending(charId, s)
        )

        // Mutual streak calculation: break if EITHER character played a past session without the other
        for (let i = relevantPastSessions.length - 1; i >= 0; i--) {
          const pastS = relevantPastSessions[i]
          const hasUser = isPlayerAttending(args.userCharacterId, pastS)
          const hasTarget = isPlayerAttending(charId, pastS)
          
          if (hasUser && hasTarget) {
            streak += 1
          } else {
            break
          }
        }
      }

      // World Stats for this character as a player
      const charPastSessions = pastSessions.filter(s => isPlayerAttending(charId, s))
      const charWorldPastSessions = charPastSessions.filter(s =>
        Boolean(currentSession.world) && String(s.world) === String(currentSession.world)
      )
      
      const charInCurrent = isPlayerAttending(charId, currentSession)
      const worldCount = charWorldPastSessions.length + (charInCurrent && currentSession.world ? 1 : 0)
      const isNewToWorld = Boolean(currentSession.world) && charInCurrent && charWorldPastSessions.length === 0

      let worldStreak = 0
      if (currentSession.world && charInCurrent) {
        worldStreak += 1
        for (let i = charPastSessions.length - 1; i >= 0; i--) {
          const s = charPastSessions[i]
          if (String(s.world) === String(currentSession.world)) {
            worldStreak += 1
          } else {
            break
          }
        }
      }
      const worldName = currentSession.world ? (worldMap.get(currentSession.world) || 'Unknown World') : undefined

      relationships[charId] = {
        count,
        isNew,
        lastSession: lastSessionInfo,
        streak,
        worldCount,
        isNewToWorld,
        worldStreak,
        worldName,
      }
    }

    return relationships
  },
});

export const getSession = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()

    const sessionId = ctx.db.normalizeId('sessions', args.sessionId)
    if (!sessionId) return null

    const isAdminUser = await isAdmin(ctx)
    const session = await ctx.db.get(sessionId)
    if (!session) return null

    const characterDocs = await Promise.all(
      (session.characters || []).map((id) => ctx.db.get(id))
    )

    const isOwner = user ? (user.subject === session.owner) : false
    const canManage = user ? (isOwner || isAdminUser) : false
    let gmCharacterData = null
    if (session.gmCharacter) {
        const gmChar = await ctx.db.get(session.gmCharacter)
        if (gmChar) {
            gmCharacterData = gmChar
        }
    }

    let guildmasterCutCharacterData = null
    if (session.guildmasterCut?.characterId) {
        const gmCutChar = await ctx.db.get(session.guildmasterCut.characterId)
        if (gmCutChar) {
            guildmasterCutCharacterData = gmCutChar
        }
    }

    const worldDoc = session.world ? await ctx.db.get(session.world as Id<'worlds'>) : null
    const isWorldOwner = worldDoc && user?.subject === worldDoc.owner
    
    let quest: any = null
    if (session.questId && !session.isIntro) {
        const qDoc = await ctx.db.get(session.questId)
        if (qDoc && (!qDoc.isHidden || isWorldOwner || isAdminUser) && (session.locked || !qDoc.isCompleted)) {
          let issuerCharacter = null
          if (qDoc.characterId) {
            const char = await ctx.db.get(qDoc.characterId)
            if (char) {
              issuerCharacter = {
                _id: char._id,
                name: char.name,
                rank: char.rank,
                lvl: char.lvl,
              }
            }
          }
          quest = {
            ...qDoc,
            issuerCharacter,
          }
        }
    }

    let hasMap = false
    if (session.world) {
      const firstMap = await ctx.db
        .query('worldMaps')
        .withIndex('by_worldId', (q) => q.eq('worldId', session.world))
        .first()
      hasMap = !!firstMap
    }

    const validCharacterDocs = characterDocs.filter((c): c is Doc<'characters'> => c !== null)
    const userIds = Array.from(new Set(validCharacterDocs.map((c) => c.userId)))
    const userMap = new Map<string, boolean>()
    await Promise.all(
      userIds.map(async (uId) => {
        const isMem = await isMember(ctx, uId)
        userMap.set(uId, isMem)
      })
    )

    const attendingCharacters = validCharacterDocs.map((c) => ({
      ...c,
      isMember: userMap.get(c.userId) ?? false,
    }))

    return {
      ...session,
      level: computeEffectiveLevel(session, quest),
      worldName: worldDoc ? (worldDoc as Doc<'worlds'>).name : 'Unknown World',
      // Hide gmCharacter ID from non-managers
      gmCharacter: canManage ? session.gmCharacter : undefined,
      gmCharacterData: gmCharacterData,
      guildmasterCutCharacterData,
      attendingCharacters,
      isOwner,
      canManage,
      interestedPlayers: session.interestedPlayers || [], // Include interested players
      quest: quest,
      hasMap,
    }
  },
})

export const selectQuest = mutation({
  args: { sessionId: v.id('sessions'), questId: v.optional(v.id('quests')) },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) {
      throw new Error('Not authenticated')
    }

    const session = await ctx.db.get(args.sessionId)
    if (!session) {
      throw new Error('Session not found')
    }

    const isAdminUser = await isAdmin(ctx)
    if (session.owner !== user.subject && !isAdminUser) {
      throw new Error('Only the session owner or an admin can select a quest.')
    }

    if (session.isIntro) {
      throw new Error('Intro sessions do not use quests.')
    }

    if (args.questId) {
      const quest = await ctx.db.get(args.questId)
      if (!quest) throw new Error('Quest not found')
      if (quest.isCompleted) throw new Error('This quest has already been completed.')
      if (quest.isHidden) throw new Error('This quest is hidden.')
    }

    await ctx.db.patch(args.sessionId, { questId: args.questId })

    await ctx.scheduler.runAfter(0, internal.discord.syncSessionToDiscord, {
      sessionId: args.sessionId
    })
  },
})

export const previewXPGains = query({
    args: { sessionId: v.string() },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity()
        if (!user) return null
        
        const sessionId = ctx.db.normalizeId('sessions', args.sessionId)
        if (!sessionId) return null

        const session = await ctx.db.get(sessionId)
        if (!session) return null

        const quest = session.questId ? await ctx.db.get(session.questId) : null
        const effectiveLevel = computeEffectiveLevel(session, quest)

        if (effectiveLevel === undefined) {
            return []
        }

        const characterIds = [...session.characters];
        if (session.gmCharacter && !characterIds.includes(session.gmCharacter)) {
            characterIds.push(session.gmCharacter)
        }
        
        const characters = await Promise.all(characterIds.map(id => ctx.db.get(id)))
        
        return characters.filter((c): c is Doc<'characters'> => c !== null).map(char => {
            const xpGain = calculateXPGain(effectiveLevel, char.lvl, char._id === session.gmCharacter)
            const { lvl: newLvl, xp: newXp } = calculateNewStats(char.lvl, char.xp, xpGain)
            return {
                id: char._id,
                name: char.name,
                rank: char.rank,
                currentLvl: char.lvl,
                currentXp: char.xp,
                xpGain,
                newLvl,
                newXp,
                isGMCharacter: char._id === session.gmCharacter
            }
        })
    }
})

export const createSession = mutation({
  args: {
    date: v.optional(v.number()),
    level: v.optional(v.number()),
    maxPlayers: v.number(),
    characters: v.array(v.id('characters')),
    gmCharacter: v.optional(v.id('characters')),
    location: v.optional(v.string()),
    system: v.union(v.literal('PF'), v.literal('DnD')),
    planning: v.optional(v.boolean()),
    isPrivate: v.optional(v.boolean()),
    isIntro: v.optional(v.boolean()),
    questId: v.optional(v.id('quests')),
    inGameDate: v.optional(v.object({
      year: v.number(),
      month: v.number(),
      day: v.number(),
      era: v.optional(v.string()),
      endYear: v.optional(v.number()),
      endMonth: v.optional(v.number()),
      endDay: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    const isGM = await isGameMaster(ctx)
    if (!isGM) {
      throw new Error('Only Game Masters can create sessions')
    }

    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
        throw new Error('Not authenticated')
    }

    const gmWorld = await ctx.db
      .query('worlds')
      .withIndex('by_owner', (q) => q.eq('owner', identity.subject))
      .first()

    if (!gmWorld) {
        throw new Error('Game Master must have a world to create a session.')
    }

    let inGameDate = args.inGameDate
    if (!inGameDate && gmWorld.calendar) {
      try {
        const parsedCal = JSON.parse(gmWorld.calendar)
        const dyn = parsedCal?.dynamic_data
        if (dyn && typeof dyn.year === 'number' && typeof dyn.month === 'number' && typeof dyn.day === 'number') {
          inGameDate = {
            year: dyn.year,
            month: dyn.month,
            day: dyn.day,
          }
        }
      } catch {
        // Ignore parse errors
      }
    }

    const level = args.isIntro ? (args.system === 'PF' ? 1 : 3) : args.level

    const sessionId = await ctx.db.insert('sessions', {
      date: args.date,
      world: gmWorld._id,
      inGameDate,
      level: level,
      maxPlayers: args.maxPlayers,
      locked: false,
      characters: args.characters,
      gmCharacter: args.gmCharacter,
      location: args.location,
      owner: identity.subject,
      system: args.system,
      planning: args.planning,
      isPrivate: args.isPrivate ?? false,
      isIntro: args.isIntro ?? false,
      questId: args.isIntro ? undefined : args.questId,
    })

    if (args.date) {
      // Remove GM's availability on this day
      await removeUserAvailabilityOnDate(ctx, identity.subject, args.date)
      // Remove any initial characters' owners' availability on this day
      for (const charId of args.characters) {
        const charDoc = await ctx.db.get(charId)
        if (charDoc?.userId) {
          await removeUserAvailabilityOnDate(ctx, charDoc.userId, args.date)
        }
      }
    }

    await ctx.scheduler.runAfter(0, internal.discord.syncSessionToDiscord, {
        sessionId
    })

    return sessionId
  },
})

export const updateSession = mutation({
  args: {
    sessionId: v.id('sessions'),
    date: v.optional(v.number()),
    world: v.id('worlds'),
    level: v.optional(v.number()),
    maxPlayers: v.number(),
    characters: v.array(v.id('characters')),
    gmCharacter: v.optional(v.id('characters')),
    location: v.optional(v.string()),
    system: v.union(v.literal('PF'), v.literal('DnD')),
    planning: v.optional(v.boolean()),
    isPrivate: v.optional(v.boolean()),
    isIntro: v.optional(v.boolean()),
    questId: v.optional(v.id('quests')),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Not authenticated')

    const isAdminUser = await isAdmin(ctx)
    const session = await ctx.db.get(args.sessionId)
    if (!session || (session.owner !== user.subject && !isAdminUser)) {
      throw new Error('Only the session owner or an admin can edit this session')
    }

    if (session.locked) {
        throw new Error('This session is locked and cannot be edited.')
    }

    const prevDate = session.date
    const newDate = args.date
    const prevLocation = session.location
    const newLocation = args.location

    const dateChanged = (prevDate === undefined && newDate !== undefined) ||
      (prevDate !== undefined && newDate === undefined) ||
      (prevDate !== undefined && newDate !== undefined && Math.floor(prevDate / 60000) !== Math.floor(newDate / 60000))

    const locationChanged = (prevLocation || '').trim() !== (newLocation || '').trim()

    const level = args.isIntro ? (args.system === 'PF' ? 1 : 3) : args.level

    await ctx.db.patch(args.sessionId, {
      date: args.date,
      world: args.world,
      level: level,
      maxPlayers: args.maxPlayers,
      characters: args.characters,
      gmCharacter: args.gmCharacter,
      location: args.location,
      system: args.system,
      planning: args.planning,
      isPrivate: args.isPrivate ?? false,
      isIntro: args.isIntro ?? false,
      questId: args.isIntro ? undefined : args.questId,
    })

    if (args.date) {
      await removeUserAvailabilityOnDate(ctx, session.owner, args.date)
      for (const charId of args.characters) {
        const charDoc = await ctx.db.get(charId)
        if (charDoc?.userId) {
          await removeUserAvailabilityOnDate(ctx, charDoc.userId, args.date)
        }
      }
    }

    await ctx.scheduler.runAfter(0, internal.discord.syncSessionToDiscord, {
        sessionId: args.sessionId
    })

    if (dateChanged || locationChanged) {
      await ctx.scheduler.runAfter(1000, internal.discord.notifySessionDetailsChanged, {
        sessionId: args.sessionId,
        dateChanged,
        prevDate: prevDate ?? undefined,
        newDate: newDate ?? undefined,
        locationChanged,
        prevLocation: prevLocation?.trim() || undefined,
        newLocation: newLocation?.trim() || undefined,
      })
    }
  },
})

export const toggleSessionPrivacy = mutation({
  args: { sessionId: v.id('sessions') },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Not authenticated')

    const session = await ctx.db.get(args.sessionId)
    if (!session) throw new Error('Session not found')

    const isAdminUser = await isAdmin(ctx)
    if (session.owner !== user.subject && !isAdminUser) {
      throw new Error('Only the session owner or an admin can change session privacy.')
    }

    if (session.locked) {
      throw new Error('Cannot change privacy of a locked session.')
    }

    const newIsPrivate = !session.isPrivate
    await ctx.db.patch(args.sessionId, { isPrivate: newIsPrivate })

    await ctx.scheduler.runAfter(0, internal.discord.syncSessionToDiscord, {
      sessionId: args.sessionId,
    })

    return newIsPrivate
  },
})

export const deleteSession = mutation({
  args: { sessionId: v.id('sessions') },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Not authenticated')

    const isAdminUser = await isAdmin(ctx)
    const session = await ctx.db.get(args.sessionId)
    if (!session || (session.owner !== user.subject && !isAdminUser)) {
      throw new Error('Only the session owner or an admin can delete this session')
    }

    if (session.discordThreadId) {
        await ctx.scheduler.runAfter(0, internal.discord.closeSessionThread, {
            threadId: session.discordThreadId
        })
    }

    await ctx.db.delete(args.sessionId)
  },
})

/**
 * Helper to check if a user is eligible to join a session given their membership status
 * and recent session participation.
 *
 * Rules:
 * 1. If user is a member (isMember claim = true / user.isMember = true / active GM who ran a session in past 3 months / dragon / admin) -> Unrestricted.
 * 2. Free non-members (including inactive GMs who have not run a session in past 3 months) -> Can join max 1 session per calendar month.
 */
export async function checkUserMonthlySessionEligibility(
  ctx: QueryCtx,
  userId: string,
  targetSessionDate?: number
): Promise<{ eligible: boolean; reason?: string; isFreeTier?: boolean }> {
  // 1. Check isMember claim from identity or database via canonical isMember helper (includes active GMs)
  const userIsMember = await isMember(ctx, userId)
  if (userIsMember) {
    return { eligible: true, isFreeTier: false }
  }

  // 2. Free non-member: Check limit of 1 session per calendar month
  // Determine target month & year (use session date if set, otherwise current date)
  const targetDate = targetSessionDate ? new Date(targetSessionDate) : new Date()
  const targetYear = targetDate.getFullYear()
  const targetMonth = targetDate.getMonth() // 0-indexed

  // Fetch all characters owned by this user
  const userCharacters = await ctx.db
    .query('characters')
    .withIndex('by_userId', (q) => q.eq('userId', userId))
    .collect()

  const userCharIds = new Set(userCharacters.map((c) => c._id))
  if (userCharIds.size === 0) {
    return { eligible: true, isFreeTier: true }
  }

  // Calculate start and end epoch timestamps for the target month
  const startOfMonth = new Date(targetYear, targetMonth, 1, 0, 0, 0, 0).getTime()
  const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999).getTime()

  // Fetch only sessions within target month using the by_date index
  const sessionsInTargetMonth = await ctx.db
    .query('sessions')
    .withIndex('by_date', (q) => q.gte('date', startOfMonth).lte('date', endOfMonth))
    .collect()

  const userSessionsInTargetMonth = sessionsInTargetMonth.filter((s) => {
    // Only check non-cancelled / non-planning sessions with characters
    if (!s.characters || s.characters.length === 0) return false
    // Check if user has a character in this session
    return s.characters.some((id) => userCharIds.has(id))
  })

  // Non-members can only join 1 free session per calendar month.
  // Members can play multiple sessions each month.
  if (userSessionsInTargetMonth.length >= 1) {
    const monthName = targetDate.toLocaleString('en-US', { month: 'long' })
    return {
      eligible: false,
      isFreeTier: true,
      reason: `You have already joined a session in ${monthName} ${targetYear}. Free accounts are limited to 1 session per calendar month. Upgrade to a Kobold Membership on Tarragon.be to play unlimited sessions!`,
    }
  }

  return { eligible: true, isFreeTier: true }
}

export const checkSessionEligibility = query({
  args: {
    sessionId: v.optional(v.id('sessions')),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) return { eligible: false, reason: 'Not authenticated', isFreeTier: false }

    let targetDate: number | undefined = undefined
    if (args.sessionId) {
      const session = await ctx.db.get(args.sessionId)
      if (session?.date) targetDate = session.date
    }

    return await checkUserMonthlySessionEligibility(ctx, user.subject, targetDate)
  },
})

export const joinSession = mutation({
  args: {
    sessionId: v.id('sessions'),
    characterId: v.id('characters'),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Not authenticated')

    const session = await ctx.db.get(args.sessionId)
    if (!session) throw new Error('Session not found')

    // Enforce monthly session limit for non-members / inactive GMs
    const eligibility = await checkUserMonthlySessionEligibility(ctx, user.subject, session.date)
    if (!eligibility.eligible) {
      throw new Error(eligibility.reason || 'Monthly session limit reached for free accounts.')
    }

    if (session.locked) {
      throw new Error('This session is locked. You cannot join or leave.')
    }

    if (session.isPrivate) {
      throw new Error("This session is private and unlisted. Characters can only be added manually by the session's owner.")
    }

    if (session.planning) {
        throw new Error('This session is in planning and cannot be joined yet.')
    }

    if (session.characters.length >= session.maxPlayers) {
      throw new Error('This session is full.')
    }

    const character = await ctx.db.get(args.characterId)
    if (!character || character.userId !== user.subject) {
      throw new Error('Character not found or you do not own it')
    }

    if (character.isDead) {
      throw new Error('This character has died and cannot join sessions.')
    }

    if (character.system !== session.system) {
        throw new Error(`This is a ${session.system} session, but your character is ${character.system}.`)
    }

    const quest = session.questId && !session.isIntro ? await ctx.db.get(session.questId) : null
    const effectiveLevel = computeEffectiveLevel(session, quest)
    if (typeof effectiveLevel === 'number' && effectiveLevel > 0) {
      const levelDiff = Math.abs(character.lvl - effectiveLevel)
      if (levelDiff >= 5) {
        throw new Error(
          `Level difference too high. This is a Level ${effectiveLevel} session, so only characters between Level ${Math.max(1, effectiveLevel - 4)} and Level ${effectiveLevel + 4} can join (your character is Level ${character.lvl}).`
        )
      }
    }

    if (session.characters.includes(args.characterId)) {
      return
    }

    // Check if the user already has a character in this session
    const userCharactersInSession = await Promise.all(
        session.characters.map(charId => ctx.db.get(charId))
    );
    const hasUserCharacterAlready = userCharactersInSession.some(
        (char) => char && char.userId === user.subject
    );

    if (hasUserCharacterAlready) {
        throw new Error('You can only join with one character per session.')
    }

    await ctx.db.patch(args.sessionId, {
      characters: [...session.characters, args.characterId],
      interestedPlayers: (session.interestedPlayers || []).filter(p => p.userId !== user.subject)
    })

    if (session.date) {
      await removeUserAvailabilityOnDate(ctx, user.subject, session.date)
    }

    await ctx.scheduler.runAfter(0, internal.discord.syncSessionToDiscord, {
        sessionId: args.sessionId
    })
  },
})

export const swapSessionCharacter = mutation({
  args: {
    sessionId: v.id('sessions'),
    oldCharacterId: v.id('characters'),
    newCharacterId: v.id('characters'),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Not authenticated')

    const session = await ctx.db.get(args.sessionId)
    if (!session) throw new Error('Session not found')

    if (session.locked) {
      throw new Error('This session is locked. You cannot change characters.')
    }

    if (!session.characters.includes(args.oldCharacterId)) {
      throw new Error('Selected character is not in this session.')
    }

    const oldCharacter = await ctx.db.get(args.oldCharacterId)
    if (!oldCharacter || oldCharacter.userId !== user.subject) {
      throw new Error('You do not own the character being replaced.')
    }

    const newCharacter = await ctx.db.get(args.newCharacterId)
    if (!newCharacter || newCharacter.userId !== user.subject) {
      throw new Error('Character not found or you do not own it.')
    }

    if (newCharacter.system !== session.system) {
      throw new Error(`This is a ${session.system} session, but your new character is ${newCharacter.system}.`)
    }

    const quest = session.questId && !session.isIntro ? await ctx.db.get(session.questId) : null
    const effectiveLevel = computeEffectiveLevel(session, quest)
    if (typeof effectiveLevel === 'number' && effectiveLevel > 0) {
      const levelDiff = Math.abs(newCharacter.lvl - effectiveLevel)
      if (levelDiff >= 5) {
        throw new Error(
          `Level difference too high. This is a Level ${effectiveLevel} session, so only characters between Level ${Math.max(1, effectiveLevel - 4)} and Level ${effectiveLevel + 4} can join (your new character is Level ${newCharacter.lvl}).`
        )
      }
    }

    if (session.characters.includes(args.newCharacterId)) {
      throw new Error('New character is already in this session.')
    }

    // Replace oldCharacterId with newCharacterId preserving position
    const updatedCharacters = session.characters.map((id) =>
      id === args.oldCharacterId ? args.newCharacterId : id
    )

    await ctx.db.patch(args.sessionId, {
      characters: updatedCharacters,
    })

    // Update initiative tracker in sessionStates if present
    const sessionState = await ctx.db
      .query('sessionStates')
      .withIndex('by_sessionId', (q) => q.eq('sessionId', args.sessionId))
      .first()

    if (sessionState && sessionState.initiative) {
      const updatedInitiative = sessionState.initiative.map((item) => {
        if (item.id === args.oldCharacterId || item.id === String(args.oldCharacterId)) {
          return {
            ...item,
            id: args.newCharacterId,
            name: newCharacter.name,
          }
        }
        return item
      })
      await ctx.db.patch(sessionState._id, {
        initiative: updatedInitiative,
      })
    }

    await ctx.scheduler.runAfter(0, internal.discord.syncSessionToDiscord, {
      sessionId: args.sessionId,
    })
  },
})

export const joinIntroSession = mutation({
  args: {
    sessionId: v.id('sessions'),
    characterId: v.optional(v.id('characters')),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Not authenticated')

    const session = await ctx.db.get(args.sessionId)
    if (!session) throw new Error('Session not found')

    if (!session.isIntro) {
      throw new Error('This session is not an intro session.')
    }

    // Enforce monthly session limit for non-members / inactive GMs
    const eligibility = await checkUserMonthlySessionEligibility(ctx, user.subject, session.date)
    if (!eligibility.eligible) {
      throw new Error(eligibility.reason || 'Monthly session limit reached for free accounts.')
    }

    if (session.locked) {
      throw new Error('This session is locked. You cannot join or leave.')
    }

    if (session.isPrivate) {
      throw new Error("This session is private and unlisted. Characters can only be added manually by the session's owner.")
    }

    if (session.planning) {
      throw new Error('This session is in planning and cannot be joined yet.')
    }

    if (session.characters.length >= session.maxPlayers) {
      throw new Error('This session is full.')
    }

    // Check if the user already has a character in this session
    const userCharactersInSession = await Promise.all(
      session.characters.map((charId) => ctx.db.get(charId))
    )
    const hasUserCharacterAlready = userCharactersInSession.some(
      (char) => char && char.userId === user.subject
    )

    if (hasUserCharacterAlready) {
      throw new Error('You can only join with one character per session.')
    }

    let targetCharacterId = args.characterId

    if (targetCharacterId) {
      const character = await ctx.db.get(targetCharacterId)
      if (!character || character.userId !== user.subject) {
        throw new Error('Character not found or you do not own it')
      }

      if (character.system !== session.system) {
        throw new Error(`This is a ${session.system} session, but your character is ${character.system}.`)
      }

      const effectiveLevel = session.system === 'PF' ? 1 : 3
      const levelDiff = Math.abs(character.lvl - effectiveLevel)
      if (levelDiff >= 5) {
        throw new Error(
          `Level difference too high. This is a Level ${effectiveLevel} intro session, so only characters between Level ${Math.max(1, effectiveLevel - 4)} and Level ${effectiveLevel + 4} can join (your character is Level ${character.lvl}).`
        )
      }
    } else {
      // Find or generate a unique placeholder character name for the user
      const dbUser = await ctx.db
        .query('users')
        .withIndex('by_userId', (q) => q.eq('userId', user.subject))
        .first()

      const displayName = formatUserDisplayName(
        dbUser?.name || user.name,
        dbUser?.username || user.nickname,
        user.subject
      )

      let candidateName = `${displayName} (Intro)`
      let counter = 1
      while (true) {
        const existing = await ctx.db
          .query('characters')
          .withIndex('by_name', (q) => q.eq('name', candidateName))
          .first()
        if (!existing) break
        counter++
        candidateName = `${displayName} (Intro ${counter})`
      }

      const lvl = session.system === 'DnD' ? 3 : 1
      targetCharacterId = await ctx.db.insert('characters', {
        name: candidateName,
        userId: user.subject,
        lvl,
        xp: 0,
        rank: 'none',
        system: session.system,
      })

      await ctx.scheduler.runAfter(0, internal.activity.logActivity, {
        type: 'character_created',
        message: `{user} created a new character: ${candidateName}!`,
        userId: user.subject,
        metadata: { characterId: targetCharacterId, name: candidateName },
      })
    }

    await ctx.db.patch(args.sessionId, {
      characters: [...session.characters, targetCharacterId],
      interestedPlayers: (session.interestedPlayers || []).filter((p) => p.userId !== user.subject),
    })

    if (session.date) {
      await removeUserAvailabilityOnDate(ctx, user.subject, session.date)
    }

    await ctx.scheduler.runAfter(0, internal.discord.syncSessionToDiscord, {
      sessionId: args.sessionId,
    })

    return targetCharacterId
  },
})

export const adminAddCharacterToSession = mutation({
    args: {
      sessionId: v.id('sessions'),
      characterId: v.id('characters'),
    },
    handler: async (ctx, args) => {
      const isAdminUser = await isAdmin(ctx)
      if (!isAdminUser) {
        throw new Error('Only admins can add characters to sessions this way.')
      }
  
      const session = await ctx.db.get(args.sessionId)
      if (!session) throw new Error('Session not found')
  
      if (session.locked) {
        throw new Error('This session is locked. You cannot add characters.')
      }

      if (session.planning) {
          throw new Error('This session is in planning and cannot be joined yet.')
      }

      if (session.characters.length >= session.maxPlayers) {
        throw new Error('This session is full.')
      }
  
      if (session.characters.includes(args.characterId)) {
        return // Character already in session
      }

      const character = await ctx.db.get(args.characterId)
      if (!character) throw new Error('Character not found')

      if (character.isDead) {
        throw new Error('This character has died and cannot join sessions.')
      }

      if (character.system !== session.system) {
          throw new Error(`This is a ${session.system} session, but this character is ${character.system}.`)
      }
  
      await ctx.db.patch(args.sessionId, {
        characters: [...session.characters, args.characterId],
        interestedPlayers: (session.interestedPlayers || []).filter(p => p.userId !== character.userId)
      })

      if (session.date) {
        await removeUserAvailabilityOnDate(ctx, character.userId, session.date)
      }

      await ctx.scheduler.runAfter(0, internal.discord.syncSessionToDiscord, {
          sessionId: args.sessionId
      })
    },
})

export const inviteCharacterToSession = mutation({
  args: {
    sessionId: v.id('sessions'),
    characterId: v.id('characters'),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Not authenticated')

    const session = await ctx.db.get(args.sessionId)
    if (!session) throw new Error('Session not found')

    const isAdminUser = await isAdmin(ctx)
    const isOwner = session.owner === user.subject

    // Check if the caller has a character in the session
    const userCharacters = await ctx.db
      .query('characters')
      .withIndex('by_userId', (q) => q.eq('userId', user.subject))
      .collect()
    const userCharIds = new Set(userCharacters.map((c) => c._id))
    const isAttending = session.characters.some((id) => userCharIds.has(id))

    if (session.isPrivate) {
      if (!isOwner && !isAdminUser) {
        throw new Error("Only the session's owner can manually add characters to a private session.")
      }
    } else {
      if (!isOwner && !isAdminUser && !isAttending) {
        throw new Error('Only the session owner, an attending player, or an admin can invite characters to this session.')
      }
    }

    if (session.locked) {
      throw new Error('This session is locked. You cannot invite characters.')
    }

    if (session.characters.length >= session.maxPlayers) {
      throw new Error('This session is full.')
    }

    if (session.characters.includes(args.characterId)) {
      return // Character already in session
    }

    const character = await ctx.db.get(args.characterId)
    if (!character) throw new Error('Character not found')

    if (character.isDead) {
      throw new Error('This character has died and cannot join sessions.')
    }

    if (character.system !== session.system) {
      throw new Error(`This is a ${session.system} session, but this character is ${character.system}.`)
    }

    // Check if that player already has another character in this session
    const sessionChars = await Promise.all(
      session.characters.map((id) => ctx.db.get(id))
    )
    const hasUserCharacterAlready = sessionChars.some(
      (c) => c && c.userId === character.userId
    )
    if (hasUserCharacterAlready) {
      throw new Error('That player already has a character in this session.')
    }

    await ctx.db.patch(args.sessionId, {
      characters: [...session.characters, args.characterId],
      interestedPlayers: (session.interestedPlayers || []).filter(
        (p) => p.userId !== character.userId
      ),
    })

    if (session.date) {
      await removeUserAvailabilityOnDate(ctx, character.userId, session.date)
    }

    await ctx.scheduler.runAfter(0, internal.discord.syncSessionToDiscord, {
      sessionId: args.sessionId,
    })
  },
})

export const getAvailableCharactersToInvite = query({
  args: { sessionId: v.id('sessions') },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) return []

    const session = await ctx.db.get(args.sessionId)
    if (!session) return []

    const isAdminUser = await isAdmin(ctx)
    const isOwner = session.owner === user.subject
    const userCharacters = await ctx.db
      .query('characters')
      .withIndex('by_userId', (q) => q.eq('userId', user.subject))
      .collect()
    const userCharIds = new Set(userCharacters.map((c) => c._id))
    const isAttending = session.characters.some((id) => userCharIds.has(id))

    if (session.isPrivate) {
      if (!isOwner && !isAdminUser) {
        return []
      }
    } else {
      if (!isOwner && !isAdminUser && !isAttending) {
        return []
      }
    }

    const matchingChars = await ctx.db
      .query('characters')
      .withIndex('by_system', (q) => q.eq('system', session.system))
      .collect()
    const sessionCharSet = new Set(session.characters)

    // Filter characters not already in this session and not dead
    const matching = matchingChars.filter((c) => !c.isDead && !sessionCharSet.has(c._id))

    // Resolve owner usernames/names for easier identification
    const userIds = Array.from(new Set(matching.map((c) => c.userId)))
    const usersMap = new Map<string, string>()
    await Promise.all(
      userIds.map(async (uId) => {
        const u = await ctx.db
          .query('users')
          .withIndex('by_userId', (q) => q.eq('userId', uId))
          .first()
        if (u) {
          usersMap.set(uId, u.name || u.username || 'Unknown')
        }
      })
    )

    return matching
      .map((c) => ({
        _id: c._id,
        name: c.name,
        lvl: c.lvl,
        class: c.class,
        system: c.system,
        rank: c.rank,
        title: c.title,
        ownerName: usersMap.get(c.userId) || 'Unknown Player',
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  },
})

export const leaveSession = mutation({
  args: {
    sessionId: v.id('sessions'),
    characterId: v.id('characters'),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Not authenticated')

    const isAdminUser = await isAdmin(ctx)
    const session = await ctx.db.get(args.sessionId)
    if (!session) throw new Error('Session not found')

    if (session.locked) {
      throw new Error('This session is locked. You cannot join or leave.')
    }

    const character = await ctx.db.get(args.characterId)
    if (!character) throw new Error('Character not found')

    if (character.userId !== user.subject && session.owner !== user.subject && !isAdminUser) {
        throw new Error('You do not have permission to remove this character.')
    }

    await ctx.db.patch(args.sessionId, {
      characters: session.characters.filter(id => id !== args.characterId),
    })

    // Also remove character from session initiative tracker state if present
    const sessionState = await ctx.db
      .query('sessionStates')
      .withIndex('by_sessionId', (q) => q.eq('sessionId', args.sessionId))
      .first()

    if (sessionState && sessionState.initiative) {
      const updatedInitiative = sessionState.initiative.filter(
        (item) => item.id !== args.characterId && item.id !== String(args.characterId)
      )
      if (updatedInitiative.length !== sessionState.initiative.length) {
        let newIndex = sessionState.currentIndex || 0
        if (newIndex >= updatedInitiative.length) {
          newIndex = Math.max(0, updatedInitiative.length - 1)
        }
        await ctx.db.patch(sessionState._id, {
          initiative: updatedInitiative,
          currentIndex: newIndex,
        })
      }
    }

    await ctx.scheduler.runAfter(0, internal.discord.syncSessionToDiscord, {
        sessionId: args.sessionId
    })
  }
})

export const expressInterest = mutation({
  args: { sessionId: v.id('sessions') },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Not authenticated')

    const session = await ctx.db.get(args.sessionId)
    if (!session) throw new Error('Session not found')

    if (session.isPrivate) {
      throw new Error('Cannot express interest in a private session.')
    }

    const interestedPlayers = session.interestedPlayers || []
    if (interestedPlayers.some(p => p.userId === user.subject)) {
      // User already expressed interest
      return
    }

    // Check if user already has a character in the session
    const charactersInSession = await Promise.all(
        session.characters.map(id => ctx.db.get(id))
    )
    if (charactersInSession.some(c => c && c.userId === user.subject)) {
        return // Already in session
    }

    let displayName = user.givenName;
    if (displayName && user.familyName) {
      displayName += ` ${user.familyName.charAt(0).toUpperCase()}.`;
    }
    if (!displayName) {
      displayName = (user.username || user.nickname || user.name || 'Anonymous') as string;
    }

    const newInterestedPlayers = [...interestedPlayers, { userId: user.subject, username: displayName }]

    await ctx.db.patch(args.sessionId, { interestedPlayers: newInterestedPlayers })

    await ctx.scheduler.runAfter(0, internal.discord.syncSessionToDiscord, {
        sessionId: args.sessionId
    })
  },
})

export const withdrawInterest = mutation({
  args: { sessionId: v.id('sessions') },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Not authenticated')

    const session = await ctx.db.get(args.sessionId)
    if (!session) throw new Error('Session not found')

    const interestedPlayers = session.interestedPlayers || []
    const newInterestedPlayers = interestedPlayers.filter(p => p.userId !== user.subject)

    await ctx.db.patch(args.sessionId, { interestedPlayers: newInterestedPlayers })

    await ctx.scheduler.runAfter(0, internal.discord.syncSessionToDiscord, {
        sessionId: args.sessionId
    })
  },
})

export const lockSession = mutation({
    args: { sessionId: v.id('sessions') },
    handler: async (ctx, args) => {
      const user = await ctx.auth.getUserIdentity()
      if (!user) throw new Error('Not authenticated')
  
      const isAdminUser = await isAdmin(ctx)
      const session = await ctx.db.get(args.sessionId)
      if (!session || (session.owner !== user.subject && !isAdminUser)) {
        throw new Error('Only the session owner or an admin can lock it.')
      }
  
      const quest = session.questId ? await ctx.db.get(session.questId) : null
      const effectiveLevel = computeEffectiveLevel(session, quest)

      if (effectiveLevel === undefined) {
          throw new Error('Session cannot be locked without a level or selected quest with a level.')
      }

      if (session.locked) return
  
      const characterIds = [...session.characters]
      if (session.gmCharacter && !characterIds.includes(session.gmCharacter)) {
          characterIds.push(session.gmCharacter)
      }
      
      const xpGains = []
  
      for (const characterId of characterIds) {
        const character = await ctx.db.get(characterId)
        if (character) {
          if (character.isDead) {
            continue
          }
          const xpGain = calculateXPGain(effectiveLevel, character.lvl, character._id === session.gmCharacter)
          const { lvl: newLvl, xp: newXp } = calculateNewStats(character.lvl, character.xp, xpGain)
          
          xpGains.push({
            characterId,
            xpGained: xpGain,
            oldLvl: character.lvl,
            oldXp: character.xp
          })
          
          await ctx.db.patch(characterId, {
            lvl: newLvl,
            xp: newXp,
          })

          if (newLvl > character.lvl) {
            await ctx.scheduler.runAfter(0, internal.activity.logActivity, {
                type: 'level_up',
                message: `${character.name} reached Level ${newLvl}!`,
                metadata: { characterId, newLvl }
            })
            await ctx.scheduler.runAfter(0, internal.discord.sendActivityToDiscord, {
                message: `**${character.name}** just reached level **${newLvl}**!`
            })
          }

          if (character.rank !== undefined && character.rank !== 'none') {
              // Note: Ranks are usually manual, but if we ever automate rank gain based on level/session, log here.
              // For now we check if rank changed during this patch (if we added logic for it)
          }
        }
      }
  
      await ctx.db.patch(args.sessionId, { locked: true, xpGains })

      if (session.questId) {
        await ctx.db.patch(session.questId, {
          isCompleted: true,
          completedSessionId: session._id,
          completedAt: Date.now(),
        })
        await deletePinsForQuest(ctx, session.questId)
        await syncActiveSessionsForQuestChange(ctx, session.world as Id<'worlds'> | undefined, {
          affectedQuestId: session.questId,
          isRemovedOrCompleted: true,
          excludeSessionId: session._id,
        })
      }

      // Apply pending void contribution if any directly within mutation transaction
      const pendingAmount = session.pendingVoidContribution ?? session.voidContribution
      if (typeof pendingAmount === 'number' && pendingAmount > 0) {
        await applyContributionHelper(ctx, session, pendingAmount)
      }

      await syncSessionAttendeesAchievements(ctx, session)
    }
})

async function syncSessionAttendeesAchievements(ctx: MutationCtx, session: Doc<'sessions'>) {
  const userIds = new Set<string>()
  if (session.owner) {
    userIds.add(session.owner)
  }
  const charIds = [
    ...(session.characters || []),
    ...(session.gmCharacter ? [session.gmCharacter] : [])
  ]
  for (const cId of charIds) {
    const char = await ctx.db.get(cId)
    if (char && char.userId) {
      userIds.add(char.userId)
    }
  }
  const allSessions = await ctx.db.query('sessions').collect()
  for (const uId of userIds) {
    await evaluateAndSyncUserAchievements(ctx, uId, allSessions)
  }
}

export const unlockSession = mutation({
    args: { sessionId: v.id('sessions') },
    handler: async (ctx, args) => {
      const user = await ctx.auth.getUserIdentity()
      if (!user) throw new Error('Not authenticated')
  
      const isAdminUser = await isAdmin(ctx)
      const session = await ctx.db.get(args.sessionId)
      if (!session || !isAdminUser) {
        throw new Error('Only an admin can unlock this session.')
      }
  
      if (!session.locked || !session.xpGains) return
  
      for (const gain of session.xpGains) {
        const character = await ctx.db.get(gain.characterId)
        if (character) {
          await ctx.db.patch(gain.characterId, {
            lvl: gain.oldLvl,
            xp: gain.oldXp,
          })
        }
      }
  
      if (session.questId) {
        await ctx.db.patch(session.questId, {
          isCompleted: false,
          completedSessionId: undefined,
          completedAt: undefined,
        })
        await syncActiveSessionsForQuestChange(ctx, session.world as Id<'worlds'> | undefined, {
          affectedQuestId: session.questId,
        })
      }

      await ctx.db.patch(args.sessionId, { locked: false, xpGains: [] })
      await syncSessionAttendeesAchievements(ctx, session)
    }
})

export const forceLockSession = mutation({
    args: { sessionId: v.id('sessions') },
    handler: async (ctx, args) => {
      const user = await ctx.auth.getUserIdentity()
      if (!user) throw new Error('Not authenticated')
  
      const isAdminUser = await isAdmin(ctx)
      const session = await ctx.db.get(args.sessionId)
      if (!session || (session.owner !== user.subject && !isAdminUser)) {
        throw new Error('Only the session owner or an admin can lock it.')
      }
  
      if (session.locked) return
  
      await ctx.db.patch(args.sessionId, { locked: true, xpGains: [] })

      if (session.questId) {
        await ctx.db.patch(session.questId, {
          isCompleted: true,
          completedSessionId: session._id,
          completedAt: Date.now(),
        })
        await deletePinsForQuest(ctx, session.questId)
        await syncActiveSessionsForQuestChange(ctx, session.world as Id<'worlds'> | undefined, {
          affectedQuestId: session.questId,
          isRemovedOrCompleted: true,
          excludeSessionId: session._id,
        })
      }

      // Apply pending void contribution if any directly within mutation transaction
      const pendingAmount = session.pendingVoidContribution ?? session.voidContribution
      if (typeof pendingAmount === 'number' && pendingAmount > 0) {
        await applyContributionHelper(ctx, session, pendingAmount)
      }

      await syncSessionAttendeesAchievements(ctx, session)
    }
})

export const forceUnlockSession = mutation({
    args: { sessionId: v.id('sessions') },
    handler: async (ctx, args) => {
      const user = await ctx.auth.getUserIdentity()
      if (!user) throw new Error('Not authenticated')
  
      const isAdminUser = await isAdmin(ctx)
      const session = await ctx.db.get(args.sessionId)
      if (!session || !isAdminUser) {
        throw new Error('Only an admin can force unlock this session.')
      }
  
      if (!session.locked) return
  
      if (session.questId) {
        await ctx.db.patch(session.questId, {
          isCompleted: false,
          completedSessionId: undefined,
          completedAt: undefined,
        })
      }

      await ctx.db.patch(args.sessionId, { locked: false, xpGains: [] })
      await syncSessionAttendeesAchievements(ctx, session)
    }
})


export const updateInGameDate = mutation({
  args: {
    sessionId: v.id('sessions'),
    inGameDate: v.optional(v.object({
      year: v.number(),
      month: v.number(),
      day: v.number(),
      era: v.optional(v.string()),
      endYear: v.optional(v.number()),
      endMonth: v.optional(v.number()),
      endDay: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    const session = await ctx.db.get(args.sessionId)
    if (!session || (session.owner !== user?.subject && !(await isAdmin(ctx)))) {
      throw new Error('Unauthorized')
    }

    await ctx.db.patch(args.sessionId, {
      inGameDate: args.inGameDate,
    })

    await ctx.scheduler.runAfter(0, internal.discord.syncSessionToDiscord, {
      sessionId: args.sessionId
    })
  },
})

export const addLoot = mutation({
  args: {
    sessionId: v.id('sessions'),
    name: v.string(),
    link: v.optional(v.string()),
    valueGP: v.number(),
    isGood: v.boolean(),
    isCurrency: v.optional(v.boolean()),
    fromQuest: v.optional(v.boolean()),
    isPerCharacter: v.optional(v.boolean()),
    quantity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Not authenticated')

    const session = await ctx.db.get(args.sessionId)
    if (!session) throw new Error('Session not found')

    const isAdminUser = await isAdmin(ctx)
    if (session.owner !== user.subject && !isAdminUser) {
      throw new Error('Only the session owner or an admin can add loot.')
    }

    const loot = session.loot || []
    const quantity = Math.max(1, Math.floor(args.quantity || 1))
    const isCurrency = args.isCurrency ?? false
    const isGood = isCurrency ? true : args.isGood

    const newItem = {
        id: crypto.randomUUID(),
        name: args.name,
        link: args.link,
        valueGP: args.valueGP,
        quantity,
        isGood,
        isCurrency,
        fromQuest: args.fromQuest ?? false,
        isPerCharacter: args.isPerCharacter ?? false,
        claimedByCharacters: [],
    }

    const newLoot = [
      ...loot,
      newItem,
    ]

    await ctx.db.patch(args.sessionId, { loot: newLoot })
  },
})

export const editLoot = mutation({
  args: {
    sessionId: v.id('sessions'),
    lootId: v.string(),
    name: v.string(),
    link: v.optional(v.string()),
    valueGP: v.number(),
    isGood: v.boolean(),
    isCurrency: v.optional(v.boolean()),
    isPerCharacter: v.optional(v.boolean()),
    quantity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Not authenticated')

    const session = await ctx.db.get(args.sessionId)
    if (!session) throw new Error('Session not found')

    const isAdminUser = await isAdmin(ctx)
    if (session.owner !== user.subject && !isAdminUser) {
      throw new Error('Only the session owner or an admin can edit loot.')
    }

    const loot = (session.loot || []).map((item) => {
      if (item.id === args.lootId) {
        const isCurrency = args.isCurrency ?? item.isCurrency ?? false
        const isGood = isCurrency ? true : args.isGood
        const quantity = args.quantity !== undefined ? Math.max(1, Math.floor(args.quantity)) : (item.quantity || 1)
        return {
          ...item,
          name: args.name,
          link: args.link,
          valueGP: args.valueGP,
          quantity,
          isGood,
          isCurrency,
          isPerCharacter: args.isPerCharacter ?? false,
        }
      }
      return item
    })

    await ctx.db.patch(args.sessionId, { loot })
  },
})

export const importQuestRewardsToLoot = mutation({
  args: {
    sessionId: v.id('sessions'),
    overwriteExisting: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Not authenticated')

    const session = await ctx.db.get(args.sessionId)
    if (!session) throw new Error('Session not found')

    const isAdminUser = await isAdmin(ctx)
    if (session.owner !== user.subject && !isAdminUser) {
      throw new Error('Only the session owner or an admin can manage loot.')
    }

    if (!session.questId) {
      throw new Error('No quest is linked to this session')
    }

    const quest = await ctx.db.get(session.questId)
    if (!quest) {
      throw new Error('Linked quest not found')
    }

    let loot = session.loot || []
    if (args.overwriteExisting) {
      loot = loot.filter((item: any) => !item.fromQuest)
    }

    const attendeeCount = Math.max(1, session.characters?.length || 1)
    const newItems: Array<{
      id: string
      name: string
      link?: string
      valueGP: number
      quantity: number
      isGood: boolean
      isCurrency: boolean
      fromQuest: boolean
      isPerCharacter?: boolean
      claimedByCharacters?: Array<Id<'characters'>>
    }> = []

    // 1. Money reward
    if (quest.rewardMoneyGP !== undefined && quest.rewardMoneyGP > 0) {
      const isPerChar = quest.rewardType === 'per_person'
      newItems.push({
        id: crypto.randomUUID(),
        name: `Quest Bounty: ${quest.name}`,
        valueGP: quest.rewardMoneyGP,
        quantity: isPerChar ? attendeeCount : 1,
        isGood: true,
        isCurrency: true,
        fromQuest: true,
        isPerCharacter: isPerChar,
        claimedByCharacters: [],
      })
    }

    // 2. Other reward (items, relics, potions)
    if (quest.rewardOther && quest.rewardOther.trim()) {
      const isPerChar = quest.rewardType === 'per_person'
      newItems.push({
        id: crypto.randomUUID(),
        name: quest.rewardOther.trim(),
        valueGP: 0,
        quantity: isPerChar ? attendeeCount : 1,
        isGood: false,
        isCurrency: false,
        fromQuest: true,
        isPerCharacter: isPerChar,
        claimedByCharacters: [],
      })
    }

    // 3. Fallback to legacy string reward if neither rewardMoneyGP nor rewardOther were provided
    if (newItems.length === 0 && quest.reward && quest.reward.trim()) {
      const parsedGp = parseGpAmount(quest.reward)
      const isPerChar = quest.rewardType === 'per_person'
      if (parsedGp > 0) {
        newItems.push({
          id: crypto.randomUUID(),
          name: `Quest Bounty: ${quest.name}`,
          valueGP: parsedGp,
          quantity: isPerChar ? attendeeCount : 1,
          isGood: true,
          isCurrency: true,
          fromQuest: true,
          isPerCharacter: isPerChar,
          claimedByCharacters: [],
        })
      } else {
        newItems.push({
          id: crypto.randomUUID(),
          name: quest.reward.trim(),
          valueGP: 0,
          quantity: isPerChar ? attendeeCount : 1,
          isGood: false,
          isCurrency: false,
          fromQuest: true,
          isPerCharacter: isPerChar,
          claimedByCharacters: [],
        })
      }
    }

    if (newItems.length === 0) {
      throw new Error('This quest does not specify any rewards to import.')
    }

    await ctx.db.patch(args.sessionId, {
      loot: [...loot, ...newItems],
    })

    return { count: newItems.length }
  },
})

export const deleteLoot = mutation({
  args: {
    sessionId: v.id('sessions'),
    lootId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Not authenticated')

    const session = await ctx.db.get(args.sessionId)
    if (!session) throw new Error('Session not found')

    const isAdminUser = await isAdmin(ctx)
    if (session.owner !== user.subject && !isAdminUser) {
      throw new Error('Only the session owner or an admin can delete loot.')
    }

    const loot = (session.loot || []).filter((item) => item.id !== args.lootId)

    await ctx.db.patch(args.sessionId, { loot })
  },
})

export const clearAllLoot = mutation({
  args: {
    sessionId: v.id('sessions'),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Not authenticated')

    const session = await ctx.db.get(args.sessionId)
    if (!session) throw new Error('Session not found')

    const isAdminUser = await isAdmin(ctx)
    if (session.owner !== user.subject && !isAdminUser) {
      throw new Error('Only the session owner or an admin can clear loot.')
    }

    await ctx.db.patch(args.sessionId, { loot: [] })
  },
})

export const claimLoot = mutation({
  args: {
    sessionId: v.id('sessions'),
    lootId: v.string(),
    characterId: v.id('characters'),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Not authenticated')

    const session = await ctx.db.get(args.sessionId)
    if (!session) throw new Error('Session not found')

    const character = await ctx.db.get(args.characterId)
    if (!character || character.userId !== user.subject) {
      throw new Error('Character not found or you do not own it')
    }

    if (!session.characters.includes(args.characterId)) {
      throw new Error('Character is not part of this session')
    }

    const loot = (session.loot || []).map((item) => {
      if (item.id === args.lootId) {
        const totalQty = Math.max(1, (item.quantity ?? 1) * (item.isPerCharacter ? (session.characters?.length || 1) : 1))
        const currentClaimed = item.claimedByCharacters && item.claimedByCharacters.length > 0
          ? [...item.claimedByCharacters]
          : (item.claimedBy ? [item.claimedBy] : [])

        if (currentClaimed.length >= totalQty) {
          throw new Error('All copies of this item have already been claimed')
        }

        const updatedClaimed = [...currentClaimed, args.characterId]
        return {
          ...item,
          claimedBy: updatedClaimed[0],
          claimedByCharacters: updatedClaimed,
        }
      }
      return item
    })

    await ctx.db.patch(args.sessionId, { loot })
  },
})

export const unclaimLoot = mutation({
  args: {
    sessionId: v.id('sessions'),
    lootId: v.string(),
    characterId: v.optional(v.id('characters')),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Not authenticated')

    const session = await ctx.db.get(args.sessionId)
    if (!session) throw new Error('Session not found')

    const lootItem = (session.loot || []).find(item => item.id === args.lootId)
    if (!lootItem) throw new Error('Loot item not found')

    const isAdminUser = await isAdmin(ctx)

    const loot = (session.loot || []).map((item) => {
      if (item.id === args.lootId) {
        const currentClaimed = item.claimedByCharacters && item.claimedByCharacters.length > 0
          ? [...item.claimedByCharacters]
          : (item.claimedBy ? [item.claimedBy] : [])

        if (args.characterId) {
          const idx = currentClaimed.indexOf(args.characterId)
          const updatedClaimed = idx !== -1
            ? [...currentClaimed.slice(0, idx), ...currentClaimed.slice(idx + 1)]
            : currentClaimed
          return {
            ...item,
            claimedBy: updatedClaimed[0] || undefined,
            claimedByCharacters: updatedClaimed,
          }
        } else {
          return {
            ...item,
            claimedBy: undefined,
            claimedByCharacters: [],
          }
        }
      }
      return item
    })

    await ctx.db.patch(args.sessionId, { loot })
  },
})

export const setSessionGuildmasterCut = mutation({
  args: {
    sessionId: v.id('sessions'),
    characterId: v.optional(v.id('characters')),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Not authenticated')

    const session = await ctx.db.get(args.sessionId)
    if (!session) throw new Error('Session not found')

    const isAdminUser = await isAdmin(ctx)
    if (session.owner !== user.subject && !isAdminUser) {
      throw new Error('Only the session owner or an admin can set the Guildmaster.')
    }

    if (args.characterId) {
      const character = await ctx.db.get(args.characterId)
      if (!character) throw new Error('Guildmaster character not found')
      await ctx.db.patch(args.sessionId, {
        guildmasterCut: {
          characterId: args.characterId,
          claimed: session.guildmasterCut?.characterId === args.characterId ? session.guildmasterCut.claimed : false,
        },
      })
    } else {
      await ctx.db.patch(args.sessionId, {
        guildmasterCut: undefined,
      })
    }
  },
})

export const toggleGuildmasterCutClaimed = mutation({
  args: {
    sessionId: v.id('sessions'),
    characterId: v.id('characters'),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Not authenticated')

    const session = await ctx.db.get(args.sessionId)
    if (!session || !session.guildmasterCut) throw new Error('Session or Guildmaster cut not found')

    if (session.guildmasterCut.characterId !== args.characterId) {
      throw new Error('This Guildmaster cut is not assigned to this character')
    }

    const character = await ctx.db.get(args.characterId)
    const isAdminUser = await isAdmin(ctx)
    if (!character || (character.userId !== user.subject && !isAdminUser)) {
      throw new Error('You do not own this Guildmaster character')
    }

    const nextClaimed = !session.guildmasterCut.claimed
    await ctx.db.patch(args.sessionId, {
      guildmasterCut: {
        ...session.guildmasterCut,
        claimed: nextClaimed,
      },
    })

    const lootList = session.loot || []
    const attendingCount = (session.characters || []).length || 1
    const totalLootValue = lootList.reduce((sum, item) => {
      const baseVal = item.isGood ? item.valueGP : item.valueGP / 2
      const itemTotal = item.isPerCharacter ? baseVal * attendingCount : baseVal
      return sum + itemTotal
    }, 0)
    const cutVal = Math.round(totalLootValue * 0.2 * 100) / 100
    if (cutVal > 0) {
      await adjustCharacterMoney(ctx, args.characterId, nextClaimed ? cutVal : -cutVal)
    }
  },
})

export const toggleSessionMoneyClaimed = mutation({
  args: {
    sessionId: v.id('sessions'),
    characterId: v.id('characters'),
    currentNetMoneyGP: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Not authenticated')

    const character = await ctx.db.get(args.characterId)
    const isAdminUser = await isAdmin(ctx)
    if (!character || (character.userId !== user.subject && !isAdminUser)) {
      throw new Error('You do not own this character')
    }

    const existingLog = await ctx.db
      .query('sessionClaimedLogs')
      .withIndex('by_session_character', (q) =>
        q.eq('sessionId', args.sessionId).eq('characterId', args.characterId)
      )
      .first()

    if (existingLog) {
      if (existingLog.claimedMoneyAmount !== args.currentNetMoneyGP) {
        // Outstanding adjustment: update to the new current net money amount
        const diff = Math.round((args.currentNetMoneyGP - existingLog.claimedMoneyAmount) * 100) / 100
        await ctx.db.patch(existingLog._id, {
          claimedMoneyAmount: args.currentNetMoneyGP,
          claimedAt: Date.now(),
        })
        if (diff !== 0) {
          await adjustCharacterMoney(ctx, args.characterId, diff)
        }
      } else {
        // Already fully claimed with no diff: toggle off
        await ctx.db.delete(existingLog._id)
        if (existingLog.claimedMoneyAmount !== 0) {
          await adjustCharacterMoney(ctx, args.characterId, -existingLog.claimedMoneyAmount)
        }
      }
    } else {
      await ctx.db.insert('sessionClaimedLogs', {
        sessionId: args.sessionId,
        characterId: args.characterId,
        claimedMoneyAmount: args.currentNetMoneyGP,
        claimedAt: Date.now(),
      })
      if (args.currentNetMoneyGP !== 0) {
        await adjustCharacterMoney(ctx, args.characterId, args.currentNetMoneyGP)
      }
    }
  },
})

export const getSessionClaimStatus = query({
  args: {
    sessionId: v.id('sessions'),
    characterId: v.optional(v.id('characters')),
  },
  handler: async (ctx, args) => {
    if (!args.characterId) return null
    const user = await ctx.auth.getUserIdentity()
    if (!user) return null

    const log = await ctx.db
      .query('sessionClaimedLogs')
      .withIndex('by_session_character', (q) =>
        q.eq('sessionId', args.sessionId).eq('characterId', args.characterId!)
      )
      .first()

    if (!log) {
      return {
        isClaimed: false,
        claimedMoneyAmount: 0,
        claimedAt: null,
      }
    }

    return {
      isClaimed: true,
      claimedMoneyAmount: log.claimedMoneyAmount,
      claimedAt: log.claimedAt,
    }
  },
})

export const getSessionState = query({
    args: { sessionId: v.id('sessions') },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('sessionStates')
            .withIndex('by_sessionId', (q) => q.eq('sessionId', args.sessionId))
            .first()
    }
})

export const updateSessionState = mutation({
    args: {
        sessionId: v.id('sessions'),
        initiative: v.optional(v.array(v.object({
            id: v.string(),
            name: v.string(),
            counter: v.optional(v.number()),
        }))),
        currentIndex: v.optional(v.number()),
        round: v.optional(v.number()),
        timeSeconds: v.optional(v.number()),
        isClockRunning: v.optional(v.boolean()),
        multiplier: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity()
        const session = await ctx.db.get(args.sessionId)
        
        const isAdminUser = await isAdmin(ctx)
        if (!session || (session.owner !== user?.subject && !isAdminUser)) {
          throw new Error('Unauthorized')
        }

        const existing = await ctx.db
            .query('sessionStates')
            .withIndex('by_sessionId', (q) => q.eq('sessionId', args.sessionId))
            .first()

        const { sessionId, ...state } = args
        if (existing) {
            await ctx.db.patch(existing._id, state)
        } else {
            await ctx.db.insert('sessionStates', { sessionId, ...state })
        }
    }
})

export { markCharacterDiedInSession } from './characters'

