<?php
declare(strict_types=1);

namespace ArrayIterator\Profiler;

use ArrayIterator\Profiler\Formatter\HtmlFormatter;
use ArrayIterator\Profiler\Formatter\Interfaces\FormatterInterface;
use ArrayIterator\Profiler\Formatter\PlainFormatter;
use ArrayIterator\Profiler\Interfaces\ProfilerInterface;
use ArrayIterator\Profiler\Waterfall\Interfaces\RendererInterface;
use ArrayIterator\Profiler\Waterfall\Renderer;
use Exception;
use JsonSerializable;
use function array_keys;
use function function_exists;
use function ini_get;
use function intval;
use function is_string;
use function max;
use function memory_get_peak_usage;
use function memory_get_usage;
use function microtime;
use function min;
use function preg_match;
use function restore_error_handler;
use function round;
use function set_error_handler;
use function spl_object_id;
use function strlen;
use function strtolower;
use function substr;
use function trim;
use function uasort;

class Waterfall implements JsonSerializable
{
    /**
     * @var int $memoryLimit total usable memory
     */
    protected int $memoryLimit;

    /**
     * @var float $requestTime the request time
     */
    private float $requestTime;

    /**
     * @var ProfilerInterface $profiler
     */
    protected ProfilerInterface $profiler;

    protected FormatterInterface $defaultFormatter;

    /**
     * @var RendererInterface
     */
    protected RendererInterface $renderer;

    /**
     * @param ProfilerInterface $profiler
     * @param FormatterInterface|null $formatter
     */
    public function __construct(ProfilerInterface $profiler, ?FormatterInterface $formatter = null)
    {
        $this->profiler = $profiler;
        // get server env
        $floatTime = $_SERVER['REQUEST_TIME_FLOAT'] ?? ($_SERVER['REQUEST_TIME'] ?? null);
        $profilerStart = $profiler->getStartTime();
        $floatTime = $floatTime === null ? $profilerStart : $floatTime;
        $floatTime = (float)$floatTime;
        $this->requestTime = $this->getProfiler()->convertMicrotime(min($floatTime, $profilerStart));
        if ($formatter) {
            $this->setDefaultFormatter($formatter);
        }
    }

    /**
     * @return RendererInterface
     */
    public function getRenderer(): RendererInterface
    {
        return $this->renderer ??= new Renderer($this);
    }

    /**
     * @param RendererInterface $renderer
     * @return void
     */
    public function setRenderer(RendererInterface $renderer): void
    {
        $this->renderer = $renderer;
    }

    /**
     * Get request time
     *
     * @return float
     */
    public function getRequestTime(): float
    {
        return $this->requestTime;
    }

    /**
     * @return ProfilerInterface
     */
    public function getProfiler(): ProfilerInterface
    {
        return $this->profiler;
    }

    public function getDefaultFormatter(): FormatterInterface
    {
        return $this->defaultFormatter ??= new HtmlFormatter();
    }

    public function setDefaultFormatter(FormatterInterface $defaultFormatter): void
    {
        $this->defaultFormatter = $defaultFormatter;
    }

    /**
     * Get total usable memory
     *
     * @return int
     */
    public function getMemoryLimit(): int
    {
        if (isset($this->memoryLimit)) {
            return $this->memoryLimit;
        }
        $this->memoryLimit = 0;
        if (!function_exists('ini_get')) {
            return $this->memoryLimit;
        }
        try {
            set_error_handler(static function ($errNo, $errorMessage) {
                throw new Exception($errorMessage, $errNo);
            });
            $memoryLimit = ini_get('memory_limit');
        } catch (Exception $e) {
            $memoryLimit = false;
        } finally {
            restore_error_handler();
        }
        if (!is_string($memoryLimit)) {
            return $this->memoryLimit;
        }
        $memoryLimit = trim($memoryLimit);
        if ($memoryLimit === '-1') {
            return $this->memoryLimit = -1;
        }
        preg_match('~^[-+]?([0-9]+)\s*(b|[kmgt]b?)?$~i', $memoryLimit, $match);
        if (empty($match)) {
            return $this->memoryLimit;
        }
        $unit = ($match[2]??'b');
        if (strlen($unit) === 2) {
            $unit = substr($unit, 0, 1);
        }
        $unit = strtolower($unit);
        $memory = intval($match[1]);
        if ($memory < 0) {
            return $this->memoryLimit = -1;
        }
        $multiplication = [
            't' => 1099511627776, // terabyte
            'g' => 1073741824, // gigabyte
            'm' => 1048576, // megabyte
            'k' => 1024, // kilobyte
        ];
        $multiplication = $multiplication[$unit]??1; // default 1
        return $this->memoryLimit = $memory * $multiplication;
    }

