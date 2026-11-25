/**
 * Single source of truth mapping game texture constants & IDs to their
 * canonical Minecraft / Compact Claustrophobia asset paths.
 *
 * Pipeline:
 *   1. `scripts/extract-textures.mjs` extracts PNGs from `vendor/compact-claustrophobia/` -> `assets/textures/`
 *   2. `scripts/build-textures.mjs` base64-encodes PNGs from `assets/textures/` -> `src/render/textures.ts`
 */

export const TEXTURE_MANIFEST = [
  // Compact Machines 3
  { constName: "COMPACT_WALL_TEXTURE_DATA_URL", mapId: "compactmachines3:wall", asset: "assets/compactmachines3/textures/blocks/wall.png" },
  { constName: "COMPACT_MACHINE_TINY_TEXTURE_DATA_URL", mapId: "compactmachines3:machine_tiny", asset: "assets/compactmachines3/textures/blocks/machine_0.png" },
  { constName: "PSD_TEXTURE_DATA_URL", mapId: "compactmachines3:psd", asset: "assets/compactmachines3/textures/items/psd.png" },
  { constName: "FIELD_PROJECTOR_TEXTURE_DATA_URL", mapId: "compactmachines3:field_projector", asset: "assets/compactmachines3/textures/blocks/fieldprojector.png" },

  // Vanilla Minecraft 1.12.2 blocks & items
  { constName: "DIRT_TEXTURE_DATA_URL", mapId: "minecraft:dirt", asset: "assets/minecraft/textures/blocks/dirt.png" },
  { constName: "FARMLAND_DRY_TEXTURE_DATA_URL", mapId: "minecraft:farmland", asset: "assets/minecraft/textures/blocks/farmland_dry.png" },
  { constName: "BEDROCK_TEXTURE_DATA_URL", mapId: "minecraft:bedrock", asset: "assets/minecraft/textures/blocks/bedrock.png" },
  { constName: "COBBLESTONE_TEXTURE_DATA_URL", mapId: "minecraft:cobblestone", asset: "assets/minecraft/textures/blocks/cobblestone.png" },
  { constName: "GRAVEL_TEXTURE_DATA_URL", mapId: "minecraft:gravel", asset: "assets/minecraft/textures/blocks/gravel.png" },
  { constName: "CRAFTING_STATION_TEXTURE_DATA_URL", mapId: "craftingstation:crafting_station", asset: "assets/minecraft/textures/blocks/crafting_table_top.png" },
  { constName: "PLANKS_OAK_TEXTURE_DATA_URL", mapId: "minecraft:planks", asset: "assets/minecraft/textures/blocks/planks_oak.png" },
  { constName: "STICK_TEXTURE_DATA_URL", mapId: "minecraft:stick", asset: "assets/minecraft/textures/items/stick.png" },
  { constName: "STRING_TEXTURE_DATA_URL", mapId: "minecraft:string", asset: "assets/minecraft/textures/items/string.png" },
  { constName: "WHEAT_TEXTURE_DATA_URL", mapId: "minecraft:wheat", asset: "assets/minecraft/textures/items/wheat.png" },
  { constName: "WHEAT_SEEDS_TEXTURE_DATA_URL", mapId: "minecraft:wheat_seeds", asset: "assets/minecraft/textures/items/seeds_wheat.png" },
  { constName: "WOODEN_PICKAXE_TEXTURE_DATA_URL", mapId: "minecraft:wooden_pickaxe", asset: "assets/minecraft/textures/items/wood_pickaxe.png" },
  { constName: "STONE_PICKAXE_TEXTURE_DATA_URL", mapId: "minecraft:stone_pickaxe", asset: "assets/minecraft/textures/items/stone_pickaxe.png" },
  { constName: "IRON_PICKAXE_TEXTURE_DATA_URL", mapId: "minecraft:iron_pickaxe", asset: "assets/minecraft/textures/items/iron_pickaxe.png" },
  { constName: "DIAMOND_PICKAXE_TEXTURE_DATA_URL", mapId: "minecraft:diamond_pickaxe", asset: "assets/minecraft/textures/items/diamond_pickaxe.png" },
  { constName: "TORCH_TEXTURE_DATA_URL", mapId: "minecraft:torch", asset: "assets/minecraft/textures/blocks/torch_on.png" },

  // ContentTweaker & CropDusting
  { constName: "DIRT_DUST_TEXTURE_DATA_URL", mapId: "contenttweaker:dirtdust", asset: "assets/contenttweaker/textures/items/dirtdust.png" },
  { constName: "GRAVEL_DUST_TEXTURE_DATA_URL", mapId: "contenttweaker:graveldust", asset: "assets/contenttweaker/textures/items/graveldust.png" },
  { constName: "POOP_TEXTURE_DATA_URL", mapId: "cropdusting:poop", asset: "assets/cropdusting/textures/items/poop.png" },
  { constName: "POOP_FUEL_TEXTURE_DATA_URL", mapId: "contenttweaker:poopfuel", asset: "assets/contenttweaker/textures/items/poopfuel.png" },

  // Ex Nihilo Creatio
  { constName: "STONE_PEBBLE_TEXTURE_DATA_URL", mapId: "exnihilocreatio:item_pebble:0", asset: "assets/exnihilocreatio/textures/items/item_pebble.png" },
  { constName: "GRANITE_PEBBLE_TEXTURE_DATA_URL", mapId: "exnihilocreatio:item_pebble:1", asset: "assets/exnihilocreatio/textures/items/item_pebble_granite.png" },
  { constName: "DIORITE_PEBBLE_TEXTURE_DATA_URL", mapId: "exnihilocreatio:item_pebble:2", asset: "assets/exnihilocreatio/textures/items/item_pebble_diorite.png" },
  { constName: "ANDESITE_PEBBLE_TEXTURE_DATA_URL", mapId: "exnihilocreatio:item_pebble:3", asset: "assets/exnihilocreatio/textures/items/item_pebble_andesite.png" },
  { constName: "HAMMER_WOOD_TEXTURE_DATA_URL", mapId: "exnihilocreatio:hammer_wood", asset: "assets/exnihilocreatio/textures/items/hammerwood.png" },

  // Stone Pickaxe Grits / Dusts & Further Products (Ingots & Nuggets)
  { constName: "IRON_GRIT_TEXTURE_DATA_URL", mapId: "exnihilocreatio:item_ore_iron:0", asset: "assets/immersiveengineering/textures/items/metal_dust_iron.png" },
  { constName: "COPPER_GRIT_TEXTURE_DATA_URL", mapId: "exnihilocreatio:item_ore_copper:0", asset: "assets/immersiveengineering/textures/items/metal_dust_copper.png" },
  { constName: "TIN_GRIT_TEXTURE_DATA_URL", mapId: "nuclearcraft:dust:2", asset: "assets/nuclearcraft/textures/items/dust_tin.png" },
  { constName: "LEAD_GRIT_TEXTURE_DATA_URL", mapId: "immersiveengineering:metal:13", asset: "assets/immersiveengineering/textures/items/metal_dust_lead.png" },
  { constName: "BERYLLIUM_DUST_TEXTURE_DATA_URL", mapId: "nuclearcraft:dust:1", asset: "assets/nuclearcraft/textures/items/dust_beryllium.png" },
  { constName: "IRON_INGOT_TEXTURE_DATA_URL", mapId: "minecraft:iron_ingot", asset: "assets/minecraft/textures/items/iron_ingot.png" },
  { constName: "IRON_NUGGET_TEXTURE_DATA_URL", mapId: "minecraft:iron_nugget", asset: "assets/minecraft/textures/items/iron_nugget.png" },
  { constName: "COPPER_INGOT_TEXTURE_DATA_URL", mapId: "immersiveengineering:metal:0", asset: "assets/immersiveengineering/textures/items/metal_ingot_copper.png" },
  { constName: "COPPER_NUGGET_TEXTURE_DATA_URL", mapId: "immersiveengineering:metal:20", asset: "assets/immersiveengineering/textures/items/metal_nugget_copper.png" },
  { constName: "TIN_INGOT_TEXTURE_DATA_URL", mapId: "nuclearcraft:ingot:2", asset: "assets/nuclearcraft/textures/items/ingot_tin.png" },
  { constName: "LEAD_INGOT_TEXTURE_DATA_URL", mapId: "immersiveengineering:metal:2", asset: "assets/immersiveengineering/textures/items/metal_ingot_lead.png" },
  { constName: "LEAD_NUGGET_TEXTURE_DATA_URL", mapId: "immersiveengineering:metal:22", asset: "assets/immersiveengineering/textures/items/metal_nugget_lead.png" },
  { constName: "BERYLLIUM_INGOT_TEXTURE_DATA_URL", mapId: "nuclearcraft:ingot:1", asset: "assets/nuclearcraft/textures/items/ingot_beryllium.png" },

  // Arcadial Bonsai Trees (saplings & cuttings)
  { constName: "BONSAI_OAK_SAPLING_TEXTURE_DATA_URL", mapId: "arcadialbonsaitrees:bonsai_oak_sapling", asset: "assets/arcadialbonsaitrees/textures/items/bonsai_oak_sapling.png" },
  { constName: "BONSAI_SPRUCE_SAPLING_TEXTURE_DATA_URL", mapId: "arcadialbonsaitrees:bonsai_spruce_sapling", asset: "assets/arcadialbonsaitrees/textures/items/bonsai_spruce_sapling.png" },
  { constName: "BONSAI_BIRCH_SAPLING_TEXTURE_DATA_URL", mapId: "arcadialbonsaitrees:bonsai_birch_sapling", asset: "assets/arcadialbonsaitrees/textures/items/bonsai_birch_sapling.png" },
  { constName: "BONSAI_JUNGLE_SAPLING_TEXTURE_DATA_URL", mapId: "arcadialbonsaitrees:bonsai_jungle_sapling", asset: "assets/arcadialbonsaitrees/textures/items/bonsai_jungle_sapling.png" },
  { constName: "BONSAI_ACACIA_SAPLING_TEXTURE_DATA_URL", mapId: "arcadialbonsaitrees:bonsai_acacia_sapling", asset: "assets/arcadialbonsaitrees/textures/items/bonsai_acacia_sapling.png" },
  { constName: "BONSAI_DARKOAK_SAPLING_TEXTURE_DATA_URL", mapId: "arcadialbonsaitrees:bonsai_darkoak_sapling", asset: "assets/arcadialbonsaitrees/textures/items/bonsai_darkoak_sapling.png" },
  { constName: "BONSAI_OAK_CUTTING_TEXTURE_DATA_URL", mapId: "arcadialbonsaitrees:bonsai_oak_cutting", asset: "assets/arcadialbonsaitrees/textures/items/bonsai_oak_cutting.png" },
  { constName: "BONSAI_SPRUCE_CUTTING_TEXTURE_DATA_URL", mapId: "arcadialbonsaitrees:bonsai_spruce_cutting", asset: "assets/arcadialbonsaitrees/textures/items/bonsai_spruce_cutting.png" },
  { constName: "BONSAI_BIRCH_CUTTING_TEXTURE_DATA_URL", mapId: "arcadialbonsaitrees:bonsai_birch_cutting", asset: "assets/arcadialbonsaitrees/textures/items/bonsai_birch_cutting.png" },
  { constName: "BONSAI_JUNGLE_CUTTING_TEXTURE_DATA_URL", mapId: "arcadialbonsaitrees:bonsai_jungle_cutting", asset: "assets/arcadialbonsaitrees/textures/items/bonsai_jungle_cutting.png" },
  { constName: "BONSAI_ACACIA_CUTTING_TEXTURE_DATA_URL", mapId: "arcadialbonsaitrees:bonsai_acacia_cutting", asset: "assets/arcadialbonsaitrees/textures/items/bonsai_acacia_cutting.png" },
  { constName: "BONSAI_DARKOAK_CUTTING_TEXTURE_DATA_URL", mapId: "arcadialbonsaitrees:bonsai_darkoak_cutting", asset: "assets/arcadialbonsaitrees/textures/items/bonsai_darkoak_cutting.png" },

  // Immersive Engineering
  { constName: "HEMP_SEED_TEXTURE_DATA_URL", mapId: "immersiveengineering:seed", asset: "assets/immersiveengineering/textures/items/seed_hemp.png" },
  { constName: "HEMP_FIBER_TEXTURE_DATA_URL", mapId: "immersiveengineering:material:4", asset: "assets/immersiveengineering/textures/items/material_hemp_fiber.png" },
];

export const BONSAI_WOOD_TYPES = ["oak", "spruce", "birch", "jungle", "acacia", "darkoak"];

/**
 * Returns all manifest entries including the 8 growth stages for each bonsai wood type.
 */
export function getAllTextureEntries() {
  const entries = TEXTURE_MANIFEST.map((item) => ({
    ...item,
    extractedRelPath: item.asset.replace(/^assets\//, ""),
  }));

  for (const wood of BONSAI_WOOD_TYPES) {
    for (let stage = 0; stage <= 7; stage++) {
      const asset = `assets/arcadialbonsaitrees/textures/blocks/bonsai_${wood}/bonsai_${wood}${stage}.png`;
      entries.push({
        constName: null,
        mapId: `arcadialbonsaitrees:bonsai_${wood}_stage_${stage}`,
        asset,
        extractedRelPath: asset.replace(/^assets\//, ""),
      });
    }
  }

  for (let stage = 0; stage <= 7; stage++) {
    const asset = `assets/minecraft/textures/blocks/wheat_stage_${stage}.png`;
    entries.push({
      constName: null,
      mapId: `minecraft:wheat_stage_${stage}`,
      asset,
      extractedRelPath: asset.replace(/^assets\//, ""),
    });
  }

  return entries;
}
