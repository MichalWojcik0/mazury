import type { CanvasContext2DLike } from "./command-types.ts";

export function renderTexturedTopDiamond(
  ctx: CanvasContext2DLike,
  u: number,
  v: number,
  halfW: number,
  halfH: number,
  textureImage: HTMLImageElement | null = null,
  wallImageLoaded: boolean = false
): void {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(u, v - halfH);
  ctx.lineTo(u + halfW, v);
  ctx.lineTo(u, v + halfH);
  ctx.lineTo(u - halfW, v);
  ctx.closePath();

  const canClip =
    typeof ctx.clip === "function" &&
    typeof ctx.transform === "function" &&
    textureImage &&
    (textureImage.complete || wallImageLoaded);

  if (canClip && ctx.clip && ctx.transform && ctx.drawImage && textureImage) {
    ctx.clip();

    const imgW = textureImage.naturalWidth || 16;
    const imgH = textureImage.naturalHeight || 16;

    ctx.transform(halfW / imgW, halfH / imgW, -halfW / imgH, halfH / imgH, u, v - halfH);
    ctx.drawImage(textureImage, 0, 0, imgW, imgH);

    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(u, v - halfH);
    ctx.lineTo(u + halfW, v);
    ctx.lineTo(u, v + halfH);
    ctx.lineTo(u - halfW, v);
    ctx.closePath();

    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.fill();
    ctx.strokeStyle = "#25272c";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
    return;
  }

  ctx.fillStyle = "#3a3c42";
  ctx.fill();
  ctx.strokeStyle = "#25272c";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.beginPath();
  const insetW = halfW * 0.7;
  const insetH = halfH * 0.7;
  ctx.moveTo(u, v - insetH);
  ctx.lineTo(u + insetW, v);
  ctx.lineTo(u, v + insetH);
  ctx.lineTo(u - insetW, v);
  ctx.closePath();
  ctx.strokeStyle = "#474a54";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
}

export interface SideFaceFallbackStyle {
  leftFill: string;
  rightFill: string;
  stroke: string;
  drawPanelSeam?: boolean;
}

const DEFAULT_WALL_SIDE_STYLE: SideFaceFallbackStyle = {
  leftFill: "#33363e",
  rightFill: "#3e424c",
  stroke: "#474a54",
  drawPanelSeam: true,
};

export function renderWallSideFace(
  ctx: CanvasContext2DLike,
  u: number,
  v: number,
  halfW: number,
  halfH: number,
  elevH: number,
  side: "left" | "right",
  wallImage: HTMLImageElement | null = null,
  wallImageLoaded: boolean = false,
  fallbackStyle: SideFaceFallbackStyle = DEFAULT_WALL_SIDE_STYLE
): void {
  ctx.save();
  ctx.beginPath();

  if (side === "left") {
    ctx.moveTo(u - halfW, v);
    ctx.lineTo(u, v + halfH);
    ctx.lineTo(u, v + halfH + elevH);
    ctx.lineTo(u - halfW, v + elevH);
    ctx.closePath();
  } else {
    ctx.moveTo(u, v + halfH);
    ctx.lineTo(u + halfW, v);
    ctx.lineTo(u + halfW, v + elevH);
    ctx.lineTo(u, v + halfH + elevH);
    ctx.closePath();
  }

  const imageReady = Boolean(
    wallImage && (wallImageLoaded || (wallImage.complete && wallImage.naturalWidth > 0))
  );
  const canClip =
    typeof ctx.clip === "function" &&
    typeof ctx.transform === "function" &&
    imageReady;

  if (canClip && ctx.clip && ctx.transform && ctx.drawImage && wallImage) {
    ctx.clip();

    const imgW = wallImage.naturalWidth || 16;
    const imgH = wallImage.naturalHeight || 16;

    if (ctx.imageSmoothingEnabled !== undefined) {
      ctx.imageSmoothingEnabled = false;
    }

    if (side === "left") {
      ctx.transform(halfW / imgW, halfH / imgW, 0, elevH / imgH, u - halfW, v);
    } else {
      ctx.transform(halfW / imgW, -halfH / imgW, 0, elevH / imgH, u, v + halfH);
    }

    ctx.drawImage(wallImage, 0, 0, imgW, imgH);

    ctx.restore();
    ctx.save();
    ctx.beginPath();
    if (side === "left") {
      ctx.moveTo(u - halfW, v);
      ctx.lineTo(u, v + halfH);
      ctx.lineTo(u, v + halfH + elevH);
      ctx.lineTo(u - halfW, v + elevH);
      ctx.closePath();
      ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
    } else {
      ctx.moveTo(u, v + halfH);
      ctx.lineTo(u + halfW, v);
      ctx.lineTo(u + halfW, v + elevH);
      ctx.lineTo(u, v + halfH + elevH);
      ctx.closePath();
      ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
    }
    ctx.fill();
    ctx.strokeStyle = "#25272c";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (side === "left") {
    ctx.fillStyle = fallbackStyle.leftFill;
    ctx.fill();
    ctx.strokeStyle = fallbackStyle.stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
    if (fallbackStyle.drawPanelSeam) {
      ctx.beginPath();
      ctx.moveTo(u - halfW / 2, v + halfH / 2);
      ctx.lineTo(u - halfW / 2, v + halfH / 2 + elevH);
      ctx.strokeStyle = "#22242a";
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = fallbackStyle.rightFill;
    ctx.fill();
    ctx.strokeStyle = fallbackStyle.stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
    if (fallbackStyle.drawPanelSeam) {
      ctx.beginPath();
      ctx.moveTo(u + halfW / 2, v + halfH / 2);
      ctx.lineTo(u + halfW / 2, v + halfH / 2 + elevH);
      ctx.strokeStyle = "#22242a";
      ctx.stroke();
    }
  }

  ctx.restore();
}
