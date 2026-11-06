import type { Room, Tile, Vec3, Player, MachineFace } from "../core/types.ts";

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
 * Helper to create an N x N face grid of solid compact machine wall tiles.
 */
function createWallFaceGrid(size: number): Tile[][] {
  const grid: Tile[][] = [];
  for (let r = 0; r < size; r++) {
    grid[r] = [];
    for (let c = 0; c < size; c++) {
      grid[r][c] = {
        id: "compactmachines3:wall",
        type: "solid_wall",
        passable: false,
        occluding: true,
      };
    }
  }
  return grid;
}

/**
 * Creates a standard Tier 1 (Tiny) Compact Machine room:
 * - 3x3x3 internal air space (x: 0..2, y: 0..2, z: 0..2).
 * - Enclosed in 6 discrete 3x3 boundary faces (`DOWN`, `UP`, `NORTH`, `SOUTH`, `WEST`, `EAST`).
 */
export function createTinyCompactMachineRoom(id: string = "room_tiny_1", parentRoomId = "outer_room"): Room {
  const width = 3;
  const height = 3;
  const depth = 3;

  const voxels: Tile[][][] = [];
  for (let z = 0; z < depth; z++) {
    voxels[z] = [];
    for (let y = 0; y < height; y++) {
      voxels[z][y] = [];
      for (let x = 0; x < width; x++) {
        voxels[z][y][x] = {
          id: "minecraft:air",
          type: "air",
          passable: true,
        };
      }
    }
  }

  const faces: Record<MachineFace, Tile[][]> = {
    DOWN: createWallFaceGrid(3),
    UP: createWallFaceGrid(3),
    NORTH: createWallFaceGrid(3),
    SOUTH: createWallFaceGrid(3),
    WEST: createWallFaceGrid(3),
    EAST: createWallFaceGrid(3),
  };

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
    faces,
  };
}

/**
 * Resolves which face and tile is targeted when a target coordinate falls on or outside
 * a Compact Machine room boundary.
 *
 * For a room with size (width, height, depth):
 * - z < 0 -> face DOWN, [y][x]
 * - z >= depth -> face UP, [y][x]
 * - y < 0 -> face NORTH, [z][x]
 * - y >= height -> face SOUTH, [z][x]
 * - x < 0 -> face WEST, [z][y]
 * - x >= width -> face EAST, [z][y]
 */
interface BoundaryFaceRule {
  face: MachineFace;
  matches: (coord: Vec3, room: Room) => boolean;
  getIndices: (coord: Vec3, room: Room) => { row: number; col: number };
}

const BOUNDARY_FACE_RULES: BoundaryFaceRule[] = [
  {
    face: "DOWN",
    matches: ({ z }) => z < 0,
    getIndices: ({ x, y }, { width, height }) => ({
      row: Math.max(0, Math.min(height - 1, y)),
      col: Math.max(0, Math.min(width - 1, x)),
    }),
  },
  {
    face: "UP",
    matches: ({ z }, { depth }) => z >= depth,
    getIndices: ({ x, y }, { width, height }) => ({
      row: Math.max(0, Math.min(height - 1, y)),
      col: Math.max(0, Math.min(width - 1, x)),
    }),
  },
  {
    face: "NORTH",
    matches: ({ y }) => y < 0,
    getIndices: ({ x, z }, { width, depth }) => ({
      row: Math.max(0, Math.min(depth - 1, z)),
      col: Math.max(0, Math.min(width - 1, x)),
    }),
  },
  {
    face: "SOUTH",
    matches: ({ y }, { height }) => y >= height,
    getIndices: ({ x, z }, { width, depth }) => ({
      row: Math.max(0, Math.min(depth - 1, z)),
      col: Math.max(0, Math.min(width - 1, x)),
    }),
  },
  {
    face: "WEST",
    matches: ({ x }) => x < 0,
    getIndices: ({ y, z }, { height, depth }) => ({
      row: Math.max(0, Math.min(depth - 1, z)),
      col: Math.max(0, Math.min(height - 1, y)),
    }),
  },
  {
    face: "EAST",
    matches: ({ x }, { width }) => x >= width,
    getIndices: ({ y, z }, { height, depth }) => ({
      row: Math.max(0, Math.min(depth - 1, z)),
      col: Math.max(0, Math.min(height - 1, y)),
    }),
  },
];

export function resolveBoundaryTile(room: Room, coord: Vec3): { face: MachineFace; tile: Tile } | null {
  if (!room.faces) return null;

  for (const rule of BOUNDARY_FACE_RULES) {
    if (rule.matches(coord, room)) {
      const { row, col } = rule.getIndices(coord, room);
      const tile = room.faces[rule.face]?.[row]?.[col];
      return tile ? { face: rule.face, tile } : null;
    }
  }

  return null;
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
