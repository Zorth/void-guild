import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { Id } from './_generated/dataModel'

export const giveCommendation = mutation({
  args: {
    sessionId: v.id('sessions'),
    toCharacterId: v.id('characters'),
    category: v.union(
      v.literal('roleplay'),
      v.literal('tactics'),
      v.literal('clutch'),
      v.literal('heroic'),
      v.literal('gm')
    ),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) {
      throw new Error('Not authenticated')
    }

    const session = await ctx.db.get(args.sessionId)
    if (!session) {
      throw new Error('Session not found')
    }

    const targetChar = await ctx.db.get(args.toCharacterId)
    if (!targetChar) {
      throw new Error('Target character not found')
    }

    if (!session.characters.includes(args.toCharacterId)) {
      throw new Error('Character is not in this session')
    }

    // Cannot commend own character
    if (targetChar.userId === user.subject) {
      throw new Error('Cannot commend your own character')
    }

    const isGm = session.owner === user.subject

    if (args.category === 'gm') {
      // ONLY the Gamemaster (session owner) can give GM commendation. NO ADMINS!
      if (!isGm) {
        throw new Error('Only the session Gamemaster can give a GM commendation')
      }

      const userCommendations = await ctx.db
        .query('commendations')
        .withIndex('by_session_fromUser', (q) =>
          q.eq('sessionId', args.sessionId).eq('fromUserId', user.subject)
        )
        .collect()

      const existingGm = userCommendations.find((c) => c.category === 'gm')

      if (existingGm) {
        if (existingGm.toCharacterId === args.toCharacterId) {
          // Toggle off if clicking exact same character
          await ctx.db.delete(existingGm._id)
          return { action: 'removed' }
        }
        throw new Error('You must unselect your existing GM commendation first')
      }

      // Insert new GM commendation
      await ctx.db.insert('commendations', {
        sessionId: args.sessionId,
        fromUserId: user.subject,
        toCharacterId: args.toCharacterId,
        category: 'gm',
      })

      return { action: 'created' }
    } else {
      // Player commendation
      const userCharacters = await ctx.db
        .query('characters')
        .withIndex('by_userId', (q) => q.eq('userId', user.subject))
        .collect()

      const hasCharInSession = userCharacters.some((c) => session.characters.includes(c._id))
      if (!hasCharInSession) {
        throw new Error('Only participating players can give player commendations')
      }

      const userCommendations = await ctx.db
        .query('commendations')
        .withIndex('by_session_fromUser', (q) =>
          q.eq('sessionId', args.sessionId).eq('fromUserId', user.subject)
        )
        .collect()

      const existingPlayer = userCommendations.find((c) => c.category !== 'gm')

      if (existingPlayer) {
        if (existingPlayer.toCharacterId === args.toCharacterId && existingPlayer.category === args.category) {
          // Toggle off if clicking exact same character and category
          await ctx.db.delete(existingPlayer._id)
          return { action: 'removed' }
        }
        throw new Error('You must unselect your existing commendation first')
      }

      // Insert new player commendation
      await ctx.db.insert('commendations', {
        sessionId: args.sessionId,
        fromUserId: user.subject,
        toCharacterId: args.toCharacterId,
        category: args.category,
      })

      return { action: 'created' }
    }
  },
})

export const getSessionCommendations = query({
  args: { sessionId: v.id('sessions') },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()

    const allInSession = await ctx.db
      .query('commendations')
      .withIndex('by_session', (q) => q.eq('sessionId', args.sessionId))
      .collect()

    let myCommendation: {
      _id: Id<'commendations'>
      toCharacterId: Id<'characters'>
      category: 'roleplay' | 'tactics' | 'clutch' | 'heroic'
    } | null = null

    let myGmCommendation: {
      _id: Id<'commendations'>
      toCharacterId: Id<'characters'>
      category: 'gm'
    } | null = null

    const countsByCharacter: Record<string, {
      total: number
      roleplay: number
      tactics: number
      clutch: number
      heroic: number
      gm: number
    }> = {}

    for (const comm of allInSession) {
      if (user && comm.fromUserId === user.subject) {
        if (comm.category === 'gm') {
          myGmCommendation = {
            _id: comm._id,
            toCharacterId: comm.toCharacterId,
            category: 'gm',
          }
        } else {
          myCommendation = {
            _id: comm._id,
            toCharacterId: comm.toCharacterId,
            category: comm.category as 'roleplay' | 'tactics' | 'clutch' | 'heroic',
          }
        }
      }

      if (!countsByCharacter[comm.toCharacterId]) {
        countsByCharacter[comm.toCharacterId] = {
          total: 0,
          roleplay: 0,
          tactics: 0,
          clutch: 0,
          heroic: 0,
          gm: 0,
        }
      }

      countsByCharacter[comm.toCharacterId].total += 1
      countsByCharacter[comm.toCharacterId][comm.category] += 1
    }

    return {
      myCommendation,
      myGmCommendation,
      countsByCharacter,
    }
  },
})

export const getUserCharactersCommendations = query({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) return {}

    const userCharacters = await ctx.db
      .query('characters')
      .withIndex('by_userId', (q) => q.eq('userId', user.subject))
      .collect()

    const result: Record<string, {
      total: number
      roleplay: number
      tactics: number
      clutch: number
      heroic: number
      gm: number
    }> = {}

    for (const char of userCharacters) {
      const comms = await ctx.db
        .query('commendations')
        .withIndex('by_toCharacter', (q) => q.eq('toCharacterId', char._id))
        .collect()

      const summary = {
        total: comms.length,
        roleplay: 0,
        tactics: 0,
        clutch: 0,
        heroic: 0,
        gm: 0,
      }

      for (const c of comms) {
        if (c.category in summary) {
          summary[c.category as keyof typeof summary] += 1
        }
      }

      result[char._id] = summary
    }

    return result
  },
})
