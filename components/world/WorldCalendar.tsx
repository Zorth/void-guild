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
    ExternalLink,
    Thermometer,
    CloudRain,
    Sun,
    Moon as MoonIcon
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

// Fantasy Calendar Library Imports
import { Climate } from '@/lib/fantasy-calendar/climate'
import { Random } from '@/lib/fantasy-calendar/random'
import { precisionRound, clone } from '@/lib/fantasy-calendar/utils'

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
    interval?: number
    offset?: number
}

interface FantasyMoon {
    name: string;
    cycle: number;
    shift: number;
    granularity: number;
    color: string;
    shadow_color?: string;
    hidden: boolean;
    custom_phase?: boolean;
    custom_cycle?: string;
    cycle_rounding?: string;
}

interface FantasySeason {
    name: string;
    time: {
        sunrise: { hour: number; minute: number };
        sunset: { hour: number; minute: number };
    };
    weather?: {
        temp_low: number;
        temp_high: number;
        precipitation: number;
        precipitation_intensity: number;
    };
}

interface FantasyCalendarJSON {
    name: string;
    dynamic_data: {
        year: number;
        month: number;
        day: number;
        hour?: number;
        minute?: number;
        epoch?: number;
    };
    static_data: {
        year_len: number;
        n_months: number;
        months: FantasyMonth[];
        weekdays: string[];
        moons?: FantasyMoon[];
        seasons?: {
            data: FantasySeason[];
            global_settings: {
                enable_weather: boolean;
                season_offset?: number;
                seed?: number;
                temp_sys?: 'imperial' | 'metric';
            };
        };
        settings: {
            year_zero_exists: boolean;
            hide_events?: boolean;
        };
        year_data?: {
            timespans?: FantasyMonth[];
            leap_days?: any[];
            global_week?: string[];
            overflow?: boolean;
            first_day?: number;
        };
    };
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

const moon_paths = [
	"M6.5,16a9.5,9.5 0 1,0 19,0a9.5,9.5 0 1,0 -19,0",
	"M19.79,6C22.25,7.2,25,9.92,25,16s-2.75,8.8-5.21,10a10.59,10.59,0,0,1-3.79.71A10.72,10.72,0,0,1,16,5.28,10.59,10.59,0,0,1,19.79,6Z",
	"M19.43,5.86C21.79,7,24.5,9.7,24.5,16s-2.71,9-5.07,10.14a10.55,10.55,0,0,1-3.43.58A10.72,10.72,0,0,1,16,5.28,10.55,10.55,0,0,1,19.43,5.86Z",
	"M17.87,5.46C20.23,6.34,24,8.88,24,16.17c0,6.85-3.33,9.36-5.69,10.29a11,11,0,0,1-2.31.26A10.72,10.72,0,0,1,16,5.28,10.49,10.49,0,0,1,17.87,5.46Z",
	"M17.79,5.45C20,6.3,23.5,8.77,23.5,15.88c0,7.37-3.75,9.87-5.95,10.71a9.92,9.92,0,0,1-1.55.13A10.72,10.72,0,0,1,16,5.28,10.54,10.54,0,0,1,17.79,5.45Z",
	"M17.35,5.38c1.9.79,5.15,3.25,5.15,10.72,0,7.25-3.06,9.68-5,10.5a10.87,10.87,0,0,1-1.52.12A10.72,10.72,0,0,1,16,5.28,10.1,10.1,0,0,1,17.35,5.38Z",
	"M17.05,5.34c1.6.75,4.45,3.17,4.45,10.79,0,7.39-2.68,9.76-4.3,10.52a11.9,11.9,0,0,1-1.2.07A10.72,10.72,0,0,1,16,5.28,9,9,0,0,1,17.05,5.34Z",
	"M16.85,5.33c1.3.74,3.65,3.12,3.65,10.67s-2.35,9.93-3.65,10.67c-.28,0-.56,0-.85,0A10.72,10.72,0,0,1,16,5.28,7.92,7.92,0,0,1,16.85,5.33Z",
	"M16.46,5.31c.95.78,3,3.34,3,10.69s-2.09,9.91-3,10.69l-.46,0A10.72,10.72,0,0,1,16,5.28Z",
	"M16.29,5.3c.65.8,2.21,3.48,2.21,10.78S17,25.91,16.3,26.7l-.3,0A10.72,10.72,0,0,1,16,5.28Z",
	"M16.13,5.29c.37.89,1.37,3.92,1.37,10.79s-1,9.76-1.36,10.63H16A10.72,10.72,0,0,1,16,5.28Z",
	"M16,5.29A85.5,85.5,0,0,1,16.5,16,85.5,85.5,0,0,1,16,26.71h0A10.72,10.72,0,0,1,16,5.28Z",
	"M16,26.72A10.72,10.72,0,0,1,16,5.28Z",
	"M15.5,16A85.59,85.59,0,0,0,16,26.72,10.72,10.72,0,0,1,16,5.28,85.59,85.59,0,0,0,15.5,16Z",
	"M14.5,16.08c0,6.84,1,9.77,1.36,10.63a10.71,10.71,0,0,1,0-21.42C15.5,6.17,14.5,9.2,14.5,16.08Z",
	"M15.7,26.7a10.7,10.7,0,0,1,0-21.4c-.65.8-2.21,3.47-2.21,10.78S15,25.92,15.7,26.7Z",
	"M15.55,26.7a10.71,10.71,0,0,1,0-21.4c-1,.78-3.05,3.34-3.05,10.7S14.6,25.92,15.55,26.7Z",
	"M15.16,26.68a10.71,10.71,0,0,1,0-21.36C13.85,6.06,11.5,8.43,11.5,16S13.85,25.94,15.16,26.68Z",
	"M14.81,26.65A10.72,10.72,0,0,1,15,5.33c-1.59.76-4.45,3.17-4.45,10.8C10.5,23.53,13.19,25.9,14.81,26.65Z",
	"M14.49,26.6a10.71,10.71,0,0,1,.17-21.23c-1.9.8-5.16,3.24-5.16,10.73C9.5,23.37,12.57,25.79,14.49,26.6Z",
	"M14.46,26.6a10.71,10.71,0,0,1-.24-21.16C12,6.29,8.5,8.76,8.5,15.88,8.5,23.26,12.27,25.76,14.46,26.6Z",
	"M13.72,26.47a10.71,10.71,0,0,1,.43-21C11.78,6.33,8,8.87,8,16.17,8,23,11.35,25.55,13.72,26.47Z",
	"M12.6,26.19a10.73,10.73,0,0,1,0-20.35C10.23,7,7.5,9.67,7.5,16s2.73,9,5.1,10.16Z",
	"M12.23,26a10.7,10.7,0,0,1,0-20C9.77,7.19,7,9.9,7,16S9.77,24.81,12.23,26Z",
	"M19.77,26C22.23,24.81,25,22.1,25,16S22.23,7.19,19.77,6a10.7,10.7,0,0,1,0,20Z",
	"M19.4,26.16C21.77,25,24.5,22.33,24.5,16S21.77,7,19.4,5.84a10.71,10.71,0,0,1,0,20.32Z",
	"M18.28,26.47C20.65,25.55,24,23,24,16.17c0-7.3-3.78-9.84-6.15-10.72a10.71,10.71,0,0,1,.43,21Z",
	"M17.54,26.6c2.19-.84,6-3.34,6-10.72,0-7.12-3.5-9.59-5.72-10.44a10.71,10.71,0,0,1-.24,21.16Z",
	"M17.51,26.6c1.92-.81,5-3.23,5-10.5,0-7.49-3.26-9.93-5.16-10.73a10.71,10.71,0,0,1,.17,21.23Z",
	"M17.19,26.65c1.62-.75,4.31-3.12,4.31-10.52,0-7.63-2.86-10-4.45-10.8a10.72,10.72,0,0,1,.14,21.32Z",
	"M16.84,26.68c1.31-.74,3.66-3.11,3.66-10.68S18.15,6.06,16.84,5.32a10.71,10.71,0,0,1,0,21.36Z",
	"M16.45,26.7c.95-.78,3.05-3.34,3.05-10.7S17.4,6.08,16.45,5.3a10.71,10.71,0,0,1,0,21.4Z",
	"M16.3,26.7c.67-.78,2.2-3.37,2.2-10.62S16.94,6.1,16.29,5.3a10.7,10.7,0,0,1,0,21.4Z",
	"M16.14,26.71c.37-.86,1.36-3.79,1.36-10.63s-1-9.91-1.37-10.79a10.71,10.71,0,0,1,0,21.42Z",
	"M16,26.72A85.59,85.59,0,0,0,16.5,16,85.59,85.59,0,0,0,16,5.28a10.72,10.72,0,0,1,0,21.44Z",
	"M16,26.72V5.28a10.72,10.72,0,0,1,0,21.44Z",
	"M16,26.72h0A85.59,85.59,0,0,1,15.5,16,85.59,85.59,0,0,1,16,5.28h0a10.72,10.72,0,0,1,0,21.44Z",
	"M16,26.72h-.14c-.37-.86-1.36-3.79-1.36-10.63s1-9.91,1.37-10.79H16a10.72,10.72,0,0,1,0,21.44Z",
	"M16,26.72l-.3,0c-.67-.78-2.2-3.37-2.2-10.62s1.56-10,2.21-10.78l.29,0a10.72,10.72,0,0,1,0,21.44Z",
	"M16,26.72l-.45,0c-1-.78-3.05-3.34-3.05-10.7s2.1-9.92,3.05-10.7l.45,0a10.72,10.72,0,0,1,0,21.44Z",
	"M16,26.72c-.28,0-.56,0-.84,0C13.85,25.94,11.5,23.57,11.5,16s2.35-9.94,3.66-10.68c.28,0,.56,0,.84,0a10.72,10.72,0,0,1,0,21.44Z",
	"M16,26.72a11.7,11.7,0,0,1-1.19-.07c-1.62-.75-4.31-3.12-4.31-10.52,0-7.63,2.86-10,4.45-10.8.35,0,.7,0,1.05,0a10.72,10.72,0,0,1,0,21.44Z",
	"M16,26.72a10.85,10.85,0,0,1-1.51-.12c-1.92-.81-5-3.23-5-10.5,0-7.49,3.26-9.93,5.16-10.73A11.9,11.9,0,0,1,16,5.28a10.72,10.72,0,0,1,0,21.44Z",
	"M16,26.72a11.16,11.16,0,0,1-1.54-.12c-2.19-.84-6-3.34-6-10.72,0-7.12,3.5-9.59,5.72-10.44A10.43,10.43,0,0,1,16,5.28a10.72,10.72,0,0,1,0,21.44Z",
	"M16,26.72a10.69,10.69,0,0,1-2.28-.25C11.35,25.55,8,23,8,16.17c0-7.3,3.78-9.84,6.15-10.72A11.26,11.26,0,0,1,16,5.28a10.72,10.72,0,0,1,0,21.44Z",
	"M16,26.72a10.63,10.63,0,0,1-3.4-.56C10.23,25,7.5,22.33,7.5,16s2.73-9,5.1-10.16A10.72,10.72,0,1,1,16,26.72Z",
	"M16,26.72a10.52,10.52,0,0,1-3.77-.7C9.77,24.81,7,22.1,7,16S9.77,7.19,12.23,6A10.52,10.52,0,0,1,16,5.28a10.72,10.72,0,0,1,0,21.44Z"
];

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
                    ...staticData,
                    year_len: staticData.year_len || yearData.year_len || 365,
                    n_months: months.length,
                    months: months.map((m: FantasyMonth) => ({
                        name: m.name || "Unknown Month",
                        length: m.length || 30,
                        type: m.type || "regular"
                    })),
                    weekdays: weekdays || ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7"],
                    moons: staticData.moons || yearData.moons || [],
                    seasons: staticData.seasons || yearData.seasons || { data: [], global_settings: { enable_weather: false } },
                    settings: staticData.settings || yearData.settings || { year_zero_exists: false }
                },
                dynamic_data: {
                    ...dynamicData,
                    year: dynamicData.year || 1,
                    month: currentMonthIndex,
                    day: dynamicData.day || 1,
                    epoch: dynamicData.epoch
                },
                events: parsed.events || [] 
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

    const handleSetToday = async (year: number, month: number, day: number) => {
        if (!calendar) return
        const updated = { ...calendar, dynamic_data: { ...calendar.dynamic_data, year, month, day } }
        await saveCalendar(updated)
        toast.success(`World date set to ${day} ${calendar.static_data.months[month].name}, ${year}`)
    }

    // Helper: Check if a year is a leap year (simplified FC logic)
    const isLeapYear = (y: number, leapDay: any) => {
        if (!leapDay.interval) return false;
        const yearZeroExists = calendar?.static_data.settings?.year_zero_exists || false;
        
        // Simplified Gregorian-like logic if interval is a string like "4,!100,400"
        if (typeof leapDay.interval === 'string') {
            const parts = leapDay.interval.split(',').map(p => p.trim());
            let isLeap = false;
            for (const part of parts) {
                if (part.startsWith('!')) {
                    const val = parseInt(part.substring(1));
                    if (y % val === 0) isLeap = false;
                } else {
                    const val = parseInt(part);
                    if (y % val === 0) isLeap = true;
                }
            }
            return isLeap;
        }
        
        // Single numeric interval
        const interval = parseInt(leapDay.interval);
        const offset = parseInt(leapDay.offset || '0');
        return (y - offset) % interval === 0;
    }

    // Helper: Calculate epoch for a given date (Accurate version)
    const calculateEpoch = useMemo(() => (y: number, m: number, d: number) => {
        if (!calendar) return 0
        
        const yearZeroExists = calendar.static_data.settings?.year_zero_exists || false;
        
        let epoch = 0;
        const startYear = yearZeroExists ? 0 : 1;

        // Sum full years
        for (let currY = startYear; currY < y; currY++) {
            epoch += calendar.static_data.year_len || 365;
            calendar.static_data.year_data?.leap_days?.forEach((ld: any) => {
                if (isLeapYear(currY, ld)) epoch += 1;
            });
        }
        
        // Sum full months in the current year
        for (let i = 0; i < m; i++) {
            epoch += calendar.static_data.months[i]?.length || 30;
            calendar.static_data.year_data?.leap_days?.forEach((ld: any) => {
                if (ld.timespan === i && isLeapYear(y, ld)) epoch += 1;
            });
        }
        
        epoch += d; 
        return epoch;
    }, [calendar]);

    const getMoonPhase = (moon: FantasyMoon, epoch: number) => {
        if (moon.custom_phase && moon.custom_cycle) {
            const custom_cycle = moon.custom_cycle.split(',').map(v => parseInt(v));
            return custom_cycle[Math.abs(epoch % custom_cycle.length)] || 0;
        }

        const shift = Number(moon.shift || 0);
        const cycle = Number(moon.cycle || 1);
        const granularity = Number(moon.granularity || 24);

        const moonPositionData = ((epoch - shift) / cycle);
        const moonPosition = (moonPositionData - Math.floor(moonPositionData));
        
        if (moon.cycle_rounding === "floor") {
            return Math.floor(moonPosition * granularity) % granularity;
        } else if (moon.cycle_rounding === "ceil") {
            return Math.ceil(moonPosition * granularity) % granularity;
        } else {
            return Math.round(moonPosition * granularity) % granularity;
        }
    }

    const epochData = useMemo(() => {
        if (!calendar) return {};
        
        const data: Record<number, any> = {};
        const months = calendar.static_data.months;
        const currentMonth = months[viewMonth];
        if (!currentMonth) return {};

        const startEpoch = calculateEpoch(viewYear, viewMonth, 1);
        const endEpoch = startEpoch + (currentMonth.length || 30); // Approximate end

        const weekLen = calendar.static_data.weekdays.length || 7;

        for (let d = 1; d <= currentMonth.length; d++) {
            const epoch = calculateEpoch(viewYear, viewMonth, d);
            const weekdayIndex = (epoch - 1) % weekLen;
            
            data[epoch] = {
                epoch,
                year: viewYear,
                timespan_index: viewMonth,
                day: d,
                week_day_name: calendar.static_data.weekdays[weekdayIndex],
                moon_phase: (calendar.static_data.moons || []).map(moon => getMoonPhase(moon, epoch))
            };
        }

        // Generate Climate (Seasons/Weather)
        if (calendar.static_data.seasons) {
            const climate = new Climate(data, calendar.static_data, calendar.dynamic_data, startEpoch, startEpoch + currentMonth.length - 1);
            climate.generate();
        }

        return data;
    }, [calendar, viewYear, viewMonth, calculateEpoch]);

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

    // Lane calculation for sessions
    const sessionLanes = useMemo(() => {
        if (!calendar || !sessions) return []
        
        // 1. Get sessions for current viewYear/viewMonth
        const monthSessions = sessions.filter(s => {
            if (!s.inGameDate) return false
            
            const start = s.inGameDate
            const end = {
                year: start.endYear ?? start.year,
                month: start.endMonth ?? start.month,
                day: start.endDay ?? start.day
            }
            
            const viewStartTotal = (viewYear * 10000) + (viewMonth * 100) + 1
            const viewEndTotal = (viewYear * 10000) + (viewMonth * 100) + (currentMonth.length || 31)
            
            const sessionStartTotal = (start.year * 10000) + (start.month * 100) + start.day
            const sessionEndTotal = (end.year * 10000) + (end.month * 100) + end.day
            
            return sessionStartTotal <= viewEndTotal && sessionEndTotal >= viewStartTotal
        })

        // 2. Sort sessions: earliest start, then longest duration
        monthSessions.sort((a, b) => {
            const startA = (a.inGameDate!.year * 10000) + (a.inGameDate!.month * 100) + a.inGameDate!.day
            const startB = (b.inGameDate!.year * 10000) + (b.inGameDate!.month * 100) + b.inGameDate!.day
            if (startA !== startB) return startA - startB
            
            const durA = ((a.inGameDate!.endYear ?? a.inGameDate!.year) * 10000 + (a.inGameDate!.endMonth ?? a.inGameDate!.month) * 100 + (a.inGameDate!.endDay ?? a.inGameDate!.day)) - startA
            const durB = ((b.inGameDate!.endYear ?? b.inGameDate!.year) * 10000 + (b.inGameDate!.endMonth ?? b.inGameDate!.month) * 100 + (b.inGameDate!.endDay ?? b.inGameDate!.day)) - startB
            return durB - durA
        })

        // 3. Assign lanes
        const lanes: { session: CalendarSession, lane: number }[] = []
        const dayOccupancy: Record<number, Set<number>> = {} // day -> Set of lanes

        monthSessions.forEach(session => {
            let lane = 0
            const startDay = (session.inGameDate!.year < viewYear || (session.inGameDate!.year === viewYear && session.inGameDate!.month < viewMonth)) ? 1 : session.inGameDate!.day
            const endDay = ((session.inGameDate!.endYear ?? session.inGameDate!.year) > viewYear || ((session.inGameDate!.endYear ?? session.inGameDate!.year) === viewYear && (session.inGameDate!.endMonth ?? session.inGameDate!.month) > viewMonth)) ? currentMonth.length : (session.inGameDate!.endDay ?? session.inGameDate!.day)

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
        return Math.max(...sessionLanes.map(sl => sl.lane))
    }, [sessionLanes])

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
                                    <DialogHeader>
                                        <DialogTitle>Re-import Calendar</DialogTitle>
                                        <DialogDescription>
                                            Upload or paste the exported JSON from Fantasy-Calendar.com.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                        <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-6 hover:bg-muted/50 transition-colors">
                                            <input
                                                type="file"
                                                id="calendar-file-reimport"
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
                                                <label htmlFor="calendar-file-reimport">
                                                    <Upload className="h-4 w-4" />
                                                    Select JSON File
                                                </label>
                                            </Button>
                                        </div>
                                        <Textarea 
                                            placeholder='{"name": "My World", ...}'
                                            className="min-h-[300px] font-mono text-xs"
                                            value={importText}
                                            onChange={(e) => setImportText(e.target.value)}
                                        />
                                    </div>
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
                            
                            const dayLanes = sessionLanes
                                .filter(sl => checkSessionOccurs(sl.session, viewYear, viewMonth, d))
                                .sort((a, b) => a.lane - b.lane)
                            
                            return (
                                <Popover key={i}>
                                    <PopoverTrigger asChild>
                                        <div 
                                            className={cn(
                                                "bg-card aspect-square sm:aspect-video p-1 sm:p-2 flex flex-col transition-colors relative group cursor-pointer",
                                                isToday ? "bg-primary/10" : "hover:bg-muted/10",
                                                dayLanes.length > 0 && !isToday && "bg-purple-500/5"
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
                                            <span className={cn("text-xs sm:text-sm font-bold self-center mb-1", isToday ? "text-primary scale-110" : "text-muted-foreground/50")}>
                                                {d}
                                            </span>

                                            {/* Moons in corner */}
                                            <div className="absolute top-0 right-0 p-0.5 flex flex-col items-end gap-0.5 opacity-40 group-hover:opacity-100 transition-opacity">
                                                {calendar.static_data.moons?.filter(m => !m.hidden).map((moon, mi) => {
                                                    const epoch = calculateEpoch(viewYear, viewMonth, d);
                                                    const phase = epochData[epoch]?.moon_phase?.[mi] ?? 0;
                                                    return (
                                                        <svg key={mi} width="12" height="12" viewBox="0 0 32 32">
                                                            <circle cx="16" cy="16" r="9.5" fill={moon.shadow_color || "#29344a"} />
                                                            <path d={moon_paths[Math.floor((phase / moon.granularity) * moon_paths.length)]} fill={moon.color || "#d5f4f1"} />
                                                        </svg>
                                                    );
                                                })}
                                            </div>

                                            {/* Weather Icon */}
                                            {epochData[calculateEpoch(viewYear, viewMonth, d)]?.weather && (
                                                <div className="absolute top-0 left-0 p-0.5 opacity-40 group-hover:opacity-100 transition-opacity">
                                                    {epochData[calculateEpoch(viewYear, viewMonth, d)].weather.precipitation.key !== 'None' ? (
                                                        <CloudRain className="h-3 w-3 text-blue-400" />
                                                    ) : (
                                                        <Sun className="h-3 w-3 text-amber-400" />
                                                    )}
                                                </div>
                                            )}
                                            
                                            <div className="flex flex-col gap-0.5 mt-1 -mx-1 sm:-mx-2 w-[calc(100%+0.5rem)] sm:w-[calc(100%+1rem)]">
                                                {/* Session Bars with Fixed Lanes for Alignment */}
                                                {[...Array(maxLane + 1)].map((_, laneIndex) => {
                                                    const sl = sessionLanes.find(l => 
                                                        l.lane === laneIndex && 
                                                        checkSessionOccurs(l.session, viewYear, viewMonth, d)
                                                    )
                                                    
                                                    if (!sl) return <div key={laneIndex} className="h-1.5 sm:h-2 w-full" /> // Spacer for empty lane

                                                    const isStart = sl.session.inGameDate!.year === viewYear && sl.session.inGameDate!.month === viewMonth && sl.session.inGameDate!.day === d
                                                    const isEnd = (sl.session.inGameDate!.endYear ?? sl.session.inGameDate!.year) === viewYear && (sl.session.inGameDate!.endMonth ?? sl.session.inGameDate!.month) === viewMonth && (sl.session.inGameDate!.endDay ?? sl.session.inGameDate!.day) === d
                                                    
                                                    return (
                                                        <div 
                                                            key={laneIndex} 
                                                            className={cn(
                                                                "h-1.5 sm:h-2 bg-purple-500/60 shadow-[0_0_2px_rgba(168,85,247,0.3)] relative group/bar transition-all shrink-0 z-10",
                                                                isStart ? "rounded-l-full ml-1" : "ml-0",
                                                                isEnd ? "rounded-r-full mr-1" : "mr-0",
                                                                isStart && isEnd ? "w-[calc(100%-8px)]" : isStart ? "w-[calc(100%-4px+1px)]" : isEnd ? "w-[calc(100%-4px)]" : "w-[calc(100%+1px)]"
                                                            )}
                                                            title={sl.session.quest?.name || "Session"}
                                                        >
                                                            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover/bar:opacity-100 transition-opacity" />
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-64 p-0 overflow-hidden">
                                        <div className="bg-muted/50 px-4 py-2 border-b border-border/50 flex justify-between items-center gap-2">
                                            <span className="text-xs font-bold uppercase tracking-wider truncate">{d} {currentMonth.name}</span>
                                            {isOwner && (
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="h-6 px-2 text-[9px] font-black uppercase tracking-tighter gap-1 hover:bg-primary/10 hover:text-primary transition-colors"
                                                    onClick={() => handleSetToday(viewYear, viewMonth, d)}
                                                >
                                                    <Clock className="h-3 w-3" />
                                                    Set Today
                                                </Button>
                                            )}
                                        </div>
                                        <div className="p-2 space-y-2 max-h-64 overflow-y-auto">
                                            {/* Sun & Moon Details */}
                                            {epochData[calculateEpoch(viewYear, viewMonth, d)]?.season?.time && (
                                                <div className="flex items-center justify-between px-2 py-1 bg-amber-500/5 rounded border border-amber-500/10 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                                    <div className="flex items-center gap-1">
                                                        <Sun className="h-3 w-3" />
                                                        <span className="opacity-70">Sunrise:</span> {epochData[calculateEpoch(viewYear, viewMonth, d)].season.time.sunrise.string}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <span className="opacity-70">Sunset:</span> {epochData[calculateEpoch(viewYear, viewMonth, d)].season.time.sunset.string}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Weather Details */}
                                            {epochData[calculateEpoch(viewYear, viewMonth, d)]?.weather && (
                                                <div className="flex flex-col gap-1 px-2 py-1 bg-blue-500/5 rounded border border-blue-500/10 text-[10px] font-medium">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                                            <Thermometer className="h-3 w-3" />
                                                            <span>{epochData[calculateEpoch(viewYear, viewMonth, d)].weather.temperature.metric.actual}°C ({epochData[calculateEpoch(viewYear, viewMonth, d)].weather.temperature.imperial.actual}°F)</span>
                                                        </div>
                                                        <span className="text-muted-foreground/70 italic">{epochData[calculateEpoch(viewYear, viewMonth, d)].weather.temperature.cinematic}</span>
                                                    </div>
                                                    {epochData[calculateEpoch(viewYear, viewMonth, d)].weather.precipitation.key !== 'None' && (
                                                        <div className="flex items-center gap-1 text-blue-500">
                                                            <CloudRain className="h-3 w-3" />
                                                            <span>{epochData[calculateEpoch(viewYear, viewMonth, d)].weather.precipitation.key}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {calendar.static_data.moons?.length && (
                                                <div className="flex flex-wrap gap-2 p-1">
                                                    {calendar.static_data.moons.filter(m => !m.hidden).map((moon, mi) => {
                                                        const epoch = calculateEpoch(viewYear, viewMonth, d);
                                                        const phase = epochData[epoch]?.moon_phase?.[mi] ?? 0;
                                                        return (
                                                            <div key={mi} className="flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded-full border border-border/50">
                                                                <svg width="16" height="16" viewBox="0 0 32 32">
                                                                    <circle cx="16" cy="16" r="9.5" fill={moon.shadow_color || "#29344a"} />
                                                                    <path d={moon_paths[Math.floor((phase / moon.granularity) * moon_paths.length)]} fill={moon.color || "#d5f4f1"} />
                                                                </svg>
                                                                <span className="text-[10px] font-bold text-muted-foreground">{moon.name}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                            {dayLanes.length === 0 && <p className="text-[10px] text-muted-foreground italic text-center py-2">No sessions</p>}
                                            
                                            {dayLanes.length > 0 && (
                                                <div className="space-y-1">
                                                    <p className="text-[9px] font-black uppercase text-purple-500 ml-1 mb-1">Sessions</p>
                                                    {dayLanes.map(sl => {
                                                        const s = sl.session
                                                        return (
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
                                                                            {s.quest?.name || "Session"}
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
                                                        )
                                                    })}
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
        </Card>
    )
}
