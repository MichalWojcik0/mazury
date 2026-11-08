import {
  COMPACT_WALL_TEXTURE_DATA_URL,
  DIRT_TEXTURE_DATA_URL,
  FARMLAND_DRY_TEXTURE_DATA_URL,
  BEDROCK_TEXTURE_DATA_URL,
  CRAFTING_STATION_TEXTURE_DATA_URL,
  BONSAI_OAK_SAPLING_TEXTURE_DATA_URL,
  BONSAI_SPRUCE_SAPLING_TEXTURE_DATA_URL,
  BONSAI_BIRCH_SAPLING_TEXTURE_DATA_URL,
  BONSAI_JUNGLE_SAPLING_TEXTURE_DATA_URL,
  BONSAI_ACACIA_SAPLING_TEXTURE_DATA_URL,
  BONSAI_DARKOAK_SAPLING_TEXTURE_DATA_URL,
} from "../render/textures.ts";

export interface BlockDefinition {
  id: string;
  name: string;
  icon?: string;
  type: "air" | "solid_wall" | "floor" | "machine" | "conduit" | "tunnel" | "farmland" | "crop";
  passable: boolean;
  occluding?: boolean;
  breakable?: boolean;
  drops?: Array<{ itemId: string; count: number; chance?: number }>;
  tillable?: boolean;
  tilledTileId?: string;
  tilledDrops?: Array<{ itemId: string; count: number; chance?: number }>;
  isCrop?: boolean;
  maxGrowthTicks?: number;
  harvestDrops?: Array<{ itemId: string; count: number; chance?: number; min?: number; max?: number }>;
  textureDataUrl?: string;
}

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
      { itemId: "arcadialbonsaitrees:bonsai_oak_cutting", count: 4 },
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
      { itemId: "arcadialbonsaitrees:bonsai_spruce_cutting", count: 4 },
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
      { itemId: "arcadialbonsaitrees:bonsai_birch_cutting", count: 4 },
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
      { itemId: "arcadialbonsaitrees:bonsai_jungle_cutting", count: 4 },
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
      { itemId: "arcadialbonsaitrees:bonsai_acacia_cutting", count: 4 },
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
      { itemId: "arcadialbonsaitrees:bonsai_darkoak_cutting", count: 4 },
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
