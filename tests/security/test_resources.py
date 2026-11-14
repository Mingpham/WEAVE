"""FR-RES-01/03/06 groundwork, INV-01/07, DB-11: real resource storage.
No resource RPC, projection inference or full Supabase/AT completion claimed.
"""
from pathlib import Path
import json
import unittest
import uuid
import storage_fixture as fixture

ROOT = Path(__file__).resolve().parents[2]

class ResourceChecks(fixture.StorageFixture):
  @classmethod
  def setUpClass(cls):
    super().setUpClass()
    for name in ['20261114080000_mutation_framework.sql','20261114090000_resources.sql']:
      p=ROOT/'supabase/migrations'/name
      r=cls.backend.sql(p.read_text())
      if r.returncode: raise RuntimeError(r.stderr)
  def add_resource(self,project=0,kind='ITEM',quantity='NULL',area=None,custodian=None):
    resource=str(uuid.uuid4())
    area_sql="'%s'::uuid"%area if area else 'NULL'
    cust_sql="'%s'::uuid"%custodian if custodian else 'NULL'
    self.ok("INSERT INTO public.resources(id,project_id,name,category,kind,quantity,inventory_state,area_id,custodian_member_id) VALUES ('%s','%s','Fixture resource','fixture','%s',%s,'UNVERIFIED',%s,%s);"%(resource,self.projects[project],kind,quantity,area_sql,cust_sql))
    return resource
  def test_INV07_resources_rls_present(self):
    self.assertEqual(self.ok("SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='resources' AND c.relrowsecurity;"),'1')
  def test_INV07_resource_roles_exact_ids_removal_softdelete(self):
    ids=[self.add_resource(),self.add_resource(),self.add_resource(project=1)]
    for user,expected in [(0,ids[:2]),(2,ids[:2]),(1,ids[2:]),(3,ids[2:]),(4,[]),(5,[]),(6,[])]:
      r=self.as_user(user,"SELECT coalesce(json_agg(id ORDER BY id),'[]'::json) FROM public.resources;")
      self.assertEqual(r.returncode,0,r.stderr);self.assertEqual(sorted(json.loads(r.stdout.strip())),sorted(expected))
    for user,other in [(0,1),(2,1),(1,0),(3,0)]:
      r=self.as_user(user,"SELECT count(*) FROM public.resources WHERE project_id='%s';"%self.projects[other])
      self.assertEqual(r.returncode,0,r.stderr);self.assertEqual(r.stdout.strip(),'0')
    self.ok("UPDATE public.members SET status='REMOVED' WHERE id='%s';"%self.members[2])
    for user in (2,):
      r=self.as_user(user,'SELECT count(*) FROM public.resources;');self.assertEqual(r.returncode,0,r.stderr);self.assertEqual(r.stdout.strip(),'0')
    self.ok("UPDATE public.projects SET deleted_at=now() WHERE id='%s';"%self.projects[0])
    r=self.as_user(0,'SELECT count(*) FROM public.resources;');self.assertEqual(r.returncode,0,r.stderr);self.assertEqual(r.stdout.strip(),'0')
  def test_FRRES01_resource_defaults_and_quantity(self):
    item=self.add_resource();unknown=self.add_resource(kind='SUPPLY');zero=self.add_resource(kind='SUPPLY',quantity='0')
    self.assertEqual(self.ok("SELECT condition::text||'|'||version FROM public.resources WHERE id='%s';"%item),'UNKNOWN|1')
    for mutation in ["UPDATE public.resources SET quantity=1 WHERE id='%s';"%item,"UPDATE public.resources SET quantity=-1 WHERE id='%s';"%unknown,"UPDATE public.resources SET version=0 WHERE id='%s';"%zero]:
      r=self.sql(mutation);self.assertNotEqual(r.returncode,0);self.assertIn('check constraint',r.stderr)
  def test_FRRES01_resource_required_labels_and_duplicate_names(self):
    self.add_resource();self.add_resource()
    self.assertEqual(self.ok('SELECT count(*) FROM public.resources;'),'2')
    for col,value in [('name',"''"),('category',"'  '"),('version','0')]:
      r=self.sql('UPDATE public.resources SET '+col+'='+value+';')
      self.assertNotEqual(r.returncode,0);self.assertIn('23514',r.stderr)

  def test_DB11_resource_project_fks(self):
    resource=self.add_resource(area=self.areas[0],custodian=self.members[0])
    # Historical same-project custodians remain valid references.
    self.ok("UPDATE public.resources SET custodian_member_id='%s' WHERE id='%s';"%(self.members[5],resource))
    for col,value in [('area_id',self.areas[1]),('custodian_member_id',self.members[1]),('area_id',str(uuid.uuid4())),('custodian_member_id',str(uuid.uuid4()))]:
      r=self.sql("UPDATE public.resources SET %s='%s' WHERE id='%s';"%(col,value,resource))
      self.assertNotEqual(r.returncode,0);self.assertIn('foreign key constraint',r.stderr)
    r=self.sql("DELETE FROM public.areas WHERE id='%s';"%self.areas[0])
    self.assertNotEqual(r.returncode,0);self.assertIn('foreign key constraint',r.stderr)
    self.ok("UPDATE public.resources SET area_id=NULL WHERE id='%s';"%resource)
    self.ok("DELETE FROM public.areas WHERE id='%s';"%self.areas[0])
  def test_INV01_resource_write_denial(self):
    resource=self.add_resource()
    r=self.as_user(0,'SELECT id FROM public.resources;');self.assertEqual(r.returncode,0,r.stderr);self.assertEqual(r.stdout.strip(),resource)
    for role in ('anon','authenticated','service_role'):
      for privilege in ('INSERT','UPDATE','DELETE','TRUNCATE'):
        self.assertEqual(self.ok("SELECT has_table_privilege('%s','public.resources','%s');"%(role,privilege)),'f')
    r=self.sql('SET ROLE anon; SELECT * FROM public.resources;')
    self.assertNotEqual(r.returncode,0);self.assertIn('permission denied',r.stderr)
    self.ok('GRANT INSERT,UPDATE,DELETE ON public.resources TO authenticated;')
    for query,tag in [('UPDATE public.resources SET notes=notes RETURNING id;','UPDATE 0'),('DELETE FROM public.resources RETURNING id;','DELETE 0')]:
      r=self.as_user(0,query);self.assertEqual(r.returncode,0,r.stderr);self.assertEqual(r.stdout.strip(),'')
    r=self.as_user(0,"INSERT INTO public.resources(project_id,name,category,kind,inventory_state) VALUES ('%s','Forbidden','fixture','ITEM','UNVERIFIED');"%self.projects[0])
    self.assertNotEqual(r.returncode,0);self.assertIn('row-level security',r.stderr)
if __name__ == '__main__':
  unittest.main(verbosity=2)
