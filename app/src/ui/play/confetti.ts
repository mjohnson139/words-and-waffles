/** Confetti physics from prototype party() (lines 463-484), sampled for Animated interpolation. */
export type Kind = 'berry' | 'butter' | 'syrup' | 'waffle' | 'straw';
export const KINDS: readonly Kind[] = ['berry', 'butter', 'syrup', 'waffle', 'straw'];

/** 4.2 s at 60 fps. */
export const FRAMES = 252;
export const SEGMENTS = 8;

export interface Particle {
  kind: Kind;
  r: number;
  /** Position and rotation (degrees) at SEGMENTS + 1 evenly spaced moments. */
  x: number[];
  y: number[];
  a: number[];
}

export function makeParticles(count: number, w: number, h: number, rand: () => number): Particle[] {
  return Array.from({ length: count }, () => {
    const kind = KINDS[Math.floor(rand() * KINDS.length)];
    const x0 = rand() * w;
    const y0 = -rand() * h * 0.5 - 20;
    const vx = (rand() - 0.5) * 2;
    const vy = 2 + rand() * 3;
    const r = 6 + rand() * 6;
    const a0 = rand() * 6;
    const va = (rand() - 0.5) * 0.2;
    const p: Particle = { kind, r, x: [], y: [], a: [] };
    for (let i = 0; i <= SEGMENTS; i++) {
      const n = Math.round((i * FRAMES) / SEGMENTS);
      p.x.push(x0 + vx * n);
      p.y.push(y0 + vy * n + (0.05 * n * (n - 1)) / 2); // vy grows by .05 each frame
      p.a.push(((a0 + va * n) * 180) / Math.PI);
    }
    return p;
  });
}
