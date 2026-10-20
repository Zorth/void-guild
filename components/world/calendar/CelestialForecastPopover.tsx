'use client'

import React, { useMemo, useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Moon, Sparkles, Calendar, Plus } from 'lucide-react'
import { FantasyCalendarJSON } from '@/lib/fantasy-calendar/types'
import { findUpcomingLunarAlignments, LunarAlignmentPrediction } from '@/lib/fantasy-calendar/astronomy'
import { cn } from '@/lib/utils'

interface CelestialForecastPopoverProps {
    calendar: FantasyCalendarJSON
    isOwner: boolean
    onJumpToDate: (year: number, month: number, day: number) => void
    onCreateEventAtDate?: (year: number, month: number, day: number, defaultTitle?: string) => void
}

export default function CelestialForecastPopover({
    calendar,
    isOwner,
    onJumpToDate,
    onCreateEventAtDate,
}: CelestialForecastPopoverProps) {
    const [open, setOpen] = useState(false)
    const [filter, setFilter] = useState<'all' | 'conjunctions'>('all')

    const visibleMoons = useMemo(
        () => (calendar.static_data.moons || []).filter((m) => !m.hidden),
        [calendar.static_data.moons]
    )

    const predictions = useMemo(() => {
        if (!open) return []
        const { year, month, day } = calendar.dynamic_data
        return findUpcomingLunarAlignments(calendar, year, month, day, 500, 18)
    }, [open, calendar])

    const filteredPredictions = useMemo(() => {
        if (filter === 'conjunctions') {
            return predictions.filter(
                (p) => p.type === 'full_conjunction' || p.type === 'new_conjunction'
            )
        }
        return predictions
    }, [predictions, filter])

    if (visibleMoons.length === 0 || calendar.static_data.settings?.hide_moons) {
        return null
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs bg-indigo-500/10 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20"
                >
                    <Moon className="h-3.5 w-3.5 text-indigo-400" />
                    Celestial Forecast
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-96 p-0 overflow-hidden border-border/80 shadow-xl">
                <div className="p-3.5 bg-indigo-950/30 border-b border-border/60 flex items-center justify-between gap-2">
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                            Lunar Alignments & Conjunctions
                        </h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                            Upcoming alignments from {calendar.dynamic_data.day}{' '}
                            {(calendar.static_data.year_data?.timespans || calendar.static_data.months || [])[
                                calendar.dynamic_data.month
                            ]?.name || ''}{' '}
                            {calendar.dynamic_data.year}
                        </p>
                    </div>
                    {visibleMoons.length >= 2 && (
                        <div className="flex items-center rounded-md border border-border/60 bg-background/60 p-0.5 text-[10px]">
                            <button
                                type="button"
                                onClick={() => setFilter('all')}
                                className={cn(
                                    'px-2 py-0.5 rounded font-semibold transition-colors',
                                    filter === 'all'
                                        ? 'bg-indigo-500/25 text-indigo-200'
                                        : 'text-muted-foreground hover:text-foreground'
                                )}
                            >
                                All
                            </button>
                            <button
                                type="button"
                                onClick={() => setFilter('conjunctions')}
                                className={cn(
                                    'px-2 py-0.5 rounded font-semibold transition-colors',
                                    filter === 'conjunctions'
                                        ? 'bg-indigo-500/25 text-indigo-200'
                                        : 'text-muted-foreground hover:text-foreground'
                                )}
                            >
                                Conjunctions
                            </button>
                        </div>
                    )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-border/40">
                    {filteredPredictions.length === 0 ? (
                        <div className="p-6 text-center text-xs text-muted-foreground">
                            No lunar conjunctions found within the next 500 days.
                        </div>
                    ) : (
                        filteredPredictions.map((pred: LunarAlignmentPrediction, i: number) => {
                            const isConjunction =
                                pred.type === 'full_conjunction' || pred.type === 'new_conjunction'
                            return (
                                <div
                                    key={`${pred.year}-${pred.month}-${pred.day}-${i}`}
                                    className={cn(
                                        'p-3 transition-colors hover:bg-muted/30 flex flex-col gap-2',
                                        isConjunction && 'bg-indigo-500/5'
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="text-xs font-bold text-foreground">
                                                    {pred.title}
                                                </span>
                                                {pred.daysFromStart === 0 ? (
                                                    <span className="inline-flex items-center rounded border bg-amber-500/20 text-amber-300 border-amber-500/40 text-[9px] font-bold h-4 px-1.5">
                                                        Today
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-mono text-indigo-300/90 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                                                        in {pred.daysFromStart}d
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[11px] text-muted-foreground mt-0.5">
                                                {pred.day} {pred.monthName}, Year {pred.year}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground/80 mt-0.5">
                                                {pred.subtitle}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0">
                                            {pred.moons.map((m, mIdx) => (
                                                <svg
                                                    key={mIdx}
                                                    className="w-5 h-5 drop-shadow-sm"
                                                    viewBox="0 0 32 32"
                                                >
                                                    <title>{`${m.name}: ${m.phaseName}`}</title>
                                                    <circle
                                                        cx="16"
                                                        cy="16"
                                                        r="10"
                                                        fill={m.shadow_color || '#1e1b2e'}
                                                    />
                                                    <path
                                                        fill={m.color || '#ffffff'}
                                                        d={m.path}
                                                    />
                                                    <circle
                                                        cx="16"
                                                        cy="16"
                                                        r="10"
                                                        fill="none"
                                                        stroke="#000000"
                                                        strokeWidth="1.5"
                                                        opacity="0.4"
                                                    />
                                                </svg>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-end gap-1.5 pt-0.5">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 px-2 text-[10px] gap-1 text-muted-foreground hover:text-foreground"
                                            onClick={() => {
                                                onJumpToDate(pred.year, pred.month, pred.day)
                                                setOpen(false)
                                            }}
                                        >
                                            <Calendar className="h-3 w-3" />
                                            Jump to Date
                                        </Button>
                                        {isOwner && onCreateEventAtDate && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-6 px-2 text-[10px] gap-1 border-purple-500/30 text-purple-300 hover:bg-purple-500/15"
                                                onClick={() => {
                                                    onCreateEventAtDate(
                                                        pred.year,
                                                        pred.month,
                                                        pred.day,
                                                        pred.title
                                                    )
                                                    setOpen(false)
                                                }}
                                            >
                                                <Plus className="h-3 w-3" />
                                                Create Event
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
}
