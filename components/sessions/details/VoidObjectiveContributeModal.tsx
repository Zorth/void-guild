'use client'

import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Target, Sparkles, Users, Award } from 'lucide-react'
import { toast } from 'sonner'

interface VoidObjectiveContributeModalProps {
  isOpen: boolean
  onClose: () => void
  sessionId: Id<'sessions'>
  initialAmount?: number
  onConfirmed?: () => void
}

export default function VoidObjectiveContributeModal({
  isOpen,
  onClose,
  sessionId,
  initialAmount = 0,
  onConfirmed,
}: VoidObjectiveContributeModalProps) {
  const currentObjective = useQuery(api.voidObjectives.getCurrentObjective)
  const contributeMutation = useMutation(api.voidObjectives.contributeToObjective)

  const [amount, setAmount] = useState<number>(initialAmount)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Synchronize initialAmount when modal opens
  const [prevOpen, setPrevOpen] = useState(false)
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen)
    if (isOpen) {
      setAmount(initialAmount)
    }
  }

  const goalMax = currentObjective?.tier3Goal ?? 50
  const currentProgress = currentObjective?.currentProgress ?? 0
  const remainingNeeded = Math.max(0, goalMax - currentProgress)
  const maxAllowed = remainingNeeded + initialAmount
  const unit = currentObjective?.unit || 'progress'
  const title = currentObjective?.title || 'Void Objective'

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10)
    setAmount(isNaN(val) ? 0 : Math.max(0, Math.min(maxAllowed, val)))
  }

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10)
    if (isNaN(val)) {
      setAmount(0)
    } else {
      setAmount(Math.max(0, Math.min(maxAllowed, val)))
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      await contributeMutation({
        sessionId,
        amount,
      })
      toast.success(
        amount > 0
          ? `Set contribution to ${amount} ${unit} for "${title}"!`
          : `Cleared contribution for "${title}"`,
        {
          description:
            amount > 0
              ? 'All non-GM characters from this session are credited as objective contributors.'
              : 'Contribution has been removed for this session.',
          icon: '🎯',
        }
      )
      onClose()
      if (onConfirmed) onConfirmed()
    } catch (err: any) {
      toast.error(err.message || 'Failed to record contribution')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base text-purple-300">
            <Target className="h-5 w-5 text-purple-400" />
            Void Objective Contribution
          </DialogTitle>
          <DialogDescription className="text-xs">
            How much did the players contribute to this month's objective during this session?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="p-3 bg-purple-950/30 rounded-xl border border-purple-500/20 text-xs space-y-1.5">
            <div className="font-semibold text-foreground flex items-center justify-between">
              <span>{title}</span>
              <span className="text-[11px] font-mono text-purple-300">
                {currentProgress} / {goalMax} {unit}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Remaining needed to reach max tier: <strong className="text-foreground">{remainingNeeded} {unit}</strong>
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <label className="font-semibold text-foreground">Contribution Amount:</label>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min={0}
                  max={maxAllowed}
                  value={amount}
                  onChange={handleNumberChange}
                  className="w-24 h-8 text-right font-mono font-bold"
                />
                <span className="text-xs text-muted-foreground">{unit}</span>
              </div>
            </div>

            {/* Slider */}
            <div className="space-y-1">
              <input
                type="range"
                min={0}
                max={Math.max(1, maxAllowed)}
                value={amount}
                onChange={handleSliderChange}
                className="w-full accent-purple-500 cursor-pointer h-2 bg-muted/40 rounded-lg"
              />
              <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                <span>0</span>
                <span>Max: {maxAllowed} {unit}</span>
              </div>
            </div>
          </div>

          <div className="p-2.5 bg-muted/30 rounded-lg border border-border/40 text-[11px] text-muted-foreground flex items-start gap-2">
            <Users className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
            <span>
              Any amount above 0 automatically credits all participating (non-GM) characters in this session as contributors. They will receive the reward tier when the month ends!
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => {
              onClose()
              if (onConfirmed) onConfirmed()
            }}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
          >
            {isSubmitting ? 'Saving...' : amount > 0 ? `Save (${amount} ${unit})` : 'Clear Contribution (0)'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
