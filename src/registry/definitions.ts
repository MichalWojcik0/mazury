import {
  COMPACT_WALL_TEXTURE_DATA_URL,
  DIRT_TEXTURE_DATA_URL,
  FARMLAND_DRY_TEXTURE_DATA_URL,
  BEDROCK_TEXTURE_DATA_URL,
  CRAFTING_STATION_TEXTURE_DATA_URL,
  DIRT_DUST_TEXTURE_DATA_URL,
  GRAVEL_DUST_TEXTURE_DATA_URL,
  POOP_FUEL_TEXTURE_DATA_URL,
  STONE_PEBBLE_TEXTURE_DATA_URL,
  BONSAI_OAK_SAPLING_TEXTURE_DATA_URL,
  BONSAI_SPRUCE_SAPLING_TEXTURE_DATA_URL,
  BONSAI_BIRCH_SAPLING_TEXTURE_DATA_URL,
  BONSAI_JUNGLE_SAPLING_TEXTURE_DATA_URL,
  BONSAI_ACACIA_SAPLING_TEXTURE_DATA_URL,
  BONSAI_DARKOAK_SAPLING_TEXTURE_DATA_URL,
  BONSAI_OAK_CUTTING_TEXTURE_DATA_URL,
  WHEAT_SEEDS_TEXTURE_DATA_URL,
  HEMP_SEED_TEXTURE_DATA_URL,
} from "../render/textures.ts";

/**
 * Data-driven registry definitions for Items and Blocks.
 *
 * Backreferences & Verification:
 * - Scavenge Wall & Dirt loot drops: `config/scavenge/compactloot.json`
 *   https://github.com/kamunimaximus/CompactClaustrophobia/blob/master/config/scavenge/compactloot.json
 * - Scavenge Pickaxe drops: `config/scavenge/pickdrops.json`
 *   https://github.com/kamunimaximus/CompactClaustrophobia/blob/master/config/scavenge/pickdrops.json
 * - ContentTweaker custom items: `scripts/content.zs`
 *   https://github.com/kamunimaximus/CompactClaustrophobia/blob/master/scripts/content.zs
 * - Vanilla & Mod Wikis:
 *   - Farmland & Crops: https://minecraft.wiki/w/Farmland & https://minecraft.wiki/w/Wheat_Seeds
 *   - Bonsai Trees: https://ftbwiki.org/Bonsai_Trees
 *   - Compact Machines 3: https://ftbwiki.org/Compact_Machines_3
 */

/**
 * Item registry schema for data-driven item behaviors.
 */
export interface ItemDefinition {
  id: string;
  name: string;
  maxStackSize?: number; // Defaults to 64
  placeable?: boolean; // Can be placed into world voxel grid
  placesTileId?: string; // Block ID created when placed
  icon?: string; // Emoji / UI symbol
  textureDataUrl?: string; // Base64 png texture
  isTool?: boolean;
  canTill?: boolean; // Can till dirt into farmland (e.g. hoe, or bare hands in early cc)
  plantable?: boolean; // Can be planted as a crop/bonsai
  plantableOn?: string[]; // Soil block IDs it can be planted on (e.g. ["minecraft:farmland"])
  placesCropId?: string; // Crop/plant block ID created when planted
}

/**
 * Block/Tile registry schema for data-driven block behaviors.
 */
export interface BlockDefinition {
  id: string;
  name: string;
  icon?: string;
  type: "air" | "solid_wall" | "floor" | "machine" | "conduit" | "tunnel" | "farmland" | "crop";
  passable: boolean;
  occluding?: boolean;
  breakable?: boolean; // Can be broken by primary interact
  drops?: Array<{ itemId: string; count: number; chance?: number }>; // Loot dropped when broken
  tillable?: boolean; // Can be tilled by secondary interact
  tilledTileId?: string; // Block ID transformed into when tilled
  tilledDrops?: Array<{ itemId: string; count: number; chance?: number }>; // Loot dropped when tilled
  isCrop?: boolean; // Is a growing crop or bonsai
  maxGrowthTicks?: number; // Ticks to reach 100% maturity (default 1200)
  harvestDrops?: Array<{ itemId: string; count: number; chance?: number; min?: number; max?: number }>;
  textureDataUrl?: string;
}

