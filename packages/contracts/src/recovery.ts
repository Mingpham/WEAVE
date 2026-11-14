import { z, uuid, utcDateTime, alias } from './primitives.ts';

function actionSchema(ids: { task: z.ZodType<string>; member: z.ZodType<string>; resource: z.ZodType<string>; area: z.ZodType<string> }) {
  return z.discriminatedUnion('type', [
    z.strictObject({ type: z.literal('REASSIGN_TASK'), task_id: ids.task, to_member_id: ids.member }),
    z.strictObject({ type: z.literal('SWAP_RESOURCE'), for_task_id: ids.task.nullable(), for_area_id: ids.area.nullable(), from_resource_id: ids.resource.nullable(), to_resource_id: ids.resource, carrier_member_id: ids.member.nullable() }),
    z.strictObject({ type: z.literal('RESCHEDULE_TASK'), task_id: ids.task, new_start_at: utcDateTime.nullable(), new_due_at: utcDateTime }),
    z.strictObject({ type: z.literal('DEFER_TASK'), task_id: ids.task }),
    z.strictObject({ type: z.literal('ADD_TASK'), title: z.string().min(3).max(80), description: z.string().max(500), criteria: z.array(z.string().max(200)).min(1).max(4), area_id: ids.area.nullable(), due_at: utcDateTime, assignee_member_id: ids.member }),
  ]);
}
export const ActionSchema = actionSchema({ task: uuid, member: uuid, resource: uuid, area: uuid });
export const ActionDraftSchema = actionSchema({ task: alias('T'), member: alias('M'), resource: alias('R'), area: alias('A') });
export const ConditionCheckSchema = z.strictObject({
  action_index: z.number().int().nonnegative().nullable(), code: z.string(), result: z.enum(['TRUE', 'FALSE', 'UNKNOWN']),
  message: z.string(), claim_ids: z.array(uuid), unknown_id: uuid.nullable(),
});
export const ProposalOptionSchema = z.strictObject({
  id: z.string(), source: z.enum(['CODE', 'AI', 'MANUAL']), actions: z.array(ActionSchema).min(1).max(3),
  description: z.string(), validity: z.enum(['VALID', 'PENDING_VERIFICATION']), checks: z.array(ConditionCheckSchema),
  effects: z.strictObject({ unblocks_task_ids: z.array(uuid), adds_risk_task_ids: z.array(uuid), moves_member_ids: z.array(uuid), moves_resource_ids: z.array(uuid) }),
  rank: z.number().int().nullable(), recommended: z.boolean(), tradeoffs: z.array(z.string()), assumptions: z.array(z.string()), evidence_claim_ids: z.array(uuid),
});
export type Action = z.infer<typeof ActionSchema>;
export type ActionDraft = z.infer<typeof ActionDraftSchema>;
export type ConditionCheck = z.infer<typeof ConditionCheckSchema>;
export type ProposalOption = z.infer<typeof ProposalOptionSchema>;
