<?php
declare(strict_types=1);

namespace ArrayIterator\Profiler\Aggregate\Interfaces;

use ArrayIterator\Profiler\Interfaces\RecordInterface;

interface AggregateInterface
{
    /**
     * Do aggregate
     *
     * @param RecordInterface $record
     * @phpstan-return mixed
     */
    public function aggregate(RecordInterface $record);
}
