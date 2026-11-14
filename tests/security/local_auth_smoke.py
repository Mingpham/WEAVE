"""Local Supabase Auth smoke checks; never targets a hosted project.

WEAVE_SUPABASE_WORKDIR=/path/to/isolated/workspace python3 tests/security/local_auth_smoke.py -v
No JWTs, keys, signed URLs or response bodies are printed by this utility.
"""
import base64
import json
import os
from pathlib import Path
import subprocess
import unittest
from urllib.error import HTTPError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, request, response, code, message, headers, new_url):
        return None


class LocalAuthSmoke(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        workdir = os.environ.get('WEAVE_SUPABASE_WORKDIR')
        if not workdir or not (Path(workdir) / 'supabase/config.toml').is_file():
            raise RuntimeError('Set WEAVE_SUPABASE_WORKDIR to an initialized isolated local workspace')
        result = subprocess.run(
            ['npx', '--yes', 'supabase@3.1.0', 'status', '--workdir', workdir, '-o', 'json'],
            env={**os.environ, 'DOCKER_CONTEXT': os.getenv('WEAVE_TEST_DOCKER_CONTEXT', 'default')},
            capture_output=True, text=True, timeout=60)
        if result.returncode:
            raise RuntimeError('Supabase local status failed; start the isolated local stack first')
        try:
            status = json.loads(result.stdout)
            cls.url = status['API_URL'].rstrip('/')
            cls.anon_key = status['ANON_KEY']
            cls.service_key = status['SERVICE_ROLE_KEY']
        except (ValueError, KeyError):
            raise RuntimeError('Supabase local status is missing the expected local API/key fields') from None
        parsed = urlsplit(cls.url)
        if (parsed.scheme != 'http' or parsed.hostname not in ('127.0.0.1', 'localhost', '::1')
                or parsed.username or parsed.password or parsed.query or parsed.fragment
                or parsed.path):
            raise RuntimeError('Refusing a non-loopback or non-root Supabase API URL')

    @classmethod
    def request(cls, method, path, payload=None, token=None, admin=False):
        key = cls.service_key if admin else cls.anon_key
        headers = {'apikey': key, 'Authorization': 'Bearer ' + (token or key),
                   'Content-Type': 'application/json'}
        request = Request(cls.url + path, method=method, headers=headers,
                          data=None if payload is None else json.dumps(payload).encode())
        try:
            with build_opener(NoRedirect).open(request, timeout=15) as response:
                raw = response.read()
                return response.status, json.loads(raw) if raw else None
        except HTTPError as error:
            return error.code, None

    def test_FR_AUTH_02_anonymous_session_and_refresh_keep_identity(self):
        """FR-AUTH-02: anonymous identity survives an Auth session refresh."""
        status, session = self.request('POST', '/auth/v1/signup', {})
        self.assertEqual(status, 200, 'Anonymous signup failed')
        user_id = session['user']['id']
        try:
            self.assertTrue(session['user']['is_anonymous'])
            claims = json.loads(base64.urlsafe_b64decode(
                session['access_token'].split('.')[1] + '==='))
            self.assertEqual(claims['role'], 'authenticated')
            self.assertEqual(claims['sub'], user_id)
            status, user = self.request('GET', '/auth/v1/user', token=session['access_token'])
            self.assertEqual(status, 200, 'Auth rejected its new access token')
            self.assertEqual(user['id'], user_id)
            status, refreshed = self.request('POST', '/auth/v1/token?grant_type=refresh_token',
                                             {'refresh_token': session['refresh_token']})
            self.assertEqual(status, 200, 'Session refresh failed')
            self.assertEqual(refreshed['user']['id'], user_id)
        finally:
            status, _ = self.request('DELETE', '/auth/v1/admin/users/' + user_id, admin=True)
            self.assertEqual(status, 200, 'Failed to remove the test-created local user')

    def test_FR_AUTH_03_runtime_provider_configuration(self):
        """FR-AUTH-03 supporting config check; Google integration remains pending."""
        status, settings = self.request('GET', '/auth/v1/settings')
        self.assertEqual(status, 200, 'Auth settings endpoint unavailable')
        self.assertIs(settings['external']['anonymous_users'], True)
        self.assertIs(settings['external']['email'], False)
        self.assertIs(settings['external']['phone'], False)
        # Google remains deliberately disabled until real credentials are supplied.
        self.assertIs(settings['external']['google'], False)

    def test_WP0_postgrest_is_ready(self):
        """WP-0-DB: PostgREST readiness only, not a row-isolation assertion."""
        status, schema = self.request('GET', '/rest/v1/')
        self.assertEqual(status, 200, 'PostgREST schema endpoint unavailable')
        self.assertIn('paths', schema)


if __name__ == '__main__':
    unittest.main()
