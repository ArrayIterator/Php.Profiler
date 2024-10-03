<?php
declare(strict_types=1);

namespace ArrayIterator\Profiler\Formatter\Interfaces;

interface FormatterInterface
{
    /**
     * @param iterable<scalar, mixed> $data
     * @return FormattedDataInterface<string, string>
     */
    public function format(iterable $data) : FormattedDataInterface;
}
