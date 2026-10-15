'use client'

import React, { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Doc, Id } from '@/convex/_generated/dataModel'
import { Target, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface PendingObjectiveTrackerProps {
  sessionId: Id<'sessions'>
  session?: Doc<'sessions'>
  className?: string
}

export default function PendingObjectiveTracker({
  sessionId,
  session,
  className,
}: PendingObjectiveTrackerProps) {
  const currentObjective = useQuery(api.voidObjectives.getCurrentObjective)
  const setPendingContribution = useMutation(api.voidObjectives.setPendingObjectiveContribution)
  const [isSavingContribution, setIsSavingContribution] = useState(false)
  const [objectiveContributionInput, setObjectiveContributionInput] = useState<number | null>(null)

  if (!currentObjective) return null

  const pendingAmount =
    objectiveContributionInput !== null
      ? objectiveContributionInput
      : (session?.pendingVoidContribution ?? session?.voidContribution ?? 0)

  const handleSave = async () => {
    setIsSavingContribution(true)
    try {
      await setPendingContribution({
        sessionId,
        amount: pendingAmount,
      })
      toast.success(
        `Pending contribution set to ${pendingAmount} ${currentObjective.unit || 'pts'}`
      )
    } catch (err: any) {
      toast.error(err.message || 'Failed to update pending contribution')
    } finally {
      setIsSavingContribution(false)
    }
  }

  const handleClear = async () => {
    setIsSavingContribution(true)
    try {
      await setPendingContribution({
        sessionId,
        amount: 0,
      })
      setObjectiveContributionInput(0)
      toast.info('Contribution cleared')
    } catch (err: any) {
      toast.error(err.message || 'Failed to clear')
    } finally {
      setIsSavingContribution(false)
    }
  }

  return (
    <div
      className={cn(
        'p-3 bg-purple-950/20 border border-purple-500/30 rounded-xl space-y-2.5',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300">
          <Target className="h-4 w-4 text-purple-400 shrink-0" />
          <span>Pending Objective Tracker</span>
        </div>
        <span className="text-[10px] font-mono text-purple-300/90 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30 shrink-0 font-semibold">
          {currentObjective.currentProgress} / {currentObjective.tier3Goal} {currentObjective.unit || 'pts'}
        </span>
      </div>

      <div className="space-y-0.5">
        <p className="text-xs font-bold text-foreground truncate" title={currentObjective.title}>
          {currentObjective.title}
        </p>
        <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
          {currentObjective.description}
        </p>
      </div>

      <div className="space-y-2 pt-1.5 border-t border-purple-500/20">
        <div className="flex items-center justify-between gap-2">
          <label className="text-[11px] font-medium text-muted-foreground">
            Session Contribution:
          </label>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min={0}
              className="w-18 h-7 text-xs text-right font-mono font-bold bg-background/80"
              value={pendingAmount}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10)
                setObjectiveContributionInput(isNaN(val) ? 0 : Math.max(0, val))
              }}
              disabled={session?.locked}
            />
            <span className="text-[10px] text-muted-foreground font-mono">
              {currentObjective.unit || 'pts'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="secondary"
            className="h-7 text-[10px] font-bold flex-grow bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 border border-purple-500/30 gap-1"
            disabled={isSavingContribution || session?.locked}
            onClick={handleSave}
          >
            {isSavingContribution && <Loader2 className="h-3 w-3 animate-spin" />}
            <span>{isSavingContribution ? 'Saving...' : 'Set Pending'}</span>
          </Button>

          {pendingAmount > 0 && !session?.locked && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[10px] text-muted-foreground hover:text-destructive"
              disabled={isSavingContribution}
              onClick={handleClear}
            >
              Clear
            </Button>
          )}
        </div>

        <p className="text-[9px] text-muted-foreground italic leading-tight">
          {session?.locked
            ? 'Session is closed. Contribution is finalized.'
            : 'Pending amount will only be submitted to the Void Objective when this session is closed/locked.'}
        </p>
      </div>
    </div>
  )
}
