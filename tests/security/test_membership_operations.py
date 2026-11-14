"""Real PostgreSQL membership resolve/join/decision isolation and replay checks."""
import json
import uuid
import unittest
import os
from unittest.mock import patch
import test_membership_foundation as foundation
import test_create_project as base

class MembershipOperationTests(base.fixture.StorageFixture):
  @classmethod
  def setUpClass(cls):
    original = foundation.FoundationTests.docker.__func__
    image = os.getenv('WEAVE_TEST_POSTGRES_IMAGE', 'postgres:17-alpine')
    def docker(cls, *args, **kwargs):
      return original(cls, *(image if arg == 'postgres:17-alpine' else arg for arg in args), **kwargs)
    with patch.object(foundation.FoundationTests, 'docker', classmethod(docker)):
      super().setUpClass()
    result=cls.backend.sql("ALTER TABLE auth.users ADD COLUMN is_anonymous boolean DEFAULT false, ADD COLUMN raw_user_meta_data jsonb DEFAULT '{}'; CREATE TABLE auth.identities(user_id uuid NOT NULL,provider text NOT NULL);")
    if result.returncode: raise RuntimeError(result.stderr)
    for name in ['20261114080000_mutation_framework.sql','20261114090000_resources.sql','20261114100000_plan_storage.sql','20261114110000_project_invites.sql','20261114120000_create_project.sql','20261114130000_manage_project_invite.sql','20261114140000_membership_operations.sql']:
      result=cls.backend.sql((base.ROOT/'supabase/migrations'/name).read_text())
      if result.returncode: raise RuntimeError(result.stderr)
  def setUp(self):
    super().setUp()
    self.ok("INSERT INTO auth.identities VALUES ('%s','google');"%self.users[0])
    self.key=str(uuid.uuid4())
    created=self.call();self.assertEqual(created.returncode,0,created.stderr)
    self.pid=json.loads(created.stdout)['data']['project_id']
    invited=self.acting(0,"SELECT public.manage_project_invite('%s','CREATE','%s');"%(self.pid,uuid.uuid4()))
    self.assertEqual(invited.returncode,0,invited.stderr)
    self.code=json.loads(invited.stdout)['data']['code']
  call_sql = base.CreateProjectTests.call_sql
  acting = base.CreateProjectTests.acting
  call = base.CreateProjectTests.call
  def op(self,user,operation,body,target=None,key=None):
    return self.acting(user,"SELECT public.membership_operation('%s','%s'::jsonb,%s,'%s');"%(operation,json.dumps(body).replace("'","''"),"'%s'"%target if target else 'null',key or uuid.uuid4()))
  def test_membership_join_decision_replay_and_cross_project_denial(self):
    resolved=self.acting(6,"SELECT public.resolve_membership_invite('%s');"%self.code)
    self.assertEqual(resolved.returncode,0,resolved.stderr)
    self.assertEqual(json.loads(resolved.stdout)['data']['project_id'],self.pid)
    body={'code':self.code,'nickname':'Fixture guest','role_tags':[],'availability':{'whole_event':True},'consent_version':'1'}
    key=uuid.uuid4();joined=self.op(6,'JOIN',body,key=key)
    self.assertEqual(joined.returncode,0,joined.stderr)
    member=json.loads(joined.stdout)['data']['member'];self.assertEqual(member['status'],'PENDING')
    self.assertEqual(json.loads(self.op(6,'JOIN',body,key=key).stdout),json.loads(joined.stdout))
    denied=self.op(1,'DECISION',{'decision':'APPROVE','expected_version':member['version']},member['id'])
    self.assertNotEqual(denied.returncode,0);self.assertIn('NOT_FOUND',denied.stderr)
    stale=self.op(0,'DECISION',{'decision':'APPROVE','expected_version':99},member['id'])
    self.assertNotEqual(stale.returncode,0);self.assertIn('VERSION_CONFLICT',stale.stderr)
    approved=self.op(0,'DECISION',{'decision':'APPROVE','expected_version':member['version']},member['id'])
    self.assertEqual(approved.returncode,0,approved.stderr);self.assertEqual(json.loads(approved.stdout)['data']['status'],'APPROVED')
  def test_invalid_invites_consume_attempt_limit(self):
    for _ in range(10):
      result=self.acting(6,"SELECT public.resolve_membership_invite('ZZZZZZ');")
      self.assertEqual(result.returncode,0,result.stderr)
      self.assertEqual(json.loads(result.stdout)['error']['code'],'INVITE_INVALID')
    result=self.acting(6,"SELECT public.resolve_membership_invite('%s');"%self.code)
    self.assertEqual(json.loads(result.stdout)['error']['code'],'RATE_LIMITED')
  def test_profile_permissions_and_unsupported_cascade_fail_closed(self):
    body={'code':self.code,'nickname':'Fixture guest','role_tags':[],'availability':{'whole_event':True},'consent_version':'1'}
    joined=self.op(6,'JOIN',body);self.assertEqual(joined.returncode,0,joined.stderr)
    member=json.loads(joined.stdout)['data']['member']
    pending=self.op(6,'UPDATE',{'nickname':'Changed guest'},member['id'])
    self.assertNotEqual(pending.returncode,0);self.assertIn('FORBIDDEN',pending.stderr)
    approved=self.op(0,'DECISION',{'decision':'APPROVE','expected_version':member['version']},member['id'])
    self.assertEqual(approved.returncode,0,approved.stderr)
    updated=self.op(6,'UPDATE',{'nickname':'Changed guest'},member['id'])
    self.assertEqual(updated.returncode,0,updated.stderr)
    self.assertEqual(json.loads(updated.stdout)['data']['nickname'],'Changed guest')
    denied=self.op(0,'UPDATE',{'nickname':'Owner edited'},member['id'])
    self.assertNotEqual(denied.returncode,0);self.assertIn('FORBIDDEN',denied.stderr)
    self.ok('CREATE TABLE public.assignments(id uuid PRIMARY KEY);')
    blocked=self.op(0,'REMOVE',{},member['id'])
    self.assertNotEqual(blocked.returncode,0);self.assertIn('INVALID_TRANSITION',blocked.stderr)
    self.assertEqual(self.ok("SELECT status FROM public.members WHERE id='%s';"%member['id']),'APPROVED')

if __name__=='__main__':unittest.main(verbosity=2)
