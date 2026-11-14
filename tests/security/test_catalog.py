"""Regression tests for the audit itself, not WEAVE RLS acceptance tests.

Uses a disposable PostgreSQL 17 container, no published ports, no persistent data.
Run: python3 tests/security/test_catalog.py -v
"""
import os
from pathlib import Path
import subprocess
import time
import unittest
import uuid

AUDIT = Path(__file__).with_name('catalog.sql').read_text()
TABLES = '''projects areas resources tasks task_criteria task_dependencies
 task_resource_requirements claims claim_evidence incidents members assignments
 observations observation_media media_assets task_submissions criterion_assessments
 information_requests incident_links incident_unknowns decision_proposals
 recovery_actions plan_drafts plan_messages project_invites ai_suggestions
 payout_ledger event_log notifications analysis_jobs ai_inference_logs
 idempotency_keys push_tokens'''.split()


class CatalogAuditTests(unittest.TestCase):
    @classmethod
    def docker(cls, *args, **kwargs):
        return subprocess.run(['docker', '--context', os.getenv('WEAVE_TEST_DOCKER_CONTEXT', 'default'),
                               *args], text=True, capture_output=True, timeout=60, **kwargs)

    @classmethod
    def sql(cls, sql, database='postgres'):
        return cls.docker('exec', '-i', cls.container, 'psql', '-X', '-h', '127.0.0.1', '-U', 'postgres',
                          '-d', database, '-v', 'ON_ERROR_STOP=1', input=sql)

    @classmethod
    def setUpClass(cls):
        cls.container = 'weave-catalog-' + uuid.uuid4().hex[:12]
        started = cls.docker('run', '--detach', '--pull=never', '--network=none',
                             '--name', cls.container, '--tmpfs', '/var/lib/postgresql/data',
                             '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', 'postgres:17-alpine')
        if started.returncode:
            raise RuntimeError('Cannot start isolated PostgreSQL: ' + started.stderr)
        cls.addClassCleanup(cls.docker, 'rm', '--force', cls.container)
        deadline = time.monotonic() + 30
        while time.monotonic() < deadline:
            ready = cls.sql('SELECT 1;')
            if ready.returncode == 0:
                break
            time.sleep(0.2)
        else:
            raise RuntimeError('PostgreSQL readiness timed out')
        result = cls.sql('CREATE ROLE anon; CREATE ROLE authenticated; '
                         'CREATE ROLE audit_writer; CREATE ROLE audit_bypass BYPASSRLS;')
        if result.returncode:
            raise RuntimeError(result.stderr)

    def setUp(self):
        self.database = 'audit_' + uuid.uuid4().hex[:12]
        self.assertEqual(self.sql('CREATE DATABASE ' + self.database).returncode, 0)
        self.execute('\n'.join('CREATE TABLE public.' + table + ' (id int, value text); '
                               'ALTER TABLE public.' + table + ' ENABLE ROW LEVEL SECURITY;'
                               for table in TABLES))

    def tearDown(self):
        result = self.sql('REVOKE audit_writer, audit_bypass FROM authenticated; '
                          'ALTER ROLE authenticated NOBYPASSRLS; '
                          'ALTER ROLE anon NOBYPASSRLS; '
                          'DROP DATABASE ' + self.database)
        self.assertEqual(result.returncode, 0, result.stderr)

    def execute(self, sql):
        result = self.sql(sql, self.database)
        self.assertEqual(result.returncode, 0, result.stderr)
        return result

    def audit(self, expected=None):
        result = self.sql(AUDIT, self.database)
        if expected is None:
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn('33 tables', result.stderr)
        else:
            self.assertNotEqual(result.returncode, 0, 'Audit falsely accepted insecure catalog')
            self.assertIn(expected, result.stderr)

    def test_INV07_clean_catalog(self):
        self.audit()

    def test_INV07_missing_table_fails(self):
        self.execute('DROP TABLE public.tasks;')
        self.audit('Missing public.tasks')

    def test_INV07_disabled_rls_fails(self):
        self.execute('ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;')
        self.audit('tasks: RLS disabled')

    def test_INV07_authenticated_write_policy_fails(self):
        self.execute('CREATE POLICY bad ON public.tasks FOR INSERT TO authenticated WITH CHECK (true);')
        self.audit('authenticated write policy')

    def test_INV07_anon_write_policy_fails(self):
        self.execute('CREATE POLICY bad ON public.tasks FOR INSERT TO anon WITH CHECK (true);')
        self.audit('anon write policy')

    def test_INV07_public_write_policy_fails(self):
        self.execute('CREATE POLICY bad ON public.tasks FOR ALL TO PUBLIC USING (true);')
        self.audit('write policy')

    def test_SEC09_server_only_public_select_policy_fails(self):
        self.execute('CREATE POLICY bad ON public.analysis_jobs FOR SELECT TO PUBLIC USING (true);')
        self.audit('analysis_jobs: anon SELECT policy on service-only table')

    def test_SEC09_server_only_inherited_select_policy_fails(self):
        self.execute('GRANT audit_writer TO authenticated; '
                     'CREATE POLICY bad ON public.push_tokens FOR SELECT TO audit_writer USING (true);')
        self.audit('push_tokens: authenticated SELECT policy on service-only table')

    def test_SEC09_server_only_grant_without_policy_allowed(self):
        self.execute('GRANT SELECT ON public.analysis_jobs TO authenticated;')
        self.audit()

    def test_INV07_allowed_member_select_policy(self):
        self.execute('CREATE POLICY good ON public.tasks FOR SELECT TO authenticated USING (false);')
        self.audit()

    def test_DB06_column_update_grant_fails(self):
        self.execute('GRANT UPDATE(value) ON public.event_log TO authenticated;')
        self.audit('can modify append-only data (DB-06)')

    def test_DB06_delete_grant_fails(self):
        self.execute('GRANT DELETE ON public.observations TO anon;')
        self.audit('can modify append-only data (DB-06)')

    def test_INV06_truncate_grant_fails(self):
        self.execute('GRANT TRUNCATE ON public.event_log TO authenticated;')
        self.audit('can TRUNCATE')

    def test_INV07_role_bypass_fails(self):
        self.execute('ALTER ROLE authenticated BYPASSRLS;')
        self.audit('bypasses RLS')

    def test_INV07_settable_bypass_role_fails(self):
        self.execute('GRANT audit_bypass TO authenticated WITH INHERIT FALSE, SET TRUE;')
        self.audit('can SET ROLE to bypass RLS')

    def test_INV07_table_owner_fails(self):
        self.execute('ALTER TABLE public.tasks OWNER TO authenticated;')
        self.audit('application role owns table')

    def test_INV07_unusable_membership_policy_not_applicable(self):
        self.execute('GRANT audit_writer TO authenticated WITH INHERIT FALSE, SET FALSE; '
                     'CREATE POLICY unrelated ON public.tasks FOR INSERT TO audit_writer WITH CHECK (true);')
        self.audit()

    def test_INV07_restrictive_write_policy_still_violates_12_1(self):
        self.execute('CREATE POLICY deny ON public.tasks AS RESTRICTIVE FOR UPDATE '
                     'TO authenticated USING (false);')
        self.audit('authenticated write policy')


if __name__ == '__main__':
    unittest.main()
