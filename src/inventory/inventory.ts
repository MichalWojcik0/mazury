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
 * Moves the item stack at `slotIndex` to the bottom of the list.
 * If there are empty slots at the end, it moves to the last slot (index 35)
 * or the end of the populated items.
 * Specifically, removes the item from slotIndex and appends it to the end (index 35),
 * shifting following items up.
 */
export function moveToBottom(inventory: InventoryList, slotIndex: number): boolean {
  if (slotIndex < 0 || slotIndex >= inventory.length - 1) return false;
  const item = inventory[slotIndex];
  if (!item) return false; // Nothing to move

  // Remove item from current position
  inventory.splice(slotIndex, 1);
  // Push to end (index 35)
  inventory.push(item);
  return true;
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
