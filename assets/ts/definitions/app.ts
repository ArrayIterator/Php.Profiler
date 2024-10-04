import {
    create_element,
    dispatch_event,
    filter_profiler, icon,
    is_equal, is_function,
    is_html_element,
    is_string, select_element, select_elements, set_attribute,
    set_prettify
} from "./functions";
import Config, {
    action_list,
    color_mode_list,
    config_action_mode,
    config_color_mode,
    default_benchmark_width,
    tab_list
} from "./config";
import {ActionTypes, AppInterface, ColorModeTypes, JsonProfiler, TabListTypes} from "../types/types";
import AbstractDispatcher from "../dispatcher/AbstractDispatcher";
import BenchmarkDispatcher from "../dispatcher/BenchmarkDispatcher";
import JsonDispatcher from "../dispatcher/JsonDispatcher";
import {load} from "./squirrel";
import toolbarTemplate from "../templates/toolbar.sqrl";
import preferenceTemplate from "../templates/preference.sqrl";

let profiler: JsonProfiler = null;
let original_profiler: JsonProfiler = null;
let color_mode: ColorModeTypes = null;
let action: ActionTypes = Config.get(config_action_mode) === 'opened' ? 'opened' : 'closed';
let tab: TabListTypes = 'benchmark';
let previous_tab: TabListTypes = tab;
let timeout_message: any = null;
let initial_tab = true;

// set prettify
set_prettify(Config.get('prettify') !== false);

class App implements AppInterface {
    /**
     * Waterfall element
     * @private
     */
    readonly #waterfall: HTMLElement;

    /**
     * Dispatchers
     *
     * @private
     */
    #dispatchers: Map<string, AbstractDispatcher> = new Map();

    /**
     * Locked dispatchers
     *
     * @private
     */
    #locked_dispatchers: Set<string> = new Set();
    #valid: boolean = false;
    #initialized: boolean = false;
    #allow_locked_change: boolean = false;

