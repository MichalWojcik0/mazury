import test from "node:test";
import assert from "node:assert/strict";

import {
  createEmptyInventory,
  addItem,
  removeItem,
  countItem,
  hasItem,
  moveToTop,
  moveToBottom,
  swapSlots,
  getMaxStackSize,
  INVENTORY_SIZE,
} from "../src/inventory/inventory.ts";
import { GameEngine } from "../src/core/engine.ts";

test("Inventory list enforces 36 slots and default/custom stack sizes", () => {
  const inv = createEmptyInventory();
  assert.equal(inv.length, INVENTORY_SIZE);
  assert.equal(INVENTORY_SIZE, 36);

  // Tools/PSD have max stack size 1
  assert.equal(getMaxStackSize("compactmachines3:psd"), 1);
  assert.equal(getMaxStackSize("minecraft:wooden_pickaxe"), 1);

  // Dirt dust has default max stack size 64
  assert.equal(getMaxStackSize("contenttweaker:dirtdust"), 64);

  // Adding PSD fills slot 0 with count 1
  const overflow1 = addItem(inv, "compactmachines3:psd", 1);
  assert.equal(overflow1, 0);
  assert.deepEqual(inv[0], { id: "compactmachines3:psd", count: 1 });

  // Adding a second PSD creates a new slot since maxStack is 1
  const overflow2 = addItem(inv, "compactmachines3:psd", 1);
  assert.equal(overflow2, 0);
  assert.deepEqual(inv[1], { id: "compactmachines3:psd", count: 1 });
  assert.equal(countItem(inv, "compactmachines3:psd"), 2);

  // Adding 100 dirt dust stacks into slot 2 (64) and slot 3 (36)
  const overflowDust = addItem(inv, "contenttweaker:dirtdust", 100);
  assert.equal(overflowDust, 0);
  assert.deepEqual(inv[2], { id: "contenttweaker:dirtdust", count: 64 });
  assert.deepEqual(inv[3], { id: "contenttweaker:dirtdust", count: 36 });
  assert.equal(countItem(inv, "contenttweaker:dirtdust"), 100);
});

test("Inventory handles full capacity and returns unadded overflow", () => {
  const inv = createEmptyInventory();

  // Fill all 36 slots with 64 cobblestone each = 2304 cobblestone
  for (let i = 0; i < 36; i++) {
    inv[i] = { id: "minecraft:cobblestone", count: 64 };
  }

  // Attempt to add 10 more cobblestone to full inventory
  const overflow = addItem(inv, "minecraft:cobblestone", 10);
  assert.equal(overflow, 10);
  assert.equal(countItem(inv, "minecraft:cobblestone"), 2304);

  // Removing 5 leaves room for 5
  assert.equal(removeItem(inv, "minecraft:cobblestone", 5), true);
  assert.equal(countItem(inv, "minecraft:cobblestone"), 2299);

  const overflowAfter = addItem(inv, "minecraft:cobblestone", 10);
  assert.equal(overflowAfter, 5); // 5 fit, 5 overflow
  assert.equal(countItem(inv, "minecraft:cobblestone"), 2304);
});

test("Move to top shifts item to slot 0 and preceding items down", () => {
  const inv = createEmptyInventory();
  inv[0] = { id: "compactmachines3:psd", count: 1 };
  inv[1] = { id: "contenttweaker:dirtdust", count: 10 };
  inv[2] = { id: "cropdusting:poop", count: 3 };

  // Move poop at index 2 to top
  const res = moveToTop(inv, 2);
  assert.equal(res, true);
  assert.equal(inv.length, 36);

  assert.deepEqual(inv[0], { id: "cropdusting:poop", count: 3 });
  assert.deepEqual(inv[1], { id: "compactmachines3:psd", count: 1 });
  assert.deepEqual(inv[2], { id: "contenttweaker:dirtdust", count: 10 });
});

