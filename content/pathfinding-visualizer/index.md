---
title: "Pathfinding Algorithm Visualizer"
date: 2026-03-27T00:00:00-05:00
description: "Step-by-step visualization of five pathfinding algorithms on hand-crafted maps"
usage: "Select a map and algorithm, then use Step to advance one node at a time, or Play for continuous playback. Hover tiles to see g/h/f scores."
draft: false
scripts:
  - "maps.js"
  - "main.js"
technical_details: |
  <ul>
    <li><strong>A*:</strong> Optimal — combines actual cost (g) with heuristic (h). Explores fewest nodes of any optimal algorithm.</li>
    <li><strong>Dijkstra:</strong> Optimal — no heuristic, expands uniformly by cost. Explores more nodes than A*.</li>
    <li><strong>Greedy Best-First:</strong> Not optimal — uses only heuristic, beelines toward goal. Fast but can find suboptimal paths.</li>
    <li><strong>BFS:</strong> Optimal for unweighted graphs — explores in rings by depth. Simple but thorough.</li>
    <li><strong>Jump Point Search:</strong> Optimal — A* optimization that skips symmetric paths on uniform grids. Dramatically fewer node expansions.</li>
  </ul>
controls: |
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <div>
      <strong>Map</strong>
      <div style="margin-top: 8px;">
        <select id="map-select" class="control-select" style="width: 200px;"></select>
      </div>
    </div>

    <div>
      <strong>Algorithm</strong>
      <div style="margin-top: 8px;">
        <select id="algorithm-select" class="control-select" style="width: 200px;">
          <option value="astar">A*</option>
          <option value="dijkstra">Dijkstra</option>
          <option value="greedy">Greedy Best-First</option>
          <option value="bfs">BFS</option>
          <option value="jps">Jump Point Search</option>
        </select>
      </div>
    </div>

    <div style="padding-top: 12px; border-top: 1px solid #333;">
      <strong>Playback</strong>
      <div style="display: flex; gap: 8px; margin-top: 8px;">
        <button id="play-btn" class="control-button">Play</button>
        <button id="step-btn" class="control-button">Step</button>
        <button id="reset-btn" class="control-button">Reset</button>
      </div>
      <div style="margin-top: 8px;">
        <label for="speed-slider">Speed: <span id="speed-value">5</span></label>
        <input type="range" id="speed-slider" class="control-slider" min="1" max="30" value="5" style="width: 200px;">
      </div>
    </div>

    <div style="padding-top: 12px; border-top: 1px solid #333;">
      <strong>Stats</strong>
      <div style="font-family: monospace; font-size: 0.9em; margin-top: 8px; line-height: 1.8;">
        Nodes explored: <span id="stat-explored">0</span><br>
        Frontier size: <span id="stat-frontier">0</span><br>
        Path length: <span id="stat-path">—</span>
      </div>
    </div>

    <div style="padding-top: 12px; border-top: 1px solid #333; font-size: 0.85em; color: #888;">
      <strong>Legend</strong>
      <div style="margin-top: 4px; font-family: monospace; line-height: 1.8;">
        <span style="color: #60a5fa;">@</span> Start &nbsp;
        <span style="color: #4ade80;">★</span> Goal<br>
        <span style="background: rgba(59,130,246,0.3); padding: 0 4px;">·</span> Explored &nbsp;
        <span style="background: rgba(251,191,36,0.3); padding: 0 4px;">·</span> Frontier<br>
        <span style="background: rgba(251,191,36,0.6); padding: 0 4px;">·</span> Current &nbsp;
        <span style="background: rgba(249,115,22,0.5); padding: 0 4px;">·</span> Path
      </div>
    </div>
  </div>
---
