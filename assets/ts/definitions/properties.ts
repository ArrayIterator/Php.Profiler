import {
    create_element,
    filter_profiler, get_max_record_file_size, get_max_records, is_equal,
    is_html_element,
    select_element,
    select_elements,
    set_attribute, set_prettify, size_format
} from "./functions";
import {ActionTypes, ColorModeTypes, JsonProfiler, TabListTypes} from "../types/types";
import Config, {action_list, color_mode_list, config_action_mode, default_benchmark_width, tab_list} from "./config";
import benchmarkDispatcher from "../dispatcher/benchmark";
import jsonDispatcher from "../dispatcher/json";

let profiler: JsonProfiler = null;
let original_profiler: JsonProfiler = null;
let color_mode: ColorModeTypes = null;
let action: ActionTypes = Config.get(config_action_mode) === 'opened' ? 'opened' : 'closed';
let tab: TabListTypes = 'benchmark';
let previous_tab: TabListTypes = tab;

// set prettify
set_prettify(Config.get('prettify') !== false);

/**
 * Waterfall element
 */
export const waterfall: HTMLElement = create_element('waterfall', {
    'data-color-mode': 'light',
    'data-tab-mode': tab,
    'data-action-mode': action,
    'style': default_benchmark_width
});

/**
 * Get the current profiler
 */
export const get_profiler = () => profiler;

/**
 * Set the current profiler
 */
export const set_profiler = (json: JsonProfiler) => {
    if (!json) {
        return;
    }
    if (!original_profiler && !is_equal(profiler, json)) {
        original_profiler = profiler || json;
    } else if (original_profiler && is_equal(original_profiler, json)) {
        original_profiler = null;
    }
    profiler = json;
}

/**
 * Reset the profiler to the original profiler
 */
export const reset_profiler = (): void => {
    if (!original_profiler) {
        return;
    }
    set_profiler(original_profiler);
};

/**
 * Get the original profiler
 */
export const get_original_profiler = () => original_profiler;

/**
 * Get color mode
 */
export const get_color = (): ColorModeTypes => color_mode;

/**
 * Set color mode
 */
export const set_color = (mode: ColorModeTypes, save: boolean = false) => {
    if (color_mode_list.includes(mode)) {
        color_mode = mode;
        waterfall.setAttribute('data-color-mode', mode);
        if (save) {
            Config.set('color-mode', mode);
        }
    }
}

/**
 * Get action mode
 */
export const get_action = (): ActionTypes => action;

/**
 * Set action mode
 */
export const set_action = (mode: ActionTypes) => {
    if (action_list.includes(mode)) {
        mode = mode === 'minimize' ? 'opened' : mode;
        action = mode;
        waterfall.setAttribute('data-action-mode', mode);
        Config.set(config_action_mode, mode);
        if (['maximize', 'closed'].includes(mode)) {
            waterfall.style.removeProperty('height');
        }
    }
}

/**
 * Get tab mode
 */
export const get_tab = (): TabListTypes => tab;

export const get_previous_tab = (): TabListTypes => previous_tab;

export const reset_slider_bottom = ($action_tab?: HTMLElement) => {
    $action_tab = $action_tab || element(`waterfall-action-tab[data-tab="${tab}"]`);
    if (!$action_tab) {
        return;
    }
    /**
     * Slider for tab menu animation
     */
    const parent = $action_tab.parentElement as HTMLElement;
    const rect = $action_tab.getBoundingClientRect();
    const parentRect = parent?.getBoundingClientRect();
    const parentLeft = parentRect?.left || 0;
    const width = rect?.width || 0;
    const offsetLeft = rect?.left || 0;
    const realLeft = offsetLeft - parentLeft;
    set_attribute(waterfall, {
        style: {
            '--data-waterfall-slider-left': `${realLeft}px`,
            '--data-waterfall-slider-width': `${width}px`
        }
    });
}

/**
 * Set tab mode
 */
