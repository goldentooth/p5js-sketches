---
title: "Combat Strategies"
date: 2025-11-25T20:37:07-05:00
description: "Testing ground for monster AI, combat systems, and multi-modal perception"
usage: "Move with arrow keys/WASD/hjkl/numpad. This sketch demonstrates different monster AI behaviors and combat strategies."
draft: false
scripts:
  - "main.js"
technical_details: |
  <ul>
    <li><strong>Map Generation:</strong> Procedural dungeon with rooms and corridors</li>
    <li><strong>Field of View:</strong> Shadowcasting algorithm (always enabled)</li>
    <li><strong>Combat:</strong> Turn-based melee combat system</li>
    <li><strong>AI:</strong> Multiple monster archetypes with different perception and behavior</li>
    <li><strong>Perception:</strong> Vision, hearing, smell, blindsight</li>
  </ul>
controls: |
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <div style="padding-bottom: 12px; border-bottom: 1px solid #ddd;">
      <strong>Map Controls</strong>
      <div style="margin-top: 8px;">
        <button id="regenerate-btn" class="control-button">Regenerate Map</button>
      </div>
    </div>

    <div style="padding-top: 12px;">
      <strong>Monster Spawning</strong> (Coming in Stage 10)
      <!-- Will add spawn density, monster type controls here -->
    </div>

    <div style="padding-top: 12px;">
      <strong>Combat Info</strong> (Coming in Stage 7)
      <!-- Will add health display, combat log here -->
    </div>

    <div style="font-size: 0.9em; color: #666; margin-top: 8px;">
      <strong>Movement:</strong> Arrow Keys / WASD / hjkl / Numpad
    </div>
  </div>
---

This sketch serves as a testbed for implementing the monster AI system described in the implementation plan (Stages 6-12). Features will be added incrementally as each stage is completed.

**Planned Features:**
- **Stage 6:** Multi-modal perception (hearing, smell, blindsight)
- **Stage 7:** Turn-based combat with health and damage
- **Stage 8:** Pathfinding (A*, Dijkstra maps)
- **Stage 9:** Monster archetypes (goblins, orcs, kobolds, etc.)
- **Stage 10:** Monster spawning and integration
- **Stage 11:** Advanced AI (pack tactics, sound/scent propagation)
- **Stage 12:** Alternative demos

**Current Status:** Foundation complete, ready for Stage 6 implementation.
