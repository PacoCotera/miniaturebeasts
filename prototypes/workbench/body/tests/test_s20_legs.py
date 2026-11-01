"""S20 chunk 2: the legs on the gourd. The A s3.4 numbers on the leg path, bridge offset 0, the first ring outside the loft, the sole on the floor, the inner foot gap >= 0.10 H (no crotch fold), no fold at rest at level 2, poles listed, mesh quality rows (failing rows stay failing)."""
import os, sys, unittest, collections, math
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import s20build, mquality as Q, subdiv as SD, paths as PA, s20measure as M
from test_limbs import classify_poles


class T(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.b = s20build.make_s20(upto="legs")
        cls.ctx = cls.b.ctx
        cls.spec = cls.ctx["spec"]
        cls.V, cls.F, cls.attr, cls.fp = Q.full_topology(cls.b)
        Vf, Ff, at, fpp, cr, mir = cls.b.full()
        cls.V2, cls.F2, cls.attr2, _, _ = SD.subdivide(Vf, Ff, cr, at, fpp, levels=2)
        cls.rec = cls.ctx["info"]["limbs"]["leg.L"]

    def test_manifold_quads_mirror(self):
        self.assertEqual(Q.manifold(self.V, self.F), dict(non_manifold_edges=0, loose_verts=0, inconsistent_winding=0))
        self.assertEqual(Q.mirror_plane(self.V)["near_but_off"], 0)

    def test_every_pole_listed(self):
        val, listed, unl = classify_poles(self.b, self.V, self.F)
        self.assertEqual(len(unl), 0, f"unlisted poles: {len(unl)} {collections.Counter(val[list(unl)].tolist())}")

    def test_socket_corners_valence5(self):
        m = self.ctx["remap"]
        val = Q.valence(self.F, len(self.V))
        vs = [int(val[m[v]]) for v in self.rec["loop"]]
        # three or four of the loop vertices are valence 5; the loop's bottom row sits on the seat cap's rim, so its mid-edge vertex takes a fifth face from the cap
        self.assertTrue(set(vs) <= {4, 5} and vs.count(5) >= 3, vs)

    def test_bridge_offset_zero(self):
        """The loop pairs vertex i with the ring's vertex i and no other cyclic shift or direction is nearer (the S20 matcher picks the nearest cyclic pairing, so the offset is 0 by construction: checked here)."""
        V = self.b.cage.arr()
        m = self.ctx["remap"]
        loop = [m[v] for v in self.rec["loop"]]
        ring0 = [m[v] for v in (self.rec["transition"] if "transition" in self.rec else self.rec["rings"][0])]
        best = None
        for d in (1, -1):
            for sh in range(8):
                cost = sum(float(np.sum((V[loop[(d * k + sh) % 8]] - V[ring0[k]]) ** 2)) for k in range(8))
                if best is None or cost < best[0] - 1e-12:
                    best = (cost, d, sh)
        self.assertEqual(best[1:], (1, 0), best)

    def test_first_ring_outside_loft(self):
        T = self.ctx["T"]
        ri = self.rec["ringinfo"][0]
        ps = np.linspace(0, 2 * math.pi, 24, endpoint=False)
        X = ri["centre"] + (ri["rf"] * np.cos(ps))[:, None] * ri["N"] + (ri["ra"] * np.sin(ps))[:, None] * ri["B"]
        self.assertFalse(T.inside(X, margin=0.0).any())

    def test_sole_on_floor(self):
        m = self.ctx["remap"]
        L, _ = self.b.cage.limit_points()
        cz = L[m[self.rec["sole_centre"]]][2]
        self.assertLessEqual(abs(cz), 0.02, cz)
        self.assertAlmostEqual(self.spec["parts"]["leg.L"]["P"][-1][2], 0.0, 9)
        self.assertGreater(self.V2[:, 2].min(), -0.03)

    def test_leg_shape_numbers(self):
        """short thick limbs: hip to sole 0.46 H; the column 0.44-0.48 H across; first-ring and ring ratios."""
        P = np.array(self.spec["parts"]["leg.L"]["P"])
        self.assertAlmostEqual(P[0][2] - P[-1][2], 0.46, delta=0.01)
        ri = self.rec["ringinfo"]
        for a, b in zip(ri, ri[1:]):
            for k in ("ra", "rf"):
                self.assertLessEqual(max(a[k] / b[k], b[k] / a[k]), 1.5)
        for a in ri:
            self.assertTrue(0.6 <= a["ra"] / a["rf"] <= 1.6)

    def test_path_fold_numbers(self):
        p = self.spec["parts"]["leg.L"]
        r = PA.check_path("leg.L", [j["name"] for j in p["joints"]], p["P"], p["R"], p["fillet"], exact=True)
        self.assertLessEqual(r["max_kappa_r"], 0.85)
        self.assertGreater(r["min_inner_gap_H"], 0)
        self.assertLessEqual(r["max_twist_deg_per_ring"], 1.0)

    def test_inner_foot_gap(self):
        low = self.V2[:, 2] < 0.04
        yin = np.abs(self.V2[low, 1]).min()
        print("inner foot gap", round(2 * float(yin), 3))
        self.assertGreaterEqual(2 * yin, 0.10)

    def test_no_folds_at_rest(self):
        fl = Q.flips(self.V2, self.F2)
        print("min adjacent normal dot", round(fl["min_adjacent_normal_dot"], 3))
        self.assertGreater(fl["min_adjacent_normal_dot"], -0.2)
        self.assertGreater(fl["volume"], 0)

    def test_limit_error(self):
        self.assertLessEqual(self.ctx["log"]["limit"]["max_err"], 0.004)

    def test_mesh_quality_rows(self):
        pn = {v: k for k, v in self.b.parts.items()}
        for part, nm in pn.items():
            print(nm, "edge ratio", round(Q.edge_ratio(self.V, self.F, self.fp, part), 2))
        ar, npl = Q.area_ratio(self.V, self.F), Q.nonplanarity(self.V, self.F)
        print("area", round(ar, 2), "nonplanar", round(npl, 2))
        self.assertLessEqual(Q.edge_ratio(self.V, self.F, self.fp, self.b.parts["leg.L"]), self.spec["mesh_quality"]["edge_ratio_face_max"])
        self.assertLessEqual(ar, self.spec["mesh_quality"]["area_ratio_max"])
        self.assertLessEqual(npl, self.spec["mesh_quality"]["nonplanar_max"])


if __name__ == "__main__":
    unittest.main()
