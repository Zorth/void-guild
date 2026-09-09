'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Scroll, Sword, Trophy, User, Hash, Coins, Sparkles, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuestDialogProps {
  isOpen: boolean
  onClose: () => void
  worldId?: Id<'worlds'>
  quest?: {
    _id: Id<'quests'>
    name: string
    level?: number
    levelPF?: number
    levelDnD?: number
    description?: string
    questgiver?: string
    reward?: string
    rewardType?: 'party' | 'per_person'
    rewardMoneyGP?: number
    rewardOther?: string
    tags?: string[]
    worldId?: Id<'worlds'>
  }
}

export default function QuestDialog({ isOpen, onClose, worldId, quest }: QuestDialogProps) {
  const [name, setName] = useState('')
  const [levelPF, setLevelPF] = useState<number | null>(null)
  const [levelDnD, setLevelDnD] = useState<number | null>(null)
  const [description, setDescription] = useState('')
  const [questgiver, setQuestgiver] = useState('')
  const [rewardType, setRewardType] = useState<'party' | 'per_person'>('party')
  const [rewardMoneyGP, setRewardMoneyGP] = useState<string>('')
  const [rewardOther, setRewardOther] = useState<string>('')
  const [tagsString, setTagsString] = useState('')
  const [isGlobal, setIsGlobal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isAdmin = useQuery(api.sessions.isAdminQuery)
  const createQuest = useMutation(api.quests.createQuest)
  const updateQuest = useMutation(api.quests.updateQuest)

  useEffect(() => {
    if (quest) {
      setName(quest.name)
      // Migration logic: if level exists but levelPF doesn't, use level as levelPF
      setLevelPF(quest.levelPF ?? quest.level ?? null)
      setLevelDnD(quest.levelDnD ?? null)
      setDescription(quest.description || '')
      setQuestgiver(quest.questgiver || '')
      setRewardType(quest.rewardType || 'party')
      setRewardMoneyGP(quest.rewardMoneyGP !== undefined ? String(quest.rewardMoneyGP) : '')
      setRewardOther(quest.rewardOther || (!quest.rewardMoneyGP && quest.reward ? quest.reward : ''))
      setTagsString(quest.tags?.join(', ') || '')
      setIsGlobal(!quest.worldId)
    } else {
      setName('')
      setLevelPF(null)
      setLevelDnD(null)
      setDescription('')
      setQuestgiver('')
      setRewardType('party')
      setRewardMoneyGP('')
      setRewardOther('')
      setTagsString('')
      setIsGlobal(!worldId)
    }
  }, [quest, isOpen, worldId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setIsSubmitting(true)

    const tags = tagsString
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t !== '')

    const moneyVal = parseFloat(rewardMoneyGP)
    const hasMoney = !isNaN(moneyVal) && moneyVal > 0
    const targetWorldId = isGlobal ? undefined : (quest ? (quest.worldId || worldId) : worldId)

    try {
      if (quest) {
        await updateQuest({
          questId: quest._id,
          name,
          levelPF,
          levelDnD,
          description,
          questgiver,
          rewardType,
          rewardMoneyGP: hasMoney ? Math.round(moneyVal * 100) / 100 : undefined,
          rewardOther: rewardOther.trim() || undefined,
          tags,
          worldId: targetWorldId,
        })
        toast.success('Quest updated successfully!')
      } else {
        await createQuest({
          name,
          levelPF,
          levelDnD,
          description,
          questgiver,
          rewardType,
          rewardMoneyGP: hasMoney ? Math.round(moneyVal * 100) / 100 : undefined,
          rewardOther: rewardOther.trim() || undefined,
          tags,
          worldId: targetWorldId,
        })
        toast.success('Quest created successfully!')
      }
      onClose()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Failed to save quest')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] border-border/40 bg-card/95 backdrop-blur-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Scroll className="h-5 w-5 text-primary" />
            {quest ? 'Edit Quest' : 'Post a New Quest'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold flex items-center gap-2">
              <Sword className="h-4 w-4 text-muted-foreground" />
              Quest Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Clear the Goblin Cave"
              required
              className="bg-muted/30"
            />
          </div>

          {/* Admin Only: Global Quest Checkbox */}
          {isAdmin && (
            <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <input
                type="checkbox"
                id="isGlobalQuest"
                checked={isGlobal}
                onChange={(e) => setIsGlobal(e.target.checked)}
                className="h-4 w-4 rounded border-border text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600 shrink-0"
              />
              <label htmlFor="isGlobalQuest" className="text-xs font-semibold text-foreground cursor-pointer flex items-center gap-1.5 select-none">
                <Globe className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                <span>Global Quest (Shared across all campaign worlds)</span>
              </label>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold flex items-center gap-2">
                <img src="/PFVoid.svg" alt="PF" className="h-3.5 w-3.5" />
                Pathfinder Level
              </label>
              <Input
                type="number"
                min={0}
                max={20}
                value={levelPF !== null ? levelPF : ''}
                onChange={(e) => setLevelPF(e.target.value === '' ? null : parseInt(e.target.value))}
                className="bg-muted/30"
                placeholder="TBD"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold flex items-center gap-2">
                <img src="/DnDVoid.svg" alt="DnD" className="h-3.5 w-3.5" />
                D&D Level
              </label>
              <Input
                type="number"
                min={0}
                max={20}
                value={levelDnD !== null ? levelDnD : ''}
                onChange={(e) => setLevelDnD(e.target.value === '' ? null : parseInt(e.target.value))}
                className="bg-muted/30"
                placeholder="TBD"
              />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground -mt-2 italic">Leave empty for TBD.</p>

          <div className="space-y-2">
            <label className="text-sm font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Questgiver
            </label>
            <Input
              value={questgiver}
              onChange={(e) => setQuestgiver(e.target.value)}
              placeholder="NPC or Character Name"
              className="bg-muted/30"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold flex items-center gap-2">
                <Scroll className="h-4 w-4 text-muted-foreground" />
                Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What needs to be done?"
              className="min-h-[100px] bg-muted/30"
            />
          </div>

          <div className="space-y-3 p-3 rounded-lg border border-border/50 bg-muted/20">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Trophy className="h-3.5 w-3.5 text-amber-400" />
                Reward Distribution
              </label>

              <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-md border border-border/40 text-xs">
                <button
                  type="button"
                  onClick={() => setRewardType('party')}
                  className={cn(
                    "px-2.5 py-1 rounded text-[11px] font-semibold transition-all",
                    rewardType === 'party'
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Party Total
                </button>
                <button
                  type="button"
                  onClick={() => setRewardType('per_person')}
                  className={cn(
                    "px-2.5 py-1 rounded text-[11px] font-semibold transition-all",
                    rewardType === 'per_person'
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Per Person
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                  <Coins className="h-3.5 w-3.5 text-amber-400" />
                  Money ({rewardType === 'per_person' ? 'GP / person' : 'GP party total'})
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={rewardMoneyGP}
                    onChange={(e) => setRewardMoneyGP(e.target.value)}
                    placeholder="e.g. 50.00"
                    className="bg-muted/30 border-border/40 text-xs pr-10 font-mono font-bold text-amber-300"
                  />
                  <span className="absolute right-2.5 top-2 text-[10px] font-bold text-muted-foreground">
                    GP
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground italic">
                  Gold Pieces (up to 2 decimals).
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                  Other Loot / Special Item
                </label>
                <Input
                  value={rewardOther}
                  onChange={(e) => setRewardOther(e.target.value)}
                  placeholder="e.g. +1 Weapon, Special Item"
                  className="bg-muted/30 border-border/40 text-xs"
                />
                <p className="text-[10px] text-muted-foreground italic">
                  Found loot, magic item, or renown.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">Tags (comma separated)</label>
            <Input
              value={tagsString}
              onChange={(e) => setTagsString(e.target.value)}
              placeholder="Combat, Stealth, Investigation"
              className="bg-muted/30"
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (quest ? 'Updating...' : 'Creating...') : (quest ? 'Save Changes' : 'Post Quest')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
