// noinspection JSUnusedGlobalSymbols

import {
    get_max_record_file_size, get_max_records,
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
import {ActionTypes, ColorModeTypes, ConfigParams} from "../types/types";

export const setting_storage_name = 'arrayiterator-waterfall-profiler-preference';
export const config_tab_mode = 'tab_mode';
export const config_action_mode = 'action_mode';
export const config_color_mode = 'color_mode';
export const config_max_records = 'maximum_benchmark_records';
export const config_max_size = 'maximum_benchmark_size';
export const config_enable_labs = 'enable_labs';

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
        if (key === config_max_size) {
            if (is_integer(value)) {
                set_max_record_file_size(value * 1024 * 1024);
            }
            return get_max_record_file_size();
        } else if (key === config_max_records) {
            if (is_integer(value)) {
                set_max_records(value);
            }
            return get_max_records();
        } else if (key === config_prettify) {
            value = !!value;
            set_prettify(value);
        } else if (key === config_action_mode && ['minimize', 'maximize'].includes(value)) {
            value = 'opened';
        } else if (key === config_action_mode && !action_list.includes(value)
            || key === config_color_mode && !color_mode_list.includes(value)
        ) {
            return;
        } else if (key === config_enable_labs) {
            value = value === '0' ? false : (value === '1' ? true: (!!value));
        }
        return value;
    }
    return null;
}

ConfigObject.prototype.set = function set(key: ConfigParams, value: any) {
    if (!is_string(key)) {
        return;
    }
    if (key === config_max_records) {
        value = parseInt(value);
        value = Math.min(Math.max(minimum_benchmark_records, value), max_benchmark_records);
        set_max_records(value);
    } else if (key === config_max_size) {
        value = parseInt(value);
        value = Math.min(Math.max(minimum_benchmark_file_size/1024/1024, value), max_benchmark_file_size/1024/1024);
        set_max_record_file_size(value * 1024 * 1024);
    } else if (key === config_action_mode && ['minimize', 'maximize'].includes(value)) {
        value = 'opened';
    } else if (key === config_prettify) {
        value = !!value;
        set_prettify(value);
    } else if (key === config_enable_labs) {
        value = value === '0' ? false : (value === '1' ? true: (!!value));
    } else if (key  === config_color_mode && !color_mode_list.includes(value)) {
        this.remove(key);
        return;
    }
    configurations[key] = value;
    localStorage.setItem(setting_storage_name, JSON.stringify(configurations));
}
ConfigObject.prototype.remove = function remove(key: ConfigParams) {
    if (!is_string(key) || !this.has(key)) {
        return;
    }
    switch (key) {
        case config_max_records:
            set_max_records(max_benchmark_records);
            break;
        case config_max_size:
            set_max_record_file_size(max_benchmark_file_size);
            break;
        case config_prettify:
            set_prettify(true);
            break;
        case config_enable_labs:
            configurations[key] = false;
            break;
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
