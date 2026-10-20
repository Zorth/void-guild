'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Trash2, Clock, History, Calendar as CalendarIcon, ArrowUp, ArrowDown } from 'lucide-react'
import { FantasyCalendarJSON, FantasyEra } from '@/lib/fantasy-calendar/types'
import { formatInGameYear } from '@/lib/utils'

interface GeneralErasTabProps {
    draft: FantasyCalendarJSON
    onChange: (updated: FantasyCalendarJSON) => void
}

export default function GeneralErasTab({ draft, onChange }: GeneralErasTabProps) {
    const months = draft.static_data.months || []
    const weekdays = draft.static_data.weekdays || []
    const eras = draft.static_data.eras || []
    const clock = draft.static_data.clock || {
        enabled: true,
        render: true,
        hours: 24,
        minutes: 60,
        offset: 0,
    }

    const updateDynamic = (patch: Partial<FantasyCalendarJSON['dynamic_data']>) => {
        const nextMonth = patch.month !== undefined ? patch.month : draft.dynamic_data.month
        onChange({
            ...draft,
            dynamic_data: {
                ...draft.dynamic_data,
                ...patch,
                month: nextMonth,
                timespan: nextMonth,
            },
        })
    }

    const updateStaticSettings = (patch: Partial<FantasyCalendarJSON['static_data']['settings']>) => {
        onChange({
            ...draft,
            static_data: {
                ...draft.static_data,
                settings: {
                    ...draft.static_data.settings,
                    ...patch,
                },
            },
        })
    }

    const updateYearData = (patch: Partial<NonNullable<FantasyCalendarJSON['static_data']['year_data']>>) => {
        onChange({
            ...draft,
            static_data: {
                ...draft.static_data,
                year_data: {
                    ...(draft.static_data.year_data || {}),
                    ...patch,
                },
            },
        })
    }

    const updateClock = (patch: Partial<typeof clock>) => {
        onChange({
            ...draft,
            static_data: {
                ...draft.static_data,
                clock: {
                    ...clock,
                    ...patch,
                },
            },
        })
    }

    const addEra = () => {
        const newEra: FantasyEra = {
            name: `Era ${eras.length + 1}`,
            abbreviation: '',
            formatting: 'Year {{year}} - {{era_name}}',
            description: '',
            date: {
                year: draft.dynamic_data.year || 1,
                timespan: 0,
                day: 1,
                epoch: 0,
            },
            settings: {
                restart: true,
                ends_year: false,
                starting_era: eras.length === 0,
            },
        }
        onChange({
            ...draft,
            static_data: {
                ...draft.static_data,
                eras: [...eras, newEra],
            },
        })
    }

    const updateEra = (idx: number, patch: Partial<FantasyEra>) => {
        const next = eras.map((e, i) => (i === idx ? { ...e, ...patch } : e))
        onChange({
            ...draft,
            static_data: {
                ...draft.static_data,
                eras: next,
            },
        })
    }

    const removeEra = (idx: number) => {
        const next = eras.filter((_, i) => i !== idx)
        onChange({
            ...draft,
            static_data: {
                ...draft.static_data,
                eras: next,
            },
        })
    }

    const moveEra = (idx: number, dir: -1 | 1) => {
        const target = idx + dir
        if (target < 0 || target >= eras.length) return
        const next = [...eras]
        const [item] = next.splice(idx, 1)
        next.splice(target, 0, item)
        onChange({
            ...draft,
            static_data: {
                ...draft.static_data,
                eras: next,
            },
        })
    }

    const previewYearLabel = formatInGameYear(
        draft.dynamic_data.year,
        eras,
        draft.static_data.settings?.year_zero_exists,
        { useAbbreviation: false, labelFirst: true }
    )

    return (
        <div className="flex flex-col gap-4">
            {/* Identity & Global Rules */}
            <div className="p-4 rounded-lg bg-muted/20 border border-border/50 space-y-4">
                <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-purple-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider">Calendar Identity &amp; Rules</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">Calendar Name</label>
                        <Input
                            value={draft.name}
                            onChange={(e) => onChange({ ...draft, name: e.target.value })}
                            placeholder="e.g. Sythian Reckoning"
                            className="h-8 text-xs"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">
                            First Weekday of Year 1
                        </label>
                        <select
                            className="w-full h-8 rounded-md border border-border bg-card px-2 text-xs"
                            value={draft.static_data.year_data?.first_day ?? 1}
                            onChange={(e) => updateYearData({ first_day: parseInt(e.target.value) || 1 })}
                        >
                            {weekdays.map((wd, idx) => (
                                <option key={idx} value={idx + 1}>
                                    {idx + 1}. {wd}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex flex-wrap gap-6 pt-1">
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="overflow-weeks"
                            checked={draft.static_data.year_data?.overflow ?? true}
                            onCheckedChange={(checked) => updateYearData({ overflow: Boolean(checked) })}
                        />
                        <label htmlFor="overflow-weeks" className="text-xs cursor-pointer">
                            Weeks flow continuously across month boundaries (<code className="text-[10px] text-purple-300">overflow</code>)
                        </label>
                    </div>

                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="year-zero-exists"
                            checked={Boolean(draft.static_data.settings?.year_zero_exists)}
                            onCheckedChange={(checked) => updateStaticSettings({ year_zero_exists: Boolean(checked) })}
                        />
                        <label htmlFor="year-zero-exists" className="text-xs cursor-pointer">
                            Year 0 Exists
                        </label>
                    </div>
                </div>
            </div>

            {/* Current In-Game Date & Clock */}
            <div className="p-4 rounded-lg bg-muted/20 border border-border/50 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-purple-400" />
                        <h4 className="text-xs font-bold uppercase tracking-wider">Current World Date (&ldquo;Today&rdquo;) &amp; Clock</h4>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                        {draft.dynamic_data.day} {months[draft.dynamic_data.month]?.name || 'Month'}, {previewYearLabel}
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">Current Day</label>
                        <Input
                            type="number"
                            min={1}
                            max={months[draft.dynamic_data.month]?.length || 31}
                            value={draft.dynamic_data.day}
                            onChange={(e) =>
                                updateDynamic({
                                    day: Math.min(
                                        Math.max(1, parseInt(e.target.value) || 1),
                                        months[draft.dynamic_data.month]?.length || 31
                                    ),
                                })
                            }
                            className="h-8 text-xs"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">Current Month</label>
                        <select
                            className="w-full h-8 rounded-md border border-border bg-card px-2 text-xs"
                            value={draft.dynamic_data.month}
                            onChange={(e) => {
                                const newM = parseInt(e.target.value) || 0
                                const maxD = months[newM]?.length || 30
                                updateDynamic({
                                    month: newM,
                                    day: Math.min(draft.dynamic_data.day, maxD),
                                })
                            }}
                        >
                            {months.map((m, idx) => (
                                <option key={idx} value={idx}>
                                    {idx + 1}. {m.name} ({m.length}d)
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">
                            Current Absolute Year
                        </label>
                        <Input
                            type="number"
                            value={draft.dynamic_data.year}
                            onChange={(e) => updateDynamic({ year: parseInt(e.target.value) || 1 })}
                            className="h-8 text-xs"
                        />
                    </div>
                </div>

                {/* Clock settings */}
                <div className="pt-2 border-t border-border/40 grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
                    <div className="flex items-center gap-2 h-8">
                        <Checkbox
                            id="enable-clock"
                            checked={clock.enabled}
                            onCheckedChange={(checked) => updateClock({ enabled: Boolean(checked), render: Boolean(checked) })}
                        />
                        <label htmlFor="enable-clock" className="text-xs font-bold cursor-pointer">
                            Enable Clock
                        </label>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">Current Hour</label>
                        <Input
                            type="number"
                            min={0}
                            max={(clock.hours || 24) - 1}
                            disabled={!clock.enabled}
                            value={draft.dynamic_data.hour ?? 9}
                            onChange={(e) => updateDynamic({ hour: Math.max(0, parseInt(e.target.value) || 0) })}
                            className="h-8 text-xs"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">Current Minute</label>
                        <Input
                            type="number"
                            min={0}
                            max={(clock.minutes || 60) - 1}
                            disabled={!clock.enabled}
                            value={draft.dynamic_data.minute ?? 0}
                            onChange={(e) => updateDynamic({ minute: Math.max(0, parseInt(e.target.value) || 0) })}
                            className="h-8 text-xs"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">Hours / Day</label>
                        <Input
                            type="number"
                            min={1}
                            max={100}
                            disabled={!clock.enabled}
                            value={clock.hours}
                            onChange={(e) => updateClock({ hours: Math.max(1, parseInt(e.target.value) || 24) })}
                            className="h-8 text-xs"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">Mins / Hour</label>
                        <Input
                            type="number"
                            min={1}
                            max={100}
                            disabled={!clock.enabled}
                            value={clock.minutes}
                            onChange={(e) => updateClock({ minutes: Math.max(1, parseInt(e.target.value) || 60) })}
                            className="h-8 text-xs"
                        />
                    </div>
                </div>
            </div>

            {/* Historical Eras Manager */}
            <div className="p-4 rounded-lg bg-muted/20 border border-border/50 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <History className="h-4 w-4 text-purple-400" />
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider">Historical Eras</h4>
                            <p className="text-[10px] text-muted-foreground">
                                Define ages &amp; eras (like Sythian&apos;s Era of Unity &rarr; Era of souls) that format year numbers.
                            </p>
                        </div>
                    </div>
                    <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={addEra}>
                        <Plus className="h-3.5 w-3.5" /> Add Era
                    </Button>
                </div>

                {eras.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-3 text-center">
                        No eras configured. Years will be displayed as plain numbers (e.g. {draft.dynamic_data.year}).
                    </p>
                ) : (
                    <div className="flex flex-col gap-2.5">
                        {eras.map((era, idx) => {
                            const startYear = typeof era.date === 'object' ? era.date.year : Number(era.date) || 1
                            const restartYear = era.settings?.restart !== false
                            return (
                                <div
                                    key={idx}
                                    className="p-3 rounded-md bg-card/70 border border-border/50 flex flex-col gap-2.5"
                                >
                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                                        <div className="sm:col-span-5 space-y-1">
                                            <label className="text-[10px] font-bold uppercase text-muted-foreground">
                                                Era Name
                                            </label>
                                            <Input
                                                value={era.name}
                                                onChange={(e) => updateEra(idx, { name: e.target.value })}
                                                placeholder="e.g. Era of Souls"
                                                className="h-8 text-xs"
                                            />
                                        </div>
                                        <div className="sm:col-span-2 space-y-1">
                                            <label className="text-[10px] font-bold uppercase text-muted-foreground">
                                                Abbrev.
                                            </label>
                                            <Input
                                                value={era.abbreviation || ''}
                                                onChange={(e) => updateEra(idx, { abbreviation: e.target.value })}
                                                placeholder="Auto"
                                                className="h-8 text-xs"
                                            />
                                        </div>
                                        <div className="sm:col-span-3 space-y-1">
                                            <label className="text-[10px] font-bold uppercase text-muted-foreground">
                                                Starts at Abs. Year
                                            </label>
                                            <Input
                                                type="number"
                                                value={startYear}
                                                onChange={(e) =>
                                                    updateEra(idx, {
                                                        date: {
                                                            ...(typeof era.date === 'object'
                                                                ? era.date
                                                                : { timespan: 0, day: 1 }),
                                                            year: parseInt(e.target.value) || 1,
                                                        },
                                                    })
                                                }
                                                className="h-8 text-xs"
                                            />
                                        </div>
                                        <div className="sm:col-span-2 flex items-center justify-end gap-1">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                disabled={idx === 0}
                                                onClick={() => moveEra(idx, -1)}
                                            >
                                                <ArrowUp className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                disabled={idx === eras.length - 1}
                                                onClick={() => moveEra(idx, 1)}
                                            >
                                                <ArrowDown className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive hover:text-destructive"
                                                onClick={() => removeEra(idx)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-1 border-t border-border/30">
                                        <div className="flex items-center gap-2">
                                            <Checkbox
                                                id={`era-restart-${idx}`}
                                                checked={restartYear}
                                                onCheckedChange={(checked) =>
                                                    updateEra(idx, {
                                                        settings: {
                                                            ...(era.settings || {}),
                                                            restart: Boolean(checked),
                                                        },
                                                    })
                                                }
                                            />
                                            <label htmlFor={`era-restart-${idx}`} className="text-[11px] text-muted-foreground cursor-pointer">
                                                Restart year count from 1 when this era begins (e.g. Abs Year 10709 &rarr; Era Year 1)
                                            </label>
                                        </div>
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
