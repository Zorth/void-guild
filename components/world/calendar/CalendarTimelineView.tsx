'use client'

import React, { useMemo, useState } from 'react'
import {
    FantasyCalendarJSON,
    formatClockTime,
    formatDaylightDuration,
} from '@/lib/fantasy-calendar/types'
import {
    evaluateSingleDay,
    offsetCalendarDate,
    EvaluatedSingleDay,
} from '@/lib/fantasy-calendar/astronomy'
import { Button } from '@/components/ui/button'
import {
    Sun,
    Sunrise,
    Sunset,
    CloudRain,
    Wind,
    Thermometer,
    Calendar,
    Sparkles,
    EyeOff,
    Plus,
    ChevronUp,
    ChevronDown,
    Compass,
    Clock,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface CalendarTimelineViewProps {
    calendar: FantasyCalendarJSON
    sessions: any[]
    isOwner: boolean
    onJumpToGridDate: (year: number, month: number, day: number) => void
    onCreateEventAtDate?: (year: number, month: number, day: number) => void
    onEditEvent?: (eventId: number | string) => void
}

interface TimelineMilestoneDay {
    offsetDays: number
    dayData: EvaluatedSingleDay
    daySessions: any[]
    isSeasonStart: boolean
    solsticeOrEquinox: string | null
    conjunctionLabel: string | null
}

export default function CalendarTimelineView({
    calendar,
    sessions,
    isOwner,
    onJumpToGridDate,
    onCreateEventAtDate,
    onEditEvent,
}: CalendarTimelineViewProps) {
    const [pastRangeDays, setPastRangeDays] = useState(30)
    const [futureRangeDays, setFutureRangeDays] = useState(60)
    const [showSeasonsAndMoons, setShowSeasonsAndMoons] = useState(true)

    const curYear = calendar.dynamic_data.year
    const curMonth = calendar.dynamic_data.month
    const curDay = calendar.dynamic_data.day

    const getSessionsForDate = (year: number, monthIdx: number, day: number) => {
        if (!sessions) return []
        return sessions.filter((s) => {
            if (s.inGameDate) {
                const start = s.inGameDate
                const end = {
                    year: start.endYear ?? start.year,
                    month: start.endMonth ?? start.month,
                    day: start.endDay ?? start.day,
                }
                const curVal = year * 10000 + monthIdx * 100 + day
                const startVal = start.year * 10000 + start.month * 100 + start.day
                const endVal = end.year * 10000 + end.month * 100 + end.day
                return curVal >= startVal && curVal <= endVal
            }
            if (s.inGameStartDate) {
                const start = s.inGameStartDate
                const end = s.inGameEndDate || start
                const curVal = year * 10000 + (monthIdx + 1) * 100 + day
                const startVal = start.year * 10000 + start.month * 100 + start.day
                const endVal = end.year * 10000 + end.month * 100 + end.day
                return curVal >= startVal && curVal <= endVal
            }
            return false
        })
    }

    const { todayItem, pastMilestones, futureMilestones } = useMemo(() => {
        const buildMilestone = (offset: number): TimelineMilestoneDay | null => {
            const d = offsetCalendarDate(calendar, curYear, curMonth, curDay, offset)
            const evaluated = evaluateSingleDay(calendar, d.year, d.month, d.day, isOwner)
            const daySessions = getSessionsForDate(d.year, d.month, d.day)

            const isSeasonStart = evaluated.season?.season_day === 1
            let solsticeOrEquinox: string | null = null
            if (evaluated.season?.high_solstice) solsticeOrEquinox = 'Summer Solstice'
            else if (evaluated.season?.low_solstice) solsticeOrEquinox = 'Winter Solstice'
            else if (evaluated.season?.rising_equinox) solsticeOrEquinox = 'Vernal Equinox'
            else if (evaluated.season?.falling_equinox) solsticeOrEquinox = 'Autumnal Equinox'

            let conjunctionLabel: string | null = null
            if (evaluated.moons.length >= 2) {
                if (evaluated.moons.every((m) => m.isFullMoon)) {
                    conjunctionLabel = `Full Moon Conjunction (${evaluated.moons.map((m) => m.name).join(' & ')})`
                } else if (evaluated.moons.every((m) => m.isNewMoon)) {
                    conjunctionLabel = `Dark Sky Conjunction (${evaluated.moons.map((m) => m.name).join(' & ')})`
                }
            }

            if (offset === 0) {
                return {
                    offsetDays: 0,
                    dayData: evaluated,
                    daySessions,
                    isSeasonStart,
                    solsticeOrEquinox,
                    conjunctionLabel,
                }
            }

            const hasEvents = evaluated.events.length > 0
            const hasSessions = daySessions.length > 0
            const hasAstronomy =
                showSeasonsAndMoons &&
                (isSeasonStart || Boolean(solsticeOrEquinox) || Boolean(conjunctionLabel))

            if (!hasEvents && !hasSessions && !hasAstronomy) {
                return null
            }

            return {
                offsetDays: offset,
                dayData: evaluated,
                daySessions,
                isSeasonStart,
                solsticeOrEquinox,
                conjunctionLabel,
            }
        }

        const today = buildMilestone(0)!
        const past: TimelineMilestoneDay[] = []
        for (let off = -pastRangeDays; off < 0; off++) {
            const item = buildMilestone(off)
            if (item) past.push(item)
        }

        const future: TimelineMilestoneDay[] = []
        for (let off = 1; off <= futureRangeDays; off++) {
            const item = buildMilestone(off)
            if (item) future.push(item)
        }

        return { todayItem: today, pastMilestones: past, futureMilestones: future }
    }, [calendar, curYear, curMonth, curDay, pastRangeDays, futureRangeDays, isOwner, sessions, showSeasonsAndMoons])

    const renderMilestoneRow = (item: TimelineMilestoneDay) => {
        const { offsetDays, dayData, daySessions, isSeasonStart, solsticeOrEquinox, conjunctionLabel } = item
        const isPast = offsetDays < 0
        const relLabel =
            offsetDays < 0
                ? `${Math.abs(offsetDays)}d ago`
                : `in ${offsetDays}d`

        return (
            <div
                key={`${dayData.year}-${dayData.month}-${dayData.day}`}
                className={cn(
                    'relative pl-6 pb-4 group',
                    isPast ? 'opacity-85 hover:opacity-100 transition-opacity' : ''
                )}
            >
                {/* Timeline vertical line & node */}
                <div className="absolute left-[7px] top-2 bottom-0 w-px bg-border/60 group-last:bg-transparent" />
                <div
                    className={cn(
                        'absolute left-0 top-2.5 w-3.5 h-3.5 rounded-full border-2 bg-background',
                        daySessions.length > 0
                            ? 'border-blue-400'
                            : dayData.events.length > 0
                            ? 'border-purple-400'
                            : 'border-amber-400/70'
                    )}
                />

                <div className="rounded-lg border border-border/60 bg-card/40 hover:bg-card/70 transition-colors p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                type="button"
                                onClick={() => onJumpToGridDate(dayData.year, dayData.month, dayData.day)}
                                className="text-xs font-bold text-foreground hover:text-purple-300 transition-colors flex items-center gap-1"
                            >
                                <span>
                                    {dayData.weekdayName}, {dayData.day} {dayData.monthName} {dayData.year}
                                </span>
                            </button>
                            <span
                                className={cn(
                                    'text-[10px] font-mono px-1.5 py-0.5 rounded border',
                                    isPast
                                        ? 'bg-muted/50 text-muted-foreground border-border/50'
                                        : 'bg-purple-500/10 text-purple-300 border-purple-500/25'
                                )}
                            >
                                {relLabel}
                            </span>
                            {dayData.season && (
                                <span
                                    className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                                    style={{
                                        backgroundColor: `${dayData.season.color}20`,
                                        color: dayData.season.color,
                                    }}
                                >
                                    {dayData.season.season_name}
                                </span>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                            {isSeasonStart && dayData.season && (
                                <span
                                    className="inline-flex items-center rounded border px-1.5 py-0.5 font-semibold text-[10px] border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                                >
                                    🌱 First Day of {dayData.season.season_name}
                                </span>
                            )}
                            {solsticeOrEquinox && (
                                <span
                                    className="inline-flex items-center rounded border px-1.5 py-0.5 font-semibold text-[10px] border-amber-500/40 bg-amber-500/10 text-amber-300"
                                >
                                    ☀️ {solsticeOrEquinox}
                                </span>
                            )}
                            {conjunctionLabel && (
                                <span
                                    className="inline-flex items-center rounded border px-1.5 py-0.5 font-semibold text-[10px] border-indigo-500/40 bg-indigo-500/10 text-indigo-300"
                                >
                                    🌕 {conjunctionLabel}
                                </span>
                            )}
                            {dayData.events.map((ev, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => isOwner && onEditEvent && onEditEvent(ev.id)}
                                    className={cn(
                                        'inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border border-white/10 text-white shadow-xs',
                                        isOwner && onEditEvent && 'hover:brightness-110 cursor-pointer'
                                    )}
                                    style={{ backgroundColor: ev.color || '#7c3aed' }}
                                    title={ev.description ? `${ev.name}: ${ev.description}` : ev.name}
                                >
                                    {ev.hidden && <EyeOff className="h-3 w-3 opacity-80" />}
                                    <span>{ev.name}</span>
                                </button>
                            ))}
                            {daySessions.map((sess) => (
                                <Link
                                    key={sess._id}
                                    href={`/sessions/${sess._id}`}
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-600/80 hover:bg-blue-600 text-white transition-colors"
                                >
                                    ⚔️ {sess.quest?.name || sess.description || 'Session'}
                                </Link>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        {dayData.moons.length > 0 && (
                            <div className="flex items-center gap-1">
                                {dayData.moons.map((m, mIdx) => (
                                    <svg key={mIdx} className="w-4 h-4" viewBox="0 0 32 32">
                                        <title>{`${m.name}: ${m.phaseName}`}</title>
                                        <circle cx="16" cy="16" r="10" fill={m.shadow_color || '#1e1b2e'} />
                                        <path fill={m.color || '#ffffff'} d={m.path} />
                                    </svg>
                                ))}
                            </div>
                        )}
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                            onClick={() => onJumpToGridDate(dayData.year, dayData.month, dayData.day)}
                        >
                            View in Grid
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    const { dayData: todayData, daySessions: todaySessions } = todayItem
    const clockEnabled = calendar.static_data.clock?.enabled && !calendar.static_data.settings?.hide_clock
    const hoursPerDay = calendar.static_data.clock?.hours || 24
    const minutesPerHour = calendar.static_data.clock?.minutes || 60

    return (
        <div className="p-4 sm:p-6 space-y-5 max-w-4xl mx-auto">
            {/* Timeline Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border/50">
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded border px-2 py-0.5 font-semibold border-amber-500/40 bg-amber-500/10 text-amber-300 text-xs">
                        Chronological Focus
                    </span>
                    <span className="text-xs text-muted-foreground">
                        Centered on current world date ({todayData.day} {todayData.monthName} {todayData.year})
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setShowSeasonsAndMoons((v) => !v)}
                        className={cn(
                            'text-[11px] px-2.5 py-1 rounded-md border transition-colors font-medium',
                            showSeasonsAndMoons
                                ? 'bg-purple-500/15 border-purple-500/30 text-purple-300'
                                : 'bg-muted/30 border-border/60 text-muted-foreground'
                        )}
                    >
                        {showSeasonsAndMoons ? '✓ Showing Season & Lunar Peaks' : 'Events & Sessions Only'}
                    </button>
                </div>
            </div>

            {/* Past Milestones Section */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Recent Past ({pastRangeDays} Days)
                    </span>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[11px] gap-1 text-muted-foreground"
                        onClick={() => setPastRangeDays((d) => d + 60)}
                    >
                        <ChevronUp className="h-3 w-3" /> Load Earlier (+60d)
                    </Button>
                </div>

                {pastMilestones.length === 0 ? (
                    <div className="text-xs text-muted-foreground/70 italic pl-6 py-2">
                        No recorded sessions or holidays in the past {pastRangeDays} days.
                    </div>
                ) : (
                    <div>{pastMilestones.map(renderMilestoneRow)}</div>
                )}
            </div>

            {/* CURRENT IN-GAME DAY ("TODAY") FOCUS CARD */}
            <div className="relative rounded-xl border-2 border-amber-500/60 bg-gradient-to-br from-amber-500/10 via-card/90 to-purple-950/20 p-4 sm:p-5 shadow-lg space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center rounded px-2 py-0.5 bg-amber-500 text-black font-bold text-[10px] uppercase tracking-wider">
                                ★ Current In-Game Day (Today)
                            </span>
                            {clockEnabled && (
                                <span className="inline-flex items-center gap-1 text-xs font-mono font-bold px-2 py-0.5 rounded bg-background/80 border border-border/70 text-amber-300">
                                    <Clock className="h-3 w-3 text-amber-400" />
                                    {formatClockTime({
                                        hour: calendar.dynamic_data.hour ?? 0,
                                        minute: calendar.dynamic_data.minute ?? 0,
                                    })}{' '}
                                    ({todayData.timeOfDay})
                                </span>
                            )}
                            {todayData.season && (
                                <span
                                    className="inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold"
                                    style={{
                                        borderColor: todayData.season.color,
                                        color: todayData.season.color,
                                        backgroundColor: `${todayData.season.color}15`,
                                    }}
                                >
                                    {todayData.season.season_name} (Day {todayData.season.season_day})
                                </span>
                            )}
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-foreground mt-1.5">
                            {todayData.weekdayName}, {todayData.day} {todayData.monthName}, Year {todayData.year}
                        </h3>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => onJumpToGridDate(todayData.year, todayData.month, todayData.day)}
                        >
                            <Calendar className="h-3.5 w-3.5" />
                            View in Grid
                        </Button>
                        {isOwner && onCreateEventAtDate && (
                            <Button
                                type="button"
                                size="sm"
                                className="h-7 text-xs gap-1 bg-purple-600 hover:bg-purple-500 text-white"
                                onClick={() => onCreateEventAtDate(todayData.year, todayData.month, todayData.day)}
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Add Event Today
                            </Button>
                        )}
                    </div>
                </div>

                {/* Sunrise / Sunset / Weather / Moons Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    {todayData.season && (
                        <div className="p-3 rounded-lg bg-background/60 border border-border/60 flex items-center justify-between">
                            <div className="space-y-0.5">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                    <Sun className="h-3 w-3 text-amber-400" /> Solar Cycle
                                </div>
                                <div className="text-xs font-semibold text-foreground flex items-center gap-3 pt-0.5">
                                    <span className="flex items-center gap-1 text-amber-300">
                                        <Sunrise className="h-3.5 w-3.5" />
                                        {formatClockTime(todayData.season.sunrise)}
                                    </span>
                                    <span className="flex items-center gap-1 text-orange-400">
                                        <Sunset className="h-3.5 w-3.5" />
                                        {formatClockTime(todayData.season.sunset)}
                                    </span>
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                    {formatDaylightDuration(
                                        todayData.season.sunrise,
                                        todayData.season.sunset,
                                        hoursPerDay,
                                        minutesPerHour
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {todayData.weather && !calendar.static_data.settings?.hide_all_weather && (
                        <div className="p-3 rounded-lg bg-background/60 border border-border/60 space-y-0.5">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                                <span className="flex items-center gap-1">
                                    <Thermometer className="h-3 w-3 text-sky-400" /> Weather
                                </span>
                                {todayData.weather.location_name && (
                                    <span className="text-[10px] text-purple-300 flex items-center gap-0.5">
                                        <Compass className="h-2.5 w-2.5" />
                                        {todayData.weather.location_name}
                                    </span>
                                )}
                            </div>
                            <div className="text-xs font-bold text-foreground">
                                {todayData.weather.temp_actual}
                                {todayData.weather.temp_unit} — {todayData.weather.temp_description}
                            </div>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-2 flex-wrap">
                                <span>{todayData.weather.clouds}</span>
                                {todayData.weather.precipitation && (
                                    <span className="text-sky-300 flex items-center gap-0.5">
                                        <CloudRain className="h-3 w-3" /> {todayData.weather.precipitation}
                                    </span>
                                )}
                                <span className="flex items-center gap-0.5">
                                    <Wind className="h-3 w-3" /> {todayData.weather.wind_speed}
                                </span>
                            </div>
                        </div>
                    )}

                    {todayData.moons.length > 0 && (
                        <div className="p-3 rounded-lg bg-background/60 border border-border/60 space-y-1">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                <Sparkles className="h-3 w-3 text-indigo-400" /> Lunar Phases
                            </div>
                            <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
                                {todayData.moons.map((m, idx) => (
                                    <div key={idx} className="flex items-center gap-1.5">
                                        <svg className="w-5 h-5 shrink-0" viewBox="0 0 32 32">
                                            <circle cx="16" cy="16" r="10" fill={m.shadow_color || '#1e1b2e'} />
                                            <path fill={m.color || '#ffffff'} d={m.path} />
                                        </svg>
                                        <div className="leading-tight">
                                            <div className="text-[11px] font-bold text-foreground">{m.name}</div>
                                            <div className="text-[9px] text-muted-foreground">{m.phaseName}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Today's Events & Sessions */}
                {(todayData.events.length > 0 || todaySessions.length > 0) && (
                    <div className="pt-2 border-t border-border/50 flex flex-wrap items-center gap-2">
                        {todayData.events.map((ev, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => isOwner && onEditEvent && onEditEvent(ev.id)}
                                className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-md text-white shadow-xs"
                                style={{ backgroundColor: ev.color || '#7c3aed' }}
                            >
                                {ev.hidden && <EyeOff className="h-3.5 w-3.5" />}
                                <span>{ev.name}</span>
                            </button>
                        ))}
                        {todaySessions.map((sess) => (
                            <Link
                                key={sess._id}
                                href={`/sessions/${sess._id}`}
                                className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white"
                            >
                                ⚔️ {sess.quest?.name || sess.description || 'Session Today'}
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Upcoming Milestones Section */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Upcoming Horizon (Next {futureRangeDays} Days)
                    </span>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[11px] gap-1 text-muted-foreground"
                        onClick={() => setFutureRangeDays((d) => d + 60)}
                    >
                        <ChevronDown className="h-3 w-3" /> Load Further (+60d)
                    </Button>
                </div>

                {futureMilestones.length === 0 ? (
                    <div className="text-xs text-muted-foreground/70 italic pl-6 py-2">
                        No upcoming events, sessions, or conjunctions in the next {futureRangeDays} days.
                    </div>
                ) : (
                    <div>{futureMilestones.map(renderMilestoneRow)}</div>
                )}
            </div>
        </div>
    )
}
