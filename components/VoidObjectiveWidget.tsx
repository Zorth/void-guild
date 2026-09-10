'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Target,
  Users,
  Edit2,
  Gift,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { cn, calculateVoidReward } from '@/lib/utils'
import VoidObjectiveEditDialog from './VoidObjectiveEditDialog'
import VoidObjectiveContributorsDialog from './VoidObjectiveContributorsDialog'
import { toast } from 'sonner'

export default function VoidObjectiveWidget() {
  const overview = useQuery(api.voidObjectives.getVoidObjectiveOverview)
  const userCharacters = useQuery(api.blackVoid.getUserCharacters, {system: 'PF'})
  const claimableRewards = useQuery(api.voidObjectives.getUserClaimableRewards)
  const claimRewardMutation = useMutation(api.voidObjectives.claimReward)

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isContributorsDialogOpen, setIsContributorsDialogOpen] = useState(false)
  const [claimingId, setClaimingId] = useState<string | null>(null)

  // Live client timer ticker that updates every minute
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  if (overview === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
    )
  }

  const {
    currentMonthKey,
    nextMonthKey,
    currentObjective,
    nextObjective,
    isAdmin,
    currentDeadline,
  } = overview

  const title = currentObjective?.title || 'Monthly Void Objective'
  const description =
    currentObjective?.description ||
    'Contribute to guild activities and lock sessions to push back the void.'
  const unit = currentObjective?.unit || 'progress'
  const tier1 = currentObjective?.tier1Goal ?? 5
  const tier2 = currentObjective?.tier2Goal ?? 10
  const tier3 = currentObjective?.tier3Goal ?? 20
  const progress = currentObjective?.currentProgress ?? 0

  // Calculate percentage toward highest tier (Tier 3)
  const maxGoal = Math.max(1, tier3)
  const overallPercentage = Math.min(100, Math.max(0, (progress / maxGoal) * 100))

  // Exact positions of milestones
  const pct0 = 0
  const pct1 = Math.min(100, Math.max(0, (tier1 / maxGoal) * 100))
  const pct2 = Math.min(100, Math.max(0, (tier2 / maxGoal) * 100))
  const pct3 = 100

  // Live countdown calculation
  const msLeft = Math.max(0, currentDeadline - now)
  const daysLeft = Math.floor(msLeft / (1000 * 60 * 60 * 24))
  const hoursLeft = Math.floor((msLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutesLeft = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60))

  // Character level reference for previewing rewards
  const primaryChar = userCharacters && userCharacters.length > 0 ? userCharacters[0] : null

  const handleClaim = async (contributionId: any, charName: string) => {
    setClaimingId(contributionId)
    try {
      const res = await claimRewardMutation({ contributionId })
      toast.success(`Claimed ${res.rewardGP.toLocaleString()} GP for ${charName}! (Tier ${res.claimedTier})`)
    } catch (err: any) {
      toast.error(err.message || 'Failed to claim reward')
    } finally {
      setClaimingId(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2 text-muted-foreground">
          <Target className="h-5 w-5 text-purple-400" /> Void Objective
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsContributorsDialogOpen(true)}
            className="h-8 text-xs gap-1.5 border-purple-500/30 hover:border-purple-500/60"
          >
            <Users className="h-3.5 w-3.5 text-purple-400" />
            <span className="hidden sm:inline">Contributors</span>
          </Button>
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditDialogOpen(true)}
              className="h-8 text-xs gap-1.5 border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
            >
              <Edit2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Edit Goal</span>
            </Button>
          )}
        </div>
      </div>

      <Card className="border-purple-500/30 bg-gradient-to-br from-card/90 via-purple-950/20 to-card/60 relative overflow-hidden shadow-lg shadow-purple-950/20">
        <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
          <Target className="h-32 w-32 text-purple-400" />
        </div>

        <CardContent className="p-5 space-y-6 relative z-10">
          {/* Header Info */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-foreground tracking-tight">
                  {title}
                </span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">
                  {currentMonthKey}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium bg-muted/30 px-2.5 py-1 rounded-full border border-border/40">
                <Clock className="h-3.5 w-3.5 text-purple-400" />
                <span className="font-mono">
                  {daysLeft > 0
                    ? `${daysLeft}d ${hoursLeft}h ${minutesLeft}m left`
                    : hoursLeft > 0
                      ? `${hoursLeft}h ${minutesLeft}m left`
                      : `${minutesLeft}m left`}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
              {description}
            </p>
          </div>

          {/* Progress Bar with Milestone Tier Lines & Aligned Value Labels */}
          <div className="space-y-2">
            <div className="flex justify-between items-baseline text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-foreground">Completion:</span>
                <span className="font-mono text-purple-300 font-bold">
                  {progress} / {tier3} {unit}
                </span>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground font-medium">
                {Math.round(overallPercentage)}% Reached
              </span>
            </div>

            {/* Completion Track with Divider Lines */}
            <div className="relative w-full h-4 bg-muted/40 rounded-lg overflow-hidden border border-border/70 shadow-inner">
              {/* Active Fill Gradient */}
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 transition-all duration-700 ease-out"
                style={{ width: `${overallPercentage}%` }}
              />

              {/* Milestone Divider Lines at Tier 1 & Tier 2 */}
              <div
                className="absolute top-0 bottom-0 w-[2px] bg-slate-900/90 dark:bg-white/70 shadow-sm z-10"
                style={{ left: `${pct1}%`, transform: 'translateX(-50%)' }}
                title={`Tier 1: ${tier1}`}
              />
              <div
                className="absolute top-0 bottom-0 w-[2px] bg-slate-900/90 dark:bg-white/70 shadow-sm z-10"
                style={{ left: `${pct2}%`, transform: 'translateX(-50%)' }}
                title={`Tier 2: ${tier2}`}
              />
            </div>

            {/* Labels just underneath each milestone line */}
            <div className="relative w-full h-5 font-mono text-[11px] text-muted-foreground select-none">
              {/* 0 at start */}
              <span
                className="absolute font-semibold text-muted-foreground/80"
                style={{ left: `${pct0}%` }}
              >
                0
              </span>

              {/* Tier 1 value aligned directly under Tier 1 line */}
              <span
                className={cn(
                  'absolute -translate-x-1/2 font-semibold transition-colors',
                  progress >= tier1 ? 'text-emerald-400 font-bold' : 'text-muted-foreground'
                )}
                style={{ left: `${pct1}%` }}
              >
                {tier1}
              </span>

              {/* Tier 2 value aligned directly under Tier 2 line */}
              <span
                className={cn(
                  'absolute -translate-x-1/2 font-semibold transition-colors',
                  progress >= tier2 ? 'text-blue-400 font-bold' : 'text-muted-foreground'
                )}
                style={{ left: `${pct2}%` }}
              >
                {tier2}
              </span>

              {/* Tier 3 value aligned right under end of bar */}
              <span
                className={cn(
                  'absolute right-0 font-semibold transition-colors',
                  progress >= tier3 ? 'text-purple-300 font-bold' : 'text-muted-foreground'
                )}
                style={{ left: `${pct3}%`, transform: 'translateX(-100%)' }}
              >
                {tier3}
              </span>
            </div>
          </div>

          {/* Pending Claimable Rewards Alert if any */}
          {claimableRewards && claimableRewards.length > 0 && (
            <div className="p-3 bg-gradient-to-r from-purple-950/40 to-amber-950/30 rounded-xl border border-amber-500/40 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                <Gift className="h-4 w-4" />
                <span>Rewards Ready to Claim!</span>
              </div>
              <div className="space-y-1.5">
                {claimableRewards.map((cr) => (
                  <div
                    key={cr.contributionId}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-card/60 border border-border/40 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-foreground">{cr.characterName}</span>
                      <span className="text-[10px] text-muted-foreground ml-1.5">
                        Tier {cr.achievedTier} ({cr.monthKey})
                      </span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleClaim(cr.contributionId, cr.characterName)}
                      disabled={claimingId === cr.contributionId}
                      className="h-7 text-xs bg-amber-500 hover:bg-amber-600 text-black font-bold"
                    >
                      {claimingId === cr.contributionId
                        ? 'Claiming...'
                        : `Claim ${cr.rewardGP.toLocaleString()} GP`}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog for Admins */}
      <VoidObjectiveEditDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        currentMonthKey={currentMonthKey}
        nextMonthKey={nextMonthKey}
        currentObjective={currentObjective}
        nextObjective={nextObjective}
      />

      {/* Contributors Dialog */}
      <VoidObjectiveContributorsDialog
        isOpen={isContributorsDialogOpen}
        onClose={() => setIsContributorsDialogOpen(false)}
        monthKey={currentMonthKey}
        objectiveTitle={title}
        unit={unit}
        currentProgress={progress}
        tier1={tier1}
        tier2={tier2}
        tier3={tier3}
      />
    </div>
  )
}
