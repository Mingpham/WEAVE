"""FR-MEM-01: minimal invite RPC HTTP smoke; fixture auth, not app acceptance."""
import unittest
import uuid
import test_foundation_postgrest as base

class ManageInviteHTTP(unittest.TestCase):
  setUp=base.FoundationPostgrestTests.setUp
  token=base.FoundationPostgrestTests.token
  http=base.FoundationPostgrestTests.http
  rows=base.FoundationPostgrestTests.rows
  @classmethod
  def setUpClass(cls):
    base.FoundationPostgrestTests.setUpClass.__func__(cls)
    result=cls.backend.sql((base.foundation.ROOT/'supabase/migrations/20261114130000_manage_project_invite.sql').read_text())
    if result.returncode: raise RuntimeError(result.stderr)
  def test_FRMEM01_owner_create_replay_disable_http(self):
    f=self.fixture
    args={'p_project_id':f.projects[0],'p_action':'CREATE','p_idempotency_key':str(uuid.uuid4())}
    status,first=self.http('POST','/rpc/manage_project_invite',0,args)
    self.assertEqual(status,200);self.assertEqual(first['meta']['state_version'],1)
    self.assertRegex(first['data']['code'],r'^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$')
    self.assertEqual(first['data']['deep_link'],'weave://join?code='+first['data']['code'])
    status,replay=self.http('POST','/rpc/manage_project_invite',0,args)
    self.assertEqual(status,200);self.assertEqual(replay,first)
    status,error=self.http('POST','/rpc/manage_project_invite',2,{**args,'p_idempotency_key':str(uuid.uuid4())})
    self.assertGreaterEqual(status,400);self.assertEqual(error['message'],'FORBIDDEN')
    status,disabled=self.http('POST','/rpc/manage_project_invite',0,{**args,'p_action':'DISABLE','p_idempotency_key':str(uuid.uuid4())})
    self.assertEqual(status,200);self.assertIsNone(disabled['data']['code']);self.assertEqual(disabled['meta']['state_version'],2)
    self.assertEqual(f.ok('SELECT count(*) FROM public.project_invites WHERE disabled_at IS NULL;'),'0')
    self.assertEqual(f.ok('SELECT count(*) FROM public.event_log;'),'2')

if __name__=='__main__': unittest.main(verbosity=2)
