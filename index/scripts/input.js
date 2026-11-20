import { screenToWorld, hitTestBoundaryWallFace } from "./engine-api.js";
import { engine, renderer, canvas, dom } from "./state.js";
import { toggleInventoryDrawer } from "./inventory.js";
import { toggleCraftingPanel } from "./crafting.js";
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
  window.addEventListener("keydown", (e) => {
    const p = engine.players.get(0);
    if (e.key === "Shift") {
      if (!e.repeat) {
        isShiftHeld = true;
        startSneak();
      }
      e.preventDefault();
      return;
    }
    switch (e.key) {
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
    const slot = getSlotFromCanvasEvent(e);
    if (slot) {
      selectSlot(slot);
      interactSlot(slot, "SECONDARY");
    }
  });
}
