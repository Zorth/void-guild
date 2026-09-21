'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useAuth } from '@clerk/nextjs'
import Link from 'next/link'
import { 
  ZoomIn, ZoomOut, Maximize2, Layers, MapPin, Eye, Edit3, Plus, 
  Trash2, Settings, ChevronLeft, Map, FileText, Check, X, Grid, Lock, Unlock, Move, HelpCircle, Copy
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Id } from '@/convex/_generated/dataModel'

export default function MapViewerClient() {
  const params = useParams()
  const router = useRouter()
  const { userId } = useAuth()

  const worldName = decodeURIComponent(params.worldname as string)
  const mapSlug = params.mapSlug ? decodeURIComponent(params.mapSlug as string) : undefined

  // Queries
  const world = useQuery(api.worlds.getWorldByName, { name: worldName })
  const worldMaps = useQuery(api.maps.listWorldMaps, world?._id ? { worldId: world._id } : 'skip')
  const currentMap = useQuery(
    api.maps.getMapBySlug,
    world?._id ? { worldId: world._id, slug: mapSlug } : 'skip'
  )
  const fullData = useQuery(
    api.maps.getMapFullData,
    currentMap?._id ? { mapId: currentMap._id } : 'skip'
  )

  // Mutations
  const createMapMutation = useMutation(api.maps.createMap)
  const updateMapSettingsMutation = useMutation(api.maps.updateMapSettings)
  const deleteMapMutation = useMutation(api.maps.deleteMap)
  const savePinMutation = useMutation(api.maps.savePin)
  const deletePinMutation = useMutation(api.maps.deletePin)
  const saveAreaMutation = useMutation(api.maps.saveArea)
  const deleteAreaMutation = useMutation(api.maps.deleteArea)
  const addLayerMutation = useMutation(api.maps.addLayer)
  const deleteLayerMutation = useMutation(api.maps.deleteLayer)
  const toggleCellRevealMutation = useMutation(api.maps.toggleCellReveal)
  const bulkRevealCellsMutation = useMutation(api.maps.bulkRevealCells)
  const saveGridNoteMutation = useMutation(api.maps.saveGridNote)

  // View state
  const isOwner = world ? userId === world.owner : false
  const [isEditMode, setIsEditMode] = useState(false)
  const [activeTool, setActiveTool] = useState<'view' | 'add_pin' | 'add_area' | 'reveal_hex' | 'hide_hex' | 'grid_note'>('view')

  // Pan & Zoom viewport state
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0 })

  // Touch pinch zoom state
  const touchDistanceRef = useRef<number | null>(null)

  // Layer Visibility State
  const [enabledLayers, setEnabledLayers] = useState<Record<string, boolean>>({})

  // Dialog States
  const [isNewMapDialogOpen, setIsNewMapDialogOpen] = useState(false)
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false)
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false)
  const [isAreaDialogOpen, setIsAreaDialogOpen] = useState(false)
  const [isLayerDialogOpen, setIsLayerDialogOpen] = useState(false)
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false)
  const [isLayersMenuOpen, setIsLayersMenuOpen] = useState(false)

  // Selected item / edit draft states
  const [selectedPin, setSelectedPin] = useState<any>(null)
  const [selectedArea, setSelectedArea] = useState<any>(null)
  const [selectedCellKey, setSelectedCellKey] = useState<string | null>(null)
  const [draftNote, setDraftNote] = useState('')

  // Pin Form Draft
  const [pinDraft, setPinDraft] = useState<{
    id?: Id<'mapPins'>
    x: number
    y: number
    title: string
    description: string
    style: 'icon' | 'text_only'
    icon: string
    color: string
    targetMapId?: Id<'worldMaps'>
    layerId?: Id<'mapLayers'>
  }>({
    x: 50,
    y: 50,
    title: '',
    description: '',
    style: 'icon',
    icon: 'MapPin',
    color: '#a855f7',
  })

  // Area Form Draft
  const [areaDraft, setAreaDraft] = useState<{
    id?: Id<'mapAreas'>
    name: string
    description: string
    color: string
    fillOpacity: number
    targetMapId?: Id<'worldMaps'>
    layerId?: Id<'mapLayers'>
    points: { x: number; y: number }[]
  }>({
    name: '',
    description: '',
    color: '#a855f7',
    fillOpacity: 0.3,
    points: [],
  })

  // Map Settings Draft
  const [settingsDraft, setSettingsDraft] = useState({
    name: '',
    slug: '',
    isHomeMap: false,
    imageUrl: '',
    width: 2000,
    height: 2000,
    gridType: 'none' as 'none' | 'hex' | 'square',
    gridSize: 100,
    gridOffsetX: 0,
    gridOffsetY: 0,
    isExplorationMap: false,
  })

  // New Map Draft
  const [newMapDraft, setNewMapDraft] = useState({
    name: '',
    slug: '',
    isHomeMap: false,
    imageUrl: '',
  })

  // New Layer Draft
  const [newLayerDraft, setNewLayerDraft] = useState({
    name: '',
    imageUrl: '',
    defaultEnabled: true,
    allowUserToggle: true,
  })

  // Sync initial layer visibility when fullData changes
  useEffect(() => {
    if (fullData?.layers) {
      const map: Record<string, boolean> = {}
      fullData.layers.forEach((l) => {
        map[l._id] = l.defaultEnabled
      })
      setEnabledLayers(map)
    }
  }, [fullData?.layers])

  // Sync settings draft when currentMap changes
  useEffect(() => {
    if (currentMap) {
      setSettingsDraft({
        name: currentMap.name,
        slug: currentMap.slug,
        isHomeMap: currentMap.isHomeMap || false,
        imageUrl: currentMap.imageUrl || '',
        width: currentMap.width || 2000,
        height: currentMap.height || 2000,
        gridType: currentMap.gridType || 'none',
        gridSize: currentMap.gridSize || 100,
        gridOffsetX: currentMap.gridOffsetX || 0,
        gridOffsetY: currentMap.gridOffsetY || 0,
        isExplorationMap: currentMap.isExplorationMap || false,
      })
    }
  }, [currentMap])

  // Wheel zoom handler
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85
    setScale((prevScale) => Math.min(Math.max(prevScale * zoomFactor, 0.4), 5))
  }

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return // Left click only
    if (activeTool === 'add_area' && areaDraft.points.length > 0) return // Polygon drawing
    setIsDragging(true)
    dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Touch Pinch Zoom & Pan Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      touchDistanceRef.current = dist
    } else if (e.touches.length === 1) {
      setIsDragging(true)
      dragStartRef.current = {
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      }
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchDistanceRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      const delta = dist / touchDistanceRef.current
      setScale((prevScale) => Math.min(Math.max(prevScale * delta, 0.4), 5))
      touchDistanceRef.current = dist
    } else if (e.touches.length === 1 && isDragging) {
      setPosition({
        x: e.touches[0].clientX - dragStartRef.current.x,
        y: e.touches[0].clientY - dragStartRef.current.y,
      })
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    touchDistanceRef.current = null
  }

  // Zoom controls
  const handleZoomIn = () => setScale((s) => Math.min(s * 1.25, 5))
  const handleZoomOut = () => setScale((s) => Math.max(s * 0.8, 0.4))
  const handleResetZoom = () => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }

  // Click on Canvas coordinate solver (0 - 100%)
  const getCanvasCoordinates = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return { x: 50, y: 50 }
    const rect = containerRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top
    const xPct = Math.min(Math.max((clickX / rect.width) * 100, 0), 100)
    const yPct = Math.min(Math.max((clickY / rect.height) * 100, 0), 100)
    return { x: Number(xPct.toFixed(2)), y: Number(yPct.toFixed(2)) }
  }

  // Canvas Click Handler based on Active Tool
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) return
    const coords = getCanvasCoordinates(e)

    if (activeTool === 'add_pin') {
      setPinDraft({
        x: coords.x,
        y: coords.y,
        title: '',
        description: '',
        style: 'icon',
        icon: 'MapPin',
        color: '#a855f7',
      })
      setIsPinDialogOpen(true)
    } else if (activeTool === 'add_area') {
      setAreaDraft((prev) => ({
        ...prev,
        points: [...prev.points, coords],
      }))
    }
  }

  // Grid / Hex Cell Calculation
  const mapWidth = currentMap?.width || 2000
  const mapHeight = currentMap?.height || 2000
  const gridSize = currentMap?.gridSize || 100
  const gridType = currentMap?.gridType || 'none'
  const isExplorationMap = currentMap?.isExplorationMap || false

  const cols = Math.ceil(mapWidth / gridSize)
  const rows = Math.ceil(mapHeight / gridSize)

  const revealedSet = useMemo(() => {
    return new Set(currentMap?.revealedCells || [])
  }, [currentMap?.revealedCells])

  const notesMap = useMemo(() => {
    const map: Record<string, string> = {}
    fullData?.notes.forEach((n) => {
      map[n.cellKey] = n.note
    })
    return map
  }, [fullData?.notes])

  // Cell click handler (Exploration reveal or Player Note)
  const handleCellClick = (cellKey: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!currentMap) return

    if (isEditMode && activeTool === 'reveal_hex') {
      toggleCellRevealMutation({ mapId: currentMap._id, cellKey })
    } else if (isEditMode && activeTool === 'hide_hex') {
      toggleCellRevealMutation({ mapId: currentMap._id, cellKey })
    } else if (activeTool === 'grid_note' || !isEditMode) {
      // Open note dialog for cell
      setSelectedCellKey(cellKey)
      setDraftNote(notesMap[cellKey] || '')
      setIsNoteDialogOpen(true)
    }
  }

  // Save Pin Handler
  const handleSavePin = async () => {
    if (!currentMap || !pinDraft.title.trim()) {
      toast.error('Pin title cannot be empty')
      return
    }
    try {
      await savePinMutation({
        mapId: currentMap._id,
        pinId: pinDraft.id,
        layerId: pinDraft.layerId,
        x: pinDraft.x,
        y: pinDraft.y,
        title: pinDraft.title,
        description: pinDraft.description,
        style: pinDraft.style,
        icon: pinDraft.icon,
        color: pinDraft.color,
        targetMapId: pinDraft.targetMapId,
      })
      toast.success('Pin saved!')
      setIsPinDialogOpen(false)
      setActiveTool('view')
    } catch (err) {
      toast.error('Failed to save pin')
    }
  }

  // Save Area Handler
  const handleSaveArea = async () => {
    if (!currentMap || !areaDraft.name.trim() || areaDraft.points.length < 3) {
      toast.error('Area requires a name and at least 3 points')
      return
    }
    try {
      await saveAreaMutation({
        mapId: currentMap._id,
        areaId: areaDraft.id,
        layerId: areaDraft.layerId,
        name: areaDraft.name,
        description: areaDraft.description,
        points: areaDraft.points,
        color: areaDraft.color,
        fillOpacity: areaDraft.fillOpacity,
        targetMapId: areaDraft.targetMapId,
      })
      toast.success('Area saved!')
      setIsAreaDialogOpen(false)
      setAreaDraft({ name: '', description: '', color: '#a855f7', fillOpacity: 0.3, points: [] })
      setActiveTool('view')
    } catch (err) {
      toast.error('Failed to save area')
    }
  }

  // Save Grid Note Handler
  const handleSaveNote = async () => {
    if (!currentMap || !selectedCellKey) return
    try {
      await saveGridNoteMutation({
        mapId: currentMap._id,
        cellKey: selectedCellKey,
        note: draftNote,
      })
      toast.success('Note saved!')
      setIsNoteDialogOpen(false)
    } catch (err) {
      toast.error('Failed to save note')
    }
  }

  // Create New Map Handler
  const handleCreateNewMap = async () => {
    if (!world || !newMapDraft.name.trim() || !newMapDraft.slug.trim()) {
      toast.error('Name and slug are required')
      return
    }
    try {
      const newId = await createMapMutation({
        worldId: world._id,
        name: newMapDraft.name,
        slug: newMapDraft.slug,
        isHomeMap: newMapDraft.isHomeMap,
        imageUrl: newMapDraft.imageUrl,
      })
      toast.success('Map created!')
      setIsNewMapDialogOpen(false)
      const cleanSlug = newMapDraft.slug.trim().toLowerCase().replace(/\s+/g, '-')
      router.push(`/world/${encodeURIComponent(world.name)}/map/${cleanSlug}`)
    } catch (err: any) {
      toast.error(err.message || 'Failed to create map')
    }
  }

  // Update Settings Handler
  const handleUpdateSettings = async () => {
    if (!currentMap || !world) return
    try {
      await updateMapSettingsMutation({
        mapId: currentMap._id,
        name: settingsDraft.name,
        slug: settingsDraft.slug,
        isHomeMap: settingsDraft.isHomeMap,
        imageUrl: settingsDraft.imageUrl,
        width: settingsDraft.width,
        height: settingsDraft.height,
        gridType: settingsDraft.gridType,
        gridSize: settingsDraft.gridSize,
        gridOffsetX: settingsDraft.gridOffsetX,
        gridOffsetY: settingsDraft.gridOffsetY,
        isExplorationMap: settingsDraft.isExplorationMap,
      })
      toast.success('Map settings updated!')
      setIsSettingsDialogOpen(false)
      if (settingsDraft.slug !== currentMap.slug) {
        router.push(`/world/${encodeURIComponent(world.name)}/map/${settingsDraft.slug}`)
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update settings')
    }
  }

  // Add Layer Handler
  const handleAddLayer = async () => {
    if (!currentMap || !newLayerDraft.name.trim()) return
    try {
      await addLayerMutation({
        mapId: currentMap._id,
        name: newLayerDraft.name,
        imageUrl: newLayerDraft.imageUrl,
        defaultEnabled: newLayerDraft.defaultEnabled,
        allowUserToggle: newLayerDraft.allowUserToggle,
      })
      toast.success('Layer added!')
      setIsLayerDialogOpen(false)
      setNewLayerDraft({ name: '', imageUrl: '', defaultEnabled: true, allowUserToggle: true })
    } catch (err) {
      toast.error('Failed to add layer')
    }
  }

  if (world === undefined || currentMap === undefined) {
    return (
      <div className="h-screen w-screen bg-background flex items-center justify-center">
        <Skeleton className="h-12 w-64" />
      </div>
    )
  }

  if (!world) {
    return (
      <div className="h-screen w-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">World not found.</p>
        <Button asChild variant="outline">
          <Link href="/">Return Home</Link>
        </Button>
      </div>
    )
  }

  // If world has no maps yet
  if (!currentMap) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center gap-6 p-4">
        <div className="flex flex-col items-center text-center gap-2 max-w-md">
          <div className="h-16 w-16 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-2">
            <Map className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">No Maps Created Yet</h2>
          <p className="text-sm text-muted-foreground">
            {isOwner
              ? "You haven't created any maps for this world yet. Click below to create your world's home map!"
              : "The Game Master hasn't published any maps for this world yet."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" asChild>
            <Link href={`/world/${encodeURIComponent(world.name)}`}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back to World
            </Link>
          </Button>
          {isOwner && (
            <Button onClick={() => setIsNewMapDialogOpen(true)} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="h-4 w-4 mr-1" /> Create Home Map
            </Button>
          )}
        </div>

        {/* DIALOG: CREATE NEW MAP */}
        <Dialog open={isNewMapDialogOpen} onOpenChange={setIsNewMapDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create World Map</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-muted-foreground">Map Name</label>
                <Input
                  value={newMapDraft.name}
                  onChange={(e) => {
                    const name = e.target.value
                    const slug = name.toLowerCase().replace(/\s+/g, '-')
                    setNewMapDraft({ ...newMapDraft, name, slug })
                  }}
                  placeholder="Overworld, Capital City..."
                />
              </div>
              <div>
                <label className="font-bold text-muted-foreground">URL Slug</label>
                <Input
                  value={newMapDraft.slug}
                  onChange={(e) => setNewMapDraft({ ...newMapDraft, slug: e.target.value })}
                  placeholder="overworld"
                />
              </div>
              <div>
                <label className="font-bold text-muted-foreground">Background Image URL</label>
                <Input
                  value={newMapDraft.imageUrl}
                  onChange={(e) => setNewMapDraft({ ...newMapDraft, imageUrl: e.target.value })}
                  placeholder="https://maps.tarragon.be/overworld.webp"
                />
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="font-bold">Set as World Home Map</span>
                <Switch
                  checked={newMapDraft.isHomeMap}
                  onCheckedChange={(val) => setNewMapDraft({ ...newMapDraft, isHomeMap: val })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button size="sm" onClick={handleCreateNewMap}>Create Map</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-950 text-foreground select-none touch-none">
      {/* TOP NAVIGATION BAR */}
      <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto bg-background/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-border/50 shadow-lg">
          <Button variant="ghost" size="sm" className="h-8 px-2" asChild>
            <Link href={`/world/${encodeURIComponent(world.name)}`}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              {world.name}
            </Link>
          </Button>
          <span className="text-muted-foreground">/</span>

          {/* MAP SWITCHER DROPDOWN */}
          <Select
            value={currentMap?._id}
            onValueChange={(val) => {
              const target = worldMaps?.find((m) => m._id === val)
              if (target) {
                router.push(`/world/${encodeURIComponent(world.name)}/map/${target.slug}`)
              }
            }}
          >
            <SelectTrigger className="h-8 border-none bg-transparent focus:ring-0 text-sm font-bold text-primary gap-2 px-2">
              <SelectValue placeholder="Select Map" />
            </SelectTrigger>
            <SelectContent>
              {worldMaps?.map((m) => (
                <SelectItem key={m._id} value={m._id}>
                  {m.name} {m.isHomeMap && '🏠'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isOwner && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-primary"
              onClick={() => setIsNewMapDialogOpen(true)}
              title="Add New Map"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* TOP RIGHT CONTROLS (MODE SWITCH & LAYERS & SETTINGS) */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* LAYERS TOGGLE */}
          <Button
            variant={isLayersMenuOpen ? 'secondary' : 'outline'}
            size="sm"
            className="h-9 gap-2 bg-background/80 backdrop-blur-md border-border/50 shadow-lg"
            onClick={() => setIsLayersMenuOpen(!isLayersMenuOpen)}
          >
            <Layers className="h-4 w-4 text-purple-400" />
            <span className="hidden sm:inline">Layers</span>
          </Button>

          {/* EDIT / VIEW MODE TOGGLE FOR OWNER */}
          {isOwner && (
            <div className="flex items-center bg-background/80 backdrop-blur-md p-1 rounded-full border border-border/50 shadow-lg">
              <Button
                variant={!isEditMode ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 rounded-full text-xs font-bold gap-1 px-3"
                onClick={() => {
                  setIsEditMode(false)
                  setActiveTool('view')
                }}
              >
                <Eye className="h-3.5 w-3.5" /> View
              </Button>
              <Button
                variant={isEditMode ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 rounded-full text-xs font-bold gap-1 px-3 text-purple-400"
                onClick={() => setIsEditMode(true)}
              >
                <Edit3 className="h-3.5 w-3.5" /> Edit
              </Button>
            </div>
          )}

          {/* MAP SETTINGS BUTTON FOR OWNER */}
          {isOwner && (
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 bg-background/80 backdrop-blur-md border-border/50 shadow-lg"
              onClick={() => setIsSettingsDialogOpen(true)}
              title="Map Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* TOOLBAR WHEN IN EDIT MODE */}
      {isOwner && isEditMode && (
        <div className="absolute top-20 left-4 z-30 flex flex-col gap-2 bg-background/90 backdrop-blur-md p-2 rounded-xl border border-border/50 shadow-2xl">
          <Button
            variant={activeTool === 'view' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-9 w-9"
            onClick={() => setActiveTool('view')}
            title="Pan / Select"
          >
            <Move className="h-4 w-4" />
          </Button>
          <Button
            variant={activeTool === 'add_pin' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-9 w-9 text-purple-400"
            onClick={() => setActiveTool('add_pin')}
            title="Add Pin (Click on Map)"
          >
            <MapPin className="h-4 w-4" />
          </Button>
          <Button
            variant={activeTool === 'add_area' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-9 w-9 text-emerald-400"
            onClick={() => {
              setActiveTool('add_area')
              setAreaDraft({ name: '', description: '', color: '#a855f7', fillOpacity: 0.3, points: [] })
            }}
            title="Draw Polygon Area"
          >
            <Plus className="h-4 w-4" />
          </Button>
          {isExplorationMap && (
            <>
              <Button
                variant={activeTool === 'reveal_hex' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-9 w-9 text-blue-400"
                onClick={() => setActiveTool('reveal_hex')}
                title="Reveal Grid Hex/Square"
              >
                <Unlock className="h-4 w-4" />
              </Button>
              <Button
                variant={activeTool === 'hide_hex' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-9 w-9 text-red-400"
                onClick={() => setActiveTool('hide_hex')}
                title="Hide Grid Hex/Square"
              >
                <Lock className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-emerald-400"
                onClick={() => {
                  if (!currentMap) return
                  const allKeys: string[] = []
                  for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                      allKeys.push(`${c},${r}`)
                    }
                  }
                  bulkRevealCellsMutation({ mapId: currentMap._id, cellKeys: allKeys, reveal: true })
                  toast.success('Revealed all cells!')
                }}
                title="Reveal Entire Map"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-red-400"
                onClick={() => {
                  if (!currentMap) return
                  bulkRevealCellsMutation({ mapId: currentMap._id, cellKeys: currentMap.revealedCells || [], reveal: false })
                  toast.success('Reset fog of war!')
                }}
                title="Reset Fog of War"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
          {activeTool === 'add_area' && areaDraft.points.length > 0 && (
            <Button
              variant="default"
              size="sm"
              className="mt-2 text-xs font-bold"
              onClick={() => setIsAreaDialogOpen(true)}
            >
              Done ({areaDraft.points.length} pts)
            </Button>
          )}
        </div>
      )}

      {/* LAYERS MENU PANEL */}
      {isLayersMenuOpen && (
        <Card className="absolute top-16 right-4 z-40 w-72 bg-card/95 backdrop-blur-md border-border/50 shadow-2xl">
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-border/50">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Layers className="h-4 w-4 text-purple-400" /> Map Layers
            </CardTitle>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsLayersMenuOpen(false)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
            {fullData?.layers.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No extra layers created.</p>
            ) : (
              fullData?.layers.map((layer) => {
                const canToggle = isOwner || layer.allowUserToggle
                return (
                  <div key={layer._id} className="flex items-center justify-between text-xs">
                    <span className="font-medium">{layer.name}</span>
                    <div className="flex items-center gap-2">
                      <Switch
                        disabled={!canToggle}
                        checked={enabledLayers[layer._id] ?? layer.defaultEnabled}
                        onCheckedChange={(val) =>
                          setEnabledLayers((prev) => ({ ...prev, [layer._id]: val }))
                        }
                      />
                      {isOwner && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => deleteLayerMutation({ layerId: layer._id })}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })
            )}

            {isOwner && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2 text-xs border-dashed"
                onClick={() => setIsLayerDialogOpen(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Layer
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* ZOOM & VIEWPORT CONTROLS */}
      <div className="absolute bottom-6 right-6 z-30 flex flex-col gap-2 bg-background/80 backdrop-blur-md p-1.5 rounded-full border border-border/50 shadow-xl">
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={handleZoomIn}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={handleResetZoom}>
          <Maximize2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={handleZoomOut}>
          <ZoomOut className="h-4 w-4" />
        </Button>
      </div>

      {/* CANVAS CONTAINER */}
      <div
        className="w-full h-full cursor-grab active:cursor-grabbing flex items-center justify-center overflow-hidden"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          ref={containerRef}
          className="relative transition-transform duration-75 ease-out origin-center shadow-2xl"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            width: `${mapWidth}px`,
            height: `${mapHeight}px`,
          }}
          onClick={handleCanvasClick}
        >
          {/* BASE MAP BACKGROUND IMAGE */}
          {currentMap?.imageUrl ? (
            <img
              src={currentMap.imageUrl}
              alt={currentMap.name}
              className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
              draggable={false}
            />
          ) : (
            <div className="absolute inset-0 w-full h-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-700 font-bold text-2xl">
              No Map Image Set
            </div>
          )}

          {/* OVERLAY MAP LAYERS */}
          {fullData?.layers.map((layer) => {
            if (!enabledLayers[layer._id]) return null
            if (!layer.imageUrl) return null
            return (
              <img
                key={layer._id}
                src={layer.imageUrl}
                alt={layer.name}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                draggable={false}
              />
            )
          })}

          {/* POLYGON AREAS */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {fullData?.areas.map((area) => {
              if (area.layerId && !enabledLayers[area.layerId]) return null
              const pointsStr = area.points.map((p) => `${(p.x * mapWidth) / 100},${(p.y * mapHeight) / 100}`).join(' ')
              return (
                <polygon
                  key={area._id}
                  points={pointsStr}
                  fill={area.color || '#a855f7'}
                  fillOpacity={area.fillOpacity ?? 0.3}
                  stroke={area.color || '#a855f7'}
                  strokeWidth="2"
                  className="pointer-events-auto cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (area.targetMapId) {
                      const target = worldMaps?.find((m) => m._id === area.targetMapId)
                      if (target) router.push(`/world/${encodeURIComponent(world.name)}/map/${target.slug}`)
                    } else {
                      setSelectedArea(area)
                    }
                  }}
                />
              );
            })}

            {/* CURRENT DRAFT AREA POLYGON */}
            {activeTool === 'add_area' && areaDraft.points.length > 0 && (
              <polygon
                points={areaDraft.points.map((p) => `${(p.x * mapWidth) / 100},${(p.y * mapHeight) / 100}`).join(' ')}
                fill={areaDraft.color}
                fillOpacity={0.4}
                stroke={areaDraft.color}
                strokeWidth="3"
                strokeDasharray="5,5"
              />
            )}
          </svg>

          {/* GRID OVERLAY (HEX OR SQUARE) */}
          {gridType !== 'none' && (
            <div
              className="absolute inset-0 pointer-events-auto grid"
              style={{
                transform: `translate(${currentMap?.gridOffsetX || 0}px, ${currentMap?.gridOffsetY || 0}px)`,
                gridTemplateColumns: `repeat(${cols}, ${gridSize}px)`,
                gridTemplateRows: `repeat(${rows}, ${gridSize}px)`,
              }}
            >
              {Array.from({ length: rows }).map((_, r) =>
                Array.from({ length: cols }).map((_, c) => {
                  const cellKey = `${c},${r}`
                  const isRevealed = revealedSet.has(cellKey)
                  const hasNote = !!notesMap[cellKey]

                  return (
                    <div
                      key={cellKey}
                      style={{
                        clipPath: gridType === 'hex' ? 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' : undefined,
                      }}
                      className={`relative border border-white/10 transition-colors ${
                        isExplorationMap && !isRevealed
                          ? 'bg-slate-950/95 backdrop-blur-md'
                          : 'hover:bg-white/5'
                      }`}
                      onClick={(e) => handleCellClick(cellKey, e)}
                    >
                      {hasNote && (
                        <div className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-amber-400 shadow-glow" title="Has Note" />
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* PINS */}
          {fullData?.pins.map((pin) => {
            if (pin.layerId && !enabledLayers[pin.layerId]) return null
            const showTextOnly = pin.style === 'text_only'

            return (
              <div
                key={pin._id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer group"
                style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                onClick={(e) => {
                  e.stopPropagation()
                  if (pin.targetMapId) {
                    const target = worldMaps?.find((m) => m._id === pin.targetMapId)
                    if (target) router.push(`/world/${encodeURIComponent(world.name)}/map/${target.slug}`)
                  } else {
                    setSelectedPin(pin)
                  }
                }}
              >
                {showTextOnly ? (
                  <span className="bg-background/90 backdrop-blur-md px-2 py-0.5 rounded-md border border-border/50 text-xs font-bold shadow-lg text-primary whitespace-nowrap">
                    {pin.title}
                  </span>
                ) : (
                  <div className="flex flex-col items-center">
                    <div
                      className="p-2 rounded-full shadow-lg border border-white/20 transition-transform group-hover:scale-110"
                      style={{ backgroundColor: pin.color || '#a855f7' }}
                    >
                      <MapPin className="h-5 w-5 text-white" />
                    </div>
                    {(scale > 0.8 || (pin.minZoom && scale >= pin.minZoom)) && (
                      <span className="mt-1 bg-background/90 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-bold text-white whitespace-nowrap shadow-md">
                        {pin.title}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* DIALOG: PIN DETAILS / EDIT */}
      {selectedPin && (
        <Dialog open={!!selectedPin} onOpenChange={() => setSelectedPin(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between text-lg font-bold">
                <span className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-purple-400" />
                  {selectedPin.title}
                </span>
                {isOwner && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => {
                      deletePinMutation({ pinId: selectedPin._id })
                      setSelectedPin(null)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm leading-relaxed">
              {selectedPin.description ? (
                <p className="text-muted-foreground">{selectedPin.description}</p>
              ) : (
                <p className="text-xs italic text-muted-foreground">No description provided.</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* DIALOG: CREATE / EDIT PIN FORM */}
      <Dialog open={isPinDialogOpen} onOpenChange={setIsPinDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Map Pin</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-muted-foreground">Title</label>
              <Input
                value={pinDraft.title}
                onChange={(e) => setPinDraft({ ...pinDraft, title: e.target.value })}
                placeholder="Pin Title"
              />
            </div>
            <div>
              <label className="font-bold text-muted-foreground">Description</label>
              <Textarea
                value={pinDraft.description}
                onChange={(e) => setPinDraft({ ...pinDraft, description: e.target.value })}
                placeholder="Details or lore..."
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-muted-foreground">Style</label>
                <Select
                  value={pinDraft.style}
                  onValueChange={(val: any) => setPinDraft({ ...pinDraft, style: val })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="icon">Icon Pin</SelectItem>
                    <SelectItem value="text_only">Text Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="font-bold text-muted-foreground">Color</label>
                <Input
                  type="color"
                  value={pinDraft.color}
                  onChange={(e) => setPinDraft({ ...pinDraft, color: e.target.value })}
                  className="h-9 p-1"
                />
              </div>
            </div>
            <div>
              <label className="font-bold text-muted-foreground">Link to Map (Optional)</label>
              <Select
                value={pinDraft.targetMapId || 'none'}
                onValueChange={(val) =>
                  setPinDraft({ ...pinDraft, targetMapId: val === 'none' ? undefined : (val as Id<'worldMaps'>) })
                }
              >
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {worldMaps?.map((m) => (
                    <SelectItem key={m._id} value={m._id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" onClick={handleSavePin}>Save Pin</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: GRID NOTE */}
      <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-400" /> Cell Note ({selectedCellKey})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              value={draftNote}
              onChange={(e) => setDraftNote(e.target.value)}
              placeholder="Write player note or location observation..."
              className="min-h-[120px] text-xs font-mono"
            />
          </div>
          <DialogFooter>
            <Button size="sm" onClick={handleSaveNote}>Save Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: CREATE NEW MAP */}
      <Dialog open={isNewMapDialogOpen} onOpenChange={setIsNewMapDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create World Map</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-muted-foreground">Map Name</label>
              <Input
                value={newMapDraft.name}
                onChange={(e) => {
                  const name = e.target.value
                  const slug = name.toLowerCase().replace(/\s+/g, '-')
                  setNewMapDraft({ ...newMapDraft, name, slug })
                }}
                placeholder="Capital City, Underground Cave..."
              />
            </div>
            <div>
              <label className="font-bold text-muted-foreground">URL Slug</label>
              <Input
                value={newMapDraft.slug}
                onChange={(e) => setNewMapDraft({ ...newMapDraft, slug: e.target.value })}
                placeholder="capital-city"
              />
            </div>
            <div>
              <label className="font-bold text-muted-foreground">Background Image URL</label>
              <Input
                value={newMapDraft.imageUrl}
                onChange={(e) => setNewMapDraft({ ...newMapDraft, imageUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="font-bold">Set as World Home Map</span>
              <Switch
                checked={newMapDraft.isHomeMap}
                onCheckedChange={(val) => setNewMapDraft({ ...newMapDraft, isHomeMap: val })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" onClick={handleCreateNewMap}>Create Map</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: MAP SETTINGS */}
      <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Map Settings</span>
              {currentMap && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => {
                    deleteMapMutation({ mapId: currentMap._id })
                    setIsSettingsDialogOpen(false)
                    router.push(`/world/${encodeURIComponent(world.name)}`)
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-muted-foreground">Name</label>
                <Input
                  value={settingsDraft.name}
                  onChange={(e) => setSettingsDraft({ ...settingsDraft, name: e.target.value })}
                />
              </div>
              <div>
                <label className="font-bold text-muted-foreground">Slug</label>
                <Input
                  value={settingsDraft.slug}
                  onChange={(e) => setSettingsDraft({ ...settingsDraft, slug: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="font-bold text-muted-foreground">Background Image URL</label>
              <Input
                value={settingsDraft.imageUrl}
                onChange={(e) => setSettingsDraft({ ...settingsDraft, imageUrl: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-muted-foreground">Grid Type</label>
                <Select
                  value={settingsDraft.gridType}
                  onValueChange={(val: any) => setSettingsDraft({ ...settingsDraft, gridType: val })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="hex">Hex Grid</SelectItem>
                    <SelectItem value="square">Square Grid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="font-bold text-muted-foreground">Grid Size (px)</label>
                <Input
                  type="number"
                  value={settingsDraft.gridSize}
                  onChange={(e) => setSettingsDraft({ ...settingsDraft, gridSize: Number(e.target.value) })}
                />
              </div>
              <div className="flex flex-col justify-end">
                <div className="flex items-center justify-between border p-2 rounded-md">
                  <span className="font-bold text-[10px]">Exploration</span>
                  <Switch
                    checked={settingsDraft.isExplorationMap}
                    onCheckedChange={(val) => setSettingsDraft({ ...settingsDraft, isExplorationMap: val })}
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-muted-foreground">Grid Offset X (px)</label>
                <Input
                  type="number"
                  value={settingsDraft.gridOffsetX}
                  onChange={(e) => setSettingsDraft({ ...settingsDraft, gridOffsetX: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="font-bold text-muted-foreground">Grid Offset Y (px)</label>
                <Input
                  type="number"
                  value={settingsDraft.gridOffsetY}
                  onChange={(e) => setSettingsDraft({ ...settingsDraft, gridOffsetY: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" onClick={handleUpdateSettings}>Save Settings</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: AREA DETAILS / EDIT */}
      {selectedArea && (
        <Dialog open={!!selectedArea} onOpenChange={() => setSelectedArea(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between text-lg font-bold">
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full" style={{ backgroundColor: selectedArea.color || '#a855f7' }} />
                  {selectedArea.name}
                </span>
                {isOwner && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => {
                      deleteAreaMutation({ areaId: selectedArea._id })
                      setSelectedArea(null)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm leading-relaxed">
              {selectedArea.description ? (
                <p className="text-muted-foreground">{selectedArea.description}</p>
              ) : (
                <p className="text-xs italic text-muted-foreground">No description provided for this area.</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* DIALOG: SAVE AREA DRAFT */}
      <Dialog open={isAreaDialogOpen} onOpenChange={setIsAreaDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Save Polygon Area ({areaDraft.points.length} points)</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-muted-foreground">Area Name</label>
              <Input
                value={areaDraft.name}
                onChange={(e) => setAreaDraft({ ...areaDraft, name: e.target.value })}
                placeholder="Forbidden Forest, Whisper Plains..."
              />
            </div>
            <div>
              <label className="font-bold text-muted-foreground">Description</label>
              <Textarea
                value={areaDraft.description}
                onChange={(e) => setAreaDraft({ ...areaDraft, description: e.target.value })}
                placeholder="Area lore, hazards, details..."
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-muted-foreground">Color</label>
                <Input
                  type="color"
                  value={areaDraft.color}
                  onChange={(e) => setAreaDraft({ ...areaDraft, color: e.target.value })}
                  className="h-9 p-1"
                />
              </div>
              <div>
                <label className="font-bold text-muted-foreground">Opacity (0.1 - 1.0)</label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={areaDraft.fillOpacity}
                  onChange={(e) => setAreaDraft({ ...areaDraft, fillOpacity: Number(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <label className="font-bold text-muted-foreground">Link to Map (Optional)</label>
              <Select
                value={areaDraft.targetMapId || 'none'}
                onValueChange={(val) =>
                  setAreaDraft({ ...areaDraft, targetMapId: val === 'none' ? undefined : (val as Id<'worldMaps'>) })
                }
              >
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {worldMaps?.map((m) => (
                    <SelectItem key={m._id} value={m._id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" onClick={handleSaveArea}>Save Area</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: ADD LAYER */}
      <Dialog open={isLayerDialogOpen} onOpenChange={setIsLayerDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Map Layer</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-muted-foreground">Layer Name</label>
              <Input
                value={newLayerDraft.name}
                onChange={(e) => setNewLayerDraft({ ...newLayerDraft, name: e.target.value })}
                placeholder="Political Borders, Underground, Weather..."
              />
            </div>
            <div>
              <label className="font-bold text-muted-foreground">Overlay Image URL (Transparent PNG/WebP)</label>
              <Input
                value={newLayerDraft.imageUrl}
                onChange={(e) => setNewLayerDraft({ ...newLayerDraft, imageUrl: e.target.value })}
                placeholder="https://maps.tarragon.be/borders.webp"
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="font-bold">Enabled by Default</span>
              <Switch
                checked={newLayerDraft.defaultEnabled}
                onCheckedChange={(val) => setNewLayerDraft({ ...newLayerDraft, defaultEnabled: val })}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="font-bold">Allow Users / Viewers to Toggle</span>
              <Switch
                checked={newLayerDraft.allowUserToggle}
                onCheckedChange={(val) => setNewLayerDraft({ ...newLayerDraft, allowUserToggle: val })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" onClick={handleAddLayer}>Add Layer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
