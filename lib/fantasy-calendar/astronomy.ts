import {
    FantasyCalendarJSON,
    EvaluatedSeasonData,
    EvaluatedWeatherData,
    getMoonPhaseName,
} from './types'
import { MOON_SVG_PATHS } from './presets'
import { Climate } from './climate'
import { EventEvaluator } from './events'

export interface EvaluatedMoonPhase {
    name: string
    color: string
    shadow_color?: string
    path: string
    phaseIndex: number
    granularity: number
    phaseName: string
    cycle: number
    isFullMoon: boolean
    isNewMoon: boolean
}

export interface EvaluatedDayEvent {
    id: number | string
    name: string
    description: string
    color: string
    hidden: boolean
    categoryName?: string
}

export type TimeOfDayPhase = 'Dawn' | 'Daylight' | 'Dusk' | 'Night'

export interface EvaluatedSingleDay {
    year: number
    month: number
    monthName: string
    day: number
    epoch: number
    yearDay: number
    weekdayIndex: number
    weekdayName: string
    season: EvaluatedSeasonData | null
    weather: EvaluatedWeatherData | null
    moons: EvaluatedMoonPhase[]
    events: EvaluatedDayEvent[]
    timeOfDay: TimeOfDayPhase
}

export interface LunarAlignmentPrediction {
    year: number
    month: number
    monthName: string
    day: number
    daysFromStart: number
    type: 'full_conjunction' | 'new_conjunction' | 'phase_alignment' | 'full_moon' | 'new_moon'
    title: string
    subtitle: string
    moons: EvaluatedMoonPhase[]
}

export function isLeapEventActive(intervalStr: string | number, offsetNum: number, targetYear: number): boolean {
    if (!intervalStr) return false
    const intervals = String(intervalStr).split(',')
    let valid = false

    for (const intPart of intervals) {
        let ignore = false
        let numStr = intPart.trim()
        if (numStr.startsWith('!')) {
            ignore = true
            numStr = numStr.slice(1)
        }
        const val = parseInt(numStr, 10)
        if (!val || isNaN(val)) continue

        const offset = ignore ? 0 : (Number(offsetNum) || 0)
        const modYear = targetYear + 1 - offset

        if (modYear % val === 0) {
            if (ignore) return false
            valid = true
        }
    }
    return valid
}

export function getMonthDaysInYear(calendar: FantasyCalendarJSON, monthIdx: number, year: number): number {
    const months = calendar.static_data.year_data?.timespans || calendar.static_data.months || []
    const m = months[monthIdx]
    if (!m) return 30
    if (m.interval && m.interval > 1) {
        if (!isLeapEventActive(m.interval, m.offset || 0, year)) {
            return 0
        }
    }
    const leapDays = calendar.static_data.year_data?.leap_days || []
    let extra = 0
    for (const ld of leapDays) {
        if (ld.timespan === monthIdx && isLeapEventActive(ld.interval, ld.offset || 0, year)) {
            extra += 1
        }
    }
    return (Number(m.length) || 30) + extra
}

export function getTotalDaysInYear(calendar: FantasyCalendarJSON, year: number): number {
    const months = calendar.static_data.year_data?.timespans || calendar.static_data.months || []
    let total = 0
    for (let m = 0; m < months.length; m++) {
        total += getMonthDaysInYear(calendar, m, year)
    }
    return total || 365
}

