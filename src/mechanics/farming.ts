import type { Room, Player, Tile, Vec3 } from "../core/types.ts";
import type { DeterministicRNG } from "../core/math.ts";
import { getBlockDefinition, getItemDefinition } from "../registry/definitions.ts";
import { getMaxInteriorZ } from "../world/room.ts";

export interface HarvestResult {
  success: boolean;
  drops: Array<{ id: string; count: number }>;
  resetsGrowth: boolean;
  destroysTile: boolean;
}

/**
 * Farming and agricultural growth mechanics.
 *
 * Backreferences & Verification:
 * - FTB Wiki (Bonsai Trees): https://ftbwiki.org/Bonsai_Trees
 * - Minecraft Wiki (Farmland & Crops): https://minecraft.wiki/w/Farmland & https://minecraft.wiki/w/Wheat_Seeds
 * - FTB Wiki (Industrial Hemp): https://ftbwiki.org/Industrial_Hemp_Seeds
 * - Upstream Bonsai script: `scripts/bonsai.zs`
 *   https://github.com/kamunimaximus/CompactClaustrophobia/blob/master/scripts/bonsai.zs
 */

/**
 * Checks whether a given tile is a growing crop or bonsai.
 */
export function isCropTile(tile: Tile): boolean {
  const blockDef = getBlockDefinition(tile.id);
  if (blockDef?.isCropTop) return false;
  if (tile.type === "crop") return true;
  return Boolean(blockDef?.isCrop);
}

/**
 * Returns current growth progress (0.0 to 1.0) and stage of a crop tile.
 */
export function getGrowthProgress(tile: Tile): {
  growthTicks: number;
  maxTicks: number;
  progress: number; // 0.0 to 1.0
  isMature: boolean;
  stage: number; // 0..3 for bonsai (0%, 33%, 66%, 100%), 0..7 for wheat
} {
  const blockDef = getBlockDefinition(tile.id);
  const maxTicks = blockDef?.maxGrowthTicks ?? 1200;
  const growthTicks = (tile.metadata?.growthTicks as number) ?? 0;
  const progress = Math.min(1.0, growthTicks / maxTicks);
  const isMature = progress >= 1.0;

  const growthStages = blockDef?.growthStages ?? 4;
  const stage =
    growthStages > 4
      ? Math.min(growthStages - 1, Math.floor(progress * (growthStages - 1)))
      : progress >= 1.0
        ? 3
        : progress >= 0.66
          ? 2
          : progress >= 0.33
            ? 1
            : 0;

  return {
    growthTicks,
    maxTicks,
    progress,
    isMature,
    stage,
  };
}

/**
 * Validates whether an item can be planted at a specific coord in a room.
 * Must be empty air and resting directly on valid soil (e.g. farmland).
 */
export function canPlant(
  room: Room,
  coord: Vec3,
  itemId: string
): { allowed: boolean; reason?: string } {
  const itemDef = getItemDefinition(itemId);
  if (!itemDef?.plantable) {
    return { allowed: false, reason: "Item is not plantable" };
  }

  // Target voxel must be air or passable
  const targetTile = room.voxels[coord.z]?.[coord.y]?.[coord.x];
  if (!targetTile || (targetTile.id !== "minecraft:air" && !targetTile.passable)) {
    return { allowed: false, reason: "Target voxel is obstructed" };
  }

  // Supporting block beneath targetCoord must be valid soil (e.g. farmland)
  const soilZ = coord.z - 1;
  if (soilZ < 0) {
    return { allowed: false, reason: "No supporting block beneath" };
  }

  const soilTile = room.voxels[soilZ]?.[coord.y]?.[coord.x];
  if (!soilTile) {
    return { allowed: false, reason: "No supporting soil block" };
  }

  const allowedSoil = itemDef.plantableOn ?? ["minecraft:farmland"];
  if (!allowedSoil.includes(soilTile.id)) {
    return {
      allowed: false,
      reason: `Requires fertile soil (${allowedSoil.join(" or ")})`,
    };
  }

  return { allowed: true };
}

/**
 * Plants a sapling or seed at coord. Sets up tile and initial growth metadata.
 */
export function plantCrop(room: Room, coord: Vec3, itemId: string): Tile | null {
  const check = canPlant(room, coord, itemId);
  if (!check.allowed) return null;

  const itemDef = getItemDefinition(itemId);
  const cropId = itemDef?.placesCropId ?? itemDef?.placesTileId ?? itemId;
  const blockDef = getBlockDefinition(cropId);

  const tile: Tile = {
    id: cropId,
    type: blockDef?.type ?? "crop",
    passable: blockDef?.passable ?? true,
    metadata: {
      growthTicks: 0,
      plantedItemId: itemId,
    },
  };

  room.voxels[coord.z][coord.y][coord.x] = tile;
  return tile;
}

