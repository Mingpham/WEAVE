"""Security regression for the local smoke client's HTTP boundary."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import threading
import unittest

import local_auth_smoke as smoke


class LocalSmokeClientSafety(unittest.TestCase):
    def test_SEC02_redirect_does_not_forward_credentials_to_another_origin(self):
        received = []

        class Target(BaseHTTPRequestHandler):
            def do_GET(self):
                received.append(self.headers.get('Authorization'))
                self.send_response(200)
                self.end_headers()
                self.wfile.write(b'{}')

            def log_message(self, *_):
                pass

        target = ThreadingHTTPServer(('127.0.0.1', 0), Target)

        class Redirect(BaseHTTPRequestHandler):
            def do_GET(self):
                self.send_response(302)
                self.send_header('Location', f'http://127.0.0.1:{target.server_port}/')
                self.end_headers()

            def log_message(self, *_):
                pass

        source = ThreadingHTTPServer(('127.0.0.1', 0), Redirect)
        for server in (target, source):
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            self.addCleanup(server.server_close)
            self.addCleanup(thread.join, 2)
            self.addCleanup(server.shutdown)
        # Test-only placeholders; no real credential is read or sent.
        smoke.LocalAuthSmoke.url = f'http://127.0.0.1:{source.server_port}'
        smoke.LocalAuthSmoke.anon_key = 'test-placeholder'
        smoke.LocalAuthSmoke.service_key = 'test-placeholder'
        status, _ = smoke.LocalAuthSmoke.request('GET', '/auth/v1/settings')
        self.assertEqual(status, 302, 'Smoke client followed an unexpected redirect')
        self.assertEqual(received, [], 'Redirect target received authorization')


if __name__ == '__main__':
    unittest.main()
