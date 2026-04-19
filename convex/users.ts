import { mutation, query, MutationCtx } from './_generated/server'
import { v } from 'convex/values'
import { isAdmin, extractClaim } from './roles'

/**
 * Syncs the current user's metadata and roles from Clerk (via JWT) to the database.
 * This acts as a fallback and cache for roles in case JWT claims are missing or unreliable.
 */
export const syncUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null

    const adminClaim = extractClaim(identity, 'admin')
    const gmClaim = extractClaim(identity, 'gamemaster')
    const extraSessionsPlayed = Number(extractClaim(identity, 'extraSessionsPlayed') || 0)
    const extraSessionsRan = Number(extractClaim(identity, 'extraSessionsRan') || 0)
    
    const isAdminUser = adminClaim === true || String(adminClaim).toLowerCase() === 'true'
    const isGMUser = gmClaim === true || String(gmClaim).toLowerCase() === 'true' || isAdminUser

    const givenName = extractClaim(identity, 'given_name')
    const familyName = extractClaim(identity, 'family_name')
    let name = identity.name
    if (!name && givenName) {
      name = familyName ? `${givenName} ${familyName.charAt(0).toUpperCase()}.` : givenName
    }

    const userData = {
      userId: identity.subject,
      isAdmin: isAdminUser,
      isGM: isGMUser,
      name: name || identity.name,
      username: identity.nickname || extractClaim(identity, 'nickname') || extractClaim(identity, 'username'),
      email: identity.email,
      imageUrl: identity.pictureUrl || extractClaim(identity, 'picture') || extractClaim(identity, 'pictureUrl'),
      extraSessionsPlayed,
      extraSessionsRan,
    }

    const existingUser = await ctx.db
      .query('users')
      .withIndex('by_userId', (q) => q.eq('userId', identity.subject))
      .first()

    if (existingUser) {
      // Only patch if something changed
      const hasChanges = 
        existingUser.isAdmin !== userData.isAdmin || 
        existingUser.isGM !== userData.isGM || 
        existingUser.name !== userData.name || 
        existingUser.username !== userData.username ||
        existingUser.email !== userData.email ||
        existingUser.imageUrl !== userData.imageUrl ||
        existingUser.extraSessionsPlayed !== userData.extraSessionsPlayed ||
        existingUser.extraSessionsRan !== userData.extraSessionsRan

      if (hasChanges) {
        await ctx.db.patch(existingUser._id, userData)
      }
      return existingUser._id
    } else {
      return await ctx.db.insert('users', userData)
    }
  },
})

/**
 * Increments the logoClicks counter for the current user.
 */
export const incrementLogoClicks = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null

    const userRecord = await ctx.db
      .query('users')
      .withIndex('by_userId', (q) => q.eq('userId', identity.subject))
      .first()

    if (userRecord) {
      await ctx.db.patch(userRecord._id, {
        logoClicks: (userRecord.logoClicks || 0) + 1,
      })
    } else {
      // Create user record if it doesn't exist yet
      await ctx.db.insert('users', {
        userId: identity.subject,
        isAdmin: false,
        isGM: false,
        name: identity.name,
        logoClicks: 1,
      })
    }
  },
})

/**
 * Gets multiple users by their Clerk userIds.
 */
export const getUsersByIds = query({
  args: {
    userIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const users = await Promise.all(
      args.userIds.map(async (userId) => {
        return await ctx.db
          .query('users')
          .withIndex('by_userId', (q) => q.eq('userId', userId))
          .first()
      })
    )
    return users.filter((u): u is NonNullable<typeof u> => u !== null)
  },
})

/**
 * Lists all users (Admin only).
 */
export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    const isAdminUser = await isAdmin(ctx)
    if (!isAdminUser) throw new Error('Unauthorized')
    return await ctx.db.query('users').collect()
  },
})

/**
 * Internal logic for updating or inserting a user record.
 */
async function updateUserData(ctx: MutationCtx, args: {
  userId: string;
  isAdmin?: boolean;
  isGM?: boolean;
  name?: string;
  username?: string;
  extraSessionsPlayed?: number;
  extraSessionsRan?: number;
}) {
  const userRecord = await ctx.db
    .query('users')
    .withIndex('by_userId', (q) => q.eq('userId', args.userId))
    .first()

  const patchData = { ...args }
  const uId = patchData.userId
  delete (patchData as { userId?: string }).userId

  if (userRecord) {
    // Only include defined properties in patchData to avoid overwriting with undefined
    const cleanPatchData = Object.fromEntries(
      Object.entries(patchData).filter(([, v]) => v !== undefined)
    )
    await ctx.db.patch(userRecord._id, cleanPatchData)
  } else {
    await ctx.db.insert('users', {
      userId: uId,
      isAdmin: args.isAdmin || false,
      isGM: args.isGM || false,
      name: args.name,
      username: args.username,
      extraSessionsPlayed: args.extraSessionsPlayed || 0,
      extraSessionsRan: args.extraSessionsRan || 0,
    })
  }
}

