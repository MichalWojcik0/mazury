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

function drawCropGridTexture(
  ctx: CanvasContext2DLike,
  u: number,
  baseV: number,
  halfW: number,
  halfH: number,
  spriteH: number,
  texture: HTMLImageElement
): void {
  const imgW = texture.naturalWidth || 16;
  const imgH = texture.naturalHeight || 16;
  const topV = baseV - spriteH;

  const drawPlane = (u0: number, v0Top: number, dv: number) => {
    ctx.save();
    if (ctx.imageSmoothingEnabled !== undefined) {
      ctx.imageSmoothingEnabled = false;
    }
    ctx.transform?.(halfW / imgW, dv / imgW, 0, spriteH / imgH, u0, v0Top);
    ctx.drawImage?.(texture, 0, 0, imgW, imgH, 0, 0, imgW, imgH);
    ctx.restore();
  };

  // Minecraft crop model (#): 4 vertical planes at +/-0.25 along X and Y in back-to-front order
  // 1. Back X-plane (y = -0.25)
  drawPlane(u - 0.25 * halfW, topV - 0.75 * halfH, halfH);
  // 2. Back Y-plane (x = -0.25)
  drawPlane(u - 0.75 * halfW, topV + 0.25 * halfH, -halfH);
  // 3. Front X-plane (y = +0.25)
  drawPlane(u - 0.75 * halfW, topV - 0.25 * halfH, halfH);
  // 4. Front Y-plane (x = +0.25)
  drawPlane(u - 0.25 * halfW, topV + 0.75 * halfH, -halfH);
}

function drawCropGridFallback(
  ctx: CanvasContext2DLike,
  u: number,
  baseV: number,
  halfW: number,
  halfH: number,
  spriteH: number,
  progress: number,
  isMature: boolean
): void {
  const h = spriteH * (0.25 + progress * 0.75);
  const topV = baseV - h;
  const color = isMature ? "#d4af37" : "#689f38";
  const planes = [
    { u0: u - 0.25 * halfW, v0: topV - 0.75 * halfH, dv: halfH },
    { u0: u - 0.75 * halfW, v0: topV + 0.25 * halfH, dv: -halfH },
    { u0: u - 0.75 * halfW, v0: topV - 0.25 * halfH, dv: halfH },
    { u0: u - 0.25 * halfW, v0: topV + 0.75 * halfH, dv: -halfH },
  ];

  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, halfW * 0.04);
  for (const p of planes) {
    ctx.beginPath();
    ctx.moveTo(p.u0, p.v0);
    ctx.lineTo(p.u0 + halfW, p.v0 + p.dv);
    ctx.lineTo(p.u0 + halfW, p.v0 + p.dv + h);
    ctx.lineTo(p.u0, p.v0 + h);
    ctx.closePath();
    ctx.stroke();
  }
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
    const baseV = v + elevH;
    const spriteH = elevH;

    const canDrawTexture = Boolean(
      texture &&
        texture.complete &&
        texture.naturalWidth > 0 &&
        typeof ctx.transform === "function" &&
        typeof ctx.drawImage === "function"
    );

    if (canDrawTexture && texture) {
      drawCropGridTexture(ctx, u, baseV, halfW, halfH, spriteH, texture);
    } else {
      drawCropGridFallback(ctx, u, baseV, halfW, halfH, spriteH, progress, isMature);
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
