<?php
declare(strict_types=1);

namespace ArrayIterator\Profiler\Interfaces;

interface MicrotimeConversionInterface
{
    /**
     * @var int EXPONENT the exponent of microtime
     */
    public const EXPONENT = 1000;

    /**
     * Convert microtime to milliseconds
     *
     * @uses \microtime(true)
     * @return float calculate and exponent to 1000 that means on milliseconds
     */
    public function convertMicrotime(?float $microtime = null): float;
}
