import type { CanvasContext2DLike } from "./command-types.ts";
import { renderTexturedTopDiamond, renderWallSideFace } from "./draw-wall.ts";

const OAK_WOOD_FALLBACK = {
  leftFill: "#9c7848",
  rightFill: "#806036",
  stroke: "#543d20",
  drawPanelSeam: false,
};

/**
 * Renders a Tinkers' Construct / Crafting Station block:
 * - 4 slender oak-plank corner legs underneath (open space between legs)
 * - Thin tabletop rim (1/4 block height) in oak planks
 * - Crafting grid tabletop surface on top
 */
export function renderCraftingStation(
  ctx: CanvasContext2DLike,
  u: number,
  v: number,
  halfW: number,
  halfH: number,
  elevH: number,
  topTexture: HTMLImageElement | null,
  planksTexture: HTMLImageElement | null
): void {
  const slabH = elevH * 0.25;
  const legH = elevH - slabH;
  const legFrac = 0.22;
  const lw = halfW * legFrac;
  const lh = halfH * legFrac;

  const planksLoaded = Boolean(
    planksTexture && planksTexture.complete && planksTexture.naturalWidth > 0
  );
  const topLoaded = Boolean(
    topTexture && topTexture.complete && topTexture.naturalWidth > 0
  );

  // 4 corner leg centers in painter's order (back -> left & right -> front)
  const legCenters = [
    { x: u, y: v - halfH + lh },       // Back (North)
    { x: u - halfW + lw, y: v },       // Left (West)
    { x: u + halfW - lw, y: v },       // Right (East)
    { x: u, y: v + halfH - lh },       // Front (South)
  ];

  for (const leg of legCenters) {
    renderWallSideFace(
      ctx,
      leg.x,
      leg.y + slabH,
      lw,
      lh,
      legH,
      "left",
      planksTexture,
      planksLoaded,
      OAK_WOOD_FALLBACK
    );
    renderWallSideFace(
      ctx,
      leg.x,
      leg.y + slabH,
      lw,
      lh,
      legH,
      "right",
      planksTexture,
      planksLoaded,
      OAK_WOOD_FALLBACK
    );
  }

  // Thin wooden tabletop side rims (1/4 block height)
  renderWallSideFace(
    ctx,
    u,
    v,
    halfW,
    halfH,
    slabH,
    "left",
    planksTexture,
    planksLoaded,
    OAK_WOOD_FALLBACK
  );
  renderWallSideFace(
    ctx,
    u,
    v,
    halfW,
    halfH,
    slabH,
    "right",
    planksTexture,
    planksLoaded,
    OAK_WOOD_FALLBACK
  );

  // Crafting Station top surface (3x3 crafting grid)
  if (topLoaded && topTexture) {
    renderTexturedTopDiamond(ctx, u, v, halfW, halfH, topTexture, true);
  } else {
    ctx.beginPath();
    ctx.moveTo(u, v - halfH);
    ctx.lineTo(u + halfW, v);
    ctx.lineTo(u, v + halfH);
    ctx.lineTo(u - halfW, v);
    ctx.closePath();
    ctx.fillStyle = "#a37b4b";
    ctx.fill();
    ctx.strokeStyle = "#543d20";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}
