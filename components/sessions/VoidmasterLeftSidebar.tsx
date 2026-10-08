'use client'

import { useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Flag, CheckCircle2, CalendarDays, ExternalLink, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn, formatInGameYear } from '@/lib/utils'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id, Doc } from '@/convex/_generated/dataModel'
import { toast } from 'sonner'

interface FantasyCalendarJSON {
  name?: string
  description?: string
  dynamic_data: {
    year: number
    month: number
    day: number
    epoch?: number
  }
  static_data: {
    year: number
    timespans?: { name: string; type: string; length: number }[]
    months: { name: string; length: number; type: string }[]
    n_months: number
    eras?: {
      name: string
      formatting?: string
      settings?: {
        starting_day?: number
        starting_month?: number
        starting_year?: number
      }
    }[]
    settings?: {
      year_zero_exists?: boolean
    }
  }
}

interface VoidmasterLeftSidebarProps {
  sessionId: Id<'sessions'>
  worldId?: Id<'worlds'>
  worldName: string
  isAdmin: boolean
}

export default function VoidmasterLeftSidebar({
  sessionId,
  worldId,
  worldName,
  isAdmin,
}: VoidmasterLeftSidebarProps) {
  const world = useQuery(api.worlds.getWorld, worldId ? { worldId } : 'skip')
  const session = useQuery(api.sessions.getSession, { sessionId })
  const worldSessions = useQuery(api.worlds.getSessionsByWorld, worldId ? { worldId } : 'skip')
  const updateInGameDate = useMutation(api.sessions.updateInGameDate)
  const updateWorldCalendar = useMutation(api.worlds.updateWorldCalendar)

  // Void Objective queries and mutations
  const currentObjective = useQuery(api.voidObjectives.getCurrentObjective)
  const setPendingContribution = useMutation(api.voidObjectives.setPendingObjectiveContribution)
  const [isSavingContribution, setIsSavingContribution] = useState(false)
  const [objectiveContributionInput, setObjectiveContributionInput] = useState<number | null>(null)

  const calendarConfig = useMemo(() => {
    if (!world?.calendar) return null
    try {
      const parsed = JSON.parse(world.calendar)
      const dynamicData = parsed.dynamic_data || parsed.dynamic || parsed.dynamicData
      const staticData = parsed.static_data || parsed.static || parsed.staticData

      if (!staticData || !dynamicData) return null

      return {
        ...parsed,
        dynamic_data: dynamicData,
        static_data: staticData,
      } as FantasyCalendarJSON
    } catch (e) {
      return null
    }
  }, [world?.calendar])

  const currentDate = calendarConfig?.dynamic_data

  const saveDateToWorld = useCallback(
    async (year: number, month: number, day: number) => {
      if (!calendarConfig || !worldId) return
      try {
        const updatedConfig = {
          ...calendarConfig,
          dynamic_data: {
            ...calendarConfig.dynamic_data,
            year,
            month,
            day,
          },
        }
        await updateWorldCalendar({
          worldId,
          calendar: JSON.stringify(updatedConfig),
        })
      } catch (e) {
        console.error('Failed to update world calendar', e)
      }
    },
    [calendarConfig, worldId, updateWorldCalendar]
  )

  const setSessionStart = useCallback(async () => {
    if (!currentDate) return
    try {
      await updateInGameDate({
        sessionId,
        inGameDate: {
          ...session?.inGameDate,
          year: currentDate.year,
          month: currentDate.month,
          day: currentDate.day,
        },
      })
      toast.success('Session start date set')
    } catch (e) {
      toast.error('Failed to set session start')
    }
  }, [currentDate, sessionId, session?.inGameDate, updateInGameDate])

  const setSessionEnd = useCallback(async () => {
    if (!currentDate) return
    try {
      await updateInGameDate({
        sessionId,
        inGameDate: {
          year: session?.inGameDate?.year || currentDate.year,
          month: session?.inGameDate?.month || currentDate.month,
          day: session?.inGameDate?.day || currentDate.day,
          endYear: currentDate.year,
          endMonth: currentDate.month,
          endDay: currentDate.day,
        },
      })
      toast.success('Session end date set')
    } catch (e) {
      toast.error('Failed to set session end')
    }
  }, [currentDate, sessionId, session?.inGameDate, updateInGameDate])

  const incrementDay = useCallback(() => {
    if (!calendarConfig || !currentDate) return
    let { year, month, day } = currentDate

    if (month >= calendarConfig.static_data.n_months || month < 0) {
      month = 0
    }

    const monthConfig = calendarConfig.static_data.months[month]
    if (!monthConfig) return
    const currentMonthDays = monthConfig.length

    day++
    if (day > currentMonthDays) {
      day = 1
      month++
      if (month >= calendarConfig.static_data.n_months) {
        month = 0
        year++
      }
    }
    saveDateToWorld(year, month, day)
  }, [calendarConfig, currentDate, saveDateToWorld])

  const decrementDay = useCallback(() => {
    if (!calendarConfig || !currentDate) return
    let { year, month, day } = currentDate

    day--
    if (day < 1) {
      month--
      if (month < 0) {
        month = calendarConfig.static_data.n_months - 1
        year--
      }

      if (month < 0 || month >= calendarConfig.static_data.n_months) {
        month = 0
      }

      const monthConfig = calendarConfig.static_data.months[month]
      day = monthConfig?.length || 1
    }
    saveDateToWorld(year, month, day)
  }, [calendarConfig, currentDate, saveDateToWorld])

  const checkSessionOccurs = (s: Doc<'sessions'>, y: number, m: number, d: number) => {
    const start = s.inGameDate
    if (!start) return false

    if (!start.endDay) {
      return start.year === y && start.month === m && start.day === d
    }

    const currentTotal = y * 10000 + m * 100 + d
    const startTotal = start.year * 10000 + start.month * 100 + start.day
    const endTotal = start.endYear! * 10000 + start.endMonth! * 100 + start.endDay!

    return currentTotal >= startTotal && currentTotal <= endTotal
  }

  const todaySessions = useMemo(() => {
    if (!calendarConfig || !currentDate) return []

    return (worldSessions || [])
      .filter((s) => checkSessionOccurs(s, currentDate.year, currentDate.month, currentDate.day))
      .map((s) => {
        const start = s.inGameDate!
        const end = {
          year: start.endYear ?? start.year,
          month: start.endMonth ?? start.month,
          day: start.endDay ?? start.day,
        }

        const formatDate = (y: number, m: number, d: number) =>
          `${formatInGameYear(
            y,
            calendarConfig.static_data.eras,
            calendarConfig.static_data.settings?.year_zero_exists,
            { useAbbreviation: true, labelFirst: true }
          )}/${(m + 1).toString().padStart(2, '0')}/${d.toString().padStart(2, '0')}`

        return {
          id: s._id,
          players: s.characterNames?.join(', ') || 'No attendees',
          dateRange: start.endDay
            ? `${formatDate(start.year, start.month, start.day)} - ${formatDate(end.year, end.month, end.day)}`
            : formatDate(start.year, start.month, start.day),
          quest: s.quest?.name,
        }
      })
  }, [calendarConfig, currentDate, worldSessions])

  const isSessionStart = useMemo(() => {
    if (!currentDate || !session?.inGameDate) return false
    return (
      session.inGameDate.year === currentDate.year &&
      session.inGameDate.month === currentDate.month &&
      session.inGameDate.day === currentDate.day
    )
  }, [currentDate, session?.inGameDate])

  const isSessionEnd = useMemo(() => {
    if (!currentDate || !session?.inGameDate?.endDay) return false
    return (
      session.inGameDate.endYear === currentDate.year &&
      session.inGameDate.endMonth === currentDate.month &&
      session.inGameDate.endDay === currentDate.day
    )
  }, [currentDate, session?.inGameDate])

  const canEditCalendar = Boolean(isAdmin || (world && session && world.owner === session.owner))

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Tactical View button */}
      <Button
        asChild
        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold h-10 shadow-md gap-2"
      >
        <Link href={`/sessions/${sessionId}/gm`}>
          <span>⚔️</span>
          <span>Tactical View</span>
        </Link>
      </Button>

      {/* World Calendar Widget (if the world has a calendar) */}
      {Boolean(world?.calendar) && (
        <div className="flex flex-col gap-2 p-3 bg-muted/30 rounded-lg border border-border/50">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                World Calendar
              </span>
            </div>
          </div>

          {!calendarConfig || !currentDate ? (
            <div className="space-y-3">
              <Skeleton className="h-14 w-full" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={decrementDay}
                  disabled={!canEditCalendar}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex-grow text-center py-2 bg-card rounded border border-border/50 shadow-sm">
                  <div className="text-sm font-black text-foreground">
                    {currentDate.day}{' '}
                    {calendarConfig.static_data.months[currentDate.month]?.name || 'Unknown Month'}
                  </div>
                  <div className="text-[10px] font-bold text-muted-foreground">
                    {formatInGameYear(
                      currentDate.year,
                      calendarConfig.static_data.eras,
                      calendarConfig.static_data.settings?.year_zero_exists,
                      { useAbbreviation: true, labelFirst: true }
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={incrementDay}
                  disabled={!canEditCalendar}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Session Range Controls */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={isSessionStart ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    'h-7 text-[10px] font-black uppercase tracking-tighter transition-colors',
                    isSessionStart && 'bg-purple-600 hover:bg-purple-700 text-white border-purple-400'
                  )}
                  onClick={setSessionStart}
                  disabled={!canEditCalendar || session?.locked}
                >
                  <Flag
                    className={cn('h-2 w-2 mr-1', isSessionStart ? 'text-white' : 'text-primary')}
                  />{' '}
                  Start
                </Button>
                <Button
                  variant={isSessionEnd ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    'h-7 text-[10px] font-black uppercase tracking-tighter transition-colors',
                    isSessionEnd && 'bg-purple-600 hover:bg-purple-700 text-white border-purple-400'
                  )}
                  onClick={setSessionEnd}
                  disabled={!canEditCalendar || session?.locked}
                >
                  <CheckCircle2
                    className={cn('h-2 w-2 mr-1', isSessionEnd ? 'text-white' : 'text-primary')}
                  />{' '}
                  End
                </Button>
              </div>

              {/* Today's Sessions */}
              {todaySessions.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-black uppercase tracking-tighter text-muted-foreground ml-1">
                    Today&apos;s Sessions
                  </p>
                  <div className="space-y-1">
                    {todaySessions.map((s) => (
                      <TooltipProvider key={s.id}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2 p-2 rounded border transition-colors bg-purple-500/10 border-purple-500/30 group/sess">
                              <div className="flex flex-col gap-0.5 flex-grow overflow-hidden">
                                <div className="flex items-center gap-2">
                                  <div className="h-2 w-2 rounded-full shrink-0 bg-purple-500" />
                                  <span className="text-sm font-bold truncate text-purple-700 dark:text-purple-300">
                                    {s.players}
                                  </span>
                                </div>
                                <div className="text-[10px] font-medium text-muted-foreground ml-4">
                                  {s.dateRange}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 opacity-0 group-hover/sess:opacity-100 hover:bg-purple-500/20 text-purple-600 transition-all shrink-0"
                                asChild
                              >
                                <Link href={`/sessions/${s.id}`}>
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </Link>
                              </Button>
                            </div>
                          </TooltipTrigger>
                          {s.quest && (
                            <TooltipContent>
                              <div className="flex flex-col gap-1 max-w-[200px]">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                  Active Quest
                                </p>
                                <p className="text-xs font-bold text-primary">{s.quest}</p>
                              </div>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Pending Void Objective Contribution Tracker */}
      {currentObjective && (
        <div className="p-3 bg-purple-950/20 border border-purple-500/30 rounded-lg space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300">
              <Target className="h-3.5 w-3.5 text-purple-400 shrink-0" />
              <span>Objective Tracker</span>
            </div>
            <span className="text-[10px] font-mono text-purple-300/80 bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-500/20">
              {currentObjective.currentProgress} / {currentObjective.tier3Goal}{' '}
              {currentObjective.unit || 'pts'}
            </span>
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-foreground truncate" title={currentObjective.title}>
              {currentObjective.title}
            </p>
            <p className="text-[10px] text-muted-foreground line-clamp-2">
              {currentObjective.description}
            </p>
          </div>

          <div className="space-y-1.5 pt-1 border-t border-purple-500/20">
            <div className="flex items-center justify-between gap-2">
              <label className="text-[11px] text-muted-foreground">Session Contribution:</label>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  className="w-16 h-7 text-xs text-right font-mono font-bold bg-background/80"
                  value={
                    objectiveContributionInput !== null
                      ? objectiveContributionInput
                      : (session?.pendingVoidContribution ?? session?.voidContribution ?? 0)
                  }
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
                className="h-6 text-[10px] font-semibold flex-grow bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 border border-purple-500/30"
                disabled={isSavingContribution || session?.locked}
                onClick={async () => {
                  const targetVal =
                    objectiveContributionInput !== null
                      ? objectiveContributionInput
                      : (session?.pendingVoidContribution ?? session?.voidContribution ?? 0)
                  setIsSavingContribution(true)
                  try {
                    await setPendingContribution({
                      sessionId,
                      amount: targetVal,
                    })
                    toast.success(
                      `Pending contribution set to ${targetVal} ${currentObjective.unit || 'pts'}`
                    )
                  } catch (err: any) {
                    toast.error(err.message || 'Failed to update pending contribution')
                  } finally {
                    setIsSavingContribution(false)
                  }
                }}
              >
                {isSavingContribution ? 'Saving...' : 'Set Pending'}
              </Button>
              {(session?.pendingVoidContribution ?? session?.voidContribution ?? 0) > 0 &&
                !session?.locked && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[10px] text-muted-foreground hover:text-destructive"
                    disabled={isSavingContribution}
                    onClick={async () => {
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
                    }}
                  >
                    Clear
                  </Button>
                )}
            </div>

            <p className="text-[9px] text-muted-foreground italic leading-tight pt-0.5">
              {session?.locked
                ? 'Session is closed. Contribution is finalized.'
                : 'Pending amount will only be submitted to the Void Objective when this session is closed/locked.'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
