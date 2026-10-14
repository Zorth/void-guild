import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X, Compass, Search, Maximize2, ChevronRight, EyeOff, Map as MapIcon } from 'lucide-react'
import { renderPinIcon } from '../pinIcons'
import { Id } from '@/convex/_generated/dataModel'

interface LayerItem {
  _id: Id<'mapLayers'>
  name: string
}

interface PinItem {
  _id: Id<'mapPins'>
  title: string
  description?: string
  icon?: string
  color?: string
  x: number
  y: number
  layerId?: Id<'mapLayers'>
  gmOnly?: boolean
  questId?: Id<'quests'>
  targetMapId?: Id<'worldMaps'>
}

interface AreaItem {
  _id: Id<'mapAreas'>
  name: string
  description?: string
  color?: string
  layerId?: Id<'mapLayers'>
  gmOnly?: boolean
  points: { x: number; y: number }[]
  targetMapId?: Id<'worldMaps'>
}

interface MapLocationsPanelProps {
  isOpen: boolean
  onClose: () => void
  locationDirectoryTab: 'pins' | 'areas'
  onChangeTab: (tab: 'pins' | 'areas') => void
  locationSearch: string
  onChangeLocationSearch: (search: string) => void
  locationFilterLayer: string
  onChangeFilterLayer: (layerId: string) => void
  layers: LayerItem[] | undefined
  filteredPins: PinItem[]
  filteredAreas: AreaItem[]
  onSelectPin: (pin: PinItem) => void
  onSelectArea: (area: AreaItem) => void
}

export function MapLocationsPanel({
  isOpen,
  onClose,
  locationDirectoryTab,
  onChangeTab,
  locationSearch,
  onChangeLocationSearch,
  locationFilterLayer,
  onChangeFilterLayer,
  layers,
  filteredPins,
  filteredAreas,
  onSelectPin,
  onSelectArea,
}: MapLocationsPanelProps) {
  if (!isOpen) return null

  return (
    <Card className="absolute top-14 sm:top-16 right-2 sm:right-4 z-40 w-80 max-w-[calc(100vw-1rem)] bg-slate-950 dark:bg-slate-950 backdrop-blur-md border-slate-700/80 shadow-2xl flex flex-col max-h-[75vh] text-slate-100">
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-slate-800 shrink-0">
        <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-100">
          <Compass className="h-4 w-4 text-cyan-400" /> Locations ({filteredPins.length + filteredAreas.length})
        </CardTitle>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-white" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>
      <div className="flex border-b border-slate-800 shrink-0 bg-slate-900/50">
        <button
          type="button"
          onClick={() => onChangeTab('pins')}
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
          onClick={() => onChangeTab('areas')}
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
            onChange={(e) => onChangeLocationSearch(e.target.value)}
          />
        </div>
        {layers && layers.length > 0 && (
          <Select value={locationFilterLayer} onValueChange={onChangeFilterLayer}>
            <SelectTrigger className="h-7 text-xs bg-slate-900 border-slate-700 text-slate-200"><SelectValue placeholder="All Layers" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Layers</SelectItem>
              {layers.map((l) => (
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
              const areaLayer = layers?.find((l) => l._id === area.layerId)
              return (
                <div
                  key={area._id}
                  className="p-2 rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-colors cursor-pointer group flex items-start justify-between gap-2"
                  onClick={() => onSelectArea(area)}
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
            const pinLayer = layers?.find((l) => l._id === pin.layerId)
            return (
              <div
                key={pin._id}
                className="p-2 rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-colors cursor-pointer group flex items-start justify-between gap-2"
                onClick={() => onSelectPin(pin)}
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
  )
}
