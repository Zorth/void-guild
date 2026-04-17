import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { isAdmin, isGameMaster, extractClaim } from './roles'

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
    
    const isAdminUser = adminClaim === true || String(adminClaim).toLowerCase() === 'true'
    const isGMUser = gmClaim === true || String(gmClaim).toLowerCase() === 'true' || isAdminUser

    const existingUser = await ctx.db
      .query('users')
      .withIndex('by_userId', (q) => q.eq('userId', identity.subject))
      .first()

    if (existingUser) {
      // Only patch if something changed
      if (
        existingUser.isAdmin !== isAdminUser || 
        existingUser.isGM !== isGMUser || 
        existingUser.name !== identity.name || 
        existingUser.email !== identity.email
      ) {
        await ctx.db.patch(existingUser._id, {
          isAdmin: isAdminUser,
          isGM: isGMUser,
          name: identity.name,
          email: identity.email,
        })
      }
      return existingUser._id
    } else {
      return await ctx.db.insert('users', {
        userId: identity.subject,
        isAdmin: isAdminUser,
        isGM: isGMUser,
        name: identity.name,
        email: identity.email,
      })
    }
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
 * Manually update a user's roles (Admin only).
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

    const userRecord = await ctx.db
      .query('users')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .first()

    if (userRecord) {
      await ctx.db.patch(userRecord._id, {
        isAdmin: args.isAdmin,
        isGM: args.isGM,
      })
    } else {
      await ctx.db.insert('users', {
        userId: args.userId,
        isAdmin: args.isAdmin,
        isGM: args.isGM,
      })
    }
  },
})
