import {
  screenToWorld,
  hitTestBoundaryWallFace,
  isPointInPlayArea,
  clampCameraPan,
  getItemDefinition,
  resolveSelectedVoxel,
  isFurnaceFuel,
  isSmeltable,
  getFurnaceState,
} from "./engine-api.js";
import { engine, renderer, canvas, dom, cameraState } from "./state.js";
import { toggleInventoryDrawer } from "./inventory.js";
import { toggleCraftingPanel } from "./crafting.js";
import { openFurnacePanel, closeFurnacePanel } from "./furnace.js";
import { saveGame, resetSave } from "./storage.js";
import { updateHUD, updateZoomUI } from "./hud.js";
import {
  selectLayer,
  selectQuickSlot,
  interactSlot,
  movePlayer,
  usePSD,
  selectSlot,
  startSneak,
  stopSneak,
  toggleSneak,
  eatEquippedItem,
} from "./actions.js";

// Direct Canvas Interaction: unproject screen coordinates to active layer tile slot
function getSlotFromCanvasEvent(e) {
  const p = engine.players.get(0);
  if (!p) return null;
  const room = engine.rooms.get(p.currentRoomId);
  if (!room) return null;

  const rect = canvas.getBoundingClientRect();
  const cursorX = e.clientX - rect.left;
  const cursorY = e.clientY - rect.top;

  // Active layer Z in world space
  const targetZ = p.z + p.selectedLayerIndex - 1;
  const worldPos = screenToWorld(cursorX, cursorY, targetZ, renderer.camera);
  let targetX = Math.round(worldPos.x);
  let targetY = Math.round(worldPos.y);

  // Hit-test visible NORTH (y = -1) and WEST (x = -1) boundary wall side faces on the active layer
  if (room.faces && targetZ >= 1 && targetZ <= room.depth) {
    const interiorTile =
      targetX >= 0 &&
      targetX < room.width &&
      targetY >= 0 &&
      targetY < room.height &&
      targetZ < room.depth
        ? room.voxels[targetZ]?.[targetY]?.[targetX]
        : null;
    const hasBlockingInteriorTile = interiorTile && interiorTile.id !== "minecraft:air";

    if (!hasBlockingInteriorTile) {
      const wallCoord = hitTestBoundaryWallFace(
        cursorX,
        cursorY,
        targetZ,
        room.width,
        room.height,
        renderer.camera
      );
      if (wallCoord) {
        targetX = wallCoord.x;
        targetY = wallCoord.y;
      }
    }
  }

  const dx = targetX - p.x;
  const dy = targetY - p.y;

  // Map (dx, dy) within 1-block reach to numpad slot (1..9)
  const deltaToSlot = {
    "-1,-1": 7,
    "0,-1": 8,
    "1,-1": 9,
    "-1,0": 4,
    "0,0": 5,
    "1,0": 6,
    "-1,1": 1,
    "0,1": 2,
    "1,1": 3,
  };

  const key = `${dx},${dy}`;
  return deltaToSlot[key] || null;
}

const ZOOM_STEP = 0.2;

export function setPlayAreaZoom(nextZoom) {
  const rounded = Math.round(nextZoom * 100) / 100;
  cameraState.zoom = Math.max(
    cameraState.minZoom,
    Math.min(cameraState.maxZoom, rounded)
  );
  updateZoomUI();
}

export function resetPlayAreaZoom() {
  cameraState.zoom = 1.0;
  cameraState.panX = 0;
  cameraState.panY = 0;
  updateZoomUI();
}

