"""Chunk 8: the extremes stage: its ends, what makes an end fail, the computed fix, the limits row, and a real job on S20's tail length."""
import copy
import json
import os
import sys
import unittest

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BODY)

from checks import extremes as EX, row, run as crun
from checks.ctx import Ctx
from wb import facade as F

DOC = json.load(open(os.path.join(BODY, "species_v1", "S20.json")))


def locus(d, name):
    return next(e for e in d["genome"]["loci"] if e["locus"] == name)


class TestExtremes(unittest.TestCase):
    def test_the_ends_are_both_limits_the_other_alleles_and_the_loud_corners(self):
        spec = F.internal(DOC)
        ends = EX.list_ends(spec)
        blends = [e for e in spec["genome"]["loci"] if e["op"] == "blend"]
        others = [e for e in spec["genome"]["loci"] if e["op"] != "blend"]
        self.assertEqual(len([e for e in ends if e["end"] in ("low", "high")]), 2 * len(blends))
        self.assertEqual(len([e for e in ends if e["end"] == "allele"]), sum(len(e["limits"]) - 1 for e in others))
        self.assertEqual(len([e for e in ends if e["end"] == "corner"]), 10)
        self.assertLessEqual(len([e for e in ends if e["end"] == "corner"]), 16)
        self.assertEqual(len(ends), 112)

    def test_an_end_fails_only_on_what_passes_at_the_type(self):
        rows = [dict(id="verts", state="fail"), dict(id="normals", state="fail"), dict(id="mesh", state="warn")]
        self.assertEqual(EX.judge(rows, dict(verts="warn", normals="pass", mesh="pass")), ("fail", [rows[0], rows[1]]))
        self.assertEqual(EX.judge(rows, dict(verts="fail", normals="fail", mesh="pass"))[0], "pass")

    def test_the_computed_fix_is_the_highest_passing_value_at_two_decimals(self):
        e = locus(DOC, "form.tail-length")
        fix = EX.bisect_fix(e, "high", lambda v: v > 1.1937)
        self.assertEqual(fix, dict(value=1.19, path="genome.loci.form.tail-length.band.hi", end="high"))
        low = EX.bisect_fix(locus(DOC, "form.tail-carry"), "low", lambda v: v < -11.04)
        self.assertAlmostEqual(low["value"], -11.04, delta=0.06)
        # not monotonic: passes at 1.02 and 1.19, fails at 1.1 and above 1.25: the fix stops before the first failure on the way out
        weird = lambda v: 1.08 < v < 1.15 or v > 1.25
        fx = EX.bisect_fix(e, "high", weird)
        self.assertLessEqual(fx["value"], 1.08)
        self.assertFalse(weird(fx["value"]))
        self.assertIsNone(EX.bisect_fix(e, "high", lambda v: v > 1.0))                              # nothing above the type passes
        self.assertIsNone(EX.bisect_fix(locus(DOC, "form.whisker-count"), "high", lambda v: True))
        self.assertEqual(EX.round_toward(1.1937, 1.0), 1.19)
        self.assertEqual(EX.round_toward(-11.0399, 0.0), -11.03)

    def test_the_limits_row_says_the_owners_words(self):
        spec = F.internal(DOC)
        ok = crun("extremes", Ctx(spec, doc=DOC, ends=[dict(id="a", cage="c", state="pass", fails=[], value=1, label="x", end="low")]))[0]
        self.assertEqual((ok["id"], ok["state"], ok["stage"]), ("limits", "pass", "extremes"))
        end = dict(id="form.tail-length:high", locus="form.tail-length", end="high", value=1.3, unit="×", label="Tail length", state="fail", cage="c", proof=dict(mode="normal", az=90, svg="<g/>"),
                   fails=[dict(id="normals", fail="Sharp crease in leg.L", measure="24 visible edges over 20°", value=24, limit=0)])
        bad = crun("extremes", Ctx(spec, doc=DOC, ends=[end]))[0]
        self.assertEqual((bad["state"], bad["value"], bad["extra"]["fail"]), ("fail", 1, "Tail length fails at its high end"))
        self.assertTrue(bad["measure"].startswith("at 1.3×: Sharp crease in leg.L (24 visible edges over 20°)"))
        self.assertEqual(bad["proof"]["mode"], "normal")


