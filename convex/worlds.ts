import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { Doc } from './_generated/dataModel'
import { computeEffectiveLevel } from './sessions'
import { isAdmin } from './roles'

export const getWorldByOwner = query({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) {
      return null
    }
    const world = await ctx.db
      .query('worlds')
      .withIndex('by_owner', (q) => q.eq('owner', user.subject))
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
    const name = args.name.trim()
    if (!name) {
      throw new Error('World name cannot be empty.')
    }

    // Check if the user already owns a world
    const existingWorld = await ctx.db
      .query('worlds')
      .withIndex('by_owner', (q) => q.eq('owner', user.subject))
      .first()
    if (existingWorld) {
      throw new Error('You can only own one world.')
    }

    // Check if a world with this name already exists
    const existingName = await ctx.db
      .query('worlds')
      .withIndex('by_name', (q) => q.eq('name', name))
      .first()
    if (existingName) {
      throw new Error('A world with this name already exists.')
    }

    await ctx.db.insert('worlds', {
      name,
      owner: user.subject,
      link: undefined,
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
    const isAdminUser = await isAdmin(ctx)
    if (!world || (world.owner !== user.subject && !isAdminUser)) {
      throw new Error('World not found or you do not have permission to rename it.')
    }

    const newName = args.newName.trim()
    if (!newName) {
      throw new Error('World name cannot be empty.')
    }
    if (world.name === newName) {
      return
    }

    // Ensure no name collision with other worlds
    const existingName = await ctx.db
      .query('worlds')
      .withIndex('by_name', (q) => q.eq('name', newName))
      .first()
    if (existingName && existingName._id !== args.worldId) {
      throw new Error('A world with this name already exists.')
    }

    await ctx.db.patch(args.worldId, { name: newName })
  },
})

export const getWorld = query({
  args: { worldId: v.id('worlds') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.worldId)
  },
})

export const getWorldByName = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('worlds')
      .withIndex('by_name', (q) => q.eq('name', args.name))
      .first()
  },
})

