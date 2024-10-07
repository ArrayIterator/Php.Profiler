import {AppInterface, JsonProfiler} from "../types/types";
import jsonTemplate from "../templates/tabs/json.sqrl";
import {
    create_element,
    dispatch_event,
    get_prettify,
    icon,
    select_element,
    set_attribute, size_format
} from "../definitions/functions";
import AbstractDispatcher from "./AbstractDispatcher";
let timeoutJson: any = null;
const clear_timeout = (e: CustomEvent) => {
    if (timeoutJson || e.detail?.tab === 'json') {
        return;
    }
    clearTimeout(timeoutJson);
    timeoutJson = null;
}
/**
 * Max rendered size of JSON content
 */
const max_displayed_size = 512 * 1024; // 512KB is big enough
export default class JsonDispatcher extends AbstractDispatcher {
    dispatch({
                 profiler,
                 tab_element,
                 app
             }: { profiler: JsonProfiler; tab_element: HTMLElement, app: AppInterface }): any {
        const {
            content,
            waterfall
        } = this.withWaterfallContent({
            profiler,
            tab_element,
            expect: 'json',
            template: jsonTemplate
        });
        if (!waterfall || !content) {
            return;
        }
        const pre = select_element('pre', content);
        if (!pre) {
            return;
        }
        waterfall.removeEventListener('waterfall:tab', clear_timeout);
        waterfall.addEventListener('waterfall:tab', clear_timeout);

        const should_prettify = get_prettify() === true;
        set_attribute(select_element('[data-action="format"][data-command-action]', tab_element), {
            'data-command-action': should_prettify ? 'minify' : 'prettify',
            title: should_prettify ? 'Minify JSON' : 'Prettify JSON'
        });
        let truncated = false;
        let $content = should_prettify ? JSON.stringify(profiler, null, 4) : JSON.stringify(profiler);
        if ($content.length > max_displayed_size) {
            app.set_message_info(`(truncated: ${size_format(max_displayed_size)}) JSON content is too large to display`, 'warning', false, tab_element);
            $content = $content.substring(0, max_displayed_size);
            truncated = true;
        }
        pre.replaceChildren('');
        const append = () => {
            if ($content.length === 0) {
                if (truncated) {
                    pre.appendChild(document.createTextNode('...'));
                }
                dispatch_event('waterfall:json:dispatched', {profiler, tab_element}, app.waterfall);
                return;
            }
            let subContent = $content.substring(0, 8192);
            $content = $content.substring(8192);
            pre.appendChild(document.createTextNode(subContent));
            timeoutJson = setTimeout(append, 0);
        }
        append();
    }

    icon(): SVGElement | null {
        let div = create_element('div', {
            html: icon('code')
        });
        return div.firstElementChild as SVGElement;
    }

    name(): string {
        return 'Source';
    }
}
