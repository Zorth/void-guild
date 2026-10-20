export interface FantasyMonth {
    name: string;
    length: number;
    type: 'month' | 'intercalary' | string;
    interval?: number;
    offset?: number;
}

export interface FantasyLeapDay {
    name: string;
    intercalary: boolean;
    timespan: number; // month index
    adds_week_day?: boolean;
    day?: number;
    interval: string | number; // e.g. "4,!100,400" or 4
    offset?: number;
}

export interface FantasyMoon {
    name: string;
    cycle: number;
    shift: number | string;
    granularity: number; // 8, 16, 24, 48
    color: string;
    shadow_color?: string;
    hidden: boolean;
    custom_phase?: boolean;
    custom_cycle?: string;
    cycle_rounding?: 'round' | 'floor' | 'ceil' | string;
}

export interface FantasySeasonTime {
    sunrise: { hour: number; minute: number };
    sunset: { hour: number; minute: number };
}

export interface FantasySeasonWeather {
    temp_low: number;
    temp_high: number;
    precipitation: number; // 0 to 1
    precipitation_intensity: number; // 0 to 1
}

export interface FantasySeason {
    name: string;
    color?: [string, string] | string[];
    time: FantasySeasonTime;
    timespan?: number; // 0-indexed month
    day?: number; // 1-indexed day in month
    gradient?: {
        start: [number, number, number];
        end: [number, number, number];
    };
    weather?: FantasySeasonWeather;
}

export interface FantasyLocationSeason {
    weather: FantasySeasonWeather;
    time?: FantasySeasonTime;
}

export interface FantasyLocation {
    name: string;
    settings?: {
        timezone?: { hour: number; minute: number };
        large_noise_frequency?: number;
        large_noise_amplitude?: number;
        medium_noise_frequency?: number;
        medium_noise_amplitude?: number;
        small_noise_frequency?: number;
        small_noise_amplitude?: number;
        season_based_time?: boolean;
    };
    seasons: FantasyLocationSeason[];
}

export interface FantasyEra {
    name: string;
    abbreviation?: string;
    formatting?: string;
    description?: string;
    date: {
        year: number;
        timespan: number;
        day: number;
        epoch?: number;
    };
    settings?: {
        use_custom_format?: boolean;
        show_as_event?: boolean;
        starting_era?: boolean;
        event_category_id?: number | string | null;
        ends_year?: boolean;
        restart?: boolean;
        year_zero_exists?: boolean;
    };
}

export interface FantasyEventCategory {
    id: number | string;
    name: string;
    calendar_id?: string;
    category_settings?: {
        color?: string;
        text?: string;
        hide?: boolean;
        print?: boolean;
    };
    event_settings?: {
        color?: string;
        text?: string;
        hide?: boolean;
        hide_full?: boolean;
        print?: boolean;
    };
}

export interface FantasyEvent {
    id: number | string;
    name: string;
    description: string;
    event_category_id: number | string;
    calendar_id?: string;
    data: {
        has_duration: boolean;
        duration: number;
        show_first_last?: boolean;
        limited_repeat?: boolean;
        limited_repeat_num?: number;
        connected_events?: any[];
        date?: number[];
        conditions: any[];
        search_distance?: number;
    };
    settings: {
        color?: string;
        text?: string;
        hide?: boolean; // GM-only / Hidden from players
        hide_full?: boolean;
        print?: boolean;
    };
    created_at?: string;
    updated_at?: string;
    sort_by?: number;
    creator_id?: number | string;
}

export interface FantasyClock {
    enabled: boolean;
    render: boolean;
    hours: number;
    minutes: number;
    offset: number;
    crowding?: number;
}

