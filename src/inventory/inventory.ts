import type { ItemStack, InventoryList } from "../core/types.ts";

export const INVENTORY_SIZE = 36;
export const QUICK_SELECT_SIZE = 9;
export const DEFAULT_MAX_STACK_SIZE = 64;

/**
 * Item stack size definitions.
 * Items default to 64 unless specified here (e.g. tools, devices, machines).
 */
import { getItemDefinition } from "../registry/definitions.ts";

/**
 * Returns the maximum stack size for the given item ID.
 */
export function getMaxStackSize(itemId: string): number {
  const itemDef = getItemDefinition(itemId);
  if (itemDef?.maxStackSize !== undefined) {
    return itemDef.maxStackSize;
  }
  return DEFAULT_MAX_STACK_SIZE;
}

/**
 * Creates an empty 36-slot inventory list.
 */
export function createEmptyInventory(): InventoryList {
  return Array.from({ length: INVENTORY_SIZE }, () => null);
}

/**
 * Counts the total quantity of an item ID across all 36 slots.
 */
export function countItem(inventory: InventoryList, itemId: string): number {
  let total = 0;
  for (const slot of inventory) {
    if (slot && slot.id === itemId) {
      total += slot.count;
    }
  }
  return total;
}

/**
 * Checks whether the inventory contains at least `requiredCount` of `itemId`.
 */
export function hasItem(inventory: InventoryList, itemId: string, requiredCount: number = 1): boolean {
  return countItem(inventory, itemId) >= requiredCount;
}

/**
 * Adds an item to the 36-slot inventory, respecting max stack sizes.
 * Fills existing partial stacks first, then empty slots.
 * Returns the number of items that could NOT fit (0 if all added).
 */
export function addItem(inventory: InventoryList, itemId: string, count: number): number {
  if (count <= 0) return 0;
  let remaining = count;
  const maxStack = getMaxStackSize(itemId);

  // 1. Try to merge into existing stacks with room
  for (let i = 0; i < inventory.length; i++) {
    const slot = inventory[i];
    if (slot && slot.id === itemId && slot.count < maxStack) {
      const availableSpace = maxStack - slot.count;
      const toAdd = Math.min(remaining, availableSpace);
      slot.count += toAdd;
      remaining -= toAdd;
      if (remaining <= 0) {
        return 0;
      }
    }
  }

  // 2. Try to fill empty slots
  for (let i = 0; i < inventory.length; i++) {
    if (inventory[i] === null) {
      const toAdd = Math.min(remaining, maxStack);
      inventory[i] = { id: itemId, count: toAdd };
      remaining -= toAdd;
      if (remaining <= 0) {
        return 0;
      }
    }
  }

  // Returns remaining items that could not fit (inventory full)
  return remaining;
}

/**
 * Removes a given count of an item ID from the inventory across slots.
 * Returns true if the full count was successfully removed, false if insufficient items.
 */
export function removeItem(inventory: InventoryList, itemId: string, count: number): boolean {
  if (count <= 0) return true;
  if (countItem(inventory, itemId) < count) {
    return false;
  }

  let remaining = count;
  for (let i = 0; i < inventory.length; i++) {
    const slot = inventory[i];
    if (slot && slot.id === itemId) {
      if (slot.count <= remaining) {
        remaining -= slot.count;
        inventory[i] = null;
      } else {
        slot.count -= remaining;
        remaining = 0;
      }
      if (remaining <= 0) {
        break;
      }
    }
  }

  return true;
}

/**
 * Moves the item stack at `slotIndex` to the very top (index 0) of the list.
 * Items preceding `slotIndex` are shifted down by one position.
 */
export function moveToTop(inventory: InventoryList, slotIndex: number): boolean {
  if (slotIndex <= 0 || slotIndex >= inventory.length) return false;
  const item = inventory[slotIndex];
  if (!item) return false; // Nothing to move

  // Remove item from current position
  inventory.splice(slotIndex, 1);
  // Insert at top (index 0)
  inventory.unshift(item);
  return true;
}

