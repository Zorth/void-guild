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
    minLevel: v.optional(v.number()),
    maxLevel: v.optional(v.number()),
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

    const minLvl = args.minLevel !== undefined && args.minLevel >= 1
      ? Math.min(20, Math.max(1, Math.floor(args.minLevel)))
      : undefined

    let maxLvl = args.maxLevel !== undefined && args.maxLevel >= 1
      ? Math.min(20, Math.max(1, Math.floor(args.maxLevel)))
      : character.lvl

    if (maxLvl > character.lvl) {
      maxLvl = character.lvl
    }

    if (minLvl !== undefined && maxLvl !== undefined && minLvl > maxLvl) {
      throw new Error('Minimum level cannot exceed maximum level.')
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
      minLevel: minLvl,
      maxLevel: maxLvl,
      status: 'active',
      sellerClaimed: false,
      buyerClaimed: false,
    })

    return listingId
  },
})

export function roundToTwoSigFigs(n: number): number {
  if (n <= 0) return 0
  const intVal = Math.round(n)
  if (intVal < 100) return intVal
  const digits = Math.floor(Math.log10(intVal)) + 1
  const scale = Math.pow(10, digits - 2)
  return Math.round(intVal / scale) * scale
}

export function getNextValidBid(currentBid: number): number {
  if (currentBid <= 0) return 1
  if (currentBid < 99) return currentBid + 1
  if (currentBid < 100) return 100
  const digits = Math.floor(Math.log10(currentBid)) + 1
  const step = Math.pow(10, digits - 2)
  const target = currentBid + step
  return roundToTwoSigFigs(target)
}

