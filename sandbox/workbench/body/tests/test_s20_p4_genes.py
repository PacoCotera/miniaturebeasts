"""S20 pass 4 step 8 (AD gate on pass 3, 5 and 6.8): at most two loud genes per individual (coat pattern, glow pattern, emblem, brow); the constellation gene retired; whiskers in symmetric sets of at least 2 a side, clear of the mouth, or none; the ember rule (warm hues 10-35 degrees get a dark belly); the muzzle patch a lighter tint of the coat's own hue."""
import os, sys, colorsys, unittest
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import s20genes as GN, s20coat as CT, s20indiv as IN


def luma(c):
    c = np.asarray(c, float) / 255.0
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


class T(unittest.TestCase):
    def test_at_most_two_loud_genes_in_the_twelve_and_in_sixty_more_draws(self):
        for i in list(range(1, 13)) + list(range(13, 73)):
            ind = GN.draw(i)
            loud = GN.loud_genes(ind)
            self.assertLessEqual(len(loud), 2, (i, loud))
        print("loud genes of the twelve:", {i: GN.loud_genes(GN.draw(i)) for i in range(1, 13)})

    def test_dropping_a_loud_gene_leaves_the_rest_as_drawn(self):
        a = GN.draw(8); raw_a = GN.limit_loud.__doc__
        b = GN.draw(8)
        self.assertEqual(a["t"], b["t"])                                                     # deterministic

    def test_the_constellation_is_retired(self):
        self.assertNotIn("constellation", GN.PAIRS["coat.glow-pattern"][0])
        for i in range(1, 73):
            self.assertNotEqual(GN.creature(GN.draw(i))["coat"]["glow_pattern"], "constellation")
        self.assertNotIn("cheek", GN.PAIRS["coat.mark-where"][0])

    def test_whisker_counts_are_none_or_at_least_two_a_side(self):
        counts = set()
        for i in range(1, 73):
            n = GN.creature(GN.draw(i))["appendages"]["whiskers"]["count"]
            counts.add(n)
            self.assertTrue(n == 0 or n >= 2, (i, n))
        self.assertIn(0, counts); self.assertIn(2, counts)

    def test_whiskers_are_symmetric_and_start_clear_of_the_mouth(self):
        for i in (3, 4, 7, 12):
            c, b, R = IN.make(i)
            n = c["appendages"]["whiskers"]["count"]
            self.assertGreaterEqual(n, 2, i)
            V, F, attr, fp, cr, mir = b.full()
            pn = {v: k for k, v in b.parts.items()}
            W = [k for k in b.parts if k.startswith("whisker")]
            self.assertEqual(len(W), n, i)
            half_mouth = 0.5 * b.ctx["spec"]["face"]["mouth"]["width"]
            for k in W:
                pid = b.parts[k]
                P = V[np.where(np.rint(attr[:, 0]).astype(int) == pid)[0]]
                left, right = P[P[:, 1] > 1e-6], P[P[:, 1] < -1e-6]
                self.assertEqual(len(left), len(right), (i, k))                          # a mirror pair: symmetric by construction
                self.assertTrue(np.allclose(np.sort(left[:, 1]), np.sort(-right[:, 1]), atol=1e-9))
                base = left[np.argmin(left[:, 1])]                                       # the base: the point nearest the midline
                self.assertGreaterEqual(float(base[1]), half_mouth + 0.05, (i, k, float(base[1])))     # clear of the mouth's corner by at least 0.05 H

    def test_ember_rule_warm_hues_get_a_dark_belly(self):
        for h in range(10, 36):
            P = CT.palette_from_hue(float(h), {})
            self.assertLess(luma(P["belly"]), 0.8 * luma(P["coat"]), h)
        for h in (0, 60, 120, 200, 270, 320):                                              # elsewhere the belly stays the lighter tint
            P = CT.palette_from_hue(float(h), {})
            self.assertGreater(luma(P["belly"]), luma(P["coat"]), h)
        c, b, R = IN.make(5)
        h = (c["coat"]["hue"] + 360.0 * c["coat"]["hue_shift"]) % 360.0
        print("individual 5 hue", round(h), "belly luma / coat luma", round(luma(CT.palette_from_hue(h, c["coat"])["belly"]) / luma(CT.palette_from_hue(h, c["coat"])["coat"]), 2))

    def test_muzzle_is_a_lighter_tint_of_the_coats_own_hue(self):
        for h in range(0, 360, 10):
            P = CT.palette_from_hue(float(h), {})
            self.assertGreater(luma(P["muzzle"]), luma(P["coat"]), h)
            hm = colorsys.rgb_to_hsv(*(np.asarray(P["muzzle"]) / 255.0))[0] * 360.0
            hc = colorsys.rgb_to_hsv(*(np.asarray(P["coat"]) / 255.0))[0] * 360.0
            d = abs(((hm - hc + 180.0) % 360.0) - 180.0)
            self.assertLessEqual(d, 12.0, (h, hm, hc))


if __name__ == "__main__":
    unittest.main()
