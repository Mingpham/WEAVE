"""Additional §7.3 storage contract and historical-reference regressions.

RED: WEAVE_STORAGE_RED_BASELINE=1 python3 tests/security/test_storage_contract.py StorageContractTests.test_00_WP0_storage_tables_present -v
GREEN: python3 tests/security/test_storage_contract.py -v
The explicit RED mode applies only enum/foundation migrations; no fake storage schema.
"""
import json
import os
import uuid
import storage_fixture as fixture
import test_membership_foundation as foundation


class StorageContractTests(fixture.StorageFixture):
    @classmethod
    def setUpClass(cls):
        if os.environ.get('WEAVE_STORAGE_RED_BASELINE') == '1':
            cls.backend = foundation.FoundationTests
            cls.addClassCleanup(cls.backend.doClassCleanups)
            cls.backend.setUpClass()
        else:
            super().setUpClass()

    def test_00_WP0_storage_tables_present(self):
        """WP-0-DB: must fail on the real pre-storage migration baseline."""
        count = self.ok("SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('event_log','idempotency_keys') AND c.relkind='r';")
        self.assertEqual(count, '2', 'Storage tables missing: apply the storage migration for GREEN')

    def test_DB11_declared_columns_defaults_keys_and_actor_fk(self):
        """DB-11 / §7.3: exact declared shape, defaults and scoped actor FK."""
        expected = {
            'event_log': {'id', 'project_id', 'created_at', 'state_version', 'event_type',
                          'actor_kind', 'actor_member_id', 'entity_type', 'entity_id',
                          'payload', 'visibility', 'involved_member_ids'},
            'idempotency_keys': {'user_id', 'key', 'created_at', 'operation', 'request_hash',
                                 'response_status', 'response_body'}}
        for table, columns in expected.items():
            actual = json.loads(self.ok("SELECT json_agg(attname ORDER BY attnum) FROM pg_attribute WHERE attrelid='public.%s'::regclass AND attnum>0 AND NOT attisdropped;" % table))
            self.assertEqual(set(actual), columns)
            self.assertEqual(self.ok("SELECT format_type(atttypid,atttypmod) FROM pg_attribute WHERE attrelid='public.%s'::regclass AND attname='created_at';" % table), 'timestamp with time zone')
        self.assertEqual(self.ok("SELECT format_type(atttypid,atttypmod) FROM pg_attribute WHERE attrelid='public.event_log'::regclass AND attname='id';"), 'bigint')
        self.assertEqual(self.ok("SELECT pg_get_serial_sequence('public.event_log','id') IS NOT NULL;"), 't')
        self.assertEqual(self.ok("INSERT INTO public.event_log(project_id,state_version,event_type,actor_kind,visibility) VALUES ('%s',0,'FIXTURE_EVENT','SYSTEM','ALL') RETURNING id>0 AND actor_member_id IS NULL AND created_at IS NOT NULL AND involved_member_ids='{}'::uuid[];" % self.projects[0]), 't')
        actor_columns = self.ok("SELECT json_agg(a.attname ORDER BY k.ord) FROM pg_constraint c CROSS JOIN LATERAL unnest(c.conkey) WITH ORDINALITY k(attnum,ord) JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k.attnum WHERE c.contype='f' AND c.conrelid='public.event_log'::regclass AND c.confrelid='public.members'::regclass;")
        self.assertEqual(json.loads(actor_columns), ['project_id', 'actor_member_id'])
        primary_key = self.ok("SELECT json_agg(a.attname ORDER BY k.ord) FROM pg_constraint c CROSS JOIN LATERAL unnest(c.conkey) WITH ORDINALITY k(attnum,ord) JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k.attnum WHERE c.contype='p' AND c.conrelid='public.idempotency_keys'::regclass;")
        self.assertEqual(json.loads(primary_key), ['user_id', 'key'])
        self.assertEqual(self.ok("SELECT count(*) FROM pg_constraint WHERE conrelid='public.idempotency_keys'::regclass AND contype='f';"), '0')

    def test_INV07_historical_actor_and_involved_status_do_not_gate_storage(self):
        """INV-07: historical references persist; current approval gates user reads."""
        member = self.members[2]
        self.ok(self.event_sql(member, actor=member).replace("'SYSTEM'", "'MEMBER'"))
        self.ok("UPDATE public.members SET status='REMOVED' WHERE id='%s';" % member)
        # Backfilled/historical references may point at existing non-approved rows.
        for historical in (member, self.members[4], self.members[5]):
            self.ok(self.event_sql(historical, actor=historical).replace("'SYSTEM'", "'MEMBER'"))
        self.ok("UPDATE public.projects SET status='ACTIVE' WHERE id='%s'; UPDATE public.projects SET status='CLOSED' WHERE id='%s';" % (self.projects[0], self.projects[0]))
        self.ok(self.event_sql(self.members[5], actor=self.members[5]).replace("'SYSTEM'", "'MEMBER'"))
        for user in (2, 4, 5, 6):
            result = self.as_user(user, 'SELECT count(*) FROM public.event_log;')
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(result.stdout.strip(), '0')
        result = self.as_user(0, 'SELECT count(*) FROM public.event_log;')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.strip(), '5')
        self.ok("UPDATE public.projects SET deleted_at=now() WHERE id='%s';" % self.projects[0])
        result = self.as_user(0, 'SELECT count(*) FROM public.event_log;')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.strip(), '0')
        self.assertEqual(self.ok('SELECT count(*) FROM public.event_log;'), '5')

    def test_INV05_cache_has_no_auth_fk_and_service_is_read_only(self):
        """INV-05 / DB-06: retention storage has no auth FK; no service writes."""
        user, key = str(uuid.uuid4()), str(uuid.uuid4())
        self.assertEqual(self.ok("SELECT count(*) FROM auth.users WHERE id='%s';" % user), '0')
        self.assertEqual(self.ok("INSERT INTO public.idempotency_keys(user_id,key,operation,request_hash,response_status,response_body) VALUES ('%s','%s','POST /fixture','hash',200,'{}') RETURNING created_at IS NOT NULL;" % (user, key)), 't')
        for table in ('event_log', 'idempotency_keys'):
            self.assertEqual(self.ok("SELECT has_table_privilege('service_role','public.%s','SELECT');" % table), 't')
            for privilege in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE'):
                self.assertEqual(self.ok("SELECT has_table_privilege('service_role','public.%s','%s');" % (table, privilege)), 'f')


if __name__ == '__main__':
    import unittest
    unittest.main(verbosity=2)
