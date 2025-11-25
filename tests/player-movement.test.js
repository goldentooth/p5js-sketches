import { describe, it, expect, beforeEach } from 'vitest';
import {
  createWorld,
  createMap,
  Tiles,
  Cardinal,
  Diagonal,
  MovementSystem
} from '../src';

describe('PlayerControlled Component', () => {
  let world;

  beforeEach(() => {
    world = createWorld();
  });

  it('should create entity with PlayerControlled component', () => {
    const entity = world.createEntity();
    world.addComponent(entity, 'PlayerControlled', {});

    const component = world.getComponent(entity, 'PlayerControlled');
    expect(component).toBeDefined();
  });

  it('should query entities with PlayerControlled', () => {
    const player = world.createEntity();
    world.addComponent(player, 'PlayerControlled', {});
    world.addComponent(player, 'Position', { x: 5, y: 5 });

    const other = world.createEntity();
    world.addComponent(other, 'Position', { x: 10, y: 10 });

    const controlled = Array.from(world.query(['PlayerControlled']));
    expect(controlled.length).toBe(1);
    expect(controlled[0]).toBe(player);
  });

  it('should support multiple player-controlled entities', () => {
    const player1 = world.createEntity();
    world.addComponent(player1, 'PlayerControlled', {});

    const player2 = world.createEntity();
    world.addComponent(player2, 'PlayerControlled', {});

    const controlled = Array.from(world.query(['PlayerControlled']));
    expect(controlled.length).toBe(2);
  });
});

describe('MovementSystem', () => {
  let world;
  let map;
  let system;

  beforeEach(() => {
    world = createWorld();
    map = createMap(20, 20, { defaultTile: Tiles.Floor });
    system = new MovementSystem(map);
  });

  it('should move entity in valid direction', () => {
    const entity = world.createEntity();
    world.addComponent(entity, 'Position', { x: 10, y: 10 });
    world.addComponent(entity, 'PlayerControlled', {});

    // Move north
    system.tryMove(world, entity, Cardinal.NORTH);

    const pos = world.getComponent(entity, 'Position');
    expect(pos.x).toBe(10);
    expect(pos.y).toBe(9);
  });

  it('should not move into walls', () => {
    // Create map with walls
    const walledMap = createMap(20, 20);
    const walledSystem = new MovementSystem(walledMap);

    const entity = world.createEntity();
    world.addComponent(entity, 'Position', { x: 10, y: 10 });
    world.addComponent(entity, 'PlayerControlled', {});

    // Try to move into wall (map is all walls by default)
    walledSystem.tryMove(world, entity, Cardinal.NORTH);

    const pos = world.getComponent(entity, 'Position');
    expect(pos.x).toBe(10);
    expect(pos.y).toBe(10); // Should not have moved
  });

  it('should move in all cardinal directions', () => {
    const entity = world.createEntity();
    world.addComponent(entity, 'Position', { x: 10, y: 10 });
    world.addComponent(entity, 'PlayerControlled', {});

    // North
    system.tryMove(world, entity, Cardinal.NORTH);
    expect(world.getComponent(entity, 'Position').y).toBe(9);

    // South
    system.tryMove(world, entity, Cardinal.SOUTH);
    expect(world.getComponent(entity, 'Position').y).toBe(10);

    // East
    system.tryMove(world, entity, Cardinal.EAST);
    expect(world.getComponent(entity, 'Position').x).toBe(11);

    // West
    system.tryMove(world, entity, Cardinal.WEST);
    expect(world.getComponent(entity, 'Position').x).toBe(10);
  });

  it('should move in diagonal directions', () => {
    const entity = world.createEntity();
    world.addComponent(entity, 'Position', { x: 10, y: 10 });
    world.addComponent(entity, 'PlayerControlled', {});

    // Northeast
    system.tryMove(world, entity, Diagonal.NORTHEAST);
    expect(world.getComponent(entity, 'Position').x).toBe(11);
    expect(world.getComponent(entity, 'Position').y).toBe(9);

    // Reset
    world.getComponent(entity, 'Position').x = 10;
    world.getComponent(entity, 'Position').y = 10;

    // Southwest
    system.tryMove(world, entity, Diagonal.SOUTHWEST);
    expect(world.getComponent(entity, 'Position').x).toBe(9);
    expect(world.getComponent(entity, 'Position').y).toBe(11);
  });

  it('should not move out of bounds with blocking edges', () => {
    const entity = world.createEntity();
    world.addComponent(entity, 'Position', { x: 0, y: 0 });
    world.addComponent(entity, 'PlayerControlled', {});

    // Try to move out of bounds
    system.tryMove(world, entity, Cardinal.NORTH);
    expect(world.getComponent(entity, 'Position').y).toBe(0);

    system.tryMove(world, entity, Cardinal.WEST);
    expect(world.getComponent(entity, 'Position').x).toBe(0);
  });

  it('should handle wrapping map edges', () => {
    const wrappingMap = createMap(10, 10, {
      defaultTile: Tiles.Floor,
      edgeBehavior: 'wrap'
    });
    const wrappingSystem = new MovementSystem(wrappingMap);

    const entity = world.createEntity();
    world.addComponent(entity, 'Position', { x: 0, y: 0 });
    world.addComponent(entity, 'PlayerControlled', {});

    // Move west from edge - should wrap
    wrappingSystem.tryMove(world, entity, Cardinal.WEST);
    expect(world.getComponent(entity, 'Position').x).toBe(9);

    // Move north from edge - should wrap
    world.getComponent(entity, 'Position').y = 0;
    wrappingSystem.tryMove(world, entity, Cardinal.NORTH);
    expect(world.getComponent(entity, 'Position').y).toBe(9);
  });

  it('should move multiple controlled entities independently', () => {
    const player1 = world.createEntity();
    world.addComponent(player1, 'Position', { x: 5, y: 5 });
    world.addComponent(player1, 'PlayerControlled', {});

    const player2 = world.createEntity();
    world.addComponent(player2, 'Position', { x: 15, y: 15 });
    world.addComponent(player2, 'PlayerControlled', {});

    // Move player1
    system.tryMove(world, player1, Cardinal.NORTH);
    expect(world.getComponent(player1, 'Position').y).toBe(4);
    expect(world.getComponent(player2, 'Position').y).toBe(15); // Unchanged

    // Move player2
    system.tryMove(world, player2, Cardinal.EAST);
    expect(world.getComponent(player2, 'Position').x).toBe(16);
    expect(world.getComponent(player1, 'Position').x).toBe(5); // Unchanged
  });

  it('should not allow movement into occupied spaces', () => {
    const player = world.createEntity();
    world.addComponent(player, 'Position', { x: 10, y: 10 });
    world.addComponent(player, 'PlayerControlled', {});

    const obstacle = world.createEntity();
    world.addComponent(obstacle, 'Position', { x: 10, y: 9 });
    world.addComponent(obstacle, 'BlocksMovement', {});

    // Try to move into occupied space
    system.tryMove(world, player, Cardinal.NORTH);

    // Should not have moved
    expect(world.getComponent(player, 'Position').y).toBe(10);
  });
});

