import { v } from 'convex/values'
import { query, mutation } from './_generated/server'
import { Id } from './_generated/dataModel'
import { api } from './_generated/api'

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

// --- SESSION ENDpoints ---

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

export const createSession = mutation({
    args: {
        apiKey: v.string(),
        date: v.optional(v.number()),
        level: v.optional(v.number()),
        maxPlayers: v.number(),
        system: v.union(v.literal('PF'), v.literal('DnD')),
        location: v.optional(v.string()),
        planning: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const user = await validateKey(ctx, args.apiKey)
        if (!user.isGM && !user.isAdmin) throw new Error('Only GMs can create sessions')

        const world = await ctx.db
            .query('worlds')
            .withIndex('by_owner', (q) => q.eq('owner', user.userId))
            .first()

        if (!world) throw new Error('You must own a world to create a session')

        const { apiKey, ...sessionData } = args
        return await ctx.db.insert('sessions', {
            ...sessionData,
            world: world._id,
            owner: user.userId,
            characters: [],
            locked: false,
        })
    }
})

// --- WORLD ENDpoints ---

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

// --- QUEST ENDpoints ---

export const listQuests = query({
    args: { apiKey: v.string(), worldId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        await validateKey(ctx, args.apiKey)
        let q = ctx.db.query('quests')
        if (args.worldId) {
            const worldId = ctx.db.normalizeId('worlds', args.worldId)
            if (worldId) q = q.withIndex('by_worldId', (idx) => idx.eq('worldId', worldId))
        }
        return await q.collect()
    }
})

export const updateQuest = mutation({
    args: {
        apiKey: v.string(),
        questId: v.id('quests'),
        isCompleted: v.optional(v.boolean()),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await validateKey(ctx, args.apiKey)
        const quest = await ctx.db.get(args.questId)
        if (!quest) throw new Error('Quest not found')
        
        // Only creator or admin or world owner
        let canUpdate = quest.owner === user.userId || user.isAdmin
        if (!canUpdate && quest.worldId) {
            const world = await ctx.db.get(quest.worldId)
            if (world?.owner === user.userId) canUpdate = true
        }

        if (!canUpdate) throw new Error('Unauthorized to update quest')

        const { apiKey, questId, ...patch } = args
        await ctx.db.patch(questId, patch)
    }
})

// --- CHARACTER ENDpoints ---

export const getCharacter = query({
    args: { apiKey: v.string(), characterId: v.string() },
    handler: async (ctx, args) => {
        await validateKey(ctx, args.apiKey)
        const charId = ctx.db.normalizeId('characters', args.characterId)
        if (!charId) throw new Error('Invalid character ID')
        return await ctx.db.get(charId)
    }
})

// --- REPUTATION ENDpoints ---

export const getReputations = query({
    args: { apiKey: v.string(), worldId: v.id('worlds') },
    handler: async (ctx, args) => {
        await validateKey(ctx, args.apiKey)
        return await ctx.db
            .query('reputations')
            .withIndex('by_world_character', (q) => q.eq('worldId', args.worldId))
            .collect()
    }
})

export const updateReputation = mutation({
    args: {
        apiKey: v.string(),
        worldId: v.id('worlds'),
        characterId: v.id('characters'),
        factionName: v.string(),
        delta: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await validateKey(ctx, args.apiKey)
        const world = await ctx.db.get(args.worldId)
        if (!world || (world.owner !== user.userId && !user.isAdmin)) throw new Error('Unauthorized')

        const existing = await ctx.db
            .query('reputations')
            .withIndex('by_world_character', (q) => q.eq('worldId', args.worldId).eq('characterId', args.characterId))
            .filter((q) => q.eq(q.field('factionName'), args.factionName))
            .first()

        if (existing) {
            await ctx.db.patch(existing._id, { value: existing.value + args.delta })
        } else {
            await ctx.db.insert('reputations', {
                worldId: args.worldId,
                characterId: args.characterId,
                factionName: args.factionName,
                value: args.delta,
            })
        }
    }
})

// --- INITIATIVE & STATE ENDpoints ---

export const getSessionState = query({
    args: { apiKey: v.string(), sessionId: v.id('sessions') },
    handler: async (ctx, args) => {
        await validateKey(ctx, args.apiKey)
        return await ctx.db
            .query('sessionStates')
            .withIndex('by_sessionId', (q) => q.eq('sessionId', args.sessionId))
            .first()
    }
})

export const updateSessionState = mutation({
    args: {
        apiKey: v.string(),
        sessionId: v.id('sessions'),
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
        const session = await ctx.db.get(args.sessionId)
        if (!session || (session.owner !== user.userId && !user.isAdmin)) throw new Error('Unauthorized')

        const existing = await ctx.db
            .query('sessionStates')
            .withIndex('by_sessionId', (q) => q.eq('sessionId', args.sessionId))
            .first()

        const { apiKey, sessionId, ...state } = args
        if (existing) {
            await ctx.db.patch(existing._id, state)
        } else {
            await ctx.db.insert('sessionStates', { sessionId, ...state })
        }
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
