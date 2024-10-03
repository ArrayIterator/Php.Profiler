<?php
declare(strict_types=1);

namespace ArrayIterator\Profiler\Traits;

use ArrayIterator\Profiler\Interfaces\ProfilerInterface;
use ArrayIterator\Profiler\Interfaces\RecordInterface;

trait ProfilingTrait
{
    abstract public function getProfiler() : ProfilerInterface;

    protected function benchmarkStart(
        string $name,
        string $group = ProfilerInterface::DEFAULT_GROUP,
        array $context = []
    ): RecordInterface {
        return $this->getProfiler()->start($name, $group, $context);
    }

    protected function benchmarkStop(
        string $name,
        string $group = ProfilerInterface::DEFAULT_GROUP,
        ?array $context = null
    ): RecordInterface {
        return $this->getProfiler()->start($name, $group, $context);
    }
}
