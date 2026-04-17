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
  isAdmin: boolean;
  isGM: boolean;
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
  delete (patchData as any).userId

  if (userRecord) {
    await ctx.db.patch(userRecord._id, patchData)
  } else {
    await ctx.db.insert('users', {
      userId: args.userId,
      isAdmin: args.isAdmin,
      isGM: args.isGM,
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
    isAdmin: v.boolean(),
    isGM: v.boolean(),
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