    /**
     * Get rendered data
     * @param ?FormatterInterface $formatter the formatter
     * @param positive-int $timeRoundPrecision the rounded half up of round
     * @return array{
     *     generated: int,
     *     system_wide: array{
     *          start_time: float,
     *          end_time: float,
     *          end_memory: int<1, max>,
     *          duration: float,
     *          real_end_memory: int<1, max>,
     *          peak_memory: int<1, max>,
     *          real_peak_memory: int<1, max>,
     *          memory_limit: int,
     *     },
     *     groups: array<int, string>,
     *     aggregators: array<int, array{
     *          name: string,
     *          total_execution: int,
     *          total_duration: float,
     *          minimum_duration: float,
     *          maximum_duration: float,
     *          average_duration: float,
     *          records: array<int, int>,
     *     }>,
     *     records: array<int, array{
     *          group: int,
     *          id: int,
     *          name: string,
     *          stopped: bool,
     *          severity: int,
     *          left: float,
     *          timing: array{
     *              start_time: float,
     *              end_time: float,
     *              duration: float,
     *              percentage: float,
     *          },
     *          memory: array{
     *              start_memory: int,
     *              end_memory: int,
     *              used_memory: int,
     *              real_start_memory: int,
     *              real_end_memory: int,
     *              real_used_memory: int,
     *          },
     *          formatted_data: array<string, string>,
     *     }>,
     *     profiler: array{
     *          severity: int,
     *          timing: array{
     *              start_time: float,
     *              end_time: float,
     *              duration: float,
 *              },
 *              memory: array{
     *              start_memory: int,
     *              end_memory: int,
     *              used_memory: int,
     *              real_start_memory: int,
     *              real_end_memory: int,
     *              real_used_memory: int,
     *          }
     *     }
     * }
     */
    public function getJsonRenderArray(?FormatterInterface $formatter = null, int $timeRoundPrecision = 4): array
    {
        $timeRoundPrecision = max($timeRoundPrecision, 0);
        $round = static function (float $item) use ($timeRoundPrecision) {
            return round($item, $timeRoundPrecision);
        };
        $formatter ??= $this->getDefaultFormatter();
        $profiler = $this->getProfiler();
        $end_time = $profiler->convertMicrotime(microtime(true));
        $jsonArray = [
            'generated' => time(), // unix timestamp
            'system_wide' => [
                // init
                'start_time' => $round($this->getRequestTime()),
                'end_time' => $round($end_time),
                'duration' => $round($end_time -  $this->getRequestTime()),
                'end_memory' => memory_get_usage(),
                'real_end_memory' => memory_get_usage(true),
                'peak_memory' => memory_get_peak_usage(),
                'real_peak_memory' => memory_get_peak_usage(true),
                'memory_limit' => $this->getMemoryLimit(),
            ],
            'groups' => [],
            'aggregators' => [],
            'records' => [],
        ];

        $profilerStartTime = $profiler->getStartTime();
        $totalDuration = $profiler->getDuration();
        foreach ($profiler->getAllRecords() as $recordId => $record) {
            $group = $record->getGroup();
            $id = spl_object_id($group);
            $jsonArray['groups'][$id] = $group->getName();
            $recordDuration = $record->getDuration();
            $startTime = $record->getStartTime();
            $percentage = $totalDuration <= 0
                ? 0.0
                : ($recordDuration / $totalDuration) * 100;
            $calculateLeftPositionByTotal = ($startTime - $profilerStartTime) / $totalDuration * 100;
            /**
             * @var int $recordId
             */
            $jsonArray['records'][$recordId] = [
                'group' => $id, // group id,
                'id' => $recordId,
                'name' => $record->getName(),
                'stopped' => $record->isStopped(),
                'severity' => $record->getSeverity(),
                'left' => $round($calculateLeftPositionByTotal),
                'timing' => [
                    'start_time' => $round($startTime),
                    'end_time' => $round($record->getEndTime()),
                    'duration' => $round($record->getDuration()),
                    'percentage' => $round($percentage),
                ],
                'memory' => [
                    'start_memory' => $record->getStartMemory(),
                    'end_memory' => $record->getEndMemory(),
                    'used_memory' => $record->getUsedMemory(),
                    'real_start_memory' => $record->getStartRealMemory(),
                    'real_end_memory' => $record->getEndRealMemory(),
                    'real_used_memory' => $record->getUsedRealMemory()
                ],
                'formatted_data' => $formatter->format($record->getData())->getData(),
            ];
        }

        uasort($jsonArray['records'], static function (array $a, array $b): int {
            return $a['timing']['start_time'] <=> $b['timing']['start_time'];
        });

        foreach ($this->getProfiler()->getAggregators() as $aggregator) {
            $records = [];
            foreach ($aggregator->getRecords() as $id => $record) {
                $records[$id] = $record->getStartTime();
            }
            // sort by started time
            uasort($records, static function (float $a, float $b): int {
                return $a <=> $b;
            });
            $records = array_keys($records);
            $jsonArray['aggregators'][spl_object_id($aggregator)] = [
                'name' => $aggregator->getName(),
                'total_execution' => $aggregator->getTotalExecution(),
                'total_duration' => $round($aggregator->getTotalDuration()),
                'minimum_duration' => $round($aggregator->getMinimumDuration()),
                'maximum_duration' => $round($aggregator->getMaximumDuration()),
                'average_duration' => $round($aggregator->getAverageDuration()),
                'records' => $records,
            ];
            unset($records);
        }
        $jsonArray['profiler'] = [
            'severity' => $profiler->getSeverity(),
            'timing' => [
                'start_time' => $round($profiler->getStartTime()),
                'end_time' => $round($profiler->getEndTime()),
                'duration' => $round($profiler->getDuration()),
            ],
            'memory' => [
                'start_memory' => $profiler->getStartMemory(),
                'end_memory' => $profiler->getEndMemory(),
                'used_memory' => $profiler->getUsedMemory(),
                'real_start_memory' => $profiler->getStartRealMemory(),
                'real_end_memory' => $profiler->getEndRealMemory(),
                'real_used_memory' => $profiler->getUsedRealMemory()
            ],
        ];
        // re-set
        $jsonArray['system_wide']['end_memory'] = memory_get_usage();
        $jsonArray['system_wide']['real_end_memory'] = memory_get_usage(true);
        $jsonArray['system_wide']['peak_memory'] = memory_get_peak_usage();
        $jsonArray['system_wide']['real_peak_memory'] = memory_get_peak_usage(true);
        $end_time = microtime(true);
        $jsonArray['system_wide']['end_time'] = $round($profiler->convertMicrotime($end_time));
        $jsonArray['system_wide']['duration'] = $round(
            $profiler->convertMicrotime($end_time) -  $this->getRequestTime()
        );
        return $jsonArray;
    }

