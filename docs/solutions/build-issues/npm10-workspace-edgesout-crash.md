---
title: npm 10 crashes resolving the workspace once Vitest 4.1 is in it
module: workspace
date: 2026-11-13
problem_type: build_error
component: tooling
severity: high
tags: [npm, workspaces, vitest, install-scripts, ci]
symptoms:
  - "npm install fails with: Cannot read properties of null (reading 'edgesOut')"
  - "the failure persists after deleting node_modules and package-lock.json"
root_cause: npm 10.9 arborist bug resolving Vitest 4.1's optional peer graph inside npm workspaces
resolution_type: tooling_upgrade
---

# npm 10 crashes resolving the workspace once Vitest 4.1 is in it

## Symptom

`npm install` (npm 10.9.x, the one bundled with Node 22) dies with `Cannot read properties of null (reading 'edgesOut')`. It still fails after a clean slate, and even with the Worker's dependencies emptied.

## Why Vitest 4.1 at all

`@cloudflare/vitest-pool-workers` (real D1 in Miniflare for Worker tests) has a peer range of `vitest ^4.1`. Vitest 5 installs fine on npm 10, but the pool cannot use it. One Vitest for both packages keeps the workspace on one runner, so both are pinned to `~4.1.0`.

## What failed

- Deleting `node_modules` and the lockfile: same crash.
- Removing the Worker's devDependencies: same crash. Vitest 4.1 in `app` alone triggers it.

## Fix

Use npm 11. The root `package.json` declares `"packageManager": "npm@11.21.2"` and `engines.npm >= 11`, and CI runs `npm install -g npm@11.21.2` before `npm ci`.

npm 11 blocks dependency install scripts unless they are approved. `esbuild` and `workerd` need theirs (they download platform binaries), so the root `package.json` approves them **by name**: `"allowScripts": { "esbuild": true, "workerd": true }`. `npm install-scripts approve` writes version-pinned keys, which go stale on the next bump. Check with `npm install-scripts ls`.

## Prevention

- A fresh sandbox: run `npm install -g npm@11.21.2` before `npm install`.
- A new dependency with an install script: approve it by name in `allowScripts`, and say why in the PR.
