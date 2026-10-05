"""Focused headless replacement checks; pass the isolated Linux executable."""
import concurrent.futures
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

BINARY = str(Path(sys.argv.pop(1)).resolve())


class ReplacementLoop(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory(prefix="critter-replacement-")
        self.addCleanup(directory.cleanup)
        self.save = Path(directory.name) / "replacement.txt"
        self.sequence = 0
        self.epoch = "service-a"
        self.offset = 100000

    def invoke(self, *arguments, success=True):
        result = subprocess.run(
            [BINARY, "--save", str(self.save), *map(str, arguments)],
            capture_output=True, text=True, check=False)
        self.assertEqual(result.returncode == 0, success, result.stdout + result.stderr)
        return json.loads(result.stdout)

    def view(self, device="lab"):
        return self.invoke("status", device)

    def command(self, name, offset=None):
        self.sequence += 1
        return self.invoke("command", name, self.view()["revision"],
                           f"user-{self.sequence}", self.epoch,
                           self.offset if offset is None else offset)

    def tick(self, elapsed):
        self.offset = 100000 + elapsed
        return self.invoke("tick", self.epoch, self.offset)

    def start(self):
        self.invoke("tick", self.epoch, 0)
        self.command("review")
        self.command("load")
        self.command("start")
        self.assertEqual(self.view("probe")["view"]["elapsed_ms"], 0)

    def finish(self):
        self.start()
        self.tick(120000)
        self.command("receive")

    def test_exact_thresholds_retry_and_over_target(self):
        self.start()
        boundaries = [(29999, 0, 0, 0), (30000, 1, 0, 0), (44999, 1, 0, 0),
                      (45000, 1, 1, 0), (89999, 1, 1, 0), (90000, 2, 1, 0),
                      (119999, 2, 1, 0), (120000, 2, 1, 1)]
        for elapsed, supplies, event, sealed in boundaries:
            with self.subTest(elapsed=elapsed):
                self.tick(elapsed)
                view = self.view("probe")["view"]
                self.assertEqual((view["elapsed_ms"], view["aboard_supplies"],
                                  view["event"], view["aboard_sealed_samples"]),
                                 (elapsed, supplies, event, sealed))
                before = self.save.read_bytes()
                duplicate = self.invoke("tick", self.epoch, self.offset)
                self.assertFalse(duplicate["changed"])
                self.assertEqual(before, self.save.read_bytes())
        revision = self.view()["revision"]
        self.tick(999999)
        self.assertEqual(self.view()["revision"], revision)
        self.assertEqual(self.view("probe")["view"]["elapsed_ms"], 120000)

    def test_large_delta_restart_and_prestart_exclusion(self):
        self.start()
        self.tick(35000)
        self.invoke("tick", "service-b", 9000000)
        self.assertEqual(self.view("probe")["view"]["elapsed_ms"], 35000)
        self.invoke("tick", "service-b", 9000001)
        self.assertEqual(self.view("probe")["view"]["elapsed_ms"], 35001)
        self.invoke("tick", "service-b", 9200000)
        view = self.view("probe")["view"]
        self.assertEqual((view["elapsed_ms"], view["aboard_supplies"],
                          view["aboard_sealed_samples"], view["event"]), (120000, 2, 1, 1))
        self.invoke("tick", "service-b", 9199999, success=False)

    def test_user_receipt_survives_ticks_and_restart_metadata(self):
        self.start()
        self.tick(45000)
        revision = self.view()["revision"]
        accepted = self.invoke("command", "inspect", revision, "uncertain-user",
                               self.epoch, self.offset)
        self.tick(60000)
        self.invoke("tick", "service-restart", 123)
        before = self.save.read_bytes()
        replay = self.invoke("command", "inspect", revision, "uncertain-user",
                             "service-restart", 456789)
        self.assertTrue(replay["operation"]["replayed"])
        self.assertEqual(replay["operation"]["accepted_revision"],
                         accepted["operation"]["accepted_revision"])
        self.assertEqual(before, self.save.read_bytes())
        self.assertEqual(self.view("probe")["view"]["event"], 2)
        self.invoke("command", "leave", revision, "uncertain-user",
                    "service-restart", 456789, success=False)
        self.invoke("command", "inspect", revision + 1, "uncertain-user",
                    "service-restart", 456789, success=False)

    def test_check_inspect_leave_do_not_earn_time_or_supplies(self):
        self.start()
        self.tick(45000)
        before = self.view("probe")["view"]
        self.command("check")
        self.command("leave")
        after = self.view("probe")["view"]
        self.assertEqual((after["elapsed_ms"], after["aboard_supplies"]),
                         (before["elapsed_ms"], before["aboard_supplies"]))
        self.assertEqual(after["event"], 3)
        self.tick(90000)
        self.assertEqual(self.view("probe")["view"]["event"], 3)

    def test_probe_disclosure_receipt_paid_study_and_revisit(self):
        forbidden = {"finding", "form_references", "unknown_regions", "pattern",
                     "traits", "genotype", "research", "supplies_spent"}
        self.start()
        for elapsed in (30000, 45000, 90000, 120000):
            self.tick(elapsed)
            projection = self.view("probe")
            self.assertFalse(forbidden.intersection(projection))
            self.assertFalse(forbidden.intersection(projection["view"]))
        self.command("haul")
        self.assertTrue(self.view("probe")["view"]["summary"])
        self.command("receive")
        probe = self.view("probe")
        self.assertEqual(probe["actions"], [])
        self.assertEqual((probe["view"]["status"], probe["view"]["aboard_supplies"],
                          probe["view"]["aboard_sealed_samples"], probe["view"]["event"]),
                         ("empty", 0, 0, 0))
        self.command("study_review")
        before = self.view()["view"]
        self.assertEqual((before["supplies"], before["study_cost"],
                          before["finding"], before["form_references"]), (2, 1, False, []))
        self.command("back")
        self.assertEqual(self.view()["view"]["supplies"], 2)
        self.command("study_review")
        self.command("run")
        after = self.view()["view"]
        self.assertEqual((after["supplies"], after["finding"], after["form_selected"],
                          after["form_references"]), (1, True, False, ["Layered", "Fibrous"]))
        self.command("inspect")  # Late neutral observation remains independent.
        self.command("back")
        self.command("finding")
        self.assertEqual(self.view()["view"]["supplies"], 1)
        self.assertFalse(forbidden.intersection(self.view("probe")["view"]))
        self.invoke("command", "run", self.view()["revision"], "again", self.epoch,
                    self.offset, success=False)

    def test_concurrent_tick_and_user_commands_do_not_double_spend(self):
        self.finish()
        self.command("study_review")
        revision = self.view()["revision"]
        invocations = [
            ["command", "run", revision, "study-a", self.epoch, self.offset],
            ["command", "run", revision, "study-b", self.epoch, self.offset],
            ["tick", self.epoch, self.offset],
        ]
        def execute(arguments):
            return subprocess.run([BINARY, "--save", str(self.save), *map(str, arguments)],
                                  capture_output=True, text=True, check=False)
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
            results = list(pool.map(execute, invocations))
        self.assertEqual(sum(result.returncode == 0 for result in results[:2]), 1)
        self.assertEqual(results[2].returncode, 0, results[2].stdout)
        self.assertEqual(self.view()["view"]["supplies"], 1)

    def test_uncertain_save_and_tick_recovery(self):
        temporary = Path(str(self.save) + ".tmp")
        temporary.mkdir()
        arguments = ["command", "review", 0, "recover", self.epoch, self.offset]
        failure = self.invoke(*arguments, success=False)
        self.assertIn("uncertain", failure["error"])
        self.assertEqual(self.view()["revision"], 0)
        temporary.rmdir()
        self.invoke(*arguments)
        self.assertTrue(self.invoke(*arguments)["operation"]["replayed"])
        self.command("load")
        self.command("start")
        temporary.mkdir()
        self.invoke("tick", self.epoch, self.offset + 30000, success=False)
        self.assertEqual(self.view("probe")["view"]["elapsed_ms"], 0)
        temporary.rmdir()
        self.invoke("tick", self.epoch, self.offset + 30000)
        self.assertEqual(self.view("probe")["view"]["aboard_supplies"], 1)

    def test_unknown_corrupt_and_noncanonical_saves_are_preserved(self):
        invalid = [b"CRITTER_REPLACEMENT 99\n", b"owner bytes\x00untouched",
                   b"CRITTER_DEMO 1\n"]
        for data in invalid:
            self.save.write_bytes(data)
            for arguments in [("status", "probe"), ("tick", "restart", 0),
                              ("command", "review", 0, "user", "restart", 0)]:
                self.invoke(*arguments, success=False)
                self.assertEqual(self.save.read_bytes(), data)
        self.save.unlink()
        self.command("review")
        canonical = self.save.read_bytes()
        for corrupted in (canonical + b"extra", canonical.replace(b"phase 0", b"phase 99"),
                          canonical.replace(b"supplies_awarded 0", b"supplies_awarded 2")):
            self.save.write_bytes(corrupted)
            self.invoke("status", success=False)
            self.assertEqual(self.save.read_bytes(), corrupted)


if __name__ == "__main__":
    unittest.main()
