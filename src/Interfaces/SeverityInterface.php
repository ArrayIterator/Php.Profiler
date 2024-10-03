<?php
declare(strict_types=1);

namespace ArrayIterator\Profiler\Interfaces;

/**
 * The severity interface
 *
 * @see DurationInterface
 */
interface SeverityInterface
{
    /**
     * @var int CRITICAL the critical severity codd
     */
    public const CRITICAL = 1;

    /**
     * @var int WARNING the warning severity codd
     */
    public const WARNING = 3;

    /**
     * @var int NOTICE the notice severity codd
     */
    public const NOTICE = 5;

    /**
     * @var int INFO the info severity codd
     */
    public const INFO = 6;

    /**
     * @var int CRITICAL the critical severity codd
     */
    public const NONE = 0;

    /**
     * Get the severity type
     *
     * @return int
     */
    public function getSeverity() : int;

    /**
     * Check if severity is critical
     *
     * @return bool
     */
    public function isCritical() : bool;

    /**
     * Check if severity is warning
     *
     * @return bool
     */
    public function isWarning() : bool;


    /**
     * Check if severity is notice
     *
     * @return bool
     */
    public function isNotice() : bool;

    /**
     * Check if severity is info
     *
     * @return bool
     */
    public function isInfo() : bool;

    /**
     * Get the default value of critical
     *
     * @uses DurationInterface::TIMESPAN_CRITICAL
     * @return int
     */
    public function getCriticalDuration() : int;

    /**
     * Get the default value of warning
     *
     * @uses DurationInterface::TIMESPAN_WARNING
     * @return int
     */
    public function getWarningDuration() : int;

    /**
     * Get the default value of notice
     *
     * @uses DurationInterface::TIMESPAN_NOTICE
     * @return int
     */
    public function getNoticeDuration() : int;

    /**
     * Get the default value of info
     *
     * @uses DurationInterface::TIMESPAN_INFO
     * @return int
     */
    public function getInfoDuration() : int;
}
