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
    "Date": [
        ["Date is exactly", [["date", "==", 0, 1, 2]], [["number"], ["select"], ["number"]]],
        ["Date is not", [["date", "!=", 0, 1, 2]], [["number"], ["select"], ["number"]]],
        ["Date is or later than", [["date", ">=", 0, 1, 2]], [["number"], ["select"], ["number"]]],
        ["Date is or earlier than", [["date", "<=", 0, 1, 2]], [["number"], ["select"], ["number"]]],
        ["Date is later than", [["date", ">", 0, 1, 2]], [["number"], ["select"], ["number"]]],
        ["Date is earlier than", [["date", "<", 0, 1, 2]], [["number"], ["select"], ["number"]]],
    ],

    "Year": [
        ["Year is exactly", [["year", "==", 0]], [["number"]]],
        ["Year is not", [["year", "!=", 0]], [["number"]]],
        ["Year is or later than", [["year", ">=", 0]], [["number"]]],
        ["Year is or earlier than", [["year", "<=", 0]], [["number"]]],
        ["Year is later than", [["year", ">", 0]], [["number"]]],
        ["Year is earlier than", [["year", "<", 0]], [["number"]]],
        ["Every nth year", [["year", "%", 0, 1]], [["number"], ["number"]]]
    ],

    "Month": [
        ["Month is exactly", [["timespan_index", "==", 0]], [["select"]]],
        ["Month is not", [["timespan_index", "!=", 0]], [["select"]]],
        ["Month is or later than", [["timespan_index", ">=", 0]], [["select"]]],
        ["Month is or earlier than", [["timespan_index", "<=", 0]], [["select"]]],
        ["Month is later than", [["timespan_index", ">", 0]], [["select"]]],
        ["Month is earlier than", [["timespan_index", "<", 0]], [["select"]]],
        ["Every nth specific month", [["timespan_index", "==", 0], ["timespan_count", "%", 1, 2]], [["select"], ["number"], ["number"]]],
        ["Month number is exactly", [["timespan_number", "==", 0]], [["number"]]],
        ["Month number is not", [["timespan_number", "!=", 0]], [["number"]]],
        ["Month number is or later than", [["timespan_number", ">=", 0]], [["number"]]],
        ["Month number is or earlier than", [["timespan_number", "<=", 0]], [["number"]]],
        ["Month number is later than", [["timespan_number", ">", 0]], [["number"]]],
        ["Month number is earlier than", [["timespan_number", "<", 0]], [["number"]]],
        ["Every nth month", [["num_timespans", "%", 0, 1]], [["number"], ["number"]]],
        ["Month name is exactly", [["timespan_name", "==", 0]], [["text"]]],
        ["Month name is not", [["timespan_name", "!=", 0]], [["text"]]]
    ],

    "Day": [
        ["Day in month is exactly", [["day", "==", 0]], [["number"]]],
        ["Day in month is not", [["day", "!=", 0]], [["number"]]],
        ["Day in month is or later than", [["day", ">=", 0]], [["number"]]],
        ["Day in month is or earlier than", [["day", "<=", 0]], [["number"]]],
        ["Day in month is later than", [["day", ">", 0]], [["number"]]],
        ["Day in month is earlier than", [["day", "<", 0]], [["number"]]],
        ["Every nth day in month", [["day", "%", 0, 1]], [["number"], ["number"]]],
        ["Day in year is exactly", [["year_day", "==", 0]], [["number"]]],
        ["Day in year is not", [["year_day", "!=", 0]], [["number"]]],
        ["Day in year is or later than", [["year_day", ">=", 0]], [["number"]]],
        ["Day in year is or earlier than", [["year_day", "<=", 0]], [["number"]]],
        ["Day in year is later than", [["year_day", ">", 0]], [["number"]]],
        ["Day in year is earlier than", [["year_day", "<", 0]], [["number"]]],
        ["Every nth day in year", [["year_day", "%", 0, 1]], [["number"], ["number"]]],
        ["Nth days before the end of the month is exactly", [["inverse_day", "==", 0]], [["number"]]],
        ["Nth days before the end of the month is not", [["inverse_day", "!=", 0]], [["number"]]],
        ["Nth days before the end of the month is exactly or later than", [["inverse_day", ">=", 0]], [["number"]]],
        ["Nth days before the end of the month is exactly or earlier than", [["inverse_day", "<=", 0]], [["number"]]],
        ["Nth days before the end of the month is later than", [["inverse_day", ">", 0]], [["number"]]],
        ["Nth days before the end of the month is earlier than", [["inverse_day", "<", 0]], [["number"]]],
        ["Day is intercalary", [["intercalary", "==", 0]], [["boolean"]]],
        ["Day is not intercalary", [["intercalary", "!=", 0]], [["boolean"]]],
    ],

    "Epoch": [
        ["Epoch is exactly", [["epoch", "==", 0]], [["number"]]],
        ["Epoch is not", [["epoch", "!=", 0]], [["number"]]],
        ["Epoch is or later than", [["epoch", ">=", 0]], [["number"]]],
        ["Epoch is or earlier than", [["epoch", "<=", 0]], [["number"]]],
        ["Epoch is later than", [["epoch", ">", 0]], [["number"]]],
        ["Epoch is earlier than", [["epoch", "<", 0]], [["number"]]],
        ["Every nth epoch", [["epoch", "%", 0, 1]], [["number"], ["number"]]]
    ],

    "Weekday": [
        ["Weekday is exactly", [["week_day_name", "==", 0]], [["select"]]],
        ["Weekday is not", [["week_day_name", "!=", 0]], [["select"]]],
        ["Weekday number is exactly", [["week_day", "==", 0]], [["number"]]],
        ["Weekday number is not", [["week_day", "!=", 0]], [["number"]]],
        ["Weekday number is or later than", [["week_day", ">=", 0]], [["number"]]],
        ["Weekday number is or earlier than", [["week_day", "<=", 0]], [["number"]]],
        ["Weekday number is later than", [["week_day", ">", 0]], [["number"]]],
        ["Weekday number is earlier than", [["week_day", "<", 0]], [["number"]]],
        ["Weekday number in month is exactly", [["week_day_num", "==", 0]], [["number"]]],
        ["Weekday number in month is not", [["week_day_num", "!=", 0]], [["number"]]],
        ["Weekday number in month is or later than", [["week_day_num", ">=", 0]], [["number"]]],
        ["Weekday number in month is or earlier than", [["week_day_num", "<=", 0]], [["number"]]],
        ["Weekday number in month is later than", [["week_day_num", ">", 0]], [["number"]]],
        ["Weekday number in month is earlier than", [["week_day_num", "<", 0]], [["number"]]],
        ["Nth weekday number before the end of month is exactly", [["inverse_week_day_num", "==", 0]], [["number"]]],
        ["Nth weekday number before the end of month is not", [["inverse_week_day_num", "!=", 0]], [["number"]]],
        ["Nth weekday number before the end of month is or later than", [["inverse_week_day_num", ">=", 0]], [["number"]]],
        ["Nth weekday number before the end of month is or earlier than", [["inverse_week_day_num", "<=", 0]], [["number"]]],
    ],

    "Moons": [
        ["Moon phase is exactly", [["moon_phase", "==", 1]], [["select"]]],
        ["Moon phase is not", [["moon_phase", "!=", 1]], [["select"]]],
        ["Moon phase is or later than", [["moon_phase", ">=", 1]], [["select"]]],
        ["Moon phase is or earlier than", [["moon_phase", "<=", 1]], [["select"]]],
        ["Moon phase is later than", [["moon_phase", ">", 1]], [["select"]]],
        ["Moon phase is earlier than", [["moon_phase", "<", 1]], [["select"]]],
        ["Every nth moon phase", [["moon_phase", "==", 1], ["moon_phase_count", "%", 0, 2]], [["select"], ["number"], ["number"]]],
    ],

    "Season": [
        ["Season is exactly", [["season_index", "==", 0]], [["select"]]],
        ["Season is not", [["season_index", "!=", 0]], [["select"]]],
        ["Season percent is exactly", [["season_perc", "==", 0]], [["number"]]],
        ["Season percent is not", [["season_perc", "!=", 0]], [["number"]]],
        ["Season percent is or later than", [["season_perc", ">=", 0]], [["number"]]],
        ["Season percent is or earlier than", [["season_perc", "<=", 0]], [["number"]]],
        ["Season percent is later than", [["season_perc", ">", 0]], [["number"]]],
        ["Season percent is earlier than", [["season_perc", "<", 0]], [["number"]]],
        ["Season day is exactly", [["season_day", "==", 0]], [["number"]]],
        ["Season day is not", [["season_day", "!=", 0]], [["number"]]],
        ["Season day is or later than", [["season_day", ">=", 0]], [["number"]]],
        ["Season day is or earlier than", [["season_day", "<=", 0]], [["number"]]],
        ["Season day is later than", [["season_day", ">", 0]], [["number"]]],
        ["Season day is earlier than", [["season_day", "<", 0]], [["number"]]],
        ["Every nth season day", [["season_day", "%", 0, 1]], [["number"], ["number"]]],
        ["It is the longest day", [["high_solstice", "==", 0]], [["boolean"]]],
        ["It is the shortest day", [["low_solstice", "==", 0]], [["boolean"]]],
        ["It is the rising equinox (spring-like)", [["rising_equinox", "==", 0]], [["boolean"]]],
        ["It is the falling equinox (autumn-like)", [["falling_equinox", "==", 0]], [["boolean"]]]
    ],

    "Random": [
        ["Random chance is above", [["random", ">", 0]], [["number"]]],
        ["Random chance is below", [["random", "<", 0]], [["number"]]],
    ],

    "Events": [
        ["Target event happened exactly x days ago", [["event", "exactly_past", 0, 1]], [["select"], ["number"]]],
        ["Target event is happening exactly x days from now", [["event", "exactly_future", 0, 1]], [["select"], ["number"]]],
        ["Target event is going to happen within the next x days (exclusive)", [["event", "in_past_exc", 0, 1]], [["select"], ["number"]]],
        ["Target event has happened in the last x days (exclusive)", [["event", "in_future_exc", 0, 1]], [["select"], ["number"]]],
        ["Target event is going to happen within the next x days (inclusive)", [["event", "in_past_inc", 0, 1]], [["select"], ["number"]]],
        ["Target event has happened in the last x days (inclusive)", [["event", "in_future_inc", 0, 1]], [["select"], ["number"]]]
    ]
};
