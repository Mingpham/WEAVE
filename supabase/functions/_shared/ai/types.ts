import type { ModuleName, ModuleOutput } from '../../../../packages/contracts/src/ai/index.ts';
import type { AliasMap } from './aliases.ts';

export type ValidationContext<M extends ModuleName = ModuleName> = Readonly<{
  module: M; aliases: AliasMap; snapshot: Readonly<Record<string, unknown>>; now: string;
}>;
export type ValidationCode = 'SCHEMA_INVALID' | 'ID_NOT_ALLOWED' | 'POLICY_REJECTED' | 'BUSINESS_REJECTED' | 'MODULE_NOT_READY' | 'VALIDATOR_FAILED';
export type ValidationWarning = 'ITEM_DROPPED' | 'OPTION_DROPPED' | 'PROBE_DROPPED';
export type ValidationStep<T> = { ok: true; value: T; warnings: ValidationWarning[] } | { ok: false; code: ValidationCode };
export type ModuleValidators<M extends ModuleName = ModuleName> = {
  references: (value: ModuleOutput<M>, context: ValidationContext<M>) => void;
  policy: (value: ModuleOutput<M>, context: ValidationContext<M>) => ValidationStep<ModuleOutput<M>>;
  business: (value: ModuleOutput<M>, context: ValidationContext<M>) => ValidationStep<ModuleOutput<M>>;
};
export type ValidationStage = 'configuration' | 'schema' | 'references' | 'policy' | 'business';
export type ValidationResult<T> = { ok: true; value: T; warnings: ValidationWarning[] }
  | { ok: false; stage: ValidationStage; code: ValidationCode };
