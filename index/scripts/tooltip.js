import { getItemDefinition } from "./engine-api.js";
import { dom } from "./state.js";

export function getItemDisplay(itemId) {
  if (!itemId) return { icon: "", name: "" };
  const def = getItemDefinition(itemId);
  if (def) {
    return { icon: def.icon || "📦", name: def.name, def };
  }
  return { icon: "📦", name: itemId, def: null };
}

export function showItemTooltip(item, mouseX, mouseY) {
  if (!item || !dom.itemTooltip) return;
  const display = getItemDisplay(item.id);
  const def = display.def;
  const maxStack = def?.maxStackSize ?? 64;

  const visualEl = def?.textureDataUrl
    ? `<img src="${def.textureDataUrl}" style="width: 16px; height: 16px; image-rendering: pixelated; vertical-align: middle;" />`
    : `<span>${display.icon}</span>`;
  dom.tooltipItemName.innerHTML = `${visualEl} <span>${display.name}</span>`;
  dom.tooltipItemCount.textContent = `Count: ${item.count} / ${maxStack}`;
  dom.tooltipItemId.textContent = item.id;

  dom.tooltipItemTags.innerHTML = "";
  if (def?.placeable) {
    const tag = document.createElement("span");
    tag.className = "tooltip-tag";
    tag.textContent = "Placeable";
    dom.tooltipItemTags.appendChild(tag);
  }
  if (def?.isTool) {
    const tag = document.createElement("span");
    tag.className = "tooltip-tag";
    tag.textContent = "Tool";
    dom.tooltipItemTags.appendChild(tag);
  }
  if (def?.canTill) {
    const tag = document.createElement("span");
    tag.className = "tooltip-tag";
    tag.textContent = "Tillable";
    dom.tooltipItemTags.appendChild(tag);
  }

  const hintTag = document.createElement("span");
  hintTag.className = "tooltip-tag";
  hintTag.style.color = "#61afef";
  hintTag.textContent = "Drag to Move/Swap";
  dom.tooltipItemTags.appendChild(hintTag);

  dom.itemTooltip.style.left = `${mouseX + 12}px`;
  dom.itemTooltip.style.top = `${mouseY + 12}px`;
  dom.itemTooltip.classList.add("visible");
}

export function hideItemTooltip() {
  if (dom.itemTooltip) {
    dom.itemTooltip.classList.remove("visible");
  }
}
