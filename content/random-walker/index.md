---
title: "Random Walker"
date: 2025-10-13T19:30:18-04:00
description: |
  A simple random-walk algorithm to carve a dungeon out of the very bones of our mother, the mountain.
usage: |
  Use "Pause/Resume" to stop and start the generation. Use "Step" to advance one frame at a time. Use "Clear" to restart with a fresh map. Adjust the speed slider to control how many steps are taken per frame.
scripts:
  - "main.js"
controls: |
  <button id="pause-btn" class="control-button">Pause</button>
  <button id="step-btn" class="control-button">Step</button>
  <button id="clear-btn" class="control-button">Clear</button>
  <label for="speed-slider">Speed: <span id="speed-value">1</span></label>
  <input type="range" id="speed-slider" class="control-slider" min="1" max="10" value="1">
technical_details: |
  <ul>
    <li><strong>Algorithm:</strong> In this algorithm, also called a "Drunkard's Walk," we just start in the middle and walk, moving each step in a random direction. It's not terribly elegant, nor does it match the typical room-and-hallway structure we expect to see in a roguelike, but it does guarantee that each traversable tile is reachable from all others.</li>
    <li><strong>Visualization:</strong> For a (modest) amount of eyecandy, each successive walker receives their own random color.</li>
  </ul>
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
