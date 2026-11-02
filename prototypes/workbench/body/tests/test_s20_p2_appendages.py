"""S20 pass 2, step 11 (owner idea): face attachment families. Whiskers and fangs on Tuliko (genes), horns and tusks as framework code with tests, not on Tuliko. The horn takes an age input in [0, 1]: length, curl, ridge count and girth never decrease with age; the tip goes from a blunt nub to a point,
and old age adds wear and a darker base."""
import os, sys, unittest
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import appendages as AP, s20build, s20indiv as IN, s20p2 as P2


class T(unittest.TestCase):
    def test_horn_length_curl_and_ridges_never_decrease_with_age(self):
        ages = np.linspace(0.0, 1.0, 41)
        L, nr, curl, girth = [], [], [], []
        for a in ages:
            P, R, n, wear = AP.horn_profile(a, 0.35, 0.05, 1.0)
            L.append(AP.centre_length(P)); nr.append(n); girth.append(float(R[0]))
            h = np.arctan2(np.diff(P[:, 2]), np.diff(P[:, 0]))
            curl.append(float(h[-1] - h[0]))
        print("horn length at ages 0, .33, .66, 1:", [round(L[i], 3) for i in (0, 13, 26, 40)], "ridges", [nr[i] for i in (0, 13, 26, 40)])
        self.assertTrue(all(b >= a - 1e-9 for a, b in zip(L, L[1:])))
        self.assertTrue(all(b >= a for a, b in zip(nr, nr[1:])))
        self.assertTrue(all(b >= a - 1e-9 for a, b in zip(curl, curl[1:])))
        self.assertTrue(all(b >= a - 1e-9 for a, b in zip(girth, girth[1:])))
        self.assertEqual(nr[0], 0); self.assertGreaterEqual(nr[-1], AP.RINGS)

    def test_ease_out_growth_and_the_tip(self):
        self.assertGreater(AP.ease_out(0.5), 0.5)                         # fast first, then it settles
        P0, R0, _, w0 = AP.horn_profile(0.0); P1, R1, _, w1 = AP.horn_profile(0.8); P2_, R2, _, w2 = AP.horn_profile(1.0)
        self.assertGreater(R0[-1] / R0[0], R1[-1] / R1[0])                  # a blunt nub young, a point adult
        self.assertEqual(w1, 0.0); self.assertGreater(w2, 0.9)               # old age (> 0.85) wears the tip
        self.assertGreater(R2[-1] / R2[0], R1[-1] / R1[0])
        # the generic age input serves other families
        a, b = AP.tusk_profile(0.2)[0], AP.tusk_profile(1.0)[0]
        self.assertGreater(AP.centre_length(b), AP.centre_length(a))
        self.assertEqual(AP.express(0.0, 2.0, 5.0), 2.0); self.assertEqual(AP.express(1.0, 2.0, 5.0), 5.0)

    def test_built_horn_grows_with_age(self):
        lens, rings = [], []
        for age in (0.0, 0.33, 0.66, 1.0):
            b = s20build.make_s20(upto="base", appendages=dict(horn=dict(age=age)))
            lg = b.ctx["log"]["appendages"]["horn"]
            lens.append(lg["length"]); rings.append(lg["ridges"])
            self.assertIn("horn.0", b.parts)
        print("built horn length", [round(x, 3) for x in lens], "ridges", rings)
        self.assertTrue(all(b >= a for a, b in zip(lens, lens[1:])))
        self.assertTrue(all(b >= a for a, b in zip(rings, rings[1:])))

    def test_tuliko_gets_whiskers_and_rare_fangs_and_no_horns(self):
        spec = IN.RAW["appendages"]
        self.assertEqual(spec["allowed"], ["whisker", "fang"])
        fangs, whisk = [], []
        for i in range(1, 13):
            c, b, R = IN.make(i)
            ap = c["appendages"]
            fangs.append(ap["fangs"]); whisk.append(ap["whiskers"]["count"])
            self.assertTrue(0 <= ap["whiskers"]["count"] <= 3)
            self.assertTrue(0.2 <= ap["whiskers"]["length"] <= 0.45 + 1e-9)
            names = set(b.parts)
            self.assertFalse(any(n.startswith(("horn", "tusk")) for n in names))
            if ap["fangs"]:
                self.assertIn("fang.0", names)
            if ap["whiskers"]["count"]:
                self.assertIn("whisker.0", names)
        print("whiskers per side", whisk, "fangs", fangs)
        self.assertGreaterEqual(sum(1 for f in fangs if f), 2)
        self.assertTrue(max(whisk) >= 2 and min(whisk) == 0)


if __name__ == "__main__":
    unittest.main()