export interface FantasyCalendarJSON {
    name: string;
    dynamic_data: {
        year: number;
        month: number;
        timespan?: number;
        day: number;
        hour?: number;
        minute?: number;
        epoch?: number;
        custom_location?: boolean;
        location?: string | number;
        current_era?: number;
    };
    static_data: {
        year_len: number;
        n_months: number;
        months: FantasyMonth[];
        weekdays: string[];
        moons?: FantasyMoon[];
        eras?: FantasyEra[];
        clock?: FantasyClock;
        seasons?: {
            data: FantasySeason[];
            locations?: FantasyLocation[];
            global_settings: {
                season_offset?: number;
                weather_offset?: number;
                seed?: number;
                temp_sys?: 'metric' | 'imperial';
                wind_sys?: 'metric' | 'imperial';
                cinematic?: boolean;
                enable_weather: boolean;
                periodic_seasons?: boolean;
                color_enabled?: boolean;
                preset_order?: number[];
            };
        };
        settings: {
            layout?: string;
            comments?: string;
            show_current_month?: boolean;
            private?: boolean;
            allow_view?: boolean;
            only_backwards?: boolean;
            only_reveal_today?: boolean;
            hide_moons?: boolean;
            hide_clock?: boolean;
            hide_events?: boolean;
            hide_eras?: boolean;
            hide_all_weather?: boolean;
            hide_future_weather?: boolean;
            add_month_number?: boolean;
            add_year_day_number?: boolean;
            default_category?: number | string;
            year_zero_exists?: boolean;
        };
        cycles?: {
            format: string;
            data: any[];
        };
        year_data?: {
            first_day?: number;
            overflow?: boolean;
            global_week?: string[];
            timespans?: FantasyMonth[];
            leap_days?: FantasyLeapDay[];
        };
    };
    events?: FantasyEvent[];
    event_categories?: FantasyEventCategory[];
}

export interface EvaluatedSeasonData {
    season_name: string;
    season_index: number;
    season_perc: number;
    season_day: number;
    color: string;
    sunrise: { hour: number; minute: number };
    sunset: { hour: number; minute: number };
    daylight_minutes: number;
    high_solstice?: boolean;
    low_solstice?: boolean;
    rising_equinox?: boolean;
    falling_equinox?: boolean;
}

export interface EvaluatedWeatherData {
    temp_low: number;
    temp_high: number;
    temp_actual: number;
    temp_unit: '°C' | '°F';
    temp_description: string;
    clouds: string;
    precipitation: string | null;
    precipitation_chance: number;
    wind_speed: string;
    wind_direction: string;
    wind_mph: string;
    wind_description: string;
    feature: string | null;
    location_name?: string;
}

/**
 * Standard 8-phase and 16-phase moon names mapped from normalized phase ratio [0..1)
 */
export function getMoonPhaseName(phaseIndex: number, granularity: number = 16): string {
    const g = Math.max(1, Number(granularity) || 16);
    const norm = ((phaseIndex % g) + g) % g / g; // 0.0 to <1.0
    // In Fantasy-Calendar SVG paths:
    // index 0 is New Moon, 0.25 is First Quarter, 0.5 is Full Moon, 0.75 is Third/Last Quarter
    const idx8 = Math.round(norm * 8) % 8;
    const names8 = [
        'New Moon',
        'Waxing Crescent',
        'First Quarter',
        'Waxing Gibbous',
        'Full Moon',
        'Waning Gibbous',
        'Third Quarter',
        'Waning Crescent',
    ];
    return names8[idx8] || 'New Moon';
}

export function formatClockTime(time?: { hour: number; minute: number }): string {
    if (!time) return '00:00';
    const h = String(Math.floor(time.hour ?? 0)).padStart(2, '0');
    const m = String(Math.floor(time.minute ?? 0)).padStart(2, '0');
    return `${h}:${m}`;
}

export function formatDaylightDuration(sunrise?: { hour: number; minute: number }, sunset?: { hour: number; minute: number }, hoursPerDay: number = 24, minutesPerHour: number = 60): string {
    if (!sunrise || !sunset) return '';
    const startMins = (sunrise.hour * minutesPerHour) + sunrise.minute;
    const endMins = (sunset.hour * minutesPerHour) + sunset.minute;
    let diff = endMins - startMins;
    if (diff < 0) diff += hoursPerDay * minutesPerHour;
    const h = Math.floor(diff / minutesPerHour);
    const m = Math.round(diff % minutesPerHour);
    if (m === 0) return `${h}h daylight`;
    return `${h}h ${m}m daylight`;
}

/**
 * Normalizes any imported or edited FantasyCalendarJSON so both legacy FC fields
 * (year_data.timespans, year_data.global_week, dynamic_data.timespan) and Void Guild
 * shorthand fields (static_data.months, static_data.weekdays, dynamic_data.month) stay in sync.
 */
