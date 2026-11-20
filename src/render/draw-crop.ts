import type { Tile } from "../core/types.ts";
import type { CanvasContext2DLike } from "./command-types.ts";
import { getGrowthProgress } from "../mechanics/farming.ts";

function drawCrossedQuadTexture(
  ctx: CanvasContext2DLike,
  u: number,
  baseV: number,
  dx: number,
  dy: number,
  spriteH: number,
  texture: HTMLImageElement
): void {
  const imgW = texture.naturalWidth || 16;
  const imgH = texture.naturalHeight || 16;
  const halfImgW = imgW / 2;

  const drawHalf = (
    sx: number,
    a: number,
    b: number,
    e: number,
    f: number
  ) => {
    ctx.save();
    if (ctx.imageSmoothingEnabled !== undefined) {
      ctx.imageSmoothingEnabled = false;
    }
    ctx.transform?.(a, b, 0, spriteH / imgH, e, f);
    ctx.drawImage?.(texture, sx, 0, halfImgW, imgH, 0, 0, halfImgW, imgH);
    ctx.restore();
  };

  // True 3D painter's order for two intersecting flat texture planes:
  // 1. Back half of Plane A (NW -> center)
  drawHalf(0, dx / halfImgW, dy / halfImgW, u - dx, baseV - dy - spriteH);
  // 2. Back half of Plane B (center -> NE)
  drawHalf(halfImgW, dx / halfImgW, -dy / halfImgW, u, baseV - spriteH);
  // 3. Front half of Plane A (center -> SE)
  drawHalf(halfImgW, dx / halfImgW, dy / halfImgW, u, baseV - spriteH);
  // 4. Front half of Plane B (SW -> center)
  drawHalf(0, dx / halfImgW, -dy / halfImgW, u - dx, baseV + dy - spriteH);
}

function drawCrossedQuadFallback(
  ctx: CanvasContext2DLike,
  u: number,
  baseV: number,
  dx: number,
  dy: number,
  spriteH: number,
  isMature: boolean
): void {
  const fillA = isMature ? "#2e7d32" : "#4caf50";
  const fillB = isMature ? "#1b5e20" : "#388e3c";

  // Plane A (NW-SE flat quad)
  ctx.beginPath();
  ctx.moveTo(u - dx, baseV - dy - spriteH);
  ctx.lineTo(u + dx, baseV + dy - spriteH);
  ctx.lineTo(u + dx, baseV + dy);
  ctx.lineTo(u - dx, baseV - dy);
  ctx.closePath();
  ctx.fillStyle = fillA;
  ctx.fill();

  // Plane B (SW-NE flat quad)
  ctx.beginPath();
  ctx.moveTo(u - dx, baseV + dy - spriteH);
  ctx.lineTo(u + dx, baseV - dy - spriteH);
  ctx.lineTo(u + dx, baseV - dy);
  ctx.lineTo(u - dx, baseV + dy);
  ctx.closePath();
  ctx.fillStyle = fillB;
  ctx.fill();
}

export function renderCropTile(
  ctx: CanvasContext2DLike,
  u: number,
  v: number,
  halfW: number,
  halfH: number,
  elevH: number,
  zoom: number,
  tile: Tile,
  texture?: HTMLImageElement | null
): void {
  const { progress, stage, isMature } = getGrowthProgress(tile);
  const tileId = tile.id;

  if (tileId.startsWith("arcadialbonsaitrees:bonsai_")) {
    const baseV = v + elevH;
    const scale = 0.55 + progress * 0.45;
    const dx = halfW * 0.6 * scale;
    const dy = halfH * 0.6 * scale;
    const spriteH = elevH * 1.8 * scale;

    const canDrawTexture = Boolean(
      texture &&
        texture.complete &&
        texture.naturalWidth > 0 &&
        typeof ctx.transform === "function" &&
        typeof ctx.drawImage === "function"
    );

    if (canDrawTexture && texture) {
      drawCrossedQuadTexture(ctx, u, baseV, dx, dy, spriteH, texture);
    } else {
      drawCrossedQuadFallback(ctx, u, baseV, dx, dy, spriteH, isMature);
    }
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
