import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { EyeOff, Edit3, Maximize2, Trash2, Map as MapIcon } from 'lucide-react'
import { Id } from '@/convex/_generated/dataModel'

export interface AreaItem {
  _id: Id<'mapAreas'>
  name: string
  description?: string
  color?: string
  fillOpacity?: number
  targetMapId?: Id<'worldMaps'>
  layerId?: Id<'mapLayers'>
  points: { x: number; y: number }[]
  gmOnly?: boolean
}

export interface AreaDraft {
  id?: Id<'mapAreas'>
  name: string
  description: string
  color: string
  fillOpacity: number
  points: { x: number; y: number }[]
  gmOnly?: boolean
  targetMapId?: Id<'worldMaps'>
  layerId?: Id<'mapLayers'>
}

interface WorldMapRef {
  _id: Id<'worldMaps'>
  name: string
  slug: string
  isHomeMap?: boolean
  hideFromMenu?: boolean
}

interface LayerItem {
  _id: Id<'mapLayers'>
  name: string
}

interface MapAreaDetailsModalProps {
  selectedArea: AreaItem | null
  onClose: () => void
  isOwner: boolean
  worldMaps: WorldMapRef[] | undefined
  onEditArea: (area: AreaItem) => void
  onReshapeArea: (area: AreaItem) => void
  onDeleteArea: (areaId: Id<'mapAreas'>) => void
  onNavigateToMap: (slug: string) => void
}

