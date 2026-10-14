import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Layers, Upload, ExternalLink, EyeOff } from 'lucide-react'

export interface NewMapDraft {
  name: string
  slug: string
  imageUrl: string
  tileUrl: string
  gridType: 'hex' | 'hex_flat' | 'square' | 'none'
  gridSize: number
  width: number
  height: number
  isHomeMap: boolean
  hideFromMenu: boolean
}

interface MapNewMapModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  draft: NewMapDraft
  onChangeDraft: (draft: NewMapDraft) => void
  onOpenProcessorPicker: () => void
  onDetectTiles: (url: string) => void
  onCreateMap: () => void
}

export function MapNewMapModal({
  isOpen,
  onOpenChange,
  draft,
  onChangeDraft,
  onOpenProcessorPicker,
  onDetectTiles,
  onCreateMap,
}: MapNewMapModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-slate-950 dark:bg-slate-950 border-slate-800 text-slate-100">
        <DialogHeader>
          <DialogTitle className="text-slate-100">Create World Map</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-400">Map Name</label>
            <Input
              value={draft.name}
              onChange={(e) => {
                const name = e.target.value
                const slug = name.toLowerCase().replace(/\s+/g, '-')
                onChangeDraft({ ...draft, name, slug })
              }}
              placeholder="Capital City, Underground Cave..."
              className="bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500"
            />
          </div>
          <div>
            <label className="font-bold text-slate-400">URL Slug</label>
            <Input
              value={draft.slug}
              onChange={(e) => onChangeDraft({ ...draft, slug: e.target.value })}
              placeholder="capital-city"
              className="bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-400">Tile Pyramid URL Template</label>
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
            </div>
            <Input
              value={draft.tileUrl}
              onChange={(e) => {
                const val = e.target.value
                onChangeDraft({ ...draft, tileUrl: val })
              }}
              onBlur={(e) => onDetectTiles(e.target.value)}
              placeholder="https://maps.tarragon.be/slug_tiles_files/{z}/{x}_{y}.webp"
              className="bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500 font-mono text-xs"
            />
            <p className="text-[10px] text-slate-400 mt-0.5">
              DeepZoom tile pyramid format. Fast LOD zoom.
            </p>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-400">Background Image URL (Optional)</label>
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
              value={draft.imageUrl}
              onChange={(e) => {
                const val = e.target.value
                onChangeDraft({ ...draft, imageUrl: val })
                if (val.includes('.webp') || val.includes('_tiles')) {
                  onDetectTiles(val)
                }
              }}
              onBlur={(e) => onDetectTiles(e.target.value)}
              placeholder="https://... image URL"
              className="bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500"
            />
          </div>
          {/* Grid & Dimensions */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
            <div>
              <label className="font-bold text-slate-400 block mb-1">Grid Type</label>
              <Select
                value={draft.gridType}
                onValueChange={(val: any) => onChangeDraft({ ...draft, gridType: val })}
              >
                <SelectTrigger className="h-8 text-xs bg-slate-900 border-slate-800 text-slate-100"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hex">Pointy Hex Grid</SelectItem>
                  <SelectItem value="hex_flat">Flat-top Hex Grid</SelectItem>
                  <SelectItem value="square">Square Grid</SelectItem>
                  <SelectItem value="none">No Grid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="font-bold text-slate-400 block mb-1">Grid Size (px)</label>
              <Input
                type="number"
                min="25"
                className="h-8 text-xs font-mono bg-slate-900 border-slate-800 text-slate-100"
                value={draft.gridSize}
                onChange={(e) => onChangeDraft({ ...draft, gridSize: Math.max(25, Number(e.target.value)) })}
              />
            </div>
          </div>
          <div className="flex items-center justify-between pt-2">
            <span className="font-bold text-slate-200">Set as World Home Map</span>
            <Switch
              checked={draft.isHomeMap}
              onCheckedChange={(val) => onChangeDraft({ ...draft, isHomeMap: val })}
            />
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <div className="space-y-0.5 pr-2">
              <span className="font-bold flex items-center gap-1.5 text-xs text-slate-200">
                <EyeOff className="h-3.5 w-3.5 text-amber-400" />
                Hide from Map Switcher
              </span>
              <p className="text-[11px] text-slate-400">
                Hidden from players in the dropdown. Navigable via linked markers.
              </p>
            </div>
            <Switch
              checked={draft.hideFromMenu || false}
              onCheckedChange={(val) => onChangeDraft({ ...draft, hideFromMenu: val })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button size="sm" onClick={onCreateMap} className="bg-purple-600 hover:bg-purple-500 text-white font-semibold">
            Create Map
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
