import type { ListRecipe, InventoryList } from "../core/types.ts";
import { countItem, removeItem, addItem } from "../inventory/inventory.ts";

/**
 * Chapter 1 List Crafting Recipes.
 */
export const CHAPTER_1_RECIPES: ListRecipe[] = [
  // Hand Crafting
  {
    id: "recipe:dirt",
    name: "Dirt Block",
    category: "basic",
    requiredStation: "none",
    inputs: [{ itemId: "contenttweaker:dirtdust", count: 4 }],
    outputs: [{ itemId: "minecraft:dirt", count: 1 }],
  },
  {
    id: "recipe:cobblestone",
    name: "Cobblestone",
    category: "basic",
    requiredStation: "none",
    inputs: [{ itemId: "exnihilocreatio:item_pebble:0", count: 4 }],
    outputs: [{ itemId: "minecraft:cobblestone", count: 1 }],
  },
  {
    id: "recipe:planks",
    name: "Oak Planks",
    category: "basic",
    requiredStation: "none",
    inputs: [{ itemId: "arcadialbonsaitrees:bonsai_oak_cutting", count: 4 }],
    outputs: [{ itemId: "minecraft:planks", count: 4 }],
  },
  {
    id: "recipe:crafting_station",
    name: "Crafting Station",
    category: "basic",
    requiredStation: "none",
    inputs: [{ itemId: "minecraft:planks", count: 4 }],
    outputs: [{ itemId: "craftingstation:crafting_station", count: 1 }],
  },
  {
    id: "recipe:sticks",
    name: "Sticks",
    category: "basic",
    requiredStation: "none",
    inputs: [{ itemId: "minecraft:planks", count: 2 }],
    outputs: [{ itemId: "minecraft:stick", count: 4 }],
  },
  {
    id: "recipe:poop_fuel",
    name: "Poop Fuel",
    category: "basic",
    requiredStation: "none",
    inputs: [{ itemId: "cropdusting:poop", count: 1 }],
    outputs: [{ itemId: "contenttweaker:poopfuel", count: 1 }],
  },
  {
    id: "recipe:string",
    name: "String",
    category: "basic",
    requiredStation: "none",
    inputs: [{ itemId: "immersiveengineering:material:4", count: 3 }],
    outputs: [{ itemId: "minecraft:string", count: 1 }],
  },

  // Crafting Station Recipes
  {
    id: "recipe:wooden_pickaxe",
    name: "Wooden Pickaxe",
    category: "tools",
    requiredStation: "crafting_station",
    inputs: [
      { itemId: "minecraft:planks", count: 3 },
      { itemId: "minecraft:stick", count: 2 },
    ],
    outputs: [{ itemId: "minecraft:wooden_pickaxe", count: 1 }],
  },
  {
    id: "recipe:stone_pickaxe",
    name: "Stone Pickaxe",
    category: "tools",
    requiredStation: "crafting_station",
    inputs: [
      { itemId: "minecraft:cobblestone", count: 3 },
      { itemId: "minecraft:stick", count: 2 },
    ],
    outputs: [{ itemId: "minecraft:stone_pickaxe", count: 1 }],
  },
  {
    id: "recipe:wooden_hammer",
    name: "Wooden Hammer",
    category: "tools",
    requiredStation: "crafting_station",
    inputs: [
      { itemId: "minecraft:planks", count: 2 },
      { itemId: "minecraft:stick", count: 2 },
    ],
    outputs: [{ itemId: "exnihilocreatio:hammer_wood", count: 1 }],
  },
  {
    id: "recipe:wooden_sieve",
    name: "Wooden Sieve",
    category: "machinery",
    requiredStation: "crafting_station",
    inputs: [
      { itemId: "minecraft:planks", count: 5 },
      { itemId: "minecraft:stick", count: 2 },
    ],
    outputs: [{ itemId: "exnihilocreatio:block_sieve", count: 1 }],
  },
  {
    id: "recipe:wooden_crucible",
    name: "Wooden Crucible",
    category: "fluid",
    requiredStation: "crafting_station",
    inputs: [{ itemId: "minecraft:planks", count: 7 }],
    outputs: [{ itemId: "exnihilocreatio:block_crucible_wood", count: 1 }],
  },
  {
    id: "recipe:wooden_barrel",
    name: "Wooden Barrel",
    category: "fluid",
    requiredStation: "crafting_station",
    inputs: [{ itemId: "minecraft:planks", count: 7 }],
    outputs: [{ itemId: "exnihilocreatio:block_barrel_wood", count: 1 }],
  },
];

/**
 * Helper to get available count whether inventory is an InventoryList or Map.
 */
function getItemCount(inventory: InventoryList | Map<string, number>, itemId: string): number {
  if (inventory instanceof Map) {
    return inventory.get(itemId) ?? 0;
  }
  return countItem(inventory, itemId);
}

/**
 * Checks if the inventory contains all required ingredients for the recipe.
 */
export function canCraft(recipe: ListRecipe, inventory: InventoryList | Map<string, number>, hasCraftingStation: boolean): boolean {
  if (recipe.requiredStation === "crafting_station" && !hasCraftingStation) {
    return false;
  }

  for (const input of recipe.inputs) {
    const available = getItemCount(inventory, input.itemId);
    if (available < input.count) {
      return false;
    }
  }

  return true;
}

/**
 * Executes a list-based craft: deducts inputs and adds outputs to inventory.
 */
export function executeCraft(recipe: ListRecipe, inventory: InventoryList | Map<string, number>, hasCraftingStation: boolean): boolean {
  if (!canCraft(recipe, inventory, hasCraftingStation)) {
    return false;
  }

  if (inventory instanceof Map) {
    // Deduct inputs
    for (const input of recipe.inputs) {
      const current = inventory.get(input.itemId)!;
      const remaining = current - input.count;
      if (remaining > 0) {
        inventory.set(input.itemId, remaining);
      } else {
        inventory.delete(input.itemId);
      }
    }

    // Add outputs
    for (const output of recipe.outputs) {
      const current = inventory.get(output.itemId) ?? 0;
      inventory.set(output.itemId, current + output.count);
    }
    return true;
  }

  // Deduct inputs from InventoryList
  for (const input of recipe.inputs) {
    removeItem(inventory, input.itemId, input.count);
  }

  // Add outputs to InventoryList
  for (const output of recipe.outputs) {
    addItem(inventory, output.itemId, output.count);
  }

  return true;
}
