<?php
declare(strict_types=1);

namespace ArrayIterator\Profiler\Interfaces;

interface LockableInterface
{
    /**
     * Lock the object
     * @phpstan-return mixed
     */
    public function lock();

    /**
     * Check if object locked
     *
     * @return bool true if object locked
     */
    public function isLocked() : bool;
}
