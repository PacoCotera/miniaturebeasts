"""S20 pass 3: the head on the spine (body-plan attachment), the neck and the head width, the tail's monotone taper, the toe shells."""
import os, sys, copy, unittest
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import schema as SC, s20indiv as IN, s20p3 as P3, s20p2 as P2, mquality as Q, headshape as HS

RAW = IN.RAW


class T(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.c, cls.b, cls.R = IN.make(1)
        cls.n = P3.head_numbers(cls.b)

    def test_body_plan_decides_the_head_attachment(self):
        self.assertEqual(RAW["body_plan"], "biped")
        self.assertEqual(RAW["parts"]["torso"]["head_attach"]["attach"], "underside")
        for plan, ok in (("biped", "underside"), ("quadruped", "back"), ("serpentine", "back")):
            d = copy.deepcopy(RAW); d["body_plan"] = plan
            d["parts"]["torso"]["head_attach"]["attach"] = ok
            SC.load(raw=d)
        d = copy.deepcopy(RAW); d["body_plan"] = "quadruped"        # a quadruped's neck enters the back of the head, not its underside
        with self.assertRaises(SC.SchemaError):
            SC.load(raw=d)

    def test_spine_ends_on_the_heads_underside_and_the_head_turns_there(self):
        g = self.R.head_geom
        self.assertTrue(0.35 <= g["a"] <= 0.5)
        self.assertGreaterEqual(g["d"], 0.0)
        self.assertLessEqual(g["d"], 0.15)
        self.assertTrue(np.allclose(self.R.bones["head"][0], g["pivot"]))
        self.assertGreater(g["pivot"][2], 1.15)
        self.assertLess(g["pivot"][2], 1.4)

    def test_head_width_and_neck_band(self):
        n = self.n
        print({k: round(float(v), 3) for k, v in n.items()})
        self.assertAlmostEqual(n["head_w"], 1.28, delta=0.04)
        self.assertTrue(1.05 <= n["ratio"] <= 1.15, n["ratio"])
        self.assertTrue(0.62 <= n["neck_over_head"] <= 0.70, n["neck_over_head"])

    def test_the_back_of_the_head_is_a_dome_behind_the_neck(self):
        V, F, at, fp2 = P2.level_arrays(self.b, 2)
        Vt = V[np.rint(at[:, 0]).astype(int) == 0]
        back = lambda z: float(-Vt[np.abs(Vt[:, 2] - z) < 0.015, 0].min())
        self.assertGreater(back(1.62) - back(1.24), 0.12)          # the skull overhangs the neck at the back
        self.assertGreater(back(1.62), 0.54)

    def test_tail_radius_tapers_monotonically(self):
        G = self.b.ctx["T"]
        s = np.arange(G.bulb[0] + 0.02, G.s_root, 0.01)
        r = G.tail_radius(s)
        self.assertTrue((np.diff(r) >= -1e-9).all())

    def test_toes_are_regular_hard_shells_on_the_ground(self):
        V, F, attr, fp = Q.full_topology(self.b)
        self.assertEqual(Q.manifold(V, F), dict(non_manifold_edges=0, loose_verts=0, inconsistent_winding=0))
        V2, F2, at, fp2 = P2.level_arrays(self.b, 2)
        toe = at[:, 1] < -0.5
        self.assertGreater(int(toe.sum()), 100)
        self.assertLess(float(V2[toe][:, 2].min()), 0.012)
        self.assertGreater(float(V2[toe][:, 2].min()), -0.02)
        fl = Q.flips(V2, F2)
        self.assertGreater(fl["min_adjacent_normal_dot"], -0.2)


if __name__ == "__main__":
    unittest.main()
