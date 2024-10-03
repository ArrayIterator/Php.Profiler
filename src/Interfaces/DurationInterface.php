<?php
declare(strict_types=1);

namespace ArrayIterator\Profiler\Interfaces;

interface DurationInterface
{
    /**
     * @var int TIMESPAN_INFO the timespan on millisecond(s)
     */
    public const TIMESPAN_INFO = 1;

    /**
     * @var int TIMESPAN_NOTICE the timespan on millisecond(s)
     */
    public const TIMESPAN_NOTICE = 5;

    /**
     * @var int TIMESPAN_WARNING the timespan on millisecond(s)
     */
    public const TIMESPAN_WARNING = 10;

    /**
     * @var int TIMESPAN_CRITICAL the timespan on millisecond(s)
     */
    public const TIMESPAN_CRITICAL = 20;

    /**
     * Get the start time in milliseconds
     *
     * @return float
     */
    public function getStartTime(): float;

    /**
     * Get end time in milliseconds
     * returning current timespan if not yet stopped
     *
     * @return float
     */
    public function getEndTime(): float;

    /**
     * Get duration in millisecond
     * (end_time - start_time)
     *
     * @return float
     */
    public function getDuration() : float;
}
