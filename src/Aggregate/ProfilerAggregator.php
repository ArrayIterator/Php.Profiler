<?php
declare(strict_types=1);

namespace ArrayIterator\Profiler\Aggregate;

use ArrayIterator\Profiler\Interfaces\ProfilerInterface;
use ArrayIterator\Profiler\Interfaces\RecordInterface;

/**
 * The aggregator
 */
class ProfilerAggregator extends AbstractAggregator
{
    /**
     * @var ProfilerInterface $profiler
     */
    protected ProfilerInterface $profiler;

    /**
     * @param ProfilerInterface $profiler
     */
    public function __construct(ProfilerInterface $profiler)
    {
        $this->profiler = $profiler;
    }

    /**
     * Get profiler
     *
     * @return ProfilerInterface $profiler
     */
    public function getProfiler(): ProfilerInterface
    {
        return $this->profiler;
    }

    /**
     * @param ProfilerInterface $profiler
     * @return bool
     */
    protected function isEqualProfiler(ProfilerInterface $profiler) : bool
    {
        return $profiler === $this->getProfiler();
    }

    /**
     * @inheritDoc
     */
    public function accepted(RecordInterface $record): bool
    {
        if ($record->isStopped()) {
            return false;
        }
        return $this->isEqualProfiler($record->getGroup()->getProfiler());
    }
}