/**
 * Moves the item stack at `slotIndex` to the bottom of the populated items in the list.
 * For example, if there are 4 items (at indices 0, 1, 2, 3), moving slot 0 to the bottom
 * moves it to slot 4 (index 3), shifting intervening items up, while preserving the
 * total inventory length of 36.
 */
export function moveToBottom(inventory: InventoryList, slotIndex: number): boolean {
  if (slotIndex < 0 || slotIndex >= inventory.length) return false;
  const item = inventory[slotIndex];
  if (!item) return false; // Nothing to move

  // Find the index of the last non-null item in the inventory
  let lastOccupiedIndex = -1;
  for (let i = inventory.length - 1; i >= 0; i--) {
    if (inventory[i] !== null) {
      lastOccupiedIndex = i;
      break;
    }
  }

  // If already at or past the last populated slot, nothing to move
  if (slotIndex >= lastOccupiedIndex) return false;

  // Remove item from its current slot
  inventory.splice(slotIndex, 1);
  // In the spliced array, the target position at the end of populated items is lastOccupiedIndex - 1.
  // Insert the item after the last remaining populated item (at lastOccupiedIndex - 1).
  // E.g., if there were 4 items at 0..3, lastOccupiedIndex is 3. Splicing removes 1 item.
  // We insert at index 3 (lastOccupiedIndex - 1 + 1 = lastOccupiedIndex).
  // Then pad with null at the end to keep length 36.
  inventory.splice(lastOccupiedIndex, 0, item);

  while (inventory.length < INVENTORY_SIZE) {
    inventory.push(null);
  }
  if (inventory.length > INVENTORY_SIZE) {
    inventory.length = INVENTORY_SIZE;
  }

  return true;
}

/**
 * Result of a transfer or swap operation between two inventory slots.
 */
export interface SlotTransferResult {
  success: boolean;
  action: "merged" | "swapped" | "noop";
  remainingCount?: number;
}

/**
 * Transfers or swaps items between two inventory slots.
 * - Validates slot index bounds.
 * - If fromIndex === toIndex or source slot is empty, returns noop.
 * - If target slot is empty, moves source stack to target slot.
 * - If both slots hold the identical item ID, merges the source stack into target up to maxStackSize.
 *   If the target stack becomes full and leftover items remain, the remainder stays in the source slot.
 * - If target slot holds a different item ID, swaps the two slots.
 */
export function transferOrSwapSlots(
  inventory: InventoryList,
  fromIndex: number,
  toIndex: number
): SlotTransferResult {
  if (
    fromIndex < 0 ||
    fromIndex >= inventory.length ||
    toIndex < 0 ||
    toIndex >= inventory.length
  ) {
    return { success: false, action: "noop" };
  }

  if (fromIndex === toIndex) {
    return { success: true, action: "noop" };
  }

  const source = inventory[fromIndex];
  if (!source) {
    return { success: false, action: "noop" };
  }

  const target = inventory[toIndex];

  // Case 1: Target slot is empty - simple move
  if (!target) {
    inventory[toIndex] = source;
    inventory[fromIndex] = null;
    return { success: true, action: "swapped" };
  }

  // Case 2: Target slot has matching item - attempt stack merge
  if (target.id === source.id) {
    const maxStack = getMaxStackSize(source.id);
    const available = maxStack - target.count;

    if (available > 0) {
      const transferCount = Math.min(source.count, available);
      target.count += transferCount;
      source.count -= transferCount;

      if (source.count <= 0) {
        inventory[fromIndex] = null;
        return { success: true, action: "merged", remainingCount: 0 };
      } else {
        return { success: true, action: "merged", remainingCount: source.count };
      }
    }
  }

  // Case 3: Different item ID or target stack already full - swap slots
  inventory[fromIndex] = target;
  inventory[toIndex] = source;
  return { success: true, action: "swapped" };
}

/**
 * Swaps two slots in the inventory list.
 */
export function swapSlots(inventory: InventoryList, indexA: number, indexB: number): boolean {
  if (
    indexA < 0 ||
    indexA >= inventory.length ||
    indexB < 0 ||
    indexB >= inventory.length ||
    indexA === indexB
  ) {
    return false;
  }
  const temp = inventory[indexA];
  inventory[indexA] = inventory[indexB];
  inventory[indexB] = temp;
  return true;
}
