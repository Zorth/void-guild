'use client'

import { useState, useMemo, useEffect } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Eye,
    EyeOff,
    AlertCircle,
    RotateCcw,
    Plus,
    Settings,
    Sparkles,
    Sunrise,
    Sunset,
    CloudRain,
    MapPin,
    Lock,
    Clock,
    LayoutGrid,
    ListOrdered,
} from 'lucide-react'
import { cn, formatInGameYear } from '@/lib/utils'
import { Id } from '@/convex/_generated/dataModel'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { toast } from 'sonner'

import { Climate } from '@/lib/fantasy-calendar/climate'
import { EventEvaluator } from '@/lib/fantasy-calendar/events'
import {
    FantasyCalendarJSON,
    FantasyMoon,
    FantasyEvent,
    normalizeCalendarJSON,
    getMoonPhaseName,
    formatClockTime,
    formatDaylightDuration,
} from '@/lib/fantasy-calendar/types'
import {
    MOON_SVG_PATHS,
    getEventColorStyles,
} from '@/lib/fantasy-calendar/presets'
import CalendarEditorDialog, { EditorTabId } from './calendar/CalendarEditorDialog'
import CalendarEventDialog from './calendar/CalendarEventDialog'
import CalendarDayPopover, { CalendarSessionItem } from './calendar/CalendarDayPopover'
import CelestialForecastPopover from './calendar/CelestialForecastPopover'
import CalendarTimelineView from './calendar/CalendarTimelineView'

interface WorldCalendarProps {
    worldId: Id<'worlds'>
    worldName: string
    calendarJSON?: string
    isOwner: boolean
    isVisible: boolean
    sessions?: CalendarSessionItem[]
    onDropSession?: (sessionId: string, year: number, month: number, day: number) => void
}

