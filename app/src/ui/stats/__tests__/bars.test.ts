import { describe, expect, it } from 'vitest';

import { barPercent } from '../bars';

describe('barPercent', () => {
  it('scales to the largest value', () => {
    expect(barPercent(5, 5)).toBe(100);
    expect(barPercent(1, 2)).toBe(50);
  });
  it('never drops below 8 percent, even for zero or an empty set', () => {
    expect(barPercent(0, 5)).toBe(8);
    expect(barPercent(0, 0)).toBe(8);
  });
});
