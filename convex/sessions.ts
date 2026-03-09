import { query, mutation, QueryCtx } from './_generated/server'
import { v } from 'convex/values'
import { Doc } from './_generated/dataModel'

/**
 * Checks if the authenticated user has Game Master permissions.
 */
async function isGameMaster(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return false
  
  // We prioritize the 'gamemaster' claim from the JWT token (configured in Clerk JWT templates).
  return (
    identity.gamemaster === true ||
    identity.gamemaster === 'true' ||
    (identity.publicMetadata as { gamemaster?: boolean | string } | undefined)?.gamemaster === true ||
    (identity.publicMetadata as { gamemaster?: boolean | string } | undefined)?.gamemaster === 'true'
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

export const listSessions = query({
  args: { past: v.boolean() },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) {
      return null
    }

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
        return {
          ...session,
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

    const session = await ctx.db.get(args.sessionId)
    if (!session) return null

    const characterDocs = await Promise.all(
      session.characters.map((id) => ctx.db.get(id))
    )

    const isOwner = user.subject === session.owner
    let gmCharacterData = null

    if (isOwner && session.gmCharacter) {
        const gmChar = await ctx.db.get(session.gmCharacter)
        if (gmChar) {
            gmCharacterData = gmChar
        }
    }

    return {
      ...session,
      // Hide gmCharacter ID from non-owners
      gmCharacter: isOwner ? session.gmCharacter : undefined,
      gmCharacterData: isOwner ? gmCharacterData : undefined,
      attendingCharacters: characterDocs.filter((c): c is Doc<'characters'> => c !== null),
      isOwner,
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
        
        const characterIds = [...session.characters]
        if (session.gmCharacter && !characterIds.includes(session.gmCharacter)) {
            characterIds.push(session.gmCharacter)
        }
        
        const characters = await Promise.all(characterIds.map(id => ctx.db.get(id)))
        
        return characters.filter((c): c is Doc<'characters'> => c !== null).map(char => {
            const xpGain = calculateXPGain(session.level, char.lvl, char._id === session.gmCharacter)
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
    world: v.string(),
    level: v.number(),
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
    return await ctx.db.insert('sessions', {
      date: args.date,
      world: args.world,
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
    world: v.string(),
    level: v.number(),
    maxPlayers: v.number(),
    characters: v.array(v.id('characters')),
    gmCharacter: v.optional(v.id('characters')),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Not authenticated')

    const session = await ctx.db.get(args.sessionId)
    if (!session || session.owner !== user.subject) {
      throw new Error('Only the session owner can edit this session')
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

    const session = await ctx.db.get(args.sessionId)
    if (!session || session.owner !== user.subject) {
      throw new Error('Only the session owner can delete this session')
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

    // Check if the character is already in the session
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

    const session = await ctx.db.get(args.sessionId)
    if (!session) throw new Error('Session not found')

    if (session.locked) {
      throw new Error('This session is locked. You cannot join or leave.')
    }

    const character = await ctx.db.get(args.characterId)
    if (!character) throw new Error('Character not found')

    // Allow the player who owns the character OR the session owner to remove it
    if (character.userId !== user.subject && session.owner !== user.subject) {
        throw new Error('You do not have permission to remove this character.')
    }

    await ctx.db.patch(args.sessionId, {
      characters: session.characters.filter(id => id !== args.characterId),
    })
  }
})

export const lockSession = mutation({
    args: { sessionId: v.id('sessions') },
    handler: async (ctx, args) => {
      const user = await ctx.auth.getUserIdentity()
      if (!user) throw new Error('Not authenticated')
  
      const session = await ctx.db.get(args.sessionId)
      if (!session || session.owner !== user.subject) {
        throw new Error('Only the session owner can lock it.')
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
  
      const session = await ctx.db.get(args.sessionId)
      if (!session || session.owner !== user.subject) {
        throw new Error('Only the session owner can unlock it.')
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