export default function WorldCalendar({
    worldId,
    worldName,
    calendarJSON,
    isOwner,
    isVisible,
    sessions = [],
    onDropSession,
}: WorldCalendarProps) {
    const updateCalendar = useMutation(api.worlds.updateWorldCalendar)
    const toggleVisibility = useMutation(api.worlds.toggleCalendarVisibility)
    const recordWikiVisit = useMutation(api.users.recordWikiVisit)
    const syncAndGetAchievements = useMutation(api.achievements.syncAndGetAchievements)

    const [isEditorOpen, setIsEditorOpen] = useState(false)
    const [editorDefaultTab, setEditorDefaultTab] = useState<EditorTabId>('general')
    const [isEventModalOpen, setIsEventModalOpen] = useState(false)
    const [editingEvent, setEditingEvent] = useState<FantasyEvent | null>(null)
    const [eventDefaultDate, setEventDefaultDate] = useState<{ year: number; month: number; day: number } | undefined>(undefined)
    const [selectedLocationIdx, setSelectedLocationIdx] = useState<number>(0)
    const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid')

    const calendar = useMemo(() => {
        if (!calendarJSON) return null
        try {
            const parsed = JSON.parse(calendarJSON)
            return normalizeCalendarJSON(parsed)
        } catch (e) {
            console.error('Failed to parse calendar JSON', e)
            return null
        }
    }, [calendarJSON])

    const [viewYear, setViewYear] = useState<number>(1)
    const [viewMonth, setViewMonth] = useState<number>(0)

    useEffect(() => {
        if (calendar?.dynamic_data) {
            setViewYear(calendar.dynamic_data.year)
            setViewMonth(calendar.dynamic_data.month)
            const locIdx = Number(calendar.dynamic_data.location)
            if (!Number.isNaN(locIdx) && locIdx >= 0) {
                setSelectedLocationIdx(locIdx)
            }
        }
    }, [calendar])

    const saveCalendar = async (updated: FantasyCalendarJSON) => {
        const normalized = normalizeCalendarJSON(updated)
        await updateCalendar({ worldId, calendar: JSON.stringify(normalized) })
    }

    const isLeapYear = useMemo(
        () => (y: number, leapDay: any) => {
            if (!leapDay?.interval) return false
            if (typeof leapDay.interval === 'string' && leapDay.interval.includes(',')) {
                const parts = leapDay.interval.split(',').map((p: string) => p.trim())
                let isLeap = false
                for (const part of parts) {
                    if (part.startsWith('!')) {
                        const val = parseInt(part.substring(1))
                        if (val && y % val === 0) isLeap = false
                    } else {
                        const val = parseInt(part)
                        if (val && y % val === 0) isLeap = true
                    }
                }
                return isLeap
            }
            const interval = parseInt(String(leapDay.interval))
            if (!interval || interval <= 0) return false
            const offset = parseInt(String(leapDay.offset || '0')) || 0
            return (y - offset) % interval === 0
        },
        []
    )

    const calculateEpoch = useMemo(
        () => (y: number, m: number, d: number) => {
            if (!calendar) return 0
            const yearZeroExists = calendar.static_data.settings?.year_zero_exists || false
            let epoch = 0
            const startYear = yearZeroExists ? 0 : 1

            if (y >= startYear) {
                for (let currY = startYear; currY < y; currY++) {
                    epoch += calendar.static_data.year_len || 365
                    calendar.static_data.year_data?.leap_days?.forEach((ld: any) => {
                        if (isLeapYear(currY, ld)) epoch += 1
                    })
                }
            } else {
                for (let currY = startYear - 1; currY >= y; currY--) {
                    epoch -= calendar.static_data.year_len || 365
                    calendar.static_data.year_data?.leap_days?.forEach((ld: any) => {
                        if (isLeapYear(currY, ld)) epoch -= 1
                    })
                }
            }

            for (let i = 0; i < m; i++) {
                epoch += calendar.static_data.months[i]?.length || 30
                calendar.static_data.year_data?.leap_days?.forEach((ld: any) => {
                    if (ld.timespan === i && isLeapYear(y, ld)) epoch += 1
                })
            }

            epoch += d
            return epoch
        },
        [calendar, isLeapYear]
    )

    const getMoonPhase = useMemo(
        () => (moon: FantasyMoon, epoch: number) => {
            if (moon.custom_phase && moon.custom_cycle) {
                const customCycle = moon.custom_cycle.split(',').map((v) => parseInt(v))
                return customCycle[Math.abs(epoch % customCycle.length)] || 0
            }

            const shift = Number(moon.shift || 0)
            const cycle = Number(moon.cycle || 1)
            const granularity = Number(moon.granularity || 16)

            const moonPositionData = (epoch - shift) / cycle
            const moonPosition = moonPositionData - Math.floor(moonPositionData)

            if (moon.cycle_rounding === 'floor') {
                return Math.floor(moonPosition * granularity) % granularity
            } else if (moon.cycle_rounding === 'ceil') {
                return Math.ceil(moonPosition * granularity) % granularity
            } else {
                return Math.round(moonPosition * granularity) % granularity
            }
        },
        []
    )

    const getYearDay = useMemo(
        () => (y: number, m: number, d: number) => {
            if (!calendar) return 0
            let day = 0
            for (let i = 0; i < m; i++) {
                day += calendar.static_data.months[i]?.length || 30
                calendar.static_data.year_data?.leap_days?.forEach((ld: any) => {
                    if (ld.timespan === i && isLeapYear(y, ld)) day += 1
                })
            }
            day += d
            return day
        },
        [calendar, isLeapYear]
    )

    const epochData = useMemo(() => {
        if (!calendar) return {}

        const data: Record<number, any> = {}
        const months = calendar.static_data.months
        const currentMonth = months[viewMonth]
        if (!currentMonth) return {}

        const startEpoch = calculateEpoch(viewYear, viewMonth, 1)
        const endEpoch = startEpoch + (currentMonth.length || 30) - 1

        const weekLen = Math.max(1, calendar.static_data.weekdays.length || 7)
        const firstDayOffset = Math.max(0, (calendar.static_data.year_data?.first_day ?? 1) - 1)
        const overflow = calendar.static_data.year_data?.overflow ?? true
        const visibleMoons = (calendar.static_data.moons || []).filter((m) => !m.hidden)

        for (let d = 1; d <= currentMonth.length; d++) {
            const epoch = calculateEpoch(viewYear, viewMonth, d)
            const weekdayIndex = overflow
                ? (((epoch - 1 + firstDayOffset) % weekLen) + weekLen) % weekLen
                : (d - 1) % weekLen
            const weekDayNum = Math.ceil(d / weekLen)

            data[epoch] = {
                epoch,
                year: viewYear,
                timespan_index: viewMonth,
                timespan_number: viewMonth + 1,
                timespan_name: currentMonth.name,
                day: d,
                year_day: getYearDay(viewYear, viewMonth, d),
                inverse_day: (currentMonth.length || 30) - d + 1,
                intercalary: currentMonth.type === 'intercalary',
                week_day: weekdayIndex + 1,
                week_day_num: weekDayNum,
                inverse_week_day_num: Math.ceil(((currentMonth.length || 30) - d + 1) / weekLen),
                week_day_name: calendar.static_data.weekdays[weekdayIndex] || `Day ${weekdayIndex + 1}`,
                moon_phase: visibleMoons.map((moon) => getMoonPhase(moon, epoch)),
            }
        }

        // Generate Climate (Seasons, Sunrise/Sunset, and Regional Weather)
        if (calendar.static_data.seasons) {
            const climate = new Climate(
                data,
                calendar.static_data,
                calendar.dynamic_data,
                startEpoch,
                endEpoch,
                selectedLocationIdx
            )
            climate.generate()
        }

        // Evaluate Events
        if (calendar.events && calendar.events.length > 0) {
            const eventEvaluator = new EventEvaluator(
                calendar.static_data,
                calendar.dynamic_data,
                calendar.events,
                calendar.event_categories || [],
                data
            )
            const evaluated = eventEvaluator.evaluate(startEpoch, endEpoch)

            Object.entries(evaluated.valid).forEach(([eventIndexStr, epochs]) => {
                const eventIndex = parseInt(eventIndexStr)
                const event = calendar.events![eventIndex]
                if (!event) return
                // Hide GM-Only events from non-owners
                if (event.settings?.hide && !isOwner) return

                const category = (calendar.event_categories || []).find(
                    (c) => String(c.id) === String(event.event_category_id)
                )

                ;(epochs as number[]).forEach((epoch) => {
                    if (data[epoch]) {
                        if (!data[epoch].events) data[epoch].events = []
                        data[epoch].events.push({
                            ...event,
                            category,
                        })
                    }
                })
            })
        }

        return data
    }, [calendar, viewYear, viewMonth, calculateEpoch, getYearDay, getMoonPhase, selectedLocationIdx, isOwner])

    // Compute Today's astronomy & weather even when browsing a different month
    const todaySnapshot = useMemo(() => {
        if (!calendar) return null
        const { year, month, day } = calendar.dynamic_data
        const tEpoch = calculateEpoch(year, month, day)
        if (epochData[tEpoch]) return epochData[tEpoch]

        const tempMap: Record<number, any> = {
            [tEpoch]: {
                epoch: tEpoch,
                year,
                timespan_index: month,
                timespan_number: month + 1,
                day,
                year_day: getYearDay(year, month, day),
            },
        }
        if (calendar.static_data.seasons) {
            const climate = new Climate(
                tempMap,
                calendar.static_data,
                calendar.dynamic_data,
                tEpoch,
                tEpoch,
                selectedLocationIdx
            )
            climate.generate()
        }
        return tempMap[tEpoch]
    }, [calendar, calculateEpoch, getYearDay, epochData, selectedLocationIdx])

    const checkSessionOccurs = (session: CalendarSessionItem, y: number, m: number, d: number) => {
        if (!session.inGameDate) return false
        const start = session.inGameDate
        if (!start.endDay) {
            return start.year === y && start.month === m && start.day === d
        }
        const currentTotal = y * 10000 + m * 100 + d
        const startTotal = start.year * 10000 + start.month * 100 + start.day
        const endTotal = start.endYear! * 10000 + start.endMonth! * 100 + start.endDay!
        return currentTotal >= startTotal && currentTotal <= endTotal
    }

    const months = calendar?.static_data?.months || []
    const currentMonth = months[viewMonth] || months[0]

    const sessionLanes = useMemo(() => {
        if (!calendar || !sessions || !currentMonth) return []

        const monthSessions = sessions.filter((s) => {
            if (!s.inGameDate) return false
            const start = s.inGameDate
            const end = {
                year: start.endYear ?? start.year,
                month: start.endMonth ?? start.month,
                day: start.endDay ?? start.day,
            }
            const viewStartTotal = viewYear * 10000 + viewMonth * 100 + 1
            const viewEndTotal = viewYear * 10000 + viewMonth * 100 + (currentMonth.length || 31)
            const sessionStartTotal = start.year * 10000 + start.month * 100 + start.day
            const sessionEndTotal = end.year * 10000 + end.month * 100 + end.day
            return sessionStartTotal <= viewEndTotal && sessionEndTotal >= viewStartTotal
        })

        monthSessions.sort((a, b) => {
            const startA = a.inGameDate!.year * 10000 + a.inGameDate!.month * 100 + a.inGameDate!.day
            const startB = b.inGameDate!.year * 10000 + b.inGameDate!.month * 100 + b.inGameDate!.day
            if (startA !== startB) return startA - startB
            const durA =
                (a.inGameDate!.endYear ?? a.inGameDate!.year) * 10000 +
                (a.inGameDate!.endMonth ?? a.inGameDate!.month) * 100 +
                (a.inGameDate!.endDay ?? a.inGameDate!.day) -
                startA
            const durB =
                (b.inGameDate!.endYear ?? b.inGameDate!.year) * 10000 +
                (b.inGameDate!.endMonth ?? b.inGameDate!.month) * 100 +
                (b.inGameDate!.endDay ?? b.inGameDate!.day) -
                startB
            return durB - durA
        })

        const lanes: { session: CalendarSessionItem; lane: number }[] = []
        const dayOccupancy: Record<number, Set<number>> = {}

        monthSessions.forEach((session) => {
            let lane = 0
            const startDay =
                session.inGameDate!.year < viewYear ||
                (session.inGameDate!.year === viewYear && session.inGameDate!.month < viewMonth)
                    ? 1
                    : session.inGameDate!.day
            const endDay =
                (session.inGameDate!.endYear ?? session.inGameDate!.year) > viewYear ||
                ((session.inGameDate!.endYear ?? session.inGameDate!.year) === viewYear &&
                    (session.inGameDate!.endMonth ?? session.inGameDate!.month) > viewMonth)
                    ? currentMonth.length
                    : session.inGameDate!.endDay ?? session.inGameDate!.day

            while (true) {
                let collision = false
                for (let d = startDay; d <= endDay; d++) {
                    if (dayOccupancy[d]?.has(lane)) {
                        collision = true
                        break
                    }
                }
                if (!collision) break
                lane++
            }

            for (let d = startDay; d <= endDay; d++) {
                if (!dayOccupancy[d]) dayOccupancy[d] = new Set()
                dayOccupancy[d].add(lane)
            }
            lanes.push({ session, lane })
        })

        return lanes
    }, [calendar, sessions, viewYear, viewMonth, currentMonth])

    const maxLane = useMemo(() => {
        if (sessionLanes.length === 0) return -1
        return Math.max(...sessionLanes.map((sl) => sl.lane))
    }, [sessionLanes])

    const handleAdvanceDay = async (delta: number) => {
        if (!calendar) return
        let { year, month, day } = calendar.dynamic_data
        const calMonths = calendar.static_data.months

        day += delta
        while (day > (calMonths[month]?.length || 30)) {
            day -= calMonths[month]?.length || 30
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
            day += calMonths[month]?.length || 30
        }

        const updated: FantasyCalendarJSON = {
            ...calendar,
            dynamic_data: { ...calendar.dynamic_data, year, month, timespan: month, day },
        }
        await saveCalendar(updated)
    }

    const handleAdvanceHours = async (deltaHours: number) => {
        if (!calendar) return
        const hoursPerDay = calendar.static_data.clock?.hours || 24
        let hour = (calendar.dynamic_data.hour ?? 9) + deltaHours
        let dayDelta = 0
        while (hour >= hoursPerDay) {
            hour -= hoursPerDay
            dayDelta++
        }
        while (hour < 0) {
            hour += hoursPerDay
            dayDelta--
        }

        let { year, month, day } = calendar.dynamic_data
        const calMonths = calendar.static_data.months
        day += dayDelta
        while (day > (calMonths[month]?.length || 30)) {
            day -= calMonths[month]?.length || 30
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
            day += calMonths[month]?.length || 30
        }

        await saveCalendar({
            ...calendar,
            dynamic_data: {
                ...calendar.dynamic_data,
                year,
                month,
                timespan: month,
                day,
                hour,
            },
        })
    }

    const handleSetToday = async (year: number, month: number, day: number) => {
        if (!calendar) return
        const updated: FantasyCalendarJSON = {
            ...calendar,
            dynamic_data: { ...calendar.dynamic_data, year, month, timespan: month, day },
        }
        await saveCalendar(updated)
        toast.success(`World date set to ${day} ${calendar.static_data.months[month].name}, ${year}`)
    }

    const handleSaveSingleEvent = async (savedEvent: FantasyEvent) => {
        if (!calendar) return
        const existing = calendar.events || []
        const exists = existing.some((e) => String(e.id) === String(savedEvent.id))
        const nextEvents = exists
            ? existing.map((e) => (String(e.id) === String(savedEvent.id) ? savedEvent : e))
            : [...existing, savedEvent]
        await saveCalendar({
            ...calendar,
            events: nextEvents,
        })
        toast.success(exists ? 'Event updated!' : 'Event added to calendar!')
    }

    const handleDeleteSingleEvent = async (eventId: number | string) => {
        if (!calendar) return
        const nextEvents = (calendar.events || []).filter((e) => String(e.id) !== String(eventId))
        await saveCalendar({
            ...calendar,
            events: nextEvents,
        })
        toast.success('Event removed from calendar.')
    }

    if (!isOwner && !isVisible) return null

    const isValid =
        calendar &&
        calendar.static_data &&
        Array.isArray(calendar.static_data.months) &&
        calendar.static_data.months.length > 0 &&
        calendar.dynamic_data

    if (!calendar || !isValid) {
        return (
            <>
                <Card className="mt-8 border-dashed bg-muted/20">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        {!calendar ? (
                            <>
                                <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                                <h3 className="text-lg font-bold">No Calendar Configured</h3>
                                <p className="text-sm text-muted-foreground mb-6 max-w-md">
                                    Create a fantasy calendar from a starter template or import an existing JSON from Fantasy-Calendar.com.
                                </p>
                            </>
                        ) : (
                            <>
                                <AlertCircle className="h-12 w-12 text-destructive mb-4 opacity-50" />
                                <h3 className="text-lg font-bold">Invalid Calendar Data</h3>
                                <p className="text-sm text-muted-foreground mb-6 max-w-md">
                                    The calendar data is missing required month or date fields. Open the Calendar Editor to repair or replace it.
                                </p>
                            </>
                        )}

                        {isOwner && (
                            <div className="flex flex-wrap items-center justify-center gap-3">
                                <Button
                                    className="gap-2 bg-purple-600 hover:bg-purple-700 text-white"
                                    onClick={() => {
                                        setEditorDefaultTab('io')
                                        setIsEditorOpen(true)
                                    }}
                                >
                                    <Sparkles className="h-4 w-4" />
                                    Create or Import Calendar
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {isOwner && (
                    <CalendarEditorDialog
                        open={isEditorOpen}
                        onOpenChange={setIsEditorOpen}
                        worldName={worldName}
                        initialCalendar={calendar}
                        defaultTab={editorDefaultTab}
                        onSave={saveCalendar}
                    />
                )}
            </>
        )
    }

    const isCurrentMonth =
        viewYear === calendar.dynamic_data.year && viewMonth === calendar.dynamic_data.month
    const weekdays = calendar.static_data.weekdays || [
        'Sunday',
        'Moonday',
        'Justiceday',
        'Wisdomday',
        'Thunderday',
        'Loveday',
        'Farmday',
    ]
    const todayMonthName = months[calendar.dynamic_data.month]?.name || months[0].name
    const locations = calendar.static_data.seasons?.locations || []
    const visibleMoons = (calendar.static_data.moons || []).filter((m) => !m.hidden)
    const clockEnabled = calendar.static_data.clock?.enabled !== false && !calendar.static_data.settings?.hide_clock
    const hoursPerDay = calendar.static_data.clock?.hours || 24
    const minutesPerHour = calendar.static_data.clock?.minutes || 60

    // Calculate leading empty weekday cells for Day 1 of viewMonth
    const firstEpochOfViewMonth = calculateEpoch(viewYear, viewMonth, 1)
    const firstDayWeekIdx = (epochData[firstEpochOfViewMonth]?.week_day ?? 1) - 1
    const isIntercalaryMonth = currentMonth.type === 'intercalary'
    const leadingEmptyCells = isIntercalaryMonth ? 0 : Math.max(0, firstDayWeekIdx)

    const todaySeason = todaySnapshot?.season
    const todayWeather = todaySnapshot?.weather

    return (
        <Card className="mt-8 overflow-hidden border-border/40 bg-card/50">
            {/* Top Header */}
            <CardHeader className="flex flex-col gap-3 border-b border-border/50 px-6 py-3.5 bg-muted/10">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-primary" />
                            {calendar.name || 'World Calendar'}
                        </CardTitle>

                        <div className="text-xs sm:text-sm font-medium px-2.5 py-0.5 bg-primary/10 text-primary rounded-md border border-primary/20 flex items-center gap-2">
                            <span>
                                Today: {calendar.dynamic_data.day} {todayMonthName},{' '}
                                {formatInGameYear(
                                    calendar.dynamic_data.year,
                                    calendar.static_data.eras,
                                    calendar.static_data.settings?.year_zero_exists,
                                    { useAbbreviation: false, labelFirst: true }
                                )}
                            </span>
                            {clockEnabled && (
                                <span className="text-[11px] font-mono opacity-80 border-l border-primary/30 pl-2">
                                    {formatClockTime({
                                        hour: calendar.dynamic_data.hour ?? 9,
                                        minute: calendar.dynamic_data.minute ?? 0,
                                    })}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Right Action Controls */}
                    <div className="flex flex-wrap items-center gap-1.5">
                        {/* Grid vs Timeline Toggle */}
                        <div className="flex items-center rounded-md border border-border/60 bg-background/60 p-0.5 h-8">
                            <button
                                type="button"
                                onClick={() => setViewMode('grid')}
                                className={cn(
                                    'px-2.5 h-full rounded text-xs font-semibold flex items-center gap-1 transition-colors',
                                    viewMode === 'grid'
                                        ? 'bg-purple-600 text-white shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground'
                                )}
                            >
                                <LayoutGrid className="h-3.5 w-3.5" />
                                <span>Grid</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('timeline')}
                                className={cn(
                                    'px-2.5 h-full rounded text-xs font-semibold flex items-center gap-1 transition-colors',
                                    viewMode === 'timeline'
                                        ? 'bg-purple-600 text-white shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground'
                                )}
                            >
                                <ListOrdered className="h-3.5 w-3.5" />
                                <span>Timeline</span>
                            </button>
                        </div>

                        <CelestialForecastPopover
                            calendar={calendar}
                            isOwner={isOwner}
                            onJumpToDate={(y, m) => {
                                setViewYear(y)
                                setViewMonth(m)
                                setViewMode('grid')
                            }}
                            onCreateEventAtDate={(y, m, d, defaultTitle) => {
                                setEditingEvent(
                                    defaultTitle
                                        ? ({
                                              id: `event-${Date.now()}`,
                                              name: defaultTitle,
                                              description: '',
                                              event_category_id:
                                                  calendar.event_categories?.[0]?.id ?? 'default',
                                              data: {
                                                  has_duration: false,
                                                  duration: 1,
                                                  date: [y, m, d],
                                                  conditions: [
                                                      ['Year', '0', [String(y)]],
                                                      ['&&'],
                                                      ['Month', '0', [String(m)]],
                                                      ['&&'],
                                                      ['Day', '0', [String(d)]],
                                                  ],
                                              },
                                              settings: {
                                                  color: 'Purple',
                                                  text: 'text',
                                                  hide: false,
                                              },
                                          } as FantasyEvent)
                                        : null
                                )
                                setEventDefaultDate({ year: y, month: m, day: d })
                                setIsEventModalOpen(true)
                            }}
                        />

                        {locations.length > 0 && (
                            <div className="flex items-center gap-1 bg-card/80 border border-border/50 rounded-md px-2 h-8">
                                <MapPin className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                                <select
                                    className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer"
                                    value={selectedLocationIdx}
                                    onChange={(e) => {
                                        const idx = parseInt(e.target.value) || 0
                                        setSelectedLocationIdx(idx)
                                        if (isOwner) {
                                            saveCalendar({
                                                ...calendar,
                                                dynamic_data: {
                                                    ...calendar.dynamic_data,
                                                    location: String(idx),
                                                    custom_location: true,
                                                },
                                            })
                                        }
                                    }}
                                >
                                    {locations.map((loc, idx) => (
                                        <option key={idx} value={idx} className="bg-card text-foreground">
                                            {loc.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {isOwner && (
                            <>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2.5 text-muted-foreground hover:text-primary gap-1.5"
                                    onClick={() => toggleVisibility({ worldId })}
                                >
                                    {isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                    <span className="text-xs hidden sm:inline">
                                        {isVisible ? 'Public' : 'Private'}
                                    </span>
                                </Button>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2.5 text-xs gap-1.5"
                                    onClick={() => {
                                        setEditingEvent(null)
                                        setEventDefaultDate({
                                            year: viewYear,
                                            month: viewMonth,
                                            day: calendar.dynamic_data.day,
                                        })
                                        setIsEventModalOpen(true)
                                    }}
                                >
                                    <Plus className="h-3.5 w-3.5 text-purple-400" />
                                    <span>Add Event</span>
                                </Button>

                                <Button
                                    variant="default"
                                    size="sm"
                                    className="h-8 px-3 text-xs gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
                                    onClick={() => {
                                        setEditorDefaultTab('general')
                                        setIsEditorOpen(true)
                                    }}
                                >
                                    <Settings className="h-3.5 w-3.5" />
                                    <span>Edit Calendar</span>
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {/* Astronomy, Season, Sunrise/Sunset & Weather Status Strip */}
                {(todaySeason || todayWeather) && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs pt-1 border-t border-border/30">
                        {todaySeason && (
                            <>
                                <div className="inline-flex items-center gap-1.5 font-bold">
                                    <span
                                        className="w-2.5 h-2.5 rounded-full"
                                        style={{ backgroundColor: todaySeason.color || '#a855f7' }}
                                    />
                                    <span>{todaySeason.season_name}</span>
                                    <span className="text-[10px] text-muted-foreground font-normal">
                                        (Day {todaySeason.season_day})
                                    </span>
                                </div>

                                <div className="inline-flex items-center gap-3 text-muted-foreground">
                                    <span className="inline-flex items-center gap-1 text-amber-300 font-semibold">
                                        <Sunrise className="h-3.5 w-3.5" />
                                        {formatClockTime(todaySeason.sunrise)}
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-orange-300 font-semibold">
                                        <Sunset className="h-3.5 w-3.5" />
                                        {formatClockTime(todaySeason.sunset)}
                                    </span>
                                    <span className="text-[11px] opacity-80">
                                        ({formatDaylightDuration(todaySeason.sunrise, todaySeason.sunset, hoursPerDay, minutesPerHour)})
                                    </span>
                                </div>
                            </>
                        )}

                        {todayWeather && (
                            <div className="inline-flex items-center gap-2 text-muted-foreground border-l border-border/40 pl-3">
                                <CloudRain className="h-3.5 w-3.5 text-cyan-400" />
                                <span className="font-bold text-foreground">
                                    {todayWeather.temp_low}
                                    {todayWeather.temp_unit}–{todayWeather.temp_high}
                                    {todayWeather.temp_unit}
                                </span>
                                <span>{todayWeather.clouds}</span>
                                {todayWeather.precipitation && (
                                    <span className="text-cyan-300 font-semibold">
                                        &bull; {todayWeather.precipitation}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </CardHeader>

            <CardContent className="p-0">
                {/* Owner Date & Clock Tracker Bar */}
                {isOwner && (
                    <div className="bg-primary/5 border-b border-border/50 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                    Date:
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    onClick={() => handleAdvanceDay(-1)}
                                >
                                    -1 Day
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    onClick={() => handleAdvanceDay(1)}
                                >
                                    +1 Day
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    onClick={() => handleAdvanceDay(weekdays.length || 7)}
                                >
                                    +1 Week
                                </Button>
                            </div>

                            {clockEnabled && (
                                <div className="flex items-center gap-1.5 border-l border-border/40 pl-3">
                                    <Clock className="h-3 w-3 text-muted-foreground" />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 px-2 text-xs"
                                        onClick={() => handleAdvanceHours(1)}
                                    >
                                        +1h
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 px-2 text-xs"
                                        onClick={() => handleAdvanceHours(4)}
                                    >
                                        +4h
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 px-2 text-xs"
                                        onClick={() => handleAdvanceHours(8)}
                                    >
                                        +8h Rest
                                    </Button>
                                </div>
                            )}
                        </div>

                        <Button
                            variant="secondary"
                            size="sm"
                            className="h-7 px-3 text-xs gap-1.5"
                            onClick={() => {
                                setViewYear(calendar.dynamic_data.year)
                                setViewMonth(calendar.dynamic_data.month)
                            }}
                        >
                            <RotateCcw className="h-3 w-3" /> Jump to Today
                        </Button>
                    </div>
                )}

                {viewMode === 'timeline' ? (
                    <CalendarTimelineView
                        calendar={calendar}
                        sessions={sessions}
                        isOwner={isOwner}
                        onJumpToGridDate={(y, m) => {
                            setViewYear(y)
                            setViewMonth(m)
                            setViewMode('grid')
                        }}
                        onCreateEventAtDate={(y, m, d) => {
                            setEditingEvent(null)
                            setEventDefaultDate({ year: y, month: m, day: d })
                            setIsEventModalOpen(true)
                        }}
                        onEditEvent={(evId) => {
                            const found = (calendar.events || []).find((e) => String(e.id) === String(evId))
                            if (found) {
                                setEditingEvent(found)
                                setIsEventModalOpen(true)
                            }
                        }}
                    />
                ) : (
                    <>
                        {/* Month & Year Navigation */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-muted/5">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                            if (viewMonth === 0) {
                                setViewMonth(calendar.static_data.n_months - 1)
                                setViewYear((v) => v - 1)
                            } else {
                                setViewMonth((v) => v - 1)
                            }
                        }}
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-2">
                            <h2 className="text-xl font-bold tracking-tight">{currentMonth.name}</h2>
                            {isIntercalaryMonth && (
                                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                    Intercalary Festival
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground font-medium">
                            {formatInGameYear(
                                viewYear,
                                calendar.static_data.eras,
                                calendar.static_data.settings?.year_zero_exists,
                                { useAbbreviation: false, labelFirst: true }
                            )}
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                            if (viewMonth === calendar.static_data.n_months - 1) {
                                setViewMonth(0)
                                setViewYear((v) => v + 1)
                            } else {
                                setViewMonth((v) => v + 1)
                            }
                        }}
                    >
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                </div>

                {/* Calendar Grid */}
                <div className="p-4 sm:p-6">
                    <TooltipProvider>
                        <div
                            className="grid gap-px bg-border/20 border border-border/20 rounded-lg overflow-hidden shadow-sm"
                            style={{
                                gridTemplateColumns: `repeat(${isIntercalaryMonth ? Math.min(currentMonth.length, 7) : weekdays.length}, minmax(0, 1fr))`,
                            }}
                        >
                            {/* Weekday Headers */}
                            {!isIntercalaryMonth &&
                                weekdays.map((day, wIdx) => (
                                    <Tooltip key={`${day}-${wIdx}`}>
                                        <TooltipTrigger asChild>
                                            <div className="bg-muted/30 p-2 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border/20 cursor-help truncate">
                                                {day.slice(0, 3)}
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p className="text-xs font-bold">{day}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                ))}

                            {/* Leading Offset Cells so Day 1 aligns with its true Weekday */}
                            {Array.from({ length: leadingEmptyCells }).map((_, emptyIdx) => (
                                <div
                                    key={`empty-${emptyIdx}`}
                                    className="bg-card/20 aspect-square sm:aspect-video pointer-events-none"
                                />
                            ))}

                            {/* Day Cells */}
                            {Array.from({ length: currentMonth.length }).map((_, i) => {
                                const d = i + 1
                                const isToday = isCurrentMonth && d === calendar.dynamic_data.day
                                const epoch = calculateEpoch(viewYear, viewMonth, d)
                                const dayData = epochData[epoch]
                                const dayEvents: any[] = dayData?.events || []
                                const daySeason = dayData?.season

                                const dayLanes = sessionLanes
                                    .filter((sl) => checkSessionOccurs(sl.session, viewYear, viewMonth, d))
                                    .sort((a, b) => a.lane - b.lane)

                                return (
                                    <Popover key={d}>
                                        <PopoverTrigger asChild>
                                            <div
                                                className={cn(
                                                    'bg-card aspect-square sm:aspect-video p-1 sm:p-2 flex flex-col justify-between transition-colors relative group cursor-pointer',
                                                    isToday
                                                        ? 'bg-primary/15 ring-1 ring-inset ring-primary/50'
                                                        : 'hover:bg-muted/15',
                                                    dayLanes.length > 0 && !isToday && 'bg-purple-500/5'
                                                )}
                                                onDragOver={(e) => {
                                                    if (isOwner) {
                                                        e.preventDefault()
                                                        e.currentTarget.classList.add('bg-primary/20')
                                                    }
                                                }}
                                                onDragLeave={(e) => {
                                                    if (isOwner) {
                                                        e.currentTarget.classList.remove('bg-primary/20')
                                                    }
                                                }}
                                                onDrop={(e) => {
                                                    if (isOwner && onDropSession) {
                                                        e.preventDefault()
                                                        e.currentTarget.classList.remove('bg-primary/20')
                                                        const sessionId = e.dataTransfer.getData('sessionId')
                                                        if (sessionId) {
                                                            onDropSession(sessionId, viewYear, viewMonth, d)
                                                        }
                                                    }
                                                }}
                                            >
                                                {/* Top Row: Event Dots (left), Day Number (center), Moons (right) */}
                                                <div className="flex items-start justify-between w-full relative">
                                                    {/* Event Dots */}
                                                    <div className="flex items-center gap-0.5 min-w-[16px]">
                                                        {dayEvents.slice(0, 3).map((ev: any, ei: number) => {
                                                            const cStyle = getEventColorStyles(
                                                                ev.settings?.color || ev.category?.event_settings?.color
                                                            )
                                                            return (
                                                                <span
                                                                    key={ei}
                                                                    className={cn(
                                                                        'w-1.5 h-1.5 rounded-full',
                                                                        cStyle.dotClass
                                                                    )}
                                                                    title={ev.name}
                                                                />
                                                            )
                                                        })}
                                                    </div>

                                                    {/* Day Number */}
                                                    <span
                                                        className={cn(
                                                            'text-xs sm:text-sm font-bold leading-none',
                                                            isToday
                                                                ? 'text-primary scale-110'
                                                                : 'text-muted-foreground/70'
                                                        )}
                                                    >
                                                        {d}
                                                    </span>

                                                    {/* Moons */}
                                                    <div className="flex flex-col items-end gap-0.5 opacity-55 group-hover:opacity-100 transition-opacity min-w-[16px]">
                                                        {visibleMoons.map((moon, mi) => {
                                                            const phase = dayData?.moon_phase?.[mi] ?? 0
                                                            const gran = Number(moon.granularity) || 16
                                                            const pathD =
                                                                MOON_SVG_PATHS[
                                                                    Math.floor((phase / gran) * MOON_SVG_PATHS.length)
                                                                ]
                                                            return (
                                                                <svg
                                                                    key={mi}
                                                                    width="12"
                                                                    height="12"
                                                                    viewBox="0 0 32 32"
                                                                >
                                                                    <title>{`${moon.name}: ${getMoonPhaseName(phase, gran)}`}</title>
                                                                    <circle
                                                                        cx="16"
                                                                        cy="16"
                                                                        r="9.5"
                                                                        fill={moon.shadow_color || '#29344a'}
                                                                    />
                                                                    <path
                                                                        d={pathD}
                                                                        fill={moon.color || '#d5f4f1'}
                                                                    />
                                                                </svg>
                                                            )
                                                        })}
                                                    </div>
                                                </div>

                                                {/* Event Badges on Desktop Cells */}
                                                {dayEvents.length > 0 && (
                                                    <div className="hidden md:flex flex-col gap-0.5 my-auto overflow-hidden">
                                                        {dayEvents.slice(0, 2).map((ev: any, ei: number) => {
                                                            const cStyle = getEventColorStyles(
                                                                ev.settings?.color || ev.category?.event_settings?.color
                                                            )
                                                            return (
                                                                <div
                                                                    key={ei}
                                                                    className={cn(
                                                                        'text-[9px] font-bold px-1 py-0.2 rounded truncate border flex items-center gap-1 leading-tight',
                                                                        cStyle.badgeClass
                                                                    )}
                                                                >
                                                                    {ev.settings?.hide && (
                                                                        <Lock className="h-2 w-2 shrink-0 text-rose-300" />
                                                                    )}
                                                                    <span className="truncate">{ev.name}</span>
                                                                </div>
                                                            )
                                                        })}
                                                        {dayEvents.length > 2 && (
                                                            <span className="text-[8px] text-muted-foreground font-bold pl-1">
                                                                +{dayEvents.length - 2} more
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Bottom Session Lanes */}
                                                <div className="flex flex-col gap-0.5 mt-auto -mx-1 sm:-mx-2 w-[calc(100%+0.5rem)] sm:w-[calc(100%+1rem)]">
                                                    {Array.from({ length: maxLane + 1 }).map((_, laneIndex) => {
                                                        const sl = sessionLanes.find(
                                                            (l) =>
                                                                l.lane === laneIndex &&
                                                                checkSessionOccurs(l.session, viewYear, viewMonth, d)
                                                        )

                                                        if (!sl)
                                                            return (
                                                                <div
                                                                    key={laneIndex}
                                                                    className="h-1.5 sm:h-2 w-full"
                                                                />
                                                            )

                                                        const isStart =
                                                            sl.session.inGameDate!.year === viewYear &&
                                                            sl.session.inGameDate!.month === viewMonth &&
                                                            sl.session.inGameDate!.day === d
                                                        const isEnd =
                                                            (sl.session.inGameDate!.endYear ??
                                                                sl.session.inGameDate!.year) === viewYear &&
                                                            (sl.session.inGameDate!.endMonth ??
                                                                sl.session.inGameDate!.month) === viewMonth &&
                                                            (sl.session.inGameDate!.endDay ??
                                                                sl.session.inGameDate!.day) === d

                                                        return (
                                                            <div
                                                                key={laneIndex}
                                                                className={cn(
                                                                    'h-1.5 sm:h-2 bg-purple-500/60 shadow-[0_0_2px_rgba(168,85,247,0.3)] relative group/bar transition-all shrink-0 z-10',
                                                                    isStart ? 'rounded-l-full ml-1' : 'ml-0',
                                                                    isEnd ? 'rounded-r-full mr-1' : 'mr-0',
                                                                    isStart && isEnd
                                                                        ? 'w-[calc(100%-8px)]'
                                                                        : isStart
                                                                          ? 'w-[calc(100%-4px+1px)]'
                                                                          : isEnd
                                                                            ? 'w-[calc(100%-4px)]'
                                                                            : 'w-[calc(100%+1px)]'
                                                                )}
                                                                title={sl.session.quest?.name || 'Session'}
                                                            >
                                                                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover/bar:opacity-100 transition-opacity" />
                                                            </div>
                                                        )
                                                    })}
                                                </div>

                                                {/* Subtle Season Start Indicator */}
                                                {daySeason?.season_day === 1 && (
                                                    <span
                                                        className="absolute bottom-0.5 right-1 w-1.5 h-1.5 rounded-full"
                                                        style={{ backgroundColor: daySeason.color }}
                                                        title={`First day of ${daySeason.season_name}`}
                                                    />
                                                )}
                                            </div>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-80 p-0 overflow-hidden">
                                            <CalendarDayPopover
                                                day={d}
                                                monthName={currentMonth.name}
                                                viewYear={viewYear}
                                                viewMonth={viewMonth}
                                                weekdayName={dayData?.week_day_name}
                                                calendar={calendar}
                                                dayEpochData={dayData}
                                                dayLanes={dayLanes}
                                                isOwner={isOwner}
                                                worldName={worldName}
                                                onSetToday={handleSetToday}
                                                onAddEventForDay={(y, m, targetDay) => {
                                                    setEditingEvent(null)
                                                    setEventDefaultDate({ year: y, month: m, day: targetDay })
                                                    setIsEventModalOpen(true)
                                                }}
                                                onEditEvent={(ev) => {
                                                    setEditingEvent(ev)
                                                    setIsEventModalOpen(true)
                                                }}
                                                onDeleteEvent={handleDeleteSingleEvent}
                                                onRecordWikiVisit={() => {
                                                    recordWikiVisit()
                                                        .then(() => syncAndGetAchievements())
                                                        .catch(console.error)
                                                }}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                )
                            })}
                        </div>
                    </TooltipProvider>
                </div>
                </>
                )}
            </CardContent>

            {/* Full Calendar Editor Dialog */}
            {isOwner && (
                <>
                    <CalendarEditorDialog
                        open={isEditorOpen}
                        onOpenChange={setIsEditorOpen}
                        worldName={worldName}
                        initialCalendar={calendar}
                        defaultTab={editorDefaultTab}
                        onSave={saveCalendar}
                    />
                    <CalendarEventDialog
                        open={isEventModalOpen}
                        onOpenChange={setIsEventModalOpen}
                        calendar={calendar}
                        initialEvent={editingEvent}
                        defaultDate={eventDefaultDate}
                        onSave={handleSaveSingleEvent}
                    />
                </>
            )}
        </Card>
    )
}
