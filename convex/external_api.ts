import { v } from 'convex/values'
import { query, mutation } from './_generated/server'
import { internal } from './_generated/api'
import { Id } from './_generated/dataModel'
import { roundToTwoSigFigs, getNextValidBid } from './blackVoid'

async function validateKey(ctx: any, apiKey?: string) {
    if (!apiKey || apiKey.trim() === "") {
        return null
    }

    const user = await ctx.db
        .query('users')
        .withIndex('by_apiKey', (q: any) => q.eq('apiKey', apiKey))
        .first()
    
    if (!user) return null

    // Determine admin and GM status, honoring user document plus character guildmaster rank or owned world
    let isAdmin = Boolean(user.isAdmin)
    let isGM = Boolean(user.isGM) || isAdmin

    if (!isAdmin) {
        const userCharacters = await ctx.db
            .query('characters')
            .withIndex('by_userId', (q: any) => q.eq('userId', user.userId))
            .collect()
        
        if (userCharacters.some((c: any) => c.rank === 'guildmaster')) {
            isAdmin = true
            isGM = true
        } else if (!isGM && userCharacters.some((c: any) => c.rank === 'journeyman')) {
            isGM = true
        }
    }

    if (!isGM) {
        const ownedWorld = await ctx.db
            .query('worlds')
            .withIndex('by_owner', (q: any) => q.eq('owner', user.userId))
            .first()
        if (ownedWorld) {
            isGM = true
        }
    }

    return {
        ...user,
        isAdmin,
        isGM,
    }
}

async function requireUser(ctx: any, apiKey?: string) {
    if (!apiKey || apiKey.trim() === "") {
        throw new Error('Unauthorized: API key is required for this action')
    }
    const user = await validateKey(ctx, apiKey)
    if (!user) {
        throw new Error('Unauthorized: Invalid API key')
    }
    return user
}

// --- SESSION ENDPOINTS ---