/**
 * Manually update a user's data (Admin only).
 */
export const updateUser = mutation({
  args: {
    userId: v.string(),
    isAdmin: v.optional(v.boolean()),
    isGM: v.optional(v.boolean()),
    name: v.optional(v.string()),
    username: v.optional(v.string()),
    extraSessionsPlayed: v.optional(v.number()),
    extraSessionsRan: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const isAdminUser = await isAdmin(ctx)
    if (!isAdminUser) throw new Error('Unauthorized')
    return await updateUserData(ctx, args)
  },
})

/**
 * Gets combined leaderboard stats for all users (public).
 */
export const getLeaderboardStats = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query('users').collect()
    const lockedSessions = await ctx.db
      .query('sessions')
      .withIndex('by_locked', (q) => q.eq('locked', true))
      .collect()

    const gmCounts = new Map<string, number>()
    const playerCounts = new Map<string, number>()
    const allCharacters = await ctx.db.query("characters").collect()
    const charToUser = new Map(allCharacters.map(c => [c._id, c.userId]))

    for (const session of lockedSessions) {
      // GM Count
      gmCounts.set(session.owner, (gmCounts.get(session.owner) || 0) + 1)
      
      // Player Count
      const usersInSession = new Set<string>()
      for (const charId of session.characters) {
        const uId = charToUser.get(charId)
        if (uId) usersInSession.add(uId)
      }
      for (const uId of usersInSession) {
        playerCounts.set(uId, (playerCounts.get(uId) || 0) + 1)
      }
    }

    const allUserIds = new Set([
      ...users.map(u => u.userId),
      ...Array.from(gmCounts.keys()),
      ...Array.from(playerCounts.keys())
    ].filter((id): id is string => typeof id === 'string' && id.length > 0))

    const userMap = new Map(users.map(u => [u.userId, u]))

    const gmLeaderboard = Array.from(allUserIds).map(userId => {
      const user = userMap.get(userId)
      const count = (gmCounts.get(userId) || 0) + (user?.extraSessionsRan || 0)
      return {
        userId,
        displayName: user?.name || user?.username || `User ${userId.slice(-4)}`,
        count
      }
    }).filter(u => u.count > 0).sort((a, b) => b.count - a.count)

    const playerLeaderboard = Array.from(allUserIds).map(userId => {
      const user = userMap.get(userId)
      const count = (playerCounts.get(userId) || 0) + (user?.extraSessionsPlayed || 0)
      return {
        userId,
        displayName: user?.name || user?.username || `User ${userId.slice(-4)}`,
        count
      }
    }).filter(u => u.count > 0).sort((a, b) => b.count - a.count)

    return { gmLeaderboard, playerLeaderboard }
  }
})

/**
 * Generates a new API key for the current user.
 */
export const generateApiKey = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const apiKey = `vg_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`
    
    const userRecord = await ctx.db
      .query('users')
      .withIndex('by_userId', (q) => q.eq('userId', identity.subject))
      .first()

    if (userRecord) {
      await ctx.db.patch(userRecord._id, { apiKey })
    } else {
      await ctx.db.insert('users', {
        userId: identity.subject,
        isAdmin: false,
        isGM: false,
        name: identity.name,
        apiKey,
      })
    }
    return apiKey
  },
})

/**
 * Revokes the current user's API key.
 */
export const revokeApiKey = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const userRecord = await ctx.db
      .query('users')
      .withIndex('by_userId', (q) => q.eq('userId', identity.subject))
      .first()

    if (userRecord) {
      await ctx.db.patch(userRecord._id, { apiKey: undefined })
    }
  },
})

/**
 * Gets the current user's API key (masked or full).
 */
export const getApiKey = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null

    const userRecord = await ctx.db
      .query('users')
      .withIndex('by_userId', (q) => q.eq('userId', identity.subject))
      .first()

    return userRecord?.apiKey || null
  },
})

/**
 * Internal query to validate an API key and return the user.
 */
export const validateApiKey = query({
  args: { apiKey: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_apiKey', (q) => q.eq('apiKey', args.apiKey))
      .first()

    if (!user) return null

    // Update last used timestamp
    // Note: We can't use mutations inside queries, so we'll just return the user
    // and let the caller decide what to do.
    return {
        _id: user._id,
        userId: user.userId,
        isAdmin: user.isAdmin,
        isGM: user.isGM,
    }
  },
})

/**
 * Deprecated: Use updateUser instead.
 */
export const updateRole = mutation({
  args: {
    userId: v.string(),
    isAdmin: v.boolean(),
    isGM: v.boolean(),
  },
  handler: async (ctx, args) => {
    const isAdminUser = await isAdmin(ctx)
    if (!isAdminUser) throw new Error('Unauthorized')
    return await updateUserData(ctx, args)
  },
})
