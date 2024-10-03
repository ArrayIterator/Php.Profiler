<?php
declare(strict_types=1);

namespace ArrayIterator\Profiler;

use ArrayIterator;
use ArrayIterator\Profiler\Interfaces\ClearableInterface;
use ArrayIterator\Profiler\Interfaces\GroupInterface;
use ArrayIterator\Profiler\Interfaces\ProfilerInterface;
use ArrayIterator\Profiler\Interfaces\RecordInterface;
use RuntimeException;
use Traversable;
use function is_array;
use function iterator_to_array;
use function spl_object_id;
use function uasort;

/**
 * Object group to store / grouping record
 * @uses RecordInterface
 */
class Group implements GroupInterface, ClearableInterface
{
    /**
     * @var string $name the group name / identity
     */
    protected string $name;

    /**
     * @var array<string, array<int, RecordInterface>>
     */
    private array $records = [];

    /**
     * @var array<int, string>
     */
    private array $queue = [];

    /**
     * @var array<int, bool>
     */
    private array $stoppedQueue = [];

    /**
     * @var ProfilerInterface $profiler the profiler
     */
    private ProfilerInterface $profiler;

    /**
     * Group constructor
     *
     * @param ProfilerInterface $profiler
     * @param string $name
     * @internal
     */
    public function __construct(
        ProfilerInterface $profiler,
        string $name
    ) {
        $this->name = $name;
        $this->profiler = $profiler;
        $this->profiler->addGroup($this);
    }

    /**
     * @inheritDoc
     */
    public function getName(): string
    {
        return $this->name;
    }

    /**
     * @inheritDoc
     */
    public function getProfiler(): ProfilerInterface
    {
        return $this->profiler;
    }

    /**
     * @inheritDoc
     */
    public function aggregate(RecordInterface $record) : int
    {
        return $this->getProfiler()->aggregate($record);
    }

    /**
     * @inheritDoc
     */
    public function convertMicrotime(?float $microtime = null): float
    {
        return $this->profiler->convertMicrotime($microtime);
    }

    /**
     * @inheritDoc
     */
    public function start(string $recordName, iterable $initialData = []) : RecordInterface
    {
        $record = new Record($this, $recordName, $initialData);
        if (!$this->getProfiler()->isEnable()) {
            return $record;
        }
        $this->records[$recordName] ??= [];
        $id = spl_object_id($record);
        $this->records[$recordName][$id] = $record;
        $this->queue[$id] = $recordName;
        return $record;
    }

    /**
     * @inheritDoc
     */
    public function has(string $recordName): bool
    {
        return isset($this->records[$recordName]);
    }

    /**
     * @inheritDoc
     */
    public function sort()
    {
        foreach ($this->records as $key => $item) {
            uasort(
                $this->records[$key],
                static function (RecordInterface $a, RecordInterface $b) {
                    return $a->getStartTime() <=> $b->getStartTime();
                }
            );
        }
    }

    /**
     * @inheritDoc
     * @return void
     */
    public function merge(GroupInterface $group): void
    {
        // if disable, skip
        if (!$this->getProfiler()->isEnable()) {
            return;
        }
        if ($group === $this) {
            return;
        }

        foreach ($group->getRecords() as $records) {
            foreach ($records as $record) {
                $record = $record->createGroupClone($this);
                // append to group
                $this->records[$record->getName()][spl_object_id($record)] = $record;
            }
        }
        // re-sort
        $this->sort();
    }

    /**
     * @inheritDoc
     */
    public function last(string $recordName): ?RecordInterface
    {
        $bench = $this->getRecord($recordName);
        $bench = is_array($bench) ? $bench : iterator_to_array($bench);
        return end($bench)?:null;
    }

    /**
     * @inheritDoc
     */
    public function getRecord(string $recordName) : iterable
    {
        foreach (($this->records[$recordName]??[]) as $id => $item) {
            yield $id => $item;
        }
    }

