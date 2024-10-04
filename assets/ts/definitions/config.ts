// noinspection JSUnusedGlobalSymbols

import {
    is_boolean,
    is_integer,
    is_object,
    is_string,
    max_benchmark_file_size,
    max_benchmark_records,
    minimum_benchmark_file_size,
    minimum_benchmark_records,
    set_max_record_file_size,
    set_max_records,
    set_prettify
} from "./functions";
import {ActionTypes, ColorModeTypes, ConfigParams, TabListTypes} from "../types/types";

export const setting_storage_name = 'arrayiterator-waterfall-profiler-preference';
export const config_tab_mode = 'tab-mode';
export const config_action_mode = 'action-mode';
export const config_color_mode = 'color-mode';
export const config_max_records = 'max-records';
export const config_max_size = 'max-size';
export const config_prettify = 'prettify';
export const color_mode_list: Array<ColorModeTypes> = [
    'light',
    'dark'
];

export const action_list: Array<
    ActionTypes
> = [
    'closed',
    'opened',
    'minimize',
    'maximize'
];

export const tab_list: Array<TabListTypes> = [
    'benchmark',
    'labs',
    'json'
];

// use user agent
// noinspection JSDeprecatedSymbols
export const is_mac = /(Mac|iPhone|iPod|iPad)/.test(
    (window.navigator?.platform || window.navigator?.userAgent || '').toString()
);
const is_mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Operas\+Mini/i.test(
    window.navigator.userAgent
);

export const severity_list: {
    slow: Array<number>,
    average: Array<number>,
    fast: Array<number>,
    [p: string]: Array<number>
} = {
    slow: [
        1,
        3
    ],
    average: [
        3,
        5
    ],
    fast: [
        6,
        0
    ],
};

export const benchmark_allowed_resize_tag_names: {
    [p: string]: string
} = {
    'record-item-name': '--waterfall-record-name-width',
    'record-item-group': '--waterfall-record-group-width',
    'record-item-duration': '--waterfall-record-duration-width',
    'record-item-memory': '--waterfall-record-memory-width',
}
export const default_benchmark_width = {
    '--waterfall-record-min-width': '50px',
    '--waterfall-record-name-width': '175px',
    '--waterfall-record-group-width': '100px',
    '--waterfall-record-duration-width': '100px',
    '--waterfall-record-memory-width': '100px',
}

/**
 * Variables - to globally store variables
 */
let configurations: {
    [p: string]: any
} = {};

try {
    let stored = localStorage.getItem(setting_storage_name);
    if (is_string(stored)) {
        configurations = JSON.parse(stored);
    }
} catch (err) {
}

if (!is_object(configurations)) {
    configurations = {};
    localStorage.removeItem(setting_storage_name);
}

const valid = (key: string, value: any) => {
    return !(key === config_tab_mode && !tab_list.includes(value)
        || key === config_action_mode && !action_list.includes(value)
        || key === config_color_mode && !color_mode_list.includes(value)
        || key === config_max_records && (
            !is_integer(value) || (
                value <= minimum_benchmark_records || value >= max_benchmark_records
            )
        )
        || key === config_max_size && (
            !is_integer(value) || (
                value <= minimum_benchmark_file_size || value >= max_benchmark_file_size
            )
        )
        || key === config_prettify && !is_boolean(value)
    );
}

function ConfigObject() {
    // setups
    this.get(config_max_records);
    this.get(config_max_size);
    return this;
}

/**
 * Get the value of the key
 */
ConfigObject.prototype.get = function get(key: ConfigParams) {
    let value = configurations[key];
    if (this.has(key)) {
        if (!valid(key, value)) {
            this.delete(key);
            return null;
        }
        if (key === config_max_records) {
            set_max_records(value);
        }
        if (key === config_max_size) {
            set_max_record_file_size(value);
        }
        if (key === config_prettify) {
            value = !!value;
            set_prettify(value);
        }
        return value;
    }
    return null;
}

ConfigObject.prototype.set = function set(key: ConfigParams, value: any) {
    if (!is_string(key)) {
        return;
    }
    if (!valid(key, value)) {
        console.log('set', key, value);
        if (value === null) {
            this.delete(key);
        }
        return;
    }
    if (key === config_max_records) {
        value = parseInt(value);
        value = Math.min(Math.max(minimum_benchmark_records, value), max_benchmark_records);
        set_max_records(value);
    } else if (key === config_max_size) {
        value = parseFloat(value);
        value = Math.min(Math.max(minimum_benchmark_file_size, value), max_benchmark_file_size);
        set_max_record_file_size(value);
    } else if (key === config_action_mode && ['minimize', 'maximize'].includes(value)) {
        value = 'opened';
    } else if (key === config_prettify) {
        value = !!value;
        set_prettify(value);
    }
    configurations[key] = value;
    localStorage.setItem(setting_storage_name, JSON.stringify(configurations));
}
ConfigObject.prototype.remove = function remove(key: ConfigParams) {
    if (!is_string(key) || !this.has(key)) {
        return;
    }
    delete configurations[key];
    localStorage.setItem(setting_storage_name, JSON.stringify(configurations));
}
ConfigObject.prototype.has = function has(key: ConfigParams) {
    return is_string(key) && configurations.hasOwnProperty(key);
}
ConfigObject.prototype.all = function all() {
    return Object.assign({}, configurations);
}
ConfigObject.prototype.clear = function clear() {
    configurations = {};
    localStorage.removeItem(setting_storage_name);
}
ConfigObject.prototype.entries = function () {
    return Object.entries(configurations);
}
ConfigObject.prototype[Symbol('iterator')] = function* () {
    for (let key in configurations) {
        if (configurations.hasOwnProperty(key)) {
            yield [key, configurations[key]];
        }
    }
}

// @ts-expect-error ignore
export const Config: ConfigObject = new ConfigObject();
export default Config;

Object.freeze(Config);
