<?php
/**
 * @noinspection PhpUndefinedNamespaceInspection
 * @noinspection PhpUndefinedClassInspection
 */
declare(strict_types=1);

namespace ArrayIterator\Profiler\Formatter;

use ArrayIterator\Profiler\Aggregate\Interfaces\AggregationInterface;
use ArrayIterator\Profiler\Aggregate\Interfaces\AggregatorInterface;
use ArrayIterator\Profiler\Formatter\Interfaces\FormattedDataInterface;
use ArrayIterator\Profiler\Formatter\Interfaces\FormatterInterface;
use ArrayIterator\Profiler\Interfaces\GroupInterface;
use ArrayIterator\Profiler\Interfaces\ProfilerInterface;
use ArrayIterator\Profiler\Interfaces\RecordInterface;
use Closure;
use Countable;
use JsonSerializable;
use Psr\Http\Message\MessageInterface;
use Psr\Http\Message\RequestInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\StreamInterface;
use Psr\Http\Message\UploadedFileInterface;
use Psr\Http\Message\UriInterface;
use ReflectionFunction;
use ReflectionObject;
use Serializable;
use Throwable;
use Traversable;
use function count;
use function get_class;
use function gettype;
use function implode;
use function is_array;
use function is_bool;
use function is_float;
use function is_int;
use function is_object;
use function is_string;
use function is_subclass_of;
use function iterator_count;
use function json_encode;
use function method_exists;
use function preg_match;
use function serialize;
use function spl_object_id;
use function sprintf;
use function strlen;
use function substr;
use function trim;
use const JSON_UNESCAPED_SLASHES;

class PlainFormatter implements FormatterInterface
{
    /**
     * @var class-string[] BLACKLISTED_OBJECT
     */
    public const BLACKLISTED_OBJECT = [
        ProfilerInterface::class,
        GroupInterface::class,
        RecordInterface::class,
        AggregatorInterface::class,
        AggregationInterface::class,
    ];

    /**
     * @var int MAX_STRING_SIZE
     */
    public const MAX_STRING_SIZE = 300;

    public const BLACKLIST_REGEX = '#
        pass(word)|salt|auth|license|hash
    #ix';

