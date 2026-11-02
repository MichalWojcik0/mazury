import test from "node:test";
import assert from "node:assert/strict";

import {
  worldToScreen,
  screenToWorld,
  computeDepthKey,
  StubRenderer,
  DEFAULT_CAMERA_CONFIG,
  type CanvasContext2DLike,
} from "../src/render/renderer.ts";
import { createOuterRoom, createTinyCompactMachineRoom } from "../src/world/room.ts";
import type { Player } from "../src/core/types.ts";

test("worldToScreen projects 3D coordinates using dimetric 2:1 formula", () => {
  // Origin (0, 0, 0)
  const p0 = worldToScreen(0, 0, 0);
  assert.equal(p0.u, 0);
  assert.equal(p0.v, 0);

  // Moving along X increases u by +32, v by +16 (for 64x32 tile)
  const px = worldToScreen(1, 0, 0);
  assert.equal(px.u, 32);
  assert.equal(px.v, 16);

  // Moving along Y decreases u by -32, increases v by +16
  const py = worldToScreen(0, 1, 0);
  assert.equal(py.u, -32);
  assert.equal(py.v, 16);

  // Elevation Z offsets vertical axis by -z * elevationHeight (16)
  const pz = worldToScreen(0, 0, 1);
  assert.equal(pz.u, 0);
  assert.equal(pz.v, -16);
});

test("screenToWorld correctly unprojects 2D screen coordinates back to 3D continuous world coordinates", () => {
  const camera = {
    ...DEFAULT_CAMERA_CONFIG,
    offsetX: 100,
    offsetY: 200,
  };

  const testCoords = [
    { x: 0, y: 0, z: 0 },
    { x: 3, y: 2, z: 1 },
    { x: -1, y: 4, z: 2 },
  ];

  for (const { x, y, z } of testCoords) {
    const screen = worldToScreen(x, y, z, camera);
    const world = screenToWorld(screen.u, screen.v, z, camera);
    assert.ok(Math.abs(world.x - x) < 1e-6, `x should match: ${world.x} vs ${x}`);
    assert.ok(Math.abs(world.y - y) < 1e-6, `y should match: ${world.y} vs ${y}`);
  }
});

test("Depth sorting orders tiles back-to-front by DepthKey", () => {
  const k0 = computeDepthKey(0, 0, 0);
  const k1 = computeDepthKey(1, 0, 0);
  const k2 = computeDepthKey(0, 1, 0);
  const k3 = computeDepthKey(1, 1, 0);
  const kZ = computeDepthKey(0, 0, 1);

  // (0,0) is farther than (1,0) and (0,1)
  assert.ok(k0 < k1);
  assert.ok(k0 < k2);
  assert.ok(k1 < k3);
  // Same (x, y), higher z has higher key
  assert.ok(k0 < kZ);
});

test("StubRenderer generates depth-sorted render commands for rooms and players", () => {
  const renderer = new StubRenderer();
  const room = createOuterRoom();

  const mockPlayer: Player = {
    id: 0,
    name: "Player 1",
    health: 20,
    hunger: 20,
    exhaustion: 0,
    isSneaking: false,
    sneakTimer: 0,
    currentRoomId: room.id,
    x: 0,
    y: 0,
    z: 1,
    height: 2,
    selectedLayerIndex: 1,
    inventory: new Map(),
  };

  const commands = renderer.generateRenderCommands(room, [mockPlayer]);

  assert.ok(commands.length > 0);
  // Verify commands are strictly sorted by depthKey ascending
  for (let i = 1; i < commands.length; i++) {
    assert.ok(
      commands[i].depthKey >= commands[i - 1].depthKey,
      `Commands must be sorted: idx ${i} key ${commands[i].depthKey} >= idx ${i - 1} key ${commands[i - 1].depthKey}`
    );
  }

  // Verify player is included in render commands
  const playerCmd = commands.find((c) => c.type === "DRAW_PLAYER");
  assert.ok(playerCmd, "Player command should exist");
  assert.equal(playerCmd.player?.id, 0);
});

test("StubRenderer executes commands on a CanvasContext2D stub", () => {
  const renderer = new StubRenderer();
  const room = createTinyCompactMachineRoom();

  const operations: string[] = [];

  const mockCtx: CanvasContext2DLike = {
    save: () => operations.push("save"),
    restore: () => operations.push("restore"),
    translate: () => operations.push("translate"),
    scale: () => operations.push("scale"),
    beginPath: () => operations.push("beginPath"),
    moveTo: () => operations.push("moveTo"),
    lineTo: () => operations.push("lineTo"),
    closePath: () => operations.push("closePath"),
    fill: () => operations.push("fill"),
    stroke: () => operations.push("stroke"),
    fillRect: () => operations.push("fillRect"),
    strokeRect: () => operations.push("strokeRect"),
    fillText: () => operations.push("fillText"),
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
  };

  const commands = renderer.render(room, [], mockCtx);
  assert.ok(commands.length > 0);
  assert.ok(operations.includes("beginPath"));
  assert.ok(operations.includes("fill"));
  assert.ok(operations.includes("stroke"));

  // Verify Tiny Room renders exactly 3x3 floor (9 floor commands) and 3x3 walls (18 wall faces)
  const cutawayCommands = renderer.generateRenderCommands(room, [], { enableCutaway: true });
  const floorCommands = cutawayCommands.filter((c) => c.type === "DRAW_FLOOR");
  const wallCommands = cutawayCommands.filter((c) => c.type === "DRAW_WALL_SIDE");

  assert.equal(floorCommands.length, 9, "Tiny compact room should render exactly 3x3 floor tiles");
  assert.equal(wallCommands.length, 18, "Tiny compact room should render two 3x3 wall face arrays (North & West)");
});
