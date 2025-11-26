---
title: "Rooms and Corridors"
date: 2025-11-24T19:53:17-05:00
description: "Procedural roguelike dungeon with field-of-view system"
usage: "Move with arrow keys/WASD/hjkl/numpad. Use controls below to toggle FOV, change algorithms, and adjust settings."
draft: false
scripts:
  - "main.js"
technical_details: |
  <ul>
    <li><strong>Map Generation:</strong> Procedural dungeon with random room placement and corridors</li>
    <li><strong>FOV Algorithms:</strong> Shadowcasting, Raycasting, Diamond Raycasting, Permissive FOV</li>
    <li><strong>Fog of War:</strong> Three visibility states - visible (full color), explored (dimmed), hidden</li>
  </ul>
controls: |
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <div>
      <label style="display: inline-flex; align-items: center; gap: 8px;">
        <input type="checkbox" id="fov-enabled" checked>
        Enable Field of View
      </label>
    </div>

    <div>
      <label for="algorithm-select">Algorithm:</label>
      <select id="algorithm-select" class="control-select" style="margin-left: 8px;">
        <option value="shadowcasting">Shadowcasting</option>
        <option value="raycasting">Basic Raycasting</option>
        <option value="diamond-raycasting">Diamond Raycasting</option>
        <option value="permissive">Permissive FOV</option>
      </select>
    </div>

    <div>
      <label for="range-slider">Range: <span id="range-value">10</span> tiles</label>
      <input type="range" id="range-slider" class="control-slider" min="3" max="30" value="10" style="width: 200px;">
    </div>

    <div id="permissiveness-control" style="display: none;">
      <label for="permissiveness-slider">Permissiveness: <span id="permissiveness-value">2</span></label>
      <input type="range" id="permissiveness-slider" class="control-slider" min="0" max="8" value="2" style="width: 200px;">
    </div>

    <div>
      <button id="regenerate-btn" class="control-button">Regenerate Map</button>
    </div>

    <div style="font-size: 0.9em; color: #666; margin-top: 8px;">
      <strong>Movement:</strong> Arrow Keys / WASD / hjkl / Numpad
    </div>
  </div>
---

<!--
This sketch directory contains:
- index.md (this file): Metadata and documentation
- main.js: Your p5.js sketch code
- style.css (optional): Custom styles for this sketch
- preview.png (optional): Screenshot for the gallery view

To add additional JavaScript files:
1. Create the file in this directory (e.g., helper.js, world.js, robot.js)
2. Add it to the scripts array above (order matters - they load sequentially)

To add a preview image:
1. Run your sketch locally: hugo server
2. Take a screenshot of the canvas
3. Save as preview.png in this directory
4. Commit with your sketch files
-->
