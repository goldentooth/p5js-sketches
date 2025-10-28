---
title: "1D Cellular Automata"
date: 2025-08-05
description: |
  Explore the fascinating world of 1D cellular automata, where simple local rules generate complex emergent patterns over time. Each row represents a generation, with cells evolving based on their neighbors according to the selected rule. From chaotic randomness to structured fractals, witness how complexity can arise from simplicity.
scripts:
  - "sketch.js"
usage: |
  Enter a rule number (0-255) in the input field and click "Set Rule" or press Enter. Each rule number corresponds to a different set of local transition rules.
  <br><br>
  <strong>Try these interesting rules:</strong>
  <br><br>
  <ul style="margin: 0.5rem 0; padding-left: 1rem; text-align: left; display: inline-block;">
    <li><strong>Rule 30:</strong> Chaotic randomness (Class 3)</li>
    <li><strong>Rule 90:</strong> Sierpinski triangle / Pascal's triangle mod 2</li>
    <li><strong>Rule 110:</strong> Complex computation (Turing complete, Class 4)</li>
    <li><strong>Rule 54:</strong> Universal computation candidate (Class 4)</li>
    <li><strong>Rule 60:</strong> Sierpinski triangle patterns</li>
    <li><strong>Rule 18:</strong> Beautiful nested triangular patterns</li>
    <li><strong>Rule 126:</strong> Dense carpet-like patterns</li>
    <li><strong>Rule 150:</strong> Clean geometric XOR triangles</li>
    <li><strong>Rule 184:</strong> Traffic flow model</li>
  </ul>
extra_controls: |
  <section class="controls-section">
    <div class="controls-container">
      <label for="rule-input">Rule Number (0-255):</label>
      <input type="number" id="rule-input" min="0" max="255" value="30">
      <button id="set-rule-button">Set Rule</button>
      <label for="detail-select">Detail Level:</label>
      <select id="detail-select">
        <option value="low">Low (100 cols, 8px cells)</option>
        <option value="medium">Medium (200 cols, 4px cells)</option>
        <option value="high">High (400 cols, 2px cells)</option>
        <option value="ultra" selected>Ultra (800 cols, 1px cells)</option>
      </select>
      <label for="pattern-select">Starting Pattern:</label>
      <select id="pattern-select">
        <option value="single" selected>Single Center Pixel</option>
        <option value="random">Random Noise</option>
        <option value="alternating">Alternating (010101...)</option>
        <option value="pairs">Pairs (001100...)</option>
        <option value="quads">Quads (000011110000...)</option>
      </select>
    </div>
  </section>
technical_details: |
  <ul>
    <li><strong>Grid Size:</strong> Variable (100-800 cells wide), evolving over multiple generations</li>
    <li><strong>Rule System:</strong> Wolfram's elementary cellular automata (256 possible rules)</li>
    <li><strong>Initial Conditions:</strong> Multiple starting patterns available (single pixel, random noise, alternating, pairs, quads)</li>
    <li><strong>Neighborhood:</strong> Each cell considers itself and its two immediate neighbors</li>
    <li><strong>Implementation:</strong> Uses Web Workers for non-blocking computation</li>
    <li><strong>Visualization:</strong> Black cells represent active states, white cells represent inactive states</li>
  </ul>
  <div class="generation-info">
    <h3>About Cellular Automata</h3>
    <p>
      Cellular automata are discrete mathematical models that demonstrate how complex patterns can emerge from simple
      rules. Stephen Wolfram's study of elementary cellular automata revealed four classes of behavior: fixed points,
      periodic patterns, chaotic behavior, and complex localized structures. Rule 110 is even Turing complete!
    </p>
  </div>
---
