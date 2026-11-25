import {
  getItemDefinition,
  getBlockDefinition,
  resolveSelectedVoxel,
  getAvailableVoxelActions,
} from "./engine-api.js";
import { engine, dom, layerLabels, uiState } from "./state.js";
import { updateInventoryUI } from "./inventory.js";
import { renderCraftingRecipes } from "./crafting.js";
import { interactSlot } from "./actions.js";

let lastInventorySignature = null;
let lastVoxelActionSignature = null;
let lastCraftingContextSignature = null;

function computeInventorySignature(player) {
  const slots = player.inventory
    .map((item) => (item ? `${item.id}:${item.count}` : ""))
    .join("|");
  return `${player.selectedQuickSlotIndex ?? -1}::${slots}`;
}

export function updateSelectedVoxelUI(player, room) {
  if (!player || !room || !player.selectedSlot) {
    dom.voxelTargetName.textContent = "None Selected";
    dom.voxelTargetCoords.textContent = "Coord: -";
    if (lastVoxelActionSignature !== "NONE") {
      lastVoxelActionSignature = "NONE";
      dom.voxelActionList.innerHTML = '<span class="voxel-no-action">Select a block to act</span>';
    }
    return;
  }

  const selected = resolveSelectedVoxel(room, player, player.selectedSlot);
  if (!selected) {
    dom.voxelTargetName.textContent = "Obstructed / Out of reach";
    dom.voxelTargetCoords.textContent = "Coord: -";
    if (lastVoxelActionSignature !== "OUT_OF_REACH") {
      lastVoxelActionSignature = "OUT_OF_REACH";
      dom.voxelActionList.innerHTML = '<span class="voxel-no-action">No target reachable</span>';
    }
    return;
  }

  const { coord, tile, isBoundary } = selected;
  const blockDef = getBlockDefinition(tile.id);
  const blockDisplayName = blockDef?.name ?? tile.id;
  const itemDef = getItemDefinition(tile.id);
  const icon = blockDef?.icon ?? itemDef?.icon ?? "📦";

  let growthText = "";
  if (tile.type === "crop" || blockDef?.isCrop) {
    const growthTicks = tile.metadata?.growthTicks || 0;
    const maxTicks = blockDef?.maxGrowthTicks || 1200;
    const pct = Math.min(100, Math.floor((growthTicks / maxTicks) * 100));
    growthText = ` [${pct}%]`;
  }

  dom.voxelTargetName.innerHTML = `<span>${icon}</span> <span>${blockDisplayName}${growthText}</span>`;
  dom.voxelTargetCoords.textContent = `(${coord.x}, ${coord.y}, ${coord.z})${isBoundary ? " [Perimeter Wall]" : ""}`;

  const actions = getAvailableVoxelActions(tile, isBoundary, player, coord, selected.isInBounds);
  const actionSig = `${player.selectedSlot}:${coord.x},${coord.y},${coord.z}:${tile.id}:${actions
    .map((a) => `${a.id}:${a.label}:${a.buttonType}`)
    .join(",")}`;
  if (actionSig === lastVoxelActionSignature) {
    return;
  }
  lastVoxelActionSignature = actionSig;
  dom.voxelActionList.innerHTML = "";

  if (actions.length === 0) {
    const noAct = document.createElement("span");
    noAct.className = "voxel-no-action";
    noAct.textContent = tile.id === "minecraft:air" ? "Empty Air (No Actions)" : "No Actions Available";
    dom.voxelActionList.appendChild(noAct);
    return;
  }

  for (const act of actions) {
    const btn = document.createElement("button");
    btn.className = "voxel-action-btn";
    btn.innerHTML = `
      <span>${act.icon || "⚡"} ${act.label}</span>
      <span style="font-size: 9px; opacity: 0.7;">[${act.buttonType === "PRIMARY" ? "L-Click" : "R-Click"}]</span>
    `;
    btn.title = act.description || act.label;
    btn.addEventListener("click", () => {
      interactSlot(player.selectedSlot, act.buttonType);
    });
    dom.voxelActionList.appendChild(btn);
  }
}

