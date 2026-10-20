import { FantasyCalendarJSON, normalizeCalendarJSON } from './types';

export const MOON_SVG_PATHS: string[] = [
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

export const SEASON_COLOR_SWATCHES = [
    { label: 'Frost Cyan', value: '#0bcfe9' },
    { label: 'Spring Emerald', value: '#1ee313' },
    { label: 'Summer Gold', value: '#eabf14' },
    { label: 'Autumn Ember', value: '#e74d0e' },
    { label: 'Void Purple', value: '#a855f7' },
    { label: 'Crimson Rose', value: '#f43f5e' },
    { label: 'Deep Indigo', value: '#6366f1' },
    { label: 'Teal Mist', value: '#14b8a6' },
];

export const MOON_COLOR_PRESETS = [
    { name: 'Lunar Silver', color: '#d5f4f1', shadow: '#29344a' },
    { name: 'Golden Amber', color: '#f6eeda', shadow: '#34294a' },
    { name: 'Blood Moon', color: '#fca5a5', shadow: '#451a1a' },
    { name: 'Void Amethyst', color: '#e9d5ff', shadow: '#2e1065' },
    { name: 'Verdant Jade', color: '#bbf7d0', shadow: '#143323' },
    { name: 'Sapphire Ice', color: '#bae6fd', shadow: '#172554' },
];

export const EVENT_COLOR_OPTIONS = [
    { name: 'Amber', hex: '#f59e0b', badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30', dotClass: 'bg-amber-400' },
    { name: 'Purple', hex: '#a855f7', badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30', dotClass: 'bg-purple-400' },
    { name: 'Green', hex: '#10b981', badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', dotClass: 'bg-emerald-400' },
    { name: 'Blue', hex: '#3b82f6', badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30', dotClass: 'bg-blue-400' },
    { name: 'Red', hex: '#f43f5e', badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30', dotClass: 'bg-rose-400' },
    { name: 'Cyan', hex: '#06b6d4', badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30', dotClass: 'bg-cyan-400' },
    { name: 'Pink', hex: '#ec4899', badgeClass: 'bg-pink-500/15 text-pink-300 border-pink-500/30', dotClass: 'bg-pink-400' },
];

export function getEventColorStyles(colorName?: string) {
    if (!colorName) return EVENT_COLOR_OPTIONS[0];
    const lower = colorName.toLowerCase();
    return (
        EVENT_COLOR_OPTIONS.find(
            (c) => c.name.toLowerCase() === lower || c.hex.toLowerCase() === lower
        ) || EVENT_COLOR_OPTIONS[0]
    );
}

export interface CalendarTemplateOption {
    id: string;
    name: string;
    subtitle: string;
    description: string;
    build: (worldName: string) => FantasyCalendarJSON;
}

export const CALENDAR_TEMPLATES: CalendarTemplateOption[] = [
    {
        id: 'sythian-standard',
        name: 'Sythian / Standard 12-Month',
        subtitle: '365 days • 12 months • 7 weekdays • 2 moons • 4 seasons',
        description: 'A rich fantasy calendar inspired by Sythian: 12 alternating 31/30-day months, 4 seasons with interpolated sunrise/sunset and regional climates, and twin moons (Desna & Arash).',
        build: (worldName: string) => normalizeCalendarJSON({
            name: worldName || 'World Calendar',
            dynamic_data: {
                year: 1,
                month: 0,
                timespan: 0,
                day: 1,
                hour: 9,
                minute: 0,
                custom_location: true,
                location: '0',
                current_era: 0,
            },
            static_data: {
                year_len: 365,
                n_months: 12,
                weekdays: ['Sunday', 'Moonday', 'Justiceday', 'Wisdomday', 'Thunderday', 'Loveday', 'Farmday'],
                months: [
                    { name: 'Wanmon', length: 31, type: 'month' },
                    { name: 'Whinmon', length: 30, type: 'month' },
                    { name: 'Wrimon', length: 31, type: 'month' },
                    { name: 'Sprimon', length: 30, type: 'month' },
                    { name: 'Soarmon', length: 31, type: 'month' },
                    { name: 'Shilamon', length: 30, type: 'month' },
                    { name: 'Minnmon', length: 31, type: 'month' },
                    { name: 'Mlawmon', length: 30, type: 'month' },
                    { name: 'Miramon', length: 31, type: 'month' },
                    { name: 'Fairmon', length: 30, type: 'month' },
                    { name: 'Firalmon', length: 31, type: 'month' },
                    { name: 'Foundmon', length: 30, type: 'month' },
                ],
                moons: [
                    { name: 'Desna', cycle: 16, shift: 0, granularity: 16, cycle_rounding: 'round', color: '#d5f4f1', shadow_color: '#29344a', hidden: false },
                    { name: 'Arash', cycle: 21, shift: 3, granularity: 16, cycle_rounding: 'round', color: '#f6eeda', shadow_color: '#34294a', hidden: false },
                ],
                eras: [
                    {
                        name: 'First Age',
                        formatting: 'Year {{year}} - {{era_name}}',
                        description: 'The current historical era.',
                        date: { year: 1, timespan: 0, day: 1, epoch: 0 },
                        settings: { restart: true, starting_era: true },
                    },
                ],
                seasons: {
                    data: [
                        { name: 'Winter', color: ['#0bcfe9', '#1ee313'], timespan: 0, day: 1, time: { sunrise: { hour: 9, minute: 0 }, sunset: { hour: 17, minute: 0 } } },
                        { name: 'Spring', color: ['#1ee313', '#e74d0e'], timespan: 3, day: 1, time: { sunrise: { hour: 7, minute: 30 }, sunset: { hour: 19, minute: 0 } } },
                        { name: 'Summer', color: ['#e74d0e', '#eabf14'], timespan: 6, day: 1, time: { sunrise: { hour: 6, minute: 0 }, sunset: { hour: 21, minute: 0 } } },
                        { name: 'Autumn', color: ['#eabf14', '#0bcfe9'], timespan: 9, day: 1, time: { sunrise: { hour: 7, minute: 30 }, sunset: { hour: 19, minute: 0 } } },
                    ],
                    locations: [
                        {
                            name: 'Temperate Heartland',
                            settings: { season_based_time: true, timezone: { hour: 0, minute: 0 }, large_noise_frequency: 0.015, large_noise_amplitude: 10, medium_noise_frequency: 0.3, medium_noise_amplitude: 4, small_noise_frequency: 0.8, small_noise_amplitude: 5 },
                            seasons: [
                                { weather: { temp_low: -10, temp_high: 4, precipitation: 0.35, precipitation_intensity: 0.5 }, time: { sunrise: { hour: 9, minute: 0 }, sunset: { hour: 17, minute: 0 } } },
                                { weather: { temp_low: 2, temp_high: 17, precipitation: 0.35, precipitation_intensity: 0.5 }, time: { sunrise: { hour: 7, minute: 30 }, sunset: { hour: 19, minute: 0 } } },
                                { weather: { temp_low: 15, temp_high: 29, precipitation: 0.3, precipitation_intensity: 0.5 }, time: { sunrise: { hour: 6, minute: 0 }, sunset: { hour: 21, minute: 0 } } },
                                { weather: { temp_low: 3, temp_high: 16, precipitation: 0.4, precipitation_intensity: 0.6 }, time: { sunrise: { hour: 7, minute: 30 }, sunset: { hour: 19, minute: 0 } } },
                            ],
                        },
                    ],
                    global_settings: {
                        enable_weather: true,
                        temp_sys: 'metric',
                        wind_sys: 'metric',
                        seed: 2083990204,
                        season_offset: 0,
                        weather_offset: 0,
                        color_enabled: true,
                    },
                },
                settings: {
                    year_zero_exists: false,
                    hide_events: false,
                    hide_moons: false,
                    hide_all_weather: false,
                },
            },
            events: [
                {
                    id: 1,
                    name: 'Summer Solstice',
                    description: 'At the summer solstice, the Sun travels the longest path through the sky, and that day therefore has the most daylight.',
                    event_category_id: -1,
                    data: { has_duration: false, duration: 1, conditions: [['Season', '15', ['1']]] },
                    settings: { color: 'Green', hide: false },
                },
                {
                    id: 2,
                    name: 'Winter Solstice',
                    description: 'The winter solstice marks the shortest day and longest night of the year.',
                    event_category_id: -1,
                    data: { has_duration: false, duration: 1, conditions: [['Season', '16', ['1']]] },
                    settings: { color: 'Cyan', hide: false },
                },
                {
                    id: 3,
                    name: 'Spring Equinox',
                    description: 'The spring equinox is when the day and the night are equally as long, and are getting longer.',
                    event_category_id: -1,
                    data: { has_duration: false, duration: 1, conditions: [['Season', '17', ['1']]] },
                    settings: { color: 'Green', hide: false },
                },
                {
                    id: 4,
                    name: 'Autumn Equinox',
                    description: 'The autumn equinox is when the day and the night are equally as long, and are getting shorter.',
                    event_category_id: -1,
                    data: { has_duration: false, duration: 1, conditions: [['Season', '18', ['1']]] },
                    settings: { color: 'Amber', hide: false },
                },
            ],
            event_categories: [
                { id: 101, name: 'Holidays & Festivals', category_settings: { color: 'Amber' }, event_settings: { color: 'Amber', hide: false } },
                { id: 102, name: 'Campaign Events', category_settings: { color: 'Purple' }, event_settings: { color: 'Purple', hide: false } },
                { id: 103, name: 'GM Secret Timers', category_settings: { color: 'Red', hide: true }, event_settings: { color: 'Red', hide: true } },
            ],
        }),
    },
    {
        id: 'golarion-pf2e',
        name: 'Golarion (Absalom Reckoning)',
        subtitle: '365 days • 12 months • 7 weekdays • 1 moon (Somal) • 4 seasons',
        description: 'Pathfinder Golarion calendar featuring months from Abadius to Kuthona, 7 weekdays (Moonday to Sunday), and Somal on a 29.5-day lunar cycle.',
        build: (worldName: string) => normalizeCalendarJSON({
            name: worldName || 'Golarion Calendar',
            dynamic_data: { year: 4726, month: 0, timespan: 0, day: 1, hour: 8, minute: 0, location: '0' },
            static_data: {
                year_len: 365,
                n_months: 12,
                weekdays: ['Moonday', 'Toilday', 'Wealday', 'Oathday', 'Fireday', 'Starday', 'Sunday'],
                months: [
                    { name: 'Abadius', length: 31, type: 'month' },
                    { name: 'Calistril', length: 28, type: 'month' },
                    { name: 'Pharast', length: 31, type: 'month' },
                    { name: 'Gozran', length: 30, type: 'month' },
                    { name: 'Desnus', length: 31, type: 'month' },
                    { name: 'Sarenith', length: 30, type: 'month' },
                    { name: 'Erastus', length: 31, type: 'month' },
                    { name: 'Arodus', length: 31, type: 'month' },
                    { name: 'Rova', length: 30, type: 'month' },
                    { name: 'Lamashan', length: 31, type: 'month' },
                    { name: 'Neth', length: 30, type: 'month' },
                    { name: 'Kuthona', length: 31, type: 'month' },
                ],
                moons: [
                    { name: 'Somal', cycle: 29.5, shift: 0, granularity: 16, cycle_rounding: 'round', color: '#d5f4f1', shadow_color: '#29344a', hidden: false },
                ],
                eras: [
                    { name: 'AR', formatting: '{{year}} {{era_name}}', date: { year: 1, timespan: 0, day: 1 }, settings: { restart: false, starting_era: true } },
                ],
                seasons: {
                    data: [
                        { name: 'Winter', color: ['#0bcfe9', '#1ee313'], timespan: 0, day: 1, time: { sunrise: { hour: 8, minute: 30 }, sunset: { hour: 17, minute: 0 } } },
                        { name: 'Spring', color: ['#1ee313', '#e74d0e'], timespan: 2, day: 20, time: { sunrise: { hour: 6, minute: 30 }, sunset: { hour: 18, minute: 30 } } },
                        { name: 'Summer', color: ['#e74d0e', '#eabf14'], timespan: 5, day: 21, time: { sunrise: { hour: 5, minute: 30 }, sunset: { hour: 20, minute: 30 } } },
                        { name: 'Autumn', color: ['#eabf14', '#0bcfe9'], timespan: 8, day: 22, time: { sunrise: { hour: 7, minute: 0 }, sunset: { hour: 18, minute: 30 } } },
                    ],
                    locations: [],
                    global_settings: { enable_weather: false, temp_sys: 'metric', wind_sys: 'metric', seed: 4726 },
                },
                settings: { year_zero_exists: false },
            },
            events: [],
            event_categories: [],
        }),
    },
    {
        id: 'harptos-dnd',
        name: 'Calendar of Harptos (Forgotten Realms)',
        subtitle: '365 days • 12 months + 5 festival days • 10-day tendays • Selûne',
        description: 'Classic D&D calendar with twelve 30-day months, five intercalary festival days between months, 10-day tendays, and the moon Selûne.',
        build: (worldName: string) => normalizeCalendarJSON({
            name: worldName || 'Calendar of Harptos',
            dynamic_data: { year: 1492, month: 0, timespan: 0, day: 1, hour: 8, minute: 0, location: '0' },
            static_data: {
                year_len: 365,
                n_months: 17,
                weekdays: ['1st Day', '2nd Day', '3rd Day', '4th Day', '5th Day', '6th Day', '7th Day', '8th Day', '9th Day', '10th Day'],
                months: [
                    { name: 'Hammer', length: 30, type: 'month' },
                    { name: 'Midwinter', length: 1, type: 'intercalary' },
                    { name: 'Alturiak', length: 30, type: 'month' },
                    { name: 'Ches', length: 30, type: 'month' },
                    { name: 'Tarsakh', length: 30, type: 'month' },
                    { name: 'Greengrass', length: 1, type: 'intercalary' },
                    { name: 'Mirtul', length: 30, type: 'month' },
                    { name: 'Kythorn', length: 30, type: 'month' },
                    { name: 'Flamerule', length: 30, type: 'month' },
                    { name: 'Midsummer', length: 1, type: 'intercalary' },
                    { name: 'Eleasis', length: 30, type: 'month' },
                    { name: 'Eleint', length: 30, type: 'month' },
                    { name: 'Highharvestide', length: 1, type: 'intercalary' },
                    { name: 'Marpenoth', length: 30, type: 'month' },
                    { name: 'Uktar', length: 30, type: 'month' },
                    { name: 'Feast of the Moon', length: 1, type: 'intercalary' },
                    { name: 'Nightal', length: 30, type: 'month' },
                ],
                moons: [
                    { name: 'Selûne', cycle: 30.4375, shift: 0, granularity: 16, cycle_rounding: 'round', color: '#d5f4f1', shadow_color: '#29344a', hidden: false },
                ],
                eras: [
                    { name: 'DR', formatting: '{{year}} {{era_name}}', date: { year: 1, timespan: 0, day: 1 }, settings: { restart: false, starting_era: true } },
                ],
                seasons: {
                    data: [
                        { name: 'Winter', color: ['#0bcfe9', '#1ee313'], timespan: 0, day: 1, time: { sunrise: { hour: 8, minute: 30 }, sunset: { hour: 16, minute: 30 } } },
                        { name: 'Spring', color: ['#1ee313', '#e74d0e'], timespan: 3, day: 19, time: { sunrise: { hour: 6, minute: 30 }, sunset: { hour: 18, minute: 30 } } },
                        { name: 'Summer', color: ['#e74d0e', '#eabf14'], timespan: 7, day: 20, time: { sunrise: { hour: 5, minute: 0 }, sunset: { hour: 21, minute: 0 } } },
                        { name: 'Autumn', color: ['#eabf14', '#0bcfe9'], timespan: 11, day: 21, time: { sunrise: { hour: 7, minute: 0 }, sunset: { hour: 18, minute: 30 } } },
                    ],
                    locations: [],
                    global_settings: { enable_weather: false, temp_sys: 'imperial', wind_sys: 'imperial', seed: 1492 },
                },
                settings: { year_zero_exists: true },
            },
            events: [],
            event_categories: [],
        }),
    },
    {
        id: 'blank-custom',
        name: 'Custom Blank Calendar',
        subtitle: '4 months • 7 weekdays • 1 moon • 4 seasons (Ready to customize)',
        description: 'A clean starting point with 4 seasonal months, 1 moon, and sunrise/sunset tracking ready for your own worldbuilding.',
        build: (worldName: string) => normalizeCalendarJSON({
            name: worldName || 'Custom Calendar',
            dynamic_data: { year: 1, month: 0, timespan: 0, day: 1, hour: 8, minute: 0, location: '0' },
            static_data: {
                year_len: 120,
                n_months: 4,
                weekdays: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'],
                months: [
                    { name: 'Firstmonth', length: 30, type: 'month' },
                    { name: 'Secondmonth', length: 30, type: 'month' },
                    { name: 'Thirdmonth', length: 30, type: 'month' },
                    { name: 'Fourthmonth', length: 30, type: 'month' },
                ],
                moons: [
                    { name: 'Luna', cycle: 28, shift: 0, granularity: 16, cycle_rounding: 'round', color: '#d5f4f1', shadow_color: '#29344a', hidden: false },
                ],
                eras: [],
                seasons: {
                    data: [
                        { name: 'Winter', color: ['#0bcfe9', '#1ee313'], timespan: 0, day: 1, time: { sunrise: { hour: 8, minute: 30 }, sunset: { hour: 17, minute: 0 } } },
                        { name: 'Spring', color: ['#1ee313', '#e74d0e'], timespan: 1, day: 1, time: { sunrise: { hour: 7, minute: 0 }, sunset: { hour: 19, minute: 0 } } },
                        { name: 'Summer', color: ['#e74d0e', '#eabf14'], timespan: 2, day: 1, time: { sunrise: { hour: 5, minute: 30 }, sunset: { hour: 20, minute: 30 } } },
                        { name: 'Autumn', color: ['#eabf14', '#0bcfe9'], timespan: 3, day: 1, time: { sunrise: { hour: 7, minute: 0 }, sunset: { hour: 18, minute: 30 } } },
                    ],
                    locations: [],
                    global_settings: { enable_weather: false, temp_sys: 'metric', wind_sys: 'metric', seed: 12345 },
                },
                settings: { year_zero_exists: false },
            },
            events: [],
            event_categories: [],
        }),
    },
];
