'use client'

import { useState, useEffect } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Trophy, Lock, CheckCircle2, Gift, EyeOff, Loader2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Achievement {
  id: string
  title: string
  description: string
  category: 'normal' | 'hidden'
  icon: string
  reward: string
  isUnlocked: boolean
  unlockedAt: number | null
  isHidden: boolean
}

interface AchievementsData {
  achievements: Achievement[]
  isAdmin: boolean
  unlockedCount: number
  totalCount: number
}

interface AchievementsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function AchievementsModal({ open, onOpenChange }: AchievementsModalProps) {
  const syncAndGetAchievements = useMutation(api.achievements.syncAndGetAchievements)
  const [data, setData] = useState<AchievementsData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'hidden'>('all')

  useEffect(() => {
    if (open) {
      setIsLoading(true)
      syncAndGetAchievements()
        .then((res) => {
          if (res) setData(res)
        })
        .catch((err) => console.error('Failed to load achievements:', err))
        .finally(() => setIsLoading(false))
    }
  }, [open, syncAndGetAchievements])

  const achievements = data?.achievements || []
  const filteredAchievements = achievements.filter((a) => {
    if (filter === 'unlocked') return a.isUnlocked
    if (filter === 'hidden') return a.isHidden
    return true
  })

  const progressPercentage = data && data.totalCount > 0
    ? Math.round((data.unlockedCount / data.totalCount) * 100)
    : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="pb-3 border-b">
          <div className="flex items-center justify-between gap-4 pr-6">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <Trophy className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  Account Achievements
                  {data?.isAdmin && (
                    <span className="text-[10px] bg-purple-500/20 text-purple-600 dark:text-purple-300 px-2 py-0.5 rounded-full font-bold border border-purple-500/30 uppercase tracking-wider">
                      Admin View
                    </span>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Track your milestones, secrets, and earned rewards across the Void Guild.
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {data && (
            <div className="pt-3 space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-muted-foreground">Overall Progress</span>
                <span className="text-primary font-bold">
                  {data.unlockedCount} / {data.totalCount} Unlocked ({progressPercentage}%)
                </span>
              </div>
              <div className="w-full bg-muted/40 h-2 rounded-full overflow-hidden border border-border/30">
                <div
                  className="bg-gradient-to-r from-amber-500 to-purple-600 h-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Filter Pills */}
          <div className="flex gap-2 pt-2 text-xs">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={cn(
                'px-3 py-1 rounded-full font-semibold transition-colors border',
                filter === 'all'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted/30 hover:bg-muted/60 border-border/50 text-muted-foreground'
              )}
            >
              All ({achievements.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unlocked')}
              className={cn(
                'px-3 py-1 rounded-full font-semibold transition-colors border',
                filter === 'unlocked'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted/30 hover:bg-muted/60 border-border/50 text-muted-foreground'
              )}
            >
              Unlocked ({data?.unlockedCount || 0})
            </button>
            {data?.isAdmin && (
              <button
                type="button"
                onClick={() => setFilter('hidden')}
                className={cn(
                  'px-3 py-1 rounded-full font-semibold transition-colors border flex items-center gap-1',
                  filter === 'hidden'
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-300 border-purple-500/30'
                )}
              >
                <EyeOff className="h-3 w-3" /> Hidden ({achievements.filter((a) => a.isHidden).length})
              </button>
            )}
          </div>
        </DialogHeader>

        {/* Scrollable Achievements List */}
        <div className="flex-grow overflow-y-auto pr-1 py-4 space-y-3 custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Checking eligibility & syncing achievements...</p>
            </div>
          ) : filteredAchievements.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm italic">
              No achievements found for this filter.
            </div>
          ) : (
            filteredAchievements.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'p-4 rounded-xl border transition-all duration-200 relative overflow-hidden',
                  item.isUnlocked
                    ? 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/30 dark:border-amber-500/40 shadow-sm'
                    : 'bg-muted/20 border-border/40 opacity-75'
                )}
              >
                <div className="flex items-start gap-3.5">
                  {/* Icon Badge */}
                  <div
                    className={cn(
                      'text-2xl p-2.5 rounded-xl shrink-0 flex items-center justify-center border',
                      item.isUnlocked
                        ? 'bg-amber-500/20 border-amber-500/40 shadow-sm'
                        : 'bg-muted/40 border-border/40 text-muted-foreground grayscale'
                    )}
                  >
                    {item.isUnlocked ? item.icon : <Lock className="h-6 w-6 text-muted-foreground" />}
                  </div>

                  <div className="flex-grow min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h4 className={cn('font-bold text-sm flex items-center gap-1.5', item.isUnlocked ? 'text-foreground' : 'text-muted-foreground')}>
                        <span>{item.title}</span>
                        {item.isHidden && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30">
                            <EyeOff className="h-2.5 w-2.5" />
                            Hidden Achievement
                          </span>
                        )}
                      </h4>

                      {item.isUnlocked ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="h-3 w-3" />
                          Unlocked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted/40 text-muted-foreground border border-border/40">
                          <Lock className="h-3 w-3" />
                          Locked
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>

                    {/* Reward Pill (only shown when unlocked) */}
                    {item.isUnlocked && item.reward && (
                      <div className="pt-1.5">
                        <div className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                          <Gift className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>Reward: {item.reward}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
