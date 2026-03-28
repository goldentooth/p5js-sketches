---
title: "GOAP Survival"
date: 2026-03-28T00:00:00-05:00
description: "Educational single-agent survival demo using Goal-Oriented Action Planning (GOAP) with a real-time plan inspector"
usage: "Watch the agent survive in a procedural wilderness. The side panel shows GOAP reasoning in real time. Toggle between Proactive (plans ahead) and Reactive (only responds to current needs) modes."
draft: false
scripts:
  - "actions.js"
  - "world-state.js"
  - "needs.js"
  - "map-gen.js"
  - "lighting.js"
  - "rendering.js"
  - "main.js"
technical_details: |
  <ul>
    <li><strong>GOAP Planner:</strong> Regressive A* search over abstract world states — plans multi-step action chains (gather sticks, craft axe, chop tree, build fire)</li>
    <li><strong>Needs:</strong> Hunger, warmth, and health decay over time. Agent dies when any need hits zero.</li>
    <li><strong>Day/Night:</strong> 120-tick cycle with sinusoidal sun. Campfires and torches create light islands at night.</li>
    <li><strong>Foresight Toggle:</strong> Proactive mode anticipates future needs; reactive mode only responds to current conditions.</li>
    <li><strong>Monsters:</strong> Zombies and skeletons spawn at night in dark areas, despawn at dawn.</li>
  </ul>
controls: |
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <div>
      <strong>Playback</strong>
      <div style="display: flex; gap: 8px; margin-top: 8px;">
        <button id="play-btn" class="control-button">Pause</button>
        <button id="step-btn" class="control-button">Step</button>
        <button id="regen-btn" class="control-button">Regenerate</button>
      </div>
      <div style="margin-top: 8px;">
        <label for="speed-slider">Speed: <span id="speed-value">5</span> tps</label>
        <input type="range" id="speed-slider" class="control-slider" min="1" max="30" value="5" style="width: 200px;">
      </div>
    </div>

    <div style="padding-top: 12px; border-top: 1px solid #333;">
      <strong>AI Mode</strong>
      <div style="display: flex; gap: 8px; margin-top: 8px;">
        <button id="foresight-btn" class="control-button">Proactive</button>
        <span id="foresight-label" style="color: #888; font-size: 0.85em; align-self: center;">Agent plans ahead for future needs</span>
      </div>
    </div>

    <div style="padding-top: 12px; border-top: 1px solid #333;">
      <strong>Stats</strong>
      <div style="font-family: monospace; font-size: 0.9em; margin-top: 8px; line-height: 1.8;">
        Survived: <span id="stat-ticks">0</span> ticks &nbsp;
        Deaths: <span id="stat-deaths">0</span> &nbsp;
        Plans: <span id="stat-plans">0</span><br>
        Goal: <span id="stat-goal" style="color: #aaa;">none</span> &nbsp;
        Action: <span id="stat-action" style="color: #aaa;">idle</span>
      </div>
    </div>

    <div style="padding-top: 12px; border-top: 1px solid #333; font-size: 0.85em; color: #888;">
      <strong>Legend</strong>
      <div style="margin-top: 4px; font-family: monospace; line-height: 1.8;">
        <span style="color: #fff;">@</span> Agent &nbsp;
        <span style="color: #228B22;">T</span> Tree &nbsp;
        <span style="color: #8B4513;">/</span> Sticks &nbsp;
        <span style="color: #808080;">^</span> Rock &nbsp;
        <span style="color: #800080;">b</span> Berries &nbsp;
        <span style="color: #FFA500;">*</span> Fire<br>
        <span style="color: #556B2F;">&clubs;</span> Dense forest &nbsp;
        <span style="color: #4169E1;">~</span> Water &nbsp;
        <span style="color: #2E8B57;">Z</span> Zombie &nbsp;
        <span style="color: #fff;">S</span> Skeleton
      </div>
    </div>
  </div>
---
