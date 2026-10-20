'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
    Clock,
    Plus,
    Pencil,
    Trash2,
    Lock,
    Sunrise,
    Sunset,
    CloudRain,
    Wind,
    Book,
    ExternalLink,
} from 'lucide-react'
import { cn, getSessionWikiUrl } from '@/lib/utils'
import { Id } from '@/convex/_generated/dataModel'
import {
    FantasyCalendarJSON,
    FantasyEvent,
    EvaluatedSeasonData,
    EvaluatedWeatherData,
    getMoonPhaseName,
    formatClockTime,
    formatDaylightDuration,
} from '@/lib/fantasy-calendar/types'
import {
    MOON_SVG_PATHS,
    getEventColorStyles,
} from '@/lib/fantasy-calendar/presets'

export interface CalendarSessionItem {
    _id: Id<'sessions'>
    date?: number
    characterNames?: string[]
    quest?: { name: string } | null
    inGameDate?: {
        year: number
        month: number
        day: number
        endYear?: number
        endMonth?: number
        endDay?: number
    }
}

interface CalendarDayPopoverProps {
    day: number
    monthName: string
    viewYear: number
    viewMonth: number
    weekdayName?: string
    calendar: FantasyCalendarJSON
    dayEpochData: any
    dayLanes: { session: CalendarSessionItem; lane: number }[]
    isOwner: boolean
    worldName: string
    onSetToday: (year: number, month: number, day: number) => void
    onAddEventForDay: (year: number, month: number, day: number) => void
    onEditEvent: (event: FantasyEvent) => void
    onDeleteEvent: (eventId: number | string) => void
    onRecordWikiVisit: () => void
}

