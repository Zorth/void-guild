import React from 'react'
import { Layers, Upload, RefreshCw, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export interface ProcessorMapItem {
  slug: string
  imageUrl?: string
  tilesUrl?: string
  svgUrl?: string
  width?: number
  height?: number
  maxZoom?: number
}

interface MapProcessorPickerModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  isLoading: boolean
  processorMaps: ProcessorMapItem[]
  onSelectMap: (map: ProcessorMapItem) => void
  onCopyLink: (text: string, label: string) => void
}

export function MapProcessorPickerModal({
  isOpen,
  onOpenChange,
  isLoading,
  processorMaps,
  onSelectMap,
  onCopyLink,
}: MapProcessorPickerModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-2xl max-h-[85vh] overflow-y-auto p-4 sm:p-6 bg-slate-950 dark:bg-slate-950 border-slate-800 text-slate-100">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-base font-bold text-slate-100">
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
          <p className="text-slate-400">
            Select any hosted map below to automatically import its image URL, tile pyramid endpoint, and native dimensions.
          </p>

          {isLoading ? (
            <div className="py-8 text-center text-slate-400 space-y-2">
              <RefreshCw className="h-5 w-5 animate-spin mx-auto text-cyan-400" />
              <p>Loading hosted maps from processor...</p>
            </div>
          ) : processorMaps.length === 0 ? (
            <div className="py-8 text-center text-slate-400 bg-slate-900/50 border border-slate-800 rounded-lg p-4">
              No maps found on processor.
            </div>
          ) : (
            <div className="space-y-2">
              {processorMaps.map((item) => (
                <div
                  key={item.slug}
                  className="p-3 rounded-lg border border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 hover:border-cyan-500/50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 overflow-hidden"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-100">{item.slug}</span>
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
                    <p className="text-[11px] font-mono text-slate-400 truncate w-full" title={item.tilesUrl || item.svgUrl || item.imageUrl}>
                      {item.tilesUrl || item.svgUrl || item.imageUrl}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
                    {item.tilesUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[11px] text-slate-300 hover:text-white hover:bg-slate-800"
                        onClick={() => onCopyLink(item.tilesUrl!, 'Tile URL')}
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
                        onClick={() => onCopyLink(item.svgUrl || item.imageUrl!, item.svgUrl ? 'SVG URL' : 'Image URL')}
                        title={`Copy ${item.svgUrl ? 'SVG' : 'Image'} URL`}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        {item.svgUrl ? 'SVG' : 'Image'}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      className="h-7 text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shadow-sm"
                      onClick={() => onSelectMap(item)}
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
  )
}
