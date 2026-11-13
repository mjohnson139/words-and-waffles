/* Words & Waffles service worker: offline after the first visit.
 *
 * Strategy
 *  - install: precache '/' (not '/index.html': Cloudflare Pages redirects it to
 *    '/', and a redirected response cannot answer a navigation), plus the hashed scripts and styles
 *    that index.html references (the first page load happens before this worker
 *    controls the page, so those requests would otherwise never be cached).
 *  - activate: delete caches from older versions, claim open pages.
 *  - fetch: same-origin GET only. Cross-origin (word and ping endpoints) and
 *    anything under /v1/ go straight to the network, untouched.
 *      navigations: network first (3 s timeout), fall back to the cached '/'.
 *      static assets (/_expo/static, fonts, images, favicon): cache first, else
 *      network and store.
 * Bump VERSION to drop old caches.
 */
const VERSION = 'v1';
const CACHE = `waffles-${VERSION}`;
const NAV_TIMEOUT_MS = 3000;
const STATIC = /^\/(_expo\/static\/|assets\/|favicon\.ico)|\.(?:js|css|png|jpe?g|svg|webp|ico|ttf|otf|woff2?)$/;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.add('/');
      try {
        const html = await (await cache.match('/')).text();
        const urls = [...html.matchAll(/(?:src|href)="(\/_expo\/static\/[^"]+)"/g)].map((m) => m[1]);
        await cache.addAll(urls);
      } catch {
        // Best effort: assets get cached on the next controlled load.
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key !== CACHE && key.startsWith('waffles-')) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

async function navigate(request) {
  const cache = await caches.open(CACHE);
  try {
    const fresh = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), NAV_TIMEOUT_MS)),
    ]);
    if (fresh.ok && !fresh.redirected) cache.put('/', fresh.clone());
    return fresh;
  } catch (err) {
    const cached = await cache.match('/');
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/v1/')) return;
  if (request.mode === 'navigate') {
    event.respondWith(navigate(request));
  } else if (STATIC.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});
