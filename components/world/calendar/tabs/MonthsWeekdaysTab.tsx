'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, ArrowUp, ArrowDown, CalendarDays, Sparkles } from 'lucide-react'
import { FantasyCalendarJSON, FantasyMonth, FantasyLeapDay } from '@/lib/fantasy-calendar/types'

interface MonthsWeekdaysTabProps {
    draft: FantasyCalendarJSON
    onChange: (updated: FantasyCalendarJSON) => void
}

export default function MonthsWeekdaysTab({ draft, onChange }: MonthsWeekdaysTabProps) {
    const weekdays = draft.static_data.weekdays || []
    const months = draft.static_data.months || []
    const leapDays = draft.static_data.year_data?.leap_days || []

    const syncMonths = (nextMonths: FantasyMonth[]) => {
        const yearLen = nextMonths.reduce((acc, m) => acc + (Number(m.length) || 0), 0)
        const clampedMonth = Math.min(draft.dynamic_data.month, Math.max(0, nextMonths.length - 1))
        onChange({
            ...draft,
            dynamic_data: {
                ...draft.dynamic_data,
                month: clampedMonth,
                timespan: clampedMonth,
                day: Math.min(draft.dynamic_data.day, nextMonths[clampedMonth]?.length || 30),
            },
            static_data: {
                ...draft.static_data,
                months: nextMonths,
                n_months: nextMonths.length,
                year_len: yearLen,
                year_data: {
                    ...(draft.static_data.year_data || {}),
                    timespans: nextMonths,
                },
            },
        })
    }

    const syncWeekdays = (nextWeekdays: string[]) => {
        onChange({
            ...draft,
            static_data: {
                ...draft.static_data,
                weekdays: nextWeekdays,
                year_data: {
                    ...(draft.static_data.year_data || {}),
                    global_week: nextWeekdays,
                },
            },
        })
    }

    const syncLeapDays = (nextLeapDays: FantasyLeapDay[]) => {
        onChange({
            ...draft,
            static_data: {
                ...draft.static_data,
                year_data: {
                    ...(draft.static_data.year_data || {}),
                    leap_days: nextLeapDays,
                },
            },
        })
    }

    const addWeekday = () => {
        syncWeekdays([...weekdays, `Day ${weekdays.length + 1}`])
    }

    const updateWeekday = (idx: number, val: string) => {
        syncWeekdays(weekdays.map((w, i) => (i === idx ? val : w)))
    }

    const moveWeekday = (idx: number, dir: -1 | 1) => {
        const target = idx + dir
        if (target < 0 || target >= weekdays.length) return
        const next = [...weekdays]
        const [item] = next.splice(idx, 1)
        next.splice(target, 0, item)
        syncWeekdays(next)
    }

    const removeWeekday = (idx: number) => {
        if (weekdays.length <= 1) return
        syncWeekdays(weekdays.filter((_, i) => i !== idx))
    }

    const addMonth = (type: 'month' | 'intercalary' = 'month') => {
        const newMonth: FantasyMonth = {
            name: type === 'intercalary' ? `Festival ${months.length + 1}` : `Month ${months.length + 1}`,
            length: type === 'intercalary' ? 1 : 30,
            type,
            interval: 1,
            offset: 0,
        }
        syncMonths([...months, newMonth])
    }

    const updateMonth = (idx: number, patch: Partial<FantasyMonth>) => {
        const next = months.map((m, i) => (i === idx ? { ...m, ...patch } : m))
        syncMonths(next)
    }

    const moveMonth = (idx: number, dir: -1 | 1) => {
        const target = idx + dir
        if (target < 0 || target >= months.length) return
        const next = [...months]
        const [item] = next.splice(idx, 1)
        next.splice(target, 0, item)
        syncMonths(next)
    }

    const removeMonth = (idx: number) => {
        if (months.length <= 1) return
        syncMonths(months.filter((_, i) => i !== idx))
    }

    const addLeapDay = () => {
        syncLeapDays([
            ...leapDays,
            {
                name: `Leap Day ${leapDays.length + 1}`,
                intercalary: false,
                timespan: 0,
                interval: '4',
                offset: 0,
            },
        ])
    }

    const updateLeapDay = (idx: number, patch: Partial<FantasyLeapDay>) => {
        syncLeapDays(leapDays.map((ld, i) => (i === idx ? { ...ld, ...patch } : ld)))
    }

    const removeLeapDay = (idx: number) => {
        syncLeapDays(leapDays.filter((_, i) => i !== idx))
    }

    const totalYearDays = months.reduce((sum, m) => sum + (Number(m.length) || 0), 0)

    return (
        <div className="flex flex-col gap-4">
            {/* Weekdays Section */}
            <div className="p-4 rounded-lg bg-muted/20 border border-border/50 space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider">
                            Weekdays ({weekdays.length}-Day Week)
                        </h4>
                        <p className="text-[10px] text-muted-foreground">
                            Customize the names and number of days in a week.
                        </p>
                    </div>
                    <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={addWeekday}>
                        <Plus className="h-3.5 w-3.5" /> Add Weekday
                    </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {weekdays.map((wd, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 bg-card/70 p-1.5 rounded-md border border-border/40">
                            <span className="text-[10px] font-mono text-muted-foreground w-5 text-center shrink-0">
                                {idx + 1}.
                            </span>
                            <Input
                                value={wd}
                                onChange={(e) => updateWeekday(idx, e.target.value)}
                                className="h-7 text-xs flex-grow"
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0"
                                disabled={idx === 0}
                                onClick={() => moveWeekday(idx, -1)}
                            >
                                <ArrowUp className="h-3 w-3" />
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0"
                                disabled={idx === weekdays.length - 1}
                                onClick={() => moveWeekday(idx, 1)}
                            >
                                <ArrowDown className="h-3 w-3" />
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                                disabled={weekdays.length <= 1}
                                onClick={() => removeWeekday(idx)}
                            >
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Months & Intercalary Timespans */}
            <div className="p-4 rounded-lg bg-muted/20 border border-border/50 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-purple-400" />
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider">
                                Months &amp; Intercalary Periods ({months.length} Timespans &bull; {totalYearDays} Days/Year)
                            </h4>
                            <p className="text-[10px] text-muted-foreground">
                                Regular months and intercalary festival days that make up a standard year.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            onClick={() => addMonth('intercalary')}
                        >
                            <Sparkles className="h-3 w-3 text-amber-400" /> + Intercalary
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            onClick={() => addMonth('month')}
                        >
                            <Plus className="h-3.5 w-3.5" /> + Month
                        </Button>
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    {months.map((m, idx) => (
                        <div
                            key={idx}
                            className="grid grid-cols-12 gap-2 items-center p-2 rounded-md bg-card/70 border border-border/40"
                        >
                            <span className="col-span-1 text-[10px] font-mono text-muted-foreground text-center">
                                #{idx + 1}
                            </span>
                            <div className="col-span-5 sm:col-span-5">
                                <Input
                                    value={m.name}
                                    onChange={(e) => updateMonth(idx, { name: e.target.value })}
                                    placeholder="Month name"
                                    className="h-7 text-xs"
                                />
                            </div>
                            <div className="col-span-2 sm:col-span-2 flex items-center gap-1">
                                <Input
                                    type="number"
                                    min={1}
                                    max={1000}
                                    value={m.length}
                                    onChange={(e) =>
                                        updateMonth(idx, { length: Math.max(1, parseInt(e.target.value) || 1) })
                                    }
                                    className="h-7 text-xs text-center"
                                />
                                <span className="text-[10px] text-muted-foreground hidden sm:inline">days</span>
                            </div>
                            <div className="col-span-2 sm:col-span-2">
                                <select
                                    className="w-full h-7 rounded-md border border-border bg-card px-1.5 text-[11px]"
                                    value={m.type === 'intercalary' ? 'intercalary' : 'month'}
                                    onChange={(e) => updateMonth(idx, { type: e.target.value })}
                                >
                                    <option value="month">Month</option>
                                    <option value="intercalary">Intercalary</option>
                                </select>
                            </div>
                            <div className="col-span-2 flex items-center justify-end gap-0.5">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    disabled={idx === 0}
                                    onClick={() => moveMonth(idx, -1)}
                                >
                                    <ArrowUp className="h-3 w-3" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    disabled={idx === months.length - 1}
                                    onClick={() => moveMonth(idx, 1)}
                                >
                                    <ArrowDown className="h-3 w-3" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    disabled={months.length <= 1}
                                    onClick={() => removeMonth(idx)}
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Leap Days Section */}
            <div className="p-4 rounded-lg bg-muted/20 border border-border/50 space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider">Leap Days ({leapDays.length})</h4>
                        <p className="text-[10px] text-muted-foreground">
                            Optional extra days added to a specific month on leap year intervals (e.g. <code className="text-purple-300">4</code> or <code className="text-purple-300">4,!100,400</code>).
                        </p>
                    </div>
                    <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={addLeapDay}>
                        <Plus className="h-3.5 w-3.5" /> Add Leap Day
                    </Button>
                </div>

                {leapDays.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic text-center py-2">
                        No leap days configured. Every year has exactly {totalYearDays} days.
                    </p>
                ) : (
                    <div className="flex flex-col gap-2">
                        {leapDays.map((ld, idx) => (
                            <div
                                key={idx}
                                className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end p-2.5 rounded-md bg-card/70 border border-border/40"
                            >
                                <div className="sm:col-span-4 space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Name</label>
                                    <Input
                                        value={ld.name}
                                        onChange={(e) => updateLeapDay(idx, { name: e.target.value })}
                                        className="h-7 text-xs"
                                    />
                                </div>
                                <div className="sm:col-span-4 space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground">
                                        Target Month
                                    </label>
                                    <select
                                        className="w-full h-7 rounded-md border border-border bg-card px-2 text-xs"
                                        value={ld.timespan ?? 0}
                                        onChange={(e) => updateLeapDay(idx, { timespan: parseInt(e.target.value) || 0 })}
                                    >
                                        {months.map((m, mIdx) => (
                                            <option key={mIdx} value={mIdx}>
                                                {mIdx + 1}. {m.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="sm:col-span-3 space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground">
                                        Interval (Years)
                                    </label>
                                    <Input
                                        value={String(ld.interval ?? '4')}
                                        onChange={(e) => updateLeapDay(idx, { interval: e.target.value })}
                                        placeholder="4 or 4,!100,400"
                                        className="h-7 text-xs"
                                    />
                                </div>
                                <div className="sm:col-span-1 flex justify-end">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-destructive hover:text-destructive"
                                        onClick={() => removeLeapDay(idx)}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
