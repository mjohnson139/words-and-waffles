/* Words & Waffles service worker: offline after the first visit.
 *
 * Strategy
 *  - install: precache '/' (not '/index.html': Cloudflare Pages redirects it to
 *    '/', and a redirected response cannot answer a navigation), then the
 *    scripts and styles that HTML references, then every same-origin asset path
 *    found inside those files (the display font, images). The first page load
 *    happens before this worker controls the page, so those requests would
 *    otherwise never be cached and the very first offline visit would lack them.
 *    Asset precaching is best effort: a miss is cached on the next controlled load.
 *  - Only real files are cached: responses must be ok and not redirected, and
 *    non-navigation responses must not be HTML (Cloudflare Pages answers unknown
 *    paths with index.html and status 200, which must never sit under an asset URL).
 *  - Whenever a fresh '/' is cached (install or navigation), cached
 *    /_expo/static/ and /assets/ entries that the new HTML and bundles no longer
 *    reference are deleted (only if every referenced file could be read).
 *  - activate: delete caches from older versions, claim open pages.
 *  - fetch: same-origin GET only. Cross-origin (word and ping endpoints) and
 *    anything under /v1/ go straight to the network, untouched.
 *      navigations: network first (3 s timeout), fall back to the cached '/'.
 *        If the timeout wins, the fetch carries on and its result is cached
 *        when it arrives (kept alive with event.waitUntil).
 *      static assets (/_expo/static, fonts, images, favicon): cache first, else
 *      network and store.
 * Bump VERSION to drop old caches.
 */
const VERSION = 'v1';
const CACHE = `waffles-${VERSION}`;
const NAV_TIMEOUT_MS = 3000;
const STATIC = /^\/(_expo\/static\/|assets\/|favicon\.ico)|\.(?:js|css|png|jpe?g|svg|webp|ico|ttf|otf|woff2?)$/;
const MANAGED = /^\/(_expo\/static|assets)\//;
const ASSET_REF = /\/assets\/[^"'\s\\)]+\.(?:ttf|otf|woff2?|png|jpe?g|svg|webp)/g;

function cacheable(res, isNavigation) {
  if (!res.ok || res.redirected) return false;
  if (isNavigation) return true;
  return !(res.headers.get('content-type') || '').toLowerCase().startsWith('text/html');
}

async function fetchAndCache(cache, path) {
  try {
    const res = await fetch(path);
    if (!cacheable(res, false)) return null;
    await cache.put(path, res.clone());
    return res;
  } catch {
    return null;
  }
}

/** Cache everything the fresh HTML needs, then drop what it no longer references. */
async function refresh(cache, html) {
  const paths = [...html.matchAll(/(?:src|href)="(\/_expo\/static\/[^"]+)"/g)].map((m) => m[1]);
  const keep = new Set(paths.map((p) => new URL(p, self.location.origin).pathname));
  let complete = true;
  const assets = new Set();
  for (const path of paths) {
    const res = (await cache.match(path)) || (await fetchAndCache(cache, path));
    if (!res) {
      complete = false;
      continue;
    }
    if (/\.(?:js|css)$/.test(new URL(path, self.location.origin).pathname)) {
      for (const m of (await res.clone().text()).matchAll(ASSET_REF)) assets.add(m[0]);
    }
  }
  for (const path of assets) {
    keep.add(path);
    if (!(await cache.match(path))) await fetchAndCache(cache, path);
  }
  if (!complete) return;
  for (const req of await cache.keys()) {
    const { pathname } = new URL(req.url);
    if (MANAGED.test(pathname) && !keep.has(pathname)) await cache.delete(req);
  }
}

/** Store a fresh '/' and everything it needs. Best effort beyond '/' itself. */
async function store(cache, res) {
  await cache.put('/', res.clone());
  try {
    await refresh(cache, await res.text());
  } catch {
    // Assets get cached on the next controlled load.
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const res = await fetch('/');
      if (!cacheable(res, true)) throw new Error(`cannot precache '/': ${res.status}`);
      await store(cache, res);
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

async function navigate(event) {
  const cache = await caches.open(CACHE);
  const network = fetch(event.request);
  // Runs whenever the network answers, even after the timeout below has won.
  event.waitUntil(
    network
      .then((res) => (cacheable(res, true) ? store(cache, res.clone()) : undefined))
      .catch(() => {}),
  );
  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), NAV_TIMEOUT_MS));
  try {
    const first = await Promise.race([network, timeout]);
    if (first) return first;
  } catch {
    // Network failed: fall through to the cache.
  }
  const cached = await cache.match('/');
  return cached || network;
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (cacheable(res, false)) await cache.put(request, res.clone());
  return res;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/v1/')) return;
  if (request.mode === 'navigate') {
    event.respondWith(navigate(event));
  } else if (STATIC.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});
