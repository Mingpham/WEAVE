/**
 * `pnpm mock-api` — serves the mock on http://0.0.0.0:8787/functions/v1/api so a phone on
 * the same Wi-Fi can reach it. Seed: tests/fixtures/mock-api/seed.json (or MOCK_FIXTURE).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from '@hono/node-server';
import { createMockApp, MOCK_FUNCTION_NAME } from './server.ts';

const fixturePath =
  process.env.MOCK_FIXTURE ??
  fileURLToPath(new URL('../../../tests/fixtures/mock-api/seed.json', import.meta.url));
const port = Number(process.env.PORT ?? 8787);
const hostname = process.env.HOST ?? '0.0.0.0';

const { app, state } = createMockApp(JSON.parse(readFileSync(fixturePath, 'utf8')));

serve({ fetch: app.fetch, port, hostname }, (info) => {
  console.log(`WEAVE mock API on http://${hostname}:${info.port}/${MOCK_FUNCTION_NAME}`);
  console.log('Bearer tokens:', state.users.map((u) => u.token).join(', '));
});
