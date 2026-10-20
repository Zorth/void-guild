'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, ArrowUp, ArrowDown, Moon as MoonIcon, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FantasyCalendarJSON, FantasyMoon, getMoonPhaseName } from '@/lib/fantasy-calendar/types'
import { MOON_SVG_PATHS, MOON_COLOR_PRESETS } from '@/lib/fantasy-calendar/presets'

interface MoonsTabProps {
    draft: FantasyCalendarJSON
    onChange: (updated: FantasyCalendarJSON) => void
}

export default function MoonsTab({ draft, onChange }: MoonsTabProps) {
    const moons = draft.static_data.moons || []

    const syncMoons = (nextMoons: FantasyMoon[]) => {
        onChange({
            ...draft,
            static_data: {
                ...draft.static_data,
                moons: nextMoons,
            },
        })
    }

    const addMoon = () => {
        const preset = MOON_COLOR_PRESETS[moons.length % MOON_COLOR_PRESETS.length]
        const newMoon: FantasyMoon = {
            name: `Moon ${moons.length + 1}`,
            cycle: 28,
            shift: 0,
            granularity: 16,
            cycle_rounding: 'round',
            color: preset.color,
            shadow_color: preset.shadow,
            hidden: false,
            custom_phase: false,
        }
        syncMoons([...moons, newMoon])
    }

    const updateMoon = (idx: number, patch: Partial<FantasyMoon>) => {
        syncMoons(moons.map((m, i) => (i === idx ? { ...m, ...patch } : m)))
    }

    const moveMoon = (idx: number, dir: -1 | 1) => {
        const target = idx + dir
        if (target < 0 || target >= moons.length) return
        const next = [...moons]
        const [item] = next.splice(idx, 1)
        next.splice(target, 0, item)
        syncMoons(next)
    }

    const removeMoon = (idx: number) => {
        syncMoons(moons.filter((_, i) => i !== idx))
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="p-4 rounded-lg bg-muted/20 border border-border/50 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <MoonIcon className="h-4 w-4 text-purple-400" />
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider">
                                Celestial Moons &amp; Lunar Cycles ({moons.length})
                            </h4>
                            <p className="text-[10px] text-muted-foreground">
                                Configure multiple moons (like Sythian&apos;s Desna &amp; Arash) with independent orbital cycles, phase offsets, and colors.
                            </p>
                        </div>
                    </div>
                    <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={addMoon}>
                        <Plus className="h-3.5 w-3.5" /> Add Moon
                    </Button>
                </div>

                {moons.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic text-center py-4">
                        No moons configured. Click &ldquo;Add Moon&rdquo; to add one or more lunar cycles to your world.
                    </p>
                ) : (
                    <div className="flex flex-col gap-3">
                        {moons.map((moon, idx) => {
                            const granularity = Number(moon.granularity) || 16
                            const previewSteps = Math.min(granularity, 16)
                            return (
                                <div
                                    key={idx}
                                    className="p-3.5 rounded-lg bg-card/70 border border-border/50 flex flex-col gap-3"
                                >
                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                                        <div className="sm:col-span-4 space-y-1">
                                            <label className="text-[10px] font-bold uppercase text-muted-foreground">
                                                Moon Name
                                            </label>
                                            <Input
                                                value={moon.name}
                                                onChange={(e) => updateMoon(idx, { name: e.target.value })}
                                                placeholder="e.g. Desna, Arash..."
                                                className="h-8 text-xs"
                                            />
                                        </div>
                                        <div className="sm:col-span-2 space-y-1">
                                            <label className="text-[10px] font-bold uppercase text-muted-foreground">
                                                Cycle (Days)
                                            </label>
                                            <Input
                                                type="number"
                                                min={1}
                                                step="0.25"
                                                value={moon.cycle}
                                                onChange={(e) =>
                                                    updateMoon(idx, {
                                                        cycle: Math.max(1, parseFloat(e.target.value) || 1),
                                                    })
                                                }
                                                className="h-8 text-xs"
                                            />
                                        </div>
                                        <div className="sm:col-span-2 space-y-1">
                                            <label className="text-[10px] font-bold uppercase text-muted-foreground">
                                                Phase Shift
                                            </label>
                                            <Input
                                                type="number"
                                                step="1"
                                                value={Number(moon.shift) || 0}
                                                onChange={(e) =>
                                                    updateMoon(idx, { shift: parseFloat(e.target.value) || 0 })
                                                }
                                                className="h-8 text-xs"
                                            />
                                        </div>
                                        <div className="sm:col-span-2 space-y-1">
                                            <label className="text-[10px] font-bold uppercase text-muted-foreground">
                                                Granularity
                                            </label>
                                            <select
                                                className="w-full h-8 rounded-md border border-border bg-card px-2 text-xs"
                                                value={granularity}
                                                onChange={(e) =>
                                                    updateMoon(idx, { granularity: parseInt(e.target.value) || 16 })
                                                }
                                            >
                                                <option value={8}>8 Phases</option>
                                                <option value={16}>16 Phases</option>
                                                <option value={24}>24 Phases</option>
                                                <option value={48}>48 Phases</option>
                                            </select>
                                        </div>
                                        <div className="sm:col-span-2 flex items-center justify-end gap-1">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                title={moon.hidden ? 'Hidden on Calendar' : 'Visible on Calendar'}
                                                onClick={() => updateMoon(idx, { hidden: !moon.hidden })}
                                            >
                                                {moon.hidden ? (
                                                    <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                                                ) : (
                                                    <Eye className="h-3.5 w-3.5 text-purple-400" />
                                                )}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                disabled={idx === 0}
                                                onClick={() => moveMoon(idx, -1)}
                                            >
                                                <ArrowUp className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                disabled={idx === moons.length - 1}
                                                onClick={() => moveMoon(idx, 1)}
                                            >
                                                <ArrowDown className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive hover:text-destructive"
                                                onClick={() => removeMoon(idx)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Color Presets & Custom Pickers */}
                                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/30">
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                                                Color Presets (Face / Shadow)
                                            </span>
                                            <div className="flex flex-wrap gap-2.5 items-center">
                                                {MOON_COLOR_PRESETS.map((preset) => {
                                                    const isSelected =
                                                        (moon.color || '').toLowerCase() === preset.color.toLowerCase()
                                                    return (
                                                        <button
                                                            key={preset.name}
                                                            type="button"
                                                            title={preset.name}
                                                            onClick={() =>
                                                                updateMoon(idx, {
                                                                    color: preset.color,
                                                                    shadow_color: preset.shadow,
                                                                })
                                                            }
                                                            className={cn(
                                                                'w-8 h-8 rounded-full border border-border/60 flex items-center justify-center transition-all',
                                                                isSelected &&
                                                                    'ring-2 ring-purple-500 ring-offset-2 ring-offset-background scale-110'
                                                            )}
                                                            style={{
                                                                background: `linear-gradient(135deg, ${preset.color} 55%, ${preset.shadow} 45%)`,
                                                            }}
                                                        />
                                                    )
                                                })}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-1.5">
                                                <label className="text-[10px] font-bold uppercase text-muted-foreground">
                                                    Glow:
                                                </label>
                                                <input
                                                    type="color"
                                                    value={moon.color || '#d5f4f1'}
                                                    onChange={(e) => updateMoon(idx, { color: e.target.value })}
                                                    className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
                                                />
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <label className="text-[10px] font-bold uppercase text-muted-foreground">
                                                    Shadow:
                                                </label>
                                                <input
                                                    type="color"
                                                    value={moon.shadow_color || '#29344a'}
                                                    onChange={(e) => updateMoon(idx, { shadow_color: e.target.value })}
                                                    className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Live Lunar Cycle Strip Preview */}
                                    <div className="p-2 rounded-md bg-muted/30 border border-border/30 flex items-center justify-between overflow-x-auto gap-1">
                                        {Array.from({ length: previewSteps }).map((_, stepIdx) => {
                                            const phaseIdx = Math.floor((stepIdx / previewSteps) * granularity)
                                            const pathD =
                                                MOON_SVG_PATHS[
                                                    Math.floor((phaseIdx / granularity) * MOON_SVG_PATHS.length)
                                                ]
                                            return (
                                                <div
                                                    key={stepIdx}
                                                    className="flex flex-col items-center gap-0.5 shrink-0 px-0.5"
                                                    title={`${getMoonPhaseName(phaseIdx, granularity)} (Phase ${phaseIdx})`}
                                                >
                                                    <svg width="20" height="20" viewBox="0 0 32 32">
                                                        <circle
                                                            cx="16"
                                                            cy="16"
                                                            r="9.5"
                                                            fill={moon.shadow_color || '#29344a'}
                                                        />
                                                        <path d={pathD} fill={moon.color || '#d5f4f1'} />
                                                    </svg>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
