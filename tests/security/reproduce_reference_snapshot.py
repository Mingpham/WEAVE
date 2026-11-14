"""Controlled regression proof: unguarded copy FAILS, current candidate PASSES.

Usage: python3 tests/security/reproduce_reference_snapshot.py REPO_ROOT [--unguarded]
Only a disposable fixture database function is changed; no migration file is edited.
Requires storage_fixture.py and the real first three migrations in REPO_ROOT.
"""
import argparse
from pathlib import Path
import re
import sys
import unittest
import uuid

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('repository', type=Path)
parser.add_argument('--unguarded', action='store_true')
args = parser.parse_args()
root = args.repository.resolve()
sys.path.insert(0, str(root / 'tests/security'))
import storage_fixture as fixture
import test_event_reference_races as races


class SnapshotInvariant(fixture.StorageFixture):
    def setUp(self):
        super().setUp()
        if args.unguarded:
            sql = (root / 'supabase/migrations/20261114070000_event_log_idempotency.sql').read_text()
            match = re.search(r'create function weave_private\.restrict_event_involved_member_change\(\).*?\$\$;', sql, re.S)
            if not match:
                raise RuntimeError('Expected reverse-reference function not found')
            guard = """  if current_setting('transaction_isolation') <> 'read committed' then
    raise exception using errcode = '40001',
      message = 'Member identity changes require READ COMMITTED';
  end if;
"""
            if match.group(0).count(guard) != 1:
                raise RuntimeError('Expected exact guard not found; review source before mutating')
            mutant = match.group(0).replace('create function', 'create or replace function', 1).replace(guard, '')
            self.ok(mutant)

    def check_snapshot(self, mutation):
        session = races.Session(self)
        session.query('BEGIN ISOLATION LEVEL REPEATABLE READ; SELECT count(*) FROM public.members')
        # Separate committed statement after the old snapshot; actor FK is NULL
        # so the array-reference predicate is the protection under test.
        self.ok(self.event_sql(self.members[2]))
        if mutation == 'DELETE':
            sql = "DELETE FROM public.members WHERE id='%s'" % self.members[2]
        elif mutation == 'REKEY':
            sql = "UPDATE public.members SET id='%s' WHERE id='%s'" % (str(uuid.uuid4()), self.members[2])
        else:
            sql = "UPDATE public.members SET project_id='%s' WHERE id='%s'" % (self.projects[1], self.members[2])
        process = session.process
        process.stdin.write((sql + '; COMMIT;\n').encode())
        process.stdin.flush()
        process.stdin.close()
        process.wait(timeout=10)
        error = process.stderr.read().decode()
        if process.returncode:
            self.assertIn('40001', error)
            self.assertEqual(self.ok("SELECT count(*) FROM public.members WHERE id='%s' AND project_id='%s';" % (self.members[2], self.projects[0])), '1')
        orphaned = self.ok('SELECT count(*) FROM public.event_log e CROSS JOIN LATERAL unnest(e.involved_member_ids) ids(member_id) LEFT JOIN public.members m ON m.id=ids.member_id AND m.project_id=e.project_id WHERE m.id IS NULL;')
        self.assertEqual(orphaned, '0', 'RR mutation committed an orphaned scoped event reference')

    def test_RR_delete_preserves_scoped_reference(self):
        self.check_snapshot('DELETE')

    def test_RR_rekey_preserves_scoped_reference(self):
        self.check_snapshot('REKEY')

    def test_RR_project_move_preserves_scoped_reference(self):
        self.check_snapshot('PROJECT_MOVE')


result = unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(SnapshotInvariant))
raise SystemExit(0 if result.wasSuccessful() else 1)
