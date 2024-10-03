<?php
declare(strict_types=1);

namespace ArrayIterator\Profiler\Traits;

trait MemoryTrait
{
    /**
     * @uses \memory_get_usage()
     * @var int $startMemory the start memory
     */
    protected int $startMemory;

    /**
     * @uses \memory_get_usage(true)
     * @var int $startRealMemory real memory
     */
    protected int $startRealMemory;

    /**
     * @var int $usedMemory used memory
     */
    protected int $usedMemory;

    /**
     * @uses \memory_get_usage()
     * @var ?int $endMemory memory record when record stopped
     */
    protected ?int $endMemory = null;

    /**
     * @uses \memory_get_usage(true)
     * @var ?int $endRealMemory real memory record when record stopped
     */
    protected ?int $endRealMemory = null;

    /**
     * @var int $usedRealMemory use real memory
     */
    protected int $usedRealMemory;

    /**
     * Measure the memory
     *
     * @param int $startMemory start memory
     * @param bool $real use read memory
     * @param ?int $endMemory end of memory
     * @return int returning measured memory
     */
    protected function measureMemory(
        int $startMemory,
        bool $real,
        ?int $endMemory = null
    ) : int {
        if ($endMemory === null) {
            $start = memory_get_usage($real);
            $data  = $this;
            $end   = memory_get_usage($real);
            unset($data);
            $endMemory = $end - $start;
        }
        return max(($endMemory - $startMemory), 0);
    }

    /**
     * Get started memory
     *
     * @return int total used memory on start
     */
    public function getStartMemory(): int
    {
        return $this->startMemory;
    }

    /**
     * Get started real memory
     *
     * @uses \memory_get_usage(true)
     * @return int returning real memory
     */
    public function getStartRealMemory(): int
    {
        return $this->startRealMemory;
    }

    /**
     * Get started real memory
     *
     * @uses \memory_get_usage()
     * @return int returning memory
     */
    public function getEndMemory(): int
    {
        return $this->endMemory??memory_get_usage();
    }

    /**
     * Get end real memory
     *
     * @uses \memory_get_usage(true)
     * @return int returning ending real memory
     */
    public function getEndRealMemory(): int
    {
        return $this->endRealMemory??memory_get_usage(true);
    }

    /**
     * Calculate used memory
     *
     * @uses \memory_get_usage(true)
     * @return int returning real memory
     */
    public function getUsedMemory(): int
    {
        return $this->usedMemory??$this->measureMemory(
            $this->getStartMemory(),
            false
        );
    }

    /**
     * Calculate real memory
     *
     * @uses \memory_get_usage(true)
     * @return int returning used real memory
     */
    public function getUsedRealMemory(): int
    {
        return $this->usedRealMemory??$this->measureMemory(
            $this->getStartRealMemory(),
            true
        );
    }
}
