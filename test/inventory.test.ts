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
  transferOrSwapSlots,
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

test("transferOrSwapSlots handles moves, swaps, identical stack merging, and bounds", () => {
  const inv = createEmptyInventory();

  // Test out-of-bounds index returns failure
  assert.equal(transferOrSwapSlots(inv, -1, 5).success, false);
  assert.equal(transferOrSwapSlots(inv, 0, 36).success, false);

  // Moving from empty slot returns failure
  assert.equal(transferOrSwapSlots(inv, 0, 1).success, false);

  // Same index returns noop success
  assert.equal(transferOrSwapSlots(inv, 0, 0).action, "noop");

  // Setup items
  inv[0] = { id: "contenttweaker:dirtdust", count: 20 };
  inv[1] = { id: "compactmachines3:psd", count: 1 };
  inv[2] = { id: "contenttweaker:dirtdust", count: 30 };

  // 1. Move to empty slot (index 0 -> index 5)
  const resMove = transferOrSwapSlots(inv, 0, 5);
  assert.equal(resMove.success, true);
  assert.equal(resMove.action, "swapped");
  assert.equal(inv[0], null);
  assert.deepEqual(inv[5], { id: "contenttweaker:dirtdust", count: 20 });

  // 2. Swap differing items (index 5 [dirt dust 20] <-> index 1 [psd 1])
  const resSwap = transferOrSwapSlots(inv, 5, 1);
  assert.equal(resSwap.success, true);
  assert.equal(resSwap.action, "swapped");
  assert.deepEqual(inv[5], { id: "compactmachines3:psd", count: 1 });
  assert.deepEqual(inv[1], { id: "contenttweaker:dirtdust", count: 20 });

  // 3. Merge identical items with enough room (index 1 [dirt dust 20] into index 2 [dirt dust 30])
  // max stack for dirtdust is 64, 30 + 20 = 50 <= 64
  const resMerge = transferOrSwapSlots(inv, 1, 2);
  assert.equal(resMerge.success, true);
  assert.equal(resMerge.action, "merged");
  assert.equal(resMerge.remainingCount, 0);
  assert.equal(inv[1], null);
  assert.deepEqual(inv[2], { id: "contenttweaker:dirtdust", count: 50 });

  // 4. Merge identical items with partial overflow (index 3 [dirt dust 30] into index 2 [dirt dust 50])
  // target can only take 14 (up to 64). 16 remains in index 3.
  inv[3] = { id: "contenttweaker:dirtdust", count: 30 };
  const resMergePartial = transferOrSwapSlots(inv, 3, 2);
  assert.equal(resMergePartial.success, true);
  assert.equal(resMergePartial.action, "merged");
  assert.equal(resMergePartial.remainingCount, 16);
  assert.deepEqual(inv[2], { id: "contenttweaker:dirtdust", count: 64 });
  assert.deepEqual(inv[3], { id: "contenttweaker:dirtdust", count: 16 });

  // 5. Transfer into already full stack swaps the two
  inv[4] = { id: "minecraft:stick", count: 5 };
  const resFullSwap = transferOrSwapSlots(inv, 4, 2);
  assert.equal(resFullSwap.success, true);
  assert.equal(resFullSwap.action, "swapped");
  assert.deepEqual(inv[4], { id: "contenttweaker:dirtdust", count: 64 });
  assert.deepEqual(inv[2], { id: "minecraft:stick", count: 5 });
});

test("Engine SWAP_INVENTORY_SLOTS action executes stack merging and updates equipped item", () => {
  const engine = new GameEngine(123);
  const player = engine.players.get(0)!;

  // Player starts with PSD in slot 0, selectedQuickSlotIndex = 0
  assert.equal(player.equippedItem, "compactmachines3:psd");

  // Place 10 dirt dust in slot 1 and 20 dirt dust in slot 0
  player.inventory[0] = { id: "contenttweaker:dirtdust", count: 20 };
  player.inventory[1] = { id: "contenttweaker:dirtdust", count: 10 };

  // Dispatch SWAP_INVENTORY_SLOTS from 1 to 0
  engine.enqueueInput({
    tick: 1,
    playerId: 0,
    action: { type: "SWAP_INVENTORY_SLOTS", fromIndex: 1, toIndex: 0 },
  });
  engine.stepTick();

  // Dirt dust merges into slot 0 (total 30), slot 1 becomes null
  assert.deepEqual(player.inventory[0], { id: "contenttweaker:dirtdust", count: 30 });
  assert.equal(player.inventory[1], null);
  assert.equal(player.equippedItem, "contenttweaker:dirtdust");
});
