import { v } from 'convex/values'
import { query, mutation } from './_generated/server'
import { Id } from './_generated/dataModel'
import { roundToTwoSigFigs, getNextValidBid } from './blackVoid'

/**
 * Validates an API key and returns the user record if valid.
 */
async function validateKey(ctx: any, apiKey: string) {
    if (!apiKey || apiKey.trim() === "") {
        throw new Error('API key is required')
    }

    const user = await ctx.db
        .query('users')
        .withIndex('by_apiKey', (q: any) => q.eq('apiKey', apiKey))
        .first()
    
    if (!user) {
        throw new Error('Invalid API key')
    }
    return user
}

// --- SESSION ENDPOINTS ---

export const getSessionCharacters = query({
    args: {
        apiKey: v.string(),
        sessionId: v.string(),
    },
    handler: async (ctx, args) => {
        await validateKey(ctx, args.apiKey)
        
        const sessionId = ctx.db.normalizeId('sessions', args.sessionId)
        if (!sessionId) throw new Error('Invalid session ID')

        const session = await ctx.db.get(sessionId)
        if (!session) throw new Error('Session not found')
        
        const characters = await Promise.all(
            session.characters.map((id: any) => ctx.db.get(id))
        )
        
        return characters.filter((c: any) => c !== null).map((c: any) => ({
            id: c!._id,
            name: c!.name,
            lvl: c!.lvl,
            xp: c!.xp,
            class: c!.class,
            ancestry: c!.ancestry,
            userId: c!.userId,
            system: c!.system,
        }))
    },
})

export const listSessions = query({
    args: {
        apiKey: v.string(),
        past: v.optional(v.boolean()),
        worldId: v.optional(v.string()),
        system: v.optional(v.union(v.literal('PF'), v.literal('DnD'))),
    },
    handler: async (ctx, args) => {
        await validateKey(ctx, args.apiKey)
        let sessions = await ctx.db.query('sessions').collect()

        if (args.past !== undefined) {
            sessions = sessions.filter((s) => s.locked === args.past)
        }
        if (args.worldId) {
            const wId = ctx.db.normalizeId('worlds', args.worldId)
            if (wId) sessions = sessions.filter((s) => s.world === wId)
        }
        if (args.system) {
            sessions = sessions.filter((s) => s.system === args.system)
        }

        return sessions.sort((a, b) => (b.date || 0) - (a.date || 0))
    },
})

export const getSessionDetails = query({
    args: {
        apiKey: v.string(),
        sessionId: v.string(),
    },
    handler: async (ctx, args) => {
        await validateKey(ctx, args.apiKey)
        const sId = ctx.db.normalizeId('sessions', args.sessionId)
        if (!sId) throw new Error('Invalid session ID')

        const session = await ctx.db.get(sId)
        if (!session) throw new Error('Session not found')

        const world = await ctx.db.get(session.world)
        const characters = await Promise.all(session.characters.map((id) => ctx.db.get(id)))
        const gmCharacter = session.gmCharacter ? await ctx.db.get(session.gmCharacter) : null
        const quest = session.questId ? await ctx.db.get(session.questId) : null

        return {
            ...session,
            worldName: world?.name || 'Unknown World',
            attendingCharacters: characters.filter(Boolean),
            gmCharacterName: gmCharacter?.name || null,
            questName: quest?.name || null,
        }
    },
})

export const createSession = mutation({
    args: {
        apiKey: v.string(),
        date: v.optional(v.number()),
        level: v.optional(v.number()),
        maxPlayers: v.number(),
        system: v.union(v.literal('PF'), v.literal('DnD')),
        location: v.optional(v.string()),
        planning: v.optional(v.boolean()),
        worldId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await validateKey(ctx, args.apiKey)
        if (!user.isGM && !user.isAdmin) throw new Error('Only GMs can create sessions')

        let targetWorldId: Id<'worlds'> | null = null
        if (args.worldId) {
            targetWorldId = ctx.db.normalizeId('worlds', args.worldId)
        }

        if (!targetWorldId) {
            const world = await ctx.db
                .query('worlds')
                .withIndex('by_owner', (q) => q.eq('owner', user.userId))
                .first()

            if (!world) throw new Error('You must own a world to create a session')
            targetWorldId = world._id
        }

        const { apiKey, worldId, ...sessionData } = args
        return await ctx.db.insert('sessions', {
            ...sessionData,
            world: targetWorldId,
            owner: user.userId,
            characters: [],
            locked: false,
        })
    },
})

