import {iconShapes} from "./icons";
import {JsonProfiler, RecordProfiler} from "../types/types";


/**
 * Max benchmark records
 * max 1000 records to prevent memory issues
 */
export const max_benchmark_records = 1000;

/**
 * Max benchmark file size
 * max 10MB to prevent memory issues
 */
export const max_benchmark_file_size = 10 * 1024 * 1024; // in bytes
/**
 * Minimum and maximum records of the benchmark file
 */
export const minimum_benchmark_records = 50;

/**
 * Minimum and maximum size of the benchmark file is 1MB in bytes
 */
export const minimum_benchmark_file_size = 1024 * 1024; // in bytes

// DYNAMIC VARIABLES
let benchmark_record_file_size = max_benchmark_file_size;
let benchmark_max_records = max_benchmark_records;
let prettify: boolean = true;

/**
 * Set max record file size
 */
export const set_max_record_file_size = (size: number) => {
    benchmark_record_file_size = Math.max(size, minimum_benchmark_file_size);
}

/**
 * Set max records
 */
export const set_max_records = (records: number) => {
    benchmark_max_records = Math.max(records, minimum_benchmark_records);
}

/**
 * Get max record file size
 */
export const get_max_record_file_size = () => benchmark_record_file_size;

/**
 * Get max record file records
 */
export const get_max_records = () => benchmark_max_records;

/**
 * Get prettify
 */
export const get_prettify = () => prettify;
/**
 * Set prettify
 */
export const set_prettify = (value: boolean) => {
    if (!is_boolean(value)) {
        return;
    }
    prettify = value;
}

/**
 * Round number
 */
export const round = (number: number, precision?: number): number => {
    precision = precision || 2;
    let factor = Math.pow(10, precision);
    return Math.round(number * factor) / factor;
}

export const round_time = (number: number, precision: number = 3) => {
    number = is_numeric(number) ? number : 0;
    number = parseFloat(number.toString());
    if (number <= 0) {
        return '0 ms';
    }
    const units = ['ms', 's', 'm', 'h', 'd', 'w', 'mo', 'y', 'dec'];
    const factors = [1000, 60, 60, 24, 7, 30, 365, 10];
    let i = 0;
    while (number > factors[i] && i < factors.length) {
        number /= factors[i];
        i++;
    }
    return round(number, precision) + ' ' + units[i];
}

/**
 * Get icon
 */
export const icon = (name: string): string => {
    let icons = iconShapes[name];
    if (!icons) {
        return '';
    }
    icons = is_string(icons) ? [icons] : icons;
    let str = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="20" height="20">';
    for (let ic of icons) {
        str += `<path stroke-linecap="round" stroke-linejoin="round" d="${ic}"/>`;
    }
    str += '</svg>';
    return str;
}

/**
 * Format size
 */
export const size_format = (size: number, precision?: number): string => {
    precision = precision || 2;
    let i = 0;
    let units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    while (size > 1024) {
        size /= 1024;
        i++;
    }
    return round(size, precision) + ' ' + units[i];
}

/**
 * Set attribute to element
 */
