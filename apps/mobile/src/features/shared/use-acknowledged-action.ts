import { useRef, useState } from 'react';
import { errorMessage } from '@/strings/errors';
import { createSubmissionGate } from './interaction';

// Presentation state only: the injected callback must settle after the server ACK.
// Request identity, retries, persistence and cache invalidation belong to src/lib.
export function useAcknowledgedAction(versionKey?: string) {
  const gate = useRef(createSubmissionGate());
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{versionKey?: string; error?: string; acknowledged: boolean; stale: boolean}>({versionKey, acknowledged: false, stale: false});
  // Feedback belongs to the revision that was submitted. A fresh snapshot clears it
  // by derivation, including when an old request settles after that snapshot arrives.
  const current = feedback.versionKey === versionKey;
  const stale = current && feedback.stale;
  async function run(send: () => Promise<void>) {
    if (gate.current.pending) return;
    setPending(true); setFeedback({versionKey, acknowledged: false, stale});
    try { if (await gate.current.run(send)) setFeedback({versionKey, acknowledged: true, stale: false}); }
    catch (cause) {
      const staleError = !!cause && typeof cause === 'object' && 'code' in cause && (cause.code === 'PROPOSAL_STALE' || cause.code === 'VERSION_CONFLICT');
      setFeedback({versionKey, acknowledged: false, stale: stale || staleError, error: errorMessage(cause)});
    } finally { setPending(false); }
  }
  return { run, pending, error: current ? feedback.error : undefined, acknowledged: current && feedback.acknowledged, stale,
    reset: () => setFeedback({versionKey, acknowledged: false, stale}) };
}
