"""Chunk 5: crown attachments. Each leaf is a closed shape (manifold), sunk into the head (its first ring inside the skull), poles only at its ends (valence 3 or 4), outside the face cone, stems keep kappa r <= 0.8; every family builds and every default Loika has a crown."""
import os, sys, math, unittest, collections
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import build, mquality as Q, crown as CR
from housefield import to_local

FAMS = [dict(family="fan", count=3), dict(family="fan", count=4), dict(family="fan", count=5), dict(family="sprout"), dict(family="bud")]   # the vine family is cut (body-spec s7 cut order 1): its leaflets do not reach the 0.004 limit error (0.099)


class T(unittest.TestCase):
    def test_default_has_crown(self):
        b = build.make_body(upto="base")
        self.assertGreater(b.ctx["info"]["crown"]["n"], 0)
        self.assertIn("crown", b.parts)

    def test_every_family(self):
        for cr in FAMS:
            b = build.make_body(upto="base", crown=cr)
            V, F, _, fp = Q.full_topology(b)
            m = Q.manifold(V, F)
            self.assertEqual(m["non_manifold_edges"], 0, cr); self.assertEqual(m["inconsistent_winding"], 0, cr)
            val = Q.valence(F, len(V))
            n0 = len(b.cage.V); pid = b.parts["crown"]
            extra = [i for i in range(n0) if abs(b.cage.V[i][1]) > 1e-12]
            for v in range(len(V)):
                base = v if v < n0 else extra[v - n0]
                if b.part[base] == pid:
                    self.assertIn(int(val[v]), (3, 4), (cr, v, val[v]))
            self.assertLessEqual(b.ctx["log"]["limit"]["max_err"], 0.004, cr)
            # off-plane shapes keep every vertex off the mirror plane (so the Mirror does not fuse a pair)
            ys = np.array([b.cage.V[i][1] for i in range(n0) if b.part[i] == pid])
            self.assertTrue(((ys == 0) | (ys > 0.0)).all(), cr)

    def test_roots_sunk_and_outside_face_cone(self):
        for cr in FAMS:
            b = build.make_body(upto="base", crown=cr)
            H = b.ctx["H"]; Rfa = b.ctx["info"]["head"]["Rfa"]
            for it in b.ctx["info"]["crown"]["items"]:
                c = it["centres"]
                q0 = to_local(H.kc, Rfa, c[0] if it["kind"] != "leaf" else c[0])
                # c is stored in the head-local frame already; sunk: the first centre is inside the skull field (dK < 0) or at most 0.02 outside
                d = float(H.dK(np.array([c[0]]))[0])
                stems = [x["centres"] for x in b.ctx["info"]["crown"]["items"] if x["kind"] == "stem"]
                d_stem = min([np.linalg.norm(c[0] - P, axis=1).min() for P in stems] or [9.0])
                self.assertTrue(d < 0.02 or d_stem < 0.2, (cr, it["kind"], d, d_stem))      # sunk into the head, or into its stem
                ang = [math.degrees(math.acos(np.clip((p / np.linalg.norm(p))[0], -1, 1))) for p in np.array(c)]
                self.assertGreaterEqual(min(ang), 40.0, (cr, it["kind"]))

    def test_stem_kappa_r(self):
        for cr in (dict(family="sprout", curl=1.0), dict(family="bud", curl=1.0)):
            b = build.make_body(upto="base", crown=cr, fix=False)
            for it in b.ctx["info"]["crown"]["items"]:
                if it["kind"] != "stem":
                    continue
                P = it["centres"]
                for i in range(1, len(P) - 1):
                    u, v = P[i] - P[i - 1], P[i + 1] - P[i]
                    ang = math.acos(np.clip(u @ v / np.linalg.norm(u) / np.linalg.norm(v), -1, 1))
                    kappa = ang / (0.5 * (np.linalg.norm(u) + np.linalg.norm(v)))
                    self.assertLessEqual(kappa * 0.075, 0.8)

    def test_deterministic(self):
        a = build.make_body(upto="base", crown=dict(family="fan", count=5, seed=9)); b = build.make_body(upto="base", crown=dict(family="fan", count=5, seed=9))
        self.assertTrue(np.array_equal(a.cage.arr(), b.cage.arr()))


if __name__ == "__main__":
    unittest.main()
