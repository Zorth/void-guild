import { v } from 'convex/values'
import { query, mutation } from './_generated/server'
import { Id } from './_generated/dataModel'

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
        }))
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
