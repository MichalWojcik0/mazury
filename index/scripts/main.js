import { resolveTargetCoord } from "./engine-api.js";
import { engine, renderer, canvas, ctx } from "./state.js";
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
} from "./actions.js";
import { toggleInventoryDrawer } from "./inventory.js";
import { toggleCraftingPanel, craftRecipe } from "./crafting.js";
import { updateHUD } from "./hud.js";
import { bindInputHandlers } from "./input.js";

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

// 20 Hz deterministic simulation loop (50 ms per tick)
setInterval(() => {
  engine.stepTick();
  updateHUD();
}, 50);

// Render loop
function renderLoop() {
  const p = engine.players.get(0);
  const room = p ? engine.rooms.get(p.currentRoomId) : undefined;

  const logicalW = canvas.clientWidth;
  const logicalH = canvas.clientHeight;

  ctx.clearRect(0, 0, logicalW, logicalH);

  if (room && p) {
    // Auto-center camera for current room
    renderer.centerOnRoom(room, logicalW, logicalH);

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
