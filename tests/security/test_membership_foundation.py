"""WP-0-DB foundation regression tests on isolated PostgreSQL 17.

Minimal auth.users/auth.uid fixtures exercise SQL policies with session claims;
this is not the Supabase/PostgREST JWT acceptance suite. No hosted access.
FR-EVT-01, FR-MEM-02/04, FR-RES-06 groundwork; INV-01/07, DB-11.
Run: python3 tests/security/test_membership_foundation.py -v
CODEX-B review is required before migration PR submission.
"""
from pathlib import Path
import subprocess
import json
import time
import unittest
import uuid

ROOT = Path(__file__).resolve().parents[2]
MIGRATION = ROOT / 'supabase/migrations/20261114060000_membership_foundation.sql'

class FoundationTests(unittest.TestCase):
  @classmethod
  def docker(cls, *args, **kw):
    return subprocess.run(['docker', '--context', 'default', *args], text=True, capture_output=True, timeout=60, **kw)
  @classmethod
  def sql(cls, text, db='postgres'):
    return cls.docker('exec', '-i', cls.container, 'psql', '-XAt', '-h', '127.0.0.1', '-U', 'postgres', '-d', db, '-v', 'ON_ERROR_STOP=1', input=text)
  @classmethod
  def setUpClass(cls):
    cls.container = 'weave-foundation-' + uuid.uuid4().hex[:12]
    r = cls.docker('run', '-d', '--pull=never', '--network=none', '--name', cls.container, '--tmpfs', '/var/lib/postgresql/data', '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', 'postgres:17-alpine')
    if r.returncode: raise RuntimeError(r.stderr)
    cls.addClassCleanup(cls.docker, 'rm', '-f', cls.container)
    for _ in range(100):
      if cls.sql('SELECT 1;').returncode == 0: break
      time.sleep(.2)
    else: raise RuntimeError('Postgres not ready')
    boot = '''CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      GRANT USAGE ON SCHEMA auth TO authenticated; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;'''
    sql = boot + (ROOT/'supabase/migrations/20261114050000_domain_enums.sql').read_text()
    if MIGRATION.exists(): sql += MIGRATION.read_text()
    r = cls.sql(sql)
    if r.returncode: raise RuntimeError(r.stderr)
  def setUp(self):
    self.db = 'fixture_' + uuid.uuid4().hex[:10]
    r=self.sql('CREATE DATABASE '+self.db+' TEMPLATE postgres;')
    self.assertEqual(r.returncode,0,r.stderr)
    self.users=[str(uuid.uuid4()) for _ in range(7)]
    self.projects=[str(uuid.uuid4()) for _ in range(2)]
    self.members=[str(uuid.uuid4()) for _ in range(6)]
    self.areas=[str(uuid.uuid4()) for _ in range(2)]
    if not MIGRATION.exists(): return
    for uid in self.users: self.ok("INSERT INTO auth.users VALUES ('%s');"%uid)
    for i,p in enumerate(self.projects):
      self.ok("INSERT INTO public.projects(id,owner_user_id,title,brief,starts_at,ends_at,timezone,expected_team_size,settings) VALUES ('%s','%s','Fixture event',repeat('x',40),'2026-11-14T00:00Z','2026-11-14T01:00Z','UTC',5,'{}');"%(p,self.users[i]))
      self.ok("INSERT INTO public.areas(id,project_id,name) VALUES ('%s','%s','Main');"%(self.areas[i],p))
    # owners A/B, approved A/B, pending A, removed A; user 6 is unrelated.
    for i,(user,proj,role,status) in enumerate([(0,0,'OWNER','APPROVED'),(1,1,'OWNER','APPROVED'),(2,0,'PARTICIPANT','APPROVED'),(3,1,'PARTICIPANT','APPROVED'),(4,0,'PARTICIPANT','PENDING'),(5,0,'PARTICIPANT','REMOVED')]):
      self.ok("INSERT INTO public.members(id,project_id,user_id,role,status,nickname,availability) VALUES ('%s','%s','%s','%s','%s','Member%s','{\"whole_event\":true}');"%(self.members[i],self.projects[proj],self.users[user],role,status,i))
  def tearDown(self):
    self.sql('DROP DATABASE '+self.db+';')
  def ok(self,sql):
    r=self.sql(sql,self.db); self.assertEqual(r.returncode,0,r.stderr); return r.stdout.strip()
  def as_user(self,i,sql):
    return self.sql("SET ROLE authenticated; SET request.jwt.claim.sub='%s';\n%s"%(self.users[i],sql),self.db)
  def count(self,i,table):
    r=self.as_user(i,'SELECT count(*) FROM public.'+table+';'); self.assertEqual(r.returncode,0,r.stderr); return int(r.stdout.strip().splitlines()[-1])
  def test_CODEXB_foundation_sql_handoff(self):
    before=self.ok('SELECT count(*) FROM public.projects;')
    self.ok((ROOT/'tests/security/foundation_security.sql').read_text())
    self.assertEqual(self.ok('SELECT count(*) FROM public.projects;'),before)
  def test_WP0_three_tables_have_rls(self):
    self.assertEqual(self.ok("SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('projects','members','areas') AND c.relrowsecurity;"),'3')
  def test_INV07_owner_and_member_positive_reads(self):
    for i in (0,2):
      self.assertEqual(self.count(i,'projects'),1); self.assertEqual(self.count(i,'areas'),1)
    self.assertEqual(self.count(0,'members'),4); self.assertEqual(self.count(2,'members'),2)
  def test_AT05_pending_self_only(self):
    self.assertEqual(self.count(4,'projects'),0); self.assertEqual(self.count(4,'areas'),0); self.assertEqual(self.count(4,'members'),1)
  def test_AT06_cross_project_and_unrelated(self):
    for user,own,other,member_ids in [(2,0,1,[self.members[0],self.members[2]]),(3,1,0,[self.members[1],self.members[3]])]:
      for table,expected in [('projects',[self.projects[own]]),('areas',[self.areas[own]]),('members',member_ids)]:
        r=self.as_user(user,"SELECT coalesce(json_agg(id ORDER BY id),'[]'::json) FROM public."+table+';')
        self.assertEqual(r.returncode,0,r.stderr)
        self.assertEqual(sorted(json.loads(r.stdout.strip().splitlines()[-1])),sorted(expected))
        key='id' if table=='projects' else 'project_id'
        r=self.as_user(user,"SELECT count(*) FROM public.%s WHERE %s='%s';"%(table,key,self.projects[other]))
        self.assertEqual(r.returncode,0,r.stderr); self.assertEqual(r.stdout.strip().splitlines()[-1],'0')
    for table in ('projects','members','areas'): self.assertEqual(self.count(6,table),0)
  def test_AT07_removed_self_status_only(self):
    self.assertEqual(self.count(5,'projects'),0); self.assertEqual(self.count(5,'areas'),0); self.assertEqual(self.count(5,'members'),1)
  def test_INV07_soft_delete_hides_every_branch(self):
    self.ok("UPDATE public.projects SET deleted_at=now() WHERE id='%s';"%self.projects[0])
    for i in (0,2,4,5):
      for table in ('projects','members','areas'): self.assertEqual(self.count(i,table),0)
  def test_DB11_cross_project_area_and_reviewer_rejected(self):
    self.ok("UPDATE public.members SET current_area_id='%s',decided_by='%s' WHERE id='%s';"%(self.areas[0],self.members[0],self.members[2]))
    for col,val in [('current_area_id',self.areas[1]),('decided_by',self.members[1])]:
      r=self.sql("UPDATE public.members SET %s='%s' WHERE id='%s';"%(col,val,self.members[2]),self.db)
      self.assertNotEqual(r.returncode,0); self.assertIn('foreign key constraint',r.stderr)
  def test_FRMEM02_active_nickname_normalization(self):
    r=self.sql("UPDATE public.members SET nickname=' member0 ' WHERE id='%s';"%self.members[2],self.db)
    self.assertNotEqual(r.returncode,0); self.assertIn('unique constraint',r.stderr)
    self.ok("UPDATE public.members SET nickname=' member0 ' WHERE id='%s';"%self.members[5])
  def test_FRRES06_area_normalization(self):
    r=self.sql("INSERT INTO public.areas(project_id,name) VALUES ('%s',' MAIN ');"%self.projects[0],self.db)
    self.assertNotEqual(r.returncode,0); self.assertIn('unique constraint',r.stderr)
  def test_INV01_application_writes_denied_even_with_grants(self):
    self.ok('GRANT INSERT,UPDATE,DELETE ON public.projects,public.members,public.areas TO authenticated;')
    for table in ('projects','members','areas'):
      r=self.as_user(0,'DELETE FROM public.'+table+' RETURNING id;'); self.assertEqual(r.returncode,0,r.stderr); self.assertIn('DELETE 0',r.stdout)
      r=self.as_user(0,'UPDATE public.'+table+' SET id=id RETURNING id;'); self.assertEqual(r.returncode,0,r.stderr); self.assertIn('UPDATE 0',r.stdout)
    r=self.as_user(0,"INSERT INTO public.areas(project_id,name) VALUES ('%s','Other');"%self.projects[0])
    self.assertNotEqual(r.returncode,0); self.assertIn('row-level security',r.stderr)
  def test_WP0_normalized_columns_not_null(self):
    self.assertEqual(self.ok("SELECT count(*) FROM pg_attribute WHERE attrelid IN ('public.members'::regclass,'public.areas'::regclass) AND attname IN ('nickname_norm','name_norm') AND attnotnull;"),'2')
  def test_INV07_helpers_definer_and_search_path(self):
    self.assertEqual(self.ok("SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='weave_private' AND p.prosecdef AND p.provolatile='s' AND array_to_string(p.proconfig,',') LIKE 'search_path=%';"),'3')
    r=self.sql('SET ROLE anon; SELECT weave_private.is_member(null);',self.db)
    self.assertNotEqual(r.returncode,0); self.assertIn('permission denied',r.stderr)
  def test_INV07_anon_cannot_read(self):
    for table in ('projects','members','areas'):
      r=self.sql('SET ROLE anon; SELECT * FROM public.'+table+';',self.db)
      self.assertNotEqual(r.returncode,0); self.assertIn('permission denied',r.stderr)
  def test_INV07_authenticated_without_uid_sees_nothing(self):
    for table in ('projects','members','areas'):
      r=self.sql('SET ROLE authenticated; SELECT count(*) FROM public.'+table+';',self.db)
      self.assertEqual(r.returncode,0,r.stderr); self.assertEqual(r.stdout.strip().splitlines()[-1],'0')
  def test_INV07_helper_schema_cannot_be_modified(self):
    r=self.as_user(0,"CREATE FUNCTION weave_private.bad() RETURNS bool LANGUAGE sql AS 'SELECT true';")
    self.assertNotEqual(r.returncode,0); self.assertIn('permission denied',r.stderr)
  def test_INV01_no_write_grants_or_policies(self):
    self.assertEqual(self.ok("SELECT count(*) FROM pg_policy WHERE polrelid IN ('public.projects'::regclass,'public.members'::regclass,'public.areas'::regclass) AND polcmd <> 'r';"),'0')
    for role in ('anon','authenticated','service_role'):
      for table in ('projects','members','areas'):
        for privilege in ('INSERT','UPDATE','DELETE','TRUNCATE'):
          self.assertEqual(self.ok("SELECT has_table_privilege('%s','public.%s','%s');"%(role,table,privilege)),'f')
  def test_FRMEM04_one_owner_per_project(self):
    r=self.sql("UPDATE public.members SET role='OWNER' WHERE id='%s';"%self.members[2],self.db)
    self.assertNotEqual(r.returncode,0); self.assertIn('unique constraint',r.stderr)
  def test_FREVT01_time_constraint_and_defaults(self):
    r=self.sql("UPDATE public.projects SET ends_at=starts_at WHERE id='%s';"%self.projects[0],self.db)
    self.assertNotEqual(r.returncode,0); self.assertIn('check constraint',r.stderr)
    self.assertEqual(self.ok("SELECT status::text||'|'||state_version||'|'||currency FROM public.projects WHERE id='%s';"%self.projects[0]),'DRAFT|0|VND')

if __name__=='__main__': unittest.main(verbosity=2)
