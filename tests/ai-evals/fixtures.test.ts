import { expect, it } from 'vitest';
import { outputSchemas } from '../../packages/contracts/src/ai/index.ts';
import { loadEvalCase, modules } from './fixtures.ts';

it.each(modules)('%s fixtures match recorded structural expectations', (module) => {
  for (const name of ['smoke', 'invalid'] as const) {
    const fixture = loadEvalCase(module, name);
    expect(fixture.module).toBe(module);
    expect(outputSchemas[module].safeParse(fixture.output).success).toBe(
      fixture.expected.schema_valid,
    );
  }
});