test("Move to bottom shifts item to the end of populated items", () => {
  const inv = createEmptyInventory();
  inv[0] = { id: "compactmachines3:psd", count: 1 };
  inv[1] = { id: "contenttweaker:dirtdust", count: 10 };

  // Move slot 0 to bottom of 2 populated items -> goes to index 1 (slot 2)
  const res = moveToBottom(inv, 0);
  assert.equal(res, true);
  assert.equal(inv.length, 36);

  assert.deepEqual(inv[0], { id: "contenttweaker:dirtdust", count: 10 });
  assert.deepEqual(inv[1], { id: "compactmachines3:psd", count: 1 });
  assert.equal(inv[2], null);
  assert.equal(inv[35], null);
});

test("Move to bottom with 4 items puts item in slot 4 (index 3)", () => {
  const inv = createEmptyInventory();
  inv[0] = { id: "item1", count: 1 };
  inv[1] = { id: "item2", count: 1 };
  inv[2] = { id: "item3", count: 1 };
  inv[3] = { id: "item4", count: 1 };

  // Moving slot 0 to bottom should shift it to slot 4 (index 3)
  const res = moveToBottom(inv, 0);
  assert.equal(res, true);
  assert.equal(inv.length, 36);

  assert.deepEqual(inv[0], { id: "item2", count: 1 });
  assert.deepEqual(inv[1], { id: "item3", count: 1 });
  assert.deepEqual(inv[2], { id: "item4", count: 1 });
  assert.deepEqual(inv[3], { id: "item1", count: 1 });
  assert.equal(inv[4], null);
  assert.equal(inv[35], null);

  // Moving slot 3 (already at bottom of 4 items) should return false
  const res2 = moveToBottom(inv, 3);
  assert.equal(res2, false);
});

test("Move to bottom in full 36-slot inventory moves to slot 36 (index 35)", () => {
  const inv = createEmptyInventory();
  for (let i = 0; i < 36; i++) {
    inv[i] = { id: `item_${i}`, count: 1 };
  }

  const res = moveToBottom(inv, 0);
  assert.equal(res, true);
  assert.equal(inv.length, 36);
  assert.deepEqual(inv[0], { id: "item_1", count: 1 });
  assert.deepEqual(inv[34], { id: "item_35", count: 1 });
  assert.deepEqual(inv[35], { id: "item_0", count: 1 });
});

test("Engine integrates 36-slot inventory, quick selection hotbar, and top/bottom actions", () => {
  const engine = new GameEngine(777);
  const player = engine.players.get(0)!;

  // Initial state: slot 0 is PSD, equippedItem is PSD, quick slot is 0
  assert.deepEqual(player.inventory[0], { id: "compactmachines3:psd", count: 1 });
  assert.equal(player.selectedQuickSlotIndex, 0);
  assert.equal(player.equippedItem, "compactmachines3:psd");

  // Add items via input actions or drops
  addItem(player.inventory, "contenttweaker:dirtdust", 4);
  assert.deepEqual(player.inventory[1], { id: "contenttweaker:dirtdust", count: 4 });

  // Move dirt dust (slot 1) to top (slot 0)
  engine.enqueueInput({
    tick: 1,
    playerId: 0,
    action: { type: "MOVE_ITEM_TO_TOP", slotIndex: 1 },
  });
  engine.stepTick();

  assert.deepEqual(player.inventory[0], { id: "contenttweaker:dirtdust", count: 4 });
  assert.deepEqual(player.inventory[1], { id: "compactmachines3:psd", count: 1 });
  // Since quick slot index 0 is selected, equipped item updates to dirt dust
  assert.equal(player.equippedItem, "contenttweaker:dirtdust");

  // Select quick slot 1 (hotbar index 1 -> PSD)
  engine.enqueueInput({
    tick: 2,
    playerId: 0,
    action: { type: "SELECT_QUICK_SLOT", index: 1 },
  });
  engine.stepTick();

  assert.equal(player.selectedQuickSlotIndex, 1);
  assert.equal(player.equippedItem, "compactmachines3:psd");

  // Move slot 0 to bottom (with 2 items in inventory, it moves to slot 2 / index 1)
  engine.enqueueInput({
    tick: 3,
    playerId: 0,
    action: { type: "MOVE_ITEM_TO_BOTTOM", slotIndex: 0 },
  });
  engine.stepTick();

  assert.deepEqual(player.inventory[0], { id: "compactmachines3:psd", count: 1 });
  assert.deepEqual(player.inventory[1], { id: "contenttweaker:dirtdust", count: 4 });
});
