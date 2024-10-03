<?php
declare(strict_types=1);

namespace ArrayIterator\Profiler\Interfaces;

interface NamingInterface
{
    /**
     * Get object name
     *
     * @return string the name
     */
    public function getName(): string;
}
