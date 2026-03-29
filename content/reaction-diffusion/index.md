---
title: "Reaction-Diffusion"
date: 2026-03-29
description: |
  Gray-Scott reaction-diffusion — two virtual chemicals interact to produce
  organic patterns ranging from cell mitosis to coral growth to labyrinthine
  mazes.
usage: |
  Watch patterns emerge from the center seed. Use pattern presets to explore
  different parameter regimes. Drag F and k sliders to morph patterns in
  real-time. Click the grid to drop more chemical. Try different color palettes.
scripts:
  - "main.js"
controls: |
  <button id="pause-btn" class="control-button">Pause</button>
  <button id="step-btn" class="control-button">Step</button>
  <button id="reset-btn" class="control-button">Reset</button>
  <button id="reseed-btn" class="control-button">Clear &amp; Reseed</button>
  <br>
  <label for="speed-slider">Steps/frame: <span id="speed-value">5</span></label>
  <input type="range" id="speed-slider" class="control-slider" min="1" max="20" value="5">
  <br>
  <label for="feed-slider">Feed (F): <span id="feed-value">0.0367</span></label>
  <input type="range" id="feed-slider" class="control-slider" min="0.01" max="0.08" step="0.001" value="0.0367">
  <br>
  <label for="kill-slider">Kill (k): <span id="kill-value">0.0649</span></label>
  <input type="range" id="kill-slider" class="control-slider" min="0.04" max="0.07" step="0.001" value="0.0649">
  <br>
  <label for="pattern-select">Pattern:</label>
  <select id="pattern-select" class="control-select">
    <option value="mitosis">Mitosis</option>
    <option value="coral">Coral</option>
    <option value="maze">Maze/Worms</option>
    <option value="spots">Spots</option>
    <option value="waves">Waves</option>
    <option value="holes">Holes</option>
    <option value="solitons">Solitons</option>
    <option value="uskate">U-Skate</option>
    <option value="bubbles">Bubbles</option>
    <option value="stripe">Stripe</option>
    <option value="chaos">Chaos</option>
  </select>
  <label for="seed-select">Seed:</label>
  <select id="seed-select" class="control-select">
    <option value="center">Center Blob</option>
    <option value="scatter">Random Scatter</option>
    <option value="ring">Ring</option>
    <option value="line">Horizontal Line</option>
  </select>
  <label for="palette-select">Colors:</label>
  <select id="palette-select" class="control-select">
    <option value="thermal">Thermal</option>
    <option value="ocean">Ocean</option>
    <option value="toxic">Toxic</option>
    <option value="grayscale">Grayscale</option>
    <option value="neon">Neon</option>
  </select>
technical_details: |
  <ul>
    <li><strong>Grid:</strong> 300x300 cell grid, 2 pixels per cell on 600x600 canvas</li>
    <li><strong>Model:</strong> Gray-Scott reaction-diffusion with two chemicals (A and B). Chemical A is consumed and B is produced by the reaction A + 2B → 3B.</li>
    <li><strong>Diffusion:</strong> Weighted 5-point Laplacian stencil (cardinal +0.2, diagonal +0.05)</li>
    <li><strong>Rendering:</strong> Direct pixel manipulation via loadPixels/updatePixels with 256-entry precomputed color lookup table</li>
    <li><strong>Parameters:</strong> Feed rate (F) controls how fast A is replenished. Kill rate (k) controls how fast B decays. Different F/k combinations produce wildly different pattern families.</li>
  </ul>
---
