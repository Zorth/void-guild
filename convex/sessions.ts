import { query, mutation, QueryCtx } from './_generated/server'
import { v } from 'convex/values'
import { Doc, Id } from './_generated/dataModel'

/**
 * Checks if the authenticated user has Game Master permissions.
 */
async function isGameMaster(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return false
  
  const isAdminUser = await isAdmin(ctx)
  if (isAdminUser) return true

  // We prioritize the 'gamemaster' claim from the JWT token (configured in Clerk JWT templates).
  return (
    identity.gamemaster === true ||
    identity.gamemaster === 'true' ||
    (identity.publicMetadata as { gamemaster?: boolean | string } | undefined)?.gamemaster === true ||
    (identity.publicMetadata as { gamemaster?: boolean | string } | undefined)?.gamemaster === 'true'
  )
}

/**
 * Checks if the authenticated user has Admin permissions.
 */
async function isAdmin(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return false
  
  // We prioritize the 'admin' claim from the JWT token (configured in Clerk JWT templates).
  return (
    identity.admin === true ||
    identity.admin === 'true' ||
    (identity.publicMetadata as { admin?: boolean | string } | undefined)?.admin === true ||
    (identity.publicMetadata as { admin?: boolean | string } | undefined)?.admin === 'true'
  )
}

/**
 * Calculates XP gain based on session level and character level.
 */
export function calculateXPGain(sessionLevel: number, characterLevel: number, isGM: boolean): number {
  if (isGM) return 250

  const L = sessionLevel - characterLevel
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

export const listSessions = query({
  args: { past: v.boolean() },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) {
      return null
    }

    const isAdminUser = await isAdmin(ctx)
    const now = Date.now()
    const sessions = await ctx.db
      .query('sessions')
      .filter((q) => (args.past ? q.lt(q.field('date'), now) : q.gte(q.field('date'), now)))
      .collect()

    const sessionsWithDetails = await Promise.all(
      sessions.map(async (session) => {
        const characterDocs = await Promise.all(
          session.characters.map((id) => ctx.db.get(id))
        )
        const worldDoc = await ctx.db.get(session.world as Id<'worlds'>) // Explicitly cast to Id<'worlds'>
        return {
          ...session,
          worldName: worldDoc ? (worldDoc as Doc<'worlds'>).name : 'Unknown World', // Assert type before accessing name
          characterNames: characterDocs.filter((c): c is Doc<'characters'> => c !== null).map((c) => c.name),
          isOwner: user.subject === session.owner,
        }
      })
    )

    return sessionsWithDetails.sort((a, b) => (args.past ? b.date - a.date : a.date - b.date))
  },
})

export const getSession = query({
  args: { sessionId: v.id('sessions') },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) {
      return null
    }

    const isAdminUser = await isAdmin(ctx)
    const session = await ctx.db.get(args.sessionId)
    if (!session) return null

    const characterDocs = await Promise.all(
      session.characters.map((id) => ctx.db.get(id))
    )

    const isOwner = user.subject === session.owner || isAdminUser
    let gmCharacterData = null

    if (isOwner && session.gmCharacter) {
        const gmChar = await ctx.db.get(session.gmCharacter)
        if (gmChar) {
            gmCharacterData = gmChar
        }
    }

    const worldDoc = await ctx.db.get(session.world as Id<'worlds'>) // Explicitly cast to Id<'worlds'>

    return {
      ...session,
      worldName: worldDoc ? (worldDoc as Doc<'worlds'>).name : 'Unknown World', // Assert type before accessing name
      // Hide gmCharacter ID from non-owners
      gmCharacter: isOwner ? session.gmCharacter : undefined,
      gmCharacterData: isOwner ? gmCharacterData : undefined,
      attendingCharacters: characterDocs.filter((c): c is Doc<'characters'> => c !== null),
      isOwner,
      interestedPlayers: session.interestedPlayers || [], // Include interested players
    }
  },
})