export const addSessionLoot = mutation({
    args: {
        apiKey: v.string(),
        sessionId: v.string(),
        name: v.string(),
        link: v.optional(v.string()),
        valueGP: v.number(),
        isGood: v.boolean(),
        isPerCharacter: v.optional(v.boolean()),
        quantity: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const user = await validateKey(ctx, args.apiKey)
        const sId = ctx.db.normalizeId('sessions', args.sessionId)
        if (!sId) throw new Error('Invalid session ID')

        const session = await ctx.db.get(sId)
        if (!session) throw new Error('Session not found')
        if (session.owner !== user.userId && !user.isAdmin) {
            throw new Error('Only the session owner or an admin can add loot.')
        }

        const loot = session.loot || []
        const quantity = args.quantity || 1
        const newItems = []

        for (let i = 0; i < quantity; i++) {
            newItems.push({
                id: crypto.randomUUID(),
                name: args.name,
                link: args.link,
                valueGP: args.valueGP,
                isGood: args.isGood,
                isPerCharacter: args.isPerCharacter ?? false,
            })
        }

        await ctx.db.patch(sId, { loot: [...loot, ...newItems] })
        return { success: true, count: quantity }
    },
})

export const updateSession = mutation({
    args: {
        apiKey: v.string(),
        sessionId: v.string(),
        date: v.optional(v.number()),
        level: v.optional(v.number()),
        maxPlayers: v.optional(v.number()),
        location: v.optional(v.string()),
        locked: v.optional(v.boolean()),
        planning: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const user = await validateKey(ctx, args.apiKey)
        const sId = ctx.db.normalizeId('sessions', args.sessionId)
        if (!sId) throw new Error('Invalid session ID')

        const session = await ctx.db.get(sId)
        if (!session) throw new Error('Session not found')
        if (session.owner !== user.userId && !user.isAdmin) {
            throw new Error('Unauthorized')
        }

        const { apiKey, sessionId, ...patch } = args
        await ctx.db.patch(sId, patch)
        return { success: true }
    },
})

// --- WORLD ENDPOINTS ---

export const listWorlds = query({
    args: { apiKey: v.string() },
    handler: async (ctx, args) => {
        await validateKey(ctx, args.apiKey)
        return await ctx.db.query('worlds').collect()
    },
})

export const getWorld = query({
    args: { apiKey: v.string(), worldId: v.string() },
    handler: async (ctx, args) => {
        await validateKey(ctx, args.apiKey)
        const wId = ctx.db.normalizeId('worlds', args.worldId)
        if (!wId) throw new Error('Invalid world ID')
        return await ctx.db.get(wId)
    },
})

export const getWorldCalendar = query({
    args: {
        apiKey: v.string(),
        worldId: v.string(),
    },
    handler: async (ctx, args) => {
        await validateKey(ctx, args.apiKey)
        
        const worldId = ctx.db.normalizeId('worlds', args.worldId)
        if (!worldId) throw new Error('Invalid world ID')

        const world = await ctx.db.get(worldId)
        if (!world) throw new Error('World not found')
        
        return {
            name: world.name,
            calendar: world.calendar ? JSON.parse(world.calendar) : null,
        }
    },
})

export const updateWorldDate = mutation({
    args: {
        apiKey: v.string(),
        worldId: v.string(),
        year: v.number(),
        month: v.number(),
        day: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await validateKey(ctx, args.apiKey)
        
        const worldId = ctx.db.normalizeId('worlds', args.worldId)
        if (!worldId) throw new Error('Invalid world ID')

        const world = await ctx.db.get(worldId)
        if (!world) throw new Error('World not found')
        
        if (world.owner !== user.userId && !user.isAdmin) {
            throw new Error('Unauthorized: You do not own this world')
        }
        
        if (!world.calendar) throw new Error('World has no calendar configured')
        
        let calendar;
        try {
            calendar = JSON.parse(world.calendar)
        } catch (e) {
            throw new Error('Failed to parse existing world calendar')
        }

        if (!calendar.dynamic_data) calendar.dynamic_data = {}
        
        calendar.dynamic_data.year = args.year
        calendar.dynamic_data.month = args.month
        calendar.dynamic_data.day = args.day
        
        await ctx.db.patch(worldId, {
            calendar: JSON.stringify(calendar)
        })
        
        return { success: true, newDate: { year: args.year, month: args.month, day: args.day } }
    },
})

