"""Focused reset lifecycle/security checks, with optional real native proof."""
import base64
import importlib.util
import json
import os
from pathlib import Path
import sys
import tempfile
import threading
import unittest
from unittest.mock import Mock, patch
from urllib.error import HTTPError
from urllib.request import Request, urlopen

BINARY = str(Path(sys.argv.pop(1)).resolve()) if len(sys.argv) > 1 and not sys.argv[1].startswith('-') else None
SPEC = importlib.util.spec_from_file_location("reset_presenter", Path(__file__).parents[1] / "presenter/server.py")
PRESENTER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(PRESENTER)
SUFFIXES = ("", ".tmp", ".kit", ".kit.tmp", ".kit.required", ".kit.required.tmp")


class ResetLifecycle(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.save = Path(self.directory.name) / "world"
        environment = patch.dict(os.environ, {"BEECHO_V1_SAVE": str(self.save)})
        environment.start()
        self.addCleanup(environment.stop)
        launch = patch.object(PRESENTER.subprocess, "Popen", side_effect=lambda *args, **kwargs: Mock())
        launch.start()
        self.addCleanup(launch.stop)
        self.native = PRESENTER.NativeProcess("/fixture", kit=True)
        self.native.command = Mock(side_effect=lambda *args, **kwargs: ({"sandbox": self.native.sandbox, "revision": 1}, None))
        self.addCleanup(self.native.close)
        self.original = {suffix: ("saved" + suffix).encode() for suffix in SUFFIXES}
        for suffix, contents in self.original.items():
            Path(str(self.save) + suffix).write_bytes(contents)
        self.session_lock = Path(str(self.save) + ".session.lock")
        self.session_lock.write_bytes(b"keep lock inode")

    def test_backup_all_sidecars_and_reject_previous_client_release(self):
        old = self.native.sandbox
        result = self.native.reset(old)
        self.assertNotEqual(old, result["sandbox"])
        backup = self.save.parent / result["backup"]
        for suffix, contents in self.original.items():
            self.assertEqual((backup / (self.save.name + suffix)).read_bytes(), contents)
            self.assertFalse(Path(str(self.save) + suffix).exists())
        self.assertEqual(self.session_lock.read_bytes(), b"keep lock inode")
        for stale in (old, None):
            with self.assertRaises(PRESENTER.StaleSandbox):
                self.native.guarded_command(["device 0 confirm-up 1"], stale)
        self.assertEqual(len(result["devices"]), 3)

    def test_failed_fresh_start_restores_every_original(self):
        start = self.native.start
        with patch.object(self.native, "start", side_effect=[OSError("startup failed"), start()]):
            with self.assertRaises(RuntimeError):
                self.native.reset(self.native.sandbox)
        for suffix, contents in self.original.items():
            self.assertEqual(Path(str(self.save) + suffix).read_bytes(), contents)
        self.assertFalse(self.native.unavailable)

    def test_partial_move_failure_restores_moved_and_unmoved_files(self):
        rename = Path.rename
        def fail_second(path, target):
            if path == Path(str(self.save) + ".tmp"):
                raise OSError("move failed")
            return rename(path, target)
        with patch.object(Path, "rename", fail_second):
            with self.assertRaises(RuntimeError):
                self.native.reset(self.native.sandbox)
        for suffix, contents in self.original.items():
            self.assertEqual(Path(str(self.save) + suffix).read_bytes(), contents)

    def test_reset_waits_for_existing_native_sequence(self):
        entered = threading.Event()
        finished = threading.Event()
        old = self.native.sandbox
        def reset():
            entered.set()
            self.native.reset(old)
            finished.set()
        with self.native.lock:
            thread = threading.Thread(target=reset)
            thread.start()
            self.assertTrue(entered.wait(1))
            self.assertFalse(finished.wait(.05))
            self.assertEqual(self.native.sandbox, old)
        thread.join(2)
        self.assertTrue(finished.is_set())


class ResetHTTP(unittest.TestCase):
    def setUp(self):
        self.server = PRESENTER.ThreadingHTTPServer(("127.0.0.1", 0), PRESENTER.Handler)
        self.server.password = "reset-test"
        self.server.native = Mock()
        self.server.native.reset.return_value = {"sandbox": "b" * 32, "backup": "world.reset-test"}
        self.addCleanup(self.server.server_close)
        self.addCleanup(self.server.shutdown)
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        self.origin = f"http://127.0.0.1:{self.server.server_port}"

    def request(self, body=None, **overrides):
        headers = {"Authorization": "Basic " + base64.b64encode(b"lab:reset-test").decode(),
                   "Origin": self.origin, "Content-Type": "application/json", "X-Requested-With": "CritterLab"}
        headers.update(overrides)
        try:
            response = urlopen(Request(self.origin + "/api/reset", data=body or
                               json.dumps({"confirm": True, "sandbox": "a" * 32}).encode(), headers=headers), timeout=5)
        except HTTPError as error:
            response = error
        with response:
            return response.status

    def test_auth_origin_header_confirmation_and_size_guards(self):
        self.assertEqual(self.request(Authorization=""), 401)
        self.assertEqual(self.request(Origin="http://elsewhere.invalid"), 403)
        self.assertEqual(self.request(**{"X-Requested-With": ""}), 403)
        self.assertEqual(self.request(b'{"confirm":false,"sandbox":"' + b'a' * 32 + b'"}'), 400)
        self.assertEqual(self.request(b'{"confirm":true}'), 400)
        self.assertEqual(self.request(b' ' * 1025), 400)
        self.server.native.reset.assert_not_called()
        self.assertEqual(self.request(), 200)
        self.server.native.reset.assert_called_once_with("a" * 32)


@unittest.skipUnless(BINARY, "Supply pushed, CI-built selected_lab for real native proof")
class ActualNativeReset(unittest.TestCase):
    def test_fresh_three_device_world_and_restart(self):
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, {"BEECHO_V1_SAVE": str(Path(directory) / "world")}):
            native = PRESENTER.NativeProcess(BINARY, kit=True)
            save = native.save_path
            try:
                old = native.sandbox
                initial = native.check_devices()
                native.guarded_command(["device 1 link 0"], old)
                native.guarded_command(["device 2 link 0"], old)
                revision = native.command("device 1 status")[0]["revision"]
                native.guarded_command([f"device 1 ready {revision}", f"device 1 confirm-down {revision}"], old)
                original = {suffix: Path(str(save) + suffix).read_bytes()
                            for suffix in SUFFIXES if Path(str(save) + suffix).exists()}
                lock_inode = Path(str(save) + ".session.lock").stat().st_ino
                result = native.reset(old)
                backup = save.parent / result["backup"]
                for suffix, contents in original.items():
                    self.assertEqual((backup / (save.name + suffix)).read_bytes(), contents)
                self.assertEqual(Path(str(save) + ".session.lock").stat().st_ino, lock_inode)
                for state, expected in zip(result["devices"], initial):
                    for key in ("page", "stock", "cargo", "samples", "residents", "phase"):
                        self.assertEqual(state[key], expected[key], key)
                    self.assertTrue(state["online"])
                    self.assertFalse(state["failed"])
                with self.assertRaises(PRESENTER.StaleSandbox):
                    native.guarded_command([f"device 1 confirm-up {revision}"], old)
                # Even a token-current release cannot finish the dead process's hold.
                native.guarded_command(["device 1 confirm-up 1"], result["sandbox"])
                self.assertEqual(native.command("device 1 status")[0]["page"], initial[1]["page"])
                native.close()
                native = PRESENTER.NativeProcess(BINARY, kit=True)
                restarted = native.check_devices()
                for state, expected in zip(restarted, initial):
                    self.assertEqual(state["page"], expected["page"])
                    self.assertEqual(state["stock"], expected["stock"])
                    self.assertEqual(state["cargo"], expected["cargo"])
                    self.assertTrue(state["online"])
            finally:
                native.close()


if __name__ == "__main__":
    unittest.main()
