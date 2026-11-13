---
title: A service worker on Cloudflare Pages can cache index.html as a JavaScript bundle
module: web
date: 2026-11-13
problem_type: integration_issue
component: app/public/sw.js
severity: high
tags: [service-worker, offline, cloudflare-pages, expo-web, cache]
---

# A service worker on Cloudflare Pages can cache index.html as a JavaScript bundle

## Context

The web app is offline-first through a hand-written service worker (`app/public/sw.js`; `expo export -p web` copies `app/public/` to the root of `app/dist`). It is served by Cloudflare Pages. Three Pages and export behaviors shape the worker, and none is visible in a local test unless the test server imitates them.

## What goes wrong, and the guard for each

1. **Unknown paths answer `index.html` with 200.** With no `404.html` in the output, Pages behaves as an SPA. After a deploy removes an old hashed bundle, a stale tab's request for it gets HTML with status 200. A naive cache-first worker stores that HTML under the `.js` URL and every later load breaks. **Guard:** for non-navigation requests, cache only `ok`, non-redirected responses whose content type is not `text/html`. The e2e server (`app/e2e/serve.mjs`) falls back to `index.html` the same way, and `app/e2e/offline.spec.ts` asserts that a missing bundle is not cached.
2. **`/index.html` redirects to `/`.** A redirected response cannot answer a navigation. **Guard:** precache and serve `/` only, and never cache a redirected response.
3. **The font is not in the HTML.** Expo's web export references the display font only from inside the JS bundle (`/assets/_node_modules/@expo-google-fonts/bagel-fat-one/400Regular/BagelFatOne_400Regular.<hash>.ttf`). The first visit loads it before the worker controls the page, so precaching only what `index.html` lists leaves the first offline visit without the font. `App.tsx` waits for the font, which shows as a blank screen. **Guard:** after caching `/`, fetch the bundles it references and precache every `/assets/...` path found in them.

Hashed bundles never collide, so the cache grows with every deploy unless it is pruned: after a fresh `/` is cached, entries that the new HTML and bundles no longer reference are deleted, but only when every referenced bundle was read.

## When it applies

Any change to `sw.js`, the hosting (another host may 404 properly, but keep the guards), or how Expo emits assets. Verify with `npm run e2e -w app` (`offline.spec.ts` goes offline after one first visit with no extra reload).
