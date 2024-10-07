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

    /* ---------------------------------------------------------------------
     * RUNNER
     */
    // SET TAB AFTER APPENDED (to calculate width)
    app.tab = app.tab;
    // app.action = 'maximize';
}, 50);
