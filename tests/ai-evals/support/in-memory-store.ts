import type { AnalysisJob } from '../../../packages/contracts/src/ai/index.ts';
import type { InferenceLog } from '../../../supabase/functions/_shared/ai/logging.ts';
import type {
  WorkerStore,
  JobContext,
  CommitInput,
} from '../../../supabase/functions/ai-worker/ports.ts';

/** Test double only: no assertion here proves PostgreSQL transaction behavior. */
export class InMemoryStore implements WorkerStore {
  jobs = new Map<string, AnalysisJob>();
  contexts = new Map<string, JobContext>();
  leases = new Map<string, { token: string; expires: number }>();
  schemaFailures = new Map<string, number>();
  logs: InferenceLog[] = [];
  writes: string[] = [];
  acks: string[] = [];
  fallbacks: string[] = [];
  retries: number[] = [];
  remainingBudget = 100;
  enabled = true;
  now = 0;
  generation = 0;
  failAck = false;
  failLog = false;
  add(id: string) {
    this.jobs.set(id, {
      id,
      project_id: '00000000-0000-4000-8000-000000000099',
      type: 'EVENT_SUMMARIZE',
      status: 'QUEUED',
      subject_id: id,
      basis_revision: null,
      attempts: 0,
      error_code: null,
      created_at: '2026-11-14T00:00:00Z',
      queued_at: '2026-11-14T00:00:00Z',
      started_at: null,
      finished_at: null,
    });
    this.contexts.set(id, {
      state_version: 1,
      basis_revision: null,
      snapshot: {},
      now: '2026-11-14T00:00:00Z',
    });
  }
  async receive() {
    return [...this.jobs.values()]
      .filter((j) => j.status === 'QUEUED')
      .map((j) => ({ job_id: j.id, message_id: `m-${j.id}` }));
  }
  async peekJob({ job_id }: { job_id: string }) {
    const job = this.jobs.get(job_id);
    return job ? { ...job } : null;
  }
  async claim({ job_id }: { job_id: string; message_id: string }) {
    const job = this.jobs.get(job_id)!;
    if (['SUCCEEDED', 'DEAD', 'DISCARDED_STALE'].includes(job.status))
      return { kind: 'TERMINAL' as const };
    if (job.status !== 'QUEUED') return { kind: 'BUSY' as const };
    job.status = 'RUNNING';
    job.attempts++;
    const lease = `lease-${++this.generation}`;
    this.leases.set(job_id, { token: lease, expires: this.now + 60000 });
    return {
      kind: 'CLAIMED' as const,
      job: { ...job },
      lease,
      schema_id_failures: this.schemaFailures.get(job_id) ?? 0,
    };
  }
  private assertLease(job_id: string, lease: string) {
    if (this.leases.get(job_id)?.token !== lease) throw new Error('LEASE_LOST');
  }
  async reserveInference({ job_id, lease }: { job_id: string; lease: string; attempt: number }) {
    this.assertLease(job_id, lease);
    if (!this.enabled) return 'AI_DISABLED' as const;
    if (this.remainingBudget <= 0) return 'BUDGET_EXCEEDED' as const;
    this.remainingBudget--;
    return 'ALLOWED' as const;
  }
  async loadContext({ job_id, lease }: { job_id: string; lease: string }) {
    this.assertLease(job_id, lease);
    return structuredClone(this.contexts.get(job_id)!);
  }
  async appendInferenceLog(log: InferenceLog) {
    if (this.failLog) throw new Error('LOG_UNAVAILABLE');
    if (!this.logs.some((l) => l.job_id === log.job_id && l.attempt === log.attempt))
      this.logs.push(structuredClone(log));
  }
  async commitResult(input: CommitInput) {
    if (this.leases.get(input.job_id)?.token !== input.lease) return 'LEASE_LOST' as const;
    const job = this.jobs.get(input.job_id)!;
    if (job.status === 'SUCCEEDED') return 'ALREADY_COMMITTED' as const;
    const context = this.contexts.get(input.job_id)!;
    if (context.basis_revision !== input.basis_revision) {
      await this.appendInferenceLog({ ...input.inference_log, outcome: 'STALE_DISCARDED' });
      job.status = 'DISCARDED_STALE';
      return 'STALE' as const;
    }
    if (context.state_version !== input.expected_state_version) return 'VERSION_CONFLICT' as const;
    await this.appendInferenceLog(input.inference_log);
    this.writes.push(job.id);
    job.status = 'SUCCEEDED';
    context.state_version++;
    return 'COMMITTED' as const;
  }
  async scheduleRetry(input: {
    job_id: string;
    lease: string;
    error_code: string;
    delay_ms: number;
    schema_id_failures: number;
  }) {
    this.assertLease(input.job_id, input.lease);
    this.schemaFailures.set(input.job_id, input.schema_id_failures);
    this.jobs.get(input.job_id)!.status = 'QUEUED';
    this.retries.push(input.delay_ms);
  }
  async finishFailure(input: {
    job_id: string;
    lease: string;
    error_code: string;
    fallback_kind: string;
  }) {
    this.assertLease(input.job_id, input.lease);
    this.jobs.get(input.job_id)!.status = 'DEAD';
    this.fallbacks.push(input.error_code);
  }
  async ack({ message_id }: { message_id: string }) {
    if (this.failAck) throw new Error('ACK_UNAVAILABLE');
    this.acks.push(message_id);
  }
  async recoverExpired({ now }: { now: number; limit: number }) {
    for (const [id, lease] of this.leases)
      if (lease.expires <= now && this.jobs.get(id)!.status === 'RUNNING') {
        this.leases.delete(id);
        this.jobs.get(id)!.status = 'QUEUED';
      }
  }
}
