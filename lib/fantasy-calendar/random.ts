import { fract, bezierQuadratic } from './utils';

export class Random {
    seed: number;

    constructor(seed: number) {
        this.seed = seed;
    }

    rndUNorm(idx: number) {
        return fract(43758.5453 * Math.sin(this.seed + (78.233 * idx)));
    }

    rndSNorm(idx: number) {
        return this.rndUNorm(idx) * 2.0 - 1.0;
    }

    random_int_between(idx: number, min: number, max: number) {
        return Math.round(this.rndUNorm(idx) * (max - min) + min);
    }

    random_float_between(idx: number, min: number, max: number) {
        return this.rndUNorm(idx) * (max - min) + min;
    }

    roll_dice(idx: number, dice_formula: string) {
        const parts = dice_formula.split('d');
        const dice_amount = parseInt(parts[0]) || 0;
        const dice_size = parseInt(parts[1]) || 0;

        let result = 0;
        for (let dice = 1; dice <= dice_amount; dice++) {
            result += this.random_int_between(idx, 1, dice_size);
        }
        return result;
    }

    noise(pos: number, phase: number, frequency: number, amplitude: number) {
        const curvePos = pos * frequency + phase;
        const segmentIdx = Math.floor(curvePos);

        const pPrev = this.rndSNorm(segmentIdx - 1.0);
        const pCurr = this.rndSNorm(segmentIdx);
        const pNext = this.rndSNorm(segmentIdx + 1.0);

        const p0 = (pPrev + pCurr) * 0.5;
        const p1 = pCurr;
        const p2 = (pCurr + pNext) * 0.5;
        const t = fract(curvePos);

        return amplitude * bezierQuadratic(p0, p1, p2, t);
    }
}
