const prefixes = {
  TASK: 'T', MEMBER: 'M', RESOURCE: 'R', AREA: 'A', OBSERVATION: 'O',
  CLAIM: 'C', INCIDENT: 'I', UNKNOWN: 'U', CRITERION: 'K', MEDIA: 'P',
} as const;
export type RefKind = keyof typeof prefixes;
export type ScopedRef = Readonly<{ id: string; project_id: string; kind: RefKind }>;
export type AliasMap = Readonly<Record<string, ScopedRef>>;
export class AliasError extends Error {
  constructor() { super('ID_NOT_ALLOWED'); this.name = 'AliasError'; }
}
export function buildAliasMap(refs: readonly ScopedRef[], projectId: string): AliasMap {
  const result: Record<string, ScopedRef> = Object.create(null);
  const counts: Partial<Record<RefKind, number>> = {};
  const unique = new Map<string, ScopedRef>();
  for (const ref of refs) {
    if (ref.project_id !== projectId || !ref.id || !Object.hasOwn(prefixes, ref.kind)) throw new AliasError();
    unique.set(`${ref.kind}:${ref.id}`, ref);
  }
  for (const key of [...unique.keys()].sort()) {
    const ref = unique.get(key)!;
    const n = (counts[ref.kind] ?? 0) + 1;
    counts[ref.kind] = n;
    result[`${prefixes[ref.kind]}${n}`] = Object.freeze({ ...ref });
  }
  return Object.freeze(result);
}
export function resolveAlias(map: AliasMap, alias: string, expectedKind: RefKind): string {
  const ref = Object.hasOwn(map, alias) ? map[alias] : undefined;
  if (!ref || ref.kind !== expectedKind) throw new AliasError();
  return ref.id;
}
