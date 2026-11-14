"""WP-0-DB: validate the real enum migration on disposable PostgreSQL 17.

Run from any directory: python3 tests/security/test_domain_enums.py -v
This is migration/contract groundwork, not application RLS or AT acceptance.
"""
import json
import os
from pathlib import Path
import subprocess
import time
import unittest
import uuid

ROOT = Path(__file__).resolve().parents[2]
MIGRATION = ROOT / 'supabase/migrations/20261114050000_domain_enums.sql'

class DomainEnumTests(unittest.TestCase):
    @classmethod
    def docker(cls, *args, **kw):
        return subprocess.run(['docker', '--context', os.getenv('WEAVE_TEST_DOCKER_CONTEXT', 'default'), *args], text=True,
                              capture_output=True, timeout=60, **kw)

    @classmethod
    def sql(cls, sql, db='postgres'):
        return cls.docker('exec', '-i', cls.container, 'psql', '-XAt', '-h', '127.0.0.1', '-U', 'postgres',
                          '-d', db, '-v', 'ON_ERROR_STOP=1', input=sql)

    @classmethod
    def setUpClass(cls):
        # Native TS stripping loads canonical data without package installation.
        result = subprocess.run(
            ['node', '--experimental-strip-types', '--input-type=module', '-e',
             'import {ENUMS} from "./packages/contracts/src/index.ts"; console.log(JSON.stringify(ENUMS))'],
            cwd=ROOT, text=True, capture_output=True, check=True, timeout=30)
        cls.expected = json.loads(result.stdout)
        if len(cls.expected) != 49:
            raise RuntimeError('Expected 49 canonical enums; review specification/contract drift')
        cls.migration_sql = MIGRATION.read_text()
        cls.container = 'weave-enums-' + uuid.uuid4().hex[:12]
        r = cls.docker('run', '-d', '--pull=never', '--network=none', '--name', cls.container,
                       '--tmpfs', '/var/lib/postgresql/data', '-e',
                       'POSTGRES_HOST_AUTH_METHOD=trust', 'postgres:17-alpine')
        if r.returncode: raise RuntimeError(r.stderr)
        cls.addClassCleanup(cls.docker, 'rm', '-f', cls.container)
        for _ in range(100):
            if cls.sql('SELECT 1;').returncode == 0: break
            time.sleep(.2)
        else: raise RuntimeError('PostgreSQL readiness failed')
        r = cls.sql('CREATE ROLE authenticated; CREATE DATABASE rollback_test;')
        if r.returncode: raise RuntimeError(r.stderr)
        r = cls.sql(cls.migration_sql)
        if r.returncode: raise RuntimeError(r.stderr)

    def test_WP0_spec_7_2_enum_catalog_matches_contracts(self):
        r = self.sql("SELECT json_object_agg(typname, labels) FROM ("
                     "SELECT t.typname, json_agg(e.enumlabel ORDER BY e.enumsortorder) labels "
                     "FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid "
                     "JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' "
                     "GROUP BY t.typname) q;")
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(json.loads(r.stdout.strip() or '{}'), self.expected)

    def test_WP0_all_canonical_values_are_accepted(self):
        for name, values in self.expected.items():
            with self.subTest(enum=name):
                r = self.sql('SELECT ' + ', '.join("'%s'::public.%s" % (v, name) for v in values) + ';')
                self.assertEqual(r.returncode, 0, r.stderr)
                self.assertEqual(r.stdout.strip().split('|'), values)

    def test_WP0_unknown_values_are_rejected(self):
        for name in self.expected:
            with self.subTest(enum=name):
                r = self.sql("SELECT '__INVALID__'::public.%s;" % name)
                self.assertNotEqual(r.returncode, 0)
                self.assertIn('invalid input value for enum', r.stderr)

    def test_INV07_application_role_cannot_alter_domain(self):
        for name in self.expected:
            with self.subTest(enum=name):
                r = self.sql("SET ROLE authenticated; ALTER TYPE public.%s ADD VALUE 'UNAUTHORIZED';" % name)
                self.assertNotEqual(r.returncode, 0)
                self.assertIn('must be owner of type', r.stderr)

    def test_WP0_migration_is_transactional(self):
        r = self.sql('BEGIN;\n' + self.migration_sql + '\nROLLBACK;\n'
                     "SELECT count(*) FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace "
                     "WHERE n.nspname='public' AND t.typtype='e';", 'rollback_test')
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(r.stdout.strip().splitlines()[-1], '0')

    def test_WP0_no_business_tables_added(self):
        r = self.sql("SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace "
                     "WHERE n.nspname='public' AND c.relkind IN ('r','p');")
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(r.stdout.strip(), '0')

if __name__ == '__main__':
    unittest.main(verbosity=2)
