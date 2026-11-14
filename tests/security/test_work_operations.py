"""Isolated real PostgreSQL work mutation/RLS tests; no hosted writes."""
from pathlib import Path
import json
import unittest
import uuid
import storage_fixture as fixture
import test_membership_foundation as foundation

ROOT = Path(__file__).resolve().parents[2]
# Reuse the locally cached major-17 image; never pull dependencies for this check.
_docker = foundation.FoundationTests.docker.__func__
foundation.FoundationTests.docker = classmethod(lambda cls, *args, **kw: _docker(cls, *(('postgres:17' if a == 'postgres:17-alpine' else a) for a in args), **kw))

class WorkChecks(fixture.StorageFixture):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        for name in ['20261114080000_mutation_framework.sql', '20261114090000_resources.sql', '20261114160000_work_operations.sql']:
            result = cls.backend.sql((ROOT / 'supabase/migrations' / name).read_text())
            if result.returncode: raise RuntimeError(result.stderr)

    def setUp(self):
        super().setUp()
        self.ok("UPDATE projects SET status='ACTIVE'; UPDATE members SET presence='ON_SITE';")

    def call(self, user, operation, target, body, key=None):
        key = key or str(uuid.uuid4())
        return self.as_user(user, "SELECT public.mutate_work('%s','%s','%s'::jsonb,'%s');" % (operation, target, json.dumps(body).replace("'", "''"), key))

    def create(self, user=0, key=None):
        body = dict(title='Manual task', description='Verify the desk', area_id=None, role_tag=None, role_required=False,
                    start_at=None, due_at='2026-11-14T01:00:00Z', hard_deadline=False, estimated_minutes=30, critical=False,
                    stipend_amount=None, criteria=[dict(description='Desk ready', critical=True, photo_expected=False)], depends_on=[], needs=[])
        result = self.call(user, 'CREATE', self.projects[0], body, key)
        self.assertEqual(result.returncode, 0, result.stderr)
        return json.loads(result.stdout.strip())

    def offer(self, task, member=2):
        result = self.call(0, 'OFFERS', self.projects[0], {'offers':[{'task_id':task,'member_id':self.members[member]}]})
        self.assertEqual(result.returncode, 0, result.stderr)
        return json.loads(result.stdout.strip())['data'][0]

    def test_manual_offer_accept_start_release_replay(self):
        key=str(uuid.uuid4())
        created=self.create(key=key)
        self.assertEqual(self.create(key=key),created)
        task=created['data']['task_id']
        offer=self.offer(task)
        self.assertIsNone(offer['error'])
        aid=offer['assignment_id']
        for op,target,body in [('RESPOND',aid,{'expected_version':1,'response':'ACCEPT'}),('START',task,{'expected_version':3}),('RELEASE',aid,{'expected_version':2,'reason':'Unavailable'})]:
            result=self.call(2,op,target,body)
            self.assertEqual(result.returncode,0,result.stderr)
        self.assertEqual(self.ok("SELECT status::text||':'||version FROM tasks WHERE id='%s';"%task),'OPEN:5')
        self.assertEqual(self.ok('SELECT count(*) FROM event_log;'),'5')
        self.assertEqual(self.ok("SELECT state_version FROM projects WHERE id='%s';"%self.projects[0]),'5')

    def test_role_scope_versions_and_rls(self):
        task=self.create()['data']['task_id']
        for user in [1,2,4,5,6]:
            result=self.call(user,'STATUS',task,{'expected_version':1,'action':'CANCEL'})
            self.assertNotEqual(result.returncode,0)
        self.assertEqual(self.as_user(3,"SELECT count(*) FROM tasks;").stdout.strip(),'0')
        offer=self.offer(task)
        result=self.call(0,'RESPOND',offer['assignment_id'],{'expected_version':1,'response':'ACCEPT'})
        self.assertIn('FORBIDDEN',result.stderr)
        result=self.call(2,'RESPOND',offer['assignment_id'],{'expected_version':2,'response':'ACCEPT'})
        self.assertIn('VERSION_CONFLICT',result.stderr)
        result=self.call(2,'RESPOND',offer['assignment_id'],{'response':'ACCEPT'})
        self.assertIn('VALIDATION_FAILED',result.stderr)
        for table in ['tasks','task_criteria','assignments','task_dependencies','task_resource_requirements']:
            self.assertEqual(self.ok("SELECT has_table_privilege('authenticated','public.%s','UPDATE');"%table),'f')

    def test_offers_partial_failure_and_decline(self):
        task=self.create()['data']['task_id']
        body={'offers':[{'task_id':task,'member_id':self.members[2]},{'task_id':task,'member_id':self.members[0]}]}
        result=self.call(0,'OFFERS',self.projects[0],body)
        self.assertEqual(result.returncode,0,result.stderr)
        offers=json.loads(result.stdout.strip())['data']
        self.assertIsNone(offers[0]['error']);self.assertEqual(offers[1]['error'],'ALREADY_ASSIGNED')
        result=self.call(2,'RESPOND',offers[0]['assignment_id'],{'expected_version':1,'response':'DECLINE'})
        self.assertEqual(result.returncode,0,result.stderr)
        self.assertEqual(self.ok("SELECT status FROM tasks WHERE id='%s';"%task),'OPEN')

    def test_expiry_and_missing_critical_dependency_fail_closed(self):
        task=self.create()['data']['task_id'];offer=self.offer(task)
        self.ok("UPDATE assignments SET respond_by=now()-interval '1 second' WHERE id='%s';"%offer['assignment_id'])
        result=self.call(2,'RESPOND',offer['assignment_id'],{'expected_version':1,'response':'ACCEPT'})
        self.assertIn('INVALID_TRANSITION',result.stderr)
        self.assertEqual(self.ok("SELECT status FROM tasks WHERE id='%s';"%task),'OFFERED')

if __name__ == '__main__': unittest.main(verbosity=2)
