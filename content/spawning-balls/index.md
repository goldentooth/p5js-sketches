---
title: "Spawning Balls"
date: 2025-12-26T19:44:03-05:00
description: |
  Colorful balls bounce inside a circular boundary, spawning new balls when they collide.
usage: |
  Watch balls bounce and multiply as they collide. Click inside the circle to spawn a new ball (zaps a random ball if at the limit). Use Reset to start over. Enable Trails for motion ribbons, and adjust sliders for ball size, max count, and trail length.
draft: false
scripts:
  - "main.js"
controls: |
  <button id="reset-btn" class="control-button">Reset</button>
  <label for="size-slider">Ball Size: <span id="size-value">8</span></label>
  <input type="range" id="size-slider" class="control-slider" min="3" max="20" value="8">
  <label for="limit-slider">Max Balls: <span id="limit-value">50</span></label>
  <input type="range" id="limit-slider" class="control-slider" min="10" max="200" value="50">
  <span id="ball-count">Balls: 2</span>
  <br>
  <label><input type="checkbox" id="trails-checkbox"> Trails</label>
  <label for="trail-slider">Trail Length: <span id="trail-value">20</span></label>
  <input type="range" id="trail-slider" class="control-slider" min="5" max="50" value="20">
technical_details: |
  <ul>
    <li><strong>Physics:</strong> Balls bounce off the circular boundary using vector reflection. Ball-to-ball collisions use elastic collision physics with proper separation to prevent overlap. Wall bounces include tiny random jitter for variety.</li>
    <li><strong>Spawning:</strong> When two balls collide, a new ball spawns at the collision point with a random velocity and color. A cooldown prevents rapid-fire spawning from overlapping balls.</li>
    <li><strong>Trails:</strong> Optional motion trails render as fading, tapered lines behind each ball.</li>
    <li><strong>Interaction:</strong> Click to manually spawn balls. Lowering the max limit culls excess balls immediately.</li>
  </ul>
---
