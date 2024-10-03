<?php
declare(strict_types=1);

namespace  ArrayIterator\Profiler\Aggregate;

/**
 * The internal Aggregation
 */
class InternalAggregation extends Aggregation
{
    /**
     * Internal Aggregation
     */
    public function __construct()
    {
        parent::__construct(__CLASS__);
    }
}
