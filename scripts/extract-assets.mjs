#!/usr/bin/env node
/**
 * Extracts authentic textures directly from the vendored Compact Claustrophobia jars & resources
 * (`vendor/compact-claustrophobia/`) — or optionally from a local Prism Launcher installation —
 * and generates `src/render/textures.ts`.
 *
 * Usage:
 *   node scripts/extract-assets.mjs
 *   node scripts/extract-assets.mjs --prism "C:\path\to\PrismLauncher" --instance "Compact Claustrophobia"
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const VENDOR_DIR = path.join(ROOT_DIR, "vendor", "compact-claustrophobia");
const OUTPUT_FILE = path.join(ROOT_DIR, "src", "render", "textures.ts");

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--prism" && argv[i + 1]) {
      args.prism = argv[++i];
    } else if (argv[i] === "--instance" && argv[i + 1]) {
      args.instance = argv[++i];
    }
  }
  return args;
}

function findPrismLauncherDir(explicitDir) {
  const candidates = [
    explicitDir,
    process.env.PRISM_DIR,
    process.env.APPDATA ? path.join(process.env.APPDATA, "PrismLauncher") : null,
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "PrismLauncher") : null,
    path.join(os.homedir(), "Library", "Application Support", "PrismLauncher"),
    path.join(os.homedir(), ".local", "share", "PrismLauncher"),
    path.join(os.homedir(), "PrismLauncher"),
  ].filter(Boolean);

  for (const dir of candidates) {
    if (fs.existsSync(dir) && fs.existsSync(path.join(dir, "instances"))) {
      return dir;
    }
  }
  throw new Error(
    `Could not locate PrismLauncher directory. Pass --prism <path> or set PRISM_DIR.\nChecked:\n${candidates.join("\n")}`
  );
}

/**
 * Minimal zero-dependency ZIP/JAR reader supporting Stored (0) and Deflate (8) entries.
 */
function readZipEntries(jarPath) {
  const buf = fs.readFileSync(jarPath);
  const entries = new Map();

  // Locate End of Central Directory (EOCD) signature 0x06054b50 from end of file
  let eocdOffset = -1;
  const minOffset = Math.max(0, buf.length - 65557);
  for (let i = buf.length - 22; i >= minOffset; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) return entries;

  const cdCount = buf.readUInt16LE(eocdOffset + 10);
  const cdOffset = buf.readUInt32LE(eocdOffset + 16);

  let pos = cdOffset;
  for (let i = 0; i < cdCount; i++) {
    if (pos + 46 > buf.length || buf.readUInt32LE(pos) !== 0x02014b50) break;

    const compressionMethod = buf.readUInt16LE(pos + 10);
    const compressedSize = buf.readUInt32LE(pos + 20);
    const nameLen = buf.readUInt16LE(pos + 28);
    const extraLen = buf.readUInt16LE(pos + 30);
    const commentLen = buf.readUInt16LE(pos + 32);
    const localHeaderOffset = buf.readUInt32LE(pos + 42);

    const name = buf.toString("utf8", pos + 46, pos + 46 + nameLen);
    pos += 46 + nameLen + extraLen + commentLen;

    if (!name.startsWith("assets/") || !name.endsWith(".png")) continue;

    entries.set(name.toLowerCase(), {
      name,
      jarPath,
      compressionMethod,
      compressedSize,
      localHeaderOffset,
    });
  }

  return entries;
}

function extractZipEntryBuffer(entry) {
  const buf = fs.readFileSync(entry.jarPath);
  const off = entry.localHeaderOffset;
  if (buf.readUInt32LE(off) !== 0x04034b50) {
    throw new Error(`Invalid local file header in ${entry.jarPath} for ${entry.name}`);
  }
  const nameLen = buf.readUInt16LE(off + 26);
  const extraLen = buf.readUInt16LE(off + 28);
  const dataStart = off + 30 + nameLen + extraLen;
  const raw = buf.subarray(dataStart, dataStart + entry.compressedSize);

  if (entry.compressionMethod === 0) {
    return Buffer.from(raw);
  }
  if (entry.compressionMethod === 8) {
    return zlib.inflateRawSync(raw);
  }
  throw new Error(`Unsupported ZIP compression method ${entry.compressionMethod} for ${entry.name}`);
}