export const getSessionsByWorld = query({
  args: { worldId: v.id('worlds') },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query('sessions')
      .withIndex('by_world', (q) => q.eq('world', args.worldId))
      .collect()

    const sessionsWithDetails = await Promise.all(
      sessions.map(async (session) => {
        const characterDocs = await Promise.all(
          session.characters.map((id) => ctx.db.get(id))
        )
        const questDoc = session.questId ? await ctx.db.get(session.questId) : null
        return {
          ...session,
          level: computeEffectiveLevel(session, questDoc),
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
      .withIndex('by_name', (q) => q.eq('name', args.worldName))
      .first()
    
    if (!world) return null

    const isAdminUser = user ? await isAdmin(ctx) : false
    const isOwner = user?.subject === world.owner || isAdminUser
    const isVisible = world.reputationVisible ?? false

    // If reputation is not visible and user is not owner/admin, return only basic info
    if (!isVisible && !isOwner) {
        return { 
            worldId: world._id,
            factions: [], 
            factionGroups: [],
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
    const isAdminUser = await isAdmin(ctx)
    if (!world || (world.owner !== user?.subject && !isAdminUser)) {
      throw new Error('Unauthorized')
    }

    const oldName = args.oldName.trim()
    const newName = args.newName.trim()
    if (!newName) {
      throw new Error('Faction name cannot be empty')
    }
    if (oldName === newName) return

    const factions = world.factions ?? []
    if (factions.includes(newName)) {
      throw new Error('A faction with this name already exists')
    }

    const newFactions = factions.map(f => f === oldName ? newName : f)

    const groups = world.factionGroups ?? []
    const newGroups = groups.map(g => ({
      ...g,
      factions: g.factions.map(f => f === oldName ? newName : f)
    }))

    await ctx.db.patch(args.worldId, {
      factions: newFactions,
      factionGroups: newGroups,
    })

    // Update all reputations for this faction in this world
    const reps = await ctx.db
      .query('reputations')
      .withIndex('by_world_faction', (q) => q.eq('worldId', args.worldId).eq('factionName', oldName))
      .collect()

    for (const rep of reps) {
      await ctx.db.patch(rep._id, { factionName: newName })
    }
  },
})

export const editFactionGroup = mutation({
  args: {
    worldId: v.id('worlds'),
    oldName: v.string(),
    newName: v.string(),
    factions: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    const world = await ctx.db.get(args.worldId)
    const isAdminUser = await isAdmin(ctx)
    if (!world || (world.owner !== user?.subject && !isAdminUser)) {
      throw new Error('Unauthorized')
    }

    const oldName = args.oldName.trim()
    const newName = args.newName.trim()
    if (!newName) throw new Error('Group name cannot be empty')

    const groups = world.factionGroups ?? []
    if (newName !== oldName && groups.some(g => g.name === newName)) {
      throw new Error('A group with this name already exists')
    }

    const newGroups = groups.map(g => g.name === oldName ? { name: newName, factions: args.factions } : g)

    await ctx.db.patch(args.worldId, {
      factionGroups: newGroups,
    })
  },
})

export const reorderFactions = mutation({
  args: { worldId: v.id('worlds'), factions: v.array(v.string()) },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    const world = await ctx.db.get(args.worldId)
    const isAdminUser = await isAdmin(ctx)
    if (!world || (world.owner !== user?.subject && !isAdminUser)) {
      throw new Error('Unauthorized')
    }

    const currentFactions = world.factions ?? []
    if (
      currentFactions.length === args.factions.length &&
      currentFactions.every((f, i) => f === args.factions[i])
    ) {
      return
    }

    await ctx.db.patch(args.worldId, {
      factions: args.factions,
    })
  },
})

export const renameFactionGroup = mutation({
  args: { worldId: v.id('worlds'), oldName: v.string(), newName: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    const world = await ctx.db.get(args.worldId)
    const isAdminUser = await isAdmin(ctx)
    if (!world || (world.owner !== user?.subject && !isAdminUser)) {
      throw new Error('Unauthorized')
    }

    const oldName = args.oldName.trim()
    const newName = args.newName.trim()
    if (!newName) throw new Error('Group name cannot be empty')
    if (oldName === newName) return

    const groups = world.factionGroups ?? []
    if (groups.some(g => g.name === newName)) {
      throw new Error('A group with this name already exists')
    }

    const newGroups = groups.map(g => g.name === oldName ? { ...g, name: newName } : g)

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
    const isAdminUser = await isAdmin(ctx)
    if (!world || (world.owner !== user?.subject && !isAdminUser)) {
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
    const isAdminUser = await isAdmin(ctx)
    if (!world || (world.owner !== user?.subject && !isAdminUser)) {
      throw new Error('Unauthorized')
    }

    const name = args.name.trim()
    if (!name) throw new Error('Group name cannot be empty')

    const groups = world.factionGroups ?? []
    if (groups.some(g => g.name === name)) {
      throw new Error('Group already exists')
    }

    await ctx.db.patch(args.worldId, {
      factionGroups: [...groups, { name, factions: args.factions }],
    })
  },
})

export const removeFactionGroup = mutation({
  args: { worldId: v.id('worlds'), name: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    const world = await ctx.db.get(args.worldId)
    const isAdminUser = await isAdmin(ctx)
    if (!world || (world.owner !== user?.subject && !isAdminUser)) {
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
    const isAdminUser = await isAdmin(ctx)
    if (!world || (world.owner !== user?.subject && !isAdminUser)) {
      throw new Error('Unauthorized')
    }

    const name = args.name.trim()
    if (!name) throw new Error('Faction name cannot be empty')

    const factions = world.factions ?? []
    if (factions.includes(name)) {
      throw new Error('Faction already exists')
    }

    await ctx.db.patch(args.worldId, {
      factions: [...factions, name],
    })
  },
})

export const removeFaction = mutation({
  args: { worldId: v.id('worlds'), name: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    const world = await ctx.db.get(args.worldId)
    const isAdminUser = await isAdmin(ctx)
    if (!world || (world.owner !== user?.subject && !isAdminUser)) {
      throw new Error('Unauthorized')
    }

    const factions = world.factions ?? []
    const groups = world.factionGroups ?? []
    const newGroups = groups.map(g => ({
      ...g,
      factions: g.factions.filter((f) => f !== args.name)
    }))

    await ctx.db.patch(args.worldId, {
      factions: factions.filter((f) => f !== args.name),
      factionGroups: newGroups,
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
    const isAdminUser = await isAdmin(ctx)
    if (!world || (world.owner !== user?.subject && !isAdminUser)) {
      throw new Error('Unauthorized')
    }

    const existing = await ctx.db
      .query('reputations')
      .withIndex('by_world_character_faction', (q) => 
        q.eq('worldId', args.worldId).eq('characterId', args.characterId).eq('factionName', args.factionName)
      )
      .first()

    if (existing) {
      if (existing.value !== args.value) {
        await ctx.db.patch(existing._id, {
          value: args.value,
        })
      }
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
    if (args.delta === 0) return

    const user = await ctx.auth.getUserIdentity()
    const world = await ctx.db.get(args.worldId)
    const isAdminUser = await isAdmin(ctx)
    if (!world || (world.owner !== user?.subject && !isAdminUser)) {
      throw new Error('Unauthorized')
    }

    const existing = await ctx.db
      .query('reputations')
      .withIndex('by_world_character_faction', (q) => 
        q.eq('worldId', args.worldId).eq('characterId', args.characterId).eq('factionName', args.factionName)
      )
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
    const isAdminUser = await isAdmin(ctx)
    if (!world || (world.owner !== user?.subject && !isAdminUser)) {
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
    const isAdminUser = await isAdmin(ctx)
    if (!world || (world.owner !== user?.subject && !isAdminUser)) {
      throw new Error('Unauthorized')
    }

    if (world.description !== args.description) {
      await ctx.db.patch(args.worldId, {
        description: args.description,
      })
    }
  },
})

export const updateWorldMap = mutation({
  args: { worldId: v.id('worlds'), mapEmbed: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    const world = await ctx.db.get(args.worldId)
    const isAdminUser = await isAdmin(ctx)
    if (!world || (world.owner !== user?.subject && !isAdminUser)) {
      throw new Error('Unauthorized')
    }

    if (world.mapEmbed !== args.mapEmbed) {
      await ctx.db.patch(args.worldId, {
        mapEmbed: args.mapEmbed,
      })
    }
  },
})

export const toggleCalendarVisibility = mutation({
  args: { worldId: v.id('worlds') },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    const world = await ctx.db.get(args.worldId)
    const isAdminUser = await isAdmin(ctx)
    if (!world || (world.owner !== user?.subject && !isAdminUser)) {
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
    const isAdminUser = await isAdmin(ctx)
    if (!world || (world.owner !== user?.subject && !isAdminUser)) {
      throw new Error('Unauthorized')
    }

    if (world.calendar !== args.calendar) {
      await ctx.db.patch(args.worldId, {
        calendar: args.calendar,
      })
    }
  },
})
