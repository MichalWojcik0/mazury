import test from "node:test";
import assert from "node:assert/strict";

import { GameEngine } from "../src/core/engine.ts";
import { addItem, countItem, createEmptyInventory } from "../src/inventory/inventory.ts";
import {
  CHAPTER_1_RECIPES,
  getCraftability,
  hasNearbyCraftingStation,
  hasCraftingStationAccess,
  buildRecipeGroups,
} from "../src/crafting/list-crafting.ts";

test("Crafting Wooden Pickaxe succeeds when standing next to a placed Crafting Station with 4 sticks and 6 planks", () => {
  const engine = new GameEngine(1337);
  const player = engine.players.get(0)!;

  // Enter Tiny Compact Machine (player spawns at 1, 1, 1)
  engine.enqueueInput({ tick: 1, playerId: 0, action: { type: "USE_PSD" } });
  engine.stepTick();

  const room = engine.rooms.get("room_tiny_1")!;
  // Place Crafting Station adjacent at (2, 1, 1) (NOT in player inventory)
  room.voxels[1][1][2] = {
    id: "craftingstation:crafting_station",
    type: "machine",
    passable: false,
  };
  assert.equal(countItem(player.inventory, "craftingstation:crafting_station"), 0);
  assert.equal(hasNearbyCraftingStation(room, player), true);
  assert.equal(hasCraftingStationAccess(room, player), true);

  // Give 4 sticks and 6 planks
  addItem(player.inventory, "minecraft:stick", 4);
  addItem(player.inventory, "minecraft:planks", 6);

  const pickRecipe = CHAPTER_1_RECIPES.find((r) => r.id === "recipe:wooden_pickaxe")!;
  const status = getCraftability(pickRecipe, player.inventory, true);
  assert.equal(status.craftable, true);
  assert.equal(status.missingStation, false);
  assert.equal(status.missingInputs.length, 0);
  assert.equal(status.maxCraftableCount, 2);

  // Execute CRAFT_RECIPE through GameEngine
  engine.enqueueInput({
    tick: engine.currentTick + 1,
    playerId: 0,
    action: { type: "CRAFT_RECIPE", recipeId: "recipe:wooden_pickaxe", count: 1 },
  });
  engine.stepTick();

  assert.equal(countItem(player.inventory, "minecraft:wooden_pickaxe"), 1);
  assert.equal(countItem(player.inventory, "minecraft:planks"), 3);
  assert.equal(countItem(player.inventory, "minecraft:stick"), 2);
});

test("Crafting Station out of reach blocks station-only recipes and reports missingStation", () => {
  const engine = new GameEngine(1337);
  const player = engine.players.get(0)!;

  engine.enqueueInput({ tick: 1, playerId: 0, action: { type: "USE_PSD" } });
  engine.stepTick();

  // Move player to corner (0, 0, 1)
  player.x = 0;
  player.y = 0;

  const room = engine.rooms.get("room_tiny_1")!;
  // Place Crafting Station at opposite corner (2, 2, 1) (distance 2 -> out of reach)
  room.voxels[1][2][2] = {
    id: "craftingstation:crafting_station",
    type: "machine",
    passable: false,
  };

  assert.equal(hasNearbyCraftingStation(room, player), false);
  assert.equal(hasCraftingStationAccess(room, player), false);

  addItem(player.inventory, "minecraft:stick", 4);
  addItem(player.inventory, "minecraft:planks", 6);

  const pickRecipe = CHAPTER_1_RECIPES.find((r) => r.id === "recipe:wooden_pickaxe")!;
  const status = getCraftability(pickRecipe, player.inventory, hasCraftingStationAccess(room, player));
  assert.equal(status.craftable, false);
  assert.equal(status.missingStation, true);
  assert.equal(status.missingInputs.length, 0);
});

test("getCraftability detects full inventory when output cannot fit", () => {
  const inv = createEmptyInventory();
  // Fill slot 0 with 4 dirt dust, remaining 35 slots with unstackable wooden pickaxes
  inv[0] = { id: "contenttweaker:dirtdust", count: 8 };
  for (let i = 1; i < 36; i++) {
    inv[i] = { id: "minecraft:wooden_pickaxe", count: 1 };
  }

  // Crafting dirt consumes 4 of 8 dirt dust (slot 0 stays occupied) and needs a new slot for minecraft:dirt -> full!
  const dirtRecipe = CHAPTER_1_RECIPES.find((r) => r.id === "recipe:dirt")!;
  const fullStatus = getCraftability(dirtRecipe, inv, false);
  assert.equal(fullStatus.craftable, false);
  assert.equal(fullStatus.inventoryFull, true);

  // If slot 0 has exactly 4 dirt dust, deducting them frees slot 0 so dirt CAN fit!
  inv[0] = { id: "contenttweaker:dirtdust", count: 4 };
  const fitsAfterConsume = getCraftability(dirtRecipe, inv, false);
  assert.equal(fitsAfterConsume.craftable, true);
  assert.equal(fitsAfterConsume.inventoryFull, false);
});

test("buildRecipeGroups groups, filters, and sorts recipes with craftable first", () => {
  const inv = createEmptyInventory();
  addItem(inv, "minecraft:planks", 6);
  addItem(inv, "minecraft:stick", 4);

  // Sort by craftable with no grouping -> craftable recipes come before uncraftable ones
  const flatSorted = buildRecipeGroups(CHAPTER_1_RECIPES, inv, true, {
    filter: "all",
    groupBy: "none",
    sortBy: "craftable",
  });
  assert.equal(flatSorted.length, 1);
  const items = flatSorted[0].items;
  const firstUncraftableIdx = items.findIndex((it) => !it.status.craftable);
  assert.ok(firstUncraftableIdx > 0, "Should have craftable recipes at the top");
  assert.ok(
    items.slice(firstUncraftableIdx).every((it) => !it.status.craftable),
    "No craftable recipe should appear after an uncraftable recipe"
  );

  // Group by station -> Hand Crafting + Crafting Station
  const byStation = buildRecipeGroups(CHAPTER_1_RECIPES, inv, true, {
    filter: "all",
    groupBy: "station",
    sortBy: "craftable",
  });
  assert.deepEqual(
    byStation.map((g) => g.id),
    ["hand", "crafting_station"]
  );

  // Filter craftable only -> every returned recipe is craftable
  const craftableOnly = buildRecipeGroups(CHAPTER_1_RECIPES, inv, true, {
    filter: "craftable",
    groupBy: "category",
    sortBy: "name",
  });
  const allReturned = craftableOnly.flatMap((g) => g.items);
  assert.ok(allReturned.length > 0);
  assert.ok(allReturned.every((it) => it.status.craftable));
  assert.ok(allReturned.some((it) => it.recipe.id === "recipe:wooden_pickaxe"));
});
