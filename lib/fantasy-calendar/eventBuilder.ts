import { FantasyCalendarJSON, FantasyEvent, getMoonPhaseName } from './types';

export type RecurrenceMode =
    | 'once'
    | 'annual'
    | 'monthly'
    | 'weekly'
    | 'interval'
    | 'moon'
    | 'season'
    | 'custom';

export type SeasonTriggerType =
    | 'high_solstice'
    | 'low_solstice'
    | 'rising_equinox'
    | 'falling_equinox'
    | 'season_day';

export interface ParsedRecurrenceRule {
    mode: RecurrenceMode;
    // Specific Date / Annual / Monthly
    year: number;
    month: number; // 0-indexed timespan
    day: number; // 1-indexed day
    yearInterval?: number; // Every N years (default 1 = every year)
    yearOffset?: number;
    // Weekly
    weekdayName: string;
    weekdayNthInMonth?: number; // 0 = every week, 1..5 = 1st..5th occurrence in month
    // Interval (Epoch / Month day)
    intervalDays: number;
    intervalOffset: number;
    // Moon
    moonIndex: number;
    moonPhase: number;
    // Season
    seasonTrigger: SeasonTriggerType;
    seasonIndex: number;
    seasonDay: number;
    // Raw conditions fallback
    rawConditions: any[];
}

export function getDefaultRecurrenceRule(
    calendar: FantasyCalendarJSON,
    defaultDate?: { year: number; month: number; day: number }
): ParsedRecurrenceRule {
    const y = defaultDate?.year ?? calendar.dynamic_data.year ?? 1;
    const m = defaultDate?.month ?? calendar.dynamic_data.month ?? 0;
    const d = defaultDate?.day ?? calendar.dynamic_data.day ?? 1;
    const firstWeekday = calendar.static_data.weekdays?.[0] || 'Day 1';
    const firstMoonGranularity = calendar.static_data.moons?.[0]?.granularity || 16;

    return {
        mode: 'once',
        year: y,
        month: m,
        day: d,
        yearInterval: 1,
        yearOffset: 0,
        weekdayName: firstWeekday,
        weekdayNthInMonth: 0,
        intervalDays: 7,
        intervalOffset: 0,
        moonIndex: 0,
        moonPhase: Math.floor(firstMoonGranularity / 2), // Full moon by default
        seasonTrigger: 'high_solstice',
        seasonIndex: 0,
        seasonDay: 1,
        rawConditions: [['Date', '0', [String(y), String(m), String(d)]]],
    };
}

/**
 * Inspects an existing FantasyEvent and extracts a user-friendly ParsedRecurrenceRule
 */
