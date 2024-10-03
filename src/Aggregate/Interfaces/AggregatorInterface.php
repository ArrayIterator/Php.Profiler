<?php
declare(strict_types=1);

namespace ArrayIterator\Profiler\Aggregate\Interfaces;

use ArrayIterator\Profiler\Interfaces\RecordInterface;
use ArrayIterator\Profiler\Interfaces\SeverityInterface;
use JsonSerializable;

/**
 * The aggregator
 */
interface AggregatorInterface extends SeverityInterface, AggregateInterface, JsonSerializable
{
    /**
     * Get aggregator name
     *
     * @return string the aggregator name
     */
    public function getName() : string;

    /**
     * Get record group name
     *
     * @return string the record group name
     */
    public function getGroupName() : string;

    /**
     * @param RecordInterface $record the record
     *
     * @return bool
     */
    public function accepted(RecordInterface $record) : bool;

    /**
     * @param RecordInterface $record
     *
     * @return bool
     */
    public function aggregate(RecordInterface $record) : bool;

    /**
     * @return array<string, AggregationInterface>
     */
    public function getAggregations() : array;

    /**
     * Get aggregation get or create new aggregation
     *
     * @param string $identity
     *
     * @return AggregationInterface
     */
    public function getAggregation(string $identity) : AggregationInterface;

    /**
     * Get the internal aggregation
     *
     * @return AggregationInterface
     */
    public function getInternalAggregation() : AggregationInterface;

    /**
     * Get total of duration
     *
     * @return float total duration in milliseconds
     */
    public function getTotalDuration() : float;

    /**
     * Get minimum duration
     *
     * @return float minimum duration in milliseconds
     */
    public function getMinimumDuration() : float;

    /**
     * Get maximum duration
     *
     * @return float maximum duration in milliseconds
     */
    public function getMaximumDuration() : float;

    /**
     * Get average duration
     *
     * @return float average duration in milliseconds
     */
    public function getAverageDuration() : float;

    /**
     * Get total executions
     *
     * @return int total of executions
     */
    public function getTotalExecution() : int;

    /**
     * Get list of aggregated records
     *
     * @return array<integer, RecordInterface>
     */
    public function getRecords() : array;

    /**
     * Get array definitions
     *
     * @return array{
     *      name: string,
     *      severity: int,
     *      execution: array{
     *          total: int,
     *      },
     *      duration: array{
     *          total: float,
     *          minimum: float,
     *          maximum: float,
     *          average: float,
     *      },
     *      "aggregations": array<string, AggregationInterface>
     *  }
     */
    public function toArray() : array;

    /**
     * Get array definitions
     *
     * @return array{
     *     name: string,
     *     severity: int,
     *     execution: array{
     *         total: int,
     *     },
     *     duration: array{
     *         total: float,
     *         minimum: float,
     *         maximum: float,
     *         average: float,
     *     },
     *     "aggregations": array<string, AggregationInterface>
     * }
     */
    public function jsonSerialize() : array;
}
