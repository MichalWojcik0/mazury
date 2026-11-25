import test from "node:test";
import assert from "node:assert/strict";

import {
  worldToScreen,
  screenToWorld,
  computeDepthKey,
  isPointInPlayArea,
  clampCameraPan,
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

test("StubRenderer generates 3D wireframe layer outline and block highlight commands", () => {
  const renderer = new StubRenderer();
  const room = createTinyCompactMachineRoom();

  const commands = renderer.generateRenderCommands(room, [], {
    enableCutaway: true,
    selectedLayerZ: 1,
    showLayerOutline: true,
    highlightCoord: { x: 1, y: 0, z: 1 },
  });

  const layerOutlineCmd = commands.find((c) => c.type === "DRAW_LAYER_OUTLINE");
  assert.ok(layerOutlineCmd, "DRAW_LAYER_OUTLINE command should be generated");
  assert.equal(layerOutlineCmd.metadata?.layerZ, 1);
  assert.equal(layerOutlineCmd.metadata?.width, 3);
  assert.equal(layerOutlineCmd.metadata?.height, 3);

  const highlightCmd = commands.find((c) => c.type === "DRAW_HIGHLIGHT");
  assert.ok(highlightCmd, "DRAW_HIGHLIGHT command should be generated");
  assert.deepEqual(highlightCmd.worldCoord, { x: 1, y: 0, z: 1 });
});

test("StubRenderer executes 3D wireframe layer outline, block highlight, and floor texture on canvas context", () => {
  const renderer = new StubRenderer();
  const room = createTinyCompactMachineRoom();

  const operations: string[] = [];
  const strokes: string[] = [];

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
    stroke: () => {
      operations.push("stroke");
      strokes.push(String(mockCtx.strokeStyle));
    },
    fillRect: () => operations.push("fillRect"),
    strokeRect: () => operations.push("strokeRect"),
    fillText: () => operations.push("fillText"),
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
  };

  renderer.render(room, [], mockCtx, {
    enableCutaway: true,
    selectedLayerZ: 1,
    showLayerOutline: true,
    highlightCoord: { x: 1, y: 0, z: 1 },
  });

  // Verify cyan stroke for 3D wireframe voxel highlight
  assert.ok(strokes.includes("#00ffff"), "Voxel highlight stroke #00ffff should be used");
  // Verify layer outline stroke
  assert.ok(
    strokes.some((s) => s.includes("97, 175, 239")),
    "Layer outline wireframe stroke should be used"
  );
});

test("StubRenderer renders vertical side walls for placed dirt blocks", () => {
  const renderer = new StubRenderer();
  const room = createTinyCompactMachineRoom();
  room.voxels[1][1][1] = {
    id: "minecraft:dirt",
    type: "floor",
    passable: false,
  };

  const fills: string[] = [];
  const mockCtx: CanvasContext2DLike = {
    save: () => {},
    restore: () => {},
    translate: () => {},
    scale: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    fill: () => fills.push(String(mockCtx.fillStyle)),
    stroke: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    fillText: () => {},
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
  };

  const dirtCmd = renderer
    .generateRenderCommands(room, [], { enableCutaway: true })
    .find((c) => c.type === "DRAW_TILE" && c.tile?.id === "minecraft:dirt");
  assert.ok(dirtCmd, "Dirt DRAW_TILE command should be generated");

  renderer.executeCommand(dirtCmd, mockCtx);

  // Left side wall, right side wall, and top diamond should all be drawn
  assert.equal(fills.length, 3, "Dirt block should draw left side, right side, and top face");
  assert.ok(fills.includes("#6b4c35"), "Left dirt side face should be rendered");
  assert.ok(fills.includes("#563b27"), "Right dirt side face should be rendered");
  assert.ok(fills.includes("#866043"), "Top dirt diamond should be rendered");
});

