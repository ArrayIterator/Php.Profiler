import {JsonProfiler} from "../types/types";
import jsonTemplate from "../templates/tabs/json.sqrl";
import useWaterfall from "./useWaterfall";
import {get_prettify, select_element, set_attribute} from "../definitions/functions";

export default ({
    profiler,
    tab_element
} : {
    profiler: JsonProfiler,
    tab_element: HTMLElement,
    pretty?: boolean
}) => {
    const {
        content
    } = useWaterfall({
        profiler,
        tab_element,
        expect: 'json',
        template: jsonTemplate
    });
    const pre = select_element('pre', content);
    const should_prettify = get_prettify() === true;
    pre?.replaceChildren(should_prettify ? JSON.stringify(profiler, null, 4) : JSON.stringify(profiler));
    set_attribute(select_element('[data-action="format"][data-command-action]', tab_element), {
        'data-command-action': should_prettify ? 'minify' : 'prettify',
        title: should_prettify ? 'Minify JSON' : 'Prettify JSON'
    })
}