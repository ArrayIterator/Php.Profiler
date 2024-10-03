<?php
declare(strict_types=1);

namespace ArrayIterator\Profiler\Aggregate;

use ArrayIterator\Profiler\Aggregate\Interfaces\AggregationInterface;
use ArrayIterator\Profiler\Aggregate\Interfaces\AggregatorInterface;
use ArrayIterator\Profiler\Interfaces\DurationInterface;
use ArrayIterator\Profiler\Interfaces\RecordInterface;
use ArrayIterator\Profiler\Interfaces\SeverityInterface;
use ArrayIterator\Profiler\Traits\SeverityTrait;
use Countable;
use function get_class;

/**
 * The aggregator
 */
class AbstractAggregator implements
    SeverityInterface,
    AggregatorInterface,
    Countable
{
    use SeverityTrait {
        getSeverity as public getFactorySeverity;
    }

    /**
     * @var string $name the record name to accepted
     */
    protected string $name;

    /**
     * @var string $groupName the record group name to accepted
     */
    protected string $groupName = '';

    /**
     * @var array<string, AggregationInterface> $aggregations
     */
    protected array $aggregations = [];

    /**
     * @var AggregationInterface $internalAggregation the internal aggregation
     */
    protected AggregationInterface $internalAggregation;

    /**
     * @var int $countedAsNotice the counted as notice
     */
    protected int $infoExecutionCount = DurationInterface::TIMESPAN_INFO;

    /**
     * @var int $noticeExecutionCount the counted as notice
     */
    protected int $noticeExecutionCount = DurationInterface::TIMESPAN_NOTICE;

    /**
     * @var int $warningExecutionCount the counted as warning
     */
    protected int $warningExecutionCount = DurationInterface::TIMESPAN_WARNING;

    /**
     * @var int $criticalExecutionCount the counted as critical
     */
    protected int $criticalExecutionCount = DurationInterface::TIMESPAN_CRITICAL;

    /**
     * @inheritDoc
     */
    public function getName() : string
    {
        return $this->name ??= get_class($this);
    }

    /**
     * @inheritDoc
     */
    public function getGroupName() : string
    {
        return $this->groupName;
    }

    /**
     * @inheritDoc
     * @return float
     */
    public function getDuration(): float
    {
        return $this->getTotalDuration();
    }

    /**
     * @inheritDoc
     */
    public function aggregate(RecordInterface $record) : bool
    {
        if (!$this->accepted($record)) {
            return false;
        }

        // dispatch internal first
        $this
            ->getInternalAggregation()
            ->aggregate($record, $this);
        $this
            ->getAggregation($this->getIdentity($record))
            ->aggregate($record, $this);

        return true;
    }

    /**
     * Get record identity (record name)
     *
     * @param RecordInterface $record
     * @return string the record name
     */
    public function getIdentity(RecordInterface $record) : string
    {
        return $record->getGroup()->getName();
    }

    /**
     * @inheritDoc
     */
    public function accepted(RecordInterface $record) : bool
    {
        return $this->getIdentity($record) === $this->getGroupName();
    }

    /**
     * @inheritDoc
     */
    public function getAggregations() : array
    {
        return $this->aggregations;
    }

    /**
     * @inheritDoc
     */
    public function getAggregation(string $identity) : AggregationInterface
    {
        return $this->aggregations[$identity] ??= new Aggregation($identity);
    }

    /**
     * @inheritDoc
     */
    public function getInternalAggregation() : AggregationInterface
    {
        if (isset($this->internalAggregation)) {
            return $this->internalAggregation;
        }
        $aggregation = new InternalAggregation();
        /**
         * @var AggregationInterface $aggregation
         */
        return $this->internalAggregation ??= $aggregation;
    }

    /**
     * @inheritDoc
     */
    public function getTotalDuration() : float
    {
        return $this->getInternalAggregation()->getTotalDuration();
    }

    /**
     * @inheritDoc
     */
    public function getMinimumDuration() : float
    {
        return $this->getInternalAggregation()->getMinimumDuration();
    }

    /**
     * @inheritDoc
     */
    public function getMaximumDuration() : float
    {
        return $this->getInternalAggregation()->getMaximumDuration();
    }

    /**
     * @inheritDoc
     */
    public function getAverageDuration() : float
    {
        return $this->getInternalAggregation()->getAverageDuration();
    }

    /**
     * @inheritDoc
     */
    public function getTotalExecution() : int
    {
        return $this->getInternalAggregation()->getTotalExecution();
    }

    /**
     * Get info execution count
     *
     * @return int
     */
    public function getInfoExecutionCount(): int
    {
        return $this->infoExecutionCount;
    }

    /**
     * Get notice execution count
     *
     * @return int
     */
    public function getNoticeExecutionCount(): int
    {
        return $this->noticeExecutionCount;
    }

    /**
     * Get warning execution count
     *
     * @return int
     */
    public function getWarningExecutionCount(): int
    {
        return $this->warningExecutionCount;
    }

    /**
     * Get critical execution count
     *
     * @return int
     */
    public function getCriticalExecutionCount(): int
    {
        return $this->criticalExecutionCount;
    }

    /**
     * @inheritDoc
     */
    public function isCritical() : bool
    {
        return ($this->getSeverity() & self::CRITICAL) === self::CRITICAL;
    }

    /**
     * @inheritDoc
     */
    public function isWarning() : bool
    {
        return ($this->getSeverity() & self::WARNING) === self::WARNING;
    }

    /**
     * @inheritDoc
     */
    public function isNotice() : bool
    {
        return ($this->getSeverity() & self::NOTICE) === self::NOTICE;
    }

    /**
     * @inheritDoc
     */
    public function isInfo() : bool
    {
        return ($this->getSeverity() & self::INFO) === self::INFO;
    }

    /**
     * @inheritDoc
     */
    public function getSeverity() : int
    {
        $severity = $this->getFactorySeverity();
        $total    = $this->getTotalExecution();
        if (($severity & self::CRITICAL) === self::CRITICAL) {
            return self::CRITICAL;
        }
        if ($total >= $this->getCriticalExecutionCount()) {
            $severity |= self::CRITICAL;
            return $severity;
        }
        if (($severity & self::WARNING) === self::WARNING) {
            return $severity;
        }
        if ($total >= $this->getWarningExecutionCount()) {
            $severity |= self::WARNING;
            return $severity;
        }
        if (($severity & self::NOTICE) === self::NOTICE) {
            return $severity;
        }
        if ($total >= $this->getNoticeExecutionCount()) {
            $severity |= self::NOTICE;
            return $severity;
        }
        if (($severity & self::INFO) === self::INFO) {
            return $severity;
        }
        if ($total >= $this->getInfoExecutionCount()) {
            $severity |= self::INFO;
            return $severity;
        }
        return $severity;
    }

    /**
     * @inheritDoc
     */
    public function getRecords() : array
    {
        return $this->getInternalAggregation()->getRecords();
    }

    /**
     * @inheritDoc
     */
    public function count() : int
    {
        return $this->getTotalExecution();
    }

    /**
     * @inheritDoc
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
    public function toArray() : array
    {
        return [
            'name' => $this->getName(),
            'severity' => $this->getSeverity(),
            'execution' => [
                'total' => $this->getTotalExecution(),
            ],
            'duration' => [
                'total' => $this->getTotalDuration(),
                'minimum' => $this->getMinimumDuration(),
                'maximum' => $this->getMaximumDuration(),
                'average' => $this->getAverageDuration(),
            ],
            'aggregations' => $this->getAggregations()
        ];
    }

    /**
     * @inheritDoc
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
    public function jsonSerialize() : array
    {
        return $this->toArray();
    }
}
