<?php
declare(strict_types=1);

namespace ArrayIterator\Profiler\Aggregate\Interfaces;

use ArrayIterator\Profiler\Interfaces\RecordInterface;
use JsonSerializable;

/**
 * Aggregation object
 */
interface AggregationInterface extends JsonSerializable
{
    /**
     * @return string aggregation name
     */
    public function getName() : string;

    /**
     * Aggregate the record
     *
     * @param RecordInterface $record
     * @param AggregatorInterface $aggregator
     *
     * @return static
     */
    public function aggregate(RecordInterface $record, AggregatorInterface $aggregator) : self;

    /**
     * Get total execution of aggregation
     *
     * @return int
     */
    public function getTotalExecution() : int;

    /**
     * Get total executions
     *
     * @uses \spl_object_id(RecordInterface);
     * @return array<integer, int>
     */
    public function getRecordsExecutions(): array;

    /**
     * @param RecordInterface $record
     *
     * @return ?int null if never aggregated / not exists
     */
    public function getRecordsExecution(RecordInterface $record): ?int;

    /**
     * Get total duration
     *
     * @return float milliseconds of duration
     */
    public function getTotalDuration() : float;

    /**
     * Get minimum duration
     *
     * @return float milliseconds of duration
     */
    public function getMinimumDuration() : float;

    /**
     * Get maximum duration
     *
     * @return float milliseconds of duration
     */
    public function getMaximumDuration() : float;

    /**
     * Get average duration
     *
     * @return float milliseconds of duration
     */
    public function getAverageDuration() : float;

    /**
     * @return array<int, RecordInterface>
     */
    public function getRecords() : array;

    /**
     * To array
     *
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
    public function toArray(): array;

    /**
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
    public function jsonSerialize() : array;
}
