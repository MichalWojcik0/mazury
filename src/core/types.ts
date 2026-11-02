/**
 * Core domain types for Compact Claustrophobia (Chapter 1 Checkpoint).
 */

export type RoomId = string;
export type PlayerId = 0 | 1 | 2;

export interface Item {
  id: string;
  count: number;
}

export type Inventory = Map<string, number>;

export type MachineFace = "DOWN" | "UP" | "NORTH" | "SOUTH" | "WEST" | "EAST";

export interface Tile {
  id: string;
  type: "air" | "solid_wall" | "floor" | "machine" | "conduit" | "tunnel";
  passable: boolean;
  occluding?: boolean;
  metadata?: Record<string, unknown>;
}

export interface Room {
  id: RoomId;
  name: string;
  tier: number; // 0 = Outer Room, 1 = Tiny (3x3), etc.
  width: number;
  height: number;
  depth: number;
  // Non-uniform floor/ceiling support for asymmetrical rooms like Outer Room 2x1x(4/5)
  columnHeights?: Record<string, { floorZ: number; ceilingZ: number }>;
  voxels: Tile[][][]; // indexed as [z][y][x]
  faces?: Record<MachineFace, Tile[][]>; // 6 boundary faces for Compact Machine rooms (e.g. 6x 3x3)
  parentRoomId?: RoomId;
  parentBlockCoord?: { x: number; y: number; z: number };
}

export interface Player {
  id: PlayerId;
  name: string;
  health: number; // 0 - 20 (10 hearts)
  hunger: number; // 0 - 20 (10 hunger shanks)
  exhaustion: number; // 0.0 - 4.0
  isSneaking: boolean;
  sneakTimer: number; // Accumulated ticks while sneaking (poop mechanic)
  currentRoomId: RoomId;
  x: number;
  y: number;
  z: number;
  height: 2; // Exactly 2 blocks tall
  selectedLayerIndex: 0 | 1 | 2 | 3; // 0: Below Feet, 1: Lower Body, 2: Upper Body, 3: Above Head
  selectedSlot?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9; // Currently targeted reticle/block slot
  inventory: Inventory;
  equippedItem?: string;
}

export interface ListRecipe {
  id: string;
  name: string;
  category: "basic" | "tools" | "machinery" | "logistics" | "fluid";
  requiredStation?: "none" | "crafting_station" | "compactor";
  inputs: Array<{ itemId: string; count: number }>;
  outputs: Array<{ itemId: string; count: number }>;
}

export type InputAction =
  | { type: "MOVE"; dx: number; dy: number }
  | { type: "START_SNEAK" }
  | { type: "STOP_SNEAK" }
  | { type: "SELECT_LAYER"; layerIndex: 0 | 1 | 2 | 3 }
  | { type: "SELECT_SLOT"; slot?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 }
  | { type: "INTERACT_TILE"; slot: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9; button: "PRIMARY" | "SECONDARY" }
  | { type: "CRAFT_RECIPE"; recipeId: string; count: number }
  | { type: "EQUIP_ITEM"; itemId?: string }
  | { type: "USE_PSD" };

export interface PlayerInputPacket {
  tick: number;
  playerId: PlayerId;
  action: InputAction;
}
