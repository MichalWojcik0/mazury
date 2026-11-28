import type { Tile } from "../core/types.ts";
import type { CanvasContext2DLike } from "../render/command-types.ts";
import type { BlockComponent } from "../registry/block-components.ts";
import { addItem, removeItem } from "../inventory/inventory.ts";
import { renderTexturedTopDiamond, renderWallSideFace } from "../render/draw-wall.ts";
import { OAK_WOOD_FALLBACK, fillTopInsetDiamond, isImgLoaded } from "../render/draw-primitives.ts";

export const BARREL_CAPACITY_MB = 1000;
export const BARREL_CLAY_REACTION_TICKS = 200;

export type BarrelFluidType = "water" | "sewage" | null;

export interface BarrelState {
  fluidType: BarrelFluidType;
  fluidAmount: number;
  solidItem: string | null;
  reactionTicks: number;
  reactionTargetTicks: number;
  outputItem: string | null;
  outputCount: number;
}

export function getBarrelState(tile: Tile): BarrelState {
  const m = tile.metadata ?? {};
  return {
    fluidType: (m.fluidType as BarrelFluidType) ?? null,
    fluidAmount: (m.fluidAmount as number) ?? 0,
    solidItem: (m.solidItem as string | null) ?? null,
    reactionTicks: (m.reactionTicks as number) ?? 0,
    reactionTargetTicks: (m.reactionTargetTicks as number) ?? 0,
    outputItem: (m.outputItem as string | null) ?? null,
    outputCount: (m.outputCount as number) ?? 0,
  };
}

function setBarrelState(tile: Tile, state: BarrelState): void {
  tile.metadata = { ...tile.metadata, ...state };
}

export interface BarrelReactionDef {
  fluid: Exclude<BarrelFluidType, null>;
  inputItem: string;
  durationTicks: number;
  resultFluid?: BarrelFluidType;
  outputItem?: string;
  outputCount?: number;
  harvestDrops?: { itemId: string; count: number };
}

export const BARREL_REACTIONS: BarrelReactionDef[] = [
  {
    fluid: "water",
    inputItem: "minecraft:dirt",
    durationTicks: BARREL_CLAY_REACTION_TICKS,
    outputItem: "minecraft:clay",
    outputCount: 1,
    harvestDrops: { itemId: "minecraft:clay_ball", count: 4 },
  },
  {
    fluid: "water",
    inputItem: "cropdusting:poop",
    durationTicks: 0,
    resultFluid: "sewage",
  },
  {
    fluid: "sewage",
    inputItem: "exnihilocreatio:block_dust",
    durationTicks: 0,
    outputItem: "thermalfoundation:material:772",
    outputCount: 2,
  },
];

export function fillBarrelWithWater(tile: Tile): boolean {
  const state = getBarrelState(tile);
  if (state.fluidAmount > 0 || state.solidItem || state.outputItem) return false;

  setBarrelState(tile, {
    ...state,
    fluidType: "water",
    fluidAmount: BARREL_CAPACITY_MB,
  });
  return true;
}

export function extractBarrelWater(tile: Tile): boolean {
  const state = getBarrelState(tile);
  if (state.fluidType !== "water" || state.fluidAmount < BARREL_CAPACITY_MB || state.solidItem || state.outputItem) {
    return false;
  }

  setBarrelState(tile, {
    ...state,
    fluidType: null,
    fluidAmount: 0,
  });
  return true;
}

