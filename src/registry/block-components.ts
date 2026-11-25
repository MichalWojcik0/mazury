import type { Player, Room, Tile, Vec3 } from "../core/types.ts";
import type { DeterministicRNG } from "../core/math.ts";
import type { CanvasContext2DLike } from "../render/command-types.ts";
import type { VoxelAction } from "../mechanics/voxel-actions.ts";
import { addItem, removeItem } from "../inventory/inventory.ts";
import { getBlockDefinition } from "./definitions.ts";
import { getGrowthProgress, harvestPlant, isCropTile, tickCropTile } from "../mechanics/farming.ts";
import {
  getSieveState,
  installSieveMesh,
  insertSieveSubstrate,
  isSieveMesh,
  isSieveSubstrate,
  removeSieveMesh,
  siftSieve,
} from "../mechanics/sieve.ts";
import {
  BARREL_REACTIONS,
  FLUID_CAPACITY_MB,
  extractBarrelWater,
  extractCrucibleWater,
  fillBarrelWithWater,
  getBarrelState,
  getCrucibleMeltValue,
  getCrucibleState,
  harvestBarrelOutput,
  insertBarrelItem,
  insertCrucibleItem,
  tickBarrelTile,
  tickCrucibleTile,
} from "../mechanics/fluids.ts";
import { renderCropTile } from "../render/draw-crop.ts";
import { renderCraftingStation } from "../render/draw-crafting-station.ts";
import { renderBarrel, renderCrucible, renderFurnace, renderSieve } from "../render/draw-machines.ts";
import {
  collectFurnaceOutput,
  FURNACE_SMELT_TICKS,
  getFurnaceState,
  insertFurnaceFuel,
  insertFurnaceInput,
  isFurnaceFuel,
  isSmeltable,
  tickFurnaceTile,
} from "../mechanics/furnace.ts";

export interface BlockTickContext {
  room: Room;
  coord: Vec3;
  tile: Tile;
  sneakingPlayers: Player[];
  rng?: DeterministicRNG;
}

export interface BlockInteractContext {
  room: Room;
  coord: Vec3;
  tile: Tile;
  player: Player;
  rng?: DeterministicRNG;
}

export interface BlockActionContext {
  tile: Tile;
  player?: Player;
  coord?: Vec3;
  isInBounds: boolean;
}

export interface BlockRenderContext {
  ctx: CanvasContext2DLike;
  u: number;
  v: number;
  halfW: number;
  halfH: number;
  elevH: number;
  zoom: number;
  tile: Tile;
  getTexture: (id: string) => HTMLImageElement | null;
}

export interface BlockComponent {
  onTick?: (ctx: BlockTickContext) => void;
  onInteract?: (ctx: BlockInteractContext) => boolean;
  onBreak?: (ctx: BlockInteractContext) => boolean;
  getActions?: (ctx: BlockActionContext) => VoxelAction[];
  onRender?: (ctx: BlockRenderContext) => void;
  getStatusText?: (tile: Tile) => string;
}

const CROP_COMPONENT: BlockComponent = {
  onTick: ({ room, coord, tile, sneakingPlayers }) => {
    tickCropTile(room, coord, tile, sneakingPlayers);
  },
  onInteract: ({ tile, player, rng }) => {
    const blockDef = getBlockDefinition(tile.id);
    const { isMature } = getGrowthProgress(tile);
    if (!isMature && !blockDef?.isCropTop) return false;

    const harvestRes = harvestPlant(tile, rng);
    if (!harvestRes.success) return false;

    for (const drop of harvestRes.drops) {
      addItem(player.inventory, drop.id, drop.count);
    }
    return true;
  },
  onBreak: ({ room, coord, tile, player, rng }) => {
    const blockDef = getBlockDefinition(tile.id);
    const { isMature } = getGrowthProgress(tile);
    room.voxels[coord.z][coord.y][coord.x] = {
      id: "minecraft:air",
      type: "air",
      passable: true,
    };

    if (blockDef?.isCropTop) {
      const baseCoord = tile.metadata?.baseCoord as Vec3 | undefined;
      if (baseCoord) {
        const baseTile = room.voxels[baseCoord.z]?.[baseCoord.y]?.[baseCoord.x];
        if (baseTile?.metadata) {
          baseTile.metadata.harvestCooldown = 200;
        }
      }
      if (blockDef.drops?.[0]) {
        addItem(player.inventory, blockDef.drops[0].itemId, blockDef.drops[0].count);
      }
      return true;
    }

    if (isMature) {
      const harvestRes = harvestPlant(tile, rng);
      for (const drop of harvestRes.drops) {
        addItem(player.inventory, drop.id, drop.count);
      }
    }
    if (blockDef?.drops) {
      for (const drop of blockDef.drops) {
        addItem(player.inventory, drop.itemId, drop.count);
      }
    }
    return true;
  },
  getActions: ({ tile }) => {
    const blockDef = getBlockDefinition(tile.id);
    const { isMature } = getGrowthProgress(tile);
    if (!isMature && !blockDef?.isCropTop) return [];
    return [
      {
        id: "harvest",
        label: "Harvest",
        buttonType: "SECONDARY",
        icon: "🌾",
        description: "Harvest mature plant (autoplants in place)",
      },
    ];
  },
  onRender: ({ ctx, u, v, halfW, halfH, elevH, zoom, tile, getTexture }) => {
    const blockDef = getBlockDefinition(tile.id);
    let cropTexture = getTexture(tile.id);
    if (blockDef?.stageTexturePrefix) {
      const { progress, stage } = getGrowthProgress(tile);
      const stageIdx =
        (blockDef.growthStages ?? 4) > 4
          ? Math.max(0, Math.min(7, stage))
          : Math.min(7, Math.floor(progress * 7.999));
      cropTexture = getTexture(`${blockDef.stageTexturePrefix}${stageIdx}`) ?? cropTexture;
    }
    renderCropTile(ctx, u, v, halfW, halfH, elevH, zoom, tile, cropTexture);
  },
  getStatusText: (tile) => {
    const blockDef = getBlockDefinition(tile.id);
    if (!blockDef?.isCrop) return "";
    const { progress } = getGrowthProgress(tile);
    return ` [${Math.min(100, Math.floor(progress * 100))}%]`;
  },
};

