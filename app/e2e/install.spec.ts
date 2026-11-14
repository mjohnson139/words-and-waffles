import { expect, openApp, test } from './fixtures';

interface Icon {
  src: string;
  sizes: string;
  type: string;
  purpose: string;
}

test('manifest has the install fields and no external URLs', async ({ request }) => {
  const res = await request.get('/manifest.webmanifest');
  expect(res.ok()).toBe(true);
  expect(res.headers()['content-type']).toContain('application/manifest+json');
  const m = await res.json();
  expect(m).toMatchObject({
    name: 'Words & Waffles',
    short_name: 'Waffles',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#e6edf8',
    theme_color: '#e6edf8',
  });
  expect(typeof m.description).toBe('string');
  expect(m.id).toBeUndefined();
  expect((m.icons as Icon[]).map((i) => `${i.sizes} ${i.purpose}`)).toEqual(['192x192 any', '512x512 any', '512x512 maskable']);
  expect(JSON.stringify(m)).not.toMatch(/https?:/);
});

test('every manifest icon is a PNG at its stated size', async ({ page, request }) => {
  const icons = ((await (await request.get('/manifest.webmanifest')).json()).icons as Icon[]).concat({
    src: '/icons/apple-touch-icon.png',
    sizes: '180x180',
    type: 'image/png',
    purpose: 'any',
  });
  await page.goto('/');
  for (const icon of icons) {
    const res = await request.get(icon.src);
    expect(res.ok(), icon.src).toBe(true);
    expect(res.headers()['content-type'], icon.src).toBe('image/png');
    const size = await page.evaluate(
      (src) =>
        new Promise<string>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(`${img.naturalWidth}x${img.naturalHeight}`);
          img.onerror = () => reject(new Error(`cannot decode ${src}`));
          img.src = src;
        }),
      icon.src,
    );
    expect(size, icon.src).toBe(icon.sizes);
  }
});

test('index.html carries the install head tags once', async ({ request }) => {
  const html = await (await request.get('/')).text();
  expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest"');
  expect(html).toContain('<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png"');
  expect(html).toContain('name="apple-mobile-web-app-title" content="Waffles"');
  expect(html).toContain('name="apple-mobile-web-app-capable" content="yes"');
  expect(html).toContain('name="mobile-web-app-capable" content="yes"');
  expect(html).toContain('name="apple-mobile-web-app-status-bar-style" content="default"');
  expect(html).toContain('<link rel="icon" href="/favicon.ico"');
  expect(html.match(/<script /g)).toHaveLength(1);
  const themes = html.match(/<meta name="theme-color"[^>]*>/g) ?? [];
  expect(themes).toHaveLength(2);
  expect(themes[0]).toContain('#171b30');
  expect(themes[0]).toContain('prefers-color-scheme: dark');
  expect(themes[1]).toContain('#e6edf8');
  expect(themes[1]).not.toContain('media');
});

test('Chromium reads the manifest without errors', async ({ page }) => {
  await openApp(page);
  const cdp = await page.context().newCDPSession(page);
  const { url, errors } = await cdp.send('Page.getAppManifest');
  expect(url).toMatch(/\/manifest\.webmanifest$/);
  expect(errors).toEqual([]);
  const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
  expect(installabilityErrors).toEqual([]);
});
