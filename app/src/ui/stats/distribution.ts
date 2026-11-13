/** Bar width in percent for a distribution row (prototype line 540: min 8%). */
export const barPercent = (value: number, max: number): number => Math.max(8, (100 * value) / Math.max(1, max));
