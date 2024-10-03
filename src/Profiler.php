<?php
declare(strict_types=1);

namespace ArrayIterator\Profiler;

use ArrayIterator;
use ArrayIterator\Profiler\Aggregate\Interfaces\AggregatorInterface;
use ArrayIterator\Profiler\Interfaces\CollectionInterface;
use ArrayIterator\Profiler\Interfaces\GroupInterface;
use ArrayIterator\Profiler\Interfaces\ProfilerInterface;
use ArrayIterator\Profiler\Interfaces\RecordInterface;
use ArrayIterator\Profiler\Traits\DurationTimeTrait;
use ArrayIterator\Profiler\Traits\MemoryTrait;
use ArrayIterator\Profiler\Traits\SeverityTrait;
use SplObjectStorage;
use Traversable;
use function count;
use function debug_backtrace;
use function is_subclass_of;
use function iterator_to_array;
use function max;
use function memory_get_usage;
use function microtime;
use const DEBUG_BACKTRACE_IGNORE_ARGS;

/**
 * The Profiler
 */
class Profiler implements ProfilerInterface
{
    use DurationTimeTrait,
        SeverityTrait,
        MemoryTrait;

    /**
     * @var CollectionInterface<string, GroupInterface> $groups
     */
    protected CollectionInterface $groups;

    /**
     * @var SplObjectStorage<AggregatorInterface, mixed>
     */
    private SplObjectStorage $aggregators;

    /**
     * @var bool true if enable
     */
    private bool $enable = true;

    /**
     * @var Waterfall Waterfall instance
     */
    private Waterfall $waterfall;

    /**
     * The profiler constructor
     *
     * @param array<scalar, AggregatorInterface> $initialAggregators initial provider aggregators
     */
    public function __construct(bool $enable = true, iterable $initialAggregators = [])
    {
        $this->startMemory     = memory_get_usage();
        $this->startRealMemory = memory_get_usage(true);
        $this->startTime       = $this->convertMicrotime();
        $this->aggregators     = new SplObjectStorage();
        $this->groups          = new Collection();
        $this->setEnable($enable);
        foreach ($initialAggregators as $aggregator) {
            if ($aggregator instanceof AggregatorInterface) {
                $this->addAggregator($aggregator);
            }
        }
    }

