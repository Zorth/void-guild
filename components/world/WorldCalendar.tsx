'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
    Calendar as CalendarIcon, 
    Upload, 
    ChevronLeft, 
    ChevronRight, 
    Eye, 
    EyeOff, 
    AlertCircle,
    RotateCcw,
    Plus,
    Trash2,
    Clock,
    CalendarDays,
    Book,
    ExternalLink
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Id } from '@/convex/_generated/dataModel'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { toast } from 'sonner'

interface CalendarEvent {
    id: string;
    name: string;
    description?: string;
    year: number;
    month: number; // 0-indexed
    day: number;
    isRecurring: boolean;
    recurrence?: {
        type: 'annually' | 'monthly';
        startYear?: number;
        endYear?: number;
    }
}

interface CalendarSession {
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

interface FantasyMonth {
    name: string
    length: number
    type: string
}

interface FantasyCalendarJSON {
    name: string;
    dynamic_data: {
        year: number;
        month: number;
        day: number;
        hour?: number;
        minute?: number;
    };
    static_data: {
        year_len: number;
        n_months: number;
        months: FantasyMonth[];
        weekdays: string[];
    };
    events: CalendarEvent[];
}

interface WorldCalendarProps {
    worldId: Id<'worlds'>
    worldName: string
    calendarJSON?: string
    isOwner: boolean
    isVisible: boolean
    sessions?: CalendarSession[]
    onDropSession?: (sessionId: string, year: number, month: number, day: number) => void
}

export default function WorldCalendar({ 
    worldId, 
    worldName,
    calendarJSON, 
    isOwner, 
    isVisible,
    sessions = [],
    onDropSession
}: WorldCalendarProps) {
    const updateCalendar = useMutation(api.worlds.updateWorldCalendar)
    const toggleVisibility = useMutation(api.worlds.toggleCalendarVisibility)

    const [importText, setImportText] = useState('')
    const [isImportOpen, setIsImportOpen] = useState(false)
    const [isAddEventOpen, setIsAddEventOpen] = useState(false)
    
    // New Event State
    const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({
        name: '',
        isRecurring: false,
        recurrence: { type: 'annually' }
    })

    const calendar = useMemo(() => {
        if (!calendarJSON) return null
        try {
            const parsed = JSON.parse(calendarJSON)
            // Ensure events array exists
            if (!parsed.events) parsed.events = []
            return parsed as FantasyCalendarJSON
        } catch (e) {
            console.error('Failed to parse calendar JSON', e)
            return null
        }
    }, [calendarJSON])

    // Local state for viewing
    const [viewYear, setViewYear] = useState<number>(1)
    const [viewMonth, setViewMonth] = useState<number>(0)

    useEffect(() => {
        if (calendar?.dynamic_data) {
            setViewYear(calendar.dynamic_data.year)
            setViewMonth(calendar.dynamic_data.month)
        }
    }, [calendar])

    const handleImport = async () => {
        try {
            const parsed = JSON.parse(importText)
            const staticData = parsed.static_data || parsed.static || parsed.staticData
            const dynamicData = parsed.dynamic_data || parsed.dynamic || parsed.dynamicData
            
            if (!staticData || !dynamicData) {
                throw new Error('Invalid format. Missing static or dynamic data blocks.')
            }

            const yearData = staticData.year_data || staticData
            const months = yearData.timespans || yearData.months || yearData.month_data
            const weekdays = yearData.global_week || yearData.weekdays || staticData.weekdays

            if (!months || !Array.isArray(months)) {
                throw new Error('Invalid format. Missing months/timespans array.')
            }

            const currentMonthIndex = typeof dynamicData.month === 'number' 
                ? dynamicData.month 
                : (typeof dynamicData.timespan === 'number' ? dynamicData.timespan : 0)

            const cleanCalendar = {
                name: parsed.name || "World Calendar",
                static_data: {
                    year_len: staticData.year_len || yearData.year_len || 365,
                    n_months: months.length,
                    months: months.map((m: FantasyMonth) => ({
                        name: m.name || "Unknown Month",
                        length: m.length || 30,
                        type: m.type || "regular"
                    })),
                    weekdays: weekdays || ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7"]
                },
                dynamic_data: {
                    year: dynamicData.year || 1,
                    month: currentMonthIndex,
                    day: dynamicData.day || 1
                },
                events: [] 
            }

            await updateCalendar({ worldId, calendar: JSON.stringify(cleanCalendar) })
            toast.success('Calendar imported successfully!')
            setIsImportOpen(false)
            setImportText('')
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Invalid JSON format')
        }
    }

    const saveCalendar = async (updated: FantasyCalendarJSON) => {
        await updateCalendar({ worldId, calendar: JSON.stringify(updated) })
    }

    const handleAddEvent = async () => {
        if (!calendar || !newEvent.name || !newEvent.day || newEvent.month === undefined || newEvent.year === undefined) return
        
        const event: CalendarEvent = {
            id: Math.random().toString(36).substring(2, 9),
            name: newEvent.name,
            year: newEvent.year,
            month: newEvent.month,
            day: newEvent.day,
            isRecurring: !!newEvent.isRecurring,
            recurrence: newEvent.isRecurring ? newEvent.recurrence : undefined
        }

        const updated = { ...calendar, events: [...calendar.events, event] }
        await saveCalendar(updated)
        setIsAddEventOpen(false)
        setNewEvent({ name: '', isRecurring: false, recurrence: { type: 'annually' } })
        toast.success('Event added!')
    }

    const removeEvent = async (id: string) => {
        if (!calendar) return
        const updated = { ...calendar, events: calendar.events.filter(e => e.id !== id) }
        await saveCalendar(updated)
        toast.info('Event removed')
    }

    const handleAdvanceDay = async (delta: number) => {
        if (!calendar) return
        let { year, month, day } = calendar.dynamic_data
        const months = calendar.static_data.months

        day += delta

        while (day > (months[month]?.length || 30)) {
            day -= (months[month]?.length || 30)
            month++
            if (month >= calendar.static_data.n_months) {
                month = 0
                year++
            }
        }

        while (day < 1) {
            month--
            if (month < 0) {
                month = calendar.static_data.n_months - 1
                year--
            }
            day += (months[month]?.length || 30)
        }

        const updated = { ...calendar, dynamic_data: { ...calendar.dynamic_data, year, month, day } }
        await saveCalendar(updated)
    }

    const checkEventOccurs = (event: CalendarEvent, y: number, m: number, d: number) => {
        if (!event.isRecurring) {
            return event.year === y && event.month === m && event.day === d
        }

        // Recurrence logic
        const startYear = event.recurrence?.startYear ?? event.year
        const endYear = event.recurrence?.endYear

        if (y < startYear) return false
        if (endYear !== undefined && y > endYear) return false

        if (event.recurrence?.type === 'annually') {
            return event.month === m && event.day === d
        }
        if (event.recurrence?.type === 'monthly') {
            return event.day === d
        }
        return false
    }

    const checkSessionOccurs = (session: CalendarSession, y: number, m: number, d: number) => {
        if (!session.inGameDate) return false
        const start = session.inGameDate
        
        // Simple day match if no end date
        if (!start.endDay) {
            return start.year === y && start.month === m && start.day === d
        }

        // Range logic
        // Convert to a comparable "total days" or just check nested bounds
        // For simplicity in fantasy calendars, we'll do nested checks
        const currentTotal = (y * 10000) + (m * 100) + d
        const startTotal = (start.year * 10000) + (start.month * 100) + start.day
        const endTotal = (start.endYear! * 10000) + (start.endMonth! * 100) + start.endDay!

        return currentTotal >= startTotal && currentTotal <= endTotal
    }

    if (!isOwner && !isVisible) return null

    const isValid = calendar && 
                    calendar.static_data && 
                    Array.isArray(calendar.static_data.months) && 
                    calendar.static_data.months.length > 0 &&
                    calendar.dynamic_data

    if (!calendar || !isValid) {
        return (
            <Card className="mt-8 border-dashed bg-muted/20">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    {!calendar ? (
                        <>
                            <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                            <h3 className="text-lg font-bold">No Calendar Configured</h3>
                            <p className="text-sm text-muted-foreground mb-6 max-w-md">
                                Import a Fantasy Calendar JSON to track time, seasons, and events in your world.
                            </p>
                        </>
                    ) : (
                        <>
                            <AlertCircle className="h-12 w-12 text-destructive mb-4 opacity-50" />
                            <h3 className="text-lg font-bold">Invalid Calendar Data</h3>
                            <p className="text-sm text-muted-foreground mb-6 max-w-md">
                                The imported calendar data is missing required information (months or date data). 
                            </p>
                        </>
                    )}
                    
                    {isOwner && (
                        <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
                            <DialogTrigger asChild>
                                <Button className="gap-2">
                                    <Upload className="h-4 w-4" />
                                    {calendar ? 'Re-import JSON' : 'Import JSON'}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                    <DialogTitle>Import Fantasy Calendar</DialogTitle>
                                    <DialogDescription>
                                        Upload or paste the exported JSON from Fantasy-Calendar.com.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-6 hover:bg-muted/50 transition-colors">
                                        <input
                                            type="file"
                                            id="calendar-file-init"
                                            accept=".json"
                                            className="hidden"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0]
                                                if (file) {
                                                    const text = await file.text()
                                                    setImportText(text)
                                                    toast.info(`Loaded ${file.name} (${(file.size / 1024).toFixed(1)} KB)`)
                                                }
                                            }}
                                        />
                                        <Button asChild variant="outline" className="gap-2">
                                            <label htmlFor="calendar-file-init">
                                                <Upload className="h-4 w-4" />
                                                Select JSON File
                                            </label>
                                        </Button>
                                    </div>
                                    <Textarea 
                                        placeholder='{"name": "My World", ...}'
                                        className="min-h-[200px] font-mono text-xs"
                                        value={importText}
                                        onChange={(e) => setImportText(e.target.value)}
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button variant="ghost" onClick={() => setIsImportOpen(false)}>Cancel</Button>
                                    <Button onClick={handleImport}>Import</Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}
                </CardContent>
            </Card>
        )
    }

    const months = calendar.static_data.months
    const currentMonth = months[viewMonth] || months[0]
    const isCurrentMonth = viewYear === calendar.dynamic_data.year && viewMonth === calendar.dynamic_data.month
    const weekdays = calendar.static_data.weekdays || ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7"]
    const todayMonthName = months[calendar.dynamic_data.month]?.name || months[0].name

    return (
        <Card className="mt-8 overflow-hidden border-border/40 bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 px-6 py-3 bg-muted/10">
                <div className="flex items-center gap-4">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-primary" />
                        {calendar.name || "World Calendar"}
                    </CardTitle>
                    <div className="text-sm font-medium px-2 py-0.5 bg-primary/10 text-primary rounded-md border border-primary/20">
                        Today: {calendar.dynamic_data.day} {todayMonthName}, {calendar.dynamic_data.year}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isOwner && (
                        <>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 px-2 text-muted-foreground hover:text-primary gap-2"
                                onClick={() => toggleVisibility({ worldId })}
                            >
                                {isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                <span className="text-xs hidden sm:inline">{isVisible ? "Public" : "Private"}</span>
                            </Button>
                            <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-primary gap-2">
                                        <RotateCcw className="h-4 w-4" />
                                        <span className="text-xs hidden sm:inline">Re-import</span>
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                    <DialogHeader><DialogTitle>Re-import Calendar</DialogTitle></DialogHeader>
                                    <Textarea 
                                        placeholder='{"name": "My World", ...}'
                                        className="min-h-[300px] font-mono text-xs"
                                        value={importText}
                                        onChange={(e) => setImportText(e.target.value)}
                                    />
                                    <div className="flex justify-end gap-2">
                                        <Button variant="ghost" onClick={() => setIsImportOpen(false)}>Cancel</Button>
                                        <Button onClick={handleImport}>Replace</Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {isOwner && (
                    <div className="bg-primary/5 border-b border-border/50 px-6 py-3 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tracker:</span>
                            <div className="flex items-center gap-1">
                                <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => handleAdvanceDay(-1)}>-1 Day</Button>
                                <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => handleAdvanceDay(1)}>+1 Day</Button>
                                <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => handleAdvanceDay(7)}>+1 Week</Button>
                            </div>
                        </div>
                        <Button variant="secondary" size="sm" className="h-7 px-3 text-xs gap-2" onClick={() => { setViewYear(calendar.dynamic_data.year); setViewMonth(calendar.dynamic_data.month); }}>
                            <RotateCcw className="h-3 w-3" /> Jump to Today
                        </Button>
                    </div>
                )}

                <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-muted/5">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { if(viewMonth === 0) { setViewMonth(calendar.static_data.n_months-1); setViewYear(v=>v-1); } else setViewMonth(v=>v-1); }}>
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <div className="text-center">
                        <h2 className="text-xl font-bold tracking-tight">{currentMonth.name}</h2>
                        <p className="text-sm text-muted-foreground font-medium">Year {viewYear}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { if(viewMonth === calendar.static_data.n_months-1) { setViewMonth(0); setViewYear(v=>v+1); } else setViewMonth(v=>v+1); }}>
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                </div>

                <div className="p-6">
                    <TooltipProvider>
                        <div className="grid grid-cols-7 gap-px bg-border/20 border border-border/20 rounded-lg overflow-hidden shadow-sm">
                            {weekdays.map(day => (
                                <Tooltip key={day}>
                                    <TooltipTrigger asChild>
                                        <div className="bg-muted/30 p-2 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border/20 cursor-help">
                                            {day.slice(0, 3)}
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="text-xs font-bold">{day}</p>
                                    </TooltipContent>
                                </Tooltip>
                            ))}
                            {[...Array(currentMonth.length)].map((_, i) => {
                            const d = i + 1
                            const isToday = isCurrentMonth && d === calendar.dynamic_data.day
                            const dayEvents = calendar.events.filter(e => checkEventOccurs(e, viewYear, viewMonth, d))
                            const daySessions = sessions.filter(s => checkSessionOccurs(s, viewYear, viewMonth, d))
                            
                            return (
                                <Popover key={i}>
                                    <PopoverTrigger asChild>
                                        <div 
                                            className={cn(
                                                "bg-card aspect-square sm:aspect-video p-2 flex flex-col items-center justify-center transition-colors relative group cursor-pointer",
                                                isToday ? "bg-primary/10" : "hover:bg-muted/10",
                                                daySessions.length > 0 && !isToday && "bg-purple-500/5"
                                            )}
                                            onDragOver={(e) => {
                                                if (isOwner) {
                                                    e.preventDefault();
                                                    e.currentTarget.classList.add('bg-primary/20');
                                                }
                                            }}
                                            onDragLeave={(e) => {
                                                if (isOwner) {
                                                    e.currentTarget.classList.remove('bg-primary/20');
                                                }
                                            }}
                                            onDrop={(e) => {
                                                if (isOwner && onDropSession) {
                                                    e.preventDefault();
                                                    e.currentTarget.classList.remove('bg-primary/20');
                                                    const sessionId = e.dataTransfer.getData('sessionId');
                                                    if (sessionId) {
                                                        onDropSession(sessionId, viewYear, viewMonth, d);
                                                    }
                                                }
                                            }}
                                        >
                                            <span className={cn("text-sm font-bold", isToday ? "text-primary scale-125" : "text-muted-foreground/50")}>
                                                {d}
                                            </span>
                                            <div className="flex gap-0.5 mt-1">
                                                {dayEvents.slice(0, 3).map(e => (
                                                    <div key={e.id} className="h-1 w-1 rounded-full bg-primary/60" />
                                                ))}
                                                {daySessions.map(s => (
                                                    <div key={s._id} className="h-1 w-1 rounded-full bg-purple-500/60 shadow-[0_0_2px_rgba(168,85,247,0.5)]" title="Gaming Session" />
                                                ))}
                                            </div>
                                        </div>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-64 p-0 overflow-hidden">
                                        <div className="bg-muted/50 px-4 py-2 border-b border-border/50 flex justify-between items-center">
                                            <span className="text-xs font-bold uppercase tracking-wider">{d} {currentMonth.name}</span>
                                            {isOwner && (
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-primary" onClick={() => {
                                                    setNewEvent({ ...newEvent, day: d, month: viewMonth, year: viewYear })
                                                    setIsAddEventOpen(true)
                                                }}>
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                        <div className="p-2 space-y-2 max-h-64 overflow-y-auto">
                                            {dayEvents.length === 0 && daySessions.length === 0 && <p className="text-[10px] text-muted-foreground italic text-center py-2">No events or sessions</p>}
                                            
                                            {daySessions.length > 0 && (
                                                <div className="space-y-1">
                                                    <p className="text-[9px] font-black uppercase text-purple-500 ml-1 mb-1">Sessions</p>
                                                    {daySessions.map(s => (
                                                        <div key={s._id} className="group/sess flex flex-col bg-purple-500/10 rounded border border-purple-500/20 hover:bg-purple-500/20 transition-colors overflow-hidden">
                                                            <Link 
                                                                href={`/sessions/${s._id}`}
                                                                className="flex items-center justify-between p-2 pb-1"
                                                            >
                                                                <div className="flex flex-col gap-0.5 min-w-0">
                                                                    <span className="text-xs font-bold truncate leading-none text-purple-700 dark:text-purple-300">
                                                                        {s.characterNames && s.characterNames.length > 0 
                                                                            ? s.characterNames.join(', ') 
                                                                            : "No Attendees"}
                                                                    </span>
                                                                    <span className="text-[8px] uppercase tracking-widest font-black opacity-60">
                                                                        {s.quest?.name || "Gaming Session"}
                                                                    </span>
                                                                </div>
                                                                <ExternalLink className="h-3 w-3 text-purple-500/40 group-hover/sess:text-purple-500 transition-colors shrink-0" />
                                                            </Link>
                                                            <div className="px-2 pb-2 flex justify-end">
                                                                <a 
                                                                    href={`https://void.tarragon.be/Session-Reports/${s.date ? new Date(s.date).toISOString().slice(0, 10) : 'TBD'}-${worldName.replace(/\s+/g, '-')}`} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer"
                                                                    className="flex items-center gap-1 text-[9px] font-black uppercase tracking-tighter text-muted-foreground hover:text-purple-500 transition-colors py-1 px-2 bg-background/50 rounded-full border border-border/50"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <Book size={10} />
                                                                    Wiki Report
                                                                </a>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {dayEvents.length > 0 && (
                                                <div className="space-y-1">
                                                    <p className="text-[9px] font-black uppercase text-primary ml-1 mb-1">World Events</p>
                                                    {dayEvents.map(e => (
                                                        <div key={e.id} className="flex items-center justify-between gap-2 p-2 bg-muted/30 rounded border border-border/50 group/ev">
                                                            <div className="flex flex-col gap-0.5 min-w-0">
                                                                <span className="text-xs font-bold truncate leading-none flex items-center gap-1">
                                                                    {e.name}
                                                                    {e.isRecurring && <RotateCcw className="h-2 w-2 text-primary opacity-50" />}
                                                                </span>
                                                            </div>
                                                            {isOwner && (
                                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive opacity-0 group-hover/ev:opacity-100 transition-opacity" onClick={() => removeEvent(e.id)}>
                                                                    <Trash2 className="h-3 w-3" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            )
                        })}
                    </div>
                    </TooltipProvider>
                </div>
            </CardContent>

            {/* Add Event Dialog */}
            <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plus className="h-5 w-5 text-primary" />
                            Add World Event
                        </DialogTitle>
                        <DialogDescription>
                            Create a new entry for {newEvent.day} {currentMonth.name}, {viewYear}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Event Name</label>
                            <Input 
                                placeholder="e.g. Festival of the Void" 
                                value={newEvent.name} 
                                onChange={e => setNewEvent({...newEvent, name: e.target.value})}
                                autoFocus
                            />
                        </div>
                        
                        <div className="flex flex-col gap-4 p-3 bg-muted/30 rounded-lg border border-border/50">
                            <div className="flex items-center space-x-2">
                                <Checkbox 
                                    id="recurring" 
                                    checked={newEvent.isRecurring} 
                                    onCheckedChange={(checked) => setNewEvent({...newEvent, isRecurring: !!checked})} 
                                />
                                <label htmlFor="recurring" className="text-sm font-medium cursor-pointer">Is Recurring</label>
                            </div>

                            {newEvent.isRecurring && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button 
                                            variant={newEvent.recurrence?.type === 'annually' ? 'default' : 'outline'} 
                                            size="sm" 
                                            className="h-8 text-xs gap-2"
                                            onClick={() => setNewEvent({...newEvent, recurrence: { ...newEvent.recurrence!, type: 'annually' }})}
                                        >
                                            <CalendarDays className="h-3 w-3" /> Annually
                                        </Button>
                                        <Button 
                                            variant={newEvent.recurrence?.type === 'monthly' ? 'default' : 'outline'} 
                                            size="sm" 
                                            className="h-8 text-xs gap-2"
                                            onClick={() => setNewEvent({...newEvent, recurrence: { ...newEvent.recurrence!, type: 'monthly' }})}
                                        >
                                            <Clock className="h-3 w-3" /> Monthly
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black uppercase text-muted-foreground">Start Year</label>
                                            <Input 
                                                type="number" 
                                                className="h-8 text-xs" 
                                                value={newEvent.recurrence?.startYear || newEvent.year || viewYear}
                                                onChange={e => setNewEvent({
                                                    ...newEvent, 
                                                    recurrence: { ...newEvent.recurrence!, type: newEvent.recurrence!.type, startYear: parseInt(e.target.value) }
                                                })}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black uppercase text-muted-foreground flex justify-between items-center">
                                                End Year
                                                <span className="text-[8px] opacity-50">(Optional)</span>
                                            </label>
                                            <Input 
                                                type="number" 
                                                placeholder="Infinity"
                                                className="h-8 text-xs" 
                                                value={newEvent.recurrence?.endYear || ''}
                                                onChange={e => setNewEvent({
                                                    ...newEvent, 
                                                    recurrence: { 
                                                        ...newEvent.recurrence!, 
                                                        type: newEvent.recurrence!.type, 
                                                        endYear: e.target.value ? parseInt(e.target.value) : undefined 
                                                    }
                                                })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setIsAddEventOpen(false)}>Cancel</Button>
                        <Button onClick={handleAddEvent} disabled={!newEvent.name}>Add Event</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    )
}
