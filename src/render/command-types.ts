import type { Vec3 } from "../core/math.ts";
import type { Player, Tile } from "../core/types.ts";
import type { ScreenPoint } from "./projection.ts";

export type RenderCommandType =
  | "DRAW_FLOOR"
  | "DRAW_TILE"
  | "DRAW_WALL_SIDE"
  | "DRAW_PLAYER"
  | "DRAW_HIGHLIGHT"
  | "DRAW_LAYER_OUTLINE";

export interface RenderCommand {
  type: RenderCommandType;
  depthKey: number;
  worldCoord: Vec3;
  screenCoord: ScreenPoint;
  tile?: Tile;
  player?: Player;
  metadata?: Record<string, unknown>;
}

export interface CanvasContext2DLike {
  save(): void;
  restore(): void;
  translate(x: number, y: number): void;
  scale(x: number, y: number): void;
  transform?(a: number, b: number, c: number, d: number, e: number, f: number): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  closePath(): void;
  clip?(): void;
  fill(): void;
  stroke(): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  strokeRect(x: number, y: number, w: number, h: number): void;
  drawImage?(image: unknown, dx: number, dy: number, dw?: number, dh?: number): void;
  fillText(text: string, x: number, y: number): void;
  arc?(x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise?: boolean): void;
  ellipse?(x: number, y: number, radiusX: number, radiusY: number, rotation: number, startAngle: number, endAngle: number): void;
  fillStyle: string | unknown;
  strokeStyle: string | unknown;
  lineWidth: number;
}

export interface RenderOptions {
  enableCutaway?: boolean;
  selectedLayerZ?: number;
  showLayerOutline?: boolean;
  highlightCoord?: Vec3 | null;
}
