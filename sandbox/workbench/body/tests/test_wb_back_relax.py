"""V10 (arch-viability-2): nine wild genomes failed the mesh check's `around` in the back range (10.0 to 10.9 against 10) once the tail stalk was on 8 columns (V5). The tangential relax is a smoothing that carries the band's irregular vertices several rings; a gentler step on the back range (species file spine.loft.spine.relax_back.step, 0.25) brings them to 9.0 to 9.6, and the neck keeps the full step."""
import json
import multiprocessing as mp
import os
import sys
import unittest

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BODY)
from tests.test_wb_viability import DOC  # noqa: E402
from wb import facade as F, frame_writer as FW  # noqa: E402

NINE = ["sampled 14", "sampled 77", "sampled 240", "sampled 387", "sampled 429", "sampled 430", "crossed 114", "crossed 215", "crossed 361"]


def _back(item):
    import s20genes as GN
    from checks import run as crun
    from checks.ctx import Ctx
    name, copies = item
    r = F.build(DOC, GN.individual_of(copies))
    summ = r.summary()
    mesh = F.proxy_mesh(r.body, 1)
    summ["vertices_l1"] = int(len(mesh["V"]))
    row = next(x for x in crun("cage", Ctx(F.internal(DOC), r.body, summ, mesh, doc=DOC)) if x["id"] == "mesh")
    return name, row["state"], row["extra"]["ranges"]["back"]["around"]


class TestBackRelax(unittest.TestCase):
    def test_the_file_names_the_step(self):
        rb = DOC["spine"]["loft"]["spine"]["relax_back"]
        self.assertEqual(rb["step"], 0.25)
        self.assertLess(rb["step"], 0.5)

    def test_the_nine_pass_the_back_ratio_round_the_ring(self):
        jobs = [j for j in FW.jobs_of(DOC, 500) if j[0] in set(NINE)]
        self.assertEqual(len(jobs), 9)
        with mp.get_context("fork").Pool(min(6, os.cpu_count() or 2)) as pool:
            res = pool.map(_back, jobs, chunksize=2)
        for name, state, around in res:
            self.assertLess(around, 9.7, name)                    # the limit is 10; they were 10.0 to 10.9
            self.assertEqual(state, "pass", name)


if __name__ == "__main__":
    unittest.main()
