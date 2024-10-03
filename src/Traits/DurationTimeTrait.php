<?php
declare(strict_types=1);

namespace ArrayIterator\Profiler\Traits;

trait DurationTimeTrait
{
    /**
     * @var float $startTime the start time in milliseconds
     */
    protected float $startTime;

    /**
     * @var ?float $endTime the end time in milliseconds
     */
    protected ?float $endTime = null;

    /**
     * Measure the timespan
     *
     * @return float returning milliseconds
     */
    protected function measureTime() : float
    {
        return ($this->getEndTime() - $this->getStartTime());
    }

    /**
     * @inheritDoc
     */
    public function getStartTime(): float
    {
        return $this->startTime;
    }


    /**
     * @inheritDoc
     */
    public function getEndTime(): float
    {
        return $this->endTime??$this->convertMicrotime();
    }

    /**
     * @inheritDoc
     */
    public function getDuration(): float
    {
        return $this->measureTime();
    }
}
