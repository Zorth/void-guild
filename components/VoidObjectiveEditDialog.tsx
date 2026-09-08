'use client'

import { useState, useEffect } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Target, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VoidObjectiveEditDialogProps {
  isOpen: boolean
  onClose: () => void
  currentMonthKey: string
  nextMonthKey: string
  currentObjective: any
  nextObjective: any
}

export default function VoidObjectiveEditDialog({
  isOpen,
  onClose,
  currentMonthKey,
  nextMonthKey,
  currentObjective,
  nextObjective,
}: VoidObjectiveEditDialogProps) {
  const upsertObjective = useMutation(api.voidObjectives.upsertObjective)

  const [activeTab, setActiveTab] = useState<'current' | 'next'>('current')

  // Current month form
  const [curTitle, setCurTitle] = useState('')
  const [curDescription, setCurDescription] = useState('')
  const [curUnit, setCurUnit] = useState('')
  const [curTier1, setCurTier1] = useState('5')
  const [curTier2, setCurTier2] = useState('10')
  const [curTier3, setCurTier3] = useState('20')

  // Next month form
  const [nextTitle, setNextTitle] = useState('')
  const [nextDescription, setNextDescription] = useState('')
  const [nextUnit, setNextUnit] = useState('')
  const [nextTier1, setNextTier1] = useState('5')
  const [nextTier2, setNextTier2] = useState('10')
  const [nextTier3, setNextTier3] = useState('20')

  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (currentObjective) {
      setCurTitle(currentObjective.title || '')
      setCurDescription(currentObjective.description || '')
      setCurUnit(currentObjective.unit || '')
      setCurTier1(String(currentObjective.tier1Goal ?? 5))
      setCurTier2(String(currentObjective.tier2Goal ?? 10))
      setCurTier3(String(currentObjective.tier3Goal ?? 20))
    } else {
      setCurTitle('')
      setCurDescription('')
      setCurUnit('bugs')
      setCurTier1('5')
      setCurTier2('10')
      setCurTier3('20')
    }

    if (nextObjective) {
      setNextTitle(nextObjective.title || '')
      setNextDescription(nextObjective.description || '')
      setNextUnit(nextObjective.unit || '')
      setNextTier1(String(nextObjective.tier1Goal ?? 5))
      setNextTier2(String(nextObjective.tier2Goal ?? 10))
      setNextTier3(String(nextObjective.tier3Goal ?? 20))
    } else {
      setNextTitle('')
      setNextDescription('')
      setNextUnit('bugs')
      setNextTier1('5')
      setNextTier2('10')
      setNextTier3('20')
    }
  }, [currentObjective, nextObjective, isOpen])

  const handleSave = async (target: 'current' | 'next') => {
    const isCur = target === 'current'
    const monthKey = isCur ? currentMonthKey : nextMonthKey
    const title = isCur ? curTitle : nextTitle
    const description = isCur ? curDescription : nextDescription
    const unit = isCur ? curUnit : nextUnit
    const t1 = parseFloat(isCur ? curTier1 : nextTier1)
    const t2 = parseFloat(isCur ? curTier2 : nextTier2)
    const t3 = parseFloat(isCur ? curTier3 : nextTier3)

    if (!title.trim()) {
      toast.error('Please provide an objective title')
      return
    }
    if (!description.trim()) {
      toast.error('Please provide an objective description')
      return
    }
    if (isNaN(t1) || isNaN(t2) || isNaN(t3) || t1 <= 0 || t2 <= t1 || t3 <= t2) {
      toast.error('Tiers must be strictly increasing numbers (Tier 1 < Tier 2 < Tier 3)')
      return
    }

    setIsSubmitting(true)
    try {
      await upsertObjective({
        monthKey,
        title,
        description,
        unit: unit || undefined,
        tier1Goal: t1,
        tier2Goal: t2,
        tier3Goal: t3,
      })
      toast.success(`Saved Void Objective for ${monthKey}!`)
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save objective')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-purple-400" />
            Admin: Configure Void Objectives
          </DialogTitle>
          <DialogDescription>
            Configure the monthly community objective and progression goals. Rewards are automatically calculated based on achieved tier and character levels.
          </DialogDescription>
        </DialogHeader>

        <div className="w-full mt-2 space-y-4">
          <div className="flex bg-muted/40 p-1 rounded-lg gap-1 border border-border/40">
            <button
              type="button"
              onClick={() => setActiveTab('current')}
              className={cn(
                'flex-1 py-1.5 px-3 text-xs font-semibold rounded-md transition-all',
                activeTab === 'current'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Current Month ({currentMonthKey})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('next')}
              className={cn(
                'flex-1 py-1.5 px-3 text-xs font-semibold rounded-md transition-all',
                activeTab === 'next'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Next Month ({nextMonthKey})
            </button>
          </div>

          {/* Current Month Content */}
          {activeTab === 'current' && (
            <div className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Objective Title</label>
                <Input
                  placeholder="e.g. Cleansing the Swarm"
                  value={curTitle}
                  onChange={(e) => setCurTitle(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Description / Lore</label>
                <Textarea
                  placeholder="Describe what adventurers must achieve this month..."
                  rows={3}
                  value={curDescription}
                  onChange={(e) => setCurDescription(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Unit Label (Optional)</label>
                <Input
                  placeholder="e.g. bugs, points, kills"
                  value={curUnit}
                  onChange={(e) => setCurUnit(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-emerald-400">Tier 1 Goal</label>
                  <Input
                    type="number"
                    min="1"
                    value={curTier1}
                    onChange={(e) => setCurTier1(e.target.value)}
                  />
                  <span className="text-[10px] text-muted-foreground">Reward: 6 × 1.5ᴸᵛˡ</span>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-blue-400">Tier 2 Goal</label>
                  <Input
                    type="number"
                    min="1"
                    value={curTier2}
                    onChange={(e) => setCurTier2(e.target.value)}
                  />
                  <span className="text-[10px] text-muted-foreground">Reward: 9 × 1.5ᴸᵛˡ</span>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-purple-400">Tier 3 Goal</label>
                  <Input
                    type="number"
                    min="1"
                    value={curTier3}
                    onChange={(e) => setCurTier3(e.target.value)}
                  />
                  <span className="text-[10px] text-muted-foreground">Reward: 12 × 1.5ᴸᵛˡ</span>
                </div>
              </div>

              <div className="p-3 bg-purple-950/30 rounded-lg border border-purple-500/20 text-xs text-purple-300 flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                <span>
                  Rewards formula rounds to the nearest 2 significant digits (e.g. 2,200 GP). All characters who participated will receive the reward for the highest tier reached.
                </span>
              </div>

              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={() => handleSave('current')} disabled={isSubmitting} className="bg-purple-600 hover:bg-purple-700">
                  {isSubmitting ? 'Saving...' : `Save ${currentMonthKey}`}
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* Next Month Content */}
          {activeTab === 'next' && (
            <div className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Objective Title</label>
                <Input
                  placeholder="e.g. Void Anomaly Containment"
                  value={nextTitle}
                  onChange={(e) => setNextTitle(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Description / Lore</label>
                <Textarea
                  placeholder="Describe next month's goal..."
                  rows={3}
                  value={nextDescription}
                  onChange={(e) => setNextDescription(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Unit Label (Optional)</label>
                <Input
                  placeholder="e.g. bugs, portals, crystals"
                  value={nextUnit}
                  onChange={(e) => setNextUnit(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-emerald-400">Tier 1 Goal</label>
                  <Input
                    type="number"
                    min="1"
                    value={nextTier1}
                    onChange={(e) => setNextTier1(e.target.value)}
                  />
                  <span className="text-[10px] text-muted-foreground">Reward: 6 × 1.5ᴸᵛˡ</span>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-blue-400">Tier 2 Goal</label>
                  <Input
                    type="number"
                    min="1"
                    value={nextTier2}
                    onChange={(e) => setNextTier2(e.target.value)}
                  />
                  <span className="text-[10px] text-muted-foreground">Reward: 9 × 1.5ᴸᵛˡ</span>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-purple-400">Tier 3 Goal</label>
                  <Input
                    type="number"
                    min="1"
                    value={nextTier3}
                    onChange={(e) => setNextTier3(e.target.value)}
                  />
                  <span className="text-[10px] text-muted-foreground">Reward: 12 × 1.5ᴸᵛˡ</span>
                </div>
              </div>

              <div className="p-3 bg-purple-950/30 rounded-lg border border-purple-500/20 text-xs text-purple-300 flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                <span>
                  Setting this ahead of time allows the Guild of The Void to automatically transition to this objective seamlessly at the start of next month.
                </span>
              </div>

              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={() => handleSave('next')} disabled={isSubmitting} className="bg-purple-600 hover:bg-purple-700">
                  {isSubmitting ? 'Saving...' : `Save ${nextMonthKey}`}
                </Button>
              </DialogFooter>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
