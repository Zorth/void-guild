import { query, mutation, QueryCtx } from './_generated/server'
import { v } from 'convex/values'

import { Doc, Id } from './_generated/dataModel'

// Helper function to decorate a listing with character info
async function decorateListing(ctx: QueryCtx, listing: Doc<'blackVoidListings'>) {
  const seller = await ctx.db.get('characters', listing.characterId)
  let winningBidder: Doc<'characters'> | null = null
  if (listing.winningBidderCharacterId) {
    winningBidder = await ctx.db.get('characters', listing.winningBidderCharacterId)
  }

  // Count total bids
  const bids = await ctx.db
    .query('blackVoidBids')
    .withIndex('by_listingId', (q) => q.eq('listingId', listing._id))
    .collect()

  return {
    ...listing,
    sellerName: seller?.name || 'Unknown Character',
    sellerLevel: seller?.lvl || 1,
    sellerClass: seller?.class,
    sellerAncestry: seller?.ancestry,
    winningBidderName: winningBidder?.name || null,
    totalBids: bids.length,
  }
}

export const getUserCharacters = query({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) return []

    return await ctx.db
      .query('characters')
      .withIndex('by_userId', (q) => q.eq('userId', user.subject))
      .collect()
  },
})

export const createItemListing = mutation({
  args: {
    characterId: v.id('characters'),
    name: v.string(),
    description: v.optional(v.string()),
    nethysUrl: v.optional(v.string()),
    startingBid: v.optional(v.number()),
    buyoutPrice: v.optional(v.number()),
    durationDays: v.number(), // 1 to 30
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) {
      throw new Error('Not authenticated')
    }

    const character = await ctx.db.get(args.characterId)
    if (!character || character.userId !== user.subject) {
      throw new Error('You do not own this character.')
    }

    if (!args.name.trim()) {
      throw new Error('Item name is required.')
    }

    const durationDays = Math.max(1, Math.min(30, Math.floor(args.durationDays)))
    const startingBid = args.startingBid !== undefined && args.startingBid > 0 ? args.startingBid : undefined
    const buyoutPrice = args.buyoutPrice !== undefined && args.buyoutPrice > 0 ? args.buyoutPrice : undefined

    if (startingBid === undefined && buyoutPrice === undefined) {
      throw new Error('Listing must have a starting bid, buyout price, or both.')
    }

    if (startingBid !== undefined && buyoutPrice !== undefined && buyoutPrice < startingBid) {
      throw new Error('Buyout price cannot be less than starting bid.')
    }

    const now = Date.now()
    const expiresAt = now + durationDays * 86400000

    const listingId = await ctx.db.insert('blackVoidListings', {
      characterId: args.characterId,
      type: 'item',
      name: args.name.trim(),
      description: args.description?.trim(),
      nethysUrl: args.nethysUrl?.trim(),
      startingBid,
      buyoutPrice,
      durationDays,
      expiresAt,
      status: 'active',
      sellerClaimed: false,
      buyerClaimed: false,
    })

    return listingId
  },
})

export const createServiceListing = mutation({
  args: {
    characterId: v.id('characters'),
    name: v.string(),
    description: v.optional(v.string()),
    nethysUrl: v.optional(v.string()),
    priceType: v.union(v.literal('percentage'), v.literal('flat'), v.literal('custom')),
    percentage: v.optional(v.number()),
    markupGp: v.optional(v.number()),
    priceDetails: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) {
      throw new Error('Not authenticated')
    }

    const character = await ctx.db.get(args.characterId)
    if (!character || character.userId !== user.subject) {
      throw new Error('You do not own this character.')
    }

    if (!args.name.trim()) {
      throw new Error('Service name is required.')
    }

    const listingId = await ctx.db.insert('blackVoidListings', {
      characterId: args.characterId,
      type: 'service',
      name: args.name.trim(),
      description: args.description?.trim(),
      nethysUrl: args.nethysUrl?.trim(),
      priceType: args.priceType,
      percentage: args.percentage,
      markupGp: args.markupGp,
      priceDetails: args.priceDetails?.trim(),
      maxLevel: character.lvl,
      status: 'active',
      sellerClaimed: false,
      buyerClaimed: false,
    })

    return listingId
  },
})

