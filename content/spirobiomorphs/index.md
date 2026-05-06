---
title: "Spirobiomorphs"
date: 2026-05-05
description: |
  Richard Dawkins' biomorphs crossed with a Spirograph kaleidoscope.
  Specimens are layered hypotrochoid stacks with multi-band radial masks
  and palette-driven gradient strokes. Breed by clicking children in a
  3×3 grid; the clicked child becomes the new parent and 8 fresh mutants
  spawn around it. Inspired by The Blind Watchmaker (Dawkins, 1986).
usage: |
  Click any child to make it the new parent. Click the parent (center) to
  view at 4096×4096; right-click the popup to save it. Back/Forward
  navigates breeding history deterministically. 💾 saves favorites to
  localStorage. Numpad keys 1–9 pick a child; 5/Enter opens the parent
  fullscreen; Z/X = Back/Forward; R reset; N random; S save; +/− adjusts
  mutation rate.
scripts:
  - "main.js"
controls: |
  <div style="display: flex; flex-direction: column; gap: 10px;">
    <div id="control-row-buttons" style="display: flex; gap: 6px; flex-wrap: wrap;"></div>
    <div id="control-row-sliders" style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;"></div>
    <div id="status-line" style="font-size: 0.85em; color: #aaa;"></div>
    <div id="saved-strip" style="display: flex; gap: 6px; overflow-x: auto;"></div>
    <div style="font-size: 0.75em; color: #888; margin-top: 8px;">
      Inspired by Richard Dawkins' biomorphs from
      <em>The Blind Watchmaker</em> (1986) and the classic Spirograph drawing toy.
    </div>
  </div>
technical_details: |
  <ul>
    <li><strong>Curve family:</strong> hypotrochoid — small gear of radius <code>r</code> rolls inside a fixed gear of radius <code>R</code>; pen offset <code>d</code> from the small gear's center traces the curve. Each layer has its own <code>(R, r, d, revs)</code>.</li>
    <li><strong>Composition:</strong> 1–5 hypotrochoid layers per specimen, stacked. The whole composition is then radially copied <code>k_outer</code> times around the cell center for kaleidoscope symmetry. Each layer can be offset from origin by an <code>offset</code> gene.</li>
    <li><strong>Mask:</strong> per-layer multi-band radial mask. The pen's distance from origin determines whether the segment draws — <code>band_count</code> alternating draw/skip rings, with <code>band_phase</code> shift and <code>band_duty</code> draw fraction.</li>
    <li><strong>Color:</strong> each specimen has a 4-slot HSL palette. Each layer picks two palette indices and gradients between them along the pen's path. Strokes use additive blending on a near-black background, so overlaps build brightness.</li>
    <li><strong>Rendering:</strong> each cell owns a <code>p5.Graphics</code> buffer. On creation (or breed), the full path of every layer is rasterized once at high resolution (additive blend, near-black background) so the cell is visible from frame one. The pen then continues live on top — additive ink, no fade — for a subtle still-alive feel without the cell ever emptying.</li>
    <li><strong>Mutation:</strong> Dawkins-style — pick one random active gene, change it by ±1 step (integer +/-1, quantized float by its natural step, continuous float by 5% of range). Mutations-per-offspring slider scales the count. Layer count is itself a gene; adding a layer fills it with median-of-range values.</li>
    <li><strong>History:</strong> deterministic. The RNG seed used to mutate each child is stored alongside the parent in history, so Back/Forward returns you to the same children you saw before.</li>
    <li><strong>Saved gallery:</strong> persists across reloads via <code>localStorage</code>; click a thumbnail to make it the new parent (pushed onto history).</li>
  </ul>
draft: false
---
