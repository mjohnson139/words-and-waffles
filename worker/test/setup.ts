import { applyD1Migrations } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { beforeEach } from 'vitest';
import { resetRateLimit } from '../src/ping';

beforeEach(async () => {
  await applyD1Migrations(env.DB, (env as unknown as { TEST_MIGRATIONS: never }).TEST_MIGRATIONS);
  await env.DB.exec('DELETE FROM counts');
  resetRateLimit();
});
