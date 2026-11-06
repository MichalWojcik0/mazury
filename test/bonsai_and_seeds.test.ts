import test from "node:test";
import assert from "node:assert/strict";

import { GameEngine } from "../src/core/engine.ts";
import { addItem, countItem } from "../src/inventory/inventory.ts";
import {
  canPlant,
  plantCrop,
  isCropTile,
  getGrowthProgress,
  harvestPlant,
} from "../src/mechanics/farming.ts";
import { getAvailableVoxelActions } from "../src/mechanics/voxel-actions.ts";

test("Farming: Planting Bonsai Saplings and Seeds requires valid soil", () => {
  const engine = new GameEngine(1337);
  const player = engine.players.get(0)!;

  // Move inside Tiny Compact Machine
  engine.enqueueInput({
    tick: 1,
    playerId: 0,
    action: { type: "USE_PSD" },
  });
  engine.stepTick();

  const room = engine.rooms.get(player.currentRoomId)!;

  // Planting on bedrock or air without farmland fails
  const plantCheckAir = canPlant(room, { x: 2, y: 1, z: 1 }, "arcadialbonsaitrees:bonsai_oak_sapling");
  assert.equal(plantCheckAir.allowed, false);

  // Prepare farmland at (2, 1, 0)
  room.voxels[0][1][2] = {
    id: "minecraft:farmland",
    type: "farmland",
    passable: false,
  };

  // Planting checks for bonsai saplings and seeds now succeed
  assert.equal(canPlant(room, { x: 2, y: 1, z: 1 }, "arcadialbonsaitrees:bonsai_oak_sapling").allowed, true);
  assert.equal(canPlant(room, { x: 2, y: 1, z: 1 }, "minecraft:wheat_seeds").allowed, true);
  assert.equal(canPlant(room, { x: 2, y: 1, z: 1 }, "immersiveengineering:seed").allowed, true);
});

test("Farming: Planting consumes 1 item and places crop block", () => {
  const engine = new GameEngine(1337);
  const player = engine.players.get(0)!;

  engine.enqueueInput({
    tick: 1,
    playerId: 0,
    action: { type: "USE_PSD" },
  });
  engine.stepTick();

  const room = engine.rooms.get(player.currentRoomId)!;
  room.voxels[0][1][2] = {
    id: "minecraft:farmland",
    type: "farmland",
    passable: false,
  };

  // Give player 2 bonsai saplings
  addItem(player.inventory, "arcadialbonsaitrees:bonsai_oak_sapling", 2);
  player.selectedQuickSlotIndex = 1;
  player.equippedItem = "arcadialbonsaitrees:bonsai_oak_sapling";

  assert.equal(countItem(player.inventory, "arcadialbonsaitrees:bonsai_oak_sapling"), 2);
  engine.enqueueInput({
    tick: engine.currentTick + 1,
    playerId: 0,
    action: { type: "INTERACT_TILE", slot: 6, button: "SECONDARY" },
  });
  engine.stepTick();

  // 1 sapling consumed
  assert.equal(countItem(player.inventory, "arcadialbonsaitrees:bonsai_oak_sapling"), 1);

  // Placed tile is a crop tile
  const cropTile = room.voxels[1][1][2];
  assert.equal(cropTile.id, "arcadialbonsaitrees:bonsai_oak_sapling");
  assert.equal(cropTile.type, "crop");
  assert.equal(isCropTile(cropTile), true);
  // Initial stage is set
  assert.ok((cropTile.metadata?.growthTicks as number) >= 0);
});

test("Farming: Bonsai grows over ticks and accelerates 4x when player sneaks adjacent", () => {
  const engine = new GameEngine(1337);
  const player = engine.players.get(0)!;

  engine.enqueueInput({
    tick: 1,
    playerId: 0,
    action: { type: "USE_PSD" },
  });
  engine.stepTick();

  const room = engine.rooms.get(player.currentRoomId)!;
  room.voxels[0][1][2] = { id: "minecraft:farmland", type: "farmland", passable: false };

  plantCrop(room, { x: 2, y: 1, z: 1 }, "arcadialbonsaitrees:bonsai_oak_sapling");
  const crop = room.voxels[1][1][2];
  crop.metadata = { ...crop.metadata, growthTicks: 0 };

  // Normal growth without sneak: +1 tick per step
  for (let i = 0; i < 50; i++) {
    engine.stepTick();
  }
  assert.equal(crop.metadata?.growthTicks, 50);

  // Sneak acceleration
  engine.enqueueInput({
    tick: engine.currentTick + 1,
    playerId: 0,
    action: { type: "START_SNEAK" },
  });
  engine.stepTick();
  assert.equal(player.isSneaking, true);

  const ticksBefore = crop.metadata?.growthTicks as number;
  for (let i = 0; i < 50; i++) {
    engine.stepTick();
  }
  const ticksAfter = crop.metadata?.growthTicks as number;
  assert.equal(ticksAfter - ticksBefore, 200); // 4x speed
});

