import type { Tile } from "../core/types.ts";
import type { CanvasContext2DLike } from "./command-types.ts";
import { renderTexturedTopDiamond, renderWallSideFace } from "./draw-wall.ts";
import { getSieveState, MESH_REGISTRY } from "../mechanics/sieve.ts";
import { getBarrelState, getCrucibleState, FLUID_CAPACITY_MB } from "../mechanics/fluids.ts";
import { getFurnaceState } from "../mechanics/furnace.ts";

const STONE_FALLBACK = {
  leftFill: "#7a7a7a",
  rightFill: "#646464",
  stroke: "#3b3b3b",
  drawPanelSeam: false,
};

const OAK_WOOD_FALLBACK = {
  leftFill: "#9c7848",
  rightFill: "#806036",
  stroke: "#543d20",
  drawPanelSeam: false,
};

function isImgLoaded(img: HTMLImageElement | null | undefined): img is HTMLImageElement {
  return Boolean(img && img.complete && img.naturalWidth > 0);
}

function fillTopInsetDiamond(
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

function drawFourLegs(
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

/**
 * Renders an Ex Nihilo Wooden Sieve:
 * - 4 wooden corner legs
 * - Wooden hopper frame rim
 * - Installed mesh grid + optional substrate block & sifting progress
 */
export function renderSieve(
  ctx: CanvasContext2DLike,
  u: number,
  v: number,
  halfW: number,
  halfH: number,
  elevH: number,
  tile: Tile,
  planksTexture: HTMLImageElement | null
): void {
  const loaded = isImgLoaded(planksTexture);
  const rimH = elevH * 0.35;
  const legH = elevH - rimH;

  drawFourLegs(ctx, u, v, halfW, halfH, rimH, legH, 0.16, planksTexture);

  renderWallSideFace(ctx, u, v, halfW, halfH, rimH, "left", planksTexture, loaded, OAK_WOOD_FALLBACK);
  renderWallSideFace(ctx, u, v, halfW, halfH, rimH, "right", planksTexture, loaded, OAK_WOOD_FALLBACK);

  // Outer wooden top rim
  if (loaded && planksTexture) {
    renderTexturedTopDiamond(ctx, u, v, halfW, halfH, planksTexture, true);
  } else {
    fillTopInsetDiamond(ctx, u, v, halfW, halfH, 1.0, "#a37b4b", "#543d20");
  }

  // Hollow interior recess
  fillTopInsetDiamond(ctx, u, v, halfW, halfH, 0.78, "#2a1f12", "#4a3520");

  const state = getSieveState(tile);
  if (state.meshId) {
    const meshColor = MESH_REGISTRY[state.meshId]?.color ?? "#e6e0d4";
    ctx.strokeStyle = meshColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = -2; i <= 2; i++) {
      const t = i * 0.25;
      ctx.moveTo(u + (t - 0.72) * halfW * 0.5, v + (t + 0.72) * halfH * 0.5);
      ctx.lineTo(u + (t + 0.72) * halfW * 0.5, v + (t - 0.72) * halfH * 0.5);
      ctx.moveTo(u + (-0.72 - t) * halfW * 0.5, v + (-0.72 + t) * halfH * 0.5);
      ctx.lineTo(u + (0.72 - t) * halfW * 0.5, v + (0.72 + t) * halfH * 0.5);
    }
    ctx.stroke();
  }

  if (state.substrateId) {
    const subColor =
      state.substrateId === "minecraft:gravel"
        ? "#837e7c"
        : state.substrateId === "minecraft:sand"
          ? "#dbd3a0"
          : "#c7c5b8";
    const shrink = Math.max(0.25, 0.7 - (state.progress / 100) * 0.4);
    fillTopInsetDiamond(ctx, u, v + 1, halfW, halfH, shrink, subColor, "#4a4744");
  }
}

/**
 * Renders an Ex Nihilo Wooden Barrel:
 * - Full-height oak plank body with 2 dark barrel hoops
 * - Recessed interior showing water, sewage, clay, or slag
 */
export function renderBarrel(
  ctx: CanvasContext2DLike,
  u: number,
  v: number,
  halfW: number,
  halfH: number,
  elevH: number,
  tile: Tile,
  planksTexture: HTMLImageElement | null,
  waterTexture: HTMLImageElement | null,
  clayTexture: HTMLImageElement | null
): void {
  const loaded = isImgLoaded(planksTexture);
  const bw = halfW * 0.9;
  const bh = halfH * 0.9;

  renderWallSideFace(ctx, u, v, bw, bh, elevH, "left", planksTexture, loaded, OAK_WOOD_FALLBACK);
  renderWallSideFace(ctx, u, v, bw, bh, elevH, "right", planksTexture, loaded, OAK_WOOD_FALLBACK);

  // Dark wooden/iron barrel hoops on side faces
  ctx.strokeStyle = "#3a2815";
  ctx.lineWidth = Math.max(1.5, elevH * 0.12);
  for (const frac of [0.25, 0.75]) {
    const yOff = elevH * frac;
    ctx.beginPath();
    ctx.moveTo(u - bw, v + yOff);
    ctx.lineTo(u, v + bh + yOff);
    ctx.lineTo(u + bw, v + yOff);
    ctx.stroke();
  }

  // Top rim
  if (loaded && planksTexture) {
    renderTexturedTopDiamond(ctx, u, v, bw, bh, planksTexture, true);
  } else {
    fillTopInsetDiamond(ctx, u, v, bw, bh, 1.0, "#a37b4b", "#543d20");
  }

  // Hollow interior
  fillTopInsetDiamond(ctx, u, v, bw, bh, 0.76, "#2c2013", "#4a3520");

  const state = getBarrelState(tile);
  if (state.outputItem === "minecraft:clay") {
    if (isImgLoaded(clayTexture)) {
      renderTexturedTopDiamond(ctx, u, v, bw * 0.72, bh * 0.72, clayTexture, true);
    } else {
      fillTopInsetDiamond(ctx, u, v, bw, bh, 0.72, "#9ea4b0", "#6f7582");
    }
  } else if (state.outputItem) {
    fillTopInsetDiamond(ctx, u, v, bw, bh, 0.65, "#787266", "#4d4940");
  } else if (state.solidItem) {
    fillTopInsetDiamond(ctx, u, v, bw, bh, 0.72, "#6b4c35", "#3e2716");
  } else if (state.fluidAmount > 0 && state.fluidType) {
    if (state.fluidType === "water" && isImgLoaded(waterTexture)) {
      renderTexturedTopDiamond(ctx, u, v, bw * 0.72, bh * 0.72, waterTexture, true);
    } else {
      const fill = state.fluidType === "water" ? "#2f6fe4" : "#5c4d28";
      fillTopInsetDiamond(ctx, u, v, bw, bh, 0.72, fill);
    }
  }
}

/**
 * Renders an Ex Nihilo Wooden Crucible:
 * - 4 stubby corner legs + tapered wooden basin
 * - Recessed interior showing foliage solids and melted water level
 */
export function renderCrucible(
  ctx: CanvasContext2DLike,
  u: number,
  v: number,
  halfW: number,
  halfH: number,
  elevH: number,
  tile: Tile,
  planksTexture: HTMLImageElement | null,
  waterTexture: HTMLImageElement | null
): void {
  const loaded = isImgLoaded(planksTexture);
  const basinH = elevH * 0.72;
  const legH = elevH - basinH;

  drawFourLegs(ctx, u, v, halfW * 0.92, halfH * 0.92, basinH, legH, 0.2, planksTexture);

  renderWallSideFace(ctx, u, v, halfW * 0.92, halfH * 0.92, basinH, "left", planksTexture, loaded, OAK_WOOD_FALLBACK);
  renderWallSideFace(ctx, u, v, halfW * 0.92, halfH * 0.92, basinH, "right", planksTexture, loaded, OAK_WOOD_FALLBACK);

  if (loaded && planksTexture) {
    renderTexturedTopDiamond(ctx, u, v, halfW * 0.92, halfH * 0.92, planksTexture, true);
  } else {
    fillTopInsetDiamond(ctx, u, v, halfW * 0.92, halfH * 0.92, 1.0, "#a37b4b", "#543d20");
  }

  fillTopInsetDiamond(ctx, u, v, halfW * 0.92, halfH * 0.92, 0.74, "#2c2013", "#4a3520");

  const state = getCrucibleState(tile);
  if (state.fluidAmount > 0) {
    const fluidScale = 0.4 + 0.32 * (state.fluidAmount / FLUID_CAPACITY_MB);
    if (isImgLoaded(waterTexture)) {
      renderTexturedTopDiamond(ctx, u, v, halfW * 0.92 * fluidScale, halfH * 0.92 * fluidScale, waterTexture, true);
    } else {
      fillTopInsetDiamond(ctx, u, v, halfW * 0.92, halfH * 0.92, fluidScale, "#2f6fe4");
    }
  }
  if (state.solidAmount > 0) {
    const solidScale = 0.35 + 0.3 * Math.min(1, state.solidAmount / FLUID_CAPACITY_MB);
    fillTopInsetDiamond(ctx, u, v - 1, halfW * 0.92, halfH * 0.92, solidScale, "#4f8a36", "#2f571e");
  }
}

/**
 * Renders a Minecraft Furnace:
 * - Stone top + stone side face + front face (unlit or lit with fire glow)
 */
export function renderFurnace(
  ctx: CanvasContext2DLike,
  u: number,
  v: number,
  halfW: number,
  halfH: number,
  elevH: number,
  tile: Tile,
  topTex: HTMLImageElement | null,
  sideTex: HTMLImageElement | null,
  frontOffTex: HTMLImageElement | null,
  frontOnTex: HTMLImageElement | null
): void {
  const isLit = getFurnaceState(tile).fuelTimeRemaining > 0;
  const frontTex = isLit && isImgLoaded(frontOnTex) ? frontOnTex : frontOffTex;

  renderWallSideFace(ctx, u, v, halfW, halfH, elevH, "left", sideTex, isImgLoaded(sideTex), STONE_FALLBACK);
  renderWallSideFace(ctx, u, v, halfW, halfH, elevH, "right", frontTex, isImgLoaded(frontTex), STONE_FALLBACK);

  if (!isImgLoaded(frontTex)) {
    // Fallback furnace firebox glow on right face when unlit/lit
    ctx.fillStyle = isLit ? "#ff7722" : "#222222";
    ctx.beginPath();
    ctx.moveTo(u + halfW * 0.25, v + halfH * 0.75 + elevH * 0.45);
    ctx.lineTo(u + halfW * 0.75, v + halfH * 0.25 + elevH * 0.45);
    ctx.lineTo(u + halfW * 0.75, v + halfH * 0.25 + elevH * 0.85);
    ctx.lineTo(u + halfW * 0.25, v + halfH * 0.75 + elevH * 0.85);
    ctx.closePath();
    ctx.fill();
  }

  if (isImgLoaded(topTex)) {
    renderTexturedTopDiamond(ctx, u, v, halfW, halfH, topTex, true);
  } else {
    fillTopInsetDiamond(ctx, u, v, halfW, halfH, 1.0, "#8c8c8c", "#3b3b3b");
  }
}
