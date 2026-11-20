import { GameEngine, StubRenderer } from "./engine-api.js";

// Initialize Game Engine (deterministic 20 Hz simulation)
export const engine = new GameEngine(1337);
export const renderer = new StubRenderer({
  tileWidth: 80,
  tileHeight: 40,
  elevationHeight: 20,
  zoom: 1.0,
});

export const canvas = document.getElementById("game-canvas");
export const ctx = canvas.getContext("2d");

// UI elements
export const dom = {
  hudRoomName: document.getElementById("hud-room-name"),
  hudCoords: document.getElementById("hud-coords"),
  hudLayerName: document.getElementById("hud-layer-name"),
  hudQuestTitle: document.getElementById("hud-quest-title"),
  hudQuestDesc: document.getElementById("hud-quest-desc"),
  hudHearts: document.getElementById("hud-hearts"),
  hudHunger: document.getElementById("hud-hunger"),
  hudQuickInventory: document.getElementById("hud-quick-inventory"),
  fullInvDrawer: document.getElementById("full-inv-drawer"),
  grid36Slots: document.getElementById("grid-36-slots"),
  btnToggleInv: document.getElementById("btn-toggle-inv"),
  btnCloseFullInv: document.getElementById("btn-close-full-inv"),
  craftingPanel: document.getElementById("crafting-panel"),
  craftingRecipeList: document.getElementById("crafting-recipe-list"),
  btnToggleCrafting: document.getElementById("btn-toggle-crafting"),
  btnCloseCrafting: document.getElementById("btn-close-crafting"),
  btnSquat: document.getElementById("btn-squat"),
  btnSaveGame: document.getElementById("btn-save-game"),
  btnResetSave: document.getElementById("btn-reset-save"),
  saveStatus: document.getElementById("save-status"),

  voxelTargetName: document.getElementById("voxel-target-name"),
  voxelTargetCoords: document.getElementById("voxel-target-coords"),
  voxelActionList: document.getElementById("voxel-action-list"),

  itemTooltip: document.getElementById("item-tooltip"),
  tooltipItemName: document.getElementById("tooltip-item-name"),
  tooltipItemCount: document.getElementById("tooltip-item-count"),
  tooltipItemId: document.getElementById("tooltip-item-id"),
  tooltipItemTags: document.getElementById("tooltip-item-tags"),

  layerButtons: [
    document.getElementById("layer-btn-0"),
    document.getElementById("layer-btn-1"),
    document.getElementById("layer-btn-2"),
    document.getElementById("layer-btn-3"),
  ],
};

export const layerLabels = ["0: Floor", "1: Feet", "2: Head", "3: Ceiling"];

export const uiState = {
  isInventoryDrawerOpen: false,
  isCraftingOpen: false,
  draggedSlotIndex: null,
};

// Track active hover timers and states across re-renders
// Key: slot container type ('quick' or 'drawer') + '-' + slotIndex
export const arrowVisibleUntil = new Map();
export const arrowHideTimeouts = new Map();
