<?php
declare(strict_types=1);

namespace ArrayIterator\Profiler;

use ArrayIterator;
use ArrayIterator\Profiler\Interfaces\CollectionInterface;
use ArrayIterator\Profiler\Interfaces\LockableInterface;
use Traversable;
use function array_key_exists;
use function array_keys;
use function is_scalar;

/**
 * @template TKeyArray of int|string
 * @template TKey of scalar
 * @template TValue of mixed
 * @template-implements CollectionInterface<TKey, TValue>
 */
class Collection implements CollectionInterface, LockableInterface
{
    /**
     * @var array<TKeyArray, TValue> $data the stored data
     */
    protected array $data;

    /**
     * @var bool $locked true is locked
     */
    protected bool $locked = false;

    /**
     * @inheritDoc
     */
    public function __construct(iterable $data = [])
    {
        $this->data = [];
        foreach ($data as $key => $item) {
            /**
             * @var TValue $item
             * @var TKeyArray $key
             */
            $this->data[$key] = $item;
        }
    }

    /**
     * @inheritDoc
     */
    public function has($key): bool
    {
        return is_scalar($key) && array_key_exists((string) $key, $this->data);
    }

    /**
     * @inheritDoc
     */
    public function get($key)
    {
        return $this->data[$key]??null;
    }

    /**
     * @inheritDoc
     */
    public function set($key, $value) : void
    {
        if ($this->isLocked() || !is_scalar($key)) {
            return;
        }
        /**
         * @var TKeyArray $key
         */
        $this->data[$key] = $value;
    }

    /**
     * @inheritDoc
     */
    public function remove($key) : void
    {
        if ($this->isLocked() || !is_scalar($key)) {
            return;
        }
        unset($this->data[$key]);
    }

    /**
     * @inheritDoc
     */
    public function add($key, $value): bool
    {
        if ($this->isLocked() || !is_scalar($key) || $this->has($key)) {
            return false;
        }
        /**
         * @var TKeyArray $key
         */
        $this->data[$key] = $value;
        return true;
    }

    /**
     * @inheritDoc
     */
    public function merge(iterable $data, bool $replaceExisting = true) : void
    {
        if ($this->isLocked()) {
            return;
        }
        foreach ($data as $key => $item) {
            if (!$replaceExisting && $this->has($key)) {
                continue;
            }

            /**
             * @var TKeyArray $key
             */
            $this->data[$key] = $item;
        }
    }

    /**
     * @inheritDoc
     * @return array<TKeyArray>
     */
    public function keys(): array
    {
        return array_keys($this->data);
    }

    /**
     * @inheritDoc
     * @return array<TKeyArray, TValue>
     */
    public function getData(): array
    {
        return $this->data;
    }

    /**
     * @inheritDoc
     */
    public function lock() : void
    {
        $this->locked = true;
    }

    /**
     * @inheritDoc
     */
    public function isLocked(): bool
    {
        return $this->locked;
    }

    /**
     * @inheritDoc
     */
    public function clear() : void
    {
        if ($this->isLocked()) {
            return;
        }
        $this->data = [];
    }

    /**
     * @inheritDoc
     */
    public function count() : int
    {
        return count($this->data);
    }

    /**
     * @inheritDoc
     * @param scalar $offset
     */
    public function offsetExists($offset): bool
    {
        return is_scalar($offset) && isset($this->data[$offset]);
    }

    /**
     * @inheritDoc
     */
    #[\ReturnTypeWillChange]
    public function offsetGet($offset)
    {
        return $this->get($offset);
    }

    /**
     * @inheritDoc
     * @param TKey $offset
     * @param TValue $value
     */
    public function offsetSet($offset, $value) : void
    {
        $this->set($offset, $value);
    }

    /**
     * @inheritDoc
     * @param TKey $offset
     */
    public function offsetUnset($offset) : void
    {
        $this->remove($offset);
    }

    /**
     * @inheritDoc
     * @return Traversable<TKeyArray, TValue>
     */
    public function getIterator() : Traversable
    {
        return new ArrayIterator($this->getData());
    }
}
