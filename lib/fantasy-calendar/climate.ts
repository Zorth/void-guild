import { Random } from './random';
import { preset_data } from './constants';
import { lerp, clamp, pick_from_table, celcius_to_fahrenheit, fahrenheit_to_celcius } from './utils';
import { EvaluatedSeasonData, EvaluatedWeatherData, FantasyLocation, FantasySeason } from './types';

export class Climate {
    epoch_data: Record<number, any>;
    static_data: any;
    dynamic_data: any;
    start_epoch: number;
    end_epoch: number;
    random: Random;
    seasons: FantasySeason[];
    locations: FantasyLocation[];
    settings: any;
    activeLocationIndex: number | null;

    constructor(
        epoch_data: Record<number, any>,
        static_data: any,
        dynamic_data: any,
        start_epoch: number,
        end_epoch: number,
        locationOverride?: number | null
    ) {
        this.epoch_data = epoch_data;
        this.static_data = static_data;
        this.dynamic_data = dynamic_data;
        this.start_epoch = start_epoch;
        this.end_epoch = end_epoch;

        this.settings = this.static_data.seasons?.global_settings || { enable_weather: false, temp_sys: 'metric' };
        this.seasons = this.static_data.seasons?.data || [];
        this.locations = this.static_data.seasons?.locations || [];
        this.random = new Random(Number(this.settings.seed) || 12345);

        if (locationOverride !== undefined) {
            this.activeLocationIndex = locationOverride;
        } else if (
            this.dynamic_data?.location !== undefined &&
            this.dynamic_data?.location !== null &&
            this.dynamic_data?.location !== ''
        ) {
            const parsed = Number(this.dynamic_data.location);
            this.activeLocationIndex = !Number.isNaN(parsed) && this.locations[parsed] ? parsed : (this.locations.length > 0 ? 0 : null);
        } else {
            this.activeLocationIndex = this.locations.length > 0 ? 0 : null;
        }
    }

    get process_seasons() {
        return this.seasons.length > 0 && Object.keys(this.epoch_data).length > 0;
    }

    private getMonthStartYearDay(monthIndex: number): number {
        const months = this.static_data.months || [];
        let day = 0;
        for (let i = 0; i < monthIndex && i < months.length; i++) {
            day += Number(months[i]?.length) || 30;
        }
        return day;
    }

    private getYearLength(): number {
        const months = this.static_data.months || [];
        if (months.length === 0) return Number(this.static_data.year_len) || 365;
        return months.reduce((sum: number, m: any) => sum + (Number(m?.length) || 30), 0);
    }

    /**
     * Computes sorted season anchors by their 1-indexed year_day start
     */
    private computeSeasonAnchors() {
        const yearLen = this.getYearLength();
        const count = this.seasons.length;
        const anchors = this.seasons.map((season, index) => {
            let startYearDay: number;
            if (typeof season.timespan === 'number') {
                const mStart = this.getMonthStartYearDay(season.timespan);
                const d = Math.max(1, Number(season.day) || 1);
                startYearDay = mStart + d;
            } else {
                startYearDay = Math.floor((index / count) * yearLen) + 1;
            }
            return {
                index,
                season,
                startYearDay: clamp(startYearDay, 1, yearLen),
            };
        });

        anchors.sort((a, b) => a.startYearDay - b.startYearDay);
        return { anchors, yearLen };
    }

