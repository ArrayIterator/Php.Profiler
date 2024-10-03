import "../scss/waterfall.scss";
import {
    create_element,
    download_json,
    filter_profiler, get_max_record_file_size, get_max_records,
    is_element, is_function,
    is_html_element, is_numeric_integer, is_string,
    select_element,
    select_elements,
    set_attribute, set_prettify, size_format
} from "./definitions/functions";
import {
    element,
    elements,
    get_action, get_original_profiler,
    get_profiler,
    get_tab, import_json, reset_profiler, reset_slider_bottom,
    set_action,
    set_color,
    set_profiler,
    set_tab,
    waterfall
} from "./definitions/properties";
import {ActionTypes, ColorModeTypes} from "./types/types";
import {load} from "./definitions/squirrel";
import toolbarTemplate from "./templates/toolbar.sqrl";
import preferenceTemplate from "./templates/preference.sqrl";
import Config, {
    benchmark_allowed_resize_tag_names,
    color_mode_list,
    config_color_mode,
    is_mac
} from "./definitions/config";
import config from "./definitions/config";

((callback: () => any) => ['complete', 'interactive']
        .includes(document.readyState)
        ? callback()
        : window.addEventListener('DOMContentLoaded', callback)
)(function () {
    /* ---------------------------------------------------------------------
     * PREPARE
     */

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
        set_profiler(filter_profiler(json_element));
    } catch (err) {
        waterfall.remove(); // remove element
        console.error(err); // show the error
        return;
    }
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
                    set_color(event.matches ? "dark" : "light");
                }
            });
    }

    // init check if dark mode via match media
    if (!colorMode && is_function(window.matchMedia) && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        colorMode = "dark";
    }

    // SETUP COLOR MODE BEFORE RENDER
    set_color(colorMode);
    // insert into body
    (document.body || document.documentElement).appendChild(waterfall);
    // append content to waterfall element : toolbar + preference
    for (let html of [
        load(toolbarTemplate, {json: get_profiler()}),
        load(preferenceTemplate, {json: get_profiler()}),
    ]) {
        waterfall.innerHTML += html;
    }

    /* ---------------------------------------------------------------------
     * SETUP
     */

    // END

    /* ---------------------------------------------------------------------
     * COLORS
     */
    /* --- COLOR MODE --- */
    elements('waterfall-color-mode').forEach((element) => {
        element.addEventListener('click', () => {
            set_color(element.getAttribute('data-color-mode') as ColorModeTypes);
        });
    });

    /* ---------------------------------------------------------------------
     * TABS
     */
    /* --- TAB MODE --- */
    elements('waterfall-action-tab[data-tab]').forEach((el: HTMLElement) => {
        const target = el.getAttribute('data-tab');
        // remove tab action if no existing tab or data tab target
        if (!target || !element(`waterfall-tab[data-tab="${target}"]`)) {
            el.remove();
        }
        el.addEventListener('click', (e: Event) => {
            e.preventDefault();
            if (set_tab(el) && get_action() === 'closed') {
                set_action('opened');
            }
        });
    });
    /* --- RESIZE SET SLIDER TAB ACTION */
    let resize_tab_timeout: any = null;
    window.addEventListener('resize', () => {
        if (resize_tab_timeout) {
            clearTimeout(resize_tab_timeout);
        }
        waterfall.setAttribute('data-resize', 'resize');
        resize_tab_timeout = setTimeout(() => {
            reset_slider_bottom();
            const waterfallHeight = waterfall.getBoundingClientRect().height;
            const windowHeight = window.innerHeight;
            if (waterfallHeight >= windowHeight) {
                set_action('maximize');
            }
            waterfall.removeAttribute('data-resize');
        }, 100);
    });

    // on resize done
    /* ---------------------------------------------------------------------
     * ACTION HANDLER
     */
    /* --- ACTION MODE --- */
    elements('waterfall-action[data-action]').forEach((el: HTMLElement) => {
        const target = el.getAttribute('data-target');
        el.addEventListener('click', (e: Event) => {
            switch (target) {
                case 'waterfall':
                    e.preventDefault();
                    set_action(el.getAttribute('data-action') as ActionTypes);
                    break;
                default:
                    const action = el.getAttribute('data-action');
                    const status = el.getAttribute('data-status');
                    const _target = elements(target);
                    if (!_target.length) {
                        return;
                    }
                    e.preventDefault();
                    _target.forEach((element) => {
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
                        elements(`[data-target="${target}"]`).forEach((element) => {
                            set_attribute(element, {
                                'data-status': null
                            });
                        });
                        return;
                    }
                    set_attribute(el, {
                        'data-status': status === 'active' ? null : 'active'
                    })
                    break;
            }
        });
    });

    /* --- OPEN PREFERENCE --- */
    elements('waterfall-action[data-target="waterfall-preference"]')
        ?.forEach((element) => {
            const data_action = element.getAttribute('data-action');
            if (data_action === 'close') {
                element.title = '(Esc) Close Preference';
                return;
            }
            const ctrl = is_mac ? 'Cmd' : 'Ctrl';
            element.title = `(${ctrl} + Alt + S) Open Preference`;
        });

    /* --- KEYUP EVENT --- */
    document.addEventListener('keyup', (e: KeyboardEvent) => {
        if (e.defaultPrevented) {
           return;
        }

        // check if ctrl + alt +s / cmd + alt + s
        if (e.ctrlKey && e.altKey && e.key === 's') {
            let waterfall_pref = element('waterfall-preference');
            if (!waterfall_pref || waterfall_pref.getAttribute('data-status') === 'active') {
                return;
            }
            // open preference
            element('waterfall-action[data-target="waterfall-preference"]')?.click();
            return;
        }

        // escape
        if (!e.key
            || e.key !== 'Escape'
            || get_action() === 'closed'
            // no response on input, textarea, select or content editable
            || e.target instanceof HTMLInputElement
            || e.target instanceof HTMLTextAreaElement
            || e.target instanceof HTMLSelectElement
            || e.target instanceof HTMLElement && e.target.contentEditable === 'true'
        ) {
            return;
        }
        const $action = element('waterfall-action[data-action="close"][data-target]');
        const selector = $action?.getAttribute('data-target');
        if (!$action) {
            return;
        }
        // check if data action visible
        if (elements(`${selector}[data-status="active"]`)) {
            $action.click();
        }
    });
    /* --- COMMAND ACTION --- */
    let timeout_message: any = null;
    const set_message = (msg: string = null, type: string = 'info', remove: boolean = true) => {
        const messages = elements('waterfall-message');
        clear_message();
        if (!messages) {
            return;
        }
        if (!is_string(msg) || msg.trim() === '') {
            messages.forEach((message) => {
                set_attribute(message, {
                    'data-color-type': null,
                    'text': null
                });
            });
            return;
        }
        messages.forEach((message) => {
            set_attribute(message, {
                'data-color-type': type || 'info',
                'text': msg
            });
        });
        if (remove) {
            timeout_message = setTimeout(set_message, 3000);
        }
    }
    const clear_message = () => {
        if (timeout_message) {
            clearTimeout(timeout_message);
            timeout_message = null;
        }
        const messages = elements('waterfall-message');
        messages.forEach((message) => {
            set_attribute(message, {
                'data-color-type': null,
                'text': null
            });
        });
    }
    const run_file_import = (file: File) => {
        let reader = new FileReader();
        reader.onload = (event) => {
            try {
                import_json(filter_profiler(event.target.result as string));
                set_message('Imported successfully', 'success');
            } catch (err) {
                set_message(err.message);
            }
        };
        reader.onerror = () => {
            set_message('Error reading file');
        }
        reader.readAsText(file);
    }
    document.addEventListener('click', (e: Event) => {
        if (e.defaultPrevented) {
            return;
        }
        let target = e.target;
        if (!is_element(target) || !waterfall.contains(target)) {
            return;
        }
        target = target.getAttribute('data-command-action')
            ? target
            : target.closest('[data-command-action]');
        if (!is_html_element(target)) {
            return;
        }
        const action = is_html_element(target) ? target.getAttribute('data-command-action') : null;
        if (!action) {
            return;
        }
        e.preventDefault();
        switch (action) {
            case 'download':
                download_json(get_profiler());
                break;
            case 'import':
                let file : HTMLInputElement;
                try {
                    file = create_element('input', {
                        'type': 'file',
                        'accept': '.json',
                        'style': 'display:none'
                    }) as HTMLInputElement;
                } catch (err) {
                    set_message('Error creating file input', 'error');
                }
                file.onchange =  () => {
                    if (!file.files || !file.files[0]) {
                        return;
                    }
                    run_file_import(file.files[0]);
                    file.remove();
                };
                file.oncancel = () => {
                    file.remove();
                    set_message();
                }
                file.onerror = () => {
                    file.remove();
                    set_message('Error reading file');
                }
                set_message('Importing ...', 'info', false);
                file.click();
                // to do import
                break;
            case 'minify':
            case 'prettify':
                    if (get_tab() !== 'json') {
                        return;
                    }
                    const pre = element(`waterfall-tab[data-tab="${get_tab()}"] pre`);
                    if (!pre) {
                        return;
                    }
                    pre.innerHTML = action === 'minify' ? JSON.stringify(get_profiler()) : JSON.stringify(get_profiler(), null, 4);
                    set_message(action === 'minify' ? 'Minified successfully' : 'Prettified successfully', 'success');
                    set_attribute(target, {
                        'data-command-action': action === 'minify' ? 'prettify' : 'minify',
                        title: action === 'minify' ? 'Prettify JSON' : 'Minify JSON'
                    })
                    config.set('prettify', action !== 'minify');
                break;
            case 'restore':
                if (!get_original_profiler()) {
                    return;
                }
                reset_profiler();
                import_json();
                set_message('Restored successfully', 'success');
                break;
            // to do another action: import etc.
        }
    });

    /* --- DRAG ACTION --- */
    const drag_entering = (e: DragEvent) => {
        const target = e.target;
        let clientXWaterfall = waterfall.getBoundingClientRect().left;
        let clientYWaterfall = waterfall.getBoundingClientRect().top;
        if (!is_html_element(target)
            || !waterfall.contains(target)
            || e.clientY === 0
            || e.clientX < clientXWaterfall
            || e.clientX > clientXWaterfall + waterfall.offsetWidth
            || e.clientY < clientYWaterfall
            || e.clientY > clientYWaterfall + waterfall.offsetHeight
        ) {
            waterfall.removeAttribute('data-drag');
            return;
        }
        e.stopPropagation();
        e.preventDefault();
        waterfall.setAttribute('data-drag', 'import');
    }
    document.addEventListener('dragover', drag_entering);
    document.addEventListener('dragenter', drag_entering);
    document.addEventListener('dragleave', drag_entering);

    document.addEventListener('drop', (e: DragEvent) => {
        const target = e.target;
        if (!is_html_element(target) || !waterfall.contains(target)) {
            return;
        }
        e.preventDefault();
        if (!e.dataTransfer || !e.dataTransfer.files || !e.dataTransfer.files[0]) {
            waterfall.removeAttribute('data-drag');
            return;
        }
        waterfall.removeAttribute('data-drag');
        run_file_import(e.dataTransfer.files[0]);
    });

    /* --- RESTORE ACTION STATUS --- */
    document.addEventListener('waterfall:import', () => {

        // set max records and max size
        elements('waterfall-max-records')
            .forEach((el) => el.replaceChildren(get_max_records().toString()));
        elements('waterfall-max-size')
            .forEach((el) => el.replaceChildren(size_format(get_max_record_file_size())));

        elements('waterfall-action[data-action="restore"]').forEach((restore_action) => {
            set_attribute(restore_action, {
                'data-status': get_original_profiler() ? 'active' : null
            })
        });
    });
    /* --- FILTER --- */
    const filters = elements('waterfall-filter-list waterfall-action[data-filter]');
    const search = element('waterfall-search');
    const inputSearch = select_element('input', search);
    let searchTimeout: any = null;
    const clear_search_timeout = () => {
        if (searchTimeout) {
            clearTimeout(searchTimeout);
            searchTimeout = null;
        }
    }
    const do_import_json = (delay: any = false) => {
        clear_search_timeout();
        if (delay !== false) {
            searchTimeout = setTimeout(() => {
                searchTimeout = null;
                import_json(get_profiler());
            }, 100);
        } else {
            import_json(get_profiler());
        }
    }
    filters.forEach((el: HTMLElement) => {
        el.addEventListener('click', () => {
            clear_search_timeout();
            let is_active = el.getAttribute('data-status') === 'active';
            filters.forEach((element) => {
                set_attribute(element, {
                    'data-status': element !== el || is_active ? null : 'active'
                });
            });
            set_attribute(search, {
                'data-status': is_active ? null : 'active'
            });
            do_import_json(false);
        });
    });
    inputSearch?.addEventListener('input', do_import_json);
    inputSearch?.addEventListener('change', do_import_json);
    element('waterfall-aggregators')?.addEventListener('click', (e: Event) => {
        e.preventDefault();
        let target = e.target;
        if (!is_html_element(target)) {
            return;
        }
        target = target.tagName.toLowerCase() === 'record-aggregator' ? target : target.closest('record-aggregator');
        if (!is_html_element(target)) {
            return;
        }
        const active = target.getAttribute('data-status') === 'active';
        const id = target.getAttribute('data-id');
        if (!is_numeric_integer(id)) {
            return;
        }
        select_elements(`record-aggregator[data-id="${id}"]`, target.parentElement)
            .forEach((element) => {
                set_attribute(element, {
                    'data-status': element === target && !active ? 'active' : null
                });
            });
        do_import_json();
    })
    /* ---------------------------------------------------------------------
     * RESIZE HANDLER
     */
    /* --- VERTICAL RESIZE --- */
    let
        waterfallHeight: number,
        waterfallIsResizing = false,
        waterfallInitial = false,
        waterfallHeaderHeight = element('waterfall-bar')?.getBoundingClientRect().height || 30;
    // ON POINTING TO WATERFALL
    waterfall
        .addEventListener("mousedown", (e: MouseEvent) => {
            waterfallInitial = e.offsetY <= 3 && e.offsetY >= -3
                && is_html_element(e.target)
                && waterfall.getAttribute('data-action-mode') === 'opened';
        });
    // ON MOUSE DRAGGING
    document.addEventListener('mousemove', (e: MouseEvent) => {
        if (e.defaultPrevented) {
            return;
        }
        // we don't want to do anything if we aren't resizing.
        if (!waterfallInitial) {
            return;
        }
        waterfall.setAttribute('data-resize', 'resize');
        let bounding = waterfall.getBoundingClientRect();
        waterfallHeight = bounding.height - (e.clientY - bounding.top);
        if (waterfallHeight < waterfallHeaderHeight) {
            return;
        }
        waterfallIsResizing = true;
        waterfall.style.height = waterfallHeight + 'px';
    });

    // ON MOUSE RELEASE
    document.addEventListener('mouseup', () => {
        waterfall.removeAttribute('data-resize');
        if (waterfallInitial && waterfallIsResizing) {
            if (waterfallHeight <= waterfallHeaderHeight) {
                set_action('closed');
            } else if (window.innerHeight <= waterfallHeight) {
                set_action('maximize');
            }
        }
        // stop resizing
        waterfallIsResizing = false;
        waterfallInitial = false;
    });

    /* --- HORIZONTAL RESIZE --- */
    let currentResizeTarget : HTMLElement = null,
        selectorXResize = Object.keys(benchmark_allowed_resize_tag_names).join(',');
    const benchmarkTab = element('waterfall-tab[data-tab="benchmark"]');
    benchmarkTab
        ?.addEventListener("mousedown", (e : MouseEvent) => {
        currentResizeTarget = null;
        if (e.defaultPrevented) {
            return;
        }
        const target = e.target as HTMLElement;
        if (!is_html_element(target)) {
            return;
        }
        if (!benchmark_allowed_resize_tag_names[target.tagName.toLowerCase()]) {
            return;
        }
        let width = target.getBoundingClientRect().width;
        if (e.offsetX <= (width + 4) && e.offsetX >= (width - 4)) {
            currentResizeTarget = target;
            waterfall.setAttribute('data-resize', 'resize');
        }
    });
    // resize horizontal width (x) with of div by set style set property by attr
    document.addEventListener('mousemove', (e) => {
        if (e.defaultPrevented) {
            return;
        }
        // we don't want to do anything if we aren't resizing.
        if (!currentResizeTarget) {
            return;
        }
        const tagName = currentResizeTarget.tagName.toLowerCase();
        const attr = benchmark_allowed_resize_tag_names[tagName];
        // calculate all data-tem width exclude current
        let allWidth = 50;
        select_elements(selectorXResize,currentResizeTarget.parentElement)
            .forEach((element: HTMLDivElement) => {
                if (element === currentResizeTarget) {
                    return;
                }
                if (!benchmark_allowed_resize_tag_names[element.tagName.toLowerCase()]) {
                    return;
                }
                let width = element.getBoundingClientRect().width;
                if (width < 50) {
                    width = 50;
                }
                allWidth += width;
            });
        let benchmarkWidth = Math.min(
            document.body.getBoundingClientRect().width,
            benchmarkTab.getBoundingClientRect().width
        );
        // maximum width
        let maxWidth = benchmarkWidth - allWidth;
        let newWidth = e.clientX - currentResizeTarget.getBoundingClientRect().left;
        if (newWidth < 50) {
            newWidth = 50;
        }
        if (maxWidth < newWidth) {
            newWidth = maxWidth;
        }
        // console.log(e.clientX, maxWidth);
        waterfall.style.setProperty(attr, newWidth + 'px');
    });
    document.addEventListener('mouseup', () => {
        waterfall.removeAttribute('data-resize');
        // stop resizing
        currentResizeTarget = null;
    });
    /* ---------------------------------------------------------------------
     * RUNNER
     */
    // SET TAB AFTER APPENDED (to calculate width)
    set_tab(get_tab());
});
