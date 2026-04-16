'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Reorder, AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Plus, X, GripVertical, Sword, Clock, Play, Pause, Minus, CalendarDays, Calendar as CalendarIcon, Info, ArrowLeft, ArrowRight, Flag, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

interface InitiativeItem {
    id: string;
    name: string;
}

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
        months: {
            name: string;
            length: number;
            type: string;
        }[];
        weekdays: string[];
    };
    events: CalendarEvent[];
}

interface ToolSidebarProps {
    sessionId: Id<'sessions'>;
    worldId: Id<'worlds'>;
    worldName: string;
    characters: { id: string; name: string }[];
    isAdmin: boolean;
}

export default function ToolSidebar({ sessionId, worldId, worldName, characters, isAdmin }: ToolSidebarProps) {
    const storageKey = `initiative-tracker-${sessionId}`
    const timeStorageKey = `world-time-${sessionId}`
    
    const [activeTab, setActiveTab] = useState<'initiative' | 'clock'>('initiative')
    const [isMounted, setIsMounted] = useState(false)

    const world = useQuery(api.worlds.getWorld, { worldId })
    const session = useQuery(api.sessions.getSession, { sessionId })
    const worldSessions = useQuery(api.worlds.getSessionsByWorld, { worldId })
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
                static_data: staticData
            } as FantasyCalendarJSON
        } catch (e) {
            return null
        }
    }, [world?.calendar])

    // --- Initiative State ---
    const [items, setItems] = useState<InitiativeItem[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [round, setRound] = useState(1)
    const [isAdding, setIsAdding] = useState(false)
    const [newName, setNewName] = useState('')

    // --- Time State ---
    const [timeSeconds, setTimeSeconds] = useState(9 * 3600) // Default to 09:00:00 (32400 seconds)
    const [isClockRunning, setIsClockRunning] = useState(false)
    const [multiplier, setMultiplier] = useState(1)
    const [adjustmentAmount, setAdjustmentAmount] = useState(1)
    const [adjustmentUnit, setAdjustmentUnit] = useState<'s' | 'm' | 'h'>('m')
    const [isEditingTime, setIsEditingTime] = useState(false)
    const [editingTimeValue, setEditingTimeValue] = useState('')
    const lastTickRef = useRef<number | null>(null)

    // Source of truth for date is now the world object directly
    const currentDate = useMemo(() => {
        if (!calendarConfig) return null
        return {
            year: calendarConfig.dynamic_data.year,
            month: calendarConfig.dynamic_data.month,
            day: calendarConfig.dynamic_data.day
        }
    }, [calendarConfig])

    // Load states on mount
    useEffect(() => {
        const savedInitiative = localStorage.getItem(storageKey)
        if (savedInitiative) {
            try {
                const { items: savedItems, currentIndex: savedIndex, round: savedRound } = JSON.parse(savedInitiative)
                setItems(savedItems)
                setCurrentIndex(savedIndex)
                setRound(savedRound)
            } catch (e) { console.error('Failed to load initiative', e) }
        }

        const savedTime = localStorage.getItem(timeStorageKey)
        if (savedTime) {
            try {
                const { seconds, multiplier: savedMult } = JSON.parse(savedTime)
                setTimeSeconds(seconds)
                setMultiplier(savedMult || 1)
            } catch (e) { console.error('Failed to load time', e) }
        }
        setIsMounted(true)
    }, [storageKey, timeStorageKey])

    // Save states
    useEffect(() => {
        if (!isMounted) return
        localStorage.setItem(storageKey, JSON.stringify({ items, currentIndex, round }))
    }, [items, currentIndex, round, storageKey, isMounted])

    useEffect(() => {
        if (!isMounted) return
        localStorage.setItem(timeStorageKey, JSON.stringify({ seconds: timeSeconds, multiplier }))
    }, [timeSeconds, multiplier, timeStorageKey, isMounted])

    const saveDateToWorld = useCallback(async (year: number, month: number, day: number) => {
        if (!calendarConfig) return
        try {
            const updatedConfig = {
                ...calendarConfig,
                dynamic_data: {
                    ...calendarConfig.dynamic_data,
                    year,
                    month,
                    day
                }
            }
            await updateWorldCalendar({
                worldId,
                calendar: JSON.stringify(updatedConfig)
            })
        } catch (e) {
            console.error('Failed to update world calendar', e)
        }
    }, [calendarConfig, worldId, updateWorldCalendar])

    const setSessionStart = useCallback(async () => {
        if (!currentDate) return
        try {
            await updateInGameDate({
                sessionId,
                inGameDate: {
                    ...session?.inGameDate,
                    year: currentDate.year,
                    month: currentDate.month,
                    day: currentDate.day
                }
            })
            toast.success("Session start date set")
        } catch (e) {
            toast.error("Failed to set session start")
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
                    endDay: currentDate.day
                }
            })
            toast.success("Session end date set")
        } catch (e) {
            toast.error("Failed to set session end")
        }
    }, [currentDate, sessionId, session?.inGameDate, updateInGameDate])

    const timeRef = useRef(timeSeconds)
    useEffect(() => {
        timeRef.current = timeSeconds
    }, [timeSeconds])

    const incrementDay = useCallback(() => {
        if (!calendarConfig || !currentDate) return
        let { year, month, day } = currentDate
        
        // Ensure month is within bounds
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
            
            // Fallback to month 0 if the index is still invalid
            if (month < 0 || month >= calendarConfig.static_data.n_months) {
                month = 0
            }
            
            const monthConfig = calendarConfig.static_data.months[month]
            day = monthConfig?.length || 1
        }
        saveDateToWorld(year, month, day)
    }, [calendarConfig, currentDate, saveDateToWorld])

    // Clock Logic
    useEffect(() => {
        if (!isClockRunning || !calendarConfig) {
            lastTickRef.current = null
            return
        }

        let rafId: number
        const tick = (now: number) => {
            if (lastTickRef.current === null) {
                lastTickRef.current = now
            } else {
                const delta = (now - lastTickRef.current) / 1000 // seconds passed
                lastTickRef.current = now
                
                const prev = timeRef.current
                const step = delta * multiplier
                let next = prev + step
                
                if (next >= 86400) {
                    incrementDay()
                    next -= 86400
                } else if (next < 0) {
                    decrementDay()
                    next += 86400
                }
                setTimeSeconds(next)
            }
            rafId = requestAnimationFrame(tick)
        }

        rafId = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(rafId)
    }, [isClockRunning, multiplier, calendarConfig, incrementDay, decrementDay])

    // Sync initiative characters
    useEffect(() => {
        if (!isMounted) return
        setItems(prevItems => {
            const existingIds = new Set(prevItems.map(item => item.id))
            const newChars = characters.filter(char => !existingIds.has(char.id))
            if (newChars.length === 0) return prevItems
            return [...prevItems, ...newChars]
        })
    }, [characters, isMounted])

    const formatTime = (totalSeconds: number) => {
        const s = Math.floor(totalSeconds % 60)
        const m = Math.floor((totalSeconds / 60) % 60)
        const h = Math.floor((totalSeconds / 3600) % 24)
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }

    const adjustTime = (amount: number, unit?: 's' | 'm' | 'h') => {
        const activeUnit = unit || adjustmentUnit
        const factor = activeUnit === 's' ? 1 : activeUnit === 'm' ? 60 : 3600
        setTimeSeconds(prev => {
            let next = prev + (amount * factor)
            
            // Handle day transitions for manual adjustment
            while (next >= 86400) {
                incrementDay()
                next -= 86400
            }
            while (next < 0) {
                decrementDay()
                next += 86400
            }
            return next
        })
    }

    const handleSaveTime = () => {
        const parts = editingTimeValue.split(':').map(Number)
        let h = 0, m = 0, s = 0
        if (parts.length >= 1 && !isNaN(parts[0])) h = parts[0]
        if (parts.length >= 2 && !isNaN(parts[1])) m = parts[1]
        if (parts.length >= 3 && !isNaN(parts[2])) s = parts[2]
        h = Math.max(0, Math.min(23, h))
        m = Math.max(0, Math.min(59, m))
        s = Math.max(0, Math.min(59, s))
        setTimeSeconds((h * 3600) + (m * 60) + s)
        setIsEditingTime(false)
    }

    const handleNext = useCallback(() => {
        if (items.length === 0) return
        if (currentIndex >= items.length - 1) {
            setCurrentIndex(0)
            setRound(r => r + 1)
            // Add 6 seconds per round if clock is paused
            if (!isClockRunning) {
                adjustTime(6, 's')
            }
        } else {
            setCurrentIndex(i => i + 1)
        }
    }, [items.length, currentIndex, isClockRunning, calendarConfig])

    const handlePrev = useCallback(() => {
        if (items.length === 0) return
        if (currentIndex <= 0) {
            if (round > 1) {
                setCurrentIndex(items.length - 1)
                setRound(r => r - 1)
            }
        } else {
            setCurrentIndex(i => i - 1)
        }
    }, [items.length, currentIndex, round])

    const addItem = () => {
        if (!newName.trim()) return
        const newItem = { id: `custom-${Date.now()}`, name: newName.trim() }
        setItems([...items, newItem])
        setNewName('')
        setIsAdding(false)
    }

    const removeItem = (id: string) => {
        const indexToRemove = items.findIndex(item => item.id === id)
        if (indexToRemove === -1) return
        const newItems = items.filter(item => item.id !== id)
        setItems(newItems)
        if (indexToRemove < currentIndex) {
            setCurrentIndex(currentIndex - 1)
        } else if (indexToRemove === currentIndex && currentIndex >= newItems.length && newItems.length > 0) {
            setCurrentIndex(0)
        }
    }

    // --- Calendar Tool Helpers ---
    const checkEventOccurs = (event: CalendarEvent, y: number, m: number, d: number) => {
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
        return event.year === y && event.month === m && event.day === d
    }

    const checkSessionOccurs = (session: any, y: number, m: number, d: number) => {
        if (!session.inGameDate) return false
        const start = session.inGameDate
        
        if (!start.endDay) {
            return start.year === y && start.month === m && start.day === d
        }

        const currentTotal = (y * 10000) + (m * 100) + d
        const startTotal = (start.year * 10000) + (start.month * 100) + start.day
        const endTotal = (start.endYear! * 10000) + (start.endMonth! * 100) + start.endDay!

        return currentTotal >= startTotal && currentTotal <= endTotal
    }

    const todayEvents = useMemo(() => {
        if (!calendarConfig || !currentDate) return []
        const events = calendarConfig.events
            .filter(e => checkEventOccurs(e, currentDate.year, currentDate.month, currentDate.day))
            .map(e => ({ ...e, type: 'event' as const }))
        
        const sessions = (worldSessions || [])
            .filter(s => checkSessionOccurs(s, currentDate.year, currentDate.month, currentDate.day))
            .map(s => ({ 
                id: s._id, 
                name: s.quest?.name || "Session", 
                type: 'session' as const,
                description: s.characterNames?.join(', ') || 'No attendees'
            }))

        return [...events, ...sessions]
    }, [calendarConfig, currentDate, worldSessions])

    const upcomingEvents = useMemo(() => {
        if (!calendarConfig || !currentDate) return []
        const results: { item: any, date: { year: number, month: number, day: number }, type: 'event' | 'session' }[] = []
        
        const checkDate = { ...currentDate }
        // Look ahead up to 1 year
        for (let i = 1; i < 366 && results.length < 5; i++) {
            // Increment checkDate
            checkDate.day++
            const monthLen = calendarConfig.static_data.months[checkDate.month]?.length
            if (monthLen === undefined) break 
            
            if (checkDate.day > monthLen) {
                checkDate.day = 1
                checkDate.month++
                if (checkDate.month >= calendarConfig.static_data.n_months) {
                    checkDate.month = 0
                    checkDate.year++
                }
            }

            const dayEvents = calendarConfig.events.filter(e => checkEventOccurs(e, checkDate.year, checkDate.month, checkDate.day))
            dayEvents.forEach(e => {
                if (results.length < 5) {
                    results.push({ item: e, date: { ...checkDate }, type: 'event' })
                }
            })

            const daySessions = (worldSessions || []).filter(s => checkSessionOccurs(s, checkDate.year, checkDate.month, checkDate.day))
            daySessions.forEach(s => {
                if (results.length < 5) {
                    results.push({ 
                        item: { id: s._id, name: s.quest?.name || "Session" }, 
                        date: { ...checkDate }, 
                        type: 'session' 
                    })
                }
            })
        }
        return results.slice(0, 5)
    }, [calendarConfig, currentDate, worldSessions])

    const isSessionStart = useMemo(() => {
        if (!currentDate || !session?.inGameDate) return false
        return session.inGameDate.year === currentDate.year && 
               session.inGameDate.month === currentDate.month && 
               session.inGameDate.day === currentDate.day
    }, [currentDate, session?.inGameDate])

    const isSessionEnd = useMemo(() => {
        if (!currentDate || !session?.inGameDate?.endDay) return false
        return session.inGameDate.endYear === currentDate.year && 
               session.inGameDate.endMonth === currentDate.month && 
               session.inGameDate.endDay === currentDate.day
    }, [currentDate, session?.inGameDate])

    if (!isMounted) return null

    return (
        <div className="flex flex-col gap-4 w-full h-full overflow-y-auto">
            {/* Tab Switcher */}
            <div className="flex bg-muted/50 p-1 rounded-lg border border-border/50">
                <button
                    onClick={() => setActiveTab('initiative')}
                    className={cn(
                        "flex-grow flex items-center justify-center py-1.5 rounded-md transition-all",
                        activeTab === 'initiative' ? "bg-card shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    <Sword className="h-4 w-4" />
                </button>
                <button
                    onClick={() => setActiveTab('clock')}
                    className={cn(
                        "flex-grow flex items-center justify-center py-1.5 rounded-md transition-all",
                        activeTab === 'clock' ? "bg-card shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    <Clock className="h-4 w-4" />
                </button>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'initiative' && (
                    <motion.div
                        key="initiative"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.15 }}
                        className="flex flex-col gap-4"
                    >
                        <div className="flex flex-col gap-2 bg-muted/30 p-2 rounded-lg border border-border/50">
                            <div className="flex items-center justify-between px-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Round {round}</span>
                                <span className="text-[10px] font-bold text-muted-foreground">{items.length > 0 ? currentIndex + 1 : 0}/{items.length}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrev} disabled={items.length === 0 || (round === 1 && currentIndex === 0)}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <div className="flex-grow text-center text-xs font-bold truncate px-1">
                                    {items[currentIndex]?.name || "Empty"}
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNext} disabled={items.length === 0}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <Reorder.Group axis="y" values={items} onReorder={setItems} className="flex flex-col gap-2">
                            <AnimatePresence initial={false}>
                                {items.map((item, index) => (
                                    <Reorder.Item
                                        key={item.id}
                                        value={item}
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className={cn(
                                            "relative group flex items-center gap-2 p-2 rounded-md border text-sm transition-all bg-card cursor-grab active:cursor-grabbing",
                                            index === currentIndex ? "bg-[rgba(147,51,234,0.1)] border-2 border-[#D8B4FE] shadow-sm z-10" : "border-border/50 hover:border-border"
                                        )}
                                    >
                                        <GripVertical className="h-3 w-3 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors shrink-0" />
                                        <span className="flex-grow truncate font-medium">{item.name}</span>
                                        <button onClick={(e) => { e.stopPropagation(); removeItem(item.id); }} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-all shrink-0">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Reorder.Item>
                                ))}
                            </AnimatePresence>
                        </Reorder.Group>

                        {isAdding ? (
                            <div className="flex flex-col gap-2 p-2 bg-muted/20 rounded-md border border-dashed border-border animate-in fade-in slide-in-from-top-1">
                                <Input autoFocus size={1} className="h-7 text-xs" placeholder="Name..." value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addItem(); if (e.key === 'Escape') setIsAdding(false); }} />
                                <div className="flex gap-1">
                                    <Button size="sm" className="h-6 flex-grow text-[10px]" onClick={addItem}>Add</Button>
                                    <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setIsAdding(false)}>Cancel</Button>
                                </div>
                            </div>
                        ) : (
                            <Button variant="ghost" className="h-9 border border-dashed border-border/50 hover:border-border hover:bg-muted/30 text-muted-foreground text-xs" onClick={() => setIsAdding(true)}>
                                <Plus className="h-3 w-3 mr-2" /> Add Entry
                            </Button>
                        )}
                    </motion.div>
                )}

                {activeTab === 'clock' && (
                    <motion.div
                        key="clock"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.15 }}
                        className="flex flex-col gap-4"
                    >
                        <div className="flex flex-col gap-4">
                            <div className="p-3 bg-muted/30 rounded-lg border border-border/50 text-center">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">World Time</p>
                                {isEditingTime ? (
                                    <input 
                                        autoFocus
                                        className="text-2xl font-mono font-bold tracking-tighter tabular-nums w-full bg-transparent border-none text-center focus:ring-0 focus:outline-none p-0"
                                        value={editingTimeValue}
                                        onChange={(e) => setEditingTimeValue(e.target.value)}
                                        onBlur={handleSaveTime}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSaveTime()
                                            if (e.key === 'Escape') setIsEditingTime(false)
                                        }}
                                    />
                                ) : (
                                    <div 
                                        className="text-2xl font-mono font-bold tracking-tighter tabular-nums cursor-pointer hover:text-primary transition-colors"
                                        onClick={() => {
                                            setEditingTimeValue(formatTime(timeSeconds))
                                            setIsEditingTime(true)
                                        }}
                                    >
                                        {formatTime(timeSeconds)}
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col gap-2 p-2 rounded-lg border border-border/50 bg-card shadow-sm">
                                <div className="flex items-center gap-1">
                                    <Button variant="outline" size="icon" className="h-8 w-8 shrink-0 hover:bg-destructive/5 hover:text-destructive" onClick={() => adjustTime(-adjustmentAmount)}>
                                        <Minus className="h-3 w-3" />
                                    </Button>
                                    <div className="flex-grow flex items-center bg-muted/20 rounded border border-border/50 px-2 h-8">
                                        <input 
                                            type="number"
                                            className="w-full bg-transparent border-none text-xs font-bold text-center focus:ring-0 focus:outline-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            value={adjustmentAmount}
                                            onChange={(e) => setAdjustmentAmount(Number(e.target.value))}
                                        />
                                        <select 
                                            className="text-[8px] font-black text-muted-foreground bg-transparent border-none focus:ring-0 focus:outline-none cursor-pointer p-0 ml-1 hover:text-foreground transition-colors appearance-none text-right pr-0"
                                            value={adjustmentUnit}
                                            onChange={(e) => setAdjustmentUnit(e.target.value as 's' | 'm' | 'h')}
                                        >
                                            <option value="s">S</option>
                                            <option value="m">MIN</option>
                                            <option value="h">HRS</option>
                                        </select>
                                    </div>
                                    <Button variant="outline" size="icon" className="h-8 w-8 shrink-0 hover:bg-primary/5 hover:text-primary" onClick={() => adjustTime(adjustmentAmount)}>
                                        <Plus className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 p-2 rounded-lg border border-border/50 bg-card shadow-sm">
                                <div className="flex items-center gap-2">
                                    <Button 
                                        variant={isClockRunning ? "destructive" : "default"} 
                                        size="icon" 
                                        className="h-10 w-10 shrink-0"
                                        onClick={() => setIsClockRunning(!isClockRunning)}
                                    >
                                        {isClockRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
                                    </Button>
                                    <div className="flex-grow flex flex-col gap-1">
                                        <span className="text-[8px] font-bold text-muted-foreground uppercase ml-1 tracking-wider">Multiplier</span>
                                        <div className="flex items-center bg-muted/20 rounded border border-border/50 px-2 h-6">
                                            <input 
                                                type="number"
                                                step="0.1"
                                                className="w-full bg-transparent border-none text-[10px] font-bold text-center focus:ring-0 focus:outline-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                value={multiplier}
                                                onChange={(e) => setMultiplier(Number(e.target.value))}
                                            />
                                            <span className="text-[8px] font-bold text-muted-foreground ml-1">X</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Calendar Tool */}
                        <div className="flex flex-col gap-2 p-3 bg-muted/30 rounded-lg border border-border/50">
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <CalendarDays className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">World Calendar</span>
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
                                            disabled={!isAdmin && world?.owner !== session?.owner}
                                        >
                                            <ArrowLeft className="h-4 w-4" />
                                        </Button>
                                        <div className="flex-grow text-center py-2 bg-card rounded border border-border/50 shadow-sm">
                                            <div className="text-sm font-black text-foreground">
                                                {currentDate.day} {calendarConfig.static_data.months[currentDate.month]?.name || 'Unknown Month'}
                                            </div>
                                            <div className="text-[10px] font-bold text-muted-foreground">
                                                Year {currentDate.year}
                                            </div>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8 shrink-0"
                                            onClick={incrementDay}
                                            disabled={!isAdmin && world?.owner !== session?.owner}
                                        >
                                            <ArrowRight className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    {/* Session Range Controls */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button
                                            variant={isSessionStart ? "default" : "outline"}
                                            size="sm"
                                            className={cn(
                                                "h-7 text-[10px] font-black uppercase tracking-tighter transition-colors",
                                                isSessionStart && "bg-purple-600 hover:bg-purple-700 text-white border-purple-400"
                                            )}
                                            onClick={setSessionStart}
                                        >
                                            <Flag className={cn("h-2 w-2 mr-1", isSessionStart ? "text-white" : "text-primary")} /> Start
                                        </Button>
                                        <Button
                                            variant={isSessionEnd ? "default" : "outline"}
                                            size="sm"
                                            className={cn(
                                                "h-7 text-[10px] font-black uppercase tracking-tighter transition-colors",
                                                isSessionEnd && "bg-purple-600 hover:bg-purple-700 text-white border-purple-400"
                                            )}
                                            onClick={setSessionEnd}
                                        >
                                            <CheckCircle2 className={cn("h-2 w-2 mr-1", isSessionEnd ? "text-white" : "text-primary")} /> End
                                        </Button>
                                    </div>

                                    {/* Today's Events */}
                                    {todayEvents.length > 0 && (
                                        <div className="space-y-1.5">
                                            <p className="text-[11px] font-black uppercase tracking-tighter text-muted-foreground ml-1">Today&apos;s Events</p>
                                            <div className="space-y-1">
                                                {todayEvents.map(e => (
                                                    <div key={e.id} className={cn(
                                                        "flex items-center gap-2 p-2 rounded border transition-colors",
                                                        e.type === 'session' ? "bg-purple-500/10 border-purple-500/30" : "bg-primary/5 border-primary/20"
                                                    )}>
                                                        <div className={cn("h-2 w-2 rounded-full shrink-0", e.type === 'session' ? "bg-purple-500" : "bg-primary")} />
                                                        <span className="text-sm font-bold truncate flex-grow">{e.name}</span>
                                                        {e.description && (
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Info className="h-4 w-4 text-muted-foreground/50" />
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p className="text-xs max-w-[200px]">{e.description}</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Upcoming Events */}
                                    {upcomingEvents.length > 0 && (
                                        <div className="space-y-1.5">
                                            <p className="text-[11px] font-black uppercase tracking-tighter text-muted-foreground ml-1">Upcoming</p>
                                            <div className="flex flex-col gap-1.5">
                                                {upcomingEvents.map(({ item, date, type }, idx) => (
                                                    <div key={`${item.id}-${idx}`} className={cn(
                                                        "flex items-center gap-2.5 p-2 rounded border transition-colors",
                                                        type === 'session' ? "bg-purple-500/5 border-purple-500/20" : "bg-muted/20 border-border/50"
                                                    )}>
                                                        <div className="flex flex-col items-center justify-center min-w-[40px] h-10 bg-background rounded border border-border/50 shrink-0">
                                                            <span className="text-xs font-black leading-none">{date.day}</span>
                                                            <span className="text-[10px] font-bold uppercase text-muted-foreground leading-none">{(calendarConfig.static_data.months[date.month]?.name || '???').slice(0, 3)}</span>
                                                        </div>
                                                        <div className="flex flex-col min-w-0 flex-grow">
                                                            <span className="text-sm font-bold truncate">{item.name}</span>
                                                            <span className="text-[10px] text-muted-foreground truncate">Year {date.year}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
