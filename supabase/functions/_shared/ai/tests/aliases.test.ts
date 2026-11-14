import { expect, it } from 'vitest';
import { buildAliasMap, resolveAlias } from '../aliases.ts';

const project = '00000000-0000-4000-8000-000000000001';
const refs = Object.freeze([
  Object.freeze({
    id: '00000000-0000-4000-8000-000000000003',
    project_id: project,
    kind: 'TASK' as const,
  }),
  Object.freeze({
    id: '00000000-0000-4000-8000-000000000002',
    project_id: project,
    kind: 'TASK' as const,
  }),
]);
it('INV-03 produces stable aliases without changing source entities', () => {
  const a = buildAliasMap(refs, project);
  expect(a).toEqual(buildAliasMap([...refs].reverse(), project));
  expect(resolveAlias(a, 'T1', 'TASK')).toBe('00000000-0000-4000-8000-000000000002');
  expect(refs[0]!.id).toBe('00000000-0000-4000-8000-000000000003');
});
it('INV-07 rejects cross-project references', () => {
  expect(() => buildAliasMap(refs, '00000000-0000-4000-8000-000000000099')).toThrow(
    'ID_NOT_ALLOWED',
  );
});
it('AT-25 rejects missing aliases and aliases of another kind', () => {
  const map = buildAliasMap(refs, project);
  expect(() => resolveAlias(map, 'T9', 'TASK')).toThrow('ID_NOT_ALLOWED');
  expect(() => resolveAlias(map, 'T1', 'MEMBER')).toThrow('ID_NOT_ALLOWED');
  expect(() => resolveAlias(map, 'toString', 'TASK')).toThrow('ID_NOT_ALLOWED');
});
