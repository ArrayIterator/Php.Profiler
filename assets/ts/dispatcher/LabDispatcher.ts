import AbstractDispatcher from "./AbstractDispatcher";
import {AppInterface, JsonProfiler} from "../types/types";
import {create_element, icon} from "../definitions/functions";

export default class LabDispatcher extends AbstractDispatcher {

    icon(): SVGElement | null {
        let div = create_element('div', {
            html: icon('beaker')
        });
        return div.firstElementChild as SVGElement;
    }

    name(): string {
        return 'Labs';
    }

    dispatch(
        {
            profiler,
            tab_element,
            app
        }: {
            profiler: JsonProfiler;
            tab_element: HTMLElement;
            app: AppInterface
        }
    ): any {
    }
}