// --- QUEST ENDPOINTS ---

export const listQuests = query({
    args: { apiKey: v.string(), worldId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        await validateKey(ctx, args.apiKey)
        if (args.worldId) {
            const worldId = ctx.db.normalizeId('worlds', args.worldId)
            if (worldId) {
                return await ctx.db
                    .query('quests')
                    .withIndex('by_worldId', (idx) => idx.eq('worldId', worldId))
                    .collect()
            }
        }
        return await ctx.db.query('quests').collect()
    }
})

export const createQuest = mutation({
    args: {
        apiKey: v.string(),
        name: v.string(),
        levelPF: v.optional(v.number()),
        levelDnD: v.optional(v.number()),
        worldId: v.optional(v.string()),
        description: v.optional(v.string()),
        questgiver: v.optional(v.string()),
        reward: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
        characterId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await validateKey(ctx, args.apiKey)
        
        let wId: Id<'worlds'> | undefined = undefined
        if (args.worldId) {
            const norm = ctx.db.normalizeId('worlds', args.worldId)
            if (norm) wId = norm
        }

        let cId: Id<'characters'> | undefined = undefined
        if (args.characterId) {
            const norm = ctx.db.normalizeId('characters', args.characterId)
            if (norm) {
                const char = await ctx.db.get(norm)
                if (char && (char.userId === user.userId || user.isAdmin)) {
                    cId = norm
                } else {
                    throw new Error('You do not own the specified character')
                }
            }
        }

        const { apiKey, worldId, characterId, ...questData } = args

        return await ctx.db.insert('quests', {
            ...questData,
            worldId: wId,
            characterId: cId,
            owner: user.userId,
            isCompleted: false,
        })
    },
})

export const updateQuest = mutation({
    args: {
        apiKey: v.string(),
        questId: v.string(),
        isCompleted: v.optional(v.boolean()),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        reward: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await validateKey(ctx, args.apiKey)
        const qId = ctx.db.normalizeId('quests', args.questId)
        if (!qId) throw new Error('Invalid quest ID')

        const quest = await ctx.db.get(qId)
        if (!quest) throw new Error('Quest not found')
        
        let canUpdate = quest.owner === user.userId || user.isAdmin
        if (!canUpdate && quest.worldId) {
            const world = await ctx.db.get(quest.worldId)
            if (world?.owner === user.userId) canUpdate = true
        }

        if (!canUpdate) throw new Error('Unauthorized to update quest')

        const { apiKey, questId, ...patch } = args
        await ctx.db.patch(qId, patch)
        return { success: true }
    }
})

// --- CHARACTER ENDPOINTS ---

export const listCharacters = query({
    args: { apiKey: v.string(), userId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const user = await validateKey(ctx, args.apiKey)
        const targetUserId = args.userId || user.userId
        
        return await ctx.db
            .query('characters')
            .withIndex('by_userId', (q) => q.eq('userId', targetUserId))
            .collect()
    }
})

export const getCharacter = query({
    args: { apiKey: v.string(), characterId: v.string() },
    handler: async (ctx, args) => {
        await validateKey(ctx, args.apiKey)
        const charId = ctx.db.normalizeId('characters', args.characterId)
        if (!charId) throw new Error('Invalid character ID')
        return await ctx.db.get(charId)
    }
})

export const createCharacter = mutation({
    args: {
        apiKey: v.string(),
        name: v.string(),
        lvl: v.number(),
        xp: v.number(),
        ancestry: v.optional(v.string()),
        class: v.optional(v.string()),
        system: v.optional(v.union(v.literal('PF'), v.literal('DnD'))),
        websiteLink: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await validateKey(ctx, args.apiKey)
        const { apiKey, ...charData } = args

        return await ctx.db.insert('characters', {
            ...charData,
            userId: user.userId,
            rank: 'none',
        })
    },
})

