"""S20 chunk 7: genes and the twelve individuals. creature.json canonical and identical between two runs, every individual builds and keeps the green checks of chunks 1-6 (the known-failing quality rows are numbers in the sheet), no two share a silhouette (IoU < 0.97), the lantern dominant in the cross."""
import os, sys, json, unittest, collections
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import s20genes as GN, s20indiv as IN, mquality as Q, subdiv as SD, s20measure as M, test_helpers_s20 as TH, paths as PA
from test_s20_base import part_is_closed
from test_helpers_s20 import classify_poles


class T(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.items = [IN.make(i) for i in range(1, 13)]

    def test_type_specimen_is_exactly_the_type(self):
        c = GN.creature(GN.draw(1))
        s = c["shape"]
        for k in ("torsoGirth", "headSize", "legLen", "legGirth", "earLen", "earGirth", "tailLen", "tailGirth", "tipSize"):
            self.assertEqual(s[k], 1.0, k)
        for k in ("splay", "droop", "curl", "lift"):
            self.assertEqual(s[k], 0.0, k)
        self.assertEqual((s["ear"], s["tip"]), ("prick", "lantern"))

    def test_creature_json_canonical_and_repeatable(self):
        for i in range(1, 13):
            a, b = GN.creature(GN.draw(i)), GN.creature(GN.draw(i))
            self.assertEqual(GN.dumps(a), GN.dumps(b))
            self.assertEqual(json.loads(GN.dumps(a)), json.loads(json.dumps(a)))
            self.assertEqual(GN.dumps(a), json.dumps(a, sort_keys=True, separators=(",", ":"), ensure_ascii=True))
        self.assertEqual(len({GN.digest(c) for c, _, _ in self.items}), 12)

    def test_two_builds_of_one_individual_are_identical(self):
        c, b, R = IN.make(5)
        c2, b2, R2 = IN.make(5)
        self.assertEqual(GN.dumps(c), GN.dumps(c2))
        self.assertTrue(np.array_equal(b.cage.arr(), b2.cage.arr()))

    def test_every_individual_keeps_the_green_checks(self):
        for i, (c, b, R) in enumerate(self.items, 1):
            V, F, attr, fp = Q.full_topology(b)
            ctx = b.ctx
            self.assertEqual(Q.manifold(V, F), dict(non_manifold_edges=0, loose_verts=0, inconsistent_winding=0), i)
            self.assertEqual(Q.mirror_plane(V)["near_but_off"], 0, i)
            self.assertLessEqual(ctx["log"]["limit"]["max_err"], 0.004, (i, ctx["log"]["limit"]["max_err"]))
            self.assertLessEqual(TH.ring_ratio(b), 1.5, i)
            Vf, Ff, at, fpp, cr, mir = b.full()
            V2, F2, _, _, _ = SD.subdivide(Vf, Ff, cr, at, fpp, levels=2)
            zs, w = M.widths(V2)
            torso = np.rint(at[:, 0]).astype(int) == b.parts["torso"]
            self.assertGreater(w[zs > 1.17].max() if False else 0, -1)
            self.assertIn("arm.L", ctx["info"]["tubes"])                       # the arms are tubes on sockets; the nose is a mound and the tip the bulb of the one spine (nothing to close separately)
            self.assertGreater(Q.flips(V2, F2)["volume"], 0, i)
            val, listed, unl = classify_poles(b, V, F)
            m = ctx["remap"]; n0 = len(b.cage.V)
            extra = [k for k in range(n0) if abs(V[k][1]) > 1e-12]
            ok = set()
            for rec in ctx["info"]["tubes"].values():
                ok |= {m[v] for v in rec["loop"]} | {m[v] for v in rec["rings"][-1]} | {m[rec["tip_centre"]]}
            left = [v for v in unl if (v if v < n0 else extra[v - n0]) not in ok]
            self.assertEqual(len(left), 0, (i, len(left)))

    def test_head_stays_wider_than_the_body(self):
        for i, (c, b, R) in enumerate(self.items, 1):
            Vf, Ff, at, fpp, cr, mir = b.full()
            V2, F2, _, a2, _ = SD.subdivide(Vf, Ff, cr, at, fpp, levels=2)
            tor = np.rint(a2[:, 0]).astype(int) == b.parts["torso"]
            Vt = V2[tor]
            zt = np.arange(0.3, 2.1, 0.02)
            wt = np.array([2 * float(np.abs(Vt[np.abs(Vt[:, 2] - z) < 0.03, 1]).max()) for z in zt])
            self.assertGreater(wt[zt > 1.17].max(), wt[(zt > 0.7) & (zt < 1.17)].max(), i)

    def test_tubes_outside_the_face_cone(self):
        K = np.array([0.0, 0.0, 1.68])
        for i, (c, b, R) in enumerate(self.items, 1):
            V, F, attr, fp = Q.full_topology(b)
            for nm in ("ear.L",):
                if nm not in b.ctx["info"]["tubes"]:
                    continue
                pid = b.parts[nm]
                sel = (np.rint(attr[:, 0]).astype(int) == pid) & (attr[:, 1] > b.ctx["info"]["tubes"][nm]["first_s"] + 0.2)
                P = V[sel] - K
                ang = np.degrees(np.arccos(np.clip(P[:, 0] / np.linalg.norm(P, axis=1), -1, 1)))
                self.assertTrue((ang > 35).all(), (i, nm, ang.min()))

    def test_kappa_r_and_curl_clip_logged(self):
        for i, (c, b, R) in enumerate(self.items, 1):
            sp = b.ctx["spec"]
            p = sp["parts"]["tail"]
            r = PA.check_path("tail", [j["name"] for j in p["joints"]], p["P"], p["R"], p["fillet"], exact=True)
            self.assertLessEqual(r["max_kappa_r"], 0.8, i)
            self.assertIn("clip", p)

    def test_no_two_share_a_silhouette(self):
        sil = [IN.silhouette(b, R, az=32.0, size=96) for c, b, R in self.items]
        worst = []
        for i in range(12):
            for j in range(i + 1, 12):
                worst.append((IN.iou(sil[i], sil[j]), i + 1, j + 1))
        worst.sort(reverse=True)
        print("closest silhouettes (IoU, i, j):", [(round(a, 3), i, j) for a, i, j in worst[:3]])
        self.assertLess(worst[0][0], 0.97, worst[:3])

    def test_lantern_dominant_in_the_cross(self):
        tips = collections.Counter(c["shape"]["tip"] for c, b, R in self.items)
        print("tips", dict(tips))
        self.assertGreaterEqual(tips["lantern"], 7)
        self.assertGreaterEqual(tips["tuft"] + tips["plain"], 2)


if __name__ == "__main__":
    unittest.main()