    /**
     * Is blacklisted object
     *
     * @param mixed|class-string|object $item
     * @return bool
     */
    public function isBlacklisted($item): bool
    {
        if (is_string($item)) {
            // check class name
            if (!preg_match(
                '#^[a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*(\\\[a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*)*$#',
                $item
            )) {
                return false;
            }
        } elseif (!is_object($item)) {
            return false;
        }
        foreach (self::BLACKLISTED_OBJECT as $className) {
            if (is_subclass_of($item, $className)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Format result type
     *
     * @param mixed $data
     * @param array<scalar, mixed> $attributes
     * @param string $name
     * @return string
     */
    protected function formatResultType($data, array $attributes, string $name = ''): string
    {
        return sprintf(
            '%s : %s',
            gettype($data),
            $this->formatResultName($name, $attributes)
        );
    }

    /**
     * @param mixed $item
     * @return string
     */
    private function toStringValue($item) : string
    {
        if (is_bool($item)) {
            $item = sprintf('(boolean: %s)', $item ? 'true' : 'false');
        } elseif ($item === null) {
            $item = '(null)';
        } elseif (is_object($item)) {
            $item = sprintf('(object: %s)', get_class($item));
        } elseif (is_array($item)) {
            $item = sprintf('(array: size=%d)', count($item));
        } elseif (is_int($item)) {
            $item = sprintf('(integer: %d)', $item);
        } elseif (is_float($item)) {
            $item = sprintf('(float: %s)', $item);
        } elseif (is_string($item)) {
            $size = strlen($item);
            if ($size > self::MAX_STRING_SIZE) {
                $item = substr($item, 0, self::MAX_STRING_SIZE);
                $item .= sprintf('<truncated(%d)>', $size - self::MAX_STRING_SIZE);
            }
            $item = sprintf('(string: %s)', $item);
        } else {
            $item = sprintf('(%s: %s)', gettype($item), $this->encodeValue((string) $item));
        }
        return $item;
    }

    /**
     * Encode / entity encode the value
     *
     * @param string $value
     * @return string
     */
    protected function encodeValue(string $value) : string
    {
        return $value;
    }

    /**
     * Build attributes
     *
     * @param array<scalar, mixed> $attributes
     * @return string
     */
    private function buildAttributes(array $attributes) : string
    {
        $attr = [];
        foreach ($attributes as $key => $item) {
            $attr[] = sprintf('%s=%s', $this->encodeValue((string) $key), $this->toStringValue($item));
        }
        return trim(implode(', ', $attr));
    }

    /**
     * Format result name
     *
     * @param string $name
     * @param array<scalar, mixed> $attributes
     * @return string
     */
    protected function formatResultName(string $name, array $attributes = []) : string
    {
        return sprintf(
            '(<code>(%s)%s</code>)',
            $this->buildAttributes($attributes),
            $this->encodeValue($name)
        );
    }

    /**
     * Format result class object
     *
     * @param class-string|string $itemName
     * @param string $value
     * @param array<scalar, mixed> $attributes
     * @return string
     */
    protected function formatResultInterface(
        string $itemName,
        string $value,
        array $attributes = []
    ) : string {
        return sprintf(
            '(%s(%s)) => %s',
            $itemName,
            $this->buildAttributes($attributes),
            $value
        );
    }

    /**
     * Format the object
     *
     * @param scalar $key
     * @param object $item
     * @param bool|mixed $blacklisted
     * @return string
     */
    protected function formatObject(
        $key,
        object $item,
        &$blacklisted = null
    ): string {
        $blacklisted = $this->isBlacklisted($item);
        $html = $this->formatResultType($item, ['id' => spl_object_id($item)], get_class($item));
        if ($blacklisted) {
            return $html;
        }

        /* ----------- PSR ----------- */
        if ($item instanceof StreamInterface) {
            $size = $item->getSize();
            $content = $item->read(self::MAX_STRING_SIZE);
            if ($size > self::MAX_STRING_SIZE) {
                $content .= sprintf('<truncated(%d)>', $size - self::MAX_STRING_SIZE);
            }
            $html .= $this->formatResultInterface(
                'StreamInterface',
                $content,
                [
                    'size' => $size
                ]
            );
            return $html;
        }
        if ($item instanceof UriInterface) {
            return $html . $this->formatResultInterface(
                'UriInterface',
                (string) $item
            );
        }
        if ($item instanceof MessageInterface) {
            $types = [
                ResponseInterface::class => 'ResponseInterface',
                ServerRequestInterface::class => 'ResponseInterface',
                RequestInterface::class => 'ResponseInterface',
            ];

            /**
             * @var array<scalar, scalar> $meta
             */
            $meta = [
                'size' => $item->getBody()->getSize()
            ];
            $name = 'MessageInterface';
            if ($item instanceof ResponseInterface) {
                $meta['code'] = $item->getStatusCode();
            }
            foreach ($types as $interface) {
                if ($item instanceof $interface) {
                    $name = $interface;
                    break;
                }
            }

            return $html
                . $this->formatResultInterface(
                    $name,
                    (string) $item->getBody()->getSize(),
                    $meta
                );
        }

        if ($item instanceof UploadedFileInterface) {
            return $html
                . $this->formatResultInterface(
                    'UploadedFileInterface',
                    (string) $item->getClientFilename(),
                    [
                        'size' => $item->getSize(),
                        'type' => $item->getClientMediaType()
                    ]
                );
        }
        $isBlacklisted = is_string($key) && false !== preg_match(self::BLACKLIST_REGEX, $key);
        $name = null;
        $meta = [];
        if ($item instanceof Serializable
            || method_exists($item, '__serialize')
        ) {
            $item = $isBlacklisted ? '<redacted(Serializable)>' : serialize($item);
            $name = 'Serializable';
        } elseif ($item instanceof JsonSerializable) {
            $name = 'JsonSerializable';
            $item = $item->jsonSerialize();
            $meta['type'] = gettype($item);
            $item = $isBlacklisted ? '<redacted(JsonSerializable)>' : json_encode($item, JSON_UNESCAPED_SLASHES);
        } elseif (method_exists($item, '__toString')) {
            $name = 'Stringable';
            $item = (string) $item;
            $item = $isBlacklisted ? '<redacted(JsonSerializable)>' : $item;
            $meta['size'] = strlen($item);
        } elseif ($item instanceof Traversable) {
            $name = 'Traversable';
            $item = (string) iterator_count($item);
            $meta['size'] = strlen($item);
        } elseif ($item instanceof Countable) {
            $name = 'Countable';
            $item = (string) count($item);
        } elseif ($item instanceof Closure) {
            $name = '*Closure';
            try {
                $ref = new ReflectionFunction($item);
                if ($ref->getClosureThis() === null) {
                    $item = 'static';
                } else {
                    $item = sprintf('%s', get_class($item));
                }
            } catch (Throwable $e) {
                $name = null;
            }
        }
        if (is_object($item)) {
            $ref = new ReflectionObject($item);
            if (($isAnon = $ref->isAnonymous()) || $ref->isInternal()) {
                $name = $isAnon ? '*Anonymous' : '*Internal';
            } else {
                $name = $ref->getName();
            }
            if (($parent = $ref->getParentClass())) {
                $name .= sprintf("(%s)", $parent->getName());
            }
            $content = [];
            foreach ($ref->getProperties(\ReflectionProperty::IS_PUBLIC) as $property) {
                $propName = $property->getName();
                $value = $property->getValue($item);
                $content[$propName] = sprintf(
                    '<code>$%s => %s</code>',
                    $propName,
                    preg_match(self::BLACKLIST_REGEX, $propName)
                        ? sprintf('<redacted(%s)>', gettype($value))
                        : $this->toStringValue($value)
                );
            }
            $item = sprintf(
                "\n{\n%s\n}",
                implode("\n", $content)
            );
            unset($content);
            return $html
                . $this->formatResultInterface(
                    $name,
                    $item,
                    [
                        'property_count' => count($ref->getProperties())
                    ]
                );
        }
        if (is_string($name) && is_string($item)) {
            $size = strlen($item);
            $item = substr($item, 0, self::MAX_STRING_SIZE);
            if ($size > self::MAX_STRING_SIZE) {
                $item .= sprintf('<truncated(%d)>', $size - self::MAX_STRING_SIZE);
            }
            $meta['size'] ??=  $size;
            return $html
                . $this->formatResultInterface(
                    $name,
                    $item,
                    $meta
                );
        }
        $name = (string) $item;
        return $html
            . $this->formatResultInterface(
                $name,
                sprintf('(%s: %s)', gettype($item), $name)
            );
    }

    /**
     * @param iterable<scalar, mixed> $data
     * @return FormattedDataInterface<string, string>
     */
    public function format(iterable $data): FormattedDataInterface
    {
        $formatted = new FormattedData($this);
        foreach ($data as $key => $item) {
            $key = (string) $key;
            if (is_object($item)) {
                $formatted->set($key, $this->formatObject($key, $item));
                continue;
            }
            if (is_array($item)) {
                $pre = '';
                foreach ($item as $k => $i) {
                    $pre .= "[$k] => ";
                    if (is_string($k) && preg_match(self::BLACKLIST_REGEX, $k)) {
                        $pre .= sprintf('<redacted(%s)>', $this->encodeValue($key));
                    } else {
                        if (is_string($i)) {
                            $size = strlen($i);
                            if ($size > self::MAX_STRING_SIZE) {
                                $i = substr($i, 0, self::MAX_STRING_SIZE);
                                $i .= sprintf('<truncated(%d)>', $size - self::MAX_STRING_SIZE);
                            }
                        }
                        $pre .= $this->toStringValue($i);
                    }
                    $pre .= "\n";
                }
                $item = sprintf('array: (<code>size=%d</code>)', count($item));
                if ($pre) {
                    $item .= "<pre>$pre</pre>";
                }
                $formatted->set($key, $item);
                continue;
            }
            if (preg_match(self::BLACKLIST_REGEX, $key)) {
                $formatted->set(
                    $key,
                    sprintf('<redacted(%s)>', $this->encodeValue($key))
                );
                continue;
            }

            if (is_string($item)) {
                $size = strlen($item);
                if ($size > self::MAX_STRING_SIZE) {
                    $item = substr($item, 0, self::MAX_STRING_SIZE);
                    $item .= sprintf('<truncated(%d)>', $size - self::MAX_STRING_SIZE);
                }
            }
            $formatted->set(
                $key,
                $this->toStringValue($item)
            );
        }

        return $formatted;
    }
}