export function bindInputHandlers() {
  // Inventory & crafting drawer toggle bindings
  dom.btnToggleInv.addEventListener("click", () => toggleInventoryDrawer());
  dom.btnCloseFullInv.addEventListener("click", () => toggleInventoryDrawer(false));
  dom.btnToggleCrafting.addEventListener("click", () => toggleCraftingPanel());
  dom.btnCloseCrafting.addEventListener("click", () => toggleCraftingPanel(false));

  // Layer selector button click bindings
  dom.layerButtons.forEach((btn, idx) => {
    if (btn) {
      btn.addEventListener("click", () => selectLayer(idx));
    }
  });

  // Aux Reticle click and hover preview bindings
  document.querySelectorAll(".reticle-cell").forEach((cell) => {
    cell.addEventListener("mouseenter", () => {
      const slot = parseInt(cell.getAttribute("data-slot"), 10);
      if (slot) selectSlot(slot);
    });
    cell.addEventListener("click", () => {
      const slot = parseInt(cell.getAttribute("data-slot"), 10);
      if (slot) {
        selectSlot(slot);
        interactSlot(slot, "PRIMARY");
      }
    });
    cell.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      const slot = parseInt(cell.getAttribute("data-slot"), 10);
      if (slot) {
        selectSlot(slot);
        interactSlot(slot, "SECONDARY");
      }
    });
  });

  // Keyboard handlers
  let isShiftHeld = false;
  let isMiddleDragging = false;
  let lastDragX = 0;
  let lastDragY = 0;

  window.addEventListener("keydown", (e) => {
    const p = engine.players.get(0);
    if (e.key === "Shift") {
      if (!e.repeat && !isMiddleDragging) {
        isShiftHeld = true;
        startSneak();
      }
      e.preventDefault();
      return;
    }
    switch (e.key) {
      case "Escape":
        closeFurnacePanel();
        break;
      case "ArrowUp":
      case "w":
      case "W":
        movePlayer(0, -1);
        e.preventDefault();
        break;
      case "ArrowDown":
      case "s":
      case "S":
        movePlayer(0, 1);
        e.preventDefault();
        break;
      case "ArrowLeft":
      case "a":
      case "A":
        movePlayer(-1, 0);
        e.preventDefault();
        break;
      case "ArrowRight":
      case "d":
      case "D":
        movePlayer(1, 0);
        e.preventDefault();
        break;
      case "e":
      case "E":
        toggleInventoryDrawer();
        e.preventDefault();
        break;
      case "c":
      case "C":
        toggleCraftingPanel();
        e.preventDefault();
        break;
      case "f":
      case "F":
        eatEquippedItem();
        e.preventDefault();
        break;
      case "p":
      case "P":
      case " ":
        usePSD();
        e.preventDefault();
        break;
      case "F1":
        selectLayer(0);
        e.preventDefault();
        break;
      case "F2":
        selectLayer(1);
        e.preventDefault();
        break;
      case "F3":
        selectLayer(2);
        e.preventDefault();
        break;
      case "F4":
        selectLayer(3);
        e.preventDefault();
        break;
      case "[":
        if (p) selectLayer(Math.max(0, p.selectedLayerIndex - 1));
        e.preventDefault();
        break;
      case "]":
        if (p) selectLayer(Math.min(3, p.selectedLayerIndex + 1));
        e.preventDefault();
        break;
      case "+":
      case "=":
        setPlayAreaZoom(cameraState.zoom + ZOOM_STEP);
        e.preventDefault();
        break;
      case "-":
      case "_":
        setPlayAreaZoom(cameraState.zoom - ZOOM_STEP);
        e.preventDefault();
        break;
      case "0":
        resetPlayAreaZoom();
        e.preventDefault();
        break;
      case "1":
      case "2":
      case "3":
      case "4":
      case "5":
      case "6":
      case "7":
      case "8":
      case "9": {
        const slot = parseInt(e.key, 10);
        if (e.code.startsWith("Numpad") || e.location === 3) {
          selectSlot(slot);
          interactSlot(slot);
          e.preventDefault();
        } else {
          // Quick select hotbar slot 0..8
          selectQuickSlot(slot - 1);
        }
        break;
      }
    }
  });

  window.addEventListener("keyup", (e) => {
    if (e.key === "Shift") {
      isShiftHeld = false;
      stopSneak();
      e.preventDefault();
    }
  });

  window.addEventListener("blur", () => {
    if (isShiftHeld) {
      isShiftHeld = false;
      stopSneak();
    }
    isMiddleDragging = false;
  });

  // Helper: check if a mouse event is pointing inside the room play area
  const isEventInPlayArea = (e) => {
    const p = engine.players.get(0);
    const room = p ? engine.rooms.get(p.currentRoomId) : null;
    if (!room) return false;
    const rect = canvas.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;
    return isPointInPlayArea(
      cursorX,
      cursorY,
      room.width,
      room.height,
      room.depth,
      Boolean(room.faces),
      renderer.camera
    );
  };

  // Scroll wheel: over play area -> change layer; pointing nowhere -> change hotbar item
  window.addEventListener(
    "wheel",
    (e) => {
      if (e.target && e.target.closest?.(".crafting-panel, .full-inventory-drawer, .furnace-panel")) {
        return; // Allow scrolling inside crafting/inventory panels
      }
      const p = engine.players.get(0);
      if (!p || e.deltaY === 0) return;

      e.preventDefault();
      const dir = e.deltaY > 0 ? 1 : -1;

      if (isEventInPlayArea(e)) {
        // Scroll up (dir = -1) -> higher layer; scroll down (dir = +1) -> lower layer
        const nextLayer = Math.max(0, Math.min(3, p.selectedLayerIndex - dir));
        if (nextLayer !== p.selectedLayerIndex) {
          selectLayer(nextLayer);
        }
      } else {
        // Pointing nowhere -> cycle quick hotbar slot 0..8
        const currentQuick = p.selectedQuickSlotIndex ?? 0;
        const nextQuick = (currentQuick + dir + 9) % 9;
        selectQuickSlot(nextQuick);
      }
    },
    { passive: false }
  );

  // Middle-click drag on play area: pan (clamped within view), or Shift + middle-click drag: zoom
  canvas.addEventListener("mousedown", (e) => {
    if (e.button !== 1) return;
    if (!e.shiftKey && !isEventInPlayArea(e)) return;

    e.preventDefault();
    isMiddleDragging = true;
    lastDragX = e.clientX;
    lastDragY = e.clientY;
    if (isShiftHeld) {
      isShiftHeld = false;
      stopSneak();
    }
  });

  window.addEventListener("mousemove", (e) => {
    if (!isMiddleDragging) return;
    const dx = e.clientX - lastDragX;
    const dy = e.clientY - lastDragY;
    lastDragX = e.clientX;
    lastDragY = e.clientY;

    if (e.shiftKey) {
      // Shift + middle-click drag: drag up zooms in, drag down zooms out
      const factor = Math.exp(-dy * 0.008);
      cameraState.zoom = Math.max(
        cameraState.minZoom,
        Math.min(cameraState.maxZoom, cameraState.zoom * factor)
      );
      updateZoomUI();
      return;
    }

    const p = engine.players.get(0);
    const room = p ? engine.rooms.get(p.currentRoomId) : null;
    if (!room) return;

    const clamped = clampCameraPan(
      cameraState.panX + dx,
      cameraState.panY + dy,
      room.width,
      room.height,
      room.depth,
      canvas.clientWidth,
      canvas.clientHeight,
      renderer.camera
    );
    cameraState.panX = clamped.panX;
    cameraState.panY = clamped.panY;
  });

  window.addEventListener("mouseup", (e) => {
    if (e.button === 1) {
      isMiddleDragging = false;
    }
  });

  // Button controls
  document.getElementById("btn-up").addEventListener("click", () => movePlayer(0, -1));
  document.getElementById("btn-down").addEventListener("click", () => movePlayer(0, 1));
  document.getElementById("btn-left").addEventListener("click", () => movePlayer(-1, 0));
  document.getElementById("btn-right").addEventListener("click", () => movePlayer(1, 0));
  document.getElementById("btn-use-psd").addEventListener("click", () => usePSD());
  if (dom.btnSquat) {
    dom.btnSquat.addEventListener("click", () => toggleSneak());
  }
  if (dom.btnEat) {
    dom.btnEat.addEventListener("click", () => eatEquippedItem());
  }
  if (dom.btnZoomIn) {
    dom.btnZoomIn.addEventListener("click", () => setPlayAreaZoom(cameraState.zoom + ZOOM_STEP));
  }
  if (dom.btnZoomOut) {
    dom.btnZoomOut.addEventListener("click", () => setPlayAreaZoom(cameraState.zoom - ZOOM_STEP));
  }
  if (dom.btnZoomReset) {
    dom.btnZoomReset.addEventListener("click", () => resetPlayAreaZoom());
  }
  if (dom.btnSaveGame) {
    dom.btnSaveGame.addEventListener("click", () => saveGame(false));
  }
  if (dom.btnResetSave) {
    dom.btnResetSave.addEventListener("click", () => {
      if (window.confirm("Reset your local save and start a new game?")) {
        resetSave(updateHUD);
      }
    });
  }

  // Canvas pointer controls
  canvas.addEventListener("mousemove", (e) => {
    const slot = getSlotFromCanvasEvent(e);
    if (slot) {
      selectSlot(slot);
    }
  });

  canvas.addEventListener("click", (e) => {
    const slot = getSlotFromCanvasEvent(e);
    if (slot) {
      selectSlot(slot);
      interactSlot(slot, "PRIMARY");
    }
  });

  canvas.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    const p = engine.players.get(0);
    const equippedDef = p?.equippedItem ? getItemDefinition(p.equippedItem) : null;
    if (equippedDef?.edible) {
      eatEquippedItem();
      return;
    }
    const slot = getSlotFromCanvasEvent(e);
    if (slot) {
      selectSlot(slot);
      const room = p ? engine.rooms.get(p.currentRoomId) : null;
      const selected = p && room ? resolveSelectedVoxel(room, p, slot) : null;
      if (selected && selected.isInBounds && selected.tile.id === "minecraft:furnace") {
        const fState = getFurnaceState(selected.tile);
        const equipped = p.equippedItem;
        const willQuickInteract =
          (fState.outputItem && fState.outputCount > 0) ||
          (equipped && (isFurnaceFuel(equipped) || isSmeltable(equipped)));
        if (!willQuickInteract) {
          openFurnacePanel(selected.coord);
          return;
        }
      }
      interactSlot(slot, "SECONDARY");
    }
  });
}
