import { z } from '../primitives.ts';
import { PlanComposeOutputSchema } from './plan-compose.ts';
import { ObservationAnalyzeOutputSchema } from './observation-analyze.ts';
import { IncidentAssessOutputSchema } from './incident-assess.ts';
import { EventSummarizeOutputSchema } from './event-summarize.ts';
export * from './plan-compose.ts';
export * from './observation-analyze.ts';
export * from './incident-assess.ts';
export * from './event-summarize.ts';
export * from './jobs.ts';
export const outputSchemas = {
  plan_compose: PlanComposeOutputSchema,
  observation_analyze: ObservationAnalyzeOutputSchema,
  incident_assess: IncidentAssessOutputSchema,
  event_summarize: EventSummarizeOutputSchema,
} as const;
export type ModuleName = keyof typeof outputSchemas;
export type ModuleOutput<M extends ModuleName> = z.infer<(typeof outputSchemas)[M]>;
export const AI_SCHEMA_VERSION = 'wp0-v1';
export function modelJsonSchema(module: ModuleName): Record<string, unknown> {
  return z.toJSONSchema(outputSchemas[module]);
}
