<?php
declare(strict_types=1);

namespace ArrayIterator\Profiler\Formatter\Interfaces;

use IteratorAggregate;
use JsonSerializable;

/**
 * @template TKey of string key data
 * @template TValue of string key data
 * @template-extends IteratorAggregate<TKey, TValue>
 */
interface FormattedDataInterface extends IteratorAggregate, JsonSerializable
{
    /**
     * @param FormatterInterface $formatter
     */
    public function __construct(FormatterInterface $formatter);

    /**
     * Get formatted data
     *
     * @return FormatterInterface
     */
    public function getFormatter() : FormatterInterface;

    /**
     * Add data
     *
     * @param TKey $key
     * @param TValue $formattedData
     * @return mixed
     */
    public function set(string $key, string $formattedData);

    /**
     * Check if data exist
     *
     * @param TKey $key
     * @return bool
     */
    public function has(string $key) : bool;

    /**
     * Get data
     *
     * @param TKey $key
     * @return ?TValue
     */
    public function get(string $key) : ?string;

    /**
     * @return array<TKey, TValue>
     */
    public function getData() : array;
}
