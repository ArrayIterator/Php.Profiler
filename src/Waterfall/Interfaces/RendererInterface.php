<?php
declare(strict_types=1);

namespace ArrayIterator\Profiler\Waterfall\Interfaces;

use ArrayIterator\Profiler\Waterfall;

interface RendererInterface
{
    /**
     * The renderer
     *
     * @param Waterfall $waterfall
     */
    public function __construct(Waterfall $waterfall);

    /**
     * @return Waterfall
     */
    public function getWaterFall(): Waterfall;

    /**
     * @param Waterfall $waterfall
     * @return self
     */
    public function withWaterfall(Waterfall $waterfall) : self;

    /**
     * Render to JS
     *
     * @param ?bool $darkMode null is automatic
     * @return ?string rendered js null if failed
     */
    public function renderJS(?bool $darkMode = null) : ?string;
}
