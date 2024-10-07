import AbstractDispatcher from "./AbstractDispatcher";
import {AppInterface, JsonProfiler} from "../types/types";
import {create_element, icon, round, select_element} from "../definitions/functions";
import {Chart} from "highcharts";
import labTemplate from "../templates/tabs/labs.sqrl";
let charts : Array<Chart> = [];
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
        while (charts.length > 0) {
            charts.shift().destroy();
        }
        const {
            content,
            waterfall
        } = this.withWaterfallContent({
            profiler,
            tab_element,
            expect: 'labs',
            template: labTemplate
        });
        if (!waterfall || !content) {
            return;
        }
        let chartElement = select_element('waterfall-chart-benchmarks', content);
        if (!chartElement) {
            return;
        }
        chartElement.innerHTML = '<waterfall-chart-wait>Please Wait</waterfall-chart-wait>';
        if (window.Highcharts === undefined) {
            let script = create_element('script', {
                src: 'https://code.highcharts.com/highcharts.js',
                async: true,
            });
            script.onload = () => {
                this.render({
                    waterfall,
                    content,
                    profiler,
                    Highcharts: window.Highcharts,
                    tab_element,
                    app
                });
            }
            script.onerror = () => {
                chartElement.innerHTML = '<waterfall-chart-error>Failed to load Highcharts</waterfall-chart-error>';
                let a = create_element('waterfall-chart-error-link', {
                    text: 'Retry',
                });
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    a.remove();
                    this.dispatch({
                        profiler,
                        tab_element,
                        app
                    });
                });
                chartElement.appendChild(a);
                console.error('Failed to load Highcharts');
            }
            (document.body || document.head || document.documentElement).appendChild(script);
        } else {
            this.render({
                waterfall,
                content,
                profiler,
                Highcharts: window.Highcharts,
                tab_element,
                app
            });
        }
    }

    private render({
        waterfall,
        content,
        profiler,
        Highcharts,
        tab_element,
        app
   } : {
        waterfall: HTMLElement,
        content: HTMLElement,
        profiler: JsonProfiler,
        Highcharts: typeof window.Highcharts,
        tab_element: HTMLElement,
        app: AppInterface
    }) {
        let chartElement = select_element('waterfall-chart-benchmarks', content);
        if (!chartElement) {
            return;
        }
        // aggregators + not listed in aggregators
        let aggregators : Array<{
            name: string,
            aggregator: number
        }> = [];
        let records : Array<number> = [];
        for (let key in profiler.aggregators) {
            const aggregator = profiler.aggregators[key];
            const name = aggregator.name;
            aggregators.push({name, aggregator: aggregator.records.length});
            records = records.concat(aggregator.records);
        }
        // unique records
        records = Array.from(new Set(records));
        let not_listed = Object.keys(profiler.records).length - records.length;
        let seriesAggregators : Array<any> = [];
        const aggregatorsLength = aggregators.length;
        // add pie chart
        while (aggregators.length > 0) {
            let aggregator = aggregators.shift();
            seriesAggregators.push({
                name: aggregator.name,
                dataLabels : {
                    enabled: true,
                    style: {
                        fontSize: '12px'
                    }
                },
                y: aggregator.aggregator
            });
        }
        seriesAggregators.push({
            name: 'Not listed',
            dataLabels : {
                enabled: true,
                style: {
                    fontSize: '12px'
                }
            },
            y: not_listed
        });
        seriesAggregators.unshift({
            name: 'Total Aggregators',
            dataLabels : {
                enabled: true,
                distance: -60,
                format: '{point.y:.0f}',
                style: {
                    fontSize: '15px'
                },
            },
            y: aggregatorsLength
        })
        let system_wide = profiler.system_wide;
        let benchmarkMemories = [];
        let benchmarkDurations = [];
        let c = 0;
        for (let key in profiler.records) {
            let record = profiler.records[key];
            c++;
            benchmarkMemories.push({
                name: record.name,
                y: round(record.memory.used_memory/1024/1024, 4),
            });
            benchmarkDurations.push({
                name: record.name,
                y: round(record.timing.duration, 3),
            });
        }
        /*
                        {
                            type: 'pie',
                            name: 'Memory Usage',
                            size: 120,
                            center: ['10%', '50%'],
                            innerSize: '80%',
                            showInLegend: false,
                            dataLabels: {
                                enabled: false
                            },
                            tooltip: {
                                headerFormat: '',
                                pointFormat: '{point.name}: <b>{point.y}</b> MB'
                            },
                            colors: Highcharts.getOptions().colors,
                            data: [
                                {
                                    y: system_wide.memory_limit === -1 ? Infinity : round(system_wide.memory_limit/1024/1024, 2),
                                    name: 'Total Memory',
                                    color: Highcharts.getOptions().colors[0],
                                    title: '',
                                    dataLabels : {
                                        enabled: true,
                                        distance: -60,
                                        format: system_wide.memory_limit === -1 ? 'Infinity' : '{point.y:.2f} MB',
                                        style: {
                                            fontSize: '15px'
                                        }
                                    }
                                },
                                {
                                    y: round(system_wide.real_peak_memory/1024/1024, 2),
                                    name: 'Peak Memory',
                                    color: Highcharts.getOptions().colors[1],
                                    title: '',
                                    dataLabels : {
                                        enabled: true,
                                        style: {
                                            fontSize: '12px'
                                        }
                                    }
                                },
                                {
                                    y: round(system_wide.real_end_memory/1024/1024, 2),
                                    name: 'End Used Memory',
                                    color: Highcharts.getOptions().colors[2],
                                    title: '',
                                    dataLabels : {
                                        enabled: true,
                                        style: {
                                            fontSize: '12px'
                                        }
                                    }
                                },
                                {
                                    y: round(profiler.profiler.memory.real_used_memory /1024/1024, 2),
                                    name: 'Profiler Used Memory',
                                    color: Highcharts.getOptions().colors[3],
                                    title: '',
                                    dataLabels : {
                                        enabled: true,
                                        style: {
                                            fontSize: '12px'
                                        }
                                    }
                                }
                            ]
                        },

         */
        charts.push(Highcharts.chart({
            title: {
                text: ''
            },
            chart: {
                type: 'pie',
                renderTo: chartElement,
                backgroundColor: 'transparent',
                height: 400,
            },
            credits: {
                enabled: false
            },
            tooltip: {
                valueSuffix: ''
            },
            plotOptions: {
                line: {
                    dataLabels: {
                        enabled: false,
                    },
                    enableMouseTracking: true
                }
            },
            legend: {
                itemStyle: {
                    color: '#999',
                },
                itemHoverStyle: {
                    color: '#888',
                },
            },
            yAxis: {
                title: {
                    text: '',
                },
                labels: {
                    style: {
                        fontSize: '12px',
                        color: '#999'
                    }
                },
                lineColor: '#999',
                gridLineColor: '#888',
            },
            xAxis: {
                title: {
                    text: '',
                },
                labels: {
                    style: {
                        fontSize: '12px',
                        color: '#999'
                    }
                },
                lineColor: '#999',
                gridLineColor: '#888',
            },
            series: [
                {
                    type: 'area',
                    name: 'Benchmark Memory',
                    lineColor: Highcharts.getOptions().colors[2],
                    color: Highcharts.getOptions().colors[1],
                    fillOpacity: 0.5,
                    marker: {
                        enabled: false
                    },
                    threshold: null,
                    data: benchmarkMemories,
                },
                {
                    type: 'area',
                    name: 'Benchmark Duration',
                    lineColor: Highcharts.getOptions().colors[3],
                    color: Highcharts.getOptions().colors[4],
                    fillOpacity: 0.5,
                    marker: {
                        enabled: false
                    },
                    threshold: null,
                    data: benchmarkDurations,
                },
                {
                    type: 'pie',
                    name: 'Aggregators',
                    size: 120,
                    center: ['10%', '50%'],
                    innerSize: '80%',
                    showInLegend: false,
                    dataLabels: {
                        enabled: false
                    },
                    tooltip: {
                        headerFormat: '',
                        pointFormat: '{point.name}: <strong>{point.y}</strong>'
                    },
                    colors: Highcharts.getOptions().colors,
                    data: seriesAggregators
                }
            ]
        }));
        let chartWrapper = create_element('waterfall-chart-wrapper', {
            html: chartElement
        })
        tab_element.appendChild(chartWrapper);
        benchmarkDurations = null;
        benchmarkMemories = null;
        seriesAggregators = null;
        charts.forEach((chart) => {
            chart.reflow();
        });
    }
}
