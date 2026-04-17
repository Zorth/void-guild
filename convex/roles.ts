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
export async function isAdmin(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return false
  
  // A. Check JWT claims (configured in Clerk JWT templates)
  const adminClaim = extractClaim(identity, 'admin');
  if (adminClaim === true || String(adminClaim).toLowerCase() === 'true') {
    return true;
  }

  // B. Check users table
  const userRecord = await ctx.db
    .query('users')
    .withIndex('by_userId', (q) => q.eq('userId', identity.subject))
    .first();
  if (userRecord?.isAdmin) return true;

  // C. Check characters for rank 'guildmaster'
  const characters = await ctx.db
    .query('characters')
    .withIndex('by_userId', (q) => q.eq('userId', identity.subject))
    .collect();
  if (characters.some(c => c.rank === 'guildmaster')) return true;

  return false;
}

/**
 * Checks if the authenticated user has Game Master permissions.
 * Falls back to database checks if JWT claims are missing.
 */
export async function isGameMaster(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return false
  
  // Admins are always GMs
  if (await isAdmin(ctx)) return true;

  // A. Check JWT claims
  const gmClaim = extractClaim(identity, 'gamemaster');
  if (gmClaim === true || String(gmClaim).toLowerCase() === 'true') {
    return true;
  }

  // B. Check users table
  const userRecord = await ctx.db
    .query('users')
    .withIndex('by_userId', (q) => q.eq('userId', identity.subject))
    .first();
  if (userRecord?.isGM) return true;

  // C. Check if user owns a world (World owners are GMs)
  const world = await ctx.db
    .query('worlds')
    .withIndex('by_owner', (q) => q.eq('owner', identity.subject))
    .first();
  if (world) return true;

  // D. Check characters for rank 'journeyman' or 'guildmaster'
  const characters = await ctx.db
    .query('characters')
    .withIndex('by_userId', (q) => q.eq('userId', identity.subject))
    .collect();
  if (characters.some(c => c.rank === 'journeyman' || c.rank === 'guildmaster')) return true;

  return false;
}
