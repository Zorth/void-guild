import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { X, Layers, Plus, Upload, ExternalLink, Trash2 } from 'lucide-react'
import { Id } from '@/convex/_generated/dataModel'

interface LayerItem {
  _id: Id<'mapLayers'>
  name: string
  defaultEnabled: boolean
  allowUserToggle: boolean
}

interface MapLayersPanelProps {
  isOpen: boolean
  onClose: () => void
  isOwner: boolean
  layers: LayerItem[] | undefined
  enabledLayers: Record<string, boolean>
  onToggleLayer: (layerId: string, enabled: boolean) => void
  showQuestsLayer: boolean
  onToggleQuestsLayer: (val: boolean) => void
  showPlayerNotes: boolean
  onTogglePlayerNotes: (val: boolean) => void
  hasTilePyramid: boolean
  isSvgMap: boolean
  isTilePyramidEnabled: boolean
  onToggleTilePyramid: (val: boolean) => void
  onOpenAddLayer: () => void
  onDeleteLayer: (layerId: Id<'mapLayers'>) => void
}

export function MapLayersPanel({
  isOpen,
  onClose,
  isOwner,
  layers,
  enabledLayers,
  onToggleLayer,
  showQuestsLayer,
  onToggleQuestsLayer,
  showPlayerNotes,
  onTogglePlayerNotes,
  hasTilePyramid,
  isSvgMap,
  isTilePyramidEnabled,
  onToggleTilePyramid,
  onOpenAddLayer,
  onDeleteLayer,
}: MapLayersPanelProps) {
  if (!isOpen) return null

  return (
    <Card className="absolute top-14 sm:top-16 right-2 sm:right-4 z-40 w-72 max-w-[calc(100vw-1rem)] bg-slate-950 dark:bg-slate-950 backdrop-blur-md border-slate-700/80 shadow-2xl text-slate-100">
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-slate-800">
        <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-100">
          <Layers className="h-4 w-4 text-purple-400" /> Map Layers
        </CardTitle>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-white" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
        {/* Quests Layer Toggle */}
        <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <img src="/quest.svg" alt="Quests" className="h-3.5 w-3.5 shrink-0 drop-shadow-[0_0_4px_rgba(245,158,11,0.6)]" />
            <span className="font-medium text-slate-200">Quests</span>
          </div>
          <Switch
            checked={showQuestsLayer}
            onCheckedChange={onToggleQuestsLayer}
          />
        </div>

        {/* Player Notes Layer Toggle */}
        <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="h-3.5 w-3.5 rounded-full bg-amber-500/80 inline-block shrink-0" />
            <span className="font-medium text-slate-200">Player Notes</span>
          </div>
          <Switch
            checked={showPlayerNotes}
            onCheckedChange={onTogglePlayerNotes}
          />
        </div>

        {/* Tile Pyramid Layer Toggle if currentMap has tileUrl */}
        {hasTilePyramid && (
          <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Layers className="h-3.5 w-3.5 text-cyan-400" />
              <span className="font-medium text-slate-200">
                {isSvgMap ? 'Tile Pyramid Overlay' : 'DeepZoom Tiles'}
              </span>
            </div>
            <Switch
              checked={isTilePyramidEnabled}
              onCheckedChange={onToggleTilePyramid}
            />
          </div>
        )}

        {(!layers || layers.length === 0) ? (
          <p className="text-xs text-slate-400 italic">No extra layers created.</p>
        ) : (
          layers.map((layer) => {
            const canToggle = isOwner || layer.allowUserToggle
            return (
              <div key={layer._id} className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-200">{layer.name}</span>
                <div className="flex items-center gap-2">
                  <Switch
                    disabled={!canToggle}
                    checked={enabledLayers[layer._id] ?? layer.defaultEnabled}
                    onCheckedChange={(val) => onToggleLayer(layer._id, val)}
                  />
                  {isOwner && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:bg-destructive/10"
                      onClick={() => onDeleteLayer(layer._id)}
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
              onClick={onOpenAddLayer}
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
  )
}
