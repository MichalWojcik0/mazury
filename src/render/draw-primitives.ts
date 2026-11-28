import type { CanvasContext2DLike } from "./command-types.ts";
import { renderWallSideFace } from "./draw-wall.ts";

export const OAK_WOOD_FALLBACK = {
  leftFill: "#9c7848",
  rightFill: "#806036",
  stroke: "#543d20",
  drawPanelSeam: false,
};

export const STONE_FALLBACK = {
  leftFill: "#7a7a7a",
  rightFill: "#646464",
  stroke: "#3b3b3b",
  drawPanelSeam: false,
};

export function isImgLoaded(img: HTMLImageElement | null | undefined): img is HTMLImageElement {
  return Boolean(img && img.complete && img.naturalWidth > 0);
}

export function fillTopInsetDiamond(
  ctx: CanvasContext2DLike,
  u: number,
  v: number,
  halfW: number,
  halfH: number,
  scale: number,
  fillStyle: string,
  strokeStyle?: string
): void {
  const hw = halfW * scale;
  const hh = halfH * scale;
  ctx.beginPath();
  ctx.moveTo(u, v - hh);
  ctx.lineTo(u + hw, v);
  ctx.lineTo(u, v + hh);
  ctx.lineTo(u - hw, v);
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

export function drawFourLegs(
  ctx: CanvasContext2DLike,
  u: number,
  v: number,
  halfW: number,
  halfH: number,
  slabH: number,
  legH: number,
  legFrac: number,
  planksTexture: HTMLImageElement | null
): void {
  const loaded = isImgLoaded(planksTexture);
  const lw = halfW * legFrac;
  const lh = halfH * legFrac;
  const legCenters = [
    { x: u, y: v - halfH + lh },
    { x: u - halfW + lw, y: v },
    { x: u + halfW - lw, y: v },
    { x: u, y: v + halfH - lh },
  ];

  for (const leg of legCenters) {
    renderWallSideFace(ctx, leg.x, leg.y + slabH, lw, lh, legH, "left", planksTexture, loaded, OAK_WOOD_FALLBACK);
    renderWallSideFace(ctx, leg.x, leg.y + slabH, lw, lh, legH, "right", planksTexture, loaded, OAK_WOOD_FALLBACK);
  }
}
