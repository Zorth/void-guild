import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { isAdmin } from './roles'

// Helper to verify world ownership / admin
async function verifyWorldOwner(ctx: any, worldId: any) {
  const user = await ctx.auth.getUserIdentity()
  if (!user) throw new Error('Not authenticated')
  const world = await ctx.db.get(worldId)
  const isAdminUser = await isAdmin(ctx)
  if (!world || (world.owner !== user.subject && !isAdminUser)) {
    throw new Error('Unauthorized to manage this world map')
  }
  return { user, world }
}

// Get all maps for a world
export const listWorldMaps = query({
  args: { worldId: v.id('worlds') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('worldMaps')
      .withIndex('by_worldId', (q) => q.eq('worldId', args.worldId))
      .collect()
  },
})

// Check if a world has at least one map
export const hasWorldMap = query({
  args: { worldId: v.id('worlds') },
  handler: async (ctx, args) => {
    const map = await ctx.db
      .query('worldMaps')
      .withIndex('by_worldId', (q) => q.eq('worldId', args.worldId))
      .first()
    return !!map
  },
})

// Get single map by worldId and slug (or home map if no slug provided)
export const getMapBySlug = query({
  args: { worldId: v.id('worlds'), slug: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const maps = await ctx.db
      .query('worldMaps')
      .withIndex('by_worldId', (q) => q.eq('worldId', args.worldId))
      .collect()

    if (maps.length === 0) return null

    if (args.slug) {
      const found = maps.find((m) => m.slug === args.slug)
      if (found) return found
    }

    // Default to home map or first map
    const homeMap = maps.find((m) => m.isHomeMap)
    return homeMap || maps[0]
  },
})

// Full map data bundle (map, layers, pins, areas, notes)
export const getMapFullData = query({
  args: { mapId: v.id('worldMaps') },
  handler: async (ctx, args) => {
    const map = await ctx.db.get(args.mapId)
    if (!map) return null

    const layers = await ctx.db
      .query('mapLayers')
      .withIndex('by_mapId', (q) => q.eq('mapId', args.mapId))
      .collect()

    const pins = await ctx.db
      .query('mapPins')
      .withIndex('by_mapId', (q) => q.eq('mapId', args.mapId))
      .collect()

    const areas = await ctx.db
      .query('mapAreas')
      .withIndex('by_mapId', (q) => q.eq('mapId', args.mapId))
      .collect()

    const notes = await ctx.db
      .query('mapGridNotes')
      .withIndex('by_mapId', (q) => q.eq('mapId', args.mapId))
      .collect()

    return {
      map,
      layers: layers.sort((a, b) => a.order - b.order),
      pins,
      areas,
      notes,
    }
  },
})

// --- MUTATIONS ---

