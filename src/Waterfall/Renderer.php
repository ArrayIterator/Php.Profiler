<?php
declare(strict_types=1);

namespace ArrayIterator\Profiler\Waterfall;

use ArrayIterator\Profiler\Formatter\HtmlFormatter;
use ArrayIterator\Profiler\Waterfall;
use ArrayIterator\Profiler\Waterfall\Interfaces\RendererInterface;
use stdClass;
use function dirname;
use function file_exists;
use function file_get_contents;
use function is_array;
use function is_string;
use function json_encode;
use function realpath;
use function spl_object_hash;
use function sprintf;
use function trim;
use const JSON_UNESCAPED_SLASHES;

class Renderer implements RendererInterface
{
    /**
     * @var Waterfall $waterfall
     */
    protected Waterfall $waterfall;

    /**
     * @var string $jsFile
     */
    protected string $jsFile;

    /**
     * Renderer constructor.
     *
     * @param Waterfall $waterfall
     */
    public function __construct(Waterfall $waterfall)
    {
        $this->waterfall = $waterfall;
        // default js file
        $this->setJsFile(dirname(__DIR__, 2) . '/dist/waterfall.js');
    }

    /**
     * Get JS file to render the profiler
     */
    public function getJsFile(): string
    {
        return $this->jsFile;
    }

    /**
     * Set JS file to render the profiler
     * only support local file
     */
    public function setJsFile(string $jsFile): bool
    {
        if (!file_exists($jsFile)) {
            return false;
        }
        $this->jsFile = realpath($jsFile) ?: $jsFile;
        return true;
    }

    /**
     * @inheritDoc
     */
    public function getWaterFall(): Waterfall
    {
        return $this->waterfall;
    }

    /**
     * @inheritDoc
     */
    public function withWaterfall(Waterfall $waterfall): RendererInterface
    {
        if ($waterfall === $this->getWaterFall()) {
            return $this;
        }
        $clone = clone $this;
        $clone->waterfall = $waterfall;
        return $clone;
    }

    /**
     * Render to JS
     *
     * @param ?bool $darkMode null is automatic
     * @return ?string rendered js
     * @noinspection CssUnresolvedCustomProperty
     * @noinspection BadExpressionStatementJS
     * @noinspection JSUnresolvedReference
     */
    public function renderJS(?bool $darkMode = null) : ?string
    {
        $jsFile = $this->getJsFile();
        if (!file_exists($jsFile)) {
            return null;
        }
        $formatter = $this->getWaterFall()->getDefaultFormatter();
        $formatter = $formatter instanceof HtmlFormatter ? $formatter : new HtmlFormatter();
        $data = $this->getWaterFall()->getJsonRenderArray($formatter);
        $stdClass = new stdClass();
        foreach ($data as $key => $item) {
            if (is_array($item) && empty($item)) {
                $data[$key] = $stdClass; // make encoded as object
            }
        }
        if (is_array($data['records'])) {
            foreach ($data['records'] as $id => $item) {
                if (empty($item['formatted_data'])) {
                    $data['records'][$id]['formatted_data'] = $stdClass; // make encoded as object
                }
            }
        }
        $data = json_encode($data, JSON_UNESCAPED_SLASHES);
        if (!is_string($data)) {
            return null;
        }
        $name = 'waterfall-profiler';
        $mode = $darkMode ? 'dark' : ($darkMode === false ? 'light' : 'auto');
        $hash = spl_object_hash($this->getWaterFall()->getProfiler());
        $js = sprintf(
            '<script type="application/json" data-script="%s" data-hash="%s" data-mode="%s">%s</script>',
            $name,
            $hash,
            $mode,
            ($data)
        );
        $data = file_get_contents($jsFile);
        if (!is_string($data)) {
            return null;
        }
        $js .= "\n";
        $js .= sprintf(
            '<script data-script="%s" data-hash="%s" data-mode="%s">%s</script>',
            $name,
            $hash,
            $mode,
            trim($data)
        );
        unset($data);
        return $js;
    }
}
