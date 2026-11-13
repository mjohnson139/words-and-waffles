import { FRAMES, KINDS, SEGMENTS, makeParticles } from '../confetti';

const seeded = () => {
  let s = 7;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
};

describe('makeParticles', () => {
  const ps = makeParticles(40, 390, 844, seeded());
  it('makes the requested count with sampled paths', () => {
    expect(ps).toHaveLength(40);
    for (const p of ps) {
      expect(p.x).toHaveLength(SEGMENTS + 1);
      expect(p.y).toHaveLength(SEGMENTS + 1);
      expect(p.a).toHaveLength(SEGMENTS + 1);
      expect(KINDS).toContain(p.kind);
      expect(p.r).toBeGreaterThanOrEqual(6);
      expect(p.r).toBeLessThanOrEqual(12);
    }
  });
  it('starts above the screen and always falls', () => {
    for (const p of ps) {
      expect(p.y[0]).toBeLessThan(0);
      for (let i = 1; i < p.y.length; i++) expect(p.y[i]).toBeGreaterThan(p.y[i - 1]);
    }
  });
  it('matches the frame physics at the end', () => {
    const p = makeParticles(1, 100, 100, () => 0.5)[0];
    // vy=3.5, y0=-45: y = y0 + vy*n + .05*n*(n-1)/2
    expect(p.y[SEGMENTS]).toBeCloseTo(-45 + 3.5 * FRAMES + (0.05 * FRAMES * (FRAMES - 1)) / 2, 5);
  });
});
