import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

export const getWorldByOwner = query({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) {
      return null
    }
    const world = await ctx.db
      .query('worlds')
      .filter((q) => q.eq(q.field('owner'), user.subject))
      .first()
    return world
  },
})

export const createWorld = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) {
      throw new Error('Not authenticated')
    }
    // Check if the user already owns a world
    const existingWorld = await ctx.db
      .query('worlds')
      .filter((q) => q.eq(q.field('owner'), user.subject))
      .first()
    if (existingWorld) {
      throw new Error('You can only own one world.')
    }

    await ctx.db.insert('worlds', {
      name: args.name,
      owner: user.subject,
      link: undefined, // Initially no link
    })
  },
})

export const renameWorld = mutation({
  args: {
    worldId: v.id('worlds'),
    newName: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) {
      throw new Error('Not authenticated')
    }
    const world = await ctx.db.get(args.worldId)
    if (!world || world.owner !== user.subject) {
      throw new Error('World not found or you do not have permission to rename it.')
    }
    await ctx.db.patch(args.worldId, { name: args.newName })
  },
})

export const getWorldByName = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('worlds')
      .filter((q) => q.eq(q.field('name'), args.name))
      .first()
  },
})

export const getSessionsByWorld = query({
  args: { worldId: v.id('worlds') },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query('sessions')
      .filter((q) => q.eq(q.field('world'), args.worldId))
      .collect()

    const sessionsWithDetails = await Promise.all(
      sessions.map(async (session) => {
        const characterDocs = await Promise.all(
          session.characters.map((id) => ctx.db.get(id))
        )
        const questDoc = session.questId ? await ctx.db.get(session.questId) : null
        return {
          ...session,
          characterNames: characterDocs.filter((c): c is Doc<'characters'> => c !== null).map((c) => c.name),
          quest: questDoc,
        }
      })
    )

    return sessionsWithDetails.sort((a, b) => {
        if (a.date && b.date) return b.date - a.date
        if (a.date) return -1
        if (b.date) return 1
        return 0
    })
  },
})

export const listAllWorlds = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('worlds').collect()
  },
})

export const getReputationData = query({
  args: { worldName: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    const world = await ctx.db
      .query('worlds')
      .filter((q) => q.eq(q.field('name'), args.worldName))
      .first()
    
    if (!world) return null

    const isOwner = user?.subject === world.owner
    const isVisible = world.reputationVisible ?? false

    // If reputation is not visible and user is not owner, return only basic info
    if (!isVisible && !isOwner) {
        return { 
            worldId: world._id,
            factions: [], 
            reputations: [], 
            isOwner, 
            isVisible 
        }
    }

    const reputations = await ctx.db
      .query('reputations')
      .withIndex('by_world_character', (q) => q.eq('worldId', world._id))
      .collect()

    return {
      worldId: world._id,
      factions: world.factions ?? [],
      factionGroups: world.factionGroups ?? [],
      reputations,
      isOwner,
      isVisible,
    }
  },
})

export const renameFaction = mutation({
  args: { worldId: v.id('worlds'), oldName: v.string(), newName: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    const world = await ctx.db.get(args.worldId)
    if (!world || world.owner !== user?.subject) {
      throw new Error('Unauthorized')
    }

    const factions = world.factions ?? []
    const newFactions = factions.map(f => f === args.oldName ? args.newName : f)

    const groups = world.factionGroups ?? []
    const newGroups = groups.map(g => ({
      ...g,
      factions: g.factions.map(f => f === args.oldName ? args.newName : f)
    }))

    await ctx.db.patch(args.worldId, {
      factions: newFactions,
      factionGroups: newGroups,
    })

    // Update all reputations for this faction in this world
    const reps = await ctx.db
      .query('reputations')
      .withIndex('by_world_faction', (q) => q.eq('worldId', args.worldId).eq('factionName', args.oldName))
      .collect()

    for (const rep of reps) {
      await ctx.db.patch(rep._id, { factionName: args.newName })
    }
  },
})

export const renameFactionGroup = mutation({
  args: { worldId: v.id('worlds'), oldName: v.string(), newName: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    const world = await ctx.db.get(args.worldId)
    if (!world || world.owner !== user?.subject) {
      throw new Error('Unauthorized')
    }

    const groups = world.factionGroups ?? []
    const newGroups = groups.map(g => g.name === args.oldName ? { ...g, name: args.newName } : g)

    await ctx.db.patch(args.worldId, {
      factionGroups: newGroups,
    })
  },
})

export const updateFactionGroupMembers = mutation({
  args: { worldId: v.id('worlds'), name: v.string(), factions: v.array(v.string()) },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    const world = await ctx.db.get(args.worldId)
    if (!world || world.owner !== user?.subject) {
      throw new Error('Unauthorized')
    }

    const groups = world.factionGroups ?? []
    const newGroups = groups.map(g => g.name === args.name ? { ...g, factions: args.factions } : g)

    await ctx.db.patch(args.worldId, {
      factionGroups: newGroups,
    })
  },
})

