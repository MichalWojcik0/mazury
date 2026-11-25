import {
  CHAPTER_1_RECIPES,
  hasCraftingStationAccess,
  buildRecipeGroups,
  countItem,
} from "./engine-api.js";
import { engine, dom, uiState, HIDDEN_RECIPES_STORAGE_KEY } from "./state.js";
import { getItemDisplay } from "./tooltip.js";
import { craftRecipeAction } from "./actions.js";

let controlsBound = false;

function bindCraftingControlsOnce() {
  if (controlsBound) return;
  controlsBound = true;

  if (dom.btnToggleDualCrafting) {
    dom.btnToggleDualCrafting.addEventListener("click", () => {
      toggleDualCrafting();
    });
  }

  dom.craftingPanes.forEach((paneDom, idx) => {
    const cfg = uiState.craftingPaneConfigs[idx];
    if (paneDom.filterEl) {
      paneDom.filterEl.value = cfg.filter;
      paneDom.filterEl.addEventListener("change", () => {
        cfg.filter = paneDom.filterEl.value;
        renderCraftingRecipes();
      });
    }
    if (paneDom.groupEl) {
      paneDom.groupEl.value = cfg.groupBy;
      paneDom.groupEl.addEventListener("change", () => {
        cfg.groupBy = paneDom.groupEl.value;
        renderCraftingRecipes();
      });
    }
    if (paneDom.sortEl) {
      paneDom.sortEl.value = cfg.sortBy;
      paneDom.sortEl.addEventListener("change", () => {
        cfg.sortBy = paneDom.sortEl.value;
        renderCraftingRecipes();
      });
    }
  });
}

export function toggleDualCrafting(open) {
  uiState.isDualCraftingOpen =
    open !== undefined ? open : !uiState.isDualCraftingOpen;
  if (uiState.isDualCraftingOpen) {
    dom.craftingPanel.classList.add("dual");
    dom.btnToggleDualCrafting?.classList.add("active");
    if (dom.btnToggleDualCrafting) dom.btnToggleDualCrafting.textContent = "⇄ 1 List";
  } else {
    dom.craftingPanel.classList.remove("dual");
    dom.btnToggleDualCrafting?.classList.remove("active");
    if (dom.btnToggleDualCrafting) dom.btnToggleDualCrafting.textContent = "⇄ 2 Lists";
  }
  if (uiState.isCraftingOpen) {
    renderCraftingRecipes();
  }
}

export function toggleCraftingPanel(open) {
  bindCraftingControlsOnce();
  uiState.isCraftingOpen = open !== undefined ? open : !uiState.isCraftingOpen;
  if (uiState.isCraftingOpen) {
    dom.craftingPanel.classList.add("open");
    dom.btnToggleCrafting.textContent = "✕ Close [C]";
    renderCraftingRecipes();
  } else {
    dom.craftingPanel.classList.remove("open");
    dom.btnToggleCrafting.textContent = "🔨 Crafting [C]";
  }
}

function toggleRecipeHidden(recipeId) {
  if (uiState.hiddenRecipeIds.has(recipeId)) {
    uiState.hiddenRecipeIds.delete(recipeId);
  } else {
    uiState.hiddenRecipeIds.add(recipeId);
  }
  try {
    localStorage.setItem(
      HIDDEN_RECIPES_STORAGE_KEY,
      JSON.stringify(Array.from(uiState.hiddenRecipeIds))
    );
  } catch {
    // Ignore storage quota errors
  }
  renderCraftingRecipes();
}