export function parseRecurrenceFromEvent(
    event: FantasyEvent,
    calendar: FantasyCalendarJSON
): ParsedRecurrenceRule {
    const base = getDefaultRecurrenceRule(calendar);
    const conds = event?.data?.conditions || [];
    base.rawConditions = conds;

    if (!Array.isArray(conds) || conds.length === 0) {
        if (Array.isArray(event?.data?.date) && event.data.date.length >= 3) {
            return {
                ...base,
                mode: 'once',
                year: Number(event.data.date[0]) || base.year,
                month: Number(event.data.date[1]) || 0,
                day: Number(event.data.date[2]) || 1,
            };
        }
        return base;
    }

    // Single condition patterns
    if (conds.length === 1 && Array.isArray(conds[0]) && !Array.isArray(conds[0][1])) {
        const [cat, typeStr, vals = []] = conds[0];
        const type = String(typeStr);

        if (cat === 'Date' && type === '0') {
            return {
                ...base,
                mode: 'once',
                year: Number(vals[0]) || base.year,
                month: Number(vals[1]) || 0,
                day: Number(vals[2]) || 1,
            };
        }

        if (cat === 'Day' && type === '0') {
            return {
                ...base,
                mode: 'monthly',
                day: Number(vals[0]) || 1,
            };
        }

        if (cat === 'Weekday' && type === '0') {
            return {
                ...base,
                mode: 'weekly',
                weekdayName: String(vals[0] || base.weekdayName),
                weekdayNthInMonth: 0,
            };
        }

        if (cat === 'Epoch' && type === '6') {
            return {
                ...base,
                mode: 'interval',
                intervalDays: Math.max(1, Number(vals[0]) || 7),
                intervalOffset: Number(vals[1]) || 0,
            };
        }

        if (cat === 'Moons' && type === '0') {
            return {
                ...base,
                mode: 'moon',
                moonIndex: Number(vals[0]) || 0,
                moonPhase: Number(vals[1]) || 0,
            };
        }

        if (cat === 'Season') {
            if (type === '15') return { ...base, mode: 'season', seasonTrigger: 'high_solstice' };
            if (type === '16') return { ...base, mode: 'season', seasonTrigger: 'low_solstice' };
            if (type === '17') return { ...base, mode: 'season', seasonTrigger: 'rising_equinox' };
            if (type === '18') return { ...base, mode: 'season', seasonTrigger: 'falling_equinox' };
        }
    }

    // Two-condition patterns joined by ["&&"]
    if (
        conds.length === 3 &&
        Array.isArray(conds[1]) &&
        conds[1][0] === '&&' &&
        !Array.isArray(conds[0][1]) &&
        !Array.isArray(conds[2][1])
    ) {
        const c0 = conds[0];
        const c2 = conds[2];

        // Annual: Month == M && Day == D
        if (c0[0] === 'Month' && String(c0[1]) === '0' && c2[0] === 'Day' && String(c2[1]) === '0') {
            return {
                ...base,
                mode: 'annual',
                month: Number(c0[2]?.[0]) || 0,
                day: Number(c2[2]?.[0]) || 1,
                yearInterval: 1,
            };
        }
        if (c2[0] === 'Month' && String(c2[1]) === '0' && c0[0] === 'Day' && String(c0[1]) === '0') {
            return {
                ...base,
                mode: 'annual',
                month: Number(c2[2]?.[0]) || 0,
                day: Number(c0[2]?.[0]) || 1,
                yearInterval: 1,
            };
        }

        // Nth Weekday in Month: Weekday == W && Weekday number in month == N
        if (c0[0] === 'Weekday' && String(c0[1]) === '0' && c2[0] === 'Weekday' && String(c2[1]) === '8') {
            return {
                ...base,
                mode: 'weekly',
                weekdayName: String(c0[2]?.[0] || base.weekdayName),
                weekdayNthInMonth: Number(c2[2]?.[0]) || 0,
            };
        }

        // Season day: Season == S && Season day == D
        if (c0[0] === 'Season' && String(c0[1]) === '0' && c2[0] === 'Season' && String(c2[1]) === '8') {
            return {
                ...base,
                mode: 'season',
                seasonTrigger: 'season_day',
                seasonIndex: Number(c0[2]?.[0]) || 0,
                seasonDay: Number(c2[2]?.[0]) || 1,
            };
        }
    }

    // Three-condition annual with Nth year: Month == M && Day == D && Year % N
    if (
        conds.length === 5 &&
        conds[1]?.[0] === '&&' &&
        conds[3]?.[0] === '&&' &&
        conds[0]?.[0] === 'Month' &&
        conds[2]?.[0] === 'Day' &&
        conds[4]?.[0] === 'Year' &&
        String(conds[4]?.[1]) === '6'
    ) {
        return {
            ...base,
            mode: 'annual',
            month: Number(conds[0][2]?.[0]) || 0,
            day: Number(conds[2][2]?.[0]) || 1,
            yearInterval: Math.max(1, Number(conds[4][2]?.[0]) || 1),
            yearOffset: Number(conds[4][2]?.[1]) || 0,
        };
    }

    return {
        ...base,
        mode: 'custom',
    };
}

/**
 * Compiles a ParsedRecurrenceRule into Fantasy-Calendar conditions array
 */
