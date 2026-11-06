import test from "node:test";
import assert from "node:assert/strict";

import { GameEngine } from "../src/core/engine.ts";
import { addItem, countItem } from "../src/inventory/inventory.ts";
import {
  getAvailableVoxelActions,
  resolveSelectedVoxel,
} from "../src/mechanics/voxel-actions.ts";
import type { Tile } from "../src/core/types.ts";

test("Voxel Actions: machine wall yields punch as only choice", () => {
  const wallTile: Tile = {
    id: "compactmachines3:wall",
    type: "solid_wall",
    passable: false,
    occluding: true,
  };

  const actions = getAvailableVoxelActions(wallTile, false);
  assert.equal(actions.length, 1);
  assert.equal(actions[0].id, "punch");
  assert.equal(actions[0].buttonType, "PRIMARY");

  // Also when isBoundary is true
  const boundaryActions = getAvailableVoxelActions(wallTile, true);
  assert.equal(boundaryActions.length, 1);
  assert.equal(boundaryActions[0].id, "punch");
});

test("Voxel Actions: dirt yields both break and till choices", () => {
  const dirtTile: Tile = {
    id: "minecraft:dirt",
    type: "floor",
    passable: false,
  };

  const actions = getAvailableVoxelActions(dirtTile, false);
  assert.equal(actions.length, 2);

  const actionIds = actions.map((a) => a.id);
  assert.ok(actionIds.includes("break"));
  assert.ok(actionIds.includes("till"));

  const breakAction = actions.find((a) => a.id === "break")!;
  assert.equal(breakAction.buttonType, "PRIMARY");

  const tillAction = actions.find((a) => a.id === "till")!;
  assert.equal(tillAction.buttonType, "SECONDARY");
});

test("Voxel Actions: air yields no available actions", () => {
  const airTile: Tile = {
    id: "minecraft:air",
    type: "air",
    passable: true,
  };

  const actions = getAvailableVoxelActions(airTile, false);
  assert.equal(actions.length, 0);
});

test("Voxel Actions: resolveSelectedVoxel accurately identifies target tile and actions", () => {
  const engine = new GameEngine(1337);
  const player = engine.players.get(0)!;

  // Move into Tiny Compact Machine
  engine.enqueueInput({
    tick: 1,
    playerId: 0,
    action: { type: "USE_PSD" },
  });
  engine.stepTick();

  const room = engine.rooms.get(player.currentRoomId)!;
  // Player is at (1, 1, 1). Selected layer is 1 (feet).
  // Slot 8 targets (1, 0, 1), which is empty air in room_tiny_1
  player.selectedSlot = 8;
  const airSelected = resolveSelectedVoxel(room, player, 8);
  assert.ok(airSelected);
  assert.equal(airSelected.tile.id, "minecraft:air");
  assert.equal(airSelected.isInBounds, true);
  assert.equal(airSelected.isBoundary, false);
  assert.equal(getAvailableVoxelActions(airSelected.tile).length, 0);

  // Target North boundary wall: move player to (1, 0, 1) so slot 8 is (1, -1, 1) [boundary NORTH face]
  engine.enqueueInput({
    tick: engine.currentTick + 1,
    playerId: 0,
    action: { type: "MOVE", dx: 0, dy: -1 },
  });
  engine.stepTick();
  assert.equal(player.y, 0);

  const wallSelected = resolveSelectedVoxel(room, player, 8);
  assert.ok(wallSelected);
  assert.equal(wallSelected.tile.id, "compactmachines3:wall");
  assert.equal(wallSelected.isBoundary, true);
  assert.equal(wallSelected.isInBounds, false);

  const wallActions = getAvailableVoxelActions(wallSelected.tile, wallSelected.isBoundary);
  assert.equal(wallActions.length, 1);
  assert.equal(wallActions[0].id, "punch");

  // Place dirt at slot 6 (East: 2, 0, 1)
  addItem(player.inventory, "minecraft:dirt", 2);
  player.selectedQuickSlotIndex = 1;
  player.equippedItem = "minecraft:dirt";

  engine.enqueueInput({
    tick: engine.currentTick + 1,
    playerId: 0,
    action: { type: "INTERACT_TILE", slot: 6, button: "SECONDARY" },
  });
  engine.stepTick();

  player.selectedSlot = 6;
  const dirtSelected = resolveSelectedVoxel(room, player, 6);
  assert.ok(dirtSelected);
  assert.equal(dirtSelected.tile.id, "minecraft:dirt");
  assert.equal(dirtSelected.isInBounds, true);
  assert.equal(dirtSelected.isBoundary, false);

  const dirtActions = getAvailableVoxelActions(dirtSelected.tile, dirtSelected.isBoundary);
  assert.equal(dirtActions.length, 2);
  assert.deepEqual(
    dirtActions.map((a) => a.id),
    ["break", "till"]
  );

  // Perform "till" action on dirt
  engine.enqueueInput({
    tick: engine.currentTick + 1,
    playerId: 0,
    action: { type: "INTERACT_TILE", slot: 6, button: "SECONDARY" },
  });
  engine.stepTick();

  // Selected voxel is now farmland
  const farmlandSelected = resolveSelectedVoxel(room, player, 6);
  assert.ok(farmlandSelected);
  assert.equal(farmlandSelected.tile.id, "minecraft:farmland");
  const farmlandActions = getAvailableVoxelActions(farmlandSelected.tile, farmlandSelected.isBoundary);
  assert.equal(farmlandActions.length, 1);
  assert.equal(farmlandActions[0].id, "break");

  // Perform "break" action on farmland
  engine.enqueueInput({
    tick: engine.currentTick + 1,
    playerId: 0,
    action: { type: "INTERACT_TILE", slot: 6, button: "PRIMARY" },
  });
  engine.stepTick();

  // Selected voxel is now back to air
  const postBreakSelected = resolveSelectedVoxel(room, player, 6);
  assert.ok(postBreakSelected);
  assert.equal(postBreakSelected.tile.id, "minecraft:air");
});