export const previewXPGains = query({
    args: { sessionId: v.id('sessions') },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity()
        if (!user) return null
        
        const session = await ctx.db.get(args.sessionId)
        if (!session) throw new Error('Session not found')

        if (session.level === undefined) {
            return []
        }

        const characterIds = [...session.characters];
        if (session.gmCharacter && !characterIds.includes(session.gmCharacter)) {
            characterIds.push(session.gmCharacter)
        }
        
        const characters = await Promise.all(characterIds.map(id => ctx.db.get(id)))
        
        return characters.filter((c): c is Doc<'characters'> => c !== null).map(char => {
            const xpGain = calculateXPGain(session.level!, char.lvl, char._id === session.gmCharacter)
            const { lvl: newLvl, xp: newXp } = calculateNewStats(char.lvl, char.xp, xpGain)
            return {
                id: char._id,
                name: char.name,
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
    date: v.number(),
    level: v.optional(v.number()),
    maxPlayers: v.number(),
    characters: v.array(v.id('characters')),
    gmCharacter: v.optional(v.id('characters')),
    location: v.optional(v.string()),
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
      .filter((q) => q.eq(q.field('owner'), identity.subject))
      .first()

    if (!gmWorld) {
        throw new Error('Game Master must have a world to create a session.')
    }

    return await ctx.db.insert('sessions', {
      date: args.date,
      world: gmWorld._id,
      level: args.level,
      maxPlayers: args.maxPlayers,
      locked: false,
      characters: args.characters,
      gmCharacter: args.gmCharacter,
      location: args.location,
      owner: identity!.subject,
    })
  },
})

export const updateSession = mutation({
  args: {
    sessionId: v.id('sessions'),
    date: v.number(),
    world: v.id('worlds'),
    level: v.optional(v.number()),
    maxPlayers: v.number(),
    characters: v.array(v.id('characters')),
    gmCharacter: v.optional(v.id('characters')),
    location: v.optional(v.string()),
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

    await ctx.db.patch(args.sessionId, {
      date: args.date,
      world: args.world,
      level: args.level,
      maxPlayers: args.maxPlayers,
      characters: args.characters,
      gmCharacter: args.gmCharacter,
      location: args.location,
    })
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

    await ctx.db.delete(args.sessionId)
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

    if (session.locked) {
      throw new Error('This session is locked. You cannot join or leave.')
    }

    if (session.characters.length >= session.maxPlayers) {
      throw new Error('This session is full.')
    }

    const character = await ctx.db.get(args.characterId)
    if (!character || character.userId !== user.subject) {
      throw new Error('Character not found or you do not own it')
    }

    if (session.characters.includes(args.characterId)) {
      return
    }

    await ctx.db.patch(args.sessionId, {
      characters: [...session.characters, args.characterId],
    })
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
  }
})

export const expressInterest = mutation({
  args: { sessionId: v.id('sessions') },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Not authenticated')

    const session = await ctx.db.get(args.sessionId)
    if (!session) throw new Error('Session not found')

    const interestedPlayers = session.interestedPlayers || []
    if (interestedPlayers.some(p => p.userId === user.subject)) {
      // User already expressed interest
      return
    }

    const newInterestedPlayers = [...interestedPlayers, { userId: user.subject, username: user.name || user.nickname || 'Anonymous' }]

    await ctx.db.patch(args.sessionId, { interestedPlayers: newInterestedPlayers })
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
  
      if (session.level === undefined) {
          throw new Error('Session cannot be locked without a level.')
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
          const xpGain = calculateXPGain(session.level, character.lvl, character._id === session.gmCharacter)
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
        }
      }
  
      await ctx.db.patch(args.sessionId, { locked: true, xpGains })
    }
})

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
  
      await ctx.db.patch(args.sessionId, { locked: false, xpGains: [] })
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
    }
})

export const forceUnlockSession = mutation({
    args: { sessionId: v.id('sessions') },
    handler: async (ctx, args) => {
      const user = await ctx.auth.getUserIdentity()
      if (!user) throw new Error('Not authenticated')
  
      const isAdminUser = await isAdmin(ctx)
      const session = await ctx.db.get(args.sessionId)
      if (!session || (session.owner !== user.subject && !isAdminUser)) {
        throw new Error('Only the session owner or an admin can unlock it.')
      }
  
      if (!session.locked) return
  
      await ctx.db.patch(args.sessionId, { locked: false, xpGains: [] })
    }
})


export const getGMStats = query({
    handler: async (ctx) => {
      const lockedSessions = await ctx.db
        .query('sessions')
        .filter((q) => q.eq(q.field('locked'), true))
        .collect();
  
      const gmStats = new Map<string, number>();
  
      for (const session of lockedSessions) {
        const owner = session.owner;
        gmStats.set(owner, (gmStats.get(owner) || 0) + 1);
      }
  
      const stats = Array.from(gmStats.entries()).map(([ownerId, sessionCount]) => ({
        userId: ownerId,
        count: sessionCount,
      }));
  
      return stats.sort((a, b) => b.count - a.count);
    },
});

export const getPlayerStats = query({
    handler: async (ctx) => {
      const lockedSessions = await ctx.db
        .query('sessions')
        .filter((q) => q.eq(q.field('locked'), true))
        .collect();
  
      const playerSessionCounts = new Map<string, number>();
      const allCharacters = await ctx.db.query("characters").collect();
      const characterIdToUserId = new Map(allCharacters.map(c => [c._id, c.userId]));
  
      for (const session of lockedSessions) {
        const userIdsInSession = new Set<string>();
        for (const characterId of session.characters) {
          const userId = characterIdToUserId.get(characterId);
          if (userId) {
            userIdsInSession.add(userId);
          }
        }
        for (const userId of userIdsInSession) {
          playerSessionCounts.set(userId, (playerSessionCounts.get(userId) || 0) + 1);
        }
      }
  
      const stats = Array.from(playerSessionCounts.entries()).map(([userId, count]) => ({
        userId,
        count,
      }));
  
      return stats.sort((a, b) => b.count - a.count);
    },
});
