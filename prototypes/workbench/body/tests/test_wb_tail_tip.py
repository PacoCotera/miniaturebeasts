"""V3 (arch-viability): the tuft's blunt end and steep flare, and the shortest tail with a large tip. The tuft is 0.26 H long (it was 0.20 over a width of 0.22, a flare steeper than the lantern's), its first ring sits 0.04 H from the end, its rings follow the profile (`ring_turn_max` 20 degrees); a tip that is large holds the tail length at least `sockets.tail.tip.min_tail`. The type, lantern and plain tips keep their rings."""
import json
import os
import sys
import unittest

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BODY)
from tests.test_wb_viability import DOC, cases  # noqa: E402
from wb import frame_writer as FW  # noqa: E402
import s20genes as GN  # noqa: E402

# The 22 genomes of the frame writer's 200 + 200 (seed 20) that failed the mesh check at 0d7a64e82 (arch-viability).
MESH22 = ['sampled 3', 'sampled 7', 'sampled 50', 'sampled 70', 'sampled 72', 'sampled 73', 'sampled 75', 'sampled 76', 'sampled 77', 'sampled 83', 'sampled 94', 'sampled 96', 'sampled 98', 'sampled 130', 'sampled 139', 'sampled 145',
          'crossed 49', 'crossed 81', 'crossed 91', 'crossed 100', 'crossed 120', 'crossed 168']


class TestTip(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        names = ["type", "tuft 1.0 curl 0.0", "tuft 1.1 curl 0.0", "tuft 1.2 curl 0.0", "tuft 1.2 curl 0.1", "tuft 1.2 curl 0.2", "short tuft 1.2", "short tuft 1.2 curl 0.2", "short lantern 1.2", "short tuft 1.0", "girth 1.2 tuft 1.2"]
        FW._DOC = DOC
        cs = cases()
        from tests.test_wb_viability import individual
        import multiprocessing as mp
        with mp.get_context("fork").Pool(6) as p:
            cls.res = {r["id"]: r for r in p.map(_job, [(n, individual(*cs[n])) for n in names])}

    def test_a_tuft_at_its_largest_size_passes_mesh_and_normals(self):
        for n in ("tuft 1.0 curl 0.0", "tuft 1.1 curl 0.0", "tuft 1.2 curl 0.0", "tuft 1.2 curl 0.1", "tuft 1.2 curl 0.2", "girth 1.2 tuft 1.2"):
            self.assertEqual([c for c in self.res[n]["ids"] if c in ("mesh", "normals")], [], n)

    def test_the_shortest_tail_with_a_large_tip_passes(self):
        for n in ("short tuft 1.2", "short tuft 1.2 curl 0.2", "short tuft 1.0"):          # short lantern 1.2 passes normals; its mesh fails by 0.73 in the seat range since V5 (a known case, test_wb_viability)
            self.assertEqual([c for c in self.res[n]["ids"] if c in ("mesh", "normals")], [], n)

    def test_the_tail_length_is_held_for_a_large_tip_only(self):
        raw = DOC_RAW()
        self.assertEqual(GN.tail_len_min(raw, dict(tip="lantern", tipSize=1.0)), 0.8)
        self.assertAlmostEqual(GN.tail_len_min(raw, dict(tip="tuft", tipSize=1.0)), 0.8 + 9.0 * 0.005, 6)
        self.assertAlmostEqual(GN.tail_len_min(raw, dict(tip="tuft", tipSize=1.2)), 0.8 + 9.0 * (0.121 - 0.105), 6)          # a tuft is built at 1.1 at most
        self.assertAlmostEqual(GN.tail_len_min(raw, dict(tip="lantern", tipSize=1.2)), 0.8 + 9.0 * (0.12 - 0.105), 6)

    def test_the_type_keeps_its_cage_since_v5(self):
        self.assertEqual(self.res["type"]["verts"], 3446)               # 3,606 before V5
        import hashlib  # noqa: F401
        from wb import facade as F
        self.assertTrue(F.build(DOC, "type").cage_hash.startswith("3c614113e6b27172"))          # dbebe2e3a0a3b27c until V5; f73d798bc765fad9 for V5 as first built, 5d2afa766b1d2b5e for V8 (V10: the back relax step)


class TestTheTwentyTwo(unittest.TestCase):
    def test_none_of_the_22_mesh_failing_genomes_fails_in_the_tail_or_the_tuft(self):
        """The tail range (the tuft's flare, the tip) passes in all 22. Their neck and seat ranges are the mesh check's own business (V4, V5)."""
        res = FW.run_all(DOC, 200, only=MESH22)
        self.assertEqual(len(res), 22)
        bad = {r["id"]: list(r["where"]["mesh"]["detail"]) for r in res if "mesh" in r["ids"]}
        self.assertEqual({k: v for k, v in bad.items() if "tail" in v}, {})
        self.assertEqual([r["id"] for r in res if "normals" in r["ids"] and "tail" in (r["where"]["normals"]["ranges"] or {})], [])


def DOC_RAW():
    from wb import facade as F
    return F.internal(DOC)


def _job(item):
    return FW._built(item)


if __name__ == "__main__":
    unittest.main()
