export function precisionRound(number: number, precision: number) {
    const factor = Math.pow(10, precision);
    return Math.round(number * factor) / factor;
}

export function clamp(t: number, min: number, max: number) {
    return Math.min(Math.max(t, min), max);
}

export function lerp(p0: number, p1: number, t: number) {
    return p0 + t * (p1 - p0);
}

export function fract(float: number) {
    return float - Math.floor(float);
}

export function mid(p0: number, p1: number) {
    return (p0 + p1) / 2;
}

export function norm(v: number, min: number, max: number) {
    return (v - min) / (max - min);
}

export function inv_norm(v: number, min: number, max: number) {
    return (max - v) / (max - min);
}

export function bezierQuadratic(p0: number, p1: number, p2: number, t: number) {
    return lerp(
        lerp(p0, p1, t),
        lerp(p1, p2, t),
        t
    );
}

export function fahrenheit_to_celcius(temp: number) {
    return precisionRound((temp - 32) * (5 / 9), 4);
}

export function celcius_to_fahrenheit(temp: number) {
    return precisionRound((temp * 9 / 5) + 32, 4);
}

export function clone<T>(obj: T): T {
    if (null == obj || "object" != typeof obj) return obj;
    if (obj instanceof Date) {
        const copy = new Date();
        copy.setTime(obj.getTime());
        return copy as any;
    }
    if (obj instanceof Array) {
        const copy = [];
        for (let i = 0, len = obj.length; i < len; i++) {
            copy[i] = clone(obj[i]);
        }
        return copy as any;
    }
    if (obj instanceof Object) {
        const copy: any = {};
        for (const attr in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, attr)) copy[attr] = clone((obj as any)[attr]);
        }
        return copy as any;
    }
    throw new Error("Unable to copy obj! Its type isn't supported.");
}

export function pick_from_table(chance: number, array: Record<string, number>, grow: boolean = false) {
    const keys = Object.keys(array);
    const length = keys.length;
    let target = 0;
    for (let index = 0; index < length; index++) {
        if (grow) {
            target += array[keys[index]];
        } else {
            target = array[keys[index]];
        }
        if (chance <= target) {
            return {
                index: index,
                key: keys[index],
                value: array[keys[index]]
            };
        }
    }
    return {
        index: length - 1,
        key: keys[length - 1],
        value: array[keys[length - 1]]
    };
}
