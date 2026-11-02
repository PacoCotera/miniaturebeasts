"""Chunk 2: limbs. Every pole classified (the list of s2.7), the bridge offset 0, the first ring outside the torso, the sole on the floor, ring ratio / aspect / kappa r / twist per limb, roll <= 15 deg."""
import os, sys, unittest, collections, math
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import build, mquality as Q, paths as PA


def classify_poles(b, V, F):
    """Name every vertex of valence != 4 (full mesh). Returns {vertex: kind} and the set of unlisted ones."""
    ctx = b.ctx
    m = ctx["remap"]
    n0 = len(b.cage.V)
    val = Q.valence(F, len(V))
    listed = {}
    cage = b.cage
    for cp in b.caps:
        for k, v in cp.G.items():
            if k in ((cp.na, 0), (cp.na, cp.nb)):
                listed[v] = "cap-corner"
    for name, rec in ctx["info"]["limbs"].items():
        for v in rec["loop"]:
            listed[m[v]] = "socket"
        last = rec["rings"][-1]
        for k in range(0, 8, 2):
            listed[m[last[k]]] = "sole-corner"
    for rec in ctx["info"].get("tubes", {}).values():             # pass 3: a hard-join shell (the ears, the arms) is a closed shell: its rings and two poles are its own corners
        if rec.get("hard"):
            for ring in rec["rings"]:
                for v in ring:
                    if v in m:
                        listed[m[v]] = "hard-shell"
            for k_ in ("tip_centre", "base_pole"):
                if rec.get(k_) in m:
                    listed[m[rec[k_]]] = "hard-shell pole"
    bead_ids = set()
    for name, bl in ctx["info"].get("beads", {}).items():
        for bd in bl:
            bead_ids.update(bd["ins"] + bd["top"])
            for v in bd["ins"]:
                listed[v] = "bead-base"
            for v in bd["top"]:
                listed[v] = "bead-top"
    # the original corners of the beaded faces (valence 5 or 6)
    for name, rec in ctx["info"]["limbs"].items():
        up, lo = rec["rings"][rec["foot_band_ring"]], rec["rings"][rec["support_ring"]]
        for v in up + lo:
            listed[m[v]] = listed.get(m[v], "bead-corner")
    unl = set()
    for v in range(len(V)):
        if val[v] != 4:
            half = v if v < n0 else None
            # mirrored copies: map back through the mirror order (copies appended in the same order as the non-centre half vertices)
            base = v
            if v >= n0:
                extra = [i for i in range(n0) if abs(V[i][1]) > 1e-12]
                base = extra[v - n0]
            if base not in listed:
                unl.add(v)
    return val, listed, unl