export function computeDateEpochAndYearDay(
    calendar: FantasyCalendarJSON,
    targetYear: number,
    targetMonth: number,
    targetDay: number
): { epoch: number; yearDay: number; weekdayIndex: number; weekdayName: string } {
    const months = calendar.static_data.year_data?.timespans || calendar.static_data.months || []
    const weekdays = calendar.static_data.year_data?.global_week || calendar.static_data.weekdays || ['Day 1']
    const firstDayOffset = (Number(calendar.static_data.year_data?.first_day) || 1) - 1
    const overflow = calendar.static_data.year_data?.overflow !== false
    const hasYearZero = Boolean(calendar.static_data.settings?.year_zero_exists)

    let totalDaysElapsed = 0
    let globalWeekNum = firstDayOffset

    if (targetYear >= 1) {
        for (let y = 1; y < targetYear; y++) {
            const yLen = getTotalDaysInYear(calendar, y)
            totalDaysElapsed += yLen
            if (overflow) {
                globalWeekNum = (globalWeekNum + yLen) % Math.max(1, weekdays.length)
            } else {
                globalWeekNum = firstDayOffset
            }
        }
    } else if (targetYear < 1) {
        for (let y = 0; y >= targetYear; y--) {
            if (y === 0 && !hasYearZero) continue
            const yLen = getTotalDaysInYear(calendar, y)
            totalDaysElapsed -= yLen
            if (overflow) {
                globalWeekNum = (((globalWeekNum - yLen) % Math.max(1, weekdays.length)) + Math.max(1, weekdays.length)) % Math.max(1, weekdays.length)
            } else {
                globalWeekNum = firstDayOffset
            }
        }
    }

    let yearDay = 0
    for (let m = 0; m < targetMonth; m++) {
        const mLen = getMonthDaysInYear(calendar, m, targetYear)
        yearDay += mLen
        const mObj = months[m]
        if (mObj?.type !== 'intercalary') {
            globalWeekNum = (globalWeekNum + mLen) % Math.max(1, weekdays.length)
        }
    }

    yearDay += targetDay
    const epoch = totalDaysElapsed + yearDay - 1
    const weekdayIndex = (globalWeekNum + targetDay - 1) % Math.max(1, weekdays.length)
    const weekdayName = weekdays[weekdayIndex] || `Day ${weekdayIndex + 1}`

    return { epoch, yearDay, weekdayIndex, weekdayName }
}

export function evaluateMoonsAtEpoch(calendar: FantasyCalendarJSON, epoch: number): EvaluatedMoonPhase[] {
    if (calendar.static_data.settings?.hide_moons) return []
    const moons = calendar.static_data.moons || []
    return moons
        .filter((m) => !m.hidden)
        .map((moon) => {
            const cycle = Number(moon.cycle) || 28
            const shift = Number(moon.shift) || 0
            const granularity = Number(moon.granularity) || 16

            let phaseNum = 0
            const ratio = (((epoch + shift) / cycle) % 1 + 1) % 1
            if (moon.cycle_rounding === 'floor') {
                phaseNum = Math.floor(ratio * granularity) % granularity
            } else if (moon.cycle_rounding === 'ceil') {
                phaseNum = Math.ceil(ratio * granularity) % granularity
            } else {
                phaseNum = Math.round(ratio * granularity) % granularity
            }

            const gKey = granularity === 48 || granularity === 24 || granularity === 16 || granularity === 8 ? granularity : 16
            const mapping = {
                48: Array.from({ length: 48 }, (_, i) => i + 1),
                24: [1, 2, 4, 6, 8, 10, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 37, 40, 42, 44, 46, 48],
                16: [1, 3, 6, 9, 13, 16, 19, 22, 25, 28, 31, 34, 37, 41, 44, 46],
                8: [1, 7, 13, 19, 25, 31, 37, 43],
            }[gKey]

            const pathIndex = (mapping[phaseNum] || 1) - 1
            const path = MOON_SVG_PATHS[pathIndex] || MOON_SVG_PATHS[0]
            const phaseName = getMoonPhaseName(phaseNum, granularity)
            const fullIdx = Math.floor(granularity / 2)

            return {
                name: moon.name,
                color: moon.color || '#ffffff',
                shadow_color: moon.shadow_color || '#1e1b2e',
                path,
                phaseIndex: phaseNum,
                granularity,
                phaseName,
                cycle,
                isFullMoon: phaseNum === fullIdx,
                isNewMoon: phaseNum === 0,
            }
        })
}

export function computeTimeOfDayPhase(
    hour: number,
    minute: number,
    sunrise?: { hour: number; minute: number },
    sunset?: { hour: number; minute: number },
    minutesPerHour: number = 60
): TimeOfDayPhase {
    if (!sunrise || !sunset) return 'Daylight'
    const currentMins = hour * minutesPerHour + minute
    const riseMins = sunrise.hour * minutesPerHour + sunrise.minute
    const setMins = sunset.hour * minutesPerHour + sunset.minute
    const twilightWindow = Math.max(30, Math.round(minutesPerHour * 0.75))

    if (Math.abs(currentMins - riseMins) <= twilightWindow) return 'Dawn'
    if (Math.abs(currentMins - setMins) <= twilightWindow) return 'Dusk'
    if (currentMins > riseMins && currentMins < setMins) return 'Daylight'
    return 'Night'
}

