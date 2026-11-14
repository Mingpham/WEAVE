import { describe, expect, it } from 'vitest';
import { InviteActionRequest, JoinInviteRequest, ResolveInviteRequest } from '../src/invite-join.ts';
const join = { code:'ABC234', nickname:'Guest', role_tags:[], availability:{whole_event:true}, consent_version:'v1' };
describe('FR-MEM-01/02/03 invite and join contracts', () => {
  it('accepts an invite and consented profile', () => {
    expect(InviteActionRequest.safeParse({action:'CREATE'}).success).toBe(true);
    expect(JoinInviteRequest.safeParse(join).success).toBe(true);
  });
  it('rejects malformed codes, impersonation and invalid availability', () => {
    expect(ResolveInviteRequest.safeParse({code:'0O1IL2'}).success).toBe(false);
    expect(JoinInviteRequest.safeParse({...join,member_id:'forged'}).success).toBe(false);
    expect(JoinInviteRequest.safeParse({...join,availability:{windows:[]}}).success).toBe(false);
    expect(JoinInviteRequest.safeParse({...join,consent_version:''}).success).toBe(false);
  });
});
