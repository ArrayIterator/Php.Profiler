import {config_action_mode, config_color_mode, config_tab_mode} from "../definitions/config";

export type TabListTypes = "benchmark"|"labs"|"json";
export type ActionTypes = "opened"|"closed"|"minimize"|"maximize";
export type ColorModeTypes = "dark"|"light";
export type ConfigParams = (typeof config_action_mode | typeof config_tab_mode | typeof config_color_mode | "prettify")| string;
export type SystemWideProfiler = {
    start_time: number;
    end_time: number;
    end_memory: number;
    duration: number;
    real_end_memory: number;
    peak_memory: number;
    real_peak_memory: number;
    memory_limit: number;
};

export type RecordProfiler = {
    group: number;
    id: number;
    name: string;
    stopped: boolean,
    severity: number;
    left: number;
    timing: {
        start_time: number;
        end_time: number;
        duration: number;
        percentage: number;
    };
    memory: {
        start_memory: number;
        end_memory: number;
        used_memory: number;
        real_start_memory: number;
        real_end_memory: number;
        real_used_memory: number;
    };
    formatted_data: {
        [p: string] : any
    }
};

export type AggregatorProfiler = {
    name: string;
    total_execution: number;
    total_duration: number;
    minimum_duration: number;
    maximum_duration: number;
    average_duration: number;
    records: Array<number>;
};

export type Profiler = {
    severity: number;
    timing: {
        start_time: number;
        end_time: number;
        duration: number;
    };
    memory: {
        start_memory: number;
        end_memory: number;
        used_memory: number;
        real_start_memory: number;
        real_end_memory: number;
        real_used_memory: number;
    };
};

export type JsonProfiler = {
    generated: number; // the unix timestamp when the data was generated
    system_wide: SystemWideProfiler;
    groups: {
        [key: number] : string;
    },
    aggregators: {
        [pkey: number]: AggregatorProfiler;
    },
    records: {
        [key: number]: RecordProfiler;
    },
    profiler: Profiler;
};