class T(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.b = build.make_body(upto="legs")
        cls.V, cls.F, cls.attr, cls.fp = Q.full_topology(cls.b)
        cls.ctx = cls.b.ctx

    def test_manifold_quads_mirror(self):
        self.assertEqual(Q.manifold(self.V, self.F), dict(non_manifold_edges=0, loose_verts=0, inconsistent_winding=0))
        self.assertEqual(Q.mirror_plane(self.V)["near_but_off"], 0)
        self.assertEqual(self.F.shape[1], 4)

    def test_every_pole_listed(self):
        val, listed, unl = classify_poles(self.b, self.V, self.F)
        self.assertEqual(len(unl), 0, f"unlisted poles: {len(unl)} {collections.Counter(val[list(unl)].tolist())}")

    def test_socket_corners_valence5(self):
        m = self.ctx["remap"]
        val = Q.valence(self.F, len(self.V))
        for name, rec in self.ctx["info"]["limbs"].items():
            vs = [val[m[v]] for v in rec["loop"]]
            self.assertEqual(sorted(vs), [4, 4, 4, 4, 5, 5, 5, 5], (name, vs))

    def test_bridge_offset_zero(self):
        m = self.ctx["remap"]
        V = self.b.cage.arr()
        for name, rec in self.ctx["info"]["limbs"].items():
            loop = [m[v] for v in rec["loop"]]
            first = [m[v] for v in (rec["transition"] if "transition" in rec else rec["rings"][0])]
            A, Bv = V[loop] - V[loop].mean(0), V[first] - V[first].mean(0)      # the shapes, not their distance apart
            A = A - np.outer(A @ rec['ringinfo'][0]['N'] * 0, rec['ringinfo'][0]['N'])
            Tg = np.cross(rec['ringinfo'][0]['N'], rec['ringinfo'][0]['B'])
            A, Bv = A - np.outer(A @ Tg, Tg), Bv - np.outer(Bv @ Tg, Tg)
            d = [sum(np.linalg.norm(A[k] - Bv[(k + o) % 8]) for k in range(8)) for o in range(8)]
            self.assertEqual(int(np.argmin(d)), 0, (name, d))

    def test_first_ring_outside_torso(self):
        T = self.ctx["T"]
        for name, rec in self.ctx["info"]["limbs"].items():
            ri = rec["ringinfo"][0]
            ps = np.linspace(0, 2 * math.pi, 24, endpoint=False)
            X = ri["centre"] + (ri["rf"] * np.cos(ps))[:, None] * ri["N"] + (ri["ra"] * np.sin(ps))[:, None] * ri["B"]
            self.assertFalse(T.inside(X, margin=0.0).any(), name)

    def test_sole_on_floor(self):
        m = self.ctx["remap"]
        L, _ = self.b.cage.limit_points()
        for name, rec in self.ctx["info"]["limbs"].items():
            cz = L[m[rec["sole_centre"]]][2]
            self.assertLessEqual(abs(cz), 0.02, (name, cz))
            self.assertAlmostEqual(self.ctx["spec"]["parts"][name]["P"][-1][2], 0.0, 9)

    def test_ring_numbers_per_limb(self):
        for name, rec in self.ctx["info"]["limbs"].items():
            ri = rec["ringinfo"]
            for a, b in zip(ri, ri[1:]):
                for k in ("ra", "rf"):
                    r = max(a[k] / b[k], b[k] / a[k])
                    self.assertLessEqual(r, 1.5, (name, k, r))
            for a in ri:
                self.assertGreaterEqual(a["ra"] / a["rf"], 0.6)
                self.assertLessEqual(a["ra"] / a["rf"], 1.6)
            self.assertLessEqual(rec["roll_total_deg"], 15.0)

    def test_path_fold_numbers(self):
        spec = self.ctx["spec"]
        for name in self.ctx["info"]["limbs"]:
            p = spec["parts"][name]
            r = PA.check_path(name, [j["name"] for j in p["joints"]], p["P"], p["R"], p["fillet"], exact=True)
            self.assertLessEqual(r["max_kappa_r"], 0.85)
            self.assertGreater(r["min_inner_gap_H"], 0)
            self.assertLessEqual(r["max_twist_deg_per_ring"], 1.0)

    def test_limit_error(self):
        self.assertLessEqual(self.ctx["log"]["limit"]["max_err"], 0.004)

    def test_mesh_quality_rows(self):
        pn = {v: k for k, v in self.b.parts.items()}
        for part in range(3):
            er = Q.edge_ratio(self.V, self.F, self.fp, part)
            print(pn[part], "edge ratio", round(er, 2))
        print("area", round(Q.area_ratio(self.V, self.F), 2), "nonplanar", round(Q.nonplanarity(self.V, self.F), 2))
        self.assertLessEqual(Q.edge_ratio(self.V, self.F, self.fp, 1), 2.5)
        self.assertLessEqual(Q.edge_ratio(self.V, self.F, self.fp, 2), 2.5)
        self.assertLessEqual(Q.area_ratio(self.V, self.F), 2.5)
        self.assertLessEqual(Q.nonplanarity(self.V, self.F), 0.1)


if __name__ == "__main__":
    unittest.main()
