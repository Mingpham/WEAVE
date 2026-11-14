"""WP-0 / FR-MEM-01 groundwork; INV-07, DB-11: project_invites storage.

Real migrations and fixture auth, not invite RPC/resolve/join/rate-limit/TTL acceptance.
"""
from pathlib import Path
import json
import unittest
import uuid
import storage_fixture as fixture

ROOT = Path(__file__).resolve().parents[2]
MIGRATIONS = ['20261114080000_mutation_framework.sql', '20261114090000_resources.sql',
              '20261114100000_plan_storage.sql', '20261114110000_project_invites.sql']


class ProjectInviteTests(fixture.StorageFixture):
  @classmethod
  def setUpClass(cls):
    super().setUpClass()
    for name in MIGRATIONS:
      result = cls.backend.sql((ROOT / 'supabase/migrations' / name).read_text())
      if result.returncode:
        raise RuntimeError(result.stderr)

  def invite_sql(self, project=0, code='ABCD23', creator=None, disabled=False):
    identity = str(uuid.uuid4())
    creator_sql = "'%s'::uuid" % creator if creator else 'NULL'
    disabled_sql = 'now()' if disabled else 'NULL'
    # Controlled local values; quote string literals so malformed-code cases
    # cannot change the statement being tested.
    code_sql = "'" + code.replace("'", "''") + "'"
    return identity, ("INSERT INTO public.project_invites(id,project_id,code,expires_at,disabled_at,created_by) "
                      "VALUES ('%s','%s',%s,now()+interval '1 hour',%s,%s) RETURNING id;" %
                      (identity, self.projects[project], code_sql, disabled_sql, creator_sql))

  def add_invite(self, **kwargs):
    identity, sql = self.invite_sql(**kwargs)
    self.assertEqual(self.ok(sql), identity)
    return identity

  def test_INV07_owner_only_exact_rows_cross_project_and_revocation(self):
    ids = [self.add_invite(project=0, creator=self.members[0]),
           self.add_invite(project=1, code='EFGH45', creator=self.members[1])]
    for user, expected in [(0,[ids[0]]),(1,[ids[1]]),(2,[]),(3,[]),(4,[]),(5,[]),(6,[])]:
      result = self.as_user(user,"SELECT coalesce(json_agg(id ORDER BY id),'[]'::json) FROM public.project_invites;")
      self.assertEqual(result.returncode,0,result.stderr)
      self.assertEqual(json.loads(result.stdout),expected)
    for user, other in [(0,1),(1,0)]:
      result=self.as_user(user,"SELECT count(*) FROM public.project_invites WHERE project_id='%s';"%self.projects[other])
      self.assertEqual(result.returncode,0,result.stderr);self.assertEqual(result.stdout.strip(),'0')
    self.ok("UPDATE public.members SET role='PARTICIPANT',status='REMOVED' WHERE id='%s';"%self.members[0])
    result=self.as_user(0,'SELECT count(*) FROM public.project_invites;')
    self.assertEqual(result.returncode,0,result.stderr);self.assertEqual(result.stdout.strip(),'0')
    self.ok("UPDATE public.members SET role='OWNER',status='APPROVED' WHERE id='%s';"%self.members[0])
    self.ok("UPDATE public.projects SET deleted_at=now() WHERE id='%s';"%self.projects[0])
    result=self.as_user(0,'SELECT count(*) FROM public.project_invites;')
    self.assertEqual(result.returncode,0,result.stderr);self.assertEqual(result.stdout.strip(),'0')
    self.assertEqual(self.ok('SELECT count(*) FROM public.project_invites;'),'2')

  def test_FRMEM01_code_format_and_required_fields(self):
    self.add_invite(code='ABCDEF');self.add_invite(code='234567');self.add_invite(code='89MNPQ')
    for invalid in ('ABCDE','ABCDEFG','abcdef','ABCD01','ABCDO2','ABCDI2','ABCDL2','AB CD2','ABCD_2','ABCD23\n','ÄBCD23',''):
      with self.subTest(code=repr(invalid)):
        _, sql=self.invite_sql(code=invalid)
        result=self.sql(sql)
        self.assertNotEqual(result.returncode,0);self.assertIn('23514',result.stderr)
    for field in ('code','expires_at'):
      result=self.sql('UPDATE public.project_invites SET '+field+'=NULL;')
      self.assertNotEqual(result.returncode,0);self.assertIn('23502',result.stderr)

  def test_FRMEM01_partial_uniqueness_and_disabled_reuse(self):
    first=self.add_invite()
    _,sql=self.invite_sql(project=1)
    result=self.sql(sql)
    self.assertNotEqual(result.returncode,0);self.assertIn('23505',result.stderr)
    self.ok("UPDATE public.project_invites SET disabled_at=now() WHERE id='%s';"%first)
    self.add_invite(project=1)
    self.add_invite(project=0,disabled=True)
    # This storage index does not decide expiry/rotation. A past-but-enabled
    # code remains reserved; more than one distinct code/project is allowed.
    self.ok("UPDATE public.project_invites SET expires_at=now()-interval '1 hour' WHERE project_id='%s' AND disabled_at IS NULL;"%self.projects[1])
    _,sql=self.invite_sql(project=0)
    result=self.sql(sql)
    self.assertNotEqual(result.returncode,0);self.assertIn('23505',result.stderr)
    self.add_invite(code='EFGH45');self.add_invite(code='JKMN67')
    self.assertEqual(self.ok('SELECT count(*) FROM public.project_invites;'),'5')

  def test_DB11_creator_fk_null_historical_and_project_scope(self):
    self.add_invite(creator=None)
    for member,code in [(self.members[4],'EFGH45'),(self.members[5],'JKMN67')]:
      self.add_invite(creator=member,code=code)
    for member in (self.members[1],str(uuid.uuid4())):
      _,sql=self.invite_sql(code='PQRS89',creator=member)
      result=self.sql(sql)
      self.assertNotEqual(result.returncode,0);self.assertIn('23503',result.stderr)
    result=self.sql("DELETE FROM public.members WHERE id='%s';"%self.members[5])
    self.assertNotEqual(result.returncode,0);self.assertIn('23503',result.stderr)
    self.ok("UPDATE public.members SET status='LEFT' WHERE id='%s';"%self.members[4])
    self.assertEqual(self.ok('SELECT count(*) FROM public.project_invites;'),'3')

  def test_INV07_rls_defaults_and_direct_write_grants(self):
    identity=self.add_invite()
    self.assertEqual(self.ok("SELECT created_at IS NOT NULL AND disabled_at IS NULL AND created_by IS NULL FROM public.project_invites WHERE id='%s';"%identity),'t')
    self.assertEqual(self.ok("SELECT relrowsecurity FROM pg_class WHERE oid='public.project_invites'::regclass;"),'t')
    self.assertEqual(self.ok("SELECT count(*) FROM pg_policy WHERE polrelid='public.project_invites'::regclass AND polcmd<>'r';"),'0')
    for role in ('anon','authenticated','service_role'):
      for privilege in ('INSERT','UPDATE','DELETE','TRUNCATE'):
        self.assertEqual(self.ok("SELECT has_table_privilege('%s','public.project_invites','%s');"%(role,privilege)),'f')
    self.assertEqual(self.ok("SELECT has_table_privilege('service_role','public.project_invites','SELECT');"),'t')
    result=self.sql('SET ROLE anon; SELECT * FROM public.project_invites;')
    self.assertNotEqual(result.returncode,0);self.assertIn('42501',result.stderr)
    result=self.as_user(0,'SELECT id FROM public.project_invites;')
    self.assertEqual(result.returncode,0,result.stderr);self.assertEqual(result.stdout.strip(),identity)
    self.ok('GRANT INSERT,UPDATE,DELETE ON public.project_invites TO authenticated;')
    for sql in ('UPDATE public.project_invites SET disabled_at=now() RETURNING id;', 'DELETE FROM public.project_invites RETURNING id;'):
      result=self.as_user(0,sql)
      self.assertEqual(result.returncode,0,result.stderr);self.assertEqual(result.stdout.strip(),'')
    _,sql=self.invite_sql(code='PQRS89')
    result=self.as_user(0,sql)
    self.assertNotEqual(result.returncode,0);self.assertIn('42501',result.stderr)
    self.assertEqual(self.ok('SELECT count(*) FROM public.project_invites;'),'1')


if __name__ == '__main__':
  unittest.main(verbosity=2)