export const updateCharacter = mutation({
    args: {
        apiKey: v.string(),
        characterId: v.string(),
        name: v.optional(v.string()),
        lvl: v.optional(v.number()),
        xp: v.optional(v.number()),
        ancestry: v.optional(v.string()),
        class: v.optional(v.string()),
        websiteLink: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await validateKey(ctx, args.apiKey)
        const cId = ctx.db.normalizeId('characters', args.characterId)
        if (!cId) throw new Error('Invalid character ID')

        const char = await ctx.db.get(cId)
        if (!char) throw new Error('Character not found')

        if (char.userId !== user.userId && !user.isAdmin) {
            throw new Error('Unauthorized: You do not own this character')
        }

        const { apiKey, characterId, ...patch } = args
        await ctx.db.patch(cId, patch)
        return { success: true }
    },
})

// --- REPUTATION ENDPOINTS ---

export const getReputations = query({
    args: { apiKey: v.string(), worldId: v.string() },
    handler: async (ctx, args) => {
        await validateKey(ctx, args.apiKey)
        const wId = ctx.db.normalizeId('worlds', args.worldId)
        if (!wId) throw new Error('Invalid world ID')

        return await ctx.db
            .query('reputations')
            .withIndex('by_world_character', (q) => q.eq('worldId', wId))
            .collect()
    }
})

export const updateReputation = mutation({
    args: {
        apiKey: v.string(),
        worldId: v.string(),
        characterId: v.string(),
        factionName: v.string(),
        delta: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await validateKey(ctx, args.apiKey)
        const wId = ctx.db.normalizeId('worlds', args.worldId)
        const cId = ctx.db.normalizeId('characters', args.characterId)
        if (!wId || !cId) throw new Error('Invalid world or character ID')

        const world = await ctx.db.get(wId)
        if (!world || (world.owner !== user.userId && !user.isAdmin)) throw new Error('Unauthorized')

        const existing = await ctx.db
            .query('reputations')
            .withIndex('by_world_character', (q) => q.eq('worldId', wId).eq('characterId', cId))
            .filter((q) => q.eq(q.field('factionName'), args.factionName))
            .first()

        if (existing) {
            await ctx.db.patch(existing._id, { value: existing.value + args.delta })
        } else {
            await ctx.db.insert('reputations', {
                worldId: wId,
                characterId: cId,
                factionName: args.factionName,
                value: args.delta,
            })
        }
        return { success: true }
    }
})

// --- INITIATIVE & STATE ENDPOINTS ---

export const getSessionState = query({
    args: { apiKey: v.string(), sessionId: v.string() },
    handler: async (ctx, args) => {
        await validateKey(ctx, args.apiKey)
        const sId = ctx.db.normalizeId('sessions', args.sessionId)
        if (!sId) throw new Error('Invalid session ID')

        return await ctx.db
            .query('sessionStates')
            .withIndex('by_sessionId', (q) => q.eq('sessionId', sId))
            .first()
    }
})

export const updateSessionState = mutation({
    args: {
        apiKey: v.string(),
        sessionId: v.string(),
        initiative: v.optional(v.array(v.object({
            id: v.string(),
            name: v.string(),
            counter: v.optional(v.number()),
        }))),
        currentIndex: v.optional(v.number()),
        round: v.optional(v.number()),
        timeSeconds: v.optional(v.number()),
        isClockRunning: v.optional(v.boolean()),
        multiplier: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const user = await validateKey(ctx, args.apiKey)
        const sId = ctx.db.normalizeId('sessions', args.sessionId)
        if (!sId) throw new Error('Invalid session ID')

        const session = await ctx.db.get(sId)
        if (!session || (session.owner !== user.userId && !user.isAdmin)) throw new Error('Unauthorized')

        const existing = await ctx.db
            .query('sessionStates')
            .withIndex('by_sessionId', (q) => q.eq('sessionId', sId))
            .first()

        const { apiKey, sessionId, ...state } = args
        if (existing) {
            await ctx.db.patch(existing._id, state)
        } else {
            await ctx.db.insert('sessionStates', { sessionId: sId, ...state })
        }
        return { success: true }
    }
})

// --- DISCOVERY & SEARCH ---