export const getSessionCharacters = query({
    args: {
        apiKey: v.optional(v.string()),
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
            title: c!.title,
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
        apiKey: v.optional(v.string()),
        past: v.optional(v.boolean()),
        worldId: v.optional(v.string()),
        system: v.optional(v.union(v.literal('PF'), v.literal('DnD'))),
    },
    handler: async (ctx, args) => {
        const user = await validateKey(ctx, args.apiKey)
        let sessions = await ctx.db.query('sessions').collect()

        // Private sessions are hidden from public list unless requester is owner or admin
        sessions = sessions.filter((s) => {
            if (!s.isPrivate) return true
            if (!user) return false
            if (user.isAdmin || user.userId === s.owner) return true
            return false
        })

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
        apiKey: v.optional(v.string()),
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
        const user = await requireUser(ctx, args.apiKey)
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
        const user = await requireUser(ctx, args.apiKey)
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
        const user = await requireUser(ctx, args.apiKey)
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
    args: { apiKey: v.optional(v.string()) },
    handler: async (ctx, args) => {
        await validateKey(ctx, args.apiKey)
        return await ctx.db.query('worlds').collect()
    },
})

export const getWorld = query({
    args: { apiKey: v.optional(v.string()), worldId: v.string() },
    handler: async (ctx, args) => {
        await validateKey(ctx, args.apiKey)
        const wId = ctx.db.normalizeId('worlds', args.worldId)
        if (!wId) throw new Error('Invalid world ID')
        return await ctx.db.get(wId)
    },
})

export const getWorldCalendar = query({
    args: {
        apiKey: v.optional(v.string()),
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
        const user = await requireUser(ctx, args.apiKey)
        
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
    args: { apiKey: v.optional(v.string()), worldId: v.optional(v.string()) },
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
        const user = await requireUser(ctx, args.apiKey)
        
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
        const user = await requireUser(ctx, args.apiKey)
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

function formatPlayerName(user: any): string | null {
    if (!user) return null

    // If username is provided, format it (e.g. "John Doe" -> "John D." or "John_Doe" -> "John D.")
    const rawName = user.username || user.name
    if (!rawName || typeof rawName !== 'string') return null

    const trimmed = rawName.trim()
    if (!trimmed) return null

    // Split on spaces or underscores/dots
    const parts = trimmed.split(/[\s_]+/).filter(Boolean)
    if (parts.length > 1) {
        const first = parts[0]
        const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase()
        return `${first} ${lastInitial}.`
    }

    return trimmed
}

// --- CHARACTER ENDPOINTS ---

export const listCharacters = query({
    args: { apiKey: v.optional(v.string()), userId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        await validateKey(ctx, args.apiKey)
        
        let characters = []
        if (args.userId) {
            characters = await ctx.db
                .query('characters')
                .withIndex('by_userId', (q) => q.eq('userId', args.userId!))
                .collect()
        } else {
            characters = await ctx.db.query('characters').collect()
        }

        const usersMap = new Map<string, any>()
        const userIds = Array.from(new Set(characters.map((c) => c.userId)))
        await Promise.all(
            userIds.map(async (uId) => {
                const u = await ctx.db
                    .query('users')
                    .withIndex('by_userId', (q) => q.eq('userId', uId))
                    .first()
                if (u) usersMap.set(uId, u)
            })
        )

        return characters.map((c) => {
            const owner = usersMap.get(c.userId)
            return {
                ...c,
                title: c.title ?? null,
                player: formatPlayerName(owner),
            }
        })
    }
})

export const getCharacter = query({
    args: { apiKey: v.optional(v.string()), characterId: v.string() },
    handler: async (ctx, args) => {
        await validateKey(ctx, args.apiKey)
        const charId = ctx.db.normalizeId('characters', args.characterId)
        if (!charId) throw new Error('Invalid character ID')
        const char = await ctx.db.get(charId)
        if (!char) return null

        const owner = await ctx.db
            .query('users')
            .withIndex('by_userId', (q) => q.eq('userId', char.userId))
            .first()

        const details = await ctx.db
            .query('characterDetails')
            .withIndex('by_characterId', (q) => q.eq('characterId', charId))
            .first()

        return {
            ...char,
            title: char.title ?? null,
            player: formatPlayerName(owner),
            details: details ?? null,
        }
    }
})

export const getCharacterSheet = query({
    args: { apiKey: v.optional(v.string()), characterId: v.string() },
    handler: async (ctx, args) => {
        await validateKey(ctx, args.apiKey)
        const charId = ctx.db.normalizeId('characters', args.characterId)
        if (!charId) throw new Error('Invalid character ID')
        const char = await ctx.db.get(charId)
        if (!char) return null

        const details = await ctx.db
            .query('characterDetails')
            .withIndex('by_characterId', (q) => q.eq('characterId', charId))
            .first()

        return details ?? null
    }
})

export const createCharacter = mutation({
    args: {
        apiKey: v.string(),
        name: v.string(),
        ancestry: v.optional(v.string()),
        class: v.optional(v.string()),
        system: v.union(v.literal('PF'), v.literal('DnD')),
        websiteLink: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx, args.apiKey)
        const { apiKey, ...charData } = args

        return await ctx.db.insert('characters', {
            ...charData,
            lvl: 1,
            xp: 0,
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
        ancestry: v.optional(v.string()),
        class: v.optional(v.string()),
        websiteLink: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx, args.apiKey)
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

export const updateCharacterSheet = mutation({
    args: {
        apiKey: v.string(),
        characterId: v.string(),
        pathbuilderId: v.optional(v.number()),
        system: v.string(),
        name: v.optional(v.string()),
        level: v.optional(v.number()), // Note: character table lvl is NOT modified; stored as informational in details
        xp: v.optional(v.number()),    // Note: character table xp is NOT modified; stored as informational in details
        ancestry: v.optional(v.string()),
        heritage: v.optional(v.string()),
        background: v.optional(v.string()),
        class: v.optional(v.string()),
        dualClass: v.optional(v.union(v.string(), v.null())),
        keyAbility: v.optional(v.union(
            v.literal('str'),
            v.literal('dex'),
            v.literal('con'),
            v.literal('int'),
            v.literal('wis'),
            v.literal('cha')
        )),
        alignment: v.optional(v.string()),
        deity: v.optional(v.string()),
        size: v.optional(v.string()),
        speed: v.optional(v.number()),
        // Support both "ac": number and "armorClass": object
        ac: v.optional(v.number()),
        armorClass: v.optional(v.object({
            total: v.number(),
            shieldBonus: v.optional(v.number()),
            unarmoredProf: v.optional(v.number()),
            equippedArmorName: v.optional(v.string()),
            shieldHardness: v.optional(v.number()),
            shieldCurrentHP: v.optional(v.number()),
            shieldMaxHP: v.optional(v.number()),
        })),
        // Support both simplified hp { current, max, temp } and full hitPoints
        hp: v.optional(v.object({
            current: v.number(),
            max: v.number(),
            temp: v.optional(v.number()),
            temporary: v.optional(v.number()),
        })),
        hitPoints: v.optional(v.object({
            max: v.number(),
            current: v.number(),
            temporary: v.number(),
            dieSize: v.optional(v.number()),
            ancestryHP: v.optional(v.number()),
            classHP: v.optional(v.number()),
            bonusHP: v.optional(v.number()),
        })),
        saves: v.optional(v.object({
            fortitude: v.optional(v.object({
                bonus: v.number(),
                proficiency: v.optional(v.union(v.literal('U'), v.literal('T'), v.literal('E'), v.literal('M'), v.literal('L'))),
                profValue: v.optional(v.number()),
                itemBonus: v.optional(v.number()),
            })),
            reflex: v.optional(v.object({
                bonus: v.number(),
                proficiency: v.optional(v.union(v.literal('U'), v.literal('T'), v.literal('E'), v.literal('M'), v.literal('L'))),
                profValue: v.optional(v.number()),
                itemBonus: v.optional(v.number()),
            })),
            will: v.optional(v.object({
                bonus: v.number(),
                proficiency: v.optional(v.union(v.literal('U'), v.literal('T'), v.literal('E'), v.literal('M'), v.literal('L'))),
                profValue: v.optional(v.number()),
                itemBonus: v.optional(v.number()),
            })),
            perception: v.optional(v.object({
                bonus: v.number(),
                proficiency: v.optional(v.union(v.literal('U'), v.literal('T'), v.literal('E'), v.literal('M'), v.literal('L'))),
                profValue: v.optional(v.number()),
                itemBonus: v.optional(v.number()),
            })),
        })),
        abilities: v.optional(v.object({
            str: v.number(),
            dex: v.number(),
            con: v.number(),
            int: v.number(),
            wis: v.number(),
            cha: v.number(),
        })),
        skills: v.optional(v.record(v.string(), v.object({
            name: v.string(),
            modifier: v.number(),
            proficiency: v.optional(v.union(v.literal('U'), v.literal('T'), v.literal('E'), v.literal('M'), v.literal('L'))),
            ability: v.optional(v.string()),
            isLore: v.optional(v.boolean()),
        }))),
        conditions: v.optional(v.array(v.object({
            name: v.string(),
            value: v.optional(v.number()),
        }))),
        money: v.optional(v.union(
            v.object({
                cp: v.optional(v.number()),
                sp: v.optional(v.number()),
                gp: v.optional(v.number()),
                pp: v.optional(v.number()),
                totalInGold: v.optional(v.number()),
            }),
            v.number()
        )),
        // Support gear as structured object or array of items
        gear: v.optional(v.union(
            v.object({
                weapons: v.optional(v.array(v.object({
                    name: v.string(),
                    die: v.optional(v.string()),
                    damageType: v.optional(v.string()),
                    attackBonus: v.optional(v.number()),
                    potency: v.optional(v.number()),
                    striking: v.optional(v.union(v.string(), v.null())),
                    runes: v.optional(v.array(v.string())),
                    traits: v.optional(v.array(v.string())),
                    qty: v.number(),
                }))),
                armor: v.optional(v.array(v.object({
                    name: v.string(),
                    acBonus: v.optional(v.number()),
                    potency: v.optional(v.number()),
                    resilient: v.optional(v.string()),
                    runes: v.optional(v.array(v.string())),
                    worn: v.optional(v.boolean()),
                    qty: v.number(),
                }))),
                equipment: v.optional(v.array(v.object({
                    name: v.string(),
                    qty: v.number(),
                    bulk: v.optional(v.string()),
                    container: v.optional(v.string()),
                }))),
            }),
            v.array(v.object({
                name: v.string(),
                qty: v.number(),
                bulk: v.optional(v.string()),
                container: v.optional(v.string()),
            }))
        )),
        buildSummary: v.optional(v.object({
            classFeatures: v.optional(v.array(v.string())),
            ancestryFeats: v.optional(v.array(v.string())),
            classFeats: v.optional(v.array(v.string())),
            skillFeats: v.optional(v.array(v.string())),
            generalFeats: v.optional(v.array(v.string())),
            languages: v.optional(v.array(v.string())),
            specialResistances: v.optional(v.array(v.string())),
            feats: v.optional(v.array(v.string())),
            specials: v.optional(v.array(v.string())),
        })),
        rawExport: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx, args.apiKey)
        const cId = ctx.db.normalizeId('characters', args.characterId)
        if (!cId) throw new Error('Invalid character ID')

        const char = await ctx.db.get(cId)
        if (!char) throw new Error('Character not found')

        if (char.userId !== user.userId && !user.isAdmin) {
            throw new Error('Unauthorized: You do not own this character')
        }

        // Normalize Hit Points
        let normalizedHitPoints = args.hitPoints
        if (!normalizedHitPoints && args.hp) {
            normalizedHitPoints = {
                max: args.hp.max,
                current: args.hp.current,
                temporary: args.hp.temp ?? args.hp.temporary ?? 0,
                dieSize: undefined,
                ancestryHP: undefined,
                classHP: undefined,
                bonusHP: undefined,
            }
        }

        // Normalize Armor Class
        let normalizedArmorClass = args.armorClass
        if (!normalizedArmorClass && args.ac !== undefined) {
            normalizedArmorClass = {
                total: args.ac,
                shieldBonus: undefined,
                unarmoredProf: undefined,
                equippedArmorName: undefined,
                shieldHardness: undefined,
                shieldCurrentHP: undefined,
                shieldMaxHP: undefined,
            }
        }

        // Normalize Money total if not present
        let normalizedMoney = undefined
        if (typeof args.money === 'number') {
            normalizedMoney = {
                cp: 0,
                sp: 0,
                gp: args.money,
                pp: 0,
                totalInGold: args.money,
            }
        } else if (args.money && typeof args.money === 'object') {
            const cp = args.money.cp || 0
            const sp = args.money.sp || 0
            const gp = args.money.gp || 0
            const pp = args.money.pp || 0
            normalizedMoney = {
                cp,
                sp,
                gp,
                pp,
                totalInGold: args.money.totalInGold !== undefined
                    ? args.money.totalInGold
                    : Math.round((gp + (pp * 10) + (sp / 10) + (cp / 100)) * 100) / 100,
            }
        }

        // Normalize Gear
        let normalizedGear: any = undefined
        if (Array.isArray(args.gear)) {
            normalizedGear = {
                weapons: [],
                armor: [],
                equipment: args.gear,
            }
        } else if (args.gear) {
            normalizedGear = args.gear
        }

        // Existing details check
        const existing = await ctx.db
            .query('characterDetails')
            .withIndex('by_characterId', (q) => q.eq('characterId', cId))
            .first()

        const now = Date.now()

        const detailsRecord = {
            characterId: cId,
            pathbuilderId: args.pathbuilderId ?? existing?.pathbuilderId,
            system: args.system ?? existing?.system ?? 'PF2e',
            name: args.name ?? existing?.name ?? char.name,
            level: args.level ?? existing?.level ?? char.lvl,
            xp: args.xp ?? existing?.xp ?? char.xp,
            ancestry: args.ancestry ?? existing?.ancestry ?? char.ancestry,
            heritage: args.heritage ?? existing?.heritage,
            background: args.background ?? existing?.background,
            class: args.class ?? existing?.class ?? char.class,
            dualClass: args.dualClass ?? existing?.dualClass,
            keyAbility: args.keyAbility ?? existing?.keyAbility,
            alignment: args.alignment ?? existing?.alignment,
            deity: args.deity ?? existing?.deity,
            size: args.size ?? existing?.size,
            speed: args.speed ?? existing?.speed,
            hitPoints: normalizedHitPoints ?? existing?.hitPoints,
            armorClass: normalizedArmorClass ?? existing?.armorClass,
            saves: args.saves ?? existing?.saves,
            abilities: args.abilities ?? existing?.abilities,
            skills: args.skills ?? existing?.skills,
            conditions: args.conditions ?? existing?.conditions,
            money: normalizedMoney ?? existing?.money,
            gear: normalizedGear ?? existing?.gear,
            buildSummary: args.buildSummary ?? existing?.buildSummary,
            rawExport: args.rawExport ?? existing?.rawExport,
            lastSyncedAt: now,
        }

        if (existing) {
            await ctx.db.patch(existing._id, detailsRecord)
        } else {
            await ctx.db.insert('characterDetails', detailsRecord)
        }

        // Optionally update character's basic profile details if supplied (excluding level and xp to preserve integrity)
        const charProfilePatch: { ancestry?: string; class?: string } = {}
        if (args.ancestry && args.ancestry !== char.ancestry) {
            charProfilePatch.ancestry = args.ancestry
        }
        if (args.class && args.class !== char.class) {
            charProfilePatch.class = args.class
        }
        if (Object.keys(charProfilePatch).length > 0) {
            await ctx.db.patch(cId, charProfilePatch)
        }

        return {
            success: true,
            characterId: cId,
            lastSyncedAt: now,
        }
    },
})

// --- REPUTATION ENDPOINTS ---

export const getReputations = query({
    args: { apiKey: v.optional(v.string()), worldId: v.string() },
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
        const user = await requireUser(ctx, args.apiKey)
        const wId = ctx.db.normalizeId('worlds', args.worldId)
        const cId = ctx.db.normalizeId('characters', args.characterId)
        if (!wId || !cId) throw new Error('Invalid world or character ID')

        const world = await ctx.db.get(wId)
        if (!world || (world.owner !== user.userId && !user.isAdmin)) throw new Error('Unauthorized')

        const existing = await ctx.db
            .query('reputations')
            .withIndex('by_world_character_faction', (q) => 
                q.eq('worldId', wId).eq('characterId', cId).eq('factionName', args.factionName)
            )
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
    args: { apiKey: v.optional(v.string()), sessionId: v.string() },
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
        const user = await requireUser(ctx, args.apiKey)
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
    args: { apiKey: v.optional(v.string()), query: v.string() },
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
    args: { apiKey: v.optional(v.string()), limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        await validateKey(ctx, args.apiKey)
        return await ctx.db.query('activity').order('desc').take(args.limit || 10)
    }
})

// --- THE BLACK VOID ENDPOINTS ---

export const getBlackVoidListings = query({
    args: {
        apiKey: v.optional(v.string()),
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
        apiKey: v.optional(v.string()),
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
        const user = await requireUser(ctx, args.apiKey)
        const cId = ctx.db.normalizeId('characters', args.characterId)
        if (!cId) throw new Error('Invalid character ID')

        const char = await ctx.db.get(cId)
        if (!char || char.userId !== user.userId) {
            throw new Error('You do not own this character')
        }

        const durationDays = Math.max(1, Math.min(30, Math.floor(args.durationDays)))
        const now = Date.now()
        const expiresAt = now + durationDays * 86400000

        const listingId = await ctx.db.insert('blackVoidListings', {
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

        await ctx.scheduler.runAfter(0, internal.blackVoidDiscord.notifyNewListing, { listingId })

        return listingId
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
        minLevel: v.optional(v.number()),
        maxLevel: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx, args.apiKey)
        const cId = ctx.db.normalizeId('characters', args.characterId)
        if (!cId) throw new Error('Invalid character ID')

        const char = await ctx.db.get(cId)
        if (!char || char.userId !== user.userId) {
            throw new Error('You do not own this character')
        }

        const minLvl = args.minLevel !== undefined && args.minLevel >= 1
            ? Math.min(20, Math.max(1, Math.floor(args.minLevel)))
            : undefined

        let maxLvl = args.maxLevel !== undefined && args.maxLevel >= 1
            ? Math.min(20, Math.max(1, Math.floor(args.maxLevel)))
            : char.lvl

        if (maxLvl > char.lvl) {
            maxLvl = char.lvl
        }

        if (minLvl !== undefined && maxLvl !== undefined && minLvl > maxLvl) {
            throw new Error('Minimum level cannot exceed maximum level.')
        }

        const listingId = await ctx.db.insert('blackVoidListings', {
            characterId: cId,
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

        await ctx.scheduler.runAfter(0, internal.blackVoidDiscord.notifyNewListing, { listingId })

        return listingId
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
        const user = await requireUser(ctx, args.apiKey)
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

// --- BLACK VOID CHARACTER LOG & CLAIM ENDPOINTS ---

export const getBlackVoidCharacterLog = query({
    args: {
        apiKey: v.optional(v.string()),
        characterId: v.string(),
    },
    handler: async (ctx, args) => {
        await validateKey(ctx, args.apiKey)
        const charId = ctx.db.normalizeId('characters', args.characterId)
        if (!charId) throw new Error('Invalid character ID')

        const character = await ctx.db.get(charId)
        if (!character) return null

        // 1. Listings created by this character
        const createdListingsRaw = await ctx.db
            .query('blackVoidListings')
            .withIndex('by_characterId', (q) => q.eq('characterId', charId))
            .collect()

        const createdItems = createdListingsRaw.filter((l) => l.type === 'item')
        const servicesOffered = createdListingsRaw.filter((l) => l.type === 'service')

        // 2. Listings won by this character
        const wonListings = await ctx.db
            .query('blackVoidListings')
            .withIndex('by_winningBidderCharacterId', (q) => q.eq('winningBidderCharacterId', charId))
            .collect()

        // 3. Quests associated with character
        const characterQuests = await ctx.db
            .query('quests')
            .withIndex('by_characterId', (q) => q.eq('characterId', charId))
            .collect()

        const sponsoredQuestReimbursements = await Promise.all(
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

        // 4. Guildmaster Area Gains
        const isGuildmaster = character.rank === 'guildmaster'
        let guildmasterAreaGains: Array<{
            _id: Id<'sessions'>
            sessionId: Id<'sessions'>
            name: string
            worldName: string
            level: number
            reward: string
            guildmasterCut: string
            completedAt: number
            reimbursementClaimed: boolean
        }> = []

        if (isGuildmaster) {
            const gmSessions = await ctx.db
                .query('sessions')
                .withIndex('by_guildmaster_cut', (q) => q.eq('guildmasterCut.characterId', charId))
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
                })
            }
        }

        // 5. Bets (Deathroll)
        const wonBetsRaw = await ctx.db
            .query('blackVoidBets')
            .withIndex('by_winnerCharacterId', (q) => q.eq('winnerCharacterId', charId))
            .collect()

        const betsWon = await Promise.all(
            wonBetsRaw
                .filter((b) => b.status === 'completed')
                .map(async (b) => {
                    const opponentId = b.senderCharacterId === charId ? b.acceptedByCharacterId : b.senderCharacterId
                    const opponent = opponentId ? await ctx.db.get(opponentId) : null
                    return {
                        _id: b._id,
                        wagerAmount: b.wagerAmount,
                        deathrollValue: b.deathrollValue,
                        opponentName: opponent?.name || 'Opponent',
                        lossReason: b.lossReason || 'rolled_zero',
                        rollsCount: b.rolls?.length || 0,
                        completedAt: b.updatedAt || b.createdAt,
                        winnerClaimed: !!b.winnerClaimed,
                    }
                })
        )

        const lostBetsRaw = await ctx.db
            .query('blackVoidBets')
            .withIndex('by_loserCharacterId', (q) => q.eq('loserCharacterId', charId))
            .collect()

        const betsLost = await Promise.all(
            lostBetsRaw
                .filter((b) => b.status === 'completed')
                .map(async (b) => {
                    const opponentId = b.winnerCharacterId
                    const opponent = opponentId ? await ctx.db.get(opponentId) : null
                    return {
                        _id: b._id,
                        wagerAmount: b.wagerAmount,
                        deathrollValue: b.deathrollValue,
                        opponentName: opponent?.name || 'Opponent',
                        lossReason: b.lossReason || 'rolled_zero',
                        rollsCount: b.rolls?.length || 0,
                        completedAt: b.updatedAt || b.createdAt,
                        loserClaimed: !!b.loserClaimed,
                    }
                })
        )

        const characterDetails = await ctx.db
            .query('characterDetails')
            .withIndex('by_characterId', (q) => q.eq('characterId', charId))
            .first()

        const currentMoney = {
            pp: characterDetails?.money?.pp || 0,
            gp: characterDetails?.money?.gp || 0,
            sp: characterDetails?.money?.sp || 0,
            cp: characterDetails?.money?.cp || 0,
            totalInGold:
                characterDetails?.money?.totalInGold !== undefined
                    ? characterDetails.money.totalInGold
                    : Math.round(
                        ((characterDetails?.money?.gp || 0) +
                            (characterDetails?.money?.pp || 0) * 10 +
                            (characterDetails?.money?.sp || 0) / 10 +
                            (characterDetails?.money?.cp || 0) / 100) *
                        100
                    ) / 100,
        }

        // Count unclaimed log entries
        const unclaimedItems = createdItems.filter((i) => i.status === 'completed' && !i.sellerClaimed).length
        const unclaimedWon = wonListings.filter((w) => w.status === 'completed' && !w.buyerClaimed).length
        const unclaimedServices = servicesOffered.filter((s) => s.status === 'completed' && !s.sellerClaimed).length
        const unclaimedSponsored = sponsoredQuestReimbursements.filter((q) => !q.reimbursementClaimed).length
        const unclaimedQuests = completedQuestsToPay.filter((q) => !q.paymentClaimed).length
        const unclaimedGM = guildmasterAreaGains.filter((g) => !g.reimbursementClaimed).length
        const unclaimedBetsWon = betsWon.filter((b) => !b.winnerClaimed).length
        const unclaimedBetsLost = betsLost.filter((b) => !b.loserClaimed).length

        const unclaimedCount =
            unclaimedItems +
            unclaimedWon +
            unclaimedServices +
            unclaimedSponsored +
            unclaimedQuests +
            unclaimedGM +
            unclaimedBetsWon +
            unclaimedBetsLost

        return {
            characterId: charId,
            characterName: character.name,
            currentMoney,
            isGuildmaster,
            unclaimedCount,
            createdItems,
            wonItems: wonListings,
            servicesOffered,
            sponsoredQuestReimbursements,
            completedQuestsToPay,
            guildmasterAreaGains,
            betsWon,
            betsLost,
        }
    },
})

export const toggleBlackVoidSellerClaimed = mutation({
    args: {
        apiKey: v.string(),
        listingId: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx, args.apiKey)
        const lId = ctx.db.normalizeId('blackVoidListings', args.listingId)
        if (!lId) throw new Error('Invalid listing ID')

        const listing = await ctx.db.get(lId)
        if (!listing) throw new Error('Listing not found')

        const char = await ctx.db.get(listing.characterId)
        if (!char || (char.userId !== user.userId && !user.isAdmin)) {
            throw new Error('Unauthorized: You do not own this character')
        }

        const newClaimed = !listing.sellerClaimed
        await ctx.db.patch(lId, { sellerClaimed: newClaimed })
        return { success: true, sellerClaimed: newClaimed }
    },
})

export const toggleBlackVoidBuyerClaimed = mutation({
    args: {
        apiKey: v.string(),
        listingId: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx, args.apiKey)
        const lId = ctx.db.normalizeId('blackVoidListings', args.listingId)
        if (!lId) throw new Error('Invalid listing ID')

        const listing = await ctx.db.get(lId)
        if (!listing) throw new Error('Listing not found')
        if (!listing.winningBidderCharacterId) throw new Error('No winning bidder on listing')

        const char = await ctx.db.get(listing.winningBidderCharacterId)
        if (!char || (char.userId !== user.userId && !user.isAdmin)) {
            throw new Error('Unauthorized: You do not own this character')
        }

        const newClaimed = !listing.buyerClaimed
        await ctx.db.patch(lId, { buyerClaimed: newClaimed })
        return { success: true, buyerClaimed: newClaimed }
    },
})

export const toggleBlackVoidQuestClaimed = mutation({
    args: {
        apiKey: v.string(),
        questId: v.string(),
        type: v.union(v.literal('reimbursement'), v.literal('payment')),
    },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx, args.apiKey)
        const qId = ctx.db.normalizeId('quests', args.questId)
        if (!qId) throw new Error('Invalid quest ID')

        const quest = await ctx.db.get(qId)
        if (!quest) throw new Error('Quest not found')

        if (quest.characterId) {
            const char = await ctx.db.get(quest.characterId)
            if (!char || (char.userId !== user.userId && !user.isAdmin)) {
                throw new Error('Unauthorized: You do not own this character')
            }
        } else if (quest.owner !== user.userId && !user.isAdmin) {
            throw new Error('Unauthorized')
        }

        if (args.type === 'reimbursement') {
            const newVal = !quest.reimbursementClaimed
            await ctx.db.patch(qId, { reimbursementClaimed: newVal })
            return { success: true, reimbursementClaimed: newVal }
        } else {
            const newVal = !quest.paymentClaimed
            await ctx.db.patch(qId, { paymentClaimed: newVal })
            return { success: true, paymentClaimed: newVal }
        }
    },
})

export const toggleBlackVoidGuildmasterClaimed = mutation({
    args: {
        apiKey: v.string(),
        sessionId: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx, args.apiKey)
        const sId = ctx.db.normalizeId('sessions', args.sessionId)
        if (!sId) throw new Error('Invalid session ID')

        const session = await ctx.db.get(sId)
        if (!session || !session.guildmasterCut?.characterId) {
            throw new Error('Session has no Guildmaster cut recorded')
        }

        const char = await ctx.db.get(session.guildmasterCut.characterId)
        if (!char || (char.userId !== user.userId && !user.isAdmin)) {
            throw new Error('Unauthorized: You do not own this character')
        }

        const currentClaimed = !!session.guildmasterCut.claimed
        await ctx.db.patch(sId, {
            guildmasterCut: {
                ...session.guildmasterCut,
                claimed: !currentClaimed,
            },
        })
        return { success: true, guildmasterClaimed: !currentClaimed }
    },
})

export const toggleBlackVoidBetWinnerClaimed = mutation({
    args: {
        apiKey: v.string(),
        betId: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx, args.apiKey)
        const bId = ctx.db.normalizeId('blackVoidBets', args.betId)
        if (!bId) throw new Error('Invalid bet ID')

        const bet = await ctx.db.get(bId)
        if (!bet) throw new Error('Bet not found')
        if (!bet.winnerCharacterId) throw new Error('Bet has no winner')

        const char = await ctx.db.get(bet.winnerCharacterId)
        if (!char || (char.userId !== user.userId && !user.isAdmin)) {
            throw new Error('Unauthorized: You do not own this character')
        }

        const newClaimed = !bet.winnerClaimed
        await ctx.db.patch(bId, { winnerClaimed: newClaimed })
        return { success: true, winnerClaimed: newClaimed }
    },
})

export const toggleBlackVoidBetLoserClaimed = mutation({
    args: {
        apiKey: v.string(),
        betId: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx, args.apiKey)
        const bId = ctx.db.normalizeId('blackVoidBets', args.betId)
        if (!bId) throw new Error('Invalid bet ID')

        const bet = await ctx.db.get(bId)
        if (!bet) throw new Error('Bet not found')
        if (!bet.loserCharacterId) throw new Error('Bet has no loser')

        const char = await ctx.db.get(bet.loserCharacterId)
        if (!char || (char.userId !== user.userId && !user.isAdmin)) {
            throw new Error('Unauthorized: You do not own this character')
        }

        const newClaimed = !bet.loserClaimed
        await ctx.db.patch(bId, { loserClaimed: newClaimed })
        return { success: true, loserClaimed: newClaimed }
    },
})

export const markAllBlackVoidLogClaimed = mutation({
    args: {
        apiKey: v.string(),
        characterId: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await requireUser(ctx, args.apiKey)
        const charId = ctx.db.normalizeId('characters', args.characterId)
        if (!charId) throw new Error('Invalid character ID')

        const char = await ctx.db.get(charId)
        if (!char || (char.userId !== user.userId && !user.isAdmin)) {
            throw new Error('Unauthorized: You do not own this character')
        }

        // Mark seller listings
        const createdListings = await ctx.db
            .query('blackVoidListings')
            .withIndex('by_characterId', (q) => q.eq('characterId', charId))
            .collect()

        for (const listing of createdListings) {
            if (listing.status === 'completed' && !listing.sellerClaimed) {
                await ctx.db.patch(listing._id, { sellerClaimed: true })
            }
        }

        // Mark buyer won listings
        const wonListings = await ctx.db
            .query('blackVoidListings')
            .withIndex('by_winningBidderCharacterId', (q) => q.eq('winningBidderCharacterId', charId))
            .collect()

        for (const listing of wonListings) {
            if (listing.status === 'completed' && !listing.buyerClaimed) {
                await ctx.db.patch(listing._id, { buyerClaimed: true })
            }
        }

        // Mark quests
        const characterQuests = await ctx.db
            .query('quests')
            .withIndex('by_characterId', (q) => q.eq('characterId', charId))
            .collect()

        for (const q of characterQuests) {
            if (q.isCompleted) {
                const patch: any = {}
                if (q.isSponsored && !q.reimbursementClaimed) patch.reimbursementClaimed = true
                if (!q.paymentClaimed) patch.paymentClaimed = true
                if (Object.keys(patch).length > 0) await ctx.db.patch(q._id, patch)
            }
        }

        // Mark GM area gains
        if (char.rank === 'guildmaster') {
            const gmSessions = await ctx.db
                .query('sessions')
                .withIndex('by_guildmaster_cut', (q) => q.eq('guildmasterCut.characterId', charId))
                .collect()

            for (const sess of gmSessions) {
                if (sess.guildmasterCut && !sess.guildmasterCut.claimed) {
                    await ctx.db.patch(sess._id, {
                        guildmasterCut: {
                            ...sess.guildmasterCut,
                            claimed: true,
                        },
                    })
                }
            }
        }

        // Mark won bets
        const wonBets = await ctx.db
            .query('blackVoidBets')
            .withIndex('by_winnerCharacterId', (q) => q.eq('winnerCharacterId', charId))
            .collect()

        for (const bet of wonBets) {
            if (bet.status === 'completed' && !bet.winnerClaimed) {
                await ctx.db.patch(bet._id, { winnerClaimed: true })
            }
        }

        // Mark lost bets
        const lostBets = await ctx.db
            .query('blackVoidBets')
            .withIndex('by_loserCharacterId', (q) => q.eq('loserCharacterId', charId))
            .collect()

        for (const bet of lostBets) {
            if (bet.status === 'completed' && !bet.loserClaimed) {
                await ctx.db.patch(bet._id, { loserClaimed: true })
            }
        }

        return { success: true }
    },
})

// --- AVAILABILITY ENDPOINTS ---

export const getAvailability = query({
    args: {
        apiKey: v.optional(v.string()),
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
        const user = await requireUser(ctx, args.apiKey)
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
        apiKey: v.optional(v.string()),
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
        const user = await requireUser(ctx, args.apiKey)
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
    args: { apiKey: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const user = await validateKey(ctx, args.apiKey)
        if (!user) return []
        return await ctx.db
            .query('unlockedAchievements')
            .withIndex('by_userId', (q) => q.eq('userId', user.userId))
            .collect()
    },
})

export const getCharacterQuests = query({
    args: {
        apiKey: v.optional(v.string()),
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
