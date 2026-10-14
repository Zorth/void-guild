import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Edit3, Trash2, EyeOff, Map as MapIcon } from 'lucide-react'
import { renderPinIcon } from '../pinIcons'
import { Id } from '@/convex/_generated/dataModel'

export interface SelectedPinItem {
  _id: any
  questId?: Id<'quests'>
  icon?: string
  color?: string
  title: string
  description?: string
  gmOnly?: boolean
  targetMapId?: Id<'worldMaps'>
  x: number
  y: number
  style?: string
  layerId?: Id<'mapLayers'>
}

interface WorldMapRef {
  _id: Id<'worldMaps'>
  name: string
  slug: string
}

interface WorldQuestItem {
  _id: Id<'quests'>
  name: string
  description?: string
  level?: number | null
  levelPF?: number | null
  levelDnD?: number | null
  questgiver?: string
  reward?: string
}

interface MapPinDetailsModalProps {
  selectedPin: SelectedPinItem | null
  onClose: () => void
  isOwner: boolean
  worldQuests: WorldQuestItem[] | undefined
  worldMaps: WorldMapRef[] | undefined
  onEditPin: (pin: SelectedPinItem) => void
  onDeletePin: (pinId: Id<'mapPins'>) => void
  onNavigateToMap: (slug: string) => void
}

export function MapPinDetailsModal({
  selectedPin,
  onClose,
  isOwner,
  worldQuests,
  worldMaps,
  onEditPin,
  onDeletePin,
  onNavigateToMap,
}: MapPinDetailsModalProps) {
  if (!selectedPin) return null

  const linkedQuest = selectedPin.questId
    ? worldQuests?.find((q) => q._id === selectedPin.questId)
    : null

  const levelBadge = linkedQuest
    ? linkedQuest.levelPF !== null && linkedQuest.levelPF !== undefined
      ? `Pathfinder Lvl ${linkedQuest.levelPF}`
      : linkedQuest.levelDnD !== null && linkedQuest.levelDnD !== undefined
      ? `D&D Lvl ${linkedQuest.levelDnD}`
      : linkedQuest.level !== undefined && linkedQuest.level !== null
      ? `Level ${linkedQuest.level}`
      : null
    : null

  return (
    <Dialog open={!!selectedPin} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-slate-950 dark:bg-slate-950 border-slate-800 text-slate-100">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-slate-100">
              <div
                className="p-2 rounded-lg flex items-center justify-center shrink-0 shadow-md"
                style={{ backgroundColor: selectedPin.color || (selectedPin.questId || selectedPin.icon === 'Quest' ? '#f59e0b' : '#a855f7') }}
              >
                {selectedPin.questId || selectedPin.icon === 'Quest' ? (
                  <img src="/quest.svg" alt="Quest" className="h-5 w-5 drop-shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
                ) : (
                  renderPinIcon(selectedPin.icon, "h-5 w-5 text-white")
                )}
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
                  className="h-8 gap-1 text-xs border-slate-700 bg-slate-900 text-slate-200 hover:text-white hover:bg-slate-800"
                  onClick={() => onEditPin(selectedPin)}
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                  onClick={() => onDeletePin(selectedPin._id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>
        <div className="space-y-4 text-sm leading-relaxed pt-2">
          {!linkedQuest ? (
            <>
              {selectedPin.description ? (
                <p className="text-slate-300 whitespace-pre-wrap">{selectedPin.description}</p>
              ) : (
                <p className="text-xs italic text-slate-500">No description provided.</p>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <img src="/quest.svg" alt="" className="h-3.5 w-3.5" />
                  World Quest
                </span>
                {levelBadge && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-800 text-amber-400 border border-slate-700">
                    {levelBadge}
                  </span>
                )}
              </div>

              {linkedQuest.description ? (
                <p className="text-slate-200 whitespace-pre-wrap text-xs sm:text-sm bg-slate-900/60 border border-slate-800 p-3 rounded-lg leading-relaxed">
                  {linkedQuest.description}
                </p>
              ) : (
                <p className="text-xs italic text-slate-500">No description recorded for this quest.</p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {linkedQuest.questgiver && (
                  <div className="bg-slate-900/50 border border-slate-800/80 p-2 rounded-md">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Questgiver</span>
                    <span className="font-semibold text-slate-200">{linkedQuest.questgiver}</span>
                  </div>
                )}
                {linkedQuest.reward && (
                  <div className="bg-slate-900/50 border border-slate-800/80 p-2 rounded-md">
                    <span className="text-amber-400/80 block text-[10px] uppercase font-bold tracking-wider">Reward</span>
                    <span className="font-semibold text-amber-300">{linkedQuest.reward}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedPin.targetMapId && (
            <div className="pt-2 border-t border-slate-800">
              <Button
                variant="secondary"
                size="sm"
                className="w-full gap-2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-100"
                onClick={() => {
                  const target = worldMaps?.find((m) => m._id === selectedPin.targetMapId)
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
