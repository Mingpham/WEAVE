"""DB-11: permanent regressions for event-array references and isolation guard."""
from concurrent.futures import ThreadPoolExecutor
import subprocess
import time
import uuid
import storage_fixture as fixture


class Session:
    def __init__(self, test):
        self.process = subprocess.Popen(
            ['docker', '--context', 'default', 'exec', '-i', test.backend.container,
             'psql', '-h', '127.0.0.1', '-U', 'postgres', '-d', test.db,
             '-XAtq', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose'],
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            bufsize=0)
        test.addCleanup(self.close)
        self.query("SET statement_timeout='5s'")

    def query(self, sql):
        self.process.stdin.write((sql + "; SELECT 'RACE_DONE';\n").encode())
        self.process.stdin.flush()
        lines = []
        while True:
            line = self.process.stdout.readline()
            if not line:
                raise AssertionError('Race session ended: ' + self.process.stderr.read().decode())
            if line.strip() == b'RACE_DONE':
                return lines
            lines.append(line.decode().strip())

    def expect_error(self, test, sql, code):
        self.process.stdin.write((sql + '; COMMIT;\n').encode())
        self.process.stdin.flush()
        self.process.stdin.close()
        self.process.wait(timeout=10)
        error = self.process.stderr.read().decode()
        test.assertNotEqual(self.process.returncode, 0)
        test.assertIn(code, error)

    def close(self):
        if self.process.stdin and not self.process.stdin.closed:
            self.process.stdin.close()
        if self.process.poll() is None:
            try:
                self.process.wait(timeout=7)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait(timeout=3)
        self.process.stdout.close()
        self.process.stderr.close()


class EventReferenceRaces(fixture.StorageFixture):
    def wait_for_lock(self, name):
        deadline = time.monotonic() + 4
        while time.monotonic() < deadline:
            count = self.ok("SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND application_name='%s' AND wait_event_type='Lock';" % name)
            if count == '1':
                return
            time.sleep(0.05)
        self.fail('Competing session never reached a database lock wait')

    def test_DB11_stronger_snapshot_identity_changes_rejected(self):
        for isolation in ('REPEATABLE READ', 'SERIALIZABLE'):
            for change in ('DELETE', 'REKEY'):
                with self.subTest(isolation=isolation, change=change):
                    session = Session(self)
                    session.query('BEGIN ISOLATION LEVEL ' + isolation + '; SELECT count(*) FROM public.members')
                    self.ok(self.event_sql(self.members[2]))
                    sql = ("DELETE FROM public.members WHERE id='%s'" % self.members[2] if change == 'DELETE' else
                           "UPDATE public.members SET id='%s' WHERE id='%s'" % (str(uuid.uuid4()), self.members[2]))
                    session.expect_error(self, sql, '40001')
                    self.assertEqual(self.ok("SELECT count(*) FROM public.members WHERE id='%s';" % self.members[2]), '1')

    def test_DB11_read_committed_unreferenced_delete_allowed(self):
        self.assertEqual(self.ok("DELETE FROM public.members WHERE id='%s' RETURNING id;" % self.members[2]), self.members[2])

    def test_DB11_event_first_delete_waits_then_rejects(self):
        event = Session(self)
        event.query('BEGIN; ' + self.event_sql(self.members[2]))
        with ThreadPoolExecutor(max_workers=1) as pool:
            future = pool.submit(self.sql, "SET application_name='event_first_delete'; DELETE FROM public.members WHERE id='%s';" % self.members[2])
            self.wait_for_lock('event_first_delete')
            event.query('COMMIT')
            result = future.result(timeout=7)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('23503', result.stderr)
        self.assertEqual(self.ok("SELECT count(*) FROM public.members WHERE id='%s';" % self.members[2]), '1')

    def test_DB11_delete_first_event_waits_then_rejects(self):
        deletion = Session(self)
        deletion.query("BEGIN; DELETE FROM public.members WHERE id='%s'" % self.members[2])
        with ThreadPoolExecutor(max_workers=1) as pool:
            future = pool.submit(self.sql, "SET application_name='delete_first_event'; " + self.event_sql(self.members[2]))
            self.wait_for_lock('delete_first_event')
            deletion.query('COMMIT')
            result = future.result(timeout=7)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('23503', result.stderr)
        self.assertEqual(self.ok('SELECT count(*) FROM public.event_log;'), '0')


if __name__ == '__main__':
    import unittest
    unittest.main(verbosity=2)