export const set_attribute = (element: Element, attributes: {
    [p: string]: any
}) => {
    if (!is_element(element) || !is_object(attributes)) {
        return;
    }
    for (let key in attributes) {
        let value = attributes[key];
        const is_html_key = ['html', 'innerhtml', 'content'].includes(key.toLowerCase());
        const is_text_key = ['text', 'innertext', 'textcontent'].includes(key.toLowerCase());
        if (value === undefined || value === false || value === null) {
            if (is_html_key || is_text_key) {
                element.innerHTML = '';
                continue;
            }
            element.removeAttribute(key)
            continue;
        }
        if (key === 'event' || key === 'events') {
            if (!is_object(value)) {
                continue;
            }
            for (let i in value) {
                let callback = value[i];
                if (typeof callback === 'function') {
                    element.addEventListener(i, callback);
                    continue;
                }
                if (!callback || typeof callback !== 'object') {
                    continue;
                }
                const name = callback['name'] || callback['event'] || callback['eventName'] || callback['event_name'];
                let opt = callback['option'] || callback['options'] || callback['opt'] || {};
                callback = callback['callback'] || callback['function'] || callback['func'] || callback['fn'];
                if (!name || !is_string(name) || !is_function(callback)) {
                    continue;
                }
                opt = !is_object(opt) ? opt : opt;
                element.addEventListener(name, callback, opt);
            }
            continue;
        }
        if (key === 'style') {
            if (is_string(value)) {
                element.setAttribute('style', value);
                continue;
            }
            if (!is_object(value)) {
                continue;
            }
            if (is_html_element(element)) {
                for (let prop in value) {
                    element.style.setProperty(prop, value[prop]);
                }
            } else {
                let val = [];
                for (let prop in value) {
                    val.push(`${prop}:${value[prop]}`);
                }
                element.setAttribute('style', val.join(';'));
            }
            continue;
        }
        value = typeof value === 'boolean' ? (value ? '1' : '') : (
            typeof value === 'number' ? value.toString() : value
        );
        if (is_html_key) {
            if (Array.isArray(value)) {
                element.innerHTML = '';
                for (let el of value) {
                    if (is_element(el)) {
                        element.appendChild(el);
                    } else if (is_string(el)) {
                        element.innerHTML += el;
                    }
                }
                continue;
            }
            if (is_element(value)) {
                element.replaceChildren(value);
                continue;
            }
            element.innerHTML = value;
            continue;
        }
        if (is_text_key) {
            element.textContent = is_element(value) ? value.textContent : value;
            continue;
        }
        if (key === 'value' && (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
            element.value = value;
            continue;
        }
        try {
            element.setAttribute(key, value);
        } catch (err) {
            console.error(err);
        }
    }
}

/**
 * Create an element
 */
export const create_element = <K extends keyof HTMLElementTagNameMap, B extends string>(tagName: K | B, attributes?: {
    [p: string]: any
}): HTMLElementTagNameMap[K] | HTMLElement => {
    let el = document.createElement(tagName);
    set_attribute(el, attributes);
    return el;
}

/**
 * Select elements
 */
export const select_elements = <K extends keyof HTMLElementTagNameMap, B extends string>(name: K | B, parentElement?: Element): NodeListOf<HTMLElementTagNameMap[K] | HTMLElement> => {
    if (parentElement === null) {
        return document.createDocumentFragment().childNodes as NodeListOf<HTMLElementTagNameMap[K] | HTMLElement>;
    }
    try {
        return (parentElement || document).querySelectorAll(name);
    } catch (e) {
        return document.createDocumentFragment().childNodes as NodeListOf<HTMLElementTagNameMap[K] | HTMLElement>;
    }
}

/**
 * Select element
 */
export const select_element = <K extends keyof HTMLElementTagNameMap, B extends string>(name: K | B, parentElement?: Element): HTMLElementTagNameMap[K] | HTMLElement | null => {
    if (parentElement === null) {
        return null;
    }
    try {
        return (parentElement || document).querySelector(name);
    } catch (e) {
        return null;
    }
}

/**
 * Generate a JSON file name
 */
export const get_json_filename = (jsonObject: JsonProfiler) => {
    let date = new Date();
    date.setTime(jsonObject.generated * 1000);
    return `profiler-${date.getFullYear()}${date.getMonth() + 1}${date.getDate()}${date.getHours()}${date.getMinutes()}${date.getSeconds()}.json`;
}

/**
 * Download json data
 */
export const download_json = (json: any, filename?: string) => {
    filename = filename || get_json_filename(json);
    let url = URL.createObjectURL(new Blob([
        JSON.stringify(json, null, 2)
    ], {type: 'application/json'}));
    let a = create_element('a', {
        href: url,
        download: filename
    });
    const action = () => {
        a.remove();
        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 100);
    }
    a.onclick = action;
    a.oncancel = action;
    a.click();
}

/**
 * Check if the parameter is a string
 */
export const is_string = (str: any): str is string => {
    return typeof str === 'string';
}
export const is_function = (func: any): func is Function => {
    return typeof func === 'function';
}
/**
 * Check if the parameter is an object
 */
export const is_object = (obj: any): boolean => {
    return obj && typeof obj === 'object' && !Array.isArray(obj);
}

/**
 * Check if the parameter is a number
 */
export const is_number = (num: any): num is number => {
    return typeof num === 'number';
}

/**
 * Check if the parameter is numeric
 */
export const is_numeric = (num: any): boolean => {
    return is_number(num) || typeof num === 'string' && /^[0-9]+(\.[0-9]+)?$/.test(num);
}

/**
 * Check if the parameter is an integer number (even string)
 */
export const is_numeric_integer = (num: any): boolean => {
    return is_numeric(num) && Number.isInteger(parseFloat(num));
}

/**
 * Check if the parameter is an integer
 */
export const is_integer = (num: any): num is number => {
    return is_number(num) && Number.isInteger(num);
}

/**
 * Check if the parameter is an array
 */
export const is_array = (arr: any): arr is Array<any> => {
    return Array.isArray(arr);
}

/**
 * Check if the parameter is boolean
 */
export const is_boolean = (bool: any): bool is boolean => {
    return typeof bool === 'boolean';
}

