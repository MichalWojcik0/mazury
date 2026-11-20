import test from "node:test";
import assert from "node:assert/strict";

import { GameEngine } from "../src/core/engine.ts";
import { addItem, countItem } from "../src/inventory/inventory.ts";
import { plantCrop } from "../src/mechanics/farming.ts";

test("GameEngine serialize/deserialize preserves rooms, inventory, quests, crops, and RNG state", () => {
  const engine = new GameEngine(1337);
  const player = engine.players.get(0)!;

  // Enter Tiny Compact Machine and place farmland + bonsai crop
  engine.enqueueInput({ tick: 1, playerId: 0, action: { type: "USE_PSD" } });
  engine.stepTick();

  const room = engine.rooms.get("room_tiny_1")!;
  room.voxels[0][1][2] = { id: "minecraft:farmland", type: "farmland", passable: false };
  plantCrop(room, { x: 2, y: 1, z: 1 }, "arcadialbonsaitrees:bonsai_oak_sapling");
  addItem(player.inventory, "contenttweaker:dirtdust", 7);

  // Advance simulation 25 ticks while sneaking
  engine.enqueueInput({ tick: engine.currentTick + 1, playerId: 0, action: { type: "START_SNEAK" } });
  for (let i = 0; i < 25; i++) {
    engine.stepTick();
  }

  const saved = engine.serialize();
  const nextRngFromOriginal = engine.rng.next();

  // Restore into a brand-new engine instance
  const restored = new GameEngine(9999);
  assert.equal(restored.deserialize(saved), true);

  assert.equal(restored.currentTick, saved.currentTick);
  assert.equal(restored.rng.next(), nextRngFromOriginal, "RNG state should be restored deterministically");

  const restoredPlayer = restored.players.get(0)!;
  assert.equal(restoredPlayer.currentRoomId, "room_tiny_1");
  assert.equal(restoredPlayer.isSneaking, false, "Player should not load stuck in sneak state");
  assert.equal(countItem(restoredPlayer.inventory, "contenttweaker:dirtdust"), 7);

  const restoredRoom = restored.rooms.get("room_tiny_1")!;
  assert.equal(restoredRoom.voxels[0][1][2].id, "minecraft:farmland");
  assert.equal(restoredRoom.voxels[1][1][2].id, "arcadialbonsaitrees:bonsai_oak_sapling");
  assert.ok((restoredRoom.voxels[1][1][2].metadata?.growthTicks as number) > 0);
  assert.deepEqual(restored.questTracker.getCompletedQuestIds(), engine.questTracker.getCompletedQuestIds());

  // Reset restores fresh initial world
  restored.reset();
  assert.equal(restored.currentTick, 0);
  assert.equal(restored.players.get(0)!.currentRoomId, "outer_room");
  assert.equal(countItem(restored.players.get(0)!.inventory, "contenttweaker:dirtdust"), 0);
});