/**
 * Comprehensive Data-Driven Item Registry.
 */
export const ITEM_REGISTRY: Record<string, ItemDefinition> = {
  "compactmachines3:psd": {
    id: "compactmachines3:psd",
    name: "Personal Shrinking Device",
    maxStackSize: 1,
    icon: "📱",
    isTool: true,
  },
  "contenttweaker:dirtdust": {
    id: "contenttweaker:dirtdust",
    name: "Dirt Dust",
    maxStackSize: 64,
    icon: "🟤",
    textureDataUrl: DIRT_DUST_TEXTURE_DATA_URL,
  },
  "contenttweaker:graveldust": {
    id: "contenttweaker:graveldust",
    name: "Gravel Dust",
    maxStackSize: 64,
    icon: "⚪",
    textureDataUrl: GRAVEL_DUST_TEXTURE_DATA_URL,
  },
  "minecraft:dirt": {
    id: "minecraft:dirt",
    name: "Dirt Block",
    maxStackSize: 64,
    placeable: true,
    placesTileId: "minecraft:dirt",
    icon: "🧱",
    textureDataUrl: DIRT_TEXTURE_DATA_URL,
  },
  "minecraft:farmland": {
    id: "minecraft:farmland",
    name: "Farmland",
    maxStackSize: 64,
    placeable: true,
    placesTileId: "minecraft:farmland",
    icon: "🌾",
    textureDataUrl: FARMLAND_DRY_TEXTURE_DATA_URL,
  },
  "minecraft:gravel": {
    id: "minecraft:gravel",
    name: "Gravel",
    maxStackSize: 64,
    placeable: true,
    placesTileId: "minecraft:gravel",
    icon: "⚪",
  },
  "cropdusting:poop": {
    id: "cropdusting:poop",
    name: "Organic Poop",
    maxStackSize: 64,
    icon: "💩",
  },
  "contenttweaker:poopfuel": {
    id: "contenttweaker:poopfuel",
    name: "Poop Fuel",
    maxStackSize: 64,
    icon: "🔥",
    textureDataUrl: POOP_FUEL_TEXTURE_DATA_URL,
  },
  "minecraft:planks": {
    id: "minecraft:planks",
    name: "Oak Planks",
    maxStackSize: 64,
    placeable: true,
    placesTileId: "minecraft:planks",
    icon: "🪵",
  },
  "minecraft:stick": {
    id: "minecraft:stick",
    name: "Stick",
    maxStackSize: 64,
    icon: "🥢",
  },
  "craftingstation:crafting_station": {
    id: "craftingstation:crafting_station",
    name: "Crafting Station",
    maxStackSize: 64,
    placeable: true,
    placesTileId: "craftingstation:crafting_station",
    icon: "🪑",
    textureDataUrl: CRAFTING_STATION_TEXTURE_DATA_URL,
  },
  "minecraft:wooden_pickaxe": {
    id: "minecraft:wooden_pickaxe",
    name: "Wooden Pickaxe",
    maxStackSize: 1,
    icon: "⛏️",
    isTool: true,
  },
  "minecraft:stone_pickaxe": {
    id: "minecraft:stone_pickaxe",
    name: "Stone Pickaxe",
    maxStackSize: 1,
    icon: "⛏️",
    isTool: true,
  },
  "minecraft:iron_pickaxe": {
    id: "minecraft:iron_pickaxe",
    name: "Iron Pickaxe",
    maxStackSize: 1,
    icon: "⛏️",
    isTool: true,
  },
  "minecraft:diamond_pickaxe": {
    id: "minecraft:diamond_pickaxe",
    name: "Diamond Pickaxe",
    maxStackSize: 1,
    icon: "⛏️",
    isTool: true,
  },
  "exnihilocreatio:hammer_wood": {
    id: "exnihilocreatio:hammer_wood",
    name: "Wooden Hammer",
    maxStackSize: 1,
    icon: "🔨",
    isTool: true,
  },
  "compactmachines3:field_projector": {
    id: "compactmachines3:field_projector",
    name: "Miniaturization Field Projector",
    maxStackSize: 4,
    icon: "📡",
  },
  "minecraft:cobblestone": {
    id: "minecraft:cobblestone",
    name: "Cobblestone",
    maxStackSize: 64,
    placeable: true,
    placesTileId: "minecraft:cobblestone",
    icon: "🪨",
  },
  "exnihilocreatio:item_pebble:0": {
    id: "exnihilocreatio:item_pebble:0",
    name: "Stone Pebble",
    maxStackSize: 64,
    icon: "🪨",
    textureDataUrl: STONE_PEBBLE_TEXTURE_DATA_URL,
  },
  "exnihilocreatio:item_pebble:1": {
    id: "exnihilocreatio:item_pebble:1",
    name: "Granite Pebble",
    maxStackSize: 64,
    icon: "🪨",
  },
  "exnihilocreatio:item_pebble:2": {
    id: "exnihilocreatio:item_pebble:2",
    name: "Diorite Pebble",
    maxStackSize: 64,
    icon: "🪨",
  },
  "exnihilocreatio:item_pebble:3": {
    id: "exnihilocreatio:item_pebble:3",
    name: "Andesite Pebble",
    maxStackSize: 64,
    icon: "🪨",
  },
  "exnihilocreatio:item_ore_iron:0": {
    id: "exnihilocreatio:item_ore_iron:0",
    name: "Iron Grit",
    maxStackSize: 64,
    icon: "⚙️",
  },
  "exnihilocreatio:item_ore_copper:0": {
    id: "exnihilocreatio:item_ore_copper:0",
    name: "Copper Grit",
    maxStackSize: 64,
    icon: "🥉",
  },
  "arcadialbonsaitrees:bonsai_oak_cutting": {
    id: "arcadialbonsaitrees:bonsai_oak_cutting",
    name: "Bonsai Oak Cutting",
    maxStackSize: 64,
    icon: "🌿",
    textureDataUrl: BONSAI_OAK_CUTTING_TEXTURE_DATA_URL,
  },
  "minecraft:leaves": {
    id: "minecraft:leaves",
    name: "Oak Leaves",
    maxStackSize: 64,
    icon: "🍃",
  },
  "minecraft:wheat": {
    id: "minecraft:wheat",
    name: "Wheat",
    maxStackSize: 64,
    icon: "🌾",
  },
  "immersiveengineering:material:4": {
    id: "immersiveengineering:material:4",
    name: "Industrial Hemp Fiber",
    maxStackSize: 64,
    icon: "🧵",
  },
  "minecraft:string": {
    id: "minecraft:string",
    name: "String",
    maxStackSize: 64,
    icon: "🧶",
  },
  "arcadialbonsaitrees:bonsai_oak_sapling": {
    id: "arcadialbonsaitrees:bonsai_oak_sapling",
    name: "Bonsai Oak Sapling",
    maxStackSize: 64,
    placeable: true,
    plantable: true,
    plantableOn: ["minecraft:farmland", "minecraft:dirt"],
    placesTileId: "arcadialbonsaitrees:bonsai_oak_sapling",
    placesCropId: "arcadialbonsaitrees:bonsai_oak_sapling",
    icon: "🌱",
    textureDataUrl: BONSAI_OAK_SAPLING_TEXTURE_DATA_URL,
  },
  "arcadialbonsaitrees:bonsai_spruce_sapling": {
    id: "arcadialbonsaitrees:bonsai_spruce_sapling",
    name: "Bonsai Spruce Sapling",
    maxStackSize: 64,
    placeable: true,
    plantable: true,
    plantableOn: ["minecraft:farmland", "minecraft:dirt"],
    placesTileId: "arcadialbonsaitrees:bonsai_spruce_sapling",
    placesCropId: "arcadialbonsaitrees:bonsai_spruce_sapling",
    icon: "🌲",
    textureDataUrl: BONSAI_SPRUCE_SAPLING_TEXTURE_DATA_URL,
  },
  "arcadialbonsaitrees:bonsai_birch_sapling": {
    id: "arcadialbonsaitrees:bonsai_birch_sapling",
    name: "Bonsai Birch Sapling",
    maxStackSize: 64,
    placeable: true,
    plantable: true,
    plantableOn: ["minecraft:farmland", "minecraft:dirt"],
    placesTileId: "arcadialbonsaitrees:bonsai_birch_sapling",
    placesCropId: "arcadialbonsaitrees:bonsai_birch_sapling",
    icon: "🌳",
    textureDataUrl: BONSAI_BIRCH_SAPLING_TEXTURE_DATA_URL,
  },
  "arcadialbonsaitrees:bonsai_jungle_sapling": {
    id: "arcadialbonsaitrees:bonsai_jungle_sapling",
    name: "Bonsai Jungle Sapling",
    maxStackSize: 64,
    placeable: true,
    plantable: true,
    plantableOn: ["minecraft:farmland", "minecraft:dirt"],
    placesTileId: "arcadialbonsaitrees:bonsai_jungle_sapling",
    placesCropId: "arcadialbonsaitrees:bonsai_jungle_sapling",
    icon: "🌴",
    textureDataUrl: BONSAI_JUNGLE_SAPLING_TEXTURE_DATA_URL,
  },
  "arcadialbonsaitrees:bonsai_acacia_sapling": {
    id: "arcadialbonsaitrees:bonsai_acacia_sapling",
    name: "Bonsai Acacia Sapling",
    maxStackSize: 64,
    placeable: true,
    plantable: true,
    plantableOn: ["minecraft:farmland", "minecraft:dirt"],
    placesTileId: "arcadialbonsaitrees:bonsai_acacia_sapling",
    placesCropId: "arcadialbonsaitrees:bonsai_acacia_sapling",
    icon: "🎋",
    textureDataUrl: BONSAI_ACACIA_SAPLING_TEXTURE_DATA_URL,
  },
  "arcadialbonsaitrees:bonsai_darkoak_sapling": {
    id: "arcadialbonsaitrees:bonsai_darkoak_sapling",
    name: "Bonsai Dark Oak Sapling",
    maxStackSize: 64,
    placeable: true,
    plantable: true,
    plantableOn: ["minecraft:farmland", "minecraft:dirt"],
    placesTileId: "arcadialbonsaitrees:bonsai_darkoak_sapling",
    placesCropId: "arcadialbonsaitrees:bonsai_darkoak_sapling",
    icon: "🌳",
    textureDataUrl: BONSAI_DARKOAK_SAPLING_TEXTURE_DATA_URL,
  },
  "minecraft:wheat_seeds": {
    id: "minecraft:wheat_seeds",
    name: "Wheat Seeds",
    maxStackSize: 64,
    placeable: true,
    plantable: true,
    plantableOn: ["minecraft:farmland"],
    placesTileId: "minecraft:wheat",
    placesCropId: "minecraft:wheat",
    icon: "🌾",
    textureDataUrl: WHEAT_SEEDS_TEXTURE_DATA_URL,
  },
  "immersiveengineering:seed": {
    id: "immersiveengineering:seed",
    name: "Industrial Hemp Seed",
    maxStackSize: 64,
    placeable: true,
    plantable: true,
    plantableOn: ["minecraft:farmland"],
    placesTileId: "immersiveengineering:hemp",
    placesCropId: "immersiveengineering:hemp",
    icon: "🌱",
    textureDataUrl: HEMP_SEED_TEXTURE_DATA_URL,
  },
};

