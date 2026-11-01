import type { Player, Item } from "../core/types.ts";

/** Sneak duration required to produce poop: 100 ticks = 5 seconds at 20 Hz */
export const SNEAK_POOP_THRESHOLD_TICKS = 100;

export interface SneakTickResult {
  poopProduced: boolean;
  drop?: Item;
  exhaustionAdded: number;
}

/**
 * Updates a player's sneaking state on each simulation tick.
 * When sneak timer reaches SNEAK_POOP_THRESHOLD_TICKS (5 seconds),
 * generates 1x `cropdusting:poop` and adds exhaustion.
 */
export function updateSneak(player: Player): SneakTickResult {
  if (!player.isSneaking) {
    if (player.sneakTimer > 0) {
      player.sneakTimer = 0;
    }
    return { poopProduced: false, exhaustionAdded: 0 };
  }

  player.sneakTimer += 1;

  if (player.sneakTimer >= SNEAK_POOP_THRESHOLD_TICKS) {
    player.sneakTimer = 0;
    return {
      poopProduced: true,
      drop: { id: "cropdusting:poop", count: 1 },
      exhaustionAdded: 0.1,
    };
  }

  return { poopProduced: false, exhaustionAdded: 0 };
}
