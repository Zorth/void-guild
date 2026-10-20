'use client'

import React, { useMemo, useCallback, useState } from 'react'
import Link from 'next/link'
import {
  CalendarDays,
  ArrowLeft,
  ArrowRight,
  Flag,
  CheckCircle2,
  ExternalLink,
  Sunrise,
  Sunset,
  Sun,
  Moon,
  Clock,
  CloudRain,
  Wind,
  Thermometer,
  MapPin,
  Sparkles,
  Lock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatInGameYear } from '@/lib/utils'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id, Doc } from '@/convex/_generated/dataModel'
import { toast } from 'sonner'
import {
  FantasyCalendarJSON,
  normalizeCalendarJSON,
  formatClockTime,
  formatDaylightDuration,
} from '@/lib/fantasy-calendar/types'
import {
  evaluateSingleDay,
  findUpcomingLunarAlignments,
} from '@/lib/fantasy-calendar/astronomy'

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

  const [selectedLocationIdx, setSelectedLocationIdx] = useState<number | null>(null)

  const calendarConfig = useMemo<FantasyCalendarJSON | null>(() => {
    if (!world?.calendar) return null
    try {
      const parsed = JSON.parse(world.calendar)
      return normalizeCalendarJSON(parsed)
    } catch (e) {
      return null
    }
  }, [world?.calendar])

  const currentDate = calendarConfig?.dynamic_data
  const canEditCalendar = Boolean(isAdmin || (world && session && world.owner === session.owner))

  const locations = calendarConfig?.static_data.seasons?.locations || []
  const effectiveLocationIdx = useMemo(() => {
    if (selectedLocationIdx !== null) return selectedLocationIdx
    if (calendarConfig?.dynamic_data.location !== undefined) {
      const parsed = Number(calendarConfig.dynamic_data.location)
      if (!Number.isNaN(parsed) && locations[parsed]) return parsed
    }
    return locations.length > 0 ? 0 : null
  }, [selectedLocationIdx, calendarConfig?.dynamic_data.location, locations])

  const dayEvaluation = useMemo(() => {
    if (!calendarConfig || !currentDate) return null
    return evaluateSingleDay(
      calendarConfig,
      currentDate.year,
      currentDate.month,
      currentDate.day,
      canEditCalendar,
      effectiveLocationIdx
    )
  }, [calendarConfig, currentDate, canEditCalendar, effectiveLocationIdx])

  const nextConjunction = useMemo(() => {
    if (!calendarConfig || !currentDate) return null
    const alignments = findUpcomingLunarAlignments(
      calendarConfig,
      currentDate.year,
      currentDate.month,
      currentDate.day,
      365,
      6
    )
    return (
      alignments.find(
        (a) => a.type === 'full_conjunction' || a.type === 'new_conjunction'
      ) ||
      alignments[0] ||
      null
    )
  }, [calendarConfig, currentDate])

  const saveDynamicDataToWorld = useCallback(
    async (nextDynamic: Partial<FantasyCalendarJSON['dynamic_data']>) => {
      if (!calendarConfig || !worldId) return
      try {
        const updatedConfig: FantasyCalendarJSON = {
          ...calendarConfig,
          dynamic_data: {
            ...calendarConfig.dynamic_data,
            ...nextDynamic,
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

  const advanceDays = useCallback(
    (delta: number) => {
      if (!calendarConfig || !currentDate) return
      let { year, month, day } = currentDate
      const months = calendarConfig.static_data.months

      day += delta
      while (day > (months[month]?.length || 30)) {
        day -= months[month]?.length || 30
        month++
        if (month >= calendarConfig.static_data.n_months) {
          month = 0
          year++
        }
      }
      while (day < 1) {
        month--
        if (month < 0) {
          month = calendarConfig.static_data.n_months - 1
          year--
        }
        day += months[month]?.length || 30
      }

      saveDynamicDataToWorld({ year, month, timespan: month, day })
    },
    [calendarConfig, currentDate, saveDynamicDataToWorld]
  )

  const advanceHours = useCallback(
    (deltaHours: number) => {
      if (!calendarConfig || !currentDate) return
      const hoursPerDay = calendarConfig.static_data.clock?.hours || 24
      let hour = (currentDate.hour ?? 9) + deltaHours
      let { year, month, day } = currentDate
      const months = calendarConfig.static_data.months

      while (hour >= hoursPerDay) {
        hour -= hoursPerDay
        day++
        if (day > (months[month]?.length || 30)) {
          day = 1
          month++
          if (month >= calendarConfig.static_data.n_months) {
            month = 0
            year++
          }
        }
      }
      while (hour < 0) {
        hour += hoursPerDay
        day--
        if (day < 1) {
          month--
          if (month < 0) {
            month = calendarConfig.static_data.n_months - 1
            year--
          }
          day = months[month]?.length || 30
        }
      }

      saveDynamicDataToWorld({ year, month, timespan: month, day, hour })
    },
    [calendarConfig, currentDate, saveDynamicDataToWorld]
  )

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

  if (!world?.calendar) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-card/60 border border-border/50 rounded-2xl text-center space-y-3">
        <CalendarDays className="h-10 w-10 text-muted-foreground/60" />
        <p className="text-base font-bold text-foreground">No Calendar Configured for this World</p>
        <p className="text-xs text-muted-foreground max-w-sm">
          This world does not have a fantasy calendar configuration yet. You can create or import one on the World page.
        </p>
      </div>
    )
  }

  const clockEnabled =
    calendarConfig?.static_data.clock?.enabled !== false &&
    !calendarConfig?.static_data.settings?.hide_clock
  const hoursPerDay = calendarConfig?.static_data.clock?.hours || 24
  const minutesPerHour = calendarConfig?.static_data.clock?.minutes || 60
  const season = dayEvaluation?.season
  const weather = dayEvaluation?.weather
  const moons = dayEvaluation?.moons || []
  const dayEvents = dayEvaluation?.events || []

  // Compute solar progress bar percentages
  const totalDayMins = hoursPerDay * minutesPerHour
  const sunriseMins = season
    ? season.sunrise.hour * minutesPerHour + season.sunrise.minute
    : 6 * minutesPerHour
  const sunsetMins = season
    ? season.sunset.hour * minutesPerHour + season.sunset.minute
    : 18 * minutesPerHour
  const currentMins =
    (currentDate?.hour ?? 9) * minutesPerHour + (currentDate?.minute ?? 0)
  const sunrisePct = Math.max(0, Math.min(100, (sunriseMins / totalDayMins) * 100))
  const sunsetPct = Math.max(0, Math.min(100, (sunsetMins / totalDayMins) * 100))
  const currentPct = Math.max(0, Math.min(100, (currentMins / totalDayMins) * 100))

  return (
    <div className="max-w-3xl mx-auto w-full flex flex-col gap-6 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-4">
        <div>
          <h2 className="text-lg font-black tracking-tight text-foreground flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-purple-400" />
            <span>{calendarConfig?.name || 'World Calendar'} — Tactical Almanac</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            Track in-game dates, hours, sunrise &amp; sunset, regional weather, moon phases, and holidays.
          </p>
        </div>

        {locations.length > 0 && (
          <div className="flex items-center gap-1.5 bg-card border border-border/60 rounded-lg px-2.5 h-8">
            <MapPin className="h-3.5 w-3.5 text-purple-400 shrink-0" />
            <select
              className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer"
              value={effectiveLocationIdx ?? 0}
              onChange={(e) => {
                const idx = parseInt(e.target.value, 10) || 0
                setSelectedLocationIdx(idx)
                if (canEditCalendar) {
                  saveDynamicDataToWorld({ location: String(idx), custom_location: true })
                }
              }}
            >
              {locations.map((loc, idx) => (
                <option key={idx} value={idx} className="bg-card text-foreground">
                  {loc.name}
                </option>
              ))}
            </select>
          </div>
        )}
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
              onClick={() => advanceDays(-1)}
              disabled={!canEditCalendar}
              title="Previous Day"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <div className="flex-grow text-center py-3.5 px-6 bg-muted/20 rounded-xl border border-border/60 shadow-inner">
              <div className="flex items-center justify-center gap-2 flex-wrap mb-1">
                {dayEvaluation?.weekdayName && (
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    {dayEvaluation.weekdayName}
                  </span>
                )}
                {season && (
                  <span
                    className="inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-bold"
                    style={{
                      borderColor: season.color,
                      color: season.color,
                      backgroundColor: `${season.color}15`,
                    }}
                  >
                    {season.season_name} (Day {season.season_day})
                  </span>
                )}
              </div>
              <div className="text-2xl font-black text-foreground">
                {currentDate.day}{' '}
                {calendarConfig.static_data.months[currentDate.month]?.name || 'Unknown Month'}
              </div>
              <div className="text-sm font-bold text-purple-400 mt-0.5">
                {formatInGameYear(
                  currentDate.year,
                  calendarConfig.static_data.eras,
                  calendarConfig.static_data.settings?.year_zero_exists,
                  { useAbbreviation: false, labelFirst: true }
                )}
              </div>
            </div>

            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 shrink-0 rounded-xl border-border/60 hover:border-purple-400"
              onClick={() => advanceDays(1)}
              disabled={!canEditCalendar}
              title="Next Day"
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Clock & Solar Cycle Bar */}
          {(clockEnabled || season) && (
            <div className="p-4 rounded-xl bg-background/60 border border-border/60 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {clockEnabled && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-400" />
                      <span className="text-base font-mono font-black text-foreground">
                        {formatClockTime({
                          hour: currentDate.hour ?? 9,
                          minute: currentDate.minute ?? 0,
                        })}
                      </span>
                      {dayEvaluation?.timeOfDay && (
                        <span
                          className={cn(
                            'inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-bold',
                            dayEvaluation.timeOfDay === 'Daylight'
                              ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                              : dayEvaluation.timeOfDay === 'Night'
                              ? 'border-indigo-500/40 bg-indigo-500/15 text-indigo-300'
                              : 'border-orange-500/40 bg-orange-500/15 text-orange-300'
                          )}
                        >
                          {dayEvaluation.timeOfDay === 'Daylight' && '☀️ Daylight'}
                          {dayEvaluation.timeOfDay === 'Dawn' && '🌅 Dawn'}
                          {dayEvaluation.timeOfDay === 'Dusk' && '🌇 Dusk'}
                          {dayEvaluation.timeOfDay === 'Night' && '🌙 Night'}
                        </span>
                      )}
                    </div>
                  )}

                  {season && (
                    <div className="flex items-center gap-3 text-xs border-l border-border/50 pl-3">
                      <span className="flex items-center gap-1 font-bold text-amber-300" title="Sunrise">
                        <Sunrise className="h-3.5 w-3.5" />
                        {formatClockTime(season.sunrise)}
                      </span>
                      <span className="flex items-center gap-1 font-bold text-orange-400" title="Sunset">
                        <Sunset className="h-3.5 w-3.5" />
                        {formatClockTime(season.sunset)}
                      </span>
                      <span className="text-[11px] text-muted-foreground hidden sm:inline">
                        ({formatDaylightDuration(season.sunrise, season.sunset, hoursPerDay, minutesPerHour)})
                      </span>
                    </div>
                  )}
                </div>

                {clockEnabled && canEditCalendar && (
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => advanceHours(-1)}
                    >
                      -1h
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => advanceHours(1)}
                    >
                      +1h
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => advanceHours(4)}
                    >
                      +4h
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => advanceHours(8)}
                    >
                      +8h Rest
                    </Button>
                  </div>
                )}
              </div>

              {/* Visual 24-Hour Daylight Track */}
              {season && (
                <div className="relative h-2.5 w-full rounded-full bg-indigo-950/80 border border-border/50 overflow-hidden">
                  {sunsetPct >= sunrisePct && (
                    <div
                      className="absolute top-0 bottom-0 bg-gradient-to-r from-amber-500/40 via-sky-400/50 to-orange-500/40"
                      style={{
                        left: `${sunrisePct}%`,
                        width: `${Math.max(2, sunsetPct - sunrisePct)}%`,
                      }}
                    />
                  )}
                  {clockEnabled && (
                    <div
                      className="absolute top-0 bottom-0 w-1 bg-amber-300 shadow-[0_0_6px_#fcd34d]"
                      style={{ left: `calc(${currentPct}% - 2px)` }}
                      title={`Current Time: ${formatClockTime({
                        hour: currentDate.hour ?? 9,
                        minute: currentDate.minute ?? 0,
                      })}`}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Weather & Moons Grid */}
          {(weather || moons.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {weather && !calendarConfig.static_data.settings?.hide_all_weather && (
                <div className="p-4 rounded-xl bg-background/60 border border-border/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                      <Thermometer className="h-3.5 w-3.5 text-cyan-400" />
                      Regional Weather
                    </span>
                    {weather.location_name && (
                      <span className="text-[10px] font-bold text-purple-300">
                        {weather.location_name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="text-base font-black text-foreground">
                      {weather.temp_actual}
                      {weather.temp_unit}{' '}
                      <span className="text-xs font-semibold text-muted-foreground">
                        ({weather.temp_low}
                        {weather.temp_unit}–{weather.temp_high}
                        {weather.temp_unit})
                      </span>
                    </div>
                    <span className="text-xs font-bold text-cyan-300">{weather.temp_description}</span>
                  </div>
                  <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>☁️ {weather.clouds}</span>
                    {weather.precipitation && (
                      <span className="text-cyan-300 font-semibold flex items-center gap-1">
                        <CloudRain className="h-3 w-3" /> {weather.precipitation}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Wind className="h-3 w-3" /> {weather.wind_speed} ({weather.wind_direction})
                    </span>
                  </div>
                  {weather.feature && (
                    <div className="text-[11px] text-amber-300/90 italic pt-1 border-t border-border/40">
                      ✨ {weather.feature}
                    </div>
                  )}
                </div>
              )}

              {moons.length > 0 && (
                <div className="p-4 rounded-xl bg-background/60 border border-border/60 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                      <Moon className="h-3.5 w-3.5 text-indigo-400" />
                      Lunar Cycle ({moons.length})
                    </span>
                    {nextConjunction && (
                      <span className="text-[10px] text-indigo-300 font-medium">
                        {nextConjunction.daysFromStart === 0
                          ? `★ ${nextConjunction.title} Today`
                          : `Next: ${nextConjunction.title} in ${nextConjunction.daysFromStart}d`}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {moons.map((m, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 bg-muted/30 px-2.5 py-1.5 rounded-lg border border-border/50"
                      >
                        <svg className="w-6 h-6 shrink-0" viewBox="0 0 32 32">
                          <circle cx="16" cy="16" r="10" fill={m.shadow_color || '#1e1b2e'} />
                          <path fill={m.color || '#ffffff'} d={m.path} />
                        </svg>
                        <div className="leading-tight">
                          <div className="text-xs font-bold text-foreground">{m.name}</div>
                          <div className="text-[10px] text-muted-foreground">{m.phaseName}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Active Calendar Events / Holidays Today */}
          {dayEvents.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border/50">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>Calendar Events &amp; Holidays Today ({dayEvents.length})</span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {dayEvents.map((ev, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-muted/25 border border-border/60 flex items-start justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: ev.color || '#7c3aed' }}
                        />
                        <span className="text-xs font-bold text-foreground">{ev.name}</span>
                        {ev.categoryName && (
                          <span className="inline-flex items-center rounded border border-border px-1.5 text-[9px] h-4">
                            {ev.categoryName}
                          </span>
                        )}
                        {ev.hidden && (
                          <span className="inline-flex items-center rounded border bg-rose-500/20 text-rose-300 border-rose-500/30 text-[9px] font-bold h-4 px-1.5 gap-1">
                            <Lock className="h-2.5 w-2.5" /> GM-Only
                          </span>
                        )}
                      </div>
                      {ev.description && (
                        <p className="text-xs text-muted-foreground pl-4">{ev.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Session Range Buttons */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50">
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
