"""FR-MEM-01 / INV-05 / DB-09 focused invite rotation smoke.
Run after replacing MIGRATION with the immutable filename supplied by A.
"""
from pathlib import Path
import json
import re
import uuid
import unittest
import storage_fixture as fixture

ROOT=Path(__file__).resolve().parents[2]
MIGRATION='20261114130000_manage_project_invite.sql'

class ManageInviteSmoke(fixture.StorageFixture):
  @classmethod
  def setUpClass(cls):
    super().setUpClass()
    if MIGRATION is None:
      raise RuntimeError('Await immutable manage-invite migration filename')
    for name in ['20261114080000_mutation_framework.sql','20261114110000_project_invites.sql',MIGRATION]:
      result=cls.backend.sql((ROOT/'supabase/migrations'/name).read_text())
      if result.returncode: raise RuntimeError(result.stderr)
  def setUp(self):
    super().setUp()
    self.key=str(uuid.uuid4())
  def call(self,user,action,key=None):
    return self.as_user(user,"SELECT public.manage_project_invite('%s','%s','%s');"%(self.projects[0],action,key or self.key))
  def test_FRMEM01_create_replay_rotate_disable(self):
    first=self.call(0,'CREATE');self.assertEqual(first.returncode,0,first.stderr)
    body=json.loads(first.stdout);code=body['data']['code']
    self.assertRegex(code,r'^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$')
    self.assertEqual(body['data']['deep_link'],'weave://join?code='+code)
    self.assertEqual(body['meta']['state_version'],1)
    replay=self.call(0,'CREATE');self.assertEqual(replay.returncode,0,replay.stderr);self.assertEqual(json.loads(replay.stdout),body)
    self.assertEqual(self.ok('SELECT count(*) FROM public.project_invites;'),'1')
    second=self.call(0,'CREATE',str(uuid.uuid4()));self.assertEqual(second.returncode,0,second.stderr)
    self.assertEqual(json.loads(second.stdout)['meta']['state_version'],2)
    self.assertEqual(self.ok('SELECT count(*) FROM public.project_invites WHERE disabled_at IS NULL;'),'1')
    self.assertEqual(self.ok("SELECT count(*) FROM public.project_invites WHERE code='%s' AND disabled_at IS NOT NULL;"%code),'1')
    disabled=self.call(0,'DISABLE',str(uuid.uuid4()));self.assertEqual(disabled.returncode,0,disabled.stderr)
    self.assertEqual(json.loads(disabled.stdout)['data'],{'code':None,'expires_at':None,'deep_link':None})
    self.assertEqual(json.loads(disabled.stdout)['meta']['state_version'],3)
    self.assertEqual(self.ok('SELECT count(*) FROM public.project_invites WHERE disabled_at IS NULL;'),'0')
    self.assertEqual(self.ok('SELECT count(*) FROM public.event_log;'),'3')
  def test_INV07_participant_denied_without_mutation(self):
    result=self.call(2,'CREATE');self.assertNotEqual(result.returncode,0)
    self.assertIn('FORBIDDEN',result.stderr)
    for table in ('project_invites','event_log','idempotency_keys'):
      self.assertEqual(self.ok('SELECT count(*) FROM public.'+table+';'),'0')
    self.assertEqual(self.ok("SELECT state_version FROM public.projects WHERE id='%s';"%self.projects[0]),'0')
  def test_DB09_insert_failure_rolls_back_rotation(self):
    initial=self.call(0,'CREATE');self.assertEqual(initial.returncode,0,initial.stderr)
    self.ok("CREATE FUNCTION public.test_fail_invite() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture invite failure'; END $$; CREATE TRIGGER test_fail_invite BEFORE INSERT ON public.project_invites FOR EACH ROW EXECUTE FUNCTION public.test_fail_invite();")
    result=self.call(0,'CREATE',str(uuid.uuid4()));self.assertNotEqual(result.returncode,0)
    self.assertIn('fixture invite failure',result.stderr)
    self.assertEqual(self.ok('SELECT count(*) FROM public.project_invites WHERE disabled_at IS NULL;'),'1')
    self.assertEqual(self.ok('SELECT count(*) FROM public.event_log;'),'1')
    self.assertEqual(self.ok('SELECT count(*) FROM public.idempotency_keys;'),'1')
    self.assertEqual(self.ok("SELECT state_version FROM public.projects WHERE id='%s';"%self.projects[0]),'1')

if __name__=='__main__': unittest.main(verbosity=2)
