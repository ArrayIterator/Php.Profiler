import {JsonProfiler, RecordProfiler} from "../types/types";
import {
    create_element,
    dispatch_event, icon,
    is_numeric_integer,
    is_string,
    select_element,
    select_elements
} from "../definitions/functions";
import recordsTemplate from "../templates/tabs/records.sqrl";
import {severity_list} from "../definitions/config";
import AbstractDispatcher from "./AbstractDispatcher";

export default class BenchmarkDispatcher extends AbstractDispatcher {
    dispatch({profiler, tab_element}: { profiler: JsonProfiler; tab_element: HTMLElement }): any {
        let {
            content,
            waterfall
        } = this.withWaterfallContent({
            profiler,
            tab_element,
            expect: 'benchmark',
            template: recordsTemplate
        });
        if (!waterfall) {
            return;
        }
        const filterElement = select_element(
            'waterfall-filter-list waterfall-action[data-filter][data-status="active"]',
            waterfall
        ) as HTMLElement; // filter element
        const searchElement = select_element('waterfall-search', waterfall); // search element
        const searchInput = searchElement?.querySelector('input'); // search input
        let severity: string = filterElement?.getAttribute('data-filter');
        severity = severity === undefined ? null : severity;
        let aggregators = select_element('waterfall-aggregators', waterfall);
        let search: string = searchInput?.value.trim();
        if (!aggregators && searchElement) {
            aggregators = create_element('waterfall-aggregators');
            searchElement.append(aggregators);
        }
        if (!filterElement) {
            return;
        }
        const recordFilters: {
            [p: number]: boolean
        } = {};
        const aggregatorList: {
            [p: number]: boolean
        } = {};
        aggregators?.querySelectorAll('record-aggregator[data-status="active"]').forEach((el: HTMLElement) => {
            let id: string | number = el.getAttribute('data-id');
            if (!is_numeric_integer(id)) {
                return;
            }
            id = Number(id);
            const aggregatorRecords = profiler.aggregators[id]?.records;
            if (!Array.isArray(aggregatorRecords)) {
                return;
            }
            aggregatorList[id] = true;
            aggregatorRecords.forEach((record) => {
                recordFilters[record] = true;
            })
        });
        aggregators?.replaceChildren('');
        Promise.all([
            new Promise((resolve) => {
                if (aggregators) {
                    for (let id in profiler.aggregators) {
                        const aggregator = profiler.aggregators[id];
                        if (!aggregator) {
                            continue;
                        }
                        const element = create_element('record-aggregator', {
                            'data-id': id,
                            'data-count': aggregator.records.length,
                            title: aggregator.name + ' with ' + aggregator.records.length + ' records',
                            html: aggregator.name + " (" + aggregator.records.length + ")",
                            'data-status': aggregatorList[Number(id)] ? 'active' : null
                        });
                        aggregators.append(element);
                    }
                }
                resolve(null);
            }),
            new Promise((resolve) => {
                let severityList = severity ? severity_list[severity] : null;
                severityList = Array.isArray(severityList) ? severityList : null;
                search = is_string(search) ? search.trim().toLowerCase().replace(/\s+/g, '') : null;
                const useAggregatorFilter = filterElement && Object.keys(recordFilters).length > 0;
                if (useAggregatorFilter || search || severityList) {
                    console.debug('Filtering records:', {useAggregatorFilter, search, severityList});
                    select_elements('record-item', content).forEach((element) => {
                        const id = element.getAttribute('data-id') as unknown as number;
                        let record: RecordProfiler = id ? profiler.records[id] : null;
                        if (!record
                            || useAggregatorFilter && !recordFilters[id]
                            || (severityList && !severityList.includes(record.severity))
                            || (search && element.textContent.replace(/\s+/g, '').toLowerCase().includes(search) === false)
                        ) {
                            element.remove();
                            return;
                        }
                    });
                }
                if (content.innerHTML.trim() === '') {
                    content.innerHTML = `<waterfall-record-empty>No records found</waterfall-record-empty>`;
                }
                resolve(null);
            }),
        ]).finally(() => {
            console.debug('Benchmark records loaded');
            dispatch_event('waterfall:benchmark:dispatched', {profiler, tab_element});
        }).catch((err) => {
            console.error('Benchmark records failed to load', err);
        });
    }

    icon(): SVGElement | null {
        let div = create_element('div', {
            html: icon('rocket')
        });
        return div.firstElementChild as SVGElement;
    }

    name(): string {
        return 'Benchmark';
    }
}
