import { engine } from "./state.js";

let onActionComplete = () => {};

export function setOnActionComplete(callback) {
  onActionComplete = callback;
}

function dispatchPlayerAction(action) {
  engine.enqueueInput({
    tick: engine.currentTick + 1,
    playerId: 0,
    action,
  });
  engine.stepTick();
  onActionComplete();
}

export function selectLayer(layerIndex) {
  dispatchPlayerAction({ type: "SELECT_LAYER", layerIndex });
}

export function swapInventorySlots(fromIndex, toIndex) {
  dispatchPlayerAction({ type: "SWAP_INVENTORY_SLOTS", fromIndex, toIndex });
}

export function selectQuickSlot(index) {
  dispatchPlayerAction({ type: "SELECT_QUICK_SLOT", index });
}

export function moveItemToTop(slotIndex) {
  dispatchPlayerAction({ type: "MOVE_ITEM_TO_TOP", slotIndex });
}

export function moveItemToBottom(slotIndex) {
  dispatchPlayerAction({ type: "MOVE_ITEM_TO_BOTTOM", slotIndex });
}

export function interactSlot(slot, button = "PRIMARY") {
  dispatchPlayerAction({ type: "INTERACT_TILE", slot, button });
}

export function movePlayer(dx, dy) {
  dispatchPlayerAction({ type: "MOVE", dx, dy });
}

export function usePSD() {
  dispatchPlayerAction({ type: "USE_PSD" });
}

export function selectSlot(slot) {
  dispatchPlayerAction({ type: "SELECT_SLOT", slot });
}

export function craftRecipeAction(recipeId) {
  dispatchPlayerAction({ type: "CRAFT_RECIPE", recipeId, count: 1 });
}

export function startSneak() {
  const p = engine.players.get(0);
  if (p && !p.isSneaking) {
    dispatchPlayerAction({ type: "START_SNEAK" });
  }
}

export function stopSneak() {
  const p = engine.players.get(0);
  if (p && p.isSneaking) {
    dispatchPlayerAction({ type: "STOP_SNEAK" });
  }
}

export function toggleSneak() {
  const p = engine.players.get(0);
  if (!p) return;
  if (p.isSneaking) {
    stopSneak();
  } else {
    startSneak();
  }
}

export function eatEquippedItem(itemId) {
  dispatchPlayerAction({ type: "EAT_ITEM", itemId });
}

export function furnaceAction(coord, operation, slotIndex, count = 1) {
  dispatchPlayerAction({
    type: "FURNACE_ACTION",
    coord,
    operation,
    slotIndex,
    count,
  });
}
