"""The catalogue pin the studio checks species files against (species_v1/catalogue-pin.json) is the one framework/catalogue.mjs writes today: `node wb/make_pin.mjs --check`
passes on the committed file, fails on a stale one and writes nothing, and the pin names catalogue 12."""
import json
import os
import shutil
import subprocess
import sys
import unittest

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BODY)

PIN = os.path.join(BODY, "species_v1", "catalogue-pin.json")
SCRATCH = os.path.join(BODY, "scratch", "t_pin")


def check(*extra):
    return subprocess.run(["node", os.path.join(BODY, "wb", "make_pin.mjs"), "--check", *extra], capture_output=True, text=True)


class TestPin(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        shutil.rmtree(SCRATCH, ignore_errors=True)
        os.makedirs(SCRATCH)

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(SCRATCH, ignore_errors=True)

    def test_the_committed_pin_is_current_and_names_catalogue_12(self):
        r = check()
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(json.load(open(PIN))["version"], 12)

    def test_a_stale_pin_fails_and_nothing_is_written(self):
        stale = os.path.join(SCRATCH, "stale.json")
        doc = json.load(open(PIN))
        doc["loci"] = doc["loci"][:-1]
        with open(stale, "w") as fh:
            json.dump(doc, fh)
        before = open(stale).read()
        r = check("--pin", stale)
        self.assertEqual(r.returncode, 1)
        self.assertIn("stale", r.stderr)
        self.assertEqual(open(stale).read(), before)

    def test_a_missing_pin_fails(self):
        self.assertEqual(check("--pin", os.path.join(SCRATCH, "none.json")).returncode, 1)


if __name__ == "__main__":
    unittest.main()
