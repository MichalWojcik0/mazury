import type { Room, Player, Tile, Vec3 } from "../core/types.ts";
import type { DeterministicRNG } from "../core/math.ts";
import { getBlockDefinition, getItemDefinition } from "../registry/definitions.ts";

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
  if (tile.id === "immersiveengineering:hemp_top") return false;
  if (tile.type === "crop") return true;
  const blockDef = getBlockDefinition(tile.id);
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

  let stage = 0;
  if (tile.id === "minecraft:wheat") {
    stage = Math.min(7, Math.floor(progress * 7));
  } else {
    // 0: sapling (< 0.33), 1: sprout (0.33..0.66), 2: bushy (0.66..1.0), 3: mature (1.0)
    if (progress >= 1.0) stage = 3;
    else if (progress >= 0.66) stage = 2;
    else if (progress >= 0.33) stage = 1;
    else stage = 0;
  }

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

/**
 * Ticks growth simulation for all bonsai and crops in the room.
 * Twerking / Sneaking acceleration: When any player in the room is sneaking adjacent
 * (Chebyshev distance <= 1 tile in x, y, and within 1 block in z), growth advances by +3 extra ticks.
 */
export function tickFarming(
  room: Room,
  players: Iterable<Player>,
  rng?: DeterministicRNG
): void {
  const sneakingPlayers: Player[] = [];
  for (const player of players) {
    if (player.currentRoomId === room.id && player.isSneaking) {
      sneakingPlayers.push(player);
    }
  }

  for (let z = 0; z < room.depth; z++) {
    for (let y = 0; y < room.height; y++) {
      for (let x = 0; x < room.width; x++) {
        const tile = room.voxels[z]?.[y]?.[x];
        if (!tile || !isCropTile(tile)) continue;

        const blockDef = getBlockDefinition(tile.id);
        const maxTicks = blockDef?.maxGrowthTicks ?? 1200;

        let currentTicks = (tile.metadata?.growthTicks as number) ?? 0;
        if (currentTicks >= maxTicks) {
          // Check for multi-block crops (e.g. Industrial Hemp extending to height 2)
          if (tile.id === "immersiveengineering:hemp") {
            const harvestCooldown = (tile.metadata?.harvestCooldown as number) ?? 0;
            if (harvestCooldown > 0) {
              tile.metadata.harvestCooldown = harvestCooldown - 1;
            } else {
              const aboveZ = z + 1;
              if (aboveZ < room.depth) {
                const aboveTile = room.voxels[aboveZ]?.[y]?.[x];
                if (aboveTile && aboveTile.id === "minecraft:air") {
                  room.voxels[aboveZ][y][x] = {
                    id: "immersiveengineering:hemp_top",
                    type: "crop",
                    passable: true,
                    metadata: {
                      baseCoord: { x, y, z },
                    },
                  };
                }
              }
            }
          }
          continue;
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

        if (tile.id === "immersiveengineering:hemp" && newTicks >= maxTicks) {
          const aboveZ = z + 1;
          if (aboveZ < room.depth) {
            const aboveTile = room.voxels[aboveZ]?.[y]?.[x];
            if (aboveTile && aboveTile.id === "minecraft:air") {
              room.voxels[aboveZ][y][x] = {
                id: "immersiveengineering:hemp_top",
                type: "crop",
                passable: true,
                metadata: {
                  baseCoord: { x, y, z },
                },
              };
            }
          }
        }
      }
    }
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

  // If top hemp block
  if (tile.id === "immersiveengineering:hemp_top") {
    const drops: Array<{ id: string; count: number }> = [];
    const roll = rng ? rng.next() : 0.4;
    const count = roll < 0.5 ? 1 : 2;
    drops.push({ id: "immersiveengineering:material:4", count });
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

  // Bonsai harvest (mature only): drops 4 cuttings of corresponding type, no leaves, autoplanted back to stage 0
  if (tile.id.startsWith("arcadialbonsaitrees:bonsai_")) {
    const cuttingId = tile.id.endsWith("_sapling")
      ? tile.id.replace(/_sapling$/, "_cutting")
      : "arcadialbonsaitrees:bonsai_oak_cutting";
    drops.push({
      id: cuttingId,
      count: 4,
    });

    // Reset growth ticks to 0 (autoplanted back to first stage)
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

  // Wheat harvest (mature only): drops 1 wheat + 1-4 wheat seeds with Minecraft binomial weights:
  // 1 seed: ~7.87% (0.0787)
  // 2 seeds: ~31.49% (0.0787 + 0.3149 = 0.3936)
  // 3 seeds: ~41.98% (0.3936 + 0.4198 = 0.8134)
  // 4 seeds: ~18.66% (remaining)
  if (tile.id === "minecraft:wheat") {
    drops.push({ id: "minecraft:wheat", count: 1 });

    const roll = rng ? rng.next() : Math.random();
    let seedCount: number;
    if (roll < 0.0787) {
      seedCount = 1;
    } else if (roll < 0.3936) {
      seedCount = 2;
    } else if (roll < 0.8134) {
      seedCount = 3;
    } else {
      seedCount = 4;
    }

    // 1 seed is autoplanted (resets growth to 0), remaining seeds reach inventory
    const excessSeeds = seedCount - 1;
    if (excessSeeds > 0) {
      drops.push({ id: "minecraft:wheat_seeds", count: excessSeeds });
    }

    // Reset growth ticks to 0 (autoplanted back to first stage)
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

  // Generic harvest drops from block definition
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
