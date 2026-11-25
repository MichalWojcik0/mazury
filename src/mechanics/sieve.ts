import type { Tile } from "../core/types.ts";
import type { DeterministicRNG } from "../core/math.ts";

export interface MeshDefinition {
  id: string;
  name: string;
  tier: number;
  maxDurability: number;
  color: string;
}

export const MESH_REGISTRY: Record<string, MeshDefinition> = {
  "exnihilocreatio:item_mesh:1": {
    id: "exnihilocreatio:item_mesh:1",
    name: "String Mesh",
    tier: 1,
    maxDurability: 64,
    color: "#e6e0d4",
  },
  "exnihilocreatio:item_mesh:2": {
    id: "exnihilocreatio:item_mesh:2",
    name: "Flint Mesh",
    tier: 2,
    maxDurability: 128,
    color: "#6b6e75",
  },
  "exnihilocreatio:item_mesh:3": {
    id: "exnihilocreatio:item_mesh:3",
    name: "Iron Mesh",
    tier: 3,
    maxDurability: 256,
    color: "#c8cdd4",
  },
  "exnihilocreatio:item_mesh:4": {
    id: "exnihilocreatio:item_mesh:4",
    name: "Diamond Mesh",
    tier: 4,
    maxDurability: 512,
    color: "#4de1e8",
  },
};

export interface SieveDropEntry {
  itemId: string;
  chance: number;
  minTier?: number;
}

export const SIEVE_LOOT_TABLES: Record<string, SieveDropEntry[]> = {
  "minecraft:gravel": [
    { itemId: "exnihilocreatio:ore_piece_iron", chance: 0.15 },
    { itemId: "exnihilocreatio:ore_piece_copper", chance: 0.15 },
    { itemId: "exnihilocreatio:ore_piece_tin", chance: 0.1 },
    { itemId: "exnihilocreatio:ore_piece_lead", chance: 0.1 },
    { itemId: "minecraft:flint", chance: 0.25 },
    { itemId: "minecraft:coal", chance: 0.12 },
  ],
  "minecraft:sand": [
    { itemId: "minecraft:dye:15", chance: 0.15 },
    { itemId: "minecraft:wheat_seeds", chance: 0.05 },
    { itemId: "immersiveengineering:seed", chance: 0.05 },
  ],
  "exnihilocreatio:block_dust": [
    { itemId: "minecraft:dye:15", chance: 0.2 },
    { itemId: "minecraft:gunpowder", chance: 0.07 },
    { itemId: "minecraft:redstone", chance: 0.12 },
    { itemId: "minecraft:glowstone_dust", chance: 0.06 },
  ],
};

export interface SieveState {
  meshId: string | null;
  meshDurability: number;
  substrateId: string | null;
  progress: number;
}

export function getSieveState(tile: Tile): SieveState {
  const m = tile.metadata ?? {};
  return {
    meshId: (m.meshId as string | null) ?? null,
    meshDurability: (m.meshDurability as number) ?? 0,
    substrateId: (m.substrateId as string | null) ?? null,
    progress: (m.progress as number) ?? 0,
  };
}

function setSieveState(tile: Tile, state: SieveState): void {
  tile.metadata = { ...tile.metadata, ...state };
}

export function isSieveMesh(itemId: string): boolean {
  return itemId in MESH_REGISTRY;
}

export function isSieveSubstrate(itemId: string): boolean {
  return itemId in SIEVE_LOOT_TABLES;
}

export function installSieveMesh(tile: Tile, meshId: string): boolean {
  const def = MESH_REGISTRY[meshId];
  if (!def) return false;
  const state = getSieveState(tile);
  if (state.meshId) return false;

  setSieveState(tile, {
    ...state,
    meshId,
    meshDurability: def.maxDurability,
  });
  return true;
}

export function removeSieveMesh(tile: Tile): string | null {
  const state = getSieveState(tile);
  if (!state.meshId || state.substrateId) return null;

  const removed = state.meshId;
  setSieveState(tile, {
    meshId: null,
    meshDurability: 0,
    substrateId: null,
    progress: 0,
  });
  return removed;
}

export function insertSieveSubstrate(tile: Tile, substrateId: string): boolean {
  if (!isSieveSubstrate(substrateId)) return false;
  const state = getSieveState(tile);
  if (!state.meshId || state.substrateId) return false;

  setSieveState(tile, {
    ...state,
    substrateId,
    progress: 0,
  });
  return true;
}

export interface SiftResult {
  progressed: boolean;
  completed: boolean;
  drops: Array<{ id: string; count: number }>;
  meshBroken: boolean;
}

export function siftSieve(tile: Tile, rng?: DeterministicRNG): SiftResult {
  const state = getSieveState(tile);
  if (!state.meshId || !state.substrateId) {
    return { progressed: false, completed: false, drops: [], meshBroken: false };
  }

  const nextProgress = Math.min(100, state.progress + 25);
  if (nextProgress < 100) {
    setSieveState(tile, { ...state, progress: nextProgress });
    return { progressed: true, completed: false, drops: [], meshBroken: false };
  }

  // Completed sifting 1 substrate block
  const meshDef = MESH_REGISTRY[state.meshId];
  const tierBonus = meshDef ? (meshDef.tier - 1) * 0.05 : 0;
  const table = SIEVE_LOOT_TABLES[state.substrateId] ?? [];
  const drops: Array<{ id: string; count: number }> = [];

  for (const entry of table) {
    if (entry.minTier && (!meshDef || meshDef.tier < entry.minTier)) continue;
    const roll = rng ? rng.next() : 0.1;
    if (roll < Math.min(1, entry.chance + tierBonus)) {
      drops.push({ id: entry.itemId, count: 1 });
    }
  }

  const nextDurability = state.meshDurability - 1;
  const meshBroken = nextDurability <= 0;

  setSieveState(tile, {
    meshId: meshBroken ? null : state.meshId,
    meshDurability: meshBroken ? 0 : nextDurability,
    substrateId: null,
    progress: 0,
  });

  return { progressed: true, completed: true, drops, meshBroken };
}
