---
title: "Schelling Segregation"
date: 2026-03-30
description: |
  Schelling's segregation model — even mild individual preferences for similar
  neighbors produce dramatic collective segregation. Fantasy races populate a
  grid and relocate when unhappy with their neighborhood. Inspired by Thomas
  Schelling's Micromotives and Macrobehavior (1978).
usage: |
  Watch races self-segregate on the grid. Adjust tolerance thresholds to see
  how mild preferences create dramatic clustering. Try different movement
  strategies and group configurations. Dimmed agents are unhappy and about
  to move.
scripts:
  - "main.js"
controls: |
  <div style="display: flex; flex-direction: column; gap: 10px;">
    <div>
      <button id="play-btn" class="control-button">Play</button>
      <button id="step-btn" class="control-button">Step</button>
      <button id="reset-btn" class="control-button">Reset</button>
    </div>
    <div>
      <label for="speed-slider">Steps/frame: <span id="speed-value">1</span></label>
      <input type="range" id="speed-slider" class="control-slider" min="1" max="50" value="1">
    </div>
    <div>
      <label for="grid-select">Grid:</label>
      <select id="grid-select" class="control-select">
        <option value="40">Medium (40×40)</option>
        <option value="60" selected>Large (60×60)</option>
        <option value="80">XL (80×80)</option>
      </select>
      <label for="density-slider">Density: <span id="density-value">75</span>%</label>
      <input type="range" id="density-slider" class="control-slider" min="50" max="95" value="75">
      <label for="strategy-select">Movement:</label>
      <select id="strategy-select" class="control-select">
        <option value="random">Random</option>
        <option value="nearest">Nearest Satisfying</option>
        <option value="swap">Swap</option>
      </select>
    </div>
    <div id="group-controls"></div>
    <div>
      <button id="add-group-btn" class="control-button">+ Add Group</button>
      <button id="remove-group-btn" class="control-button">− Remove Group</button>
    </div>
    <div style="font-size: 0.85em;">
      <span id="step-count">Step: 0</span> ·
      <span id="unhappy-count">Unhappy: 0%</span> ·
      <span id="segregation-value">Segregation: 0%</span> ·
      <span id="status-text"></span>
    </div>
    <div style="font-size: 0.75em; color: #888; margin-top: 8px;">
      Inspired by <a href="https://ncase.me/polygons/" target="_blank" style="color: #aaa;">Parable of the Polygons</a>
      by Nicky Case & Vi Hart, based on Thomas Schelling's segregation model.
    </div>
  </div>
technical_details: |
  <ul>
    <li><strong>Model:</strong> Schelling's spatial segregation model (1971). Agents on a grid are "unhappy" if the fraction of same-group neighbors falls below their tolerance threshold or above their anti-bias threshold.</li>
    <li><strong>Neighborhood:</strong> Moore neighborhood (8 surrounding cells). Edge/corner agents use only available neighbors. Non-wrapping boundary.</li>
    <li><strong>Movement strategies:</strong> Random (move to any empty cell), Nearest Satisfying (BFS to closest happy empty cell), Swap (exchange positions of two unhappy agents).</li>
    <li><strong>Processing:</strong> Each step identifies all unhappy agents, shuffles them randomly, then processes sequentially — an agent's move may change neighbors' happiness before they are processed.</li>
    <li><strong>Rendering:</strong> Roguelike glyph grid via Nuglib GridRenderer and LayerManager. Segregation chart drawn on a separate p5.js graphics buffer.</li>
  </ul>
draft: false
---
