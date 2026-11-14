"""Disposable real-migration storage fixtures; no Supabase Auth emulation claim."""
from pathlib import Path
import unittest
import test_membership_foundation as foundation


class StorageFixture(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.backend = foundation.FoundationTests
        cls.addClassCleanup(cls.backend.doClassCleanups)
        cls.backend.setUpClass()
        migration = Path(__file__).resolve().parents[2] / 'supabase/migrations/20261114070000_event_log_idempotency.sql'
        result = cls.backend.sql(migration.read_text())
        if result.returncode:
            raise RuntimeError(result.stderr)

    def setUp(self):
        self.fixture = self.backend('test_WP0_three_tables_have_rls')
        self.fixture.setUp()
        self.addCleanup(self.fixture.tearDown)
        for attr in ('db', 'users', 'members', 'projects', 'areas'):
            setattr(self, attr, getattr(self.fixture, attr))

    def sql(self, text):
        return self.backend.sql("\\set VERBOSITY verbose\n\\set QUIET on\nSET statement_timeout='5s';\n" + text, self.db)

    def ok(self, text):
        result = self.sql(text)
        self.assertEqual(result.returncode, 0, result.stderr)
        return result.stdout.strip()

    def as_user(self, user, text):
        return self.sql("SET ROLE authenticated; SET request.jwt.claim.sub='%s';\n%s" % (self.users[user], text))

    def event_sql(self, member=None, project=0, visibility='INVOLVED', actor=None):
        ids = "ARRAY['%s'::uuid]" % member if member else "'{}'::uuid[]"
        actor_sql = "'%s'::uuid" % actor if actor else 'NULL'
        return ("INSERT INTO public.event_log(project_id,state_version,event_type,actor_kind,actor_member_id,visibility,involved_member_ids) "
                "VALUES ('%s',1,'FIXTURE_EVENT','SYSTEM',%s,'%s',%s) RETURNING id;" %
                (self.projects[project], actor_sql, visibility, ids))
