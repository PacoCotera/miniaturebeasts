"""Host integration checks. Pass the built executable as the only argument."""
import json
from pathlib import Path
import struct
import subprocess
import sys
import tempfile
import unittest

BINARY = str(Path(sys.argv.pop(1)).resolve())


class NativeLoop(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.save = Path(self.directory.name) / "state.txt"
        self.operation = 0

    def invoke(self, *arguments, success=True):
        result = subprocess.run([BINARY, "--save", str(self.save), *map(str, arguments)],
                                capture_output=True, check=False)
        self.assertEqual(result.returncode == 0, success, result.stdout)
        return result.stdout

    def state(self):
        return json.loads(self.invoke("status"))

    def command(self, name):
        revision = self.state()["revision"]
        self.operation += 1
        return json.loads(self.invoke("command", name, revision, f"op-{self.operation}"))

    def complete(self, inspect=True):
        for action in ("review", "load", "start", "advance"):
            self.command(action)
        self.command("inspect" if inspect else "leave")
        for action in ("advance", "receive", "study_review", "run"):
            self.command(action)

    def test_loop_persists_and_does_not_regrant(self):
        self.complete()
        saved = self.state()
        self.assertTrue(saved["finding"])
        self.assertEqual(saved["reagent"], 1)
        self.assertEqual(saved["unknown_regions"], 2)
        self.assertEqual(saved["event"], 2)
        for action in ("run", "receive", "advance", "start"):
            self.invoke("command", action, saved["revision"], "invalid", success=False)
        self.assertEqual(saved, self.state())
        for action in ("back", "finding"):
            self.command(action)
        self.assertTrue(self.state()["finding"])
        self.assertEqual(self.state()["reagent"], 1)
        # Old page 3 saves stay useful without rewriting on read or spending.
        self.save.write_text(self.save.read_text().replace("lab_page 5", "lab_page 3"))
        legacy = self.state()
        self.assertNotIn("run", [action["name"] for action in legacy["actions"]])
        self.command("finding")
        self.assertEqual(self.state()["reagent"], 1)

    def test_exact_retry_and_stale_are_distinct(self):
        first = self.invoke("command", "review", 0, "same-id")
        self.assertEqual(first, self.invoke("command", "review", 0, "same-id"))
        self.invoke("command", "load", 0, "same-id", success=False)
        self.invoke("command", "review", 0, "old-id", success=False)
        self.command("load")
        self.invoke("command", "review", 0, "same-id", success=False)
        self.assertEqual(self.state()["revision"], 2)

    def test_reset_is_monotonic_idempotent_and_clears_finding(self):
        fresh = self.command("reset")
        self.assertEqual((fresh["revision"], fresh["phase"], fresh["reagent"], fresh["finding"]), (1, 0, 0, False))
        self.complete()
        previous = self.state()
        self.assertTrue(previous["finding"])
        arguments = ("command", "reset", previous["revision"], "reset-finding")
        result = self.invoke(*arguments)
        reset = json.loads(result)
        self.assertEqual(reset["revision"], previous["revision"] + 1)
        self.assertEqual((reset["phase"], reset["reagent"], reset["finding"], reset["event"]), (0, 0, False, 0))
        self.assertEqual(result, self.invoke(*arguments))
        self.invoke("command", "finding", previous["revision"], "old-finding", success=False)
        self.assertEqual(reset, self.state())
        self.command("review")
        self.invoke(*arguments, success=False)

    def test_reset_uncertain_save_retries_same_identity(self):
        self.complete()
        previous = self.state()
        temporary = Path(str(self.save) + ".tmp")
        temporary.mkdir()
        arguments = [BINARY, "--save", str(self.save), "command", "reset", str(previous["revision"]), "retry-reset"]
        result = subprocess.run(arguments, capture_output=True, check=False)
        self.assertEqual(result.returncode, 3, result.stdout)
        self.assertEqual(previous, self.state())
        temporary.rmdir()
        result = subprocess.run(arguments, capture_output=True, check=False)
        self.assertEqual(result.returncode, 0, result.stdout)
        self.assertEqual(json.loads(result.stdout)["revision"], previous["revision"] + 1)
        self.assertEqual(result.stdout, self.invoke("command", "reset", previous["revision"], "retry-reset"))

    def test_leave_is_optional_and_corruption_fails_closed(self):
        self.complete(inspect=False)
        self.assertEqual(self.state()["event"], 3)
        data = self.save.read_bytes() + b"unexpected tail\n"
        self.save.write_bytes(data)
        self.invoke("status", success=False)
        self.invoke("command", "review", 0, "new", success=False)
        self.assertEqual(self.save.read_bytes(), data)

    def test_native_bmp_dimensions_pixels_and_revision(self):
        for device, dimensions in (("lab", (1024, 600)), ("probe", (122, 250)), ("companion", (368, 448))):
            frame = self.invoke("frame", device, 0)
            self.assertEqual(frame[:2], b"BM")
            self.assertEqual(struct.unpack_from("<II", frame, 18), dimensions)
            self.assertEqual(struct.unpack_from("<I", frame, 2)[0], len(frame))
            self.assertGreater(len(set(frame[54:])), 1)
        self.command("review")
        self.command("load")
        self.invoke("frame", "lab", 0, success=False)

    def test_save_failure_is_uncertain_and_same_identity_can_retry(self):
        temporary = Path(str(self.save) + ".tmp")
        temporary.mkdir()
        arguments = [BINARY, "--save", str(self.save), "command", "review", "0", "retry-save"]
        result = subprocess.run(arguments, capture_output=True, check=False)
        self.assertEqual(result.returncode, 3, result.stdout)
        temporary.rmdir()
        result = subprocess.run(arguments, capture_output=True, check=False)
        self.assertEqual(result.returncode, 0, result.stdout)
        self.assertEqual(json.loads(result.stdout)["revision"], 1)


if __name__ == "__main__":
    unittest.main()
