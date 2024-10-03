<?php
declare(strict_types=1);

namespace ArrayIterator\Profiler\Interfaces;

use ArrayIterator\Profiler\Aggregate\Interfaces\AggregateInterface;
use Countable;
use IteratorAggregate;
use JsonSerializable;

/**
 * Object group to store / grouping record
 *
 * @uses RecordInterface
 * @template-extends IteratorAggregate<string, array<int, RecordInterface>>
 */
interface GroupInterface extends
    SortableRecordInterface,
    AggregateInterface,
    NamingInterface,
    MicrotimeConversionInterface,
    IteratorAggregate,
    Countable,
    JsonSerializable
{
    /**
     * Get the profiler
     * @return ProfilerInterface the profiler
     */
    public function getProfiler(): ProfilerInterface;

    /**
     * Aggregate the records
     *
     * @param RecordInterface $record the record
     * @return int total aggregated data
     */
    public function aggregate(RecordInterface $record) : int;

    /**
     * Check if group has a record by name / identity
     *
     * @param string $recordName the record name / identity
     * @return bool true if exists otherwise false
     */
    public function has(string $recordName): bool;

    /**
     * Merge the group
     *
     * @param GroupInterface $group the group
     * @phpstan-return mixed
     */
    public function merge(GroupInterface $group);

    /**
     * Get last record by record name / identity
     *
     * @param string $recordName the record name / identity
     * @return ?RecordInterface the stored record
     */
    public function last(string $recordName): ?RecordInterface;

    /**
     * Get records by record name in a current group
     *
     * @param string $recordName the record name
     * @return iterable<integer, RecordInterface>
     */
    public function getRecord(string $recordName) : iterable;

    /**
     * Get all group records
     *
     * @return array<string, Array<integer, RecordInterface>> record lists
     */
    public function getRecords() : array;

    /**
     * Get all records
     *
     * @return iterable<integer, RecordInterface>
     */
    public function getAllRecords() : iterable;

    /**
     * Start the record
     *
     * @param string $recordName the record name / identity
     * @param iterable<scalar, mixed> $initialData initial data to set on record
     * @return RecordInterface the record
     */
    public function start(string $recordName, iterable $initialData = []) : RecordInterface;

    /**
     * Stop the record
     *
     * @param RecordInterface|string|null $recordNameOrObject if null use latest
     * @param iterable<scalar, mixed> $additionalData additional data when record stop
     * @return ?RecordInterface the stopped record
     */
    public function stop($recordNameOrObject = null, iterable $additionalData = []): ?RecordInterface;

    /**
     * Stop all records
     *
     * @param iterable<scalar, mixed> $additionalData additional data to merge
     * @return array<integer, RecordInterface> the record list
     */
    public function stopAll(iterable $additionalData = []): array;

    /**
     * Get total registered benchmark memory usage
     *
     * @uses \memory_get_usage()
     * @return int total used memory
     */
    public function getBenchmarksMemoryUsage() : int;

    /**
     * Get total registered benchmark real memory usage
     *
     * @uses \memory_get_usage(true)
     * @return int total real memory used by records
     */
    public function getBenchmarksRealMemoryUsage() : int;

    /**
     * Get array definition
     *
     * @return array{
     *       name: string,
     *       records: array<string, Array<integer, RecordInterface>>
     *   }
     */
    public function toArray(): array;

    /**
     * @inheritDoc
     *
     * @return array{
     *       name: string,
     *       records: array<string, Array<integer, RecordInterface>>
     *   }
     */
    public function jsonSerialize() : array;
}
