import {AppInterface, JsonProfiler} from "../types/types";
import functions, {
    get_max_record_file_size,
    get_max_records,
    is_html_element,
    round_time,
    select_element, select_elements,
    size_format
} from "../definitions/functions";
import {load} from "../definitions/squirrel";
import Config from "../definitions/config";

export default abstract class AbstractDispatcher {

    public readonly functions;
    public readonly config : typeof Config;

    constructor() {
        this.dispatch = this.dispatch.bind(this);
        this.functions = functions;
        this.config = Config;
    }

    /**
     * Dispatch the profiler
     */
    abstract dispatch(
        {
            profiler,
            tab_element,
            app
        }: {
            profiler: JsonProfiler,
            tab_element: HTMLElement,
            app: AppInterface
        }
    ): any;

    /**
     * Menu icon
     */
    abstract icon() : SVGElement | null;

    /**
     * Menu text name
     */
    abstract name() : string;

    withWaterfallContent(
        {
            profiler,
            tab_element,
            expect,
            template
     }: {
        profiler: JsonProfiler,
        tab_element: HTMLElement,
        expect: string,
        template: string
    }): {
        content: HTMLElement,
        waterfall: HTMLElement
    } {
        if (!is_html_element(tab_element) || tab_element.getAttribute('data-tab') !== expect) {
            return {
                content: null,
                waterfall: null
            }
        }
        const waterfall = tab_element.closest('waterfall');
        if (!waterfall) {
            return {
                content: null,
                waterfall: null
            }
        }

        tab_element.innerHTML = load(template, {json: profiler});
        select_elements('waterfall-max-records', waterfall)
            .forEach((el) => el.replaceChildren(get_max_records().toString()));
        select_elements('waterfall-max-size', waterfall)
            .forEach((el) => el.replaceChildren(size_format(get_max_record_file_size())));
        select_element('waterfall-item-duration waterfall-value', waterfall).replaceChildren(
            round_time(profiler.system_wide.duration)
        );
        select_element('waterfall-item-memory waterfall-value', waterfall).replaceChildren(
            size_format(profiler.system_wide.real_peak_memory)
        );
        return {
            content: select_element('waterfall-tab-content', tab_element),
            waterfall: waterfall as HTMLElement
        };
    }
}
