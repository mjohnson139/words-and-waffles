import { defineConfig } from 'vitest/config';

/*
 * Unit tests run in node and cannot render a component. That is deliberate:
 * anything that could be wrong (scoring, dates, streaks, stats, the word
 * contract, merge rules, ping flags) lives in a pure module under src/game,
 * src/store or src/api and is tested here. Screens are checked by the
 * Playwright smoke against the web export (e2e/).
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
    globals: true,
  },
});
