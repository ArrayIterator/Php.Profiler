<?php
declare(strict_types=1);

namespace ArrayIterator\Profiler\Interfaces;

use JsonSerializable;

/**
 * Object to record the benchmark data
 */
interface RecordInterface extends
    NamingInterface,
    DurationInterface,
    MemoryInterface,
    SeverityInterface,
    MicrotimeConversionInterface,
    JsonSerializable
{
    /**
     * RecordInterface constructor
     *
     * @param GroupInterface $group
     * @param string $recordName
     * @param iterable<scalar, mixed> $data
     */
    public function __construct(
        GroupInterface $group,
        string         $recordName,
        iterable       $data = []
    );

    /**
     * Create new cloned object with clone
     *
     * @param GroupInterface $group
     * @return static clone of cloned object, and return self if group is identical
     */
    public function createGroupClone(GroupInterface $group) : RecordInterface;

    /**
     * Check if record stopped
     *
     * @return bool true if stopped
     */
    public function isStopped(): bool;

    /**
     * Stop the record
     *
     * @param iterable<scalar, mixed> $data
     * @phpstan-return mixed
     */
    public function stop(iterable $data = []);

    /**
     * Get the group
     *
     * @return GroupInterface
     */
    public function getGroup(): GroupInterface;

    /**
     * Get record metadata
     *
     * @return CollectionInterface<scalar, mixed>
     */
    public function getData(): CollectionInterface;

    /**
     * To Array
     *
     * @return array{
     *     group: string,
     *     name: string,
     *     stopped: bool,
     *     timing: array{
     *         start: float,
     *         end: float,
     *         duration: float
     *     },
     *     memory: array{
     *         normal: array{
     *             start: int,
     *             end: int,
     *         },
     *         real: array{
     *              start: int,
     *              end: int,
     *         }
     *     },
     *     data: array<scalar, mixed>
     * }
     */
    public function toArray(): array;

    /**
     * @inheritDoc
     * @return array{
     *      group: string,
     *      name: string,
     *      stopped: bool,
     *      timing: array{
     *          start: float,
     *          end: float,
     *          duration: float
     *      },
     *      memory: array{
     *          normal: array{
     *              start: int,
     *              end: int,
     *          },
     *          real: array{
     *               start: int,
     *               end: int,
     *          }
     *      },
     *      data: array<scalar, mixed>
     *  }
     */
    public function jsonSerialize() : array;
}
