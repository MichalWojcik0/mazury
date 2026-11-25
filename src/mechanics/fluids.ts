import type { Room, Tile } from "../core/types.ts";
import { getItemDefinition } from "../registry/definitions.ts";

export const FLUID_CAPACITY_MB = 1000;
export const CRUCIBLE_MELT_RATE_MB_PER_TICK = 2.5; // 250 mB per 100 ticks
export const BARREL_CLAY_REACTION_TICKS = 200;

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
  if (state.fluidAmount + state.solidAmount >= FLUID_CAPACITY_MB) return false;

  const nextSolid = Math.min(FLUID_CAPACITY_MB - state.fluidAmount, state.solidAmount + mb);
  setCrucibleState(tile, { ...state, solidAmount: nextSolid });
  return true;
}

export function extractCrucibleWater(tile: Tile): boolean {
  const state = getCrucibleState(tile);
  if (state.fluidType !== "water" || state.fluidAmount < FLUID_CAPACITY_MB) return false;

  setCrucibleState(tile, {
    ...state,
    fluidAmount: 0,
    fluidType: null,
  });
  return true;
}

export function tickCrucibleTile(tile: Tile): void {
  const state = getCrucibleState(tile);
  if (state.solidAmount <= 0 || state.fluidAmount >= FLUID_CAPACITY_MB) return;

  const melted = Math.min(
    state.solidAmount,
    CRUCIBLE_MELT_RATE_MB_PER_TICK,
    FLUID_CAPACITY_MB - state.fluidAmount
  );
  setCrucibleState(tile, {
    solidAmount: state.solidAmount - melted,
    fluidType: "water",
    fluidAmount: state.fluidAmount + melted,
  });
}

export function tickCrucibles(room: Room): void {
  for (let z = 0; z < room.depth; z++) {
    for (let y = 0; y < room.height; y++) {
      for (let x = 0; x < room.width; x++) {
        const tile = room.voxels[z]?.[y]?.[x];
        if (tile?.id === "exnihilocreatio:block_crucible_wood") {
          tickCrucibleTile(tile);
        }
      }
    }
  }
}

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
    fluidAmount: FLUID_CAPACITY_MB,
  });
  return true;
}

export function extractBarrelWater(tile: Tile): boolean {
  const state = getBarrelState(tile);
  if (state.fluidType !== "water" || state.fluidAmount < FLUID_CAPACITY_MB || state.solidItem || state.outputItem) {
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
  if (state.solidItem || state.outputItem || state.fluidAmount < FLUID_CAPACITY_MB || !state.fluidType) {
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
        fluidAmount: FLUID_CAPACITY_MB,
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

export function tickBarrels(room: Room): void {
  for (let z = 0; z < room.depth; z++) {
    for (let y = 0; y < room.height; y++) {
      for (let x = 0; x < room.width; x++) {
        const tile = room.voxels[z]?.[y]?.[x];
        if (tile?.id === "exnihilocreatio:block_barrel_wood") {
          tickBarrelTile(tile);
        }
      }
    }
  }
}
