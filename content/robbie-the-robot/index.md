---
title: "Robbie the Robot - Genetic Algorithm Evolution"
date: 2025-08-04
description: "Watch as a population of robots evolves using genetic algorithms to efficiently collect cans in a grid world. Each robot is controlled by a simple genome - the best performers pass their \"genes\" to the next generation, while poor performers are eliminated. Over hundreds of generations, you'll see increasingly intelligent behavior emerge."
usage: "The visualization shows the best robot from the current generation navigating a 10×10 grid world containing 50 randomly placed cans. The genetic algorithm runs in a background worker thread with a population of 20,000 robots per generation."
scripts:
  - "world.js"
  - "robot.js"
  - "simulation.js"
  - "main.js"
technical_details: |
  <ul>
    <li><strong>Population Size:</strong> 20,000 robots per generation</li>
    <li><strong>Genome:</strong> Each robot has a simple genome that matches a possible state (the presence or absence of a can or wall at each of the four cardinal directions, plus the present square) with an action (move in a cardinal direction, move randomly (but safely), or attempt to take the can at the present square)</li>
    <li><strong>Fitness Function:</strong> Robots are scored based on cans collected during their lifetime</li>
    <li><strong>Selection:</strong> Top performers are selected for reproduction with mutation</li>
    <li><strong>Environment:</strong> 10×10 grid world with 50 randomly distributed cans</li>
    <li><strong>Lifespan:</strong> Each robot gets 200 moves (2 × grid area) to collect as many cans as possible</li>
    <li><strong>Implementation:</strong> Uses Web Workers for non-blocking genetic algorithm computation</li>
  </ul>
  <div class="generation-info">
    <h3>Evolution Progress</h3>
    <p>Monitor the browser console to see generation-by-generation progress including best and worst fitness scores. You should observe steady improvement over time as successful strategies emerge and spread through the population.</p>
  </div>
---
