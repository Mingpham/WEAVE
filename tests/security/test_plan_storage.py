"""WP-0 plan storage: FR-PLAN-01/05/06/07 groundwork; INV-06/07, DB-06/11.
Real migrations with minimal auth fixtures, not full FR/AT/Supabase acceptance.
"""
from pathlib import Path
import json
import uuid
import unittest
import storage_fixture as fixture
ROOT = Path(__file__).resolve().parents[2]
class PlanStorageChecks(fixture.StorageFixture):
  @classmethod
  def setUpClass(cls):
    super().setUpClass()
    for p in sorted((ROOT/'supabase/migrations').glob('*.sql')):
      if p.name[:14] <= '20261114070000': continue
      r=cls.backend.sql(p.read_text())
      if r.returncode: raise RuntimeError(r.stderr)
  def test_INV07_plan_storage_present(self):
    self.assertEqual(self.ok("SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('plan_drafts','plan_messages') AND c.relrowsecurity;"),'2')
  def add_plan(self,i):
    draft=str(uuid.uuid4());message=str(uuid.uuid4())
    self.ok("INSERT INTO public.plan_drafts(id,project_id,draft) VALUES ('%s','%s','{}');"%(draft,self.projects[i]))
    self.ok("INSERT INTO public.plan_messages(id,project_id,draft_id,role,text) VALUES ('%s','%s','%s','ORGANIZER','Fixture message');"%(message,self.projects[i],draft))
    return draft,message
  def test_INV07_owner_only_exact_ids_removal_and_softdelete(self):
    ids=[self.add_plan(i) for i in (0,1)]
    for user,index in [(0,0),(1,1),(2,None),(3,None),(4,None),(5,None),(6,None)]:
      for table,col in [('plan_drafts',0),('plan_messages',1)]:
        r=self.as_user(user,"SELECT coalesce(json_agg(id),'[]'::json) FROM public."+table+';')
        self.assertEqual(r.returncode,0,r.stderr);self.assertEqual(json.loads(r.stdout.strip()),[] if index is None else [ids[index][col]])
    self.ok("UPDATE public.members SET role='PARTICIPANT',status='REMOVED' WHERE id='%s';"%self.members[0])
    for table in ('plan_drafts','plan_messages'):
      r=self.as_user(0,'SELECT count(*) FROM public.'+table+';');self.assertEqual(r.returncode,0,r.stderr);self.assertEqual(r.stdout.strip(),'0')
    self.ok("UPDATE public.members SET role='OWNER',status='APPROVED' WHERE id='%s';"%self.members[0])
    self.ok("UPDATE public.projects SET deleted_at=now() WHERE id='%s';"%self.projects[0])
    for table in ('plan_drafts','plan_messages'):
      r=self.as_user(0,'SELECT count(*) FROM public.'+table+';');self.assertEqual(r.returncode,0,r.stderr);self.assertEqual(r.stdout.strip(),'0')
  def test_FRPLAN01_unique_project_defaults_and_bounds(self):
    draft,_=self.add_plan(0)
    self.assertEqual(self.ok("SELECT revision||'|'||status::text||'|'||ai_turns_used FROM public.plan_drafts WHERE id='%s';"%draft),'1|EDITING|0')
    for sql,err in [("INSERT INTO public.plan_drafts(project_id,draft) VALUES ('%s','{}');"%self.projects[0],'unique constraint'),("UPDATE public.plan_drafts SET revision=0;",'check constraint'),("UPDATE public.plan_drafts SET ai_turns_used=-1;",'check constraint')]:
      r=self.sql(sql);self.assertNotEqual(r.returncode,0);self.assertIn(err,r.stderr)
  def test_DB11_message_scoped_fk_roles_and_delete_restriction(self):
    draft,message=self.add_plan(0)
    for role in ('AI','SYSTEM'):
      self.ok("INSERT INTO public.plan_messages(project_id,draft_id,role,text) VALUES ('%s','%s','%s','Fixture');"%(self.projects[0],draft,role))
    for project,role,err in [(self.projects[1],'AI','foreign key constraint'),(self.projects[0],'USER','check constraint')]:
      r=self.sql("INSERT INTO public.plan_messages(project_id,draft_id,role,text) VALUES ('%s','%s','%s','Fixture');"%(project,draft,role))
      self.assertNotEqual(r.returncode,0);self.assertIn(err,r.stderr)
    r=self.sql("DELETE FROM public.plan_drafts WHERE id='%s';"%draft);self.assertNotEqual(r.returncode,0);self.assertIn('foreign key constraint',r.stderr)
  def test_DB06_direct_writes_and_append_only_privileges(self):
    self.add_plan(0)
    for role in ('anon','authenticated','service_role'):
      for table in ('plan_drafts','plan_messages'):
        for priv in ('INSERT','UPDATE','DELETE','TRUNCATE'):
          self.assertEqual(self.ok("SELECT has_table_privilege('%s','public.%s','%s');"%(role,table,priv)),'f')
    for table in ('plan_drafts','plan_messages'):
      r=self.as_user(0,'SELECT count(*) FROM public.'+table+';');self.assertEqual(r.returncode,0,r.stderr);self.assertEqual(r.stdout.strip(),'1')
      r=self.sql('SET ROLE anon; SELECT * FROM public.'+table+';');self.assertNotEqual(r.returncode,0);self.assertIn('permission denied',r.stderr)
      self.ok('GRANT INSERT,UPDATE,DELETE ON public.'+table+' TO authenticated;')
      for q,tag in [('UPDATE public.'+table+' SET id=id RETURNING id;','UPDATE 0'),('DELETE FROM public.'+table+' RETURNING id;','DELETE 0')]:
        r=self.as_user(0,q);self.assertEqual(r.returncode,0,r.stderr);self.assertEqual(r.stdout.strip(),'')
    r=self.as_user(0,"INSERT INTO public.plan_messages(project_id,draft_id,role,text) SELECT project_id,id,'AI','Forbidden' FROM public.plan_drafts;");self.assertNotEqual(r.returncode,0);self.assertIn('row-level security',r.stderr)
    r=self.as_user(0,"INSERT INTO public.plan_drafts(project_id,draft) VALUES ('%s','{}');"%self.projects[1]);self.assertNotEqual(r.returncode,0);self.assertIn('row-level security',r.stderr)
if __name__ == '__main__':
  unittest.main(verbosity=2)
