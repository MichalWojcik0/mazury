import type { Player, Tile } from "../core/types.ts";
import type { CanvasContext2DLike } from "../render/command-types.ts";
import type { BlockComponent } from "../registry/block-components.ts";
import { addItem, removeItem } from "../inventory/inventory.ts";
import { getItemDefinition } from "../registry/definitions.ts";
import { renderTexturedTopDiamond, renderWallSideFace } from "../render/draw-wall.ts";
import { STONE_FALLBACK, fillTopInsetDiamond, isImgLoaded } from "../render/draw-primitives.ts";

export const FURNACE_SMELT_TICKS = 200;

export interface FurnaceState {
  inputItem: string | null;
  inputCount: number;
  outputItem: string | null;
  outputCount: number;
  fuelItem: string | null;
  fuelCount: number;
  fuelTimeRemaining: number;
  fuelTimeTotal: number;
  smeltProgress: number;
}

export function getFurnaceState(tile: Tile): FurnaceState {
  const m = tile.metadata ?? {};
  return {
    inputItem: (m.inputItem as string | null) ?? null,
    inputCount: (m.inputCount as number) ?? 0,
    outputItem: (m.outputItem as string | null) ?? null,
    outputCount: (m.outputCount as number) ?? 0,
    fuelItem: (m.fuelItem as string | null) ?? null,
    fuelCount: (m.fuelCount as number) ?? 0,
    fuelTimeRemaining: (m.fuelTimeRemaining as number) ?? 0,
    fuelTimeTotal: (m.fuelTimeTotal as number) ?? 0,
    smeltProgress: (m.smeltProgress as number) ?? 0,
  };
}

function setFurnaceState(tile: Tile, state: FurnaceState): void {
  tile.metadata = { ...tile.metadata, ...state };
}

export function getFuelBurnTime(itemId: string): number {
  return getItemDefinition(itemId)?.burnTimeTicks ?? 0;
}

export function getSmeltResult(itemId: string): string | null {
  return getItemDefinition(itemId)?.smeltsInto ?? null;
}

export function isFurnaceFuel(itemId: string): boolean {
  return getFuelBurnTime(itemId) > 0;
}

export function isSmeltable(itemId: string): boolean {
  return getSmeltResult(itemId) !== null;
}

export function insertFurnaceFuel(tile: Tile, itemId: string): boolean {
  if (!isFurnaceFuel(itemId)) return false;
  const state = getFurnaceState(tile);
  if (state.fuelItem && state.fuelItem !== itemId) return false;
  if (state.fuelCount >= 64) return false;

  setFurnaceState(tile, {
    ...state,
    fuelItem: itemId,
    fuelCount: state.fuelCount + 1,
  });
  return true;
}

export function insertFurnaceInput(tile: Tile, itemId: string): boolean {
  if (!isSmeltable(itemId)) return false;
  const state = getFurnaceState(tile);
  if (state.inputItem && state.inputItem !== itemId) return false;
  if (state.inputCount >= 64) return false;

  setFurnaceState(tile, {
    ...state,
    inputItem: itemId,
    inputCount: state.inputCount + 1,
  });
  return true;
}

export function collectFurnaceOutput(tile: Tile): { itemId: string; count: number } | null {
  const state = getFurnaceState(tile);
  if (!state.outputItem || state.outputCount <= 0) return null;

  const res = { itemId: state.outputItem, count: state.outputCount };
  setFurnaceState(tile, {
    ...state,
    outputItem: null,
    outputCount: 0,
  });
  return res;
}

export type FurnaceActionOperation =
  | "INSERT_INPUT"
  | "INSERT_FUEL"
  | "TAKE_INPUT"
  | "TAKE_FUEL"
  | "TAKE_OUTPUT";

/**
 * Executes a Furnace UI slot operation between a furnace tile and a player's inventory.
 */
