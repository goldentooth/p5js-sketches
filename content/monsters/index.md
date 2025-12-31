---
title: "Monsters"
date: 2025-12-30T00:00:00-05:00
description: "Roguelike with AI monsters, pathfinding, and combat"
usage: "Move with arrow keys/WASD/hjkl. Bump into monsters to attack. Press Space to wait. Kill all monsters to win!"
draft: false
scripts:
  - "main.js"
technical_details: |
  <ul>
    <li><strong>AI:</strong> Monsters chase the player when visible (independent FOV per monster)</li>
    <li><strong>Pathfinding:</strong> A* algorithm for intelligent navigation around obstacles</li>
    <li><strong>Combat:</strong> Bump-to-attack with attack/defense stats</li>
    <li><strong>Turn System:</strong> Energy-based turns - faster entities act more often</li>
    <li><strong>Monster Types:</strong> Goblins, Orcs, and Trolls with different stats</li>
  </ul>
below_canvas: |
  <div id="game-message" style="padding: 8px; background: #1a1a1a; border-radius: 4px; font-size: 0.9em; min-height: 80px; font-family: monospace; line-height: 1.4;"></div>
controls: |
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <div>
      <button id="regenerate-btn" class="control-button">New Game</button>
    </div>

    <div style="font-size: 0.9em; color: #666;">
      <strong>Movement:</strong> Arrow Keys / WASD / hjkl / Numpad<br>
      <strong>Attack:</strong> Bump into enemies<br>
      <strong>Wait:</strong> Space or Period (skip turn)
    </div>

    <div style="padding-top: 12px; border-top: 1px solid #333;">
      <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
        <input type="checkbox" id="show-viewsheds-checkbox">
        <span>Show Monster Vision</span>
      </label>
    </div>

    <div style="padding-top: 12px; border-top: 1px solid #333;">
      <strong>Monster Guide</strong>
      <div style="display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; margin-top: 8px; font-family: monospace; font-size: 0.85em;">
        <span style="color: #0f0;">g</span><span>Goblin - Fast, weak (HP:5, ATK:2)</span>
        <span style="color: #0b0;">o</span><span>Orc - Balanced (HP:10, ATK:3, DEF:1)</span>
        <span style="color: #084;">T</span><span>Troll - Slow, tough (HP:20, ATK:4, DEF:2)</span>
      </div>
    </div>
  </div>
---
