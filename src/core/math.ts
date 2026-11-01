/**
 * Deterministic PRNG and 3D coordinate utilities.
 */

/**
 * Mulberry32 32-bit deterministic PRNG.
 */
export class DeterministicRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed | 0;
  }

  /**
   * Returns a pseudo-random float in [0, 1).
   */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns a pseudo-random integer in [min, max] inclusive.
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}
