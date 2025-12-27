---
title: "Spawning Balls"
date: 2025-12-26T19:44:03-05:00
description: |
  Balls bounce inside a circular boundary. When they collide, new balls spawn until reaching a limit.
usage: |
  Watch as balls bounce and collide inside the circle. Each collision spawns a new ball. Use the sliders to adjust ball size and the maximum count.
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
    <li><strong>Physics:</strong> Balls bounce off the circular boundary using reflection based on the normal vector from the center. Ball-to-ball collisions use elastic collision physics.</li>
    <li><strong>Spawning:</strong> When two balls collide, a new ball spawns at the collision point with a random velocity and color, if below the limit.</li>
  </ul>
---