/**
 * Count parameter
 */
export const count = (value: any) => {
    if (is_object(value)) {
        value = Object.keys(value);
    }
    if (is_string(value) || Array.isArray(value)) {
        return value.length;
    }
    return 0;
}

/**
 * Check if the parameter is a HTMLElement
 */
export const is_html_element = (element: any): element is HTMLElement => {
    return element instanceof HTMLElement;
}

/**
 * Check if the parameter is an Element
 */
export const is_element = (element: any): element is Element => {
    return element instanceof Element;
}

/**
 * Filter json profiler data
 */
export const filter_profiler = (param: JsonProfiler | string | Element): JsonProfiler => {
    if (is_element(param)) {
        param = param.textContent;
    }
    const max_size = get_max_record_file_size();
    const max_records = get_max_records();
    if (is_string(param)) {
        let size = count(param);
        if (size > max_size) {
            throw new Error(
                `Only allow ${size_format(max_size)} bytes, ${size_format(size)} found`
            );
        }
        param = param.trim();
        try {
            param = JSON.parse(param);
        } catch (e) {
            throw new Error('Invalid json data');
        }
    }
    if (!is_object(param)) {
        throw new Error('Invalid json data');
    }
    let json: JsonProfiler = param as JsonProfiler;

    param = null; // freed

    let profiler = json.profiler;
    let records = json.records;
    let aggregators = json.aggregators;
    let groups = json.groups;
    let system_wide = json.system_wide;
    if (!is_object(profiler)
        || !is_object(records)
        || !is_object(aggregators)
        || !is_object(groups)
        || !is_object(system_wide)
        || !is_integer(json.generated)
    ) {
        throw new Error('Invalid profiler data');
    }
    if (count(records) > max_records) {
        throw new Error(
            `Only allow ${max_records} records, ${Object.keys(records).length} records found`
        );
    }

    // checking group
    for (let key in groups) {
        if (!is_string(groups[key]) || !is_numeric(key)) {
            throw new Error('Group contains invalid data');
        }
    }

    // checking system_wide
    if (!is_numeric(system_wide.start_time)
        || !is_numeric(system_wide.end_time)
        || !is_numeric(system_wide.end_memory)
        || !is_numeric(system_wide.duration)
        || !is_integer(system_wide.real_end_memory)
        || !is_integer(system_wide.peak_memory)
        || !is_integer(system_wide.real_peak_memory)
        || !is_integer(system_wide.memory_limit)
    ) {
        throw new Error('Invalid system_wide data');
    }
    let profile_timing = json.profiler.timing;
    let profile_memory = json.profiler.memory;
    if (!is_number(profiler.severity) || !is_object(profile_timing) || !is_object(profile_memory)) {
        throw new Error('Invalid profiler data');
    }
    if (!is_numeric(profile_timing.start_time)
        || !is_numeric(profile_timing.end_time)
        || !is_numeric(profile_timing.duration)
    ) {
        throw new Error('Invalid profiler timing data');
    }
    if (!is_integer(profile_memory.start_memory)
        || !is_integer(profile_memory.end_memory)
        || !is_integer(profile_memory.used_memory)
        || !is_integer(profile_memory.real_start_memory)
        || !is_integer(profile_memory.real_end_memory)
        || !is_integer(profile_memory.real_used_memory)
    ) {
        throw new Error('Invalid profiler memory data');
    }
    // checking aggregators
    for (let key in aggregators) {
        if (!is_numeric(key)) {
            throw new Error('Invalid aggregator key');
        }
        let aggregator = aggregators[key];
        if (!is_object(aggregator)
            || !is_string(aggregator.name)
            || !is_array(aggregator.records)
            || !is_number(aggregator.total_execution)
            || !is_number(aggregator.total_duration)
            || !is_number(aggregator.minimum_duration)
            || !is_number(aggregator.maximum_duration)
            || !is_number(aggregator.average_duration)
        ) {
            throw new Error('Invalid aggregator data');
        }
        for (let i = 0; i < aggregator.records.length; i++) {
            let record = aggregator.records[i];
            if (!is_numeric(record) || !records.hasOwnProperty(record)) {
                throw new Error('Aggregator contain invalid record: ' + record);
            }
        }
        aggregators[key] = {
            name: aggregator.name,
            total_execution: aggregator.total_execution,
            total_duration: aggregator.total_duration,
            minimum_duration: aggregator.minimum_duration,
            maximum_duration: aggregator.maximum_duration,
            average_duration: aggregator.average_duration,
            records: aggregator.records
        }
    }

    let grouped: {
        [key: number | string]: string
    } = {};
    // checking records
    for (let key in records) {
        if (!is_numeric(key)) {
            throw new Error('Invalid record key');
        }
        let record = json.records[key];
        if (!is_object(record)
            || !is_number(record.group)
            || !is_string(record.name)
            || !is_number(record.id)
            || !is_number(record.severity)
            || !is_boolean(record.stopped)
            || !is_object(record.timing)
            || !is_object(record.memory)
        ) {
            throw new Error('Invalid record data');
        }
        let timing = record.timing;
        let memory = record.memory;
        if (!is_number(timing.start_time)
            || !is_number(timing.end_time)
            || !is_number(timing.duration)
            || !is_number(timing.percentage)
        ) {
            throw new Error('Invalid record timing data');
        }
        if (!is_integer(memory.start_memory)
            || !is_integer(memory.end_memory)
            || !is_integer(memory.used_memory)
            || !is_integer(memory.real_start_memory)
            || !is_integer(memory.real_end_memory)
            || !is_integer(memory.real_used_memory)
        ) {
            throw new Error('Invalid record memory data');
        }
        if (!groups.hasOwnProperty(record.group)) {
            throw new Error('Record contains invalid group');
        }
        if (!is_object(record.formatted_data)) {
            record.formatted_data = {};
        }
        grouped[record.group] = groups[record.group];
        records[key] = {
            group: record.group,
            id: record.id,
            name: record.name,
            severity: record.severity,
            stopped: record.stopped,
            left: record.left,
            timing: {
                start_time: timing.start_time,
                end_time: timing.end_time,
                duration: timing.duration,
                percentage: timing.percentage
            },
            memory: {
                start_memory: memory.start_memory,
                end_memory: memory.end_memory,
                used_memory: memory.used_memory,
                real_start_memory: memory.real_start_memory,
                real_end_memory: memory.real_end_memory,
                real_used_memory: memory.real_used_memory
            },
            formatted_data: record.formatted_data
        }
    }
    // remove invalid groups
    for (let key in groups) {
        if (!grouped.hasOwnProperty(key)) {
            delete groups[key];
        }
    }
    const sorts = (json: {
        [key: number | string]: RecordProfiler
    }): {
        [key: number | string]: RecordProfiler
    } => {
        let records: Array<{
            0: number,
            1: RecordProfiler
        }> = [];
        // sort record by time
        for (let key in json) {
            if (!is_numeric(key)) {
                continue;
            }
            records.push([key as unknown as number, json[key]]);
        }
        records = records.sort((a, b) => {
            return a[1].timing.start_time - b[1].timing.start_time;
        });

        let newJson: {
            [key: number | string]: RecordProfiler
        } = {};
        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            const key = records[i][0];
            newJson[key] = record[1];
        }
        return newJson;
    }
    records = sorts(records);
    return {
        generated: json.generated,
        profiler: {
            severity: profiler.severity,
            timing: profile_timing,
            memory: profile_memory
        },
        records: records,
        aggregators: aggregators,
        groups: groups,
        system_wide: {
            start_time: system_wide.start_time,
            end_time: system_wide.end_time,
            end_memory: system_wide.end_memory,
            duration: system_wide.duration,
            real_end_memory: system_wide.real_end_memory,
            peak_memory: system_wide.peak_memory,
            real_peak_memory: system_wide.real_peak_memory,
            memory_limit: system_wide.memory_limit,
        }
    };
}

