import type { ListRecipe, InventoryList, Room, Player } from "../core/types.ts";
import { countItem, removeItem, addItem } from "../inventory/inventory.ts";

/**
 * Chapter 1 List Crafting Recipes.
 *
 * Backreferences & Verification:
 * - Hand & workstation recipes: `scripts/otherrecipes.zs` and `scripts/recipes.zs`
 *   https://github.com/kamunimaximus/CompactClaustrophobia/blob/master/scripts/otherrecipes.zs
 *   https://github.com/kamunimaximus/CompactClaustrophobia/blob/master/scripts/recipes.zs
 * - Bonsai plank processing: `scripts/bonsai.zs`
 *   https://github.com/kamunimaximus/CompactClaustrophobia/blob/master/scripts/bonsai.zs
 * - Ex Nihilo tools and sieves: FTB Wiki https://ftbwiki.org/Ex_Nihilo_Creatio
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
    id: "recipe:planks_spruce",
    name: "Spruce Planks",
    category: "basic",
    requiredStation: "none",
    inputs: [{ itemId: "arcadialbonsaitrees:bonsai_spruce_cutting", count: 4 }],
    outputs: [{ itemId: "minecraft:planks", count: 4 }],
  },
  {
    id: "recipe:planks_birch",
    name: "Birch Planks",
    category: "basic",
    requiredStation: "none",
    inputs: [{ itemId: "arcadialbonsaitrees:bonsai_birch_cutting", count: 4 }],
    outputs: [{ itemId: "minecraft:planks", count: 4 }],
  },
  {
    id: "recipe:planks_jungle",
    name: "Jungle Planks",
    category: "basic",
    requiredStation: "none",
    inputs: [{ itemId: "arcadialbonsaitrees:bonsai_jungle_cutting", count: 4 }],
    outputs: [{ itemId: "minecraft:planks", count: 4 }],
  },
  {
    id: "recipe:planks_acacia",
    name: "Acacia Planks",
    category: "basic",
    requiredStation: "none",
    inputs: [{ itemId: "arcadialbonsaitrees:bonsai_acacia_cutting", count: 4 }],
    outputs: [{ itemId: "minecraft:planks", count: 4 }],
  },
  {
    id: "recipe:planks_darkoak",
    name: "Dark Oak Planks",
    category: "basic",
    requiredStation: "none",
    inputs: [{ itemId: "arcadialbonsaitrees:bonsai_darkoak_cutting", count: 4 }],
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

export interface MissingInputInfo {
  itemId: string;
  required: number;
  available: number;
}

export interface CraftabilityInfo {
  craftable: boolean;
  missingStation: boolean;
  missingInputs: MissingInputInfo[];
  inventoryFull: boolean;
  maxCraftableCount: number;
}

export type RecipeFilterMode =
  | "all"
  | "craftable"
  | "hand"
  | "station"
  | "basic"
  | "tools"
  | "machinery"
  | "fluid";

export type RecipeGroupMode = "none" | "category" | "station" | "craftable";
export type RecipeSortMode = "craftable" | "name" | "category";

export interface RecipeViewItem {
  recipe: ListRecipe;
  status: CraftabilityInfo;
}

export interface RecipeGroup {
  id: string;
  label: string;
  items: RecipeViewItem[];
}

export interface RecipeViewOptions {
  filter?: RecipeFilterMode;
  groupBy?: RecipeGroupMode;
  sortBy?: RecipeSortMode;
}

/**
 * Checks whether a placed Crafting Station block is within reach of the player
 * (Chebyshev distance <= 1 in x/y, and within the player's 4 vertical layers z-1..z+2).
 */
