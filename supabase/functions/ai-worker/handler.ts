import { processJob } from './process-job.ts';
import type { WorkerDeps } from './ports.ts';

const json = (status: number, body: unknown) => Response.json(body, { status });
const error = (status: number, code: string) => json(status, { error: { code } });

/** Fixed-size digest comparison, without returning either secret or its digest. */
async function matchesSecret(received: string, expected: Promise<ArrayBuffer>): Promise<boolean> {
  const actual = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(received)));
  const wanted = new Uint8Array(await expected);
  let difference = 0;
  for (let i = 0; i < wanted.length; i++) difference |= actual[i]! ^ wanted[i]!;
  return difference === 0;
}

export function createWorkerHandler(deps: WorkerDeps | null, workerSecret: string): (request: Request) => Promise<Response> {
  if (!workerSecret.trim() || /\s/.test(workerSecret)) throw new Error('AI_WORKER_SECRET_REQUIRED');
  const digest = crypto.subtle.digest('SHA-256', new TextEncoder().encode(workerSecret));
  return async request => {
    const authorization = request.headers.get('authorization') ?? '';
    if (!authorization.startsWith('Bearer ') || !await matchesSecret(authorization.slice(7), digest)) return error(401, 'UNAUTHORIZED');
    if (request.method !== 'POST') return error(405, 'METHOD_NOT_ALLOWED');
    let body: unknown;
    try { body = await request.json(); } catch { return error(400, 'INVALID_REQUEST'); }
    if (typeof body !== 'object' || body === null || Array.isArray(body)
      || Object.keys(body).length !== 1 || !('mode' in body)
      || (body.mode !== 'drain' && body.mode !== 'sweep')) return error(400, 'INVALID_REQUEST');
    // No production store is bound until the DB lane supplies reviewed atomic RPCs.
    if (!deps) return error(503, 'INTEGRATION_PENDING');
    try {
      if (body.mode === 'sweep') await deps.store.recoverExpired({ now: deps.nowMs(), limit: 1 });
      const messages = await deps.store.receive({ limit: 1, visibility_timeout_sec: 60 });
      const outcomes = [];
      for (const message of messages) outcomes.push(await processJob(message, deps));
      return json(200, { data: { processed: outcomes.length, outcomes, scope: body.mode === 'sweep' ? 'queue_recovery_only' : 'queue' } });
    } catch { return error(503, 'WORKER_UNAVAILABLE'); }
  };
}
