"""INV-05/06/07, DB-06/11, SEC-09 storage groundwork; no replay/RPC claim."""
import json
import uuid
import storage_fixture as fixture


class EventStorageTests(fixture.StorageFixture):
    def test_INV07_event_visibility_and_soft_deletion(self):
        ids = [int(self.ok(self.event_sql(visibility='ALL'))),
               int(self.ok(self.event_sql(visibility='OWNER'))),
               int(self.ok(self.event_sql(self.members[2]))),
               int(self.ok(self.event_sql(self.members[0]))),
               int(self.ok(self.event_sql(project=1, visibility='ALL')))]
        for user, positions in [(0, [0, 1, 2, 3]), (1, [4]), (2, [0, 2]), (3, [4]), (4, []), (5, []), (6, [])]:
            result = self.as_user(user, "SELECT coalesce(json_agg(id ORDER BY id),'[]'::json) FROM public.event_log;")
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(json.loads(result.stdout), [ids[i] for i in positions])
        self.ok("UPDATE public.members SET status='REMOVED' WHERE id='%s';" % self.members[2])
        result = self.as_user(2, 'SELECT count(*) FROM public.event_log;')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.strip(), '0')
        self.ok("UPDATE public.projects SET deleted_at=now() WHERE id='%s';" % self.projects[0])
        result = self.as_user(0, 'SELECT count(*) FROM public.event_log;')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.strip(), '0')
        self.assertEqual(self.ok('SELECT count(*) FROM public.event_log;'), '5')

    def test_INV05_cache_key_scope_and_app_read_denial(self):
        key = str(uuid.uuid4())
        insert = "INSERT INTO public.idempotency_keys(user_id,key,operation,request_hash,response_status,response_body) VALUES ('%s','%s','POST /fixture','fixture-hash',200,'{}');"
        for user in (0, 2):
            self.ok(insert % (self.users[user], key))
        result = self.sql(insert % (self.users[2], key))
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('23505', result.stderr)
        for user in (0, 2):
            result = self.as_user(user, 'SELECT * FROM public.idempotency_keys;')
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('42501', result.stderr)
        # Even an accidental SELECT grant cannot expose cached responses via RLS.
        self.ok('GRANT SELECT ON public.idempotency_keys TO authenticated;')
        result = self.as_user(2, 'SELECT count(*) FROM public.idempotency_keys;')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.strip(), '0')
        self.assertEqual(self.ok('SET ROLE service_role; SELECT count(*) FROM public.idempotency_keys;'), '2')

    def test_DB11_event_actor_and_array_references(self):
        result = self.sql(self.event_sql(actor=self.members[1], visibility='ALL'))
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('23503', result.stderr)
        for member in (self.members[1], str(uuid.uuid4())):
            result = self.sql(self.event_sql(member))
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('23503', result.stderr)
        result = self.sql(self.event_sql().replace("'{}'::uuid[]", 'ARRAY[NULL]::uuid[]'))
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('23502', result.stderr)
        self.ok(self.event_sql(self.members[2]))
        self.ok("UPDATE public.members SET status='REMOVED',nickname='History retained' WHERE id='%s';" % self.members[2])
        self.ok(self.event_sql(self.members[2]))
        for mutation in ["DELETE FROM public.members WHERE id='%s';" % self.members[2],
                         "UPDATE public.members SET id='%s' WHERE id='%s';" % (str(uuid.uuid4()), self.members[2]),
                         "UPDATE public.members SET project_id='%s' WHERE id='%s';" % (self.projects[1], self.members[2])]:
            result = self.sql(mutation)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('23503', result.stderr)
        self.ok("BEGIN ISOLATION LEVEL REPEATABLE READ; UPDATE public.members SET id=id,nickname='Same identity' WHERE id='%s'; COMMIT;" % self.members[2])

    def test_DB06_storage_roles_rls_and_sequence_privileges(self):
        self.assertEqual(self.ok("SELECT count(*) FROM pg_class WHERE oid IN ('public.event_log'::regclass,'public.idempotency_keys'::regclass) AND relrowsecurity;"), '2')
        self.assertEqual(self.ok("SELECT count(*) FROM pg_policy WHERE polrelid IN ('public.event_log'::regclass,'public.idempotency_keys'::regclass) AND polcmd <> 'r';"), '0')
        for role in ('anon', 'authenticated', 'service_role'):
            for table in ('event_log', 'idempotency_keys'):
                for privilege in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE'):
                    self.assertEqual(self.ok("SELECT has_table_privilege('%s','public.%s','%s');" % (role, table, privilege)), 'f')
            for privilege in ('USAGE', 'SELECT', 'UPDATE'):
                self.assertEqual(self.ok("SELECT has_sequence_privilege('%s','public.event_log_id_seq','%s');" % (role, privilege)), 'f')


if __name__ == '__main__':
    import unittest
    unittest.main(verbosity=2)