    /***
     * @inheritDoc
     */
    public function recordState(RecordInterface $record) : void
    {
        if (!$record->isStopped()) {
            return;
        }
        $class = (debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 2)[1]??[])['class']??null;
        if (!$class || !is_subclass_of($class, GroupInterface::class)) {
            return;
        }
        $endTime = $record->getEndTime();
        if ($this->endTime && $this->endTime > $endTime) {
            return;
        }
        $this->endMemory = memory_get_usage();
        $this->endRealMemory = memory_get_usage(true);
        $this->endTime = $endTime;
    }

    /**
     * @inheritDoc
     */
    public function setEnable(bool $enable)
    {
        $this->enable = $enable;
    }

    /**
     * @inheritDoc
     */
    public function isEnable(): bool
    {
        return $this->enable;
    }

    /**
     * @inheritDoc
     */
    public function addAggregator(AggregatorInterface $aggregator)
    {
        $this->aggregators->attach($aggregator);
    }

    /**
     * @inheritDoc
     */
    public function removeAggregator(AggregatorInterface $aggregator)
    {
        $this->aggregators->detach($aggregator);
    }

    /**
     * @inheritDoc
     */
    public function hasAggregator(AggregatorInterface $aggregator): bool
    {
        return $this->aggregators->contains($aggregator);
    }

    /**
     * @inheritDoc
     * @return array<AggregatorInterface>
     */
    public function getAggregators(): array
    {
        return iterator_to_array($this->aggregators);
    }

    /**
     * @inheritDoc
     */
    public function aggregate(RecordInterface $record) : int
    {
        $aggregated = 0;
        foreach ($this->getAggregators() as $aggregator) {
            $aggregated += $aggregator->aggregate($record) ? 1 : 0;
        }

        return $aggregated;
    }

    /**
     * @inheritDoc
     */
    public function convertMicrotime(?float $microtime = null): float
    {
        return (float) (($microtime ?? microtime(true)) * self::EXPONENT);
    }

    /**
     * @inheritDoc
     */
    public function hasGroup(string $name): bool
    {
        return isset($this->groups[$name]);
    }

    /**
     * @inheritDoc
     * @param GroupInterface<string, array<integer, RecordInterface>> $group
     */
    public function addGroup(GroupInterface $group)
    {
        $this->groups[$group->getName()] ??= $group;
    }

    /**
     * @inheritDoc
     */
    public function getGroup(string $groupName): ?GroupInterface
    {
        return $this->groups[$groupName]??null;
    }

    /**
     * @inheritDoc
     */
    public function group(string $groupName) : GroupInterface
    {
        if (isset($this->groups[$groupName])) {
            return $this->groups[$groupName];
        }
        $group = new Group($this, $groupName);
        /**
         * @var GroupInterface<string, array<integer, RecordInterface> $group
         */
        return $this->groups[$groupName] = $group;
    }

    /**
     * @inheritDoc
     */
    public function getGroups(): array
    {
        return $this->groups->getData();
    }

    /**
     * @inheritdoc
     */
    public function getAllRecords(): iterable
    {
        foreach ($this->getGroups() as $group) {
            foreach ($group->getAllRecords() as $id => $record) {
                yield $id => $record;
            }
        }
    }

    /**
     * @inheritDoc
     */
    public function start(
        string $recordName,
        string $groupName = self::DEFAULT_GROUP,
        iterable $initialData = []
    ): RecordInterface {
        return $this->group($groupName)->start($recordName, $initialData);
    }

    /**
     * @inheritDoc
     */
    public function stop(
        ?string $recordName = null,
        string $groupName = self::DEFAULT_GROUP,
        iterable $additionalData = []
    ): ?RecordInterface {
        $group = $this->getGroup($groupName);
        return $group ? $group->stop($recordName, $additionalData) : null;
    }

    /**
     * @inheritDoc
     */
    public function stopAll(
        ?string $recordName = null,
        string $groupName = self::DEFAULT_GROUP,
        iterable $additionalData = []
    ): array {
        $group = $this->getGroup($groupName);
        if (!$group) {
            return [];
        }
        $result = [];
        foreach (($recordName !== null ? $group->getRecord($recordName) : $group->getAllRecords()) as $key => $record) {
            if ($record->isStopped()) {
                continue;
            }
            $record = $group->stop($record, $additionalData);
            if ($record) {
                $result[$key] = $record;
            }
        }
        return $result;
    }

    /**
     * Get waterfall instance
     *
     * @return Waterfall
     */
    public function getWaterfall(): Waterfall
    {
        return $this->waterfall ??= new Waterfall($this);
    }

    /**
     * @inheritDoc
     */
    public function clear(): void
    {
        $this->groups->clear();
    }

    /**
     * @inheritDoc
     */
    public function count(): int
    {
        return count($this->groups);
    }

    /**
     * @inheritDoc
     */
    public function getIterator(): Traversable
    {
        return new ArrayIterator($this->getGroups());
    }

    /**
     * @inheritDoc
     * @return array{
     *         timing: array{
     *             start: float,
     *             end: float,
     *             duration: float,
     *         },
     *         memory: array{
     *             normal:array{
     *                 start: int,
     *                 end: int,
     *             },
     *             real:array{
     *                  start: int,
     *                  end: int,
     *             }
     *         },
     *         groups: array<string, GroupInterface>,
     *     }
     */
    public function toArray(): array
    {
        $startTime       = $this->getStartTime();
        $duration        = $this->getDuration();
        $startMemory     = $this->getStartMemory();
        $usedMemory      = $this->getUsedMemory();
        $startRealMemory = $this->getStartRealMemory();
        $usedRealMemory  = $this->getUsedRealMemory();
        return [
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
            'groups' => $this->getGroups(),
        ];
    }

    /**
     * @inheritDoc
     * @return array{
     *        timing: array{
     *            start: float,
     *            end: float,
     *            duration: float,
     *        },
     *        memory: array{
     *            normal:array{
     *                start: int,
     *                end: int,
     *            },
     *            real:array{
     *                 start: int,
     *                 end: int,
     *            }
     *        },
     *        groups: array<string, GroupInterface>,
     *    }
     */
    public function jsonSerialize() : array
    {
        return $this->toArray();
    }
}
