export interface ScreenPoint {
  u: number;
  v: number;
}

export interface CameraConfig {
  tileWidth: number;
  tileHeight: number;
  elevationHeight: number;
  offsetX: number;
  offsetY: number;
  zoom: number;
}

export const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  tileWidth: 64,
  tileHeight: 32,
  elevationHeight: 16,
  offsetX: 0,
  offsetY: 0,
  zoom: 1.0,
};

export function worldToScreen(
  x: number,
  y: number,
  z: number,
  camera: CameraConfig = DEFAULT_CAMERA_CONFIG
): ScreenPoint {
  const { tileWidth, tileHeight, elevationHeight, offsetX, offsetY, zoom } = camera;
  const halfW = tileWidth / 2;
  const halfH = tileHeight / 2;

  const isoX = (x - y) * halfW;
  const isoY = (x + y) * halfH - z * elevationHeight;

  return {
    u: isoX * zoom + offsetX,
    v: isoY * zoom + offsetY,
  };
}

export function screenToWorld(
  u: number,
  v: number,
  z: number,
  camera: CameraConfig = DEFAULT_CAMERA_CONFIG
): { x: number; y: number } {
  const { tileWidth, tileHeight, elevationHeight, offsetX, offsetY, zoom } = camera;
  const halfW = tileWidth / 2;
  const halfH = tileHeight / 2;

  const unscaledIsoX = (u - offsetX) / zoom;
  const unscaledIsoY = (v - offsetY) / zoom + z * elevationHeight;

  const term1 = unscaledIsoX / halfW;
  const term2 = unscaledIsoY / halfH;

  const x = (term1 + term2) / 2;
  const y = (term2 - term1) / 2;

  return { x, y };
}

export function computeDepthKey(x: number, y: number, z: number, k: number = 1000): number {
  return (x + y) * k + z;
}

/**
 * Hit-tests a screen coordinate against the visible NORTH (y = -1, left face) and
 * WEST (x = -1, right face) boundary wall faces at the given world elevation `wallZ`.
 * Returns the matched `{ x, y }` boundary coordinate, or `null` if no wall face was hit.
 */
export function hitTestBoundaryWallFace(
  u: number,
  v: number,
  wallZ: number,
  roomWidth: number,
  roomHeight: number,
  camera: CameraConfig = DEFAULT_CAMERA_CONFIG
): { x: number; y: number } | null {
  const halfW = (camera.tileWidth / 2) * camera.zoom;
  const halfH = (camera.tileHeight / 2) * camera.zoom;
  const elevH = camera.elevationHeight * camera.zoom;

  // NORTH wall: y = -1, x = 0..roomWidth-1, rendered as "left" side face
  for (let x = 0; x < roomWidth; x++) {
    const anchor = worldToScreen(x, -1, wallZ, camera);
    const s = (u - (anchor.u - halfW)) / halfW;
    if (s >= 0 && s <= 1) {
      const t = (v - anchor.v - s * halfH) / elevH;
      if (t >= 0 && t <= 1) {
        return { x, y: -1 };
      }
    }
  }

  // WEST wall: x = -1, y = 0..roomHeight-1, rendered as "right" side face
  for (let y = 0; y < roomHeight; y++) {
    const anchor = worldToScreen(-1, y, wallZ, camera);
    const s = (u - anchor.u) / halfW;
    if (s >= 0 && s <= 1) {
      const t = (v - (anchor.v + halfH) + s * halfH) / elevH;
      if (t >= 0 && t <= 1) {
        return { x: -1, y };
      }
    }
  }

  return null;
}

/**
 * Returns true if screen point (u, v) lies over any layer footprint or visible
 * boundary wall face of the room's play area.
 */
export function isPointInPlayArea(
  u: number,
  v: number,
  roomWidth: number,
  roomHeight: number,
  roomDepth: number,
  hasFaces: boolean,
  camera: CameraConfig = DEFAULT_CAMERA_CONFIG
): boolean {
  for (let z = 0; z <= roomDepth; z++) {
    const w = screenToWorld(u, v, z, camera);
    if (w.x >= -0.5 && w.x <= roomWidth - 0.5 && w.y >= -0.5 && w.y <= roomHeight - 0.5) {
      return true;
    }
    if (hasFaces && z >= 1 && z <= roomDepth) {
      if (hitTestBoundaryWallFace(u, v, z, roomWidth, roomHeight, camera)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Clamps camera pan offsets so the room play area cannot be panned out of camera view.
 */
export function clampCameraPan(
  panX: number,
  panY: number,
  roomWidth: number,
  roomHeight: number,
  roomDepth: number,
  viewportW: number,
  viewportH: number,
  camera: CameraConfig = DEFAULT_CAMERA_CONFIG
): { panX: number; panY: number } {
  const roomSpanW = (roomWidth + roomHeight) * (camera.tileWidth / 2) * camera.zoom;
  const roomSpanH =
    ((roomWidth + roomHeight) * (camera.tileHeight / 2) + roomDepth * camera.elevationHeight) *
    camera.zoom;

  const maxPanX = Math.max(40, Math.min(viewportW * 0.35, roomSpanW * 0.65));
  const maxPanY = Math.max(40, Math.min(viewportH * 0.35, roomSpanH * 0.65));

  return {
    panX: Math.max(-maxPanX, Math.min(maxPanX, panX)),
    panY: Math.max(-maxPanY, Math.min(maxPanY, panY)),
  };
}