    /**
     * @inheritDoc
     * @return array{
     *      system_wide: array{
     *           start_time: float,
     *           end_time: float,
     *           duration: float,
     *           end_memory: int<1, max>,
     *           real_end_memory: int<1, max>,
     *           peak_memory: int<1, max>,
     *           real_peak_memory: int<1, max>,
     *      },
     *      groups: array<int, string>,
     *      aggregators: array<int, array{
     *           name: string,
     *           total_execution: int,
     *           total_duration: float,
     *           minimum_duration: float,
     *           maximum_duration: float,
     *           average_duration: float,
     *           records: array<int, int>,
     *      }>,
     *      records: array<int, array{
     *           group: int,
     *           id: int,
     *           name: string,
     *           stopped: bool,
     *           severity: int,
     *           timing: array{
     *               start_time: float,
     *               end_time: float,
     *               duration: float,
     *               percentage: float,
     *           },
     *           memory: array{
     *               start_memory: int,
     *               end_memory: int,
     *               used_memory: int,
     *               real_start_memory: int,
     *               real_end_memory: int,
     *               real_used_memory: int,
     *           }
     *      }>,
     *      profiler: array{
     *           timing: array{
     *               start_time: float,
     *               end_time: float,
     *               duration: float,
     *           },
     *               memory: array{
     *               start_memory: int,
     *               end_memory: int,
     *               used_memory: int,
     *               real_start_memory: int,
     *               real_end_memory: int,
     *               real_used_memory: int,
     *           }
     *      }
     *  }
     */
    public function jsonSerialize() : array
    {
        return $this->getJsonRenderArray(new PlainFormatter());
    }

    /**
     * Render js
     * @uses RendererInterface::renderJS()
     */
    public function renderJs(?bool $darkMode = null) : ?string
    {
        return $this->getRenderer()->renderJS($darkMode);
    }
}
