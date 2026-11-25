import test from "node:test";
import assert from "node:assert/strict";

import { GameEngine } from "../src/core/engine.ts";
import { addItem, countItem } from "../src/inventory/inventory.ts";
import { getCrucibleState } from "../src/mechanics/fluids.ts";
import { getBarrelState } from "../src/mechanics/fluids.ts";
import { getSieveState } from "../src/mechanics/sieve.ts";
import { getAvailableVoxelActions } from "../src/mechanics/voxel-actions.ts";
import { StubRenderer, type CanvasContext2DLike } from "../src/render/renderer.ts";
import { createTinyCompactMachineRoom } from "../src/world/room.ts";
import { hasItemTrait, getItemDefinition, getItemTraits } from "../src/registry/definitions.ts";
import { getBlockComponent } from "../src/registry/block-components.ts";
import { getTraitDefinition } from "../src/registry/traits.ts";
import { SIEVE_LOOT_TABLES, isSieveSubstrate } from "../src/mechanics/sieve.ts";
import { canPlant, plantCrop } from "../src/mechanics/farming.ts";
import { getFurnaceState } from "../src/mechanics/furnace.ts";
import { CHAPTER_1_RECIPES, buildRecipeGroups } from "../src/crafting/list-crafting.ts";

function setupTinyRoomEngine(seed: number = 1337): { engine: GameEngine; playerId: number } {
  const engine = new GameEngine(seed);
  engine.enqueueInput({ tick: 1, playerId: 0, action: { type: "USE_PSD" } });
  engine.stepTick();
  return { engine, playerId: 0 };
}

test("Crucible: melts foliage cuttings into 1000 mB water and fills an empty bucket", () => {
  const { engine } = setupTinyRoomEngine();
  const player = engine.players.get(0)!;
  const room = engine.rooms.get(player.currentRoomId)!;

  addItem(player.inventory, "exnihilocreatio:block_crucible_wood", 1);
  addItem(player.inventory, "arcadialbonsaitrees:bonsai_oak_cutting", 4);
  addItem(player.inventory, "minecraft:bucket", 1);

  // Place crucible at slot 6 (2, 1, 1)
  player.selectedQuickSlotIndex = 1;
  player.equippedItem = "exnihilocreatio:block_crucible_wood";
  engine.enqueueInput({
    tick: engine.currentTick + 1,
    playerId: 0,
    action: { type: "INTERACT_TILE", slot: 6, button: "SECONDARY" },
  });
  engine.stepTick();

  const crucibleTile = room.voxels[1][1][2];
  assert.equal(crucibleTile.id, "exnihilocreatio:block_crucible_wood");

  // Insert 4x oak cuttings (250 mB each = 1000 mB solid buffer)
  player.selectedQuickSlotIndex = 2;
  player.equippedItem = "arcadialbonsaitrees:bonsai_oak_cutting";
  for (let i = 0; i < 4; i++) {
    engine.enqueueInput({
      tick: engine.currentTick + 1,
      playerId: 0,
      action: { type: "INTERACT_TILE", slot: 6, button: "SECONDARY" },
    });
    engine.stepTick();
  }
  assert.equal(countItem(player.inventory, "arcadialbonsaitrees:bonsai_oak_cutting"), 0);

  // Tick 400 ticks to melt all 1000 mB into water
  for (let t = 0; t < 400; t++) {
    engine.stepTick();
  }
  const state = getCrucibleState(crucibleTile);
  assert.equal(state.solidAmount, 0);
  assert.equal(state.fluidType, "water");
  assert.equal(state.fluidAmount, 1000);

  // Collect water with empty bucket
  player.selectedQuickSlotIndex = 3;
  player.equippedItem = "minecraft:bucket";
  engine.enqueueInput({
    tick: engine.currentTick + 1,
    playerId: 0,
    action: { type: "INTERACT_TILE", slot: 6, button: "SECONDARY" },
  });
  engine.stepTick();

  assert.equal(countItem(player.inventory, "minecraft:water_bucket"), 1);
  assert.equal(countItem(player.inventory, "minecraft:bucket"), 0);
  assert.equal(getCrucibleState(crucibleTile).fluidAmount, 0);
});

