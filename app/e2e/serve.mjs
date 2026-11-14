// Tiny static server for the web export (app/dist). No dependencies.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../dist', import.meta.url)));
const port = Number(process.env.E2E_PORT || process.env.PORT || 4173);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
};

async function fileFor(urlPath) {
  const rel = normalize(decodeURIComponent(urlPath)).replace(/^([/\\]|\.\.[/\\])+/, '');
  const full = join(root, rel);
  if (!full.startsWith(root)) return null;
  try {
    const s = await stat(full);
    if (s.isFile()) return full;
    if (s.isDirectory()) return fileFor(join(rel, 'index.html'));
  } catch {
    // fall through
  }
  return null;
}

createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url ?? '/', 'http://localhost');
    // Like Cloudflare Pages: any unknown path gets index.html with status 200.
    const file = (await fileFor(pathname)) ?? (await fileFor('/index.html'));
    if (!file) {
      res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found');
      return;
    }
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(500).end('Server error');
  }
}).listen(port, '127.0.0.1', () => console.log(`serving ${root} on http://127.0.0.1:${port}`));