export function hasNearbyCraftingStation(room: Room | undefined, player: Player): boolean {
  if (!room) return false;
  const minX = Math.max(0, player.x - 1);
  const maxX = Math.min(room.width - 1, player.x + 1);
  const minY = Math.max(0, player.y - 1);
  const maxY = Math.min(room.height - 1, player.y + 1);
  const minZ = Math.max(0, player.z - 1);
  const maxZ = Math.min(room.depth - 1, player.z + 2);

  for (let z = minZ; z <= maxZ; z++) {
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const tile = room.voxels[z]?.[y]?.[x];
        if (tile?.id === "craftingstation:crafting_station") {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Checks if the player has access to a Crafting Station (either placed adjacent in the room
 * or carried in inventory).
 */
export function hasCraftingStationAccess(room: Room | undefined, player: Player): boolean {
  if (hasNearbyCraftingStation(room, player)) {
    return true;
  }
  return getItemCount(player.inventory, "craftingstation:crafting_station") > 0;
}

/**
 * Robust craftability check: validates station requirement, aggregated ingredient counts
 * across all inventory slots, max craftable quantity, and output inventory space.
 */
export function getCraftability(
  recipe: ListRecipe,
  inventory: InventoryList | Map<string, number>,
  hasCraftingStation: boolean
): CraftabilityInfo {
  const missingStation = recipe.requiredStation === "crafting_station" && !hasCraftingStation;

  // Aggregate required counts per itemId (handles duplicate input entries robustly)
  const requiredByItem = new Map<string, number>();
  for (const input of recipe.inputs) {
    requiredByItem.set(input.itemId, (requiredByItem.get(input.itemId) ?? 0) + input.count);
  }

  const missingInputs: MissingInputInfo[] = [];
  let maxCraftableCount = Infinity;

  for (const [itemId, required] of requiredByItem.entries()) {
    const available = getItemCount(inventory, itemId);
    if (available < required) {
      missingInputs.push({ itemId, required, available });
      maxCraftableCount = 0;
    } else if (required > 0) {
      maxCraftableCount = Math.min(maxCraftableCount, Math.floor(available / required));
    }
  }

  if (!Number.isFinite(maxCraftableCount)) {
    maxCraftableCount = 0;
  }

  // Check whether outputs fit in InventoryList after deducting inputs
  let inventoryFull = false;
  if (missingInputs.length === 0 && Array.isArray(inventory)) {
    const simulated: InventoryList = inventory.map((slot) => (slot ? { ...slot } : null));
    for (const [itemId, required] of requiredByItem.entries()) {
      removeItem(simulated, itemId, required);
    }
    for (const output of recipe.outputs) {
      const overflow = addItem(simulated, output.itemId, output.count);
      if (overflow > 0) {
        inventoryFull = true;
        break;
      }
    }
  }

  const craftable = !missingStation && missingInputs.length === 0 && !inventoryFull;
  return {
    craftable,
    missingStation,
    missingInputs,
    inventoryFull,
    maxCraftableCount: craftable ? maxCraftableCount : 0,
  };
}

/**
 * Checks if the inventory contains all required ingredients for the recipe.
 */
export function canCraft(recipe: ListRecipe, inventory: InventoryList | Map<string, number>, hasCraftingStation: boolean): boolean {
  return getCraftability(recipe, inventory, hasCraftingStation).craftable;
}

const CATEGORY_ORDER: Record<string, number> = {
  basic: 0,
  tools: 1,
  machinery: 2,
  fluid: 3,
};

const CATEGORY_LABELS: Record<string, string> = {
  basic: "Basic & Materials",
  tools: "Tools",
  machinery: "Machinery",
  fluid: "Fluids",
};

function computeIngredientCompletion(recipe: ListRecipe, status: CraftabilityInfo): number {
  if (recipe.inputs.length === 0) return 1;
  const missingMap = new Map(status.missingInputs.map((m) => [m.itemId, m]));
  let totalRatio = 0;
  for (const input of recipe.inputs) {
    const miss = missingMap.get(input.itemId);
    if (!miss) {
      totalRatio += 1;
    } else if (miss.required > 0) {
      totalRatio += Math.min(1, miss.available / miss.required);
    }
  }
  return totalRatio / recipe.inputs.length;
}

/**
 * Filters, sorts, and groups crafting recipes according to the given view options.
 */
export function buildRecipeGroups(
  recipes: ListRecipe[],
  inventory: InventoryList | Map<string, number>,
  hasCraftingStation: boolean,
  options: RecipeViewOptions = {}
): RecipeGroup[] {
  const filter = options.filter ?? "all";
  const groupBy = options.groupBy ?? "category";
  const sortBy = options.sortBy ?? "craftable";

  const evaluated: RecipeViewItem[] = recipes.map((recipe) => ({
    recipe,
    status: getCraftability(recipe, inventory, hasCraftingStation),
  }));

  const filtered = evaluated.filter(({ recipe, status }) => {
    switch (filter) {
      case "craftable":
        return status.craftable;
      case "hand":
        return recipe.requiredStation === "none";
      case "station":
        return recipe.requiredStation === "crafting_station";
      case "basic":
      case "tools":
      case "machinery":
      case "fluid":
        return recipe.category === filter;
      case "all":
      default:
        return true;
    }
  });

  const compareItems = (a: RecipeViewItem, b: RecipeViewItem): number => {
    if (sortBy === "craftable") {
      if (a.status.craftable !== b.status.craftable) {
        return a.status.craftable ? -1 : 1;
      }
      // Next prioritize recipes where all inputs are owned and only station is missing
      const aOnlyStation = a.status.missingStation && a.status.missingInputs.length === 0;
      const bOnlyStation = b.status.missingStation && b.status.missingInputs.length === 0;
      if (aOnlyStation !== bOnlyStation) {
        return aOnlyStation ? -1 : 1;
      }
      const compDiff =
        computeIngredientCompletion(b.recipe, b.status) -
        computeIngredientCompletion(a.recipe, a.status);
      if (Math.abs(compDiff) > 1e-6) {
        return compDiff;
      }
      return a.recipe.name.localeCompare(b.recipe.name);
    }

    if (sortBy === "category") {
      const catDiff =
        (CATEGORY_ORDER[a.recipe.category] ?? 99) - (CATEGORY_ORDER[b.recipe.category] ?? 99);
      if (catDiff !== 0) return catDiff;
      if (a.status.craftable !== b.status.craftable) {
        return a.status.craftable ? -1 : 1;
      }
      return a.recipe.name.localeCompare(b.recipe.name);
    }

    // "name"
    return a.recipe.name.localeCompare(b.recipe.name);
  };

  if (groupBy === "none") {
    const sorted = [...filtered].sort(compareItems);
    return sorted.length > 0 ? [{ id: "all", label: "All Recipes", items: sorted }] : [];
  }

  const groupMap = new Map<string, RecipeGroup>();

  for (const item of filtered) {
    let groupId: string;
    let groupLabel: string;

    if (groupBy === "station") {
      const needsStation = item.recipe.requiredStation === "crafting_station";
      groupId = needsStation ? "crafting_station" : "hand";
      groupLabel = needsStation ? "Crafting Station" : "Hand Crafting";
    } else if (groupBy === "craftable") {
      groupId = item.status.craftable ? "craftable" : "uncraftable";
      groupLabel = item.status.craftable ? "Craftable Now" : "Locked / Missing Materials";
    } else {
      groupId = item.recipe.category;
      groupLabel = CATEGORY_LABELS[item.recipe.category] ?? item.recipe.category;
    }

    let group = groupMap.get(groupId);
    if (!group) {
      group = { id: groupId, label: groupLabel, items: [] };
      groupMap.set(groupId, group);
    }
    group.items.push(item);
  }

  const groups = Array.from(groupMap.values());
  for (const g of groups) {
    g.items.sort(compareItems);
  }

  if (groupBy === "category") {
    groups.sort((a, b) => (CATEGORY_ORDER[a.id] ?? 99) - (CATEGORY_ORDER[b.id] ?? 99));
  } else if (groupBy === "station") {
    groups.sort((a, b) => (a.id === "hand" ? -1 : b.id === "hand" ? 1 : 0));
  } else if (groupBy === "craftable") {
    groups.sort((a, b) => (a.id === "craftable" ? -1 : b.id === "craftable" ? 1 : 0));
  }

  return groups;
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
