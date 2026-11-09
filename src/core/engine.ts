import { DeterministicRNG } from "./math.ts";
import type { Player, Room, PlayerInputPacket, InputAction } from "./types.ts";
import {
  createEmptyInventory,
  addItem,
  countItem,
  removeItem,
  moveToTop,
  moveToBottom,
  swapSlots,
  transferOrSwapSlots,
} from "../inventory/inventory.ts";
import { createOuterRoom, createTinyCompactMachineRoom } from "../world/room.ts";
import { strikeWall } from "../mechanics/wall-punching.ts";
import { updateSneak } from "../mechanics/sneak-poop.ts";
import { resolveSelectedVoxel } from "../mechanics/voxel-actions.ts";
import { getItemDefinition, getBlockDefinition } from "../registry/definitions.ts";
import { CHAPTER_1_RECIPES, executeCraft } from "../crafting/list-crafting.ts";
import { QuestTracker } from "../quests/quest-manager.ts";
import {
  isCropTile,
  getGrowthProgress,
  canPlant,
  plantCrop,
  tickFarming,
  harvestPlant,
} from "../mechanics/farming.ts";

/**
 * 20 Hz Deterministic Simulation Engine (Chapter 1 Checkpoint).
 */
export class GameEngine {
  public currentTick: number = 0;
  public rng: DeterministicRNG;
  public rooms: Map<string, Room> = new Map();
  public players: Map<number, Player> = new Map();
  public questTracker: QuestTracker = new QuestTracker();

  private inputQueue: PlayerInputPacket[] = [];

  constructor(seed: number = 1337) {
    this.rng = new DeterministicRNG(seed);
    this.initWorld();
  }

  private initWorld(): void {
    const outerRoom = createOuterRoom();
    const tinyRoom = createTinyCompactMachineRoom("room_tiny_1", outerRoom.id);

    this.rooms.set(outerRoom.id, outerRoom);
    this.rooms.set(tinyRoom.id, tinyRoom);

    // Initialize Player 0 in outer room column 0,0
    const inv = createEmptyInventory();
    addItem(inv, "compactmachines3:psd", 1); // Starting item in slot 0

    const p0: Player = {
      id: 0,
      name: "Player 1",
      health: 20,
      hunger: 20,
      exhaustion: 0,
      isSneaking: false,
      sneakTimer: 0,
      currentRoomId: outerRoom.id,
      x: 0,
      y: 0,
      z: 1, // Standing on bedrock at z=0
      height: 2,
      selectedLayerIndex: 1, // Feet/lower layer
      selectedQuickSlotIndex: 0, // Quick slot 0 active
      equippedItem: "compactmachines3:psd",
      inventory: inv,
    };

    this.players.set(0, p0);
  }

  public enqueueInput(packet: PlayerInputPacket): void {
    this.inputQueue.push(packet);
  }

  /**
   * Advances the simulation by 1 tick (50 ms at 20 Hz).
   */
  public stepTick(): void {
    this.currentTick++;

    // Ingest inputs scheduled for this tick
    const inputsForTick = this.inputQueue.filter((p) => p.tick === this.currentTick);
    for (const packet of inputsForTick) {
      this.processAction(packet.playerId, packet.action);
    }
    this.inputQueue = this.inputQueue.filter((p) => p.tick > this.currentTick);

    // Tick mechanics for all players
    for (const player of this.players.values()) {
      // Sneak ticking & poop generation
      const sneakRes = updateSneak(player);
      if (sneakRes.poopProduced && sneakRes.drop) {
        addItem(player.inventory, sneakRes.drop.id, sneakRes.drop.count);
      }
      player.exhaustion += sneakRes.exhaustionAdded;

      // Exhaustion conversion to hunger
      if (player.exhaustion >= 4.0) {
        player.exhaustion -= 4.0;
        player.hunger = Math.max(0, player.hunger - 1);
      }
    }

    // Tick farming simulation across all active rooms
    for (const room of this.rooms.values()) {
      tickFarming(room, this.players.values(), this.rng);
    }

    // Evaluate quests for Player 0
    const p0 = this.players.get(0);
    if (p0) {
      this.questTracker.evaluateQuests(p0.inventory);
    }
  }

