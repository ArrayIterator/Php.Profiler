import {JsonProfiler} from "../types/types";
import jsonTemplate from "../templates/tabs/json.sqrl";
import {
    create_element,
    dispatch_event,
    get_prettify,
    icon,
    select_element,
    set_attribute
} from "../definitions/functions";
import AbstractDispatcher from "./AbstractDispatcher";

export default class JsonDispatcher extends AbstractDispatcher {
    dispatch({
         profiler,
         tab_element
     }: { profiler: JsonProfiler; tab_element: HTMLElement }): any {
        const {
            content
        } = this.withWaterfallContent({
            profiler,
            tab_element,
            expect: 'json',
            template: jsonTemplate
        });
        const pre = select_element('pre', content);
        const should_prettify = get_prettify() === true;
        pre?.replaceChildren(should_prettify ? JSON.stringify(profiler, null, 4) : JSON.stringify(profiler));
        set_attribute(select_element('[data-action="format"][data-command-action]', tab_element), {
            'data-command-action': should_prettify ? 'minify' : 'prettify',
            title: should_prettify ? 'Minify JSON' : 'Prettify JSON'
        });
        dispatch_event('waterfall:json:dispatched', {profiler, tab_element});
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
