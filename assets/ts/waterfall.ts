import "../scss/waterfall.scss";
import {
    create_element,
    download_json,
    get_max_record_file_size,
    get_max_records,
    is_element,
    is_html_element,
    is_numeric_integer,
    select_element,
    select_elements,
    set_attribute,
    size_format
} from "./definitions/functions";
import {ActionTypes, ColorModeTypes} from "./types/types";
import config, {benchmark_allowed_resize_tag_names, is_mac} from "./definitions/config";
import app from "./definitions/app";
// @ts-expect-error ignore
if (!window.arrayiterator_waterfall) {
    Object.defineProperty(window, 'arrayiterator_waterfall', {
        value: app,
        writable: false,
        enumerable: false,
    });
}

let interval = setInterval(() => {
    if (!app.initialized) {
        return;
    }
    clearInterval(interval);
    if (!app.valid) {
        return;
    }

    /* ---------------------------------------------------------------------
     * SETUP
     */

    // END

    /* ---------------------------------------------------------------------
     * COLORS
     */
    /* --- COLOR MODE --- */
    app.use_elements('waterfall-color-mode').forEach((element: HTMLElement) => {
        element.addEventListener('click', () => {
            app.color_mode = (element.getAttribute('data-color-mode') as ColorModeTypes);
        });
    });

    /* --- RESIZE SET SLIDER TAB ACTION */
    let resize_tab_timeout: any = null;
    window.addEventListener('resize', () => {
        if (resize_tab_timeout) {
            clearTimeout(resize_tab_timeout);
        }
        app.waterfall.setAttribute('data-resize', 'resize');
        resize_tab_timeout = setTimeout(() => {
            app.reset_slider_bottom();
            const waterfallHeight = app.waterfall.getBoundingClientRect().height;
            const windowHeight = window.innerHeight;
            if (waterfallHeight >= windowHeight) {
                app.action = 'maximize';
            }
            app.waterfall.removeAttribute('data-resize');
        }, 100);
    });

    // on resize done
    /* ---------------------------------------------------------------------
     * ACTION HANDLER
     */
    /* --- ACTION MODE --- */
    app.use_elements('waterfall-action[data-action]').forEach((el: HTMLElement) => {
        const target = el.getAttribute('data-target');
        el.addEventListener('click', (e: Event) => {
            switch (target) {
                case 'waterfall':
                    e.preventDefault();
                    app.action = (el.getAttribute('data-action') as ActionTypes);
                    break;
                default:
                    const action = el.getAttribute('data-action');
                    const status = el.getAttribute('data-status');
                    const _target = app.use_elements(target);
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
                        app.use_elements(`[data-target="${target}"]`).forEach((element) => {
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
    app.use_elements('waterfall-action[data-target="waterfall-preference"]')
        ?.forEach((element: HTMLElement) => {
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
            let waterfall_pref = app.use_element('waterfall-preference');
            if (!waterfall_pref || waterfall_pref.getAttribute('data-status') === 'active') {
                return;
            }
            // open preference
            app.use_element('waterfall-action[data-target="waterfall-preference"]')?.click();
            return;
        }

        // escape
        if (!e.key
            || e.key !== 'Escape'
            || app.action === 'closed'
            // no response on input, textarea, select or content editable
            || e.target instanceof HTMLInputElement
            || e.target instanceof HTMLTextAreaElement
            || e.target instanceof HTMLSelectElement
            || e.target instanceof HTMLElement && e.target.contentEditable === 'true'
        ) {
            return;
        }
        const $action = app.use_element('waterfall-action[data-action="close"][data-target]');
        const selector = $action?.getAttribute('data-target');
        if (!$action) {
            return;
        }
        // check if data action visible
        if (app.use_elements(`${selector}[data-status="active"]`).length > 0) {
            $action.click();
        }
    });

    /* --- COMMAND ACTION --- */
    document.addEventListener('click', (e: Event) => {
        if (e.defaultPrevented) {
            return;
        }
        let target = e.target;
        if (!is_element(target) || !app.waterfall.contains(target)) {
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
                download_json(app.profiler);
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
                    app.set_message_info('Error creating file input', 'error');
                }
                file.onchange = () => {
                    if (!file.files || !file.files[0]) {
                        return;
                    }
                    app.import_json_file(file.files[0]);
                    file.remove();
                };
                file.oncancel = () => {
                    file.remove();
                    app.set_message_info();
                }
                file.onerror = () => {
                    file.remove();
                    app.set_message_info('Error reading file');
                }
                app.set_message_info('Importing ...', 'info', false);
                file.click();
                // to do import
                break;
            case 'minify':
            case 'prettify':
                if (app.tab !== 'json') {
                    return;
                }
                const pre = app.use_element(`waterfall-tab[data-tab="${app.tab}"] pre`);
                if (!pre) {
                    return;
                }
                pre.innerHTML = action === 'minify' ? JSON.stringify(app.profiler) : JSON.stringify(app.profiler, null, 4);
                app.set_message_info(action === 'minify' ? 'Minified successfully' : 'Prettified successfully', 'success');
                set_attribute(target, {
                    'data-command-action': action === 'minify' ? 'prettify' : 'minify',
                    title: action === 'minify' ? 'Prettify JSON' : 'Minify JSON'
                })
                config.set('prettify', action !== 'minify');
                break;
            case 'restore':
                if (!app.original_profiler) {
                    return;
                }
                app.reset_profiler();
                app.import_json();
                app.set_message_info('Restored successfully', 'success');
                break;
            // to do another action: import etc.
        }
    });

    /* --- DRAG ACTION --- */
    const drag_entering = (e: DragEvent) => {
        const target = e.target;
        let clientXWaterfall = app.waterfall.getBoundingClientRect().left;
        let clientYWaterfall = app.waterfall.getBoundingClientRect().top;
        if (!is_html_element(target)
            || !app.waterfall.contains(target)
            || e.clientY === 0
            || e.clientX < clientXWaterfall
            || e.clientX > clientXWaterfall + app.waterfall.offsetWidth
            || e.clientY < clientYWaterfall
            || e.clientY > clientYWaterfall + app.waterfall.offsetHeight
        ) {
            app.waterfall.removeAttribute('data-drag');
            return;
        }
        e.stopPropagation();
        e.preventDefault();
        app.waterfall.setAttribute('data-drag', 'import');
    }
    document.addEventListener('dragover', drag_entering);
    document.addEventListener('dragenter', drag_entering);
    document.addEventListener('dragleave', drag_entering);
    document.addEventListener('drop', (e: DragEvent) => {
        const target = e.target;
        if (!is_html_element(target) || !app.waterfall.contains(target)) {
            return;
        }
        e.preventDefault();
        if (!e.dataTransfer || !e.dataTransfer.files || !e.dataTransfer.files[0]) {
            app.waterfall.removeAttribute('data-drag');
            return;
        }
        app.waterfall.removeAttribute('data-drag');
        app.import_json_file(e.dataTransfer.files[0]);
    });

    /* --- RESTORE ACTION STATUS --- */
    document.addEventListener('waterfall:imported', () => {
        // set max records and max size
        app.use_elements('waterfall-max-records')
            .forEach((el) => el.replaceChildren(get_max_records().toString()));
        app.use_elements('waterfall-max-size')
            .forEach((el) => el.replaceChildren(size_format(get_max_record_file_size())));
        app.use_elements('waterfall-action[data-action="restore"]').forEach((restore_action) => {
            set_attribute(restore_action, {
                'data-status': app.original_profiler ? 'active' : null
            })
        });
    });

    /* --- FILTER --- */
    const filters = app.use_elements('waterfall-filter-list waterfall-action[data-filter]');
    const search = app.use_element('waterfall-search');
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
                app.import_json();
            }, 100);
        } else {
            app.import_json();
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
    app.use_element('waterfall-aggregators')?.addEventListener('click', (e: Event) => {
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
        waterfallHeaderHeight = app.use_element('waterfall-bar')?.getBoundingClientRect().height || 30;
    // ON POINTING TO WATERFALL
    app
        .waterfall
        .addEventListener("mousedown", (e: MouseEvent) => {
            waterfallInitial = e.offsetY <= 3 && e.offsetY >= -3
                && is_html_element(e.target)
                && app.waterfall.getAttribute('data-action-mode') === 'opened';
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
        app.waterfall.setAttribute('data-resize', 'resize');
        let bounding = app.waterfall.getBoundingClientRect();
        waterfallHeight = bounding.height - (e.clientY - bounding.top);
        if (waterfallHeight < waterfallHeaderHeight) {
            return;
        }
        waterfallIsResizing = true;
        app.waterfall.style.setProperty('height', waterfallHeight + 'px');
    });

    // ON MOUSE RELEASE
    document.addEventListener('mouseup', () => {
        app.waterfall.removeAttribute('data-resize');
        if (waterfallInitial && waterfallIsResizing) {
            if (waterfallHeight <= waterfallHeaderHeight) {
                app.action = ('closed');
            } else if (window.innerHeight <= waterfallHeight) {
                app.action = ('maximize');
            }
        }
        // stop resizing
        waterfallIsResizing = false;
        waterfallInitial = false;
    });

    /* --- HORIZONTAL RESIZE --- */
    let currentResizeTarget: HTMLElement = null,
        selectorXResize = Object.keys(benchmark_allowed_resize_tag_names).join(',');
    const benchmarkTab = app.use_element('waterfall-tab[data-tab="benchmark"]');
    benchmarkTab
        ?.addEventListener("mousedown", (e: MouseEvent) => {
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
                app.waterfall.setAttribute('data-resize', 'resize-x');
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
        select_elements(selectorXResize, currentResizeTarget.parentElement)
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
        app.waterfall.style.setProperty(attr, newWidth + 'px');
    });
    document.addEventListener('mouseup', () => {
        app.waterfall.removeAttribute('data-resize');
        // stop resizing
        currentResizeTarget = null;
    });

    /* ---------------------------------------------------------------------
     * RUNNER
     */
    // SET TAB AFTER APPENDED (to calculate width)
    app.tab = app.tab;

}, 50);
