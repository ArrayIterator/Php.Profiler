<?php
declare(strict_types=1);

namespace ArrayIterator\Profiler\Interfaces;

use ArrayAccess;
use Countable;
use IteratorAggregate;

/**
 * @template TKey
 * @template TValue
 * @template-extends IteratorAggregate<TKey, TValue>
 * @template-extends ArrayAccess<TKey, TValue>
 */
interface CollectionInterface extends IteratorAggregate, Countable, ArrayAccess, ClearableInterface
{
    /**
     * Collection
     *
     * @param iterable<TKey, TValue> $data
     */
    public function __construct(iterable $data);

    /**
     * Check the key existences
     *
     * @param scalar $key the key to check
     * @return bool true when the data exists by given key
     */
    public function has($key) : bool;

    /**
     * Get data by given key
     *
     * @param scalar $key
     * @return ?mixed null if not exists
     */
    public function get($key);

    /**
     * Set / replace the data
     *
     * @param scalar $key
     * @param mixed $value
     * @phpstan-return mixed
     */
    public function set($key, $value);

    /**
     * Remove data
     *
     * @param scalar $key
     * @phpstan-return mixed
     */
    public function remove($key);

    /**
     * Add data if not exists
     *
     * @param scalar $key
     * @param mixed $value
     * @return bool
     */
    public function add($key, $value) : bool;

    /**
     * Merge the data
     *
     * @param iterable<TKey, TValue> $data data to merge
     * @param bool $replaceExisting true if data want to replace existing
     * @phpstan-return mixed
     */
    public function merge(iterable $data, bool $replaceExisting = true);

    /**
     * Get keys
     *
     * @return array<TKey>
     */
    public function keys() : array;

    /**
     * Get all data
     *
     * @return array<TKey, TValue>
     */
    public function getData() : array;
}
