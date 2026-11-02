import test from "node:test";
import assert from "node:assert/strict";

import { GameEngine } from "../src/core/engine.ts";
import { resolveTargetCoord } from "../src/world/room.ts";
import { strikeWall } from "../src/mechanics/wall-punching.ts";
import { updateSneak, SNEAK_POOP_THRESHOLD_TICKS } from "../src/mechanics/sneak-poop.ts";
import { CHAPTER_1_RECIPES, canCraft, executeCraft } from "../src/crafting/list-crafting.ts";
import { QuestTracker } from "../src/quests/quest-manager.ts";
import { DeterministicRNG } from "../src/core/math.ts";

test("Outer Room geometry and PSD shrinking transition into 3x3 Compact Machine", () => {
  const engine = new GameEngine(42);
  const player = engine.players.get(0)!;

  assert.equal(player.currentRoomId, "outer_room");
  assert.equal(player.inventory.get("compactmachines3:psd"), 1);

  // Transition into tiny room via PSD
  engine.enqueueInput({
    tick: 1,
    playerId: 0,
    action: { type: "USE_PSD" },
  });

  engine.stepTick();

  assert.equal(player.currentRoomId, "room_tiny_1");
  assert.equal(player.x, 1);
  assert.equal(player.y, 1);
  assert.equal(player.z, 1);
});

test("Two-Stage Selection Model resolves correct 3D target coordinates", () => {
  const engine = new GameEngine(42);
  const player = engine.players.get(0)!;
  player.x = 2;
  player.y = 2;
  player.z = 1;

  // Layer 1 (Lower body / feet, relative z = 0)
  player.selectedLayerIndex = 1;
  const northCoord = resolveTargetCoord(player, 8); // North (0, -1)
  assert.deepEqual(northCoord, { x: 2, y: 1, z: 1 });

  // Self slot (5) on layer 1 should be blocked (player body)
  const selfCoord = resolveTargetCoord(player, 5);
  assert.equal(selfCoord, null);

  // Layer 0 (Floor under feet, relative z = -1)
  player.selectedLayerIndex = 0;
  const floorCenter = resolveTargetCoord(player, 5);
  assert.deepEqual(floorCenter, { x: 2, y: 2, z: 0 });

  // Layer 3 (Ceiling above head, relative z = +2)
  player.selectedLayerIndex = 3;
  const ceilingCenter = resolveTargetCoord(player, 5);
  assert.deepEqual(ceilingCenter, { x: 2, y: 2, z: 3 });
});

test("Wall punching mechanics: bare hands cause damage and drop dirt dust", () => {
  const engine = new GameEngine(1234);
  const player = engine.players.get(0)!;
  const rng = new DeterministicRNG(999);

  const solidWallTile = {
    id: "compactmachines3:wall",
    type: "solid_wall" as const,
    passable: false,
  };

  // Fist punch
  const result = strikeWall(player, solidWallTile, rng);
  assert.equal(result.success, true);
  assert.equal(result.damageTaken, 1);
  assert.equal(result.drops[0].id, "contenttweaker:dirtdust");

  // Punch boundary wall in Tiny Compact Machine via INTERACT_TILE
  const tinyRoom = engine.rooms.get("room_tiny_1")!;
  player.currentRoomId = tinyRoom.id;
  player.x = 1;
  player.y = 1;
  player.z = 1;
  player.selectedLayerIndex = 1;

  // Player moves North to y = 0 to stand next to the North wall boundary
  player.y = 0;
  player.equippedItem = undefined;
  const initialInvDust = player.inventory.get("contenttweaker:dirtdust") ?? 0;
  // Punch North boundary wall (slot 8 -> y = -1, North boundary face)
  engine.enqueueInput({
    tick: 1,
    playerId: 0,
    action: { type: "INTERACT_TILE", slot: 8, button: "PRIMARY" },
  });
  engine.stepTick();
  assert.equal(player.inventory.get("contenttweaker:dirtdust"), initialInvDust + 1);

  // Wooden pickaxe punch
  player.equippedItem = "minecraft:wooden_pickaxe";
  const pickResult = strikeWall(player, solidWallTile, rng);
  assert.equal(pickResult.success, true);
  assert.equal(pickResult.damageTaken, 0);
  assert.equal(pickResult.drops[0].id, "exnihilocreatio:item_pebble:0");

  // Stone pickaxe punch
  player.equippedItem = "minecraft:stone_pickaxe";
  const stonePickResult = strikeWall(player, solidWallTile, rng);
  assert.equal(stonePickResult.success, true);
  assert.equal(stonePickResult.damageTaken, 0);
  assert.equal(stonePickResult.drops[0].id, "exnihilocreatio:item_ore_iron:0");
});

test("Sneak mechanic produces poop after 100 ticks (5 seconds at 20 Hz)", () => {
  const engine = new GameEngine(42);
  const player = engine.players.get(0)!;

  player.isSneaking = true;
  for (let i = 0; i < SNEAK_POOP_THRESHOLD_TICKS - 1; i++) {
    const res = updateSneak(player);
    assert.equal(res.poopProduced, false);
  }

  // 100th tick produces poop
  const finalRes = updateSneak(player);
  assert.equal(finalRes.poopProduced, true);
  assert.equal(finalRes.drop?.id, "cropdusting:poop");
});

test("List Crafting: Crafts items without 2x2/3x3 spatial grid", () => {
  const inv = new Map<string, number>();
  inv.set("contenttweaker:dirtdust", 8);

  const dirtRecipe = CHAPTER_1_RECIPES.find((r) => r.id === "recipe:dirt")!;
  assert.equal(canCraft(dirtRecipe, inv, false), true);

  // Craft 1 Dirt
  const success = executeCraft(dirtRecipe, inv, false);
  assert.equal(success, true);
  assert.equal(inv.get("minecraft:dirt"), 1);
  assert.equal(inv.get("contenttweaker:dirtdust"), 4);

  // Crafting station requirement
  const pickaxeRecipe = CHAPTER_1_RECIPES.find((r) => r.id === "recipe:wooden_pickaxe")!;
  inv.set("minecraft:planks", 3);
  inv.set("minecraft:stick", 2);

  // Without station: fails
  assert.equal(canCraft(pickaxeRecipe, inv, false), false);

  // With station: succeeds
  assert.equal(canCraft(pickaxeRecipe, inv, true), true);
  executeCraft(pickaxeRecipe, inv, true);
  assert.equal(inv.get("minecraft:wooden_pickaxe"), 1);
  assert.equal(inv.get("minecraft:planks"), undefined);
  assert.equal(inv.get("minecraft:stick"), undefined);
});

test("Quest progression tracks Chapter 1 milestones", () => {
  const tracker = new QuestTracker();
  const inv = new Map<string, number>();

  // Spawn with PSD completes #142 and unlocks #68
  inv.set("compactmachines3:psd", 1);
  const q1 = tracker.evaluateQuests(inv);
  assert.deepEqual(q1, [142]);

  // Entering machine triggers event and completes #68
  tracker.triggerEvent("ENTERED_MACHINE");
  const q2 = tracker.evaluateQuests(inv);
  assert.deepEqual(q2, [68]);

  // Collecting 4 Dirt Dust completes #13
  inv.set("contenttweaker:dirtdust", 4);
  const q3 = tracker.evaluateQuests(inv);
  assert.deepEqual(q3, [13]);

  // Crafting Dirt completes #20
  inv.set("minecraft:dirt", 1);
  const q4 = tracker.evaluateQuests(inv);
  assert.deepEqual(q4, [20]);
});