test("Barrel: water + dirt transforms into clay (4x clay_ball) and water + poop -> sewage -> slag", () => {
  const { engine } = setupTinyRoomEngine();
  const player = engine.players.get(0)!;
  const room = engine.rooms.get(player.currentRoomId)!;

  addItem(player.inventory, "exnihilocreatio:block_barrel_wood", 1);
  addItem(player.inventory, "minecraft:water_bucket", 2);
  addItem(player.inventory, "minecraft:dirt", 1);
  addItem(player.inventory, "cropdusting:poop", 1);
  addItem(player.inventory, "exnihilocreatio:block_dust", 1);

  // Place barrel at slot 6 (2, 1, 1)
  player.selectedQuickSlotIndex = 1;
  player.equippedItem = "exnihilocreatio:block_barrel_wood";
  engine.enqueueInput({
    tick: engine.currentTick + 1,
    playerId: 0,
    action: { type: "INTERACT_TILE", slot: 6, button: "SECONDARY" },
  });
  engine.stepTick();

  const barrelTile = room.voxels[1][1][2];
  assert.equal(barrelTile.id, "exnihilocreatio:block_barrel_wood");

  // Fill with water bucket
  player.selectedQuickSlotIndex = 2;
  player.equippedItem = "minecraft:water_bucket";
  engine.enqueueInput({
    tick: engine.currentTick + 1,
    playerId: 0,
    action: { type: "INTERACT_TILE", slot: 6, button: "SECONDARY" },
  });
  engine.stepTick();
  assert.equal(getBarrelState(barrelTile).fluidType, "water");
  assert.equal(getBarrelState(barrelTile).fluidAmount, 1000);
  assert.equal(countItem(player.inventory, "minecraft:bucket"), 1);

  // Insert dirt -> 200 tick reaction into clay
  player.equippedItem = "minecraft:dirt";
  engine.enqueueInput({
    tick: engine.currentTick + 1,
    playerId: 0,
    action: { type: "INTERACT_TILE", slot: 6, button: "SECONDARY" },
  });
  engine.stepTick();
  assert.equal(getBarrelState(barrelTile).solidItem, "minecraft:dirt");

  for (let t = 0; t < 200; t++) {
    engine.stepTick();
  }
  assert.equal(getBarrelState(barrelTile).outputItem, "minecraft:clay");

  // Harvest clay -> 4x clay_ball
  player.equippedItem = undefined;
  engine.enqueueInput({
    tick: engine.currentTick + 1,
    playerId: 0,
    action: { type: "INTERACT_TILE", slot: 6, button: "SECONDARY" },
  });
  engine.stepTick();
  assert.equal(countItem(player.inventory, "minecraft:clay_ball"), 4);

  // Water + poop -> sewage, then sewage + dust -> 2x slag
  player.equippedItem = "minecraft:water_bucket";
  engine.enqueueInput({
    tick: engine.currentTick + 1,
    playerId: 0,
    action: { type: "INTERACT_TILE", slot: 6, button: "SECONDARY" },
  });
  engine.stepTick();

  player.equippedItem = "cropdusting:poop";
  engine.enqueueInput({
    tick: engine.currentTick + 1,
    playerId: 0,
    action: { type: "INTERACT_TILE", slot: 6, button: "SECONDARY" },
  });
  engine.stepTick();
  assert.equal(getBarrelState(barrelTile).fluidType, "sewage");

  player.equippedItem = "exnihilocreatio:block_dust";
  engine.enqueueInput({
    tick: engine.currentTick + 1,
    playerId: 0,
    action: { type: "INTERACT_TILE", slot: 6, button: "SECONDARY" },
  });
  engine.stepTick();
  assert.equal(getBarrelState(barrelTile).outputItem, "thermalfoundation:material:772");

  player.equippedItem = undefined;
  engine.enqueueInput({
    tick: engine.currentTick + 1,
    playerId: 0,
    action: { type: "INTERACT_TILE", slot: 6, button: "SECONDARY" },
  });
  engine.stepTick();
  assert.equal(countItem(player.inventory, "thermalfoundation:material:772"), 2);
});

