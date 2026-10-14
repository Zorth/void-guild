import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Trash2, Layers, Upload, ExternalLink, Copy, RefreshCw, EyeOff, Ruler,
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown
} from 'lucide-react'
import { toast } from 'sonner'
import { Id } from '@/convex/_generated/dataModel'

export interface SettingsDraft {
  name: string
  slug: string
  imageUrl: string
  tileUrl: string
  tileSize: number
  minZoom: number
  maxZoom: number | undefined
  width: number
  height: number
  gridType: 'hex' | 'hex_flat' | 'square' | 'none'
  gridSize: number
  gridOffsetX: number
  gridOffsetY: number
  gridScale?: number
  gridScaleUnit?: string
  isHomeMap: boolean
  isExplorationMap: boolean
  hideFromMenu: boolean
}

interface CurrentMapRef {
  _id: Id<'worldMaps'>
  imageUrl?: string
}

interface MapSettingsModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  currentMap: CurrentMapRef | null
  settingsDraft: SettingsDraft
  onChangeDraft: (draft: SettingsDraft) => void
  naturalDimensions: { width: number; height: number } | null
  isRefreshingImage: boolean
  onForceRefreshImage: () => void
  onOpenProcessorPicker: () => void
  onDetectTiles: (url: string) => void
  onCopyLink: (url: string, label: string) => void
  onDeleteMap: (mapId: Id<'worldMaps'>) => void
  onSaveSettings: () => void
  onUpdateLiveGridSize?: (size: number) => void
  onUpdateLiveGridOffset?: (offset: { x: number; y: number }) => void
}