test("Farming: Immature bonsai cannot be harvested", () => {
  const engine = new GameEngine(1337);
  const player = engine.players.get(0)!;

  engine.enqueueInput({
    tick: 1,
    playerId: 0,
    action: { type: "USE_PSD" },
  });
  engine.stepTick();

  const room = engine.rooms.get(player.currentRoomId)!;
  room.voxels[0][1][2] = { id: "minecraft:farmland", type: "farmland", passable: false };
  plantCrop(room, { x: 2, y: 1, z: 1 }, "arcadialbonsaitrees:bonsai_oak_sapling");

  const crop = room.voxels[1][1][2];
  crop.metadata = { ...crop.metadata, growthTicks: 400 }; // 400 / 1200 is immature

  const actions = getAvailableVoxelActions(crop, false);
  const harvestAction = actions.find((a) => a.id === "harvest");
  assert.equal(harvestAction, undefined, "Immature plant cannot have a harvest action");

  const harvestRes = harvestPlant(crop);
  assert.equal(harvestRes.success, false);
});

test("Farming: Harvesting mature bonsai autoplants back to stage 0 and drops yields without sapling in inventory", () => {
  const engine = new GameEngine(1337);
  const player = engine.players.get(0)!;

  engine.enqueueInput({
    tick: 1,
    playerId: 0,
    action: { type: "USE_PSD" },
  });
  engine.stepTick();

  const room = engine.rooms.get(player.currentRoomId)!;
  room.voxels[0][1][2] = { id: "minecraft:farmland", type: "farmland", passable: false };
  plantCrop(room, { x: 2, y: 1, z: 1 }, "arcadialbonsaitrees:bonsai_oak_sapling");

  const crop = room.voxels[1][1][2];
  crop.metadata = { ...crop.metadata, growthTicks: 1200 };

  const progress = getGrowthProgress(crop);
  assert.equal(progress.isMature, true);

  const actions = getAvailableVoxelActions(crop, false);
  const harvestAction = actions.find((a) => a.id === "harvest");
  assert.ok(harvestAction, "Mature bonsai has harvest action");

  const saplingsBefore = countItem(player.inventory, "arcadialbonsaitrees:bonsai_oak_sapling");
  const cuttingsBefore = countItem(player.inventory, "arcadialbonsaitrees:bonsai_oak_cutting");

  // Secondary interaction performs harvest
  engine.enqueueInput({
    tick: engine.currentTick + 1,
    playerId: 0,
    action: { type: "INTERACT_TILE", slot: 6, button: "SECONDARY" },
  });
  engine.stepTick();

  // Bonsai tile is still present (not destroyed)
  assert.equal(room.voxels[1][1][2].id, "arcadialbonsaitrees:bonsai_oak_sapling");
  // Growth is reset to stage 0 / initial stage (autoplanted)
  assert.ok((room.voxels[1][1][2].metadata?.growthTicks as number) <= 1);

  // Inventory receives exactly 4 cuttings
  const cuttingsAfter = countItem(player.inventory, "arcadialbonsaitrees:bonsai_oak_cutting");
  assert.equal(cuttingsAfter - cuttingsBefore, 4, "Should have received exactly 4 bonsai oak cuttings");

  // No leaves were dropped
  assert.equal(countItem(player.inventory, "minecraft:leaves"), 0, "No leaves should be dropped");

  // Sapling was autoplanted, so it did NOT reach the player's inventory
  const saplingsAfter = countItem(player.inventory, "arcadialbonsaitrees:bonsai_oak_sapling");
  assert.equal(saplingsAfter, saplingsBefore, "Replanted sapling should not reach inventory");
});