export function offsetCalendarDate(
    calendar: FantasyCalendarJSON,
    startYear: number,
    startMonth: number,
    startDay: number,
    deltaDays: number
): { year: number; month: number; day: number } {
    const months = calendar.static_data.year_data?.timespans || calendar.static_data.months || []
    const hasYearZero = Boolean(calendar.static_data.settings?.year_zero_exists)
    if (months.length === 0) return { year: startYear, month: startMonth, day: startDay }

    let year = startYear
    let month = Math.max(0, Math.min(months.length - 1, startMonth))
    let day = startDay

    let remaining = Math.trunc(deltaDays)
    while (remaining > 0) {
        const mLen = getMonthDaysInYear(calendar, month, year)
        if (day < mLen) {
            const step = Math.min(remaining, mLen - day)
            day += step
            remaining -= step
        } else {
            month += 1
            if (month >= months.length) {
                month = 0
                year += 1
                if (year === 0 && !hasYearZero) year = 1
            }
            while (getMonthDaysInYear(calendar, month, year) === 0) {
                month += 1
                if (month >= months.length) {
                    month = 0
                    year += 1
                    if (year === 0 && !hasYearZero) year = 1
                }
            }
            day = 1
            remaining -= 1
        }
    }

    while (remaining < 0) {
        if (day > 1) {
            const step = Math.min(-remaining, day - 1)
            day -= step
            remaining += step
        } else {
            month -= 1
            if (month < 0) {
                month = months.length - 1
                year -= 1
                if (year === 0 && !hasYearZero) year = -1
            }
            while (getMonthDaysInYear(calendar, month, year) === 0) {
                month -= 1
                if (month < 0) {
                    month = months.length - 1
                    year -= 1
                    if (year === 0 && !hasYearZero) year = -1
                }
            }
            day = Math.max(1, getMonthDaysInYear(calendar, month, year))
            remaining += 1
        }
    }

    return { year, month, day }
}

export function evaluateSingleDay(
    calendar: FantasyCalendarJSON,
    year: number,
    month: number,
    day: number,
    isOwner: boolean = false,
    locationOverride?: number | null
): EvaluatedSingleDay {
    const months = calendar.static_data.year_data?.timespans || calendar.static_data.months || []
    const monthObj = months[month]
    const monthName = monthObj?.name || `Month ${month + 1}`
    const monthLen = getMonthDaysInYear(calendar, month, year)
    const weekLen = Math.max(1, (calendar.static_data.weekdays || []).length || 7)

    const { epoch, yearDay, weekdayIndex, weekdayName } = computeDateEpochAndYearDay(calendar, year, month, day)
    const moons = evaluateMoonsAtEpoch(calendar, epoch)

    const epochMap: Record<number, any> = {
        [epoch]: {
            epoch,
            year,
            timespan_index: month,
            timespan_number: month + 1,
            timespan_name: monthName,
            day,
            year_day: yearDay,
            inverse_day: monthLen - day + 1,
            intercalary: monthObj?.type === 'intercalary',
            week_day: weekdayIndex + 1,
            week_day_num: Math.ceil(day / weekLen),
            inverse_week_day_num: Math.ceil((monthLen - day + 1) / weekLen),
            week_day_name: weekdayName,
            moon_phase: moons.map((m) => m.phaseIndex),
        },
    }

    if (calendar.static_data.seasons) {
        const climate = new Climate(
            epochMap,
            calendar.static_data,
            calendar.dynamic_data,
            epoch,
            epoch,
            locationOverride
        )
        climate.generate()
    }

    const dayRecord = epochMap[epoch]
    const season: EvaluatedSeasonData | null = dayRecord?.season || null
    const weather: EvaluatedWeatherData | null = dayRecord?.weather || null

    const events: EvaluatedDayEvent[] = []
    if (calendar.events && calendar.events.length > 0 && !calendar.static_data.settings?.hide_events) {
        const evaluator = new EventEvaluator(
            calendar.static_data,
            calendar.dynamic_data,
            calendar.events,
            calendar.event_categories || [],
            epochMap
        )
        const evaluated = evaluator.evaluate(epoch, epoch)
        Object.entries(evaluated.valid).forEach(([eventIdxStr, epochs]) => {
            if (!(epochs as number[]).includes(epoch)) return
            const ev = calendar.events![parseInt(eventIdxStr, 10)]
            if (!ev) return
            if (ev.settings?.hide && !isOwner) return

            const cat = (calendar.event_categories || []).find(
                (c) => String(c.id) === String(ev.event_category_id)
            )
            const color =
                ev.settings?.color ||
                cat?.event_settings?.color ||
                cat?.category_settings?.color ||
                '#7c3aed'

            events.push({
                id: ev.id,
                name: ev.name,
                description: ev.description || '',
                color,
                hidden: Boolean(ev.settings?.hide),
                categoryName: cat?.name,
            })
        })
    }

    const hour = calendar.dynamic_data.hour ?? 12
    const minute = calendar.dynamic_data.minute ?? 0
    const minutesPerHour = calendar.static_data.clock?.minutes || 60
    const timeOfDay = computeTimeOfDayPhase(hour, minute, season?.sunrise, season?.sunset, minutesPerHour)

    return {
        year,
        month,
        monthName,
        day,
        epoch,
        yearDay,
        weekdayIndex,
        weekdayName,
        season,
        weather,
        moons,
        events,
        timeOfDay,
    }
}