export function insertBarrelItem(tile: Tile, itemId: string): boolean {
  const state = getBarrelState(tile);
  if (state.solidItem || state.outputItem || state.fluidAmount < BARREL_CAPACITY_MB || !state.fluidType) {
    return false;
  }

  const reaction = BARREL_REACTIONS.find(
    (r) => r.fluid === state.fluidType && r.inputItem === itemId
  );
  if (!reaction) return false;

  if (reaction.durationTicks <= 0) {
    if (reaction.resultFluid) {
      setBarrelState(tile, {
        ...state,
        fluidType: reaction.resultFluid,
        fluidAmount: BARREL_CAPACITY_MB,
      });
    } else if (reaction.outputItem) {
      setBarrelState(tile, {
        fluidType: null,
        fluidAmount: 0,
        solidItem: null,
        reactionTicks: 0,
        reactionTargetTicks: 0,
        outputItem: reaction.outputItem,
        outputCount: reaction.outputCount ?? 1,
      });
    }
    return true;
  }

  setBarrelState(tile, {
    ...state,
    solidItem: itemId,
    reactionTicks: 0,
    reactionTargetTicks: reaction.durationTicks,
  });
  return true;
}

export function harvestBarrelOutput(tile: Tile): { itemId: string; count: number } | null {
  const state = getBarrelState(tile);
  if (!state.outputItem || state.outputCount <= 0) return null;

  const reaction = BARREL_REACTIONS.find((r) => r.outputItem === state.outputItem);
  const result = reaction?.harvestDrops ?? { itemId: state.outputItem, count: state.outputCount };
  setBarrelState(tile, {
    fluidType: null,
    fluidAmount: 0,
    solidItem: null,
    reactionTicks: 0,
    reactionTargetTicks: 0,
    outputItem: null,
    outputCount: 0,
  });
  return result;
}

export function tickBarrelTile(tile: Tile): void {
  const state = getBarrelState(tile);
  if (!state.solidItem || state.outputItem) return;

  const nextTicks = state.reactionTicks + 1;
  if (nextTicks >= state.reactionTargetTicks) {
    const reaction = BARREL_REACTIONS.find(
      (r) => r.fluid === state.fluidType && r.inputItem === state.solidItem
    );
    setBarrelState(tile, {
      fluidType: null,
      fluidAmount: 0,
      solidItem: null,
      reactionTicks: 0,
      reactionTargetTicks: 0,
      outputItem: reaction?.outputItem ?? "minecraft:clay",
      outputCount: reaction?.outputCount ?? 1,
    });
  } else {
    setBarrelState(tile, { ...state, reactionTicks: nextTicks });
  }
}

export function renderBarrel(
  ctx: CanvasContext2DLike,
  u: number,
  v: number,
  halfW: number,
  halfH: number,
  elevH: number,
  tile: Tile,
  planksTexture: HTMLImageElement | null,
  waterTexture: HTMLImageElement | null,
  clayTexture: HTMLImageElement | null
): void {
  const loaded = isImgLoaded(planksTexture);
  const bw = halfW * 0.9;
  const bh = halfH * 0.9;

  renderWallSideFace(ctx, u, v, bw, bh, elevH, "left", planksTexture, loaded, OAK_WOOD_FALLBACK);
  renderWallSideFace(ctx, u, v, bw, bh, elevH, "right", planksTexture, loaded, OAK_WOOD_FALLBACK);

  ctx.strokeStyle = "#3a2815";
  ctx.lineWidth = Math.max(1.5, elevH * 0.12);
  for (const frac of [0.25, 0.75]) {
    const yOff = elevH * frac;
    ctx.beginPath();
    ctx.moveTo(u - bw, v + yOff);
    ctx.lineTo(u, v + bh + yOff);
    ctx.lineTo(u + bw, v + yOff);
    ctx.stroke();
  }

  if (loaded && planksTexture) {
    renderTexturedTopDiamond(ctx, u, v, bw, bh, planksTexture, true);
  } else {
    fillTopInsetDiamond(ctx, u, v, bw, bh, 1.0, "#a37b4b", "#543d20");
  }

  fillTopInsetDiamond(ctx, u, v, bw, bh, 0.76, "#2c2013", "#4a3520");

  const state = getBarrelState(tile);
  if (state.outputItem === "minecraft:clay") {
    if (isImgLoaded(clayTexture)) {
      renderTexturedTopDiamond(ctx, u, v, bw * 0.72, bh * 0.72, clayTexture, true);
    } else {
      fillTopInsetDiamond(ctx, u, v, bw, bh, 0.72, "#9ea4b0", "#6f7582");
    }
  } else if (state.outputItem) {
    fillTopInsetDiamond(ctx, u, v, bw, bh, 0.65, "#787266", "#4d4940");
  } else if (state.solidItem) {
    fillTopInsetDiamond(ctx, u, v, bw, bh, 0.72, "#6b4c35", "#3e2716");
  } else if (state.fluidAmount > 0 && state.fluidType) {
    if (state.fluidType === "water" && isImgLoaded(waterTexture)) {
      renderTexturedTopDiamond(ctx, u, v, bw * 0.72, bh * 0.72, waterTexture, true);
    } else {
      const fill = state.fluidType === "water" ? "#2f6fe4" : "#5c4d28";
      fillTopInsetDiamond(ctx, u, v, bw, bh, 0.72, fill);
    }
  }
}

