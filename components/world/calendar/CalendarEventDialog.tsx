'use client'

import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Calendar as CalendarIcon,
    Repeat,
    Moon as MoonIcon,
    Sun,
    Lock,
    Eye,
    Clock,
    Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
    FantasyCalendarJSON,
    FantasyEvent,
    getMoonPhaseName,
} from '@/lib/fantasy-calendar/types'
import {
    EVENT_COLOR_OPTIONS,
    MOON_SVG_PATHS,
} from '@/lib/fantasy-calendar/presets'
import {
    RecurrenceMode,
    SeasonTriggerType,
    ParsedRecurrenceRule,
    getDefaultRecurrenceRule,
    parseRecurrenceFromEvent,
    buildConditionsFromRule,
} from '@/lib/fantasy-calendar/eventBuilder'

interface CalendarEventDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    calendar: FantasyCalendarJSON
    initialEvent?: FantasyEvent | null
    defaultDate?: { year: number; month: number; day: number }
    onSave: (event: FantasyEvent) => Promise<void> | void
}

const RECURRENCE_MODES: { id: RecurrenceMode; label: string; desc: string }[] = [
    { id: 'once', label: 'Specific Date', desc: 'One-time event on a specific year, month, and day' },
    { id: 'annual', label: 'Annual (Yearly)', desc: 'Repeats every year (or every Nth year) on a date' },
    { id: 'monthly', label: 'Monthly', desc: 'Repeats on the same day of every month' },
    { id: 'weekly', label: 'Weekly / Weekday', desc: 'Repeats on a weekday (every week or Nth of month)' },
    { id: 'interval', label: 'Every N Days', desc: 'Repeats on a fixed day interval across the calendar' },
    { id: 'moon', label: 'Moon Phase', desc: 'Triggers when a moon reaches a specific lunar phase' },
    { id: 'season', label: 'Season / Solstice', desc: 'Triggers on solstices, equinoxes, or seasonal days' },
]

