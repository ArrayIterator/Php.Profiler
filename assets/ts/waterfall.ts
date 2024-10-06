import "../scss/waterfall.scss";
import {
    is_html_element,
    is_numeric_integer,
    select_element,
    select_elements,
    set_attribute
} from "./definitions/functions";
import {
    benchmark_allowed_resize_tag_names
} from "./definitions/config";
import app from "./definitions/app";

let interval = setInterval(() => {
    if (!app.initialized) {
        return;
    }
    clearInterval(interval);
    if (!app.valid) {
        return;
    }

    // on resize done
    /* ---------------------------------------------------------------------
     * ACTION HANDLER
     */

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