function indexResourcesDirectory(assetLoaders, resourcesDir) {
  if (!fs.existsSync(resourcesDir)) return;
  const walk = (dir) => {
    for (const dirent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, dirent.name);
      if (dirent.isDirectory()) {
        walk(full);
      } else if (dirent.isFile() && dirent.name.toLowerCase().endsWith(".png")) {
        const rel = path.relative(resourcesDir, full).replace(/\\/g, "/");
        assetLoaders.set(`assets/${rel}`.toLowerCase(), () => fs.readFileSync(full));
      }
    }
  };
  walk(resourcesDir);
}

/**
 * Indexes PNG assets from the vendored `vendor/compact-claustrophobia/` directory.
 * Precedence: vanilla client jar < mod jars < resources/ overrides.
 */
function buildVendorAssetIndex(vendorDir) {
  const assetLoaders = new Map();
  const jarsDir = path.join(vendorDir, "jars");
  const resourcesDir = path.join(vendorDir, "resources");

  if (!fs.existsSync(jarsDir)) {
    throw new Error(`Vendored jars directory not found: ${jarsDir}`);
  }

  const jarFiles = fs
    .readdirSync(jarsDir)
    .filter((f) => f.toLowerCase().endsWith(".jar"))
    .sort((a, b) => {
      // Load vanilla Minecraft jar first so mod jars can override it
      const aVanilla = a.toLowerCase().startsWith("minecraft-");
      const bVanilla = b.toLowerCase().startsWith("minecraft-");
      if (aVanilla !== bVanilla) return aVanilla ? -1 : 1;
      return a.localeCompare(b);
    });

  for (const jarName of jarFiles) {
    const jarPath = path.join(jarsDir, jarName);
    for (const [k, entry] of readZipEntries(jarPath)) {
      assetLoaders.set(k, () => extractZipEntryBuffer(entry));
    }
  }

  indexResourcesDirectory(assetLoaders, resourcesDir);
  return { assetLoaders, sourceLabel: path.relative(ROOT_DIR, vendorDir) };
}

/**
 * Indexes all PNG assets across a Prism Launcher instance:
 *   1. Vanilla Minecraft 1.12.2 jar (lowest priority)
 *   2. Modpack mods/*.jar
 *   3. Modpack resources/ directory (highest priority, overrides jars)
 */
function buildPrismAssetIndex(prismDir, instanceName) {
  const instanceRoot = path.join(prismDir, "instances", instanceName);
  const mcRoot = fs.existsSync(path.join(instanceRoot, "minecraft"))
    ? path.join(instanceRoot, "minecraft")
    : path.join(instanceRoot, ".minecraft");

  if (!fs.existsSync(mcRoot)) {
    throw new Error(`Could not find minecraft directory inside ${instanceRoot}`);
  }

  // key: lowercase "assets/<namespace>/textures/..." -> () => Buffer
  const assetLoaders = new Map();

  // 1. Vanilla 1.12.2 client jar
  const vanillaJar = path.join(
    prismDir,
    "libraries",
    "com",
    "mojang",
    "minecraft",
    "1.12.2",
    "minecraft-1.12.2-client.jar"
  );
  if (fs.existsSync(vanillaJar)) {
    for (const [k, entry] of readZipEntries(vanillaJar)) {
      assetLoaders.set(k, () => extractZipEntryBuffer(entry));
    }
  } else {
    console.warn(`Warning: Vanilla 1.12.2 jar not found at ${vanillaJar}`);
  }

  // 2. Modpack mods/*.jar
  const modsDir = path.join(mcRoot, "mods");
  if (fs.existsSync(modsDir)) {
    const jarFiles = fs
      .readdirSync(modsDir)
      .filter((f) => f.toLowerCase().endsWith(".jar"))
      .sort();
    for (const jarName of jarFiles) {
      const jarPath = path.join(modsDir, jarName);
      for (const [k, entry] of readZipEntries(jarPath)) {
        assetLoaders.set(k, () => extractZipEntryBuffer(entry));
      }
    }
  }

  // 3. Modpack resources/ directory overrides (e.g. ResourceLoader / ContentTweaker)
  indexResourcesDirectory(assetLoaders, path.join(mcRoot, "resources"));

  return { assetLoaders, sourceLabel: `Prism Launcher (${instanceName})` };
}

