import { query, mutation, QueryCtx } from './_generated/server'
import { v } from 'convex/values'
import { Doc, Id } from './_generated/dataModel'
import { internal } from './_generated/api'

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

    const sessions = await ctx.db
      .query('sessions')
      .filter((q) => q.eq(q.field('locked'), args.past))
      .collect()

    const sessionsWithDetails = await Promise.all(
      sessions.map(async (session) => {
        const characterDocs = await Promise.all(
          session.characters.map((id) => ctx.db.get(id))
        )
        const worldDoc = await ctx.db.get(session.world as Id<'worlds'>)
        return {
          ...session,
          worldName: worldDoc ? (worldDoc as Doc<'worlds'>).name : 'Unknown World',
          characterNames: characterDocs.filter((c): c is Doc<'characters'> => c !== null).map((c) => c.name),
          isOwner: user.subject === session.owner,
        }
      })
    )

    return sessionsWithDetails.sort((a, b) => {
      if (args.past) {
        return (b.date || 0) - (a.date || 0);
      }
      
      // For upcoming: sessions with dates first, then planning sessions without dates
      if (a.date && b.date) return a.date - b.date;
      if (a.date) return -1;
      if (b.date) return 1;
      return 0;
    })
  },
})

export const publicListSessions = query({
  args: { past: v.boolean() },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query('sessions')
      .filter((q) => q.eq(q.field('locked'), args.past))
      .collect()

    const sessionsWithDetails = await Promise.all(
      sessions.map(async (session) => {
        const characterDocs = await Promise.all(
          session.characters.map((id) => ctx.db.get(id))
        )
        const worldDoc = await ctx.db.get(session.world as Id<'worlds'>)
        return {
          ...session,
          worldName: worldDoc ? (worldDoc as Doc<'worlds'>).name : 'Unknown World',
          characterNames: characterDocs.filter((c): c is Doc<'characters'> => c !== null).map((c) => c.name),
          isOwner: false,
        }
      })
    )

    return sessionsWithDetails.sort((a, b) => {
        if (args.past) {
          return (b.date || 0) - (a.date || 0);
        }
        if (a.date && b.date) return a.date - b.date;
        if (a.date) return -1;
        if (b.date) return 1;
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

    const allSessions = await ctx.db.query('sessions').collect()
    
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
      session.characters.map((id) => ctx.db.get(id))
    )

    const isOwner = user ? (user.subject === session.owner || isAdminUser) : false
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
    args: { sessionId: v.string() },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity()
        if (!user) return null
        
        const sessionId = ctx.db.normalizeId('sessions', args.sessionId)
        if (!sessionId) return null

        const session = await ctx.db.get(sessionId)
        if (!session) return null

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
    system: v.optional(v.union(v.literal('PF'), v.literal('DnD'))),
    planning: v.optional(v.boolean()),
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

    const sessionId = await ctx.db.insert('sessions', {
      date: args.date,
      world: gmWorld._id,
      level: args.level,
      maxPlayers: args.maxPlayers,
      locked: false,
      characters: args.characters,
      gmCharacter: args.gmCharacter,
      location: args.location,
      owner: identity.subject,
      system: args.system,
      planning: args.planning,
    })

    await ctx.scheduler.runAfter(0, internal.discord.syncSessionToDiscord, {
        sessionId
    })

    await ctx.scheduler.runAfter(0, internal.activity.logActivity, {
        type: 'session_created',
        message: `{user} posted a new session for ${gmWorld.name}!`,
        userId: identity.subject,
        metadata: { sessionId, worldName: gmWorld.name }
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
    system: v.optional(v.union(v.literal('PF'), v.literal('DnD'))),
    planning: v.optional(v.boolean()),
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
      system: args.system,
      planning: args.planning,
    })

    await ctx.scheduler.runAfter(0, internal.discord.syncSessionToDiscord, {
        sessionId: args.sessionId
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

    if (session.discordThreadId) {
        await ctx.scheduler.runAfter(0, internal.discord.deleteSessionThread, {
            threadId: session.discordThreadId
        })
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

    if (character.system !== session.system) {
        throw new Error(`This is a ${session.system} session, but your character is ${character.system}.`)
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

    await ctx.scheduler.runAfter(0, internal.discord.syncSessionToDiscord, {
        sessionId: args.sessionId
    })
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

      if (character.system !== session.system) {
          throw new Error(`This is a ${session.system} session, but this character is ${character.system}.`)
      }
  
      await ctx.db.patch(args.sessionId, {
        characters: [...session.characters, args.characterId],
        interestedPlayers: (session.interestedPlayers || []).filter(p => p.userId !== character.userId)
      })

      await ctx.scheduler.runAfter(0, internal.discord.syncSessionToDiscord, {
          sessionId: args.sessionId
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
