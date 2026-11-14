import { describe, expect, it } from 'vitest';
import { createSubmissionGate, approvalBlock, formatDeadline } from '../src/features/shared/interaction';

describe('mobile interaction guards', () => {
  it('UX-02 / INV-01 waits for ACK and blocks a same-frame second press', async () => {
    const gate = createSubmissionGate();
    let acknowledge!: () => void;
    let calls = 0;
    const send = () => { calls++; return new Promise<void>(resolve => { acknowledge = resolve; }); };
    const first = gate.run(send);
    expect(gate.pending).toBe(true);
    expect(await gate.run(send)).toBe(false);
    expect(calls).toBe(1);
    acknowledge();
    expect(await first).toBe(true);
    expect(gate.pending).toBe(false);
  });
  it('FR-EVD-03 propagates failures without success and allows explicit retry', async () => {
    const gate = createSubmissionGate();
    await expect(gate.run(() => Promise.reject(new Error('NETWORK_ERROR')))).rejects.toThrow('NETWORK_ERROR');
    expect(gate.pending).toBe(false);
    expect(await gate.run(() => Promise.resolve())).toBe(true);
  });
  it('FR-REC-11 blocks stale proposal and revision mismatch even when option was valid', () => {
    expect(approvalBlock({ stale: true, revisionMatches: true, canApprove: true, offline: false })).toBe('stale');
    expect(approvalBlock({ stale: false, revisionMatches: false, canApprove: true, offline: false })).toBe('stale');
  });
  it('FR-NTF-05 blocks offline and server-denied approval', () => {
    expect(approvalBlock({ stale: false, revisionMatches: true, canApprove: true, offline: true })).toBe('offline');
    expect(approvalBlock({ stale: false, revisionMatches: true, canApprove: false, offline: false })).toBe('unavailable');
    expect(approvalBlock({ stale: false, revisionMatches: true, canApprove: true, offline: false })).toBe(null);
  });
  it('UX-06 formats project timezone and relative deadline independently of device timezone', () => {
    expect(formatDeadline('2026-11-14T02:12:00Z', 'Asia/Ho_Chi_Minh', Date.parse('2026-11-14T02:00:00Z'))).toBe('09:12 · in 12 min');
    expect(formatDeadline('2026-11-14T01:52:00Z', 'Asia/Ho_Chi_Minh', Date.parse('2026-11-14T02:00:00Z'))).toBe('08:52 · 8 min late');
  });
});
