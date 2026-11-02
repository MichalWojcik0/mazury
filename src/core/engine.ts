import { DeterministicRNG } from "./math.ts";
import type { Player, Room, PlayerInputPacket, InputAction } from "./types.ts";
import { createOuterRoom, createTinyCompactMachineRoom, resolveTargetCoord, resolveBoundaryTile } from "../world/room.ts";
import { strikeWall } from "../mechanics/wall-punching.ts";
import { updateSneak } from "../mechanics/sneak-poop.ts";
import { CHAPTER_1_RECIPES, executeCraft } from "../crafting/list-crafting.ts";
import { QuestTracker } from "../quests/quest-manager.ts";

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
    const inv = new Map<string, number>();
    inv.set("compactmachines3:psd", 1); // Starting item

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
        const currentCount = player.inventory.get(sneakRes.drop.id) ?? 0;
        player.inventory.set(sneakRes.drop.id, currentCount + sneakRes.drop.count);
      }
      player.exhaustion += sneakRes.exhaustionAdded;

      // Exhaustion conversion to hunger
      if (player.exhaustion >= 4.0) {
        player.exhaustion -= 4.0;
        player.hunger = Math.max(0, player.hunger - 1);
      }
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

      case "EQUIP_ITEM":
        player.equippedItem = action.itemId;
        break;

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
        const room = this.rooms.get(player.currentRoomId);
        if (!room) break;

        const targetCoord = resolveTargetCoord(player, action.slot);
        if (!targetCoord) break;

        let targetTile = room.voxels[targetCoord.z]?.[targetCoord.y]?.[targetCoord.x];
        if (!targetTile && room.faces) {
          const boundary = resolveBoundaryTile(room, targetCoord);
          if (boundary) {
            targetTile = boundary.tile;
          }
        }
        if (!targetTile) break;

        if (action.button === "PRIMARY") {
          // Wall punch / strike
          const punchResult = strikeWall(player, targetTile, this.rng);
          if (punchResult.success) {
            player.health = Math.max(0, player.health - punchResult.damageTaken);
            player.exhaustion += punchResult.exhaustionAdded;

            for (const drop of punchResult.drops) {
              const count = player.inventory.get(drop.id) ?? 0;
              player.inventory.set(drop.id, count + drop.count);
            }
          }
        }
        break;
      }

      case "CRAFT_RECIPE": {
        const recipe = CHAPTER_1_RECIPES.find((r) => r.id === action.recipeId);
        if (!recipe) break;

        // In Chapter 1, check if player has crafting station in room or inventory
        const hasStation = (player.inventory.get("craftingstation:crafting_station") ?? 0) > 0;
        executeCraft(recipe, player.inventory, hasStation);
        break;
      }
    }
  }
}
