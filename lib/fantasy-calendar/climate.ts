import { Random } from './random';
import { lerp, mid, clamp, norm, precisionRound, fract, pick_from_table, fahrenheit_to_celcius, celcius_to_fahrenheit } from './utils';
import { preset_data } from './constants';

export class Climate {
    epoch_data: any;
    static_data: any;
    dynamic_data: any;
    start_epoch: number;
    end_epoch: number;
    random: Random;
    seasons: any[];
    settings: any;
    current_location: any;

    constructor(epoch_data: any, static_data: any, dynamic_data: any, start_epoch: number, end_epoch: number) {
        this.epoch_data = epoch_data;
        this.static_data = static_data;
        this.dynamic_data = dynamic_data;
        this.start_epoch = start_epoch;
        this.end_epoch = end_epoch;

        this.settings = this.static_data.seasons?.global_settings || { enable_weather: false };
        this.seasons = this.static_data.seasons?.data || [];
        this.random = new Random(this.settings.seed || 12345);
    }

    get process_seasons() {
        return this.seasons.length > 0 && Object.keys(this.epoch_data).length > 0;
    }

    get process_weather() {
        return this.process_seasons && this.settings.enable_weather;
    }

    set_up_location_seasons() {
        this.current_location = {
            seasons: this.seasons.map(s => ({
                time: s.time,
                weather: s.weather || { temp_low: 0, temp_high: 0, precipitation: 0, precipitation_intensity: 0 }
            })),
            settings: preset_data.curves
        };
    }

    generate() {
        if (!this.process_seasons) return this.epoch_data;

        this.set_up_location_seasons();
        this.generate_static_seasons();

        return this.epoch_data;
    }

    generate_static_seasons() {
        const n_months = this.static_data.n_months || this.static_data.months.length;
        
        for (let epoch = this.start_epoch; epoch <= this.end_epoch; epoch++) {
            const data = this.epoch_data[epoch];
            if (!data) continue;

            const m = data.timespan_index;
            const seasonIndex = Math.min(Math.floor((m / n_months) * this.seasons.length), this.seasons.length - 1);
            const nextSeasonIndex = (seasonIndex + 1) % this.seasons.length;
            
            const seasonLength = n_months / this.seasons.length;
            const perc = 1 - (m % seasonLength) / seasonLength;

            this.epoch_data[epoch].season = this.evaluate_season_data(epoch, seasonIndex, nextSeasonIndex, perc);
            if (this.process_weather) {
                this.epoch_data[epoch].weather = this.evaluate_weather_data(epoch, seasonIndex, nextSeasonIndex, perc);
            }

            // Mark solstices/equinoxes (Simplified)
            // If it's the very first day of the season (perc very close to 1)
            if (m % seasonLength === 0 && data.day === 1) {
                const seasonName = this.seasons[seasonIndex].name.toLowerCase();
                if (seasonName.includes('summer')) this.epoch_data[epoch].season.high_solstice = true;
                if (seasonName.includes('winter')) this.epoch_data[epoch].season.low_solstice = true;
                if (seasonName.includes('spring')) this.epoch_data[epoch].season.rising_equinox = true;
                if (seasonName.includes('autumn') || seasonName.includes('fall')) this.epoch_data[epoch].season.falling_equinox = true;
            }
        }
    }

    evaluate_season_data(epoch: number, seasonIndex: number, nextSeasonIndex: number, perc: number) {
        const curr_season = this.seasons[seasonIndex];
        const next_season = this.seasons[nextSeasonIndex];

        let sunrise_s = "";
        let sunset_s = "";
        let day_length = 0;

        if (curr_season.time) {
            const sunrise_h = lerp(next_season.time.sunrise.hour, curr_season.time.sunrise.hour, perc);
            const sunrise_m = Math.round(lerp(next_season.time.sunrise.minute, curr_season.time.sunrise.minute, perc));
            const sunset_h = lerp(next_season.time.sunset.hour, curr_season.time.sunset.hour, perc);
            const sunset_m = Math.round(lerp(next_season.time.sunset.minute, curr_season.time.sunset.minute, perc));

            sunrise_s = `${Math.floor(sunrise_h)}:${sunrise_m.toString().padStart(2, '0')}`;
            sunset_s = `${Math.floor(sunset_h)}:${sunset_m.toString().padStart(2, '0')}`;
            
            day_length = (sunset_h + sunset_m/60) - (sunrise_h + sunrise_m/60);
        }

        return {
            season_name: curr_season.name,
            season_index: seasonIndex,
            season_perc: Math.round(perc * 100),
            day_length,
            time: {
                sunrise: { string: sunrise_s },
                sunset: { string: sunset_s }
            }
        } as any;
    }

    evaluate_weather_data(epoch: number, seasonIndex: number, nextSeasonIndex: number, perc: number) {
        const curr_weather = this.current_location.seasons[seasonIndex].weather;
        const next_weather = this.current_location.seasons[nextSeasonIndex].weather;

        const low = lerp(next_weather.temp_low, curr_weather.temp_low, perc);
        const high = lerp(next_weather.temp_high, curr_weather.temp_high, perc);
        const middle = mid(low, high);

        const seed_offset = 1000;
        const large = this.random.noise(epoch, 1.0, this.current_location.settings.large_noise_frequency, this.current_location.settings.large_noise_amplitude) * 0.5;
        const medium = this.random.noise(epoch + seed_offset, 1.0, this.current_location.settings.medium_noise_frequency, this.current_location.settings.medium_noise_amplitude) * 0.8;
        const small = this.random.noise(epoch + seed_offset * 2, 1.0, this.current_location.settings.small_noise_frequency, this.current_location.settings.small_noise_amplitude);

        const temp = middle - large + medium - small;

        const temp_sys = this.settings.temp_sys || 'imperial';
        let temperature_actual_i, temperature_actual_m, percipitation_table;

        if (temp_sys === 'imperial') {
            temperature_actual_i = temp;
            temperature_actual_m = fahrenheit_to_celcius(temp);
            percipitation_table = temp > 32 ? "warm" : "cold";
        } else {
            temperature_actual_m = temp;
            temperature_actual_i = celcius_to_fahrenheit(temp);
            percipitation_table = temp > 0 ? "warm" : "cold";
        }

        const precipitation_chance = lerp(next_weather.precipitation, curr_weather.precipitation, perc);
        const chance = clamp(0.5 + this.random.noise(epoch + seed_offset * 4, 5.0, 0.35, 0.5), 0.0, 1.0);

        let precipitation = { key: 'None' };
        if (precipitation_chance > chance) {
            const inner_chance = clamp((0.5 + this.random.noise(epoch + seed_offset * 5, 10, 0.3, 0.5)), 0.0, 1.0);
            precipitation = pick_from_table(inner_chance, preset_data.precipitation[percipitation_table as 'warm' | 'cold'], true) as any;
        }

        return {
            temperature: {
                imperial: { actual: Math.round(temperature_actual_i) },
                metric: { actual: Math.round(temperature_actual_m) },
                cinematic: pick_from_table(temperature_actual_i, preset_data.temperature_gauge, false).key
            },
            precipitation: {
                key: precipitation.key,
                chance: precipitation_chance
            }
        };
    }
}
