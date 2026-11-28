import type { Tile } from "../core/types.ts";
import type { CanvasContext2DLike } from "../render/command-types.ts";
import type { BlockComponent } from "../registry/block-components.ts";
import { addItem, removeItem } from "../inventory/inventory.ts";
import { getItemDefinition } from "../registry/definitions.ts";
import { renderTexturedTopDiamond, renderWallSideFace } from "../render/draw-wall.ts";
import { OAK_WOOD_FALLBACK, drawFourLegs, fillTopInsetDiamond, isImgLoaded } from "../render/draw-primitives.ts";

export const CRUCIBLE_CAPACITY_MB = 1000;
export const CRUCIBLE_MELT_RATE_MB_PER_TICK = 2.5; // 250 mB per 100 ticks

export interface CrucibleState {
  solidAmount: number;
  fluidType: "water" | null;
  fluidAmount: number;
}

export function getCrucibleState(tile: Tile): CrucibleState {
  const m = tile.metadata ?? {};
  return {
    solidAmount: (m.solidAmount as number) ?? 0,
    fluidType: (m.fluidType as "water" | null) ?? null,
    fluidAmount: (m.fluidAmount as number) ?? 0,
  };
}

function setCrucibleState(tile: Tile, state: CrucibleState): void {
  tile.metadata = { ...tile.metadata, ...state };
}

export function getCrucibleMeltValue(itemId: string): number {
  return getItemDefinition(itemId)?.crucibleMeltMb ?? 0;
}

export function insertCrucibleItem(tile: Tile, itemId: string): boolean {
  const mb = getCrucibleMeltValue(itemId);
  if (mb <= 0) return false;

  const state = getCrucibleState(tile);
  if (state.fluidAmount + state.solidAmount >= CRUCIBLE_CAPACITY_MB) return false;

  const nextSolid = Math.min(CRUCIBLE_CAPACITY_MB - state.fluidAmount, state.solidAmount + mb);
  setCrucibleState(tile, { ...state, solidAmount: nextSolid });
  return true;
}

export function extractCrucibleWater(tile: Tile): boolean {
  const state = getCrucibleState(tile);
  if (state.fluidType !== "water" || state.fluidAmount < CRUCIBLE_CAPACITY_MB) return false;

  setCrucibleState(tile, {
    ...state,
    fluidAmount: 0,
    fluidType: null,
  });
  return true;
}

export function tickCrucibleTile(tile: Tile): void {
  const state = getCrucibleState(tile);
  if (state.solidAmount <= 0 || state.fluidAmount >= CRUCIBLE_CAPACITY_MB) return;

  const melted = Math.min(
    state.solidAmount,
    CRUCIBLE_MELT_RATE_MB_PER_TICK,
    CRUCIBLE_CAPACITY_MB - state.fluidAmount
  );
  setCrucibleState(tile, {
    solidAmount: state.solidAmount - melted,
    fluidType: "water",
    fluidAmount: state.fluidAmount + melted,
  });
}

export function renderCrucible(
  ctx: CanvasContext2DLike,
  u: number,
  v: number,
  halfW: number,
  halfH: number,
  elevH: number,
  tile: Tile,
  planksTexture: HTMLImageElement | null,
  waterTexture: HTMLImageElement | null
): void {
  const loaded = isImgLoaded(planksTexture);
  const basinH = elevH * 0.72;
  const legH = elevH - basinH;

  drawFourLegs(ctx, u, v, halfW * 0.92, halfH * 0.92, basinH, legH, 0.2, planksTexture);

  renderWallSideFace(ctx, u, v, halfW * 0.92, halfH * 0.92, basinH, "left", planksTexture, loaded, OAK_WOOD_FALLBACK);
  renderWallSideFace(ctx, u, v, halfW * 0.92, halfH * 0.92, basinH, "right", planksTexture, loaded, OAK_WOOD_FALLBACK);

  if (loaded && planksTexture) {
    renderTexturedTopDiamond(ctx, u, v, halfW * 0.92, halfH * 0.92, planksTexture, true);
  } else {
    fillTopInsetDiamond(ctx, u, v, halfW * 0.92, halfH * 0.92, 1.0, "#a37b4b", "#543d20");
  }

  fillTopInsetDiamond(ctx, u, v, halfW * 0.92, halfH * 0.92, 0.74, "#2c2013", "#4a3520");

  const state = getCrucibleState(tile);
  if (state.fluidAmount > 0) {
    const fluidScale = 0.4 + 0.32 * (state.fluidAmount / CRUCIBLE_CAPACITY_MB);
    if (isImgLoaded(waterTexture)) {
      renderTexturedTopDiamond(ctx, u, v, halfW * 0.92 * fluidScale, halfH * 0.92 * fluidScale, waterTexture, true);
    } else {
      fillTopInsetDiamond(ctx, u, v, halfW * 0.92, halfH * 0.92, fluidScale, "#2f6fe4");
    }
  }
  if (state.solidAmount > 0) {
    const solidScale = 0.35 + 0.3 * Math.min(1, state.solidAmount / CRUCIBLE_CAPACITY_MB);
    fillTopInsetDiamond(ctx, u, v - 1, halfW * 0.92, halfH * 0.92, solidScale, "#4f8a36", "#2f571e");
  }
}

export const CRUCIBLE_COMPONENT: BlockComponent = {
  onTick: ({ tile }) => {
    tickCrucibleTile(tile);
  },
  onInteract: ({ tile, player }) => {
    const equipped = player.equippedItem;
    if (equipped === "minecraft:bucket" && extractCrucibleWater(tile)) {
      removeItem(player.inventory, "minecraft:bucket", 1);
      addItem(player.inventory, "minecraft:water_bucket", 1);
      return true;
    }
    if (equipped && insertCrucibleItem(tile, equipped)) {
      removeItem(player.inventory, equipped, 1);
      return true;
    }
    return false;
  },
  getActions: ({ tile, player }) => {
    const crucible = getCrucibleState(tile);
    const equipped = player?.equippedItem;
    if (crucible.fluidType === "water" && crucible.fluidAmount >= CRUCIBLE_CAPACITY_MB && equipped === "minecraft:bucket") {
      return [{ id: "harvest", label: "Collect Water", buttonType: "SECONDARY", icon: "💧" }];
    }
    if (equipped && getCrucibleMeltValue(equipped) > 0 && crucible.fluidAmount + crucible.solidAmount < CRUCIBLE_CAPACITY_MB) {
      return [{ id: "harvest", label: "Insert Foliage", buttonType: "SECONDARY", icon: "🌿" }];
    }
    return [];
  },
  onRender: ({ ctx, u, v, halfW, halfH, elevH, tile, getTexture }) => {
    renderCrucible(
      ctx,
      u,
      v,
      halfW,
      halfH,
      elevH,
      tile,
      getTexture("minecraft:planks"),
      getTexture("minecraft:water_still")
    );
  },
  getStatusText: (tile) => ` [${Math.floor(getCrucibleState(tile).fluidAmount)}mB water]`,
};
