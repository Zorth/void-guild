import { QueryCtx } from './_generated/server'

/**
 * Helper to extract a claim from identity or its metadata fields.
 */
export function extractClaim(identity: any, claimName: string): any {
  if (!identity) return undefined;
  
  // 1. Check top-level (direct JWT claims)
  if (identity[claimName] !== undefined) return identity[claimName];
  
  // 2. Check publicMetadata (standard Clerk-Convex integration)
  if (identity.publicMetadata && identity.publicMetadata[claimName] !== undefined) {
    return identity.publicMetadata[claimName];
  }
  
  // 3. Check public_metadata (common snake_case)
  if (identity.public_metadata && identity.public_metadata[claimName] !== undefined) {
    return identity.public_metadata[claimName];
  }

  // 4. Case-insensitive search over all identity keys and publicMetadata keys
  const lowerClaimName = claimName.toLowerCase();
  
  for (const key of Object.keys(identity)) {
    if (key.toLowerCase() === lowerClaimName) return identity[key];
  }
  
  if (identity.publicMetadata) {
    for (const key of Object.keys(identity.publicMetadata)) {
      if (key.toLowerCase() === lowerClaimName) return identity.publicMetadata[key];
    }
  }

  if (identity.public_metadata) {
    for (const key of Object.keys(identity.public_metadata)) {
      if (key.toLowerCase() === lowerClaimName) return identity.public_metadata[key];
    }
  }
  
  return undefined;
}

/**
 * Checks if the authenticated user has Admin permissions.
 * Falls back to database checks if JWT claims are missing.
 */
export async function isAdmin(ctx: QueryCtx, targetUserId?: string) {
  const identity = await ctx.auth.getUserIdentity()
  const effectiveUserId = targetUserId || identity?.subject
  if (!effectiveUserId) return false
  
  // A. Check JWT claims (configured in Clerk JWT templates) if checking current authenticated user
  if (identity && identity.subject === effectiveUserId) {
    const adminClaim = extractClaim(identity, 'admin');
    if (adminClaim === false || String(adminClaim).toLowerCase() === 'false') {
      return false;
    }
    if (adminClaim === true || String(adminClaim).toLowerCase() === 'true') {
      return true;
    }
    const roleClaim = String(extractClaim(identity, 'role') || '').toLowerCase();
    if (roleClaim === 'admin') {
      return true;
    }
  }

  // B. Check users table
  const userRecord = await ctx.db
    .query('users')
    .withIndex('by_userId', (q) => q.eq('userId', effectiveUserId))
    .first();
  if (userRecord?.isAdmin !== undefined) return userRecord.isAdmin;

  return false;
}

/**
 * Checks if a user has Game Master / Voidmaster permissions.
 * Falls back to database checks if JWT claims are missing.
 */
export async function isGameMaster(ctx: QueryCtx, targetUserId?: string) {
  const identity = await ctx.auth.getUserIdentity()
  const effectiveUserId = targetUserId || identity?.subject
  if (!effectiveUserId) return false
  
  // Admins are always GMs
  if (await isAdmin(ctx, effectiveUserId)) return true;

  // A. Check JWT claims if checking current authenticated user
  if (identity && identity.subject === effectiveUserId) {
    const gmClaim = extractClaim(identity, 'gamemaster');
    if (gmClaim === false || String(gmClaim).toLowerCase() === 'false') {
      return false;
    }
    if (gmClaim === true || String(gmClaim).toLowerCase() === 'true') {
      return true;
    }
    const roleClaim = String(extractClaim(identity, 'role') || '').toLowerCase();
    if (roleClaim === 'gamemaster' || roleClaim === 'voidmaster') {
      return true;
    }
  }

  // B. Check users table
  const userRecord = await ctx.db
    .query('users')
    .withIndex('by_userId', (q) => q.eq('userId', effectiveUserId))
    .first();
  if (userRecord?.isGM !== undefined) return userRecord.isGM;

  // C. Check if user owns a world (World owners are GMs)
  const world = await ctx.db
    .query('worlds')
    .withIndex('by_owner', (q) => q.eq('owner', effectiveUserId))
    .first();
  if (world) return true;

  return false;
}

/**
 * Checks if a user is an active Game Master / Voidmaster
 * (has run/hosted at least 1 session in the past 90 days / 3 months).
 */
export async function isActiveGameMaster(ctx: QueryCtx, targetUserId?: string): Promise<boolean> {
  const identity = await ctx.auth.getUserIdentity()
  const effectiveUserId = targetUserId || identity?.subject
  if (!effectiveUserId) return false

  const userIsGM = await isGameMaster(ctx, effectiveUserId)
  if (!userIsGM) return false

  const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000
  const recentGMSessions = await ctx.db
    .query('sessions')
    .withIndex('by_owner', (q) => q.eq('owner', effectiveUserId))
    .collect()

  return recentGMSessions.some(
    (s) => (s.date || s._creationTime) >= ninetyDaysAgo
  )
}

/**
 * Checks if a user has Member permissions and benefits (dragon badge, custom portraits, unrestricted sessions).
 * Rules:
 * 1. Explicit paid membership from tarragon.be (isMember = true claim or in users table), dragon role, or admin.
 * 2. Active Voidmasters / GMs who ran at least 1 session in the last 3 months automatically receive full membership perks.
 */
export async function isMember(ctx: QueryCtx, targetUserId?: string): Promise<boolean> {
  const identity = await ctx.auth.getUserIdentity()
  const effectiveUserId = targetUserId || identity?.subject
  if (!effectiveUserId) return false

  // 1. If checking current authenticated user, check JWT claims & admin status
  if (identity && identity.subject === effectiveUserId) {
    const memberClaim = extractClaim(identity, 'isMember')
    if (memberClaim === true || String(memberClaim).toLowerCase() === 'true') return true
    const roleClaim = String(extractClaim(identity, 'role') || '').toLowerCase()
    if (
      roleClaim === 'member' ||
      roleClaim === 'dragon' ||
      roleClaim === 'admin'
    ) {
      return true
    }
    if (await isAdmin(ctx, effectiveUserId)) return true
  }

  // 2. Check users table for explicit member or admin flag
  const userRecord = await ctx.db
    .query('users')
    .withIndex('by_userId', (q) => q.eq('userId', effectiveUserId))
    .first()
  if (userRecord?.isMember || userRecord?.isAdmin) return true

  // 3. Active Game Masters (ran 1+ session in past 3 months) inherit full Member perks
  if (await isActiveGameMaster(ctx, effectiveUserId)) {
    return true
  }

  return false
}