export const search = query({
    args: { apiKey: v.string(), query: v.string() },
    handler: async (ctx, args) => {
        await validateKey(ctx, args.apiKey)
        const worlds = await ctx.db.query('worlds').collect()
        const characters = await ctx.db.query('characters').collect()
        
        const q = args.query.toLowerCase()
        return {
            worlds: worlds.filter(w => w.name.toLowerCase().includes(q)).map(w => ({ id: w._id, name: w.name })),
            characters: characters.filter(c => c.name.toLowerCase().includes(q)).map(c => ({ id: c._id, name: c.name }))
        }
    }
})

export const getActivity = query({
    args: { apiKey: v.string(), limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        await validateKey(ctx, args.apiKey)
        return await ctx.db.query('activity').order('desc').take(args.limit || 10)
    }
})

// --- THE BLACK VOID ENDPOINTS ---

export const getBlackVoidListings = query({
    args: {
        apiKey: v.string(),
        type: v.optional(v.union(v.literal('item'), v.literal('service'))),
        status: v.optional(v.union(v.literal('active'), v.literal('completed'), v.literal('cancelled'))),
    },
    handler: async (ctx, args) => {
        await validateKey(ctx, args.apiKey)
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

        const decorated = await Promise.all(
            rawListings.map(async (l) => {
                const seller = await ctx.db.get('characters', l.characterId)
                let winningBidder = null
                if (l.winningBidderCharacterId) {
                    winningBidder = await ctx.db.get('characters', l.winningBidderCharacterId)
                }
                return {
                    ...l,
                    sellerName: seller?.name || 'Unknown Character',
                    sellerLevel: seller?.lvl || 1,
                    winningBidderName: winningBidder?.name || null,
                }
            })
        )

        return decorated
    }
})

export const getBlackVoidTransactions = query({
    args: {
        apiKey: v.string(),
        characterId: v.string(),
    },
    handler: async (ctx, args) => {
        await validateKey(ctx, args.apiKey)
        const charId = ctx.db.normalizeId('characters', args.characterId)
        if (!charId) throw new Error('Invalid character ID')

        const createdItems = await ctx.db
            .query('blackVoidListings')
            .withIndex('by_characterId', (q) => q.eq('characterId', charId))
            .collect()

        const wonItems = await ctx.db
            .query('blackVoidListings')
            .withIndex('by_winningBidderCharacterId', (q) => q.eq('winningBidderCharacterId', charId))
            .collect()

        return {
            createdItems,
            wonItems,
        }
    }
})

export const createBlackVoidItemListing = mutation({
    args: {
        apiKey: v.string(),
        characterId: v.string(),
        name: v.string(),
        description: v.optional(v.string()),
        nethysUrl: v.optional(v.string()),
        startingBid: v.optional(v.number()),
        buyoutPrice: v.optional(v.number()),
        durationDays: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await validateKey(ctx, args.apiKey)
        const cId = ctx.db.normalizeId('characters', args.characterId)
        if (!cId) throw new Error('Invalid character ID')

        const char = await ctx.db.get(cId)
        if (!char || char.userId !== user.userId) {
            throw new Error('You do not own this character')
        }

        const durationDays = Math.max(1, Math.min(30, Math.floor(args.durationDays)))
        const now = Date.now()
        const expiresAt = now + durationDays * 86400000

        return await ctx.db.insert('blackVoidListings', {
            characterId: cId,
            type: 'item',
            name: args.name.trim(),
            description: args.description?.trim(),
            nethysUrl: args.nethysUrl?.trim(),
            startingBid: args.startingBid,
            buyoutPrice: args.buyoutPrice,
            durationDays,
            expiresAt,
            status: 'active',
            sellerClaimed: false,
            buyerClaimed: false,
        })
    },
})

