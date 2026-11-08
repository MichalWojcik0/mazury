import type { Tile } from "../core/types.ts";
import type { CanvasContext2DLike } from "./command-types.ts";
import { getGrowthProgress } from "../mechanics/farming.ts";

export function renderCropTile(
  ctx: CanvasContext2DLike,
  u: number,
  v: number,
  halfW: number,
  halfH: number,
  zoom: number,
  tile: Tile
): void {
  const { progress, stage, isMature } = getGrowthProgress(tile);
  const tileId = tile.id;

  if (tileId.startsWith("arcadialbonsaitrees:bonsai_")) {
    ctx.beginPath();
    ctx.ellipse?.(u, v, halfW * 0.45, halfH * 0.45, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#3e2716";
    ctx.fill();

    const trunkH = (5 + progress * 10) * zoom;
    const trunkW = 3 * zoom;

    ctx.fillStyle = "#6d4c41";
    ctx.fillRect(u - trunkW / 2, v - trunkH, trunkW, trunkH);

    const crownRadius = (3 + progress * 8) * zoom;
    const crownY = v - trunkH - crownRadius * 0.3;

    ctx.beginPath();
    if (ctx.arc) {
      ctx.arc(u, crownY, crownRadius, 0, Math.PI * 2);
    } else {
      ctx.fillRect(u - crownRadius, crownY - crownRadius, crownRadius * 2, crownRadius * 2);
    }
    ctx.fillStyle = isMature ? "#2e7d32" : "#4caf50";
    ctx.fill();
  } else if (tileId === "minecraft:wheat") {
    const stalkCount = 4 + stage;
    const stalkH = (4 + progress * 16) * zoom;
    ctx.strokeStyle = isMature ? "#d4af37" : "#7cb342";
    ctx.lineWidth = 1.5 * zoom;

    for (let i = 0; i < stalkCount; i++) {
      const offsetRatio = i / (stalkCount - 1) - 0.5;
      const xOff = offsetRatio * halfW * 0.7;
      const yOff = Math.abs(offsetRatio) * 0.5 * halfH;

      ctx.beginPath();
      ctx.moveTo(u + xOff, v + yOff);
      ctx.lineTo(u + xOff * 1.2, v + yOff - stalkH);
      ctx.stroke();

      if (isMature) {
        ctx.fillStyle = "#f5c542";
        ctx.fillRect(u + xOff * 1.2 - 1, v + yOff - stalkH - 2, 3, 3);
      }
    }
  } else if (tileId === "immersiveengineering:hemp" || tileId === "immersiveengineering:hemp_top") {
    const stalkH = (6 + progress * 16) * zoom;
    ctx.strokeStyle = "#33691e";
    ctx.lineWidth = 2 * zoom;

    ctx.beginPath();
    ctx.moveTo(u, v);
    ctx.lineTo(u, v - stalkH);
    ctx.stroke();

    const leafCount = tileId === "immersiveengineering:hemp_top" ? 3 : 2 + Math.floor(progress * 3);
    ctx.fillStyle = "#558b2f";
    for (let i = 1; i <= leafCount; i++) {
      const ly = v - (stalkH * i) / (leafCount + 1);
      ctx.beginPath();
      ctx.ellipse?.(u - 5 * zoom, ly, 4 * zoom, 2 * zoom, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse?.(u + 5 * zoom, ly, 4 * zoom, 2 * zoom, 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = "#8bc34a";
    ctx.beginPath();
    ctx.arc?.(u, v - 8 * zoom, 6 * zoom, 0, Math.PI * 2);
    ctx.fill();
  }
}