export const placeBid = mutation({
  args: {
    listingId: v.id('blackVoidListings'),
    characterId: v.id('characters'),
    amount: v.number(),
    maxAutoBid: v.optional(v.number()),
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

    // 1. Enforce positive integers and 2-sig-fig rounding
    const rawAmount = Math.max(1, Math.round(args.amount))
    const amount = roundToTwoSigFigs(rawAmount)

    const rawMax = args.maxAutoBid ? Math.max(amount, Math.round(args.maxAutoBid)) : amount
    const maxAutoBid = roundToTwoSigFigs(rawMax)

    // 2. Buyout trigger check
    const isBuyoutTriggered =
      args.isBuyout ||
      (listing.buyoutPrice !== undefined &&
        (amount >= listing.buyoutPrice || maxAutoBid >= listing.buyoutPrice))

    if (isBuyoutTriggered) {
      const finalAmount = listing.buyoutPrice ? roundToTwoSigFigs(listing.buyoutPrice) : amount

      await ctx.db.insert('blackVoidBids', {
        listingId: args.listingId,
        characterId: args.characterId,
        amount: finalAmount,
        maxAutoBid: maxAutoBid,
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
    }

    // 3. Multi-person Auto-Bidding Logic
    const startingBid = listing.startingBid ? roundToTwoSigFigs(listing.startingBid) : 1
    const currentWinnerId = listing.winningBidderCharacterId
    const currentWinningAmount = listing.winningAmount || 0
    const oldMaxAuto = listing.maxAutoBid || currentWinningAmount

    // Case A: First bid on listing
    if (!currentWinnerId) {
      if (maxAutoBid < startingBid) {
        throw new Error(`Bid must be at least ${startingBid} GP.`)
      }

      const initialBid = roundToTwoSigFigs(Math.max(startingBid, amount))

      await ctx.db.insert('blackVoidBids', {
        listingId: args.listingId,
        characterId: args.characterId,
        amount: initialBid,
        maxAutoBid: maxAutoBid,
        isBuyout: false,
        createdAt: now,
        buyerClaimed: false,
      })

      await ctx.db.patch(args.listingId, {
        winningBidderCharacterId: args.characterId,
        winningAmount: initialBid,
        maxAutoBid: maxAutoBid,
        winningType: 'bid',
      })

      return { success: true, isBuyout: false, amount: initialBid, isTopBidder: true }
    }

    // Case B: Current top bidder updating their auto-bid cap
    if (currentWinnerId === args.characterId) {
      if (maxAutoBid < currentWinningAmount) {
        throw new Error(
          `Your auto-bid cap cannot be lower than your current winning bid of ${currentWinningAmount} GP.`
        )
      }

      await ctx.db.insert('blackVoidBids', {
        listingId: args.listingId,
        characterId: args.characterId,
        amount: currentWinningAmount,
        maxAutoBid: maxAutoBid,
        isBuyout: false,
        createdAt: now,
        buyerClaimed: false,
      })

      await ctx.db.patch(args.listingId, {
        maxAutoBid: maxAutoBid,
      })

      return {
        success: true,
        isBuyout: false,
        amount: currentWinningAmount,
        isTopBidder: true,
        message: `Updated maximum auto-bid cap to ${maxAutoBid} GP!`,
      }
    }

    // Case C: New bidder competing against current top bidder
    const minRequired = getNextValidBid(currentWinningAmount)

    if (maxAutoBid < minRequired) {
      throw new Error(`Your bid/auto-bid cap must be at least ${minRequired} GP.`)
    }

    const newMaxAuto = maxAutoBid

    if (newMaxAuto > oldMaxAuto) {
      // New bidder outbids old top bidder
      let newWinningAmount = getNextValidBid(oldMaxAuto)

      if (newWinningAmount > newMaxAuto) {
        newWinningAmount = newMaxAuto
      }

      if (listing.buyoutPrice !== undefined && newWinningAmount >= listing.buyoutPrice) {
        const buyoutAmt = roundToTwoSigFigs(listing.buyoutPrice)
        await ctx.db.insert('blackVoidBids', {
          listingId: args.listingId,
          characterId: args.characterId,
          amount: buyoutAmt,
          maxAutoBid: newMaxAuto,
          isBuyout: true,
          createdAt: now,
          buyerClaimed: false,
        })
        await ctx.db.patch(args.listingId, {
          status: 'completed',
          winningBidderCharacterId: args.characterId,
          winningAmount: buyoutAmt,
          winningType: 'buyout',
        })
        return { success: true, isBuyout: true, amount: buyoutAmt }
      }

      if (oldMaxAuto > currentWinningAmount) {
        await ctx.db.insert('blackVoidBids', {
          listingId: args.listingId,
          characterId: currentWinnerId,
          amount: oldMaxAuto,
          isBuyout: false,
          createdAt: now,
          buyerClaimed: false,
        })
      }

      await ctx.db.insert('blackVoidBids', {
        listingId: args.listingId,
        characterId: args.characterId,
        amount: newWinningAmount,
        maxAutoBid: newMaxAuto,
        isBuyout: false,
        createdAt: now,
        buyerClaimed: false,
      })

      await ctx.db.patch(args.listingId, {
        winningBidderCharacterId: args.characterId,
        winningAmount: newWinningAmount,
        maxAutoBid: newMaxAuto,
        winningType: 'bid',
      })

      return {
        success: true,
        isBuyout: false,
        amount: newWinningAmount,
        isTopBidder: true,
        message: `You are now the top bidder at ${newWinningAmount} GP!`,
      }
    } else {
      // Old bidder stays top bidder, automatically outbidding new bidder
      let newWinningAmount = getNextValidBid(newMaxAuto)

      if (newWinningAmount > oldMaxAuto) {
        newWinningAmount = oldMaxAuto
      }

      if (listing.buyoutPrice !== undefined && newWinningAmount >= listing.buyoutPrice) {
        const buyoutAmt = roundToTwoSigFigs(listing.buyoutPrice)
        await ctx.db.insert('blackVoidBids', {
          listingId: args.listingId,
          characterId: currentWinnerId,
          amount: buyoutAmt,
          maxAutoBid: oldMaxAuto,
          isBuyout: true,
          createdAt: now,
          buyerClaimed: false,
        })
        await ctx.db.patch(args.listingId, {
          status: 'completed',
          winningBidderCharacterId: currentWinnerId,
          winningAmount: buyoutAmt,
          winningType: 'buyout',
        })
        return {
          success: false,
          isBuyout: false,
          amount: newWinningAmount,
          isTopBidder: false,
          message: `The item has been bought out by the previous top bidder!`,
        }
      }

      await ctx.db.insert('blackVoidBids', {
        listingId: args.listingId,
        characterId: args.characterId,
        amount: newMaxAuto,
        maxAutoBid: newMaxAuto,
        isBuyout: false,
        createdAt: now,
        buyerClaimed: false,
      })

      await ctx.db.insert('blackVoidBids', {
        listingId: args.listingId,
        characterId: currentWinnerId,
        amount: newWinningAmount,
        maxAutoBid: oldMaxAuto,
        isBuyout: false,
        createdAt: now,
        buyerClaimed: false,
      })

      await ctx.db.patch(args.listingId, {
        winningAmount: newWinningAmount,
        winningType: 'bid',
      })

      return {
        success: false,
        isBuyout: false,
        amount: newWinningAmount,
        isTopBidder: false,
        message: `You were immediately outbid by an existing auto-bid! Current bid is now ${newWinningAmount} GP.`,
      }
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

    // 3. Sponsored Character Quests issued by this character that have completed
    const characterQuests = await ctx.db
      .query('quests')
      .withIndex('by_characterId', (q) => q.eq('characterId', args.characterId!))
      .collect()

    const completedSponsoredQuests = await Promise.all(
      characterQuests
        .filter((q) => q.isCompleted && q.isSponsored)
        .map(async (q) => {
          let worldName = 'The Void'
          if (q.worldId) {
            const w = await ctx.db.get(q.worldId)
            if (w) worldName = w.name
          }
          return {
            _id: q._id,
            name: q.name,
            reward: q.reward,
            sponsoredAmount: q.sponsoredAmount || '20% of reward',
            netCost: q.netCost,
            worldName,
            completedAt: q.completedAt || q._creationTime,
            reimbursementClaimed: !!q.reimbursementClaimed,
          }
        })
    )

    // 4. Guildmaster Area Quest Perks
    // "1/5th of the gains of all quests (up to your level - 4) completed in this area are paid to you by the Guild."
    const character = await ctx.db.get(args.characterId)
    const isGuildmaster = character?.rank === 'guildmaster'
    const charLvl = character?.lvl || 1
    const maxGMLevel = Math.max(0, charLvl - 4)

    let guildmasterAreaGains: Array<{
      _id: Id<'quests'> | Id<'sessions'>
      sessionId?: Id<'sessions'>
      name: string
      worldName: string
      level: number
      reward: string
      guildmasterCut: string
      completedAt: number
      reimbursementClaimed: boolean
      isSessionLootCut?: boolean
    }> = []

    if (isGuildmaster) {
      // 1) Find sessions where this Guildmaster was awarded the 20% regional loot cut
      const gmSessions = await ctx.db
        .query('sessions')
        .withIndex('by_guildmaster_cut', (q) => q.eq('guildmasterCut.characterId', args.characterId!))
        .collect()

      for (const sess of gmSessions) {
        let worldName = 'The Void'
        if (sess.world) {
          const w = await ctx.db.get(sess.world)
          if (w) worldName = w.name
        }

        const lootList = sess.loot || []
        const attendingCount = (sess.characters || []).length
        const totalLootValue = lootList.reduce((sum, item) => {
          const baseVal = item.isGood ? item.valueGP : item.valueGP / 2
          const itemTotal = item.isPerCharacter ? baseVal * attendingCount : baseVal
          return sum + itemTotal
        }, 0)

        // 20% extra compensated loot worth
        const cutVal = Math.round(totalLootValue * 0.2 * 100) / 100
        const total_cp = Math.round(cutVal * 100)
        const gp = Math.floor(total_cp / 100)
        const sp = Math.floor((total_cp % 100) / 10)
        const cp = total_cp % 10
        const parts = []
        if (gp > 0) parts.push(`${gp} GP`)
        if (sp > 0) parts.push(`${sp} SP`)
        if (cp > 0) parts.push(`${cp} CP`)
        const formattedCut = parts.length > 0 ? parts.join(' ') : '0 GP'

        guildmasterAreaGains.push({
          _id: sess._id,
          sessionId: sess._id,
          name: `Session Loot Compensation (${worldName})`,
          worldName,
          level: sess.level || 0,
          reward: `${totalLootValue.toLocaleString()} GP Total Loot`,
          guildmasterCut: `${formattedCut} (20% Extra)`,
          completedAt: sess.date || sess._creationTime,
          reimbursementClaimed: !!sess.guildmasterCut?.claimed,
          isSessionLootCut: true,
        })
      }

      // 2) Find all completed quests in worlds
      const allCompletedQuests = await ctx.db
        .query('quests')
        .collect()

      const eligibleGMQuests = allCompletedQuests.filter((q) => {
        if (!q.isCompleted || !q.worldId) return false
        // Exclude quests issued by this character itself (already covered under sponsored reimbursement)
        if (q.characterId === args.characterId) return false
        const qLvl = q.levelPF ?? q.levelDnD ?? q.level ?? 0
        return qLvl <= maxGMLevel
      })

      const questGains = await Promise.all(
        eligibleGMQuests.map(async (q) => {
          let worldName = 'The Void'
          if (q.worldId) {
            const w = await ctx.db.get(q.worldId)
            if (w) worldName = w.name
          }

          let guildmasterCut = '1/5th (20%) of Quest Gains'
          if (q.reward) {
            const rewardClean = q.reward.replace(/,/g, '')
            const match = rewardClean.match(/(\d+(?:\.\d+)?)\s*(sp|gp|cp|pp|gold|silver|copper|platinum)?/i)
            if (match) {
              const num = parseFloat(match[1])
              const unit = match[2] ? match[2].toUpperCase() : 'GP'
              const cutVal = Math.round(num / 5)
              guildmasterCut = `${cutVal.toLocaleString()} ${unit}`
            }
          }

          const qLvl = q.levelPF ?? q.levelDnD ?? q.level ?? 0

          return {
            _id: q._id,
            name: q.name,
            worldName,
            level: qLvl,
            reward: q.reward || 'None stated',
            guildmasterCut,
            completedAt: q.completedAt || q._creationTime,
            reimbursementClaimed: !!q.reimbursementClaimed,
            isSessionLootCut: false,
          }
        })
      )

      guildmasterAreaGains.push(...questGains)
    }

    // 5. Quests issued by this character completed in sessions: 'To be Paid' to adventurers
    // The character pays the agreed reward (or net cost after sponsorship reimbursement)
    const completedQuestsToPay = await Promise.all(
      characterQuests
        .filter((q) => q.isCompleted)
        .map(async (q) => {
          let worldName = 'The Void'
          if (q.worldId) {
            const w = await ctx.db.get(q.worldId)
            if (w) worldName = w.name
          }
          const actualToPay = q.netCost || q.reward || 'Custom reward'
          return {
            _id: q._id,
            name: q.name,
            worldName,
            reward: q.reward || 'Custom',
            actualToPay,
            isSponsored: !!q.isSponsored,
            sponsoredAmount: q.sponsoredAmount,
            netCost: q.netCost,
            completedAt: q.completedAt || q._creationTime,
            paymentClaimed: !!q.paymentClaimed,
          }
        })
    )

    return {
      createdItems: itemsSoldOrActive,
      wonItems: wonListings,
      servicesOffered,
      sponsoredQuestReimbursements: completedSponsoredQuests,
      completedQuestsToPay,
      guildmasterAreaGains,
      isGuildmaster,
    }
  },
})