test("Sieve: installs mesh, sifts gravel over 4 clicks, decrements durability, and rolls drops", () => {
  const { engine } = setupTinyRoomEngine(42);
  const player = engine.players.get(0)!;
  const room = engine.rooms.get(player.currentRoomId)!;

  addItem(player.inventory, "exnihilocreatio:block_sieve", 1);
  addItem(player.inventory, "exnihilocreatio:item_mesh:1", 1);
  addItem(player.inventory, "minecraft:gravel", 1);

  // Place sieve at slot 6 (2, 1, 1)
  player.selectedQuickSlotIndex = 1;
  player.equippedItem = "exnihilocreatio:block_sieve";
  engine.enqueueInput({
    tick: engine.currentTick + 1,
    playerId: 0,
    action: { type: "INTERACT_TILE", slot: 6, button: "SECONDARY" },
  });
  engine.stepTick();

  const sieveTile = room.voxels[1][1][2];
  assert.equal(sieveTile.id, "exnihilocreatio:block_sieve");

  // Install String Mesh
  player.equippedItem = "exnihilocreatio:item_mesh:1";
  engine.enqueueInput({
    tick: engine.currentTick + 1,
    playerId: 0,
    action: { type: "INTERACT_TILE", slot: 6, button: "SECONDARY" },
  });
  engine.stepTick();
  assert.equal(getSieveState(sieveTile).meshId, "exnihilocreatio:item_mesh:1");
  assert.equal(getSieveState(sieveTile).meshDurability, 64);

  // Insert gravel
  player.equippedItem = "minecraft:gravel";
  engine.enqueueInput({
    tick: engine.currentTick + 1,
    playerId: 0,
    action: { type: "INTERACT_TILE", slot: 6, button: "SECONDARY" },
  });
  engine.stepTick();
  assert.equal(getSieveState(sieveTile).substrateId, "minecraft:gravel");
  assert.equal(countItem(player.inventory, "minecraft:gravel"), 0);

  // Sift 4 times (25% -> 100%)
  player.equippedItem = undefined;
  assert.ok(getAvailableVoxelActions(sieveTile, false, player).some((a) => a.label.startsWith("Sift")));

  for (let i = 0; i < 4; i++) {
    engine.enqueueInput({
      tick: engine.currentTick + 1,
      playerId: 0,
      action: { type: "INTERACT_TILE", slot: 6, button: "SECONDARY" },
    });
    engine.stepTick();
  }

  const finalState = getSieveState(sieveTile);
  assert.equal(finalState.substrateId, null);
  assert.equal(finalState.progress, 0);
  assert.equal(finalState.meshDurability, 63);

  // Remove mesh with empty hand (select empty quick slot 8)
  player.selectedQuickSlotIndex = 8;
  player.equippedItem = undefined;
  engine.enqueueInput({
    tick: engine.currentTick + 1,
    playerId: 0,
    action: { type: "INTERACT_TILE", slot: 6, button: "SECONDARY" },
  });
  engine.stepTick();
  assert.equal(getSieveState(sieveTile).meshId, null);
  assert.equal(countItem(player.inventory, "exnihilocreatio:item_mesh:1"), 1);
});

test("StubRenderer renders Wooden Sieve, Wooden Barrel, and Wooden Crucible custom 3D geometry", () => {
  const renderer = new StubRenderer();
  const room = createTinyCompactMachineRoom();

  room.voxels[0][1][0] = {
    id: "exnihilocreatio:block_sieve",
    type: "machine",
    passable: false,
    metadata: { meshId: "exnihilocreatio:item_mesh:1", meshDurability: 64, substrateId: "minecraft:gravel", progress: 50 },
  };
  room.voxels[0][1][1] = {
    id: "exnihilocreatio:block_barrel_wood",
    type: "machine",
    passable: false,
    metadata: { fluidType: "water", fluidAmount: 1000 },
  };
  room.voxels[0][1][2] = {
    id: "exnihilocreatio:block_crucible_wood",
    type: "machine",
    passable: false,
    metadata: { solidAmount: 250, fluidType: "water", fluidAmount: 500 },
  };

  let fillCount = 0;
  let strokeCount = 0;
  const mockCtx: CanvasContext2DLike = {
    save: () => {},
    restore: () => {},
    translate: () => {},
    scale: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    fill: () => {
      fillCount++;
    },
    stroke: () => {
      strokeCount++;
    },
    fillRect: () => {},
    strokeRect: () => {},
    fillText: () => {},
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
  };

  const cmds = renderer.generateRenderCommands(room, [], { enableCutaway: true });
  for (const id of [
    "exnihilocreatio:block_sieve",
    "exnihilocreatio:block_barrel_wood",
    "exnihilocreatio:block_crucible_wood",
  ]) {
    const cmd = cmds.find((c) => c.type === "DRAW_TILE" && c.tile?.id === id);
    assert.ok(cmd, `${id} DRAW_TILE command should exist`);
    renderer.executeCommand(cmd, mockCtx);
  }

  assert.ok(fillCount > 10, "Custom machine models should draw multiple faces and contents");
  assert.ok(strokeCount > 10, "Custom machine models should stroke rims, hoops, and mesh lines");
});

