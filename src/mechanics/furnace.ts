import type { Tile } from "../core/types.ts";
import { getItemDefinition } from "../registry/definitions.ts";

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