function trySpawnMultiBlockTop(
  room: Room,
  x: number,
  y: number,
  z: number,
  topTileId: string,
  maxColumnHeight: number = 2
): void {
  const topDef = getBlockDefinition(topTileId);
  for (let offset = 1; offset < maxColumnHeight; offset++) {
    const targetZ = z + offset;
    if (targetZ > getMaxInteriorZ(room)) return;
    const tile = room.voxels[targetZ]?.[y]?.[x];
    if (!tile) return;
    if (tile.id === "minecraft:air") {
      room.voxels[targetZ][y][x] = {
        id: topTileId,
        type: topDef?.type ?? "crop",
        passable: topDef?.passable ?? true,
        metadata: {
          baseCoord: { x, y, z },
        },
      };
      return;
    }
    if (tile.id !== topTileId) return;
  }
}

export function tickCropTile(
  room: Room,
  coord: Vec3,
  tile: Tile,
  sneakingPlayers: Player[]
): void {
  if (!isCropTile(tile)) return;

  const { x, y, z } = coord;
  const blockDef = getBlockDefinition(tile.id);
  const maxTicks = blockDef?.maxGrowthTicks ?? 1200;
  const maxHeight = blockDef?.maxColumnHeight ?? 2;

  const currentTicks = (tile.metadata?.growthTicks as number) ?? 0;
  if (currentTicks >= maxTicks) {
    if (blockDef?.multiBlockTopTileId) {
      const harvestCooldown = (tile.metadata?.harvestCooldown as number) ?? 0;
      if (harvestCooldown > 0) {
        tile.metadata!.harvestCooldown = harvestCooldown - 1;
      } else {
        trySpawnMultiBlockTop(room, x, y, z, blockDef.multiBlockTopTileId, maxHeight);
      }
    }
    return;
  }

  let deltaTicks = 1;
  const isNearSneaking = sneakingPlayers.some((p) => {
    const dx = Math.abs(p.x - x);
    const dy = Math.abs(p.y - y);
    const dz = Math.abs(p.z - z);
    return dx <= 1 && dy <= 1 && dz <= 2;
  });

  if (isNearSneaking) {
    deltaTicks += 3;
  }

  const newTicks = Math.min(maxTicks, currentTicks + deltaTicks);
  tile.metadata = {
    ...tile.metadata,
    growthTicks: newTicks,
  };

  if (blockDef?.multiBlockTopTileId && newTicks >= maxTicks) {
    trySpawnMultiBlockTop(room, x, y, z, blockDef.multiBlockTopTileId, maxHeight);
  }
}

/**
 * Harvests a mature crop or bonsai:
 * - Resets growth back to the first stage (stage 0 / growthTicks = 0), autoplanting in place.
 * - The replanting seed/sapling does NOT reach inventory.
 * - Only harvestable when fully grown.
 */
export function harvestPlant(
  tile: Tile,
  rng?: DeterministicRNG
): HarvestResult {
  const blockDef = getBlockDefinition(tile.id);
  const { isMature } = getGrowthProgress(tile);

  // Multi-block crop top (destroys top block on harvest)
  if (blockDef?.isCropTop) {
    const drops: Array<{ id: string; count: number }> = [];
    const roll = rng ? rng.next() : 0.4;
    const drop = blockDef.drops?.[0];
    if (drop) {
      const count =
        drop.min !== undefined && drop.max !== undefined
          ? drop.min + Math.floor(roll * (drop.max - drop.min + 1))
          : drop.count;
      drops.push({ id: drop.itemId, count });
    }
    return {
      success: true,
      drops,
      resetsGrowth: false,
      destroysTile: true,
    };
  }

  // Immature plants cannot be harvested (they can only be broken)
  if (!isMature) {
    return {
      success: false,
      drops: [],
      resetsGrowth: false,
      destroysTile: false,
    };
  }

  const drops: Array<{ id: string; count: number }> = [];

  // Generic harvest drops from block definition (plus optional binomial seed yield)
  if (blockDef?.harvestDrops) {
    for (const drop of blockDef.harvestDrops) {
      const chance = drop.chance ?? 1.0;
      const roll = rng ? rng.next() : 0.5;
      if (roll <= chance) {
        let count = drop.count;
        if (drop.min !== undefined && drop.max !== undefined) {
          count = drop.min + Math.floor(roll * (drop.max - drop.min + 1));
        }
        if (count > 0) {
          drops.push({ id: drop.itemId, count });
        }
      }
    }

    if (blockDef.harvestSeedBinomial) {
      const roll = rng ? rng.next() : 0.5;
      const match = blockDef.harvestSeedBinomial.weights.find((w) => roll < w.maxRoll);
      const excessSeeds = (match?.count ?? 1) - 1;
      if (excessSeeds > 0) {
        drops.push({ id: blockDef.harvestSeedBinomial.itemId, count: excessSeeds });
      }
    }

    if (tile.metadata) {
      tile.metadata.growthTicks = 0;
    }

    return {
      success: true,
      drops,
      resetsGrowth: true,
      destroysTile: false,
    };
  }

  return {
    success: false,
    drops: [],
    resetsGrowth: false,
    destroysTile: false,
  };
}