test("Component & Trait system: bonsai items use traits and blocks resolve components without string matching", () => {
  assert.equal(hasItemTrait("arcadialbonsaitrees:bonsai_oak_cutting", "bonsai_cutting"), true);
  assert.equal(hasItemTrait("arcadialbonsaitrees:bonsai_spruce_cutting", "foliage"), true);
  assert.equal(hasItemTrait("arcadialbonsaitrees:bonsai_birch_sapling", "bonsai_sapling"), true);
  assert.equal(hasItemTrait("minecraft:dirt", "bonsai_cutting"), false);

  const sieveComp = getBlockComponent("exnihilocreatio:block_sieve");
  assert.ok(sieveComp?.onInteract && sieveComp?.getActions && sieveComp?.onRender);

  const barrelComp = getBlockComponent("exnihilocreatio:block_barrel_wood");
  assert.ok(barrelComp?.onTick && barrelComp?.onInteract && barrelComp?.onRender);

  const wheatComp = getBlockComponent("minecraft:wheat");
  assert.ok(wheatComp?.onTick && wheatComp?.onInteract && wheatComp?.onBreak && wheatComp?.onRender);
});

test("List Crafting: hiding recipes excludes them from standard filters and shows them under hidden filter", () => {
  const { engine } = setupTinyRoomEngine();
  const player = engine.players.get(0)!;

  const allGroups = buildRecipeGroups(CHAPTER_1_RECIPES, player.inventory, false, {
    filter: "all",
    groupBy: "none",
  });
  const allIds = allGroups.flatMap((g) => g.items.map((i) => i.recipe.id));
  assert.ok(allIds.includes("recipe:dirt"));

  const hidden = new Set(["recipe:dirt"]);
  const visibleGroups = buildRecipeGroups(CHAPTER_1_RECIPES, player.inventory, false, {
    filter: "all",
    groupBy: "none",
    hiddenRecipeIds: hidden,
  });
  const visibleIds = visibleGroups.flatMap((g) => g.items.map((i) => i.recipe.id));
  assert.equal(visibleIds.includes("recipe:dirt"), false);

  const hiddenGroups = buildRecipeGroups(CHAPTER_1_RECIPES, player.inventory, false, {
    filter: "hidden",
    groupBy: "none",
    hiddenRecipeIds: hidden,
  });
  const hiddenIds = hiddenGroups.flatMap((g) => g.items.map((i) => i.recipe.id));
  assert.deepEqual(hiddenIds, ["recipe:dirt"]);
});

test("Furnace: crafts from 8 cobblestone, burns fuel only with input, smelts sand into glass in 200 ticks, and renders", () => {
  const { engine } = setupTinyRoomEngine();
  const player = engine.players.get(0)!;
  const room = engine.rooms.get(player.currentRoomId)!;

  addItem(player.inventory, "craftingstation:crafting_station", 1);
  addItem(player.inventory, "minecraft:cobblestone", 8);
  addItem(player.inventory, "contenttweaker:poopfuel", 1);
  addItem(player.inventory, "minecraft:sand", 1);

  // Craft furnace
  engine.enqueueInput({
    tick: engine.currentTick + 1,
    playerId: 0,
    action: { type: "CRAFT_RECIPE", recipeId: "recipe:furnace" },
  });
  engine.stepTick();
  assert.equal(countItem(player.inventory, "minecraft:furnace"), 1);
  assert.equal(countItem(player.inventory, "minecraft:cobblestone"), 0);

  // Place furnace at slot 6 (2, 1, 1)
  player.equippedItem = "minecraft:furnace";
  engine.enqueueInput({
    tick: engine.currentTick + 1,
    playerId: 0,
    action: { type: "INTERACT_TILE", slot: 6, button: "SECONDARY" },
  });
  engine.stepTick();

  const furnaceTile = room.voxels[1][1][2];
  assert.equal(furnaceTile.id, "minecraft:furnace");

  // Add fuel without input -> should NOT ignite yet
  player.equippedItem = "contenttweaker:poopfuel";
  engine.enqueueInput({
    tick: engine.currentTick + 1,
    playerId: 0,
    action: { type: "INTERACT_TILE", slot: 6, button: "SECONDARY" },
  });
  engine.stepTick();
  for (let t = 0; t < 10; t++) engine.stepTick();
  assert.equal(getFurnaceState(furnaceTile).fuelTimeRemaining, 0);
  assert.equal(getFurnaceState(furnaceTile).fuelCount, 1);

  // Add sand input -> ignites fuel (1600 ticks) and smelts in 200 ticks
  player.equippedItem = "minecraft:sand";
  engine.enqueueInput({
    tick: engine.currentTick + 1,
    playerId: 0,
    action: { type: "INTERACT_TILE", slot: 6, button: "SECONDARY" },
  });
  engine.stepTick();
  for (let t = 0; t < 200; t++) engine.stepTick();

  const afterSmelt = getFurnaceState(furnaceTile);
  assert.equal(afterSmelt.outputItem, "minecraft:glass");
  assert.equal(afterSmelt.outputCount, 1);
  assert.equal(afterSmelt.inputCount, 0);
  assert.ok(afterSmelt.fuelTimeRemaining > 0);

  // Collect output
  player.equippedItem = undefined;
  engine.enqueueInput({
    tick: engine.currentTick + 1,
    playerId: 0,
    action: { type: "INTERACT_TILE", slot: 6, button: "SECONDARY" },
  });
  engine.stepTick();
  assert.equal(countItem(player.inventory, "minecraft:glass"), 1);

  // Verify furnace renders cleanly
  const renderer = new StubRenderer();
  let fills = 0;
  const mockCtx: CanvasContext2DLike = {
    save: () => {},
    restore: () => {},
    translate: () => {},
    scale: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    fill: () => { fills++; },
    stroke: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    fillText: () => {},
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
  };
  const furnaceCmd = renderer
    .generateRenderCommands(room, [], { enableCutaway: true })
    .find((c) => c.type === "DRAW_TILE" && c.tile?.id === "minecraft:furnace");
  assert.ok(furnaceCmd);
  renderer.executeCommand(furnaceCmd, mockCtx);
  assert.ok(fills >= 3);
});

