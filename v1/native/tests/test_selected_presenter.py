"""Selected presenter security/transport checks; optional real selected binary argument."""
import base64
import gzip
import hashlib
import http.client
import importlib.util
import io
import json
import os
from pathlib import Path
import sys
import tempfile
import threading
import unittest
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import Request, urlopen

BINARY = str(Path(sys.argv.pop(1)).resolve()) if len(sys.argv) > 1 and not sys.argv[1].startswith('-') else None
SPEC = importlib.util.spec_from_file_location("selected_presenter", Path(__file__).parents[1] / "presenter/server.py")
PRESENTER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(PRESENTER)


class AdapterStub:
    """HTTP-boundary fixture only; does not simulate native game decisions."""
    def __init__(self):
        self.calls = []

    def command(self, line, frame=False):
        self.calls.append(line)
        if frame:
            if line != 'frame 1':
                return {"error": "Stale frame request"}, None
            return {"revision": 1, "bytes": 54 + 1024 * 600 * 3}, b'BM' + bytes(52 + 1024 * 600 * 3)
        return {"revision": 1, "page": "study", "focus": "start", "ready": False}, None

    def close(self):
        pass

    def command_sequence(self, lines):
        for line in lines:
            result, pixels = self.command(line)
        return result, pixels


class SelectedPresenter(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.save = Path(self.directory.name) / 'legacy-save.txt'
        self.save.write_bytes(b'legacy save sentinel\nDo not reset or migrate.\n')
        self.save_hash = hashlib.sha256(self.save.read_bytes()).hexdigest()
        environment = patch.dict(os.environ, {"CRITTER_DEMO_SAVE": str(self.save), "BEECHO_V1_SAVE": str(Path(self.directory.name) / "v1.save")})
        environment.start()
        self.addCleanup(environment.stop)
        self.server = PRESENTER.ThreadingHTTPServer(('127.0.0.1', 0), PRESENTER.Handler)
        self.server.password = 'test-only-password'
        self.server.release = {"commit": 'a' * 40, "committed_at": '2026-09-25T11:00:00+00:00', "deployed_at": None}
        self.server.native = PRESENTER.NativeProcess(BINARY) if BINARY else AdapterStub()
        self.addCleanup(self.server.native.close)
        self.addCleanup(self.server.server_close)
        self.addCleanup(self.server.shutdown)
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        self.origin = f'http://127.0.0.1:{self.server.server_port}'

    def request(self, route, data=None, authenticated=True, headers=None):
        values = dict(headers or {})
        if authenticated:
            values['Authorization'] = 'Basic ' + base64.b64encode(b'lab:test-only-password').decode()
        request = Request(self.origin + route, data=data, headers=values)
        try:
            response = urlopen(request, timeout=5)
        except HTTPError as error:
            response = error
        with response:
            return response.status, response.read(), response.headers

    def input(self, event, revision=1, extra=None, headers=None):
        body = {"event": event, "revision": revision, **(extra or {})}
        values = {'Content-Type': 'application/json', 'X-Requested-With': 'CritterLab', 'Origin': self.origin}
        values.update(headers or {})
        return self.request('/api/input', json.dumps(body).encode(), headers=values)

    def test_every_route_keeps_basic_auth(self):
        for route in ('/', '/app.js', '/style.css', '/api/status', '/api/release', '/api/frame?revision=1'):
            self.assertEqual(self.request(route, authenticated=False)[0], 401)
        self.assertEqual(self.request('/api/input', b'{}', authenticated=False)[0], 401)
        self.assertEqual(self.request('/')[0], 200)
        self.assertIn(b'type="module" src="/app.js"', self.request('/')[1])
        self.assertIn(b'id="lab-critters" type="button" tabindex="-1" aria-label="Home"', self.request('/')[1])

    def test_production_https_proxy_origin_and_request_marker(self):
        self.assertEqual(self.input('cancel', headers={'Origin': 'https://preview.example', 'Host': 'preview.example', 'X-Forwarded-Proto': 'https'})[0], 200)
        self.assertEqual(self.input('cancel', headers={'Origin': 'https://preview.example', 'Host': 'preview.example'})[0], 403)
        self.assertEqual(self.input('cancel', headers={'Origin': 'https://attacker.example', 'Host': 'preview.example', 'X-Forwarded-Proto': 'https', 'X-Forwarded-Host': 'attacker.example'})[0], 403)
        self.assertEqual(self.input('cancel', headers={'X-Requested-With': ''})[0], 403)
        self.assertEqual(self.request('/api/command', b'{}')[0], 403)

    def test_anonymous_access_still_requires_strict_origin(self):
        self.server.password = ''
        self.assertEqual(self.request('/', authenticated=False)[0], 200)
        body = json.dumps({"event": 'cancel', "revision": 1}).encode()
        self.assertEqual(self.request('/api/input', body, authenticated=False)[0], 403)
        headers = {'Content-Type': 'application/json', 'X-Requested-With': 'CritterLab', 'Origin': self.origin}
        self.assertEqual(self.request('/api/input', body, authenticated=False, headers=headers)[0], 200)

    def test_input_shape_and_frame_bounds(self):
        for button in PRESENTER.BUTTONS:
            for edge in ('down', 'up'):
                self.assertEqual(self.input(f'{button}-{edge}')[0], 200)
        for event, revision, extra in [('rotate', 1, {'delta': 0}), ('rotate', 1, {'delta': True}), ('confirm-down', True, None), ('cancel', -1, None), ('cancel', 4294967296, None), ('incubate', 1, None), ('cancel', 1, {'operation_id': 'legacy'})]:
            self.assertEqual(self.input(event, revision, extra)[0], 400)
        for query in ('revision=0', 'revision=4294967296', 'revision=1&revision=2', 'device=lab&revision=1'):
            self.assertEqual(self.request('/api/frame?' + query)[0], 400)

    def test_painted_ready_prefix_is_down_only_and_validated_before_native_calls(self):
        for event, value in [('confirm-up', True), ('ready', True), ('confirm-down', False), ('confirm-down', 1)]:
            self.assertEqual(self.input(event, extra={'ready': value})[0], 400)
        if not BINARY:
            self.assertEqual(self.server.native.calls, [])
        self.assertEqual(self.input('confirm-down', extra={'ready': True})[0], 200)
        if not BINARY:
            self.assertEqual(self.server.native.calls, ['ready 1', 'confirm-down 1'])

    def test_status_and_stale_frame_keep_existing_health_contract(self):
        code, body, _ = self.request('/api/status')
        self.assertEqual(code, 200)
        revision = json.loads(body)['revision']
        self.assertIs(type(revision), int)
        code, pixels, headers = self.request(f'/api/frame?revision={revision}')
        self.assertEqual(code, 200)
        self.assertEqual(headers['Content-Type'], 'image/bmp')
        self.assertEqual(pixels[:2], b'BM')
        self.assertEqual(len(pixels), 54 + 1024 * 600 * 3)
        self.assertEqual(self.request(f'/api/frame?revision={revision + 1}')[0], 409)

    def test_negotiated_frames_are_lossless_and_keep_raw_fallback(self):
        revision = json.loads(self.request('/api/status')[1])['revision']
        route = f'/api/frame?revision={revision}'
        _, raw, _ = self.request(route)
        for encoding in ('gzip', 'br, gzip;q=0.5', '*'):
            code, encoded, headers = self.request(route, headers={'Accept-Encoding': encoding})
            self.assertEqual(code, 200)
            self.assertEqual(headers['Content-Encoding'], 'gzip')
            self.assertEqual(headers['Vary'], 'Accept-Encoding')
            self.assertEqual(int(headers['Content-Length']), len(encoded))
            self.assertLess(len(encoded), len(raw))
            self.assertEqual(gzip.decompress(encoded), raw)
        for encoding in ('identity', 'br', '*;q=1,gzip;q=0', 'gzip;q=invalid', 'gzip;q=2'):
            _, body, headers = self.request(route, headers={'Accept-Encoding': encoding})
            self.assertIsNone(headers.get('Content-Encoding'))
            self.assertEqual(body, raw)

    def test_persistent_connection_reuses_valid_requests_and_closes_unread_rejection(self):
        connection = http.client.HTTPConnection('127.0.0.1', self.server.server_port, timeout=5)
        self.addCleanup(connection.close)
        auth = 'Basic ' + base64.b64encode(b'lab:test-only-password').decode()
        headers = {'Authorization': auth, 'Content-Type': 'application/json',
                   'X-Requested-With': 'CritterLab', 'Origin': self.origin}
        connection.request('GET', '/api/status', headers=headers)
        response = connection.getresponse()
        self.assertEqual(response.status, 200)
        response.read()
        first_socket = connection.sock
        connection.request('POST', '/api/input', json.dumps({'event': 'cancel', 'revision': 1}), headers)
        response = connection.getresponse()
        self.assertEqual(response.status, 200)
        response.read()
        self.assertIs(connection.sock, first_socket)
        connection.request('POST', '/api/input', b'{"unread":"body"}', {'Authorization': auth})
        response = connection.getresponse()
        self.assertEqual(response.status, 403)
        self.assertEqual(response.getheader('Connection'), 'close')
        response.read()
        self.assertIsNone(connection.sock)
        connection.request('GET', '/api/status', headers=headers)
        response = connection.getresponse()
        self.assertEqual(response.status, 200)
        response.read()
        self.assertIsNot(connection.sock, first_socket)

    def test_release_contract_and_subject_validation_unchanged(self):
        code, body, _ = self.request('/api/release')
        self.assertEqual(code, 200)
        self.assertEqual(json.loads(body), self.server.release)
        self.assertEqual(self.request('/release.json')[0], 404)
        path = Path(self.directory.name) / 'release.json'
        metadata = {"commit": 'b' * 40, "committed_at": '2026-09-25T11:00:00Z', "deployed_at": '2026-09-26T12:34:56-06:00', "subject": 'Selected native preview'}
        path.write_text(json.dumps(metadata))
        loaded = PRESENTER.load_release(path)
        self.assertEqual(loaded['commit'], metadata['commit'])
        self.assertEqual(loaded['subject'], metadata['subject'])
        for value in ('two\nlines', '', 'a' * 201, None):
            metadata['subject'] = value
            path.write_text(json.dumps(metadata))
            self.assertIsNone(PRESENTER.load_release(path)['commit'])
        path.write_text('invalid')
        self.assertEqual(PRESENTER.load_release(path), {"commit": None, "committed_at": None, "deployed_at": None})

    def test_legacy_save_is_untouched(self):
        self.request('/api/status')
        self.input('cancel')
        self.request('/api/frame?revision=1')
        self.assertEqual(hashlib.sha256(self.save.read_bytes()).hexdigest(), self.save_hash)

    @unittest.skipUnless(BINARY, 'Real selected executable is exercised by committed CI/VM builds')
    def test_real_native_preview_and_return_do_not_spend_or_touch_save(self):
        revision = json.loads(self.request('/api/status')[1])['revision']
        self.input('ready', revision)
        self.input('confirm-down', revision)
        overview = json.loads(self.input('confirm-up', revision)[1])
        self.assertEqual((overview['page'], overview['focus']), ('home', 'Overview'))
        self.input('ready', revision)
        self.input('down-down', revision)
        focused = json.loads(self.input('down-up', revision)[1])
        self.assertEqual((focused['page'], focused['focus']), ('home', 'Explore'))
        self.input('ready', focused['revision'])
        self.input('confirm-down', focused['revision'])
        result = json.loads(self.input('confirm-up', focused['revision'])[1])
        self.assertEqual(result['page'], 'expedition')
        self.assertEqual(result['stock'], [0, 0, 0])
        self.input('ready', result['revision'])
        self.input('back-down', result['revision'])
        returned = json.loads(self.input('back-up', result['revision'])[1])
        self.assertEqual((returned['page'], returned['focus']), ('home', 'Explore'))
        self.input('ready', returned['revision'])
        self.input('critters-down', returned['revision'])
        home = json.loads(self.input('critters-up', returned['revision'])[1])
        self.assertEqual((home['page'], home['focus']), ('home', 'Overview'))
        self.assertEqual(home['stock'], [0, 0, 0])
        self.assertEqual(hashlib.sha256(self.save.read_bytes()).hexdigest(), self.save_hash)


class NativeFraming(unittest.TestCase):
    def test_ready_and_down_sequence_prevents_interleaved_native_command(self):
        writes = []
        prefix_written = threading.Event()
        release_prefix = threading.Event()
        errors = []
        class Input:
            def write(self, body):
                writes.append(body.decode().strip())
                if body.startswith(b'ready '):
                    prefix_written.set()
                    if not release_prefix.wait(2):
                        raise OSError('Prefix test deadline')
            def flush(self): pass
            def close(self): pass
        class Output:
            def readline(self): return b'{"revision":1}\n'
        class Process:
            stdin = Input()
            stdout = Output()
            def kill(self): release_prefix.set()
            def wait(self, timeout=None): return 0
        with patch.object(PRESENTER.subprocess, 'Popen', return_value=Process()):
            native = PRESENTER.NativeProcess('/selected-native')
            def run(sequence):
                try:
                    if sequence: native.command_sequence(['ready 1', 'confirm-down 1'])
                    else: native.command('status')
                except Exception as error: errors.append(error)
            first = threading.Thread(target=run, args=(True,))
            other = threading.Thread(target=run, args=(False,))
            first.start()
            self.assertTrue(prefix_written.wait(1))
            other.start()
            release_prefix.set()
            first.join(2)
            other.join(2)
            self.assertFalse(first.is_alive() or other.is_alive())
            self.assertEqual(errors, [])
            self.assertEqual(writes, ['ready 1', 'confirm-down 1', 'status'])
            native.close()

    def test_hung_native_command_deadline_fails_closed(self):
        stopped = threading.Event()
        class HungOutput:
            def readline(self):
                stopped.wait(1)
                return b''
        class Process:
            stdin = io.BytesIO()
            stdout = HungOutput()
            def kill(self): stopped.set()
            def wait(self, timeout=None): return 0
        with patch.object(PRESENTER.subprocess, 'Popen', return_value=Process()):
            native = PRESENTER.NativeProcess('/selected-native', timeout=0.03)
            with self.assertRaises(RuntimeError):
                native.command('status')
            self.assertTrue(stopped.is_set())
            self.assertTrue(native.unavailable)
            with self.assertRaises(RuntimeError):
                native.command('status')
            native.close()
    def test_process_uses_serve_without_legacy_save_and_reads_exact_binary(self):
        pixels = b'BM' + bytes(52 + 1024 * 600 * 3)
        output = io.BytesIO(json.dumps({"revision": 1, "bytes": len(pixels)}).encode() + b'\n' + pixels)
        class Process:
            stdin = io.BytesIO()
            stdout = output
            def wait(self, timeout=None): return 0
        with patch.object(PRESENTER.subprocess, 'Popen', return_value=Process()) as launch:
            native = PRESENTER.NativeProcess('/selected-native')
            header, body = native.command('frame 1', frame=True)
            self.assertEqual(header['revision'], 1)
            self.assertEqual(body, pixels)
            launch.assert_called_once_with(['/selected-native', 'serve'], stdin=PRESENTER.subprocess.PIPE, stdout=PRESENTER.subprocess.PIPE)
            native.close()


if __name__ == '__main__':
    unittest.main()

