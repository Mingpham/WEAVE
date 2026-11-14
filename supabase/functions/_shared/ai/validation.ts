import { outputSchemas, type ModuleName, type ModuleOutput } from '../../../../packages/contracts/src/ai/index.ts';
import { AliasError } from './aliases.ts';
import type { ModuleValidators, ValidationContext, ValidationResult, ValidationStage } from './types.ts';

export function validateOutput<M extends ModuleName>(
  raw: string, context: ValidationContext<M>, validators: ModuleValidators<M> | undefined,
): ValidationResult<ModuleOutput<M>> {
  if (!validators || typeof validators.references !== 'function' || typeof validators.policy !== 'function' || typeof validators.business !== 'function') {
    return { ok: false, stage: 'configuration', code: 'MODULE_NOT_READY' };
  }
  let stage: ValidationStage = 'schema';
  try {
    const parsed = outputSchemas[context.module].safeParse(JSON.parse(raw));
    if (!parsed.success) return { ok: false, stage, code: 'SCHEMA_INVALID' };
    const value = parsed.data as ModuleOutput<M>;
    stage = 'references';
    validators.references(value, context);
    stage = 'policy';
    const policy = validators.policy(value, context);
    if (!policy.ok) return { ...policy, stage };
    stage = 'business';
    const business = validators.business(policy.value, context);
    if (!business.ok) return { ...business, stage };
    return { ok: true, value: business.value, warnings: [...policy.warnings, ...business.warnings] };
  } catch (error) {
    const code = stage === 'schema' ? 'SCHEMA_INVALID' : error instanceof AliasError ? 'ID_NOT_ALLOWED' : 'VALIDATOR_FAILED';
    return { ok: false, stage, code };
  }
}