class TestExtremesJob(unittest.TestCase):
    """A real extremes job on S20's tail-tip size (the `loci` option builds just that locus) with its high limit written as 1.37 (the file's is 1.2): that end fails, with its proof and a computed fix that passes. (It was the tail carriage's low end until V4 made the lowered tail leave the legs alone.)"""
    @classmethod
    def setUpClass(cls):
        import shutil
        from wb import server as SV
        cls.scratch = os.path.join(BODY, "scratch", "t_genome")
        shutil.rmtree(cls.scratch, ignore_errors=True)
        os.makedirs(os.path.join(cls.scratch, "species"))
        wide = copy.deepcopy(DOC)
        locus(wide, "form.tail-tip-size")["band"]["hi"] = 1.37
        json.dump(wide, open(os.path.join(cls.scratch, "species", "S20.json"), "w"), indent=1)
        cls.srv = SV.Server(os.path.join(cls.scratch, "home"), [os.path.join(cls.scratch, "species")], proxy_workers=1)
        cls.srv.start()

    @classmethod
    def tearDownClass(cls):
        import shutil
        cls.srv.stop()
        shutil.rmtree(cls.scratch, ignore_errors=True)

    def test_the_failing_end_has_its_proof_and_a_fix_that_passes(self):
        import time
        j = self.srv.submit("S20", "check", dict(stage="extremes", loci=["form.tail-tip-size"]), None)
        self.srv.wait(j, 240)
        self.assertEqual(j.state, "done", j.error)
        ends = j.result["ends"]
        self.assertEqual([(e["id"], e["state"]) for e in ends], [("form.tail-tip-size:low", "pass"), ("form.tail-tip-size:high", "fail")])
        hi = ends[1]
        self.assertIn(hi["fails"][0]["id"], ("verts", "normals", "mesh", "tail.size", "balance"))
        self.assertEqual(hi["fix"]["path"], "genome.loci.form.tail-tip-size.band.hi")
        self.assertTrue(1.0 < hi["fix"]["value"] < 1.37, hi["fix"])
        row = j.result["rows"][0]
        self.assertEqual((row["id"], row["state"], row["extra"]["fail"]), ("limits", "fail", "Tip size fails at its high end"))
        end = time.time() + 90
        while time.time() < end and not all(e["proof"]["ready"] for e in self.srv.with_proof_state(j.result)["ends"] if e.get("proof")):
            time.sleep(0.5)
        res = self.srv.with_proof_state(j.result)
        self.assertTrue(res["ends"][1]["proof"]["ready"])
        self.assertEqual(open(res["ends"][1]["proof"]["path"], "rb").read(8), b"\x89PNG\r\n\x1a\n")
        # the fix really passes: write it and build the end again
        d = copy.deepcopy(DOC)
        locus(d, "form.tail-tip-size")["band"]["hi"] = hi["fix"]["value"]
        r = F.build(d, "high:form.tail-tip-size")
        from wb import server as SV
        rows = crun("cage", Ctx(F.internal(d), r.body, dict(r.summary(), vertices_l1=len(F.proxy_mesh(r.body, 1)["V"])), F.proxy_mesh(r.body, 1), doc=d))
        self.assertEqual([x["id"] for x in rows if x["state"] == "fail"], [])
        # the stage is not part of "all"; the page's answer for the file as it is reads the stored result
        self.assertTrue(self.srv.current_extremes(self.srv.species["S20"])["fresh"] is False)             # a partial run is another key than the full stage


if __name__ == "__main__":
    unittest.main()
