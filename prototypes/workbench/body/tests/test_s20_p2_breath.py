"""S20 pass 2 (owner, 2 Nov): breathing inflates only the chest and belly, as a radial offset in the section plane of the one spine (a morph target in the glb), not a scale of the whole body. Across the breath cycle the head, ears, legs, feet, tail and lantern move less than
0.002 H; the ribcage section's radius changes by 3-4 % (the belly 2 %); no folds appear."""
import os, sys, unittest
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import s20indiv as IN, s20p2 as P2, s20normals as NM


class T(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.c, cls.b, cls.R = IN.make(1)
        cls.V, cls.F, cls.at, cls.fp2 = P2.level_arrays(cls.b, 2)
        cls.part = IN.part_of(cls.b, cls.F, cls.fp2, len(cls.V))
        cls.dV = cls.R.breath(cls.V, cls.at, cls.part, 1.0)

    def test_nothing_but_the_chest_and_belly_moves(self):
        names = {v: k for k, v in self.b.parts.items()}
        G = self.b.ctx["T"]
        mv = np.linalg.norm(self.dV, axis=1)
        u = G.L - np.clip(self.at[:, 1], 0, G.L)
        tor = self.part == self.b.parts["torso"]
        for nm in ("ear.L", "leg.L"):
            self.assertLess(float(mv[self.part == self.b.parts[nm]].max()), 0.002, nm)
        head = tor & (u < 0.75); seat_tail = tor & (u > 2.0)
        self.assertLess(float(mv[head].max()), 0.002); self.assertLess(float(mv[seat_tail].max()), 0.002)       # head, seat, tail and lantern
        feet = (self.V[:, 2] < 0.12) & (self.part == self.b.parts["leg.L"])
        self.assertLess(float(mv[feet].max()), 0.002)
        print("largest move: chest and belly", round(float(mv[tor & (u > 1.0) & (u < 2.0)].max()), 4), "H; arms", round(float(mv[self.part == self.b.parts["arm.L"]].max()), 4))

    def test_ribcage_and_belly_radius_change(self):
        G = self.b.ctx["T"]
        s = np.clip(self.at[:, 1], 0, G.L); u = G.L - s
        tor = self.part == self.b.parts["torso"]
        pt, T, N, B = G.pa.at(s[tor])
        def radius(V):
            r = V[tor] - pt; r = r - (r * T).sum(1, keepdims=True) * T
            return np.linalg.norm(r, axis=1)
        r0 = radius(self.V); r1 = radius(self.V + self.dV)
        for nm, uc, lo, hi in (("ribcage", 1.25, 0.030, 0.040), ("belly", 1.68, 0.017, 0.023)):
            m = np.abs(u[tor] - uc) < 0.03
            ch = float((r1[m] / r0[m]).mean() - 1)
            print(nm, "radius change", round(ch * 100, 2), "%")
            self.assertTrue(lo <= ch <= hi, (nm, ch))

    def test_no_folds_at_full_inhale(self):
        E, FA, FB = NM.edges(self.F); ok = FB >= 0
        def dots(V):
            fn = NM.face_normals(V, self.F)
            return (fn[FA[ok]] * fn[FB[ok]]).sum(1)
        d0, d1 = dots(self.V), dots(self.V + self.dV)
        print("min adjacent dot, exhale", round(float(d0.min()), 3), "inhale", round(float(d1.min()), 3))
        self.assertGreater(float(d1.min()), -0.2)
        self.assertGreaterEqual(float(d1.min()), float(d0.min()) - 0.05)


if __name__ == "__main__":
    unittest.main()
