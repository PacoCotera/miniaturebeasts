"""V9 (arch-viability-2): the normals check holds 36 degrees on the tail's 8-column stalk rings (rings of 5 half columns, V5), 30 on the rest of the tail and 20 on the body, all at level 2. The 36 is the lead's ruling of 3 Nov 2026, ratified by the art director's sign of 3 Nov 2026 (ad-viability-2). The 31 genomes below failed the check at 30.0 to 35.9 degrees on the stalk at V8 (every one of them on the tail at level 2); they pass now, and crossed 384 (35.92) is the worst of them."""
import json
import multiprocessing as mp
import os
import sys
import unittest

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BODY)
from tests.test_wb_viability import DOC  # noqa: E402
from wb import facade as F, frame_writer as FW  # noqa: E402

NAMED = ["sampled 8", "sampled 51", "sampled 90", "sampled 104", "sampled 133", "sampled 211", "sampled 219", "sampled 230", "sampled 266", "sampled 284", "sampled 287", "sampled 313", "sampled 324", "sampled 342", "sampled 405", "sampled 443", "sampled 451", "sampled 456", "sampled 458", "sampled 474", "crossed 4", "crossed 26", "crossed 65", "crossed 159", "crossed 237", "crossed 276", "crossed 307", "crossed 322", "crossed 349", "crossed 384", "crossed 447"]


def _row(item):
    import s20genes as GN
    from checks import run as crun
    from checks.ctx import Ctx
    name, copies = item
    r = F.build(DOC, GN.individual_of(copies))
    summ = r.summary()
    mesh = F.proxy_mesh(r.body, 1)
    summ["vertices_l1"] = int(len(mesh["V"]))
    row = next(x for x in crun("cage", Ctx(F.internal(DOC), r.body, summ, mesh, doc=DOC)) if x["id"] == "normals")
    return name, row["state"], row["extra"]["worst"]


class TestStalkNormals(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        jobs = [j for j in FW.jobs_of(DOC, 500) if j[0] in set(NAMED)]
        with mp.get_context("fork").Pool(min(6, os.cpu_count() or 2)) as pool:
            cls.res = pool.map(_row, jobs, chunksize=2)

    def test_the_31_named_genomes_pass_normals(self):
        self.assertEqual(len(NAMED), 31)
        self.assertEqual(len(self.res), 31)
        self.assertEqual([n for n, st, _ in self.res if st != "pass"], [])

    def test_crossed_384_is_the_worst_and_just_under_36(self):
        name, _, w = max(self.res, key=lambda r: r[2])
        self.assertEqual(name, "crossed 384")
        self.assertAlmostEqual(w, 35.83, delta=0.02)          # 35.92 at V9, 35.86 since the back relax step (V10), 35.83 with the cat ear (3 Nov 2026)

    def test_the_rule_text_names_the_stalk_limit_and_the_level_one_equivalent(self):
        import checks
        import checks.biped as B
        self.assertEqual(B.BIPED["stalk_normal_deg"], 36.0)
        t = checks.by_id("normals").limit["text"]
        for s in ("36°", "8-column stalk", "20° at level 2 is about 40° at level 1", "art director's sign of 3 Nov 2026 (ad-viability-2)"):
            self.assertIn(s, t)
        self.assertNotIn("provisional", t)


if __name__ == "__main__":
    unittest.main()