test("Farming: Breaking immature bonsai destroys tile and drops sapling", () => {
  const engine = new GameEngine(1337);
  const player = engine.players.get(0)!;

  engine.enqueueInput({
    tick: 1,
    playerId: 0,
    action: { type: "USE_PSD" },
  });
  engine.stepTick();

  const room = engine.rooms.get(player.currentRoomId)!;
  room.voxels[0][1][2] = { id: "minecraft:farmland", type: "farmland", passable: false };
  plantCrop(room, { x: 2, y: 1, z: 1 }, "arcadialbonsaitrees:bonsai_oak_sapling");

  const crop = room.voxels[1][1][2];
  crop.metadata = { ...crop.metadata, growthTicks: 200 };

  const saplingCountBefore = countItem(player.inventory, "arcadialbonsaitrees:bonsai_oak_sapling");

  // Primary click breaks crop
  engine.enqueueInput({
    tick: engine.currentTick + 1,
    playerId: 0,
    action: { type: "INTERACT_TILE", slot: 6, button: "PRIMARY" },
  });
  engine.stepTick();

  // Tile destroyed to air
  assert.equal(room.voxels[1][1][2].id, "minecraft:air");
  // Sapling recovered in inventory
  assert.equal(countItem(player.inventory, "arcadialbonsaitrees:bonsai_oak_sapling"), saplingCountBefore + 1);
});

test("Farming: Wheat and Industrial Hemp multi-block growth and harvesting", () => {
  const engine = new GameEngine(1337);
  const player = engine.players.get(0)!;

  engine.enqueueInput({
    tick: 1,
    playerId: 0,
    action: { type: "USE_PSD" },
  });
  engine.stepTick();

  const room = engine.rooms.get(player.currentRoomId)!;
  room.voxels[0][1][2] = { id: "minecraft:farmland", type: "farmland", passable: false };

  // Plant wheat
  plantCrop(room, { x: 2, y: 1, z: 1 }, "minecraft:wheat_seeds");
  const wheatCrop = room.voxels[1][1][2];
  wheatCrop.metadata = { ...wheatCrop.metadata, growthTicks: 1200 };

  const wheatBefore = countItem(player.inventory, "minecraft:wheat");
  // Harvest wheat (SECONDARY)
  engine.enqueueInput({
    tick: engine.currentTick + 1,
    playerId: 0,
    action: { type: "INTERACT_TILE", slot: 6, button: "SECONDARY" },
  });
  engine.stepTick();

  // Wheat tile is still present and reset
  assert.equal(room.voxels[1][1][2].id, "minecraft:wheat");
  assert.ok((room.voxels[1][1][2].metadata?.growthTicks as number) <= 1);
  assert.equal(countItem(player.inventory, "minecraft:wheat"), wheatBefore + 1);

  // Now plant hemp at (2, 1, 1) after breaking wheat
  room.voxels[1][1][2] = { id: "minecraft:air", type: "air", passable: true };
  plantCrop(room, { x: 2, y: 1, z: 1 }, "immersiveengineering:seed");
  const hempBase = room.voxels[1][1][2];
  hempBase.metadata = { ...hempBase.metadata, growthTicks: 1200 };

  // Step tick to let hemp grow upper stem to z=2
  engine.stepTick();
  const hempTop = room.voxels[2][1][2];
  assert.ok(hempTop);
  assert.equal(hempTop.id, "immersiveengineering:hemp_top");

  // Select layer 2 (head) to target upper block
  engine.enqueueInput({
    tick: engine.currentTick + 1,
    playerId: 0,
    action: { type: "SELECT_LAYER", layerIndex: 2 },
  });
  engine.stepTick();

  const fiberBefore = countItem(player.inventory, "immersiveengineering:material:4");
  engine.enqueueInput({
    tick: engine.currentTick + 1,
    playerId: 0,
    action: { type: "INTERACT_TILE", slot: 6, button: "PRIMARY" },
  });
  engine.stepTick();

  // Upper block is destroyed
  assert.equal(room.voxels[2][1][2].id, "minecraft:air");
  // Base hemp plant remains intact
  assert.equal(room.voxels[1][1][2].id, "immersiveengineering:hemp");
  // Player received hemp fibers
  const fiberAfter = countItem(player.inventory, "immersiveengineering:material:4");
  assert.ok(fiberAfter > fiberBefore, "Should have received hemp fibers");
});
