import { z } from 'zod';
export { z };
export const uuid = z.uuid();
export const utcDateTime = z.iso.datetime();
export const alias = (prefix: string) => z.string().regex(new RegExp(`^[${prefix}][1-9][0-9]*$`));
export const IncidentTypeSchema = z.enum(['MEMBER_UNAVAILABLE', 'RESOURCE_PROBLEM', 'TASK_DELAYED', 'HANDOFF_FAILED', 'CONFLICTING_INFO', 'PLAN_CHANGE', 'OTHER']);
