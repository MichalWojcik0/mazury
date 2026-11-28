import {
  FURNACE_SMELT_TICKS,
  getFurnaceState,
  isFurnaceFuel,
  isSmeltable,
} from "./engine-api.js";
import { engine, dom, uiState } from "./state.js";
import { getItemDisplay, showItemTooltip, hideItemTooltip } from "./tooltip.js";
import { furnaceAction, swapInventorySlots } from "./actions.js";

let controlsBound = false;
let lastFurnaceItemsSignature = null;
let lastFurnaceTickSignature = null;

function bindFurnaceControlsOnce() {
  if (controlsBound) return;
  controlsBound = true;

  if (dom.btnCloseFurnace) {
    dom.btnCloseFurnace.addEventListener("click", () => closeFurnacePanel());
  }

  const setupFurnaceSlotDnd = (slotEl, kind, acceptPredicate, insertOp, takeOp) => {
    if (!slotEl) return;
    slotEl.addEventListener("click", () => {
      if (uiState.openFurnaceCoord) {
        furnaceAction(uiState.openFurnaceCoord, takeOp);
      }
    });
    slotEl.addEventListener("dragstart", (e) => {
      if (!slotEl.classList.contains("has-item")) {
        e.preventDefault();
        return;
      }
      uiState.draggedFurnaceSlot = kind;
      slotEl.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", `furnace:${kind}`);
    });
    slotEl.addEventListener("dragend", () => {
      uiState.draggedFurnaceSlot = null;
      document.querySelectorAll(".inv-slot").forEach((el) => {
        el.classList.remove("dragging", "drag-over");
      });
    });

    if (acceptPredicate && insertOp) {
      slotEl.addEventListener("dragover", (e) => {
        if (uiState.draggedSlotIndex === null) return;
        const p = engine.players.get(0);
        const item = p?.inventory[uiState.draggedSlotIndex];
        if (item && acceptPredicate(item.id)) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          slotEl.classList.add("drag-over");
        }
      });
      slotEl.addEventListener("dragleave", (e) => {
        if (!slotEl.contains(e.relatedTarget)) {
          slotEl.classList.remove("drag-over");
        }
      });
      slotEl.addEventListener("drop", (e) => {
        e.preventDefault();
        slotEl.classList.remove("drag-over");
        const raw = e.dataTransfer.getData("text/plain");
        const fromIndex = raw !== "" && !raw.startsWith("furnace:") ? parseInt(raw, 10) : uiState.draggedSlotIndex;
        if (uiState.openFurnaceCoord && fromIndex !== null && !isNaN(fromIndex)) {
          furnaceAction(uiState.openFurnaceCoord, insertOp, fromIndex, 64);
        }
        uiState.draggedSlotIndex = null;
      });
    }
  };

  setupFurnaceSlotDnd(dom.furnaceSlotInput, "input", isSmeltable, "INSERT_INPUT", "TAKE_INPUT");
  setupFurnaceSlotDnd(dom.furnaceSlotFuel, "fuel", isFurnaceFuel, "INSERT_FUEL", "TAKE_FUEL");
  setupFurnaceSlotDnd(dom.furnaceSlotOutput, "output", null, null, "TAKE_OUTPUT");
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
  const hasItem = Boolean(itemId && count > 0);
  slotEl.classList.toggle("has-item", hasItem);
  if (hasItem) {
    slotEl.setAttribute("draggable", "true");
  } else {
    slotEl.removeAttribute("draggable");
  }

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
  lastFurnaceItemsSignature = null;
  lastFurnaceTickSignature = null;
  dom.furnacePanel?.classList.add("open");
  renderFurnacePanel();
}

