/**
 * Deno entry point for the `api` Edge Function. Reads secrets from the Edge Function
 * environment only (INV-12, SEC-01) and wires the Supabase adapters into the pure app.
 */
import { supabaseAuth, supabaseIdempotency, supabaseMe } from './adapters/supabase.ts';
import { supabaseProjects } from './adapters/projects.ts';
import type { SupabaseConfig } from './adapters/supabase.ts';
import { createApp } from './app.ts';
import type { Logger } from './ports.ts';

function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

const cfg: SupabaseConfig = {
  url: env('SUPABASE_URL'),
  publishableKey: Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? env('SUPABASE_ANON_KEY'),
  serviceRoleKey: Deno.env.get('SUPABASE_SECRET_KEY') ?? env('SUPABASE_SERVICE_ROLE_KEY'),
};

const logger: Logger = {
  info: (msg, fields) => console.log(JSON.stringify({ level: 'info', msg, ...fields })),
  error: (msg, fields) => console.error(JSON.stringify({ level: 'error', msg, ...fields })),
};

const app = createApp({
  supabaseConfig: cfg,
  auth: supabaseAuth(cfg),
  idempotency: supabaseIdempotency(cfg),
  me: supabaseMe(cfg),
  projects: supabaseProjects(cfg),
  logger,
  now: () => new Date(),
  functionName: 'api',
});

Deno.serve(app.fetch);
