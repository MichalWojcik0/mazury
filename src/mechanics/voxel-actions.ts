import type { Room, Player, Tile, Vec3 } from "../core/types.ts";
import { resolveTargetCoord, resolveBoundaryTile } from "../world/room.ts";
import { getBlockDefinition, getItemDefinition } from "../registry/definitions.ts";

import { isCropTile, getGrowthProgress } from "./farming.ts";

export type VoxelActionId = "punch" | "break" | "till" | "harvest" | "place";

export interface VoxelAction {
  id: VoxelActionId;
  label: string;
  buttonType: "PRIMARY" | "SECONDARY";
  icon?: string;
  description?: string;
}

export interface SelectedVoxelInfo {
  coord: Vec3;
  tile: Tile;
  isBoundary: boolean;
  isInBounds: boolean;
}

/**
 * Resolves the currently selected voxel given a player and room, using the player's
 * selected layer and optional slot (defaults to player.selectedSlot).
 */
export function resolveSelectedVoxel(
  room: Room,
  player: Player,
  slot?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
): SelectedVoxelInfo | null {
  const targetSlot = slot ?? player.selectedSlot;
  if (!targetSlot) return null;

  const targetCoord = resolveTargetCoord(player, targetSlot);
  if (!targetCoord) return null;

  const isInBounds =
    targetCoord.x >= 0 &&
    targetCoord.x < room.width &&
    targetCoord.y >= 0 &&
    targetCoord.y < room.height &&
    targetCoord.z >= 0 &&
    targetCoord.z < room.depth;

  let tile: Tile | undefined;
  let isBoundary = false;

  if (isInBounds) {
    tile = room.voxels[targetCoord.z]?.[targetCoord.y]?.[targetCoord.x];
    // In rooms with boundary faces (e.g. Compact Machines), floor level z=0 without a placed block
    // is backed by the DOWN solid compact machine wall face.
    if ((!tile || tile.id === "minecraft:air") && targetCoord.z === 0 && room.faces) {
      const boundary = resolveBoundaryTile(room, targetCoord);
      if (boundary) {
        tile = boundary.tile;
        isBoundary = true;
      }
    }
  } else if (room.faces) {
    const boundary = resolveBoundaryTile(room, targetCoord);
    if (boundary) {
      tile = boundary.tile;
      isBoundary = true;
    }
  }

  if (!tile) return null;

  return {
    coord: targetCoord,
    tile,
    isBoundary,
    isInBounds,
  };
}

/**
 * Returns available actions for a given tile.
 * - Solid machine walls (or boundary faces): only "punch"
 * - Dirt: "break" or "till"
 * - Other tiles: inspects block definition breakable / tillable attributes
 */
export function getAvailableVoxelActions(
  tile: Tile,
  isBoundary: boolean = false,
  player?: Player,
  targetCoord?: Vec3
): VoxelAction[] {
  // Machine walls or boundary faces: only choice is punch
  if (tile.id === "compactmachines3:wall" || isBoundary || tile.type === "solid_wall") {
    return [
      {
        id: "punch",
        label: "Punch Wall",
        buttonType: "PRIMARY",
        icon: "👊",
        description: "Strike the compact machine wall to gather dust resources",
      },
    ];
  }

  // Dirt block: choice is either break or till
  if (tile.id === "minecraft:dirt") {
    return [
      {
        id: "break",
        label: "Break Dirt",
        buttonType: "PRIMARY",
        icon: "⛏️",
        description: "Break the dirt block into inventory",
      },
      {
        id: "till",
        label: "Till Soil",
        buttonType: "SECONDARY",
        icon: "🌾",
        description: "Till dirt into farmland for farming",
      },
    ];
  }

  const actions: VoxelAction[] = [];
  const blockDef = getBlockDefinition(tile.id);

  // If crop / bonsai tile
  if (isCropTile(tile)) {
    const { isMature } = getGrowthProgress(tile);
    if (isMature || tile.id === "immersiveengineering:hemp_top") {
      actions.push({
        id: "harvest",
        label: "Harvest",
        buttonType: "SECONDARY",
        icon: "🌾",
        description: "Harvest mature plant (autoplants in place)",
      });
    }
  }

  if (blockDef?.breakable) {
    actions.push({
      id: "break",
      label: `Break ${blockDef.name || "Block"}`,
      buttonType: "PRIMARY",
      icon: "⛏️",
      description: "Break the block into item drops",
    });
  }

  if (blockDef?.tillable) {
    actions.push({
      id: "till",
      label: "Till",
      buttonType: "SECONDARY",
      icon: "🌾",
      description: "Till soil into farmland",
    });
  }

  // If targeting air or a passable tile and player has an equipped placeable item
  if ((tile.id === "minecraft:air" || tile.passable) && player?.equippedItem) {
    const equippedItemDef = getItemDefinition(player.equippedItem);
    if (equippedItemDef?.placeable) {
      // Check that targeted coord doesn't overlap player's body if targetCoord is provided
      let overlapsPlayer = false;
      if (targetCoord) {
        overlapsPlayer =
          targetCoord.x === player.x &&
          targetCoord.y === player.y &&
          (targetCoord.z === player.z || targetCoord.z === player.z + 1);
      }
      if (!overlapsPlayer) {
        actions.push({
          id: "place",
          label: `Place ${equippedItemDef.name || "Block"}`,
          buttonType: "SECONDARY",
          icon: equippedItemDef.icon || "🧱",
          description: `Place ${equippedItemDef.name || "block"} down into the world`,
        });
      }
    }
  }

  return actions;
}