/**
 * Check if two data are equal
 */
export const is_equal = (a: any, b: any): boolean => {
    if (a === b) {
        return true;
    }
    if (a && b && typeof a === 'object' && typeof b === 'object') {
        if (count(a) !== count(b)) {
            return false;
        }
        for (let key in a) {
            if (!b.hasOwnProperty(key) || !is_equal(a[key], b[key])) {
                return false;
            }
        }
        return true;
    }
    return false;
}

export const dispatch_event = (name: string, detail: any) => {
    document.dispatchEvent(new CustomEvent(name, {
        detail: detail
    }));
}

export default {
    max_benchmark_records,
    max_benchmark_file_size,
    minimum_benchmark_records,
    minimum_benchmark_file_size,
    set_max_record_file_size,
    set_max_records,
    get_max_record_file_size,
    get_max_records,
    get_prettify,
    set_prettify,
    round,
    round_time,
    icon,
    size_format,
    set_attribute,
    create_element,
    select_elements,
    select_element,
    get_json_filename,
    download_json,
    is_string,
    is_function,
    is_object,
    is_number,
    is_numeric,
    is_numeric_integer,
    is_integer,
    is_array,
    is_boolean,
    count,
    is_html_element,
    is_element,
    filter_profiler,
    is_equal,
    dispatch_event
}
