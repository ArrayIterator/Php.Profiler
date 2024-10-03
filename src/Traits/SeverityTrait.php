<?php
declare(strict_types=1);

namespace ArrayIterator\Profiler\Traits;

use ArrayIterator\Profiler\Interfaces\DurationInterface;
use ArrayIterator\Profiler\Interfaces\SeverityInterface;

trait SeverityTrait
{
    /**
     * @inheritDoc
     */
    abstract public function getDuration() : float;

    /**
     * @inheritDoc
     */
    public function getCriticalDuration() : int
    {
        return DurationInterface::TIMESPAN_CRITICAL;
    }

    /**
     * @inheritDoc
     */
    public function getWarningDuration() : int
    {
        return DurationInterface::TIMESPAN_WARNING;
    }

    /**
     * @inheritDoc
     */
    public function getNoticeDuration() : int
    {
        return DurationInterface::TIMESPAN_NOTICE;
    }

    /**
     * @inheritDoc
     */
    public function getInfoDuration() : int
    {
        return DurationInterface::TIMESPAN_INFO;
    }

    /**
     * @inheritDoc
     */
    public function getSeverity() : int
    {
        $duration = round($this->getDuration());
        if ($duration >= $this->getCriticalDuration()) {
            return SeverityInterface::CRITICAL;
        }
        if ($duration >= $this->getWarningDuration()) {
            return SeverityInterface::WARNING;
        }
        if ($duration >= $this->getNoticeDuration()) {
            return SeverityInterface::NOTICE;
        }
        if ($duration >= $this->getInfoDuration()) {
            return SeverityInterface::INFO;
        }
        return SeverityInterface::NONE;
    }

    /**
     * @inheritDoc
     */
    public function isCritical() : bool
    {
        return $this->getSeverity() === SeverityInterface::CRITICAL;
    }

    /**
     * @inheritDoc
     */
    public function isWarning() : bool
    {
        return $this->getSeverity() === SeverityInterface::WARNING;
    }

    /**
     * @inheritDoc
     */
    public function isNotice() : bool
    {
        return $this->getSeverity() === SeverityInterface::NOTICE;
    }

    /**
     * @inheritDoc
     */
    public function isInfo() : bool
    {
        return $this->getSeverity() === SeverityInterface::INFO;
    }
}
