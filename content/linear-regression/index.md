---
title: "Linear Regression Playground"
date: 2025-07-29
description: "An interactive visualization demonstrating linear regression algorithms. Watch as the algorithm learns to fit a line through scattered data points using gradient descent. You can choose between different learning approaches and see how the predicted line gradually converges to match the underlying pattern in the data."
usage: 'Use the dropdown to select different regression algorithms ("simple" uses a quadrant-based approach, "square" uses the squared error loss, and "absolute" uses the absolute error loss). Click "Regenerate" to create new random data points and reset the learning process.'
scripts:
  - "sketch.js"
controls: |
  <button id="regenerate-btn" class="control-button">Regenerate</button>
  <button id="train-btn" class="control-button">Train / Pause</button>
  <select id="algorithm-select" class="control-select">
    <option value="simple">Simple (Quadrant)</option>
    <option value="square">Square Error</option>
    <option value="absolute">Absolute Error</option>
  </select>
technical_details: |
  <ul>
    <li><strong>Algorithm:</strong> Implements both quadrant-based and gradient descent approaches</li>
    <li><strong>Learning Rate:</strong> Adaptive rates for weight (0.0002) and bias (0.008) updates</li>
    <li><strong>Data Generation:</strong> Random linear relationship with Gaussian noise</li>
    <li><strong>Visualization:</strong> Real-time display of data points, predicted line, and learning progress</li>
  </ul>
---
