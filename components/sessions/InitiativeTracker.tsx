'use client'

import { useState, useEffect, useCallback } from 'react'
import { Reorder, AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Plus, X, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface InitiativeItem {
    id: string;
    name: string;
}

interface InitiativeTrackerProps {
    sessionId: string;
    characters: { id: string; name: string }[];
}

export default function InitiativeTracker({ sessionId, characters }: InitiativeTrackerProps) {
    const storageKey = `initiative-tracker-${sessionId}`
    
    const [items, setItems] = useState<InitiativeItem[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [round, setRound] = useState(1)
    const [isAdding, setIsAdding] = useState(false)
    const [newName, setNewName] = useState('')
    const [isMounted, setIsMounted] = useState(false)

    // Load from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem(storageKey)
        if (saved) {
            try {
                const { items: savedItems, currentIndex: savedIndex, round: savedRound } = JSON.parse(saved)
                setItems(savedItems)
                setCurrentIndex(savedIndex)
                setRound(savedRound)
            } catch (e) {
                console.error('Failed to load initiative tracker state', e)
            }
        }
        setIsMounted(true)
    }, [storageKey])

    // Save to localStorage on change
    useEffect(() => {
        if (!isMounted) return
        localStorage.setItem(storageKey, JSON.stringify({ items, currentIndex, round }))
    }, [items, currentIndex, round, storageKey, isMounted])

    // Sync with characters prop
    useEffect(() => {
        if (!isMounted) return
        
        setItems(prevItems => {
            const existingIds = new Set(prevItems.map(item => item.id))
            const newChars = characters.filter(char => !existingIds.has(char.id))
            
            if (newChars.length === 0) return prevItems
            
            return [...prevItems, ...newChars]
        })
    }, [characters, isMounted])

    const handleNext = useCallback(() => {
        if (items.length === 0) return
        if (currentIndex >= items.length - 1) {
            setCurrentIndex(0)
            setRound(r => r + 1)
        } else {
            setCurrentIndex(i => i + 1)
        }
    }, [items.length, currentIndex])

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
        const newItem = {
            id: `custom-${Date.now()}`,
            name: newName.trim()
        }
        setItems([...items, newItem])
        setNewName('')
        setIsAdding(false)
    }

    const removeItem = (id: string) => {
        const indexToRemove = items.findIndex(item => item.id === id)
        if (indexToRemove === -1) return

        const newItems = items.filter(item => item.id !== id)
        setItems(newItems)

        // Adjust currentIndex if necessary
        if (indexToRemove < currentIndex) {
            setCurrentIndex(currentIndex - 1)
        } else if (indexToRemove === currentIndex) {
            if (currentIndex >= newItems.length && newItems.length > 0) {
                setCurrentIndex(0)
            }
        }
    }

    if (!isMounted) return null

    return (
        <div className="flex flex-col gap-4 w-full max-w-[200px]">
            {/* Top Controls */}
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

            {/* Initiative List */}
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
                                index === currentIndex 
                                    ? "bg-[rgba(147,51,234,0.1)] border-2 border-[#D8B4FE] shadow-sm z-10" 
                                    : "border-border/50 hover:border-border"
                            )}
                        >
                            <GripVertical className="h-3 w-3 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors shrink-0" />
                            <span className="flex-grow truncate font-medium">{item.name}</span>
                            <button 
                                onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-all shrink-0"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Reorder.Item>
                    ))}
                </AnimatePresence>
            </Reorder.Group>

            {/* Add Person */}
            {isAdding ? (
                <div className="flex flex-col gap-2 p-2 bg-muted/20 rounded-md border border-dashed border-border animate-in fade-in slide-in-from-top-1">
                    <Input 
                        autoFocus
                        size={1}
                        className="h-7 text-xs" 
                        placeholder="Name..." 
                        value={newName} 
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') addItem()
                            if (e.key === 'Escape') setIsAdding(false)
                        }}
                    />
                    <div className="flex gap-1">
                        <Button size="sm" className="h-6 flex-grow text-[10px]" onClick={addItem}>Add</Button>
                        <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setIsAdding(false)}>Cancel</Button>
                    </div>
                </div>
            ) : (
                <Button 
                    variant="ghost" 
                    className="h-9 border border-dashed border-border/50 hover:border-border hover:bg-muted/30 text-muted-foreground text-xs"
                    onClick={() => setIsAdding(true)}
                >
                    <Plus className="h-3 w-3 mr-2" />
                    Add Entry
                </Button>
            )}
        </div>
    )
}