/**
 * Declarative texture manifest mapping exported TS constants & game IDs
 * to their exact Minecraft / Compact Claustrophobia asset paths.
 */
const TEXTURE_MANIFEST = [
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

const BONSAI_WOOD_TYPES = ["oak", "spruce", "birch", "jungle", "acacia", "darkoak"];

function loadDataUrl(assetLoaders, assetPath) {
  const loader = assetLoaders.get(assetPath.toLowerCase());
  if (!loader) {
    throw new Error(`Missing asset in local Compact Claustrophobia install: ${assetPath}`);
  }
  const buf = loader();
  return `data:image/png;base64,${buf.toString("base64")}`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  let indexResult;

  if (args.prism) {
    const prismDir = findPrismLauncherDir(args.prism);
    const instanceName = args.instance || process.env.CC_INSTANCE || "Compact Claustrophobia";
    indexResult = buildPrismAssetIndex(prismDir, instanceName);
  } else if (fs.existsSync(path.join(VENDOR_DIR, "jars"))) {
    indexResult = buildVendorAssetIndex(VENDOR_DIR);
  } else {
    const prismDir = findPrismLauncherDir();
    const instanceName = args.instance || process.env.CC_INSTANCE || "Compact Claustrophobia";
    indexResult = buildPrismAssetIndex(prismDir, instanceName);
  }

  const { assetLoaders, sourceLabel } = indexResult;
  console.log(`Indexing assets from ${sourceLabel}`);
  console.log(`Indexed ${assetLoaders.size} PNG textures.`);

  const lines = [
    "/**",
    " * AUTO-GENERATED by `scripts/extract-assets.mjs` from vendored Compact Claustrophobia jars & resources.",
    " * Run `npm run extract-assets` to regenerate.",
    " */",
    "",
  ];

  for (const item of TEXTURE_MANIFEST) {
    const dataUrl = loadDataUrl(assetLoaders, item.asset);
    lines.push(`export const ${item.constName} =`);
    lines.push(`  "${dataUrl}";`);
  }

  lines.push("");
  lines.push("export const TEXTURE_MAP: Record<string, string> = {");
  for (const item of TEXTURE_MANIFEST) {
    lines.push(`  "${item.mapId}": ${item.constName},`);
  }
  // Also include 8-stage growth block textures for all 6 bonsai tree types
  for (const wood of BONSAI_WOOD_TYPES) {
    for (let stage = 0; stage <= 7; stage++) {
      const assetPath = `assets/arcadialbonsaitrees/textures/blocks/bonsai_${wood}/bonsai_${wood}${stage}.png`;
      const dataUrl = loadDataUrl(assetLoaders, assetPath);
      lines.push(`  "arcadialbonsaitrees:bonsai_${wood}_stage_${stage}": "${dataUrl}",`);
    }
  }
  lines.push("};");
  lines.push("");

  fs.writeFileSync(OUTPUT_FILE, lines.join("\n"), "utf8");
  const totalTextures = TEXTURE_MANIFEST.length + BONSAI_WOOD_TYPES.length * 8;
  console.log(`Generated ${path.relative(ROOT_DIR, OUTPUT_FILE)} with ${totalTextures} authentic textures.`);
}

main();
