import {
    create_element,
    dispatch_event,
    download_json,
    filter_profiler,
    get_max_records,
    icon,
    is_element,
    is_equal,
    is_function,
    is_html_element,
    is_string,
    max_benchmark_records,
    select_element,
    select_elements,
    set_attribute,
    set_max_record_file_size,
    set_max_records,
    set_prettify,
    size_format
} from "./functions";
import Config, {
    action_list,
    color_mode_list,
    config_action_mode,
    config_color_mode,
    config_enable_labs,
    config_max_records,
    config_max_size,
    default_benchmark_width,
    is_mac
} from "./config";
import {ActionTypes, AppInterface, ColorModeTypes, JsonProfiler, TabListTypes} from "../types/types";
import AbstractDispatcher from "../dispatcher/AbstractDispatcher";
import BenchmarkDispatcher from "../dispatcher/BenchmarkDispatcher";
import JsonDispatcher from "../dispatcher/JsonDispatcher";
import {load} from "./squirrel";
import toolbarTemplate from "../templates/toolbar.sqrl";
import preferenceTemplate from "../templates/preference.sqrl";
import LabDispatcher from "../dispatcher/LabDispatcher";
import Preference from "./preference";

let profiler: JsonProfiler = null;
let original_profiler: JsonProfiler = null;
let color_mode: ColorModeTypes | "auto" = null;
let action: ActionTypes = Config.get(config_action_mode) === 'opened' ? 'opened' : 'closed';
let tab: TabListTypes = 'benchmark';
let previous_tab: TabListTypes = tab;
let timeout_message: any = null;
let initial_tab = true;
let resize_tab_timeout: any = null;

// set prettify
set_prettify(Config.get('prettify') !== false);

class App implements AppInterface {
    /**
     * Abstract dispatcher
     */
    readonly abstractDispatcher: typeof AbstractDispatcher = AbstractDispatcher;
    /**
     * Preference
     */
    readonly preference: Preference;
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
    /**
     * Valid
     * @private
     */
    #valid: boolean = false;

    /**
     * Is initialized
     * @private
     */
    #initialized: boolean = false;

    /**
     * Allow locked change
     *
     * @private
     */
    #allow_locked_change: boolean = false;

    /**
     * Has change mode
     * @private
     */
    #allow_change_color_mode: boolean = false;
    /**
     * Enable labs
     *
     * @private
     */
    #enable_labs: boolean = Config.get('enable_labs') === true;

    /**
     * Lab dispatcher
     *
     * @private
     */
    #lab_dispatcher: LabDispatcher = new LabDispatcher();

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

