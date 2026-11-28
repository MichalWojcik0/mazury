import type { Tile } from "../core/types.ts";
import type { DeterministicRNG } from "../core/math.ts";
import type { CanvasContext2DLike } from "../render/command-types.ts";
import type { BlockComponent } from "../registry/block-components.ts";
import { addItem, removeItem } from "../inventory/inventory.ts";
import { getItemDefinition, hasItemTrait } from "../registry/definitions.ts";
import { renderTexturedTopDiamond, renderWallSideFace } from "../render/draw-wall.ts";
import { OAK_WOOD_FALLBACK, drawFourLegs, fillTopInsetDiamond, isImgLoaded } from "../render/draw-primitives.ts";

export function getMeshDefinition(meshId: string) {
  return getItemDefinition(meshId)?.sieveMesh;
}

export interface SieveDropEntry {
  itemId: string;
  chance: number;
  minTier?: number;
}

export const SIEVE_LOOT_TABLES: Record<string, SieveDropEntry[]> = {
  "minecraft:dirt": [
    { itemId: "exnihilocreatio:item_pebble:0", chance: 0.5 },
    { itemId: "minecraft:wheat_seeds", chance: 0.1 },
    { itemId: "exnihilocreatio:item_seed_sugarcane", chance: 0.05 },
    { itemId: "exnihilocreatio:item_seed_cactus", chance: 0.05 },
    { itemId: "arcadialbonsaitrees:bonsai_oak_sapling", chance: 0.05 },
  ],
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
  return hasItemTrait(itemId, "sieve_mesh") && Boolean(getMeshDefinition(itemId));
}

export function isSieveSubstrate(itemId: string): boolean {
  return hasItemTrait(itemId, "sieve_substrate") && itemId in SIEVE_LOOT_TABLES;
}

export function installSieveMesh(tile: Tile, meshId: string): boolean {
  const def = getMeshDefinition(meshId);
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
  const meshDef = getMeshDefinition(state.meshId);
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

export function renderSieve(
  ctx: CanvasContext2DLike,
  u: number,
  v: number,
  halfW: number,
  halfH: number,
  elevH: number,
  tile: Tile,
  planksTexture: HTMLImageElement | null
): void {
  const loaded = isImgLoaded(planksTexture);
  const rimH = elevH * 0.35;
  const legH = elevH - rimH;

  drawFourLegs(ctx, u, v, halfW, halfH, rimH, legH, 0.16, planksTexture);

  renderWallSideFace(ctx, u, v, halfW, halfH, rimH, "left", planksTexture, loaded, OAK_WOOD_FALLBACK);
  renderWallSideFace(ctx, u, v, halfW, halfH, rimH, "right", planksTexture, loaded, OAK_WOOD_FALLBACK);

  if (loaded && planksTexture) {
    renderTexturedTopDiamond(ctx, u, v, halfW, halfH, planksTexture, true);
  } else {
    fillTopInsetDiamond(ctx, u, v, halfW, halfH, 1.0, "#a37b4b", "#543d20");
  }

  fillTopInsetDiamond(ctx, u, v, halfW, halfH, 0.78, "#2a1f12", "#4a3520");

  const state = getSieveState(tile);
  if (state.meshId) {
    const meshColor = getMeshDefinition(state.meshId)?.color ?? "#e6e0d4";
    ctx.strokeStyle = meshColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = -2; i <= 2; i++) {
      const t = i * 0.25;
      ctx.moveTo(u + (t - 0.72) * halfW * 0.5, v + (t + 0.72) * halfH * 0.5);
      ctx.lineTo(u + (t + 0.72) * halfW * 0.5, v + (t - 0.72) * halfH * 0.5);
      ctx.moveTo(u + (-0.72 - t) * halfW * 0.5, v + (-0.72 + t) * halfH * 0.5);
      ctx.lineTo(u + (0.72 - t) * halfW * 0.5, v + (0.72 + t) * halfH * 0.5);
    }
    ctx.stroke();
  }

  if (state.substrateId) {
    const subColor =
      state.substrateId === "minecraft:gravel"
        ? "#837e7c"
        : state.substrateId === "minecraft:sand"
          ? "#dbd3a0"
          : "#c7c5b8";
    const shrink = Math.max(0.25, 0.7 - (state.progress / 100) * 0.4);
    fillTopInsetDiamond(ctx, u, v + 1, halfW, halfH, shrink, subColor, "#4a4744");
  }
}

export const SIEVE_COMPONENT: BlockComponent = {
  onInteract: ({ tile, player, rng }) => {
    const equipped = player.equippedItem;
    if (equipped && isSieveMesh(equipped) && installSieveMesh(tile, equipped)) {
      removeItem(player.inventory, equipped, 1);
      return true;
    }
    if (equipped && isSieveSubstrate(equipped) && insertSieveSubstrate(tile, equipped)) {
      removeItem(player.inventory, equipped, 1);
      return true;
    }
    const siftRes = siftSieve(tile, rng);
    if (siftRes.progressed) {
      for (const drop of siftRes.drops) {
        addItem(player.inventory, drop.id, drop.count);
      }
      return true;
    }
    if (!equipped) {
      const removedMesh = removeSieveMesh(tile);
      if (removedMesh) {
        addItem(player.inventory, removedMesh, 1);
        return true;
      }
    }
    return false;
  },
  getActions: ({ tile, player }) => {
    const sieve = getSieveState(tile);
    const equipped = player?.equippedItem;
    if (!sieve.meshId && equipped && isSieveMesh(equipped)) {
      return [{ id: "harvest", label: "Install Mesh", buttonType: "SECONDARY", icon: "🕸️" }];
    }
    if (sieve.meshId && !sieve.substrateId && equipped && isSieveSubstrate(equipped)) {
      return [{ id: "harvest", label: "Insert Substrate", buttonType: "SECONDARY", icon: "🪨" }];
    }
    if (sieve.meshId && sieve.substrateId) {
      return [{ id: "harvest", label: `Sift (${sieve.progress}%)`, buttonType: "SECONDARY", icon: "🕸️" }];
    }
    if (sieve.meshId && !sieve.substrateId && !equipped) {
      return [{ id: "harvest", label: "Remove Mesh", buttonType: "SECONDARY", icon: "🕸️" }];
    }
    return [];
  },
  onRender: ({ ctx, u, v, halfW, halfH, elevH, tile, getTexture }) => {
    renderSieve(ctx, u, v, halfW, halfH, elevH, tile, getTexture("minecraft:planks"));
  },
  getStatusText: (tile) => {
    const s = getSieveState(tile);
    return s.substrateId ? ` [${s.progress}%]` : s.meshId ? " [Mesh Ready]" : " [No Mesh]";
  },
};