/**
 * Comprehensive Data-Driven Block Registry.
 */
export const BLOCK_REGISTRY: Record<string, BlockDefinition> = {
  "minecraft:air": {
    id: "minecraft:air",
    name: "Air",
    type: "air",
    passable: true,
    breakable: false,
    tillable: false,
  },
  "compactmachines3:wall": {
    id: "compactmachines3:wall",
    name: "Solid Compact Machine Wall",
    icon: "🧱",
    type: "solid_wall",
    passable: false,
    occluding: true,
    breakable: false, // Solid walls cannot be broken, only punched for loot
    tillable: false,
    textureDataUrl: COMPACT_WALL_TEXTURE_DATA_URL,
  },
  "minecraft:dirt": {
    id: "minecraft:dirt",
    name: "Dirt",
    icon: "🟤",
    type: "floor",
    passable: false,
    breakable: true,
    drops: [{ itemId: "minecraft:dirt", count: 1 }],
    tillable: true,
    tilledTileId: "minecraft:farmland",
    tilledDrops: [
      { itemId: "arcadialbonsaitrees:bonsai_oak_sapling", count: 1, chance: 0.15 },
      { itemId: "arcadialbonsaitrees:bonsai_spruce_sapling", count: 1, chance: 0.05 },
      { itemId: "arcadialbonsaitrees:bonsai_birch_sapling", count: 1, chance: 0.05 },
      { itemId: "arcadialbonsaitrees:bonsai_acacia_sapling", count: 1, chance: 0.05 },
      { itemId: "arcadialbonsaitrees:bonsai_darkoak_sapling", count: 1, chance: 0.025 },
      { itemId: "arcadialbonsaitrees:bonsai_jungle_sapling", count: 1, chance: 0.005 },
      { itemId: "minecraft:wheat_seeds", count: 1, chance: 0.15 },
      { itemId: "immersiveengineering:seed", count: 1, chance: 0.02 },
      { itemId: "exnihilocreatio:item_pebble:0", count: 1, chance: 0.2 },
    ],
    textureDataUrl: DIRT_TEXTURE_DATA_URL,
  },
  "minecraft:farmland": {
    id: "minecraft:farmland",
    name: "Farmland",
    icon: "🌾",
    type: "farmland",
    passable: false,
    breakable: true,
    drops: [{ itemId: "minecraft:dirt", count: 1 }],
    tillable: false,
    textureDataUrl: FARMLAND_DRY_TEXTURE_DATA_URL,
  },
  "minecraft:bedrock": {
    id: "minecraft:bedrock",
    name: "Bedrock",
    type: "floor",
    passable: false,
    breakable: false,
    tillable: false,
    textureDataUrl: BEDROCK_TEXTURE_DATA_URL,
  },
  "compactmachines3:machine_tiny": {
    id: "compactmachines3:machine_tiny",
    name: "Tiny Compact Machine",
    type: "machine",
    passable: false,
    breakable: false,
    tillable: false,
  },
  "craftingstation:crafting_station": {
    id: "craftingstation:crafting_station",
    name: "Crafting Station",
    type: "machine",
    passable: false,
    breakable: true,
    drops: [{ itemId: "craftingstation:crafting_station", count: 1 }],
    tillable: false,
    textureDataUrl: CRAFTING_STATION_TEXTURE_DATA_URL,
  },
  "minecraft:planks": {
    id: "minecraft:planks",
    name: "Oak Planks",
    type: "floor",
    passable: false,
    breakable: true,
    drops: [{ itemId: "minecraft:planks", count: 1 }],
    tillable: false,
  },
  "minecraft:cobblestone": {
    id: "minecraft:cobblestone",
    name: "Cobblestone",
    type: "floor",
    passable: false,
    breakable: true,
    drops: [{ itemId: "minecraft:cobblestone", count: 1 }],
    tillable: false,
  },
  "minecraft:torch": {
    id: "minecraft:torch",
    name: "Torch",
    type: "machine",
    passable: true,
    breakable: true,
    drops: [{ itemId: "minecraft:torch", count: 1 }],
    tillable: false,
  },
  "arcadialbonsaitrees:bonsai_oak_sapling": {
    id: "arcadialbonsaitrees:bonsai_oak_sapling",
    name: "Bonsai Oak Sapling",
    icon: "🌳",
    type: "crop",
    passable: true,
    breakable: true,
    isCrop: true,
    maxGrowthTicks: 1200,
    drops: [{ itemId: "arcadialbonsaitrees:bonsai_oak_sapling", count: 1 }],
    harvestDrops: [
      { itemId: "arcadialbonsaitrees:bonsai_oak_cutting", count: 1, min: 1, max: 3 },
      { itemId: "minecraft:leaves", count: 1, min: 0, max: 2 },
      { itemId: "minecraft:stick", count: 1, min: 0, max: 1 },
    ],
    tillable: false,
    textureDataUrl: BONSAI_OAK_SAPLING_TEXTURE_DATA_URL,
  },
  "arcadialbonsaitrees:bonsai_spruce_sapling": {
    id: "arcadialbonsaitrees:bonsai_spruce_sapling",
    name: "Bonsai Spruce Sapling",
    icon: "🌲",
    type: "crop",
    passable: true,
    breakable: true,
    isCrop: true,
    maxGrowthTicks: 1200,
    drops: [{ itemId: "arcadialbonsaitrees:bonsai_spruce_sapling", count: 1 }],
    harvestDrops: [
      { itemId: "arcadialbonsaitrees:bonsai_oak_cutting", count: 1, min: 1, max: 3 },
      { itemId: "minecraft:leaves", count: 1, min: 0, max: 2 },
      { itemId: "minecraft:stick", count: 1, min: 0, max: 1 },
    ],
    tillable: false,
    textureDataUrl: BONSAI_SPRUCE_SAPLING_TEXTURE_DATA_URL,
  },
  "arcadialbonsaitrees:bonsai_birch_sapling": {
    id: "arcadialbonsaitrees:bonsai_birch_sapling",
    name: "Bonsai Birch Sapling",
    icon: "🌳",
    type: "crop",
    passable: true,
    breakable: true,
    isCrop: true,
    maxGrowthTicks: 1200,
    drops: [{ itemId: "arcadialbonsaitrees:bonsai_birch_sapling", count: 1 }],
    harvestDrops: [
      { itemId: "arcadialbonsaitrees:bonsai_oak_cutting", count: 1, min: 1, max: 3 },
      { itemId: "minecraft:leaves", count: 1, min: 0, max: 2 },
      { itemId: "minecraft:stick", count: 1, min: 0, max: 1 },
    ],
    tillable: false,
    textureDataUrl: BONSAI_BIRCH_SAPLING_TEXTURE_DATA_URL,
  },
  "arcadialbonsaitrees:bonsai_jungle_sapling": {
    id: "arcadialbonsaitrees:bonsai_jungle_sapling",
    name: "Bonsai Jungle Sapling",
    icon: "🌴",
    type: "crop",
    passable: true,
    breakable: true,
    isCrop: true,
    maxGrowthTicks: 1200,
    drops: [{ itemId: "arcadialbonsaitrees:bonsai_jungle_sapling", count: 1 }],
    harvestDrops: [
      { itemId: "arcadialbonsaitrees:bonsai_oak_cutting", count: 1, min: 1, max: 3 },
      { itemId: "minecraft:leaves", count: 1, min: 0, max: 2 },
      { itemId: "minecraft:stick", count: 1, min: 0, max: 1 },
    ],
    tillable: false,
    textureDataUrl: BONSAI_JUNGLE_SAPLING_TEXTURE_DATA_URL,
  },
  "arcadialbonsaitrees:bonsai_acacia_sapling": {
    id: "arcadialbonsaitrees:bonsai_acacia_sapling",
    name: "Bonsai Acacia Sapling",
    icon: "🎋",
    type: "crop",
    passable: true,
    breakable: true,
    isCrop: true,
    maxGrowthTicks: 1200,
    drops: [{ itemId: "arcadialbonsaitrees:bonsai_acacia_sapling", count: 1 }],
    harvestDrops: [
      { itemId: "arcadialbonsaitrees:bonsai_oak_cutting", count: 1, min: 1, max: 3 },
      { itemId: "minecraft:leaves", count: 1, min: 0, max: 2 },
      { itemId: "minecraft:stick", count: 1, min: 0, max: 1 },
    ],
    tillable: false,
    textureDataUrl: BONSAI_ACACIA_SAPLING_TEXTURE_DATA_URL,
  },
  "arcadialbonsaitrees:bonsai_darkoak_sapling": {
    id: "arcadialbonsaitrees:bonsai_darkoak_sapling",
    name: "Bonsai Dark Oak Sapling",
    icon: "🌳",
    type: "crop",
    passable: true,
    breakable: true,
    isCrop: true,
    maxGrowthTicks: 1200,
    drops: [{ itemId: "arcadialbonsaitrees:bonsai_darkoak_sapling", count: 1 }],
    harvestDrops: [
      { itemId: "arcadialbonsaitrees:bonsai_oak_cutting", count: 1, min: 1, max: 3 },
      { itemId: "minecraft:leaves", count: 1, min: 0, max: 2 },
      { itemId: "minecraft:stick", count: 1, min: 0, max: 1 },
    ],
    tillable: false,
    textureDataUrl: BONSAI_DARKOAK_SAPLING_TEXTURE_DATA_URL,
  },
  "minecraft:wheat": {
    id: "minecraft:wheat",
    name: "Wheat Crop",
    icon: "🌾",
    type: "crop",
    passable: true,
    breakable: true,
    isCrop: true,
    maxGrowthTicks: 1200,
    drops: [{ itemId: "minecraft:wheat_seeds", count: 1 }],
    harvestDrops: [
      { itemId: "minecraft:wheat", count: 1 },
      { itemId: "minecraft:wheat_seeds", count: 1, min: 1, max: 3 },
    ],
    tillable: false,
  },
  "immersiveengineering:hemp": {
    id: "immersiveengineering:hemp",
    name: "Industrial Hemp (Bottom)",
    icon: "🌱",
    type: "crop",
    passable: true,
    breakable: true,
    isCrop: true,
    maxGrowthTicks: 1200,
    drops: [{ itemId: "immersiveengineering:seed", count: 1 }],
    harvestDrops: [
      { itemId: "immersiveengineering:material:4", count: 1, min: 1, max: 2 },
      { itemId: "immersiveengineering:seed", count: 1, chance: 0.5 },
    ],
    tillable: false,
  },
  "immersiveengineering:hemp_top": {
    id: "immersiveengineering:hemp_top",
    name: "Industrial Hemp (Top)",
    icon: "🌱",
    type: "crop",
    passable: true,
    breakable: true,
    drops: [{ itemId: "immersiveengineering:material:4", count: 1, min: 1, max: 2 }],
    tillable: false,
  },
};

/**
 * Helper to fetch item definition safely.
 */
export function getItemDefinition(itemId: string): ItemDefinition | undefined {
  return ITEM_REGISTRY[itemId];
}

/**
 * Helper to fetch block definition safely.
 */
export function getBlockDefinition(tileId: string): BlockDefinition | undefined {
  return BLOCK_REGISTRY[tileId];
}