export const createBlackVoidServiceListing = mutation({
    args: {
        apiKey: v.string(),
        characterId: v.string(),
        name: v.string(),
        description: v.optional(v.string()),
        nethysUrl: v.optional(v.string()),
        priceType: v.union(v.literal('percentage'), v.literal('flat'), v.literal('custom')),
        percentage: v.optional(v.number()),
        markupGp: v.optional(v.number()),
        priceDetails: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await validateKey(ctx, args.apiKey)
        const cId = ctx.db.normalizeId('characters', args.characterId)
        if (!cId) throw new Error('Invalid character ID')

        const char = await ctx.db.get(cId)
        if (!char || char.userId !== user.userId) {
            throw new Error('You do not own this character')
        }

        return await ctx.db.insert('blackVoidListings', {
            characterId: cId,
            type: 'service',
            name: args.name.trim(),
            description: args.description?.trim(),
            nethysUrl: args.nethysUrl?.trim(),
            priceType: args.priceType,
            percentage: args.percentage,
            markupGp: args.markupGp,
            priceDetails: args.priceDetails?.trim(),
            maxLevel: char.lvl,
            status: 'active',
            sellerClaimed: false,
            buyerClaimed: false,
        })
    },
})

export const placeBlackVoidBid = mutation({
    args: {
        apiKey: v.string(),
        listingId: v.string(),
        characterId: v.string(),
        amount: v.number(),
        maxAutoBid: v.optional(v.number()),
        isBuyout: v.boolean(),
    },
    handler: async (ctx, args) => {
        const user = await validateKey(ctx, args.apiKey)
        const cId = ctx.db.normalizeId('characters', args.characterId)
        const lId = ctx.db.normalizeId('blackVoidListings', args.listingId)
        if (!cId || !lId) throw new Error('Invalid character or listing ID')

        const char = await ctx.db.get(cId)
        if (!char || char.userId !== user.userId) {
            throw new Error('You do not own this character')
        }

        const listing = await ctx.db.get(lId)
        if (!listing || listing.status !== 'active' || listing.type !== 'item') {
            throw new Error('Listing is no longer active')
        }

        if (listing.characterId === cId) {
            throw new Error('Cannot bid on your own listing')
        }

        const now = Date.now()

        // 1. Enforce positive integers and 2-sig-fig rounding
        const rawAmount = Math.max(1, Math.round(args.amount))
        const amount = roundToTwoSigFigs(rawAmount)

        const rawMax = args.maxAutoBid ? Math.max(amount, Math.round(args.maxAutoBid)) : amount
        const maxAutoBid = roundToTwoSigFigs(rawMax)

        const isBuyoutTriggered =
            args.isBuyout || (listing.buyoutPrice !== undefined && (amount >= listing.buyoutPrice || maxAutoBid >= listing.buyoutPrice))

        if (isBuyoutTriggered) {
            const finalAmount = listing.buyoutPrice ? roundToTwoSigFigs(listing.buyoutPrice) : amount
            await ctx.db.insert('blackVoidBids', {
                listingId: lId,
                characterId: cId,
                amount: finalAmount,
                maxAutoBid: maxAutoBid,
                isBuyout: true,
                createdAt: now,
                buyerClaimed: false,
            })
            await ctx.db.patch(lId, {
                status: 'completed',
                winningBidderCharacterId: cId,
                winningAmount: finalAmount,
                winningType: 'buyout',
            })
            return { success: true, isBuyout: true, amount: finalAmount }
        }

        // 2. Multi-person Auto-Bidding Logic
        const startingBid = listing.startingBid ? roundToTwoSigFigs(listing.startingBid) : 1
        const currentWinnerId = listing.winningBidderCharacterId
        const currentWinningAmount = listing.winningAmount || 0
        const oldMaxAuto = listing.maxAutoBid || currentWinningAmount

        if (!currentWinnerId) {
            if (maxAutoBid < startingBid) {
                throw new Error(`Bid must be at least ${startingBid} GP`)
            }
            const initialBid = roundToTwoSigFigs(Math.max(startingBid, amount))
            await ctx.db.insert('blackVoidBids', {
                listingId: lId,
                characterId: cId,
                amount: initialBid,
                maxAutoBid: maxAutoBid,
                isBuyout: false,
                createdAt: now,
                buyerClaimed: false,
            })
            await ctx.db.patch(lId, {
                winningBidderCharacterId: cId,
                winningAmount: initialBid,
                maxAutoBid: maxAutoBid,
                winningType: 'bid',
            })
            return { success: true, isBuyout: false, amount: initialBid, isTopBidder: true }
        }

        if (currentWinnerId === cId) {
            if (maxAutoBid < currentWinningAmount) {
                throw new Error(`Your auto-bid cap cannot be lower than your current winning bid of ${currentWinningAmount} GP`)
            }
            await ctx.db.insert('blackVoidBids', {
                listingId: lId,
                characterId: cId,
                amount: currentWinningAmount,
                maxAutoBid: maxAutoBid,
                isBuyout: false,
                createdAt: now,
                buyerClaimed: false,
            })
            await ctx.db.patch(lId, {
                maxAutoBid: maxAutoBid,
            })
            return { success: true, isBuyout: false, amount: currentWinningAmount, isTopBidder: true, message: `Updated max auto-bid cap to ${maxAutoBid} GP` }
        }

        const minRequired = getNextValidBid(currentWinningAmount)
        if (maxAutoBid < minRequired) {
            throw new Error(`Your bid/auto-bid cap must be at least ${minRequired} GP`)
        }

        const newMaxAuto = maxAutoBid

        if (newMaxAuto > oldMaxAuto) {
            let newWinningAmount = getNextValidBid(oldMaxAuto)
            if (newWinningAmount > newMaxAuto) newWinningAmount = newMaxAuto

            if (listing.buyoutPrice !== undefined && newWinningAmount >= listing.buyoutPrice) {
                const buyoutAmt = roundToTwoSigFigs(listing.buyoutPrice)
                await ctx.db.insert('blackVoidBids', {
                    listingId: lId,
                    characterId: cId,
                    amount: buyoutAmt,
                    maxAutoBid: newMaxAuto,
                    isBuyout: true,
                    createdAt: now,
                    buyerClaimed: false,
                })
                await ctx.db.patch(lId, {
                    status: 'completed',
                    winningBidderCharacterId: cId,
                    winningAmount: buyoutAmt,
                    winningType: 'buyout',
                })
                return { success: true, isBuyout: true, amount: buyoutAmt }
            }

            if (oldMaxAuto > currentWinningAmount) {
                await ctx.db.insert('blackVoidBids', {
                    listingId: lId,
                    characterId: currentWinnerId,
                    amount: oldMaxAuto,
                    isBuyout: false,
                    createdAt: now,
                    buyerClaimed: false,
                })
            }

            await ctx.db.insert('blackVoidBids', {
                listingId: lId,
                characterId: cId,
                amount: newWinningAmount,
                maxAutoBid: newMaxAuto,
                isBuyout: false,
                createdAt: now,
                buyerClaimed: false,
            })
            await ctx.db.patch(lId, {
                winningBidderCharacterId: cId,
                winningAmount: newWinningAmount,
                maxAutoBid: newMaxAuto,
                winningType: 'bid',
            })
            return { success: true, isBuyout: false, amount: newWinningAmount, isTopBidder: true }
        } else {
            let newWinningAmount = getNextValidBid(newMaxAuto)
            if (newWinningAmount > oldMaxAuto) newWinningAmount = oldMaxAuto

            if (listing.buyoutPrice !== undefined && newWinningAmount >= listing.buyoutPrice) {
                const buyoutAmt = roundToTwoSigFigs(listing.buyoutPrice)
                await ctx.db.insert('blackVoidBids', {
                    listingId: lId,
                    characterId: currentWinnerId,
                    amount: buyoutAmt,
                    maxAutoBid: oldMaxAuto,
                    isBuyout: true,
                    createdAt: now,
                    buyerClaimed: false,
                })
                await ctx.db.patch(lId, {
                    status: 'completed',
                    winningBidderCharacterId: currentWinnerId,
                    winningAmount: buyoutAmt,
                    winningType: 'buyout',
                })
                return { success: false, isBuyout: false, amount: newWinningAmount, isTopBidder: false, message: 'Bought out by previous top bidder' }
            }

            await ctx.db.insert('blackVoidBids', {
                listingId: lId,
                characterId: cId,
                amount: newMaxAuto,
                maxAutoBid: newMaxAuto,
                isBuyout: false,
                createdAt: now,
                buyerClaimed: false,
            })

            await ctx.db.insert('blackVoidBids', {
                listingId: lId,
                characterId: currentWinnerId,
                amount: newWinningAmount,
                maxAutoBid: oldMaxAuto,
                isBuyout: false,
                createdAt: now,
                buyerClaimed: false,
            })

            await ctx.db.patch(lId, {
                winningAmount: newWinningAmount,
                winningType: 'bid',
            })

            return { success: false, isBuyout: false, amount: newWinningAmount, isTopBidder: false, message: `Immediately outbid by an existing auto-bid. Current bid is ${newWinningAmount} GP` }
        }
    },
})

