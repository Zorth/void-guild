import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { X, Eye, EyeOff, Search, Check } from 'lucide-react'
import { Id } from '@/convex/_generated/dataModel'

interface QuestItem {
  _id: Id<'quests'>
  name: string
  description?: string
  level?: number | null
  levelPF?: number | null
  levelDnD?: number | null
  questgiver?: string
  reward?: string
}

interface MapQuestsPanelProps {
  isOpen: boolean
  onClose: () => void
  isOwner: boolean
  worldQuests: QuestItem[] | undefined
  placedPins: Array<{ _id: any; questId?: Id<'quests'>; x: number; y: number; title: string; description?: string; color?: string; icon?: string }> | undefined
  showQuestsLayer: boolean
  onToggleQuestsLayer: (val: boolean) => void
  onSelectQuest: (quest: QuestItem, placedPin?: any) => void
}

export function MapQuestsPanel({
  isOpen,
  onClose,
  isOwner,
  worldQuests,
  placedPins,
  showQuestsLayer,
  onToggleQuestsLayer,
  onSelectQuest,
}: MapQuestsPanelProps) {
  const [questSearch, setQuestSearch] = useState('')

  if (!isOpen) return null

  const filteredQuests = (worldQuests || []).filter((q) => {
    if (!questSearch.trim()) return true
    const query = questSearch.toLowerCase()
    return (
      q.name.toLowerCase().includes(query) ||
      (q.description && q.description.toLowerCase().includes(query)) ||
      (q.questgiver && q.questgiver.toLowerCase().includes(query))
    )
  })

  return (
    <Card className="absolute top-14 sm:top-16 right-2 sm:right-4 z-40 w-84 max-w-[calc(100vw-1rem)] bg-slate-950 dark:bg-slate-950 backdrop-blur-md border-slate-700/80 shadow-2xl flex flex-col max-h-[75vh] text-slate-100">
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-slate-800 shrink-0">
        <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-100">
          <img src="/quest.svg" alt="Quests" className="h-4 w-4 shrink-0 drop-shadow-[0_0_6px_rgba(245,158,11,0.7)]" />
          Quests ({worldQuests?.length || 0})
        </CardTitle>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-white" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>

      {/* Visibility toggle & Drag hint */}
      <div className="p-3 border-b border-slate-800 space-y-2 shrink-0 bg-slate-900/40">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-medium text-slate-200">Show Quest Markers</span>
          </div>
          <Switch
            checked={showQuestsLayer}
            onCheckedChange={onToggleQuestsLayer}
          />
        </div>

        {isOwner && (
          <p className="text-[11px] text-amber-300/80 bg-amber-500/10 border border-amber-500/20 rounded p-1.5 leading-snug">
            Drag any quest below directly onto the map to place its marker!
          </p>
        )}

        <div className="relative">
          <Search className="h-3.5 w-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <Input
            value={questSearch}
            onChange={(e) => setQuestSearch(e.target.value)}
            placeholder="Search world quests..."
            className="h-7 text-xs pl-8 bg-slate-900 border-slate-800 text-slate-200 placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Quest List */}
      <CardContent className="p-2 space-y-1.5 overflow-y-auto flex-1">
        {filteredQuests.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center py-6">
            {questSearch.trim() ? 'No matching quests found.' : 'No quests in this world yet.'}
          </p>
        ) : (
          filteredQuests.map((quest) => {
            const placedPin = placedPins?.find((p) => p.questId === quest._id)
            const levelDisplay = quest.levelPF !== null && quest.levelPF !== undefined
              ? `PF Lvl ${quest.levelPF}`
              : quest.levelDnD !== null && quest.levelDnD !== undefined
              ? `DnD Lvl ${quest.levelDnD}`
              : quest.level !== undefined && quest.level !== null
              ? `Lvl ${quest.level}`
              : null

            return (
              <div
                key={quest._id}
                draggable={isOwner}
                onDragStart={(e) => {
                  if (!isOwner) return
                  e.dataTransfer.setData(
                    'application/json',
                    JSON.stringify({
                      type: 'quest',
                      questId: quest._id,
                      title: quest.name,
                      description: quest.description || '',
                    })
                  )
                  e.dataTransfer.effectAllowed = 'copyMove'
                }}
                onClick={() => onSelectQuest(quest, placedPin)}
                className={`p-2 rounded-lg border transition-all select-none ${
                  isOwner ? 'cursor-grab active:cursor-grabbing hover:border-amber-500/50' : 'cursor-pointer'
                } ${
                  placedPin
                    ? 'bg-amber-950/20 border-amber-500/30 hover:bg-amber-950/30'
                    : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="p-1 rounded-md bg-amber-500/20 border border-amber-500/30 shrink-0 mt-0.5">
                    <img src="/quest.svg" alt="Quest" className="h-4 w-4 drop-shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-xs text-slate-100 truncate group-hover:text-amber-300">
                        {quest.name}
                      </span>
                      {levelDisplay && (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {levelDisplay}
                        </span>
                      )}
                      {placedPin && (
                        <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-0.5">
                          <Check className="h-2.5 w-2.5" /> On Map
                        </span>
                      )}
                    </div>
                    {quest.description && (
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                        {quest.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 flex-wrap">
                      {quest.questgiver && (
                        <span>Giver: <strong className="text-slate-300">{quest.questgiver}</strong></span>
                      )}
                      {quest.reward && (
                        <span className="text-amber-300">Reward: {quest.reward}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
