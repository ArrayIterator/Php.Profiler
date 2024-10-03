<?php
/**
 * @noinspection PhpUndefinedNamespaceInspection
 * @noinspection PhpUndefinedClassInspection
 */
declare(strict_types=1);

namespace ArrayIterator\Profiler\Formatter;

use function htmlentities;

class HtmlFormatter extends PlainFormatter
{
    /**
     * @inheritDoc
     */
    protected function encodeValue(string $value): string
    {
        return htmlentities($value);
    }
}
