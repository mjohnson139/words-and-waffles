import { errorResponse } from './http';
import { handlePing } from './ping';
import { handleResult } from './result';
import { handleStats, handleStatsJson } from './stats';
import { handleWord } from './word';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

const withCors = (res: Response): Response => {
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(CORS)) out.headers.set(k, v);
  return out;
};

async function route(request: Request, env: Cloudflare.Env): Promise<Response> {
  const { pathname } = new URL(request.url);
  const method = request.method;
  const allow = (m: string, run: () => Promise<Response>) =>
    method === m ? run() : errorResponse(405, 'method not allowed');

  switch (pathname) {
    case '/v1/word':
      return allow('GET', () => handleWord(request, env));
    case '/v1/ping':
      return allow('POST', () => handlePing(request, env));
    case '/v1/result':
      return allow('POST', () => handleResult(request, env));
    case '/stats':
      return allow('GET', () => handleStats(env));
    case '/stats.json':
      return allow('GET', () => handleStatsJson(env));
    default:
      return errorResponse(404, 'not found');
  }
}

export default {
  async fetch(request: Request, env: Cloudflare.Env): Promise<Response> {
    const isApi = new URL(request.url).pathname.startsWith('/v1/');
    if (isApi && request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { ...CORS, 'X-Content-Type-Options': 'nosniff' } });
    }
    const res = await route(request, env);
    const out = isApi ? withCors(res) : new Response(res.body, res);
    out.headers.set('X-Content-Type-Options', 'nosniff');
    return out;
  },
};
