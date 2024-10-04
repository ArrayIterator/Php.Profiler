import * as Squirrel from 'squirrelly';
import {count, icon, round, round_time, size_format} from "./functions";
import {JsonProfiler} from "../types/types";

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
    return Squirrel.render(template, data, {useWith: true});
}

export default Squirrel; // This is a named export
