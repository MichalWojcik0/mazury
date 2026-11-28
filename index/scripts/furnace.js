import {
  FURNACE_SMELT_TICKS,
  getFurnaceState,
  isFurnaceFuel,
  isSmeltable,
} from "./engine-api.js";
import { engine, dom, uiState } from "./state.js";
import { getItemDisplay, showItemTooltip, hideItemTooltip } from "./tooltip.js";
import { furnaceAction } from "./actions.js";

let controlsBound = false;
let lastFurnaceSignature = null;

function bindFurnaceControlsOnce() {
  if (controlsBound) return;
  controlsBound = true;

  if (dom.btnCloseFurnace) {
    dom.btnCloseFurnace.addEventListener("click", () => closeFurnacePanel());
  }
  if (dom.furnaceSlotInput) {
    dom.furnaceSlotInput.addEventListener("click", () => {
      if (uiState.openFurnaceCoord) {
        furnaceAction(uiState.openFurnaceCoord, "TAKE_INPUT");
      }
    });
  }
  if (dom.furnaceSlotFuel) {
    dom.furnaceSlotFuel.addEventListener("click", () => {
      if (uiState.openFurnaceCoord) {
        furnaceAction(uiState.openFurnaceCoord, "TAKE_FUEL");
      }
    });
  }
  if (dom.furnaceSlotOutput) {
    dom.furnaceSlotOutput.addEventListener("click", () => {
      if (uiState.openFurnaceCoord) {
        furnaceAction(uiState.openFurnaceCoord, "TAKE_OUTPUT");
      }
    });
  }
}

function getOpenFurnaceContext() {
  if (!uiState.isFurnaceOpen || !uiState.openFurnaceCoord) return null;
  const player = engine.players.get(0);
  if (!player) return null;
  const room = engine.rooms.get(player.currentRoomId);
  if (!room) return null;
  const { x, y, z } = uiState.openFurnaceCoord;
  const inBounds =
    x >= 0 && x < room.width && y >= 0 && y < room.height && z >= 0 && z < room.depth;
  const inReach =
    Math.abs(x - player.x) <= 1 &&
    Math.abs(y - player.y) <= 1 &&
    z >= player.z - 1 &&
    z <= player.z + 2;
  if (!inBounds || !inReach) return null;
  const tile = room.voxels[z]?.[y]?.[x];
  if (!tile || tile.id !== "minecraft:furnace") return null;
  return { player, room, tile, coord: { x, y, z } };
}

function renderFurnaceSlotContent(slotEl, itemId, count, emptyLabel) {
  if (!slotEl) return;
  slotEl.innerHTML = "";
  slotEl.classList.toggle("has-item", Boolean(itemId && count > 0));

  slotEl.onmouseenter = null;
  slotEl.onmousemove = null;
  slotEl.onmouseleave = null;

  if (!itemId || count <= 0) {
    const placeholder = document.createElement("span");
    placeholder.style.cssText = "font-size: 9px; color: #5c6370;";
    placeholder.textContent = emptyLabel;
    slotEl.appendChild(placeholder);
    return;
  }

  const display = getItemDisplay(itemId);
  const iconEl = document.createElement("span");
  iconEl.className = "inv-slot-icon";
  if (display.def?.textureDataUrl) {
    const imgEl = document.createElement("img");
    imgEl.src = display.def.textureDataUrl;
    imgEl.alt = display.name;
    iconEl.appendChild(imgEl);
  } else {
    iconEl.textContent = display.icon;
  }
  slotEl.appendChild(iconEl);

  const qtyEl = document.createElement("span");
  qtyEl.className = "inv-slot-qty";
  qtyEl.textContent = count;
  slotEl.appendChild(qtyEl);

  const stack = { id: itemId, count };
  slotEl.onmouseenter = (e) => showItemTooltip(stack, e.clientX, e.clientY);
  slotEl.onmousemove = (e) => showItemTooltip(stack, e.clientX, e.clientY);
  slotEl.onmouseleave = () => hideItemTooltip();
}

export function openFurnacePanel(coord) {
  bindFurnaceControlsOnce();
  if (!coord) return;

  // Close other bottom drawers so they don't overlap
  if (uiState.isCraftingOpen) {
    uiState.isCraftingOpen = false;
    dom.craftingPanel?.classList.remove("open");
    if (dom.btnToggleCrafting) dom.btnToggleCrafting.textContent = "🔨 Crafting [C]";
  }
  if (uiState.isInventoryDrawerOpen) {
    uiState.isInventoryDrawerOpen = false;
    dom.fullInvDrawer?.classList.remove("open");
    if (dom.btnToggleInv) dom.btnToggleInv.textContent = "📦 Full Inventory [E]";
  }

  uiState.openFurnaceCoord = { x: coord.x, y: coord.y, z: coord.z };
  uiState.isFurnaceOpen = true;
  lastFurnaceSignature = null;
  dom.furnacePanel?.classList.add("open");
  renderFurnacePanel();
}

