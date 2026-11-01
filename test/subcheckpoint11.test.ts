import test from "node:test";
import assert from "node:assert/strict";

import { GameEngine } from "../src/core/engine.ts";
import { StubRenderer } from "../src/render/renderer.ts";

test("Subcheckpoint 1.1: Walk from spawn (0, 0) to machine (1, 0) in Outer Room", () => {
  const engine = new GameEngine(1337);
  const player = engine.players.get(0)!;

  assert.equal(player.currentRoomId, "outer_room");
  assert.equal(player.x, 0);
  assert.equal(player.y, 0);
  assert.equal(player.z, 1);

  // Attempt to walk out of bounds (-X)
  engine.enqueueInput({
    tick: 1,
    playerId: 0,
    action: { type: "MOVE", dx: -1, dy: 0 },
  });
  engine.stepTick();
  assert.equal(player.x, 0); // Position unchanged

  // Walk East (+X) onto the embedded machine column
  engine.enqueueInput({
    tick: 2,
    playerId: 0,
    action: { type: "MOVE", dx: 1, dy: 0 },
  });
  engine.stepTick();
  assert.equal(player.x, 1);
  assert.equal(player.y, 0);
  assert.equal(player.z, 1);
});

test("Subcheckpoint 1.1: Personal Shrinking Device transitions into Tiny Compact Machine and back", () => {
  const engine = new GameEngine(1337);
  const player = engine.players.get(0)!;

  // Move to machine block
  engine.enqueueInput({
    tick: 1,
    playerId: 0,
    action: { type: "MOVE", dx: 1, dy: 0 },
  });
  engine.stepTick();
  assert.equal(player.x, 1);

  // Activate PSD to shrink into tiny compact machine
  engine.enqueueInput({
    tick: 2,
    playerId: 0,
    action: { type: "USE_PSD" },
  });
  engine.stepTick();

  assert.equal(player.currentRoomId, "room_tiny_1");
  assert.equal(player.x, 2);
  assert.equal(player.y, 2);
  assert.equal(player.z, 1);

  // Walk around inside tiny compact machine (North, South, East, West)
  // Walk North (dy = -1) -> (2, 1, 1)
  engine.enqueueInput({
    tick: 3,
    playerId: 0,
    action: { type: "MOVE", dx: 0, dy: -1 },
  });
  engine.stepTick();
  assert.equal(player.x, 2);
  assert.equal(player.y, 1);

  // Try walking into solid perimeter wall at y=0
  engine.enqueueInput({
    tick: 4,
    playerId: 0,
    action: { type: "MOVE", dx: 0, dy: -1 },
  });
  engine.stepTick();
  assert.equal(player.x, 2);
  assert.equal(player.y, 1); // Blocked by compactmachines3:wall

  // Activate PSD inside room_tiny_1 to exit back to outer room
  engine.enqueueInput({
    tick: 5,
    playerId: 0,
    action: { type: "USE_PSD" },
  });
  engine.stepTick();

  assert.equal(player.currentRoomId, "outer_room");
  assert.equal(player.x, 1);
  assert.equal(player.y, 0);
  assert.equal(player.z, 1);
});

test("Subcheckpoint 1.1: Renderer camera centering and cutaway generation", () => {
  const renderer = new StubRenderer();
  const engine = new GameEngine(1337);
  const player = engine.players.get(0)!;
  const outerRoom = engine.rooms.get("outer_room")!;
  const tinyRoom = engine.rooms.get("room_tiny_1")!;

  // Center camera on outer room
  renderer.centerOnRoom(outerRoom, 800, 600);
  assert.ok(typeof renderer.camera.offsetX === "number");
  assert.ok(typeof renderer.camera.offsetY === "number");

  // Cutaway option reduces render commands for enclosed tiny room
  const fullCommands = renderer.generateRenderCommands(tinyRoom, [player], { enableCutaway: false });
  const cutawayCommands = renderer.generateRenderCommands(tinyRoom, [player], { enableCutaway: true });

  assert.ok(cutawayCommands.length < fullCommands.length, "Cutaway should reduce occluding wall commands");
});
