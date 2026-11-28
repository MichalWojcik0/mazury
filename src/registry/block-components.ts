import type { Player, Room, Tile, Vec3 } from "../core/types.ts";
import type { DeterministicRNG } from "../core/math.ts";
import type { CanvasContext2DLike } from "../render/command-types.ts";
import type { VoxelAction } from "../mechanics/voxel-actions.ts";
import { addItem } from "../inventory/inventory.ts";
import { forEachRoomVoxel } from "../world/room.ts";
import { getBlockDefinition } from "./definitions.ts";
import { getTraitDefinition } from "./traits.ts";
import { getGrowthProgress, harvestPlant, isCropTile, tickCropTile } from "../mechanics/farming.ts";
import { SIEVE_COMPONENT } from "../mechanics/sieve.ts";
import { BARREL_COMPONENT } from "../mechanics/barrel.ts";
import { CRUCIBLE_COMPONENT } from "../mechanics/crucible.ts";
import { FURNACE_COMPONENT } from "../mechanics/furnace.ts";
import { renderCropTile } from "../render/draw-crop.ts";
import { renderCraftingStation } from "../render/draw-crafting-station.ts";

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
  onInteract: ({ room, coord, tile, player, rng }) => {
    const blockDef = getBlockDefinition(tile.id);
    const { isMature } = getGrowthProgress(tile);
    if (!isMature && !blockDef?.isCropTop) return false;

    const harvestRes = harvestPlant(tile, rng);
    if (!harvestRes.success) return false;

    for (const drop of harvestRes.drops) {
      addItem(player.inventory, drop.id, drop.count);
    }
    if (harvestRes.destroysTile) {
      room.voxels[coord.z][coord.y][coord.x] = {
        id: "minecraft:air",
        type: "air",
        passable: true,
      };
      const baseCoord = tile.metadata?.baseCoord as Vec3 | undefined;
      if (baseCoord) {
        const baseTile = room.voxels[baseCoord.z]?.[baseCoord.y]?.[baseCoord.x];
        if (baseTile?.metadata) {
          baseTile.metadata.harvestCooldown = 200;
        }
      }
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
  "exnihilocreatio:block_sieve": SIEVE_COMPONENT,
  "exnihilocreatio:block_barrel_wood": BARREL_COMPONENT,
  "exnihilocreatio:block_crucible_wood": CRUCIBLE_COMPONENT,
  "minecraft:furnace": FURNACE_COMPONENT,
};

export function getBlockComponent(tile: Tile | string): BlockComponent | undefined {
  const tileId = typeof tile === "string" ? tile : tile.id;
  if (BLOCK_COMPONENTS[tileId]) {
    return BLOCK_COMPONENTS[tileId];
  }
  const blockDef = getBlockDefinition(tileId);
  if (blockDef?.traits) {
    for (const traitId of blockDef.traits) {
      const trait = getTraitDefinition(traitId);
      if (trait?.componentKey === "crop_segment") {
        return { ...CROP_COMPONENT, onTick: undefined };
      }
      if (trait?.componentKey === "crop_base") {
        return CROP_COMPONENT;
      }
    }
  }
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

  forEachRoomVoxel(room, (coord, tile) => {
    getBlockComponent(tile)?.onTick?.({ room, coord, tile, sneakingPlayers, rng });
  });
}