    /**
     * @inheritDoc
     */
    public function stop($recordNameOrObject = null, iterable $additionalData = []): ?RecordInterface
    {
        $id = null;
        if ($recordNameOrObject === null) {
            $id  = array_key_last($this->queue);
            if ($id === null) {
                return null;
            }
            $name = $this->queue[$id]??null;
            if ($name === null) {
                return null;
            }
            $recordNameOrObject = $this->records[$name][$id];
        } elseif (is_string($recordNameOrObject)) {
            $name = null;
            if (!empty($this->queue)) {
                foreach (array_reverse($this->queue, true) as $hashId => $named) {
                    if ($named === $recordNameOrObject) {
                        $id = $hashId;
                        $name = $named;
                        break;
                    }
                }
            }
            if ($name === null) {
                if (!isset($this->records[$recordNameOrObject])) {
                    return null;
                }
                $first = null;
                $id = null;
                foreach (array_reverse($this->records[$recordNameOrObject]) as $hash => $recordNameOrObject) {
                    if (!$first) {
                        $id = $hash;
                        $first = $recordNameOrObject;
                    }
                    if (!$recordNameOrObject->isStopped()) {
                        $id = $hash;
                        $first = $recordNameOrObject;
                        break;
                    }
                }
                $recordNameOrObject = $first;
            } else {
                $recordNameOrObject = $this->records[$name][$id]??null;
            }
        } else {
            if (!$recordNameOrObject instanceof RecordInterface) {
                return null;
            }
            // prevent stop queue by another group
            if ($recordNameOrObject->getGroup() !== $this) {
                return null;
            }
            $id = spl_object_id($recordNameOrObject);
        }
        if ($id === null
            || ! $recordNameOrObject
            || isset($this->stoppedQueue[$id]) // prevent double stop
        ) {
            return null;
        }
        if (isset($this->queue[$id])) {
            unset($this->queue[$id]);
            // aggregate first
            $this->aggregate($recordNameOrObject);
            // record state
            $this->getProfiler()->recordState($recordNameOrObject);
        }
        // do not process if stopped
        if (!$recordNameOrObject->isStopped()) {
            $this->stoppedQueue[$id] = true;
            $recordNameOrObject = $recordNameOrObject->stop($additionalData);
            unset($this->stoppedQueue[$id]);
        }
        return $recordNameOrObject;
    }

    /**
     * @inheritDoc
     */
    public function stopAll(iterable $additionalData = []): array
    {
        $stopped = [];
        foreach ($this->queue as $id => $name) {
            $record = $this->records[$name][$id]??null;
            if (!$record) {
                continue;
            }
            $record = $this->stop($record);
            if ($record === null) {
                continue;
            }
            $stopped[$id] = $record;
        }
        return $stopped;
    }

    /**
     * @inheritDoc
     */
    public function getBenchmarksMemoryUsage() : int
    {
        $total = 0;
        foreach ($this->getAllRecords() as $record) {
            $total += $record->getUsedMemory();
        }
        return $total;
    }

    /**
     * @inheritDoc
     */
    public function getBenchmarksRealMemoryUsage() : int
    {
        $total = 0;
        foreach ($this->getAllRecords() as $record) {
            $total += $record->getUsedRealMemory();
        }
        return $total;
    }

    /**
     * @inheritDoc
     */
    public function getRecords(): array
    {
        return $this->records;
    }

    /**
     * @return iterable<int, RecordInterface>
     */
    public function getAllRecords() : iterable
    {
        foreach ($this->getRecords() as $recordArray) {
            foreach ($recordArray as $id => $record) {
                /**
                 * @var int $id
                 */
                yield $id => $record;
            }
        }
    }

    /**
     * @inheritDoc
     */
    public function clear(): void
    {
        $this->records = [];
        $this->queue = [];
    }

    /**
     * @inheritDoc
     */
    public function count(): int
    {
        return count($this->getRecords());
    }

    /**
     * @inheritDoc
     *
     * @return array{
     *       name: string,
     *       records: array<string, Array<int, RecordInterface>>
     *   }
     */
    public function toArray() : array
    {
        return [
            'name' => $this->getName(),
            'records' => $this->getRecords()
        ];
    }

    /**
     * @inheritDoc
     *
     * @return array{
     *       name: string,
     *       records: array<string, Array<int, RecordInterface>>
     *   }
     */
    public function jsonSerialize() : array
    {
        return $this->toArray();
    }

    /**
     * @return Traversable<string, array<int, RecordInterface>>
     */
    public function getIterator(): Traversable
    {
        return new ArrayIterator($this->getRecords());
    }

    /**
     * Prevent to clone
     */
    public function __clone()
    {
        throw new RuntimeException(
            sprintf(
                'Class %s can not being clone.',
                __CLASS__
            ),
            E_USER_ERROR
        );
    }
}
