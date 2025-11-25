import { describe, it, expect } from 'vitest';
import { createRoom, roomsOverlap, carveRoom, Tiles, createMap } from '../src';

describe('Room Creation', () => {
  it('should create a room with position and dimensions', () => {
    const room = createRoom(5, 10, 8, 6);
    expect(room.x).toBe(5);
    expect(room.y).toBe(10);
    expect(room.width).toBe(8);
    expect(room.height).toBe(6);
  });

  it('should calculate room center', () => {
    const room = createRoom(10, 10, 6, 4);
    const center = room.center();

    // Center of a 6x4 room at (10, 10) should be (13, 12)
    // x: 10 + 6/2 = 13, y: 10 + 4/2 = 12
    expect(center.x).toBe(13);
    expect(center.y).toBe(12);
  });

  it('should calculate center for odd dimensions', () => {
    const room = createRoom(0, 0, 5, 3);
    const center = room.center();

    // Center of a 5x3 room at (0, 0) should be (2, 1)
    expect(center.x).toBe(2);
    expect(center.y).toBe(1);
  });

  it('should calculate room bounds', () => {
    const room = createRoom(5, 10, 8, 6);

    expect(room.x1()).toBe(5);   // left edge
    expect(room.x2()).toBe(12);  // right edge (5 + 8 - 1)
    expect(room.y1()).toBe(10);  // top edge
    expect(room.y2()).toBe(15);  // bottom edge (10 + 6 - 1)
  });

  it('should handle single-tile rooms', () => {
    const room = createRoom(5, 5, 1, 1);

    expect(room.x1()).toBe(5);
    expect(room.x2()).toBe(5);
    expect(room.y1()).toBe(5);
    expect(room.y2()).toBe(5);

    const center = room.center();
    expect(center.x).toBe(5);
    expect(center.y).toBe(5);
  });
});

describe('Room Overlap Detection', () => {
  it('should detect overlapping rooms', () => {
    const room1 = createRoom(5, 5, 10, 10);
    const room2 = createRoom(10, 10, 10, 10);

    expect(roomsOverlap(room1, room2)).toBe(true);
  });

  it('should detect non-overlapping rooms', () => {
    const room1 = createRoom(5, 5, 5, 5);
    const room2 = createRoom(15, 15, 5, 5);

    expect(roomsOverlap(room1, room2)).toBe(false);
  });

  it('should handle rooms that share an edge (not overlapping)', () => {
    const room1 = createRoom(5, 5, 5, 5);   // x: 5-9, y: 5-9
    const room2 = createRoom(10, 5, 5, 5);  // x: 10-14, y: 5-9

    // Sharing edge should not count as overlap
    expect(roomsOverlap(room1, room2)).toBe(false);
  });

  it('should detect room completely inside another', () => {
    const large = createRoom(5, 5, 20, 20);
    const small = createRoom(10, 10, 5, 5);

    expect(roomsOverlap(large, small)).toBe(true);
    expect(roomsOverlap(small, large)).toBe(true);
  });

  it('should handle rooms overlapping at corners only', () => {
    const room1 = createRoom(5, 5, 5, 5);   // x: 5-9, y: 5-9
    const room2 = createRoom(9, 9, 5, 5);   // x: 9-13, y: 9-13

    // Corner overlap should count as overlap
    expect(roomsOverlap(room1, room2)).toBe(true);
  });

  it('should handle rooms offset vertically', () => {
    const room1 = createRoom(5, 5, 10, 10);  // x: 5-14, y: 5-14
    const room2 = createRoom(5, 20, 10, 10); // x: 5-14, y: 20-29

    expect(roomsOverlap(room1, room2)).toBe(false);
  });

  it('should handle rooms offset horizontally', () => {
    const room1 = createRoom(5, 5, 10, 10);  // x: 5-14, y: 5-14
    const room2 = createRoom(20, 5, 10, 10); // x: 20-29, y: 5-14

    expect(roomsOverlap(room1, room2)).toBe(false);
  });
});

describe('Room Carving', () => {
  it('should carve a room into the map', () => {
    const map = createMap(20, 20);
    const room = createRoom(5, 5, 5, 5);

    carveRoom(map, room);

    // Check that room interior is floors
    for (let y = 5; y < 10; y++) {
      for (let x = 5; x < 10; x++) {
        expect(map.getTile(x, y)).toBe(Tiles.Floor);
      }
    }
  });

  it('should not affect tiles outside the room', () => {
    const map = createMap(20, 20);
    const room = createRoom(5, 5, 5, 5);

    carveRoom(map, room);

    // Check that tiles outside room remain walls
    expect(map.getTile(4, 5)).toBe(Tiles.Wall);
    expect(map.getTile(10, 5)).toBe(Tiles.Wall);
    expect(map.getTile(5, 4)).toBe(Tiles.Wall);
    expect(map.getTile(5, 10)).toBe(Tiles.Wall);
  });

  it('should carve multiple rooms without affecting each other', () => {
    const map = createMap(30, 30);
    const room1 = createRoom(5, 5, 5, 5);
    const room2 = createRoom(15, 15, 5, 5);

    carveRoom(map, room1);
    carveRoom(map, room2);

    // Check both rooms are carved
    expect(map.getTile(7, 7)).toBe(Tiles.Floor);   // Inside room1
    expect(map.getTile(17, 17)).toBe(Tiles.Floor); // Inside room2

    // Check space between remains walls
    expect(map.getTile(12, 12)).toBe(Tiles.Wall);
  });

  it('should handle rooms at map edges', () => {
    const map = createMap(20, 20);
    const room = createRoom(0, 0, 5, 5);

    carveRoom(map, room);

    expect(map.getTile(0, 0)).toBe(Tiles.Floor);
    expect(map.getTile(4, 4)).toBe(Tiles.Floor);
  });

  it('should carve single-tile room', () => {
    const map = createMap(10, 10);
    const room = createRoom(5, 5, 1, 1);

    carveRoom(map, room);

    expect(map.getTile(5, 5)).toBe(Tiles.Floor);
    expect(map.getTile(4, 5)).toBe(Tiles.Wall);
    expect(map.getTile(6, 5)).toBe(Tiles.Wall);
  });
});
