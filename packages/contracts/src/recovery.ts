/**
 * Recovery types — spec §9.4 (Action, ConditionCheck, ProposalOption).
 *
 * OWNERSHIP: these belong to the AI & Engine lane (spec §15.3: "Viết kiểu của §9.4 phần
 * Recovery và §10"). They are transcribed verbatim from §9.4 so other lanes can compile
 * against them at G0. TranTungDuong02082006 should review and own further changes.
 */
import { z } from 'zod';
import { IsoDateTime, Uuid } from './common.ts';
import { ConditionResult } from './enums.ts';

export const Action = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('REASSIGN_TASK'), task_id: Uuid, to_member_id: Uuid }),
  z.strictObject({
    type: z.literal('SWAP_RESOURCE'),
    for_task_id: Uuid.nullable(),
    for_area_id: Uuid.nullable(),
    from_resource_id: Uuid.nullable(),
    to_resource_id: Uuid,
    carrier_member_id: Uuid.nullable(),
  }),
  z.strictObject({
    type: z.literal('RESCHEDULE_TASK'),
    task_id: Uuid,
    new_start_at: IsoDateTime.nullable(),
    new_due_at: IsoDateTime,
  }),
  z.strictObject({ type: z.literal('DEFER_TASK'), task_id: Uuid }),
  z.strictObject({
    type: z.literal('ADD_TASK'),
    title: z.string(),
    description: z.string(),
    criteria: z.array(z.string()),
    area_id: Uuid.nullable(),
    due_at: IsoDateTime,
    assignee_member_id: Uuid,
  }),
]);
export type Action = z.infer<typeof Action>;

export const ConditionCheck = z.strictObject({
  /** null = option-level condition. */
  action_index: z.number().int().nonnegative().nullable(),
  /** Condition code from spec §11.5. */
  code: z.string(),
  result: ConditionResult,
  /** English sentence built by code from a template. */
  message: z.string(),
  claim_ids: z.array(Uuid),
  unknown_id: Uuid.nullable(),
});
export type ConditionCheck = z.infer<typeof ConditionCheck>;

export const ProposalOption = z.strictObject({
  /** Stable within one proposal. */
  id: z.string(),
  source: z.enum(['CODE', 'AI', 'MANUAL']),
  actions: z.array(Action).min(1).max(3),
  /** Built by code from per-action sentence templates. */
  description: z.string(),
  /** Written by the server only; INVALID options are never stored in a proposal. */
  validity: z.enum(['VALID', 'PENDING_VERIFICATION']),
  checks: z.array(ConditionCheck),
  /** Computed by code. */
  effects: z.strictObject({
    unblocks_task_ids: z.array(Uuid),
    adds_risk_task_ids: z.array(Uuid),
    moves_member_ids: z.array(Uuid),
    moves_resource_ids: z.array(Uuid),
  }),
  /** From the AI, after validation. */
  rank: z.number().int().positive().nullable(),
  recommended: z.boolean(),
  tradeoffs: z.array(z.string()),
  assumptions: z.array(z.string()),
  evidence_claim_ids: z.array(Uuid),
});
export type ProposalOption = z.infer<typeof ProposalOption>;
