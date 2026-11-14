"""INV-01/05/07, DB-09/10: private transaction primitives, not public RPCs.

Runs the real four migrations with fixture auth/session UID as a trusted caller.
Public endpoint authorization, source transitions and API retry policy remain separate.
"""
from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
import re
import uuid
import storage_fixture as fixture
import test_event_reference_races as races


class MutationFrameworkTests(fixture.StorageFixture):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        migration = Path(__file__).resolve().parents[2] / 'supabase/migrations/20261114080000_mutation_framework.sql'
        result = cls.backend.sql(migration.read_text())
        if result.returncode:
            raise RuntimeError(result.stderr)

    def setUp(self):
        super().setUp()
        self.key = str(uuid.uuid4())
        self.project = self.projects[0]
        self.begin = "weave_private.begin_idempotent_request('%s','POST /fixture','fixture-hash')" % self.key
        self.lock = "weave_private.lock_project_for_mutation('%s',0,true)" % self.project
        self.finish = "weave_private.finish_project_mutation('%s',0,'FIXTURE_UPDATED','ALL')" % self.project
        self.save = "weave_private.save_idempotent_response('%s','POST /fixture','fixture-hash',200,'{\"ok\":true}')" % self.key

    def acting(self, user, text):
        return self.sql("SET request.jwt.claim.sub='%s';\n%s" % (self.users[user], text))

    def allowed(self, result):
        self.assertEqual(result.returncode, 0, result.stderr)
        return result.stdout.strip()

    def rejected(self, result, message, state='P0001'):
        self.assertNotEqual(result.returncode, 0)
        self.assertIn(state, result.stderr)
        self.assertIn(message, result.stderr)

    def test_INV07_private_invoker_helpers_and_execute_denial(self):
        names = "('lock_project_for_mutation','begin_idempotent_request','save_idempotent_response','finish_project_mutation')"
        where = "FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='weave_private' AND p.proname IN " + names
        self.assertEqual(self.ok('SELECT count(*) ' + where + " AND NOT p.prosecdef AND p.proconfig @> ARRAY['search_path=\"\"']::text[];"), '4')
        for role in ('anon', 'authenticated', 'service_role'):
            self.assertEqual(self.ok('SELECT count(*) ' + where + " AND has_function_privilege('%s',p.oid,'EXECUTE');" % role), '0')
            for call in (self.lock, self.begin, self.save, self.finish):
                result = self.sql('SET ROLE ' + role + '; SELECT ' + call + ';')
                self.rejected(result, 'permission denied', '42501')

    def test_INV07_project_scope_owner_version_and_closed_guards(self):
        for user in (1, 3, 4, 5, 6):
            self.rejected(self.acting(user, 'SELECT ' + self.lock + ';'), 'NOT_FOUND')
        self.assertEqual(self.allowed(self.acting(0, 'SELECT (' + self.lock + ').id;')), self.project)
        member_lock = "weave_private.lock_project_for_mutation('%s',0)" % self.project
        self.assertEqual(self.allowed(self.acting(2, 'SELECT (' + member_lock + ').id;')), self.project)
        self.rejected(self.acting(2, 'SELECT ' + self.lock + ';'), 'FORBIDDEN')
        result = self.acting(0, "SELECT weave_private.lock_project_for_mutation('%s',99);" % self.project)
        self.rejected(result, 'VERSION_CONFLICT')
        detail = re.search(r'DETAIL:\s*(\{[^\n]+\})', result.stderr)
        self.assertIsNotNone(detail)
        self.assertEqual(json.loads(detail.group(1)), {'current': 0})
        self.ok("UPDATE public.projects SET status='CLOSED' WHERE id='%s';" % self.project)
        for call in (self.lock, self.finish):
            self.rejected(self.acting(0, 'SELECT ' + call + ';'), 'PROJECT_CLOSED')
        self.ok("UPDATE public.projects SET deleted_at=now() WHERE id='%s';" % self.projects[1])
        self.rejected(self.acting(1, "SELECT weave_private.lock_project_for_mutation('%s',0);" % self.projects[1]), 'NOT_FOUND')

    def test_INV01_missing_uid_denied_without_writes(self):
        for call in (self.lock, self.begin, self.save, self.finish):
            self.rejected(self.sql('SELECT ' + call + ';'), 'UNAUTHENTICATED')
        for table in ('event_log', 'idempotency_keys'):
            self.assertEqual(self.ok('SELECT count(*) FROM public.' + table + ';'), '0')

    def test_INV05_parameter_validation_rejects_invalid_requests(self):
        calls = ["weave_private.lock_project_for_mutation(NULL,0)",
                 "weave_private.lock_project_for_mutation('%s',NULL)" % self.project,
                 "weave_private.lock_project_for_mutation('%s',-1)" % self.project,
                 "weave_private.lock_project_for_mutation('%s',0,NULL)" % self.project]
        for key, operation, request_hash in [('NULL', "'POST /fixture'", "'hash'"),
            ("'00000000-0000-1000-8000-000000000001'", "'POST /fixture'", "'hash'"),
            ("'00000000-0000-4000-0000-000000000001'", "'POST /fixture'", "'hash'"),
            ("'%s'" % self.key, 'NULL', "'hash'"), ("'%s'" % self.key, "'  '", "'hash'"),
            ("'%s'" % self.key, "'POST /fixture'", 'NULL'), ("'%s'" % self.key, "'POST /fixture'", "''")]:
            calls.append('weave_private.begin_idempotent_request(%s,%s,%s)' % (key, operation, request_hash))
        for status, body in [('NULL', "'{}'"), ('99', "'{}'"), ('600', "'{}'"), ('200', 'NULL')]:
            calls.append("weave_private.save_idempotent_response('%s','POST /fixture','hash',%s,%s)" % (self.key, status, body))
        for event, visibility, payload, involved in [('NULL', "'ALL'", "'{}'", "'{}'"),
            ("''", "'ALL'", "'{}'", "'{}'"), ("'FIXTURE_UPDATED'", 'NULL', "'{}'", "'{}'"),
            ("'FIXTURE_UPDATED'", "'ALL'", 'NULL', "'{}'"), ("'FIXTURE_UPDATED'", "'ALL'", "'{}'", 'NULL')]:
            calls.append("weave_private.finish_project_mutation('%s',0,%s,%s,%s,%s)" % (self.project, event, visibility, payload, involved))
        for call in calls:
            with self.subTest(call=call.split('(')[0]):
                self.rejected(self.acting(0, 'SELECT ' + call + ';'), 'VALIDATION_FAILED')
        self.assertEqual(self.ok('SELECT count(*) FROM public.idempotency_keys;'), '0')
        self.assertEqual(self.ok('SELECT count(*) FROM public.event_log;'), '0')

    def test_INV05_first_response_replay_conflict_and_user_scope(self):
        self.assertEqual(self.allowed(self.acting(0, 'SELECT ' + self.begin + ' IS NULL;')), 't')
        self.allowed(self.acting(0, 'SELECT ' + self.save + ';'))
        replay = "weave_private.save_idempotent_response('%s','POST /fixture','fixture-hash',201,'{\"changed\":true}')" % self.key
        cached = json.loads(self.allowed(self.acting(0, 'SELECT row_to_json(' + replay + ');')))
        self.assertEqual(cached['response_status'], 200)
        self.assertEqual(cached['response_body'], {'ok': True})
        for operation, request_hash in [('POST /other', 'fixture-hash'), ('POST /fixture', 'changed')]:
            call = "weave_private.begin_idempotent_request('%s','%s','%s')" % (self.key, operation, request_hash)
            self.rejected(self.acting(0, 'SELECT ' + call + ';'), 'IDEMPOTENCY_KEY_REUSED')
        self.assertEqual(self.allowed(self.acting(2, 'SELECT ' + self.begin + ' IS NULL;')), 't')
        self.allowed(self.acting(2, 'SELECT ' + self.save + ';'))
        self.assertEqual(self.ok('SELECT count(*) FROM public.idempotency_keys;'), '2')
        self.assertEqual(self.ok('SELECT count(*) FROM public.event_log;'), '0')
        self.assertEqual(self.ok("SELECT state_version FROM public.projects WHERE id='%s';" % self.project), '0')

    def test_DB09_delta_version_event_cache_commit_together(self):
        sql = ('BEGIN; SELECT ' + self.begin + '; SELECT ' + self.lock + '; '
               "UPDATE public.projects SET title='Framework update' WHERE id='%s'; " % self.project +
               'SELECT ' + self.finish + '; SELECT ' + self.save + '; COMMIT;')
        self.allowed(self.acting(0, sql))
        self.assertEqual(self.ok("SELECT state_version||'|'||title FROM public.projects WHERE id='%s';" % self.project), '1|Framework update')
        self.assertEqual(self.ok("SELECT count(*) FROM public.event_log WHERE project_id='%s' AND state_version=1 AND actor_kind='MEMBER' AND actor_member_id='%s';" % (self.project, self.members[0])), '1')
        self.assertEqual(self.ok('SELECT count(*) FROM public.event_log;'), '1')
        self.assertEqual(self.ok("SELECT count(*) FROM public.idempotency_keys WHERE user_id='%s' AND key='%s' AND response_status=200;" % (self.users[0], self.key)), '1')

    def test_DB09_failed_event_rolls_back_delta_version_cache(self):
        # Prewrite a response inside the transaction to prove it rolls back too.
        bad_finish = "weave_private.finish_project_mutation('%s',0,'FIXTURE_UPDATED','ALL','{}',ARRAY['%s'::uuid])" % (self.project, self.members[1])
        sql = ('BEGIN; SELECT ' + self.begin + '; SELECT ' + self.lock + '; '
               "UPDATE public.projects SET title='Must rollback' WHERE id='%s'; " % self.project +
               'SELECT ' + self.save + '; SELECT ' + bad_finish + '; COMMIT;')
        self.rejected(self.acting(0, sql), 'must belong to its project', '23503')
        self.assertEqual(self.ok("SELECT state_version||'|'||title FROM public.projects WHERE id='%s';" % self.project), '0|Fixture event')
        for table in ('event_log', 'idempotency_keys'):
            self.assertEqual(self.ok('SELECT count(*) FROM public.' + table + ';'), '0')

    def test_DB09_double_finalization_same_version_aborts(self):
        self.rejected(self.acting(0, 'BEGIN; SELECT ' + self.lock + '; SELECT ' + self.finish + '; SELECT ' + self.finish + '; COMMIT;'), 'VERSION_CONFLICT')
        self.assertEqual(self.ok("SELECT state_version FROM public.projects WHERE id='%s';" % self.project), '0')
        self.assertEqual(self.ok('SELECT count(*) FROM public.event_log;'), '0')

    def test_INV05_DB09_stronger_isolation_rejected(self):
        for isolation in ('REPEATABLE READ', 'SERIALIZABLE'):
            for call in (self.lock, self.begin, self.save, self.finish):
                with self.subTest(isolation=isolation, helper=call.split('(')[0]):
                    self.rejected(self.acting(0, 'BEGIN ISOLATION LEVEL ' + isolation + '; SELECT ' + call + '; COMMIT;'), 'requires READ COMMITTED', '40001')

    def test_DB09_competing_project_version_one_winner(self):
        first = races.Session(self)
        first.query("SET request.jwt.claim.sub='%s'; BEGIN; SELECT %s" % (self.users[0], self.lock))
        with ThreadPoolExecutor(max_workers=1) as pool:
            future = pool.submit(self.acting, 0, "SET application_name='framework_version_wait'; BEGIN; SELECT " + self.finish + '; COMMIT;')
            races.EventReferenceRaces.wait_for_lock(self, 'framework_version_wait')
            first.query('SELECT ' + self.finish + '; COMMIT')
            self.rejected(future.result(timeout=7), 'VERSION_CONFLICT')
        self.assertEqual(self.ok("SELECT state_version FROM public.projects WHERE id='%s';" % self.project), '1')
        self.assertEqual(self.ok('SELECT count(*) FROM public.event_log;'), '1')

    def test_INV05_concurrent_same_key_reads_first_committed_response(self):
        first = races.Session(self)
        first.query("SET request.jwt.claim.sub='%s'; BEGIN; SELECT %s" % (self.users[0], self.begin))
        query = ("SET application_name='framework_cache_wait'; BEGIN; SELECT (" + self.begin + ').response_body; SELECT (' +
                 self.save.replace('{"ok":true}', '{"winner":2}') + ').response_body; COMMIT;')
        with ThreadPoolExecutor(max_workers=1) as pool:
            future = pool.submit(self.acting, 0, query)
            races.EventReferenceRaces.wait_for_lock(self, 'framework_cache_wait')
            first.query('SELECT ' + self.save.replace('{"ok":true}', '{"winner":1}') + '; COMMIT')
            output = self.allowed(future.result(timeout=7))
        self.assertEqual([json.loads(line) for line in output.splitlines()], [{'winner': 1}, {'winner': 1}])
        self.assertEqual(self.ok('SELECT count(*) FROM public.idempotency_keys;'), '1')


if __name__ == '__main__':
    import unittest
    unittest.main(verbosity=2)