export default function CalendarEventDialog({
    open,
    onOpenChange,
    calendar,
    initialEvent,
    defaultDate,
    onSave,
}: CalendarEventDialogProps) {
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [categoryId, setCategoryId] = useState<number | string>(-1)
    const [color, setColor] = useState('Amber')
    const [isHidden, setIsHidden] = useState(false)
    const [hasDuration, setHasDuration] = useState(false)
    const [duration, setDuration] = useState(2)
    const [rule, setRule] = useState<ParsedRecurrenceRule>(() =>
        getDefaultRecurrenceRule(calendar, defaultDate)
    )
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (!open) return
        if (initialEvent) {
            setName(initialEvent.name || '')
            // Strip simple wrapping <p>...</p> if present for cleaner editing while preserving inner text
            const rawDesc = initialEvent.description || ''
            const cleanDesc = rawDesc.replace(/^<p>([\s\S]*?)<\/p>$/i, '$1')
            setDescription(cleanDesc)
            setCategoryId(initialEvent.event_category_id ?? -1)
            setColor(initialEvent.settings?.color || 'Amber')
            setIsHidden(Boolean(initialEvent.settings?.hide))
            setHasDuration(Boolean(initialEvent.data?.has_duration))
            setDuration(Math.max(1, Number(initialEvent.data?.duration) || 2))
            setRule(parseRecurrenceFromEvent(initialEvent, calendar))
        } else {
            setName('')
            setDescription('')
            setCategoryId(-1)
            setColor('Amber')
            setIsHidden(false)
            setHasDuration(false)
            setDuration(2)
            setRule(getDefaultRecurrenceRule(calendar, defaultDate))
        }
    }, [open, initialEvent, defaultDate, calendar])

    const months = calendar.static_data.months || []
    const weekdays = calendar.static_data.weekdays || []
    const moons = calendar.static_data.moons || []
    const seasons = calendar.static_data.seasons?.data || []
    const categories = calendar.event_categories || []

    const selectedMoon = moons[rule.moonIndex] || moons[0]
    const moonGranularity = selectedMoon?.granularity || 16

    const handleSave = async () => {
        if (!name.trim()) return
        setIsSaving(true)
        try {
            const compiledConditions = buildConditionsFromRule(rule)
            const newEvent: FantasyEvent = {
                id: initialEvent?.id ?? Date.now(),
                name: name.trim(),
                description: description.trim(),
                event_category_id: categoryId,
                calendar_id: initialEvent?.calendar_id || calendar.name.toLowerCase().replace(/\s+/g, '-'),
                data: {
                    ...(initialEvent?.data || {}),
                    has_duration: hasDuration,
                    duration: hasDuration ? Math.max(1, Number(duration) || 1) : 0,
                    conditions: compiledConditions,
                    date: rule.mode === 'once' ? [rule.year, rule.month, rule.day] : [],
                },
                settings: {
                    ...(initialEvent?.settings || {}),
                    color,
                    hide: isHidden,
                    hide_full: isHidden,
                },
                updated_at: new Date().toISOString(),
                created_at: initialEvent?.created_at || new Date().toISOString(),
            }
            await onSave(newEvent)
            onOpenChange(false)
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-purple-400" />
                        {initialEvent ? 'Edit Calendar Event' : 'Create Calendar Event'}
                    </DialogTitle>
                    <DialogDescription>
                        Configure a one-time or recurring event, festival, lunar phenomenon, or secret GM deadline.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-4 py-2">
                    {/* Event Title */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Event Name
                        </label>
                        <Input
                            placeholder="e.g. Festival of the Twin Moons, Royal Tax Day..."
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Description / Lore Notes
                        </label>
                        <Textarea
                            placeholder="Describe what happens during this event..."
                            className="min-h-[80px] text-xs"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    {/* Category & Visibility Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Category
                            </label>
                            <select
                                className="w-full h-9 rounded-md border border-border bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                                value={String(categoryId)}
                                onChange={(e) => {
                                    const val = e.target.value
                                    const matched = categories.find((c) => String(c.id) === val)
                                    setCategoryId(matched ? matched.id : -1)
                                    if (matched?.event_settings?.color) {
                                        setColor(matched.event_settings.color)
                                    }
                                    if (matched?.event_settings?.hide !== undefined) {
                                        setIsHidden(Boolean(matched.event_settings.hide))
                                    }
                                }}
                            >
                                <option value="-1">Uncategorized</option>
                                {categories.map((cat) => (
                                    <option key={String(cat.id)} value={String(cat.id)}>
                                        {cat.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Visibility
                            </label>
                            <button
                                type="button"
                                onClick={() => setIsHidden(!isHidden)}
                                className={cn(
                                    'w-full h-9 px-3 rounded-md border text-xs font-bold flex items-center justify-between transition-all',
                                    isHidden
                                        ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                )}
                            >
                                <span className="flex items-center gap-2">
                                    {isHidden ? <Lock className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                    {isHidden ? 'GM-Only (Hidden from Players)' : 'Public (Visible to Players)'}
                                </span>
                                <span className="text-[10px] uppercase opacity-75">Toggle</span>
                            </button>
                        </div>
                    </div>

                    {/* Event Color Swatches (per Void Guild Styleguide: w-8 h-8 rounded-full) */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Event Color
                        </label>
                        <div className="flex flex-wrap gap-2.5 items-center">
                            {EVENT_COLOR_OPTIONS.map((opt) => {
                                const selected = color.toLowerCase() === opt.name.toLowerCase()
                                return (
                                    <button
                                        key={opt.name}
                                        type="button"
                                        title={opt.name}
                                        onClick={() => setColor(opt.name)}
                                        className={cn(
                                            'w-8 h-8 rounded-full transition-all border border-border/50',
                                            selected && 'ring-2 ring-purple-500 ring-offset-2 ring-offset-background scale-110'
                                        )}
                                        style={{ backgroundColor: opt.hex }}
                                    />
                                )
                            })}
                        </div>
                    </div>

                    {/* Multi-day Duration */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/40">
                        <div className="flex items-center gap-2.5">
                            <Checkbox
                                id="event-duration-toggle"
                                checked={hasDuration}
                                onCheckedChange={(checked) => setHasDuration(Boolean(checked))}
                            />
                            <label htmlFor="event-duration-toggle" className="text-xs font-bold cursor-pointer flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-purple-400" />
                                Multi-Day Event / Festival
                            </label>
                        </div>
                        {hasDuration && (
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number"
                                    min={1}
                                    max={365}
                                    className="w-20 h-7 text-xs text-center"
                                    value={duration}
                                    onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 1))}
                                />
                                <span className="text-xs text-muted-foreground">days</span>
                            </div>
                        )}
                    </div>

                    {/* Recurrence Rule Selector */}
                    <div className="space-y-2.5 p-3.5 rounded-lg bg-muted/20 border border-border/50">
                        <div className="flex items-center gap-2">
                            <Repeat className="h-3.5 w-3.5 text-purple-400" />
                            <span className="text-xs font-bold uppercase tracking-wider">
                                When &amp; How Often Does This Event Occur?
                            </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                            {RECURRENCE_MODES.map((m) => (
                                <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => setRule((prev) => ({ ...prev, mode: m.id }))}
                                    className={cn(
                                        'px-2.5 py-1.5 rounded-md text-left text-[11px] font-bold border transition-all',
                                        rule.mode === m.id
                                            ? 'bg-purple-500/20 border-purple-500 text-purple-200'
                                            : 'bg-card/60 border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted/40'
                                    )}
                                >
                                    {m.label}
                                </button>
                            ))}
                            {rule.mode === 'custom' && (
                                <button
                                    type="button"
                                    className="px-2.5 py-1.5 rounded-md text-left text-[11px] font-bold border bg-purple-500/20 border-purple-500 text-purple-200"
                                >
                                    Custom Rule
                                </button>
                            )}
                        </div>

                        {/* Mode-specific inputs */}
                        {rule.mode === 'once' && (
                            <div className="grid grid-cols-3 gap-2 pt-2">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Day</label>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={months[rule.month]?.length || 31}
                                        value={rule.day}
                                        onChange={(e) => setRule({ ...rule, day: Math.max(1, parseInt(e.target.value) || 1) })}
                                        className="h-8 text-xs"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Month</label>
                                    <select
                                        className="w-full h-8 rounded-md border border-border bg-card px-2 text-xs"
                                        value={rule.month}
                                        onChange={(e) => setRule({ ...rule, month: parseInt(e.target.value) || 0 })}
                                    >
                                        {months.map((m, idx) => (
                                            <option key={idx} value={idx}>
                                                {idx + 1}. {m.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Year</label>
                                    <Input
                                        type="number"
                                        value={rule.year}
                                        onChange={(e) => setRule({ ...rule, year: parseInt(e.target.value) || 1 })}
                                        className="h-8 text-xs"
                                    />
                                </div>
                            </div>
                        )}

                        {rule.mode === 'annual' && (
                            <div className="grid grid-cols-3 gap-2 pt-2">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Day of Month</label>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={months[rule.month]?.length || 31}
                                        value={rule.day}
                                        onChange={(e) => setRule({ ...rule, day: Math.max(1, parseInt(e.target.value) || 1) })}
                                        className="h-8 text-xs"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Month</label>
                                    <select
                                        className="w-full h-8 rounded-md border border-border bg-card px-2 text-xs"
                                        value={rule.month}
                                        onChange={(e) => setRule({ ...rule, month: parseInt(e.target.value) || 0 })}
                                    >
                                        {months.map((m, idx) => (
                                            <option key={idx} value={idx}>
                                                {idx + 1}. {m.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Every N Years</label>
                                    <Input
                                        type="number"
                                        min={1}
                                        value={rule.yearInterval || 1}
                                        onChange={(e) => setRule({ ...rule, yearInterval: Math.max(1, parseInt(e.target.value) || 1) })}
                                        className="h-8 text-xs"
                                    />
                                </div>
                            </div>
                        )}

                        {rule.mode === 'monthly' && (
                            <div className="pt-2 space-y-1">
                                <label className="text-[10px] font-bold uppercase text-muted-foreground">
                                    Occurs on Day of Every Month
                                </label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={31}
                                    value={rule.day}
                                    onChange={(e) => setRule({ ...rule, day: Math.max(1, parseInt(e.target.value) || 1) })}
                                    className="h-8 text-xs max-w-[140px]"
                                />
                            </div>
                        )}

                        {rule.mode === 'weekly' && (
                            <div className="grid grid-cols-2 gap-2 pt-2">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Weekday</label>
                                    <select
                                        className="w-full h-8 rounded-md border border-border bg-card px-2 text-xs"
                                        value={rule.weekdayName}
                                        onChange={(e) => setRule({ ...rule, weekdayName: e.target.value })}
                                    >
                                        {weekdays.map((wd) => (
                                            <option key={wd} value={wd}>
                                                {wd}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Frequency in Month</label>
                                    <select
                                        className="w-full h-8 rounded-md border border-border bg-card px-2 text-xs"
                                        value={rule.weekdayNthInMonth || 0}
                                        onChange={(e) => setRule({ ...rule, weekdayNthInMonth: parseInt(e.target.value) || 0 })}
                                    >
                                        <option value={0}>Every week</option>
                                        <option value={1}>1st of each month</option>
                                        <option value={2}>2nd of each month</option>
                                        <option value={3}>3rd of each month</option>
                                        <option value={4}>4th of each month</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {rule.mode === 'interval' && (
                            <div className="grid grid-cols-2 gap-2 pt-2">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Repeat Every N Days</label>
                                    <Input
                                        type="number"
                                        min={1}
                                        value={rule.intervalDays}
                                        onChange={(e) => setRule({ ...rule, intervalDays: Math.max(1, parseInt(e.target.value) || 1) })}
                                        className="h-8 text-xs"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Day Offset</label>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={rule.intervalOffset}
                                        onChange={(e) => setRule({ ...rule, intervalOffset: parseInt(e.target.value) || 0 })}
                                        className="h-8 text-xs"
                                    />
                                </div>
                            </div>
                        )}

                        {rule.mode === 'moon' && (
                            <div className="space-y-3 pt-2">
                                {moons.length === 0 ? (
                                    <p className="text-xs text-muted-foreground italic">
                                        No moons configured in this calendar yet. Add a moon in the Moons tab first.
                                    </p>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                                                    <MoonIcon className="h-3 w-3" /> Target Moon
                                                </label>
                                                <select
                                                    className="w-full h-8 rounded-md border border-border bg-card px-2 text-xs"
                                                    value={rule.moonIndex}
                                                    onChange={(e) => {
                                                        const idx = parseInt(e.target.value) || 0
                                                        const targetG = moons[idx]?.granularity || 16
                                                        setRule({
                                                            ...rule,
                                                            moonIndex: idx,
                                                            moonPhase: Math.min(rule.moonPhase, targetG - 1),
                                                        })
                                                    }}
                                                >
                                                    {moons.map((m, idx) => (
                                                        <option key={idx} value={idx}>
                                                            {m.name} ({m.cycle}-day cycle)
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold uppercase text-muted-foreground">
                                                    Selected Phase
                                                </label>
                                                <div className="h-8 px-2.5 rounded-md border border-border/50 bg-card/50 flex items-center gap-2 text-xs font-bold">
                                                    <span>{getMoonPhaseName(rule.moonPhase, moonGranularity)}</span>
                                                    <span className="text-[10px] text-muted-foreground">
                                                        (#{rule.moonPhase})
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <span className="text-[10px] font-bold uppercase text-muted-foreground">
                                                Click a Lunar Phase Icon:
                                            </span>
                                            <div className="flex flex-wrap gap-1.5 p-2 rounded-md bg-card/60 border border-border/40">
                                                {Array.from({ length: moonGranularity }).map((_, pIdx) => {
                                                    const svgPath =
                                                        MOON_SVG_PATHS[
                                                            Math.floor((pIdx / moonGranularity) * MOON_SVG_PATHS.length)
                                                        ]
                                                    const isSelected = rule.moonPhase === pIdx
                                                    return (
                                                        <button
                                                            key={pIdx}
                                                            type="button"
                                                            title={`${getMoonPhaseName(pIdx, moonGranularity)} (Phase ${pIdx})`}
                                                            onClick={() => setRule({ ...rule, moonPhase: pIdx })}
                                                            className={cn(
                                                                'p-1 rounded-md border transition-all flex flex-col items-center gap-0.5',
                                                                isSelected
                                                                    ? 'border-purple-500 bg-purple-500/20 ring-1 ring-purple-500'
                                                                    : 'border-transparent hover:bg-muted/50'
                                                            )}
                                                        >
                                                            <svg width="20" height="20" viewBox="0 0 32 32">
                                                                <circle
                                                                    cx="16"
                                                                    cy="16"
                                                                    r="9.5"
                                                                    fill={selectedMoon?.shadow_color || '#29344a'}
                                                                />
                                                                <path
                                                                    d={svgPath}
                                                                    fill={selectedMoon?.color || '#d5f4f1'}
                                                                />
                                                            </svg>
                                                            <span className="text-[8px] font-mono text-muted-foreground">
                                                                {pIdx}
                                                            </span>
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {rule.mode === 'season' && (
                            <div className="space-y-2 pt-2">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                                        <Sun className="h-3 w-3 text-amber-400" /> Seasonal Milestone
                                    </label>
                                    <select
                                        className="w-full h-8 rounded-md border border-border bg-card px-2 text-xs"
                                        value={rule.seasonTrigger}
                                        onChange={(e) =>
                                            setRule({ ...rule, seasonTrigger: e.target.value as SeasonTriggerType })
                                        }
                                    >
                                        <option value="high_solstice">Summer Solstice (Longest Day of Year)</option>
                                        <option value="low_solstice">Winter Solstice (Shortest Day of Year)</option>
                                        <option value="rising_equinox">Spring Equinox (Rising Equinox)</option>
                                        <option value="falling_equinox">Autumn Equinox (Falling Equinox)</option>
                                        <option value="season_day">Specific Day of a Season</option>
                                    </select>
                                </div>
                                {rule.seasonTrigger === 'season_day' && (
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold uppercase text-muted-foreground">
                                                Season
                                            </label>
                                            <select
                                                className="w-full h-8 rounded-md border border-border bg-card px-2 text-xs"
                                                value={rule.seasonIndex}
                                                onChange={(e) =>
                                                    setRule({ ...rule, seasonIndex: parseInt(e.target.value) || 0 })
                                                }
                                            >
                                                {seasons.map((s, idx) => (
                                                    <option key={idx} value={idx}>
                                                        {s.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold uppercase text-muted-foreground">
                                                Day in Season
                                            </label>
                                            <Input
                                                type="number"
                                                min={1}
                                                value={rule.seasonDay}
                                                onChange={(e) =>
                                                    setRule({
                                                        ...rule,
                                                        seasonDay: Math.max(1, parseInt(e.target.value) || 1),
                                                    })
                                                }
                                                className="h-8 text-xs"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {rule.mode === 'custom' && (
                            <div className="space-y-1.5 pt-2">
                                <label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                                    <Sparkles className="h-3 w-3 text-purple-400" /> Raw Fantasy-Calendar Condition Array (JSON)
                                </label>
                                <Textarea
                                    className="font-mono text-[11px] min-h-[70px]"
                                    value={JSON.stringify(rule.rawConditions)}
                                    onChange={(e) => {
                                        try {
                                            const parsed = JSON.parse(e.target.value)
                                            if (Array.isArray(parsed)) {
                                                setRule({ ...rule, rawConditions: parsed })
                                            }
                                        } catch {
                                            // Ignore transient JSON typing errors
                                        }
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        disabled={!name.trim() || isSaving}
                        onClick={handleSave}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                        {initialEvent ? 'Save Event Changes' : 'Create Event'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
