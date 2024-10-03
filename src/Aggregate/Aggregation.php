<?php
declare(strict_types=1);

namespace ArrayIterator\Profiler\Aggregate;

use ArrayIterator\Profiler\Aggregate\Interfaces\AggregationInterface;
use ArrayIterator\Profiler\Aggregate\Interfaces\AggregatorInterface;
use ArrayIterator\Profiler\Interfaces\RecordInterface;
use function get_class;
use function spl_object_id;

/**
 * Aggregation object
 */
class Aggregation implements AggregationInterface
{
    /**
     * @var string the aggregation name
     */
    private string $name;

    /**
     * Get records
     *
     * @var array<int, RecordInterface>
     *     Index key as
     * @uses spl_object_id(RecordInterface)
     */
    private array $records = [];

    /**
     * @var array<integer, int> $recordsExecutions record executions
     */
    private array $recordsExecutions = [];

    /**
     * @var int $totalExecution total executions
     */
    private int $totalExecution = 0;

    /**
     * @var float $totalDuration total duration in milliseconds
     */
    private float $totalDuration = 0.0;

    /**
     * @var float $minimumDuration minimum duration in milliseconds
     */
    private float $minimumDuration = 0.0;

    /**
     * @var float $maximumDuration maximum duration in milliseconds
     */
    private float $maximumDuration = 0.0;

    /**
     * @var float $averageDuration average duration in milliseconds
     */
    private float $averageDuration = 0.0;

    /**
     * @param ?string $name
     */
    public function __construct(?string $name = null)
    {
        $this->name = $name??get_class($this);
    }

    /**
     * @inheritDoc
     */
    public function getName() : string
    {
        return $this->name;
    }

    /**
     * @inheritDoc
     */
    final public function aggregate(RecordInterface $record, AggregatorInterface $aggregator) : self
    {
        $id = spl_object_id($record);

        $this->totalExecution++;
        $duration               = $record->getDuration();
        $this->totalDuration   += $duration;
        $this->averageDuration = $this->totalDuration / $this->totalExecution;
        if ($duration > $this->maximumDuration) {
            $this->maximumDuration = $duration;
        }
        if ($duration < $this->minimumDuration || $this->minimumDuration <= 0.0) {
            $this->minimumDuration = $duration;
        }

        $this->recordsExecutions[$id] ??= 0;
        $this->recordsExecutions[$id]++;

        $this->records[$id] = $record;
        $this->afterAggregate($record, $aggregator);
        return $this;
    }

    /**
     * Call when aggregated
     * @param RecordInterface $record
     * @param AggregatorInterface $aggregator
     * @abtract
     * @phpstan-return mixed|void
     */
    protected function afterAggregate(RecordInterface $record, AggregatorInterface $aggregator)
    {
        // override
    }

    /**
     * @inheritDoc
     */
    public function getTotalExecution() : int
    {
        return $this->totalExecution;
    }

    /**
     * @inheritDoc
     */
    public function getRecordsExecutions(): array
    {
        return $this->recordsExecutions;
    }

    /**
     * @inheritDoc
     */
    public function getRecordsExecution(RecordInterface $record): ?int
    {
        return $this->recordsExecutions[spl_object_id($record)]??null;
    }

    /**
     * @inheritDoc
     */
    public function getTotalDuration() : float
    {
        return $this->totalDuration;
    }

    /**
     * @return float
     */
    public function getMinimumDuration() : float
    {
        return $this->minimumDuration;
    }

    /**
     * @inheritDoc
     */
    public function getMaximumDuration() : float
    {
        return $this->maximumDuration;
    }

    /**
     * @inheritDoc
     */
    public function getAverageDuration() : float
    {
        return $this->averageDuration;
    }

    /**
     * @inheritDoc
     */
    public function getRecords() : array
    {
        return $this->records;
    }

    /***
     * @inheritDoc
     * @return array{
     *      name: string,
     *      execution: array{
     *          total: int,
     *          records: array<int, int>
     *      },
     *      duration: array{
     *          total: float,
     *          minimum: float,
     *          maximum: float,
     *          average: float
     *      }
     * }
     */
    public function toArray() : array
    {
        return [
            'name' => $this->getName(),
            'execution' => [
                'total' => $this->getTotalExecution(),
                'records' => $this->getRecordsExecutions(),
            ],
            'duration' => [
                'total'   => $this->getTotalDuration(),
                'minimum' => $this->getMinimumDuration(),
                'maximum' => $this->getMaximumDuration(),
                'average' => $this->getAverageDuration(),
            ],
            // 'records' => $this->getRecords(),
        ];
    }

    /***
     * @inheritDoc
     * @return array{
     *       name: string,
     *       execution: array{
     *           total: int,
     *           records: array<int, int>
     *       },
     *       duration: array{
     *           total: float,
     *           minimum: float,
     *           maximum: float,
     *           average: float
     *       }
     *  }
     */
    public function jsonSerialize() : array
    {
        return $this->toArray();
    }
}
