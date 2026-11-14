import { en } from '../../strings/en';

export function createSubmissionGate() {
  let pending = false;
  return {
    get pending() { return pending; },
    async run(send: () => Promise<void>): Promise<boolean> {
      if (pending) return false;
      pending = true;
      try { await send(); return true; }
      finally { pending = false; }
    },
  };
}
export function approvalBlock(input: {stale: boolean; revisionMatches: boolean; canApprove: boolean; offline: boolean}): 'stale' | 'offline' | 'unavailable' | null {
  if (input.stale || !input.revisionMatches) return 'stale';
  if (input.offline) return 'offline';
  return input.canApprove ? null : 'unavailable';
}
export function formatDeadline(iso: string, timezone: string, now: number): string {
  const date = new Date(iso);
  const time = new Intl.DateTimeFormat('en-GB', {timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format(date);
  const delta = Math.ceil((date.getTime() - now) / 60000);
  if (Math.abs(delta) >= 120) return time;
  return `${time} · ${delta < 0 ? en.minutesLate(Math.abs(delta)) : en.inMinutes(delta)}`;
}
