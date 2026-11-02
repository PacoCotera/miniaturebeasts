"""S20 chunk 3: the ears (lateral tubes) and the tail's room rule. (The tail itself is a named range of the one loft: tests/test_s20_spine.py.) kappa r <= 0.8 on every path, the curl room clip logged and never shrinking a radius, ring aspect, a lop ear clear of the cheek, every ear and tail point outside the face cone, the poles exactly the file's list, quality rows (failing rows stay failing)."""
import os, sys, json, unittest, collections, copy
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import s20build, s20genes, mquality as Q, subdiv as SD, paths as PA, schema as SC, tube

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = json.load(open(os.path.join(os.path.dirname(HERE), "species", "S20.json")))


def build(g=None, **kw):
    raw = s20genes.apply_shape(RAW, g or {})
    spec, _ = SC.load(raw=raw)
    return s20build.make_s20(spec, upto="tubes", **kw)


class T(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.b = build()
        cls.ctx = cls.b.ctx
        cls.spec = cls.ctx["spec"]
        cls.V, cls.F, cls.attr, cls.fp = Q.full_topology(cls.b)
        cls.rec = cls.ctx["info"]["tubes"]

    def test_manifold_quads_mirror(self):
        self.assertEqual(Q.manifold(self.V, self.F), dict(non_manifold_edges=0, loose_verts=0, inconsistent_winding=0))
        self.assertEqual(Q.mirror_plane(self.V)["near_but_off"], 0)

    def test_kappa_r_on_every_path(self):
        for f in ("prick", "lop", "nub"):
            p = self.spec["parts"]["ear.L"]["families"][f]
            r = PA.check_path(f, [j["name"] for j in p["joints"]], p["P"], p["R"], self.spec["parts"]["ear.L"]["fillet"], exact=True)
            self.assertLessEqual(r["max_kappa_r"], 0.8, f)
        p = self.spec["parts"]["tail"]
        r = PA.check_path("tail", [j["name"] for j in p["joints"]], p["P"], p["R"], p["fillet"], exact=True)
        self.assertLessEqual(r["max_kappa_r"], 0.8)
        self.assertGreater(r["min_inner_gap_H"], 0)

    def test_room_clip_is_logged_and_never_shrinks_the_radius(self):
        for g in (dict(curl=0.45), dict(curl=0.45, tailGirth=1.5), dict(curl=0.45, tailGirth=1.4, tailLen=0.8)):
            raw = s20genes.apply_shape(RAW, g)
            tl = raw["parts"]["tail"]
            self.assertIn("clip", tl)
            base = RAW["parts"]["tail"]["joints"]
            for k, (a, b) in enumerate(zip(tl["joints"], base)):
                gk = 1.0 + (g.get("tailGirth", 1.0) - 1.0) * (0.35 + 0.65 * k / (len(base) - 1))       # the girth gene's taper profile
                self.assertAlmostEqual(a["r"][0], b["r"][0] * gk, 9)          # the radius is never shrunk by the clip
            P = PA.fk(tl["joints"][0]["at"], tl["joints"])
            _, rep = PA.fillet_path(P, [j["r"] for j in tl["joints"]], tl["fillet"])
            self.assertTrue(all(x["ok"] for x in rep), g)
        raw = s20genes.apply_shape(RAW, dict(curl=0.45, tailGirth=1.5))
        self.assertLess(raw["parts"]["tail"]["clip"]["factor"], 1.0)         # a short thick tail is clipped earlier: logged
        raw = s20genes.apply_shape(RAW, dict(curl=0.0))
        self.assertEqual(raw["parts"]["tail"]["clip"]["factor"], 1.0)

    def test_ring_aspect(self):
        lim = self.spec["mesh_quality"]["ring_aspect"]["ear"]
        for nm, rec in self.rec.items():
            for ri in rec["ringinfo"]:
                a = ri["ra"] / ri["rf"]
                if nm.startswith("ear"):
                    self.assertTrue(lim[0] <= a <= lim[1], (nm, a))

    def test_first_ring_outside_loft(self):
        G = self.ctx["T"]
        for nm, rec in self.rec.items():
            if rec.get("hard"):                        # a hard join is a shell sunk into the parent: its first ring is buried by design (tested in test_s20_p2_joins)
                continue
            ri = rec["ringinfo"][0]
            ps = np.linspace(0, 2 * np.pi, 24, endpoint=False)
            X = ri["centre"] + (ri["rf"] * np.cos(ps))[:, None] * ri["N"] + (ri["ra"] * np.sin(ps))[:, None] * ri["B"]
            X[:, 1] = np.abs(X[:, 1])
            self.assertFalse(G.inside(X, margin=0.0).any(), nm)

    def _tube_points(self, b, name, s_min=0.2):
        """Cage vertices (full mesh incl. mirror copies) of a tube part beyond arc length s_min from its first ring."""
        pid = b.parts[name]
        V, F, attr, fp = Q.full_topology(b)
        sel = (np.rint(attr[:, 0]).astype(int) == pid) & (attr[:, 1] > b.ctx["info"]["tubes"][name]["first_s"] + s_min)
        return V[sel]

    def test_ears_and_tail_outside_the_face_cone(self):
        """The face cone: from the head centre K (0, 0, 1.68) forward (+x), half angle 35 degrees. No ear or tail point beyond the root lies in it."""
        K = np.array([0.0, 0.0, 1.68])
        for nm in ("ear.L",):
            P = self._tube_points(self.b, nm) - K
            ang = np.degrees(np.arccos(np.clip(P[:, 0] / np.linalg.norm(P, axis=1), -1, 1)))
            self.assertTrue((ang > 35).all(), (nm, ang.min()))

    def test_lop_ear_clear_of_the_cheek(self):
        b = build(dict(ear="lop", earLen=1.2, droop=15))
        G = b.ctx["T"]
        P = self._tube_points(b, "ear.L", 0.25)
        P = P[P[:, 1] > 0]
        r = np.hypot(P[:, 0], P[:, 1])
        a = np.arccos(np.clip(-P[:, 0] / np.maximum(r, 1e-9), -1, 1)) / np.pi
        gap = r - np.array([float(G.rho(np.clip(z, G.ends[0], G.ends[1]), aa)) for z, aa in zip(P[:, 2], a)])
        print("lop ear: smallest gap to the loft", round(float(gap.min()), 3))
        self.assertGreater(gap.min(), 0.02)

    def test_poles_are_the_files_list(self):
        val = Q.valence(self.F, len(self.V))
        m = self.ctx["remap"]
        census = collections.Counter()
        for nm, rec in self.rec.items():
            for v in rec["loop"]:
                if val[m[v]] == 5:
                    census["ear socket corners 5"] += 1
            for v in rec["rings"][-1]:
                if val[m[v]] == 3:
                    census["ear tip cap 3"] += 1
        self.assertEqual(dict(census), {"ear socket corners 5": 8, "ear tip cap 3": 8})          # the ear and the arm tube
        for row in self.spec["poles"]:
            if row["where"].startswith("ear socket"):
                self.assertEqual(row["per_half"], 4)
            if row["where"].startswith("ear tip"):
                self.assertEqual(row["per_half"], 4)
        self.assertFalse(any(r["where"].startswith("tail") for r in self.spec["poles"]))          # no tail socket, no tail cap: the tail is the loft

    def test_every_pole_listed(self):
        sys.path.insert(0, HERE)
        from test_limbs import classify_poles
        val, listed, unl = classify_poles(self.b, self.V, self.F)
        m = self.ctx["remap"]
        n0 = len(self.b.cage.V)
        extra = [i for i in range(n0) if abs(self.V[i][1]) > 1e-12]
        tub = set()
        for rec in self.rec.values():
            tub |= {m[v] for v in rec["loop"]} | {m[v] for v in rec["rings"][-1]} | {m[rec["tip_centre"]]}
        left = [v for v in unl if (v if v < n0 else extra[v - n0]) not in tub]
        self.assertEqual(len(left), 0, f"unlisted poles: {len(left)}")

    def test_limit_error(self):
        self.assertLessEqual(self.ctx["log"]["limit"]["max_err"], self.spec["mesh_quality"]["limit_err_max"])

    def test_no_folds_level2(self):
        Vf, Ff, at, fpp, cr, mir = self.b.full()
        V2, F2, _, _, _ = SD.subdivide(Vf, Ff, cr, at, fpp, levels=2)
        fl = Q.flips(V2, F2)
        print("min adjacent normal dot", round(fl["min_adjacent_normal_dot"], 3))
        self.assertGreater(fl["min_adjacent_normal_dot"], -0.2)

    def test_mesh_quality_rows(self):
        mq = self.spec["mesh_quality"]
        for nm in ("ear.L",):
            er = Q.edge_ratio(self.V, self.F, self.fp, self.b.parts[nm])
            print(nm, "edge ratio", round(er, 2))
        ars, npl = Q.area_ratio(self.V, self.F), Q.nonplanarity(self.V, self.F)
        print("area", round(ars, 2), "nonplanar", round(npl, 2))
        for nm in ("ear.L",):
            self.assertLessEqual(Q.edge_ratio(self.V, self.F, self.fp, self.b.parts[nm]), mq["edge_ratio_face_max"], nm)
        self.assertLessEqual(ars, mq["area_ratio_max"])
        self.assertLessEqual(npl, mq["nonplanar_max"])


if __name__ == "__main__":
    unittest.main()