export function closeFurnacePanel() {
  if (!uiState.isFurnaceOpen) return;
  uiState.isFurnaceOpen = false;
  uiState.openFurnaceCoord = null;
  lastFurnaceSignature = null;
  dom.furnacePanel?.classList.remove("open");
  hideItemTooltip();
}

export function renderFurnacePanel() {
  if (!uiState.isFurnaceOpen) return;
  const ctx = getOpenFurnaceContext();
  if (!ctx) {
    closeFurnacePanel();
    return;
  }

  const { player, tile, coord } = ctx;
  const state = getFurnaceState(tile);
  const invSig = player.inventory.map((s) => (s ? `${s.id}:${s.count}` : "")).join("|");
  const sig = `${coord.x},${coord.y},${coord.z}:${state.inputItem}:${state.inputCount}:${state.fuelItem}:${state.fuelCount}:${state.outputItem}:${state.outputCount}:${state.fuelTimeRemaining}:${state.fuelTimeTotal}:${state.smeltProgress}::${invSig}`;
  if (sig === lastFurnaceSignature) return;
  lastFurnaceSignature = sig;

  if (dom.furnaceCoords) {
    dom.furnaceCoords.textContent = `(${coord.x}, ${coord.y}, ${coord.z})`;
  }

  const isLit = state.fuelTimeRemaining > 0;
  if (dom.furnaceStatusBadge) {
    dom.furnaceStatusBadge.textContent = isLit ? "🔥 Lit" : "Idle";
    dom.furnaceStatusBadge.classList.toggle("furnace-status-lit", isLit);
  }

  renderFurnaceSlotContent(dom.furnaceSlotInput, state.inputItem, state.inputCount, "In");
  renderFurnaceSlotContent(dom.furnaceSlotFuel, state.fuelItem, state.fuelCount, "Fuel");
  renderFurnaceSlotContent(dom.furnaceSlotOutput, state.outputItem, state.outputCount, "Out");

  const burnPct =
    isLit && state.fuelTimeTotal > 0
      ? Math.min(100, Math.round((state.fuelTimeRemaining / state.fuelTimeTotal) * 100))
      : 0;
  if (dom.furnaceFlameFill) {
    dom.furnaceFlameFill.style.width = `${burnPct}%`;
  }
  if (dom.furnaceBurnText) {
    dom.furnaceBurnText.textContent = isLit ? `${Math.ceil(state.fuelTimeRemaining / 20)}s` : "0s";
  }

  const smeltPct = Math.min(100, Math.floor((state.smeltProgress / FURNACE_SMELT_TICKS) * 100));
  if (dom.furnaceProgressFill) {
    dom.furnaceProgressFill.style.width = `${smeltPct}%`;
  }
  if (dom.furnaceProgressText) {
    dom.furnaceProgressText.textContent = `${smeltPct}%`;
  }

  if (dom.furnaceInvGrid) {
    dom.furnaceInvGrid.innerHTML = "";
    for (let i = 0; i < player.inventory.length; i++) {
      const item = player.inventory[i];
      const slotEl = document.createElement("div");
      const smeltable = item ? isSmeltable(item.id) : false;
      const fuel = item ? isFurnaceFuel(item.id) : false;

      let kindClass = "disabled";
      if (smeltable) kindClass = "smeltable";
      else if (fuel) kindClass = "fuel";

      slotEl.className = `inv-slot furnace-inv-slot ${kindClass}`;

      if (item) {
        const display = getItemDisplay(item.id);
        const iconEl = document.createElement("span");
        iconEl.className = "inv-slot-icon";
        if (display.def?.textureDataUrl) {
          const imgEl = document.createElement("img");
          imgEl.src = display.def.textureDataUrl;
          imgEl.alt = display.name;
          iconEl.appendChild(imgEl);
        } else {
          iconEl.textContent = display.icon;
        }
        slotEl.appendChild(iconEl);

        const qtyEl = document.createElement("span");
        qtyEl.className = "inv-slot-qty";
        qtyEl.textContent = item.count;
        slotEl.appendChild(qtyEl);

        slotEl.addEventListener("mouseenter", (e) => showItemTooltip(item, e.clientX, e.clientY));
        slotEl.addEventListener("mousemove", (e) => showItemTooltip(item, e.clientX, e.clientY));
        slotEl.addEventListener("mouseleave", () => hideItemTooltip());

        if (smeltable || fuel) {
          slotEl.addEventListener("click", (e) => {
            const count = e.shiftKey ? 64 : 1;
            const op = smeltable ? "INSERT_INPUT" : "INSERT_FUEL";
            furnaceAction(coord, op, i, count);
          });
        }
      }

      dom.furnaceInvGrid.appendChild(slotEl);
    }
  }
}
