import test from "node:test";
import assert from "node:assert/strict";

import { GameEngine } from "../src/core/engine.ts";
import { addItem, countItem } from "../src/inventory/inventory.ts";
import { CHAPTER_1_RECIPES, canCraft } from "../src/crafting/list-crafting.ts";
import { hasStatusEffect } from "../src/mechanics/eating.ts";

test("Poop Fuel recipe requires 1x Wheat + 1x Organic Poop (Compact Claustrophobia parity)", () => {
  const engine = new GameEngine(1337);
  const player = engine.players.get(0)!;
  const poopFuelRecipe = CHAPTER_1_RECIPES.find((r) => r.id === "recipe:poop_fuel")!;

  // Only poop is NOT enough
  addItem(player.inventory, "cropdusting:poop", 1);
  assert.equal(canCraft(poopFuelRecipe, player.inventory, false), false);

  // Adding 1x wheat makes it craftable
  addItem(player.inventory, "minecraft:wheat", 1);
  assert.equal(canCraft(poopFuelRecipe, player.inventory, false), true);

  engine.enqueueInput({
    tick: engine.currentTick + 1,
    playerId: 0,
    action: { type: "CRAFT_RECIPE", recipeId: "recipe:poop_fuel", count: 1 },
  });
  engine.stepTick();

  assert.equal(countItem(player.inventory, "contenttweaker:poopfuel"), 1);
  assert.equal(countItem(player.inventory, "cropdusting:poop"), 0);
  assert.equal(countItem(player.inventory, "minecraft:wheat"), 0);
});

test("Eating Organic Poop applies exact CropDusting effects (Nausea, Blindness, Night Vision, Saturation) and regenerates health", () => {
  const engine = new GameEngine(1337);
  const player = engine.players.get(0)!;

  addItem(player.inventory, "cropdusting:poop", 2);
  player.health = 14;
  player.hunger = 6;
  player.exhaustion = 3.0;

  // Eat 1 poop via EAT_ITEM
  engine.enqueueInput({
    tick: engine.currentTick + 1,
    playerId: 0,
    action: { type: "EAT_ITEM", itemId: "cropdusting:poop" },
  });
  engine.stepTick();

  assert.equal(countItem(player.inventory, "cropdusting:poop"), 1);
  assert.equal(hasStatusEffect(player, "nausea"), true);
  assert.equal(hasStatusEffect(player, "blindness"), true);
  assert.equal(hasStatusEffect(player, "night_vision"), true);
  assert.equal(hasStatusEffect(player, "saturation"), true);

  // Verify initial durations (1 tick already elapsed during stepTick)
  const byId = new Map((player.effects ?? []).map((e) => [e.id, e.remainingTicks]));
  assert.equal(byId.get("saturation"), 49);
  assert.equal(byId.get("blindness"), 99);
  assert.equal(byId.get("nausea"), 199);
  assert.equal(byId.get("night_vision"), 2399);

  // Advance 49 more ticks -> saturation expires, hunger is refilled to 20, health regenerated
  for (let i = 0; i < 49; i++) {
    engine.stepTick();
  }
  assert.equal(player.hunger, 20);
  assert.ok(player.health > 14, "Health should regenerate while saturated / high hunger");
  assert.equal(hasStatusEffect(player, "saturation"), false);
  assert.equal(hasStatusEffect(player, "blindness"), true);

  // Poop is alwaysEdible: can still be eaten at full hunger (20)
  engine.enqueueInput({
    tick: engine.currentTick + 1,
    playerId: 0,
    action: { type: "EAT_ITEM", itemId: "cropdusting:poop" },
  });
  engine.stepTick();
  assert.equal(countItem(player.inventory, "cropdusting:poop"), 0);
  assert.equal(hasStatusEffect(player, "saturation"), true);
});