export function normalizeCalendarJSON(raw: any): FantasyCalendarJSON {
    const staticData = raw?.static_data || raw?.static || raw?.staticData || {};
    const dynamicData = raw?.dynamic_data || raw?.dynamic || raw?.dynamicData || {};
    const yearData = staticData.year_data || {};

    const rawMonths: FantasyMonth[] =
        (Array.isArray(staticData.months) && staticData.months.length > 0 ? staticData.months : null) ||
        (Array.isArray(yearData.timespans) && yearData.timespans.length > 0 ? yearData.timespans : null) ||
        (Array.isArray(staticData.month_data) && staticData.month_data.length > 0 ? staticData.month_data : null) || [
            { name: 'Month 1', length: 30, type: 'month', interval: 1, offset: 0 }
        ];

    const months: FantasyMonth[] = rawMonths.map((m: any) => ({
        name: m.name || 'Unnamed Month',
        length: Math.max(1, Number(m.length) || 30),
        type: m.type === 'intercalary' ? 'intercalary' : 'month',
        interval: Number(m.interval) || 1,
        offset: Number(m.offset) || 0,
    }));

    const weekdays: string[] =
        (Array.isArray(staticData.weekdays) && staticData.weekdays.length > 0 ? staticData.weekdays : null) ||
        (Array.isArray(yearData.global_week) && yearData.global_week.length > 0 ? yearData.global_week : null) || [
            'Sunday', 'Moonday', 'Justiceday', 'Wisdomday', 'Thunderday', 'Loveday', 'Farmday'
        ];

    const yearLen = months.reduce((acc, m) => acc + (Number(m.length) || 0), 0);

    const currentMonthIndex = typeof dynamicData.month === 'number'
        ? Math.min(Math.max(0, dynamicData.month), Math.max(0, months.length - 1))
        : (typeof dynamicData.timespan === 'number'
            ? Math.min(Math.max(0, dynamicData.timespan), Math.max(0, months.length - 1))
            : 0);

    const maxDayInCurrentMonth = months[currentMonthIndex]?.length || 30;
    const currentDay = Math.min(Math.max(1, Number(dynamicData.day) || 1), maxDayInCurrentMonth);

    return {
        name: raw?.name || 'World Calendar',
        static_data: {
            ...staticData,
            year_len: yearLen,
            n_months: months.length,
            months,
            weekdays,
            moons: Array.isArray(staticData.moons) ? staticData.moons : (Array.isArray(yearData.moons) ? yearData.moons : []),
            eras: Array.isArray(staticData.eras) ? staticData.eras : (Array.isArray(yearData.eras) ? yearData.eras : []),
            clock: staticData.clock || {
                enabled: true,
                render: true,
                hours: 24,
                minutes: 60,
                offset: 0,
                crowding: 0,
            },
            seasons: {
                data: Array.isArray(staticData.seasons?.data) ? staticData.seasons.data : [],
                locations: Array.isArray(staticData.seasons?.locations) ? staticData.seasons.locations : [],
                global_settings: {
                    season_offset: 0,
                    weather_offset: 0,
                    seed: 123456789,
                    temp_sys: 'metric',
                    wind_sys: 'metric',
                    cinematic: false,
                    enable_weather: true,
                    periodic_seasons: false,
                    color_enabled: true,
                    ...(staticData.seasons?.global_settings || {}),
                },
            },
            settings: {
                layout: 'grid',
                comments: 'none',
                show_current_month: true,
                private: false,
                allow_view: true,
                only_backwards: true,
                only_reveal_today: false,
                hide_moons: false,
                hide_clock: false,
                hide_events: false,
                hide_eras: false,
                hide_all_weather: false,
                hide_future_weather: false,
                add_month_number: true,
                add_year_day_number: false,
                default_category: -1,
                year_zero_exists: false,
                ...(staticData.settings || yearData.settings || {}),
            },
            cycles: staticData.cycles || { format: '', data: [] },
            year_data: {
                first_day: Number(yearData.first_day) || 1,
                overflow: yearData.overflow !== undefined ? Boolean(yearData.overflow) : true,
                global_week: weekdays,
                timespans: months,
                leap_days: Array.isArray(yearData.leap_days) ? yearData.leap_days : [],
            },
        },
        dynamic_data: {
            ...dynamicData,
            year: typeof dynamicData.year === 'number' ? dynamicData.year : 1,
            month: currentMonthIndex,
            timespan: currentMonthIndex,
            day: currentDay,
            hour: typeof dynamicData.hour === 'number' ? dynamicData.hour : 9,
            minute: typeof dynamicData.minute === 'number' ? dynamicData.minute : 0,
            custom_location: dynamicData.custom_location ?? false,
            location: dynamicData.location ?? '0',
        },
        events: Array.isArray(raw?.events) ? raw.events : [],
        event_categories: Array.isArray(raw?.event_categories) ? raw.event_categories : [],
    };
}
