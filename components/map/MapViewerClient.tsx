'use client'

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useAuth, useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { 
  ZoomIn, ZoomOut, Maximize2, Layers, MapPin, Eye, Edit3, Plus, 
  Trash2, Settings, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Map as MapIcon, FileText, Check, X, Grid, Lock, Unlock, Move, HelpCircle, Copy,
  Castle, Crown, Skull, Swords, Shield, Mountain, Tent, Beer, Anchor, Flame, TreePine, Sparkles, BookOpen, Coins, Compass, Gem, Crosshair, Flag, Ghost, EyeOff, Ruler, Search, RotateCcw, RefreshCw,
  Upload, ExternalLink, User, SlidersHorizontal
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { toast } from 'sonner'
import { Id } from '@/convex/_generated/dataModel'
import { formatWikiUrl } from '@/lib/utils'

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

export const MAX_MAP_ZOOM = 32

interface TilePyramidLayerProps {
  tileUrl: string
  mapWidth: number
  mapHeight: number
  scale: number
  position: { x: number; y: number }
  containerRef: React.RefObject<HTMLDivElement | null>
  viewportRef: React.RefObject<HTMLDivElement | null>
  tileSize?: number
  minZoom?: number
  maxZoom?: number
  imageUpdatedAt?: number
  opacity?: number
}

function TilePyramidLayer({
  tileUrl,
  mapWidth,
  mapHeight,
  scale,
  position,
  containerRef,
  viewportRef,
  tileSize = 256,
  minZoom = 0,
  maxZoom,
  imageUpdatedAt,
  opacity = 1,
}: TilePyramidLayerProps) {
  // Normalize DeepZoom template URL if user pasted a .dzi URL
  const normalizedTemplate = useMemo(() => {
    let url = (tileUrl || '').trim()
    if (url.endsWith('.dzi')) {
      url = url.replace(/\.dzi$/, '_files/{z}/{x}_{y}.webp')
    }
    return url
  }, [tileUrl])

  // Calculate maximum LOD level in DeepZoom pyramid
  const maxLevel = useMemo(() => {
    if (maxZoom !== undefined && maxZoom > 0) return maxZoom
    const maxDim = Math.max(mapWidth || 2000, mapHeight || 2000)
    return Math.ceil(Math.log2(maxDim))
  }, [mapWidth, mapHeight, maxZoom])

  // Determine current optimal LOD level z based on display scale and screen DPI
  // scale 1.0 = native resolution (level = maxLevel)
  // We include a quality bias and account for devicePixelRatio (Retina / high-DPI displays)
  // so tiles remain razor sharp and don't prematurely downsample into blurry lower mipmaps.
  const targetLevel = useMemo(() => {
    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1
    // Boost LOD selection for high-DPI screens or zoom transitions:
    // +0.5 to prefer sharper higher-res tiles rather than dropping to blurry lower-res early
    const dprBonus = Math.log2(Math.min(dpr, 2))
    const computedLevel = maxLevel + Math.log2(Math.max(scale, 0.0001)) + dprBonus + 0.35
    const clamped = Math.floor(computedLevel)
    return Math.max(minZoom, Math.min(maxLevel, clamped))
  }, [maxLevel, scale, minZoom])

  // Calculate level dimensions and grid
  const s = 1 / Math.pow(2, maxLevel - targetLevel)
  const levelW = Math.ceil(mapWidth * s)
  const levelH = Math.ceil(mapHeight * s)
  const tSize = tileSize || 256

  const numCols = Math.ceil(levelW / tSize)
  const numRows = Math.ceil(levelH / tSize)

  // Compute visible viewport bounds in map coordinate space [0..mapWidth, 0..mapHeight]
  const visibleTiles = useMemo(() => {
    let minCol = 0
    let maxCol = Math.max(0, numCols - 1)
    let minRow = 0
    let maxRow = Math.max(0, numRows - 1)

    if (containerRef.current && viewportRef.current) {
      const vRect = viewportRef.current.getBoundingClientRect()
      const cRect = containerRef.current.getBoundingClientRect()

      if (vRect.width > 0 && vRect.height > 0 && cRect.width > 0 && cRect.height > 0) {
        const visLeft = Math.max(0, (vRect.left - cRect.left) / scale)
        const visRight = Math.min(mapWidth, (vRect.right - cRect.left) / scale)
        const visTop = Math.max(0, (vRect.top - cRect.top) / scale)
        const visBottom = Math.min(mapHeight, (vRect.bottom - cRect.top) / scale)

        const lvlLeft = visLeft * s
        const lvlRight = visRight * s
        const lvlTop = visTop * s
        const lvlBottom = visBottom * s

        // 1 tile padding on all sides for smooth preloading during pan
        minCol = Math.max(0, Math.floor(lvlLeft / tSize) - 1)
        maxCol = Math.min(numCols - 1, Math.floor(lvlRight / tSize) + 1)
        minRow = Math.max(0, Math.floor(lvlTop / tSize) - 1)
        maxRow = Math.min(numRows - 1, Math.floor(lvlBottom / tSize) + 1)
      }
    }

    const tiles: { col: number; row: number; left: number; top: number; width: number; height: number; url: string }[] = []

    for (let col = minCol; col <= maxCol; col++) {
      for (let row = minRow; row <= maxRow; row++) {
        const xInLvl = col * tSize
        const yInLvl = row * tSize
        const wInLvl = Math.min(tSize, levelW - xInLvl)
        const hInLvl = Math.min(tSize, levelH - yInLvl)
        if (wInLvl <= 0 || hInLvl <= 0) continue

        const nativeLeft = xInLvl / s
        const nativeTop = yInLvl / s
        const nativeW = wInLvl / s
        const nativeH = hInLvl / s

        let formattedUrl = normalizedTemplate
          .replace(/\{z\}/g, String(targetLevel))
          .replace(/\{x\}/g, String(col))
          .replace(/\{y\}/g, String(row))

        if (imageUpdatedAt) {
          formattedUrl += (formattedUrl.includes('?') ? '&' : '?') + `t=${imageUpdatedAt}`
        }

        tiles.push({
          col,
          row,
          left: nativeLeft,
          top: nativeTop,
          width: nativeW,
          height: nativeH,
          url: formattedUrl,
        })
      }
    }

    return tiles
  }, [containerRef, viewportRef, mapWidth, mapHeight, scale, position, targetLevel, s, levelW, levelH, tSize, numCols, numRows, normalizedTemplate, imageUpdatedAt])

  if (!normalizedTemplate) return null

  return (
    <div
      className="absolute inset-0 pointer-events-none select-none overflow-hidden"
      style={{ width: `${mapWidth}px`, height: `${mapHeight}px`, opacity }}
    >
      {visibleTiles.map((tile) => (
        <img
          key={`${targetLevel}_${tile.col}_${tile.row}`}
          src={tile.url}
          alt=""
          loading="eager"
          decoding="async"
          draggable={false}
          className="absolute select-none pointer-events-none"
          style={{
            left: `${tile.left}px`,
            top: `${tile.top}px`,
            width: `${tile.width}px`,
            height: `${tile.height}px`,
            objectFit: 'fill',
            imageRendering: 'auto',
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
          }}
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
      ))}
    </div>
  )
}

export default function MapViewerClient() {
  const params = useParams()
  const router = useRouter()
  const { userId } = useAuth()
  const { user: clerkUser } = useUser()

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
  const deleteGridNoteMutation = useMutation(api.maps.deleteGridNote)
  const refreshMapImageMutation = useMutation(api.maps.refreshMapImage)

  // View state
  const isOwner = world ? userId === world.owner : false
  const [isEditMode, setIsEditMode] = useState(false)
  const [isRefreshingImage, setIsRefreshingImage] = useState(false)
  const [activeTool, setActiveTool] = useState<
    'view' | 'add_pin' | 'add_area' | 'reveal_hex' | 'hide_hex' | 'grid_note' | 'align_grid' | 'ruler'
  >('view')

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
  const hasDraggedPinRef = useRef(false)

  // Locations Directory state
  const [isLocationsMenuOpen, setIsLocationsMenuOpen] = useState(false)
  const [locationDirectoryTab, setLocationDirectoryTab] = useState<'pins' | 'areas'>('pins')
  const [locationSearch, setLocationSearch] = useState('')
  const [locationFilterLayer, setLocationFilterLayer] = useState<string>('all')

  // Touch pinch zoom state
  const touchDistanceRef = useRef<number | null>(null)
  const touchCenterRef = useRef<{ x: number; y: number } | null>(null)

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

  // Player Notes Visibility & Menu state
  const [showPlayerNotes, setShowPlayerNotes] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('void_map_show_notes')
      if (stored !== null) return stored === 'true'
    }
    return true
  })
  const [isTilePyramidEnabled, setIsTilePyramidEnabled] = useState(true)
  const [isNotesMenuOpen, setIsNotesMenuOpen] = useState(false)
  const [selectedNoteCoords, setSelectedNoteCoords] = useState<{ x: number; y: number } | null>(null)
  const [selectedNoteData, setSelectedNoteData] = useState<any>(null)

  // Map Processor Picker State
  const [isProcessorPickerOpen, setIsProcessorPickerOpen] = useState(false)
  const [processorTargetMode, setProcessorTargetMode] = useState<'newMap' | 'mapSettings' | 'layer'>('mapSettings')
  const [processorMaps, setProcessorMaps] = useState<any[]>([])
  const [isLoadingProcessorMaps, setIsLoadingProcessorMaps] = useState(false)

  const handleOpenProcessorPicker = async (target: 'newMap' | 'mapSettings' | 'layer') => {
    setProcessorTargetMode(target)
    setIsProcessorPickerOpen(true)
    setIsLoadingProcessorMaps(true)
    try {
      const processorUrl = process.env.NEXT_PUBLIC_MAP_PROCESSOR_URL || 'https://maps.tarragon.be'
      const res = await fetch(`${processorUrl}/api/maps`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setProcessorMaps(data.maps || [])
    } catch (err: any) {
      console.warn('Failed to load maps from processor:', err)
      toast.error('Could not load hosted maps from processor')
    } finally {
      setIsLoadingProcessorMaps(false)
    }
  }

  const handleSelectProcessorMap = (mapItem: any) => {
    const chosenImageUrl = mapItem.svgUrl || mapItem.imageUrl || ''
    const isSvg = Boolean(mapItem.svgUrl || (chosenImageUrl && chosenImageUrl.toLowerCase().endsWith('.svg')))
    // If the map is an SVG and tiles were generated from small native dimensions (e.g. < 500px),
    // do NOT attach low-res raster tiles that would mask the vector SVG!
    const isLowResTilePyramid = isSvg && mapItem.width && mapItem.width < 500
    const finalTileUrl = isLowResTilePyramid ? '' : (mapItem.tilesUrl || '')
    const defaultScaleMultiplier = isSvg && mapItem.width && mapItem.width < 500 ? 10 : 1
    const chosenWidth = mapItem.width ? Math.round(mapItem.width * defaultScaleMultiplier) : undefined
    const chosenHeight = mapItem.height ? Math.round(mapItem.height * defaultScaleMultiplier) : undefined

    if (processorTargetMode === 'newMap') {
      setNewMapDraft((prev) => ({
        ...prev,
        name: prev.name || mapItem.slug.replace(/[-_]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
        slug: prev.slug || mapItem.slug,
        imageUrl: chosenImageUrl || prev.imageUrl,
        tileUrl: finalTileUrl,
        width: chosenWidth || prev.width,
        height: chosenHeight || prev.height,
      }))
    } else if (processorTargetMode === 'mapSettings') {
      setSettingsDraft((prev) => ({
        ...prev,
        imageUrl: chosenImageUrl || prev.imageUrl,
        tileUrl: finalTileUrl,
        width: chosenWidth || prev.width,
        height: chosenHeight || prev.height,
        tileSize: mapItem.tileSize || 256,
        maxZoom: mapItem.maxZoom !== undefined ? mapItem.maxZoom : prev.maxZoom,
      }))
    } else if (processorTargetMode === 'layer') {
      setNewLayerDraft((prev) => ({
        ...prev,
        name: prev.name || mapItem.slug.replace(/[-_]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
        imageUrl: chosenImageUrl || '',
        tileUrl: finalTileUrl,
        tileSize: mapItem.tileSize || 256,
        maxZoom: mapItem.maxZoom !== undefined ? mapItem.maxZoom : prev.maxZoom,
      }))
    }
    setIsProcessorPickerOpen(false)
    if (isSvg) {
      toast.success(
        isLowResTilePyramid
          ? `Selected vector SVG "${mapItem.slug}"! Pure vector mode enabled (${chosenWidth}×${chosenHeight}px).`
          : `Selected vector SVG "${mapItem.slug}"!`
      )
    } else {
      toast.success(`Selected "${mapItem.slug}" from Map Processor!`)
    }
  }

  // Helper to parse processor map info from an entered URL (e.g., if user pastes svg, webp, jpeg, or tile URL)
  const extractProcessorSlugAndBase = (url: string) => {
    const trimmed = (url || '').trim()
    if (!trimmed) return null
    try {
      const parsed = new URL(trimmed)
      const pathname = parsed.pathname
      // Check for /<slug>.webp, /<slug>.svg, /<slug>.jpeg, /<slug>_tiles_files/..., /<slug>_tiles.dzi, /<slug>_tiles
      // Extracts the clean base map slug
      const match = pathname.match(/^\/?([a-zA-Z0-9_-]+?)(?:_tiles(?:_files.*|\.dzi)?|\.(?:webp|svg|png|jpg|jpeg))?(?:\/.*)?$/i)
      if (match && match[1]) {
        let slug = match[1]
        // In case suffix wasn't fully stripped:
        slug = slug.replace(/_tiles(_files)?$/, '').replace(/\.(webp|svg|png|jpg|jpeg)$/i, '')
        if (slug === 'api' || slug.length < 2) return null
        const baseUrl = `${parsed.protocol}//${parsed.host}`
        return { slug, baseUrl }
      }
    } catch {
      // Not a valid URL string yet
    }
    return null
  }

  // Auto-fetch tiles and metadata from processor if the entered URL matches a hosted processor map
  const checkAndFetchProcessorTiles = async (
    enteredUrl: string,
    target: 'newMap' | 'mapSettings' | 'layer'
  ) => {
    const extracted = extractProcessorSlugAndBase(enteredUrl)
    if (!extracted) return

    try {
      const res = await fetch(`${extracted.baseUrl}/api/maps/${encodeURIComponent(extracted.slug)}`)
      if (!res.ok) return
      const mapItem = await res.json()
      if (!mapItem || (!mapItem.tilesUrl && !mapItem.hasTiles)) return

      const chosenImageUrl = mapItem.svgUrl || mapItem.imageUrl || ''
      const isSvg = Boolean(mapItem.svgUrl || (chosenImageUrl && chosenImageUrl.toLowerCase().endsWith('.svg')))
      const isLowResTilePyramid = isSvg && mapItem.width && mapItem.width < 500
      const finalTileUrl = isLowResTilePyramid ? '' : (mapItem.tilesUrl || '')
      const defaultScaleMultiplier = isSvg && mapItem.width && mapItem.width < 500 ? 10 : 1
      const chosenWidth = mapItem.width ? Math.round(mapItem.width * defaultScaleMultiplier) : undefined
      const chosenHeight = mapItem.height ? Math.round(mapItem.height * defaultScaleMultiplier) : undefined

      if (target === 'newMap') {
        setNewMapDraft((prev) => {
          if (prev.tileUrl === finalTileUrl && prev.imageUrl) return prev
          return {
            ...prev,
            name: prev.name || mapItem.slug.replace(/[-_]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
            slug: prev.slug || mapItem.slug,
            imageUrl: chosenImageUrl || prev.imageUrl || '',
            tileUrl: finalTileUrl || prev.tileUrl || '',
            width: chosenWidth || prev.width,
            height: chosenHeight || prev.height,
          }
        })
        toast.success(`Found map details for "${mapItem.slug}"!`)
      } else if (target === 'mapSettings') {
        setSettingsDraft((prev) => {
          if (prev.tileUrl === finalTileUrl && prev.imageUrl) return prev
          return {
            ...prev,
            imageUrl: chosenImageUrl || prev.imageUrl || '',
            tileUrl: finalTileUrl || prev.tileUrl || '',
            width: chosenWidth || prev.width,
            height: chosenHeight || prev.height,
            tileSize: mapItem.tileSize || prev.tileSize || 256,
            maxZoom: mapItem.maxZoom !== undefined ? mapItem.maxZoom : prev.maxZoom,
          }
        })
        toast.success(
          isSvg
            ? `Found vector SVG for "${mapItem.slug}"! Scaled to ${chosenWidth}×${chosenHeight}px.`
            : `Found map tiles & dimensions for "${mapItem.slug}"!`
        )
      } else if (target === 'layer') {
        setNewLayerDraft((prev) => {
          if (prev.tileUrl === finalTileUrl && prev.imageUrl) return prev
          return {
            ...prev,
            name: prev.name || mapItem.slug.replace(/[-_]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
            imageUrl: chosenImageUrl || prev.imageUrl || '',
            tileUrl: finalTileUrl || prev.tileUrl || '',
            tileSize: mapItem.tileSize || prev.tileSize || 256,
            maxZoom: mapItem.maxZoom !== undefined ? mapItem.maxZoom : prev.maxZoom,
          }
        })
        toast.success(`Found layer info for "${mapItem.slug}"!`)
      }
    } catch (err) {
      console.debug('No processor tiles found for entered URL:', err)
    }
  }

  const handleCopyLink = (text: string, label: string) => {
    if (!text) return
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`Copied ${label} to clipboard!`)
    }).catch(() => {
      toast.error('Failed to copy to clipboard')
    })
  }

  // Selected item / edit draft states
  const [selectedPin, setSelectedPin] = useState<any>(null)
  const [selectedArea, setSelectedArea] = useState<any>(null)
  const [selectedCellKey, setSelectedCellKey] = useState<string | null>(null)
  const [draftNote, setDraftNote] = useState('')
  const [draftWikiLink, setDraftWikiLink] = useState('')

  // Reshaping polygon area state
  const [reshapingArea, setReshapingArea] = useState<{
    id: Id<'mapAreas'>
    name: string
    color: string
    points: { x: number; y: number }[]
    originalPoints: { x: number; y: number }[]
  } | null>(null)
  const [draggedVertexIndex, setDraggedVertexIndex] = useState<number | null>(null)
  const [isReshapingAddPointMode, setIsReshapingAddPointMode] = useState(false)

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
    tileUrl: '',
    tileSize: 256,
    minZoom: 0,
    maxZoom: undefined as number | undefined,
    width: 2000,
    height: 2000,
    gridType: 'none' as 'none' | 'hex' | 'hex_flat' | 'square',
    gridSize: 100,
    gridOffsetX: 0,
    gridOffsetY: 0,
    gridScale: 0,
    gridScaleUnit: 'miles',
    isExplorationMap: false,
    hideFromMenu: false,
  })

  // New Map Draft
  const [newMapDraft, setNewMapDraft] = useState({
    name: '',
    slug: '',
    isHomeMap: false,
    imageUrl: '',
    tileUrl: '',
    hideFromMenu: false,
    gridType: 'hex' as 'none' | 'hex' | 'hex_flat' | 'square',
    gridSize: 100,
    width: 2000,
    height: 2000,
  })

  // New Layer Draft
  const [newLayerDraft, setNewLayerDraft] = useState({
    name: '',
    imageUrl: '',
    tileUrl: '',
    tileSize: 256,
    maxZoom: undefined as number | undefined,
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
        tileUrl: currentMap.tileUrl || '',
        tileSize: currentMap.tileSize || 256,
        minZoom: currentMap.minZoom || 0,
        maxZoom: currentMap.maxZoom,
        width: currentMap.width || 2000,
        height: currentMap.height || 2000,
        gridType: currentMap.gridType || 'none',
        gridSize: currentMap.gridSize || 100,
        gridOffsetX: currentMap.gridOffsetX || 0,
        gridOffsetY: currentMap.gridOffsetY || 0,
        gridScale: currentMap.gridScale || 0,
        gridScaleUnit: currentMap.gridScaleUnit || 'miles',
        isExplorationMap: currentMap.isExplorationMap || false,
        hideFromMenu: currentMap.hideFromMenu || false,
      })
    }
  }, [currentMap])

  // Lock body scroll and set up non-passive wheel listener with focal zoom (zooming towards mouse cursor)
  useEffect(() => {
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleWheelNative = (e: WheelEvent) => {
      const viewport = viewportRef.current
      const container = containerRef.current
      if (!viewport || !container) return

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

        const newScale = Math.min(Math.max(currentScale * zoomFactor, 0.01), MAX_MAP_ZOOM)
        if (newScale === currentScale) return
        const k = newScale / currentScale

        // Use the container's live bounding rect to obtain its exact visual center on screen
        const cRect = container.getBoundingClientRect()
        const mapCenterX = cRect.left + cRect.width / 2
        const mapCenterY = cRect.top + cRect.height / 2

        // Vector from map visual center to mouse cursor
        const mouseOffsetX = e.clientX - mapCenterX
        const mouseOffsetY = e.clientY - mapCenterY

        // Adjust position so the point under the mouse cursor remains invariant
        const newX = currentPos.x + (1 - k) * mouseOffsetX
        const newY = currentPos.y + (1 - k) * mouseOffsetY

        scaleRef.current = newScale
        positionRef.current = { x: newX, y: newY }

        // Directly apply transform to container DOM element for instant 0ms latency response
        container.style.transform = `translate(${newX}px, ${newY}px) scale(${newScale})`

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
        if (reshapingArea) {
          setReshapingArea(null)
          setDraggedVertexIndex(null)
          setIsReshapingAddPointMode(false)
          toast.info('Area reshaping cancelled')
        }
        setIsLocationsMenuOpen(false)
        setIsLayersMenuOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeTool, areaDraft.points.length, reshapingArea])

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

    dragStartRef.current = { x: e.clientX - positionRef.current.x, y: e.clientY - positionRef.current.y }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggedVertexIndex !== null && reshapingArea) {
      const coords = getCanvasCoordinates(e as unknown as React.MouseEvent<HTMLDivElement>)
      setReshapingArea((prev) => {
        if (!prev) return null
        const newPoints = [...prev.points]
        newPoints[draggedVertexIndex] = coords
        return { ...prev, points: newPoints }
      })
      return
    }

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
        hasDraggedPinRef.current = true
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
    if (containerRef.current) {
      containerRef.current.style.transform = `translate(${newX}px, ${newY}px) scale(${scaleRef.current})`
    }
    setPosition({ x: newX, y: newY })
  }

  const handleMouseUp = () => {
    if (draggedVertexIndex !== null) {
      setDraggedVertexIndex(null)
      return
    }

    if (isMeasuring) {
      setIsMeasuring(false)
      return
    }

    if (draggingPinId && pinDragStartRef.current) {
      const wasMoved = pinDragStartRef.current.moved
      if (wasMoved && draggedPinOffset) {
        const pinToUpdate = draggingPinId
        const newX = Number(draggedPinOffset.x.toFixed(2))
        const newY = Number(draggedPinOffset.y.toFixed(2))
        hasDraggedPinRef.current = true
        updatePinPositionMutation({
          pinId: pinToUpdate,
          x: newX,
          y: newY,
        })
          .then(() => toast.success('Pin repositioned'))
          .catch(() => toast.error('Failed to move pin'))
      } else {
        hasDraggedPinRef.current = false
      }
      setDraggingPinId(null)
      setDraggedPinOffset(null)
      pinDragStartRef.current = null
      setTimeout(() => {
        hasDraggedPinRef.current = false
      }, 150)
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
      touchCenterRef.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      }
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
        x: e.touches[0].clientX - positionRef.current.x,
        y: e.touches[0].clientY - positionRef.current.y,
      }
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (draggedVertexIndex !== null && reshapingArea && e.touches.length === 1) {
      const touch = e.touches[0]
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const clickX = touch.clientX - rect.left
        const clickY = touch.clientY - rect.top
        const xPct = Math.min(Math.max((clickX / rect.width) * 100, 0), 100)
        const yPct = Math.min(Math.max((clickY / rect.height) * 100, 0), 100)
        const coords = { x: Number(xPct.toFixed(2)), y: Number(yPct.toFixed(2)) }
        setReshapingArea((prev) => {
          if (!prev) return null
          const newPoints = [...prev.points]
          newPoints[draggedVertexIndex] = coords
          return { ...prev, points: newPoints }
        })
      }
      return
    }

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

    if (draggingPinId && pinDragStartRef.current && e.touches.length === 1) {
      const dx = (e.touches[0].clientX - pinDragStartRef.current.clientX) / scale
      const dy = (e.touches[0].clientY - pinDragStartRef.current.clientY) / scale
      if (Math.hypot(dx, dy) > 4) {
        pinDragStartRef.current.moved = true
        hasDraggedPinRef.current = true
        const dxPercent = (dx / mapWidth) * 100
        const dyPercent = (dy / mapHeight) * 100
        const newX = Math.min(100, Math.max(0, pinDragStartRef.current.origX + dxPercent))
        const newY = Math.min(100, Math.max(0, pinDragStartRef.current.origY + dyPercent))
        setDraggedPinOffset({ x: newX, y: newY })
      }
      return
    }

    if (e.touches.length === 2 && touchDistanceRef.current !== null) {
      const container = containerRef.current
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      const currentTouchCenter = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      }

      if (dist > 0 && touchDistanceRef.current > 0) {
        const delta = dist / touchDistanceRef.current
        const currentScale = scaleRef.current
        const currentPos = positionRef.current
        const newScale = Math.min(Math.max(currentScale * delta, 0.01), MAX_MAP_ZOOM)
        const k = newScale / currentScale

        let newX = currentPos.x
        let newY = currentPos.y

        if (container) {
          const cRect = container.getBoundingClientRect()
          const mapCenterX = cRect.left + cRect.width / 2
          const mapCenterY = cRect.top + cRect.height / 2

          // Vector from visual map center to the midpoint of the pinch gesture
          const pinchOffsetX = currentTouchCenter.x - mapCenterX
          const pinchOffsetY = currentTouchCenter.y - mapCenterY

          // Adjust position so the point under the pinch center stays invariant while scaling
          newX = currentPos.x + (1 - k) * pinchOffsetX
          newY = currentPos.y + (1 - k) * pinchOffsetY

          // If the pinch center itself translated (two-finger pan), also apply translation delta
          if (touchCenterRef.current) {
            newX += (currentTouchCenter.x - touchCenterRef.current.x)
            newY += (currentTouchCenter.y - touchCenterRef.current.y)
          }

          container.style.transform = `translate(${newX}px, ${newY}px) scale(${newScale})`
        }

        scaleRef.current = newScale
        positionRef.current = { x: newX, y: newY }
        setScale(newScale)
        setPosition({ x: newX, y: newY })
        touchDistanceRef.current = dist
        touchCenterRef.current = currentTouchCenter
      }
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
      if (containerRef.current) {
        containerRef.current.style.transform = `translate(${newX}px, ${newY}px) scale(${scaleRef.current})`
      }
      setPosition({ x: newX, y: newY })
    }
  }

  const handleTouchEnd = () => {
    if (draggedVertexIndex !== null) {
      setDraggedVertexIndex(null)
      return
    }
    if (isMeasuring) {
      setIsMeasuring(false)
      return
    }
    if (draggingPinId && pinDragStartRef.current) {
      const wasMoved = pinDragStartRef.current.moved
      if (wasMoved && draggedPinOffset) {
        const pinToUpdate = draggingPinId
        const newX = Number(draggedPinOffset.x.toFixed(2))
        const newY = Number(draggedPinOffset.y.toFixed(2))
        hasDraggedPinRef.current = true
        updatePinPositionMutation({
          pinId: pinToUpdate,
          x: newX,
          y: newY,
        })
          .then(() => toast.success('Pin repositioned'))
          .catch(() => toast.error('Failed to move pin'))
      } else {
        hasDraggedPinRef.current = false
      }
      setDraggingPinId(null)
      setDraggedPinOffset(null)
      pinDragStartRef.current = null
      setTimeout(() => {
        hasDraggedPinRef.current = false
      }, 150)
      return
    }
    setIsDragging(false)
    touchDistanceRef.current = null
    touchCenterRef.current = null
  }

  // Zoom controls
  const handleZoomIn = () => {
    const newScale = Math.min(scaleRef.current * 1.25, MAX_MAP_ZOOM)
    scaleRef.current = newScale
    if (containerRef.current) {
      containerRef.current.style.transform = `translate(${positionRef.current.x}px, ${positionRef.current.y}px) scale(${newScale})`
    }
    setScale(newScale)
  }
  const handleZoomOut = () => {
    const newScale = Math.max(scaleRef.current * 0.8, 0.01)
    scaleRef.current = newScale
    if (containerRef.current) {
      containerRef.current.style.transform = `translate(${positionRef.current.x}px, ${positionRef.current.y}px) scale(${newScale})`
    }
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

    if (reshapingArea) {
      if (isReshapingAddPointMode) {
        setReshapingArea((prev) => prev ? { ...prev, points: [...prev.points, coords] } : null)
      }
      return
    }

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
    } else if (activeTool === 'grid_note') {
      const generatedKey = `point_${coords.x.toFixed(2)}_${coords.y.toFixed(2)}`
      setSelectedCellKey(generatedKey)
      setSelectedNoteCoords({ x: coords.x, y: coords.y })
      setSelectedNoteData(null)
      setDraftNote('')
      setDraftWikiLink('')
      setIsNoteDialogOpen(true)
    }
  }

  // Priority: if naturalDimensions detected and currentMap is on default 2000x2000, use natural dimensions.
  const mapWidth = (currentMap?.width && currentMap.width !== 2000)
    ? currentMap.width
    : (naturalDimensions?.width || currentMap?.width || 2000)
  const mapHeight = (currentMap?.height && currentMap.height !== 2000)
    ? currentMap.height
    : (naturalDimensions?.height || currentMap?.height || 2000)

  const fitMapToViewport = (w = mapWidth, h = mapHeight) => {
    if (!viewportRef.current) return
    const vw = viewportRef.current.clientWidth || window.innerWidth
    const vh = viewportRef.current.clientHeight || (window.innerHeight - 60)
    const padding = vw < 640 ? 16 : 48

    const scaleX = (vw - padding) / w
    const scaleY = (vh - padding) / h
    const fitScale = Math.min(scaleX, scaleY, 1)
    const safeScale = Math.max(fitScale, 0.01)
    const finalScale = Number(safeScale.toFixed(4))
    scaleRef.current = finalScale
    positionRef.current = { x: 0, y: 0 }
    if (containerRef.current) {
      containerRef.current.style.transform = `translate(0px, 0px) scale(${finalScale})`
    }
    setScale(finalScale)
    setPosition({ x: 0, y: 0 })
  }

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    const nw = img.naturalWidth
    const nh = img.naturalHeight
    if (nw && nh && (nw !== naturalDimensions?.width || nh !== naturalDimensions?.height)) {
      setNaturalDimensions({ width: nw, height: nh })
      const isSvg = Boolean(currentMap?.imageUrl?.toLowerCase().includes('.svg'))
      const shouldScaleSvg = isSvg && nw < 800
      const targetWidth = shouldScaleSvg ? Math.round(nw * 10) : nw
      const targetHeight = shouldScaleSvg ? Math.round(nh * 10) : nh

      fitMapToViewport(targetWidth, targetHeight)
      hasAutoFittedRef.current = true

      // If the map is still stored with default 2000x2000 square dimensions, persist real or scaled SVG dimensions
      if (currentMap && isOwner && (currentMap.width === 2000 && currentMap.height === 2000) && targetWidth > 0 && targetHeight > 0) {
        updateMapSettingsMutation({
          mapId: currentMap._id,
          width: targetWidth,
          height: targetHeight,
        }).catch((err) => {
          console.warn('Could not auto-persist detected map dimensions:', err)
        })
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

  // Automatically deactivate ruler tool if no grid is configured on the map
  useEffect(() => {
    if (gridType === 'none' && activeTool === 'ruler') {
      setActiveTool('view')
      setRulerPoints(null)
      setIsMeasuring(false)
    }
  }, [gridType, activeTool])

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

  const noteObjMap = useMemo(() => {
    const map: Record<string, any> = {}
    fullData?.notes.forEach((n) => {
      map[n.cellKey] = n
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

  // Search & Filtered Areas for Locations Directory
  const filteredAreas = useMemo(() => {
    if (!fullData?.areas) return []
    return fullData.areas.filter((area) => {
      if (locationFilterLayer !== 'all' && area.layerId !== locationFilterLayer) {
        return false
      }
      if (locationSearch.trim()) {
        const q = locationSearch.toLowerCase()
        const nameMatch = area.name.toLowerCase().includes(q)
        const descMatch = area.description ? area.description.toLowerCase().includes(q) : false
        return nameMatch || descMatch
      }
      return true
    })
  }, [fullData?.areas, locationFilterLayer, locationSearch])

  // Filtered Maps for Top-Left Switcher Dropdown (Hidden maps visible only to owner)
  const dropdownMaps = useMemo(() => {
    if (!worldMaps) return []
    if (isOwner) return worldMaps
    return worldMaps.filter((m) => !m.hideFromMenu)
  }, [worldMaps, isOwner])

  // Distance Measurement Calculation
  const getRulerDistance = () => {
    if (!rulerPoints || gridType === 'none') return null
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

  // Helper: compute cell center {cx, cy} and SVG polygon points for any (c, r) coordinate
  const getCellGeometry = useCallback(
    (c: number, r: number) => {
      const effectiveGridSize = Math.max(25, currentGridSize)
      const ox = currentOffsetX
      const oy = currentOffsetY

      if (gridType === 'hex') {
        const W = effectiveGridSize
        const R = W / Math.sqrt(3)
        const deltaY = 1.5 * R
        const isOdd = Math.abs(r) % 2 === 1
        const cy = oy + R + r * deltaY
        const cx = ox + (c + (isOdd ? 0.5 : 0)) * W + W / 2
        const points = [
          `${cx.toFixed(2)},${(cy - R).toFixed(2)}`,
          `${(cx + W / 2).toFixed(2)},${(cy - R / 2).toFixed(2)}`,
          `${(cx + W / 2).toFixed(2)},${(cy + R / 2).toFixed(2)}`,
          `${cx.toFixed(2)},${(cy + R).toFixed(2)}`,
          `${(cx - W / 2).toFixed(2)},${(cy + R / 2).toFixed(2)}`,
          `${(cx - W / 2).toFixed(2)},${(cy - R / 2).toFixed(2)}`,
        ].join(' ')
        return { cx, cy, points }
      } else if (gridType === 'hex_flat') {
        const H = effectiveGridSize
        const R = H / Math.sqrt(3)
        const deltaX = 1.5 * R
        const isOdd = Math.abs(c) % 2 === 1
        const cx = ox + R + c * deltaX
        const cy = oy + (r + (isOdd ? 0.5 : 0)) * H + H / 2
        const points = [
          `${(cx - R).toFixed(2)},${cy.toFixed(2)}`,
          `${(cx - R / 2).toFixed(2)},${(cy - H / 2).toFixed(2)}`,
          `${(cx + R / 2).toFixed(2)},${(cy - H / 2).toFixed(2)}`,
          `${(cx + R).toFixed(2)},${cy.toFixed(2)}`,
          `${(cx + R / 2).toFixed(2)},${(cy + H / 2).toFixed(2)}`,
          `${(cx - R / 2).toFixed(2)},${(cy + H / 2).toFixed(2)}`,
        ].join(' ')
        return { cx, cy, points }
      } else if (gridType === 'square') {
        const size = effectiveGridSize
        const x = ox + c * size
        const y = oy + r * size
        const points = [
          `${x},${y}`,
          `${x + size},${y}`,
          `${x + size},${y + size}`,
          `${x},${y + size}`,
        ].join(' ')
        return { cx: x + size / 2, cy: y + size / 2, points }
      }
      return null
    },
    [gridType, currentGridSize, currentOffsetX, currentOffsetY]
  )

  // Standard bounded map grid calculation with border over-tiling
  const gridCells = useMemo(() => {
    if (gridType === 'none') return []
    const effectiveGridSize = Math.max(25, currentGridSize)
    const ox = currentOffsetX
    const oy = currentOffsetY
    const pad = 2

    let minC = 0
    let maxC = 0
    let minR = 0
    let maxR = 0

    // Standard bounded map: tile over the map dimensions [0..mapWidth, 0..mapHeight]
    if (gridType === 'hex') {
      const W = effectiveGridSize
      const deltaY = 1.5 * (W / Math.sqrt(3))
      minC = Math.floor(-ox / W) - pad
      maxC = Math.ceil((mapWidth - ox) / W) + pad
      minR = Math.floor(-oy / deltaY) - pad
      maxR = Math.ceil((mapHeight - oy) / deltaY) + pad
    } else if (gridType === 'hex_flat') {
      const H = effectiveGridSize
      const deltaX = 1.5 * (H / Math.sqrt(3))
      minC = Math.floor(-ox / deltaX) - pad
      maxC = Math.ceil((mapWidth - ox) / deltaX) + pad
      minR = Math.floor(-oy / H) - pad
      maxR = Math.ceil((mapHeight - oy) / H) + pad
    } else if (gridType === 'square') {
      const size = effectiveGridSize
      minC = Math.floor(-ox / size) - pad
      maxC = Math.ceil((mapWidth - ox) / size) + pad
      minR = Math.floor(-oy / size) - pad
      maxR = Math.ceil((mapHeight - oy) / size) + pad
    }

    // Limit columns and rows to 500 to keep rendering performant
    const colCount = Math.min(Math.max(0, maxC - minC + 1), 500)
    const rowCount = Math.min(Math.max(0, maxR - minR + 1), 500)

    const cellMap = new Map<string, { key: string; c: number; r: number; cx: number; cy: number; points: string }>()

    for (let rIdx = 0; rIdx < rowCount; rIdx++) {
      const r = minR + rIdx
      for (let cIdx = 0; cIdx < colCount; cIdx++) {
        const c = minC + cIdx
        const geom = getCellGeometry(c, r)
        if (geom) {
          const key = `${c},${r}`
          cellMap.set(key, { key, c, r, cx: geom.cx, cy: geom.cy, points: geom.points })
        }
      }
    }

    // Always include explicit cells with notes
    const explicitKeys = new Set<string>()
    if (fullData?.notes) {
      fullData.notes.forEach((n) => {
        if (n.cellKey && !n.cellKey.startsWith('point_')) explicitKeys.add(n.cellKey)
      })
    }

    explicitKeys.forEach((key) => {
      if (!cellMap.has(key)) {
        const parts = key.split(',')
        if (parts.length === 2) {
          const c = Number(parts[0])
          const r = Number(parts[1])
          if (!isNaN(c) && !isNaN(r)) {
            const geom = getCellGeometry(c, r)
            if (geom) {
              cellMap.set(key, { key, c, r, cx: geom.cx, cy: geom.cy, points: geom.points })
            }
          }
        }
      }
    })

    return Array.from(cellMap.values())
  }, [
    gridType,
    currentGridSize,
    currentOffsetX,
    currentOffsetY,
    mapWidth,
    mapHeight,
    currentMap?.revealedCells,
    fullData?.notes,
    getCellGeometry,
  ])

  // Lookup for cell center coordinates { cx, cy } by cell key
  const cellCenterMap = useMemo(() => {
    const map: Record<string, { cx: number; cy: number }> = {}
    gridCells.forEach((cell) => {
      map[cell.key] = { cx: cell.cx, cy: cell.cy }
    })
    return map
  }, [gridCells])

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
    } else if (activeTool === 'grid_note' || (showPlayerNotes && !!notesMap[cellKey])) {
      // Open note dialog for cell
      setSelectedCellKey(cellKey)
      const existingNote = noteObjMap[cellKey]
      setSelectedNoteData(existingNote || null)
      setDraftNote(existingNote?.note || notesMap[cellKey] || '')
      setDraftWikiLink(existingNote?.wikiLink || '')
      if (existingNote?.x !== undefined && existingNote?.y !== undefined) {
        setSelectedNoteCoords({ x: existingNote.x, y: existingNote.y })
      } else {
        const foundCell = gridCells.find((c) => c.key === cellKey)
        if (foundCell) {
          const xPct = Number(((foundCell.cx / mapWidth) * 100).toFixed(2))
          const yPct = Number(((foundCell.cy / mapHeight) * 100).toFixed(2))
          setSelectedNoteCoords({ x: xPct, y: yPct })
        } else {
          setSelectedNoteCoords(null)
        }
      }
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

  // Start reshaping an existing area
  const handleStartReshaping = (area: any) => {
    setSelectedArea(null)
    setIsEditMode(true)
    setActiveTool('view')
    setReshapingArea({
      id: area._id,
      name: area.name,
      color: area.color || '#a855f7',
      points: [...area.points],
      originalPoints: [...area.points],
    })
    setDraggedVertexIndex(null)
    setIsReshapingAddPointMode(false)

    // Center viewport on area centroid
    if (area.points && area.points.length > 0) {
      const avgX = area.points.reduce((acc: number, p: any) => acc + p.x, 0) / area.points.length
      const avgY = area.points.reduce((acc: number, p: any) => acc + p.y, 0) / area.points.length
      const targetPxX = (avgX / 100) * mapWidth - mapWidth / 2
      const targetPxY = (avgY / 100) * mapHeight - mapHeight / 2
      const newScale = Math.max(scaleRef.current, 1.0)
      scaleRef.current = newScale
      setScale(newScale)
      positionRef.current = { x: -targetPxX * newScale, y: -targetPxY * newScale }
      setPosition({ x: -targetPxX * newScale, y: -targetPxY * newScale })
    }
  }

  const handleVertexMouseDown = (index: number, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setDraggedVertexIndex(index)
  }

  const handleVertexTouchStart = (index: number, e: React.TouchEvent) => {
    e.stopPropagation()
    setDraggedVertexIndex(index)
  }

  const handleInsertVertex = (insertIndex: number, x: number, y: number) => {
    setReshapingArea((prev) => {
      if (!prev) return null
      const newPoints = [...prev.points]
      newPoints.splice(insertIndex, 0, { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) })
      return { ...prev, points: newPoints }
    })
    toast.info(`Inserted vertex at position ${insertIndex + 1}`)
  }

  const handleDeleteVertex = (vertexIndex: number) => {
    setReshapingArea((prev) => {
      if (!prev) return null
      if (prev.points.length <= 3) {
        toast.error('An area polygon must have at least 3 vertices')
        return prev
      }
      const newPoints = prev.points.filter((_, idx) => idx !== vertexIndex)
      toast.info(`Removed vertex ${vertexIndex + 1}`)
      return { ...prev, points: newPoints }
    })
  }

  const handleSaveReshapedArea = async () => {
    if (!reshapingArea || !currentMap) return
    if (reshapingArea.points.length < 3) {
      toast.error('An area must have at least 3 points')
      return
    }
    try {
      const existingArea = fullData?.areas.find((a) => a._id === reshapingArea.id)
      if (!existingArea) throw new Error('Area not found')
      await saveAreaMutation({
        mapId: currentMap._id,
        areaId: reshapingArea.id,
        layerId: existingArea.layerId,
        name: existingArea.name,
        description: existingArea.description,
        points: reshapingArea.points,
        color: existingArea.color,
        fillOpacity: existingArea.fillOpacity,
        targetMapId: existingArea.targetMapId,
        gmOnly: existingArea.gmOnly,
      })
      toast.success(`Shape updated for "${reshapingArea.name}"!`)
      setReshapingArea(null)
      setDraggedVertexIndex(null)
      setIsReshapingAddPointMode(false)
    } catch (err: any) {
      toast.error(err.message || 'Failed to update area shape')
    }
  }

  const handleCancelReshape = () => {
    setReshapingArea(null)
    setDraggedVertexIndex(null)
    setIsReshapingAddPointMode(false)
  }

  // Open Note by object
  const handleOpenNote = (noteObj: any) => {
    setSelectedCellKey(noteObj.cellKey)
    setSelectedNoteData(noteObj)
    setDraftNote(noteObj.note || '')
    setDraftWikiLink(noteObj.wikiLink || '')
    if (noteObj.x !== undefined && noteObj.y !== undefined) {
      setSelectedNoteCoords({ x: noteObj.x, y: noteObj.y })
    } else {
      const foundCell = gridCells.find((c) => c.key === noteObj.cellKey)
      if (foundCell) {
        const xPct = Number(((foundCell.cx / mapWidth) * 100).toFixed(2))
        const yPct = Number(((foundCell.cy / mapHeight) * 100).toFixed(2))
        setSelectedNoteCoords({ x: xPct, y: yPct })
      } else {
        setSelectedNoteCoords(null)
      }
    }
    setIsNoteDialogOpen(true)
  }

  // Save Note Handler
  const handleSaveNote = async () => {
    if (!currentMap || !selectedCellKey) return
    const authorName = clerkUser?.firstName || clerkUser?.fullName || clerkUser?.username || 'Adventurer'
    try {
      await saveGridNoteMutation({
        mapId: currentMap._id,
        cellKey: selectedCellKey,
        x: selectedNoteCoords?.x,
        y: selectedNoteCoords?.y,
        note: draftNote,
        wikiLink: draftWikiLink.trim() || undefined,
        authorName,
      })
      toast.success('Note saved!')
      setIsNoteDialogOpen(false)
      setActiveTool('view')
    } catch (err: any) {
      toast.error(err.message || 'Failed to save note')
    }
  }

  // Delete Note Handler
  const handleDeleteNote = async (noteId?: Id<'mapGridNotes'>) => {
    const idToDelete = noteId || selectedNoteData?._id
    if (!idToDelete) {
      // If no ID exists yet (unsaved), simply close dialog
      setIsNoteDialogOpen(false)
      return
    }
    try {
      await deleteGridNoteMutation({ noteId: idToDelete })
      toast.success('Note deleted')
      setIsNoteDialogOpen(false)
      setSelectedNoteData(null)
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete note')
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
        imageUrl: newMapDraft.imageUrl || undefined,
        tileUrl: newMapDraft.tileUrl || undefined,
        hideFromMenu: newMapDraft.hideFromMenu,
        gridType: newMapDraft.gridType,
        gridSize: newMapDraft.gridSize || 100,
        width: newMapDraft.width || 2000,
        height: newMapDraft.height || 2000,
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
      const widthVal = Number(settingsDraft.width)
      const heightVal = Number(settingsDraft.height)
      const gridSizeVal = Number(settingsDraft.gridSize)
      const gridOffsetValX = Number(settingsDraft.gridOffsetX)
      const gridOffsetValY = Number(settingsDraft.gridOffsetY)
      const gridScaleVal = Number(settingsDraft.gridScale)
      const tileSizeVal = Number(settingsDraft.tileSize)
      const minZoomVal = Number(settingsDraft.minZoom)
      const maxZoomVal = settingsDraft.maxZoom !== undefined ? Number(settingsDraft.maxZoom) : undefined

      await updateMapSettingsMutation({
        mapId: currentMap._id,
        name: settingsDraft.name,
        slug: settingsDraft.slug,
        isHomeMap: settingsDraft.isHomeMap,
        imageUrl: settingsDraft.imageUrl.trim(),
        tileUrl: settingsDraft.tileUrl.trim(),
        tileSize: !isNaN(tileSizeVal) && tileSizeVal > 0 ? tileSizeVal : 256,
        minZoom: !isNaN(minZoomVal) ? minZoomVal : 0,
        maxZoom: maxZoomVal !== undefined && !isNaN(maxZoomVal) ? maxZoomVal : undefined,
        width: !isNaN(widthVal) && widthVal > 0 ? widthVal : (currentMap.width || 2000),
        height: !isNaN(heightVal) && heightVal > 0 ? heightVal : (currentMap.height || 2000),
        gridType: settingsDraft.gridType,
        gridSize: !isNaN(gridSizeVal) && gridSizeVal > 0 ? gridSizeVal : 100,
        gridOffsetX: !isNaN(gridOffsetValX) ? gridOffsetValX : 0,
        gridOffsetY: !isNaN(gridOffsetValY) ? gridOffsetValY : 0,
        gridScale: !isNaN(gridScaleVal) ? gridScaleVal : 0,
        gridScaleUnit: settingsDraft.gridScaleUnit,
        isExplorationMap: settingsDraft.isExplorationMap,
        hideFromMenu: settingsDraft.hideFromMenu,
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

  // Force Reload Image from Host (Cache-Busting)
  const getCacheBustedUrl = (url?: string, timestamp?: number) => {
    if (!url) return ''
    if (!timestamp) return url
    return `${url}${url.includes('?') ? '&' : '?'}t=${timestamp}`
  }

  const handleForceRefreshImage = async () => {
    if (!currentMap) return
    setIsRefreshingImage(true)
    try {
      await refreshMapImageMutation({ mapId: currentMap._id })
      toast.success('Map image reloaded from source!')
    } catch (err: any) {
      toast.error(err.message || 'Failed to reload map image')
    } finally {
      setTimeout(() => setIsRefreshingImage(false), 800)
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
      const tileSizeVal = Number(newLayerDraft.tileSize)
      const maxZoomVal = newLayerDraft.maxZoom !== undefined ? Number(newLayerDraft.maxZoom) : undefined

      await addLayerMutation({
        mapId: currentMap._id,
        name: newLayerDraft.name,
        imageUrl: newLayerDraft.imageUrl || undefined,
        tileUrl: newLayerDraft.tileUrl || undefined,
        tileSize: !isNaN(tileSizeVal) && tileSizeVal > 0 ? tileSizeVal : 256,
        maxZoom: maxZoomVal !== undefined && !isNaN(maxZoomVal) ? maxZoomVal : undefined,
        defaultEnabled: newLayerDraft.defaultEnabled,
        allowUserToggle: newLayerDraft.allowUserToggle,
      })
      toast.success('Layer added!')
      setIsLayerDialogOpen(false)
      setNewLayerDraft({ name: '', imageUrl: '', tileUrl: '', tileSize: 256, maxZoom: undefined, defaultEnabled: true, allowUserToggle: true })
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
            <MapIcon className="h-8 w-8" />
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
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-muted-foreground">Tile Pyramid URL Template</label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[11px] gap-1 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/40"
                    onClick={() => handleOpenProcessorPicker('newMap')}
                  >
                    <Layers className="h-3 w-3" />
                    Browse Hosted Maps
                  </Button>
                </div>
                <Input
                  value={newMapDraft.tileUrl}
                  onChange={(e) => {
                    const val = e.target.value
                    setNewMapDraft({ ...newMapDraft, tileUrl: val })
                  }}
                  onBlur={(e) => checkAndFetchProcessorTiles(e.target.value, 'newMap')}
                  placeholder="https://maps.tarragon.be/slug_tiles_files/{z}/{x}_{y}.webp"
                />
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  DeepZoom tile pyramid format. Supports fast multi-resolution streaming.
                </p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-muted-foreground">Background Image URL (Fallback / Standalone)</label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[11px] gap-1 text-purple-400 hover:text-purple-300 hover:bg-purple-950/40"
                    asChild
                  >
                    <a href="https://maps.tarragon.be" target="_blank" rel="noopener noreferrer" title="Upload new map image on maps.tarragon.be">
                      <Upload className="h-3 w-3" />
                      Upload to Processor
                      <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                    </a>
                  </Button>
                </div>
                <Input
                  value={newMapDraft.imageUrl}
                  onChange={(e) => {
                    const val = e.target.value
                    setNewMapDraft({ ...newMapDraft, imageUrl: val })
                    // Auto-fetch if pasted or typed
                    if (val.includes('.webp') || val.includes('_tiles')) {
                      checkAndFetchProcessorTiles(val, 'newMap')
                    }
                  }}
                  onBlur={(e) => checkAndFetchProcessorTiles(e.target.value, 'newMap')}
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
              <div className="flex items-center justify-between pt-2 border-t border-border/40">
                <div className="space-y-0.5 pr-2">
                  <span className="font-bold flex items-center gap-1.5 text-xs text-foreground">
                    <EyeOff className="h-3.5 w-3.5 text-amber-400" />
                    Hide from Map Switcher
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Hidden from players in the dropdown. Navigable via linked markers.
                  </p>
                </div>
                <Switch
                  checked={newMapDraft.hideFromMenu || false}
                  onCheckedChange={(val) => setNewMapDraft({ ...newMapDraft, hideFromMenu: val })}
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
        <div className="flex items-center gap-2 pointer-events-auto bg-slate-950 dark:bg-slate-950 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700/80 shadow-xl text-slate-100">
          <Button variant="ghost" size="sm" className="h-8 px-2 text-slate-200 hover:text-white hover:bg-slate-900" asChild>
            <Link href={`/world/${encodeURIComponent(world.name)}`}>
              <ChevronLeft className="h-4 w-4 mr-1 text-slate-400" />
              {world.name}
            </Link>
          </Button>
          <span className="text-slate-500">/</span>

          {/* MAP SWITCHER DROPDOWN */}
          <Select
            value={currentMap?._id}
            onValueChange={(val) => {
              const target = worldMaps?.find((m) => m._id === val)
              if (target) {
                router.push(`/world/${encodeURIComponent(world.name)}/map/${target.slug}`)
              }
            }}
            className="h-8 border-none bg-transparent focus:ring-0 text-sm font-bold text-purple-400 gap-2 px-2 hover:text-purple-300 cursor-pointer"
          >
            <SelectTrigger className="h-8 border-none bg-transparent focus:ring-0 text-sm font-bold text-purple-400 gap-2 px-2 hover:text-purple-300">
              <SelectValue placeholder={currentMap?.name || "Select Map"} />
            </SelectTrigger>
            <SelectContent>
              {dropdownMaps.map((m) => (
                <SelectItem key={m._id} value={m._id}>
                  <span className="flex items-center gap-1.5">
                    <span>{m.name}</span>
                    {m.isHomeMap && <span>🏠</span>}
                    {m.hideFromMenu && isOwner && (
                      <span className="text-[10px] text-amber-400 font-medium px-1.5 py-0.5 bg-amber-500/20 border border-amber-500/30 rounded inline-flex items-center gap-0.5">
                        <EyeOff className="h-2.5 w-2.5" /> Hidden
                      </span>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isOwner && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-900"
              onClick={() => setIsNewMapDialogOpen(true)}
              title="Add New Map"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* TOP RIGHT CONTROLS (LOCATIONS, RULER, LAYERS & SETTINGS) */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* LOCATIONS DIRECTORY BUTTON */}
          <Button
            variant="ghost"
            size="sm"
            className={`h-9 gap-1.5 bg-slate-950 dark:bg-slate-950 text-slate-100 hover:text-white hover:bg-slate-900 dark:hover:bg-slate-900 border border-slate-700/80 shadow-xl backdrop-blur-md ${
              isLocationsMenuOpen ? 'ring-2 ring-cyan-500/60 bg-slate-900 dark:bg-slate-900 text-cyan-300' : ''
            }`}
            onClick={() => {
              setIsLocationsMenuOpen(!isLocationsMenuOpen)
              if (isLayersMenuOpen) setIsLayersMenuOpen(false)
            }}
            title="Browse Map Locations"
          >
            <Compass className="h-4 w-4 text-cyan-400" />
            <span className="hidden sm:inline font-medium">Locations</span>
            {fullData?.pins && fullData.pins.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 bg-slate-800 border border-slate-700 rounded-full text-[10px] font-mono text-slate-300">
                {fullData.pins.length}
              </span>
            )}
          </Button>

          {/* RULER MEASURE BUTTON */}
          {gridType !== 'none' && (
            <Button
              variant="ghost"
              size="sm"
              className={`h-9 gap-1.5 bg-slate-950 dark:bg-slate-950 text-slate-100 hover:text-white hover:bg-slate-900 dark:hover:bg-slate-900 border border-slate-700/80 shadow-xl backdrop-blur-md ${
                activeTool === 'ruler' ? 'text-cyan-400 border-cyan-500/80 bg-slate-900 dark:bg-slate-900 ring-2 ring-cyan-500/60' : ''
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
              <span className="hidden sm:inline font-medium">Ruler</span>
            </Button>
          )}


          {/* NOTES MENU BUTTON */}
          <Button
            variant="ghost"
            size="sm"
            className={`h-9 gap-1.5 bg-slate-950 dark:bg-slate-950 text-slate-100 hover:text-white hover:bg-slate-900 dark:hover:bg-slate-900 border border-slate-700/80 shadow-xl backdrop-blur-md ${
              isNotesMenuOpen ? 'ring-2 ring-amber-500/60 bg-slate-900 dark:bg-slate-900 text-amber-300' : ''
            }`}
            onClick={() => {
              setIsNotesMenuOpen(!isNotesMenuOpen)
              if (isLocationsMenuOpen) setIsLocationsMenuOpen(false)
              if (isLayersMenuOpen) setIsLayersMenuOpen(false)
            }}
            title="Notes on Map"
          >
            <FileText className={`h-4 w-4 ${showPlayerNotes ? 'text-amber-400' : 'text-slate-500'}`} />
            <span className="hidden sm:inline font-medium">Notes</span>
            {fullData?.notes && fullData.notes.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 bg-slate-800 border border-slate-700 rounded-full text-[10px] font-mono text-amber-400">
                {fullData.notes.length}
              </span>
            )}
            {!showPlayerNotes && (
              <EyeOff className="h-3 w-3 text-slate-500 ml-0.5" />
            )}
          </Button>

          {/* LAYERS TOGGLE */}
          <Button
            variant="ghost"
            size="sm"
            className={`h-9 gap-2 bg-slate-950 dark:bg-slate-950 text-slate-100 hover:text-white hover:bg-slate-900 dark:hover:bg-slate-900 border border-slate-700/80 shadow-xl backdrop-blur-md ${
              isLayersMenuOpen ? 'ring-2 ring-purple-500/60 bg-slate-900 dark:bg-slate-900 text-purple-300' : ''
            }`}
            onClick={() => {
              setIsLayersMenuOpen(!isLayersMenuOpen)
              if (isLocationsMenuOpen) setIsLocationsMenuOpen(false)
            }}
            title="Toggle Map Layers"
          >
            <Layers className="h-4 w-4 text-purple-400" />
            <span className="hidden sm:inline font-medium">Layers</span>
          </Button>

          {/* EDIT / VIEW MODE TOGGLE FOR OWNER */}
          {isOwner && (
            <div className="flex items-center bg-slate-950 dark:bg-slate-950 backdrop-blur-md p-1 rounded-full border border-slate-700/80 shadow-xl">
              <Button
                variant={!isEditMode ? 'secondary' : 'ghost'}
                size="sm"
                className={`h-7 rounded-full text-xs font-bold gap-1 px-3 ${
                  !isEditMode ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
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
                className={`h-7 rounded-full text-xs font-bold gap-1 px-3 text-purple-400 ${
                  isEditMode ? 'bg-slate-800 text-purple-300' : 'text-purple-400 hover:text-purple-300 hover:bg-slate-900'
                }`}
                onClick={() => setIsEditMode(true)}
              >
                <Edit3 className="h-3.5 w-3.5" /> Edit
              </Button>
            </div>
          )}

          {/* MAP SETTINGS BUTTON FOR OWNER */}
          {isOwner && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 bg-slate-950 dark:bg-slate-950 text-slate-100 hover:text-white hover:bg-slate-900 dark:hover:bg-slate-900 border border-slate-700/80 shadow-xl backdrop-blur-md"
              onClick={() => setIsSettingsDialogOpen(true)}
              title="Map Settings"
            >
              <Settings className="h-4 w-4 text-slate-200" />
            </Button>
          )}
        </div>
      </div>

      {/* TOOLBAR WHEN IN EDIT MODE */}
      {isOwner && isEditMode && (
        <div className="absolute top-20 left-4 z-30 flex flex-col gap-2 bg-slate-950 dark:bg-slate-950 backdrop-blur-md p-2 rounded-xl border border-slate-700/80 shadow-2xl text-slate-200">
          <Button
            variant={activeTool === 'view' ? 'secondary' : 'ghost'}
            size="icon"
            className={`h-9 w-9 ${activeTool === 'view' ? 'bg-slate-800 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-900'}`}
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
            className={`h-9 w-9 ${activeTool === 'add_pin' ? 'bg-slate-800 text-purple-300' : 'text-purple-400 hover:text-purple-300 hover:bg-slate-900'}`}
            onClick={() => setActiveTool('add_pin')}
            title="Add Pin (Click on Map)"
          >
            <MapPin className="h-4 w-4" />
          </Button>
          <Button
            variant={activeTool === 'add_area' ? 'secondary' : 'ghost'}
            size="icon"
            className={`h-9 w-9 ${activeTool === 'add_area' ? 'bg-slate-800 text-emerald-300' : 'text-emerald-400 hover:text-emerald-300 hover:bg-slate-900'}`}
            onClick={() => {
              setActiveTool('add_area')
              setAreaDraft({ name: '', description: '', color: '#a855f7', fillOpacity: 0.3, points: [], gmOnly: false })
            }}
            title="Draw Polygon Area"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant={activeTool === 'grid_note' ? 'secondary' : 'ghost'}
            size="icon"
            className={`h-9 w-9 ${activeTool === 'grid_note' ? 'bg-slate-800 text-amber-300' : 'text-amber-400 hover:text-amber-300 hover:bg-slate-900'}`}
            onClick={() => setActiveTool(activeTool === 'grid_note' ? 'view' : 'grid_note')}
            title="Add Map / Cell Note (Click on Map)"
          >
            <FileText className="h-4 w-4" />
          </Button>
          {gridType !== 'none' && (
            <Button
              variant={activeTool === 'align_grid' ? 'secondary' : 'ghost'}
              size="icon"
              className={`h-9 w-9 ${activeTool === 'align_grid' ? 'bg-slate-800 text-amber-300' : 'text-amber-400 hover:text-amber-300 hover:bg-slate-900'}`}
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
                className={`h-9 w-9 ${activeTool === 'reveal_hex' ? 'bg-slate-800 text-blue-300' : 'text-blue-400 hover:text-blue-300 hover:bg-slate-900'}`}
                onClick={() => setActiveTool('reveal_hex')}
                title="Reveal Grid Hex/Square"
              >
                <Unlock className="h-4 w-4" />
              </Button>
              <Button
                variant={activeTool === 'hide_hex' ? 'secondary' : 'ghost'}
                size="icon"
                className={`h-9 w-9 ${activeTool === 'hide_hex' ? 'bg-slate-800 text-red-300' : 'text-red-400 hover:text-red-300 hover:bg-slate-900'}`}
                onClick={() => setActiveTool('hide_hex')}
                title="Hide Grid Hex/Square"
              >
                <Lock className="h-4 w-4" />
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-slate-400 hover:text-cyan-300 hover:bg-slate-900"
                    title="Bulk Fog Actions (Show/Hide All)"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent side="right" align="start" className="w-56 p-3 bg-slate-950 dark:bg-slate-950 border-slate-800 text-slate-100 shadow-xl space-y-2.5">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-200">Bulk Fog Actions</p>
                    <p className="text-[10px] text-slate-400">Reveal or cover the entire map</p>
                  </div>
                  <div className="space-y-1.5 pt-1 border-t border-slate-800">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-xs h-8 border-emerald-800/60 text-emerald-300 hover:bg-emerald-950/50 hover:text-emerald-200"
                      onClick={() => {
                        if (!currentMap) return
                        const allKeys = gridCells.map((cell) => cell.key)
                        bulkRevealCellsMutation({ mapId: currentMap._id, cellKeys: allKeys, reveal: true })
                        toast.success('Revealed all cells!')
                      }}
                    >
                      <Eye className="h-3.5 w-3.5 mr-2" />
                      Reveal All Tiles
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-xs h-8 border-red-900/60 text-red-300 hover:bg-red-950/50 hover:text-red-200"
                      onClick={() => {
                        if (!currentMap) return
                        bulkRevealCellsMutation({ mapId: currentMap._id, cellKeys: currentMap.revealedCells || [], reveal: false })
                        toast.success('Covered all tiles (Fog reset)!')
                      }}
                    >
                      <EyeOff className="h-3.5 w-3.5 mr-2" />
                      Hide All Tiles (Cover Map)
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
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

          <div className="h-px bg-slate-800 my-1" />
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-slate-300 hover:text-purple-300 hover:bg-slate-900"
            onClick={handleForceRefreshImage}
            disabled={isRefreshingImage || !currentMap?.imageUrl}
            title="Reload Map Image (Clear Cache)"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshingImage ? 'animate-spin text-purple-400' : ''}`} />
          </Button>
        </div>
      )}

      {/* FLOATING GRID CALIBRATION HUD */}
      {isOwner && isEditMode && activeTool === 'align_grid' && gridType !== 'none' && (
        <div className="absolute top-20 left-16 z-30 bg-slate-950 dark:bg-slate-950 backdrop-blur-md p-3.5 rounded-xl border border-amber-500/60 shadow-2xl flex flex-col gap-3 min-w-[270px] text-slate-100">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-xs flex items-center gap-1.5 text-amber-400">
              <Grid className="h-4 w-4" /> Grid Calibration
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-slate-400 hover:text-white"
              onClick={() => setActiveTool('view')}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          <p className="text-[11px] text-slate-400 leading-snug">
            Drag the map with your cursor to shift the grid, or use the nudge buttons below.
          </p>

          <div className="space-y-2.5 text-xs">
            {/* OFFSET X */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-400 font-semibold w-16">Offset X:</span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7 bg-slate-900 border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-800" onClick={() => handleNudgeOffset(-5, 0)} title="Nudge Left 5px">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Input
                  type="number"
                  className="h-7 w-16 text-center text-xs p-1 font-mono bg-slate-900 border-slate-700 text-slate-100"
                  value={currentOffsetX}
                  onChange={(e) => handleSetOffset(Number(e.target.value), currentOffsetY)}
                />
                <Button variant="ghost" size="icon" className="h-7 w-7 bg-slate-900 border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-800" onClick={() => handleNudgeOffset(5, 0)} title="Nudge Right 5px">
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* OFFSET Y */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-400 font-semibold w-16">Offset Y:</span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7 bg-slate-900 border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-800" onClick={() => handleNudgeOffset(0, -5)} title="Nudge Up 5px">
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Input
                  type="number"
                  className="h-7 w-16 text-center text-xs p-1 font-mono bg-slate-900 border-slate-700 text-slate-100"
                  value={currentOffsetY}
                  onChange={(e) => handleSetOffset(currentOffsetX, Number(e.target.value))}
                />
                <Button variant="ghost" size="icon" className="h-7 w-7 bg-slate-900 border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-800" onClick={() => handleNudgeOffset(0, 5)} title="Nudge Down 5px">
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* GRID SIZE */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
              <span className="text-slate-400 font-semibold w-16">Cell Size:</span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7 bg-slate-900 border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-800" onClick={() => handleSetGridSize(currentGridSize - 5)} title="Decrease Size 5px">
                  -
                </Button>
                <Input
                  type="number"
                  className="h-7 w-16 text-center text-xs p-1 font-mono bg-slate-900 border-slate-700 text-slate-100"
                  value={currentGridSize}
                  onChange={(e) => handleSetGridSize(Number(e.target.value))}
                />
                <Button variant="ghost" size="icon" className="h-7 w-7 bg-slate-900 border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-800" onClick={() => handleSetGridSize(currentGridSize + 5)} title="Increase Size 5px">
                  +
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
            <Button
              size="sm"
              className="flex-1 text-xs h-8 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-md"
              onClick={handleSaveGridCalibration}
            >
              Save Grid
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs h-8 px-2.5 bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
              onClick={handleResetGridCalibration}
            >
              Reset
            </Button>
          </div>
        </div>
      )}

      {/* FLOATING RESHAPING HUD */}
      {reshapingArea && (
        <div className="absolute top-20 left-16 z-30 bg-slate-950 dark:bg-slate-950 backdrop-blur-md p-3.5 rounded-xl border border-purple-500/60 shadow-2xl flex flex-col gap-2.5 min-w-[280px] max-w-sm text-slate-100">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <Maximize2 className="h-4 w-4 text-purple-400 shrink-0" />
              <span className="font-bold text-xs text-purple-300 truncate">
                Reshaping: {reshapingArea.name}
              </span>
            </div>
            <span className="text-[10px] text-purple-300 font-mono px-2 py-0.5 rounded-full bg-purple-950/60 border border-purple-500/40 shrink-0">
              {reshapingArea.points.length} pts
            </span>
          </div>

          <p className="text-[11px] text-slate-400 leading-snug">
            Drag any vertex to reposition it. Click <span className="text-cyan-400 font-bold">+</span> between points to add vertices. Right-click a vertex to delete it.
          </p>

          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <Button
              variant={isReshapingAddPointMode ? 'secondary' : 'outline'}
              size="sm"
              className={`h-7 text-xs gap-1 ${
                isReshapingAddPointMode
                  ? 'bg-purple-600 text-white hover:bg-purple-500'
                  : 'bg-slate-900 border-slate-700 text-slate-200 hover:text-white hover:bg-slate-800'
              }`}
              onClick={() => setIsReshapingAddPointMode(!isReshapingAddPointMode)}
              title="Click on the map to append new points"
            >
              <Plus className="h-3 w-3" />
              {isReshapingAddPointMode ? 'Click Map to Add' : 'Add Points'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1 bg-slate-900 border-slate-700 text-slate-200 hover:text-white hover:bg-slate-800"
              onClick={() => {
                setReshapingArea((prev) => (prev ? { ...prev, points: [] } : null))
                setIsReshapingAddPointMode(true)
                toast.info('Click on map to draw the new shape')
              }}
              title="Clear all points and redraw from scratch"
            >
              <RotateCcw className="h-3 w-3" />
              Redraw
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
              onClick={() => {
                if (reshapingArea) {
                  setReshapingArea((prev) => (prev ? { ...prev, points: [...prev.originalPoints] } : null))
                  setIsReshapingAddPointMode(false)
                  toast.info('Reset points to original shape')
                }
              }}
              title="Reset to original shape"
            >
              Reset
            </Button>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-slate-400 hover:text-white"
              onClick={handleCancelReshape}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs bg-purple-600 hover:bg-purple-500 text-white font-bold"
              onClick={handleSaveReshapedArea}
            >
              Save Shape
            </Button>
          </div>
        </div>
      )}

      {/* LAYERS MENU PANEL */}
      {isLayersMenuOpen && (
        <Card className="absolute top-16 right-4 z-40 w-72 bg-slate-950 dark:bg-slate-950 backdrop-blur-md border-slate-700/80 shadow-2xl text-slate-100">
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-slate-800">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-100">
              <Layers className="h-4 w-4 text-purple-400" /> Map Layers
            </CardTitle>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-white" onClick={() => setIsLayersMenuOpen(false)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
            {/* Player Notes Layer Toggle */}
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-amber-400" />
                <span className="font-medium text-slate-200">Player Notes</span>
              </div>
              <Switch
                checked={showPlayerNotes}
                onCheckedChange={(val) => {
                  setShowPlayerNotes(val)
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('void_map_show_notes', String(val))
                  }
                }}
              />
            </div>

            {/* Tile Pyramid Layer Toggle if currentMap has tileUrl */}
            {currentMap?.tileUrl && (
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5 text-cyan-400" />
                  <span className="font-medium text-slate-200">
                    {currentMap.imageUrl?.toLowerCase().includes('.svg') ? 'Tile Pyramid Overlay' : 'DeepZoom Tiles'}
                  </span>
                </div>
                <Switch
                  checked={isTilePyramidEnabled}
                  onCheckedChange={setIsTilePyramidEnabled}
                />
              </div>
            )}

            {fullData?.layers.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No extra layers created.</p>
            ) : (
              fullData?.layers.map((layer) => {
                const canToggle = isOwner || layer.allowUserToggle
                return (
                  <div key={layer._id} className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-200">{layer.name}</span>
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
                          className="h-6 w-6 text-destructive hover:bg-destructive/10"
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
              <div className="space-y-1.5 mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs border border-dashed border-slate-700 text-slate-300 hover:text-white hover:bg-slate-900"
                  onClick={() => setIsLayerDialogOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Layer
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full h-7 text-[11px] gap-1 text-purple-400 hover:text-purple-300 hover:bg-purple-950/40"
                  asChild
                >
                  <a href="https://maps.tarragon.be" target="_blank" rel="noopener noreferrer" title="Upload new layer image on maps.tarragon.be">
                    <Upload className="h-3 w-3" />
                    Upload new image
                    <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                  </a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* NOTES MENU PANEL */}
      {isNotesMenuOpen && (
        <Card className="absolute top-16 right-4 z-40 w-80 bg-slate-950 dark:bg-slate-950 backdrop-blur-md border-slate-700/80 shadow-2xl flex flex-col max-h-[75vh] text-slate-100">
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-slate-800 shrink-0">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-100">
              <FileText className="h-4 w-4 text-amber-400" /> Map Notes ({fullData?.notes?.length || 0})
            </CardTitle>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-white" onClick={() => setIsNotesMenuOpen(false)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>

          {/* Visibility toggle & Add Note action */}
          <div className="p-3 border-b border-slate-800 space-y-2 shrink-0 bg-slate-900/40">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-medium text-slate-200">Show Notes on Map</span>
              </div>
              <Switch
                checked={showPlayerNotes}
                onCheckedChange={(val) => {
                  setShowPlayerNotes(val)
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('void_map_show_notes', String(val))
                  }
                }}
              />
            </div>
            <Button
              size="sm"
              className={`w-full text-xs h-8 gap-1.5 ${
                activeTool === 'grid_note'
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold'
                  : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30'
              }`}
              onClick={() => {
                setActiveTool(activeTool === 'grid_note' ? 'view' : 'grid_note')
                if (!showPlayerNotes) {
                  setShowPlayerNotes(true)
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('void_map_show_notes', 'true')
                  }
                }
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              {activeTool === 'grid_note' ? 'Placing Note (Click Map)' : 'Add Note to Map'}
            </Button>
          </div>

          <CardContent className="p-2 space-y-1.5 overflow-y-auto flex-1">
            {!fullData?.notes || fullData.notes.length === 0 ? (
              <div className="text-center py-6 px-4 space-y-1">
                <FileText className="h-6 w-6 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400 italic">No notes have been added yet.</p>
                <p className="text-[11px] text-slate-500">Click &ldquo;Add Note to Map&rdquo; or click any cell to create one.</p>
              </div>
            ) : (
              fullData.notes.map((note) => {
                const isAuthor = clerkUser && note.userId === clerkUser.id
                const canManage = isAuthor || isOwner
                return (
                  <div
                    key={note._id}
                    className="p-2 rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-colors cursor-pointer group flex items-start justify-between gap-2"
                    onClick={() => {
                      // Pan to note position if coordinates exist
                      const cellCoord = note.cellKey ? cellCenterMap[note.cellKey] : null
                      if (cellCoord) {
                        const targetPxX = cellCoord.cx - mapWidth / 2
                        const targetPxY = cellCoord.cy - mapHeight / 2
                        const newScale = Math.max(scaleRef.current, 1.2)
                        scaleRef.current = newScale
                        setScale(newScale)
                        positionRef.current = { x: -targetPxX * newScale, y: -targetPxY * newScale }
                        setPosition({ x: -targetPxX * newScale, y: -targetPxY * newScale })
                      } else if (note.x !== undefined && note.y !== undefined) {
                        const targetPxX = (note.x / 100) * mapWidth - mapWidth / 2
                        const targetPxY = (note.y / 100) * mapHeight - mapHeight / 2
                        const newScale = Math.max(scaleRef.current, 1.2)
                        scaleRef.current = newScale
                        setScale(newScale)
                        positionRef.current = { x: -targetPxX * newScale, y: -targetPxY * newScale }
                        setPosition({ x: -targetPxX * newScale, y: -targetPxY * newScale })
                      }
                      handleOpenNote(note)
                    }}
                  >
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div className="h-6 w-6 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
                        <FileText className="h-3.5 w-3.5 text-amber-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-slate-200 line-clamp-2 leading-snug">
                          {note.note}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                          {note.authorName && (
                            <span className="flex items-center gap-1 text-slate-400">
                              <User className="h-2.5 w-2.5" />
                              {note.authorName}
                            </span>
                          )}
                          <span>
                            {new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                          {note.wikiLink && (
                            <a
                              href={formatWikiUrl(note.wikiLink)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] text-purple-300 hover:text-purple-200 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                              title="Open Void Wiki Article"
                            >
                              <BookOpen className="h-2.5 w-2.5" />
                              Wiki
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteNote(note._id)
                        }}
                        title="Delete note"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      )}

      {/* LOCATIONS DIRECTORY SIDEBAR PANEL */}
      {isLocationsMenuOpen && (
        <Card className="absolute top-16 right-4 z-40 w-80 bg-slate-950 dark:bg-slate-950 backdrop-blur-md border-slate-700/80 shadow-2xl flex flex-col max-h-[75vh] text-slate-100">
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-slate-800 shrink-0">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-100">
              <Compass className="h-4 w-4 text-cyan-400" /> Locations ({filteredPins.length + filteredAreas.length})
            </CardTitle>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-white" onClick={() => setIsLocationsMenuOpen(false)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <div className="flex border-b border-slate-800 shrink-0 bg-slate-900/50">
            <button
              type="button"
              onClick={() => setLocationDirectoryTab('pins')}
              className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition-colors ${
                locationDirectoryTab === 'pins'
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Pins ({filteredPins.length})
            </button>
            <button
              type="button"
              onClick={() => setLocationDirectoryTab('areas')}
              className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition-colors ${
                locationDirectoryTab === 'areas'
                  ? 'border-purple-400 text-purple-300 bg-purple-950/30'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Areas ({filteredAreas.length})
            </button>
          </div>
          <div className="p-3 border-b border-slate-800 space-y-2 shrink-0">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-500" />
              <Input
                placeholder={locationDirectoryTab === 'pins' ? "Search pin locations..." : "Search areas..."}
                className="h-8 pl-8 text-xs bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500"
                value={locationSearch}
                onChange={(e) => setLocationSearch(e.target.value)}
              />
            </div>
            {fullData?.layers && fullData.layers.length > 0 && (
              <Select value={locationFilterLayer} onValueChange={setLocationFilterLayer} className="h-7 text-xs bg-slate-900 border-slate-700 text-slate-200">
                <SelectTrigger className="h-7 text-xs bg-slate-900 border-slate-700 text-slate-200"><SelectValue placeholder="All Layers" /></SelectTrigger>
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
            {locationDirectoryTab === 'areas' ? (
              filteredAreas.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-6">No areas found.</p>
              ) : (
                filteredAreas.map((area) => {
                  const areaLayer = fullData?.layers.find((l) => l._id === area.layerId)
                  return (
                    <div
                      key={area._id}
                      className="p-2 rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-colors cursor-pointer group flex items-start justify-between gap-2"
                      onClick={() => {
                        // Center viewport on area centroid
                        const avgX = area.points.reduce((acc, p) => acc + p.x, 0) / (area.points.length || 1)
                        const avgY = area.points.reduce((acc, p) => acc + p.y, 0) / (area.points.length || 1)
                        const targetPxX = (avgX / 100) * mapWidth - mapWidth / 2
                        const targetPxY = (avgY / 100) * mapHeight - mapHeight / 2
                        const newScale = Math.max(scaleRef.current, 1.2)
                        scaleRef.current = newScale
                        setScale(newScale)
                        positionRef.current = { x: -targetPxX * newScale, y: -targetPxY * newScale }
                        setPosition({ x: -targetPxX * newScale, y: -targetPxY * newScale })
                        setSelectedArea(area)
                      }}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div
                          className="h-6 w-6 rounded-md shadow-sm shrink-0 mt-0.5 border border-white/20 flex items-center justify-center"
                          style={{ backgroundColor: area.color || '#a855f7' }}
                        >
                          <Maximize2 className="h-3 w-3 text-white" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-xs truncate group-hover:text-purple-300 transition-colors text-slate-200">
                              {area.name}
                            </span>
                            {area.gmOnly && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-0.5">
                                <EyeOff className="h-2.5 w-2.5" /> Secret
                              </span>
                            )}
                            {area.targetMapId && (
                              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-0.5">
                                <MapIcon className="h-2.5 w-2.5" /> Linked
                              </span>
                            )}
                          </div>
                          {area.description && (
                            <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                              {area.description}
                            </p>
                          )}
                          {areaLayer && (
                            <span className="text-[10px] text-purple-400/80 mt-0.5 block">
                              {areaLayer.name}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500 mt-0.5 block">
                            {area.points.length} vertices
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-slate-200 shrink-0 mt-1" />
                    </div>
                  )
                })
              )
            ) : filteredPins.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-6">No locations found.</p>
            ) : (
              filteredPins.map((pin) => {
                const pinLayer = fullData?.layers.find((l) => l._id === pin.layerId)
                return (
                  <div
                    key={pin._id}
                    className="p-2 rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-colors cursor-pointer group flex items-start justify-between gap-2"
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
                          <span className="font-semibold text-xs truncate group-hover:text-purple-300 transition-colors text-slate-200">
                            {pin.title}
                          </span>
                          {pin.gmOnly && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-0.5">
                              <EyeOff className="h-2.5 w-2.5" /> Secret
                            </span>
                          )}
                        </div>
                        {pin.description && (
                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
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
                    <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-slate-200 shrink-0 mt-1" />
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      )}

      {/* RULER ACTIVE BOTTOM HUD */}
      {activeTool === 'ruler' && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-30 flex items-center gap-3 bg-slate-950/95 dark:bg-slate-950/95 backdrop-blur-md px-4 py-2 rounded-full border border-cyan-500/60 shadow-2xl text-slate-100">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-100">
            <Ruler className="h-4 w-4 text-cyan-400" />
            <span>Click &amp; drag across the map to measure distance</span>
          </div>
          {rulerPoints && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2 text-slate-400 hover:text-red-400"
              onClick={() => setRulerPoints(null)}
            >
              Clear
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs px-2.5 bg-slate-900 border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-800"
            onClick={() => {
              setRulerPoints(null)
              setActiveTool('view')
            }}
          >
            Done
          </Button>
        </div>
      )}

      {/* NOTE PLACEMENT ACTIVE BOTTOM HUD */}
      {activeTool === 'grid_note' && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-30 flex items-center gap-3 bg-slate-950/95 dark:bg-slate-950/95 backdrop-blur-md px-4 py-2 rounded-full border border-amber-500/60 shadow-2xl text-slate-100">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-100">
            <FileText className="h-4 w-4 text-amber-400" />
            <span>Click any cell or spot on the map to add a note</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs px-2.5 bg-slate-900 border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-800"
            onClick={() => setActiveTool('view')}
          >
            Done
          </Button>
        </div>
      )}


      {/* ZOOM & VIEWPORT CONTROLS */}
      <div className="absolute bottom-6 right-6 z-30 flex flex-col gap-2 bg-slate-950 dark:bg-slate-950 backdrop-blur-md p-1.5 rounded-full border border-slate-700/80 shadow-xl text-slate-200">
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-200 hover:text-white hover:bg-slate-900" onClick={handleZoomIn} title="Zoom In">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-200 hover:text-white hover:bg-slate-900" onClick={handleResetZoom} title="Reset View">
          <Maximize2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-200 hover:text-white hover:bg-slate-900" onClick={handleZoomOut} title="Zoom Out">
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
          className="relative shrink-0 origin-center shadow-2xl"
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
          {/* BASE MAP BACKGROUND IMAGE OR TILE PYRAMID */}
          {currentMap?.imageUrl ? (
            <img
              src={getCacheBustedUrl(currentMap.imageUrl, currentMap.imageUpdatedAt)}
              alt={currentMap.name}
              className="absolute inset-0 w-full h-full max-w-none object-fill select-none pointer-events-none"
              style={{ imageRendering: 'auto' }}
              draggable={false}
              onLoad={handleImageLoad}
            />
          ) : !currentMap?.tileUrl ? (
            <div className="absolute inset-0 w-full h-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-700 font-bold text-2xl">
              No Map Image Set
            </div>
          ) : null}

          {/* BASE MAP TILE PYRAMID */}
          {currentMap?.tileUrl && isTilePyramidEnabled && (
            <TilePyramidLayer
              tileUrl={currentMap.tileUrl}
              mapWidth={mapWidth}
              mapHeight={mapHeight}
              scale={scale}
              position={position}
              containerRef={containerRef}
              viewportRef={viewportRef}
              tileSize={currentMap.tileSize}
              minZoom={currentMap.minZoom}
              maxZoom={currentMap.maxZoom}
              imageUpdatedAt={currentMap.imageUpdatedAt}
            />
          )}

          {/* OVERLAY MAP LAYERS */}
          {fullData?.layers.map((layer) => {
            if (!enabledLayers[layer._id]) return null
            return (
              <React.Fragment key={layer._id}>
                {layer.imageUrl && (
                  <img
                    src={getCacheBustedUrl(layer.imageUrl, layer.imageUpdatedAt)}
                    alt={layer.name}
                    className="absolute inset-0 w-full h-full max-w-none object-fill pointer-events-none"
                    draggable={false}
                  />
                )}
                {layer.tileUrl && (
                  <TilePyramidLayer
                    tileUrl={layer.tileUrl}
                    mapWidth={mapWidth}
                    mapHeight={mapHeight}
                    scale={scale}
                    position={position}
                    containerRef={containerRef}
                    viewportRef={viewportRef}
                    tileSize={layer.tileSize}
                    minZoom={layer.minZoom}
                    maxZoom={layer.maxZoom}
                    imageUpdatedAt={layer.imageUpdatedAt}
                  />
                )}
              </React.Fragment>
            )
          })}

          {/* POLYGON AREAS & RULER SVG */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {fullData?.areas.map((area) => {
              if (area.layerId && !enabledLayers[area.layerId]) return null
              if (reshapingArea && reshapingArea.id === area._id) return null
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
                    if (reshapingArea) return
                    if (isOwner && isEditMode) {
                      setSelectedArea(area)
                      return
                    }
                    if (area.targetMapId) {
                      const target = worldMaps?.find((m) => m._id === area.targetMapId)
                      if (target) router.push(`/world/${encodeURIComponent(world.name)}/map/${target.slug}`)
                    } else {
                      setSelectedArea(area)
                    }
                  }}
                  onContextMenu={(e) => {
                    if (isOwner) {
                      e.preventDefault()
                      e.stopPropagation()
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

            {/* RESHAPING AREA POLYGON & INTERACTIVE VERTEX HANDLES */}
            {reshapingArea && (
              <g className="pointer-events-auto">
                {reshapingArea.points.length > 0 && (
                  <polygon
                    points={reshapingArea.points.map((p) => `${(p.x * mapWidth) / 100},${(p.y * mapHeight) / 100}`).join(' ')}
                    fill={reshapingArea.color}
                    fillOpacity={0.4}
                    stroke="#38bdf8"
                    strokeWidth={Math.min(Math.max(3 / scale, 2), 6)}
                    strokeDasharray="6,4"
                  />
                )}
                {/* Vertex handles and midpoint add buttons */}
                {reshapingArea.points.map((p, idx) => {
                  const cx = (p.x * mapWidth) / 100
                  const cy = (p.y * mapHeight) / 100
                  const isDragged = draggedVertexIndex === idx
                  const hitRadius = Math.min(Math.max(18 / scale, 14), 28)
                  const visualRadius = Math.min(Math.max(8 / scale, 6), 14)
                  const strokeW = Math.min(Math.max(2.5 / scale, 2), 4)

                  // Next point for midpoint '+' button
                  const nextP = reshapingArea.points[(idx + 1) % reshapingArea.points.length]
                  const midX = (((p.x + nextP.x) / 2) * mapWidth) / 100
                  const midY = (((p.y + nextP.y) / 2) * mapHeight) / 100

                  return (
                    <g key={`vertex-${idx}`}>
                      {/* Midpoint '+' handle between this vertex and next */}
                      {reshapingArea.points.length >= 3 && !isReshapingAddPointMode && (
                        <g
                          className="cursor-pointer transition-opacity opacity-75 hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleInsertVertex(idx + 1, (p.x + nextP.x) / 2, (p.y + nextP.y) / 2)
                          }}
                        >
                          <circle
                            cx={midX}
                            cy={midY}
                            r={Math.min(Math.max(7 / scale, 5), 11)}
                            fill="#020617"
                            stroke="#38bdf8"
                            strokeWidth={Math.min(Math.max(1.5 / scale, 1.2), 3)}
                          />
                          <text
                            x={midX}
                            y={midY + 3.5 / scale}
                            fill="#38bdf8"
                            fontSize={Math.min(Math.max(11 / scale, 8), 15)}
                            fontWeight="bold"
                            textAnchor="middle"
                            className="select-none pointer-events-none"
                          >
                            +
                          </text>
                        </g>
                      )}

                      {/* Vertex Drag Handle (transparent larger hit zone) */}
                      <circle
                        cx={cx}
                        cy={cy}
                        r={hitRadius}
                        fill="transparent"
                        className="cursor-move"
                        onMouseDown={(e) => handleVertexMouseDown(idx, e)}
                        onTouchStart={(e) => handleVertexTouchStart(idx, e)}
                        onContextMenu={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleDeleteVertex(idx)
                        }}
                      />
                      {/* Visible circle */}
                      <circle
                        cx={cx}
                        cy={cy}
                        r={visualRadius}
                        fill={isDragged ? '#38bdf8' : '#ffffff'}
                        stroke={reshapingArea.color}
                        strokeWidth={strokeW}
                        className="pointer-events-none drop-shadow-md"
                      />
                      {/* Vertex Number */}
                      <text
                        x={cx}
                        y={cy - 10 / scale}
                        fill="#ffffff"
                        fontSize={Math.min(Math.max(11 / scale, 9), 16)}
                        fontWeight="bold"
                        textAnchor="middle"
                        className="select-none pointer-events-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
                      >
                        {idx + 1}
                      </text>
                    </g>
                  )
                })}
              </g>
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
                    hasDraggedPinRef.current = false
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
                onTouchStart={(e) => {
                  if (isOwner && isEditMode && activeTool === 'view' && e.touches.length === 1) {
                    e.stopPropagation()
                    hasDraggedPinRef.current = false
                    pinDragStartRef.current = {
                      clientX: e.touches[0].clientX,
                      clientY: e.touches[0].clientY,
                      origX: pin.x,
                      origY: pin.y,
                      moved: false,
                    }
                    setDraggingPinId(pin._id)
                  }
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  if (hasDraggedPinRef.current || pinDragStartRef.current?.moved) return
                  if (isOwner && isEditMode) {
                    setSelectedPin(pin)
                    return
                  }
                  if (pin.targetMapId) {
                    const target = worldMaps?.find((m) => m._id === pin.targetMapId)
                    if (target) router.push(`/world/${encodeURIComponent(world.name)}/map/${target.slug}`)
                  } else {
                    setSelectedPin(pin)
                  }
                }}
                onContextMenu={(e) => {
                  if (isOwner) {
                    e.preventDefault()
                    e.stopPropagation()
                    setSelectedPin(pin)
                  }
                }}
              >
                {showTextOnly ? (
                  <span className="bg-slate-950/95 backdrop-blur-md px-2 py-0.5 rounded-md border border-slate-700/80 text-xs font-bold shadow-lg text-purple-300 whitespace-nowrap flex items-center gap-1.5">
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
                      <span className="mt-1 bg-slate-950/95 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-bold text-slate-100 whitespace-nowrap shadow-md border border-slate-800">
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
              {/* 1. RENDER CELL POLYGONS */}
              {gridCells.map((cell) => {
                const isRevealed = revealedSet.has(cell.key)
                const isHidden = isExplorationMap && !isRevealed
                const hasNote = !!notesMap[cell.key]
                const canShowNote = showPlayerNotes && hasNote && (!isHidden || isOwner)

                // Exploration mode transparency:
                // For world owner: unrevealed hexes are slightly transparent (0.55 opacity) so they can see which hexes are being revealed vs covered.
                // For non-owners / players: unrevealed hexes are 100% solid fog of war.
                // Revealed hexes are transparent.
                const fillColor = isHidden ? '#020617' : 'transparent'
                const fillOpacity = isHidden ? (isOwner ? 0.55 : 1) : 0
                const strokeColor = isOwner && isHidden
                  ? 'rgba(148, 163, 184, 0.45)'
                  : 'rgba(255, 255, 255, 0.22)'

                // Hover styling
                let hoverClass = ''
                if (isHidden) {
                  if (isEditMode && activeTool === 'reveal_hex') {
                    hoverClass = 'cursor-pointer hover:stroke-emerald-400 hover:stroke-2'
                  } else if (activeTool === 'grid_note') {
                    hoverClass = 'cursor-pointer hover:stroke-amber-400 hover:stroke-2'
                  } else {
                    hoverClass = 'cursor-default'
                  }
                } else {
                  // Revealed cell
                  if (activeTool === 'grid_note') {
                    hoverClass = 'cursor-pointer hover:fill-amber-500/20 hover:stroke-amber-400'
                  } else if (isEditMode) {
                    if (activeTool === 'hide_hex') {
                      hoverClass = 'cursor-pointer hover:fill-red-500/25 hover:stroke-red-400 hover:stroke-2'
                    } else {
                      hoverClass = 'cursor-pointer hover:fill-white/5'
                    }
                  } else {
                    hoverClass = canShowNote ? 'cursor-pointer hover:fill-amber-500/10' : ''
                  }
                }

                // Clicks pass through revealed cells to pins and areas underneath when not in editing mode.
                // Hidden cells capture clicks for players to prevent interacting with concealed pins.
                const shouldCaptureClicks =
                  (!isOwner && isHidden) ||
                  activeTool === 'grid_note' ||
                  (isEditMode && (activeTool === 'reveal_hex' || activeTool === 'hide_hex'))

                return (
                  <g key={cell.key}>
                    <polygon
                      points={cell.points}
                      fill={fillColor}
                      fillOpacity={fillOpacity}
                      stroke={strokeColor}
                      strokeWidth="1"
                      strokeDasharray={isOwner && isHidden ? '4 2' : undefined}
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
                        fill={noteObjMap[cell.key]?.wikiLink ? '#c084fc' : '#f59e0b'}
                        stroke="#0f172a"
                        strokeWidth="1.5"
                        className={`cursor-pointer ${noteObjMap[cell.key]?.wikiLink ? 'drop-shadow-[0_0_6px_rgba(192,132,252,0.9)]' : 'drop-shadow-[0_0_6px_rgba(245,158,11,0.8)]'}`}
                        style={{ pointerEvents: 'auto' }}
                        onClick={(e) => handleCellClick(cell.key, e)}
                      >
                        <title>
                          {noteObjMap[cell.key]?.wikiLink
                            ? `${notesMap[cell.key]} (Wiki: ${noteObjMap[cell.key].wikiLink})`
                            : notesMap[cell.key]}
                        </title>
                      </circle>
                    )}
                  </g>
                )
              })}
            </svg>
          )}

          {/* FREEFORM PLAYER NOTE PINS (For notes with x, y coordinates or gridless maps) */}
          {showPlayerNotes && fullData?.notes && fullData.notes.map((note) => {
            const cellCoord = note.cellKey ? cellCenterMap[note.cellKey] : null
            // If the note has no pixel or percentage position
            if (!cellCoord && (note.x === undefined || note.y === undefined)) return null
            // If the map has a grid and this note corresponds to a grid cell that is currently hidden by fog of war for non-owners, conceal it
            if (gridType !== 'none' && isExplorationMap && !isOwner) {
              const matchingCell = gridCells.find((c) => c.key === note.cellKey)
              if (matchingCell && !revealedSet.has(matchingCell.key)) return null
            }

            const stylePos = cellCoord
              ? { left: `${cellCoord.cx}px`, top: `${cellCoord.cy}px` }
              : { left: `${note.x}%`, top: `${note.y}%` }

            return (
              <div
                key={`freeform_note_${note._id}`}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer group z-20"
                style={stylePos}
                onClick={(e) => {
                  e.stopPropagation()
                  handleOpenNote(note)
                }}
              >
                <div className="flex flex-col items-center relative">
                  <div className="p-1.5 rounded-full bg-amber-500 text-slate-950 shadow-lg border border-slate-900 drop-shadow-[0_0_8px_rgba(245,158,11,0.7)] group-hover:scale-125 transition-transform relative">
                    <FileText className="h-3.5 w-3.5" />
                    {note.wikiLink && (
                      <span
                        className="absolute -top-1 -right-1 bg-purple-600 text-white rounded-full p-0.5 border border-slate-900 shadow-md"
                        title="Linked to Void Wiki"
                      >
                        <BookOpen className="h-2 w-2" />
                      </span>
                    )}
                  </div>
                  {(scale > 0.8) && (
                    <span className="mt-1 bg-slate-950/95 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-medium text-amber-200 line-clamp-1 max-w-[120px] whitespace-nowrap shadow-md border border-amber-500/40 flex items-center gap-1">
                      {note.wikiLink && <BookOpen className="h-2.5 w-2.5 text-purple-400 shrink-0" />}
                      <span className="truncate">{note.note}</span>
                    </span>
                  )}
                </div>
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
                    <MapIcon className="h-3.5 w-3.5" />
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
                      {m.name} {m.isHomeMap ? '🏠 ' : ''}{m.hideFromMenu ? '(Hidden)' : ''}
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

      {/* DIALOG: MAP & CELL NOTE */}
      <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
        <DialogContent className="max-w-md">
          {(() => {
            const isAuthor = clerkUser && selectedNoteData?.userId === clerkUser.id
            const isNew = !selectedNoteData
            const canEdit = isNew || isAuthor || isOwner
            const canDelete = !isNew && (isAuthor || isOwner)

            return (
              <>
                <DialogHeader>
                  <div className="flex items-center justify-between pr-4">
                    <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-100">
                      <FileText className="h-4 w-4 text-amber-400" />
                      Map Note
                    </DialogTitle>
                    {selectedCellKey && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300">
                        {selectedCellKey.startsWith('point_') ? 'Coordinate Marker' : `Cell: ${selectedCellKey}`}
                      </span>
                    )}
                  </div>
                </DialogHeader>

                <div className="space-y-3 pt-1">
                  {selectedNoteData && (
                    <div className="flex items-center justify-between text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded-md border border-slate-800">
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <User className="h-3 w-3 text-amber-400" />
                        By <strong className="text-slate-100">{selectedNoteData.authorName || 'Adventurer'}</strong>
                        {isAuthor && <span className="text-[10px] text-amber-400 font-mono">(You)</span>}
                      </span>
                      <span>
                        {new Date(selectedNoteData.updatedAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-bold text-muted-foreground block mb-1">
                      {canEdit ? 'Note Content' : 'Note Content (Read Only)'}
                    </label>
                    <Textarea
                      value={draftNote}
                      onChange={(e) => setDraftNote(e.target.value)}
                      readOnly={!canEdit}
                      placeholder={canEdit ? "Write location observation, secret clues, or adventure notes..." : "No note written."}
                      className={`min-h-[140px] text-xs font-sans ${
                        !canEdit ? 'bg-slate-900/40 border-slate-800 text-slate-300 cursor-default' : ''
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-muted-foreground block mb-1">
                      Wiki Link (Optional)
                    </label>
                    {canEdit ? (
                      <div className="space-y-1">
                        <div className="relative">
                          <Input
                            value={draftWikiLink}
                            onChange={(e) => setDraftWikiLink(e.target.value)}
                            placeholder="https://void.tarragon.be/notes/... or /notes/my-location"
                            className="text-xs font-mono pr-8"
                          />
                          {draftWikiLink && (
                            <a
                              href={formatWikiUrl(draftWikiLink)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-300"
                              title="Test Wiki Link"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Link to campaign lore, articles, or notes on{' '}
                          <a
                            href="https://void.tarragon.be"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-400 hover:underline"
                          >
                            void.tarragon.be
                          </a>
                        </p>
                      </div>
                    ) : selectedNoteData?.wikiLink ? (
                      <div className="pt-0.5">
                        <a
                          href={formatWikiUrl(selectedNoteData.wikiLink)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-purple-950/40 border border-purple-800/60 text-purple-200 hover:bg-purple-900/50 hover:text-purple-100 transition-colors text-xs font-medium w-full"
                        >
                          <BookOpen className="h-4 w-4 text-purple-400 shrink-0" />
                          <span className="truncate flex-1 font-mono text-[11px]">{selectedNoteData.wikiLink}</span>
                          <ExternalLink className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                        </a>
                      </div>
                    ) : (
                      <p className="text-xs italic text-muted-foreground">No wiki link attached.</p>
                    )}
                  </div>
                </div>

                <DialogFooter className="pt-2 flex items-center justify-between sm:justify-between w-full">
                  <div>
                    {canDelete && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-destructive hover:bg-destructive/10 gap-1"
                        onClick={() => handleDeleteNote(selectedNoteData._id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete Note
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => setIsNoteDialogOpen(false)}
                    >
                      {canEdit ? 'Cancel' : 'Close'}
                    </Button>
                    {canEdit && (
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
                        onClick={handleSaveNote}
                      >
                        Save Note
                      </Button>
                    )}
                  </div>
                </DialogFooter>
              </>
            )
          })()}
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
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-muted-foreground">Tile Pyramid URL Template</label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[11px] gap-1 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/40"
                  onClick={() => handleOpenProcessorPicker('newMap')}
                >
                  <Layers className="h-3 w-3" />
                  Browse Hosted Maps
                </Button>
              </div>
              <Input
                value={newMapDraft.tileUrl}
                onChange={(e) => {
                  const val = e.target.value
                  setNewMapDraft({ ...newMapDraft, tileUrl: val })
                }}
                onBlur={(e) => checkAndFetchProcessorTiles(e.target.value, 'newMap')}
                placeholder="https://maps.tarragon.be/slug_tiles_files/{z}/{x}_{y}.webp"
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">
                DeepZoom tile pyramid format. Fast LOD zoom.
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-muted-foreground">Background Image URL (Optional)</label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[11px] gap-1 text-purple-400 hover:text-purple-300 hover:bg-purple-950/40"
                  asChild
                >
                  <a href="https://maps.tarragon.be" target="_blank" rel="noopener noreferrer" title="Upload new map image on maps.tarragon.be">
                    <Upload className="h-3 w-3" />
                    Upload to Processor
                    <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                  </a>
                </Button>
              </div>
              <Input
                value={newMapDraft.imageUrl}
                onChange={(e) => {
                  const val = e.target.value
                  setNewMapDraft({ ...newMapDraft, imageUrl: val })
                  if (val.includes('.webp') || val.includes('_tiles')) {
                    checkAndFetchProcessorTiles(val, 'newMap')
                  }
                }}
                onBlur={(e) => checkAndFetchProcessorTiles(e.target.value, 'newMap')}
                placeholder="https://... image URL"
              />
            </div>
            {/* Grid & Dimensions */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/40">
              <div>
                <label className="font-bold text-muted-foreground block mb-1">Grid Type</label>
                <Select
                  value={newMapDraft.gridType}
                  onValueChange={(val: any) => setNewMapDraft({ ...newMapDraft, gridType: val })}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hex">Pointy Hex Grid</SelectItem>
                    <SelectItem value="hex_flat">Flat-top Hex Grid</SelectItem>
                    <SelectItem value="square">Square Grid</SelectItem>
                    <SelectItem value="none">No Grid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="font-bold text-muted-foreground block mb-1">Grid Size (px)</label>
                <Input
                  type="number"
                  min="25"
                  className="h-8 text-xs font-mono"
                  value={newMapDraft.gridSize}
                  onChange={(e) => setNewMapDraft({ ...newMapDraft, gridSize: Math.max(25, Number(e.target.value)) })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="font-bold">Set as World Home Map</span>
              <Switch
                checked={newMapDraft.isHomeMap}
                onCheckedChange={(val) => setNewMapDraft({ ...newMapDraft, isHomeMap: val })}
              />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border/40">
              <div className="space-y-0.5 pr-2">
                <span className="font-bold flex items-center gap-1.5 text-xs text-foreground">
                  <EyeOff className="h-3.5 w-3.5 text-amber-400" />
                  Hide from Map Switcher
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Hidden from players in the dropdown. Navigable via linked markers.
                </p>
              </div>
              <Switch
                checked={newMapDraft.hideFromMenu || false}
                onCheckedChange={(val) => setNewMapDraft({ ...newMapDraft, hideFromMenu: val })}
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
            {/* MAP IMAGE / VECTOR SVG URL */}
            <div>
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1.5">
                <div className="flex items-center gap-2">
                  <label className="font-bold text-muted-foreground">Map Image / Vector SVG URL</label>
                  {settingsDraft.imageUrl.toLowerCase().includes('.svg') && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/60 border border-emerald-800/60 text-emerald-300">
                      Vector SVG
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[11px] gap-1 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/40"
                    onClick={() => handleOpenProcessorPicker('mapSettings')}
                  >
                    <Layers className="h-3 w-3" />
                    Browse Hosted Maps
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[11px] gap-1 text-purple-400 hover:text-purple-300 hover:bg-purple-950/40"
                    asChild
                  >
                    <a href="https://maps.tarragon.be" target="_blank" rel="noopener noreferrer" title="Upload new map image on maps.tarragon.be">
                      <Upload className="h-3 w-3" />
                      Upload to Processor
                      <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                    </a>
                  </Button>
                  {settingsDraft.imageUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[11px] gap-1 text-slate-300 hover:text-white hover:bg-slate-800"
                      onClick={() => handleCopyLink(settingsDraft.imageUrl, 'Image URL')}
                      title="Copy Image URL to clipboard"
                    >
                      <Copy className="h-3 w-3" />
                      Copy URL
                    </Button>
                  )}
                  {currentMap?.imageUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[11px] gap-1.5 text-purple-400 hover:text-purple-300 hover:bg-purple-950/40"
                      onClick={handleForceRefreshImage}
                      disabled={isRefreshingImage}
                      title="Force reload latest image from host (bypasses browser HTTP cache)"
                    >
                      <RefreshCw className={`h-3 w-3 ${isRefreshingImage ? 'animate-spin' : ''}`} />
                      Reload
                    </Button>
                  )}
                </div>
              </div>
              <Input
                value={settingsDraft.imageUrl}
                onChange={(e) => setSettingsDraft({ ...settingsDraft, imageUrl: e.target.value })}
                placeholder="https://maps.tarragon.be/hatham.svg"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Direct image or vector SVG URL. SVGs render at infinite vector resolution without tiling.
              </p>
            </div>

            {/* SVG VECTOR INFO & RESOLUTION PRESETS */}
            {settingsDraft.imageUrl.toLowerCase().includes('.svg') && (
              <div className="p-3 rounded-lg border border-emerald-800/60 bg-emerald-950/30 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white shadow-sm">
                      Vector SVG Mode
                    </span>
                    <span className="text-xs font-semibold text-emerald-300">Infinite Scaling Active</span>
                  </div>
                  {settingsDraft.tileUrl && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="h-6 text-[11px] px-2 shadow-sm font-semibold"
                      onClick={() => {
                        setSettingsDraft((prev) => ({ ...prev, tileUrl: '' }))
                        toast.success('Cleared tile pyramid to enable pure vector SVG!')
                      }}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clear Tile Pyramid (Use Pure SVG)
                    </Button>
                  )}
                </div>
                <p className="text-[11px] text-emerald-200/80 leading-relaxed">
                  {settingsDraft.tileUrl
                    ? '⚠️ A tile pyramid is currently attached. Because tile pyramids are raster JPEGs, they will overlay the vector SVG and appear blurry or pixelated. Clear the tile pyramid to render directly in crisp vector SVG.'
                    : '✨ Rendering directly in pure vector SVG! All paths, biomes, labels, and icons remain razor sharp at any zoom level.'}
                </p>
                <div className="pt-2 border-t border-emerald-800/40 flex items-center justify-between flex-wrap gap-2 text-xs">
                  <span className="text-emerald-300 text-[11px] font-medium">
                    Recommended Canvas Size:
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 text-[11px] px-2 border-emerald-700/60 text-emerald-200 hover:bg-emerald-900/50"
                      onClick={() => {
                        const baseDim = (naturalDimensions?.width && naturalDimensions.width < 1000)
                          ? naturalDimensions.width
                          : 284
                        const w = Math.round(baseDim * 10)
                        setSettingsDraft((prev) => ({ ...prev, width: w, height: w }))
                        toast.success(`Set SVG canvas size to ${w}×${w}px (10×)`)
                      }}
                    >
                      10× (2840px)
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 text-[11px] px-2 border-emerald-700/60 text-emerald-200 hover:bg-emerald-900/50"
                      onClick={() => {
                        const baseDim = (naturalDimensions?.width && naturalDimensions.width < 1000)
                          ? naturalDimensions.width
                          : 284
                        const w = Math.round(baseDim * 15)
                        setSettingsDraft((prev) => ({ ...prev, width: w, height: w }))
                        toast.success(`Set SVG canvas size to ${w}×${w}px (15×)`)
                      }}
                    >
                      15× (4260px)
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 text-[11px] px-2 border-emerald-700/60 text-emerald-200 hover:bg-emerald-900/50"
                      onClick={() => {
                        const baseDim = (naturalDimensions?.width && naturalDimensions.width < 1000)
                          ? naturalDimensions.width
                          : 284
                        const w = Math.round(baseDim * 20)
                        setSettingsDraft((prev) => ({ ...prev, width: w, height: w }))
                        toast.success(`Set SVG canvas size to ${w}×${w}px (20×)`)
                      }}
                    >
                      20× (5680px)
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* TILE PYRAMID URL */}
            <div>
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1.5">
                <label className="font-bold text-muted-foreground flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-cyan-400" />
                  DeepZoom Tile Pyramid URL (Optional)
                </label>
                <div className="flex items-center gap-1.5">
                  {settingsDraft.tileUrl ? (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[11px] gap-1 text-slate-300 hover:text-white hover:bg-slate-800"
                        onClick={() => handleCopyLink(settingsDraft.tileUrl, 'Tile Pyramid URL')}
                        title="Copy Tile URL to clipboard"
                      >
                        <Copy className="h-3 w-3" />
                        Copy Tiles URL
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[11px] gap-1 text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          setSettingsDraft((prev) => ({ ...prev, tileUrl: '' }))
                          toast.success('Cleared tile pyramid template!')
                        }}
                        title="Remove tile pyramid URL"
                      >
                        <Trash2 className="h-3 w-3" />
                        Clear Tiles
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[11px] gap-1 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/40"
                      onClick={() => checkAndFetchProcessorTiles(settingsDraft.imageUrl, 'mapSettings')}
                      title="Check processor for tiles matching the current image URL"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Detect Tiles
                    </Button>
                  )}
                </div>
              </div>
              <Input
                value={settingsDraft.tileUrl}
                onChange={(e) => setSettingsDraft({ ...settingsDraft, tileUrl: e.target.value })}
                placeholder="https://maps.tarragon.be/slug_tiles_files/{z}/{x}_{y}.webp"
                className="font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Supports DeepZoom WebP/JPEG tile pyramids for massive raster maps. Leave blank for direct vector SVGs.
              </p>
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
              <div className="flex items-center justify-between text-xs bg-muted/40 p-2 rounded-md border border-border/50 flex-wrap gap-2">
                <span className="text-muted-foreground">
                  Detected Image Size: <strong className="text-foreground">{naturalDimensions.width} × {naturalDimensions.height} px</strong>
                  {settingsDraft.imageUrl.toLowerCase().includes('.svg') && naturalDimensions.width < 1000 && (
                    <span className="text-emerald-400 ml-1 font-normal">(Raw SVG viewBox)</span>
                  )}
                </span>
                <div className="flex items-center gap-1.5">
                  {settingsDraft.imageUrl.toLowerCase().includes('.svg') && naturalDimensions.width < 1000 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs border-emerald-700/60 text-emerald-300 hover:bg-emerald-950/50"
                      onClick={() =>
                        setSettingsDraft({
                          ...settingsDraft,
                          width: Math.round(naturalDimensions.width * 10),
                          height: Math.round(naturalDimensions.height * 10),
                        })
                      }
                    >
                      Use 10× ({Math.round(naturalDimensions.width * 10)}×{Math.round(naturalDimensions.height * 10)})
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() =>
                      setSettingsDraft({
                        ...settingsDraft,
                        width: naturalDimensions.width,
                        height: naturalDimensions.height,
                      })
                    }
                  >
                    Use Detected Size
                  </Button>
                </div>
              </div>
            )}

            {/* World Home Map & Map Visibility */}
            <div className="space-y-2 pt-1 border-t border-border/40">
              <div className="flex items-center justify-between">
                <span className="font-bold">Set as World Home Map</span>
                <Switch
                  checked={settingsDraft.isHomeMap}
                  onCheckedChange={(val) => setSettingsDraft({ ...settingsDraft, isHomeMap: val })}
                />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border/40">
                <div className="space-y-0.5 pr-2">
                  <span className="font-bold flex items-center gap-1.5 text-xs text-foreground">
                    <EyeOff className="h-3.5 w-3.5 text-amber-400" />
                    Hide from Map Switcher
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Hidden from players in the top-left dropdown. Navigable via linked markers.
                  </p>
                </div>
                <Switch
                  checked={settingsDraft.hideFromMenu || false}
                  onCheckedChange={(val) => setSettingsDraft({ ...settingsDraft, hideFromMenu: val })}
                />
              </div>
            </div>
            
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
                      title="Edit Area Name, Lore & Link"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Edit Details
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 text-xs border-purple-500/40 text-purple-300 hover:text-white hover:bg-purple-950/50"
                      onClick={() => {
                        handleStartReshaping(selectedArea)
                      }}
                      title="Edit Polygon Shape & Vertices on Map"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                      Edit Shape
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        deleteAreaMutation({ areaId: selectedArea._id })
                        setSelectedArea(null)
                      }}
                      title="Delete Area"
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
                    <MapIcon className="h-3.5 w-3.5" />
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
                      {m.name} {m.isHomeMap ? '🏠 ' : ''}{m.hideFromMenu ? '(Hidden)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Polygon Shape & Reshape on Map */}
            {areaDraft.id && (
              <div className="flex items-center justify-between border border-border/60 bg-muted/20 px-3 py-2 rounded-md">
                <div className="space-y-0.5 pr-2">
                  <span className="font-bold flex items-center gap-1.5 text-xs text-foreground">
                    <Maximize2 className="h-3.5 w-3.5 text-purple-400" />
                    Polygon Shape ({areaDraft.points.length} points)
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Move vertices, insert points, or redraw directly on the map.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1 border-purple-500/40 text-purple-300 hover:text-white hover:bg-purple-950/50 shrink-0"
                  onClick={() => {
                    const currentArea = fullData?.areas.find((a) => a._id === areaDraft.id)
                    if (currentArea) {
                      setIsAreaDialogOpen(false)
                      handleStartReshaping(currentArea)
                    }
                  }}
                >
                  <Edit3 className="h-3 w-3" /> Reshape
                </Button>
              </div>
            )}

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
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-muted-foreground">Tile Pyramid URL Template</label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[11px] gap-1 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/40"
                  onClick={() => handleOpenProcessorPicker('layer')}
                >
                  <Layers className="h-3 w-3" />
                  Browse Hosted Maps
                </Button>
              </div>
              <Input
                value={newLayerDraft.tileUrl}
                onChange={(e) => {
                  const val = e.target.value
                  setNewLayerDraft({ ...newLayerDraft, tileUrl: val })
                }}
                onBlur={(e) => checkAndFetchProcessorTiles(e.target.value, 'layer')}
                placeholder="https://maps.tarragon.be/borders_tiles_files/{z}/{x}_{y}.webp"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-muted-foreground">Overlay Image URL (SVG / Transparent WebP / PNG)</label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[11px] gap-1 text-purple-400 hover:text-purple-300 hover:bg-purple-950/40"
                  asChild
                >
                  <a href="https://maps.tarragon.be" target="_blank" rel="noopener noreferrer" title="Upload new layer image on maps.tarragon.be">
                    <Upload className="h-3 w-3" />
                    Upload to Processor
                    <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                  </a>
                </Button>
              </div>
              <Input
                value={newLayerDraft.imageUrl}
                onChange={(e) => {
                  const val = e.target.value
                  setNewLayerDraft({ ...newLayerDraft, imageUrl: val })
                  if (val.includes('.webp') || val.includes('_tiles')) {
                    checkAndFetchProcessorTiles(val, 'layer')
                  }
                }}
                onBlur={(e) => checkAndFetchProcessorTiles(e.target.value, 'layer')}
                placeholder="https://maps.tarragon.be/borders.svg"
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

      {/* DIALOG: PROCESSOR MAPS PICKER */}
      <Dialog open={isProcessorPickerOpen} onOpenChange={setIsProcessorPickerOpen}>
        <DialogContent className="w-full sm:max-w-2xl max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-base font-bold">
                <Layers className="h-5 w-5 text-cyan-400 shrink-0" />
                Hosted Maps on Map Processor
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1 text-purple-400 hover:text-purple-300 shrink-0"
                asChild
              >
                <a href="https://maps.tarragon.be" target="_blank" rel="noopener noreferrer">
                  <Upload className="h-3.5 w-3.5" />
                  Open Processor ↗
                </a>
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <p className="text-muted-foreground">
              Select any hosted map below to automatically import its image URL, tile pyramid endpoint, and native dimensions.
            </p>

            {isLoadingProcessorMaps ? (
              <div className="py-8 text-center text-muted-foreground space-y-2">
                <RefreshCw className="h-5 w-5 animate-spin mx-auto text-cyan-400" />
                <p>Loading hosted maps from processor...</p>
              </div>
            ) : processorMaps.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground bg-muted/20 border border-border/50 rounded-lg p-4">
                No maps found on processor.
              </div>
            ) : (
              <div className="space-y-2">
                {processorMaps.map((item) => (
                  <div
                    key={item.slug}
                    className="p-3 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 hover:border-cyan-500/50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 overflow-hidden"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-foreground">{item.slug}</span>
                        {item.width && item.height && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                            {item.width}×{item.height}px
                          </span>
                        )}
                        {item.maxZoom !== undefined && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-800/60 text-purple-300">
                            Zoom 0–{item.maxZoom}
                          </span>
                        )}
                        {item.svgUrl && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60 text-emerald-300">
                            SVG Available
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-muted-foreground truncate w-full" title={item.tilesUrl || item.svgUrl || item.imageUrl}>
                        {item.tilesUrl || item.svgUrl || item.imageUrl}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
                      {item.tilesUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[11px] text-slate-300 hover:text-white hover:bg-slate-800"
                          onClick={() => handleCopyLink(item.tilesUrl, 'Tile URL')}
                          title="Copy tile pyramid URL template"
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Tiles
                        </Button>
                      )}
                      {(item.svgUrl || item.imageUrl) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[11px] text-slate-300 hover:text-white hover:bg-slate-800"
                          onClick={() => handleCopyLink(item.svgUrl || item.imageUrl, item.svgUrl ? 'SVG URL' : 'Image URL')}
                          title={`Copy ${item.svgUrl ? 'SVG' : 'Image'} URL`}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          {item.svgUrl ? 'SVG' : 'Image'}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shadow-sm"
                        onClick={() => handleSelectProcessorMap(item)}
                      >
                        Use This Map
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