export function MapSettingsModal({
  isOpen,
  onOpenChange,
  currentMap,
  settingsDraft,
  onChangeDraft,
  naturalDimensions,
  isRefreshingImage,
  onForceRefreshImage,
  onOpenProcessorPicker,
  onDetectTiles,
  onCopyLink,
  onDeleteMap,
  onSaveSettings,
  onUpdateLiveGridSize,
  onUpdateLiveGridOffset,
}: MapSettingsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto bg-slate-950 dark:bg-slate-950 border-slate-800 text-slate-100">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between text-slate-100">
            <span>Map Settings</span>
            {currentMap && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                onClick={() => onDeleteMap(currentMap._id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-400">Name</label>
              <Input
                value={settingsDraft.name}
                onChange={(e) => onChangeDraft({ ...settingsDraft, name: e.target.value })}
                className="bg-slate-900 border-slate-800 text-slate-100"
              />
            </div>
            <div>
              <label className="font-bold text-slate-400">Slug</label>
              <Input
                value={settingsDraft.slug}
                onChange={(e) => onChangeDraft({ ...settingsDraft, slug: e.target.value })}
                className="bg-slate-900 border-slate-800 text-slate-100"
              />
            </div>
          </div>

          {/* MAP IMAGE / VECTOR SVG URL */}
          <div>
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1.5">
              <div className="flex items-center gap-2">
                <label className="font-bold text-slate-400">Map Image / Vector SVG URL</label>
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
                  onClick={onOpenProcessorPicker}
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
                    onClick={() => onCopyLink(settingsDraft.imageUrl, 'Image URL')}
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
                    onClick={onForceRefreshImage}
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
              onChange={(e) => onChangeDraft({ ...settingsDraft, imageUrl: e.target.value })}
              placeholder="https://maps.tarragon.be/hatham.svg"
              className="bg-slate-900 border-slate-800 text-slate-100"
            />
            <p className="text-[11px] text-slate-400 mt-1">
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
                      onChangeDraft({ ...settingsDraft, tileUrl: '' })
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
                      onChangeDraft({ ...settingsDraft, width: w, height: w })
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
                      onChangeDraft({ ...settingsDraft, width: w, height: w })
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
                      onChangeDraft({ ...settingsDraft, width: w, height: w })
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
              <label className="font-bold text-slate-400 flex items-center gap-1.5">
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
                      onClick={() => onCopyLink(settingsDraft.tileUrl, 'Tile Pyramid URL')}
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
                        onChangeDraft({ ...settingsDraft, tileUrl: '' })
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
                    onClick={() => onDetectTiles(settingsDraft.imageUrl)}
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
              onChange={(e) => onChangeDraft({ ...settingsDraft, tileUrl: e.target.value })}
              placeholder="https://maps.tarragon.be/slug_tiles_files/{z}/{x}_{y}.webp"
              className="font-mono text-xs bg-slate-900 border-slate-800 text-slate-100"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Supports DeepZoom WebP/JPEG tile pyramids for massive raster maps. Leave blank for direct vector SVGs.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-400">Width (px)</label>
              <Input
                type="number"
                value={settingsDraft.width}
                onChange={(e) => onChangeDraft({ ...settingsDraft, width: Number(e.target.value) })}
                className="bg-slate-900 border-slate-800 text-slate-100"
              />
            </div>
            <div>
              <label className="font-bold text-slate-400">Height (px)</label>
              <Input
                type="number"
                value={settingsDraft.height}
                onChange={(e) => onChangeDraft({ ...settingsDraft, height: Number(e.target.value) })}
                className="bg-slate-900 border-slate-800 text-slate-100"
              />
            </div>
          </div>
          {naturalDimensions && (
            <div className="flex items-center justify-between text-xs bg-slate-900/40 p-2 rounded-md border border-slate-800 flex-wrap gap-2">
              <span className="text-slate-400">
                Detected Image Size: <strong className="text-slate-100">{naturalDimensions.width} × {naturalDimensions.height} px</strong>
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
                      onChangeDraft({
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
                  className="h-7 text-xs border-slate-700 bg-slate-900 text-slate-200 hover:text-white hover:bg-slate-800"
                  onClick={() =>
                    onChangeDraft({
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
          <div className="space-y-2 pt-1 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200">Set as World Home Map</span>
              <Switch
                checked={settingsDraft.isHomeMap}
                onCheckedChange={(val) => onChangeDraft({ ...settingsDraft, isHomeMap: val })}
              />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <div className="space-y-0.5 pr-2">
                <span className="font-bold flex items-center gap-1.5 text-xs text-slate-200">
                  <EyeOff className="h-3.5 w-3.5 text-amber-400" />
                  Hide from Map Switcher
                </span>
                <p className="text-[11px] text-slate-400">
                  Hidden from players in the top-left dropdown. Navigable via linked markers.
                </p>
              </div>
              <Switch
                checked={settingsDraft.hideFromMenu || false}
                onCheckedChange={(val) => onChangeDraft({ ...settingsDraft, hideFromMenu: val })}
              />
            </div>
          </div>
          
          {/* Grid & Exploration Settings */}
          <div className="border border-slate-800 rounded-lg p-3.5 bg-slate-900/40 space-y-3.5">
            <div className="grid grid-cols-2 gap-3 items-end">
              <div className="min-w-0">
                <label className="font-bold text-slate-400 block mb-1">Grid Type</label>
                <Select
                  value={settingsDraft.gridType}
                  onValueChange={(val: any) => onChangeDraft({ ...settingsDraft, gridType: val })}
                >
                  <SelectTrigger className="w-full truncate h-9 bg-slate-900 border-slate-800 text-slate-100"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="hex">Pointy Hex (Standard)</SelectItem>
                    <SelectItem value="hex_flat">Flat-top Hex</SelectItem>
                    <SelectItem value="square">Square Grid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0">
                <label className="font-bold text-slate-400 block mb-1">Fog of War</label>
                <div className="flex items-center justify-between border border-slate-800 bg-slate-900 px-3 h-9 rounded-md">
                  <span className="font-medium text-xs text-slate-200">Exploration Mode</span>
                  <Switch
                    checked={settingsDraft.isExplorationMap}
                    onCheckedChange={(val) => onChangeDraft({ ...settingsDraft, isExplorationMap: val })}
                  />
                </div>
              </div>
            </div>

            {settingsDraft.gridType !== 'none' && (
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-400">Grid Size (px)</label>
                    <span className="text-[11px] font-mono text-slate-400">{settingsDraft.gridSize || 100}px</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0 border-slate-700 bg-slate-900 text-slate-200 hover:text-white hover:bg-slate-800"
                      onClick={() => {
                        const val = Math.max(25, (settingsDraft.gridSize || 100) - 5)
                        onChangeDraft({ ...settingsDraft, gridSize: val })
                        onUpdateLiveGridSize?.(val)
                      }}
                    >
                      -
                    </Button>
                    <Input
                      type="number"
                      className="font-mono text-center h-9 bg-slate-900 border-slate-800 text-slate-100"
                      value={settingsDraft.gridSize}
                      onChange={(e) => {
                        const val = Number(e.target.value)
                        onChangeDraft({ ...settingsDraft, gridSize: val })
                        onUpdateLiveGridSize?.(val)
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0 border-slate-700 bg-slate-900 text-slate-200 hover:text-white hover:bg-slate-800"
                      onClick={() => {
                        const val = (settingsDraft.gridSize || 100) + 5
                        onChangeDraft({ ...settingsDraft, gridSize: val })
                        onUpdateLiveGridSize?.(val)
                      }}
                    >
                      +
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="min-w-0">
                    <label className="font-bold text-slate-400 block mb-1">Grid Offset X (px)</label>
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 shrink-0 border-slate-700 bg-slate-900 text-slate-200 hover:text-white hover:bg-slate-800"
                        onClick={() => {
                          const val = (settingsDraft.gridOffsetX || 0) - 5
                          onChangeDraft({ ...settingsDraft, gridOffsetX: val })
                          onUpdateLiveGridOffset?.({ x: val, y: settingsDraft.gridOffsetY || 0 })
                        }}
                        title="Nudge Left 5px"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        className="font-mono text-center h-9 bg-slate-900 border-slate-800 text-slate-100"
                        value={settingsDraft.gridOffsetX}
                        onChange={(e) => {
                          const val = Number(e.target.value)
                          onChangeDraft({ ...settingsDraft, gridOffsetX: val })
                          onUpdateLiveGridOffset?.({ x: val, y: settingsDraft.gridOffsetY || 0 })
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 shrink-0 border-slate-700 bg-slate-900 text-slate-200 hover:text-white hover:bg-slate-800"
                        onClick={() => {
                          const val = (settingsDraft.gridOffsetX || 0) + 5
                          onChangeDraft({ ...settingsDraft, gridOffsetX: val })
                          onUpdateLiveGridOffset?.({ x: val, y: settingsDraft.gridOffsetY || 0 })
                        }}
                        title="Nudge Right 5px"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <label className="font-bold text-slate-400 block mb-1">Grid Offset Y (px)</label>
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 shrink-0 border-slate-700 bg-slate-900 text-slate-200 hover:text-white hover:bg-slate-800"
                        onClick={() => {
                          const val = (settingsDraft.gridOffsetY || 0) - 5
                          onChangeDraft({ ...settingsDraft, gridOffsetY: val })
                          onUpdateLiveGridOffset?.({ x: settingsDraft.gridOffsetX || 0, y: val })
                        }}
                        title="Nudge Up 5px"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        className="font-mono text-center h-9 bg-slate-900 border-slate-800 text-slate-100"
                        value={settingsDraft.gridOffsetY}
                        onChange={(e) => {
                          const val = Number(e.target.value)
                          onChangeDraft({ ...settingsDraft, gridOffsetY: val })
                          onUpdateLiveGridOffset?.({ x: settingsDraft.gridOffsetX || 0, y: val })
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 shrink-0 border-slate-700 bg-slate-900 text-slate-200 hover:text-white hover:bg-slate-800"
                        onClick={() => {
                          const val = (settingsDraft.gridOffsetY || 0) + 5
                          onChangeDraft({ ...settingsDraft, gridOffsetY: val })
                          onUpdateLiveGridOffset?.({ x: settingsDraft.gridOffsetX || 0, y: val })
                        }}
                        title="Nudge Down 5px"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Map Scale / Distance Calibration */}
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-400 flex items-center gap-1.5">
                      <Ruler className="h-3.5 w-3.5 text-cyan-400" />
                      Map Distance Scale (Optional)
                    </label>
                    <span className="text-[10px] text-slate-500">Used by Ruler tool</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">
                        Distance per {settingsDraft.gridType === 'square' ? 'Square' : 'Hex'}
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="e.g. 5, 24, 50"
                        value={settingsDraft.gridScale || ''}
                        onChange={(e) => onChangeDraft({ ...settingsDraft, gridScale: Math.max(0, Number(e.target.value)) })}
                        className="h-9 font-mono bg-slate-900 border-slate-800 text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Scale Unit</label>
                      <Select
                        value={settingsDraft.gridScaleUnit || 'miles'}
                        onValueChange={(val) => onChangeDraft({ ...settingsDraft, gridScaleUnit: val })}
                      >
                        <SelectTrigger className="h-9 bg-slate-900 border-slate-800 text-slate-100"><SelectValue /></SelectTrigger>
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
                  <p className="text-[10px] text-slate-500">
                    Example: 1 hex = {settingsDraft.gridScale || 1} {settingsDraft.gridScaleUnit || 'miles'}. When set, the Ruler measures real in-world travel distances.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button size="sm" onClick={onSaveSettings} className="bg-purple-600 hover:bg-purple-500 text-white font-semibold">
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
