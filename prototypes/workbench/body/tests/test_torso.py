"""Chunk 1: the torso loft. valence (the 8 cap corners only), mirror plane, ring ratio <= 1.5, limit error <= 0.004 H, quads only, manifold, the section numbers of s2.2.3, determinism."""
import os, sys, unittest, hashlib, collections
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import build, mquality as Q, subdiv as SD


class T(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.b = build.make_body(upto="torso")
        cls.V, cls.F, cls.attr, cls.fp = Q.full_topology(cls.b)
        cls.ctx = cls.b.ctx

    def test_quads_only(self):
        self.assertEqual(self.F.shape[1], 4)

    def test_valence_only_cap_corners(self):
        v = Q.valence(self.F, len(self.V))
        c = collections.Counter(v.tolist())
        self.assertEqual(set(c), {3, 4}, c)
        self.assertEqual(c[3], 8)          # 4 grid-cap corners on each of 2 caps

    def test_manifold_closed(self):
        m = Q.manifold(self.V, self.F)
        self.assertEqual(m, dict(non_manifold_edges=0, loose_verts=0, inconsistent_winding=0))

    def test_mirror_plane(self):
        m = Q.mirror_plane(self.V)
        self.assertEqual(m["near_but_off"], 0)
        self.assertLessEqual(m["max_abs_y_on_plane"], 1e-6)
        self.assertGreater(m["on_plane"], 10)

    def test_ring_ratio(self):
        ti = self.ctx["info"]["torso"]
        rings = [ti["endrings"]["rump"]] + ti["rings"] + [ti["endrings"]["brisket"]]
        # the remap from finish(): vertex ids changed only if faces were dropped (none in chunk 1)
        rr = Q.ring_ratio(self.b.cage.arr(), [[self.ctx["remap"][v] for v in r] for r in rings])
        self.assertLessEqual(rr, 1.5, rr)

    def test_limit_error(self):
        self.assertLessEqual(self.ctx["log"]["limit"]["max_err"], 0.004)

    def test_body_numbers(self):
        """belly 0.47 H clear at the waist (centre line), top 1.53 at the shoulder (spec s2.2.3), within a tolerance for the compensation."""
        T = self.ctx["T"]
        zb = T.point(T.s_of_x(-0.70), 1.0)[0][2]
        self.assertAlmostEqual(zb, 0.47, delta=0.02)
        zt = T.point(T.s_of_x(-0.25), 0.0)[0][2]
        self.assertAlmostEqual(zt, 1.53, delta=0.02)

    def test_deterministic(self):
        b2 = build.make_body(upto="torso")
        self.assertEqual(hashlib.sha256(b2.cage.arr().tobytes()).hexdigest(), hashlib.sha256(self.b.cage.arr().tobytes()).hexdigest())

    def test_subdivision_has_no_flips(self):
        V, F, attr, fp, cr, mirror = self.b.full()
        V2, F2, _, _, _ = SD.subdivide(V, F, cr, attr, fp, levels=2)
        f = Q.flips(V2, F2)
        self.assertGreater(f["volume"], 0)
        self.assertGreater(f["min_adjacent_normal_dot"], -0.2)

    def test_quality_numbers_reported(self):
        q = dict(edge_ratio=Q.edge_ratio(self.V, self.F, self.fp, 0), area_ratio=Q.area_ratio(self.V, self.F), nonplanar=Q.nonplanarity(self.V, self.F))
        print("torso quality", q)
        self.assertLessEqual(q["edge_ratio"], 2.5)
        self.assertLessEqual(q["area_ratio"], 2.5)
        self.assertLessEqual(q["nonplanar"], 0.1)


if __name__ == "__main__":
    unittest.main()