export function executeFurnaceAction(
  tile: Tile,
  player: Player,
  operation: FurnaceActionOperation,
  slotIndex?: number,
  count: number = 1
): boolean {
  const state = getFurnaceState(tile);

  switch (operation) {
    case "INSERT_INPUT": {
      if (slotIndex === undefined || slotIndex < 0 || slotIndex >= player.inventory.length) return false;
      const stack = player.inventory[slotIndex];
      if (!stack || !isSmeltable(stack.id)) return false;
      if (state.inputItem && state.inputItem !== stack.id) return false;
      const room = 64 - state.inputCount;
      if (room <= 0) return false;
      const toMove = Math.min(Math.max(1, count), stack.count, room);
      stack.count -= toMove;
      if (stack.count <= 0) player.inventory[slotIndex] = null;
      setFurnaceState(tile, {
        ...state,
        inputItem: stack.id,
        inputCount: state.inputCount + toMove,
      });
      return true;
    }

    case "INSERT_FUEL": {
      if (slotIndex === undefined || slotIndex < 0 || slotIndex >= player.inventory.length) return false;
      const stack = player.inventory[slotIndex];
      if (!stack || !isFurnaceFuel(stack.id)) return false;
      if (state.fuelItem && state.fuelItem !== stack.id) return false;
      const room = 64 - state.fuelCount;
      if (room <= 0) return false;
      const toMove = Math.min(Math.max(1, count), stack.count, room);
      stack.count -= toMove;
      if (stack.count <= 0) player.inventory[slotIndex] = null;
      setFurnaceState(tile, {
        ...state,
        fuelItem: stack.id,
        fuelCount: state.fuelCount + toMove,
      });
      return true;
    }

    case "TAKE_INPUT": {
      if (!state.inputItem || state.inputCount <= 0) return false;
      const overflow = addItem(player.inventory, state.inputItem, state.inputCount);
      if (overflow === state.inputCount) return false;
      setFurnaceState(tile, {
        ...state,
        inputItem: overflow > 0 ? state.inputItem : null,
        inputCount: overflow,
        smeltProgress: overflow > 0 ? state.smeltProgress : 0,
      });
      return true;
    }

    case "TAKE_FUEL": {
      if (!state.fuelItem || state.fuelCount <= 0) return false;
      const overflow = addItem(player.inventory, state.fuelItem, state.fuelCount);
      if (overflow === state.fuelCount) return false;
      setFurnaceState(tile, {
        ...state,
        fuelItem: overflow > 0 ? state.fuelItem : null,
        fuelCount: overflow,
      });
      return true;
    }

    case "TAKE_OUTPUT": {
      if (!state.outputItem || state.outputCount <= 0) return false;
      const overflow = addItem(player.inventory, state.outputItem, state.outputCount);
      if (overflow === state.outputCount) return false;
      setFurnaceState(tile, {
        ...state,
        outputItem: overflow > 0 ? state.outputItem : null,
        outputCount: overflow,
      });
      return true;
    }
  }
}

export function tickFurnaceTile(tile: Tile): void {
  const state = getFurnaceState(tile);
  let {
    inputItem,
    inputCount,
    outputItem,
    outputCount,
    fuelItem,
    fuelCount,
    fuelTimeRemaining,
    fuelTimeTotal,
    smeltProgress,
  } = state;

  const targetOutput = inputItem && inputCount > 0 ? getSmeltResult(inputItem) : null;
  const canSmelt =
    Boolean(targetOutput) &&
    (!outputItem || outputItem === targetOutput) &&
    outputCount < 64;

  if (fuelTimeRemaining > 0) {
    fuelTimeRemaining--;
  }

  // Only consume fuel when there is a valid smeltable input and room for output
  if (fuelTimeRemaining === 0 && canSmelt && fuelItem && fuelCount > 0) {
    const burn = getFuelBurnTime(fuelItem);
    if (burn > 0) {
      fuelCount--;
      if (fuelCount === 0) fuelItem = null;
      fuelTimeRemaining = burn;
      fuelTimeTotal = burn;
    }
  }

  if (fuelTimeRemaining > 0 && canSmelt && targetOutput) {
    smeltProgress++;
    if (smeltProgress >= FURNACE_SMELT_TICKS) {
      smeltProgress = 0;
      inputCount--;
      if (inputCount <= 0) {
        inputItem = null;
        inputCount = 0;
      }
      outputItem = targetOutput;
      outputCount++;
    }
  } else if (!canSmelt) {
    smeltProgress = 0;
  }

  setFurnaceState(tile, {
    inputItem,
    inputCount,
    outputItem,
    outputCount,
    fuelItem,
    fuelCount,
    fuelTimeRemaining,
    fuelTimeTotal,
    smeltProgress,
  });
}

