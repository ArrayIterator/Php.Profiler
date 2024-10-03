<?php
declare(strict_types=1);

namespace ArrayIterator\Profiler\Interfaces;

interface ClearableInterface
{
    /**
     * Clear the stored data
     * @phpstan-return mixed
     */
    public function clear();
}
