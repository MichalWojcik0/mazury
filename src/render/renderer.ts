import type { Player, Room, Tile } from "../core/types.ts";
import type { Vec3 } from "../core/math.ts";

/**
 * Screen pixel coordinate.
 */
export interface ScreenPoint {
  u: number;
  v: number;
}

/**
 * Camera configuration for isometric projection.
 */
export interface CameraConfig {
  tileWidth: number; // Default 64 px
  tileHeight: number; // Default 32 px
  elevationHeight: number; // Default 16 px per z-level
  offsetX: number;
  offsetY: number;
  zoom: number; // Scale factor, default 1.0
}

export const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  tileWidth: 64,
  tileHeight: 32,
  elevationHeight: 16,
  offsetX: 0,
  offsetY: 0,
  zoom: 1.0,
};

/**
 * Projects 3D world coordinates (x, y, z) to 2D screen coordinates (u, v)
 * using dimetric/isometric 2:1 projection.
 *
 * u = (x - y) * (W_tile / 2) * zoom + offsetX
 * v = ((x + y) * (H_tile / 2) - z * H_elevation) * zoom + offsetY
 */
export function worldToScreen(
  x: number,
  y: number,
  z: number,
  camera: CameraConfig = DEFAULT_CAMERA_CONFIG
): ScreenPoint {
  const { tileWidth, tileHeight, elevationHeight, offsetX, offsetY, zoom } = camera;
  const halfW = tileWidth / 2;
  const halfH = tileHeight / 2;

  const isoX = (x - y) * halfW;
  const isoY = (x + y) * halfH - z * elevationHeight;

  return {
    u: isoX * zoom + offsetX,
    v: isoY * zoom + offsetY,
  };
}

/**
 * Inverts screen coordinates (u, v) at a given z elevation plane to continuous world (x, y).
 */
export function screenToWorld(
  u: number,
  v: number,
  z: number,
  camera: CameraConfig = DEFAULT_CAMERA_CONFIG
): { x: number; y: number } {
  const { tileWidth, tileHeight, elevationHeight, offsetX, offsetY, zoom } = camera;
  const halfW = tileWidth / 2;
  const halfH = tileHeight / 2;

  const unscaledIsoX = (u - offsetX) / zoom;
  const unscaledIsoY = (v - offsetY) / zoom + z * elevationHeight;

  // unscaledIsoX = (x - y) * halfW => (x - y) = unscaledIsoX / halfW
  // unscaledIsoY = (x + y) * halfH => (x + y) = unscaledIsoY / halfH
  const term1 = unscaledIsoX / halfW;
  const term2 = unscaledIsoY / halfH;

  const x = (term1 + term2) / 2;
  const y = (term2 - term1) / 2;

  return { x, y };
}

/**
 * Computes depth sorting key for painter's algorithm.
 * DepthKey = (x + y) * K + z.
 * Ensures items closer to the camera (higher x + y, higher z) are drawn after farther ones.
 */
export function computeDepthKey(x: number, y: number, z: number, k: number = 1000): number {
  return (x + y) * k + z;
}

export type RenderCommandType = "DRAW_FLOOR" | "DRAW_TILE" | "DRAW_PLAYER" | "DRAW_HIGHLIGHT";

export interface RenderCommand {
  type: RenderCommandType;
  depthKey: number;
  worldCoord: Vec3;
  screenCoord: ScreenPoint;
  tile?: Tile;
  player?: Player;
  metadata?: Record<string, unknown>;
}

/**
 * Lightweight canvas 2D rendering context stub interface.
 * Matches standard CanvasRenderingContext2D methods needed for drawing.
 */
export interface CanvasContext2DLike {
  save(): void;
  restore(): void;
  translate(x: number, y: number): void;
  scale(x: number, y: number): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  closePath(): void;
  fill(): void;
  stroke(): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  strokeRect(x: number, y: number, w: number, h: number): void;
  fillText(text: string, x: number, y: number): void;
  arc?(x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise?: boolean): void;
  ellipse?(x: number, y: number, radiusX: number, radiusY: number, rotation: number, startAngle: number, endAngle: number): void;
  fillStyle: string | unknown;
  strokeStyle: string | unknown;
  lineWidth: number;
}