    generate() {
        if (!this.process_seasons) return this.epoch_data;

        const { anchors, yearLen } = this.computeSeasonAnchors();
        if (anchors.length === 0) return this.epoch_data;

        const minutesPerHour = Number(this.static_data.clock?.minutes) || 60;
        const hoursPerDay = Number(this.static_data.clock?.hours) || 24;
        const activeLocation = this.activeLocationIndex !== null ? this.locations[this.activeLocationIndex] : undefined;

        // Identify which season index corresponds to longest/shortest day or solstices/equinoxes
        let longestDaySeasonIdx = -1;
        let shortestDaySeasonIdx = -1;
        let maxDaylight = -Infinity;
        let minDaylight = Infinity;

        this.seasons.forEach((s, idx) => {
            const sr = (s.time?.sunrise?.hour ?? 6) * minutesPerHour + (s.time?.sunrise?.minute ?? 0);
            const ss = (s.time?.sunset?.hour ?? 18) * minutesPerHour + (s.time?.sunset?.minute ?? 0);
            const dl = ss >= sr ? ss - sr : (hoursPerDay * minutesPerHour - sr + ss);
            const lower = (s.name || '').toLowerCase();
            if (lower.includes('summer')) longestDaySeasonIdx = idx;
            if (lower.includes('winter')) shortestDaySeasonIdx = idx;
            if (dl > maxDaylight) {
                maxDaylight = dl;
                if (longestDaySeasonIdx === -1) longestDaySeasonIdx = idx;
            }
            if (dl < minDaylight) {
                minDaylight = dl;
                if (shortestDaySeasonIdx === -1) shortestDaySeasonIdx = idx;
            }
        });

        for (let epoch = this.start_epoch; epoch <= this.end_epoch; epoch++) {
            const data = this.epoch_data[epoch];
            if (!data) continue;

            const yearDay = clamp(Number(data.year_day) || 1, 1, yearLen);

            // Find current and next anchor around yearDay
            let currAnchorPos = anchors.length - 1;
            for (let i = 0; i < anchors.length; i++) {
                if (yearDay >= anchors[i].startYearDay) {
                    currAnchorPos = i;
                } else {
                    break;
                }
            }

            const currAnchor = anchors[currAnchorPos];
            const nextAnchor = anchors[(currAnchorPos + 1) % anchors.length];

            let seasonDay = yearDay - currAnchor.startYearDay + 1;
            if (seasonDay <= 0) {
                seasonDay += yearLen;
            }

            let spanLength = nextAnchor.startYearDay - currAnchor.startYearDay;
            if (spanLength <= 0) {
                spanLength += yearLen;
            }

            const t = spanLength > 0 ? clamp((seasonDay - 1) / spanLength, 0, 1) : 0;

            const currSeason = currAnchor.season;
            const nextSeason = nextAnchor.season;

            // Resolve sunrise/sunset from location override if available, else season time
            const currLocSeason = activeLocation?.seasons?.[currAnchor.index];
            const nextLocSeason = activeLocation?.seasons?.[nextAnchor.index];

            const currSunrise = currLocSeason?.time?.sunrise || currSeason.time?.sunrise || { hour: 6, minute: 0 };
            const currSunset = currLocSeason?.time?.sunset || currSeason.time?.sunset || { hour: 18, minute: 0 };
            const nextSunrise = nextLocSeason?.time?.sunrise || nextSeason.time?.sunrise || currSunrise;
            const nextSunset = nextLocSeason?.time?.sunset || nextSeason.time?.sunset || currSunset;

            const currSunriseMins = currSunrise.hour * minutesPerHour + currSunrise.minute;
            const nextSunriseMins = nextSunrise.hour * minutesPerHour + nextSunrise.minute;
            const interpSunriseMins = Math.round(lerp(currSunriseMins, nextSunriseMins, t));

            const currSunsetMins = currSunset.hour * minutesPerHour + currSunset.minute;
            const nextSunsetMins = nextSunset.hour * minutesPerHour + nextSunset.minute;
            const interpSunsetMins = Math.round(lerp(currSunsetMins, nextSunsetMins, t));

            const sunrise = {
                hour: Math.floor(interpSunriseMins / minutesPerHour) % hoursPerDay,
                minute: interpSunriseMins % minutesPerHour,
            };
            const sunset = {
                hour: Math.floor(interpSunsetMins / minutesPerHour) % hoursPerDay,
                minute: interpSunsetMins % minutesPerHour,
            };

            const daylightMinutes = interpSunsetMins >= interpSunriseMins
                ? interpSunsetMins - interpSunriseMins
                : (hoursPerDay * minutesPerHour - interpSunriseMins + interpSunsetMins);

            const seasonColor = Array.isArray(currSeason.color) && currSeason.color.length > 0
                ? currSeason.color[0]
                : '#a855f7';

            const isSeasonFirstDay = seasonDay === 1;
            const lowerName = (currSeason.name || '').toLowerCase();

            const seasonInfo: EvaluatedSeasonData = {
                season_name: currSeason.name,
                season_index: currAnchor.index,
                season_perc: Math.round(t * 100),
                season_day: seasonDay,
                color: seasonColor,
                sunrise,
                sunset,
                daylight_minutes: daylightMinutes,
                high_solstice: isSeasonFirstDay && (lowerName.includes('summer') || currAnchor.index === longestDaySeasonIdx),
                low_solstice: isSeasonFirstDay && (lowerName.includes('winter') || currAnchor.index === shortestDaySeasonIdx),
                rising_equinox: isSeasonFirstDay && lowerName.includes('spring'),
                falling_equinox: isSeasonFirstDay && (lowerName.includes('autumn') || lowerName.includes('fall')),
            };

            this.epoch_data[epoch].season = seasonInfo;

            // Generate daily weather if enabled
            if (this.settings.enable_weather !== false && !this.static_data.settings?.hide_all_weather) {
                const weatherInfo = this.evaluateWeatherForEpoch(
                    epoch,
                    currAnchor.index,
                    nextAnchor.index,
                    t,
                    activeLocation
                );
                if (weatherInfo) {
                    this.epoch_data[epoch].weather = weatherInfo;
                }
            }
        }

        return this.epoch_data;
    }

