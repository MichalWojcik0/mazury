import type { Player, Tile, Item } from "../core/types.ts";
import type { DeterministicRNG } from "../core/math.ts";

export interface PunchResult {
  success: boolean;
  drops: Item[];
  damageTaken: number;
  exhaustionAdded: number;
  reason?: string;
}

/**
 * Handles striking solid Compact Machine walls according to modpack rules:
 * - Bare Fists:
 *   - Drops 1x Dirt Dust (`contenttweaker:dirtdust`)
 *   - 25% chance of 1x Gravel (`minecraft:gravel`)
 *   - Deals 1 self-damage (0.5 heart)
 *   - Adds 0.05 exhaustion
 * - Wooden Pickaxe:
 *   - Drops 1x Stone Pebble (100%), with chances for Granite, Diorite, Andesite
 *   - Consumes tool durability (adds exhaustion 0.02)
 *   - Zero self-damage
 * - Stone Pickaxe:
 *   - Drops metallic grits/ores (Copper, Iron, Tin, Lead, Beryllium)
 *   - Zero self-damage
 */
export function strikeWall(player: Player, targetTile: Tile, rng: DeterministicRNG): PunchResult {
  if (targetTile.id !== "compactmachines3:wall") {
    return { success: false, drops: [], damageTaken: 0, exhaustionAdded: 0, reason: "Target is not a solid compact wall" };
  }

  const tool = player.equippedItem;

  if (!tool) {
    // Bare hands
    const drops: Item[] = [{ id: "contenttweaker:dirtdust", count: 1 }];
    if (rng.next() < 0.25) {
      drops.push({ id: "minecraft:gravel", count: 1 });
    }
    return {
      success: true,
      drops,
      damageTaken: 1,
      exhaustionAdded: 0.05,
    };
  }

  if (tool === "minecraft:wooden_pickaxe") {
    // Drops stone pebbles
    const drops: Item[] = [{ id: "exnihilocreatio:item_pebble:0", count: 1 }];
    const roll = rng.next();
    if (roll < 0.2) {
      drops.push({ id: "exnihilocreatio:item_pebble:1", count: 1 }); // Granite
    } else if (roll < 0.4) {
      drops.push({ id: "exnihilocreatio:item_pebble:2", count: 1 }); // Diorite
    } else if (roll < 0.6) {
      drops.push({ id: "exnihilocreatio:item_pebble:3", count: 1 }); // Andesite
    }
    return {
      success: true,
      drops,
      damageTaken: 0,
      exhaustionAdded: 0.02,
    };
  }

  if (tool === "minecraft:stone_pickaxe") {
    // Drops metal grits
    const drops: Item[] = [{ id: "exnihilocreatio:item_ore_iron:0", count: 1 }];
    const roll = rng.next();
    if (roll < 0.3) {
      drops.push({ id: "exnihilocreatio:item_ore_copper:0", count: 1 });
    }
    return {
      success: true,
      drops,
      damageTaken: 0,
      exhaustionAdded: 0.02,
    };
  }

  return {
    success: false,
    drops: [],
    damageTaken: 0,
    exhaustionAdded: 0,
    reason: "Ineffective tool for solid compact machine walls",
  };
}