export const BARREL_COMPONENT: BlockComponent = {
  onTick: ({ tile }) => {
    tickBarrelTile(tile);
  },
  onInteract: ({ tile, player }) => {
    const harvested = harvestBarrelOutput(tile);
    if (harvested) {
      addItem(player.inventory, harvested.itemId, harvested.count);
      return true;
    }
    const equipped = player.equippedItem;
    if (equipped === "minecraft:water_bucket" && fillBarrelWithWater(tile)) {
      removeItem(player.inventory, "minecraft:water_bucket", 1);
      addItem(player.inventory, "minecraft:bucket", 1);
      return true;
    }
    if (equipped === "minecraft:bucket" && extractBarrelWater(tile)) {
      removeItem(player.inventory, "minecraft:bucket", 1);
      addItem(player.inventory, "minecraft:water_bucket", 1);
      return true;
    }
    if (equipped && insertBarrelItem(tile, equipped)) {
      removeItem(player.inventory, equipped, 1);
      return true;
    }
    return false;
  },
  getActions: ({ tile, player }) => {
    const barrel = getBarrelState(tile);
    const equipped = player?.equippedItem;
    if (barrel.outputItem) {
      return [{ id: "harvest", label: "Harvest Output", buttonType: "SECONDARY", icon: "🧱" }];
    }
    if (barrel.fluidAmount === 0 && !barrel.solidItem && equipped === "minecraft:water_bucket") {
      return [{ id: "harvest", label: "Fill Water", buttonType: "SECONDARY", icon: "💧" }];
    }
    if (barrel.fluidType === "water" && barrel.fluidAmount >= BARREL_CAPACITY_MB && !barrel.solidItem && equipped === "minecraft:bucket") {
      return [{ id: "harvest", label: "Extract Water", buttonType: "SECONDARY", icon: "🪣" }];
    }
    if (
      barrel.fluidType &&
      barrel.fluidAmount >= BARREL_CAPACITY_MB &&
      !barrel.solidItem &&
      equipped &&
      BARREL_REACTIONS.some((r) => r.fluid === barrel.fluidType && r.inputItem === equipped)
    ) {
      return [{ id: "harvest", label: "Insert Item", buttonType: "SECONDARY", icon: "🛢️" }];
    }
    return [];
  },
  onRender: ({ ctx, u, v, halfW, halfH, elevH, tile, getTexture }) => {
    renderBarrel(
      ctx,
      u,
      v,
      halfW,
      halfH,
      elevH,
      tile,
      getTexture("minecraft:planks"),
      getTexture("minecraft:water_still"),
      getTexture("minecraft:clay")
    );
  },
  getStatusText: (tile) => {
    const b = getBarrelState(tile);
    if (b.outputItem) return " [Ready]";
    if (b.solidItem) {
      const pct = b.reactionTargetTicks ? Math.floor((b.reactionTicks / b.reactionTargetTicks) * 100) : 0;
      return ` [Reacting ${pct}%]`;
    }
    return b.fluidAmount > 0 ? ` [${b.fluidType} ${b.fluidAmount}mB]` : "";
  },
};
