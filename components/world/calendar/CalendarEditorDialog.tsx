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
import { Textarea } from '@/components/ui/textarea'
import {
    Calendar as CalendarIcon,
    CalendarDays,
    Sun,
    Moon as MoonIcon,
    Sparkles,
    FileCode2,
    Upload,
    Download,
    Check,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { FantasyCalendarJSON, normalizeCalendarJSON } from '@/lib/fantasy-calendar/types'
import { CALENDAR_TEMPLATES } from '@/lib/fantasy-calendar/presets'
import { clone } from '@/lib/fantasy-calendar/utils'
import GeneralErasTab from './tabs/GeneralErasTab'
import MonthsWeekdaysTab from './tabs/MonthsWeekdaysTab'
import SeasonsClimateTab from './tabs/SeasonsClimateTab'
import MoonsTab from './tabs/MoonsTab'
import EventsCategoriesTab from './tabs/EventsCategoriesTab'

export type EditorTabId = 'general' | 'structure' | 'seasons' | 'moons' | 'events' | 'io'

interface CalendarEditorDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    worldName: string
    initialCalendar: FantasyCalendarJSON | null
    defaultTab?: EditorTabId
    onSave: (updated: FantasyCalendarJSON) => Promise<void>
}

const EDITOR_TABS: { id: EditorTabId; label: string; icon: any }[] = [
    { id: 'general', label: 'General & Eras', icon: CalendarIcon },
    { id: 'structure', label: 'Months & Weekdays', icon: CalendarDays },
    { id: 'seasons', label: 'Seasons & Climate', icon: Sun },
    { id: 'moons', label: 'Moons', icon: MoonIcon },
    { id: 'events', label: 'Events', icon: Sparkles },
    { id: 'io', label: 'Templates & JSON', icon: FileCode2 },
]

