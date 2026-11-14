"""Real local PostgreSQL: plan owner authorization, publish atomicity and retry."""
from pathlib import Path
import json
import unittest
import uuid
import storage_fixture as fixture

ROOT=Path(__file__).resolve().parents[2]
class PlanOperationsTests(fixture.StorageFixture):
 @classmethod
 def setUpClass(cls):
  # This workstation caches the official PostgreSQL 17 image. Keep the shared
  # harness untouched; substitute its image only for this test process.
  backend=fixture.foundation.FoundationTests
  original=backend.docker.__func__
  backend.docker=classmethod(lambda k,*args,**kwargs: original(k,*('postgres:17' if a=='postgres:17-alpine' else a for a in args),**kwargs))
  cls.addClassCleanup(setattr,backend,'docker',classmethod(original))
  super().setUpClass()
  for name in ['20261114080000_mutation_framework.sql','20261114090000_resources.sql','20261114100000_plan_storage.sql','20261114150000_plan_operations.sql','20261114160000_work_operations.sql']:
   r=cls.backend.sql((ROOT/'supabase/migrations'/name).read_text())
   if r.returncode:raise RuntimeError(name+'\n'+r.stderr)
 def setUp(self):
  super().setUp()
  self.draft={'areas':[],'resources':[],'role_tags':[],'questions':[],'assumptions':[],'gaps':[], 'tasks':[{'key':'setup','origin':'HUMAN','locked':True,'title':'Prepare venue','description':'Prepare the room','area_key':None,'role_tag':None,'role_required':False,'start_offset_min':-30,'due_offset_min':0,'hard_deadline':False,'estimated_minutes':30,'critical':False,'stipend_amount':None,'criteria':[{'description':'Room is ready','critical':True,'photo_expected':False}],'depends_on':[],'needs':[]}]}
  self.ok("INSERT INTO public.plan_drafts(project_id,draft) VALUES ('%s','%s');"%(self.projects[0],json.dumps(self.draft)))
 def call(self,user=0,state=0,revision=1,finalize=False,publish=False,key=None,draft=None):
  payload=json.dumps(self.draft if draft is None else draft).replace("'","''")
  request=json.dumps({'ops':[],'finalize':finalize,'publish':publish})
  return self.as_user(user,"SELECT public.mutate_plan('%s',%s,%s,'%s','%s','%s');"%(self.projects[0],state,revision,request,payload,key or uuid.uuid4()))
 def test_owner_only_and_stale_revision(self):
  denied=self.call(user=2);self.assertNotEqual(denied.returncode,0);self.assertIn('NOT_FOUND',denied.stderr)
  stale=self.call(revision=2);self.assertNotEqual(stale.returncode,0);self.assertIn('VERSION_CONFLICT',stale.stderr)
  self.assertEqual(self.ok('SELECT count(*) FROM public.tasks;'),'0')
 def test_review_publish_replay_is_atomic(self):
  review=self.call(finalize=True);self.assertEqual(review.returncode,0,review.stderr)
  key=str(uuid.uuid4());published=self.call(state=1,revision=2,publish=True,key=key);self.assertEqual(published.returncode,0,published.stderr)
  replay=self.call(state=1,revision=2,publish=True,key=key);self.assertEqual(replay.returncode,0,replay.stderr)
  self.assertEqual(json.loads(published.stdout),json.loads(replay.stdout))
  self.assertEqual(self.ok('SELECT count(*) FROM public.tasks;'),'1');self.assertEqual(self.ok('SELECT count(*) FROM public.task_criteria;'),'1')
  self.assertEqual(self.ok("SELECT status||'|'||state_version FROM public.projects WHERE id='%s';"%self.projects[0]),'ACTIVE|2')
 def test_cycle_rejected_without_writes(self):
  broken=json.loads(json.dumps(self.draft));broken['tasks'][0]['depends_on']=[{'task_key':'setup','kind':'SOFT'}]
  result=self.call(draft=broken);self.assertNotEqual(result.returncode,0);self.assertIn('DEPENDENCY_CYCLE',result.stderr)
  self.assertEqual(self.ok('SELECT count(*) FROM public.event_log;'),'0')
if __name__=='__main__':unittest.main(verbosity=2)
