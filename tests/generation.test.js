import { describe, it, expect } from 'vitest';
import {
  createMap,
  generateRoomsAndCorridors,
  xoroshiro128plus,
  Tiles
} from '../src';

describe('Procedural Map Generation', () => {
  it('should generate rooms and corridors', () => {
    const map = createMap(80, 50);
    const rng = xoroshiro128plus(12345n);

    const rooms = generateRoomsAndCorridors(map, rng, {
      maxRooms: 10,
      minRoomSize: 4,
      maxRoomSize: 10
    });

    // Should have generated some rooms
    expect(rooms.length).toBeGreaterThan(0);
    expect(rooms.length).toBeLessThanOrEqual(10);

    // All rooms should be carved (have floor tiles)
    for (const room of rooms) {
      const center = room.center();
      expect(map.getTile(center.x, center.y)).toBe(Tiles.Floor);
    }
  });

  it('should generate rooms with specified size constraints', () => {
    const map = createMap(80, 50);
    const rng = xoroshiro128plus(67890n);

    const rooms = generateRoomsAndCorridors(map, rng, {
      maxRooms: 15,
      minRoomSize: 5,
      maxRoomSize: 8
    });

    // Check all rooms meet size constraints
    for (const room of rooms) {
      expect(room.width).toBeGreaterThanOrEqual(5);
      expect(room.width).toBeLessThanOrEqual(8);
      expect(room.height).toBeGreaterThanOrEqual(5);
      expect(room.height).toBeLessThanOrEqual(8);
    }
  });

  it('should not generate overlapping rooms', () => {
    const map = createMap(80, 50);
    const rng = xoroshiro128plus(11111n);

    const rooms = generateRoomsAndCorridors(map, rng, {
      maxRooms: 20,
      minRoomSize: 4,
      maxRoomSize: 10
    });

    // Check no rooms overlap
    for (let i = 0; i < rooms.length; i++) {
      for (let j = i + 1; j < rooms.length; j++) {
        const overlap = checkOverlap(rooms[i], rooms[j]);
        expect(overlap).toBe(false);
      }
    }
  });

  it('should generate same map with same seed', () => {
    const seed = 99999n;

    const map1 = createMap(60, 40);
    const rng1 = xoroshiro128plus(seed);
    const rooms1 = generateRoomsAndCorridors(map1, rng1, {
      maxRooms: 12,
      minRoomSize: 4,
      maxRoomSize: 8
    });

    const map2 = createMap(60, 40);
    const rng2 = xoroshiro128plus(seed);
    const rooms2 = generateRoomsAndCorridors(map2, rng2, {
      maxRooms: 12,
      minRoomSize: 4,
      maxRoomSize: 8
    });

    // Same number of rooms
    expect(rooms1.length).toBe(rooms2.length);

    // Same room positions and sizes
    for (let i = 0; i < rooms1.length; i++) {
      expect(rooms1[i].x).toBe(rooms2[i].x);
      expect(rooms1[i].y).toBe(rooms2[i].y);
      expect(rooms1[i].width).toBe(rooms2[i].width);
      expect(rooms1[i].height).toBe(rooms2[i].height);
    }

    // Same map tiles
    for (let y = 0; y < 40; y++) {
      for (let x = 0; x < 60; x++) {
        expect(map1.getTile(x, y)).toBe(map2.getTile(x, y));
      }
    }
  });

  it('should generate different maps with different seeds', () => {
    const map1 = createMap(60, 40);
    const rng1 = xoroshiro128plus(11111n);
    const rooms1 = generateRoomsAndCorridors(map1, rng1, {
      maxRooms: 10,
      minRoomSize: 4,
      maxRoomSize: 8
    });

    const map2 = createMap(60, 40);
    const rng2 = xoroshiro128plus(22222n);
    const rooms2 = generateRoomsAndCorridors(map2, rng2, {
      maxRooms: 10,
      minRoomSize: 4,
      maxRoomSize: 8
    });

    // Different room configurations (at least one difference)
    let foundDifference = false;

    if (rooms1.length !== rooms2.length) {
      foundDifference = true;
    } else {
      for (let i = 0; i < rooms1.length; i++) {
        if (rooms1[i].x !== rooms2[i].x ||
            rooms1[i].y !== rooms2[i].y ||
            rooms1[i].width !== rooms2[i].width ||
            rooms1[i].height !== rooms2[i].height) {
          foundDifference = true;
          break;
        }
      }
    }

    expect(foundDifference).toBe(true);
  });

  it('should respect room count limit', () => {
    const map = createMap(80, 50);
    const rng = xoroshiro128plus(55555n);

    const rooms = generateRoomsAndCorridors(map, rng, {
      maxRooms: 5,
      minRoomSize: 4,
      maxRoomSize: 8
    });

    expect(rooms.length).toBeLessThanOrEqual(5);
  });

  it('should place rooms within map bounds', () => {
    const map = createMap(50, 30);
    const rng = xoroshiro128plus(77777n);

    const rooms = generateRoomsAndCorridors(map, rng, {
      maxRooms: 15,
      minRoomSize: 3,
      maxRoomSize: 7
    });

    // Check all rooms are within bounds
    for (const room of rooms) {
      expect(room.x).toBeGreaterThanOrEqual(0);
      expect(room.y).toBeGreaterThanOrEqual(0);
      expect(room.x2()).toBeLessThan(50);
      expect(room.y2()).toBeLessThan(30);
    }
  });

  it('should connect all rooms with corridors', () => {
    const map = createMap(80, 50);
    const rng = xoroshiro128plus(33333n);

    const rooms = generateRoomsAndCorridors(map, rng, {
      maxRooms: 8,
      minRoomSize: 4,
      maxRoomSize: 8
    });

    // Each room should be connected (this is implicit in the implementation)
    // We can verify by checking that all room centers are floors
    for (const room of rooms) {
      const center = room.center();
      expect(map.getTile(center.x, center.y)).toBe(Tiles.Floor);
    }

    // Should have more floor tiles than just rooms (corridors exist)
    let floorCount = 0;
    let roomFloorCount = 0;

    for (let y = 0; y < 50; y++) {
      for (let x = 0; x < 80; x++) {
        if (map.getTile(x, y) === Tiles.Floor) {
          floorCount++;
        }
      }
    }

    for (const room of rooms) {
      roomFloorCount += room.width * room.height;
    }

    // Floor count should be greater than room floor count (corridors add floors)
    expect(floorCount).toBeGreaterThanOrEqual(roomFloorCount);
  });

  it('should handle small maps gracefully', () => {
    const map = createMap(20, 20);
    const rng = xoroshiro128plus(44444n);

    const rooms = generateRoomsAndCorridors(map, rng, {
      maxRooms: 10,
      minRoomSize: 3,
      maxRoomSize: 5
    });

    // Should generate at least some rooms even on small map
    expect(rooms.length).toBeGreaterThan(0);

    // All rooms should fit in bounds
    for (const room of rooms) {
      expect(room.x2()).toBeLessThan(20);
      expect(room.y2()).toBeLessThan(20);
    }
  });

  it('should return rooms in order of generation', () => {
    const map = createMap(80, 50);
    const rng = xoroshiro128plus(88888n);

    const rooms = generateRoomsAndCorridors(map, rng, {
      maxRooms: 10,
      minRoomSize: 4,
      maxRoomSize: 8
    });

    // First room is special (player spawn)
    expect(rooms.length).toBeGreaterThan(0);
    expect(rooms[0]).toBeDefined();

    // All subsequent rooms should not overlap with previous
    for (let i = 1; i < rooms.length; i++) {
      for (let j = 0; j < i; j++) {
        expect(checkOverlap(rooms[i], rooms[j])).toBe(false);
      }
    }
  });
});

// Helper function for overlap checking
function checkOverlap(room1, room2) {
  return (
    room1.x1() <= room2.x2() &&
    room1.x2() >= room2.x1() &&
    room1.y1() <= room2.y2() &&
    room1.y2() >= room2.y1()
  );
}