export function findUpcomingLunarAlignments(
    calendar: FantasyCalendarJSON,
    startYear: number,
    startMonth: number,
    startDay: number,
    maxDays: number = 400,
    maxResults: number = 14
): LunarAlignmentPrediction[] {
    const visibleMoons = (calendar.static_data.moons || []).filter((m) => !m.hidden)
    if (visibleMoons.length === 0 || calendar.static_data.settings?.hide_moons) return []

    const months = calendar.static_data.year_data?.timespans || calendar.static_data.months || []
    const results: LunarAlignmentPrediction[] = []

    for (let offset = 0; offset <= maxDays; offset++) {
        const d = offsetCalendarDate(calendar, startYear, startMonth, startDay, offset)
        const { epoch } = computeDateEpochAndYearDay(calendar, d.year, d.month, d.day)
        const moons = evaluateMoonsAtEpoch(calendar, epoch)
        const monthName = months[d.month]?.name || `Month ${d.month + 1}`

        if (moons.length >= 2) {
            const allFull = moons.every((m) => m.isFullMoon)
            const allNew = moons.every((m) => m.isNewMoon)

            if (allFull) {
                results.push({
                    year: d.year,
                    month: d.month,
                    monthName,
                    day: d.day,
                    daysFromStart: offset,
                    type: 'full_conjunction',
                    title: 'Full Moon Conjunction',
                    subtitle: `All ${moons.length} moons (${moons.map((m) => m.name).join(' & ')}) shine full simultaneously`,
                    moons,
                })
                if (results.length >= maxResults) break
                continue
            }

            if (allNew) {
                results.push({
                    year: d.year,
                    month: d.month,
                    monthName,
                    day: d.day,
                    daysFromStart: offset,
                    type: 'new_conjunction',
                    title: 'Dark Sky Conjunction (All New Moons)',
                    subtitle: `All ${moons.length} moons (${moons.map((m) => m.name).join(' & ')}) enter New Moon together`,
                    moons,
                })
                if (results.length >= maxResults) break
                continue
            }

            if (offset <= 60) {
                const fullMoons = moons.filter((m) => m.isFullMoon)
                if (fullMoons.length > 0) {
                    results.push({
                        year: d.year,
                        month: d.month,
                        monthName,
                        day: d.day,
                        daysFromStart: offset,
                        type: 'full_moon',
                        title: `${fullMoons.map((m) => m.name).join(' & ')} — Full Moon`,
                        subtitle: moons.map((m) => `${m.name}: ${m.phaseName}`).join(' • '),
                        moons,
                    })
                    if (results.length >= maxResults) break
                }
            }
        } else if (moons.length === 1) {
            const m = moons[0]
            if (m.isFullMoon) {
                results.push({
                    year: d.year,
                    month: d.month,
                    monthName,
                    day: d.day,
                    daysFromStart: offset,
                    type: 'full_moon',
                    title: `${m.name} — Full Moon`,
                    subtitle: `Peak lunar illumination`,
                    moons,
                })
                if (results.length >= maxResults) break
            } else if (m.isNewMoon) {
                results.push({
                    year: d.year,
                    month: d.month,
                    monthName,
                    day: d.day,
                    daysFromStart: offset,
                    type: 'new_moon',
                    title: `${m.name} — New Moon`,
                    subtitle: `Moonless night sky`,
                    moons,
                })
                if (results.length >= maxResults) break
            }
        }
    }

    return results
}
