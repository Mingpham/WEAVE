"""FR-AUTH-03/FR-EVT-01/03, INV-05/07, DB-09 create-project RPC.
Real PostgreSQL migrations; minimal auth fixture, not full Supabase Auth or app acceptance.
"""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import json
import unittest
import uuid
import storage_fixture as fixture
import test_event_reference_races as races

ROOT = Path(__file__).resolve().parents[2]
REQUEST = {'title':'Fixture event','brief':'x'*40,'starts_at':'2026-11-14T00:00:00Z',
           'ends_at':'2026-11-15T00:00:00Z','timezone':'UTC','expected_team_size':5}

class CreateProjectTests(fixture.StorageFixture):
  @classmethod
  def setUpClass(cls):
    super().setUpClass()
    boot="ALTER TABLE auth.users ADD COLUMN is_anonymous boolean DEFAULT false, ADD COLUMN raw_user_meta_data jsonb DEFAULT '{}'; CREATE TABLE auth.identities(user_id uuid NOT NULL,provider text NOT NULL);"
    result=cls.backend.sql(boot)
    if result.returncode: raise RuntimeError(result.stderr)
    for name in ['20261114080000_mutation_framework.sql','20261114090000_resources.sql','20261114100000_plan_storage.sql','20261114110000_project_invites.sql','20261114120000_create_project.sql']:
      result=cls.backend.sql((ROOT/'supabase/migrations'/name).read_text())
      if result.returncode: raise RuntimeError(result.stderr)
  def setUp(self):
    super().setUp()
    self.ok("INSERT INTO auth.identities VALUES ('%s','google');"%self.users[0])
    self.key=str(uuid.uuid4())
  def call_sql(self,request=None,key=None):
    data=json.dumps(REQUEST if request is None else request,separators=(',',':')).replace("'","''")
    return "SELECT public.create_project('%s'::jsonb,'%s'::uuid);"%(data,key or self.key)
  def acting(self,user,sql):
    return self.sql("SET ROLE authenticated; SET request.jwt.claim.sub='%s'; %s"%(self.users[user],sql))
  def call(self,user=0,request=None,key=None):
    return self.acting(user,self.call_sql(request,key))
  def assert_denied_unchanged(self,result,code):
    self.assertNotEqual(result.returncode,0);self.assertIn(code,result.stderr)
    for table,count in [('projects','2'),('members','6'),('plan_drafts','0'),('event_log','0'),('idempotency_keys','0')]:
      self.assertEqual(self.ok('SELECT count(*) FROM public.'+table+';'),count)
  def test_FR_AUTH03_google_identity_not_metadata_controls_creation(self):
    self.ok("UPDATE auth.users SET is_anonymous=true,raw_user_meta_data='{\"provider\":\"google\"}' WHERE id='%s';"%self.users[0])
    self.assert_denied_unchanged(self.call(),'FORBIDDEN')
    self.ok("UPDATE auth.users SET is_anonymous=false WHERE id='%s'; DELETE FROM auth.identities WHERE user_id='%s';"%(self.users[0],self.users[0]))
    self.assert_denied_unchanged(self.call(),'FORBIDDEN')
    self.ok("INSERT INTO auth.identities VALUES ('%s','github');"%self.users[0])
    self.assert_denied_unchanged(self.call(),'FORBIDDEN')
    self.ok("INSERT INTO auth.identities VALUES ('%s','google');"%self.users[0])
    result=self.call();self.assertEqual(result.returncode,0,result.stderr)
  def test_FR_EVT01_atomic_create_and_replay(self):
    result=self.call();self.assertEqual(result.returncode,0,result.stderr)
    body=json.loads(result.stdout);data=body['data'];self.assertEqual(body['meta']['state_version'],1)
    self.assertEqual(self.ok("SELECT count(*) FROM public.projects p JOIN public.members m ON m.id='%s' AND m.project_id=p.id JOIN public.plan_drafts d ON d.id='%s' AND d.project_id=p.id JOIN public.event_log e ON e.project_id=p.id AND e.actor_member_id=m.id WHERE p.id='%s' AND p.owner_user_id='%s' AND p.status='DRAFT' AND p.state_version=1 AND m.user_id=p.owner_user_id AND m.role='OWNER' AND m.status='APPROVED' AND d.status='EDITING' AND e.state_version=1 AND e.event_type='PROJECT_CREATED';"%(data['owner_member_id'],data['plan_draft_id'],data['project_id'],self.users[0])),'1')
    replay=self.call();self.assertEqual(replay.returncode,0,replay.stderr);self.assertEqual(json.loads(replay.stdout),body)
    altered={**REQUEST,'title':'Changed fixture'};conflict=self.call(request=altered);self.assertNotEqual(conflict.returncode,0);self.assertIn('IDEMPOTENCY_KEY_REUSED',conflict.stderr)
    self.assertEqual(self.ok('SELECT count(*) FROM public.idempotency_keys;'),'1')
    self.ok("UPDATE public.projects SET deleted_at=now() WHERE id='%s';"%data['project_id'])
    denied=self.call();self.assertNotEqual(denied.returncode,0);self.assertIn('NOT_FOUND',denied.stderr)
  def test_FR_EVT01_invalid_inputs_leave_no_mutation(self):
    for patch in [{'unexpected':True},{'title':'ab'},{'brief':'short'},{'expected_team_size':51},{'expected_team_size':1},{'expected_team_size':2.5},{'timezone':'Invalid/Place'},{'currency':''},{'starts_at':'not-a-date'},{'ends_at':'2026-11-18T00:00:00Z'}]:
      with self.subTest(patch=patch):
        self.assert_denied_unchanged(self.call(request={**REQUEST,**patch}),'VALIDATION_FAILED')
  def test_DB09_late_failure_rolls_back_all_rows(self):
    self.ok("CREATE FUNCTION public.test_fail_plan() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture failure'; END $$; CREATE TRIGGER test_fail_plan BEFORE INSERT ON public.plan_drafts FOR EACH ROW EXECUTE FUNCTION public.test_fail_plan();")
    self.assert_denied_unchanged(self.call(),'fixture failure')
  def test_INV05_concurrent_replay_single_project(self):
    with ThreadPoolExecutor(max_workers=2) as pool:
      results=list(pool.map(lambda _:self.call(),range(2)))
    for result in results:self.assertEqual(result.returncode,0,result.stderr)
    self.assertEqual(json.loads(results[0].stdout),json.loads(results[1].stdout))
    for table,count in [('projects','3'),('members','7'),('plan_drafts','1'),('event_log','1'),('idempotency_keys','1')]:self.assertEqual(self.ok('SELECT count(*) FROM public.'+table+';'),count)
  def test_INV07_execute_grants(self):
    for role,allowed in [('anon','f'),('authenticated','t'),('service_role','f')]:
      self.assertEqual(self.ok("SELECT has_function_privilege('%s','public.create_project(jsonb,uuid)','EXECUTE');"%role),allowed)

if __name__=='__main__': unittest.main(verbosity=2)
