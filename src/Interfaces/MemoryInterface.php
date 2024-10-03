<?php
declare(strict_types=1);

namespace ArrayIterator\Profiler\Interfaces;

interface MemoryInterface
{
    /**
     * Get the start memory
     *
     * @uses \memory_get_usage()
     * @return int
     */
    public function getStartMemory(): int;

    /**
     * Get the end of memory usage
     * returning current memory usage if no record
     *
     * @uses \memory_get_usage()
     * @return int
     */
    public function getEndMemory(): int;

    /**
     * Get start real memory usage
     *
     * @uses \memory_get_usage(true)
     * @return int
     */
    public function getStartRealMemory(): int;

    /**
     * Get the end real memory usage
     * returning current memory usage if no record
     *
     * @uses \memory_get_usage(true)
     * @return int
     */
    public function getEndRealMemory(): int;

    /**
     * Get used memory
     * (end_memory - start_memory) > 0 ? used : 0 - the minimum is zero (0)
     *
     * @uses \memory_get_usage()
     * @return int
     */
    public function getUsedMemory(): int;

    /**
     * Get used memory in real
     * (end_memory - start_memory) > 0 ? used : 0 - the minimum is zero (0)
     *
     * @uses \memory_get_usage(true)
     * @return int
     */
    public function getUsedRealMemory(): int;
}
