---
title: "Spirobiomorphs"
date: 2026-05-05
description: |
  Dawkins' biomorphs crossed with a Spirograph kaleidoscope. Breed
  layered hypotrochoid specimens by clicking children in a 3x3 grid;
  the clicked child becomes the new parent and 8 fresh mutants spawn.
  Inspired by The Blind Watchmaker (Dawkins, 1986).
usage: |
  Click any child to make it the new parent. Use Back/Forward to
  navigate breeding history. Save favorites to keep them around.
scripts:
  - "main.js"
controls: |
  <div style="display: flex; flex-direction: column; gap: 10px;">
    <div id="control-row-buttons"></div>
    <div id="control-row-sliders"></div>
    <div id="status-line" style="font-size: 0.85em; color: #aaa;"></div>
    <div id="saved-strip" style="display: flex; gap: 6px; overflow-x: auto; min-height: 130px;"></div>
  </div>
technical_details: |
  <ul>
    <li><strong>Status:</strong> work in progress.</li>
  </ul>
draft: false
---