export const BLOCK_COMPONENTS: Record<string, BlockComponent> = {
  "minecraft:torch": {
    onRender: ({ ctx, u, v }) => {
      ctx.fillStyle = "#ffdd44";
      ctx.fillRect(u - 2, v - 12, 4, 10);
      ctx.fillStyle = "#ff3300";
      ctx.fillRect(u - 3, v - 15, 6, 4);
      ctx.fillStyle = "#ffffaa";
      ctx.fillRect(u - 1, v - 14, 2, 2);
    },
  },
  "craftingstation:crafting_station": {
    onRender: ({ ctx, u, v, halfW, halfH, elevH, getTexture }) => {
      renderCraftingStation(
        ctx,
        u,
        v,
        halfW,
        halfH,
        elevH,
        getTexture("craftingstation:crafting_station"),
        getTexture("minecraft:planks")
      );
    },
  },
  "exnihilocreatio:block_sieve": {
    onInteract: ({ tile, player, rng }) => {
      const equipped = player.equippedItem;
      if (equipped && isSieveMesh(equipped) && installSieveMesh(tile, equipped)) {
        removeItem(player.inventory, equipped, 1);
        return true;
      }
      if (equipped && isSieveSubstrate(equipped) && insertSieveSubstrate(tile, equipped)) {
        removeItem(player.inventory, equipped, 1);
        return true;
      }
      const siftRes = siftSieve(tile, rng);
      if (siftRes.progressed) {
        for (const drop of siftRes.drops) {
          addItem(player.inventory, drop.id, drop.count);
        }
        return true;
      }
      if (!equipped) {
        const removedMesh = removeSieveMesh(tile);
        if (removedMesh) {
          addItem(player.inventory, removedMesh, 1);
          return true;
        }
      }
      return false;
    },
    getActions: ({ tile, player }) => {
      const sieve = getSieveState(tile);
      const equipped = player?.equippedItem;
      if (!sieve.meshId && equipped && isSieveMesh(equipped)) {
        return [{ id: "harvest", label: "Install Mesh", buttonType: "SECONDARY", icon: "🕸️" }];
      }
      if (sieve.meshId && !sieve.substrateId && equipped && isSieveSubstrate(equipped)) {
        return [{ id: "harvest", label: "Insert Substrate", buttonType: "SECONDARY", icon: "🪨" }];
      }
      if (sieve.meshId && sieve.substrateId) {
        return [{ id: "harvest", label: `Sift (${sieve.progress}%)`, buttonType: "SECONDARY", icon: "🕸️" }];
      }
      if (sieve.meshId && !sieve.substrateId && !equipped) {
        return [{ id: "harvest", label: "Remove Mesh", buttonType: "SECONDARY", icon: "🕸️" }];
      }
      return [];
    },
    onRender: ({ ctx, u, v, halfW, halfH, elevH, tile, getTexture }) => {
      renderSieve(ctx, u, v, halfW, halfH, elevH, tile, getTexture("minecraft:planks"));
    },
    getStatusText: (tile) => {
      const s = getSieveState(tile);
      return s.substrateId ? ` [${s.progress}%]` : s.meshId ? " [Mesh Ready]" : " [No Mesh]";
    },
  },
  "exnihilocreatio:block_barrel_wood": {
    onTick: ({ tile }) => {
      tickBarrelTile(tile);
    },
    onInteract: ({ tile, player }) => {
      const harvested = harvestBarrelOutput(tile);
      if (harvested) {
        addItem(player.inventory, harvested.itemId, harvested.count);
        return true;
      }
      const equipped = player.equippedItem;
      if (equipped === "minecraft:water_bucket" && fillBarrelWithWater(tile)) {
        removeItem(player.inventory, "minecraft:water_bucket", 1);
        addItem(player.inventory, "minecraft:bucket", 1);
        return true;
      }
      if (equipped === "minecraft:bucket" && extractBarrelWater(tile)) {
        removeItem(player.inventory, "minecraft:bucket", 1);
        addItem(player.inventory, "minecraft:water_bucket", 1);
        return true;
      }
      if (equipped && insertBarrelItem(tile, equipped)) {
        removeItem(player.inventory, equipped, 1);
        return true;
      }
      return false;
    },
    getActions: ({ tile, player }) => {
      const barrel = getBarrelState(tile);
      const equipped = player?.equippedItem;
      if (barrel.outputItem) {
        return [{ id: "harvest", label: "Harvest Output", buttonType: "SECONDARY", icon: "🧱" }];
      }
      if (barrel.fluidAmount === 0 && !barrel.solidItem && equipped === "minecraft:water_bucket") {
        return [{ id: "harvest", label: "Fill Water", buttonType: "SECONDARY", icon: "💧" }];
      }
      if (barrel.fluidType === "water" && barrel.fluidAmount >= FLUID_CAPACITY_MB && !barrel.solidItem && equipped === "minecraft:bucket") {
        return [{ id: "harvest", label: "Extract Water", buttonType: "SECONDARY", icon: "🪣" }];
      }
      if (
        barrel.fluidType &&
        barrel.fluidAmount >= FLUID_CAPACITY_MB &&
        !barrel.solidItem &&
        equipped &&
        BARREL_REACTIONS.some((r) => r.fluid === barrel.fluidType && r.inputItem === equipped)
      ) {
        return [{ id: "harvest", label: "Insert Item", buttonType: "SECONDARY", icon: "🛢️" }];
      }
      return [];
    },
    onRender: ({ ctx, u, v, halfW, halfH, elevH, tile, getTexture }) => {
      renderBarrel(
        ctx,
        u,
        v,
        halfW,
        halfH,
        elevH,
        tile,
        getTexture("minecraft:planks"),
        getTexture("minecraft:water_still"),
        getTexture("minecraft:clay")
      );
    },
    getStatusText: (tile) => {
      const b = getBarrelState(tile);
      if (b.outputItem) return " [Ready]";
      if (b.solidItem) {
        const pct = b.reactionTargetTicks ? Math.floor((b.reactionTicks / b.reactionTargetTicks) * 100) : 0;
        return ` [Reacting ${pct}%]`;
      }
      return b.fluidAmount > 0 ? ` [${b.fluidType} ${b.fluidAmount}mB]` : "";
    },
  },
  "exnihilocreatio:block_crucible_wood": {
    onTick: ({ tile }) => {
      tickCrucibleTile(tile);
    },
    onInteract: ({ tile, player }) => {
      const equipped = player.equippedItem;
      if (equipped === "minecraft:bucket" && extractCrucibleWater(tile)) {
        removeItem(player.inventory, "minecraft:bucket", 1);
        addItem(player.inventory, "minecraft:water_bucket", 1);
        return true;
      }
      if (equipped && insertCrucibleItem(tile, equipped)) {
        removeItem(player.inventory, equipped, 1);
        return true;
      }
      return false;
    },
    getActions: ({ tile, player }) => {
      const crucible = getCrucibleState(tile);
      const equipped = player?.equippedItem;
      if (crucible.fluidType === "water" && crucible.fluidAmount >= FLUID_CAPACITY_MB && equipped === "minecraft:bucket") {
        return [{ id: "harvest", label: "Collect Water", buttonType: "SECONDARY", icon: "💧" }];
      }
      if (equipped && getCrucibleMeltValue(equipped) > 0 && crucible.fluidAmount + crucible.solidAmount < FLUID_CAPACITY_MB) {
        return [{ id: "harvest", label: "Insert Foliage", buttonType: "SECONDARY", icon: "🌿" }];
      }
      return [];
    },
    onRender: ({ ctx, u, v, halfW, halfH, elevH, tile, getTexture }) => {
      renderCrucible(
        ctx,
        u,
        v,
        halfW,
        halfH,
        elevH,
        tile,
        getTexture("minecraft:planks"),
        getTexture("minecraft:water_still")
      );
    },
    getStatusText: (tile) => ` [${Math.floor(getCrucibleState(tile).fluidAmount)}mB water]`,
  },
  "minecraft:furnace": {
    onTick: ({ tile }) => {
      tickFurnaceTile(tile);
    },
    onInteract: ({ tile, player }) => {
      const collected = collectFurnaceOutput(tile);
      if (collected) {
        addItem(player.inventory, collected.itemId, collected.count);
        return true;
      }
      const equipped = player.equippedItem;
      if (equipped && isFurnaceFuel(equipped) && insertFurnaceFuel(tile, equipped)) {
        removeItem(player.inventory, equipped, 1);
        return true;
      }
      if (equipped && isSmeltable(equipped) && insertFurnaceInput(tile, equipped)) {
        removeItem(player.inventory, equipped, 1);
        return true;
      }
      return false;
    },
    onBreak: ({ room, coord, tile, player }) => {
      const state = getFurnaceState(tile);
      if (state.inputItem && state.inputCount > 0) addItem(player.inventory, state.inputItem, state.inputCount);
      if (state.outputItem && state.outputCount > 0) addItem(player.inventory, state.outputItem, state.outputCount);
      if (state.fuelItem && state.fuelCount > 0) addItem(player.inventory, state.fuelItem, state.fuelCount);
      addItem(player.inventory, "minecraft:furnace", 1);
      room.voxels[coord.z][coord.y][coord.x] = { id: "minecraft:air", type: "air", passable: true };
      return true;
    },
    getActions: ({ tile, player }) => {
      const state = getFurnaceState(tile);
      const equipped = player?.equippedItem;
      if (state.outputItem && state.outputCount > 0) {
        return [{ id: "harvest", label: `Collect Output (×${state.outputCount})`, buttonType: "SECONDARY", icon: "🔥" }];
      }
      if (equipped && isFurnaceFuel(equipped)) {
        return [{ id: "harvest", label: "Add Fuel", buttonType: "SECONDARY", icon: "🔥" }];
      }
      if (equipped && isSmeltable(equipped)) {
        const pct = Math.floor((state.smeltProgress / FURNACE_SMELT_TICKS) * 100);
        return [{ id: "harvest", label: state.inputItem ? `Add Input (${pct}%)` : "Smelt Item", buttonType: "SECONDARY", icon: "🪨" }];
      }
      return [];
    },
    onRender: ({ ctx, u, v, halfW, halfH, elevH, tile, getTexture }) => {
      renderFurnace(
        ctx,
        u,
        v,
        halfW,
        halfH,
        elevH,
        tile,
        getTexture("minecraft:furnace_top"),
        getTexture("minecraft:furnace_side"),
        getTexture("minecraft:furnace"),
        getTexture("minecraft:furnace_on")
      );
    },
    getStatusText: (tile) => {
      const f = getFurnaceState(tile);
      if (f.outputCount > 0) return ` [Output ×${f.outputCount}]`;
      if (f.fuelTimeRemaining > 0 && f.inputCount > 0) {
        return ` [Lit ${Math.floor((f.smeltProgress / FURNACE_SMELT_TICKS) * 100)}%]`;
      }
      return f.fuelTimeRemaining > 0 ? " [Lit]" : " [Idle]";
    },
  },
  "immersiveengineering:hemp_top": {
    ...CROP_COMPONENT,
    onTick: undefined,
  },
};

export function getBlockComponent(tile: Tile | string): BlockComponent | undefined {
  const tileId = typeof tile === "string" ? tile : tile.id;
  if (BLOCK_COMPONENTS[tileId]) {
    return BLOCK_COMPONENTS[tileId];
  }
  const blockDef = getBlockDefinition(tileId);
  if (blockDef?.isCrop || blockDef?.isCropTop || (typeof tile !== "string" && isCropTile(tile))) {
    return CROP_COMPONENT;
  }
  return undefined;
}

export function tickRoomBlocks(
  room: Room,
  players: Iterable<Player>,
  rng?: DeterministicRNG
): void {
  const sneakingPlayers: Player[] = [];
  for (const player of players) {
    if (player.currentRoomId === room.id && player.isSneaking) {
      sneakingPlayers.push(player);
    }
  }

  for (let z = 0; z < room.depth; z++) {
    for (let y = 0; y < room.height; y++) {
      for (let x = 0; x < room.width; x++) {
        const tile = room.voxels[z]?.[y]?.[x];
        if (!tile) continue;
        const component = getBlockComponent(tile);
        component?.onTick?.({ room, coord: { x, y, z }, tile, sneakingPlayers, rng });
      }
    }
  }
}