export const addFactionGroup = mutation({
  args: { 
    worldId: v.id('worlds'), 
    name: v.string(), 
    factions: v.array(v.string()) 
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    const world = await ctx.db.get(args.worldId)
    if (!world || world.owner !== user?.subject) {
      throw new Error('Unauthorized')
    }

    const groups = world.factionGroups ?? []
    if (groups.some(g => g.name === args.name)) {
      throw new Error('Group already exists')
    }

    await ctx.db.patch(args.worldId, {
      factionGroups: [...groups, { name: args.name, factions: args.factions }],
    })
  },
})

export const removeFactionGroup = mutation({
  args: { worldId: v.id('worlds'), name: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    const world = await ctx.db.get(args.worldId)
    if (!world || world.owner !== user?.subject) {
      throw new Error('Unauthorized')
    }

    const groups = world.factionGroups ?? []
    await ctx.db.patch(args.worldId, {
      factionGroups: groups.filter((g) => g.name !== args.name),
    })
  },
})

export const addFaction = mutation({
  args: { worldId: v.id('worlds'), name: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    const world = await ctx.db.get(args.worldId)
    if (!world || world.owner !== user?.subject) {
      throw new Error('Unauthorized')
    }

    const factions = world.factions ?? []
    if (factions.includes(args.name)) {
      throw new Error('Faction already exists')
    }

    await ctx.db.patch(args.worldId, {
      factions: [...factions, args.name],
    })
  },
})

export const removeFaction = mutation({
  args: { worldId: v.id('worlds'), name: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    const world = await ctx.db.get(args.worldId)
    if (!world || world.owner !== user?.subject) {
      throw new Error('Unauthorized')
    }

    const factions = world.factions ?? []
    await ctx.db.patch(args.worldId, {
      factions: factions.filter((f) => f !== args.name),
    })

    // Also remove all reputation entries for this faction in this world
    const reps = await ctx.db
        .query('reputations')
        .withIndex('by_world_faction', (q) => q.eq('worldId', args.worldId).eq('factionName', args.name))
        .collect()
    
    for (const rep of reps) {
        await ctx.db.delete(rep._id)
    }
  },
})

export const setReputation = mutation({
  args: { 
    worldId: v.id('worlds'), 
    characterId: v.id('characters'), 
    factionName: v.string(), 
    value: v.number() 
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    const world = await ctx.db.get(args.worldId)
    if (!world || world.owner !== user?.subject) {
      throw new Error('Unauthorized')
    }

    const existing = await ctx.db
      .query('reputations')
      .withIndex('by_world_character', (q) => q.eq('worldId', args.worldId).eq('characterId', args.characterId))
      .filter((q) => q.eq(q.field('factionName'), args.factionName))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
      })
    } else {
      await ctx.db.insert('reputations', {
        worldId: args.worldId,
        characterId: args.characterId,
        factionName: args.factionName,
        value: args.value,
      })
    }
  },
})

export const updateReputation = mutation({
  args: { 
    worldId: v.id('worlds'), 
    characterId: v.id('characters'), 
    factionName: v.string(), 
    delta: v.number() 
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    const world = await ctx.db.get(args.worldId)
    if (!world || world.owner !== user?.subject) {
      throw new Error('Unauthorized')
    }

    const existing = await ctx.db
      .query('reputations')
      .withIndex('by_world_character', (q) => q.eq('worldId', args.worldId).eq('characterId', args.characterId))
      .filter((q) => q.eq(q.field('factionName'), args.factionName))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: existing.value + args.delta,
      })
    } else {
      await ctx.db.insert('reputations', {
        worldId: args.worldId,
        characterId: args.characterId,
        factionName: args.factionName,
        value: args.delta,
      })
    }
  },
})

export const toggleReputationVisibility = mutation({
  args: { worldId: v.id('worlds') },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    const world = await ctx.db.get(args.worldId)
    if (!world || world.owner !== user?.subject) {
      throw new Error('Unauthorized')
    }

    await ctx.db.patch(args.worldId, {
      reputationVisible: !(world.reputationVisible ?? false),
    })
  },
})

export const updateWorldDescription = mutation({
  args: { worldId: v.id('worlds'), description: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    const world = await ctx.db.get(args.worldId)
    if (!world || world.owner !== user?.subject) {
      throw new Error('Unauthorized')
    }

    await ctx.db.patch(args.worldId, {
      description: args.description,
    })
  },
})

export const updateWorldMap = mutation({
  args: { worldId: v.id('worlds'), mapEmbed: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    const world = await ctx.db.get(args.worldId)
    if (!world || world.owner !== user?.subject) {
      throw new Error('Unauthorized')
    }

    await ctx.db.patch(args.worldId, {
      mapEmbed: args.mapEmbed,
    })
  },
})

export const toggleCalendarVisibility = mutation({
  args: { worldId: v.id('worlds') },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    const world = await ctx.db.get(args.worldId)
    if (!world || world.owner !== user?.subject) {
      throw new Error('Unauthorized')
    }

    await ctx.db.patch(args.worldId, {
      calendarVisible: !(world.calendarVisible ?? false),
    })
  },
})

export const updateWorldCalendar = mutation({
  args: { worldId: v.id('worlds'), calendar: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    const world = await ctx.db.get(args.worldId)
    if (!world || world.owner !== user?.subject) {
      throw new Error('Unauthorized')
    }

    await ctx.db.patch(args.worldId, {
      calendar: args.calendar,
    })
  },
})
