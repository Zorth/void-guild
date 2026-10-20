'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Plus,
    Trash2,
    ArrowUp,
    ArrowDown,
    Sun,
    Sunrise,
    Sunset,
    CloudRain,
    MapPin,
    Dices,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
    FantasyCalendarJSON,
    FantasySeason,
    FantasyLocation,
    formatClockTime,
    formatDaylightDuration,
} from '@/lib/fantasy-calendar/types'
import { SEASON_COLOR_SWATCHES } from '@/lib/fantasy-calendar/presets'

interface SeasonsClimateTabProps {
    draft: FantasyCalendarJSON
    onChange: (updated: FantasyCalendarJSON) => void
}

export default function SeasonsClimateTab({ draft, onChange }: SeasonsClimateTabProps) {
    const months = draft.static_data.months || []
    const seasonsBlock = draft.static_data.seasons || {
        data: [],
        locations: [],
        global_settings: { enable_weather: true, temp_sys: 'metric' as const, seed: 12345 },
    }
    const seasons = seasonsBlock.data || []
    const locations = seasonsBlock.locations || []
    const globalSettings = seasonsBlock.global_settings || { enable_weather: true, temp_sys: 'metric' as const }
    const hoursPerDay = draft.static_data.clock?.hours || 24
    const minutesPerHour = draft.static_data.clock?.minutes || 60

    const [selectedLocIdx, setSelectedLocIdx] = useState<number>(0)

    const updateSeasonsBlock = (
        nextData: FantasySeason[],
        nextLocations: FantasyLocation[] = locations,
        nextSettings = globalSettings
    ) => {
        onChange({
            ...draft,
            static_data: {
                ...draft.static_data,
                seasons: {
                    ...seasonsBlock,
                    data: nextData,
                    locations: nextLocations,
                    global_settings: nextSettings,
                },
            },
        })
    }

    const addSeason = () => {
        const idx = seasons.length
        const defaultMonth = Math.min(idx * 3, Math.max(0, months.length - 1))
        const swatch = SEASON_COLOR_SWATCHES[idx % SEASON_COLOR_SWATCHES.length].value
        const nextColor = SEASON_COLOR_SWATCHES[(idx + 1) % SEASON_COLOR_SWATCHES.length].value
        const newSeason: FantasySeason = {
            name: `Season ${idx + 1}`,
            color: [swatch, nextColor],
            timespan: defaultMonth,
            day: 1,
            time: {
                sunrise: { hour: 7, minute: 0 },
                sunset: { hour: 19, minute: 0 },
            },
            weather: {
                temp_low: 5,
                temp_high: 18,
                precipitation: 0.3,
                precipitation_intensity: 0.4,
            },
        }
        // Also append a matching season entry to every existing location
        const updatedLocs = locations.map((loc) => ({
            ...loc,
            seasons: [
                ...(loc.seasons || []),
                {
                    weather: { temp_low: 5, temp_high: 18, precipitation: 0.3, precipitation_intensity: 0.4 },
                    time: { sunrise: { hour: 7, minute: 0 }, sunset: { hour: 19, minute: 0 } },
                },
            ],
        }))
        updateSeasonsBlock([...seasons, newSeason], updatedLocs)
    }

    const updateSeason = (idx: number, patch: Partial<FantasySeason>) => {
        const next = seasons.map((s, i) => (i === idx ? { ...s, ...patch } : s))
        // Sync sunrise/sunset into locations that mirror season times
        const updatedLocs = locations.map((loc) => {
            if (!patch.time) return loc
            const locSeasons = [...(loc.seasons || [])]
            if (locSeasons[idx]) {
                locSeasons[idx] = {
                    ...locSeasons[idx],
                    time: patch.time,
                }
            }
            return { ...loc, seasons: locSeasons }
        })
        updateSeasonsBlock(next, updatedLocs)
    }

    const moveSeason = (idx: number, dir: -1 | 1) => {
        const target = idx + dir
        if (target < 0 || target >= seasons.length) return
        const next = [...seasons]
        const [item] = next.splice(idx, 1)
        next.splice(target, 0, item)

        const updatedLocs = locations.map((loc) => {
            const locSeasons = [...(loc.seasons || [])]
            if (locSeasons.length > Math.max(idx, target)) {
                const [lItem] = locSeasons.splice(idx, 1)
                locSeasons.splice(target, 0, lItem)
            }
            return { ...loc, seasons: locSeasons }
        })
        updateSeasonsBlock(next, updatedLocs)
    }

    const removeSeason = (idx: number) => {
        const next = seasons.filter((_, i) => i !== idx)
        const updatedLocs = locations.map((loc) => ({
            ...loc,
            seasons: (loc.seasons || []).filter((_, i) => i !== idx),
        }))
        updateSeasonsBlock(next, updatedLocs)
    }

    const addLocation = () => {
        const newLoc: FantasyLocation = {
            name: `Region ${locations.length + 1}`,
            settings: {
                timezone: { hour: 0, minute: 0 },
                large_noise_frequency: 0.015,
                large_noise_amplitude: 10,
                medium_noise_frequency: 0.3,
                medium_noise_amplitude: 4,
                small_noise_frequency: 0.8,
                small_noise_amplitude: 5,
                season_based_time: true,
            },
            seasons: seasons.map((s) => ({
                weather: {
                    temp_low: s.weather?.temp_low ?? 5,
                    temp_high: s.weather?.temp_high ?? 18,
                    precipitation: s.weather?.precipitation ?? 0.3,
                    precipitation_intensity: s.weather?.precipitation_intensity ?? 0.4,
                },
                time: {
                    sunrise: { ...(s.time?.sunrise || { hour: 7, minute: 0 }) },
                    sunset: { ...(s.time?.sunset || { hour: 19, minute: 0 }) },
                },
            })),
        }
        const nextLocs = [...locations, newLoc]
        updateSeasonsBlock(seasons, nextLocs)
        setSelectedLocIdx(nextLocs.length - 1)
    }

    const removeLocation = (idx: number) => {
        const nextLocs = locations.filter((_, i) => i !== idx)
        updateSeasonsBlock(seasons, nextLocs)
        setSelectedLocIdx(Math.max(0, Math.min(selectedLocIdx, nextLocs.length - 1)))
    }

    const updateLocationName = (idx: number, name: string) => {
        const nextLocs = locations.map((loc, i) => (i === idx ? { ...loc, name } : loc))
        updateSeasonsBlock(seasons, nextLocs)
    }

    const updateLocationSeasonWeather = (
        locIdx: number,
        seasonIdx: number,
        patch: Partial<FantasyLocation['seasons'][number]['weather']>
    ) => {
        const nextLocs = locations.map((loc, lIdx) => {
            if (lIdx !== locIdx) return loc
            const nextSeasons = seasons.map((s, sIdx) => {
                const existing = loc.seasons?.[sIdx] || {
                    weather: { temp_low: 5, temp_high: 18, precipitation: 0.3, precipitation_intensity: 0.4 },
                    time: s.time,
                }
                if (sIdx !== seasonIdx) return existing
                return {
                    ...existing,
                    weather: {
                        ...existing.weather,
                        ...patch,
                    },
                }
            })
            return { ...loc, seasons: nextSeasons }
        })
        updateSeasonsBlock(seasons, nextLocs)
    }

    const activeLoc = locations[selectedLocIdx]
    const tempUnitLabel = (globalSettings.temp_sys || 'metric') === 'metric' ? '°C' : '°F'

    return (
        <div className="flex flex-col gap-4">
            {/* Seasons & Sunrise/Sunset Section */}
            <div className="p-4 rounded-lg bg-muted/20 border border-border/50 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sun className="h-4 w-4 text-amber-400" />
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider">
                                Seasons, Sunrise &amp; Sunset ({seasons.length})
                            </h4>
                            <p className="text-[10px] text-muted-foreground">
                                Sunrise and sunset times smoothly interpolate day-by-day between seasonal anchor dates.
                            </p>
                        </div>
                    </div>
                    <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={addSeason}>
                        <Plus className="h-3.5 w-3.5" /> Add Season
                    </Button>
                </div>

                {seasons.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic text-center py-3">
                        No seasons configured yet. Add seasons to track sunrise, sunset, solstices, and weather.
                    </p>
                ) : (
                    <div className="flex flex-col gap-3">
                        {seasons.map((season, idx) => {
                            const primaryColor = Array.isArray(season.color) && season.color[0] ? season.color[0] : '#0bcfe9'
                            const sr = season.time?.sunrise || { hour: 7, minute: 0 }
                            const ss = season.time?.sunset || { hour: 19, minute: 0 }

                            const totalDayMins = hoursPerDay * minutesPerHour
                            const srPct = Math.min(100, Math.max(0, ((sr.hour * minutesPerHour + sr.minute) / totalDayMins) * 100))
                            const ssPct = Math.min(100, Math.max(0, ((ss.hour * minutesPerHour + ss.minute) / totalDayMins) * 100))
                            const widthPct = Math.max(2, ssPct >= srPct ? ssPct - srPct : 100 - srPct)

                            return (
                                <div
                                    key={idx}
                                    className="p-3.5 rounded-lg bg-card/70 border border-border/50 flex flex-col gap-3"
                                >
                                    {/* Top Row: Name, Start Month, Start Day, Actions */}
                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                                        <div className="sm:col-span-4 space-y-1">
                                            <label className="text-[10px] font-bold uppercase text-muted-foreground">
                                                Season Name
                                            </label>
                                            <Input
                                                value={season.name}
                                                onChange={(e) => updateSeason(idx, { name: e.target.value })}
                                                placeholder="e.g. Winter, Spring..."
                                                className="h-8 text-xs"
                                            />
                                        </div>
                                        <div className="sm:col-span-4 space-y-1">
                                            <label className="text-[10px] font-bold uppercase text-muted-foreground">
                                                Starts in Month
                                            </label>
                                            <select
                                                className="w-full h-8 rounded-md border border-border bg-card px-2 text-xs"
                                                value={season.timespan ?? 0}
                                                onChange={(e) =>
                                                    updateSeason(idx, { timespan: parseInt(e.target.value) || 0 })
                                                }
                                            >
                                                {months.map((m, mIdx) => (
                                                    <option key={mIdx} value={mIdx}>
                                                        {mIdx + 1}. {m.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="sm:col-span-2 space-y-1">
                                            <label className="text-[10px] font-bold uppercase text-muted-foreground">
                                                Start Day
                                            </label>
                                            <Input
                                                type="number"
                                                min={1}
                                                max={months[season.timespan ?? 0]?.length || 31}
                                                value={season.day ?? 1}
                                                onChange={(e) =>
                                                    updateSeason(idx, { day: Math.max(1, parseInt(e.target.value) || 1) })
                                                }
                                                className="h-8 text-xs"
                                            />
                                        </div>
                                        <div className="sm:col-span-2 flex items-center justify-end gap-1">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                disabled={idx === 0}
                                                onClick={() => moveSeason(idx, -1)}
                                            >
                                                <ArrowUp className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                disabled={idx === seasons.length - 1}
                                                onClick={() => moveSeason(idx, 1)}
                                            >
                                                <ArrowDown className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive hover:text-destructive"
                                                onClick={() => removeSeason(idx)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Middle Row: Sunrise & Sunset Pickers + Color Swatches */}
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center pt-2 border-t border-border/30">
                                        <div className="md:col-span-3 space-y-1">
                                            <label className="text-[10px] font-bold uppercase text-amber-400 flex items-center gap-1">
                                                <Sunrise className="h-3 w-3" /> Sunrise (HH : MM)
                                            </label>
                                            <div className="flex items-center gap-1">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={hoursPerDay - 1}
                                                    value={sr.hour}
                                                    onChange={(e) =>
                                                        updateSeason(idx, {
                                                            time: {
                                                                sunrise: {
                                                                    hour: Math.min(hoursPerDay - 1, Math.max(0, parseInt(e.target.value) || 0)),
                                                                    minute: sr.minute,
                                                                },
                                                                sunset: ss,
                                                            },
                                                        })
                                                    }
                                                    className="h-7 text-xs text-center"
                                                />
                                                <span className="text-xs font-bold">:</span>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={minutesPerHour - 1}
                                                    step={5}
                                                    value={sr.minute}
                                                    onChange={(e) =>
                                                        updateSeason(idx, {
                                                            time: {
                                                                sunrise: {
                                                                    hour: sr.hour,
                                                                    minute: Math.min(minutesPerHour - 1, Math.max(0, parseInt(e.target.value) || 0)),
                                                                },
                                                                sunset: ss,
                                                            },
                                                        })
                                                    }
                                                    className="h-7 text-xs text-center"
                                                />
                                            </div>
                                        </div>

                                        <div className="md:col-span-3 space-y-1">
                                            <label className="text-[10px] font-bold uppercase text-orange-400 flex items-center gap-1">
                                                <Sunset className="h-3 w-3" /> Sunset (HH : MM)
                                            </label>
                                            <div className="flex items-center gap-1">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={hoursPerDay - 1}
                                                    value={ss.hour}
                                                    onChange={(e) =>
                                                        updateSeason(idx, {
                                                            time: {
                                                                sunrise: sr,
                                                                sunset: {
                                                                    hour: Math.min(hoursPerDay - 1, Math.max(0, parseInt(e.target.value) || 0)),
                                                                    minute: ss.minute,
                                                                },
                                                            },
                                                        })
                                                    }
                                                    className="h-7 text-xs text-center"
                                                />
                                                <span className="text-xs font-bold">:</span>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={minutesPerHour - 1}
                                                    step={5}
                                                    value={ss.minute}
                                                    onChange={(e) =>
                                                        updateSeason(idx, {
                                                            time: {
                                                                sunrise: sr,
                                                                sunset: {
                                                                    hour: ss.hour,
                                                                    minute: Math.min(minutesPerHour - 1, Math.max(0, parseInt(e.target.value) || 0)),
                                                                },
                                                            },
                                                        })
                                                    }
                                                    className="h-7 text-xs text-center"
                                                />
                                            </div>
                                        </div>

                                        <div className="md:col-span-6 space-y-1">
                                            <label className="text-[10px] font-bold uppercase text-muted-foreground">
                                                Season Accent Color
                                            </label>
                                            <div className="flex flex-wrap gap-2 items-center">
                                                {SEASON_COLOR_SWATCHES.map((sw) => {
                                                    const selected = primaryColor.toLowerCase() === sw.value.toLowerCase()
                                                    return (
                                                        <button
                                                            key={sw.value}
                                                            type="button"
                                                            title={sw.label}
                                                            onClick={() =>
                                                                updateSeason(idx, {
                                                                    color: [sw.value, season.color?.[1] || sw.value],
                                                                })
                                                            }
                                                            className={cn(
                                                                'w-6 h-6 rounded-full border border-border/50 transition-all',
                                                                selected && 'ring-2 ring-purple-500 ring-offset-1 ring-offset-background scale-110'
                                                            )}
                                                            style={{ backgroundColor: sw.value }}
                                                        />
                                                    )
                                                })}
                                                <input
                                                    type="color"
                                                    value={primaryColor}
                                                    onChange={(e) =>
                                                        updateSeason(idx, {
                                                            color: [e.target.value, season.color?.[1] || e.target.value],
                                                        })
                                                    }
                                                    className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                                                    title="Custom hex color"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Visual 24-Hour Daylight Duration Bar */}
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                            <span>🌅 Sunrise {formatClockTime(sr)}</span>
                                            <span className="font-bold text-amber-300">
                                                ☀️ {formatDaylightDuration(sr, ss, hoursPerDay, minutesPerHour)}
                                            </span>
                                            <span>🌇 Sunset {formatClockTime(ss)}</span>
                                        </div>
                                        <div className="h-2.5 w-full rounded-full bg-slate-950 border border-border/40 relative overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-amber-500/80 via-yellow-300/90 to-orange-500/80 transition-all"
                                                style={{
                                                    marginLeft: `${srPct}%`,
                                                    width: `${widthPct}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Climate & Regional Locations (Sythian Hatham / Kalogeron / Nosia style) */}
            <div className="p-4 rounded-lg bg-muted/20 border border-border/50 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <CloudRain className="h-4 w-4 text-purple-400" />
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider">
                                Regional Climate &amp; Weather Locations ({locations.length})
                            </h4>
                            <p className="text-[10px] text-muted-foreground">
                                Configure regional weather profiles (like Sythian&apos;s Hatham, Kalogeron, and Nosia) for procedural daily temperature &amp; precipitation.
                            </p>
                        </div>
                    </div>
                    <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={addLocation}>
                        <Plus className="h-3.5 w-3.5" /> Add Location
                    </Button>
                </div>

                {/* Global Weather Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end p-3 rounded-md bg-card/50 border border-border/40">
                    <div className="flex items-center gap-2 h-8">
                        <Checkbox
                            id="enable-weather"
                            checked={globalSettings.enable_weather !== false}
                            onCheckedChange={(checked) =>
                                updateSeasonsBlock(seasons, locations, {
                                    ...globalSettings,
                                    enable_weather: Boolean(checked),
                                })
                            }
                        />
                        <label htmlFor="enable-weather" className="text-xs font-bold cursor-pointer">
                            Enable Procedural Weather
                        </label>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">
                            Temperature &amp; Wind Units
                        </label>
                        <select
                            className="w-full h-8 rounded-md border border-border bg-card px-2 text-xs"
                            value={globalSettings.temp_sys || 'metric'}
                            onChange={(e) => {
                                const sys = e.target.value as 'metric' | 'imperial'
                                updateSeasonsBlock(seasons, locations, {
                                    ...globalSettings,
                                    temp_sys: sys,
                                    wind_sys: sys,
                                })
                            }}
                        >
                            <option value="metric">Metric (°C)</option>
                            <option value="imperial">Imperial (°F)</option>
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">
                            Weather Seed
                        </label>
                        <div className="flex items-center gap-1">
                            <Input
                                type="number"
                                value={globalSettings.seed ?? 12345}
                                onChange={(e) =>
                                    updateSeasonsBlock(seasons, locations, {
                                        ...globalSettings,
                                        seed: parseInt(e.target.value) || 12345,
                                    })
                                }
                                className="h-8 text-xs"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 shrink-0"
                                title="Randomize Seed"
                                onClick={() =>
                                    updateSeasonsBlock(seasons, locations, {
                                        ...globalSettings,
                                        seed: Math.floor(Math.random() * 2000000000),
                                    })
                                }
                            >
                                <Dices className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Location Pills & Per-Season Weather Table */}
                {locations.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic text-center py-2">
                        No climate locations added yet. Click &ldquo;Add Location&rdquo; to define regional weather profiles.
                    </p>
                ) : (
                    <div className="space-y-3">
                        <div className="flex flex-wrap gap-1.5 items-center">
                            {locations.map((loc, lIdx) => (
                                <button
                                    key={lIdx}
                                    type="button"
                                    onClick={() => setSelectedLocIdx(lIdx)}
                                    className={cn(
                                        'px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 transition-all',
                                        selectedLocIdx === lIdx
                                            ? 'bg-purple-500/20 border-purple-500 text-purple-200'
                                            : 'bg-card/60 border-border/40 text-muted-foreground hover:text-foreground'
                                    )}
                                >
                                    <MapPin className="h-3 w-3" />
                                    {loc.name}
                                </button>
                            ))}
                        </div>

                        {activeLoc && (
                            <div className="p-3 rounded-md bg-card/70 border border-border/50 space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 flex-grow max-w-sm">
                                        <span className="text-[10px] font-bold uppercase text-muted-foreground shrink-0">
                                            Location Name:
                                        </span>
                                        <Input
                                            value={activeLoc.name}
                                            onChange={(e) => updateLocationName(selectedLocIdx, e.target.value)}
                                            className="h-7 text-xs"
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs text-destructive hover:text-destructive gap-1"
                                        onClick={() => removeLocation(selectedLocIdx)}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" /> Remove Location
                                    </Button>
                                </div>

                                <div className="space-y-2">
                                    {seasons.map((season, sIdx) => {
                                        const w = activeLoc.seasons?.[sIdx]?.weather || {
                                            temp_low: 5,
                                            temp_high: 18,
                                            precipitation: 0.3,
                                            precipitation_intensity: 0.4,
                                        }
                                        return (
                                            <div
                                                key={sIdx}
                                                className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-center p-2 rounded bg-muted/20 border border-border/30"
                                            >
                                                <div className="col-span-2 sm:col-span-1 flex items-center gap-1.5">
                                                    <span
                                                        className="w-2.5 h-2.5 rounded-full shrink-0"
                                                        style={{ backgroundColor: season.color?.[0] || '#a855f7' }}
                                                    />
                                                    <span className="text-xs font-bold truncate">{season.name}</span>
                                                </div>
                                                <div className="space-y-0.5">
                                                    <label className="text-[9px] font-bold uppercase text-muted-foreground">
                                                        Low ({tempUnitLabel})
                                                    </label>
                                                    <Input
                                                        type="number"
                                                        value={Math.round(Number(w.temp_low ?? 0))}
                                                        onChange={(e) =>
                                                            updateLocationSeasonWeather(selectedLocIdx, sIdx, {
                                                                temp_low: parseFloat(e.target.value) || 0,
                                                            })
                                                        }
                                                        className="h-7 text-xs"
                                                    />
                                                </div>
                                                <div className="space-y-0.5">
                                                    <label className="text-[9px] font-bold uppercase text-muted-foreground">
                                                        High ({tempUnitLabel})
                                                    </label>
                                                    <Input
                                                        type="number"
                                                        value={Math.round(Number(w.temp_high ?? 15))}
                                                        onChange={(e) =>
                                                            updateLocationSeasonWeather(selectedLocIdx, sIdx, {
                                                                temp_high: parseFloat(e.target.value) || 0,
                                                            })
                                                        }
                                                        className="h-7 text-xs"
                                                    />
                                                </div>
                                                <div className="space-y-0.5">
                                                    <label className="text-[9px] font-bold uppercase text-muted-foreground">
                                                        Rain Chance (%)
                                                    </label>
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        max={100}
                                                        value={Math.round((Number(w.precipitation ?? 0.3)) * 100)}
                                                        onChange={(e) =>
                                                            updateLocationSeasonWeather(selectedLocIdx, sIdx, {
                                                                precipitation: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) / 100,
                                                            })
                                                        }
                                                        className="h-7 text-xs"
                                                    />
                                                </div>
                                                <div className="space-y-0.5">
                                                    <label className="text-[9px] font-bold uppercase text-muted-foreground">
                                                        Intensity (%)
                                                    </label>
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        max={100}
                                                        value={Math.round((Number(w.precipitation_intensity ?? 0.4)) * 100)}
                                                        onChange={(e) =>
                                                            updateLocationSeasonWeather(selectedLocIdx, sIdx, {
                                                                precipitation_intensity: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) / 100,
                                                            })
                                                        }
                                                        className="h-7 text-xs"
                                                    />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
