import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ENUMS, POL } from '../src/index.ts';

const spec = readFileSync(new URL('../../../docs/WEAVE_MVP_Specification.md', import.meta.url), 'utf8');

describe('WP-0 contracts specification parity', () => {
  it('§7.2 enum names and ordered values match the authoritative specification', () => {
    const section = spec.split('### 7.2. Enum')[1].split('### 7.3.')[0];
    const rows = section.match(/^[a-z_]+\s+[A-Z][A-Z_\s|]+/gm);
    expect(rows?.length).toBeGreaterThan(40);
    const expected = Object.fromEntries(rows!.map(row => {
      const [name, ...values] = row.trim().split(/\s+/);
      return [name, values.filter(value => value !== '|')];
    }));
    expect(ENUMS).toEqual(expected);
    for (const values of Object.values(ENUMS)) {
      expect(new Set(values).size).toBe(values.length);
    }
  });

  it('FR-EVT-07 / FR-SET-03 POL defaults match the specification including D-15 AI limits', () => {
    const section = spec.split('## Phụ lục B')[1];
    const expected = Object.fromEntries([...section.matchAll(/^\| `([A-Z0-9_]+)` \| ([\d ]+) \|/gm)]
      .map(([, key, value]) => [key, Number(value.replaceAll(' ', ''))]));
    expect(Object.keys(expected)).toHaveLength(28);
    expect(POL).toEqual(expected);
    expect(POL.MAX_AI_CALLS_PER_INCIDENT).toBe(8);
    expect(POL.MAX_PROBES_PER_INCIDENT).toBe(3);
  });
});