export function closeFurnacePanel() {
  if (!uiState.isFurnaceOpen) return;
  uiState.isFurnaceOpen = false;
  uiState.openFurnaceCoord = null;
  lastFurnaceItemsSignature = null;
  lastFurnaceTickSignature = null;
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

  // 1. Update progress bars and status badge smoothly without rebuilding slot DOM
  const tickSig = `${coord.x},${coord.y},${coord.z}:${state.fuelTimeRemaining}:${state.fuelTimeTotal}:${state.smeltProgress}`;
  if (tickSig !== lastFurnaceTickSignature) {
    lastFurnaceTickSignature = tickSig;
    const isLit = state.fuelTimeRemaining > 0;

    if (dom.furnaceStatusBadge) {
      dom.furnaceStatusBadge.textContent = isLit ? "🔥 Lit" : "Idle";
      dom.furnaceStatusBadge.classList.toggle("furnace-status-lit", isLit);
    }

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
  }

  // 2. Rebuild slot contents and inventory grid only when item counts/IDs change
  const invSig = player.inventory.map((s) => (s ? `${s.id}:${s.count}` : "")).join("|");
  const itemsSig = `${coord.x},${coord.y},${coord.z}:${state.inputItem}:${state.inputCount}:${state.fuelItem}:${state.fuelCount}:${state.outputItem}:${state.outputCount}::${invSig}`;
  if (itemsSig === lastFurnaceItemsSignature) return;
  lastFurnaceItemsSignature = itemsSig;

  if (dom.furnaceCoords) {
    dom.furnaceCoords.textContent = `(${coord.x}, ${coord.y}, ${coord.z})`;
  }

  renderFurnaceSlotContent(dom.furnaceSlotInput, state.inputItem, state.inputCount, "In");
  renderFurnaceSlotContent(dom.furnaceSlotFuel, state.fuelItem, state.fuelCount, "Fuel");
  renderFurnaceSlotContent(dom.furnaceSlotOutput, state.outputItem, state.outputCount, "Out");

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

        slotEl.setAttribute("draggable", "true");
        slotEl.addEventListener("dragstart", (e) => {
          uiState.draggedSlotIndex = i;
          slotEl.classList.add("dragging");
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", String(i));
        });
        slotEl.addEventListener("dragend", () => {
          uiState.draggedSlotIndex = null;
          uiState.draggedFurnaceSlot = null;
          document.querySelectorAll(".inv-slot").forEach((el) => {
            el.classList.remove("dragging", "drag-over");
          });
        });

        slotEl.addEventListener("mouseenter", (e) => showItemTooltip(item, e.clientX, e.clientY));
        slotEl.addEventListener("mousemove", (e) => showItemTooltip(item, e.clientX, e.clientY));
        slotEl.addEventListener("mouseleave", () => hideItemTooltip());

        if (smeltable || fuel) {
          const op = smeltable ? "INSERT_INPUT" : "INSERT_FUEL";
          slotEl.addEventListener("click", () => {
            furnaceAction(coord, op, i, 64);
          });
          slotEl.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            furnaceAction(coord, op, i, 1);
          });
        }
      }

      slotEl.addEventListener("dragover", (e) => {
        if (uiState.draggedSlotIndex !== null || uiState.draggedFurnaceSlot !== null) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          slotEl.classList.add("drag-over");
        }
      });
      slotEl.addEventListener("dragleave", (e) => {
        if (!slotEl.contains(e.relatedTarget)) {
          slotEl.classList.remove("drag-over");
        }
      });
      slotEl.addEventListener("drop", (e) => {
        e.preventDefault();
        slotEl.classList.remove("drag-over");
        if (uiState.draggedFurnaceSlot) {
          const opMap = { input: "TAKE_INPUT", fuel: "TAKE_FUEL", output: "TAKE_OUTPUT" };
          const takeOp = opMap[uiState.draggedFurnaceSlot];
          if (takeOp) furnaceAction(coord, takeOp);
          uiState.draggedFurnaceSlot = null;
          return;
        }
        const raw = e.dataTransfer.getData("text/plain");
        const fromIndex = raw !== "" ? parseInt(raw, 10) : uiState.draggedSlotIndex;
        if (fromIndex !== null && !isNaN(fromIndex) && fromIndex !== i) {
          swapInventorySlots(fromIndex, i);
        }
        uiState.draggedSlotIndex = null;
      });

      dom.furnaceInvGrid.appendChild(slotEl);
    }
  }
}
