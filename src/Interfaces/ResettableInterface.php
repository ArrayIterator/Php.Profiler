<?php
declare(strict_types=1);

namespace ArrayIterator\Profiler\Interfaces;

interface ResettableInterface
{
    /**
     * Reset the value
     * @phpstan-return mixed
     */
    public function reset();
}