export function updateHUD() {
  const p = engine.players.get(0);
  if (!p) return;

  const room = engine.rooms.get(p.currentRoomId);
  dom.hudRoomName.textContent = room ? room.name : p.currentRoomId;
  dom.hudCoords.textContent = `(${p.x}, ${p.y}, ${p.z})`;
  dom.hudLayerName.textContent = layerLabels[p.selectedLayerIndex] || `L${p.selectedLayerIndex}`;

  // Layer selection buttons state
  dom.layerButtons.forEach((btn, idx) => {
    if (btn) {
      if (idx === p.selectedLayerIndex) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    }
  });

  // Health and Hunger display
  const heartsCount = Math.ceil(p.health / 2);
  let heartsHtml = "";
  for (let i = 0; i < 10; i++) {
    heartsHtml += `<span class="icon-heart" style="opacity: ${i < heartsCount ? 1 : 0.25}">❤</span>`;
  }
  dom.hudHearts.innerHTML = heartsHtml;

  const hungerCount = Math.ceil(p.hunger / 2);
  let hungerHtml = "";
  for (let i = 0; i < 10; i++) {
    hungerHtml += `<span class="icon-hunger" style="opacity: ${i < hungerCount ? 1 : 0.25}">🍗</span>`;
  }
  dom.hudHunger.innerHTML = hungerHtml;

  // Update Inventory only when items or quick selection changed (preserves drag/hover state on 20 Hz ticks)
  const invSig = computeInventorySignature(p);
  if (invSig !== lastInventorySignature) {
    lastInventorySignature = invSig;
    updateInventoryUI(p);
  }

  // Refresh Crafting Panel when open if inventory, player position, or room changed
  if (uiState.isCraftingOpen) {
    const craftSig = `${invSig}@${p.currentRoomId}:${p.x},${p.y},${p.z}`;
    if (craftSig !== lastCraftingContextSignature) {
      lastCraftingContextSignature = craftSig;
      renderCraftingRecipes();
    }
  } else {
    lastCraftingContextSignature = null;
  }

  // Update Squat button state & progress
  if (dom.btnSquat) {
    if (p.isSneaking) {
      const pct = Math.min(100, Math.floor(((p.sneakTimer || 0) / 100) * 100));
      dom.btnSquat.classList.add("active");
      dom.btnSquat.textContent = `🧎 Squatting (${pct}%)`;
    } else {
      dom.btnSquat.classList.remove("active");
      dom.btnSquat.textContent = "🧎 Squat [Shift]";
    }
  }

  // Show Eat button when an edible item is equipped
  if (dom.btnEat) {
    const equippedDef = p.equippedItem ? getItemDefinition(p.equippedItem) : null;
    if (equippedDef?.edible) {
      dom.btnEat.style.display = "flex";
      dom.btnEat.textContent = `🍽 Eat ${equippedDef.name} [F]`;
    } else {
      dom.btnEat.style.display = "none";
    }
  }

  // Render active status effect pills & viewport effect classes
  const effects = p.effects || [];
  if (dom.hudEffects) {
    const effectLabels = {
      nausea: "🤢 Nausea",
      blindness: "🕶 Blindness",
      night_vision: "👁 Night Vision",
      saturation: "✨ Saturation",
    };
    dom.hudEffects.innerHTML = effects
      .map((eff) => {
        const secs = Math.ceil(eff.remainingTicks / 20);
        const label = effectLabels[eff.id] || eff.id;
        return `<span class="effect-pill effect-${eff.id}">${label} ${secs}s</span>`;
      })
      .join("");
  }

  if (dom.gameContainer) {
    const activeIds = new Set(effects.map((e) => e.id));
    dom.gameContainer.classList.toggle("effect-nausea", activeIds.has("nausea"));
    dom.gameContainer.classList.toggle("effect-blindness", activeIds.has("blindness"));
    dom.gameContainer.classList.toggle("effect-night-vision", activeIds.has("night_vision"));
  }

  // Reticle center button disabled for body layers (1 and 2)
  const reticleCenter = document.getElementById("reticle-slot-5");
  if (reticleCenter) {
    if (p.selectedLayerIndex === 1 || p.selectedLayerIndex === 2) {
      reticleCenter.setAttribute("disabled", "true");
      reticleCenter.style.opacity = "0.3";
    } else {
      reticleCenter.removeAttribute("disabled");
      reticleCenter.style.opacity = "1";
    }
  }

  // Update reticle buttons selected state
  document.querySelectorAll(".reticle-cell").forEach((cell) => {
    const slot = parseInt(cell.getAttribute("data-slot"), 10);
    if (p.selectedSlot && slot === p.selectedSlot) {
      cell.classList.add("selected");
    } else {
      cell.classList.remove("selected");
    }
  });

  // Update Selected Voxel Action UI Component
  updateSelectedVoxelUI(p, room);

  if (p.currentRoomId === "outer_room") {
    dom.hudQuestTitle.textContent = "Quest #142: Stuck in a hole";
    dom.hudQuestDesc.textContent =
      "Walk onto the embedded Compact Machine block (1, 0) and activate the Personal Shrinking Device to enter!";
  } else {
    dom.hudQuestTitle.textContent = "Quest #68: The beginning?";
    dom.hudQuestDesc.textContent =
      "Inside the 3x3 Tiny Compact Machine! Punch the side walls (Numpad 1-9) to gather dirt dust, or use PSD to exit.";
  }
}