test("Trait definitions resolve item defaults and dirt sieving + multi-block cane/cactus growth", () => {
  // Trait definitions provide defaults (crucibleMeltMb, plantableOn)
  const foliageTrait = getTraitDefinition("foliage");
  assert.equal(foliageTrait?.defaults?.crucibleMeltMb, 250);
  const cuttingDef = getItemDefinition("arcadialbonsaitrees:bonsai_oak_cutting");
  assert.equal(cuttingDef?.crucibleMeltMb, 250);
  assert.ok(getItemTraits("arcadialbonsaitrees:bonsai_oak_cutting").some((t) => t.id === "bonsai_cutting"));

  // Dirt is a sieve substrate and drops cane + cactus seeds
  assert.equal(isSieveSubstrate("minecraft:dirt"), true);
  const dirtDrops = SIEVE_LOOT_TABLES["minecraft:dirt"].map((d) => d.itemId);
  assert.ok(dirtDrops.includes("exnihilocreatio:item_seed_sugarcane"));
  assert.ok(dirtDrops.includes("exnihilocreatio:item_seed_cactus"));

  // Multi-block column growth for Sugar Cane (up to 3 tall) and Cactus
  const { engine } = setupTinyRoomEngine();
  const player = engine.players.get(0)!;
  const room = engine.rooms.get(player.currentRoomId)!;

  // Soil at z=0: dirt at (0,0,0), sand at (2,0,0)
  room.voxels[0][0][0] = { id: "minecraft:dirt", type: "floor", passable: false };
  room.voxels[0][0][2] = { id: "minecraft:sand", type: "floor", passable: false };

  assert.equal(canPlant(room, { x: 0, y: 0, z: 1 }, "exnihilocreatio:item_seed_sugarcane").allowed, true);
  assert.equal(canPlant(room, { x: 2, y: 0, z: 1 }, "exnihilocreatio:item_seed_cactus").allowed, true);

  plantCrop(room, { x: 0, y: 0, z: 1 }, "exnihilocreatio:item_seed_sugarcane");
  plantCrop(room, { x: 2, y: 0, z: 1 }, "exnihilocreatio:item_seed_cactus");

  // Grow both to maturity so they spawn upper segments at z=2
  for (let t = 0; t < 1205; t++) {
    engine.stepTick();
  }
  assert.equal(room.voxels[1][0][0].id, "minecraft:reeds");
  assert.equal(room.voxels[2][0][0].id, "minecraft:reeds_top");
  assert.equal(room.voxels[1][0][2].id, "minecraft:cactus");
  assert.equal(room.voxels[2][0][2].id, "minecraft:cactus_top");

  // Harvest upper segment of sugar cane
  const reedsTopComp = getBlockComponent("minecraft:reeds_top");
  assert.ok(reedsTopComp?.onInteract);
  reedsTopComp.onInteract({
    room,
    coord: { x: 0, y: 0, z: 2 },
    tile: room.voxels[2][0][0],
    player,
  });
  assert.equal(room.voxels[2][0][0].id, "minecraft:air");
  assert.equal(countItem(player.inventory, "minecraft:reeds"), 1);
});
