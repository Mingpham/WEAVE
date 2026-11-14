import { ENUMS, POL } from '../src/index.ts';
import type { DomainEnumValue, PolicyName } from '../src/index.ts';

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2) ? true : false;
type Assert<T extends true> = T;
type MemberRole = Assert<Equal<DomainEnumValue<'member_role'>, 'OWNER' | 'PARTICIPANT'>>;
type ProjectStatus = Assert<Equal<DomainEnumValue<'project_status'>, 'DRAFT' | 'ACTIVE' | 'CLOSED'>>;
type ImageLimit = Assert<Equal<typeof POL.MAX_IMAGE_BYTES, 2_000_000>>;

// @ts-expect-error Unknown enum names must not widen to arbitrary strings.
type UnknownEnum = DomainEnumValue<'unknown_enum'>;
// @ts-expect-error Policy keys are limited to canonical names.
const unknownPolicy: PolicyName = 'UNDEFINED_POLICY';
// @ts-expect-error Consumer code must treat enum tuples as readonly.
ENUMS.member_role.push('OWNER');
// @ts-expect-error Policy defaults are readonly at compile time.
POL.MAX_MEMBERS = 99;
