export const preset_data = {
    temperature_gauge: {
        'Polar': -40,
        'Bone-chilling': -22,
        'Bitter cold': -4,
        'Biting': 5,
        'Frigid': 14,
        'Crisp': 23,
        'Freezing': 32,
        'Cold': 41,
        'Chilly': 50,
        'Cool': 59,
        'Mild': 68,
        'Warm': 77,
        'Hot': 86,
        'Very Hot': 95,
        'Sweltering': 104,
        'Blistering': 113,
        'Burning': 140,
        'Blazing': 176,
        'Infernal': 212
    },
    clouds: [
        'A few clouds',
        'Mostly cloudy',
        'Gray, slightly overcast',
        'Gray, highly overcast',
        'Dark storm clouds',
        'Dark storm clouds'
    ],
    precipitation: {
        'warm': {
            'Light mist': 0.2,
            'Drizzle': 0.175,
            'Steady rainfall': 0.175,
            'Strong rainfall': 0.15,
            'Pounding rain': 0.15,
            'Downpour': 0.15
        },
        'cold': {
            'A few flakes': 0.2,
            'A dusting of snow': 0.175,
            'Flurries': 0.175,
            'Moderate snowfall': 0.15,
            'Heavy snowfall': 0.15,
            'Blizzard': 0.15
        }
    },
    wind: {
        type: [
            '1d4',
            '1d6',
            '2d4',
            '2d6',
            '2d8',
            '2d10'
        ],
        speed: {
            'Calm': 1,
            'Light air': 2,
            'Light breeze': 2,
            'Gentle breeze': 2,
            'Moderate breeze': 2,
            'Fresh breeze': 2,
            'Strong breeze': 2,
            'Moderate gale': 2,
            'Fresh gale': 2,
            'Strong gale': 1,
            'Storm': 1,
            'Violent storm': 19,
            'Hurricane': 2
        },
        info: {
            'Calm': { 'mph': '<1', 'desciption': 'Smoke rises vertically' },
            'Light air': { 'mph': '1-3', 'desciption': 'Wind direction shown by smoke but not wind vanes' },
            'Light breeze': { 'mph': '4-7', 'desciption': 'Wind felt on face, leaves rustle, vanes move' },
            'Gentle breeze': { 'mph': '8-12', 'desciption': 'Leaves and small twigs sway and banners flap' },
            'Moderate breeze': { 'mph': '13-18', 'desciption': 'Small branches move, and dust and small branches are raised' },
            'Fresh breeze': { 'mph': '19-24', 'desciption': 'Small trees sway and small waves form on inland waters' },
            'Strong breeze': { 'mph': '25-31', 'desciption': 'Large branches move' },
            'Moderate gale': { 'mph': '32-38', 'desciption': 'Whole trees sway and walking against wind takes some effort' },
            'Fresh gale': { 'mph': '39-46', 'desciption': 'Twigs break off trees and general progress is impeded' },
            'Strong gale': { 'mph': '47-54', 'desciption': 'Slight structural damage occurs' },
            'Storm': { 'mph': '55-63', 'desciption': 'Trees are uprooted and considerable structural damage occurs' },
            'Violent storm': { 'mph': '64-72', 'desciption': 'Widespread damage occurs' },
            'Hurricane': { 'mph': '73-136', 'desciption': 'Widespread devastation occurs' }
        },
        direction_table: {
            'N': { 'N': 0.31, 'NW': 0.14, 'W': 0.105, 'NE': 0.14, 'E': 0.105, 'SW': 0.075, 'SE': 0.075, 'S': 0.05 },
            'NE': { 'NE': 0.31, 'N': 0.14, 'E': 0.14, 'W': 0.075, 'S': 0.075, 'NW': 0.105, 'SE': 0.105, 'SW': 0.05 },
            'E': { 'E': 0.31, 'NE': 0.14, 'SE': 0.14, 'N': 0.105, 'S': 0.105, 'NW': 0.075, 'SW': 0.075, 'W': 0.05 },
            'SE': { 'SE': 0.31, 'E': 0.14, 'S': 0.14, 'NE': 0.105, 'SW': 0.105, 'N': 0.075, 'W': 0.075, 'NW': 0.05 },
            'S': { 'S': 0.31, 'SE': 0.14, 'SW': 0.14, 'E': 0.105, 'W': 0.105, 'NE': 0.075, 'NW': 0.075, 'N': 0.05 },
            'SW': { 'SW': 0.31, 'S': 0.14, 'W': 0.14, 'SE': 0.105, 'NW': 0.105, 'E': 0.075, 'N': 0.075, 'NE': 0.05 },
            'W': { 'W': 0.31, 'SW': 0.14, 'NW': 0.14, 'S': 0.105, 'N': 0.105, 'SE': 0.075, 'NE': 0.075, 'E': 0.05 },
            'NW': { 'NW': 0.31, 'W': 0.14, 'N': 0.14, 'SW': 0.105, 'NE': 0.105, 'S': 0.075, 'E': 0.075, 'SE': 0.05 }
        }
    },
    feature_table: {
        'Rain': { 'warm': { 'None': 0.5, 'Fog': 1.0 }, 'cold': { 'None': 0.75, 'Hail': 1.0 } },
        'Storm': { 'warm': { 'None': 0.5, 'Lightning': 1.0 }, 'cold': { 'None': 0.8, 'Hail': 1.0 } },
        'Windy': { 'warm': { 'None': 0.5, 'Dust Storm': 0.8, 'Tornado': 1.0 }, 'cold': { 'None': 0.8, 'Tornado': 1.0 } }
    },
    curves: {
        "timezone": { "hour": 0, "minute": 0 },
        "large_noise_frequency": 0.015,
        "large_noise_amplitude": 10.0,
        "medium_noise_frequency": 0.3,
        "medium_noise_amplitude": 4.0,
        "small_noise_frequency": 0.8,
        "small_noise_amplitude": 5.0
    }
} as any;

export const condition_mapping: Record<string, any[]> = {
    "Year": [
        ["Year is exactly", [["year", "==", 0]], [["number"]]],
        ["Every nth year", [["year", "%", 0, 1]], [["number"], ["number"]]]
    ],
    "Month": [
        ["Month is exactly", [["timespan_index", "==", 0]], [["select"]]]
    ],
    "Day": [
        ["Day in month is exactly", [["day", "==", 0]], [["number"]]]
    ],
    "Epoch": [
        ["Every nth epoch", [["epoch", "%", 0, 1]], [["number"], ["number"]]]
    ],
    "Weekday": [
        ["Weekday is exactly", [["week_day_name", "==", 0]], [["select"]]]
    ],
    "Moons": [
        ["Moon phase is exactly", [["moon_phase", "==", 1]], [["select"]]]
    ],
    "Season": [
        ["Season is exactly", [["season_index", "==", 0]], [["select"]]],
        ["It is the longest day", [["high_solstice", "==", 0]], [["boolean"]]],
        ["It is the shortest day", [["low_solstice", "==", 0]], [["boolean"]]],
        ["It is the rising equinox (spring-like)", [["rising_equinox", "==", 0]], [["boolean"]]],
        ["It is the falling equinox (autumn-like)", [["falling_equinox", "==", 0]], [["boolean"]]]
    ]
};