export function buildConditionsFromRule(rule: ParsedRecurrenceRule): any[] {
    switch (rule.mode) {
        case 'once':
            return [['Date', '0', [String(rule.year), String(rule.month), String(rule.day)]]];

        case 'annual': {
            const base: any[] = [
                ['Month', '0', [String(rule.month)]],
                ['&&'],
                ['Day', '0', [String(rule.day)]],
            ];
            if (rule.yearInterval && rule.yearInterval > 1) {
                base.push(['&&'], ['Year', '6', [String(rule.yearInterval), String(rule.yearOffset || 0)]]);
            }
            return base;
        }

        case 'monthly':
            return [['Day', '0', [String(rule.day)]]];

        case 'weekly': {
            if (rule.weekdayNthInMonth && rule.weekdayNthInMonth > 0) {
                return [
                    ['Weekday', '0', [rule.weekdayName]],
                    ['&&'],
                    ['Weekday', '8', [String(rule.weekdayNthInMonth)]],
                ];
            }
            return [['Weekday', '0', [rule.weekdayName]]];
        }

        case 'interval':
            return [['Epoch', '6', [String(Math.max(1, rule.intervalDays)), String(rule.intervalOffset || 0)]]];

        case 'moon':
            return [['Moons', '0', [String(rule.moonIndex), String(rule.moonPhase)]]];

        case 'season': {
            if (rule.seasonTrigger === 'high_solstice') return [['Season', '15', ['1']]];
            if (rule.seasonTrigger === 'low_solstice') return [['Season', '16', ['1']]];
            if (rule.seasonTrigger === 'rising_equinox') return [['Season', '17', ['1']]];
            if (rule.seasonTrigger === 'falling_equinox') return [['Season', '18', ['1']]];
            return [
                ['Season', '0', [String(rule.seasonIndex)]],
                ['&&'],
                ['Season', '8', [String(Math.max(1, rule.seasonDay))]],
            ];
        }

        case 'custom':
        default:
            return Array.isArray(rule.rawConditions) ? rule.rawConditions : [];
    }
}

/**
 * Generates a concise human-readable label for how an event recurs
 */
export function describeEventRecurrence(
    event: FantasyEvent,
    calendar: FantasyCalendarJSON
): string {
    const rule = parseRecurrenceFromEvent(event, calendar);
    const months = calendar.static_data.months || [];
    const moons = calendar.static_data.moons || [];
    const seasons = calendar.static_data.seasons?.data || [];

    switch (rule.mode) {
        case 'once': {
            const mName = months[rule.month]?.name || `Month ${rule.month + 1}`;
            return `${rule.day} ${mName}, Year ${rule.year}`;
        }
        case 'annual': {
            const mName = months[rule.month]?.name || `Month ${rule.month + 1}`;
            if (rule.yearInterval && rule.yearInterval > 1) {
                return `Every ${rule.yearInterval} years on ${rule.day} ${mName}`;
            }
            return `Annually on ${rule.day} ${mName}`;
        }
        case 'monthly':
            return `Monthly on Day ${rule.day}`;
        case 'weekly': {
            if (rule.weekdayNthInMonth && rule.weekdayNthInMonth > 0) {
                const ord = ['1st', '2nd', '3rd', '4th', '5th'][rule.weekdayNthInMonth - 1] || `${rule.weekdayNthInMonth}th`;
                return `Every ${ord} ${rule.weekdayName} of the month`;
            }
            return `Weekly on ${rule.weekdayName}`;
        }
        case 'interval':
            return `Every ${rule.intervalDays} days`;
        case 'moon': {
            const moon = moons[rule.moonIndex];
            const mName = moon?.name || `Moon ${rule.moonIndex + 1}`;
            const phaseName = getMoonPhaseName(rule.moonPhase, moon?.granularity || 16);
            return `${mName}: ${phaseName} (Phase ${rule.moonPhase})`;
        }
        case 'season': {
            if (rule.seasonTrigger === 'high_solstice') return 'Seasonal: Summer Solstice (Longest Day)';
            if (rule.seasonTrigger === 'low_solstice') return 'Seasonal: Winter Solstice (Shortest Day)';
            if (rule.seasonTrigger === 'rising_equinox') return 'Seasonal: Spring Equinox';
            if (rule.seasonTrigger === 'falling_equinox') return 'Seasonal: Autumn Equinox';
            const sName = seasons[rule.seasonIndex]?.name || `Season ${rule.seasonIndex + 1}`;
            return `Day ${rule.seasonDay} of ${sName}`;
        }
        case 'custom':
        default:
            return 'Custom conditional rule';
    }
}
