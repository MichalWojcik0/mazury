import type { Player, StatusEffect, StatusEffectId } from "../core/types.ts";
import { countItem, removeItem } from "../inventory/inventory.ts";
import { getItemDefinition } from "../registry/definitions.ts";

export interface EatResult {
  success: boolean;
  itemId?: string;
  hungerRestored: number;
  appliedEffects: StatusEffect[];
  reason?: string;
}

/**
 * Exact status effects applied by `CropDusting-0.7-[1.12.2].jar`
 * (`com.mramericanmike.cropdusting.items.Poop#onFoodEaten`):
 * - ItemFood(2, false).setAlwaysEdible() -> restores 2 hunger (1 drumstick), always edible
 * - Potion 9  (Nausea I):       200 ticks (10s)
 * - Potion 15 (Blindness I):    100 ticks (5s)
 * - Potion 16 (Night Vision I): 2400 ticks (120s)
 * - Potion 23 (Saturation I):   50 ticks (2.5s)
 */
export const POOP_STATUS_EFFECTS: ReadonlyArray<StatusEffect> = [
  { id: "nausea", remainingTicks: 200, amplifier: 0 },
  { id: "blindness", remainingTicks: 100, amplifier: 0 },
  { id: "night_vision", remainingTicks: 2400, amplifier: 0 },
  { id: "saturation", remainingTicks: 50, amplifier: 0 },
];

export function applyStatusEffect(player: Player, effect: StatusEffect): void {
  if (!player.effects) {
    player.effects = [];
  }
  const existing = player.effects.find((e) => e.id === effect.id);
  if (existing) {
    existing.remainingTicks = Math.max(existing.remainingTicks, effect.remainingTicks);
    existing.amplifier = Math.max(existing.amplifier, effect.amplifier);
  } else {
    player.effects.push({ ...effect });
  }
}

export function hasStatusEffect(player: Player, effectId: StatusEffectId): boolean {
  return Boolean(player.effects?.some((e) => e.id === effectId && e.remainingTicks > 0));
}

/**
 * Consumes an edible item from the player's inventory, restores hunger,
 * and applies any associated status effects.
 */
export function eatItem(player: Player, itemId?: string): EatResult {
  const targetId = itemId ?? player.equippedItem;
  if (!targetId) {
    return { success: false, hungerRestored: 0, appliedEffects: [], reason: "No item selected to eat" };
  }

  const def = getItemDefinition(targetId);
  if (!def?.edible) {
    return { success: false, itemId: targetId, hungerRestored: 0, appliedEffects: [], reason: "Item is not edible" };
  }

  if (!def.alwaysEdible && player.hunger >= 20) {
    return { success: false, itemId: targetId, hungerRestored: 0, appliedEffects: [], reason: "Hunger is already full" };
  }

  if (countItem(player.inventory, targetId) < 1) {
    return { success: false, itemId: targetId, hungerRestored: 0, appliedEffects: [], reason: "No item in inventory" };
  }

  const removed = removeItem(player.inventory, targetId, 1);
  if (!removed) {
    return { success: false, itemId: targetId, hungerRestored: 0, appliedEffects: [], reason: "Failed to consume item" };
  }

  const restore = def.hungerRestore ?? 2;
  const hungerBefore = player.hunger;
  player.hunger = Math.min(20, player.hunger + restore);

  const appliedEffects: StatusEffect[] = [];
  if (targetId === "cropdusting:poop") {
    for (const eff of POOP_STATUS_EFFECTS) {
      applyStatusEffect(player, eff);
      appliedEffects.push({ ...eff });
    }
  }

  return {
    success: true,
    itemId: targetId,
    hungerRestored: player.hunger - hungerBefore,
    appliedEffects,
  };
}

/**
 * Advances active status effects and Minecraft-parity natural health regeneration by 1 tick (20 Hz).
 * - Saturation I restores +1 hunger per tick (up to 20) and clears exhaustion.
 * - Natural regeneration: when hunger >= 18 and 0 < health < 20, restores +1 HP every 20 ticks
 *   while Saturation is active (or every 80 ticks normally), adding 1.5 exhaustion.
 */
export function tickPlayerEffectsAndRegen(player: Player): void {
  const saturationActive = hasStatusEffect(player, "saturation");

  if (saturationActive) {
    player.hunger = Math.min(20, player.hunger + 1);
    player.exhaustion = 0;
  }

  if (player.effects && player.effects.length > 0) {
    for (const eff of player.effects) {
      eff.remainingTicks -= 1;
    }
    player.effects = player.effects.filter((eff) => eff.remainingTicks > 0);
  }

  // Natural health regeneration (Minecraft 1.12.2 parity)
  if (player.hunger >= 18 && player.health > 0 && player.health < 20) {
    player.regenTimer = (player.regenTimer ?? 0) + 1;
    const regenInterval = saturationActive ? 20 : 80;
    if (player.regenTimer >= regenInterval) {
      player.regenTimer = 0;
      player.health = Math.min(20, player.health + 1);
      if (!saturationActive) {
        player.exhaustion += 1.5;
      }
    }
  } else {
    player.regenTimer = 0;
  }
}