export function renderFurnace(
  ctx: CanvasContext2DLike,
  u: number,
  v: number,
  halfW: number,
  halfH: number,
  elevH: number,
  tile: Tile,
  topTex: HTMLImageElement | null,
  sideTex: HTMLImageElement | null,
  frontOffTex: HTMLImageElement | null,
  frontOnTex: HTMLImageElement | null
): void {
  const isLit = getFurnaceState(tile).fuelTimeRemaining > 0;
  const frontTex = isLit && isImgLoaded(frontOnTex) ? frontOnTex : frontOffTex;

  renderWallSideFace(ctx, u, v, halfW, halfH, elevH, "left", sideTex, isImgLoaded(sideTex), STONE_FALLBACK);
  renderWallSideFace(ctx, u, v, halfW, halfH, elevH, "right", frontTex, isImgLoaded(frontTex), STONE_FALLBACK);

  if (!isImgLoaded(frontTex)) {
    ctx.fillStyle = isLit ? "#ff7722" : "#222222";
    ctx.beginPath();
    ctx.moveTo(u + halfW * 0.25, v + halfH * 0.75 + elevH * 0.45);
    ctx.lineTo(u + halfW * 0.75, v + halfH * 0.25 + elevH * 0.45);
    ctx.lineTo(u + halfW * 0.75, v + halfH * 0.25 + elevH * 0.85);
    ctx.lineTo(u + halfW * 0.25, v + halfH * 0.75 + elevH * 0.85);
    ctx.closePath();
    ctx.fill();
  }

  if (isImgLoaded(topTex)) {
    renderTexturedTopDiamond(ctx, u, v, halfW, halfH, topTex, true);
  } else {
    fillTopInsetDiamond(ctx, u, v, halfW, halfH, 1.0, "#8c8c8c", "#3b3b3b");
  }
}

export const FURNACE_COMPONENT: BlockComponent = {
  onTick: ({ tile }) => {
    tickFurnaceTile(tile);
  },
  onInteract: ({ tile, player }) => {
    const collected = collectFurnaceOutput(tile);
    if (collected) {
      addItem(player.inventory, collected.itemId, collected.count);
      return true;
    }
    const equipped = player.equippedItem;
    if (equipped && isFurnaceFuel(equipped) && insertFurnaceFuel(tile, equipped)) {
      removeItem(player.inventory, equipped, 1);
      return true;
    }
    if (equipped && isSmeltable(equipped) && insertFurnaceInput(tile, equipped)) {
      removeItem(player.inventory, equipped, 1);
      return true;
    }
    return false;
  },
  onBreak: ({ room, coord, tile, player }) => {
    const state = getFurnaceState(tile);
    if (state.inputItem && state.inputCount > 0) addItem(player.inventory, state.inputItem, state.inputCount);
    if (state.outputItem && state.outputCount > 0) addItem(player.inventory, state.outputItem, state.outputCount);
    if (state.fuelItem && state.fuelCount > 0) addItem(player.inventory, state.fuelItem, state.fuelCount);
    addItem(player.inventory, "minecraft:furnace", 1);
    room.voxels[coord.z][coord.y][coord.x] = { id: "minecraft:air", type: "air", passable: true };
    return true;
  },
  getActions: ({ tile, player }) => {
    const state = getFurnaceState(tile);
    const equipped = player?.equippedItem;
    const actions: ReturnType<NonNullable<BlockComponent["getActions"]>> = [
      { id: "open_furnace", label: "Open Furnace", buttonType: "SECONDARY", icon: "🔥", description: "Open Furnace smelting UI" },
    ];
    if (state.outputItem && state.outputCount > 0) {
      actions.push({ id: "harvest", label: `Collect Output (×${state.outputCount})`, buttonType: "SECONDARY", icon: "🔥" });
    } else if (equipped && isFurnaceFuel(equipped)) {
      actions.push({ id: "harvest", label: "Add Fuel", buttonType: "SECONDARY", icon: "🔥" });
    } else if (equipped && isSmeltable(equipped)) {
      const pct = Math.floor((state.smeltProgress / FURNACE_SMELT_TICKS) * 100);
      actions.push({ id: "harvest", label: state.inputItem ? `Add Input (${pct}%)` : "Smelt Item", buttonType: "SECONDARY", icon: "🪨" });
    }
    return actions;
  },
  onRender: ({ ctx, u, v, halfW, halfH, elevH, tile, getTexture }) => {
    renderFurnace(
      ctx,
      u,
      v,
      halfW,
      halfH,
      elevH,
      tile,
      getTexture("minecraft:furnace_top"),
      getTexture("minecraft:furnace_side"),
      getTexture("minecraft:furnace"),
      getTexture("minecraft:furnace_on")
    );
  },
  getStatusText: (tile) => {
    const f = getFurnaceState(tile);
    if (f.outputCount > 0) return ` [Output ×${f.outputCount}]`;
    if (f.fuelTimeRemaining > 0 && f.inputCount > 0) {
      return ` [Lit ${Math.floor((f.smeltProgress / FURNACE_SMELT_TICKS) * 100)}%]`;
    }
    return f.fuelTimeRemaining > 0 ? " [Lit]" : " [Idle]";
  },
};
