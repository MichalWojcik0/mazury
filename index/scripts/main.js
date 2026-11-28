import { resolveTargetCoord, clampCameraPan } from "./engine-api.js";
import { engine, renderer, canvas, ctx, cameraState } from "./state.js";
import {
  setOnActionComplete,
  selectLayer,
  swapInventorySlots,
  selectQuickSlot,
  moveItemToTop,
  moveItemToBottom,
  interactSlot,
  movePlayer,
  usePSD,
  selectSlot,
  startSneak,
  stopSneak,
  toggleSneak,
  eatEquippedItem,
} from "./actions.js";
import { toggleInventoryDrawer } from "./inventory.js";
import { toggleCraftingPanel, craftRecipe } from "./crafting.js";
import { updateHUD } from "./hud.js";
import { bindInputHandlers, setPlayAreaZoom, resetPlayAreaZoom } from "./input.js";
import { saveGame, loadSavedGame, resetSave } from "./storage.js";

function resizeCanvas() {
  canvas.width = canvas.clientWidth * window.devicePixelRatio;
  canvas.height = canvas.clientHeight * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

setOnActionComplete(updateHUD);
bindInputHandlers();

// Expose engine to window for testing / automated inspection
window.__gameEngine = engine;
window.__movePlayer = movePlayer;
window.__usePSD = usePSD;
window.__selectLayer = selectLayer;
window.__selectSlot = selectSlot;
window.__interactSlot = interactSlot;
window.__selectQuickSlot = selectQuickSlot;
window.__moveItemToTop = moveItemToTop;
window.__moveItemToBottom = moveItemToBottom;
window.__swapInventorySlots = swapInventorySlots;
window.__toggleInventoryDrawer = toggleInventoryDrawer;
window.__toggleCraftingPanel = toggleCraftingPanel;
window.__craftRecipe = craftRecipe;
window.__startSneak = startSneak;
window.__stopSneak = stopSneak;
window.__toggleSneak = toggleSneak;
window.__eatItem = eatEquippedItem;
window.__saveGame = saveGame;
window.__loadGame = loadSavedGame;
window.__resetSave = () => resetSave(updateHUD);
window.__setZoom = setPlayAreaZoom;
window.__resetZoom = resetPlayAreaZoom;

// Load existing local save on startup (if available)
loadSavedGame();

// Auto-save on page unload / tab hide
window.addEventListener("beforeunload", () => saveGame(true));
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    saveGame(true);
  }
});

// 20 Hz deterministic simulation loop (50 ms per tick) + auto-save every 5s (100 ticks)
let ticksSinceAutoSave = 0;
setInterval(() => {
  engine.stepTick();
  updateHUD();
  ticksSinceAutoSave++;
  if (ticksSinceAutoSave >= 100) {
    ticksSinceAutoSave = 0;
    saveGame(true);
  }
}, 50);

// Render loop
function renderLoop() {
  const p = engine.players.get(0);
  const room = p ? engine.rooms.get(p.currentRoomId) : undefined;

  const logicalW = canvas.clientWidth;
  const logicalH = canvas.clientHeight;

  ctx.clearRect(0, 0, logicalW, logicalH);

  if (room && p) {
    // Reset pan when entering/exiting a room
    if (cameraState.lastRoomId !== room.id) {
      cameraState.lastRoomId = room.id;
      cameraState.panX = 0;
      cameraState.panY = 0;
    }

    // Apply zoom and center camera for current room, then apply clamped pan offset
    renderer.camera.zoom = cameraState.zoom;
    renderer.centerOnRoom(room, logicalW, logicalH);
    const clamped = clampCameraPan(
      cameraState.panX,
      cameraState.panY,
      room.width,
      room.height,
      room.depth,
      logicalW,
      logicalH,
      renderer.camera
    );
    cameraState.panX = clamped.panX;
    cameraState.panY = clamped.panY;
    renderer.camera.offsetX += cameraState.panX;
    renderer.camera.offsetY += cameraState.panY;

    // Active layer Z elevation in world space (player.z + selectedLayerIndex - 1)
    const selectedLayerZ = p.z + p.selectedLayerIndex - 1;

    // Targeted block coordinate if a slot is selected
    let highlightCoord = null;
    if (p.selectedSlot) {
      highlightCoord = resolveTargetCoord(p, p.selectedSlot);
    }

    renderer.render(room, engine.players.values(), ctx, {
      enableCutaway: true,
      selectedLayerZ,
      showLayerOutline: true,
      highlightCoord,
    });
  }

  requestAnimationFrame(renderLoop);
}

updateHUD();
requestAnimationFrame(renderLoop);