export const placeBid = mutation({
  args: {
    listingId: v.id('blackVoidListings'),
    characterId: v.id('characters'),
    amount: v.number(),
    isBuyout: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) {
      throw new Error('Not authenticated')
    }

    const character = await ctx.db.get(args.characterId)
    if (!character || character.userId !== user.subject) {
      throw new Error('You do not own this character.')
    }

    const listing = await ctx.db.get(args.listingId)
    if (!listing || listing.status !== 'active' || listing.type !== 'item') {
      throw new Error('Listing is no longer active.')
    }

    if (listing.characterId === args.characterId) {
      throw new Error('You cannot bid on your own character listing.')
    }

    const now = Date.now()
    if (listing.expiresAt && now > listing.expiresAt) {
      await ctx.db.patch(args.listingId, { status: 'completed' })
      throw new Error('This listing has expired.')
    }

    const isBuyoutTriggered =
      args.isBuyout || (listing.buyoutPrice !== undefined && args.amount >= listing.buyoutPrice)

    if (isBuyoutTriggered) {
      const finalAmount = listing.buyoutPrice || args.amount

      await ctx.db.insert('blackVoidBids', {
        listingId: args.listingId,
        characterId: args.characterId,
        amount: finalAmount,
        isBuyout: true,
        createdAt: now,
        buyerClaimed: false,
      })

      await ctx.db.patch(args.listingId, {
        status: 'completed',
        winningBidderCharacterId: args.characterId,
        winningAmount: finalAmount,
        winningType: 'buyout',
      })

      return { success: true, isBuyout: true, amount: finalAmount }
    } else {
      // Check minimum bid
      const currentHighest = listing.winningAmount || 0
      const startingBid = listing.startingBid || 0
      const minRequired = currentHighest > 0 ? currentHighest + 1 : startingBid

      if (args.amount < minRequired) {
        throw new Error(`Bid must be at least ${minRequired} GP.`)
      }

      await ctx.db.insert('blackVoidBids', {
        listingId: args.listingId,
        characterId: args.characterId,
        amount: args.amount,
        isBuyout: false,
        createdAt: now,
        buyerClaimed: false,
      })

      await ctx.db.patch(args.listingId, {
        winningBidderCharacterId: args.characterId,
        winningAmount: args.amount,
        winningType: 'bid',
      })

      return { success: true, isBuyout: false, amount: args.amount }
    }
  },
})

export const cancelListing = mutation({
  args: {
    listingId: v.id('blackVoidListings'),
    characterId: v.id('characters'),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Not authenticated')

    const listing = await ctx.db.get(args.listingId)
    if (!listing) throw new Error('Listing not found')

    const character = await ctx.db.get(args.characterId)
    if (!character || character.userId !== user.subject || listing.characterId !== args.characterId) {
      throw new Error('You do not own this listing.')
    }

    if (listing.winningBidderCharacterId) {
      throw new Error('Cannot cancel listing after bids have been placed.')
    }

    await ctx.db.patch(args.listingId, { status: 'cancelled' })
  },
})

export const toggleSellerClaimed = mutation({
  args: {
    listingId: v.id('blackVoidListings'),
    characterId: v.id('characters'),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Not authenticated')

    const listing = await ctx.db.get(args.listingId)
    if (!listing) throw new Error('Listing not found')

    const character = await ctx.db.get(args.characterId)
    if (!character || character.userId !== user.subject || listing.characterId !== args.characterId) {
      throw new Error('You do not own this listing.')
    }

    await ctx.db.patch(args.listingId, {
      sellerClaimed: !listing.sellerClaimed,
    })
  },
})

export const toggleBuyerClaimed = mutation({
  args: {
    listingId: v.id('blackVoidListings'),
    characterId: v.id('characters'),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Not authenticated')

    const listing = await ctx.db.get(args.listingId)
    if (!listing) throw new Error('Listing not found')

    const character = await ctx.db.get(args.characterId)
    if (!character || character.userId !== user.subject || listing.winningBidderCharacterId !== args.characterId) {
      throw new Error('You are not the winning buyer of this listing.')
    }

    await ctx.db.patch(args.listingId, {
      buyerClaimed: !listing.buyerClaimed,
    })
  },
})

export const getListings = query({
  args: {
    type: v.optional(v.union(v.literal('item'), v.literal('service'))),
    status: v.optional(v.union(v.literal('active'), v.literal('completed'), v.literal('cancelled'))),
  },
  handler: async (ctx, args) => {
    const status = args.status || 'active'
    let rawListings = []

    if (args.type) {
      rawListings = await ctx.db
        .query('blackVoidListings')
        .withIndex('by_type_status', (q) => q.eq('type', args.type!).eq('status', status))
        .collect()
    } else {
      rawListings = await ctx.db
        .query('blackVoidListings')
        .withIndex('by_status', (q) => q.eq('status', status))
        .collect()
    }

    const now = Date.now()

    // Process expired items
    const validListings = []
    for (const listing of rawListings) {
      if (listing.type === 'item' && listing.status === 'active' && listing.expiresAt && now > listing.expiresAt) {
        // Will be filtered as completed when viewed
        continue
      }
      validListings.push(listing)
    }

    const decorated = await Promise.all(validListings.map((l) => decorateListing(ctx, l)))

    return decorated.sort((a, b) => b._creationTime - a._creationTime)
  },
})

export const getCharacterTransactions = query({
  args: {
    characterId: v.optional(v.id('characters')),
  },
  handler: async (ctx, args) => {
    if (!args.characterId) return { createdListings: [], wonListings: [], services: [] }

    // 1. Listings created by this character
    const createdListingsRaw = await ctx.db
      .query('blackVoidListings')
      .withIndex('by_characterId', (q) => q.eq('characterId', args.characterId!))
      .collect()

    const createdListings = await Promise.all(createdListingsRaw.map((l) => decorateListing(ctx, l)))

    // 2. Listings won by this character
    const wonListingsRaw = await ctx.db
      .query('blackVoidListings')
      .withIndex('by_winningBidderCharacterId', (q) => q.eq('winningBidderCharacterId', args.characterId!))
      .collect()

    const wonListings = await Promise.all(wonListingsRaw.map((l) => decorateListing(ctx, l)))

    const itemsSoldOrActive = createdListings.filter((l) => l.type === 'item')
    const servicesOffered = createdListings.filter((l) => l.type === 'service')

    return {
      createdItems: itemsSoldOrActive,
      wonItems: wonListings,
      servicesOffered,
    }
  },
})
