import { CHAPTER_1_RECIPES, canCraft } from "./engine-api.js";
import { engine, dom, uiState } from "./state.js";
import { getItemDisplay } from "./tooltip.js";
import { craftRecipeAction } from "./actions.js";

export function toggleCraftingPanel(open) {
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

export function renderCraftingRecipes() {
  const p = engine.players.get(0);
  if (!p) return;
  dom.craftingRecipeList.innerHTML = "";

  for (const recipe of CHAPTER_1_RECIPES) {
    const can = canCraft(recipe, p.inventory, false);
    const btn = document.createElement("button");
    btn.className = "craft-btn";
    btn.disabled = !can;
    btn.innerHTML = `
      <span>${recipe.name}</span>
      <span style="font-family: monospace; font-size: 11px;">${recipe.inputs.map((i) => `${i.count}x ${getItemDisplay(i.itemId).name}`).join(", ")}</span>
    `;
    btn.addEventListener("click", () => {
      craftRecipe(recipe.id);
    });
    dom.craftingRecipeList.appendChild(btn);
  }
}

export function craftRecipe(recipeId) {
  craftRecipeAction(recipeId);
  if (uiState.isCraftingOpen) renderCraftingRecipes();
}