describe('MovementSystem Integration', () => {
  it('should process movement commands during system run', () => {
    const world = createWorld();
    const map = createMap(20, 20, { defaultTile: Tiles.Floor });
    const system = new MovementSystem(map);

    const entity = world.createEntity();
    world.addComponent(entity, 'Position', { x: 10, y: 10 });
    world.addComponent(entity, 'PlayerControlled', {});

    // Queue a move command
    system.queueCommand(entity, { type: 'move', direction: Cardinal.NORTH });

    // Run the system
    world.addSystem(system);
    world.tick(0);

    // Entity should have moved
    const pos = world.getComponent(entity, 'Position');
    expect(pos.y).toBe(9);
  });

  it('should process multiple queued commands in order', () => {
    const world = createWorld();
    const map = createMap(20, 20, { defaultTile: Tiles.Floor });
    const system = new MovementSystem(map);

    const entity = world.createEntity();
    world.addComponent(entity, 'Position', { x: 10, y: 10 });
    world.addComponent(entity, 'PlayerControlled', {});

    // Queue multiple commands
    system.queueCommand(entity, { type: 'move', direction: Cardinal.NORTH });
    system.queueCommand(entity, { type: 'move', direction: Cardinal.EAST });

    world.addSystem(system);

    // First tick - should move north
    world.tick(0);
    expect(world.getComponent(entity, 'Position').x).toBe(10);
    expect(world.getComponent(entity, 'Position').y).toBe(9);

    // Second tick - should move east
    world.tick(0);
    expect(world.getComponent(entity, 'Position').x).toBe(11);
    expect(world.getComponent(entity, 'Position').y).toBe(9);
  });
});
