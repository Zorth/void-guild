'use client'

import React, { useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
  CalendarDays,
  ArrowLeft,
  ArrowRight,
  Flag,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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

interface TacticalCalendarTabProps {
  sessionId: Id<'sessions'>
  worldId?: Id<'worlds'>
  isAdmin: boolean
}

export default function TacticalCalendarTab({
  sessionId,
  worldId,
  isAdmin,
}: TacticalCalendarTabProps) {
  const world = useQuery(api.worlds.getWorld, worldId ? { worldId } : 'skip')
  const session = useQuery(api.sessions.getSession, { sessionId })
  const worldSessions = useQuery(api.worlds.getSessionsByWorld, worldId ? { worldId } : 'skip')
  const updateInGameDate = useMutation(api.sessions.updateInGameDate)
  const updateWorldCalendar = useMutation(api.worlds.updateWorldCalendar)

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

  if (!world?.calendar) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-card/60 border border-border/50 rounded-2xl text-center space-y-3">
        <CalendarDays className="h-10 w-10 text-muted-foreground/60" />
        <p className="text-base font-bold text-foreground">No Calendar Configured for this World</p>
        <p className="text-xs text-muted-foreground max-w-sm">
          This world does not have a fantasy calendar configuration yet. You can import or configure one in the World settings.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto w-full flex flex-col gap-6 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-4">
        <div>
          <h2 className="text-lg font-black tracking-tight text-foreground flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-purple-400" />
            <span>World Calendar & In-Game Timeline</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            Advance in-game days and align this session with the world&apos;s chronological timeline.
          </p>
        </div>
      </div>

      {!calendarConfig || !currentDate ? (
        <div className="space-y-4 p-6 bg-card/80 border border-border/50 rounded-2xl">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <div className="p-6 bg-card/90 rounded-2xl border border-purple-500/20 shadow-md space-y-6">
          {/* Main Date Display with Forward / Back controls */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 shrink-0 rounded-xl border-border/60 hover:border-purple-400"
              onClick={decrementDay}
              disabled={!canEditCalendar}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <div className="flex-grow text-center py-4 px-6 bg-muted/20 rounded-xl border border-border/60 shadow-inner">
              <div className="text-2xl font-black text-foreground">
                {currentDate.day}{' '}
                {calendarConfig.static_data.months[currentDate.month]?.name || 'Unknown Month'}
              </div>
              <div className="text-sm font-bold text-purple-400 mt-0.5">
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
              className="h-12 w-12 shrink-0 rounded-xl border-border/60 hover:border-purple-400"
              onClick={incrementDay}
              disabled={!canEditCalendar}
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Session Range Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant={isSessionStart ? 'default' : 'outline'}
              className={cn(
                'h-11 font-bold text-xs uppercase tracking-wide gap-2 transition-all',
                isSessionStart && 'bg-purple-600 hover:bg-purple-700 text-white border-purple-400 shadow-md'
              )}
              onClick={setSessionStart}
              disabled={!canEditCalendar || session?.locked}
            >
              <Flag className={cn('h-4 w-4', isSessionStart ? 'text-white' : 'text-purple-400')} />
              <span>{isSessionStart ? 'Start Date (Current)' : 'Set as Session Start'}</span>
            </Button>

            <Button
              variant={isSessionEnd ? 'default' : 'outline'}
              className={cn(
                'h-11 font-bold text-xs uppercase tracking-wide gap-2 transition-all',
                isSessionEnd && 'bg-purple-600 hover:bg-purple-700 text-white border-purple-400 shadow-md'
              )}
              onClick={setSessionEnd}
              disabled={!canEditCalendar || session?.locked}
            >
              <CheckCircle2
                className={cn('h-4 w-4', isSessionEnd ? 'text-white' : 'text-purple-400')}
              />
              <span>{isSessionEnd ? 'End Date (Current)' : 'Set as Session End'}</span>
            </Button>
          </div>

          {/* Today's Sessions on this date */}
          <div className="space-y-3 pt-4 border-t border-border/50">
            <div className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <span>📅</span>
              <span>Sessions On This Date ({todaySessions.length})</span>
            </div>

            {todaySessions.length === 0 ? (
              <p className="text-xs text-muted-foreground italic p-3 bg-muted/10 rounded-xl border border-dashed border-border/50 text-center">
                No active or logged sessions on this in-game date.
              </p>
            ) : (
              <div className="space-y-2">
                {todaySessions.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 group"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full shrink-0 bg-purple-400" />
                        <span className="text-sm font-bold text-purple-200 truncate">
                          {s.players}
                        </span>
                      </div>
                      <div className="text-xs font-medium text-muted-foreground ml-4">
                        {s.dateRange}
                        {s.quest && (
                          <span className="text-purple-300 font-semibold ml-2">
                            • Quest: {s.quest}
                          </span>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1 text-purple-400 hover:text-purple-200 hover:bg-purple-500/20"
                      asChild
                    >
                      <Link href={`/sessions/${s.id}`}>
                        <span>View</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
