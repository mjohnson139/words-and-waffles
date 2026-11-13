#!/usr/bin/env node
// Fails if the gzipped web JS in app/dist exceeds the budget (brief: ~500 KB
// including the word list). Run after `npx expo export -p web`.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const BUDGET = Number(process.env.BUNDLE_BUDGET_KB || 500) * 1024;
const root = new URL('../app/dist/', import.meta.url).pathname;

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const files = walk(root).filter((p) => /\.(js|css|html)$/.test(p));
let total = 0;
for (const f of files) total += gzipSync(readFileSync(f)).length;
const kb = (n) => (n / 1024).toFixed(1) + ' KB';
console.log(`web bundle (gzip, js+css+html): ${kb(total)} of ${kb(BUDGET)}`);
if (total > BUDGET) {
  console.error('Over budget. Every dependency must justify itself (CONTRIBUTING.md).');
  process.exit(1);
}
