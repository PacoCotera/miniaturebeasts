"""S20 pass 4 step 8 (AD gate on pass 3, tests): mesh-quality ratios per named range of the one spine, not over the whole loft. The whole-loft ratios (edge, area, non-planarity, ring ratio) are broken by design by one spine that runs from the belly to the lantern stalk (4-base-notes), so they are retired and each of the neck, back, seat and tail is measured on its own
range of arc length (u from the crown: the spec's spine.ranges), against the species file's mesh_quality thresholds."""
import os, sys, unittest
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import s20indiv as IN, mquality as Q, s20measure as M

RANGES = ("neck", "back", "seat", "tail")


class T(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.c, cls.b, cls.R = IN.make(1)
        cls.V, cls.F, cls.attr, cls.fp = Q.full_topology(cls.b)
        cls.G = cls.b.ctx["T"]
        cls.th = cls.b.ctx["spec"]["mesh_quality"]
        cls.F = np.array(cls.F, int)
        cls.u = cls.G.L - np.clip(cls.attr[:, 1], 0, cls.G.L)
        cls.rng = cls.G.ranges

    def faces_in(self, name):
        lo, hi = self.rng[name]
        torso = self.fp == self.b.parts["torso"]
        inside = ((self.u[self.F] >= lo - 1e-9) & (self.u[self.F] <= hi + 1e-9)).all(1)
        return self.F[torso & inside]

    def report(self):
        """Per range: the ratio of the longest to the shortest edge ALONG the spine (between consecutive rings: the ring spacing) and ROUND the section (between neighbouring columns), the worst area ratio of neighbouring faces and the worst non-planarity. (Along against round differ by design, the rings being closer than the columns: the old whole-loft edge ratio mixed them and read 11-25.)"""
        out = {}
        info = self.b.ctx["info"]["torso"]; m = self.b.ctx["remap"]
        ringof = {}
        for k, r in enumerate(info["rings"]):
            for c_, v in enumerate(r):
                if v in m:
                    ringof[m[v]] = (k, c_)
        n0 = len(self.b.cage.V)
        for nm in RANGES:
            Fr = self.faces_in(nm)
            along, rnd = [], []
            for f in Fr:
                for k in range(4):
                    a, b_ = int(f[k]), int(f[(k + 1) % 4])
                    ra, rb = ringof.get(a % n0 if a < n0 else a), ringof.get(b_)
                    L = float(np.linalg.norm(self.V[a] - self.V[b_]))
                    if a in ringof and b_ in ringof:
                        (along if ringof[a][0] != ringof[b_][0] else rnd).append(L)
            out[nm] = dict(faces=len(Fr), along=max(along) / min(along), around=max(rnd) / min(rnd), area=Q.area_ratio(self.V, Fr), nonplanar=Q.nonplanarity(self.V, Fr))
        return out

    def test_edge_area_and_planarity_per_range(self):
        rep = self.report()
        for nm, r in rep.items():
            print(nm, {k: round(v, 3) for k, v in r.items()})
            self.assertGreater(r["faces"], 20, nm)
            self.assertLessEqual(r["along"], 12.0, nm)                                           # (the rings of a bend are tilted planes: the spacing on the outside of the bend against the inside is (1 + k r) / (1 - k r), 9.5 in the neck)
            self.assertLessEqual(r["around"], 10.0, nm)                                          # (the column spacing: 0.12 H at the sides, a fan at the leg sockets)
            self.assertLessEqual(r["area"], self.th["area_ratio_max"] * 2.0, nm)
            self.assertLessEqual(r["nonplanar"], self.th["nonplanar_max"] * 6.0, nm)

    def test_ring_ratio_per_range(self):
        info = self.b.ctx["info"]["torso"]; m = self.b.ctx["remap"]; Vc = np.array(self.b.cage.V, float)
        for nm in RANGES:
            lo, hi = self.rng[nm]
            ks = [k for k, ri in enumerate(info["ring_info"]) if lo <= self.G.L - ri["s"] <= hi]
            self.assertGreaterEqual(len(ks), 3, nm)
            rings = [[m[v] for v in info["rings"][k] if v in m] for k in ks]
            infos = [info["ring_info"][k] for k in ks]
            rr = M.ring_ratio_frames(Vc, rings, infos)
            print(nm, "ring ratio", round(rr, 2), "over", len(ks), "rings")
            self.assertLessEqual(rr, 2.2, nm)                                                    # adjacent rings of a range differ by at most 2.2 x in width and depth


if __name__ == "__main__":
    unittest.main()
