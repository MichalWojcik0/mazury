import { dom, uiState, arrowVisibleUntil, arrowHideTimeouts } from "./state.js";
import { getItemDisplay, showItemTooltip, hideItemTooltip } from "./tooltip.js";
import {
  moveItemToTop,
  moveItemToBottom,
  swapInventorySlots,
  selectQuickSlot,
} from "./actions.js";

function renderInventorySlot(item, slotIndex, isSelected, showArrows = true, containerType = "quick") {
  const display = item ? getItemDisplay(item.id) : null;
  const title = item ? `${display.name} (${item.count})` : `Slot ${slotIndex + 1} (Empty)`;
  const slotKey = `${containerType}-${slotIndex}`;

  const slotEl = document.createElement("div");
  slotEl.className = `inv-slot ${isSelected ? "selected" : ""}`;
  slotEl.title = title;
  slotEl.setAttribute("data-slot-index", slotIndex);

  const indexLabel = document.createElement("span");
  indexLabel.className = "inv-slot-index";
  indexLabel.textContent = slotIndex + 1;
  slotEl.appendChild(indexLabel);

  if (item) {
    const iconEl = document.createElement("span");
    iconEl.className = "inv-slot-icon";
    if (display.def && display.def.textureDataUrl) {
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

    if (showArrows) {
      // Hover arrow container
      const arrowsEl = document.createElement("div");
      arrowsEl.className = "slot-arrows";

      // If previously scheduled to stay visible within the 1-second delay, mark as visible
      const until = arrowVisibleUntil.get(slotKey);
      if (until && until > Date.now()) {
        arrowsEl.classList.add("visible");
        // Setup timer to remove visible class once elapsed
        const remaining = until - Date.now();
        const existingTimeout = arrowHideTimeouts.get(slotKey);
        if (existingTimeout) clearTimeout(existingTimeout);
        const timeout = setTimeout(() => {
          arrowsEl.classList.remove("visible");
          arrowVisibleUntil.delete(slotKey);
          arrowHideTimeouts.delete(slotKey);
        }, remaining);
        arrowHideTimeouts.set(slotKey, timeout);
      }

      // Arrow to move to top
      const topBtn = document.createElement("button");
      topBtn.className = "arrow-btn";
      topBtn.title = "Move to Top (Slot 1)";
      topBtn.textContent = "▲";
      topBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        moveItemToTop(slotIndex);
      });
      arrowsEl.appendChild(topBtn);

      // Arrow to move to bottom
      const bottomBtn = document.createElement("button");
      bottomBtn.className = "arrow-btn";
      bottomBtn.title = "Move to Bottom";
      bottomBtn.textContent = "▼";
      bottomBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        moveItemToBottom(slotIndex);
      });
      arrowsEl.appendChild(bottomBtn);

      slotEl.appendChild(arrowsEl);

      const showArrowsWithPersistence = () => {
        const existingTimeout = arrowHideTimeouts.get(slotKey);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
          arrowHideTimeouts.delete(slotKey);
        }
        arrowVisibleUntil.delete(slotKey);
        arrowsEl.classList.add("visible");
      };

      const scheduleHideArrows = () => {
        const hideDelay = 1000;
        arrowVisibleUntil.set(slotKey, Date.now() + hideDelay);
        const existingTimeout = arrowHideTimeouts.get(slotKey);
        if (existingTimeout) clearTimeout(existingTimeout);
        const timeout = setTimeout(() => {
          arrowsEl.classList.remove("visible");
          arrowVisibleUntil.delete(slotKey);
          arrowHideTimeouts.delete(slotKey);
        }, hideDelay);
        arrowHideTimeouts.set(slotKey, timeout);
      };

      slotEl.addEventListener("mouseenter", showArrowsWithPersistence);
      slotEl.addEventListener("mouseleave", scheduleHideArrows);
    }
  }

  // Drag and drop event listeners
  if (item) {
    slotEl.setAttribute("draggable", "true");

    slotEl.addEventListener("dragstart", (e) => {
      uiState.draggedSlotIndex = slotIndex;
      slotEl.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(slotIndex));
    });

    slotEl.addEventListener("dragend", () => {
      uiState.draggedSlotIndex = null;
      document.querySelectorAll(".inv-slot").forEach((el) => {
        el.classList.remove("dragging", "drag-over");
      });
    });
  }

  slotEl.addEventListener("dragover", (e) => {
    if (uiState.draggedSlotIndex !== null) {
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
    const rawIndex = e.dataTransfer.getData("text/plain");
    const fromIndex = rawIndex !== "" ? parseInt(rawIndex, 10) : uiState.draggedSlotIndex;

    if (fromIndex !== null && !isNaN(fromIndex) && fromIndex !== slotIndex) {
      swapInventorySlots(fromIndex, slotIndex);
    }
    uiState.draggedSlotIndex = null;
  });

  // Tooltip hover handlers
  if (item) {
    slotEl.addEventListener("mouseenter", (e) => {
      showItemTooltip(item, e.clientX, e.clientY);
    });
    slotEl.addEventListener("mousemove", (e) => {
      showItemTooltip(item, e.clientX, e.clientY);
    });
    slotEl.addEventListener("mouseleave", () => {
      hideItemTooltip();
    });
  }

  slotEl.addEventListener("click", () => {
    if (slotIndex < 9) {
      selectQuickSlot(slotIndex);
    }
  });

  return slotEl;
}

function cleanupStaleArrowTimers() {
  const now = Date.now();
  for (const [key, until] of arrowVisibleUntil.entries()) {
    if (until <= now) {
      arrowVisibleUntil.delete(key);
      const t = arrowHideTimeouts.get(key);
      if (t) {
        clearTimeout(t);
        arrowHideTimeouts.delete(key);
      }
    }
  }
}

function renderSlotContainer(containerEl, count, player, containerType) {
  containerEl.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const item = player.inventory[i];
    const isSelected = player.selectedQuickSlotIndex === i;
    const slotEl = renderInventorySlot(item, i, isSelected, true, containerType);
    containerEl.appendChild(slotEl);
  }
}

export function updateInventoryUI(player) {
  if (!player) return;

  cleanupStaleArrowTimers();

  // 1. Render Top 9 Quick Slots
  renderSlotContainer(dom.hudQuickInventory, 9, player, "quick");

  // 2. Render Full 36 Slots (when drawer is visible or updating)
  renderSlotContainer(dom.grid36Slots, 36, player, "drawer");
}

export function toggleInventoryDrawer(open) {
  uiState.isInventoryDrawerOpen = open !== undefined ? open : !uiState.isInventoryDrawerOpen;
  if (uiState.isInventoryDrawerOpen) {
    dom.fullInvDrawer.classList.add("open");
    dom.btnToggleInv.textContent = "✕ Close [E]";
  } else {
    dom.fullInvDrawer.classList.remove("open");
    dom.btnToggleInv.textContent = "📦 Full Inventory [E]";
  }
}
