import type { Player, Room, Tile } from "../core/types.ts";
import type { Vec3 } from "../core/math.ts";
import { COMPACT_WALL_TEXTURE_DATA_URL, TEXTURE_MAP } from "./textures.ts";
import { getBlockDefinition } from "../registry/definitions.ts";
import { isCropTile } from "../mechanics/farming.ts";
import type { ScreenPoint, CameraConfig } from "./projection.ts";
import {
  DEFAULT_CAMERA_CONFIG,
  worldToScreen,
  screenToWorld,
  computeDepthKey,
} from "./projection.ts";
import type {
  RenderCommandType,
  RenderCommand,
  CanvasContext2DLike,
  RenderOptions,
} from "./command-types.ts";
import { renderCropTile } from "./draw-crop.ts";
import { renderTexturedTopDiamond, renderWallSideFace } from "./draw-wall.ts";

export type {
  ScreenPoint,
  CameraConfig,
  RenderCommandType,
  RenderCommand,
  CanvasContext2DLike,
  RenderOptions,
};

export {
  DEFAULT_CAMERA_CONFIG,
  worldToScreen,
  screenToWorld,
  computeDepthKey,
};

export class StubRenderer {
  public camera: CameraConfig;
  public wallImage: HTMLImageElement | null = null;
  private wallImageLoaded = false;
  public textures: Map<string, HTMLImageElement> = new Map();

  constructor(camera: Partial<CameraConfig> = {}) {
    this.camera = { ...DEFAULT_CAMERA_CONFIG, ...camera };
    this.initWallTexture();
    this.initTextureMap();
  }

