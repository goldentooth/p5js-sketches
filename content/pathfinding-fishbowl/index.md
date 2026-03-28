---
title: "Pathfinding Fishbowl"
date: 2026-03-27T00:00:00-05:00
description: "Zero-player roguelike fishbowl — monsters hunt and flee each other using rock-paper-scissors predation rules"
usage: "Watch monsters roam, hunt, and flee. Goblins hunt Trolls, Orcs hunt Goblins, Trolls hunt Orcs. Adjust population and speed with the sliders."
draft: false
scripts:
  - "ai.js"
  - "main.js"
technical_details: |
  <ul>
    <li><strong>Predation:</strong> Rock-paper-scissors — Goblins beat Trolls, Orcs beat Goblins, Trolls beat Orcs</li>
    <li><strong>AI States:</strong> Wander (random destination), Hunt (pathfind to prey), Flee (run from predator)</li>
    <li><strong>Pathfinding:</strong> A* algorithm for all navigation</li>
    <li><strong>Combat:</strong> Energy-based turns with attack/defense stats. Lethal — dead monsters respawn.</li>
    <li><strong>FOV:</strong> Monsters have independent vision — they only react to what they can see</li>
  </ul>
controls: |
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <div>
      <strong>Population</strong>
      <div style="margin-top: 8px;">
        <label for="population-slider">Target: <span id="population-value">20</span></label>
        <input type="range" id="population-slider" class="control-slider" min="5" max="40" value="20" style="width: 200px;">
      </div>
    </div>

    <div style="padding-top: 12px; border-top: 1px solid #333;">
      <strong>Playback</strong>
      <div style="display: flex; gap: 8px; margin-top: 8px;">
        <button id="play-btn" class="control-button">Pause</button>
        <button id="step-btn" class="control-button">Step</button>
        <button id="regen-btn" class="control-button">Regenerate Map</button>
      </div>
      <div style="margin-top: 8px;">
        <label for="speed-slider">Speed: <span id="speed-value">10</span> tps</label>
        <input type="range" id="speed-slider" class="control-slider" min="1" max="30" value="10" style="width: 200px;">
      </div>
    </div>

    <div style="padding-top: 12px; border-top: 1px solid #333;">
      <strong>Stats</strong>
      <div style="font-family: monospace; font-size: 0.9em; margin-top: 8px; line-height: 1.8;">
        <span style="color: #4ade80;">Goblins: <span id="stat-goblins">0</span></span> &nbsp;
        <span style="color: #f97316;">Orcs: <span id="stat-orcs">0</span></span> &nbsp;
        <span style="color: #ef4444;">Trolls: <span id="stat-trolls">0</span></span><br>
        Total: <span id="stat-total">0</span> / <span id="stat-target">20</span> &nbsp;
        Kills: <span id="stat-kills">0</span>
      </div>
    </div>

    <div style="padding-top: 12px; border-top: 1px solid #333; font-size: 0.85em; color: #888;">
      <strong>Monster Guide</strong>
      <div style="margin-top: 4px; font-family: monospace; line-height: 1.8;">
        <span style="color: #4ade80;">g</span> Goblin — hunts Trolls, flees Orcs<br>
        <span style="color: #f97316;">o</span> Orc — hunts Goblins, flees Trolls<br>
        <span style="color: #ef4444;">T</span> Troll — hunts Orcs, flees Goblins
      </div>
    </div>
  </div>
---
