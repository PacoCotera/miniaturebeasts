"""S20 chunk 4: the sitting shapes (arms, nose, the tail-tip families) and the whole bare base. Each shape closed, sunk into the loft by its sink fraction, poles listed, outside the face cone (the nose is the face's own); the base's manifold, mirror and limit numbers; the chibi checklist numbers."""
import os, sys, json, unittest, collections
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import s20build, s20genes, mquality as Q, subdiv as SD, schema as SC, s20measure as M

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = json.load(open(os.path.join(os.path.dirname(HERE), "species", "S20.json")))


def build(g=None):
    spec, _ = SC.load(raw=s20genes.apply_shape(RAW, g or {}))
    return s20build.make_s20(spec, upto="base", tip=(g or {}).get("tip", "lantern"), ear=(g or {}).get("ear", "prick"))


def part_is_closed(b, name):
    """The part's faces of the full (mirrored) mesh close on themselves: every edge is shared by exactly two of them."""
    pid = b.parts[name]
    V, F, attr, fp = Q.full_topology(b)
    E = collections.Counter()
    for fi, f in enumerate(F):
        if fp[fi] == pid:
            for k in range(4):
                a, c = int(f[k]), int(f[(k + 1) % 4])
                E[(min(a, c), max(a, c))] += 1
    return len(E) > 0 and all(v == 2 for v in E.values())


class T(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.b = build()
        cls.ctx = cls.b.ctx
        cls.spec = cls.ctx["spec"]
        cls.V, cls.F, cls.attr, cls.fp = Q.full_topology(cls.b)
        Vf, Ff, at, fpp, cr, mir = cls.b.full()
        cls.V2, cls.F2, _, cls.attr2, _ = SD.subdivide(Vf, Ff, cr, at, fpp, levels=2)

    def test_base_manifold_mirror_limit(self):
        self.assertEqual(Q.manifold(self.V, self.F), dict(non_manifold_edges=0, loose_verts=0, inconsistent_winding=0))
        self.assertEqual(Q.mirror_plane(self.V)["near_but_off"], 0)
        self.assertLessEqual(self.ctx["log"]["limit"]["max_err"], self.spec["mesh_quality"]["limit_err_max"])

    def test_appendages_are_tubes_on_sockets_and_the_tip_is_the_spine(self):
        """Pass 2 (owner rule: a junction is a filleted transition, not a pasted shell): the arms are tubes grown from a socket patch (like the ears), the nose is a mound in the loft with a painted button, and the lantern is the bulb on the last stretch of
        the one spine. No sitting shell is left, so nothing intersects the loft."""
        self.assertEqual(self.ctx["info"]["sitting"], {})
        for nm in ("nose", "tail.tip"):
            self.assertNotIn(nm, self.b.parts)
        self.assertIn("arm.L", self.ctx["info"]["tubes"])
        self.assertGreater(self.ctx["T"].bulb[0], 0.2)
        rec = self.ctx["info"]["tubes"]["arm.L"]
        if rec.get("hard"):                                                  # pass 3: the arm is a hard-join shell at the shoulder joint (a clean contact line, no fillet: tested in test_s20_p2_joins)
            self.assertEqual(rec["transition"], [])
        else:
            self.assertGreaterEqual(len(rec["transition"]), 3)              # a filleted band of at least 3 loops

    def test_arms_and_bulb_outside_the_face_cone(self):
        K = np.array([0.0, 0.0, 1.68])
        G = self.ctx["T"]
        sel = np.rint(self.attr[:, 0]).astype(int) == self.b.parts["arm.L"]
        sel2 = (np.rint(self.attr[:, 0]).astype(int) == self.b.parts["torso"]) & (self.attr[:, 1] <= G.bulb[0])
        for nm, s_ in (("arm.L", sel), ("bulb", sel2)):
            P = self.V[s_] - K
            ang = np.degrees(np.arccos(np.clip(P[:, 0] / np.linalg.norm(P, axis=1), -1, 1)))
            self.assertTrue((ang > 35).all(), (nm, ang.min()))

    def test_every_tip_family_builds_closed(self):
        for fam in ("plain", "tuft", "lantern"):
            b = build(dict(tip=fam))
            V, F, attr, fp = Q.full_topology(b)
            self.assertEqual(Q.manifold(V, F), dict(non_manifold_edges=0, loose_verts=0, inconsistent_winding=0), fam)
            self.assertLessEqual(b.ctx["log"]["limit"]["max_err"], 0.004, fam)

    def test_chibi_numbers(self):
        zs, w = M.widths(self.V2)
        torso = np.rint(self.attr2[:, 0]).astype(int) == self.b.parts["torso"]
        Vt = self.V2[torso]
        zt = np.arange(0.3, 2.1, 0.02)
        wt = np.array([2 * float(np.abs(Vt[np.abs(Vt[:, 2] - z) < 0.03, 1]).max()) for z in zt])
        head, body = wt[zt > 1.17].max(), wt[(zt > 0.7) & (zt < 1.17)].max()
        print("head/body width", round(head, 3), round(body, 3), round(head / body, 3))
        self.assertGreater(head / body, 1.04)
        P = np.array(self.spec["parts"]["leg.L"]["P"])
        self.assertAlmostEqual(P[0][2] - P[-1][2], 0.48, delta=0.01)       # short thick limbs
        self.assertLessEqual(self.V2[:, 2].min(), 0.0 + 0.03)

    def test_mesh_quality_report(self):
        er = {nm: Q.edge_ratio(self.V, self.F, self.fp, pid) for nm, pid in self.b.parts.items()}
        print("edge ratio by part", {k: round(v, 2) for k, v in er.items()})
        print("area", round(Q.area_ratio(self.V, self.F), 2), "nonplanar", round(Q.nonplanarity(self.V, self.F), 2))
        fl = Q.flips(self.V2, self.F2)
        print("level 2 min dot", round(fl["min_adjacent_normal_dot"], 3), "volume", round(fl["volume"], 2))
        self.assertGreater(fl["volume"], 0)

    def test_every_pole_listed(self):
        from test_limbs import classify_poles
        val, listed, unl = classify_poles(self.b, self.V, self.F)
        m = self.ctx["remap"]
        n0 = len(self.b.cage.V)
        extra = [i for i in range(n0) if abs(self.V[i][1]) > 1e-12]
        ok = set()
        for rec in self.ctx["info"]["tubes"].values():
            ok |= {m[v] for v in rec["loop"]} | {m[v] for v in rec["rings"][-1]} | {m[rec["tip_centre"]]}
        left = [v for v in unl if (v if v < n0 else extra[v - n0]) not in ok]
        self.assertEqual(len(left), 0, f"unlisted poles: {len(left)}")


if __name__ == "__main__":
    unittest.main()
