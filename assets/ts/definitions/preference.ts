import {AppInterface, ColorModeTypes} from "../types/types";
import config, {
    color_mode_list,
    Config,
    config_color_mode,
    config_enable_labs,
    config_max_records,
    config_max_size, config_prettify
} from "./config";
import {
    create_element,
    get_max_record_file_size,
    get_max_records,
    is_element,
    is_numeric_integer,
    round, select_element, set_attribute
} from "./functions";
import {load} from "./squirrel";
import preferenceTemplate from "../templates/preference.sqrl";

export default class Preference {
    readonly app : AppInterface;

    constructor(app: AppInterface) {
        this.app = app;
        this.app.waterfall.addEventListener('click', (e) => {
            let target = e.target;
            if (!is_element(target)) {
                return;
            }
            if (target.tagName.toLowerCase() !== 'waterfall-preference-reset') {
                return;
            }
            const preference = target.closest('waterfall-preference');
            if (!preference) {
                return;
            }
            Config.entries().forEach((entry: [string, any]) => {
               const name = entry[0];
               if (!select_element(`[name="${name}"]`, preference)) {
                   return;
               }
               Config.remove(name);
            });
            let template = create_element('div', {html:load(preferenceTemplate, {json: this.app.profiler})});
            preference.replaceChildren(...Array.from(template.childNodes[0].childNodes));
            preference.querySelectorAll('input, select').forEach((input: HTMLInputElement|HTMLSelectElement) => {
                input.dispatchEvent(new Event('change', {
                    bubbles: true
                }));
            });
        })
    }

    handle(e: Event, target: HTMLElement) : any {
        if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLSelectElement)) {
            return;
        }
        let name = target.name;
        if (!name) {
            return;
        }
        e.preventDefault();
        let value : any = target.value;
        switch (name) {
            case config_color_mode:
                if (!color_mode_list.includes(value as ColorModeTypes)) {
                    value = 'auto';
                }
                this.app.set_color(value, true);
                break;
            case config_max_records:
                if (is_numeric_integer(value)) {
                    this.app.set_max_records(parseInt(value));
                }
                target.value = get_max_records().toString();
                break;
            case config_max_size:
                if (is_numeric_integer(value)) {
                    this.app.set_max_size(parseInt(value) * 1024 * 1024);
                }
                target.value = round(get_max_record_file_size() / 1024 / 1024, 0).toString()
                break;
            case config_enable_labs:
                this.app.set_enable_labs(value === '1');
                break;
            case config_prettify:
                let isPrettify = value === '1';
                this.app.set_prefer_prettify(isPrettify);
                if (this.app.tab === 'json') {
                    const tab = this.app.use_element(`waterfall-tab[data-tab="${this.app.tab}"]`);
                    if (!tab) {
                        return;
                    }
                    const pre = tab.querySelector('pre');
                    if (!pre) {
                        return;
                    }
                    let commandElement = tab.querySelector('[data-command-action="prettify"], [data-command-action="minify"]');
                    pre.innerHTML = !isPrettify ? JSON.stringify(this.app.profiler) : JSON.stringify(this.app.profiler, null, 4);
                    set_attribute(commandElement, {
                        'data-command-action': !isPrettify ? 'prettify' : 'minify',
                        title: !isPrettify ? 'Prettify JSON' : 'Minify JSON'
                    })
                }
                break;
        }
    }
}