/**
 * Stub renderer for the isometric canvas engine.
 * Generates sorted render commands and can render onto an optional Canvas context.
 */
export interface RenderOptions {
  /** If true, front walls and ceiling of enclosed rooms are cut away for interior visibility */
  enableCutaway?: boolean;
}

export class StubRenderer {
  public camera: CameraConfig;

  constructor(camera: Partial<CameraConfig> = {}) {
    this.camera = { ...DEFAULT_CAMERA_CONFIG, ...camera };
  }

  /**
   * Centers camera offsets based on room bounding box and canvas dimensions.
   */
  public centerOnRoom(room: Room, canvasWidth: number, canvasHeight: number): void {
    const centerX = (room.width - 1) / 2;
    const centerY = (room.height - 1) / 2;
    const centerZ = (room.depth - 1) / 4;

    const halfW = this.camera.tileWidth / 2;
    const halfH = this.camera.tileHeight / 2;

    const isoX = (centerX - centerY) * halfW * this.camera.zoom;
    const isoY = ((centerX + centerY) * halfH - centerZ * this.camera.elevationHeight) * this.camera.zoom;

    this.camera.offsetX = canvasWidth / 2 - isoX;
    this.camera.offsetY = canvasHeight / 2 - isoY;
  }

  /**
   * Generates depth-sorted render commands for all voxels and players in a room.
   */
  public generateRenderCommands(
    room: Room,
    players: Iterable<Player> = [],
    options: RenderOptions = {}
  ): RenderCommand[] {
    const commands: RenderCommand[] = [];
    const enableCutaway = options.enableCutaway ?? false;

    // Collect all non-air voxels
    for (let z = 0; z < room.depth; z++) {
      for (let y = 0; y < room.height; y++) {
        for (let x = 0; x < room.width; x++) {
          const tile = room.voxels[z]?.[y]?.[x];
          if (!tile || tile.id === "minecraft:air") continue;

          // For enclosed rooms (width > 2 and height > 2), hide front walls and ceiling if cutaway enabled
          if (enableCutaway && room.width > 2 && room.height > 2) {
            // Cutaway ceiling
            if (z >= room.depth - 1) continue;
            // Cutaway front-facing walls (high x and high y facing viewer)
            if (x === room.width - 1 || y === room.height - 1) {
              if (z > 0) continue; // Keep floor z=0
            }
          }

          const screenCoord = worldToScreen(x, y, z, this.camera);
          const depthKey = computeDepthKey(x, y, z);

          commands.push({
            type: tile.type === "floor" ? "DRAW_FLOOR" : "DRAW_TILE",
            depthKey,
            worldCoord: { x, y, z },
            screenCoord,
            tile,
          });
        }
      }
    }

    // Collect players in this room
    for (const player of players) {
      if (player.currentRoomId !== room.id) continue;

      const screenCoord = worldToScreen(player.x, player.y, player.z, this.camera);
      // Player base at feet z, player center of mass at z + 0.5 to sort cleanly against adjacent tiles
      const depthKey = computeDepthKey(player.x, player.y, player.z + 0.5);

      commands.push({
        type: "DRAW_PLAYER",
        depthKey,
        worldCoord: { x: player.x, y: player.y, z: player.z },
        screenCoord,
        player,
      });
    }

    // Sort back-to-front by depthKey (ascending)
    commands.sort((a, b) => a.depthKey - b.depthKey);

    return commands;
  }

  /**
   * Renders the room and players. If a canvas 2D context is provided, draws the scene.
   * Returns the executed render command list.
   */
  public render(
    room: Room,
    players: Iterable<Player> = [],
    ctx?: CanvasContext2DLike,
    options: RenderOptions = {}
  ): RenderCommand[] {
    const commands = this.generateRenderCommands(room, players, options);

    if (ctx) {
      for (const cmd of commands) {
        this.executeCommand(cmd, ctx);
      }
    }

    return commands;
  }