export default function CalendarEditorDialog({
    open,
    onOpenChange,
    worldName,
    initialCalendar,
    defaultTab = 'general',
    onSave,
}: CalendarEditorDialogProps) {
    const [activeTab, setActiveTab] = useState<EditorTabId>(defaultTab)
    const [draft, setDraft] = useState<FantasyCalendarJSON>(() =>
        initialCalendar
            ? normalizeCalendarJSON(clone(initialCalendar))
            : CALENDAR_TEMPLATES[0].build(worldName)
    )
    const [jsonText, setJsonText] = useState('')
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (!open) return
        setActiveTab(defaultTab)
        const base = initialCalendar
            ? normalizeCalendarJSON(clone(initialCalendar))
            : CALENDAR_TEMPLATES[0].build(worldName)
        setDraft(base)
        setJsonText('')
    }, [open, initialCalendar, worldName, defaultTab])

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const normalized = normalizeCalendarJSON(draft)
            await onSave(normalized)
            toast.success('World calendar saved!')
            onOpenChange(false)
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to save calendar')
        } finally {
            setIsSaving(false)
        }
    }

    const handleImportRawJSON = () => {
        try {
            const parsed = JSON.parse(jsonText)
            const normalized = normalizeCalendarJSON(parsed)
            setDraft(normalized)
            setJsonText('')
            setActiveTab('general')
            toast.success('JSON loaded into editor! Review and click Save Calendar.')
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Invalid JSON format')
        }
    }

    const handleExportJSON = () => {
        const normalized = normalizeCalendarJSON(draft)
        const blob = new Blob([JSON.stringify(normalized, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${(normalized.name || worldName || 'calendar').toLowerCase().replace(/\s+/g, '-')}-calendar.json`
        a.click()
        URL.revokeObjectURL(url)
        toast.success('Exported calendar JSON!')
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="px-6 pt-5 pb-3 border-b border-border/50 bg-muted/10 shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-lg">
                        <CalendarIcon className="h-5 w-5 text-purple-400" />
                        World Calendar Editor — {draft.name || worldName}
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Customize eras, months, weekdays, seasons with sunrise/sunset, regional climates, multiple moon cycles, and recurring events.
                    </DialogDescription>

                    {/* Tab Navigation */}
                    <div className="flex flex-wrap gap-1.5 pt-2">
                        {EDITOR_TABS.map((t) => {
                            const Icon = t.icon
                            const isActive = activeTab === t.id
                            return (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => setActiveTab(t.id)}
                                    className={cn(
                                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold border transition-all',
                                        isActive
                                            ? 'bg-purple-500/20 border-purple-500 text-purple-200 shadow-sm'
                                            : 'bg-card/60 border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted/40'
                                    )}
                                >
                                    <Icon className="h-3.5 w-3.5" />
                                    {t.label}
                                </button>
                            )
                        })}
                    </div>
                </DialogHeader>

                {/* Scrollable Body */}
                <div className="flex-grow overflow-y-auto px-6 py-4">
                    {activeTab === 'general' && <GeneralErasTab draft={draft} onChange={setDraft} />}
                    {activeTab === 'structure' && <MonthsWeekdaysTab draft={draft} onChange={setDraft} />}
                    {activeTab === 'seasons' && <SeasonsClimateTab draft={draft} onChange={setDraft} />}
                    {activeTab === 'moons' && <MoonsTab draft={draft} onChange={setDraft} />}
                    {activeTab === 'events' && <EventsCategoriesTab draft={draft} onChange={setDraft} />}

                    {activeTab === 'io' && (
                        <div className="flex flex-col gap-4">
                            {/* Starter Templates */}
                            <div className="p-4 rounded-lg bg-muted/20 border border-border/50 space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider">
                                    Calendar Starter Templates
                                </h4>
                                <p className="text-[11px] text-muted-foreground">
                                    Load a pre-configured fantasy calendar template into the editor. You can freely customize all fields after loading.
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    {CALENDAR_TEMPLATES.map((tpl) => (
                                        <div
                                            key={tpl.id}
                                            className="p-3 rounded-lg bg-card/70 border border-border/50 flex flex-col justify-between gap-2"
                                        >
                                            <div className="space-y-1">
                                                <h5 className="text-xs font-bold text-foreground">{tpl.name}</h5>
                                                <p className="text-[10px] font-bold text-purple-300">{tpl.subtitle}</p>
                                                <p className="text-[11px] text-muted-foreground leading-snug">
                                                    {tpl.description}
                                                </p>
                                            </div>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                className="h-7 text-xs w-full gap-1.5 mt-1"
                                                onClick={() => {
                                                    setDraft(tpl.build(worldName))
                                                    setActiveTab('general')
                                                    toast.info(`Loaded "${tpl.name}" template into editor.`)
                                                }}
                                            >
                                                <Check className="h-3 w-3" /> Load Template
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Export & Import JSON */}
                            <div className="p-4 rounded-lg bg-muted/20 border border-border/50 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-xs font-bold uppercase tracking-wider">
                                            Fantasy-Calendar JSON Import / Export
                                        </h4>
                                        <p className="text-[10px] text-muted-foreground">
                                            100% compatible with Fantasy-Calendar.com JSON exports.
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="h-8 text-xs gap-1.5"
                                        onClick={handleExportJSON}
                                    >
                                        <Download className="h-3.5 w-3.5" /> Export Current JSON
                                    </Button>
                                </div>

                                <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                                    <input
                                        type="file"
                                        id="calendar-editor-file-upload"
                                        accept=".json"
                                        className="hidden"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0]
                                            if (file) {
                                                const text = await file.text()
                                                setJsonText(text)
                                                toast.info(`Loaded ${file.name} (${(file.size / 1024).toFixed(1)} KB)`)
                                            }
                                        }}
                                    />
                                    <Button asChild variant="outline" size="sm" className="gap-2">
                                        <label htmlFor="calendar-editor-file-upload" className="cursor-pointer">
                                            <Upload className="h-3.5 w-3.5" />
                                            Upload .JSON File
                                        </label>
                                    </Button>
                                </div>

                                <Textarea
                                    placeholder='Paste Fantasy-Calendar JSON here: {"name": "Sythian", "static_data": {...}, "dynamic_data": {...}}'
                                    className="min-h-[140px] font-mono text-xs"
                                    value={jsonText}
                                    onChange={(e) => setJsonText(e.target.value)}
                                />

                                <div className="flex justify-end">
                                    <Button
                                        type="button"
                                        size="sm"
                                        disabled={!jsonText.trim()}
                                        onClick={handleImportRawJSON}
                                    >
                                        Load JSON into Editor
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-border/50 bg-muted/10 flex items-center justify-between shrink-0">
                    <div className="text-[11px] text-muted-foreground">
                        {draft.static_data.months.length} months ({draft.static_data.year_len} days/yr) &bull;{' '}
                        {draft.static_data.seasons?.data.length || 0} seasons &bull;{' '}
                        {draft.static_data.moons?.length || 0} moons &bull;{' '}
                        {draft.events?.length || 0} events
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            {isSaving ? 'Saving...' : 'Save Calendar'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