export default function CalendarDayPopover({
    day,
    monthName,
    viewYear,
    viewMonth,
    weekdayName,
    calendar,
    dayEpochData,
    dayLanes,
    isOwner,
    worldName,
    onSetToday,
    onAddEventForDay,
    onEditEvent,
    onDeleteEvent,
    onRecordWikiVisit,
}: CalendarDayPopoverProps) {
    const season: EvaluatedSeasonData | undefined = dayEpochData?.season
    const weather: EvaluatedWeatherData | undefined = dayEpochData?.weather
    const events: any[] = dayEpochData?.events || []
    const visibleMoons = (calendar.static_data.moons || []).filter((m) => !m.hidden)
    const hoursPerDay = calendar.static_data.clock?.hours || 24
    const minutesPerHour = calendar.static_data.clock?.minutes || 60

    return (
        <div className="w-80 p-0 overflow-hidden">
            {/* Header */}
            <div className="bg-muted/50 px-3.5 py-2.5 border-b border-border/50 flex justify-between items-start gap-2">
                <div className="min-w-0">
                    <div className="text-xs font-bold uppercase tracking-wider truncate">
                        {day} {monthName}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        {weekdayName && <span>{weekdayName}</span>}
                        {season && (
                            <>
                                <span>&bull;</span>
                                <span className="inline-flex items-center gap-1 font-bold text-foreground/90">
                                    <span
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: season.color || '#a855f7' }}
                                    />
                                    {season.season_name} (Day {season.season_day})
                                </span>
                            </>
                        )}
                    </div>
                </div>
                {isOwner && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-[9px] font-black uppercase tracking-tighter gap-1 hover:bg-primary/10 hover:text-primary transition-colors shrink-0"
                        onClick={() => onSetToday(viewYear, viewMonth, day)}
                    >
                        <Clock className="h-3 w-3" />
                        Set Today
                    </Button>
                )}
            </div>

            <div className="p-3 space-y-3 max-h-80 overflow-y-auto">
                {/* Sunrise / Sunset & Weather Strip */}
                {(season || weather) && (
                    <div className="p-2.5 rounded-lg bg-muted/30 border border-border/40 space-y-2">
                        {season && (
                            <div className="flex items-center justify-between text-[11px]">
                                <span className="inline-flex items-center gap-1 text-amber-300 font-bold">
                                    <Sunrise className="h-3.5 w-3.5" />
                                    {formatClockTime(season.sunrise)}
                                </span>
                                <span className="text-[10px] font-medium text-muted-foreground">
                                    {formatDaylightDuration(
                                        season.sunrise,
                                        season.sunset,
                                        hoursPerDay,
                                        minutesPerHour
                                    )}
                                </span>
                                <span className="inline-flex items-center gap-1 text-orange-300 font-bold">
                                    <Sunset className="h-3.5 w-3.5" />
                                    {formatClockTime(season.sunset)}
                                </span>
                            </div>
                        )}

                        {weather && (
                            <div className="pt-1.5 border-t border-border/30 space-y-1 text-[10px]">
                                <div className="flex items-center justify-between font-bold">
                                    <span className="text-foreground flex items-center gap-1">
                                        <CloudRain className="h-3 w-3 text-cyan-400" />
                                        {weather.location_name ? `${weather.location_name}: ` : ''}
                                        {weather.temp_low}
                                        {weather.temp_unit} to {weather.temp_high}
                                        {weather.temp_unit}
                                    </span>
                                    <span className="text-purple-300">{weather.temp_description}</span>
                                </div>
                                <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                    <span>{weather.clouds}</span>
                                    {weather.precipitation && (
                                        <span className="text-cyan-300 font-semibold">
                                            &bull; {weather.precipitation}
                                        </span>
                                    )}
                                    {weather.feature && (
                                        <span className="text-amber-300 font-bold">
                                            &bull; {weather.feature}
                                        </span>
                                    )}
                                </div>
                                <div className="text-muted-foreground/80 flex items-center gap-1">
                                    <Wind className="h-2.5 w-2.5" />
                                    <span>
                                        {weather.wind_speed} ({weather.wind_direction}, {weather.wind_mph} mph)
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Moons Section */}
                {visibleMoons.length > 0 && (
                    <div className="space-y-1">
                        <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground ml-0.5">
                            Lunar Phases
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {visibleMoons.map((moon, mi) => {
                                const phase = dayEpochData?.moon_phase?.[mi] ?? 0
                                const gran = Number(moon.granularity) || 16
                                const phaseName = getMoonPhaseName(phase, gran)
                                const pathD =
                                    MOON_SVG_PATHS[Math.floor((phase / gran) * MOON_SVG_PATHS.length)]
                                return (
                                    <div
                                        key={mi}
                                        className="flex items-center gap-1.5 px-2 py-1 bg-muted/40 rounded-md border border-border/50"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 32 32" className="shrink-0">
                                            <circle
                                                cx="16"
                                                cy="16"
                                                r="9.5"
                                                fill={moon.shadow_color || '#29344a'}
                                            />
                                            <path d={pathD} fill={moon.color || '#d5f4f1'} />
                                        </svg>
                                        <div className="flex flex-col leading-tight">
                                            <span className="text-[10px] font-bold text-foreground">
                                                {moon.name}
                                            </span>
                                            <span className="text-[9px] text-muted-foreground">
                                                {phaseName}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Events Section */}
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <p className="text-[9px] font-black uppercase tracking-wider text-amber-400 ml-0.5">
                            Events ({events.length})
                        </p>
                        {isOwner && (
                            <button
                                type="button"
                                onClick={() => onAddEventForDay(viewYear, viewMonth, day)}
                                className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 hover:bg-purple-500/25 transition-colors"
                            >
                                <Plus className="h-2.5 w-2.5" /> Add Event
                            </button>
                        )}
                    </div>

                    {events.length > 0 ? (
                        <div className="space-y-1.5">
                            {events.map((event: any, ei: number) => {
                                const colorStyle = getEventColorStyles(
                                    event.settings?.color || event.category?.event_settings?.color
                                )
                                const isHidden = Boolean(event.settings?.hide)
                                return (
                                    <div
                                        key={ei}
                                        className={cn(
                                            'px-2.5 py-1.5 rounded border text-[10px] font-medium flex flex-col gap-1',
                                            colorStyle.badgeClass
                                        )}
                                    >
                                        <div className="flex items-center justify-between gap-1">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                {isHidden && (
                                                    <span title="GM-Only (Hidden from Players)">
                                                        <Lock className="h-2.5 w-2.5 text-rose-400 shrink-0" />
                                                    </span>
                                                )}
                                                <span className="font-bold truncate">{event.name}</span>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                {event.category && (
                                                    <span className="text-[8px] opacity-75 px-1 rounded-sm bg-black/20 uppercase">
                                                        {event.category.name}
                                                    </span>
                                                )}
                                                {isOwner && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => onEditEvent(event)}
                                                            className="opacity-70 hover:opacity-100 p-0.5"
                                                            title="Edit Event"
                                                        >
                                                            <Pencil className="h-2.5 w-2.5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => onDeleteEvent(event.id)}
                                                            className="opacity-70 hover:opacity-100 p-0.5 text-rose-300"
                                                            title="Delete Event"
                                                        >
                                                            <Trash2 className="h-2.5 w-2.5" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        {event.description && (
                                            <div
                                                className="text-[9px] text-foreground/80 italic leading-snug"
                                                dangerouslySetInnerHTML={{ __html: event.description }}
                                            />
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        dayLanes.length === 0 && (
                            <p className="text-[10px] text-muted-foreground italic text-center py-1.5">
                                No events or sessions on this day
                            </p>
                        )
                    )}
                </div>

                {/* Sessions Section */}
                {dayLanes.length > 0 && (
                    <div className="space-y-1">
                        <p className="text-[9px] font-black uppercase text-purple-400 ml-0.5">
                            Sessions ({dayLanes.length})
                        </p>
                        {dayLanes.map((sl) => {
                            const s = sl.session
                            return (
                                <div
                                    key={s._id}
                                    className="group/sess flex flex-col bg-purple-500/10 rounded border border-purple-500/20 hover:bg-purple-500/20 transition-colors overflow-hidden"
                                >
                                    <Link
                                        href={`/sessions/${s._id}`}
                                        className="flex items-center justify-between p-2 pb-1"
                                    >
                                        <div className="flex flex-col gap-0.5 min-w-0">
                                            <span className="text-xs font-bold truncate leading-none text-purple-300">
                                                {s.characterNames && s.characterNames.length > 0
                                                    ? s.characterNames.join(', ')
                                                    : 'No Attendees'}
                                            </span>
                                            <span className="text-[8px] uppercase tracking-widest font-black opacity-60">
                                                {s.quest?.name || 'Session'}
                                            </span>
                                        </div>
                                        <ExternalLink className="h-3 w-3 text-purple-400/50 group-hover/sess:text-purple-400 transition-colors shrink-0" />
                                    </Link>
                                    <div className="px-2 pb-2 flex justify-end">
                                        <a
                                            href={getSessionWikiUrl(s.date, worldName)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-[9px] font-black uppercase tracking-tighter text-muted-foreground hover:text-purple-400 transition-colors py-1 px-2 bg-background/50 rounded-full border border-border/50"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onRecordWikiVisit()
                                            }}
                                        >
                                            <Book size={10} />
                                            Wiki Report
                                        </a>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
