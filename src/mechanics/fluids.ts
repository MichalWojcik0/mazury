export {
  CRUCIBLE_CAPACITY_MB as FLUID_CAPACITY_MB,
  CRUCIBLE_MELT_RATE_MB_PER_TICK,
  getCrucibleState,
  getCrucibleMeltValue,
  insertCrucibleItem,
  extractCrucibleWater,
  tickCrucibleTile,
  renderCrucible,
  CRUCIBLE_COMPONENT,
  type CrucibleState,
} from "./crucible.ts";

export {
  BARREL_CAPACITY_MB,
  BARREL_CLAY_REACTION_TICKS,
  BARREL_REACTIONS,
  getBarrelState,
  fillBarrelWithWater,
  extractBarrelWater,
  insertBarrelItem,
  harvestBarrelOutput,
  tickBarrelTile,
  renderBarrel,
  BARREL_COMPONENT,
  type BarrelFluidType,
  type BarrelState,
  type BarrelReactionDef,
} from "./barrel.ts";
