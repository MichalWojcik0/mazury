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
