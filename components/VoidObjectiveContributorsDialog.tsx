'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, Trophy, Award, CheckCircle2 } from 'lucide-react'
import { CharacterRankIcon, getLevelBadgeStyle } from '@/lib/utils'

interface VoidObjectiveContributorsDialogProps {
  isOpen: boolean
  onClose: () => void
  monthKey: string
  objectiveTitle?: string
  unit?: string
}

export default function VoidObjectiveContributorsDialog({
  isOpen,
  onClose,
  monthKey,
  objectiveTitle,
  unit = 'contributions',
}: VoidObjectiveContributorsDialogProps) {
  const contributors = useQuery(api.voidObjectives.getContributors, isOpen ? { monthKey } : 'skip')

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5 text-purple-400" />
            Objective Contributors
          </DialogTitle>
          <DialogDescription className="text-xs">
            Characters who have contributed to <strong>{objectiveTitle || 'Monthly Void Objective'}</strong> ({monthKey}).
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto mt-2 pr-1 space-y-2">
          {contributors === undefined ? (
            <div className="space-y-2 py-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : contributors.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-xs italic bg-muted/20 rounded-lg border border-dashed border-border/50">
              No adventurers have contributed to this month's objective yet.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[11px] font-bold text-muted-foreground uppercase px-2">
                <span>Character</span>
                <span>Contributed</span>
              </div>
              {contributors.map((c, i) => (
                <div
                  key={c._id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-card/60 border border-border/40 hover:border-purple-500/30 transition-all text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-[11px] font-mono text-muted-foreground w-4 text-center">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex flex-col">
                      <div className="flex items-center gap-1.5 font-semibold text-foreground truncate">
                        <CharacterRankIcon rank={c.characterRank} />
                        <span className="truncate">{c.characterName}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className="inline-flex align-middle justify-center px-1.5 py-0.2 rounded-full text-[9px] font-bold"
                          style={getLevelBadgeStyle(c.characterLevel)}
                        >
                          Lvl {c.characterLevel}
                        </span>
                        {c.rewardClaimed && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-400 bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-500/30">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            Claimed {c.claimedRewardGP ? `${c.claimedRewardGP.toLocaleString()} GP` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-bold text-purple-300">
                      +{c.amount}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-1">
                      {unit}
                    </span>
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