test("StubRenderer renders bonsai trees as two intersected flat texture planes instead of a circle", () => {
  const renderer = new StubRenderer();
  const room = createTinyCompactMachineRoom();
  room.voxels[1][1][1] = {
    id: "minecraft:farmland",
    type: "farmland",
    passable: false,
  };
  room.voxels[2][1][1] = {
    id: "arcadialbonsaitrees:bonsai_oak_sapling",
    type: "crop",
    passable: true,
    metadata: { growthTicks: 600 },
  };

  const fakeTexture = { complete: true, naturalWidth: 16, naturalHeight: 16 } as unknown as HTMLImageElement;
  renderer.textures.set("arcadialbonsaitrees:bonsai_oak_sapling", fakeTexture);

  const transforms: number[][] = [];
  const drawImages: unknown[][] = [];
  let arcCalls = 0;

  const mockCtx: CanvasContext2DLike = {
    save: () => {},
    restore: () => {},
    translate: () => {},
    scale: () => {},
    transform: (a, b, c, d, e, f) => transforms.push([a, b, c, d, e, f]),
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    fill: () => {},
    stroke: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    drawImage: (img, ...args) => drawImages.push([img, ...args]),
    fillText: () => {},
    arc: () => {
      arcCalls++;
    },
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
  };

  const bonsaiCmd = renderer
    .generateRenderCommands(room, [], { enableCutaway: true })
    .find((c) => c.type === "DRAW_TILE" && c.tile?.id === "arcadialbonsaitrees:bonsai_oak_sapling");
  assert.ok(bonsaiCmd, "Bonsai DRAW_TILE command should be generated");

  renderer.executeCommand(bonsaiCmd, mockCtx);

  assert.equal(arcCalls, 0, "Bonsai tree should not render as a circle");
  assert.equal(drawImages.length, 4, "Two intersected planes should draw 4 depth-sorted half-quads");
  assert.ok(transforms.some((t) => t[1] > 0), "Plane A should shear along +Y isometric axis");
  assert.ok(transforms.some((t) => t[1] < 0), "Plane B should shear along -Y isometric axis");
});

test("StubRenderer renders squatting player crouched with squat indicator and progress bar", () => {
  const renderer = new StubRenderer();
  const room = createTinyCompactMachineRoom();

  const standingPlayer: Player = {
    id: 0,
    name: "Player 1",
    health: 20,
    hunger: 20,
    exhaustion: 0,
    isSneaking: false,
    sneakTimer: 0,
    currentRoomId: room.id,
    x: 1,
    y: 1,
    z: 1,
    height: 2,
    selectedLayerIndex: 1,
    inventory: [],
  };

  const squattingPlayer: Player = {
    ...standingPlayer,
    isSneaking: true,
    sneakTimer: 50,
  };

  const capturePlayerDraw = (player: Player) => {
    const rects: number[][] = [];
    const texts: string[] = [];
    const mockCtx: CanvasContext2DLike = {
      save: () => {},
      restore: () => {},
      translate: () => {},
      scale: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      fill: () => {},
      stroke: () => {},
      fillRect: (x, y, w, h) => rects.push([x, y, w, h]),
      strokeRect: () => {},
      fillText: (text) => texts.push(text),
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 1,
    };
    const cmd = renderer
      .generateRenderCommands(room, [player], { enableCutaway: true })
      .find((c) => c.type === "DRAW_PLAYER");
    assert.ok(cmd);
    renderer.executeCommand(cmd, mockCtx);
    return { rects, texts };
  };

  const standing = capturePlayerDraw(standingPlayer);
  const squatting = capturePlayerDraw(squattingPlayer);

  // Squatting player leg height (rects[0][3]) is shorter than standing leg height
  assert.ok(squatting.rects[0][3] < standing.rects[0][3], "Squatting player should render shorter");
  // Squatting renders progress bar (background + fill = 2 extra rects) and squat label
  assert.ok(squatting.rects.length > standing.rects.length, "Squatting player should render progress bar");
  assert.ok(squatting.texts.includes("P1 [Squat]"), "Squatting label should be displayed");
});

