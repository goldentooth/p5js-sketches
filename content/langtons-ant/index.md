---
title: "Langton's Ant"
date: 2026-03-29
description: |
  Langton's Ant — a two-dimensional Turing machine with emergent behavior.
  Watch chaos resolve into a diagonal highway, then explore multi-color
  rule strings and multiple ants.
usage: |
  Watch the classic ant build its highway (~10,000 steps). Use the speed
  slider to fast-forward. Try different rule strings for wildly different
  patterns. Add more ants to see interference. Click the grid (while paused)
  to paint initial conditions.
scripts:
  - "main.js"
controls: |
  <button id="pause-btn" class="control-button">Pause</button>
  <button id="step-btn" class="control-button">Step</button>
  <button id="reset-btn" class="control-button">Reset</button>
  <button id="add-ant-btn" class="control-button">Add Ant</button>
  <span id="ant-count">Ants: 1</span>
  <br>
  <label for="speed-slider">Steps/frame: <span id="speed-value">1</span></label>
  <input type="range" id="speed-slider" class="control-slider" min="1" max="2000" value="1">
  <br>
  <label for="rule-input">Rule:</label>
  <input type="text" id="rule-input" value="RL" style="width: 120px; font-family: monospace;">
  <select id="preset-select" class="control-select">
    <option value="">Presets...</option>
    <option value="RL">RL — Classic</option>
    <option value="RLR">RLR — Triangle</option>
    <option value="LLRR">LLRR — Square</option>
    <option value="LRRRRRLLR">LRRRRRLLR — Fractal</option>
    <option value="RRLLLRLLLRRR">RRLLLRLLLRRR — Symmetry</option>
  </select>
  <br>
  <label><input type="checkbox" id="wrap-checkbox" checked> Wrap edges</label>
  <span id="step-count">Steps: 0</span>
technical_details: |
  <ul>
    <li><strong>Grid:</strong> 400x400 pixel grid, one cell per pixel</li>
    <li><strong>Rendering:</strong> Direct pixel manipulation via loadPixels/updatePixels — only changed cells are redrawn each frame</li>
    <li><strong>Rules:</strong> Generalized Langton's Ant with multi-color cyclic states. Each character in the rule string (R or L) defines the turn direction for that state.</li>
    <li><strong>Colors:</strong> Classic RL uses black/white. Multi-color rules use an HSL ramp from deep blue to warm gold.</li>
    <li><strong>Highway:</strong> The classic RL ant produces chaotic behavior for ~10,000 steps, then suddenly builds a repeating diagonal highway pattern — an example of emergent order from simple rules.</li>
  </ul>
---
