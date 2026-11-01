import type { Room, Tile, Vec3, Player } from "../core/types.ts";

/**
 * Creates the Outer Room: An asymmetrical 2x1 footprint with non-uniform heights.
 * - Column (0, 0): 4-tall column (z = 0..3) with Bedrock base and Torch on wall. Player spawns here.
 * - Column (1, 0): 5-tall column (z = 0..4) holding the embedded Tier 1 Compact Machine block on floor.
 * Total bounding dimensions: width = 2, height = 1, depth = 5.
 */
export function createOuterRoom(): Room {
  const width = 2;
  const height = 1;
  const depth = 5;

  // Initialize empty voxel grid
  const voxels: Tile[][][] = [];
  for (let z = 0; z < depth; z++) {
    voxels[z] = [];
    for (let y = 0; y < height; y++) {
      voxels[z][y] = [];
      for (let x = 0; x < width; x++) {
        voxels[z][y][x] = { id: "minecraft:air", type: "air", passable: true };
      }
    }
  }

  // Floor of column (0, 0): Bedrock at z=0, air at z=1..3, ceiling at z>=4
  voxels[0][0][0] = { id: "minecraft:bedrock", type: "floor", passable: false };
  voxels[1][0][0] = { id: "minecraft:air", type: "air", passable: true };
  voxels[2][0][0] = { id: "minecraft:air", type: "air", passable: true };
  voxels[3][0][0] = { id: "minecraft:torch", type: "machine", passable: true }; // Torch mounted
  voxels[4][0][0] = { id: "minecraft:bedrock", type: "solid_wall", passable: false }; // Enclosed ceiling

  // Floor of column (1, 0): Embedded Tier 1 Compact Machine at z=0, air at z=1..4
  voxels[0][0][1] = {
    id: "compactmachines3:machine_tiny",
    type: "machine",
    passable: false,
    metadata: { targetRoomId: "room_tiny_1", machineTier: 1 },
  };
  voxels[1][0][1] = { id: "minecraft:air", type: "air", passable: true };
  voxels[2][0][1] = { id: "minecraft:air", type: "air", passable: true };
  voxels[3][0][1] = { id: "minecraft:air", type: "air", passable: true };
  voxels[4][0][1] = { id: "minecraft:air", type: "air", passable: true };

  return {
    id: "outer_room",
    name: "Meteor Spawn Pocket",
    tier: 0,
    width,
    height,
    depth,
    columnHeights: {
      "0,0": { floorZ: 0, ceilingZ: 3 },
      "1,0": { floorZ: 0, ceilingZ: 4 },
    },
    voxels,
  };
}

/**
 * Creates a standard Tier 1 (Tiny) Compact Machine room:
 * - 3x3x3 internal air space (x: 1..3, y: 1..3, z: 1..3).
 * - Enclosed in indestructible solid walls (`compactmachines3:wall`).
 * - Total bounding box: 5x5x5.
 */
export function createTinyCompactMachineRoom(id: string = "room_tiny_1", parentRoomId = "outer_room"): Room {
  const width = 5;
  const height = 5;
  const depth = 5;

  const voxels: Tile[][][] = [];
  for (let z = 0; z < depth; z++) {
    voxels[z] = [];
    for (let y = 0; y < height; y++) {
      voxels[z][y] = [];
      for (let x = 0; x < width; x++) {
        const isBorder =
          x === 0 || x === width - 1 ||
          y === 0 || y === height - 1 ||
          z === 0 || z === depth - 1;

        if (isBorder) {
          voxels[z][y][x] = {
            id: "compactmachines3:wall",
            type: "solid_wall",
            passable: false,
            occluding: true,
          };
        } else {
          voxels[z][y][x] = {
            id: "minecraft:air",
            type: "air",
            passable: true,
          };
        }
      }
    }
  }

  return {
    id,
    name: "Tiny Compact Machine (3x3)",
    tier: 1,
    width,
    height,
    depth,
    parentRoomId,
    parentBlockCoord: { x: 1, y: 0, z: 0 },
    voxels,
  };
}

/**
 * Converts a player's active layer selection (0..3) and numpad slot (1..9)
 * into an absolute Vec3 coordinate in the room.
 *
 * Numpad mapping (standard layout):
 * 7: (-1, -1) [NW], 8: (0, -1) [N],  9: (+1, -1) [NE]
 * 4: (-1,  0) [W],  5: (0,  0) [C],  6: (+1,  0) [E]
 * 1: (-1, +1) [SW], 2: (0, +1) [S],  3: (+1, +1) [SE]
 */
export function resolveTargetCoord(player: Player, slot: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9): Vec3 | null {
  // Layer relative offsets:
  // Layer 0: Below feet (z - 1)
  // Layer 1: Feet / lower body (z)
  // Layer 2: Head / upper body (z + 1)
  // Layer 3: Above head / ceiling (z + 2)
  const zOffset = player.selectedLayerIndex - 1;
  const targetZ = player.z + zOffset;

  const slotOffsets: Record<number, { dx: number; dy: number }> = {
    7: { dx: -1, dy: -1 },
    8: { dx: 0, dy: -1 },
    9: { dx: 1, dy: -1 },
    4: { dx: -1, dy: 0 },
    5: { dx: 0, dy: 0 },
    6: { dx: 1, dy: 0 },
    1: { dx: -1, dy: 1 },
    2: { dx: 0, dy: 1 },
    3: { dx: 1, dy: 1 },
  };

  const offset = slotOffsets[slot];
  if (!offset) return null;

  // On Layers 1 and 2, slot 5 is the player's own body
  if ((player.selectedLayerIndex === 1 || player.selectedLayerIndex === 2) && slot === 5) {
    return null;
  }

  return {
    x: player.x + offset.dx,
    y: player.y + offset.dy,
    z: targetZ,
  };
}
