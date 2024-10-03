<?php
declare(strict_types=1);

namespace ArrayIterator\Profiler\Interfaces;

use ArrayIterator\Profiler\Aggregate\Interfaces\AggregateInterface;
use ArrayIterator\Profiler\Aggregate\Interfaces\AggregatorInterface;
use Countable;
use IteratorAggregate;
use JsonSerializable;
use Traversable;

/**
 * Profiler interface
 *
 * @template-extends IteratorAggregate<string, GroupInterface>
 */
interface ProfilerInterface extends
    MemoryInterface,
    DurationInterface,
    SeverityInterface,
    MicrotimeConversionInterface,
    AggregateInterface,
    IteratorAggregate,
    Countable,
    ClearableInterface,
    JsonSerializable
{
    /**
     * Default profiler name
     * @phpstan-type DEFAULT_NAME string
     */
    public const DEFAULT_GROUP = 'default';

    /**
     * ProfilerInterface constructor
     *
     * @param bool $enable
     * @param array<scalar, AggregatorInterface> $aggregators
     */
    public function __construct(bool $enable = true, iterable $aggregators = []);

    /**
     * Set enable
     *
     * @param bool $enable true if enabled
     * @phpstan-return mixed
     */
    public function setEnable(bool $enable);

    /**
     * Check if profiler is enabled
     *
     * @return bool true if enabled
     */
    public function isEnable() : bool;

    /**
     * Aggregate the record
     *
     * @param RecordInterface $record
     * @return integer total aggregated record
     */
    public function aggregate(RecordInterface $record) : int;

    /**
     * Get group if exists
     *
     * @param string $groupName the group name
     * @return ?GroupInterface
     */
    public function getGroup(string $groupName): ?GroupInterface;

    /**
     * Check if profiler has group
     *
     * @param string $name the group name
     * @return bool true if object has group
     */
    public function hasGroup(string $name): bool;

    /**
     * Add the group into collections if not exists
     *
     * @param GroupInterface $group the group
     * @phpstan-return mixed
     */
    public function addGroup(GroupInterface $group);

    /**
     * Get or create new group
     *
     * @param string $groupName
     * @return GroupInterface the object group
     */
    public function group(string $groupName) : GroupInterface;

    /**
     * Get group list
     *
     * @return array<string, GroupInterface>
     */
    public function getGroups(): array;

    /**
     * Get all records in groups
     *
     * @return array<int, RecordInterface>
     */
    public function getAllRecords(): iterable;

    /**
     * Start record
     *
     * @param string $recordName
     * @param string $groupName
     * @param iterable<scalar, mixed> $initialData
     * @return RecordInterface
     */
    public function start(
        string $recordName,
        string $groupName = self::DEFAULT_GROUP,
        iterable $initialData = []
    ): RecordInterface;

    /**
     * Stop the record
     *
     * @param ?string $recordName the record name or object group
     * @param string $groupName
     * @param iterable<scalar, mixed> $additionalData
     * @return ?RecordInterface the stopped record
     */
    public function stop(
        ?string $recordName = null,
        string $groupName = self::DEFAULT_GROUP,
        iterable $additionalData = []
    ): ?RecordInterface;

    /**
     * Stop the records
     *
     * @param ?string $recordName the record name or object group
     * @param string $groupName
     * @param iterable<scalar, mixed> $additionalData
     * @return array<int, RecordInterface> the stopped records
     */
    public function stopAll(
        ?string $recordName = null,
        string $groupName = self::DEFAULT_GROUP,
        iterable $additionalData = []
    ): array;

    /**
     * write record ending to the profiler
     * This should call by group stop
     *
     * @param RecordInterface $record
     * @phpstan-return mixed
     */
    public function recordState(RecordInterface $record);

    /**
     * Append aggregators
     *
     * @param AggregatorInterface $aggregator
     * @phpstan-return mixed
     */
    public function addAggregator(AggregatorInterface $aggregator);

    /**
     * Remove aggregator
     *
     * @param AggregatorInterface $aggregator
     * @phpstan-return mixed
     */
    public function removeAggregator(AggregatorInterface $aggregator);

    /**
     * Check if it has aggregator
     *
     * @param AggregatorInterface $aggregator
     * @return bool true if object stored aggregator
     */
    public function hasAggregator(AggregatorInterface $aggregator): bool;

    /**
     * The aggregator
     *
     * @return iterable<AggregatorInterface>
     */
    public function getAggregators(): iterable;

    /**
     * To array - records of profilers
     *
     * @return array{
     *           timing: array{
     *               start: float,
     *               end: float,
     *               duration: float,
     *           },
     *           memory: array{
     *               normal:array{
     *                   start: integer,
     *                   end: integer,
     *               },
     *               real:array{
     *                    start: integer,
     *                    end: integer,
     *               }
     *           },
     *          groups: array<string, GroupInterface>,
     *       }
     */
    public function toArray() : array;

    /**
     * @inheritDoc
     * JsonSerializable implementation - records of profilers
     *
     * @return array{
     *          timing: array{
     *              start: float,
     *              end: float,
     *              duration: float,
     *          },
     *          memory: array{
     *              normal:array{
     *                  start: integer,
     *                  end: integer,
     *              },
     *              real:array{
     *                   start: integer,
     *                   end: integer,
     *              }
     *          },
     *          groups: array<string, GroupInterface>,
     *      }
     */
    public function jsonSerialize() : array;

    /**
     * Implementation of Traversable
     *
     * @see \ArrayIterator
     */
    public function getIterator() : Traversable;
}
