import {JsonProfiler} from "../types/types";
import {is_html_element, round_time, select_element, size_format} from "../definitions/functions";
import {load} from "../definitions/squirrel";

export default ({
    profiler,
    tab_element,
    expect,
    template
} : {
    profiler: JsonProfiler,
    tab_element: HTMLElement,
    expect: string,
    template: string
}) : {
    content: HTMLElement,
    waterfall: HTMLElement
} => {
    if (!is_html_element(tab_element) || tab_element.getAttribute('data-tab') !== expect) {
        return {
            content: null,
            waterfall: null
        }
    }
    const waterfall = tab_element.closest('waterfall');
    if (!waterfall) {
        return {
            content: null,
            waterfall: null
        }
    }
    select_element('waterfall-item-duration waterfall-value', waterfall).replaceChildren(
        round_time(profiler.system_wide.duration)
    );
    select_element('waterfall-item-memory waterfall-value', waterfall).replaceChildren(
        size_format(profiler.system_wide.peak_memory)
    );
    tab_element.innerHTML = load(template, {json: profiler});
    return {
        content: select_element('waterfall-tab-content', tab_element),
        waterfall: waterfall as HTMLElement
    };
}