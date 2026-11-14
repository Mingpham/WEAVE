import type { ModuleRegistry } from './ports.ts';

/** Modules are registered only after real snapshot/business validators are complete. */
export const productionRegistry: ModuleRegistry = Object.freeze({});
