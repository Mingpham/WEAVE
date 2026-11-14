"""FR-AUTH-03/FR-EVT-01 direct PostgREST RPC check; fixture auth only."""
import json
import uuid
import unittest
import test_foundation_postgrest as base

class CreateProjectHTTPTests(unittest.TestCase):
  setUp = base.FoundationPostgrestTests.setUp
  token = base.FoundationPostgrestTests.token
  http = base.FoundationPostgrestTests.http
  rows = base.FoundationPostgrestTests.rows
  @classmethod
  def setUpClass(cls):
    base.FoundationPostgrestTests.setUpClass.__func__(cls)
    boot="ALTER TABLE auth.users ADD COLUMN is_anonymous boolean DEFAULT false, ADD COLUMN raw_user_meta_data jsonb DEFAULT '{}'; CREATE TABLE auth.identities(user_id uuid NOT NULL,provider text NOT NULL);"
    result=cls.backend.sql(boot)
    if result.returncode: raise RuntimeError(result.stderr)
    result=cls.backend.sql((base.foundation.ROOT/'supabase/migrations/20261114120000_create_project.sql').read_text())
    if result.returncode: raise RuntimeError(result.stderr)

  def test_FRAUTH03_create_rpc_http_authorization_and_replay(self):
    f=self.fixture
    f.ok("INSERT INTO auth.identities VALUES ('%s','google');"%f.users[0])
    request={'title':'Fixture event','brief':'x'*40,'starts_at':'2026-11-14T00:00:00Z','ends_at':'2026-11-15T00:00:00Z','timezone':'UTC','expected_team_size':5}
    key=str(uuid.uuid4())
    args={'p_request':request,'p_idempotency_key':key}
    status,body=self.http('POST','/rpc/create_project',0,args)
    self.assertEqual(status,200)
    self.assertEqual(body['meta']['state_version'],1)
    project=body['data']['project_id']
    uuid.UUID(project)
    status,replay=self.http('POST','/rpc/create_project',0,args)
    self.assertEqual(status,200);self.assertEqual(replay,body)
    changed={'p_request':{**request,'title':'Changed event'},'p_idempotency_key':key}
    status,error=self.http('POST','/rpc/create_project',0,changed)
    self.assertGreaterEqual(status,400);self.assertEqual(error['message'],'IDEMPOTENCY_KEY_REUSED')
    status,error=self.http('POST','/rpc/create_project',2,{'p_request':request,'p_idempotency_key':str(uuid.uuid4())})
    self.assertGreaterEqual(status,400);self.assertEqual(error['message'],'FORBIDDEN')
    status,_=self.http('POST','/rpc/create_project',None,args)
    self.assertEqual(status,401)
    self.assertEqual(f.ok('SELECT count(*) FROM public.projects;'),'3')
    self.assertEqual(f.ok('SELECT count(*) FROM public.event_log;'),'1')
    self.assertEqual(f.ok('SELECT count(*) FROM public.idempotency_keys;'),'1')
    status,rows=self.http('GET','/projects?select=id&id=eq.'+project,0)
    self.assertEqual(status,200);self.assertEqual(rows,[{'id':project}])
    status,rows=self.http('GET','/projects?select=id&id=eq.'+project,2)
    self.assertEqual(status,200);self.assertEqual(rows,[])

if __name__=='__main__': unittest.main(verbosity=2)
