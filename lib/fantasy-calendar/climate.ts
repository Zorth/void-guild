import { Random } from './random';

export class Climate {
    epoch_data: any;
    static_data: any;
    dynamic_data: any;
    start_epoch: number;
    end_epoch: number;
    random: Random;
    seasons: any[];
    settings: any;

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

    generate() {
        if (!this.process_seasons) return this.epoch_data;

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
            
            const seasonLength = n_months / this.seasons.length;
            const perc = 1 - (m % seasonLength) / seasonLength;

            this.epoch_data[epoch].season = this.evaluate_season_data(epoch, seasonIndex, perc);

            // Mark solstices/equinoxes (Simplified)
            if (m % seasonLength === 0 && data.day === 1) {
                const seasonName = this.seasons[seasonIndex].name.toLowerCase();
                if (seasonName.includes('summer')) this.epoch_data[epoch].season.high_solstice = true;
                if (seasonName.includes('winter')) this.epoch_data[epoch].season.low_solstice = true;
                if (seasonName.includes('spring')) this.epoch_data[epoch].season.rising_equinox = true;
                if (seasonName.includes('autumn') || seasonName.includes('fall')) this.epoch_data[epoch].season.falling_equinox = true;
            }
        }
    }

    evaluate_season_data(epoch: number, seasonIndex: number, perc: number) {
        const curr_season = this.seasons[seasonIndex];

        return {
            season_name: curr_season.name,
            season_index: seasonIndex,
            season_perc: Math.round(perc * 100)
        } as any;
    }
}
