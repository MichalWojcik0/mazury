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
  hudEffects: document.getElementById("hud-effects"),
  gameContainer: document.getElementById("game-container"),
  hudQuickInventory: document.getElementById("hud-quick-inventory"),
  fullInvDrawer: document.getElementById("full-inv-drawer"),
  grid36Slots: document.getElementById("grid-36-slots"),
  btnToggleInv: document.getElementById("btn-toggle-inv"),
  btnCloseFullInv: document.getElementById("btn-close-full-inv"),
  craftingPanel: document.getElementById("crafting-panel"),
  craftingStationStatus: document.getElementById("crafting-station-status"),
  btnToggleDualCrafting: document.getElementById("btn-toggle-dual-crafting"),
  craftingPanes: [
    {
      listEl: document.getElementById("crafting-recipe-list-0"),
      filterEl: document.getElementById("craft-filter-0"),
      groupEl: document.getElementById("craft-group-0"),
      sortEl: document.getElementById("craft-sort-0"),
    },
    {
      listEl: document.getElementById("crafting-recipe-list-1"),
      filterEl: document.getElementById("craft-filter-1"),
      groupEl: document.getElementById("craft-group-1"),
      sortEl: document.getElementById("craft-sort-1"),
    },
  ],
  btnToggleCrafting: document.getElementById("btn-toggle-crafting"),
  btnCloseCrafting: document.getElementById("btn-close-crafting"),
  furnacePanel: document.getElementById("furnace-panel"),
  furnaceCoords: document.getElementById("furnace-coords"),
  furnaceStatusBadge: document.getElementById("furnace-status-badge"),
  btnCloseFurnace: document.getElementById("btn-close-furnace"),
  furnaceSlotInput: document.getElementById("furnace-slot-input"),
  furnaceSlotFuel: document.getElementById("furnace-slot-fuel"),
  furnaceSlotOutput: document.getElementById("furnace-slot-output"),
  furnaceFlameFill: document.getElementById("furnace-flame-fill"),
  furnaceBurnText: document.getElementById("furnace-burn-text"),
  furnaceProgressFill: document.getElementById("furnace-progress-fill"),
  furnaceProgressText: document.getElementById("furnace-progress-text"),
  furnaceInvGrid: document.getElementById("furnace-inv-grid"),
  btnSquat: document.getElementById("btn-squat"),
  btnEat: document.getElementById("btn-eat"),
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
  btnZoomIn: document.getElementById("btn-zoom-in"),
  btnZoomOut: document.getElementById("btn-zoom-out"),
  btnZoomReset: document.getElementById("btn-zoom-reset"),
};

export const layerLabels = ["0: Floor", "1: Feet", "2: Head", "3: Ceiling"];

export const HIDDEN_RECIPES_STORAGE_KEY = "compact_claustrophobia_hidden_recipes_v1";

function loadHiddenRecipes() {
  try {
    const raw = localStorage.getItem(HIDDEN_RECIPES_STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr) : new Set();
  } catch {
    return new Set();
  }
}

export const uiState = {
  isInventoryDrawerOpen: false,
  isCraftingOpen: false,
  isDualCraftingOpen: false,
  isFurnaceOpen: false,
  openFurnaceCoord: null,
  hiddenRecipeIds: loadHiddenRecipes(),
  craftingPaneConfigs: [
    { filter: "all", groupBy: "category", sortBy: "craftable" },
    { filter: "station", groupBy: "category", sortBy: "craftable" },
  ],
  draggedSlotIndex: null,
};

export const cameraState = {
  panX: 0,
  panY: 0,
  zoom: 1.0,
  minZoom: 0.5,
  maxZoom: 2.5,
  lastRoomId: null,
};

// Track active hover timers and states across re-renders
// Key: slot container type ('quick' or 'drawer') + '-' + slotIndex
export const arrowVisibleUntil = new Map();
export const arrowHideTimeouts = new Map();
