import { condition_mapping } from './constants';
import { fract, clone } from './utils';

export class EventEvaluator {
    static_data: any;
    dynamic_data: any;
    events: any[];
    categories: any[];
    epoch_data: Record<number, any>;
    event_data: { valid: Record<number, number[]>, starts: Record<number, number[]>, ends: Record<number, number[]> };

    constructor(static_data: any, dynamic_data: any, events: any[], categories: any[], epoch_data: Record<number, any>) {
        this.static_data = static_data;
        this.dynamic_data = dynamic_data;
        this.events = clone(events);
        this.categories = categories;
        this.epoch_data = epoch_data;
        this.event_data = { valid: {}, starts: {}, ends: {} };
    }

    evaluate(start_epoch: number, end_epoch: number) {
        for (let i = 0; i < this.events.length; i++) {
            this.evaluate_event(i, start_epoch, end_epoch);
        }
        return this.event_data;
    }

    evaluate_event(event_index: number, start_epoch: number, end_epoch: number) {
        const event = this.events[event_index];
        if (!this.event_data.valid[event_index]) {
            this.event_data.valid[event_index] = [];
            this.event_data.starts[event_index] = [];
            this.event_data.ends[event_index] = [];
        }

        // Simplified: iterate through all epochs in range
        for (let epoch = start_epoch; epoch <= end_epoch; epoch++) {
            const data = this.epoch_data[epoch];
            if (!data) continue;

            if (event.data && this.evaluate_event_group(data, event.data.conditions || [])) {
                this.add_to_epoch(event, event_index, epoch, start_epoch, end_epoch);
            }
        }
    }

    evaluate_event_group(epoch_data: any, conditions: any[]): boolean {
        if (conditions.length === 0) return false;

        let result = false;
        for (let i = conditions.length - 1; i >= 0; i -= 2) {
            const condition = conditions[i];
            const is_array = Array.isArray(condition[1]);

            let new_result = false;
            if (is_array) {
                // Nested groups
                new_result = this.evaluate_event_group(epoch_data, condition[1]);
                if (condition[0] === "!") new_result = !new_result;
            } else {
                new_result = this.evaluate_condition(epoch_data, condition);
            }

            if (conditions[i + 1]) {
                const operator = conditions[i + 1][0];
                result = this.evaluate_operator(operator, result, new_result);
            } else {
                result = new_result;
            }
        }
        return result;
    }

    evaluate_condition(epoch_data: any, array: any[]): boolean {
        const category = array[0];
        const type = array[1];
        const values = array[2];

        const mapping = condition_mapping[category]?.[type];
        if (!mapping) return false;

        const subcons = mapping[1];
        let result = true;

        for (let i = 0; i < subcons.length; i++) {
            const subcon = subcons[i];
            const selector = subcon[0];
            const operator = subcon[1];

            let selected: any;
            let cond_1: any;
            let cond_2: any;

            if (category === "Epoch") {
                selected = epoch_data[selector];
                cond_1 = Number(values[subcon[2]]);
                cond_2 = values[subcon[3]] !== undefined ? Number(values[subcon[3]]) : undefined;
            } else if (category === "Date") {
                // Simplified: Date is exactly
                selected = epoch_data.epoch;
                // Need a way to get epoch from date. 
                // In WorldCalendar.tsx we have evaluate_calendar_start
                // For now, let's assume we can't easily do this without the full date manager
                return false; 
            } else if (category === "Moons") {
                selected = epoch_data.moon_phase?.[values[0]];
                cond_1 = Number(values[subcon[2]]);
            } else if (category === "Season") {
                if (!epoch_data.season) return false;
                selected = epoch_data.season[selector];
                cond_1 = values[subcon[2]];
            } else if (category === "Random") {
                cond_1 = Number(values[subcon[2]]);
                cond_2 = values[subcon[3]] !== undefined ? Number(values[subcon[3]]) : 0;
                selected = fract(43758.5453 * Math.sin(cond_2 + (78.233 * epoch_data.epoch))) * 100;
            } else if (category === "Weekday") {
                selected = epoch_data.week_day_name;
                cond_1 = values[subcon[2]];
            } else {
                selected = epoch_data[selector];
                cond_1 = values[subcon[2]];
            }

            if (subcon.length === 4) {
                result = result && this.evaluate_operator(operator, selected, cond_1, cond_2);
            } else {
                result = result && this.evaluate_operator(operator, selected, cond_1);
            }
        }

        return result;
    }

    evaluate_operator(operator: string, a: any, b: any, c?: any): boolean {
        switch (operator) {
            case '==': return a == b;
            case '!=': return a != b;
            case '>=': return a >= b;
            case '<=': return a <= b;
            case '>': return a > b;
            case '<': return a < b;
            case '%':
                if (c === undefined) return a % b === 0;
                return (a - c) % b === 0;
            case '&&': return a && b;
            case '||': return a || b;
            case 'NAND': return !(a && b);
            case '^': return a ^ b;
            default: return false;
        }
    }

    add_to_epoch(event: any, event_index: number, epoch: number, start_epoch: number, end_epoch: number) {
        if (event.data.has_duration) {
            const duration = event.data.duration || 1;
            for (let d = 0; d < duration; d++) {
                const current_epoch = epoch + d;
                if (current_epoch >= start_epoch && current_epoch <= end_epoch) {
                    if (!this.event_data.valid[event_index].includes(current_epoch)) {
                        this.event_data.valid[event_index].push(current_epoch);
                    }
                }
            }
            if (epoch >= start_epoch) this.event_data.starts[event_index].push(epoch);
            if (epoch + duration - 1 <= end_epoch) this.event_data.ends[event_index].push(epoch + duration - 1);
        } else {
            if (!this.event_data.valid[event_index].includes(epoch)) {
                this.event_data.valid[event_index].push(epoch);
            }
        }
    }
}