  private initWallTexture(): void {
    if (typeof Image !== "undefined") {
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          this.wallImageLoaded = true;
        };
        img.src = COMPACT_WALL_TEXTURE_DATA_URL;
        this.wallImage = img;
      } catch {
        // Fallback for non-browser environments
        this.wallImage = null;
      }
    }
  }

  private initTextureMap(): void {
    if (typeof Image !== "undefined") {
      try {
        for (const [id, dataUrl] of Object.entries(TEXTURE_MAP)) {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = dataUrl;
          this.textures.set(id, img);
        }
      } catch {
        // Fallback for non-browser environments
      }
    }
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

    // If room has discrete boundary faces (e.g. Compact Machine rooms: width x height interior + 6 faces)
    if (room.faces) {
      // 1. Render bottom boundary face (DOWN) as the floor at z = 0
      const downFace = room.faces.DOWN;
      for (let y = 0; y < room.height; y++) {
        for (let x = 0; x < room.width; x++) {
          const tile = downFace?.[y]?.[x] ?? {
            id: "compactmachines3:wall",
            type: "solid_wall",
            passable: false,
          };
          const screenCoord = worldToScreen(x, y, 0, this.camera);
          const depthKey = computeDepthKey(x, y, 0);
          commands.push({
            type: "DRAW_FLOOR",
            depthKey,
            worldCoord: { x, y, z: 0 },
            screenCoord,
            tile,
          });
        }
      }

      // 2. Render internal room voxels (machines, placed blocks, etc.)
      for (let z = 0; z < room.depth; z++) {
        for (let y = 0; y < room.height; y++) {
          for (let x = 0; x < room.width; x++) {
            const tile = room.voxels[z]?.[y]?.[x];
            if (!tile || tile.id === "minecraft:air") continue;

            const screenCoord = worldToScreen(x, y, z, this.camera);
            const depthKey = computeDepthKey(x, y, z);
            commands.push({
              type: "DRAW_TILE",
              depthKey,
              worldCoord: { x, y, z },
              screenCoord,
              tile,
            });
          }
        }
      }

      // 3. Render back-facing interior boundary wall faces:
      // In isometric projection, the bottom edge of a wall block at elevation `z` aligns with the floor at `z - 1`.
      // Therefore, the 3 wall layers standing above the floor (z = 0) are located at elevation z_world = z + 1 (1..depth).
      //
      // NORTH wall: boundary column at y = -1, facing +Y into the room across x = 0..width-1, z = 0..depth-1.
      // Rendered as "left" face.
      const northFace = room.faces.NORTH;
      for (let z = 0; z < room.depth; z++) {
        for (let x = 0; x < room.width; x++) {
          const tile = northFace?.[z]?.[x] ?? {
            id: "compactmachines3:wall",
            type: "solid_wall",
            passable: false,
          };
          const wallZ = z + 1;
          const screenCoord = worldToScreen(x, -1, wallZ, this.camera);
          const depthKey = computeDepthKey(x, -1 + 0.3, wallZ);
          commands.push({
            type: "DRAW_WALL_SIDE",
            depthKey,
            worldCoord: { x, y: -1, z: wallZ },
            screenCoord,
            tile,
            metadata: { face: "left" },
          });
        }
      }

      // WEST wall: boundary column at x = -1, facing +X into the room across y = 0..height-1, z = 0..depth-1.
      // Rendered as "right" face.
      const westFace = room.faces.WEST;
      for (let z = 0; z < room.depth; z++) {
        for (let y = 0; y < room.height; y++) {
          const tile = westFace?.[z]?.[y] ?? {
            id: "compactmachines3:wall",
            type: "solid_wall",
            passable: false,
          };
          const wallZ = z + 1;
          const screenCoord = worldToScreen(-1, y, wallZ, this.camera);
          const depthKey = computeDepthKey(-1 + 0.3, y, wallZ);
          commands.push({
            type: "DRAW_WALL_SIDE",
            depthKey,
            worldCoord: { x: -1, y, z: wallZ },
            screenCoord,
            tile,
            metadata: { face: "right" },
          });
        }
      }

      // Front walls (SOUTH, EAST) and ceiling (UP) are only rendered if cutaway is disabled
      if (!enableCutaway) {
        // SOUTH wall: along y = height - 1, facing -Y
        const southFace = room.faces.SOUTH;
        for (let z = 0; z < room.depth; z++) {
          for (let x = 0; x < room.width; x++) {
            const tile = southFace?.[z]?.[x] ?? {
              id: "compactmachines3:wall",
              type: "solid_wall",
              passable: false,
            };
            const screenCoord = worldToScreen(x, room.height - 1, z, this.camera);
            const depthKey = computeDepthKey(x, room.height - 1 + 0.3, z);
            commands.push({
              type: "DRAW_WALL_SIDE",
              depthKey,
              worldCoord: { x, y: room.height - 1, z },
              screenCoord,
              tile,
              metadata: { face: "left" },
            });
          }
        }

        // EAST wall: along x = width - 1, facing -X
        const eastFace = room.faces.EAST;
        for (let z = 0; z < room.depth; z++) {
          for (let y = 0; y < room.height; y++) {
            const tile = eastFace?.[z]?.[y] ?? {
              id: "compactmachines3:wall",
              type: "solid_wall",
              passable: false,
            };
            const screenCoord = worldToScreen(room.width - 1, y, z, this.camera);
            const depthKey = computeDepthKey(room.width - 1 + 0.3, y, z);
            commands.push({
              type: "DRAW_WALL_SIDE",
              depthKey,
              worldCoord: { x: room.width - 1, y, z },
              screenCoord,
              tile,
              metadata: { face: "right" },
            });
          }
        }

        // UP ceiling
        const upFace = room.faces.UP;
        for (let y = 0; y < room.height; y++) {
          for (let x = 0; x < room.width; x++) {
            const tile = upFace?.[y]?.[x] ?? {
              id: "compactmachines3:wall",
              type: "solid_wall",
              passable: false,
            };
            const screenCoord = worldToScreen(x, y, room.depth, this.camera);
            const depthKey = computeDepthKey(x, y, room.depth);
            commands.push({
              type: "DRAW_FLOOR",
              depthKey,
              worldCoord: { x, y, z: room.depth },
              screenCoord,
              tile,
            });
          }
        }
      }
    } else {
      // Standard voxel room (e.g. Outer Room 2x1x(4/5))
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

            // Floor tiles (e.g. ground at z=0 or explicitly typed floor)
            if (tile.type === "floor" || (z === 0 && tile.type !== "solid_wall")) {
              const depthKey = computeDepthKey(x, y, z);
              commands.push({
                type: "DRAW_FLOOR",
                depthKey,
                worldCoord: { x, y, z },
                screenCoord,
                tile,
              });
              continue;
            }

            // Solid wall blocks: render using side faces, not top faces!
            if (tile.type === "solid_wall" || tile.id === "compactmachines3:wall") {
              if (z === 0) {
                const depthKey = computeDepthKey(x, y, z);
                commands.push({
                  type: "DRAW_FLOOR",
                  depthKey,
                  worldCoord: { x, y, z },
                  screenCoord,
                  tile,
                });
                continue;
              }

              const tileInFrontX = room.voxels[z]?.[y]?.[x + 1];
              const hasRightSideFace = !tileInFrontX || tileInFrontX.type === "air" || tileInFrontX.passable || x === 0;

              const tileInFrontY = room.voxels[z]?.[y + 1]?.[x];
              const hasLeftSideFace = !tileInFrontY || tileInFrontY.type === "air" || tileInFrontY.passable || y === 0;

              if (hasRightSideFace) {
                const depthKey = computeDepthKey(x + 0.3, y, z);
                commands.push({
                  type: "DRAW_WALL_SIDE",
                  depthKey,
                  worldCoord: { x, y, z },
                  screenCoord,
                  tile,
                  metadata: { face: "right" },
                });
              }

              if (hasLeftSideFace) {
                const depthKey = computeDepthKey(x, y + 0.3, z);
                commands.push({
                  type: "DRAW_WALL_SIDE",
                  depthKey,
                  worldCoord: { x, y, z },
                  screenCoord,
                  tile,
                  metadata: { face: "left" },
                });
              }

              if (!hasRightSideFace && !hasLeftSideFace) {
                const depthKey = computeDepthKey(x, y, z);
                commands.push({
                  type: "DRAW_WALL_SIDE",
                  depthKey,
                  worldCoord: { x, y, z },
                  screenCoord,
                  tile,
                  metadata: { face: "both" },
                });
              }
              continue;
            }

            // Other tiles (machines, torches, etc.)
            const depthKey = computeDepthKey(x, y, z);
            commands.push({
              type: "DRAW_TILE",
              depthKey,
              worldCoord: { x, y, z },
              screenCoord,
              tile,
            });
          }
        }
      }
    }

    // Collect players in this room
    for (const player of players) {
      if (player.currentRoomId !== room.id) continue;

      // In the coordinate system:
      // A player standing at (x, y) with feet resting on the floor (z=0) is at z=1.
      // The floor tile top surface center is at worldToScreen(player.x, player.y, player.z - 1).
      // Placing player feet anchor at the floor surface centers the player in the diamond!
      const screenCoord = worldToScreen(player.x, player.y, player.z - 1, this.camera);
      // Player base at feet z - 1, depth key slightly higher than floor to sort immediately above floor
      const depthKey = computeDepthKey(player.x, player.y, player.z - 0.4);

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

    // Layer 3D wireframe outline and block 3D wireframe highlight
    const layerZ = options.selectedLayerZ;
    if (typeof layerZ === "number" && (options.showLayerOutline ?? true)) {
      const centerScreen = worldToScreen((room.width - 1) / 2, (room.height - 1) / 2, layerZ, this.camera);
      commands.push({
        type: "DRAW_LAYER_OUTLINE",
        depthKey: Infinity - 2,
        worldCoord: { x: 0, y: 0, z: layerZ },
        screenCoord: centerScreen,
        metadata: {
          width: room.width,
          height: room.height,
          layerZ,
        },
      });
    }

    if (options.highlightCoord) {
      const { x, y, z } = options.highlightCoord;
      const screenCoord = worldToScreen(x, y, z, this.camera);
      commands.push({
        type: "DRAW_HIGHLIGHT",
        depthKey: Infinity - 1,
        worldCoord: { x, y, z },
        screenCoord,
        metadata: {
          highlightCoord: { x, y, z },
        },
      });
    }

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
    const elevH = this.camera.elevationHeight * this.camera.zoom;
    const { u, v } = cmd.screenCoord;

    ctx.save();

    switch (cmd.type) {
      case "DRAW_FLOOR":
      case "DRAW_TILE": {
        const tileId = cmd.tile?.id;

        // Custom styling for specific tiles
        if (tileId === "minecraft:torch") {
          ctx.fillStyle = "#ffdd44";
          ctx.fillRect(u - 2, v - 12, 4, 10);
          ctx.fillStyle = "#ff3300";
          ctx.fillRect(u - 3, v - 15, 6, 4);
          ctx.fillStyle = "#ffffaa";
          ctx.fillRect(u - 1, v - 14, 2, 2);
          break;
        }

        // Check if rendering a crop / bonsai tile
        if (cmd.tile && (isCropTile(cmd.tile) || cmd.tile.id === "immersiveengineering:hemp_top")) {
          renderCropTile(ctx, u, v, halfW, halfH, this.camera.zoom, cmd.tile);
          break;
        }

        // Standard block rendering: top isometric diamond
        ctx.beginPath();
        ctx.moveTo(u, v - halfH);
        ctx.lineTo(u + halfW, v);
        ctx.lineTo(u, v + halfH);
        ctx.lineTo(u - halfW, v);
        ctx.closePath();

        const blockDef = tileId ? getBlockDefinition(tileId) : undefined;
        const blockTexture = tileId ? this.textures.get(tileId) : undefined;

        if (tileId === "compactmachines3:wall" || (cmd.type === "DRAW_FLOOR" && cmd.tile?.type === "solid_wall")) {
          // Render textured compact wall floor tile
          renderTexturedTopDiamond(ctx, u, v, halfW, halfH, this.wallImage, this.wallImageLoaded);
        } else if (blockTexture && blockTexture.complete && blockTexture.naturalWidth > 0) {
          renderTexturedTopDiamond(ctx, u, v, halfW, halfH, blockTexture, this.wallImageLoaded);
        } else {
          if (tileId === "minecraft:bedrock") {
            ctx.fillStyle = "#2a2a2a";
            ctx.strokeStyle = "#151515";
            ctx.lineWidth = 1;
          } else if (tileId === "compactmachines3:machine_tiny") {
            ctx.fillStyle = "#1e3a5f";
            ctx.strokeStyle = "#4da6ff";
            ctx.lineWidth = 2;
          } else if (tileId === "minecraft:dirt") {
            ctx.fillStyle = "#866043"; // Rich earthy brown for dirt block
            ctx.strokeStyle = "#5c3d26";
            ctx.lineWidth = 1;
          } else if (tileId === "minecraft:farmland" || blockDef?.type === "farmland") {
            ctx.fillStyle = "#5c3d26"; // Darker cultivated farmland soil
            ctx.strokeStyle = "#3e2716";
            ctx.lineWidth = 1;
          } else if (cmd.tile?.type === "solid_wall") {
            ctx.fillStyle = "#3a3c42";
            ctx.strokeStyle = "#25272c";
            ctx.lineWidth = 1;
          } else {
            ctx.fillStyle = "#4a4c54";
            ctx.strokeStyle = "#2b2d33";
            ctx.lineWidth = 1;
          }

          ctx.fill();
          ctx.stroke();

          // Optional decorative markings on special blocks
          if (tileId === "compactmachines3:machine_tiny") {
            ctx.beginPath();
            if (ctx.arc) {
              ctx.arc(u, v, 6 * this.camera.zoom, 0, Math.PI * 2);
            }
            ctx.fillStyle = "#66ccff";
            ctx.fill();
          } else if (tileId === "minecraft:farmland" || blockDef?.type === "farmland") {
            // Draw furrowed lines for tilled farmland
            ctx.beginPath();
            ctx.moveTo(u - halfW * 0.5, v);
            ctx.lineTo(u, v + halfH * 0.5);
            ctx.moveTo(u, v - halfH * 0.5);
            ctx.lineTo(u + halfW * 0.5, v);
            ctx.strokeStyle = "#382212";
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
        break;
      }

      case "DRAW_WALL_SIDE": {
        const face = cmd.metadata?.face as string | undefined;
        const drawFace = (side: "left" | "right") => {
          renderWallSideFace(ctx, u, v, halfW, halfH, elevH, side, this.wallImage, this.wallImageLoaded);
        };

        if (face === "right" || face === "both") {
          drawFace("right");
        }
        if (face === "left" || face === "both") {
          drawFace("left");
        }
        break;
      }

      case "DRAW_PLAYER": {
        // Draw 2-block tall player marker with face direction & shadow
        const playerH = 2 * this.camera.elevationHeight * this.camera.zoom;
        const width = 14 * this.camera.zoom;

        // Shadow directly on the center of the floor tile diamond
        ctx.beginPath();
        if (ctx.ellipse) {
          ctx.ellipse(u, v, width / 2, width / 4, 0, 0, Math.PI * 2);
        } else if (ctx.arc) {
          ctx.arc(u, v, width / 2, 0, Math.PI * 2);
        }
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.fill();

        // Player body: feet anchor at (u, v), standing upward
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
        // Draw complete 3D wireframe bounding cube/voxel (all 12 edges: top diamond, bottom diamond, 4 vertical edge struts)
        // Top diamond (z + 1 surface)
        ctx.beginPath();
        ctx.moveTo(u, v - halfH);
        ctx.lineTo(u + halfW, v);
        ctx.lineTo(u, v + halfH);
        ctx.lineTo(u - halfW, v);
        ctx.closePath();

        // Bottom diamond (z surface: 1 elevation level down on screen, i.e., +elevH)
        ctx.moveTo(u, v - halfH + elevH);
        ctx.lineTo(u + halfW, v + elevH);
        ctx.lineTo(u, v + halfH + elevH);
        ctx.lineTo(u - halfW, v + elevH);
        ctx.closePath();

        // 4 vertical corner struts connecting top to bottom
        // Top vertex strut
        ctx.moveTo(u, v - halfH);
        ctx.lineTo(u, v - halfH + elevH);
        // Right vertex strut
        ctx.moveTo(u + halfW, v);
        ctx.lineTo(u + halfW, v + elevH);
        // Bottom vertex strut
        ctx.moveTo(u, v + halfH);
        ctx.lineTo(u, v + halfH + elevH);
        // Left vertex strut
        ctx.moveTo(u - halfW, v);
        ctx.lineTo(u - halfW, v + elevH);

        ctx.strokeStyle = "#00ffff";
        ctx.lineWidth = 2;
        ctx.stroke();
        break;
      }

      case "DRAW_LAYER_OUTLINE": {
        // Draw 3D wireframe bounding slab for the selected layer
        const width = (cmd.metadata?.width as number) ?? 3;
        const height = (cmd.metadata?.height as number) ?? 3;
        const layerZ = (cmd.metadata?.layerZ as number) ?? 0;

        // The layer occupies vertical extent from layerZ to layerZ + 1 in world coords.
        // Top surface of the layer is at elevation layerZ + 1 (drawn with standard block top anchor at z=layerZ).
        // Bottom surface of the layer is 1 elevation down (+elevH in screen coordinates).
        const pTop = worldToScreen(0, 0, layerZ, this.camera);
        const topU = pTop.u;
        const topV = pTop.v - halfH;

        const pRight = worldToScreen(width - 1, 0, layerZ, this.camera);
        const rightU = pRight.u + halfW;
        const rightV = pRight.v;

        const pBottom = worldToScreen(width - 1, height - 1, layerZ, this.camera);
        const bottomU = pBottom.u;
        const bottomV = pBottom.v + halfH;

        const pLeft = worldToScreen(0, height - 1, layerZ, this.camera);
        const leftU = pLeft.u - halfW;
        const leftV = pLeft.v;

        // 1. Top perimeter wireframe
        ctx.beginPath();
        ctx.moveTo(topU, topV);
        ctx.lineTo(rightU, rightV);
        ctx.lineTo(bottomU, bottomV);
        ctx.lineTo(leftU, leftV);
        ctx.closePath();

        // 2. Bottom perimeter wireframe (elevH lower)
        ctx.moveTo(topU, topV + elevH);
        ctx.lineTo(rightU, rightV + elevH);
        ctx.lineTo(bottomU, bottomV + elevH);
        ctx.lineTo(leftU, leftV + elevH);
        ctx.closePath();

        // 3. Four vertical corner struts
        ctx.moveTo(topU, topV);
        ctx.lineTo(topU, topV + elevH);
        ctx.moveTo(rightU, rightV);
        ctx.lineTo(rightU, rightV + elevH);
        ctx.moveTo(bottomU, bottomV);
        ctx.lineTo(bottomU, bottomV + elevH);
        ctx.moveTo(leftU, leftV);
        ctx.lineTo(leftU, leftV + elevH);

        ctx.strokeStyle = "rgba(97, 175, 239, 0.85)";
        ctx.lineWidth = 2;
        ctx.stroke();

        // 4. Subtle inner grid wireframe lines across the layer slab
        ctx.beginPath();
        for (let x = 1; x < width; x++) {
          const startPt = worldToScreen(x, 0, layerZ, this.camera);
          const endPt = worldToScreen(x, height - 1, layerZ, this.camera);
          // Top grid line
          ctx.moveTo(startPt.u - halfW, startPt.v);
          ctx.lineTo(endPt.u, endPt.v + halfH);
          // Bottom grid line
          ctx.moveTo(startPt.u - halfW, startPt.v + elevH);
          ctx.lineTo(endPt.u, endPt.v + halfH + elevH);
        }
        for (let y = 1; y < height; y++) {
          const startPt = worldToScreen(0, y, layerZ, this.camera);
          const endPt = worldToScreen(width - 1, y, layerZ, this.camera);
          // Top grid line
          ctx.moveTo(startPt.u + halfW, startPt.v);
          ctx.lineTo(endPt.u, endPt.v + halfH);
          // Bottom grid line
          ctx.moveTo(startPt.u + halfW, startPt.v + elevH);
          ctx.lineTo(endPt.u, endPt.v + halfH + elevH);
        }
        ctx.strokeStyle = "rgba(97, 175, 239, 0.3)";
        ctx.lineWidth = 1;
        ctx.stroke();
        break;
      }
    }

    ctx.restore();
  }

  /**
   * Renders a crop or miniature bonsai tile across distinct growth stages.
   */
}