function renderRecipePane(paneDom, config, player, hasStation) {
  if (!paneDom?.listEl) return;
  const groups = buildRecipeGroups(
    CHAPTER_1_RECIPES,
    player.inventory,
    hasStation,
    { ...config, hiddenRecipeIds: uiState.hiddenRecipeIds }
  );

  paneDom.listEl.innerHTML = "";

  if (groups.length === 0) {
    const empty = document.createElement("div");
    empty.className = "craft-empty-state";
    empty.textContent = "No matching recipes";
    paneDom.listEl.appendChild(empty);
    return;
  }

  for (const group of groups) {
    if (config.groupBy !== "none") {
      const header = document.createElement("div");
      header.className = "craft-group-header";
      header.innerHTML = `<span>${group.label}</span><span class="craft-group-count">${group.items.length}</span>`;
      paneDom.listEl.appendChild(header);
    }

    for (const { recipe, status } of group.items) {
      const btn = document.createElement("button");
      btn.className = `craft-btn ${status.craftable ? "craftable" : ""}`;
      btn.disabled = !status.craftable;

      const primaryOutput = recipe.outputs[0];
      const outDisplay = primaryOutput ? getItemDisplay(primaryOutput.itemId) : null;
      const outIconHtml = outDisplay?.def?.textureDataUrl
        ? `<img src="${outDisplay.def.textureDataUrl}" alt="${recipe.name}" />`
        : `<span>${outDisplay?.icon || "🔨"}</span>`;
      const outQty = primaryOutput && primaryOutput.count > 1 ? ` ×${primaryOutput.count}` : "";

      let badgeHtml = "";
      if (status.craftable) {
        badgeHtml = `<span class="craft-badge craft-badge-ready">×${status.maxCraftableCount} ready</span>`;
      } else if (status.inventoryFull) {
        badgeHtml = `<span class="craft-badge craft-badge-full">Inv Full</span>`;
      } else if (status.missingStation) {
        badgeHtml = `<span class="craft-badge craft-badge-station">Needs Station</span>`;
      }

      const inputsHtml = recipe.inputs
        .map((inp) => {
          const avail = countItem(player.inventory, inp.itemId);
          const ok = avail >= inp.count;
          const name = getItemDisplay(inp.itemId).name;
          return `<span class="${ok ? "craft-input-ok" : "craft-input-missing"}">${avail}/${inp.count} ${name}</span>`;
        })
        .join("");

      const isHidden = uiState.hiddenRecipeIds.has(recipe.id);
      const hideBtnTitle = isHidden ? "Unhide recipe" : "Hide recipe";
      const hideBtnLabel = isHidden ? "👁" : "✕";

      btn.innerHTML = `
        <div class="craft-btn-top">
          <span class="craft-btn-title"><span class="craft-btn-icon">${outIconHtml}</span><span>${recipe.name}${outQty}</span></span>
          <span class="craft-btn-right">
            ${badgeHtml}
            <span class="craft-hide-btn" role="button" tabindex="0" title="${hideBtnTitle}">${hideBtnLabel}</span>
          </span>
        </div>
        <div class="craft-btn-inputs">${inputsHtml}</div>
      `;

      const hideEl = btn.querySelector(".craft-hide-btn");
      if (hideEl) {
        hideEl.addEventListener("click", (e) => {
          e.stopPropagation();
          toggleRecipeHidden(recipe.id);
        });
      }
      btn.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        toggleRecipeHidden(recipe.id);
      });
      btn.addEventListener("click", () => {
        craftRecipe(recipe.id);
      });
      paneDom.listEl.appendChild(btn);
    }
  }
}

export function renderCraftingRecipes() {
  bindCraftingControlsOnce();
  const p = engine.players.get(0);
  if (!p) return;
  const room = engine.rooms.get(p.currentRoomId);
  const hasStation = hasCraftingStationAccess(room, p);

  if (dom.craftingStationStatus) {
    if (hasStation) {
      dom.craftingStationStatus.textContent = "🪑 Station Active";
      dom.craftingStationStatus.classList.add("active");
    } else {
      dom.craftingStationStatus.textContent = "✋ Hand Only";
      dom.craftingStationStatus.classList.remove("active");
    }
  }

  renderRecipePane(dom.craftingPanes[0], uiState.craftingPaneConfigs[0], p, hasStation);
  if (uiState.isDualCraftingOpen) {
    renderRecipePane(dom.craftingPanes[1], uiState.craftingPaneConfigs[1], p, hasStation);
  }
}

export function craftRecipe(recipeId) {
  craftRecipeAction(recipeId);
  if (uiState.isCraftingOpen) renderCraftingRecipes();
}
