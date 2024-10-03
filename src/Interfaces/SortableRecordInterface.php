<?php
declare(strict_types=1);

namespace ArrayIterator\Profiler\Interfaces;

/**
 * Sort the data
 */
interface SortableRecordInterface
{
    /**
     * Sort record by start time
     * @phpstan-return mixed
     */
    public function sort();
}