// --- AVAILABILITY ENDPOINTS ---

export const getAvailability = query({
    args: {
        apiKey: v.string(),
        startDate: v.optional(v.number()),
        endDate: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        await validateKey(ctx, args.apiKey)
        let avail = await ctx.db.query('availability').collect()
        if (args.startDate) {
            avail = avail.filter((a) => a.date >= args.startDate!)
        }
        if (args.endDate) {
            avail = avail.filter((a) => a.date <= args.endDate!)
        }
        return avail
    },
})

export const setAvailability = mutation({
    args: {
        apiKey: v.string(),
        date: v.number(),
        isGM: v.boolean(),
    },
    handler: async (ctx, args) => {
        const user = await validateKey(ctx, args.apiKey)
        const username = user.username || user.name || 'Unknown Player'

        const existing = await ctx.db
            .query('availability')
            .withIndex('by_user_date', (q) => q.eq('userId', user.userId).eq('date', args.date))
            .first()

        if (existing) {
            await ctx.db.delete(existing._id)
            return { success: true, removed: true }
        } else {
            await ctx.db.insert('availability', {
                userId: user.userId,
                date: args.date,
                username,
                isGM: args.isGM,
            })
            return { success: true, added: true }
        }
    },
})

// --- COMMENDATIONS & ACHIEVEMENTS ENDPOINTS ---