export const createMap = mutation({
  args: {
    worldId: v.id('worlds'),
    name: v.string(),
    slug: v.string(),
    isHomeMap: v.optional(v.boolean()),
    imageUrl: v.optional(v.string()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    gridType: v.optional(v.union(v.literal('none'), v.literal('hex'), v.literal('hex_flat'), v.literal('square'))),
    gridSize: v.optional(v.number()),
    gridOffsetX: v.optional(v.number()),
    gridOffsetY: v.optional(v.number()),
    isExplorationMap: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await verifyWorldOwner(ctx, args.worldId)

    const cleanSlug = args.slug.trim().toLowerCase().replace(/\s+/g, '-')
    const existing = await ctx.db
      .query('worldMaps')
      .withIndex('by_worldId_slug', (q) => q.eq('worldId', args.worldId).eq('slug', cleanSlug))
      .first()

    if (existing) {
      throw new Error('A map with this URL slug already exists in this world.')
    }

    // If setting as home map, unset previous home map
    if (args.isHomeMap) {
      const existingMaps = await ctx.db
        .query('worldMaps')
        .withIndex('by_worldId', (q) => q.eq('worldId', args.worldId))
        .collect()
      for (const m of existingMaps) {
        if (m.isHomeMap) {
          await ctx.db.patch(m._id, { isHomeMap: false })
        }
      }
    }

    const newMapId = await ctx.db.insert('worldMaps', {
      worldId: args.worldId,
      name: args.name.trim(),
      slug: cleanSlug,
      isHomeMap: args.isHomeMap ?? false,
      imageUrl: args.imageUrl,
      width: args.width ?? 2000,
      height: args.height ?? 2000,
      gridType: args.gridType ?? 'none',
      gridSize: args.gridSize ?? 100,
      gridOffsetX: args.gridOffsetX ?? 0,
      gridOffsetY: args.gridOffsetY ?? 0,
      isExplorationMap: args.isExplorationMap ?? false,
      revealedCells: [],
    })

    return newMapId
  },
})

export const updateMapSettings = mutation({
  args: {
    mapId: v.id('worldMaps'),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    isHomeMap: v.optional(v.boolean()),
    imageUrl: v.optional(v.string()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    gridType: v.optional(v.union(v.literal('none'), v.literal('hex'), v.literal('hex_flat'), v.literal('square'))),
    gridSize: v.optional(v.number()),
    gridOffsetX: v.optional(v.number()),
    gridOffsetY: v.optional(v.number()),
    isExplorationMap: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const map = await ctx.db.get(args.mapId)
    if (!map) throw new Error('Map not found')
    await verifyWorldOwner(ctx, map.worldId)

    if (args.isHomeMap) {
      const existingMaps = await ctx.db
        .query('worldMaps')
        .withIndex('by_worldId', (q) => q.eq('worldId', map.worldId))
        .collect()
      for (const m of existingMaps) {
        if (m.isHomeMap && m._id !== map._id) {
          await ctx.db.patch(m._id, { isHomeMap: false })
        }
      }
    }

    const patches: any = {}
    if (args.name !== undefined) patches.name = args.name.trim()
    if (args.slug !== undefined) patches.slug = args.slug.trim().toLowerCase().replace(/\s+/g, '-')
    if (args.isHomeMap !== undefined) patches.isHomeMap = args.isHomeMap
    if (args.imageUrl !== undefined) patches.imageUrl = args.imageUrl
    if (args.width !== undefined) patches.width = args.width
    if (args.height !== undefined) patches.height = args.height
    if (args.gridType !== undefined) patches.gridType = args.gridType
    if (args.gridSize !== undefined) patches.gridSize = args.gridSize
    if (args.gridOffsetX !== undefined) patches.gridOffsetX = args.gridOffsetX
    if (args.gridOffsetY !== undefined) patches.gridOffsetY = args.gridOffsetY
    if (args.isExplorationMap !== undefined) patches.isExplorationMap = args.isExplorationMap

    await ctx.db.patch(args.mapId, patches)
  },
})

export const deleteMap = mutation({
  args: { mapId: v.id('worldMaps') },
  handler: async (ctx, args) => {
    const map = await ctx.db.get(args.mapId)
    if (!map) return
    await verifyWorldOwner(ctx, map.worldId)

    // Delete associated layers, pins, areas, notes
    const layers = await ctx.db.query('mapLayers').withIndex('by_mapId', (q) => q.eq('mapId', args.mapId)).collect()
    for (const l of layers) await ctx.db.delete(l._id)

    const pins = await ctx.db.query('mapPins').withIndex('by_mapId', (q) => q.eq('mapId', args.mapId)).collect()
    for (const p of pins) await ctx.db.delete(p._id)

    const areas = await ctx.db.query('mapAreas').withIndex('by_mapId', (q) => q.eq('mapId', args.mapId)).collect()
    for (const a of areas) await ctx.db.delete(a._id)

    const notes = await ctx.db.query('mapGridNotes').withIndex('by_mapId', (q) => q.eq('mapId', args.mapId)).collect()
    for (const n of notes) await ctx.db.delete(n._id)

    await ctx.db.delete(args.mapId)
  },
})

// --- EXPLORATION REVEAL MUTATIONS ---

export const toggleCellReveal = mutation({
  args: {
    mapId: v.id('worldMaps'),
    cellKey: v.string(), // "col,row"
  },
  handler: async (ctx, args) => {
    const map = await ctx.db.get(args.mapId)
    if (!map) throw new Error('Map not found')
    await verifyWorldOwner(ctx, map.worldId)

    const currentRevealed = new Set(map.revealedCells || [])
    if (currentRevealed.has(args.cellKey)) {
      currentRevealed.delete(args.cellKey)
    } else {
      currentRevealed.add(args.cellKey)
    }

    await ctx.db.patch(args.mapId, {
      revealedCells: Array.from(currentRevealed),
    })
  },
})

export const bulkRevealCells = mutation({
  args: {
    mapId: v.id('worldMaps'),
    cellKeys: v.array(v.string()),
    reveal: v.boolean(),
  },
  handler: async (ctx, args) => {
    const map = await ctx.db.get(args.mapId)
    if (!map) throw new Error('Map not found')
    await verifyWorldOwner(ctx, map.worldId)

    const currentRevealed = new Set(map.revealedCells || [])
    for (const key of args.cellKeys) {
      if (args.reveal) {
        currentRevealed.add(key)
      } else {
        currentRevealed.delete(key)
      }
    }

    await ctx.db.patch(args.mapId, {
      revealedCells: Array.from(currentRevealed),
    })
  },
})

// --- LAYERS, PINS & AREAS ---

export const addLayer = mutation({
  args: {
    mapId: v.id('worldMaps'),
    name: v.string(),
    imageUrl: v.optional(v.string()),
    defaultEnabled: v.boolean(),
    allowUserToggle: v.boolean(),
  },
  handler: async (ctx, args) => {
    const map = await ctx.db.get(args.mapId)
    if (!map) throw new Error('Map not found')
    await verifyWorldOwner(ctx, map.worldId)

    const existingLayers = await ctx.db
      .query('mapLayers')
      .withIndex('by_mapId', (q) => q.eq('mapId', args.mapId))
      .collect()

    return await ctx.db.insert('mapLayers', {
      mapId: args.mapId,
      name: args.name.trim(),
      imageUrl: args.imageUrl,
      order: existingLayers.length,
      defaultEnabled: args.defaultEnabled,
      allowUserToggle: args.allowUserToggle,
    })
  },
})

export const deleteLayer = mutation({
  args: { layerId: v.id('mapLayers') },
  handler: async (ctx, args) => {
    const layer = await ctx.db.get(args.layerId)
    if (!layer) return
    const map = await ctx.db.get(layer.mapId)
    if (!map) return
    await verifyWorldOwner(ctx, map.worldId)

    await ctx.db.delete(args.layerId)
  },
})

export const savePin = mutation({
  args: {
    mapId: v.id('worldMaps'),
    pinId: v.optional(v.id('mapPins')),
    layerId: v.optional(v.id('mapLayers')),
    x: v.number(),
    y: v.number(),
    title: v.string(),
    description: v.optional(v.string()),
    style: v.union(v.literal('icon'), v.literal('text_only')),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    targetMapId: v.optional(v.id('worldMaps')),
    minZoom: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const map = await ctx.db.get(args.mapId)
    if (!map) throw new Error('Map not found')
    await verifyWorldOwner(ctx, map.worldId)

    if (args.pinId) {
      await ctx.db.patch(args.pinId, {
        layerId: args.layerId,
        x: args.x,
        y: args.y,
        title: args.title.trim(),
        description: args.description,
        style: args.style,
        icon: args.icon,
        color: args.color,
        targetMapId: args.targetMapId,
        minZoom: args.minZoom,
      })
      return args.pinId
    } else {
      return await ctx.db.insert('mapPins', {
        mapId: args.mapId,
        layerId: args.layerId,
        x: args.x,
        y: args.y,
        title: args.title.trim(),
        description: args.description,
        style: args.style,
        icon: args.icon,
        color: args.color,
        targetMapId: args.targetMapId,
        minZoom: args.minZoom,
      })
    }
  },
})

export const deletePin = mutation({
  args: { pinId: v.id('mapPins') },
  handler: async (ctx, args) => {
    const pin = await ctx.db.get(args.pinId)
    if (!pin) return
    const map = await ctx.db.get(pin.mapId)
    if (!map) return
    await verifyWorldOwner(ctx, map.worldId)

    await ctx.db.delete(args.pinId)
  },
})

export const saveArea = mutation({
  args: {
    mapId: v.id('worldMaps'),
    areaId: v.optional(v.id('mapAreas')),
    layerId: v.optional(v.id('mapLayers')),
    name: v.string(),
    description: v.optional(v.string()),
    points: v.array(v.object({ x: v.number(), y: v.number() })),
    color: v.optional(v.string()),
    fillOpacity: v.optional(v.number()),
    targetMapId: v.optional(v.id('worldMaps')),
  },
  handler: async (ctx, args) => {
    const map = await ctx.db.get(args.mapId)
    if (!map) throw new Error('Map not found')
    await verifyWorldOwner(ctx, map.worldId)

    if (args.areaId) {
      await ctx.db.patch(args.areaId, {
        layerId: args.layerId,
        name: args.name.trim(),
        description: args.description,
        points: args.points,
        color: args.color,
        fillOpacity: args.fillOpacity,
        targetMapId: args.targetMapId,
      })
      return args.areaId
    } else {
      return await ctx.db.insert('mapAreas', {
        mapId: args.mapId,
        layerId: args.layerId,
        name: args.name.trim(),
        description: args.description,
        points: args.points,
        color: args.color,
        fillOpacity: args.fillOpacity,
        targetMapId: args.targetMapId,
      })
    }
  },
})

export const deleteArea = mutation({
  args: { areaId: v.id('mapAreas') },
  handler: async (ctx, args) => {
    const area = await ctx.db.get(args.areaId)
    if (!area) return
    const map = await ctx.db.get(area.mapId)
    if (!map) return
    await verifyWorldOwner(ctx, map.worldId)

    await ctx.db.delete(args.areaId)
  },
})

// --- GRID CELL NOTES (Players & GMs) ---

export const saveGridNote = mutation({
  args: {
    mapId: v.id('worldMaps'),
    cellKey: v.string(),
    note: v.string(),
    authorName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Not authenticated')

    const existing = await ctx.db
      .query('mapGridNotes')
      .withIndex('by_mapId_cellKey', (q) => q.eq('mapId', args.mapId).eq('cellKey', args.cellKey))
      .first()

    if (!args.note.trim()) {
      if (existing && existing.userId === user.subject) {
        await ctx.db.delete(existing._id)
      }
      return
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        note: args.note.trim(),
        authorName: args.authorName || user.name || 'Anonymous',
        updatedAt: Date.now(),
      })
    } else {
      await ctx.db.insert('mapGridNotes', {
        mapId: args.mapId,
        cellKey: args.cellKey,
        userId: user.subject,
        authorName: args.authorName || user.name || 'Anonymous',
        note: args.note.trim(),
        updatedAt: Date.now(),
      })
    }
  },
})
