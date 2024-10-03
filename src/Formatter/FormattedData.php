<?php
declare(strict_types=1);

namespace ArrayIterator\Profiler\Formatter;

use ArrayIterator;
use ArrayIterator\Profiler\Collection;
use ArrayIterator\Profiler\Formatter\Interfaces\FormattedDataInterface;
use ArrayIterator\Profiler\Formatter\Interfaces\FormatterInterface;
use ArrayIterator\Profiler\Interfaces\CollectionInterface;
use Traversable;

/**
 * @template TKey of string key data
 * @template TValue of string key data
 * @template-implements FormattedDataInterface<TKey, TValue>
 */
class FormattedData implements FormattedDataInterface
{
    /**
     * @var CollectionInterface<TKey, TValue> $data the data
     */
    protected CollectionInterface $data;

    /**
     * @var FormatterInterface $formatter
     */
    protected FormatterInterface $formatter;

    /**
     * @inheritDoc
     */
    public function __construct(FormatterInterface $formatter)
    {
        $this->formatter = $formatter;
        $this->data = new Collection();
    }

    /**
     * @inheritDoc
     */
    public function getFormatter(): FormatterInterface
    {
        return $this->formatter;
    }

    /**
     * @inheritDoc
     */
    public function get(string $key): ?string
    {
        return $this->data->get($key);
    }

    /**
     * @inheritDoc
     */
    public function set(string $key, string $formattedData): void
    {
        $this->data->set($key, $formattedData);
    }

    /**
     * @inheritDoc
     */
    public function has(string $key): bool
    {
        return $this->data->has($key);
    }

    /**
     * @inheritDoc
     */
    public function getData(): array
    {
        return $this->data->getData();
    }

    /**
     * @return array<string, string>
     */
    public function jsonSerialize() : array
    {
        return $this->getData();
    }

    /**
     * @inheritDoc
     * @return Traversable<TKey, TValue>
     */
    public function getIterator(): Traversable
    {
        return new ArrayIterator($this->data->getData());
    }
}
