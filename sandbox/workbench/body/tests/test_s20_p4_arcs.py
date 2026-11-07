"""S20 pass 4 step 6 (AD gate on pass 3, 3e): the glow pattern as firefly arcs. 2-3 thin arcs, 0.025 H thick and 0.07 H apart, sagging with the belly, on the lower 60 % of the belly patch only, inset at least 0.04 H from its edge, fading at their ends; one hue, the lantern's (70-90 degrees); emission at most half the lantern's."""
import os, sys, math, colorsys, unittest
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import s20indiv as IN, s20coat as CT


def runs(z, m):
    zs = z[m]
    if len(zs) == 0:
        return []
    out, start, prev = [], zs[0], zs[0]
    for v in zs[1:]:
        if v - prev > 0.006:
            out.append((start, prev)); start = v
        prev = v
    out.append((start, prev))
    return out


class T(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.items = [IN.make(i) for i in (2, 5, 8, 11)]

    def dense(self, c, b):
        G = b.ctx["T"]
        zz, aa = np.meshgrid(np.arange(0.2, 1.1, 0.002), np.arange(0.80, 1.0001, 0.002), indexing="ij")
        P = G.point(zz.ravel(), aa.ravel())
        nrm = np.stack([P[:, 0], P[:, 1], np.zeros(len(P))], 1); nrm /= np.maximum(np.linalg.norm(nrm, axis=1, keepdims=True), 1e-9)
        n = len(P)
        at = np.zeros((n, 4)); at[:, 1] = G.L - 0.3; at[:, 2] = aa.ravel()
        g = {**c["coat"], "glow_pattern": "belly-arcs", "belly_reach": 0.0}
        o = CT.coat(b.ctx, P, at, np.zeros(n, int), nrm, at[:, 3], g, "open")
        return P, o, g

    def test_arcs_thickness_spacing_position_and_inset(self):
        for c, b, R in self.items:
            P, o, g = self.dense(c, b)
            F = o["fields"]
            gp = F["glow_pattern"]
            z = P[:, 2]; lat = np.abs(P[:, 1])
            mid = (lat < 0.012) & (gp > 0.5)
            r = runs(z[mid], np.ones(mid.sum(), bool))
            th = [b_ - a_ for a_, b_ in r]
            cen = [0.5 * (a_ + b_) for a_, b_ in r]
            print("arcs on the midline: %d, thickness %s, spacing %s" % (len(r), np.round(th, 3).tolist(), np.round(np.diff(cen), 3).tolist()))
            self.assertIn(len(r), (2, 3))
            for t_ in th:
                self.assertTrue(0.015 <= t_ <= 0.032, t_)                                     # 0.025 H thick
            for d_ in np.diff(cen):
                self.assertTrue(0.06 <= d_ <= 0.08, d_)                                       # 0.07 H apart
            on = gp > 0.5
            zb, Hb = 0.29, 1.26 * 2 * 0.24
            self.assertLessEqual(float(((z[on] - zb) / Hb).max()), 0.6 + 0.01)                  # the lower 60 % of the patch only
            # inset: every arc point is at least 0.04 H inside the egg's edge (the egg's own radial coordinate, 0.24 H to the edge)
            wid = 0.24
            tm = 0.48
            tt = (z[on] - zb) / Hb
            uu = np.where(tt < tm, (tt - tm) / tm, (tt - tm) / (1 - tm))
            rr = np.sqrt((lat[on] / wid) ** 2 + uu ** 2)
            self.assertGreaterEqual(float(((1 - rr) * 0.24).min()), 0.04 - 0.008)
            # sagging: lowest on the midline, rising toward the ends
            k0 = np.argmax(mid & (z > 0))
            top_arc = max(cen)
            side = (gp > 0.5) & (lat > 0.10) & (z > top_arc - 0.035)
            self.assertGreater(float(z[side].mean()), float(top_arc))
            # fading at the ends: the field falls below 0.5 toward the edge (the inset ramp), not a hard cut: some points between 0.1 and 0.9
            self.assertGreater(int(((gp > 0.1) & (gp < 0.9)).sum()), 50)

    def test_one_hue_the_lanterns_and_emission_at_most_half(self):
        for c, b, R in self.items:
            P, o, g = self.dense(c, b)
            gp = o["fields"]["glow_pattern"]
            on = gp > 0.9
            self.assertTrue(on.any())
            rgb = CT.lin_to_srgb(o["col"][on]) / 255.0
            hues = np.array([colorsys.rgb_to_hsv(*x)[0] * 360.0 for x in rgb])
            print("arc hue median %.0f, spread %.0f..%.0f" % (np.median(hues), hues.min(), hues.max()))
            self.assertTrue(60.0 <= float(np.median(hues)) <= 100.0)
            self.assertLessEqual(float(hues.max() - hues.min()), 15.0)                         # one hue, not three
            gl = float(g["glow"])
            lantern_peak = 0.9 + 0.7 * gl                                                      # the lantern's emission at its bottom (s20coat: glow_n * (0.9 + 0.7 gl))
            em = o["emit"][on].max()
            print("arc emission peak %.2f of the lantern's %.2f" % (em, lantern_peak))
            self.assertLessEqual(float(em), 0.5 * lantern_peak + 1e-6)


if __name__ == "__main__":
    unittest.main()
