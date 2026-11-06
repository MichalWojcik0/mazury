import test from "node:test";
import assert from "node:assert/strict";

import { GameEngine } from "../src/core/engine.ts";
import { countItem, addItem } from "../src/inventory/inventory.ts";
import { strikeWall } from "../src/mechanics/wall-punching.ts";
import { DeterministicRNG } from "../src/core/math.ts";
import { CHAPTER_1_RECIPES, canCraft, executeCraft } from "../src/crafting/list-crafting.ts";

test("Wall punching loot table produces dirt dust (70%), gravel dust (20%), or miss (10%)", () => {
  const solidWallTile = {
    id: "compactmachines3:wall",
    type: "solid_wall" as const,
    passable: false,
  };

  const player = {
    id: 0 as const,
    name: "Tester",
    health: 20,
    hunger: 20,
    exhaustion: 0,
    isSneaking: false,
    sneakTimer: 0,
    currentRoomId: "room_tiny_1",
    x: 1,
    y: 1,
    z: 1,
    height: 2 as const,
    selectedLayerIndex: 1 as const,
    inventory: [],
    equippedItem: undefined,
  };

  // Mock deterministic rolls
  // roll < 0.70 -> dirtdust
  const rngDirt = { next: () => 0.69, nextInt: () => 0 };
  const resDirt = strikeWall(player, solidWallTile, rngDirt as DeterministicRNG);
  assert.equal(resDirt.success, true);
  assert.equal(resDirt.damageTaken, 1);
  assert.equal(resDirt.exhaustionAdded, 0.6);
  assert.equal(resDirt.drops.length, 1);
  assert.equal(resDirt.drops[0].id, "contenttweaker:dirtdust");

  // 0.70 <= roll < 0.90 -> graveldust
  const rngGravel = { next: () => 0.75, nextInt: () => 0 };
  const resGravel = strikeWall(player, solidWallTile, rngGravel as DeterministicRNG);
  assert.equal(resGravel.success, true);
  assert.equal(resGravel.damageTaken, 1);
  assert.equal(resGravel.exhaustionAdded, 0.6);
  assert.equal(resGravel.drops.length, 1);
  assert.equal(resGravel.drops[0].id, "contenttweaker:graveldust");

  // roll >= 0.90 -> miss
  const rngMiss = { next: () => 0.95, nextInt: () => 0 };
  const resMiss = strikeWall(player, solidWallTile, rngMiss as DeterministicRNG);
  assert.equal(resMiss.success, true);
  assert.equal(resMiss.damageTaken, 1);
  assert.equal(resMiss.exhaustionAdded, 0.6);
  assert.equal(resMiss.drops.length, 0);
});

test("Wall punching safety guard prevents player from taking self-harm at <= 1 HP", () => {
  const solidWallTile = {
    id: "compactmachines3:wall",
    type: "solid_wall" as const,
    passable: false,
  };

  const lowHpPlayer = {
    id: 0 as const,
    name: "Tester",
    health: 1, // Minimum safety HP threshold
    hunger: 20,
    exhaustion: 0,
    isSneaking: false,
    sneakTimer: 0,
    currentRoomId: "room_tiny_1",
    x: 1,
    y: 1,
    z: 1,
    height: 2 as const,
    selectedLayerIndex: 1 as const,
    inventory: [],
    equippedItem: undefined,
  };

  const rng = new DeterministicRNG(1234);
  const result = strikeWall(lowHpPlayer, solidWallTile, rng);
  assert.equal(result.success, false);
  assert.equal(result.damageTaken, 0);
  assert.equal(result.drops.length, 0);
  assert.match(result.reason ?? "", /bruised up/);
});

test("Crafting dirt block from 4x dirt dust in inventory", () => {
  const engine = new GameEngine(1337);
  const player = engine.players.get(0)!;

  // Add 4 dirt dust
  addItem(player.inventory, "contenttweaker:dirtdust", 4);
  assert.equal(countItem(player.inventory, "contenttweaker:dirtdust"), 4);
  assert.equal(countItem(player.inventory, "minecraft:dirt"), 0);

  // Craft recipe:dirt
  engine.enqueueInput({
    tick: 1,
    playerId: 0,
    action: { type: "CRAFT_RECIPE", recipeId: "recipe:dirt", count: 1 },
  });
  engine.stepTick();

  assert.equal(countItem(player.inventory, "contenttweaker:dirtdust"), 0);
  assert.equal(countItem(player.inventory, "minecraft:dirt"), 1);
});

test("Placing dirt block in world consumes item and creates solid floor tile", () => {
  const engine = new GameEngine(1337);
  const player = engine.players.get(0)!;

  // Move player into Tiny Compact Machine
  engine.enqueueInput({
    tick: 1,
    playerId: 0,
    action: { type: "USE_PSD" },
  });
  engine.stepTick();
  assert.equal(player.currentRoomId, "room_tiny_1");

  // Player stands at (1, 1, 1). Selected layer is 1 (feet, relative z = 0).
  // Target slot 8 is (1, 0, 1), which is currently empty air in room_tiny_1.
  const room = engine.rooms.get("room_tiny_1")!;
  assert.equal(room.voxels[1][0][1].id, "minecraft:air");

  // Give player 2 dirt blocks and select dirt in hotbar
  addItem(player.inventory, "minecraft:dirt", 2);
  // Put dirt in quick slot 1 (index 1) and select it
  player.selectedQuickSlotIndex = 1;
  player.equippedItem = "minecraft:dirt";

  // Try placing dirt on slot 8 with SECONDARY click
  engine.enqueueInput({
    tick: 2,
    playerId: 0,
    action: { type: "INTERACT_TILE", slot: 8, button: "SECONDARY" },
  });
  engine.stepTick();

  // Verify dirt block is now placed in voxel grid
  assert.equal(room.voxels[1][0][1].id, "minecraft:dirt");
  assert.equal(room.voxels[1][0][1].passable, false);
  // Verify 1 dirt consumed
  assert.equal(countItem(player.inventory, "minecraft:dirt"), 1);

  // Player cannot walk into newly placed solid dirt block
  const originalX = player.x;
  const originalY = player.y;
  engine.enqueueInput({
    tick: 3,
    playerId: 0,
    action: { type: "MOVE", dx: 0, dy: -1 }, // Try walking North into dirt at (1, 0)
  });
  engine.stepTick();
  assert.equal(player.x, originalX);
  assert.equal(player.y, originalY);

  // Cannot place block inside player's own position (slot 5 on layer 1 is blocked by resolveTargetCoord)
  // Or trying to place on occupied solid tile (1, 0, 1) again does not consume dirt
  engine.enqueueInput({
    tick: 4,
    playerId: 0,
    action: { type: "INTERACT_TILE", slot: 8, button: "SECONDARY" },
  });
  engine.stepTick();
  assert.equal(countItem(player.inventory, "minecraft:dirt"), 1);
});
