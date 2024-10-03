<?php
declare(strict_types=1);

namespace ArrayIterator\Profiler;

use ArrayIterator\Profiler\Interfaces\CollectionInterface;
use ArrayIterator\Profiler\Interfaces\GroupInterface;
use ArrayIterator\Profiler\Interfaces\RecordInterface;
use ArrayIterator\Profiler\Traits\DurationTimeTrait;
use ArrayIterator\Profiler\Traits\MemoryTrait;
use ArrayIterator\Profiler\Traits\SeverityTrait;

/**
 * Object to record the benchmark data
 * @template-covariant TKey of scalar
 * @template-covariant TValue of mixed
 */
class Record implements RecordInterface
{
    use SeverityTrait,
        MemoryTrait,
        DurationTimeTrait;

    /**
     * @var GroupInterface $group the group record
     */
    protected GroupInterface $group;

    /**
     * @var string $name record name / identity
     */
    protected string $name;

    /**
     * @var CollectionInterface<scalar, mixed> $data the stored object data
     */
    protected CollectionInterface $data;

    /**
     * @var bool $stopped status of current record
     */
    private bool $stopped = false;

    /**
     * @inheritDoc
     * @param iterable<TKey, TValue> $data
     */
    public function __construct(
        GroupInterface $group,
        string         $recordName,
        iterable       $data = []
    ) {
        $this->name = $recordName;
        $this->group = $group;
        $this->startTime = $this->convertMicrotime();
        $this->startMemory = memory_get_usage();
        $this->startRealMemory = memory_get_usage(true);
        $this->data = new Collection($data);
    }

    /**
     * @inheritDoc
     */
    public function createGroupClone(GroupInterface $group) : RecordInterface
    {
        if ($group === $this->getGroup()) {
            return $this;
        }
        $cloned = clone $this;
        $cloned->group = $group;
        return $cloned;
    }

    /**
     * @inheritDoc
     */
    public function getGroup(): GroupInterface
    {
        return $this->group;
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
    public function convertMicrotime(?float $microtime = null): float
    {
        return $this->group->convertMicrotime($microtime);
    }

    /**
     * @inheritDoc
     */
    public function getData(): CollectionInterface
    {
        return $this->data;
    }

    /**
     * @inheritDoc
     */
    public function isStopped(): bool
    {
        return $this->stopped;
    }

    /**
     * @inheritDoc
     */
    public function stop(iterable $data = []): RecordInterface
    {
        if ($this->isStopped()) {
            return $this;
        }

        $this->stopped = true;
        $this->data->merge($data); // set data first

        $this->endTime = $this->convertMicrotime();
        $this->endMemory = memory_get_usage();
        $this->endRealMemory = memory_get_usage(true);
        $this->usedMemory = $this->measureMemory(
            $this->getStartMemory(),
            false,
            $this->endMemory
        );
        $this->usedRealMemory = $this->measureMemory(
            $this->getStartRealMemory(),
            true,
            $this->endRealMemory
        );
        $this->group->stop($this);
        return $this;
    }

    /**
     * To Array
     *
     * @return array{
     *     "group": string,
     *     "name": string,
     *     "stopped": bool,
     *     "timing": array{
     *         "start": float,
     *         "end": float,
     *         "duration": float
     *     },
     *     "memory": array{
     *         "normal":array{
     *             start: int,
     *             end: int,
     *         },
     *         "real":array{
     *              start: int,
     *              end: int,
     *         }
     *     },
     *     "data": array<scalar, mixed>
     * }
     */
    public function toArray(): array
    {
        $startTime = $this->getStartTime();
        $duration = $this->getDuration();
        $startMemory = $this->getStartMemory();
        $usedMemory = $this->getUsedMemory();
        $startRealMemory = $this->getStartRealMemory();
        $usedRealMemory = $this->getUsedRealMemory();
        return [
            'group' => $this->group->getName(),
            'name' => $this->getName(),
            'stopped' => $this->isStopped(),
            'timing' => [
                'start' => $startTime,
                'end' => max($duration - $startTime, 0),
                'duration' => $duration
            ],
            'memory' => [
                'normal' => [
                    'start' => $startMemory,
                    'end' => max($usedMemory - $startMemory, 0),
                ],
                'real' => [
                    'start' => $startRealMemory,
                    'end' => max($usedRealMemory - $startRealMemory, 0),
                ],
            ],
            'data' => $this->getData()->getData()
        ];
    }

    /**
     * @inheritDoc
     */
    public function jsonSerialize(): array
    {
        return $this->toArray();
    }
}
