import test from "node:test";
import assert from "node:assert/strict";

import { GameEngine } from "../src/core/engine.ts";
import { countItem, addItem } from "../src/inventory/inventory.ts";
import { strikeWall } from "../src/mechanics/wall-punching.ts";
import { DeterministicRNG } from "../src/core/math.ts";
import { getItemDefinition, getBlockDefinition } from "../src/registry/definitions.ts";

test("Checkpoint 1.2: Data-driven registries define properties for items and blocks", () => {
  const dirtItem = getItemDefinition("minecraft:dirt");
  assert.ok(dirtItem);
  assert.equal(dirtItem.placeable, true);
  assert.equal(dirtItem.placesTileId, "minecraft:dirt");
  assert.equal(dirtItem.maxStackSize, 64);
  assert.ok(dirtItem.textureDataUrl);

  const dirtDust = getItemDefinition("contenttweaker:dirtdust");
  assert.ok(dirtDust);
  assert.notEqual(dirtDust.placeable, true);

  const dirtBlock = getBlockDefinition("minecraft:dirt");
  assert.ok(dirtBlock);
  assert.equal(dirtBlock.breakable, true);
  assert.equal(dirtBlock.tillable, true);
  assert.equal(dirtBlock.tilledTileId, "minecraft:farmland");
  assert.deepEqual(dirtBlock.drops, [{ itemId: "minecraft:dirt", count: 1 }]);

  const farmlandBlock = getBlockDefinition("minecraft:farmland");
  assert.ok(farmlandBlock);
  assert.equal(farmlandBlock.type, "farmland");
  assert.equal(farmlandBlock.breakable, true);
  assert.equal(farmlandBlock.tillable, false);

  const wallBlock = getBlockDefinition("compactmachines3:wall");
  assert.ok(wallBlock);
  assert.equal(wallBlock.breakable, false);
});

test("Checkpoint 1.2: End-to-end player loop: Punch wall -> Craft dirt -> Place dirt -> Break dirt", () => {
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

  // Move North to (1, 0, 1) so slot 8 targets y = -1 (the NORTH solid perimeter wall)
  engine.enqueueInput({
    tick: engine.currentTick + 1,
    playerId: 0,
    action: { type: "MOVE", dx: 0, dy: -1 },
  });
  engine.stepTick();
  assert.equal(player.y, 0);

  // Unequip item to punch with bare fists
  player.selectedQuickSlotIndex = 8;
  player.equippedItem = undefined;

  // Punch North boundary wall (slot 8 targets {x: 1, y: -1, z: 1})
  for (let i = 0; i < 10; i++) {
    engine.enqueueInput({
      tick: engine.currentTick + 1,
      playerId: 0,
      action: { type: "INTERACT_TILE", slot: 8, button: "PRIMARY" },
    });
    engine.stepTick();
  }

  // Verify health dropped and dust was collected
  assert.ok(player.health < 20);
  const dirtDustCount = countItem(player.inventory, "contenttweaker:dirtdust");
  const gravelDustCount = countItem(player.inventory, "contenttweaker:graveldust");
  assert.ok(dirtDustCount + gravelDustCount > 0);

  // Give 4 dirt dust to guarantee craft
  addItem(player.inventory, "contenttweaker:dirtdust", 4);
  const beforeDirt = countItem(player.inventory, "minecraft:dirt");

  // Craft dirt block
  engine.enqueueInput({
    tick: engine.currentTick + 1,
    playerId: 0,
    action: { type: "CRAFT_RECIPE", recipeId: "recipe:dirt", count: 1 },
  });
  engine.stepTick();
  assert.equal(countItem(player.inventory, "minecraft:dirt"), beforeDirt + 1);

  // Equip dirt in hotbar slot 0
  player.selectedQuickSlotIndex = 0;
  // Move dirt to slot 0 if not already
  addItem(player.inventory, "minecraft:dirt", 1);
  player.equippedItem = "minecraft:dirt";

  const room = engine.rooms.get("room_tiny_1")!;
  // Player is at (1, 0, 1). Slot 6 on layer 1 is (2, 0, 1), which is air.
  assert.equal(room.voxels[1][0][2].id, "minecraft:air");

  // Place dirt block on slot 6 (East: {x: 2, y: 0, z: 1}) with SECONDARY click
  const dirtCountBeforePlace = countItem(player.inventory, "minecraft:dirt");
  engine.enqueueInput({
    tick: engine.currentTick + 1,
    playerId: 0,
    action: { type: "INTERACT_TILE", slot: 6, button: "SECONDARY" },
  });
  engine.stepTick();

  // Placed dirt tile exists
  assert.equal(room.voxels[1][0][2].id, "minecraft:dirt");
  assert.equal(room.voxels[1][0][2].passable, false);
  assert.equal(countItem(player.inventory, "minecraft:dirt"), dirtCountBeforePlace - 1);

  // Break placed dirt block with PRIMARY click
  engine.enqueueInput({
    tick: engine.currentTick + 1,
    playerId: 0,
    action: { type: "INTERACT_TILE", slot: 6, button: "PRIMARY" },
  });
  engine.stepTick();

  // Voxel is back to air
  assert.equal(room.voxels[1][0][2].id, "minecraft:air");
  assert.equal(room.voxels[1][0][2].passable, true);
  // Dirt block returned to player inventory
  assert.equal(countItem(player.inventory, "minecraft:dirt"), dirtCountBeforePlace);
});

test("Checkpoint 1.2: Right click (SECONDARY) dirt block to till into farmland", () => {
  const engine = new GameEngine(1337);
  const player = engine.players.get(0)!;

  // Move player into Tiny Compact Machine
  engine.enqueueInput({
    tick: 1,
    playerId: 0,
    action: { type: "USE_PSD" },
  });
  engine.stepTick();

  const room = engine.rooms.get("room_tiny_1")!;
  // Equip dirt block and place at (2, 1, 1) [slot 6]
  addItem(player.inventory, "minecraft:dirt", 1);
  player.selectedQuickSlotIndex = 1;
  player.equippedItem = "minecraft:dirt";

  engine.enqueueInput({
    tick: engine.currentTick + 1,
    playerId: 0,
    action: { type: "INTERACT_TILE", slot: 6, button: "SECONDARY" },
  });
  engine.stepTick();
  assert.equal(room.voxels[1][1][2].id, "minecraft:dirt");

  // Now right click (SECONDARY) the placed dirt block to till it
  engine.enqueueInput({
    tick: engine.currentTick + 1,
    playerId: 0,
    action: { type: "INTERACT_TILE", slot: 6, button: "SECONDARY" },
  });
  engine.stepTick();

  // Verified it transformed into minecraft:farmland
  assert.equal(room.voxels[1][1][2].id, "minecraft:farmland");
  assert.equal(room.voxels[1][1][2].type, "farmland");

  // Breaking farmland drops dirt block
  const dirtCountBeforeBreak = countItem(player.inventory, "minecraft:dirt");
  engine.enqueueInput({
    tick: engine.currentTick + 1,
    playerId: 0,
    action: { type: "INTERACT_TILE", slot: 6, button: "PRIMARY" },
  });
  engine.stepTick();

  assert.equal(room.voxels[1][1][2].id, "minecraft:air");
  assert.equal(countItem(player.inventory, "minecraft:dirt"), dirtCountBeforeBreak + 1);
});