export function MapAreaDetailsModal({
  selectedArea,
  onClose,
  isOwner,
  worldMaps,
  onEditArea,
  onReshapeArea,
  onDeleteArea,
  onNavigateToMap,
}: MapAreaDetailsModalProps) {
  if (!selectedArea) return null

  return (
    <Dialog open={!!selectedArea} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-slate-950 dark:bg-slate-950 border-slate-800 text-slate-100">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-slate-100">
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
                  className="h-8 gap-1 text-xs border-slate-700 bg-slate-900 text-slate-200 hover:text-white hover:bg-slate-800"
                  onClick={() => onEditArea(selectedArea)}
                  title="Edit Area Name, Lore & Link"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Edit Details
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 text-xs border-purple-500/40 text-purple-300 hover:text-white hover:bg-purple-950/50"
                  onClick={() => onReshapeArea(selectedArea)}
                  title="Edit Polygon Shape & Vertices on Map"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  Edit Shape
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                  onClick={() => onDeleteArea(selectedArea._id)}
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
            <p className="text-slate-300 whitespace-pre-wrap">{selectedArea.description}</p>
          ) : (
            <p className="text-xs italic text-slate-500">No description provided for this area.</p>
          )}
          {selectedArea.targetMapId && (
            <div className="pt-2 border-t border-slate-800">
              <Button
                variant="secondary"
                size="sm"
                className="w-full gap-2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-100"
                onClick={() => {
                  const target = worldMaps?.find((m) => m._id === selectedArea.targetMapId)
                  if (target) onNavigateToMap(target.slug)
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
  )
}

interface MapAreaFormModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  areaDraft: AreaDraft
  onChangeDraft: (draft: AreaDraft) => void
  isOwner: boolean
  layers: LayerItem[] | undefined
  worldMaps: WorldMapRef[] | undefined
  onSave: () => void
  onReshape: () => void
}

export function MapAreaFormModal({
  isOpen,
  onOpenChange,
  areaDraft,
  onChangeDraft,
  isOwner,
  layers,
  worldMaps,
  onSave,
  onReshape,
}: MapAreaFormModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto bg-slate-950 dark:bg-slate-950 border-slate-800 text-slate-100">
        <DialogHeader>
          <DialogTitle className="text-slate-100">
            {areaDraft.id ? 'Edit Area Details' : `Save Polygon Area (${areaDraft.points.length} points)`}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3.5 text-xs">
          <div>
            <label className="font-bold text-slate-400">Area Name</label>
            <Input
              value={areaDraft.name}
              onChange={(e) => onChangeDraft({ ...areaDraft, name: e.target.value })}
              placeholder="Forbidden Forest, Whisper Plains..."
              className="bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500"
            />
          </div>
          <div>
            <label className="font-bold text-slate-400">Description</label>
            <Textarea
              value={areaDraft.description || ''}
              onChange={(e) => onChangeDraft({ ...areaDraft, description: e.target.value })}
              placeholder="Area lore, hazards, details..."
              rows={3}
              className="bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-bold text-slate-400">Color</label>
              <Input
                type="color"
                value={areaDraft.color}
                onChange={(e) => onChangeDraft({ ...areaDraft, color: e.target.value })}
                className="h-9 p-1 bg-slate-900 border-slate-800 cursor-pointer"
              />
            </div>
            <div>
              <label className="font-bold text-slate-400">Opacity (0.1 - 1.0)</label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={areaDraft.fillOpacity}
                onChange={(e) => onChangeDraft({ ...areaDraft, fillOpacity: Number(e.target.value) })}
                className="bg-slate-900 border-slate-800 text-slate-100"
              />
            </div>
          </div>

          {/* Layer selection if layers exist */}
          {layers && layers.length > 0 && (
            <div>
              <label className="font-bold text-slate-400">Layer (Optional)</label>
              <Select
                value={areaDraft.layerId || 'none'}
                onValueChange={(val) =>
                  onChangeDraft({ ...areaDraft, layerId: val === 'none' ? undefined : (val as Id<'mapLayers'>) })
                }
              >
                <SelectTrigger className="bg-slate-900 border-slate-800 text-slate-100"><SelectValue placeholder="All Layers" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Default / All Layers</SelectItem>
                  {layers.map((l) => (
                    <SelectItem key={l._id} value={l._id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <label className="font-bold text-slate-400">Link to Map (Optional)</label>
            <Select
              value={areaDraft.targetMapId || 'none'}
              onValueChange={(val) =>
                onChangeDraft({ ...areaDraft, targetMapId: val === 'none' ? undefined : (val as Id<'worldMaps'>) })
              }
            >
              <SelectTrigger className="bg-slate-900 border-slate-800 text-slate-100"><SelectValue placeholder="None" /></SelectTrigger>
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
            <div className="flex items-center justify-between border border-slate-800 bg-slate-900/40 px-3 py-2 rounded-md">
              <div className="space-y-0.5 pr-2">
                <span className="font-bold flex items-center gap-1.5 text-xs text-slate-200">
                  <Maximize2 className="h-3.5 w-3.5 text-purple-400" />
                  Polygon Shape ({areaDraft.points.length} points)
                </span>
                <p className="text-[11px] text-slate-400">
                  Move vertices, insert points, or redraw directly on the map.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 border-purple-500/40 text-purple-300 hover:text-white hover:bg-purple-950/50 shrink-0"
                onClick={onReshape}
              >
                <Edit3 className="h-3 w-3" /> Reshape
              </Button>
            </div>
          )}

          {/* GM Secret Toggle */}
          {isOwner && (
            <div className="flex items-center justify-between border border-slate-800 bg-slate-900/40 px-3 py-2.5 rounded-md">
              <div className="space-y-0.5 pr-2">
                <span className="font-bold flex items-center gap-1.5 text-xs text-slate-200">
                  <EyeOff className="h-3.5 w-3.5 text-amber-400" />
                  Secret Area (GM Only)
                </span>
                <p className="text-[11px] text-slate-400">
                  Dashed outline. Hidden from players, visible only to GM.
                </p>
              </div>
              <Switch
                checked={areaDraft.gmOnly || false}
                onCheckedChange={(val) => onChangeDraft({ ...areaDraft, gmOnly: val })}
              />
            </div>
          )}
        </div>
        <DialogFooter className="pt-2">
          <Button size="sm" onClick={onSave} className="bg-purple-600 hover:bg-purple-500 text-white font-semibold">
            {areaDraft.id ? 'Update Area' : 'Save Area'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
