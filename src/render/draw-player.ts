import type { Player } from "../core/types.ts";
import type { CanvasContext2DLike } from "./command-types.ts";

/**
 * Renders the player as a stylized Minecraft Steve character anchored at feet (u, v).
 * Visibly crouches when sneaking/squatting and displays the squat progress bar.
 */
export function renderMinecraftSteve(
  ctx: CanvasContext2DLike,
  u: number,
  v: number,
  elevationHeight: number,
  zoom: number,
  player?: Player
): void {
  const isSneaking = Boolean(player?.isSneaking);
  const sneakTimer = player?.sneakTimer ?? 0;

  // Minecraft Steve proportions: 32 units tall (12 legs, 12 torso, 8 head)
  const basePlayerH = 2 * elevationHeight * zoom;
  const totalH = isSneaking ? basePlayerH * 0.78 : basePlayerH;
  const unit = basePlayerH / 32;

  const legH = isSneaking ? 8 * unit : 12 * unit;
  const torsoH = isSneaking ? 9.5 * unit : 12 * unit;
  const headSize = 8 * unit;
  const torsoW = 8 * unit;
  const armW = 3.2 * unit;
  const legW = 3.8 * unit;
  const legGap = 0.4 * unit;

  const feetY = v;
  const hipY = feetY - legH;
  const shoulderY = hipY - torsoH;
  const headTopY = shoulderY - headSize;

  // Ground shadow beneath Steve's feet
  ctx.beginPath();
  if (ctx.ellipse) {
    ctx.ellipse(u, feetY, 7.5 * unit, 3.5 * unit, 0, 0, Math.PI * 2);
  } else if (ctx.arc) {
    ctx.arc(u, feetY, 7.5 * unit, 0, Math.PI * 2);
  }
  ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
  ctx.fill();

  const outlineWidth = Math.max(0.5, 0.75 * zoom);
  ctx.lineWidth = outlineWidth;

  // 1. Legs (Steve's indigo jeans + grey shoes)
  const leftLegX = u - legW - legGap / 2;
  const rightLegX = u + legGap / 2;
  const shoeH = 2.5 * unit;

  // Left leg
  ctx.fillStyle = "#3b4b9b";
  ctx.fillRect(leftLegX, hipY, legW, legH - shoeH);
  ctx.fillStyle = "#4d4d4d";
  ctx.fillRect(leftLegX, feetY - shoeH, legW, shoeH);
  ctx.strokeStyle = "#1f2654";
  ctx.strokeRect(leftLegX, hipY, legW, legH);

  // Right leg
  ctx.fillStyle = "#324085";
  ctx.fillRect(rightLegX, hipY, legW, legH - shoeH);
  ctx.fillStyle = "#3f3f3f";
  ctx.fillRect(rightLegX, feetY - shoeH, legW, shoeH);
  ctx.strokeStyle = "#1f2654";
  ctx.strokeRect(rightLegX, hipY, legW, legH);

  // 2. Torso (Steve's iconic cyan/teal shirt + skin collar notch)
  const torsoX = u - torsoW / 2;
  ctx.fillStyle = "#00a8a8";
  ctx.fillRect(torsoX, shoulderY, torsoW, torsoH);
  // Subtle right-side torso shading for 2.5D depth
  ctx.fillStyle = "#008f8f";
  ctx.fillRect(u, shoulderY, torsoW / 2, torsoH);
  // V-neck collar skin notch
  ctx.fillStyle = "#c69676";
  ctx.fillRect(u - 1.5 * unit, shoulderY, 3 * unit, 1.5 * unit);
  ctx.strokeStyle = "#006666";
  ctx.strokeRect(torsoX, shoulderY, torsoW, torsoH);

  // 3. Arms (cyan short sleeves + skin forearms)
  const sleeveH = 3.8 * unit;
  const armH = isSneaking ? torsoH + 1.5 * unit : torsoH;
  const leftArmX = torsoX - armW;
  const rightArmX = torsoX + torsoW;

  // Left arm
  ctx.fillStyle = "#00a8a8";
  ctx.fillRect(leftArmX, shoulderY, armW, sleeveH);
  ctx.fillStyle = "#c69676";
  ctx.fillRect(leftArmX, shoulderY + sleeveH, armW, armH - sleeveH);
  ctx.strokeStyle = "#5c4030";
  ctx.strokeRect(leftArmX, shoulderY, armW, armH);

  // Right arm
  ctx.fillStyle = "#008f8f";
  ctx.fillRect(rightArmX, shoulderY, armW, sleeveH);
  ctx.fillStyle = "#b58565";
  ctx.fillRect(rightArmX, shoulderY + sleeveH, armW, armH - sleeveH);
  ctx.strokeStyle = "#5c4030";
  ctx.strokeRect(rightArmX, shoulderY, armW, armH);

  // 4. Head (skin base, dark brown hair + sideburns, white/indigo eyes, nose, goatee/mouth)
  const headX = u - headSize / 2;
  ctx.fillStyle = "#c69676";
  ctx.fillRect(headX, headTopY, headSize, headSize);

  // Hair cap
  ctx.fillStyle = "#3b2516";
  ctx.fillRect(headX, headTopY, headSize, 2.2 * unit);
  // Sideburns
  ctx.fillRect(headX, headTopY + 2.2 * unit, 1.2 * unit, 1.4 * unit);
  ctx.fillRect(headX + headSize - 1.2 * unit, headTopY + 2.2 * unit, 1.2 * unit, 1.4 * unit);

  // Eyes (white outer + indigo-blue inner pupils, Steve's signature look)
  const eyeY = headTopY + 4 * unit;
  const eyeH = 1.1 * unit;
  // Left eye
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(headX + 1.2 * unit, eyeY, 1.1 * unit, eyeH);
  ctx.fillStyle = "#4b3b9b";
  ctx.fillRect(headX + 2.3 * unit, eyeY, 1.1 * unit, eyeH);
  // Right eye
  ctx.fillStyle = "#4b3b9b";
  ctx.fillRect(headX + 4.6 * unit, eyeY, 1.1 * unit, eyeH);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(headX + 5.7 * unit, eyeY, 1.1 * unit, eyeH);

  // Nose
  ctx.fillStyle = "#a67558";
  ctx.fillRect(u - 1 * unit, headTopY + 5.1 * unit, 2 * unit, 1 * unit);

  // Classic Steve goatee / mouth
  ctx.fillStyle = "#593722";
  ctx.fillRect(u - 2 * unit, headTopY + 6.1 * unit, 4 * unit, 1.5 * unit);
  ctx.fillStyle = "#8c5b40";
  ctx.fillRect(u - 1 * unit, headTopY + 6.1 * unit, 2 * unit, 0.8 * unit);

  // Head outline
  ctx.strokeStyle = "#3b2516";
  ctx.strokeRect(headX, headTopY, headSize, headSize);

  // 5. Squat progress bar (poop timer) while sneaking
  if (isSneaking) {
    const barW = 24 * zoom;
    const barH = 4 * zoom;
    const barX = u - barW / 2;
    const barY = headTopY - 9 * zoom;
    const ratio = Math.min(1, sneakTimer / 100);

    ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = "#98c379";
    ctx.fillRect(barX, barY, barW * ratio, barH);
    ctx.strokeStyle = "#2c313a";
    ctx.lineWidth = 0.75;
    ctx.strokeRect(barX, barY, barW, barH);
  }

  // Name tag
  ctx.fillStyle = isSneaking ? "#98c379" : "#ffffff";
  ctx.fillText(
    isSneaking ? "P1 [Squat]" : "P1",
    u - (isSneaking ? 22 : 6),
    headTopY - (isSneaking ? 13 : 4) * zoom
  );

  // Keep totalH referenced cleanly for height semantics
  void totalH;
}