    constructor() {
        /**
         * Waterfall element
         */
        this.#waterfall = create_element('waterfall', {
            'data-color-mode': 'light',
            'data-tab-mode': tab,
            'data-action-mode': action,
            'style': default_benchmark_width
        });

        this.add_dispatcher = this.add_dispatcher.bind(this);
        this.remove_dispatcher = this.remove_dispatcher.bind(this);
        this.has_dispatcher = this.has_dispatcher.bind(this);
        this.set_profiler = this.set_profiler.bind(this);
        this.reset_profiler = this.reset_profiler.bind(this);
        this.get_original_profiler = this.get_original_profiler.bind(this);
        this.set_color = this.set_color.bind(this);
        this.set_action = this.set_action.bind(this);
        this.set_tab = this.set_tab.bind(this);
        this.get_tab = this.get_tab.bind(this);
        this.set_message_info = this.set_message_info.bind(this);
        this.dispatch = this.dispatch.bind(this);
        this.import_json = this.import_json.bind(this);
        this.import_json_file = this.import_json_file.bind(this);
        this.sort_tabs = this.sort_tabs.bind(this);
        this.reset_slider_bottom = this.reset_slider_bottom.bind(this);

        ['complete', 'interactive'].includes(document.readyState) ? this.init() : window.addEventListener('DOMContentLoaded', () => this.init());
    }

    get valid(): boolean {
        return this.#valid;
    }

    get initialized(): boolean {
        return this.#initialized;
    }

    get abstractDispatcher(): typeof AbstractDispatcher {
        return AbstractDispatcher;
    }

    private init() {
        /* ---------------------------------------------------------------------
         * PREPARE
         */

        if (this.initialized) {
            return;
        }
        this.#initialized = true;
        // check if waterfall tag exists
        if (select_element('waterfall')) {
            return; // no duplicate
        }
        // get json element script
        const json_element = select_element('script[type="application/json"][data-script="waterfall-profiler"]');
        if (!json_element) {
            return;
        }

        // get hash
        let hash = json_element.getAttribute('data-hash');
        try {
            // set json - will throw if not valid
            this.profiler = json_element;
        } catch (err) {
            this.waterfall.remove(); // remove element
            console.error(err); // show the error
            return;
        }
        this.#valid = true;
        // remove the json element to reduce dom
        json_element.remove();
        // if hash exists remove all scripts with the same hash
        if (hash) {
            // remove previous waterfall
            select_elements(`script[data-script="waterfall-profiler"][data-hash="${hash}"]`).forEach((element) => {
                element.remove();
            });
        }

        // Check the color mode
        let colorMode = json_element.getAttribute('data-color-mode') as ColorModeTypes;
        if (!color_mode_list.includes(colorMode)) {
            colorMode = Config.get(config_color_mode) as ColorModeTypes;
            colorMode = color_mode_list.includes(colorMode) ? colorMode : null;
            if (!colorMode && Config.has('color-mode')) {
                Config.remove('color-mode');
            }
        }
        let hasChangeMode = !!colorMode;
        if (!hasChangeMode && is_function(window.matchMedia)) {
            // detect by match media
            window.matchMedia('(prefers-color-scheme: dark)')
                ?.addEventListener('change', (event: MediaQueryListEvent) => {
                    if (!hasChangeMode) {
                        this.color_mode = (event.matches ? "dark" : "light");
                    }
                });
        }

        // init check if dark mode via match media
        if (!colorMode && is_function(window.matchMedia) && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            colorMode = "dark";
        }

        // SETUP COLOR MODE BEFORE RENDER
        this.color_mode = (colorMode);
        // insert into body
        // append content to waterfall element : toolbar + preference
        for (let html of [
            load(toolbarTemplate, {json: this.profiler}),
            load(preferenceTemplate, {json: this.profiler}),
        ]) {
            this.waterfall.innerHTML += html;
        }

        this.#locked_dispatchers.add('benchmark');
        this.#locked_dispatchers.add('json');
        // unlock for adding
        this.#allow_locked_change = true;
        // factory
        this.add_dispatcher('benchmark', new BenchmarkDispatcher());
        this.add_dispatcher('json', new JsonDispatcher());

        /* ---------------------------------------------------------------------
         * TABS
         */
        /* --- TAB MODE --- */
        this.use_elements('waterfall-action-tab[data-tab]').forEach((el: HTMLElement) => {
            const target = el.getAttribute('data-tab');
            // remove tab action if no existing tab or data tab target
            if (!target || !this.use_element(`waterfall-tab[data-tab="${target}"]`)) {
                this.remove_dispatcher(target);
                return;
            }
            el.addEventListener('click', (e: Event) => {
                e.preventDefault();
                if (this.set_tab(el) && this.action === 'closed') {
                    this.action = 'opened';
                }
            });
        });
        this.#allow_locked_change = false;
        (document.body || document.documentElement).appendChild(this.waterfall);
    }

    has_dispatcher(name: string) {
        return is_string(name) && this.#dispatchers.has(name);
    }

    add_dispatcher(name: string, dispatcher: AbstractDispatcher) {
        if (!is_string(name)) {
            throw new Error('Name must be a string');
        }

        if (this.#locked_dispatchers.has(name) && !this.#allow_locked_change) {
            throw new Error('Dispatcher is locked');
        }

        // Add tab
        if (!(dispatcher instanceof AbstractDispatcher)) {
            throw new Error('Dispatcher must be an instance of AbstractDispatcher');
        }
        if (this.#dispatchers.has(name)) {
            throw new Error('Dispatcher already exists');
        }
        this.#dispatchers.set(name, dispatcher);
        let section = this.use_element('waterfall-action-tabs');
        let content = this.use_element('waterfall-content');
        if (!section || !content) {
            return;
        }
        let tab = select_element(`waterfall-action-tab[data-tab="${name}"]`, section);
        let tabContent = this.use_element(`waterfall-content waterfall-tab[data-tab="${name}"]`);
        if (!tab) {
            let _icon = dispatcher.icon()?.outerHTML || icon('cog');
            let element = create_element('waterfall-action-tab', {
                'data-tab': name,
                title: dispatcher.name(),
                html: `               
                    <waterfall-name>Benchmark</waterfall-name>
                    <waterfall-icon>${_icon}</waterfall-icon>
                `
            });
            section.append(element);
        }
        if (!tabContent) {
            let element = create_element('waterfall-tab', {
                'data-tab': name
            });
            content.append(element);
        }
    }

    remove_dispatcher(name: string) {
        if (!this.#allow_locked_change) {
            if (this.#locked_dispatchers.has(name) || !this.has_dispatcher(name)) {
                return;
            }
        }

        this.#dispatchers.delete(name);
        let section = this.use_element('waterfall-action-tabs');
        let tab = select_element(`waterfall-action-tab[data-tab="${name}"]`, section);
        let tabContent = this.use_element(`waterfall-content waterfall-tab[data-tab="${name}"]`);
        tab?.remove();
        tabContent?.remove();
    }

    /**
     * Get the waterfall element
     */
    get waterfall(): HTMLElement {
        return this.#waterfall;
    }

    /**
     * Get the current profiler
     */
    get profiler(): JsonProfiler {
        return !profiler ? undefined : Object.assign({}, profiler); // clone
    }

    set profiler(json: JsonProfiler | string | Element) {
        this.set_profiler(json);
    }

    /**
     * Set the current profiler
     */
    set_profiler(json: JsonProfiler | string | Element) {
        if (!json) {
            return;
        }
        json = filter_profiler(json);
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
    reset_profiler() {
        if (!original_profiler) {
            return;
        }
        profiler = original_profiler;
        original_profiler = null;
        dispatch_event('waterfall:reset', {
            profiler: this.profiler
        })
    }

    /**
     * Get the original profiler
     */
    get_original_profiler() {
        return original_profiler ? Object.assign({}, original_profiler) : null;
    }

    get original_profiler() {
        return this.get_original_profiler();
    }

    /**
     * Get color mode
     */
    get_color_mode(): ColorModeTypes {
        return color_mode;
    }

    get color_mode() {
        return color_mode;
    }

    /**
     * Set color mode
     */
    set_color(mode: ColorModeTypes, save: boolean = false) {
        if (color_mode_list.includes(mode)) {
            color_mode = mode;
            this.waterfall.setAttribute('data-color-mode', mode);
            if (save) {
                Config.set('color-mode', mode);
            }
        }
    }

    set color_mode(mode: ColorModeTypes) {
        this.set_color(mode);
    }

    /**
     * Get action mode
     */
    get_action(): ActionTypes {
        return action;
    }

    get action(): ActionTypes {
        return action;
    }

    /**
     * Set action mode
     */
    set_action(mode: ActionTypes): void {
        if (action_list.includes(mode)) {
            mode = mode === 'minimize' ? 'opened' : mode;
            action = mode;
            this.waterfall.setAttribute('data-action-mode', mode);
            Config.set(config_action_mode, mode);
            if (['maximize', 'closed'].includes(mode)) {
                this.waterfall.style.removeProperty('height');
            }
        }
    }

    set action(mode: ActionTypes) {
        this.set_action(mode);
    }

    /**
     * Get tab mode
     */
    get_tab(): TabListTypes {
        return tab;
    }

    get tab(): TabListTypes {
        return tab;
    }

    set_tab(mode: TabListTypes | HTMLElement): boolean {
        let found = false;
        let target: HTMLElement = null;
        if (is_html_element(mode)) {
            target = mode;
            mode = target.getAttribute('data-tab') as TabListTypes;
        }
        if (tab_list.includes(mode)) {
            let action_tab: HTMLElement = target || this.use_element(`waterfall-action-tab[data-tab="${mode}"]`);
            if (!action_tab || action_tab.getAttribute('data-tab') !== mode) {
                return false;
            }
            let active_tab: HTMLElement;
            let tabs = this.use_elements(`waterfall-tab[data-tab]`);
            tabs.forEach((el: HTMLElement) => {
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
                let actions = this.use_elements('waterfall-action-tab');
                actions.forEach((el) => {
                    if (action_tab === el) {
                        el.setAttribute('data-status', 'active');
                        return;
                    }
                    el.removeAttribute('data-status');
                });
                previous_tab = tab;
                tab = mode;
                this.waterfall.setAttribute('data-tab-mode', mode);
                this.reset_slider_bottom(action_tab);
                if (tab !== previous_tab || initial_tab) {
                    initial_tab = false;
                    this.dispatch({
                        profiler,
                        action_tab: action_tab,
                        active_tab: active_tab,
                        tabs: tabs as NodeListOf<HTMLElement>,
                        actions: actions as NodeListOf<HTMLElement>,
                    })
                }
            }
        }
        return found;
    }

    set tab(mode: TabListTypes) {
        this.set_tab(mode);
    }

    /**
     * Get previous tab mode
     */
    get_previous_tab(): TabListTypes {
        return previous_tab;
    }

    get previous_tab(): TabListTypes {
        return previous_tab;
    }

    reset_slider_bottom($action_tab?: HTMLElement): void {
        $action_tab = $action_tab || this.use_element(`waterfall-action-tab[data-tab="${tab}"]`);
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
        set_attribute(this.waterfall, {
            style: {
                '--data-waterfall-slider-left': `${realLeft}px`,
                '--data-waterfall-slider-width': `${width}px`
            }
        });
    }

    set_message_info(msg: string = null, type: string = 'info', remove: boolean = true): void {
        const messages = this.use_elements('waterfall-message');
        if (timeout_message) {
            clearTimeout(timeout_message);
            timeout_message = null;
        }
        if (!messages) {
            return;
        }
        if (!is_string(msg) || msg.trim() === '') {
            messages.forEach((message: HTMLElement) => {
                set_attribute(message, {
                    'data-color-type': null,
                    'text': null
                });
            });
            return;
        }
        messages.forEach((message: HTMLElement) => {
            set_attribute(message, {
                'data-color-type': type || 'info',
                'text': msg
            });
        });
        if (remove) {
            timeout_message = setTimeout(this.set_message_info.bind(this), 3000);
        }
    }

    /**
     * Dispatch the action
     */
    dispatch(
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
    ) {
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
        this.import_json(profiler, active_tab);
    }

    /**
     * Import json
     */

    import_json(json?: JsonProfiler, tab_element?: HTMLElement) {
        tab_element = tab_element || this.use_element('waterfall-content waterfall-tab[data-tab="' + this.tab + '"]');
        if (!is_html_element(tab_element)) {
            return;
        }
        const tab = tab_element.getAttribute('data-tab');
        if (!is_string(tab)) {
            return;
        }
        let tabDispatcher = this.#dispatchers.get(tab);
        if (!tabDispatcher) {
            return;
        }
        json = json || this.profiler;
        this.set_profiler(json);
        tabDispatcher.dispatch({
            profiler: json,
            tab_element,
            app: this
        });
        dispatch_event('waterfall:imported', {profiler: json, tab_element});
    }

    import_json_file(file: File) {
        let reader = new FileReader();
        reader.onload = (event) => {
            try {
                this.import_json(filter_profiler(event.target.result as string));
                this.set_message_info('Imported successfully', 'success');
            } catch (err) {
                this.set_message_info(err.message);
            }
        };
        reader.onerror = () => {
            this.set_message_info('Error reading file');
        }
        reader.readAsText(file);
    }

    /**
     * Get selector element
     */
    use_element(selector: string) {
        return select_element(selector, this.waterfall);
    }

    /**
     * Get selector elements
     */
    use_elements(selectors: string): NodeListOf<Element> {
        return select_elements(selectors, this.waterfall) as unknown as NodeListOf<Element>;
    }

    /**
     * Sort tabs
     */
    sort_tabs(tabs: Array<TabListTypes>) {
        // filter
        tabs = tabs.filter((tab) => tab_list.includes(tab));
        if (tabs.length === 0) {
            return;
        }
        const tabs_element = this.use_element('waterfall-action-tabs') as HTMLElement;
        if (!tabs_element) {
            return
        }
        let tabElements = [];
        for (let tab of tabs) {
            let el = this.use_element(`waterfall-action-tab[data-tab="${tab}"]`);
            if (el) {
                tabElements.push(el);
            }
        }
        for (let tab of tab_list) {
            if (!tabs.includes(tab)) {
                let el = this.use_element(`waterfall-action-tab[data-tab="${tab}"]`);
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
}

Object.freeze(App);

export default new App();

