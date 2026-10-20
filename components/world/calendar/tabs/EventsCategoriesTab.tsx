'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Plus,
    Trash2,
    Pencil,
    Lock,
    Eye,
    Sparkles,
    Tag,
    Search,
    Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
    FantasyCalendarJSON,
    FantasyEvent,
    FantasyEventCategory,
} from '@/lib/fantasy-calendar/types'
import {
    EVENT_COLOR_OPTIONS,
    getEventColorStyles,
} from '@/lib/fantasy-calendar/presets'
import { describeEventRecurrence } from '@/lib/fantasy-calendar/eventBuilder'
import CalendarEventDialog from '../CalendarEventDialog'

interface EventsCategoriesTabProps {
    draft: FantasyCalendarJSON
    onChange: (updated: FantasyCalendarJSON) => void
}

export default function EventsCategoriesTab({ draft, onChange }: EventsCategoriesTabProps) {
    const events = draft.events || []
    const categories = draft.event_categories || []

    const [searchQuery, setSearchQuery] = useState('')
    const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'public' | 'hidden'>('all')
    const [editingEvent, setEditingEvent] = useState<FantasyEvent | null>(null)
    const [isEventDialogOpen, setIsEventDialogOpen] = useState(false)

    // Category creation state
    const [newCategoryName, setNewCategoryName] = useState('')
    const [newCategoryColor, setNewCategoryColor] = useState('Amber')

    const addCategory = () => {
        if (!newCategoryName.trim()) return
        const newCat: FantasyEventCategory = {
            id: Date.now(),
            name: newCategoryName.trim(),
            category_settings: { color: newCategoryColor, hide: false },
            event_settings: { color: newCategoryColor, hide: false },
        }
        onChange({
            ...draft,
            event_categories: [...categories, newCat],
        })
        setNewCategoryName('')
    }

    const removeCategory = (catId: number | string) => {
        onChange({
            ...draft,
            event_categories: categories.filter((c) => String(c.id) !== String(catId)),
            events: events.map((ev) =>
                String(ev.event_category_id) === String(catId) ? { ...ev, event_category_id: -1 } : ev
            ),
        })
    }

    const handleSaveEvent = (saved: FantasyEvent) => {
        const exists = events.some((e) => String(e.id) === String(saved.id))
        const nextEvents = exists
            ? events.map((e) => (String(e.id) === String(saved.id) ? saved : e))
            : [...events, saved]
        onChange({
            ...draft,
            events: nextEvents,
        })
    }

    const toggleEventHidden = (eventId: number | string) => {
        onChange({
            ...draft,
            events: events.map((ev) =>
                String(ev.id) === String(eventId)
                    ? {
                          ...ev,
                          settings: {
                              ...(ev.settings || {}),
                              hide: !ev.settings?.hide,
                              hide_full: !ev.settings?.hide,
                          },
                      }
                    : ev
            ),
        })
    }

    const deleteEvent = (eventId: number | string) => {
        onChange({
            ...draft,
            events: events.filter((ev) => String(ev.id) !== String(eventId)),
        })
    }

    const filteredEvents = events.filter((ev) => {
        if (visibilityFilter === 'public' && ev.settings?.hide) return false
        if (visibilityFilter === 'hidden' && !ev.settings?.hide) return false
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase()
            return (
                ev.name.toLowerCase().includes(q) ||
                (ev.description || '').toLowerCase().includes(q)
            )
        }
        return true
    })

    return (
        <div className="flex flex-col gap-4">
            {/* Categories Section */}
            <div className="p-4 rounded-lg bg-muted/20 border border-border/50 space-y-3">
                <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-purple-400" />
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider">
                            Event Categories ({categories.length})
                        </h4>
                        <p className="text-[10px] text-muted-foreground">
                            Group events into categories (e.g. Holidays, Lunar Phenomena, Secret GM Timers).
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Input
                        placeholder="New category name..."
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="h-8 text-xs max-w-xs"
                    />
                    <div className="flex items-center gap-1.5">
                        {EVENT_COLOR_OPTIONS.map((opt) => (
                            <button
                                key={opt.name}
                                type="button"
                                title={opt.name}
                                onClick={() => setNewCategoryColor(opt.name)}
                                className={cn(
                                    'w-6 h-6 rounded-full border border-border/50 transition-all',
                                    newCategoryColor === opt.name &&
                                        'ring-2 ring-purple-500 ring-offset-1 ring-offset-background scale-110'
                                )}
                                style={{ backgroundColor: opt.hex }}
                            />
                        ))}
                    </div>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs gap-1"
                        disabled={!newCategoryName.trim()}
                        onClick={addCategory}
                    >
                        <Plus className="h-3.5 w-3.5" /> Add Category
                    </Button>
                </div>

                {categories.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                        {categories.map((cat) => {
                            const colorStyle = getEventColorStyles(
                                cat.category_settings?.color || cat.event_settings?.color
                            )
                            return (
                                <div
                                    key={String(cat.id)}
                                    className={cn(
                                        'inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-bold border',
                                        colorStyle.badgeClass
                                    )}
                                >
                                    <span>{cat.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => removeCategory(cat.id)}
                                        className="opacity-60 hover:opacity-100 text-destructive"
                                        title="Delete Category"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Events Manager Section */}
            <div className="p-4 rounded-lg bg-muted/20 border border-border/50 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-amber-400" />
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider">
                                Custom &amp; Recurring Events ({events.length})
                            </h4>
                            <p className="text-[10px] text-muted-foreground">
                                Manage specific dates, annual holidays, lunar conjunctions, solstices, and hidden GM events.
                            </p>
                        </div>
                    </div>
                    <Button
                        type="button"
                        size="sm"
                        className="h-8 text-xs gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
                        onClick={() => {
                            setEditingEvent(null)
                            setIsEventDialogOpen(true)
                        }}
                    >
                        <Plus className="h-3.5 w-3.5" /> Create Event
                    </Button>
                </div>

                {/* Filter Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="relative flex-grow max-w-xs">
                        <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
                        <Input
                            placeholder="Search events..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-8 pl-8 text-xs"
                        />
                    </div>
                    <div className="flex items-center gap-1">
                        {(['all', 'public', 'hidden'] as const).map((mode) => (
                            <Button
                                key={mode}
                                type="button"
                                size="sm"
                                variant={visibilityFilter === mode ? 'secondary' : 'ghost'}
                                className="h-7 px-2.5 text-[11px] capitalize"
                                onClick={() => setVisibilityFilter(mode)}
                            >
                                {mode === 'hidden' ? '🔒 GM-Only' : mode}
                            </Button>
                        ))}
                    </div>
                </div>

                {filteredEvents.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic text-center py-6">
                        No events match the current filter. Click &ldquo;Create Event&rdquo; to add one.
                    </p>
                ) : (
                    <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-1">
                        {filteredEvents.map((ev) => {
                            const cat = categories.find((c) => String(c.id) === String(ev.event_category_id))
                            const colorStyle = getEventColorStyles(
                                ev.settings?.color || cat?.event_settings?.color
                            )
                            const isHidden = Boolean(ev.settings?.hide)
                            const recurrenceText = describeEventRecurrence(ev, draft)

                            return (
                                <div
                                    key={String(ev.id)}
                                    className="p-3 rounded-md bg-card/70 border border-border/50 flex items-start justify-between gap-3"
                                >
                                    <div className="space-y-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span
                                                className={cn(
                                                    'w-2.5 h-2.5 rounded-full shrink-0',
                                                    colorStyle.dotClass
                                                )}
                                            />
                                            <span className="text-xs font-bold text-foreground">
                                                {ev.name}
                                            </span>
                                            {cat && (
                                                <span
                                                    className={cn(
                                                        'text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border',
                                                        colorStyle.badgeClass
                                                    )}
                                                >
                                                    {cat.name}
                                                </span>
                                            )}
                                            {isHidden && (
                                                <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30">
                                                    <Lock className="h-2.5 w-2.5" /> GM-Only
                                                </span>
                                            )}
                                            {ev.data?.has_duration && Number(ev.data?.duration) > 1 && (
                                                <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                                    <Clock className="h-2.5 w-2.5" /> {ev.data.duration}d
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-purple-300/90 font-medium">
                                            {recurrenceText}
                                        </p>
                                        {ev.description && (
                                            <p className="text-[11px] text-muted-foreground line-clamp-2">
                                                {ev.description.replace(/<[^>]+>/g, '')}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            title={isHidden ? 'Make Public' : 'Hide from Players (GM-Only)'}
                                            onClick={() => toggleEventHidden(ev.id)}
                                        >
                                            {isHidden ? (
                                                <Lock className="h-3.5 w-3.5 text-rose-400" />
                                            ) : (
                                                <Eye className="h-3.5 w-3.5 text-emerald-400" />
                                            )}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            title="Edit Event"
                                            onClick={() => {
                                                setEditingEvent(ev)
                                                setIsEventDialogOpen(true)
                                            }}
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-destructive hover:text-destructive"
                                            title="Delete Event"
                                            onClick={() => deleteEvent(ev.id)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            <CalendarEventDialog
                open={isEventDialogOpen}
                onOpenChange={setIsEventDialogOpen}
                calendar={draft}
                initialEvent={editingEvent}
                onSave={handleSaveEvent}
            />
        </div>
    )
}
