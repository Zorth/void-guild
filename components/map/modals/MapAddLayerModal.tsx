import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Layers, Upload, ExternalLink } from 'lucide-react'

export interface NewLayerDraft {
  name: string
  imageUrl: string
  tileUrl: string
  tileSize: number
  maxZoom: number | undefined
  defaultEnabled: boolean
  allowUserToggle: boolean
}

interface MapAddLayerModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  draft: NewLayerDraft
  onChangeDraft: (draft: NewLayerDraft) => void
  onOpenProcessorPicker: () => void
  onDetectTiles: (url: string) => void
  onAddLayer: () => void
}

export function MapAddLayerModal({
  isOpen,
  onOpenChange,
  draft,
  onChangeDraft,
  onOpenProcessorPicker,
  onDetectTiles,
  onAddLayer,
}: MapAddLayerModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-slate-950 dark:bg-slate-950 border-slate-800 text-slate-100">
        <DialogHeader>
          <DialogTitle className="text-slate-100">Add Map Layer</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-400">Layer Name</label>
            <Input
              value={draft.name}
              onChange={(e) => onChangeDraft({ ...draft, name: e.target.value })}
              placeholder="Political Borders, Underground, Weather..."
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
              placeholder="https://maps.tarragon.be/borders_tiles_files/{z}/{x}_{y}.webp"
              className="bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500 font-mono text-xs"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-400">Overlay Image URL (SVG / Transparent WebP / PNG)</label>
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
              value={draft.imageUrl}
              onChange={(e) => {
                const val = e.target.value
                onChangeDraft({ ...draft, imageUrl: val })
                if (val.includes('.webp') || val.includes('_tiles')) {
                  onDetectTiles(val)
                }
              }}
              onBlur={(e) => onDetectTiles(e.target.value)}
              placeholder="https://maps.tarragon.be/borders.svg"
              className="bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500"
            />
          </div>
          <div className="flex items-center justify-between pt-2">
            <span className="font-bold text-slate-200">Enabled by Default</span>
            <Switch
              checked={draft.defaultEnabled}
              onCheckedChange={(val) => onChangeDraft({ ...draft, defaultEnabled: val })}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-200">Allow Users / Viewers to Toggle</span>
            <Switch
              checked={draft.allowUserToggle}
              onCheckedChange={(val) => onChangeDraft({ ...draft, allowUserToggle: val })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button size="sm" onClick={onAddLayer} className="bg-purple-600 hover:bg-purple-500 text-white font-semibold">
            Add Layer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
