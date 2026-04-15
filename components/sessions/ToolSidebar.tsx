'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Reorder, AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Plus, X, GripVertical, Sword, Clock, Play, Pause, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface InitiativeItem {
    id: string;
    name: string;
}

interface ToolSidebarProps {
    sessionId: string;
    worldName: string;
    characters: { id: string; name: string }[];
}

export default function ToolSidebar({ sessionId, worldName, characters }: ToolSidebarProps) {
    const storageKey = `initiative-tracker-${sessionId}`
    const timeStorageKey = `world-time-${sessionId}`
    
    const [activeTab, setActiveTab] = useState<'initiative' | 'clock'>('initiative')
    const [isMounted, setIsMounted] = useState(false)

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

    // Clock Logic
    useEffect(() => {
        if (!isClockRunning) {
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
                
                setTimeSeconds(prev => {
                    const next = prev + (delta * multiplier)
                    return next % 86400 // Wrap around 24h
                })
            }
            rafId = requestAnimationFrame(tick)
        }

        rafId = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(rafId)
    }, [isClockRunning, multiplier])

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

    const adjustTime = (amount: number) => {
        const factor = adjustmentUnit === 's' ? 1 : adjustmentUnit === 'm' ? 60 : 3600
        setTimeSeconds(prev => {
            let next = prev + (amount * factor)
            if (next < 0) {
                // Handle negative wrap properly
                next = (86400 + (next % 86400)) % 86400
            }
            return next % 86400
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
                setTimeSeconds(prev => (prev + 6) % 86400)
            }
        } else {
            setCurrentIndex(i => i + 1)
        }
    }, [items.length, currentIndex, isClockRunning])

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

    if (!isMounted) return null

    return (
        <div className="flex flex-col gap-4 w-full">
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
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
