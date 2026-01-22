---
title: "Shared Priors Collapse Communication Complexity"
date: 2026-01-21
scripts:
  - "main.js"
description: "An interactive demonstration of how shared knowledge dramatically reduces communication costs. The left panel shows a complex curve held by Alice. The right panel shows what Bob can reconstruct from a limited message. When both share the same generator (a prior), Alice can transmit just a tiny seed to reproduce rich structure. Without shared priors, Alice must send sampled values—more bits mean better reconstruction."
usage: "Press S to toggle shared model on/off. Press +/- to increase/decrease the bit budget. Press R to generate a new random curve. Observe how shared priors allow near-perfect reconstruction with minimal bits, while no shared prior requires many more bits to approximate the curve."
technical_details: |
  <ul>
    <li><strong>Shared Model ON:</strong> Alice sends a quantized seed (up to 16 bits); Bob regenerates the exact curve using the same generator function</li>
    <li><strong>Shared Model OFF:</strong> Alice sends evenly-spaced y-samples (8 bits each); Bob interpolates linearly between them</li>
    <li><strong>Curve Generation:</strong> Perlin noise combined with sinusoidal harmonics, parameterized by a random seed</li>
    <li><strong>Error Metric:</strong> Mean absolute error between truth and reconstruction</li>
  </ul>
---