  private processAction(playerId: number, action: InputAction): void {
    const player = this.players.get(playerId);
    if (!player) return;

    switch (action.type) {
      case "START_SNEAK":
        player.isSneaking = true;
        break;

      case "STOP_SNEAK":
        player.isSneaking = false;
        break;

      case "SELECT_LAYER":
        player.selectedLayerIndex = action.layerIndex;
        break;

      case "SELECT_SLOT":
        player.selectedSlot = action.slot;
        break;

      case "EQUIP_ITEM":
        player.equippedItem = action.itemId;
        break;

      case "SELECT_QUICK_SLOT": {
        if (action.index >= 0 && action.index < 9) {
          if (player.selectedQuickSlotIndex === action.index) {
            // Toggling already selected hotbar slot unequips / deselects to empty hands
            player.selectedQuickSlotIndex = undefined;
            player.equippedItem = undefined;
          } else {
            player.selectedQuickSlotIndex = action.index;
            const slotItem = player.inventory[action.index];
            player.equippedItem = slotItem ? slotItem.id : undefined;
          }
        }
        break;
      }

      case "MOVE_ITEM_TO_TOP": {
        moveToTop(player.inventory, action.slotIndex);
        this.updateActiveEquipped(player);
        break;
      }

      case "MOVE_ITEM_TO_BOTTOM": {
        moveToBottom(player.inventory, action.slotIndex);
        this.updateActiveEquipped(player);
        break;
      }

      case "SWAP_INVENTORY_SLOTS": {
        transferOrSwapSlots(player.inventory, action.fromIndex, action.toIndex);
        this.updateActiveEquipped(player);
        break;
      }

      case "MOVE": {
        const room = this.rooms.get(player.currentRoomId);
        if (!room) break;
        const targetX = player.x + action.dx;
        const targetY = player.y + action.dy;

        if (
          targetX >= 0 &&
          targetX < room.width &&
          targetY >= 0 &&
          targetY < room.height
        ) {
          // Check collision with tile at feet
          const feetTile = room.voxels[player.z]?.[targetY]?.[targetX];
          if (feetTile && feetTile.passable) {
            player.x = targetX;
            player.y = targetY;
          }
        }
        break;
      }

      case "USE_PSD": {
        const room = this.rooms.get(player.currentRoomId);
        if (!room) break;

        // If in Outer Room and facing the embedded machine at (1, 0, 0)
        if (room.id === "outer_room") {
          const tinyRoom = this.rooms.get("room_tiny_1");
          if (tinyRoom) {
            player.currentRoomId = tinyRoom.id;
            player.x = 1; // Center of 3x3 internal room (bounds 0..2)
            player.y = 1;
            player.z = 1;
            this.questTracker.triggerEvent("ENTERED_MACHINE");
          }
        } else if (room.parentRoomId) {
          // Exit back to parent room
          const parent = this.rooms.get(room.parentRoomId);
          if (parent && room.parentBlockCoord) {
            player.currentRoomId = parent.id;
            player.x = room.parentBlockCoord.x;
            player.y = room.parentBlockCoord.y;
            player.z = room.parentBlockCoord.z + 1;
          }
        }
        break;
      }

      case "INTERACT_TILE": {
        player.selectedSlot = action.slot;
        const room = this.rooms.get(player.currentRoomId);
        if (!room) break;

        const selected = resolveSelectedVoxel(room, player, action.slot);
        if (!selected) break;

        const { coord: targetCoord, tile: targetTile, isInBounds } = selected;
        const blockDef = getBlockDefinition(targetTile.id);

        if (action.button === "PRIMARY") {
          // Check if targeting a breakable in-world voxel block
          if (isInBounds && blockDef?.breakable) {
            // If crop block, breaking destroys it completely and drops appropriate items
            if (isCropTile(targetTile) || targetTile.id === "immersiveengineering:hemp_top") {
              const { isMature } = getGrowthProgress(targetTile);
              room.voxels[targetCoord.z][targetCoord.y][targetCoord.x] = {
                id: "minecraft:air",
                type: "air",
                passable: true,
              };

              if (targetTile.id === "immersiveengineering:hemp_top") {
                const baseCoord = targetTile.metadata?.baseCoord as Vec3 | undefined;
                if (baseCoord) {
                  const baseTile = room.voxels[baseCoord.z]?.[baseCoord.y]?.[baseCoord.x];
                  if (baseTile?.metadata) {
                    baseTile.metadata.harvestCooldown = 200;
                  }
                }
                addItem(player.inventory, "immersiveengineering:material:4", 1);
                this.updateActiveEquipped(player);
                return;
              }

              if (isMature) {
                // Mature break: drops harvest yields plus the replanted seed/sapling that wasn't consumed
                const harvestRes = harvestPlant(targetTile, this.rng);
                for (const drop of harvestRes.drops) {
                  addItem(player.inventory, drop.id, drop.count);
                }
                if (targetTile.id.startsWith("arcadialbonsaitrees:bonsai_")) {
                  addItem(player.inventory, targetTile.id, 1);
                } else if (targetTile.id === "minecraft:wheat") {
                  addItem(player.inventory, "minecraft:wheat_seeds", 1);
                }
              } else {
                // Immature break: drops just the base sapling/seed
                if (blockDef?.drops) {
                  for (const drop of blockDef.drops) {
                    addItem(player.inventory, drop.itemId, drop.count);
                  }
                }
              }
              this.updateActiveEquipped(player);
              return;
            }

            // Standard break block: replace voxel with air and drop items
            room.voxels[targetCoord.z][targetCoord.y][targetCoord.x] = {
              id: "minecraft:air",
              type: "air",
              passable: true,
            };

            if (blockDef.drops) {
              for (const drop of blockDef.drops) {
                const chance = drop.chance ?? 1.0;
                if (chance >= 1.0 || this.rng.next() < chance) {
                  addItem(player.inventory, drop.itemId, drop.count);
                }
              }
            }
            this.updateActiveEquipped(player);
          } else {
            // Wall punch / strike (for solid compact machine walls or tools)
            const punchResult = strikeWall(player, targetTile, this.rng);
            if (punchResult.success) {
              player.health = Math.max(0, player.health - punchResult.damageTaken);
              player.exhaustion += punchResult.exhaustionAdded;

              for (const drop of punchResult.drops) {
                addItem(player.inventory, drop.id, drop.count);
              }
            }
          }
        } else if (action.button === "SECONDARY") {
          // 1. Check if targeting a mature crop or bonsai for harvesting (autoplants in place)
          if (isInBounds && (isCropTile(targetTile) || targetTile.id === "immersiveengineering:hemp_top")) {
            const { isMature } = getGrowthProgress(targetTile);
            if (isMature || targetTile.id === "immersiveengineering:hemp_top") {
              const harvestRes = harvestPlant(targetTile, this.rng);
              if (harvestRes.success) {
                for (const drop of harvestRes.drops) {
                  addItem(player.inventory, drop.id, drop.count);
                }
                if (harvestRes.destroysTile) {
                  room.voxels[targetCoord.z][targetCoord.y][targetCoord.x] = {
                    id: "minecraft:air",
                    type: "air",
                    passable: true,
                  };
                  if (targetTile.id === "immersiveengineering:hemp_top") {
                    const baseCoord = targetTile.metadata?.baseCoord as Vec3 | undefined;
                    if (baseCoord) {
                      const baseTile = room.voxels[baseCoord.z]?.[baseCoord.y]?.[baseCoord.x];
                      if (baseTile?.metadata) {
                        baseTile.metadata.harvestCooldown = 200;
                      }
                    }
                  }
                }
                this.updateActiveEquipped(player);
                return;
              }
            }
          }

          // 2. Check if planting on soil:
          const equipped = player.equippedItem;
          if (equipped && isInBounds) {
            const itemDef = getItemDefinition(equipped);
            if (itemDef?.plantable) {
              let plantCoord = targetCoord;
              if (targetTile.id !== "minecraft:air" && !targetTile.passable) {
                plantCoord = { x: targetCoord.x, y: targetCoord.y, z: targetCoord.z + 1 };
              }

              if (plantCoord.z < room.depth) {
                const check = canPlant(room, plantCoord, equipped);
                if (check.allowed) {
                  const removed = removeItem(player.inventory, equipped, 1);
                  if (removed > 0) {
                    plantCrop(room, plantCoord, equipped);
                    this.updateActiveEquipped(player);
                    return;
                  }
                }
              }
            }
          }

          // 3. Check if targeting a tillable block (e.g. Dirt block -> Farmland)
          if (isInBounds && blockDef?.tillable && blockDef.tilledTileId) {
            const tilledDef = getBlockDefinition(blockDef.tilledTileId);
            room.voxels[targetCoord.z][targetCoord.y][targetCoord.x] = {
              id: blockDef.tilledTileId,
              type: tilledDef?.type ?? "farmland",
              passable: tilledDef?.passable ?? false,
            };

            player.exhaustion += 0.6;

            if (blockDef.tilledDrops) {
              for (const drop of blockDef.tilledDrops) {
                const chance = drop.chance ?? 1.0;
                if (chance >= 1.0 || this.rng.next() < chance) {
                  addItem(player.inventory, drop.itemId, drop.count);
                }
              }
            }
            this.updateActiveEquipped(player);
            return;
          }

          // 4. Data-driven block placement checking itemDef.placeable
          if (equipped && isInBounds) {
            const itemDef = getItemDefinition(equipped);
            if (itemDef?.placeable && !itemDef?.plantable) {
              const existingVoxel = room.voxels[targetCoord.z]?.[targetCoord.y]?.[targetCoord.x];
              const overlapsPlayer =
                targetCoord.x === player.x &&
                targetCoord.y === player.y &&
                (targetCoord.z === player.z || targetCoord.z === player.z + 1);

              if (existingVoxel && (existingVoxel.passable || existingVoxel.id === "minecraft:air") && !overlapsPlayer) {
                const removed = removeItem(player.inventory, equipped, 1);
                if (removed > 0) {
                  const tileIdToPlace = itemDef.placesTileId ?? equipped;
                  const placedBlockDef = getBlockDefinition(tileIdToPlace);
                  room.voxels[targetCoord.z][targetCoord.y][targetCoord.x] = {
                    id: tileIdToPlace,
                    type: placedBlockDef?.type ?? "floor",
                    passable: placedBlockDef?.passable ?? false,
                  };
                  this.updateActiveEquipped(player);
                }
              }
            }
          }
        }
        break;
      }

      case "CRAFT_RECIPE": {
        const recipe = CHAPTER_1_RECIPES.find((r) => r.id === action.recipeId);
        if (!recipe) break;

        // In Chapter 1, check if player has crafting station in room or inventory
        const hasStation = countItem(player.inventory, "craftingstation:crafting_station") > 0;
        executeCraft(recipe, player.inventory, hasStation);
        this.updateActiveEquipped(player);
        break;
      }
    }
  }

  private updateActiveEquipped(player: Player): void {
    if (player.selectedQuickSlotIndex !== undefined && player.selectedQuickSlotIndex >= 0 && player.selectedQuickSlotIndex < 9) {
      const activeStack = player.inventory[player.selectedQuickSlotIndex];
      player.equippedItem = activeStack ? activeStack.id : undefined;
    }
  }
}