let initial_tab = true;
export const set_tab = (mode: TabListTypes | HTMLElement) => {
    let found = false;
    let target: HTMLElement = null;
    if (is_html_element(mode)) {
        target = mode;
        mode = target.getAttribute('data-tab') as TabListTypes;
    }
    if (tab_list.includes(mode)) {
        let action_tab: HTMLElement = target || element(`waterfall-action-tab[data-tab="${mode}"]`);
        if (!action_tab || action_tab.getAttribute('data-tab') !== mode) {
            return false;
        }
        let active_tab: HTMLElement;
        let tabs = elements(`waterfall-tab[data-tab]`);
        tabs.forEach((el) => {
            const data_tab = el.getAttribute('data-tab');
            if (data_tab === mode) {
                found = true;
                active_tab = el;
                el.setAttribute('data-status', 'active');
                return;
            }
            el.removeAttribute('data-status');
        });
        if (found) {
            let actions = elements('waterfall-action-tab');
            actions.forEach((el) => {
                if (action_tab === el) {
                    el.setAttribute('data-status', 'active');
                    return;
                }
                el.removeAttribute('data-status');
            });
            previous_tab = tab;
            tab = mode;
            waterfall.setAttribute('data-tab-mode', mode);
            reset_slider_bottom(action_tab);
            if (tab !== previous_tab || initial_tab) {
                initial_tab = false;
                dispatch({
                    profiler,
                    action_tab: action_tab,
                    active_tab: active_tab,
                    tabs: tabs,
                    actions: actions,
                })
            }
        }
    }
    return found;
}

/**
 * Dispatch the action
 */
export const dispatch = (
    {
        profiler,
        action_tab,
        active_tab,
        tabs,
        actions
    }: {
        profiler: JsonProfiler,
        action_tab: HTMLElement,
        active_tab: HTMLElement,
        tabs?: NodeListOf<HTMLElement>,
        actions?: NodeListOf<HTMLElement>
    }
) => {
    const tab = action_tab.getAttribute('data-tab');
    if (!tab_list.includes(tab as TabListTypes)) {
        return;
    }
    tabs?.forEach((element) => {
        if (element !== action_tab) {
            element.innerHTML = '';
        }
    });
    actions?.forEach((element) => {
        if (element !== active_tab) {
            element.removeAttribute('data-status');
        }
    });
    import_json(profiler, active_tab);
}

/**
 * Import json
 */

export const import_json = (json?: JsonProfiler, tab_element?: HTMLElement) => {
    tab_element = tab_element || element('waterfall-content waterfall-tab[data-tab="'+get_tab()+'"]');
    if (!tab_element) {
        return;
    }
    const tab = tab_element.getAttribute('data-tab');
    if (!tab_list.includes(tab as TabListTypes)) {
        return;
    }
    json = json || get_profiler();
    set_profiler(json);

    switch (tab) {
        case 'benchmark':
            benchmarkDispatcher({profiler: json, tab_element});
            break;
        case 'json':
            jsonDispatcher({profiler: json, tab_element});
            break;
    }

    document.dispatchEvent(new CustomEvent('waterfall:import', {
        detail: {
            tab: tab,
            json: json
        }
    }));
}

/**
 * Get selector element
 */
export const element = (selector: string) => select_element(selector, waterfall);

/**
 * Get selector elements
 */
export const elements = (selectors: string) => select_elements(selectors, waterfall);

/**
 * Sort tabs
 */
export const sort_tabs = (tabs: Array<TabListTypes>) => {
    // filter
    tabs = tabs.filter((tab) => tab_list.includes(tab));
    if (tabs.length === 0) {
        return;
    }
    const tabs_element = element('waterfall-action-tabs') as HTMLElement;
    if (!tabs_element) {
        return
    }
    let tabElements = [];
    for (let tab of tabs) {
        let el = element(`waterfall-action-tab[data-tab="${tab}"]`);
        if (el) {
            tabElements.push(el);
        }
    }
    for (let tab of tab_list) {
        if (!tabs.includes(tab)) {
            let el = element(`waterfall-action-tab[data-tab="${tab}"]`);
            if (el) {
                tabElements.push(el);
            }
        }
    }
    if (tabElements.length === 0) {
        return;
    }
    tabs_element.replaceChildren(...tabElements);
}