        this.preference = new Preference(this);
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
        // @ts-expect-error ignore
        if (!window.arrayiterator_waterfall) {
            Object.defineProperty(window, 'arrayiterator_waterfall', {
                value: this,
                writable: false,
                enumerable: false,
            });
            // no duplicate
            ['complete', 'interactive'].includes(document.readyState) ? this.init() : window.addEventListener('DOMContentLoaded', () => this.init());
        }
    }

    get valid(): boolean {
        return this.#valid;
    }

    get initialized(): boolean {
        return this.#initialized;
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

    get original_profiler() {
        return this.get_original_profiler();
    }

    get color_mode(): ColorModeTypes | "auto" {
        return color_mode || "auto";
    }

    set color_mode(mode: ColorModeTypes | "auto") {
        this.set_color(mode);
    }

    get action(): ActionTypes {
        return action;
    }

    set action(mode: ActionTypes) {
        this.set_action(mode);
    }

    get tab(): TabListTypes {
        return tab;
    }

    set tab(mode: TabListTypes) {
        this.set_tab(mode);
    }

    get previous_tab(): TabListTypes {
        return previous_tab;
    }

    get enable_labs(): boolean {
        return this.#enable_labs;
    }

    set enable_labs(enable: boolean) {
        this.set_enable_labs(enable);
    }

    has_dispatcher(name: string) {
        return is_string(name) && this.#dispatchers.has(name);
    }

    add_dispatcher(name: string, dispatcher: AbstractDispatcher) {
        if (!is_string(name)) {
            throw new Error('Name must be a string');
        }
        if (name === 'labs' && dispatcher !== this.#lab_dispatcher) {
            throw new Error('Cannot add labs dispatcher');
        }
        if (this.#locked_dispatchers.has(name) && !this.#allow_locked_change) {
            throw new Error('Dispatcher is locked');
        }
        // Add tab
        if (!(dispatcher instanceof AbstractDispatcher)) {
            throw new Error('Dispatcher must be an instance of AbstractDispatcher');
        }
        if (this.#dispatchers.has(name) && name !== 'labs') {
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
                    <waterfall-name>${dispatcher.name()}</waterfall-name>
                    <waterfall-icon>${_icon}</waterfall-icon>
                `
            });
            if (name === 'labs') {
                // get benchmark
                let json = this.use_element('waterfall-action-tab[data-tab="json"]');
                if (json) {
                    section.insertBefore(element, json);
                } else {
                    section.append(element);
                }
            } else {
                section.append(element);
            }
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
     * Set the current profiler
     */
    set_profiler(json: JsonProfiler | string | Element) {
        if (!json) {
            return;
        }

        try {
            json = filter_profiler(json);
        } catch (err) {
            if (err instanceof RangeError) {
                console.info(
                    `The profiler has reached the maximum number of records.\n` +
                    `You can change the maximum number of records by running: \n\n`
                );
                console.info(
                    `\x1b[32mwindow.arrayiterator_waterfall.set_max_records(${max_benchmark_records})\x1b[0m`
                );
            }
            throw err;
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
    reset_profiler() {
        if (!this.original_profiler) {
            return;
        }
        profiler = original_profiler;
        original_profiler = null;
        this.import_json();
        this.set_message_info('Restored successfully', 'success');
        dispatch_event('waterfall:reset', {
            profiler: this.profiler
        }, this.waterfall);
    }

    /**
     * Get the original profiler
     */
    get_original_profiler() {
        return original_profiler ? Object.assign({}, original_profiler) : null;
    }

    /**
     * Get color mode
     */
    get_color_mode(): ColorModeTypes | "auto" {
        return color_mode || "auto";
    }

    set_max_records(number: number): void {
        set_max_records(number);
        this.use_elements('waterfall-max-records')
            .forEach((el) => el.replaceChildren(get_max_records().toString()));
        Config.set(config_max_records, get_max_records());
    }

    set_max_size(size: number): void {
        set_max_record_file_size(size);
        this.use_elements('waterfall-max-size')
            .forEach((el) => el.replaceChildren(size_format(size)));
        Config.set(config_max_size, size);
    }

    /**
     * Set color mode
     */
    set_color(mode: ColorModeTypes | "auto", save: boolean = false) {
        if (color_mode_list.includes(mode as ColorModeTypes)) {
            color_mode = mode as ColorModeTypes;
            this.waterfall.setAttribute('data-color-mode', mode);
            if (save) {
                this.#allow_change_color_mode = true;
                Config.set(config_color_mode, mode);
            }
        } else if (mode === 'auto') {
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                this.waterfall.setAttribute('data-color-mode', 'dark');
            } else {
                this.waterfall.setAttribute('data-color-mode', 'light');
            }
            Config.remove(config_color_mode);
            this.#allow_change_color_mode = false;
        }
    }

    /**
     * Get action mode
     */
    get_action(): ActionTypes {
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

    /**
     * Get tab mode
     */
    get_tab(): TabListTypes {
        return tab;
    }

    set_tab(mode: TabListTypes | HTMLElement): boolean {
        let found = false;
        let target: HTMLElement = null;
        if (is_html_element(mode)) {
            target = mode;
            mode = target.getAttribute('data-tab') as TabListTypes;
        }
        if (this.has_dispatcher(mode)) {
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

    /**
     * Get previous tab mode
     */
    get_previous_tab(): TabListTypes {
        return previous_tab;
    }

    reset_slider_bottom($action_tab?: HTMLElement): void {
        $action_tab = $action_tab || this.use_element(`waterfall-action-tab[data-tab="${this.tab}"]`);
        if (!$action_tab) {
            return;
        }
        /**
         * Slider for tab menu animation
         */
        const parent = $action_tab.parentElement as HTMLElement;
        const rect = $action_tab.getBoundingClientRect();
        const parentRect = parent?.getBoundingClientRect();
        const parentLeft = (parentRect?.left || 0) + (parent?.parentElement?.scrollLeft || 0);
        const width = rect?.width || 0;
        const offsetLeft = (rect?.left || 0) + (parent?.parentElement?.scrollLeft || 0);
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

    set_enable_labs(enable: boolean) {
        this.#enable_labs = enable;
        Config.set(config_enable_labs, enable);
        if (enable) {
            this.add_dispatcher('labs', this.#lab_dispatcher);
            this.reset_slider_bottom();
        } else {
            this.remove_dispatcher('labs');
            let tab = this.tab;
            if (tab === 'labs') {
                tab = 'benchmark';
            }
            this.set_tab(tab);
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
        if (!this.has_dispatcher(tab)) {
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
        dispatch_event('waterfall:imported', {profiler: json, tab_element}, this.waterfall);
        this.use_elements('waterfall-action[data-action="restore"]').forEach((restore_action) => {
            set_attribute(restore_action, {
                'data-status': this.original_profiler ? 'active' : null
            })
        });
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
        tabs = tabs.filter((tab) => this.has_dispatcher(tab));
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
        for (let tab of this.#dispatchers.keys()) {
            let el = this.use_element(`waterfall-action-tab[data-tab="${tab}"]`);
            if (el) {
                tabElements.push(el);
            }
        }
        if (tabElements.length === 0) {
            return;
        }
        tabs_element.replaceChildren(...tabElements);
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
            if (!colorMode && Config.has(config_color_mode)) {
                Config.remove(config_color_mode);
            }
        }
        this.#allow_change_color_mode = colorMode !== null;
        if (is_function(window.matchMedia)) {
            // detect by match media
            window.matchMedia('(prefers-color-scheme: dark)')
                ?.addEventListener('change', (event: MediaQueryListEvent) => {
                    console.log(this.#allow_change_color_mode);
                    if (!this.#allow_change_color_mode) {
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
        this.add_dispatcher('labs', this.#lab_dispatcher);

        /* ---------------------------------------------------------------------
         * TABS
         */
        let biggestTabIndex = 1;
        select_elements('[tabindex]').forEach((element) => {
            let tabIndex = parseInt(element.getAttribute('tabindex'));
            if (tabIndex > biggestTabIndex) {
                biggestTabIndex = tabIndex;
            }
        });

        /* --- TAB MODE --- */
        this.use_elements('waterfall-action-tab[data-tab]').forEach((el: HTMLElement) => {
            const target = el.getAttribute('data-tab');
            // remove tab action if no existing tab or data tab target
            if (!target || !this.use_element(`waterfall-tab[data-tab="${target}"]`)) {
                this.remove_dispatcher(target);
                return;
            }
            el.setAttribute('tabindex', ((biggestTabIndex++) + 1).toString());
        });
        this.use_elements('waterfall-action, waterfall-color-mode').forEach((el: HTMLElement) => {
            el.setAttribute('tabindex', ((biggestTabIndex++) + 1).toString());
        });
        if (!this.#enable_labs) {
            this.remove_dispatcher('labs');
        }
        let content = this.use_element('waterfall-content');
        if (!select_element('waterfall-drag-import', content)) {
            content.append(create_element('waterfall-drag-import', {
                'text': 'Drop JSON file here to import'
            }));
        }
        // set title for preference
        this.use_elements('waterfall-action[data-target="waterfall-preference"]')
            ?.forEach((element: HTMLElement) => {
                const data_action = element.getAttribute('data-action');
                if (data_action === 'close') {
                    element.title = '(Esc) Close Preference';
                    return;
                }
                const ctrl = is_mac ? 'Cmd' : 'Ctrl';
                element.title = `(${ctrl} + Alt + S) Open Preference`;
            });
        this.#allow_locked_change = false;
        (document.body || document.documentElement).appendChild(this.waterfall);

        /* EVENTS */
        this.waterfall.addEventListener('click', (e: Event) => this.handleClick(e));
        this.waterfall.addEventListener('change', (e: Event) => this.handleChange(e));
        window.addEventListener('resize', (e: Event) => this.handleResize(e));
        document.addEventListener('keyup', (e: KeyboardEvent) => this.handleKeyup(e));
        document.addEventListener('keydown', (e: KeyboardEvent) => this.handleKeyDown(e));
        document.addEventListener('dragover', (e: DragEvent) => this.handleDrag(e));
        document.addEventListener('dragenter', (e: DragEvent) => this.handleDrag(e));
        document.addEventListener('dragleave', (e: DragEvent) => this.handleDrag(e));
        document.addEventListener('drop', (e: DragEvent) => this.handleDrag(e));
    }

    private handleDrag(e: DragEvent): void {
        const target = e.target;
        if (!is_html_element(target) || !this.waterfall.contains(target)) {
            return;
        }
        // check if drop
        if (e.type === 'drop') {
            e.preventDefault();
            if (!e.dataTransfer || !e.dataTransfer.files || !e.dataTransfer.files[0]) {
                this.waterfall.removeAttribute('data-drag');
                return;
            }
            this.waterfall.removeAttribute('data-drag');
            this.import_json_file(e.dataTransfer.files[0]);
            return;
        }
        let rect = this.waterfall.getBoundingClientRect();
        let clientXWaterfall = rect.left;
        let clientYWaterfall = rect.top;
        if (!is_html_element(target)
            || !this.waterfall.contains(target)
            || e.clientY === 0
            || e.clientX < clientXWaterfall
            || e.clientX > clientXWaterfall + this.waterfall.offsetWidth
            || e.clientY < clientYWaterfall
            || e.clientY > clientYWaterfall + this.waterfall.offsetHeight
        ) {
            this.waterfall.removeAttribute('data-drag');
            return;
        }
        e.stopPropagation();
        e.preventDefault();
        this.waterfall.setAttribute('data-drag', 'import');
    }

    private handleKeyup(e: KeyboardEvent): void {
        if (e.defaultPrevented) {
            return;
        }

        // check if ctrl + alt +s / cmd + alt + s
        if (e.ctrlKey && e.altKey && e.key === 's') {
            let waterfall_pref = this.use_element('waterfall-preference');
            if (!waterfall_pref || waterfall_pref.getAttribute('data-status') === 'active') {
                return;
            }
            // open preference
            this.use_element('waterfall-action[data-target="waterfall-preference"]')?.click();
            return;
        }

        // escape
        if (!e.key
            || e.key !== 'Escape'
            || this.action === 'closed'
            // no response on input, textarea, select or content editable
            || e.target instanceof HTMLInputElement
            || e.target instanceof HTMLTextAreaElement
            || e.target instanceof HTMLSelectElement
            || e.target instanceof HTMLElement && e.target.contentEditable === 'true'
        ) {
            return;
        }
        const $action = this.use_element('waterfall-action[data-action="close"][data-target]');
        const selector = $action?.getAttribute('data-target');
        if (!$action) {
            return;
        }
        // check if data action visible
        if (this.use_elements(`${selector}[data-status="active"]`).length > 0) {
            $action.click();
        }
    }

    private handleKeyDown(e: KeyboardEvent): void {
        if (e.defaultPrevented) {
            return;
        }
        // check if ctrl + alt +s / cmd + alt + s
        if (e.ctrlKey && e.altKey && e.key === 's') {
            return;
        }
        // if space or enter
        let target = this.waterfall.contains(e.target as HTMLElement) ? e.target as HTMLElement : null;
        if (!target) {
            return;
        }
        // check if it has tabindex
        if (!target.hasAttribute('tabindex')) {
            return;
        }
        if ([' ', 'Enter'].includes(e.key)) {
            e.preventDefault();
            target.click();
        }
    }

    private handleResize(_e: Event): void {
        /* --- RESIZE SET SLIDER TAB ACTION */
        if (resize_tab_timeout) {
            clearTimeout(resize_tab_timeout);
        }
        this.waterfall.setAttribute('data-resize', 'resize');
        resize_tab_timeout = setTimeout(() => {
            const waterfallHeight = this.waterfall.getBoundingClientRect().height;
            const windowHeight = window.innerHeight;
            if (waterfallHeight >= windowHeight) {
                this.action = 'maximize';
            }
            this.waterfall.removeAttribute('data-resize');
            this.reset_slider_bottom();
        }, 100);
    }

    private handleClick(e: Event): void {
        let target = e.target as HTMLElement;
        if (!is_element(target) || !this.waterfall.contains(target)) {
            return;
        }
        const tagNameIs = (name: string) => target.tagName.toLowerCase() === name;


        /* --- COMMAND ACTION --- */
        const commandElement = target.getAttribute('data-command-action')
            ? target
            : target.closest('[data-command-action]');
        const actionCommandAttribute = is_html_element(commandElement) ? commandElement.getAttribute('data-command-action') : null;
        if (is_html_element(commandElement) && actionCommandAttribute) {
            e.preventDefault();
            switch (actionCommandAttribute) {
                case 'download':
                    download_json(this.profiler);
                    break;
                case 'import':
                    let file: HTMLInputElement;
                    try {
                        file = create_element('input', {
                            'type': 'file',
                            'accept': '.json',
                            'style': 'display:none'
                        }) as HTMLInputElement;
                    } catch (err) {
                        this.set_message_info('Error creating file input', 'error');
                    }
                    file.onchange = () => {
                        if (!file.files || !file.files[0]) {
                            return;
                        }
                        this.import_json_file(file.files[0]);
                        file.remove();
                    };
                    file.oncancel = () => {
                        file.remove();
                        this.set_message_info();
                    }
                    file.onerror = () => {
                        file.remove();
                        this.set_message_info('Error reading file');
                    }
                    this.set_message_info('Importing ...', 'info', false);
                    file.click();
                    // to do import
                    break;
                case 'minify':
                case 'prettify':
                    if (this.tab !== 'json') {
                        return;
                    }
                    const pre = this.use_element(`waterfall-tab[data-tab="${this.tab}"] pre`);
                    if (!pre) {
                        return;
                    }
                    pre.innerHTML = actionCommandAttribute === 'minify' ? JSON.stringify(this.profiler) : JSON.stringify(this.profiler, null, 4);
                    this.set_message_info(actionCommandAttribute === 'minify' ? 'Minified successfully' : 'Prettified successfully', 'success');
                    set_attribute(commandElement, {
                        'data-command-action': actionCommandAttribute === 'minify' ? 'prettify' : 'minify',
                        title: actionCommandAttribute === 'minify' ? 'Prettify JSON' : 'Minify JSON'
                    })
                    break;
                case 'restore':
                    this.reset_profiler();
                    break;
                // to do another action: import etc.
            }
            return;
        }

        /* --- ACTION MODE --- */
        const actionElement = tagNameIs('waterfall-action') ? target : target.closest('waterfall-action[data-action]');
        if (is_html_element(actionElement) && actionElement.hasAttribute('data-action')) {
            e.preventDefault();
            const actionTarget = actionElement.getAttribute('data-target');
            switch (actionTarget) {
                case 'waterfall':
                    e.preventDefault();
                    this.action = (actionElement.getAttribute('data-action') as ActionTypes);
                    break;
                default:
                    const action = actionElement.getAttribute('data-action');
                    const status = actionElement.getAttribute('data-status');
                    const _target = this.use_elements(actionTarget);
                    if (!_target.length) {
                        return;
                    }
                    e.preventDefault();
                    _target.forEach((element: HTMLElement) => {
                        if (action === 'close') {
                            set_attribute(element, {
                                'data-status': 'closed'
                            });
                            return ''
                        }
                        set_attribute(element, {
                            'data-status': status === 'active' ? null : 'active'
                        })
                    });
                    if (action === 'close') {
                        this.use_elements(`[data-target="${actionTarget}"]`).forEach((element) => {
                            set_attribute(element, {
                                'data-status': null
                            });
                        });
                        return;
                    }
                    if (action === 'preference' && this.action === 'closed') {
                        this.action = 'opened';
                    }
                    set_attribute(actionElement, {
                        'data-status': status === 'active' ? null : 'active'
                    })
                    break;
            }
        }

        /* --- ACTION MODE --- */
        const tabElement = tagNameIs('waterfall-action-tab') ? target : target.closest('waterfall-action-tab');
        if (is_html_element(tabElement)) {
            e.preventDefault();
            const tab = tabElement.getAttribute('data-tab') as TabListTypes;
            if (this.set_tab(tab)) {
                this.action === 'closed' && this.set_action('opened');
                this.reset_slider_bottom();
            }
        }

        /* --- COLOR MODE --- */
        const colorElement = tagNameIs('waterfall-color-mode') ? target : target.closest('waterfall-color-mode');
        if (is_html_element(colorElement)) {
            e.preventDefault();
            this.color_mode = colorElement.getAttribute('data-color-mode') as ColorModeTypes;
        }
    }

    private handleChange(e: Event): void {
        const target = e.target;
        if (!is_html_element(target)) {
            return;
        }
        if (target.closest('waterfall-preference')) {
            this.preference.handle(e, target);
            return;
        }
    }
}

Object.freeze(App);

export default new App();
