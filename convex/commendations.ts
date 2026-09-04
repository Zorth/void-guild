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
      v.literal('heroic')
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

    // Cannot commend own character
    if (targetChar.userId === user.subject) {
      throw new Error('Cannot commend your own character')
    }

    // Check if user already commended someone in this session
    const existing = await ctx.db
      .query('commendations')
      .withIndex('by_session_fromUser', (q) =>
        q.eq('sessionId', args.sessionId).eq('fromUserId', user.subject)
      )
      .first()

    if (existing) {
      if (existing.toCharacterId === args.toCharacterId && existing.category === args.category) {
        // Toggle off if clicking exact same character and category
        await ctx.db.delete(existing._id)
        return { action: 'removed' }
      }
      // Update existing commendation to the new target character & category
      await ctx.db.patch(existing._id, {
        toCharacterId: args.toCharacterId,
        category: args.category,
      })
      return { action: 'updated' }
    }

    // Insert new commendation
    await ctx.db.insert('commendations', {
      sessionId: args.sessionId,
      fromUserId: user.subject,
      toCharacterId: args.toCharacterId,
      category: args.category,
    })

    return { action: 'created' }
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

    const countsByCharacter: Record<string, {
      total: number
      roleplay: number
      tactics: number
      clutch: number
      heroic: number
    }> = {}

    for (const comm of allInSession) {
      if (user && comm.fromUserId === user.subject) {
        myCommendation = {
          _id: comm._id,
          toCharacterId: comm.toCharacterId,
          category: comm.category,
        }
      }

      if (!countsByCharacter[comm.toCharacterId]) {
        countsByCharacter[comm.toCharacterId] = {
          total: 0,
          roleplay: 0,
          tactics: 0,
          clutch: 0,
          heroic: 0,
        }
      }

      countsByCharacter[comm.toCharacterId].total += 1
      countsByCharacter[comm.toCharacterId][comm.category] += 1
    }

    return {
      myCommendation,
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
      }

      for (const c of comms) {
        summary[c.category] += 1
      }

      result[char._id] = summary
    }

    return result
  },
})
