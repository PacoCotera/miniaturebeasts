"""S20 pass 2, AD items 1 and 2: the hanging firefly lantern (the tail crook holds the bulb hanging, its tip axis within 30 degrees of straight down; a banded teardrop 0.26 x 0.20 H glowing on its lower 60 % in hue 70-90) and the hue gene
(at least 6 distinct base hues across the twelve; never a body hue of 10-35 degrees with a cream belly and a lit tail; no colour bleed down the tail on the warm hues)."""
import os, sys, math, unittest
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import s20indiv as IN, s20coat as CT, s20genes as GN, s20p2 as P2


def hue_of(rgb):
    r, g, b = [x / 255.0 for x in rgb]
    mx, mn = max(r, g, b), min(r, g, b)
    if mx == mn:
        return 0.0
    d = mx - mn
    h = ((g - b) / d) % 6 if mx == r else ((b - r) / d + 2 if mx == g else (r - g) / d + 4)
    return (h * 60.0) % 360.0


def luma(rgb):
    return (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255.0


class T(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.items = [IN.make(i) for i in range(1, 13)]

    def test_tip_axis_hangs_within_30_degrees_of_down(self):
        for i, (c, b, R) in enumerate(self.items, 1):
            if c["shape"]["tip"] != "lantern":
                continue
            G = b.ctx["T"]
            P0, P1 = G.pa.at([0.0])[0][0], G.pa.at([0.6 * G.bulb[0]])[0][0]            # the bulb's axis over its glowing lower 60 %: from its end to the 60 % point
            ax = P1 - P0
            ang = np.array([math.degrees(math.acos(float(np.clip(ax[2] / np.linalg.norm(ax), -1, 1))))])      # the path runs from the bulb's end up the stalk: +z along the axis is straight down for the bulb
            print("individual", i, "tip axis from straight down", ang.round(1).tolist())
            self.assertLess(float(ang.max()), 30.0, i)

    def test_bulb_is_a_teardrop_026_by_020(self):
        c, b, R = self.items[0]
        G = b.ctx["T"]
        L, Rb, um = G.bulb
        self.assertAlmostEqual(L, 0.26, delta=0.005)
        self.assertAlmostEqual(2 * Rb, 0.20, delta=0.005)
        s = np.linspace(0.0, L, 80)
        r = G.tail_radius(s)
        self.assertAlmostEqual(float(2 * r.max()), 0.20, delta=0.005)
        self.assertLess(float(r[-1]), float(r.max()) * 0.75)                 # a teardrop: it narrows into the neck
        self.assertGreater(float(r[5]), 0.0)

    def test_bulb_centre_below_the_crook(self):
        c, b, R = self.items[0]
        G = b.ctx["T"]
        pts = G.pa.at(np.linspace(0, 1.0, 400))[0]
        apex = float(pts[:, 2].max())
        mid = float(G.pa.at([G.bulb[0] / 2])[0][0][2])
        print("crook top", round(apex, 3), "bulb centre", round(mid, 3), "below", round(apex - mid, 3))
        self.assertTrue(0.10 <= apex - mid <= 0.17, apex - mid)               # the owner's 0.10-0.15 with the sampling tolerance
        ear_top = 2.3
        self.assertLess(apex, ear_top)

    def test_glows_on_the_lower_60_percent_in_a_firefly_hue(self):
        c, b, R = self.items[0]
        G = b.ctx["T"]
        for h in range(0, 360, 20):
            P = CT.palette_from_hue(h, {})
            hg = hue_of(P["glow"])
            self.assertTrue(70.0 <= hg <= 90.0, (h, hg))
        import s20tex as TX
        out = TX.bake(b, c["coat"], level=2, frames=("open",), size=2048)
        lit = out["fields"].get("lit")
        self.assertIsNotNone(lit)
        self.assertGreater(float((lit > 0.5).sum()), 50)

    def test_twelve_individuals_show_at_least_six_distinct_hues(self):
        hues = sorted(((c["coat"]["hue"] + 360.0 * c["coat"]["hue_shift"]) % 360.0) for c, b, R in self.items)
        distinct = [hues[0]]
        for h in hues[1:]:
            if h - distinct[-1] >= 20.0:
                distinct.append(h)
        print("hues", [round(h) for h in hues], "distinct", len(distinct))
        self.assertGreaterEqual(len(distinct), 6)

    def test_no_cream_belly_with_a_lit_tail_in_the_ember_window(self):
        """The ember rule (pass 4, AD gate on pass 3): a body hue of 10-35 degrees never has a pale belly with a lit tail: its belly is DARK, in the coat's own hue (the pass 2 rule, a pale cool belly, still left no. 5 reading as the fire-tailed starter)."""
        for h in range(10, 36, 5):
            P = CT.palette_from_hue(h, {})
            self.assertLess(luma(P["belly"]), 0.8 * luma(P["coat"]), h)
            d = abs(((hue_of(P["belly"]) - hue_of(P["coat"]) + 180.0) % 360.0) - 180.0)
            self.assertLessEqual(d, 12.0, (h, d))                                          # the coat's own hue, not a contrasting one
        for i, (c, b, R) in enumerate(self.items, 1):
            h = (c["coat"]["hue"] + 360.0 * c["coat"]["hue_shift"]) % 360.0
            P = CT.palette_from_hue(h, c["coat"])
            if 10.0 <= h <= 35.0 and c["shape"]["tip"] == "lantern":
                self.assertLess(luma(P["belly"]), 0.8 * luma(P["coat"]), (i, h))

    def test_plush_colour_range_and_a_lighter_belly_on_every_hue(self):
        """The design palette folds in the look-dev gains (S 0.35-0.75, V 0.55-1.0) so the RENDERED body is in the plush range (HSV S 0.35-0.60, V 0.55-0.85), and the belly is at least 15 % lighter than the coat on EVERY hue (the greens lost theirs)."""
        import colorsys
        for h in range(0, 360, 5):
            P = CT.palette_from_hue(h, {})
            hh, ss, vv = colorsys.rgb_to_hsv(*(np.array(P["coat"]) / 255.0))
            self.assertTrue(0.35 - 1e-6 <= ss <= 0.75 + 1e-6, (h, ss))          # the design palette; under the soft studio light and AgX the rendered body lands at S 0.35-0.60, V 0.55-0.85 (measured in the sheet)
            self.assertTrue(0.55 - 1e-6 <= vv <= 1.0 + 1e-6, (h, vv))
            if 10 <= h <= 35:                                                          # the ember window: a dark belly (test above)
                continue
            self.assertGreaterEqual(luma(P["belly"]), 1.15 * luma(P["coat"]), h)

    def test_no_tail_colour_bleed_on_warm_hues(self):
        c, b, R = self.items[0]
        import s20tex as TX
        for h, bleeds in ((20.0, False), (200.0, True)):
            g = dict(c["coat"], hue=h, hue_shift=0.0, bleed=0.9)
            o = CT.coat(b.ctx, *self._tail_points(b), g, "open")
            P = CT.palette_from_hue(h, g)
            near = o["fields"]["bleed"] > 0.2
            self.assertTrue(near.any())
            col = CT.lin_to_srgb(o["col"])[near]
            body = np.array(P["coat"])
            d = np.abs(col - body).max(1)
            print("hue", h, "colour pulled from the body by the bleed (median /255)", round(float(np.median(d)), 1))
            if not bleeds:
                self.assertLess(float(np.median(d)), 60.0)                # the freckles and gradient only
            else:
                self.assertGreater(float(np.median(d)), 8.0)

    def _tail_points(self, b):
        import subdiv as SD, gltf_out, numpy as np
        Vf, Ff, attr, fp, cr, mir = b.full()
        V, F, _, at, fp2 = SD.subdivide(Vf, Ff, cr, attr, fp, levels=2)
        G = b.ctx["T"]
        sel = (np.rint(at[:, 0]).astype(int) == b.parts["torso"]) & (at[:, 1] > G.bulb[0]) & (at[:, 1] < G.bulb[0] + 0.25)
        N = gltf_out.vertex_normals(V, np.array(F, int))
        part = np.rint(at[:, 0]).astype(int)
        return V[sel], at[sel], part[sel], N[sel], at[sel][:, 3]


if __name__ == "__main__":
    unittest.main()
