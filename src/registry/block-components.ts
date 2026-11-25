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
import { renderBarrel, renderCrucible, renderSieve } from "../render/draw-machines.ts";

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
}

const CROP_COMPONENT: BlockComponent = {
  onTick: ({ room, coord, tile, sneakingPlayers }) => {
    tickCropTile(room, coord, tile, sneakingPlayers);
  },
  onInteract: ({ tile, player, rng }) => {
    const { isMature } = getGrowthProgress(tile);
    if (!isMature && tile.id !== "immersiveengineering:hemp_top") return false;

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

    if (tile.id === "immersiveengineering:hemp_top") {
      const baseCoord = tile.metadata?.baseCoord as Vec3 | undefined;
      if (baseCoord) {
        const baseTile = room.voxels[baseCoord.z]?.[baseCoord.y]?.[baseCoord.x];
        if (baseTile?.metadata) {
          baseTile.metadata.harvestCooldown = 200;
        }
      }
      addItem(player.inventory, "immersiveengineering:material:4", 1);
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
    const { isMature } = getGrowthProgress(tile);
    if (!isMature && tile.id !== "immersiveengineering:hemp_top") return [];
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
  },
  "exnihilocreatio:block_barrel_wood": {
    onTick: ({ tile }) => {
      tickBarrelTile(tile);
    },
    onInteract: ({ tile, player }) => {
      const harvested = harvestBarrelOutput(tile);
      if (harvested) {
        const dropId = harvested.itemId === "minecraft:clay" ? "minecraft:clay_ball" : harvested.itemId;
        const dropCount = harvested.itemId === "minecraft:clay" ? 4 : harvested.count;
        addItem(player.inventory, dropId, dropCount);
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
  if (blockDef?.isCrop || (typeof tile !== "string" && isCropTile(tile))) {
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
