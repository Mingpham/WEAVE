"""Direct PostgREST/JWT checks on the real foundation migration.

INV-07, SEC-09; database groundwork for FR-MEM-04/06, FR-EVT-06, AT-05/06/07.
Real PostgreSQL/PostgREST; fixture auth.uid/users and locally signed JWTs.
Not Supabase Auth, Storage, Realtime, API routes, RPCs or full AT acceptance.
Requires cached PostgreSQL 17, PostgREST 16.5 and Python client images.
HTTP clients run on the internal Docker network; no ports are published.
"""
import base64
import hashlib
import hmac
import json
import os
import secrets
import time
import unittest
import uuid
import test_membership_foundation as foundation

IMAGE = 'public.ecr.aws/supabase/postgrest:v16.5'
CLIENT_IMAGE = 'python:3.13-slim'
# JSON input carries fixture JWTs over stdin, never command arguments or logs.
CLIENT = r"""
import json, sys
from urllib.request import Request, build_opener, ProxyHandler, HTTPRedirectHandler
from urllib.error import HTTPError, URLError
class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None
request = json.load(sys.stdin)
req = Request('http://rest:3000' + request['path'], method=request['method'],
              headers=request['headers'],
              data=None if request['body'] is None else json.dumps(request['body']).encode())
try:
    with build_opener(ProxyHandler({}), NoRedirect).open(req, timeout=3) as response:
        status, raw = response.status, response.read()
except HTTPError as error:
    status, raw = error.code, error.read()
except (URLError, TimeoutError, ConnectionError):
    status, raw = 0, b''
print(json.dumps([status, json.loads(raw) if raw else None]))
"""


class FoundationPostgrestTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.backend = foundation.FoundationTests
        cls.network = 'weave-http-' + uuid.uuid4().hex[:12]
        r = cls.backend.docker('image', 'inspect', IMAGE, CLIENT_IMAGE, '--format', '{{.Id}}')
        if r.returncode:
            raise RuntimeError('Cached PostgREST and Python client images required; no automatic pulls')
        r = cls.backend.docker('network', 'create', '--internal', cls.network)
        if r.returncode:
            raise RuntimeError(r.stderr)
        cls.addClassCleanup(cls.backend.docker, 'network', 'rm', cls.network)
        cls.addClassCleanup(cls.backend.doClassCleanups)
        cls.backend.setUpClass()
        r = cls.backend.docker('network', 'disconnect', 'none', cls.backend.container)
        if r.returncode:
            raise RuntimeError(r.stderr)
        r = cls.backend.docker('network', 'connect', '--alias', 'db', cls.network, cls.backend.container)
        if r.returncode:
            raise RuntimeError(r.stderr)
        cls.password = secrets.token_hex(24)
        cls.jwt_secret = secrets.token_hex(32)
        r = cls.backend.sql("CREATE ROLE authenticator LOGIN NOINHERIT PASSWORD '%s'; "
                            "GRANT authenticated, anon TO authenticator; "
                            "CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ "
                            "SELECT coalesce(nullif(current_setting('request.jwt.claim.sub',true),''), "
                            "nullif(current_setting('request.jwt.claims',true),'')::jsonb ->> 'sub')::uuid $$;"
                            % cls.password)
        if r.returncode:
            raise RuntimeError('PostgREST fixture authentication bootstrap failed')

    def setUp(self):
        self.fixture = self.backend('test_WP0_three_tables_have_rls')
        self.fixture.setUp()
        self.addCleanup(self.fixture.tearDown)
        self.server = 'weave-pgrst-' + uuid.uuid4().hex[:12]
        self.addCleanup(self.backend.docker, 'rm', '--force', self.server)
        # Values are passed through the environment, never embedded in CLI args.
        env = {**os.environ,
               'PGRST_DB_URI': f'postgres://authenticator:{self.password}@db:5432/{self.fixture.db}',
               'PGRST_JWT_SECRET': self.jwt_secret}
        r = self.backend.docker('run', '-d', '--pull=never', '--network', self.network,
                                '--name', self.server, '--network-alias', 'rest',
                                '-e', 'PGRST_DB_URI', '-e', 'PGRST_JWT_SECRET',
                                '-e', 'PGRST_DB_SCHEMAS=public', '-e', 'PGRST_DB_ANON_ROLE=anon',
                                IMAGE, env=env)
        self.assertEqual(r.returncode, 0, 'PostgREST container startup failed')
        deadline = time.monotonic() + 20
        while time.monotonic() < deadline:
            try:
                status, _ = self.http('GET', '/')
                if status == 200:
                    break
            except (TimeoutError, ConnectionError):
                pass
            time.sleep(0.2)
        else:
            self.fail('PostgREST readiness timed out; credentials/log bodies suppressed')

    def token(self, actor, *, secret=None):
        def encode(value):
            return base64.urlsafe_b64encode(json.dumps(value, separators=(',', ':')).encode()).rstrip(b'=')
        unsigned = encode({'alg': 'HS256', 'typ': 'JWT'}) + b'.' + encode({
            'sub': self.fixture.users[actor], 'role': 'authenticated',
            'iat': int(time.time()), 'exp': int(time.time()) + 600})
        signature = hmac.new((secret or self.jwt_secret).encode(), unsigned, hashlib.sha256).digest()
        return (unsigned + b'.' + base64.urlsafe_b64encode(signature).rstrip(b'=')).decode()

    def http(self, method, path, actor=None, body=None, token=None):
        headers = {'Content-Type': 'application/json'}
        if token is not None or actor is not None:
            headers['Authorization'] = 'Bearer ' + (token if token is not None else self.token(actor))
        payload = json.dumps({'method': method, 'path': path, 'headers': headers, 'body': body})
        result = self.backend.docker('run', '--rm', '--pull=never', '--network', self.network,
                                     '-i', CLIENT_IMAGE, 'python', '-c', CLIENT, input=payload)
        self.assertEqual(result.returncode, 0, 'Private-network HTTP client failed; output suppressed')
        return json.loads(result.stdout)

    def rows(self, table, actor, expected, query=''):
        status, rows = self.http('GET', '/' + table + '?select=id&order=id' + query, actor)
        self.assertEqual(status, 200, 'Protected-row GET failed')
        self.assertEqual([row['id'] for row in rows], sorted(expected))

    def test_INV07_SEC09_positive_exact_rows_for_both_projects(self):
        """INV-07 / SEC-09: authorized HTTP positive controls across all three tables."""
        f = self.fixture
        for actor, project, members in [(0, 0, [0, 2, 4, 5]), (1, 1, [1, 3]),
                                         (2, 0, [0, 2]), (3, 1, [1, 3])]:
            with self.subTest(actor=actor):
                self.rows('projects', actor, [f.projects[project]])
                self.rows('areas', actor, [f.areas[project]])
                self.rows('members', actor, [f.members[i] for i in members])

    def test_AT05_AT07_pending_removed_outsider(self):
        """AT-05/07 support: own request/status row only, no project or area reads."""
        for actor, member in [(4, [self.fixture.members[4]]), (5, [self.fixture.members[5]]), (6, [])]:
            self.rows('projects', actor, [])
            self.rows('areas', actor, [])
            self.rows('members', actor, member)

    def test_AT06_explicit_cross_project_filters(self):
        """AT-06 support: explicit other-project filters cannot bypass RLS."""
        for actor, other in [(0, 1), (2, 1), (1, 0), (3, 0)]:
            for table in ('projects', 'areas', 'members'):
                key = 'id' if table == 'projects' else 'project_id'
                self.rows(table, actor, [], f'&{key}=eq.{self.fixture.projects[other]}')

    def test_FRMEM06_removal_revokes_same_signed_token(self):
        """FR-MEM-06 / AT-07 support: an existing JWT loses reads immediately."""
        token = self.token(2)
        status, rows = self.http('GET', '/projects?select=id', token=token)
        self.assertEqual(status, 200)
        self.assertEqual([row['id'] for row in rows], [self.fixture.projects[0]])
        self.fixture.ok("UPDATE public.members SET status='REMOVED' WHERE id='%s';" % self.fixture.members[2])
        for table in ('projects', 'areas'):
            status, rows = self.http('GET', '/' + table + '?select=id', token=token)
            self.assertEqual(status, 200)
            self.assertEqual(rows, [])

    def test_FREVT06_soft_deletion_hides_every_branch(self):
        """FR-EVT-06 groundwork: deletion hides owner and self-membership branches."""
        self.rows('projects', 0, [self.fixture.projects[0]])
        self.fixture.ok("UPDATE public.projects SET deleted_at=now() WHERE id='%s';" % self.fixture.projects[0])
        for actor in (0, 2, 4, 5):
            for table in ('projects', 'areas', 'members'):
                self.rows(table, actor, [])
        self.rows('projects', 1, [self.fixture.projects[1]])

    def test_INV07_unsigned_and_forged_requests_denied(self):
        """INV-07: missing bearer and invalid signature cannot query protected rows."""
        for table in ('projects', 'areas', 'members'):
            status, _ = self.http('GET', '/' + table + '?select=id')
            self.assertEqual(status, 401)
            status, _ = self.http('GET', '/' + table + '?select=id', token=self.token(0, secret='invalid-fixture-signing-key'))
            self.assertEqual(status, 401)

    def test_INV01_authenticated_direct_mutations_denied(self):
        """INV-01/07: owner JWTs still cannot write through table endpoints."""
        f = self.fixture
        self.rows('projects', 0, [f.projects[0]])
        self.rows('areas', 0, [f.areas[0]])
        self.rows('members', 0, [f.members[i] for i in (0, 2, 4, 5)])
        payloads = {
            'projects': {'owner_user_id': f.users[0], 'title': 'HTTP fixture project',
                         'brief': 'x' * 40, 'starts_at': '2026-11-14T00:00Z',
                         'ends_at': '2026-11-14T01:00Z', 'timezone': 'UTC',
                         'expected_team_size': 5, 'settings': {}},
            'members': {'project_id': f.projects[0], 'user_id': f.users[6],
                        'role': 'PARTICIPANT', 'status': 'PENDING',
                        'nickname': 'HTTP fixture', 'availability': {'whole_event': True}},
            'areas': {'project_id': f.projects[0], 'name': 'HTTP fixture'}}
        ids = {'projects': f.projects[0], 'members': f.members[2], 'areas': f.areas[0]}
        updates = {'projects': {'title': 'Forbidden title'}, 'members': {'nickname': 'Forbidden nickname'},
                   'areas': {'notes': 'Forbidden note'}}
        for table in payloads:
            for method, path, body in [('POST', '/' + table, payloads[table]),
                                       ('PATCH', '/' + table + '?id=eq.' + ids[table], updates[table]),
                                       ('DELETE', '/' + table + '?id=eq.' + ids[table], None)]:
                with self.subTest(table=table, method=method):
                    status, error = self.http(method, path, 0, body)
                    self.assertEqual(status, 403)
                    self.assertEqual(error['code'], '42501')
        for table, expected in [('projects', '2'), ('members', '6'), ('areas', '2')]:
            self.assertEqual(f.ok('SELECT count(*) FROM public.' + table + ';'), expected)
        self.assertEqual(f.ok("SELECT title FROM public.projects WHERE id='%s';" % f.projects[0]), 'Fixture event')
        self.assertEqual(f.ok("SELECT nickname FROM public.members WHERE id='%s';" % f.members[2]), 'Member2')
        self.assertEqual(f.ok("SELECT count(*) FROM public.areas WHERE notes IS NOT NULL;"), '0')

    def test_INV07_private_helpers_not_exposed_as_rpc(self):
        """INV-07: private membership helpers are outside the REST exposed schema."""
        self.rows('projects', 0, [self.fixture.projects[0]])
        status, _ = self.http('POST', '/rpc/is_member', 0, {'p_project_id': self.fixture.projects[0]})
        self.assertEqual(status, 404)


if __name__ == '__main__':
    unittest.main(verbosity=2)
