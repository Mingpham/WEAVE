import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { useLayoutEffect } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { useAcknowledgedAction } from '../src/features/shared/use-acknowledged-action';

Object.assign(globalThis, {IS_REACT_ACT_ENVIRONMENT: true});
let current!: ReturnType<typeof useAcknowledgedAction>;
let renderer: ReactTestRenderer;
function Harness({version}: {version: string}) { const action = useAcknowledgedAction(version); useLayoutEffect(() => {current = action;}); return null; }
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); });

describe('mounted action lifecycle', () => {
  it('FR-REC-11 fresh proposal unlocks a stale failure without a screen remount', async () => {
    await act(async () => { renderer = create(<Harness version="1" />); });
    await act(async () => { await current.run(() => Promise.reject({code: 'PROPOSAL_STALE'})); });
    expect(current.stale).toBe(true);
    expect(current.acknowledged).toBe(false);
    await act(async () => { renderer.update(<Harness version="2" />); });
    expect(current.stale).toBe(false);
    expect(current.error).toBeUndefined();
    await act(async () => { await current.run(() => Promise.resolve()); });
    expect(current.acknowledged).toBe(true);
  });
  it('UX-02 a delayed ACK for an old revision cannot lock the new revision', async () => {
    await act(async () => { renderer = create(<Harness version="1" />); });
    let ack!: () => void;
    let request!: Promise<void>;
    await act(async () => { request = current.run(() => new Promise<void>(resolve => { ack = resolve; })); });
    expect(current.pending).toBe(true);
    await act(async () => { renderer.update(<Harness version="2" />); });
    await act(async () => { ack(); await request; });
    expect(current.acknowledged).toBe(false);
    expect(current.pending).toBe(false);
  });
  it('FR-EVD-03 a new draft clears old success feedback without claiming a new ACK', async () => {
    await act(async () => { renderer = create(<Harness version="1" />); });
    await act(async () => { await current.run(() => Promise.resolve()); });
    expect(current.acknowledged).toBe(true);
    await act(async () => { current.reset(); });
    expect(current.acknowledged).toBe(false);
    await act(async () => { await current.run(() => Promise.reject({code: 'NETWORK_ERROR'})); });
    expect(current.acknowledged).toBe(false);
    expect(current.error).toBeDefined();
  });
});
