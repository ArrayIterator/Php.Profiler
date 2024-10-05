import * as Squirrel from 'squirrelly';
import {
    count,
    get_max_record_file_size,
    get_max_records,
    icon, max_benchmark_file_size,
    max_benchmark_records,
    round,
    round_time,
    size_format
} from "./functions";
import {JsonProfiler} from "../types/types";
import {Config, config_color_mode, config_enable_labs} from "./config";

Squirrel.filters.define('round', round);
Squirrel.filters.define('humanTime', round_time);
Squirrel.filters.define('icon', icon);
Squirrel.filters.define('sizeFormat', size_format);
Squirrel.filters.define('json_encode', JSON.stringify);
Squirrel.filters.define('json_decode', JSON.parse);
Squirrel.filters.define('length', count);

/**
 * Load a template
 */
export const load = (template: string, data: {
    json: JsonProfiler;
    [p: string | number]: any;
}) => {
    data['maximum_benchmark_records'] = get_max_records();
    data['maximum_benchmark_size'] = get_max_record_file_size();
    data['default_maximum_benchmark_records'] = max_benchmark_records;
    data['default_maximum_benchmark_size'] = max_benchmark_file_size;
    data['enable_labs'] = Config.get(config_enable_labs) === true;
    data['color_mode'] = Config.get(config_color_mode);
    return Squirrel.render(template, data, {useWith: true});
}

export default Squirrel; // This is a named export
