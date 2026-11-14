import { readFileSync } from 'node:fs';
import type { ModuleName } from '../../packages/contracts/src/ai/index.ts';

export type EvalCase = {
  module: ModuleName;
  name: string;
  schema_version: string;
  prompt_version: string;
  snapshot: Record<string, unknown>;
  output: Record<string, unknown>;
  expected: { schema_valid: boolean };
};
export function loadEvalCase(module: ModuleName, name: 'smoke' | 'invalid'): EvalCase {
  return JSON.parse(
    readFileSync(new URL(`./${module}/${name}.json`, import.meta.url), 'utf8'),
  ) as EvalCase;
}
export const modules: ModuleName[] = [
  'plan_compose',
  'observation_analyze',
  'incident_assess',
  'event_summarize',
];
export const cases = modules.map((module) => loadEvalCase(module, 'smoke'));
