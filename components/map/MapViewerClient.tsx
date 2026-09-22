'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useAuth } from '@clerk/nextjs'
import Link from 'next/link'
import { 
  ZoomIn, ZoomOut, Maximize2, Layers, MapPin, Eye, Edit3, Plus, 
  Trash2, Settings, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Map, FileText, Check, X, Grid, Lock, Unlock, Move, HelpCircle, Copy,
  Castle, Crown, Skull, Swords, Shield, Mountain, Tent, Beer, Anchor, Flame, TreePine, Sparkles, BookOpen, Coins, Compass, Gem, Crosshair, Flag, Ghost, EyeOff, Ruler, Search
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

export const PIN_ICONS = [
  { name: 'MapPin', label: 'Default Pin', icon: MapPin },
  { name: 'Castle', label: 'Castle / Keep', icon: Castle },
  { name: 'Crown', label: 'Capital / City', icon: Crown },
  { name: 'Skull', label: 'Dungeon / Danger', icon: Skull },
  { name: 'Swords', label: 'Battle / Conflict', icon: Swords },
  { name: 'Shield', label: 'Guard / Outpost', icon: Shield },
  { name: 'Mountain', label: 'Mountain / Peaks', icon: Mountain },
  { name: 'Tent', label: 'Camp / Caravan', icon: Tent },
  { name: 'Beer', label: 'Tavern / Inn', icon: Beer },
  { name: 'Anchor', label: 'Port / Harbor', icon: Anchor },
  { name: 'Flame', label: 'Forge / Fire', icon: Flame },
  { name: 'TreePine', label: 'Forest / Woods', icon: TreePine },
  { name: 'Sparkles', label: 'Magic / Arcane', icon: Sparkles },
  { name: 'BookOpen', label: 'Library / Lore', icon: BookOpen },
  { name: 'Coins', label: 'Market / Vault', icon: Coins },
  { name: 'Compass', label: 'Waypoint', icon: Compass },
  { name: 'Gem', label: 'Mine / Quarry', icon: Gem },
  { name: 'Crosshair', label: 'Target / Bounty', icon: Crosshair },
  { name: 'Flag', label: 'Settlement / Clan', icon: Flag },
  { name: 'Ghost', label: 'Crypt / Tomb', icon: Ghost },
  { name: 'Eye', label: 'Watchtower / Lookout', icon: Eye },
] as const

export function renderPinIcon(iconName?: string, className = "h-4 w-4 text-white") {
  const found = PIN_ICONS.find((item) => item.name === iconName)
  const IconComp = found ? found.icon : MapPin
  return <IconComp className={className} />
}

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
  const updatePinPositionMutation = useMutation(api.maps.updatePinPosition)
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
  const [activeTool, setActiveTool] = useState<'view' | 'add_pin' | 'add_area' | 'reveal_hex' | 'hide_hex' | 'grid_note' | 'align_grid' | 'ruler'>('view')

  // Live grid calibration / offset state
  const [liveGridOffset, setLiveGridOffset] = useState<{ x: number; y: number } | null>(null)
  const [liveGridSize, setLiveGridSize] = useState<number | null>(null)
  const dragGridStartRef = useRef({ x: 0, y: 0, ox: 0, oy: 0 })

  const currentOffsetX = liveGridOffset !== null ? liveGridOffset.x : (currentMap?.gridOffsetX ?? 0)
  const currentOffsetY = liveGridOffset !== null ? liveGridOffset.y : (currentMap?.gridOffsetY ?? 0)
  const currentGridSize = liveGridSize !== null ? liveGridSize : (currentMap?.gridSize ?? 100)

  // Pan & Zoom viewport state
  const viewportRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const scaleRef = useRef(scale)
  scaleRef.current = scale
  const positionRef = useRef(position)
  positionRef.current = position

  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const dragOriginRef = useRef({ x: 0, y: 0 })
  const hasDraggedRef = useRef(false)
  const [naturalDimensions, setNaturalDimensions] = useState<{ width: number; height: number } | null>(null)
  const hasAutoFittedRef = useRef(false)

  // Distance Measurement Ruler state
  const [rulerPoints, setRulerPoints] = useState<{ start: { x: number; y: number }; current: { x: number; y: number } } | null>(null)
  const [isMeasuring, setIsMeasuring] = useState(false)

  // Draggable Pin Repositioning state
  const [draggingPinId, setDraggingPinId] = useState<Id<'mapPins'> | null>(null)
  const [draggedPinOffset, setDraggedPinOffset] = useState<{ x: number; y: number } | null>(null)
  const pinDragStartRef = useRef<{ clientX: number; clientY: number; origX: number; origY: number; moved: boolean } | null>(null)

  // Locations Directory state
  const [isLocationsMenuOpen, setIsLocationsMenuOpen] = useState(false)
  const [locationSearch, setLocationSearch] = useState('')
  const [locationFilterLayer, setLocationFilterLayer] = useState<string>('all')

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
    gmOnly?: boolean
  }>({
    x: 50,
    y: 50,
    title: '',
    description: '',
    style: 'icon',
    icon: 'MapPin',
    color: '#a855f7',
    gmOnly: false,
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
    gmOnly?: boolean
  }>({
    name: '',
    description: '',
    color: '#a855f7',
    fillOpacity: 0.3,
    points: [],
    gmOnly: false,
  })

  // Map Settings Draft
  const [settingsDraft, setSettingsDraft] = useState({
    name: '',
    slug: '',
    isHomeMap: false,
    imageUrl: '',
    width: 2000,
    height: 2000,
    gridType: 'none' as 'none' | 'hex' | 'hex_flat' | 'square',
    gridSize: 100,
    gridOffsetX: 0,
    gridOffsetY: 0,
    gridScale: 0,
    gridScaleUnit: 'miles',
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
        gridScale: currentMap.gridScale || 0,
        gridScaleUnit: currentMap.gridScaleUnit || 'miles',
        isExplorationMap: currentMap.isExplorationMap || false,
      })
    }
  }, [currentMap])

  // Lock body scroll and set up non-passive wheel listener with focal zoom (zooming towards mouse cursor)
  useEffect(() => {
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleWheelNative = (e: WheelEvent) => {
      const viewport = viewportRef.current
      if (!viewport) return

      // Do not intercept if scrolling inside dialogs, modals, popovers, or scrollable dropdown menus
      const target = e.target as HTMLElement | null
      if (
        target &&
        target.closest(
          '[role="dialog"], [role="menu"], [data-radix-popper-content-wrapper], .overflow-y-auto, .overflow-y-scroll, .overflow-auto'
        )
      ) {
        return
      }

      if (e.target === viewport || viewport.contains(e.target as Node)) {
        e.preventDefault()
        e.stopPropagation()

        const zoomFactor = e.ctrlKey
          ? Math.exp(-e.deltaY * 0.01)
          : e.deltaY < 0
          ? 1.15
          : 0.85

        const currentScale = scaleRef.current
        const currentPos = positionRef.current

        const newScale = Math.min(Math.max(currentScale * zoomFactor, 0.01), 8)
        const k = newScale / currentScale

        const rect = viewport.getBoundingClientRect()
        const cx = rect.width / 2
        const cy = rect.height / 2
        const mouseX = e.clientX - rect.left - cx
        const mouseY = e.clientY - rect.top - cy

        const newX = mouseX + (currentPos.x - mouseX) * k
        const newY = mouseY + (currentPos.y - mouseY) * k

        scaleRef.current = newScale
        positionRef.current = { x: newX, y: newY }

        setScale(newScale)
        setPosition({ x: newX, y: newY })
      }
    }

    window.addEventListener('wheel', handleWheelNative, { passive: false })
    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('wheel', handleWheelNative)
    }
  }, [])

  // Keyboard shortcuts (Esc to cancel tools/drafts/menus)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setRulerPoints(null)
        setIsMeasuring(false)
        if (activeTool === 'ruler') setActiveTool('view')
        if (activeTool === 'add_area' && areaDraft.points.length > 0) {
          setAreaDraft({ name: '', description: '', color: '#a855f7', fillOpacity: 0.3, points: [], gmOnly: false })
          setActiveTool('view')
          toast.info('Area drawing cancelled')
        }
        setIsLocationsMenuOpen(false)
        setIsLayersMenuOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeTool, areaDraft.points.length])

  // Mouse pan & interaction handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return // Left click only
    if (activeTool === 'add_area' && areaDraft.points.length > 0) return // Polygon drawing

    if (activeTool === 'ruler') {
      const p = getCanvasPixelCoordinates(e as unknown as React.MouseEvent<HTMLDivElement>)
      setIsMeasuring(true)
      setRulerPoints({ start: p, current: p })
      return
    }

    setIsDragging(true)
    hasDraggedRef.current = false
    dragOriginRef.current = { x: e.clientX, y: e.clientY }

    if (activeTool === 'align_grid') {
      dragGridStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        ox: currentOffsetX,
        oy: currentOffsetY,
      }
      return
    }

    dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isMeasuring && activeTool === 'ruler') {
      const p = getCanvasPixelCoordinates(e as unknown as React.MouseEvent<HTMLDivElement>)
      setRulerPoints((prev) => prev ? { start: prev.start, current: p } : null)
      return
    }

    if (draggingPinId && pinDragStartRef.current) {
      const dx = (e.clientX - pinDragStartRef.current.clientX) / scale
      const dy = (e.clientY - pinDragStartRef.current.clientY) / scale
      if (Math.hypot(dx, dy) > 4) {
        pinDragStartRef.current.moved = true
        const dxPercent = (dx / mapWidth) * 100
        const dyPercent = (dy / mapHeight) * 100
        const newX = Math.min(100, Math.max(0, pinDragStartRef.current.origX + dxPercent))
        const newY = Math.min(100, Math.max(0, pinDragStartRef.current.origY + dyPercent))
        setDraggedPinOffset({ x: newX, y: newY })
      }
      return
    }

    if (!isDragging) return
    if (Math.hypot(e.clientX - dragOriginRef.current.x, e.clientY - dragOriginRef.current.y) > 5) {
      hasDraggedRef.current = true
    }

    if (activeTool === 'align_grid') {
      const dx = (e.clientX - dragGridStartRef.current.x) / scale
      const dy = (e.clientY - dragGridStartRef.current.y) / scale
      setLiveGridOffset({
        x: Math.round(dragGridStartRef.current.ox + dx),
        y: Math.round(dragGridStartRef.current.oy + dy),
      })
      return
    }

    const newX = e.clientX - dragStartRef.current.x
    const newY = e.clientY - dragStartRef.current.y
    positionRef.current = { x: newX, y: newY }
    setPosition({ x: newX, y: newY })
  }

  const handleMouseUp = () => {
    if (isMeasuring) {
      setIsMeasuring(false)
      return
    }

    if (draggingPinId && pinDragStartRef.current) {
      if (pinDragStartRef.current.moved && draggedPinOffset) {
        const pinToUpdate = draggingPinId
        const newX = Number(draggedPinOffset.x.toFixed(2))
        const newY = Number(draggedPinOffset.y.toFixed(2))
        updatePinPositionMutation({
          pinId: pinToUpdate,
          x: newX,
          y: newY,
        })
          .then(() => toast.success('Pin repositioned'))
          .catch(() => toast.error('Failed to move pin'))
      } else if (!pinDragStartRef.current.moved) {
        const clickedPin = fullData?.pins.find((p) => p._id === draggingPinId)
        if (clickedPin) setSelectedPin(clickedPin)
      }
      setDraggingPinId(null)
      setDraggedPinOffset(null)
      pinDragStartRef.current = null
      return
    }

    setIsDragging(false)
  }

  // Touch Pinch Zoom & Pan Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (activeTool === 'ruler' && e.touches.length === 1) {
      const touch = e.touches[0]
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const clickX = (touch.clientX - rect.left) / scale
        const clickY = (touch.clientY - rect.top) / scale
        const p = {
          x: Math.min(Math.max(clickX, 0), mapWidth),
          y: Math.min(Math.max(clickY, 0), mapHeight),
        }
        setIsMeasuring(true)
        setRulerPoints({ start: p, current: p })
      }
      return
    }

    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      touchDistanceRef.current = dist
    } else if (e.touches.length === 1) {
      setIsDragging(true)
      hasDraggedRef.current = false
      dragOriginRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }

      if (activeTool === 'align_grid') {
        dragGridStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          ox: currentOffsetX,
          oy: currentOffsetY,
        }
        return
      }

      dragStartRef.current = {
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      }
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isMeasuring && activeTool === 'ruler' && e.touches.length === 1) {
      const touch = e.touches[0]
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const clickX = (touch.clientX - rect.left) / scale
        const clickY = (touch.clientY - rect.top) / scale
        const p = {
          x: Math.min(Math.max(clickX, 0), mapWidth),
          y: Math.min(Math.max(clickY, 0), mapHeight),
        }
        setRulerPoints((prev) => prev ? { start: prev.start, current: p } : null)
      }
      return
    }

    if (e.touches.length === 2 && touchDistanceRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      const delta = dist / touchDistanceRef.current
      const newScale = Math.min(Math.max(scaleRef.current * delta, 0.01), 8)
      scaleRef.current = newScale
      setScale(newScale)
      touchDistanceRef.current = dist
    } else if (e.touches.length === 1 && isDragging) {
      if (Math.hypot(e.touches[0].clientX - dragOriginRef.current.x, e.touches[0].clientY - dragOriginRef.current.y) > 5) {
        hasDraggedRef.current = true
      }

      if (activeTool === 'align_grid') {
        const dx = (e.touches[0].clientX - dragGridStartRef.current.x) / scale
        const dy = (e.touches[0].clientY - dragGridStartRef.current.y) / scale
        setLiveGridOffset({
          x: Math.round(dragGridStartRef.current.ox + dx),
          y: Math.round(dragGridStartRef.current.oy + dy),
        })
        return
      }

      const newX = e.touches[0].clientX - dragStartRef.current.x
      const newY = e.touches[0].clientY - dragStartRef.current.y
      positionRef.current = { x: newX, y: newY }
      setPosition({ x: newX, y: newY })
    }
  }

  const handleTouchEnd = () => {
    if (isMeasuring) {
      setIsMeasuring(false)
      return
    }
    setIsDragging(false)
    touchDistanceRef.current = null
  }

  // Zoom controls
  const handleZoomIn = () => {
    const newScale = Math.min(scaleRef.current * 1.25, 8)
    scaleRef.current = newScale
    setScale(newScale)
  }
  const handleZoomOut = () => {
    const newScale = Math.max(scaleRef.current * 0.8, 0.01)
    scaleRef.current = newScale
    setScale(newScale)
  }
  const handleResetZoom = () => {
    fitMapToViewport()
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

  // Pixel coordinates within unscaled map dimensions [0..mapWidth, 0..mapHeight]
  const getCanvasPixelCoordinates = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return { x: 0, y: 0 }
    const rect = containerRef.current.getBoundingClientRect()
    const clickX = (e.clientX - rect.left) / scale
    const clickY = (e.clientY - rect.top) / scale
    return {
      x: Math.min(Math.max(clickX, 0), mapWidth),
      y: Math.min(Math.max(clickY, 0), mapHeight),
    }
  }

  // Canvas Click Handler based on Active Tool
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging || hasDraggedRef.current || activeTool === 'ruler') return
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
        gmOnly: false,
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
  // Priority: if naturalDimensions detected and currentMap is on default 2000x2000, use natural dimensions.
  const mapWidth = (currentMap?.width && currentMap.width !== 2000)
    ? currentMap.width
    : (naturalDimensions?.width || currentMap?.width || 2000)
  const mapHeight = (currentMap?.height && currentMap.height !== 2000)
    ? currentMap.height
    : (naturalDimensions?.height || currentMap?.height || 2000)

  const fitMapToViewport = (w = mapWidth, h = mapHeight) => {
    if (!viewportRef.current || !w || !h) return
    const vw = viewportRef.current.clientWidth || window.innerWidth
    const vh = viewportRef.current.clientHeight || (window.innerHeight - 60)
    const padding = vw < 640 ? 16 : 48
    const scaleX = (vw - padding) / w
    const scaleY = (vh - padding) / h
    const fitScale = Math.min(scaleX, scaleY, 1)
    const safeScale = Math.max(fitScale, 0.01)
    setScale(Number(safeScale.toFixed(4)))
    setPosition({ x: 0, y: 0 })
  }

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    const nw = img.naturalWidth
    const nh = img.naturalHeight
    if (nw && nh && (nw !== naturalDimensions?.width || nh !== naturalDimensions?.height)) {
      setNaturalDimensions({ width: nw, height: nh })
      fitMapToViewport(nw, nh)
      hasAutoFittedRef.current = true

      // If the map is still stored with default 2000x2000 square dimensions, persist real dimensions
      if (currentMap && isOwner && (currentMap.width === 2000 && currentMap.height === 2000)) {
        updateMapSettingsMutation({
          mapId: currentMap._id,
          width: nw,
          height: nh,
        }).catch(console.error)
      }
    }
  }

  useEffect(() => {
    if (currentMap && !hasAutoFittedRef.current) {
      hasAutoFittedRef.current = true
      const timer = setTimeout(() => fitMapToViewport(), 100)
      return () => clearTimeout(timer)
    }
  }, [currentMap?._id])

  const gridSize = currentMap?.gridSize || 100
  const gridType = currentMap?.gridType || 'none'
  const isExplorationMap = currentMap?.isExplorationMap || false

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

  // Search & Filtered Pins for Locations Directory
  const filteredPins = useMemo(() => {
    if (!fullData?.pins) return []
    return fullData.pins.filter((pin) => {
      if (locationFilterLayer !== 'all' && pin.layerId !== locationFilterLayer) {
        return false
      }
      if (locationSearch.trim()) {
        const q = locationSearch.toLowerCase()
        const titleMatch = pin.title.toLowerCase().includes(q)
        const descMatch = pin.description ? pin.description.toLowerCase().includes(q) : false
        return titleMatch || descMatch
      }
      return true
    })
  }, [fullData?.pins, locationFilterLayer, locationSearch])

  // Distance Measurement Calculation
  const getRulerDistance = () => {
    if (!rulerPoints) return null
    const dx = rulerPoints.current.x - rulerPoints.start.x
    const dy = rulerPoints.current.y - rulerPoints.start.y
    const pixelDist = Math.hypot(dx, dy)

    const cellPx = Math.max(25, currentGridSize)
    const cellCount = pixelDist / cellPx
    const cellLabel = gridType === 'hex' || gridType === 'hex_flat' ? 'hexes' : gridType === 'square' ? 'squares' : 'cells'

    const scaleValue = currentMap?.gridScale
    const scaleUnit = currentMap?.gridScaleUnit || 'miles'

    if (scaleValue && scaleValue > 0) {
      const realDist = cellCount * scaleValue
      return {
        primary: `${realDist.toFixed(1)} ${scaleUnit}`,
        secondary: `${cellCount.toFixed(1)} ${cellLabel} (${Math.round(pixelDist)}px)`,
        pixelDist,
      }
    }

    return {
      primary: `${cellCount.toFixed(1)} ${cellLabel}`,
      secondary: `${Math.round(pixelDist)}px`,
      pixelDist,
    }
  }

  // Exact gapless interlocking honeycomb and square grid calculation with border over-tiling
  const gridCells = useMemo(() => {
    if (gridType === 'none') return []
    const effectiveGridSize = Math.max(25, currentGridSize)
    const ox = currentOffsetX
    const oy = currentOffsetY

    // Pad by 1 cell beyond borders so hexagons and grid lines cleanly tile across and cover image edges
    const pad = 1

    if (gridType === 'hex') {
      // Pointy-topped hexagon (Standard D&D / RPG)
      // Width W = effectiveGridSize
      // Circumradius R = W / sqrt(3)
      // Height H = 2 * R = (2 / sqrt(3)) * W
      // Vertical row step deltaY = 1.5 * R = (sqrt(3) / 2) * W
      const W = effectiveGridSize
      const R = W / Math.sqrt(3)
      const deltaY = 1.5 * R

      const minC = Math.floor(-ox / W) - pad
      const maxC = Math.ceil((mapWidth - ox) / W) + pad
      const minR = Math.floor(-oy / deltaY) - pad
      const maxR = Math.ceil((mapHeight - oy) / deltaY) + pad

      const colCount = Math.min(maxC - minC + 1, 180)
      const rowCount = Math.min(maxR - minR + 1, 180)

      const cells = []
      for (let rIdx = 0; rIdx < rowCount; rIdx++) {
        const r = minR + rIdx
        const isOdd = Math.abs(r) % 2 === 1
        const cy = oy + R + r * deltaY

        for (let cIdx = 0; cIdx < colCount; cIdx++) {
          const c = minC + cIdx
          const cx = ox + (c + (isOdd ? 0.5 : 0)) * W + W / 2
          const points = [
            `${cx.toFixed(2)},${(cy - R).toFixed(2)}`,
            `${(cx + W / 2).toFixed(2)},${(cy - R / 2).toFixed(2)}`,
            `${(cx + W / 2).toFixed(2)},${(cy + R / 2).toFixed(2)}`,
            `${cx.toFixed(2)},${(cy + R).toFixed(2)}`,
            `${(cx - W / 2).toFixed(2)},${(cy + R / 2).toFixed(2)}`,
            `${(cx - W / 2).toFixed(2)},${(cy - R / 2).toFixed(2)}`,
          ].join(' ')

          cells.push({
            key: `${c},${r}`,
            c,
            r,
            cx,
            cy,
            points,
          })
        }
      }
      return cells
    } else if (gridType === 'hex_flat') {
      // Flat-topped hexagon
      const H = effectiveGridSize
      const R = H / Math.sqrt(3)
      const deltaX = 1.5 * R

      const minC = Math.floor(-ox / deltaX) - pad
      const maxC = Math.ceil((mapWidth - ox) / deltaX) + pad
      const minR = Math.floor(-oy / H) - pad
      const maxR = Math.ceil((mapHeight - oy) / H) + pad

      const colCount = Math.min(maxC - minC + 1, 180)
      const rowCount = Math.min(maxR - minR + 1, 180)

      const cells = []
      for (let cIdx = 0; cIdx < colCount; cIdx++) {
        const c = minC + cIdx
        const isOdd = Math.abs(c) % 2 === 1
        const cx = ox + R + c * deltaX

        for (let rIdx = 0; rIdx < rowCount; rIdx++) {
          const r = minR + rIdx
          const cy = oy + (r + (isOdd ? 0.5 : 0)) * H + H / 2
          const points = [
            `${(cx - R).toFixed(2)},${cy.toFixed(2)}`,
            `${(cx - R / 2).toFixed(2)},${(cy - H / 2).toFixed(2)}`,
            `${(cx + R / 2).toFixed(2)},${(cy - H / 2).toFixed(2)}`,
            `${(cx + R).toFixed(2)},${cy.toFixed(2)}`,
            `${(cx + R / 2).toFixed(2)},${(cy + H / 2).toFixed(2)}`,
            `${(cx - R / 2).toFixed(2)},${(cy + H / 2).toFixed(2)}`,
          ].join(' ')

          cells.push({
            key: `${c},${r}`,
            c,
            r,
            cx,
            cy,
            points,
          })
        }
      }
      return cells
    } else if (gridType === 'square') {
      const size = effectiveGridSize
      const minC = Math.floor(-ox / size) - pad
      const maxC = Math.ceil((mapWidth - ox) / size) + pad
      const minR = Math.floor(-oy / size) - pad
      const maxR = Math.ceil((mapHeight - oy) / size) + pad

      const colCount = Math.min(maxC - minC + 1, 180)
      const rowCount = Math.min(maxR - minR + 1, 180)

      const cells = []
      for (let rIdx = 0; rIdx < rowCount; rIdx++) {
        const r = minR + rIdx
        const y = oy + r * size

        for (let cIdx = 0; cIdx < colCount; cIdx++) {
          const c = minC + cIdx
          const x = ox + c * size
          const points = [
            `${x},${y}`,
            `${x + size},${y}`,
            `${x + size},${y + size}`,
            `${x},${y + size}`,
          ].join(' ')

          cells.push({
            key: `${c},${r}`,
            c,
            r,
            cx: x + size / 2,
            cy: y + size / 2,
            points,
          })
        }
      }
      return cells
    }
    return []
  }, [gridType, currentGridSize, currentOffsetX, currentOffsetY, mapWidth, mapHeight])

  // Cell click handler (Exploration reveal or Player Note)
  const handleCellClick = (cellKey: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (hasDraggedRef.current || activeTool === 'align_grid') return
    if (!currentMap) return

    if (isEditMode && activeTool === 'reveal_hex') {
      if (!revealedSet.has(cellKey)) {
        bulkRevealCellsMutation({ mapId: currentMap._id, cellKeys: [cellKey], reveal: true })
      }
    } else if (isEditMode && activeTool === 'hide_hex') {
      if (revealedSet.has(cellKey)) {
        bulkRevealCellsMutation({ mapId: currentMap._id, cellKeys: [cellKey], reveal: false })
      }
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
        gmOnly: pinDraft.gmOnly,
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
        gmOnly: areaDraft.gmOnly,
      })
      toast.success('Area saved!')
      setIsAreaDialogOpen(false)
      setAreaDraft({ name: '', description: '', color: '#a855f7', fillOpacity: 0.3, points: [], gmOnly: false })
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
        gridScale: settingsDraft.gridScale,
        gridScaleUnit: settingsDraft.gridScaleUnit,
        isExplorationMap: settingsDraft.isExplorationMap,
      })
      setLiveGridOffset(null)
      setLiveGridSize(null)
      toast.success('Map settings updated!')
      setIsSettingsDialogOpen(false)
      if (settingsDraft.slug !== currentMap.slug) {
        router.push(`/world/${encodeURIComponent(world.name)}/map/${settingsDraft.slug}`)
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update settings')
    }
  }

  // Grid Calibration Handlers
  const handleSaveGridCalibration = async () => {
    if (!currentMap) return
    try {
      await updateMapSettingsMutation({
        mapId: currentMap._id,
        gridOffsetX: currentOffsetX,
        gridOffsetY: currentOffsetY,
        gridSize: currentGridSize,
      })
      toast.success(`Grid calibrated! Offset: (${currentOffsetX}px, ${currentOffsetY}px), Size: ${currentGridSize}px`)
      setLiveGridOffset(null)
      setLiveGridSize(null)
      setActiveTool('view')
    } catch (err: any) {
      toast.error(err.message || 'Failed to save grid calibration')
    }
  }

  const handleResetGridCalibration = () => {
    setLiveGridOffset(null)
    setLiveGridSize(null)
    toast.info('Reset grid calibration')
  }

  const handleNudgeOffset = (dx: number, dy: number) => {
    setLiveGridOffset({
      x: currentOffsetX + dx,
      y: currentOffsetY + dy,
    })
  }

  const handleSetOffset = (x: number, y: number) => {
    setLiveGridOffset({ x, y })
  }

  const handleSetGridSize = (size: number) => {
    setLiveGridSize(Math.max(25, size))
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
    <div className="fixed inset-0 z-0 h-dvh w-screen overflow-hidden bg-slate-950 text-foreground select-none touch-none">
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
        {/* TOP RIGHT CONTROLS (LOCATIONS, RULER, LAYERS & SETTINGS) */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* LOCATIONS DIRECTORY BUTTON */}
          <Button
            variant={isLocationsMenuOpen ? 'secondary' : 'outline'}
            size="sm"
            className="h-9 gap-1.5 bg-background/80 backdrop-blur-md border-border/50 shadow-lg"
            onClick={() => {
              setIsLocationsMenuOpen(!isLocationsMenuOpen)
              if (isLayersMenuOpen) setIsLayersMenuOpen(false)
            }}
            title="Browse Map Locations"
          >
            <Compass className="h-4 w-4 text-cyan-400" />
            <span className="hidden sm:inline">Locations</span>
            {fullData?.pins && fullData.pins.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 bg-muted/80 rounded-full text-[10px] font-mono">
                {fullData.pins.length}
              </span>
            )}
          </Button>

          {/* RULER MEASURE BUTTON */}
          <Button
            variant={activeTool === 'ruler' ? 'secondary' : 'outline'}
            size="sm"
            className={`h-9 gap-1.5 bg-background/80 backdrop-blur-md border-border/50 shadow-lg ${
              activeTool === 'ruler' ? 'text-cyan-400 border-cyan-500/50 bg-cyan-950/40' : ''
            }`}
            onClick={() => {
              if (activeTool === 'ruler') {
                setActiveTool('view')
                setRulerPoints(null)
              } else {
                setActiveTool('ruler')
              }
            }}
            title="Measure Distance (Ruler)"
          >
            <Ruler className="h-4 w-4 text-cyan-400" />
            <span className="hidden sm:inline">Ruler</span>
          </Button>

          {/* LAYERS TOGGLE */}
          <Button
            variant={isLayersMenuOpen ? 'secondary' : 'outline'}
            size="sm"
            className="h-9 gap-2 bg-background/80 backdrop-blur-md border-border/50 shadow-lg"
            onClick={() => {
              setIsLayersMenuOpen(!isLayersMenuOpen)
              if (isLocationsMenuOpen) setIsLocationsMenuOpen(false)
            }}
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
                  setRulerPoints(null)
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
            onClick={() => {
              setActiveTool('view')
              setRulerPoints(null)
            }}
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
              setAreaDraft({ name: '', description: '', color: '#a855f7', fillOpacity: 0.3, points: [], gmOnly: false })
            }}
            title="Draw Polygon Area"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant={activeTool === 'ruler' ? 'secondary' : 'ghost'}
            size="icon"
            className={`h-9 w-9 ${activeTool === 'ruler' ? 'text-cyan-400 bg-cyan-950/40 ring-1 ring-cyan-500/50' : 'text-cyan-400'}`}
            onClick={() => {
              if (activeTool === 'ruler') {
                setActiveTool('view')
                setRulerPoints(null)
              } else {
                setActiveTool('ruler')
              }
            }}
            title="Measure Distance (Ruler)"
          >
            <Ruler className="h-4 w-4" />
          </Button>
          {gridType !== 'none' && (
            <Button
              variant={activeTool === 'align_grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-9 w-9 text-amber-400"
              onClick={() => setActiveTool(activeTool === 'align_grid' ? 'view' : 'align_grid')}
              title="Align / Offset Grid (Drag or Nudge)"
            >
              <Grid className="h-4 w-4" />
            </Button>
          )}
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
                  const allKeys = gridCells.map((cell) => cell.key)
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

      {/* FLOATING GRID CALIBRATION HUD */}
      {isOwner && isEditMode && activeTool === 'align_grid' && gridType !== 'none' && (
        <div className="absolute top-20 left-16 z-30 bg-background/95 backdrop-blur-md p-3.5 rounded-xl border border-amber-500/40 shadow-2xl flex flex-col gap-3 min-w-[270px]">
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <span className="font-bold text-xs flex items-center gap-1.5 text-amber-400">
              <Grid className="h-4 w-4" /> Grid Calibration
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={() => setActiveTool('view')}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground leading-snug">
            Drag the map with your cursor to shift the grid, or use the nudge buttons below.
          </p>

          <div className="space-y-2.5 text-xs">
            {/* OFFSET X */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground font-semibold w-16">Offset X:</span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleNudgeOffset(-5, 0)} title="Nudge Left 5px">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Input
                  type="number"
                  className="h-7 w-16 text-center text-xs p-1 font-mono"
                  value={currentOffsetX}
                  onChange={(e) => handleSetOffset(Number(e.target.value), currentOffsetY)}
                />
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleNudgeOffset(5, 0)} title="Nudge Right 5px">
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* OFFSET Y */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground font-semibold w-16">Offset Y:</span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleNudgeOffset(0, -5)} title="Nudge Up 5px">
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Input
                  type="number"
                  className="h-7 w-16 text-center text-xs p-1 font-mono"
                  value={currentOffsetY}
                  onChange={(e) => handleSetOffset(currentOffsetX, Number(e.target.value))}
                />
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleNudgeOffset(0, 5)} title="Nudge Down 5px">
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* GRID SIZE */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
              <span className="text-muted-foreground font-semibold w-16">Cell Size:</span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleSetGridSize(currentGridSize - 5)} title="Decrease Size 5px">
                  -
                </Button>
                <Input
                  type="number"
                  className="h-7 w-16 text-center text-xs p-1 font-mono"
                  value={currentGridSize}
                  onChange={(e) => handleSetGridSize(Number(e.target.value))}
                />
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleSetGridSize(currentGridSize + 5)} title="Increase Size 5px">
                  +
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-border/40">
            <Button
              size="sm"
              className="flex-1 text-xs h-8 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-md"
              onClick={handleSaveGridCalibration}
            >
              Save Grid
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-8 px-2.5"
              onClick={handleResetGridCalibration}
            >
              Reset
            </Button>
          </div>
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

      {/* LOCATIONS DIRECTORY SIDEBAR PANEL */}
      {isLocationsMenuOpen && (
        <Card className="absolute top-16 right-4 z-40 w-80 bg-card/95 backdrop-blur-md border-border/50 shadow-2xl flex flex-col max-h-[75vh]">
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-border/50 shrink-0">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Compass className="h-4 w-4 text-cyan-400" /> Locations ({filteredPins.length})
            </CardTitle>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsLocationsMenuOpen(false)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <div className="p-3 border-b border-border/40 space-y-2 shrink-0">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search locations..."
                className="h-8 pl-8 text-xs bg-background/60"
                value={locationSearch}
                onChange={(e) => setLocationSearch(e.target.value)}
              />
            </div>
            {fullData?.layers && fullData.layers.length > 0 && (
              <Select value={locationFilterLayer} onValueChange={setLocationFilterLayer}>
                <SelectTrigger className="h-7 text-xs bg-background/60"><SelectValue placeholder="All Layers" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Layers</SelectItem>
                  {fullData.layers.map((l) => (
                    <SelectItem key={l._id} value={l._id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <CardContent className="p-2 space-y-1.5 overflow-y-auto flex-1">
            {filteredPins.length === 0 ? (
              <p className="text-xs text-muted-foreground italic text-center py-6">No locations found.</p>
            ) : (
              filteredPins.map((pin) => {
                const pinLayer = fullData?.layers.find((l) => l._id === pin.layerId)
                return (
                  <div
                    key={pin._id}
                    className="p-2 rounded-lg hover:bg-muted/50 border border-transparent hover:border-border/40 transition-colors cursor-pointer group flex items-start justify-between gap-2"
                    onClick={() => {
                      // Center viewport on pin
                      const targetPxX = (pin.x / 100) * mapWidth - mapWidth / 2
                      const targetPxY = (pin.y / 100) * mapHeight - mapHeight / 2
                      const newScale = Math.max(scaleRef.current, 1.2)
                      scaleRef.current = newScale
                      setScale(newScale)
                      positionRef.current = { x: -targetPxX * newScale, y: -targetPxY * newScale }
                      setPosition({ x: -targetPxX * newScale, y: -targetPxY * newScale })
                      setSelectedPin(pin)
                    }}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div
                        className="p-1.5 rounded-full shadow-sm shrink-0 mt-0.5"
                        style={{ backgroundColor: pin.color || '#a855f7' }}
                      >
                        {renderPinIcon(pin.icon, "h-3.5 w-3.5 text-white")}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-xs truncate group-hover:text-primary transition-colors">
                            {pin.title}
                          </span>
                          {pin.gmOnly && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-0.5">
                              <EyeOff className="h-2.5 w-2.5" /> Secret
                            </span>
                          )}
                        </div>
                        {pin.description && (
                          <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                            {pin.description}
                          </p>
                        )}
                        {pinLayer && (
                          <span className="text-[10px] text-purple-400/80 mt-0.5 block">
                            {pinLayer.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-foreground shrink-0 mt-1" />
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      )}

      {/* RULER ACTIVE BOTTOM HUD */}
      {activeTool === 'ruler' && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-30 flex items-center gap-3 bg-background/90 backdrop-blur-md px-4 py-2 rounded-full border border-cyan-500/40 shadow-2xl">
          <div className="flex items-center gap-2 text-xs font-medium text-foreground">
            <Ruler className="h-4 w-4 text-cyan-400" />
            <span>Click &amp; drag across the map to measure distance</span>
          </div>
          {rulerPoints && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2 text-muted-foreground hover:text-destructive"
              onClick={() => setRulerPoints(null)}
            >
              Clear
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs px-2.5"
            onClick={() => {
              setRulerPoints(null)
              setActiveTool('view')
            }}
          >
            Done
          </Button>
        </div>
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
        ref={viewportRef}
        className={`w-full h-full ${activeTool === 'align_grid' ? 'cursor-move' : activeTool === 'ruler' ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'} flex items-center justify-center overflow-hidden`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          ref={containerRef}
          className="relative shrink-0 transition-transform duration-75 ease-out origin-center shadow-2xl"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            width: `${mapWidth}px`,
            height: `${mapHeight}px`,
            minWidth: `${mapWidth}px`,
            minHeight: `${mapHeight}px`,
            flexShrink: 0,
          }}
          onClick={handleCanvasClick}
        >
          {/* BASE MAP BACKGROUND IMAGE */}
          {currentMap?.imageUrl ? (
            <img
              src={currentMap.imageUrl}
              alt={currentMap.name}
              className="absolute inset-0 w-full h-full max-w-none object-fill select-none pointer-events-none"
              draggable={false}
              onLoad={handleImageLoad}
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
                className="absolute inset-0 w-full h-full max-w-none object-fill pointer-events-none"
                draggable={false}
              />
            )
          })}

          {/* POLYGON AREAS & RULER SVG */}
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
                  strokeDasharray={area.gmOnly ? '6,4' : undefined}
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

            {/* RULER MEASUREMENT LINE */}
            {rulerPoints && (
              <g className="pointer-events-none">
                <line
                  x1={rulerPoints.start.x}
                  y1={rulerPoints.start.y}
                  x2={rulerPoints.current.x}
                  y2={rulerPoints.current.y}
                  stroke="#0f172a"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <line
                  x1={rulerPoints.start.x}
                  y1={rulerPoints.start.y}
                  x2={rulerPoints.current.x}
                  y2={rulerPoints.current.y}
                  stroke="#06b6d4"
                  strokeWidth="3"
                  strokeDasharray="8,6"
                  strokeLinecap="round"
                />
                <circle
                  cx={rulerPoints.start.x}
                  cy={rulerPoints.start.y}
                  r="7"
                  fill="#06b6d4"
                  stroke="#0f172a"
                  strokeWidth="2"
                />
                <circle
                  cx={rulerPoints.current.x}
                  cy={rulerPoints.current.y}
                  r="7"
                  fill="#22d3ee"
                  stroke="#0f172a"
                  strokeWidth="2"
                />
              </g>
            )}
          </svg>

          {/* RULER FLOATING DISTANCE BADGE */}
          {rulerPoints && (
            <div
              className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2 z-30"
              style={{
                left: `${(rulerPoints.start.x + rulerPoints.current.x) / 2}px`,
                top: `${(rulerPoints.start.y + rulerPoints.current.y) / 2}px`,
              }}
            >
              {(() => {
                const dist = getRulerDistance()
                if (!dist) return null
                return (
                  <div className="bg-slate-950/95 border border-cyan-500/60 shadow-[0_0_16px_rgba(6,182,212,0.4)] backdrop-blur-md px-3 py-1.5 rounded-full flex flex-col items-center whitespace-nowrap text-center">
                    <span className="text-xs font-bold text-cyan-300 font-mono flex items-center gap-1.5">
                      <Ruler className="h-3.5 w-3.5 text-cyan-400" />
                      {dist.primary}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {dist.secondary}
                    </span>
                  </div>
                )
              })()}
            </div>
          )}

          {/* PINS */}
          {fullData?.pins.map((pin) => {
            if (pin.layerId && !enabledLayers[pin.layerId]) return null
            const showTextOnly = pin.style === 'text_only'
            const isDraggingThisPin = draggingPinId === pin._id
            const currentPinX = isDraggingThisPin && draggedPinOffset ? draggedPinOffset.x : pin.x
            const currentPinY = isDraggingThisPin && draggedPinOffset ? draggedPinOffset.y : pin.y

            return (
              <div
                key={pin._id}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto group ${
                  isOwner && isEditMode && activeTool === 'view' ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
                }`}
                style={{
                  left: `${currentPinX}%`,
                  top: `${currentPinY}%`,
                  zIndex: isDraggingThisPin ? 40 : (isOwner && isEditMode ? 25 : 5),
                }}
                onMouseDown={(e) => {
                  if (isOwner && isEditMode && activeTool === 'view') {
                    e.stopPropagation()
                    pinDragStartRef.current = {
                      clientX: e.clientX,
                      clientY: e.clientY,
                      origX: pin.x,
                      origY: pin.y,
                      moved: false,
                    }
                    setDraggingPinId(pin._id)
                  }
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  if (pinDragStartRef.current?.moved) return
                  if (pin.targetMapId) {
                    const target = worldMaps?.find((m) => m._id === pin.targetMapId)
                    if (target) router.push(`/world/${encodeURIComponent(world.name)}/map/${target.slug}`)
                  } else {
                    setSelectedPin(pin)
                  }
                }}
              >
                {showTextOnly ? (
                  <span className="bg-background/90 backdrop-blur-md px-2 py-0.5 rounded-md border border-border/50 text-xs font-bold shadow-lg text-primary whitespace-nowrap flex items-center gap-1.5">
                    {pin.title}
                    {pin.gmOnly && (
                      <span title="Secret (GM Only)">
                        <EyeOff className="h-3 w-3 text-amber-400 shrink-0" />
                      </span>
                    )}
                  </span>
                ) : (
                  <div className="flex flex-col items-center relative">
                    <div
                      className={`p-2 rounded-full shadow-lg border border-white/20 transition-transform ${
                        isDraggingThisPin ? 'scale-125 ring-2 ring-amber-400' : 'group-hover:scale-110'
                      }`}
                      style={{ backgroundColor: pin.color || '#a855f7' }}
                    >
                      {renderPinIcon(pin.icon, "h-5 w-5 text-white")}
                    </div>
                    {pin.gmOnly && (
                      <div
                        className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-0.5 shadow-md border border-slate-900"
                        title="Secret Pin (Hidden from players)"
                      >
                        <EyeOff className="h-2.5 w-2.5 text-slate-950" />
                      </div>
                    )}
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

          {/* GRID OVERLAY (HEX OR SQUARE) - Rendered at z-10 so opaque fog-of-war fully conceals map and unrevealed pins */}
          {gridType !== 'none' && (
            <svg
              className="absolute inset-0 pointer-events-none overflow-hidden select-none"
              style={{ width: `${mapWidth}px`, height: `${mapHeight}px`, zIndex: 10 }}
            >
              {gridCells.map((cell) => {
                const isRevealed = revealedSet.has(cell.key)
                const isHidden = isExplorationMap && !isRevealed
                const hasNote = !!notesMap[cell.key]
                const canShowNote = hasNote && (!isHidden || isOwner)

                // 100% solid fully opaque dark slate for hidden cells - zero transparency, map cannot be seen through it
                const fillColor = isHidden ? '#020617' : 'transparent'

                // Hover styling: Hidden cells NEVER reveal or become semi-transparent on hover
                let hoverClass = ''
                if (isHidden) {
                  if (isEditMode && activeTool === 'reveal_hex') {
                    // GM targeting outline only - fill remains 100% opaque #020617
                    hoverClass = 'cursor-pointer hover:stroke-emerald-400 hover:stroke-2'
                  } else if (isEditMode && activeTool === 'grid_note') {
                    hoverClass = 'cursor-pointer hover:stroke-amber-400 hover:stroke-2'
                  } else {
                    // Players or view mode: strictly no hover effect
                    hoverClass = 'cursor-default'
                  }
                } else {
                  // Revealed cell
                  if (isEditMode) {
                    if (activeTool === 'hide_hex') {
                      hoverClass = 'cursor-pointer hover:fill-red-500/25 hover:stroke-red-400 hover:stroke-2'
                    } else if (activeTool === 'grid_note') {
                      hoverClass = 'cursor-pointer hover:fill-amber-500/20 hover:stroke-amber-400'
                    } else {
                      hoverClass = 'cursor-pointer hover:fill-white/5'
                    }
                  } else {
                    hoverClass = canShowNote ? 'cursor-pointer hover:fill-amber-500/10' : ''
                  }
                }

                // Clicks pass through revealed cells to pins and areas underneath when not in editing mode
                const shouldCaptureClicks = isHidden || (isEditMode && (activeTool === 'hide_hex' || activeTool === 'grid_note'))

                return (
                  <g key={cell.key}>
                    <polygon
                      points={cell.points}
                      fill={fillColor}
                      stroke="rgba(255, 255, 255, 0.18)"
                      strokeWidth="1"
                      vectorEffect="non-scaling-stroke"
                      className={`transition-colors duration-150 ${hoverClass}`}
                      style={{ pointerEvents: shouldCaptureClicks ? 'auto' : 'none' }}
                      onClick={(e) => handleCellClick(cell.key, e)}
                    >
                      {canShowNote && <title>{notesMap[cell.key]}</title>}
                    </polygon>
                    {canShowNote && (
                      <circle
                        cx={cell.cx}
                        cy={cell.cy}
                        r={Math.min(6, Math.max(3, gridSize * 0.08))}
                        fill="#f59e0b"
                        stroke="#0f172a"
                        strokeWidth="1.5"
                        className="cursor-pointer drop-shadow-[0_0_6px_rgba(245,158,11,0.8)]"
                        style={{ pointerEvents: 'auto' }}
                        onClick={(e) => handleCellClick(cell.key, e)}
                      />
                    )}
                  </g>
                )
              })}
            </svg>
          )}
        </div>
      </div>

      {/* DIALOG: PIN DETAILS / EDIT */}
      {selectedPin && (
        <Dialog open={!!selectedPin} onOpenChange={() => setSelectedPin(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-start justify-between gap-3">
                <DialogTitle className="flex items-center gap-2.5 text-lg font-bold">
                  <div
                    className="p-2 rounded-lg flex items-center justify-center shrink-0 shadow-md"
                    style={{ backgroundColor: selectedPin.color || '#a855f7' }}
                  >
                    {renderPinIcon(selectedPin.icon, "h-5 w-5 text-white")}
                  </div>
                  <div className="min-w-0">
                    <span className="break-words leading-tight block">{selectedPin.title}</span>
                    {selectedPin.gmOnly && (
                      <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                        <EyeOff className="h-3 w-3" /> Secret (GM Only)
                      </span>
                    )}
                  </div>
                </DialogTitle>
                {isOwner && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 text-xs"
                      onClick={() => {
                        setPinDraft({
                          id: selectedPin._id,
                          x: selectedPin.x,
                          y: selectedPin.y,
                          title: selectedPin.title,
                          description: selectedPin.description || '',
                          style: selectedPin.style || 'icon',
                          icon: selectedPin.icon || 'MapPin',
                          color: selectedPin.color || '#a855f7',
                          targetMapId: selectedPin.targetMapId,
                          layerId: selectedPin.layerId,
                          gmOnly: selectedPin.gmOnly || false,
                        })
                        setSelectedPin(null)
                        setIsPinDialogOpen(true)
                      }}
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        deletePinMutation({ pinId: selectedPin._id })
                        setSelectedPin(null)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </DialogHeader>
            <div className="space-y-4 text-sm leading-relaxed pt-2">
              {selectedPin.description ? (
                <p className="text-muted-foreground whitespace-pre-wrap">{selectedPin.description}</p>
              ) : (
                <p className="text-xs italic text-muted-foreground">No description provided.</p>
              )}
              {selectedPin.targetMapId && (
                <div className="pt-2 border-t border-border/40">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full gap-2 text-xs"
                    onClick={() => {
                      const target = worldMaps?.find((m) => m._id === selectedPin.targetMapId)
                      if (target) router.push(`/world/${encodeURIComponent(world.name)}/map/${target.slug}`)
                    }}
                  >
                    <Map className="h-3.5 w-3.5" />
                    Open Linked Map
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* DIALOG: CREATE / EDIT PIN FORM */}
      <Dialog
        open={isPinDialogOpen}
        onOpenChange={(open) => {
          setIsPinDialogOpen(open)
          if (!open) {
            setPinDraft({
              x: 50,
              y: 50,
              title: '',
              description: '',
              style: 'icon',
              icon: 'MapPin',
              color: '#a855f7',
              gmOnly: false,
            })
          }
        }}
      >
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{pinDraft.id ? 'Edit Map Pin' : 'Add Map Pin'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3.5 text-xs">
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
                placeholder="Details, secrets, lore..."
                rows={3}
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

            {/* Fantasy Icon Picker */}
            {pinDraft.style === 'icon' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-muted-foreground">Pin Icon</label>
                  <span className="text-[11px] text-muted-foreground font-medium">
                    {PIN_ICONS.find((i) => i.name === pinDraft.icon)?.label || pinDraft.icon}
                  </span>
                </div>
                <div className="grid grid-cols-7 gap-1.5 p-2 bg-muted/20 border border-border/50 rounded-lg max-h-36 overflow-y-auto">
                  {PIN_ICONS.map((item) => {
                    const isSelected = pinDraft.icon === item.name
                    const IconCmp = item.icon
                    return (
                      <button
                        key={item.name}
                        type="button"
                        title={item.label}
                        onClick={() => setPinDraft({ ...pinDraft, icon: item.name })}
                        className={`h-9 w-9 rounded-md flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background scale-105'
                            : 'bg-background/80 hover:bg-accent text-muted-foreground hover:text-foreground border border-border/40'
                        }`}
                      >
                        <IconCmp className="h-4 w-4" />
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Layer Selection (if layers present) */}
            {fullData?.layers && fullData.layers.length > 0 && (
              <div>
                <label className="font-bold text-muted-foreground">Layer (Optional)</label>
                <Select
                  value={pinDraft.layerId || 'none'}
                  onValueChange={(val) =>
                    setPinDraft({ ...pinDraft, layerId: val === 'none' ? undefined : (val as Id<'mapLayers'>) })
                  }
                >
                  <SelectTrigger><SelectValue placeholder="All Layers" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Default / All Layers</SelectItem>
                    {fullData.layers.map((l) => (
                      <SelectItem key={l._id} value={l._id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

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

            {/* GM Secret Toggle */}
            {isOwner && (
              <div className="flex items-center justify-between border border-border/60 bg-muted/20 px-3 py-2.5 rounded-md">
                <div className="space-y-0.5 pr-2">
                  <span className="font-bold flex items-center gap-1.5 text-xs text-foreground">
                    <EyeOff className="h-3.5 w-3.5 text-amber-400" />
                    Secret Pin (GM Only)
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Only visible to GM. Completely hidden from players.
                  </p>
                </div>
                <Switch
                  checked={pinDraft.gmOnly || false}
                  onCheckedChange={(val) => setPinDraft({ ...pinDraft, gmOnly: val })}
                />
              </div>
            )}
          </div>
          <DialogFooter className="pt-2">
            <Button size="sm" onClick={handleSavePin}>
              {pinDraft.id ? 'Update Pin' : 'Save Pin'}
            </Button>
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
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-muted-foreground">Width (px)</label>
                <Input
                  type="number"
                  value={settingsDraft.width}
                  onChange={(e) => setSettingsDraft({ ...settingsDraft, width: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="font-bold text-muted-foreground">Height (px)</label>
                <Input
                  type="number"
                  value={settingsDraft.height}
                  onChange={(e) => setSettingsDraft({ ...settingsDraft, height: Number(e.target.value) })}
                />
              </div>
            </div>
            {naturalDimensions && (
              <div className="flex items-center justify-between text-xs bg-muted/40 p-2 rounded-md border border-border/50">
                <span className="text-muted-foreground">
                  Detected Image Size: <strong className="text-foreground">{naturalDimensions.width} × {naturalDimensions.height} px</strong>
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setSettingsDraft({
                    ...settingsDraft,
                    width: naturalDimensions.width,
                    height: naturalDimensions.height,
                  })}
                >
                  Use Detected Size
                </Button>
              </div>
            )}
            
            {/* Grid & Exploration Settings */}
            <div className="border border-border/50 rounded-lg p-3.5 bg-muted/20 space-y-3.5">
              <div className="grid grid-cols-2 gap-3 items-end">
                <div className="min-w-0">
                  <label className="font-bold text-muted-foreground block mb-1">Grid Type</label>
                  <Select
                    value={settingsDraft.gridType}
                    onValueChange={(val: any) => setSettingsDraft({ ...settingsDraft, gridType: val })}
                    className="w-full min-w-0 h-9 bg-background/50 border-border/70"
                  >
                    <SelectTrigger className="w-full truncate"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="hex">Pointy Hex (Standard)</SelectItem>
                      <SelectItem value="hex_flat">Flat-top Hex</SelectItem>
                      <SelectItem value="square">Square Grid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-0">
                  <label className="font-bold text-muted-foreground block mb-1">Fog of War</label>
                  <div className="flex items-center justify-between border border-border/70 bg-background/50 px-3 h-9 rounded-md">
                    <span className="font-medium text-xs">Exploration Mode</span>
                    <Switch
                      checked={settingsDraft.isExplorationMap}
                      onCheckedChange={(val) => setSettingsDraft({ ...settingsDraft, isExplorationMap: val })}
                    />
                  </div>
                </div>
              </div>

              {settingsDraft.gridType !== 'none' && (
                <div className="space-y-3 pt-2 border-t border-border/40">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-muted-foreground">Grid Size (px)</label>
                      <span className="text-[11px] font-mono text-muted-foreground">{settingsDraft.gridSize || 100}px</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={() => {
                          const val = Math.max(25, (settingsDraft.gridSize || 100) - 5)
                          setSettingsDraft({ ...settingsDraft, gridSize: val })
                          setLiveGridSize(val)
                        }}
                      >
                        -
                      </Button>
                      <Input
                        type="number"
                        className="font-mono text-center h-9"
                        value={settingsDraft.gridSize}
                        onChange={(e) => {
                          const val = Number(e.target.value)
                          setSettingsDraft({ ...settingsDraft, gridSize: val })
                          setLiveGridSize(val)
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={() => {
                          const val = (settingsDraft.gridSize || 100) + 5
                          setSettingsDraft({ ...settingsDraft, gridSize: val })
                          setLiveGridSize(val)
                        }}
                      >
                        +
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="min-w-0">
                      <label className="font-bold text-muted-foreground block mb-1">Grid Offset X (px)</label>
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 shrink-0"
                          onClick={() => {
                            const val = (settingsDraft.gridOffsetX || 0) - 5
                            setSettingsDraft({ ...settingsDraft, gridOffsetX: val })
                            setLiveGridOffset({ x: val, y: settingsDraft.gridOffsetY || 0 })
                          }}
                          title="Nudge Left 5px"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          className="font-mono text-center h-9"
                          value={settingsDraft.gridOffsetX}
                          onChange={(e) => {
                            const val = Number(e.target.value)
                            setSettingsDraft({ ...settingsDraft, gridOffsetX: val })
                            setLiveGridOffset({ x: val, y: settingsDraft.gridOffsetY || 0 })
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 shrink-0"
                          onClick={() => {
                            const val = (settingsDraft.gridOffsetX || 0) + 5
                            setSettingsDraft({ ...settingsDraft, gridOffsetX: val })
                            setLiveGridOffset({ x: val, y: settingsDraft.gridOffsetY || 0 })
                          }}
                          title="Nudge Right 5px"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <label className="font-bold text-muted-foreground block mb-1">Grid Offset Y (px)</label>
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 shrink-0"
                          onClick={() => {
                            const val = (settingsDraft.gridOffsetY || 0) - 5
                            setSettingsDraft({ ...settingsDraft, gridOffsetY: val })
                            setLiveGridOffset({ x: settingsDraft.gridOffsetX || 0, y: val })
                          }}
                          title="Nudge Up 5px"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          className="font-mono text-center h-9"
                          value={settingsDraft.gridOffsetY}
                          onChange={(e) => {
                            const val = Number(e.target.value)
                            setSettingsDraft({ ...settingsDraft, gridOffsetY: val })
                            setLiveGridOffset({ x: settingsDraft.gridOffsetX || 0, y: val })
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 shrink-0"
                          onClick={() => {
                            const val = (settingsDraft.gridOffsetY || 0) + 5
                            setSettingsDraft({ ...settingsDraft, gridOffsetY: val })
                            setLiveGridOffset({ x: settingsDraft.gridOffsetX || 0, y: val })
                          }}
                          title="Nudge Down 5px"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Map Scale / Distance Calibration */}
                  <div className="pt-2 border-t border-border/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-muted-foreground flex items-center gap-1.5">
                        <Ruler className="h-3.5 w-3.5 text-cyan-400" />
                        Map Distance Scale (Optional)
                      </label>
                      <span className="text-[10px] text-muted-foreground">Used by Ruler tool</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-muted-foreground block mb-1">
                          Distance per {settingsDraft.gridType === 'square' ? 'Square' : 'Hex'}
                        </label>
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="e.g. 5, 24, 50"
                          value={settingsDraft.gridScale || ''}
                          onChange={(e) => setSettingsDraft({ ...settingsDraft, gridScale: Math.max(0, Number(e.target.value)) })}
                          className="h-9 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-muted-foreground block mb-1">Scale Unit</label>
                        <Select
                          value={settingsDraft.gridScaleUnit || 'miles'}
                          onValueChange={(val) => setSettingsDraft({ ...settingsDraft, gridScaleUnit: val })}
                        >
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="miles">Miles (mi)</SelectItem>
                            <SelectItem value="km">Kilometers (km)</SelectItem>
                            <SelectItem value="feet">Feet (ft)</SelectItem>
                            <SelectItem value="meters">Meters (m)</SelectItem>
                            <SelectItem value="leagues">Leagues</SelectItem>
                            <SelectItem value="days travel">Days Travel</SelectItem>
                            <SelectItem value="hours travel">Hours Travel</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground/80">
                      Example: 1 hex = {settingsDraft.gridScale || 1} {settingsDraft.gridScaleUnit || 'miles'}. When set, the Ruler measures real in-world travel distances.
                    </p>
                  </div>
                </div>
              )}
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
              <div className="flex items-start justify-between gap-3">
                <DialogTitle className="flex items-center gap-2.5 text-lg font-bold">
                  <div
                    className="h-5 w-5 rounded-full shrink-0 shadow-sm border border-white/20"
                    style={{ backgroundColor: selectedArea.color || '#a855f7' }}
                  />
                  <div className="min-w-0">
                    <span className="break-words leading-tight block">{selectedArea.name}</span>
                    {selectedArea.gmOnly && (
                      <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                        <EyeOff className="h-3 w-3" /> Secret (GM Only)
                      </span>
                    )}
                  </div>
                </DialogTitle>
                {isOwner && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 text-xs"
                      onClick={() => {
                        setAreaDraft({
                          id: selectedArea._id,
                          name: selectedArea.name,
                          description: selectedArea.description || '',
                          color: selectedArea.color || '#a855f7',
                          fillOpacity: selectedArea.fillOpacity ?? 0.3,
                          targetMapId: selectedArea.targetMapId,
                          layerId: selectedArea.layerId,
                          points: selectedArea.points || [],
                          gmOnly: selectedArea.gmOnly || false,
                        })
                        setSelectedArea(null)
                        setIsAreaDialogOpen(true)
                      }}
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        deleteAreaMutation({ areaId: selectedArea._id })
                        setSelectedArea(null)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </DialogHeader>
            <div className="space-y-4 text-sm leading-relaxed pt-2">
              {selectedArea.description ? (
                <p className="text-muted-foreground whitespace-pre-wrap">{selectedArea.description}</p>
              ) : (
                <p className="text-xs italic text-muted-foreground">No description provided for this area.</p>
              )}
              {selectedArea.targetMapId && (
                <div className="pt-2 border-t border-border/40">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full gap-2 text-xs"
                    onClick={() => {
                      const target = worldMaps?.find((m) => m._id === selectedArea.targetMapId)
                      if (target) router.push(`/world/${encodeURIComponent(world.name)}/map/${target.slug}`)
                    }}
                  >
                    <Map className="h-3.5 w-3.5" />
                    Open Linked Map
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* DIALOG: SAVE AREA DRAFT */}
      <Dialog
        open={isAreaDialogOpen}
        onOpenChange={(open) => {
          setIsAreaDialogOpen(open)
          if (!open) {
            setAreaDraft({
              name: '',
              description: '',
              color: '#a855f7',
              fillOpacity: 0.3,
              points: [],
              gmOnly: false,
            })
          }
        }}
      >
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {areaDraft.id ? 'Edit Area Details' : `Save Polygon Area (${areaDraft.points.length} points)`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3.5 text-xs">
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
                rows={3}
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

            {/* Layer selection if layers exist */}
            {fullData?.layers && fullData.layers.length > 0 && (
              <div>
                <label className="font-bold text-muted-foreground">Layer (Optional)</label>
                <Select
                  value={areaDraft.layerId || 'none'}
                  onValueChange={(val) =>
                    setAreaDraft({ ...areaDraft, layerId: val === 'none' ? undefined : (val as Id<'mapLayers'>) })
                  }
                >
                  <SelectTrigger><SelectValue placeholder="All Layers" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Default / All Layers</SelectItem>
                    {fullData.layers.map((l) => (
                      <SelectItem key={l._id} value={l._id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

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

            {/* GM Secret Toggle */}
            {isOwner && (
              <div className="flex items-center justify-between border border-border/60 bg-muted/20 px-3 py-2.5 rounded-md">
                <div className="space-y-0.5 pr-2">
                  <span className="font-bold flex items-center gap-1.5 text-xs text-foreground">
                    <EyeOff className="h-3.5 w-3.5 text-amber-400" />
                    Secret Area (GM Only)
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Dashed outline. Hidden from players, visible only to GM.
                  </p>
                </div>
                <Switch
                  checked={areaDraft.gmOnly || false}
                  onCheckedChange={(val) => setAreaDraft({ ...areaDraft, gmOnly: val })}
                />
              </div>
            )}
          </div>
          <DialogFooter className="pt-2">
            <Button size="sm" onClick={handleSaveArea}>
              {areaDraft.id ? 'Update Area' : 'Save Area'}
            </Button>
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