test("StubRenderer uses thin wireframe strokes (< 1px) for layer outline and voxel highlight", () => {
  const renderer = new StubRenderer();
  const room = createTinyCompactMachineRoom();

  const strokeWidths: Array<{ style: string; width: number }> = [];
  const mockCtx: CanvasContext2DLike = {
    save: () => {},
    restore: () => {},
    translate: () => {},
    scale: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    fill: () => {},
    stroke: () => strokeWidths.push({ style: String(mockCtx.strokeStyle), width: mockCtx.lineWidth }),
    fillRect: () => {},
    strokeRect: () => {},
    fillText: () => {},
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
  };

  renderer.render(room, [], mockCtx, {
    enableCutaway: true,
    selectedLayerZ: 1,
    showLayerOutline: true,
    highlightCoord: { x: 1, y: 0, z: 1 },
  });

  const highlightStroke = strokeWidths.find((s) => s.style === "#00ffff");
  assert.ok(highlightStroke && highlightStroke.width < 1, "Voxel highlight wireframe should be thinner than 1px");

  const layerStrokes = strokeWidths.filter((s) => s.style.includes("97, 175, 239"));
  assert.ok(layerStrokes.length > 0 && layerStrokes.every((s) => s.width < 1), "Layer outline wireframes should be thinner than 1px");
});

test("StubRenderer renders crafting station as a 4-legged wooden table with crafting grid top", () => {
  const renderer = new StubRenderer();
  const room = createTinyCompactMachineRoom();
  room.voxels[1][1][1] = {
    id: "craftingstation:crafting_station",
    type: "machine",
    passable: false,
  };

  const topTex = { id: "top", complete: true, naturalWidth: 16, naturalHeight: 16 } as unknown as HTMLImageElement;
  const planksTex = { id: "planks", complete: true, naturalWidth: 16, naturalHeight: 16 } as unknown as HTMLImageElement;

  renderer.textures.set("craftingstation:crafting_station", topTex);
  renderer.textures.set("minecraft:planks", planksTex);

  const drawnImages: unknown[] = [];
  const mockCtx: CanvasContext2DLike = {
    save: () => {},
    restore: () => {},
    translate: () => {},
    scale: () => {},
    transform: () => {},
    clip: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    fill: () => {},
    stroke: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    drawImage: (img) => drawnImages.push(img),
    fillText: () => {},
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
  };

  const cmd = renderer
    .generateRenderCommands(room, [], { enableCutaway: true })
    .find((c) => c.type === "DRAW_TILE" && c.tile?.id === "craftingstation:crafting_station");
  assert.ok(cmd);

  renderer.executeCommand(cmd, mockCtx);
  // 4 legs * 2 faces (8) + tabletop rim * 2 faces (2) = 10 planks faces, then 1 crafting grid top
  assert.equal(drawnImages.length, 11);
  assert.ok(drawnImages.slice(0, 10).every((img) => img === planksTex), "Legs and tabletop rim should use planks texture");
  assert.equal(drawnImages[10], topTex, "Top surface should use crafting grid texture");
});

test("isPointInPlayArea and clampCameraPan accurately bound play-area detection and panning", () => {
  const renderer = new StubRenderer();
  const room = createTinyCompactMachineRoom();
  renderer.centerOnRoom(room, 800, 600);

  // Center of room floor (1, 1, 0) is inside the play area
  const centerPt = worldToScreen(1, 1, 0, renderer.camera);
  assert.equal(
    isPointInPlayArea(centerPt.u, centerPt.v, room.width, room.height, room.depth, true, renderer.camera),
    true
  );

  // Far corner of viewport (5, 5) is outside the play area
  assert.equal(
    isPointInPlayArea(5, 5, room.width, room.height, room.depth, true, renderer.camera),
    false
  );

  // Extreme pan offsets get clamped so the room cannot leave the camera view
  const clamped = clampCameraPan(5000, -5000, room.width, room.height, room.depth, 800, 600, renderer.camera);
  assert.ok(clamped.panX > 0 && clamped.panX <= 800 * 0.35);
  assert.ok(clamped.panY < 0 && clamped.panY >= -600 * 0.35);
});
