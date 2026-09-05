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
import { Trophy, Lock, CheckCircle2, Gift, EyeOff, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Achievement {
  id: string
  title: string
  description: string
  category: 'normal' | 'hidden'
  reward: string
  isUnlocked: boolean
  unlockedAt: number | null
  isHidden: boolean
  chainId?: string
  tier?: number
  maxTier?: number
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

function formatUnlockedDate(timestamp: number | null): string {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

export default function AchievementsModal({ open, onOpenChange }: AchievementsModalProps) {
  const syncAndGetAchievements = useMutation(api.achievements.syncAndGetAchievements)
  const [data, setData] = useState<AchievementsData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'hidden'>('all')
  const [expandedChains, setExpandedChains] = useState<Set<string>>(new Set())

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

  const toggleChainExpand = (chainId: string) => {
    setExpandedChains((prev) => {
      const next = new Set(prev)
      if (next.has(chainId)) {
        next.delete(chainId)
      } else {
        next.add(chainId)
      }
      return next
    })
  }

  const achievements = data?.achievements || []
  const filteredAchievements = achievements.filter((a) => {
    if (filter === 'unlocked') return a.isUnlocked
    if (filter === 'hidden') return a.isHidden
    return true
  })

  const progressPercentage =
    data && data.totalCount > 0 ? Math.round((data.unlockedCount / data.totalCount) * 100) : 0

  const renderReward = (item: Achievement, isSubItem = false) => {
    const hasReward = Boolean(item.reward && item.reward.trim() !== '')

    if (item.isUnlocked && hasReward) {
      return (
        <div className={cn(isSubItem ? 'pt-0.5' : 'pt-1')}>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/30">
            <Gift className="h-3.5 w-3.5 text-purple-400 shrink-0" />
            <span>Reward: {item.reward}</span>
          </div>
        </div>
      )
    }

    if (data?.isAdmin) {
      return (
        <div className={cn(isSubItem ? 'pt-0.5' : 'pt-1')}>
          <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-muted/40 text-muted-foreground border border-border/40">
            <Gift className="h-3 w-3 shrink-0 text-muted-foreground/70" />
            <span>Reward: {hasReward ? item.reward : 'None'}</span>
          </div>
        </div>
      )
    }

    return null
  }

  const seenChains = new Set<string>()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="pb-3 border-b space-y-3">
          <div className="flex items-center justify-between gap-4 pr-6">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
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
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-muted-foreground">Overall Progress</span>
                <span className="text-purple-400 font-bold">
                  {data.unlockedCount} / {data.totalCount} Unlocked ({progressPercentage}%)
                </span>
              </div>
              <div className="w-full bg-muted/40 h-2 rounded-full overflow-hidden border border-border/30">
                <div
                  className="bg-gradient-to-r from-purple-600 to-purple-400 h-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Filter Pills - Only rendered for Admins */}
          {data?.isAdmin && (
            <div className="flex gap-2 pt-1 text-xs">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={cn(
                  'px-3 py-1 rounded-full font-semibold transition-colors border',
                  filter === 'all'
                    ? 'bg-purple-600 text-white border-purple-600'
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
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-muted/30 hover:bg-muted/60 border-border/50 text-muted-foreground'
                )}
              >
                Unlocked ({data?.unlockedCount || 0})
              </button>
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
            </div>
          )}
        </DialogHeader>

        {/* Scrollable Achievements List */}
        <div className="flex-grow overflow-y-auto pr-1 py-4 space-y-3 custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Syncing achievements...</p>
            </div>
          ) : filteredAchievements.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm italic">
              No achievements found.
            </div>
          ) : (
            filteredAchievements.map((item) => {
              // Handle tiered chain grouping with collapsible sub-tiers
              if (item.chainId) {
                if (seenChains.has(item.chainId)) return null
                seenChains.add(item.chainId)

                const chainItems = filteredAchievements
                  .filter((a) => a.chainId === item.chainId)
                  .sort((a, b) => (b.tier || 0) - (a.tier || 0)) // Higher tier first

                // Select primary item: highest unlocked tier, or lowest tier if none unlocked
                const unlockedItems = chainItems.filter((i) => i.isUnlocked)
                const primaryItem =
                  unlockedItems.length > 0
                    ? unlockedItems[0]
                    : chainItems[chainItems.length - 1]

                const subItems = chainItems.filter((i) => i.id !== primaryItem.id)
                const isExpanded = expandedChains.has(item.chainId)

                return (
                  <div
                    key={`chain-${item.chainId}`}
                    className={cn(
                      'rounded-xl border transition-all duration-200 overflow-hidden',
                      primaryItem.isUnlocked
                        ? 'bg-purple-500/10 border-purple-500/30 shadow-sm'
                        : 'bg-muted/20 border-border/40 opacity-70'
                    )}
                  >
                    {/* Primary (Most Relevant) Achievement Card */}
                    <div className="p-4 flex items-start gap-3.5">
                      <div
                        className={cn(
                          'p-2.5 rounded-xl shrink-0 flex items-center justify-center border',
                          primaryItem.isUnlocked
                            ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                            : 'bg-muted/40 border-border/40 text-muted-foreground'
                        )}
                      >
                        {primaryItem.isUnlocked ? (
                          <CheckCircle2 className="h-5 w-5 text-purple-400" />
                        ) : (
                          <Lock className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>

                      <div className="flex-grow min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <h4
                            className={cn(
                              'font-bold text-sm flex items-center gap-1.5',
                              primaryItem.isUnlocked ? 'text-foreground' : 'text-muted-foreground'
                            )}
                          >
                            <span>{primaryItem.title}</span>
                            {primaryItem.isHidden && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30">
                                <EyeOff className="h-2.5 w-2.5" />
                                Hidden
                              </span>
                            )}
                          </h4>

                          {primaryItem.isUnlocked ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              <CheckCircle2 className="h-3 w-3 text-purple-400" />
                              Unlocked {primaryItem.unlockedAt ? `on ${formatUnlockedDate(primaryItem.unlockedAt)}` : ''}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted/40 text-muted-foreground border border-border/40">
                              <Lock className="h-3 w-3" />
                              Locked
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {primaryItem.description}
                        </p>

                        {renderReward(primaryItem)}
                      </div>
                    </div>

                    {/* Expand/Collapse Toggle Button for lower/other tiers */}
                    {subItems.length > 0 && (
                      <div className="border-t border-border/30 bg-muted/10">
                        <button
                          type="button"
                          onClick={() => toggleChainExpand(item.chainId!)}
                          className="w-full px-4 py-2 text-xs font-semibold text-purple-300 hover:text-purple-200 hover:bg-purple-500/10 flex items-center justify-between transition-colors"
                        >
                          <span className="flex items-center gap-1.5">
                            <span>
                              {isExpanded
                                ? 'Hide lower tiers'
                                : `Show ${subItems.length} lower tier achievement${subItems.length > 1 ? 's' : ''}`}
                            </span>
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-purple-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-purple-400" />
                          )}
                        </button>

                        {/* Un-collapsed (Expanded) Sub-Items */}
                        {isExpanded && (
                          <div className="p-4 pt-3 border-t border-border/20 space-y-3 bg-purple-950/20">
                            {subItems.map((subItem) => (
                              <div
                                key={subItem.id}
                                className="flex items-start gap-3.5 pl-3 border-l-2 border-purple-500/30 py-1"
                              >
                                <div
                                  className={cn(
                                    'p-2 rounded-lg shrink-0 flex items-center justify-center border',
                                    subItem.isUnlocked
                                      ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                                      : 'bg-muted/40 border-border/40 text-muted-foreground'
                                  )}
                                >
                                  {subItem.isUnlocked ? (
                                    <CheckCircle2 className="h-4 w-4 text-purple-400" />
                                  ) : (
                                    <Lock className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </div>

                                <div className="flex-grow min-w-0 space-y-0.5">
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <h5
                                      className={cn(
                                        'font-bold text-xs flex items-center gap-1.5',
                                        subItem.isUnlocked ? 'text-foreground' : 'text-muted-foreground'
                                      )}
                                    >
                                      <span>{subItem.title}</span>
                                      {subItem.isHidden && (
                                        <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30">
                                          <EyeOff className="h-2 w-2" />
                                          Hidden
                                        </span>
                                      )}
                                    </h5>

                                    {subItem.isUnlocked ? (
                                      <span className="text-[10px] text-purple-400 font-medium">
                                        Unlocked {subItem.unlockedAt ? `on ${formatUnlockedDate(subItem.unlockedAt)}` : ''}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-muted-foreground">Locked</span>
                                    )}
                                  </div>

                                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                                    {subItem.description}
                                  </p>

                                  {renderReward(subItem, true)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              }

              // Standalone achievement card
              return (
                <div
                  key={item.id}
                  className={cn(
                    'p-4 rounded-xl border transition-all duration-200 relative overflow-hidden',
                    item.isUnlocked
                      ? 'bg-purple-500/10 border-purple-500/30 shadow-sm'
                      : 'bg-muted/20 border-border/40 opacity-70'
                  )}
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className={cn(
                        'p-2.5 rounded-xl shrink-0 flex items-center justify-center border',
                        item.isUnlocked
                          ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                          : 'bg-muted/40 border-border/40 text-muted-foreground'
                      )}
                    >
                      {item.isUnlocked ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Lock className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>

                    <div className="flex-grow min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h4
                          className={cn(
                            'font-bold text-sm flex items-center gap-1.5',
                            item.isUnlocked ? 'text-foreground' : 'text-muted-foreground'
                          )}
                        >
                          <span>{item.title}</span>
                          {item.isHidden && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30">
                              <EyeOff className="h-2.5 w-2.5" />
                              Hidden
                            </span>
                          )}
                        </h4>

                        {item.isUnlocked ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            <CheckCircle2 className="h-3 w-3 text-purple-400" />
                            Unlocked {item.unlockedAt ? `on ${formatUnlockedDate(item.unlockedAt)}` : ''}
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

                      {renderReward(item)}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