  /**
   * Dispatches drawing for a single render command onto a 2D canvas context.
   */
  public executeCommand(cmd: RenderCommand, ctx: CanvasContext2DLike): void {
    const halfW = (this.camera.tileWidth / 2) * this.camera.zoom;
    const halfH = (this.camera.tileHeight / 2) * this.camera.zoom;
    const { u, v } = cmd.screenCoord;

    ctx.save();

    switch (cmd.type) {
      case "DRAW_FLOOR":
      case "DRAW_TILE": {
        const tileId = cmd.tile?.id;

        // Custom styling for specific tiles
        if (tileId === "minecraft:torch") {
          // Render torch as a small glowing post
          ctx.fillStyle = "#ffdd44";
          ctx.fillRect(u - 2, v - 12, 4, 10);
          ctx.fillStyle = "#ff3300";
          ctx.fillRect(u - 3, v - 15, 6, 4);
          ctx.fillStyle = "#ffffaa";
          ctx.fillRect(u - 1, v - 14, 2, 2);
          break;
        }

        // Standard block rendering: top isometric diamond
        ctx.beginPath();
        ctx.moveTo(u, v - halfH);
        ctx.lineTo(u + halfW, v);
        ctx.lineTo(u, v + halfH);
        ctx.lineTo(u - halfW, v);
        ctx.closePath();

        if (tileId === "minecraft:bedrock") {
          ctx.fillStyle = "#2a2a2a";
          ctx.strokeStyle = "#151515";
        } else if (tileId === "compactmachines3:machine_tiny") {
          // Embedded compact machine block
          ctx.fillStyle = "#1e3a5f";
          ctx.strokeStyle = "#4da6ff";
          ctx.lineWidth = 2;
        } else if (cmd.tile?.type === "solid_wall") {
          ctx.fillStyle = "#4a4a52";
          ctx.strokeStyle = "#252528";
        } else {
          ctx.fillStyle = "#667788";
          ctx.strokeStyle = "#222222";
        }

        ctx.fill();
        ctx.stroke();

        // Optional decorative markings on special blocks
        if (tileId === "compactmachines3:machine_tiny") {
          // Inner glowing core
          ctx.beginPath();
          ctx.arc(u, v, 6 * this.camera.zoom, 0, Math.PI * 2);
          ctx.fillStyle = "#66ccff";
          ctx.fill();
        }
        break;
      }

      case "DRAW_PLAYER": {
        // Draw 2-block tall player marker with face direction & shadow
        const playerH = 2 * this.camera.elevationHeight * this.camera.zoom;
        const width = 14 * this.camera.zoom;

        // Shadow under feet
        ctx.beginPath();
        if (ctx.ellipse) {
          ctx.ellipse(u, v, width / 2, width / 4, 0, 0, Math.PI * 2);
        } else if (ctx.arc) {
          ctx.arc(u, v, width / 2, 0, Math.PI * 2);
        }
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.fill();

        // Player body
        ctx.fillStyle = "#3498db"; // Cyan/blue shirt
        ctx.fillRect(u - width / 2, v - playerH, width, playerH * 0.65);
        ctx.strokeStyle = "#1b4f72";
        ctx.lineWidth = 1;
        ctx.strokeRect(u - width / 2, v - playerH, width, playerH * 0.65);

        // Player head
        const headH = playerH * 0.35;
        ctx.fillStyle = "#f5b041"; // Head
        ctx.fillRect(u - width / 2, v - playerH - headH, width, headH);
        ctx.strokeStyle = "#b9770e";
        ctx.strokeRect(u - width / 2, v - playerH - headH, width, headH);

        // Name tag or indicator
        ctx.fillStyle = "#ffffff";
        ctx.fillText("P1", u - 6, v - playerH - headH - 4);
        break;
      }

      case "DRAW_HIGHLIGHT": {
        ctx.beginPath();
        ctx.moveTo(u, v - halfH);
        ctx.lineTo(u + halfW, v);
        ctx.lineTo(u, v + halfH);
        ctx.lineTo(u - halfW, v);
        ctx.closePath();

        ctx.strokeStyle = "#00ffff";
        ctx.lineWidth = 2;
        ctx.stroke();
        break;
      }
    }

    ctx.restore();
  }
}
