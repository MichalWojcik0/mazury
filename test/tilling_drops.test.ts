import test from "node:test";
import assert from "node:assert/strict";

import { GameEngine } from "../src/core/engine.ts";
import { countItem, addItem } from "../src/inventory/inventory.ts";
import { getItemDefinition, getBlockDefinition } from "../src/registry/definitions.ts";
import { TEXTURE_MAP } from "../src/render/textures.ts";

test("Tilling dirt: item registry has all bonsai saplings, cuttings, seeds, and original textures", () => {
  const saplingIds = [
    "arcadialbonsaitrees:bonsai_oak_sapling",
    "arcadialbonsaitrees:bonsai_spruce_sapling",
    "arcadialbonsaitrees:bonsai_birch_sapling",
    "arcadialbonsaitrees:bonsai_jungle_sapling",
    "arcadialbonsaitrees:bonsai_acacia_sapling",
    "arcadialbonsaitrees:bonsai_darkoak_sapling",
  ];

  for (const id of saplingIds) {
    const itemDef = getItemDefinition(id);
    assert.ok(itemDef, `Item ${id} should exist in registry`);
    assert.equal(itemDef.placeable, true);
    assert.equal(itemDef.placesTileId, id);
    assert.ok(itemDef.textureDataUrl?.startsWith("data:image/png;base64,"), `${id} should have valid base64 PNG`);
    assert.ok(TEXTURE_MAP[id], `${id} should be present in TEXTURE_MAP`);

    const blockDef = getBlockDefinition(id);
    assert.ok(blockDef, `Block ${id} should exist in registry`);
    assert.equal(blockDef.breakable, true);
    assert.equal(blockDef.passable, true);
  }

  // Cutting & Seeds
  const woodTypes = ["oak", "spruce", "birch", "jungle", "acacia", "darkoak"];
  for (const wood of woodTypes) {
    const cuttingDef = getItemDefinition(`arcadialbonsaitrees:bonsai_${wood}_cutting`);
    assert.ok(cuttingDef, `Cutting for ${wood} should exist in registry`);
    assert.ok(cuttingDef?.textureDataUrl?.startsWith("data:image/png;base64,"));
    assert.ok(TEXTURE_MAP[`arcadialbonsaitrees:bonsai_${wood}_cutting`]);
  }

  const wheatSeedsDef = getItemDefinition("minecraft:wheat_seeds");
  assert.ok(wheatSeedsDef?.textureDataUrl?.startsWith("data:image/png;base64,"));

  const hempSeedsDef = getItemDefinition("immersiveengineering:seed");
  assert.ok(hempSeedsDef?.textureDataUrl?.startsWith("data:image/png;base64,"));

  // Dirt block definition has tilledDrops
  const dirtBlockDef = getBlockDefinition("minecraft:dirt");
  assert.ok(dirtBlockDef?.tillable);
  assert.equal(dirtBlockDef?.tilledTileId, "minecraft:farmland");
  assert.ok(dirtBlockDef?.tilledDrops && dirtBlockDef.tilledDrops.length > 0);

  const droppedItemIds = dirtBlockDef.tilledDrops.map((d) => d.itemId);
  assert.ok(droppedItemIds.includes("arcadialbonsaitrees:bonsai_oak_sapling"));
  assert.ok(droppedItemIds.includes("minecraft:wheat_seeds"));
  assert.ok(droppedItemIds.includes("immersiveengineering:seed"));
  assert.ok(droppedItemIds.includes("exnihilocreatio:item_pebble:0"));
});

test("Tilling dirt: Secondary interaction transforms dirt into farmland and yields drops", () => {
  // Use a fixed seed
  const engine = new GameEngine(12345);
  const player = engine.players.get(0)!;

  // Move player into Tiny Compact Machine
  engine.enqueueInput({
    tick: 1,
    playerId: 0,
    action: { type: "USE_PSD" },
  });
  engine.stepTick();
  assert.equal(player.currentRoomId, "room_tiny_1");

  const room = engine.rooms.get("room_tiny_1")!;

  // Give dirt block and place at (2, 1, 1) [slot 6]
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

  const exhBefore = player.exhaustion;

  // Now till the placed dirt block with SECONDARY click
  engine.enqueueInput({
    tick: engine.currentTick + 1,
    playerId: 0,
    action: { type: "INTERACT_TILE", slot: 6, button: "SECONDARY" },
  });
  engine.stepTick();

  // Dirt transformed into farmland
  assert.equal(room.voxels[1][1][2].id, "minecraft:farmland");
  assert.equal(room.voxels[1][1][2].type, "farmland");

  // Exhaustion increased by 0.6
  assert.ok(player.exhaustion >= exhBefore + 0.6);

  // Till multiple dirt blocks across a statistical sample to verify drop yields
  let totalOakSaplings = countItem(player.inventory, "arcadialbonsaitrees:bonsai_oak_sapling");
  let totalWheatSeeds = countItem(player.inventory, "minecraft:wheat_seeds");
  let totalHempSeeds = countItem(player.inventory, "immersiveengineering:seed");
  let totalPebbles = countItem(player.inventory, "exnihilocreatio:item_pebble:0");

  for (let i = 0; i < 50; i++) {
    // Replace voxel with dirt
    room.voxels[1][1][2] = {
      id: "minecraft:dirt",
      type: "floor",
      passable: false,
    };
    engine.enqueueInput({
      tick: engine.currentTick + 1,
      playerId: 0,
      action: { type: "INTERACT_TILE", slot: 6, button: "SECONDARY" },
    });
    engine.stepTick();
  }

  totalOakSaplings = countItem(player.inventory, "arcadialbonsaitrees:bonsai_oak_sapling");
  totalWheatSeeds = countItem(player.inventory, "minecraft:wheat_seeds");
  totalHempSeeds = countItem(player.inventory, "immersiveengineering:seed");
  totalPebbles = countItem(player.inventory, "exnihilocreatio:item_pebble:0");

  // Over 50 rolls, we expect oak saplings, wheat seeds, and pebbles to have dropped
  assert.ok(totalOakSaplings > 0, "Should have received at least 1 bonsai oak sapling over 50 tilling actions");
  assert.ok(totalWheatSeeds > 0, "Should have received at least 1 wheat seeds over 50 tilling actions");
  assert.ok(totalPebbles > 0, "Should have received at least 1 pebble over 50 tilling actions");
});