export const listCommendations = query({
    args: {
        apiKey: v.string(),
        sessionId: v.optional(v.string()),
        characterId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await validateKey(ctx, args.apiKey)
        if (args.sessionId) {
            const sId = ctx.db.normalizeId('sessions', args.sessionId)
            if (sId) {
                return await ctx.db
                    .query('commendations')
                    .withIndex('by_session', (q) => q.eq('sessionId', sId))
                    .collect()
            }
        }
        if (args.characterId) {
            const cId = ctx.db.normalizeId('characters', args.characterId)
            if (cId) {
                return await ctx.db
                    .query('commendations')
                    .withIndex('by_toCharacter', (q) => q.eq('toCharacterId', cId))
                    .collect()
            }
        }
        return await ctx.db.query('commendations').collect()
    },
})

export const addCommendation = mutation({
    args: {
        apiKey: v.string(),
        sessionId: v.string(),
        toCharacterId: v.string(),
        category: v.union(
            v.literal('roleplay'),
            v.literal('tactics'),
            v.literal('clutch'),
            v.literal('heroic'),
            v.literal('gm')
        ),
    },
    handler: async (ctx, args) => {
        const user = await validateKey(ctx, args.apiKey)
        const sId = ctx.db.normalizeId('sessions', args.sessionId)
        const cId = ctx.db.normalizeId('characters', args.toCharacterId)
        if (!sId || !cId) throw new Error('Invalid session or character ID')

        return await ctx.db.insert('commendations', {
            sessionId: sId,
            fromUserId: user.userId,
            toCharacterId: cId,
            category: args.category,
        })
    },
})

export const getUnlockedAchievements = query({
    args: { apiKey: v.string() },
    handler: async (ctx, args) => {
        const user = await validateKey(ctx, args.apiKey)
        return await ctx.db
            .query('unlockedAchievements')
            .withIndex('by_userId', (q) => q.eq('userId', user.userId))
            .collect()
    },
})

export const getCharacterQuests = query({
    args: {
        apiKey: v.string(),
        characterId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await validateKey(ctx, args.apiKey)
        if (args.characterId) {
            const charId = ctx.db.normalizeId('characters', args.characterId)
            if (!charId) throw new Error('Invalid character ID')
            return await ctx.db
                .query('quests')
                .withIndex('by_characterId', (q) => q.eq('characterId', charId))
                .collect()
        }
        const allQuests = await ctx.db.query('quests').collect()
        return allQuests.filter((q) => q.characterId !== undefined)
    }
})
