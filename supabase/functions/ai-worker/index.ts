import { createWorkerHandler } from './handler.ts';

// Intentionally fail closed until real Supabase RPC contracts are available.
// Never substitute a user JWT or service-role credential for this invocation secret.
if (import.meta.main) {
  Deno.serve(createWorkerHandler(null, Deno.env.get('AI_WORKER_SECRET') ?? ''));
}
