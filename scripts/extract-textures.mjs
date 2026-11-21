#!/usr/bin/env node
/**
 * Stage 1: Extracts raw PNG textures from `vendor/compact-claustrophobia/` jars & resources
 * (or optionally from a Prism Launcher install via `--prism`) into `assets/textures/`.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { getAllTextureEntries } from "./texture-manifest.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const VENDOR_DIR = path.join(ROOT_DIR, "vendor", "compact-claustrophobia");
const EXTRACTED_TEXTURES_DIR = path.join(ROOT_DIR, "assets", "textures");

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
  throw new Error(`Could not locate PrismLauncher directory. Pass --prism <path> or set PRISM_DIR.`);
}

function readZipEntries(jarPath) {
  const buf = fs.readFileSync(jarPath);
  const entries = new Map();

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

  if (entry.compressionMethod === 0) return Buffer.from(raw);
  if (entry.compressionMethod === 8) return zlib.inflateRawSync(raw);
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

function buildPrismAssetIndex(prismDir, instanceName) {
  const instanceRoot = path.join(prismDir, "instances", instanceName);
  const mcRoot = fs.existsSync(path.join(instanceRoot, "minecraft"))
    ? path.join(instanceRoot, "minecraft")
    : path.join(instanceRoot, ".minecraft");

  if (!fs.existsSync(mcRoot)) {
    throw new Error(`Could not find minecraft directory inside ${instanceRoot}`);
  }

  const assetLoaders = new Map();
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
  }

  const modsDir = path.join(mcRoot, "mods");
  if (fs.existsSync(modsDir)) {
    const jarFiles = fs.readdirSync(modsDir).filter((f) => f.toLowerCase().endsWith(".jar")).sort();
    for (const jarName of jarFiles) {
      for (const [k, entry] of readZipEntries(path.join(modsDir, jarName))) {
        assetLoaders.set(k, () => extractZipEntryBuffer(entry));
      }
    }
  }

  indexResourcesDirectory(assetLoaders, path.join(mcRoot, "resources"));
  return { assetLoaders, sourceLabel: `Prism Launcher (${instanceName})` };
}

export function extractTextures(argv = []) {
  const args = parseArgs(argv);
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
  const entries = getAllTextureEntries();
  let written = 0;

  for (const entry of entries) {
    const loader = assetLoaders.get(entry.asset.toLowerCase());
    if (!loader) {
      throw new Error(`Missing asset in ${sourceLabel}: ${entry.asset}`);
    }
    const outPath = path.join(EXTRACTED_TEXTURES_DIR, entry.extractedRelPath);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, loader());
    written++;
  }

  console.log(
    `[Stage 1] Extracted ${written} PNG textures from ${sourceLabel} -> ${path.relative(ROOT_DIR, EXTRACTED_TEXTURES_DIR)}`
  );
  return written;
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}` || process.argv[1]?.endsWith("extract-textures.mjs")) {
  extractTextures(process.argv.slice(2));
}
