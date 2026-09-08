'use client'

import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Target,
  Users,
  Edit2,
  Calendar,
  Sparkles,
  Gift,
  CheckCircle2,
  ChevronRight,
  Clock,
} from 'lucide-react'
import { cn, calculateVoidReward } from '@/lib/utils'
import VoidObjectiveEditDialog from './VoidObjectiveEditDialog'
import VoidObjectiveContributorsDialog from './VoidObjectiveContributorsDialog'
import { toast } from 'sonner'

export default function VoidObjectiveWidget() {
  const overview = useQuery(api.voidObjectives.getVoidObjectiveOverview)
  const userCharacters = useQuery(api.characters.listCharacters)
  const claimableRewards = useQuery(api.voidObjectives.getUserClaimableRewards)
  const claimRewardMutation = useMutation(api.voidObjectives.claimReward)

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isContributorsDialogOpen, setIsContributorsDialogOpen] = useState(false)
  const [claimingId, setClaimingId] = useState<string | null>(null)

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

  // Calculate percentage toward highest tier
  const maxGoal = tier3
  const overallPercentage = Math.min(100, Math.round((progress / maxGoal) * 100))

  // Determine current active tier reached
  let reachedTier = 0
  if (progress >= tier3) reachedTier = 3
  else if (progress >= tier2) reachedTier = 2
  else if (progress >= tier1) reachedTier = 1

  // Format deadline countdown
  const now = Date.now()
  const msLeft = Math.max(0, currentDeadline - now)
  const daysLeft = Math.floor(msLeft / (1000 * 60 * 60 * 24))
  const hoursLeft = Math.floor((msLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  // Character level reference for previewing rewards
  const primaryChar = userCharacters && userCharacters.length > 0 ? userCharacters[0] : null
  const sampleLevel = primaryChar?.lvl ?? 1

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

        <CardContent className="p-5 space-y-5 relative z-10">
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
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                <Clock className="h-3.5 w-3.5 text-purple-400" />
                <span>
                  {daysLeft > 0 ? `${daysLeft}d ${hoursLeft}h left` : `${hoursLeft}h left`}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
              {description}
            </p>
          </div>

          {/* Progress Bar & Value */}
          <div className="space-y-2">
            <div className="flex justify-between items-baseline text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-foreground">Completion:</span>
                <span className="font-mono text-purple-300 font-bold">
                  {progress} / {tier3} {unit}
                </span>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground font-medium">
                {overallPercentage}% Reached
              </span>
            </div>

            {/* Custom Multi-tiered progress track */}
            <div className="relative w-full h-3 bg-muted/40 rounded-full overflow-hidden border border-border/60">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 transition-all duration-700 ease-out"
                style={{ width: `${overallPercentage}%` }}
              />
              {/* Tier tick marks */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-background/80 z-10"
                style={{ left: `${(tier1 / tier3) * 100}%` }}
                title={`Tier 1: ${tier1}`}
              />
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-background/80 z-10"
                style={{ left: `${(tier2 / tier3) * 100}%` }}
                title={`Tier 2: ${tier2}`}
              />
            </div>
          </div>

          {/* 3 Tiers Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* Tier 1 */}
            <div
              className={cn(
                'p-3 rounded-xl border transition-all text-xs flex flex-col justify-between gap-2',
                progress >= tier1
                  ? 'bg-emerald-950/25 border-emerald-500/40 shadow-sm shadow-emerald-950/30'
                  : 'bg-card/40 border-border/40 opacity-85'
              )}
            >
              <div>
                <div className="flex items-center justify-between font-bold mb-1">
                  <span className={progress >= tier1 ? 'text-emerald-400' : 'text-muted-foreground'}>
                    Tier 1 Goal
                  </span>
                  {progress >= tier1 ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {progress}/{tier1}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Target: <strong>{tier1} {unit}</strong>
                </div>
              </div>
              <div className="pt-2 border-t border-border/30">
                <div className="text-[10px] text-muted-foreground font-medium">Reward:</div>
                <div className="font-mono text-emerald-300 font-semibold text-[11px]">
                  6 × (1.5)ᴸᵛˡ
                </div>
                {primaryChar && (
                  <div className="text-[10px] text-emerald-400/90 font-mono mt-0.5">
                    ≈ {calculateVoidReward(1, primaryChar.lvl).toLocaleString()} GP (Lvl {primaryChar.lvl})
                  </div>
                )}
              </div>
            </div>

            {/* Tier 2 */}
            <div
              className={cn(
                'p-3 rounded-xl border transition-all text-xs flex flex-col justify-between gap-2',
                progress >= tier2
                  ? 'bg-blue-950/25 border-blue-500/40 shadow-sm shadow-blue-950/30'
                  : 'bg-card/40 border-border/40 opacity-85'
              )}
            >
              <div>
                <div className="flex items-center justify-between font-bold mb-1">
                  <span className={progress >= tier2 ? 'text-blue-400' : 'text-muted-foreground'}>
                    Tier 2 Goal
                  </span>
                  {progress >= tier2 ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  ) : (
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {progress}/{tier2}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Target: <strong>{tier2} {unit}</strong>
                </div>
              </div>
              <div className="pt-2 border-t border-border/30">
                <div className="text-[10px] text-muted-foreground font-medium">Reward:</div>
                <div className="font-mono text-blue-300 font-semibold text-[11px]">
                  9 × (1.5)ᴸᵛˡ
                </div>
                {primaryChar && (
                  <div className="text-[10px] text-blue-400/90 font-mono mt-0.5">
                    ≈ {calculateVoidReward(2, primaryChar.lvl).toLocaleString()} GP (Lvl {primaryChar.lvl})
                  </div>
                )}
              </div>
            </div>

            {/* Tier 3 */}
            <div
              className={cn(
                'p-3 rounded-xl border transition-all text-xs flex flex-col justify-between gap-2',
                progress >= tier3
                  ? 'bg-purple-950/30 border-purple-500/50 shadow-sm shadow-purple-950/40'
                  : 'bg-card/40 border-border/40 opacity-85'
              )}
            >
              <div>
                <div className="flex items-center justify-between font-bold mb-1">
                  <span className={progress >= tier3 ? 'text-purple-300' : 'text-muted-foreground'}>
                    Tier 3 Goal
                  </span>
                  {progress >= tier3 ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                  ) : (
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {progress}/{tier3}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Target: <strong>{tier3} {unit}</strong>
                </div>
              </div>
              <div className="pt-2 border-t border-border/30">
                <div className="text-[10px] text-muted-foreground font-medium">Reward:</div>
                <div className="font-mono text-purple-300 font-semibold text-[11px]">
                  12 × (1.5)ᴸᵛˡ
                </div>
                {primaryChar && (
                  <div className="text-[10px] text-purple-400/90 font-mono mt-0.5">
                    ≈ {calculateVoidReward(3, primaryChar.lvl).toLocaleString()} GP (Lvl {primaryChar.lvl})
                  </div>
                )}
              </div>
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
      />
    </div>
  )
}
