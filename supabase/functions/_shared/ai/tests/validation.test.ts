import { expect, it } from 'vitest';
import { validateOutput } from '../validation.ts';
import { AliasError } from '../aliases.ts';
import type { ModuleValidators, ValidationContext } from '../types.ts';

const context: ValidationContext = { module: 'event_summarize', aliases: Object.freeze({}), snapshot: Object.freeze({}), now: '2026-11-14T00:00:00Z' };
const output = { headline: 'Books exchanged', went_well: [], went_wrong: [], lessons: [] };
const makeHooks = (order: string[]): ModuleValidators<'event_summarize'> => ({
  references: () => { order.push('references'); },
  policy: value => { order.push('policy'); return { ok: true, value, warnings: [] }; },
  business: value => { order.push('business'); return { ok: true, value, warnings: [] }; },
});
it('INV-02 fails closed for unregistered module validation', () => {
  expect(validateOutput(JSON.stringify(output), context, undefined)).toEqual({ ok: false, stage: 'configuration', code: 'MODULE_NOT_READY' });
});
it.each(['{broken', JSON.stringify({ ...output, readiness: 'READY_FOR_APPROVAL' })])('stops malformed output before references: %s', raw => {
  const order: string[] = [];
  expect(validateOutput(raw, context, makeHooks(order))).toMatchObject({ ok: false, stage: 'schema', code: 'SCHEMA_INVALID' });
  expect(order).toEqual([]);
});
it('AT-25 rejects the entire output on an unknown alias without running later layers', () => {
  const order: string[] = [];
  const hooks = { ...makeHooks(order), references: () => { throw new AliasError(); } };
  expect(validateOutput(JSON.stringify(output), context, hooks)).toEqual({ ok: false, stage: 'references', code: 'ID_NOT_ALLOWED' });
  expect(order).toEqual([]);
});
it('runs policy before business and preserves sanctioned sanitization', () => {
  const order: string[] = [];
  const hooks = makeHooks(order);
  hooks.business = value => { order.push('business'); return { ok: true, value: { ...value, headline: 'Validated summary' }, warnings: ['ITEM_DROPPED'] }; };
  expect(validateOutput(JSON.stringify(output), context, hooks)).toEqual({ ok: true, value: { ...output, headline: 'Validated summary' }, warnings: ['ITEM_DROPPED'] });
  expect(order).toEqual(['references', 'policy', 'business']);
});
it('stops policy rejection and never echoes exception text', () => {
  const order: string[] = [];
  const hooks = makeHooks(order);
  hooks.policy = () => ({ ok: false, code: 'POLICY_REJECTED' });
  expect(validateOutput(JSON.stringify(output), context, hooks)).toEqual({ ok: false, stage: 'policy', code: 'POLICY_REJECTED' });
  expect(order).toEqual(['references']);
  hooks.policy = () => { throw new Error('secret-sentinel'); };
  expect(JSON.stringify(validateOutput(JSON.stringify(output), context, hooks))).not.toContain('secret-sentinel');
});