    private evaluateWeatherForEpoch(
        epoch: number,
        currSeasonIdx: number,
        nextSeasonIdx: number,
        t: number,
        activeLocation?: FantasyLocation
    ): EvaluatedWeatherData | null {
        const currSeason = this.seasons[currSeasonIdx];
        const nextSeason = this.seasons[nextSeasonIdx] || currSeason;

        const currWeather = activeLocation?.seasons?.[currSeasonIdx]?.weather || currSeason?.weather;
        const nextWeather = activeLocation?.seasons?.[nextSeasonIdx]?.weather || nextSeason?.weather || currWeather;

        if (!currWeather) return null;

        const baseLow = lerp(Number(currWeather.temp_low ?? 5), Number(nextWeather?.temp_low ?? 5), t);
        const baseHigh = lerp(Number(currWeather.temp_high ?? 18), Number(nextWeather?.temp_high ?? 18), t);
        const precipChance = clamp(
            lerp(Number(currWeather.precipitation ?? 0.25), Number(nextWeather?.precipitation ?? 0.25), t),
            0,
            1
        );
        const precipIntensity = clamp(
            lerp(Number(currWeather.precipitation_intensity ?? 0.4), Number(nextWeather?.precipitation_intensity ?? 0.4), t),
            0,
            1
        );

        const curves = activeLocation?.settings || preset_data.curves;
        const noiseVal =
            this.random.noise(epoch, 0, curves.large_noise_frequency ?? 0.015, curves.large_noise_amplitude ?? 10) +
            this.random.noise(epoch, 10, curves.medium_noise_frequency ?? 0.3, curves.medium_noise_amplitude ?? 4) +
            this.random.noise(epoch, 20, curves.small_noise_frequency ?? 0.8, curves.small_noise_amplitude ?? 5);

        // Note: Sythian stores location temps in Celsius when temp_sys === 'metric'
        const isMetric = (this.settings.temp_sys || 'metric') === 'metric';
        const scaledNoise = isMetric ? noiseVal * 0.35 : noiseVal * 0.6;

        const tempLow = Math.round(baseLow + scaledNoise * 0.7);
        const tempHigh = Math.max(tempLow + 1, Math.round(baseHigh + scaledNoise));
        const tempActual = Math.round((tempLow + tempHigh) / 2);

        // Temperature description lookup (preset_data.temperature_gauge is in Fahrenheit)
        const tempF = isMetric ? celcius_to_fahrenheit(tempActual) : tempActual;
        let tempDesc = 'Mild';
        for (const [label, maxF] of Object.entries(preset_data.temperature_gauge as Record<string, number>)) {
            tempDesc = label;
            if (tempF <= maxF) break;
        }

        // Precipitation & clouds
        const rollPrecip = this.random.rndUNorm(epoch * 3 + 1);
        const hasPrecip = rollPrecip <= precipChance;
        const isCold = isMetric ? tempActual <= 0 : tempActual <= 32;

        let precipitationText: string | null = null;
        if (hasPrecip) {
            const table = isCold ? preset_data.precipitation.cold : preset_data.precipitation.warm;
            const keys = Object.keys(table);
            const idx = clamp(Math.floor(precipIntensity * keys.length + (this.random.rndSNorm(epoch * 5) * 0.8)), 0, keys.length - 1);
            precipitationText = keys[idx];
        }

        const cloudIndex = hasPrecip
            ? clamp(Math.floor(precipIntensity * (preset_data.clouds.length - 1)) + 1, 1, preset_data.clouds.length - 1)
            : clamp(Math.floor(this.random.rndUNorm(epoch * 7) * 3), 0, 2);
        const clouds = preset_data.clouds[cloudIndex] || 'Clear skies';

        // Wind
        const windPick = pick_from_table(this.random.rndUNorm(epoch * 11) * 40, preset_data.wind.speed, true);
        const windSpeed = windPick.key;
        const windInfo = preset_data.wind.info[windSpeed] || { mph: '1-3', desciption: 'Calm air' };
        const dirKeys = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        const windDirection = dirKeys[Math.floor(this.random.rndUNorm(epoch * 13) * dirKeys.length)] || 'N';

        // Special weather feature
        let feature: string | null = null;
        if (hasPrecip && precipIntensity > 0.65 && this.random.rndUNorm(epoch * 17) > 0.65) {
            feature = isCold ? 'Hail' : 'Lightning';
        } else if (hasPrecip && this.random.rndUNorm(epoch * 19) > 0.75) {
            feature = 'Fog';
        }

        return {
            temp_low: tempLow,
            temp_high: tempHigh,
            temp_actual: tempActual,
            temp_unit: isMetric ? '°C' : '°F',
            temp_description: tempDesc,
            clouds,
            precipitation: precipitationText,
            precipitation_chance: Math.round(precipChance * 100),
            wind_speed: windSpeed,
            wind_direction: windDirection,
            wind_mph: windInfo.mph,
            wind_description: windInfo.desciption,
            feature,
            location_name: activeLocation?.name,
        };
    }
}
