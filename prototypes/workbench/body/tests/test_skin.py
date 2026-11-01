"""Chunk 6: skin and face. Cream within the AD's numbers, blink outline diff 0 px at 304 and 96, shadow haze, UV stretch per island (the last two fail and are reported, not relaxed)."""
import os, sys, unittest
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import build, rig, render_skin as RS, measure_skin as MS, views, uvstretch


class T(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.b = build.make_body(upto="base"); cls.R = rig.Rig(cls.b.ctx); cls.Mp = cls.R.stand_pose()
        cls.c = {s: RS.aligned_centre(cls.b, cls.R, cls.Mp, s) for s in (304, 96)}
        out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "out")
        cls.out = out
        cls.a304, _ = RS.render_skin(cls.b, cls.R, cls.Mp, os.path.join(out, "_t304.png"), 304, centre=cls.c[304], samples=24)

    def test_cream_ad_numbers(self):
        m = MS.measure(self.a304)
        for x, y in zip(m["cream_rgb"], (223, 196, 157)):
            self.assertLessEqual(abs(x - y), 4, m)
        self.assertTrue(62 <= m["cream_R_minus_B"] <= 70, m)

    def test_blink_outline_diff_zero(self):
        for size, smp in ((304, 12), (96, 12)):
            ao, _ = RS.render_skin(self.b, self.R, self.Mp, os.path.join(self.out, "_o.png"), size, centre=self.c[size], samples=smp)
            ac, _ = RS.render_skin(self.b, self.R, self.Mp, os.path.join(self.out, "_c.png"), size, centre=self.c[size], eye_frames=("closed", "closed"), samples=smp)
            self.assertEqual(int(((ao[..., 3] > 0.5) != (ac[..., 3] > 0.5)).sum()), 0, size)

    def test_shadow_haze(self):
        self.assertLessEqual(MS.measure(self.a304)["partial_alpha_px"], 1500)        # the AD's limit (the master itself has 2336 edge pixels by this count)

    def test_uv_stretch(self):
        M = views.level_mesh(self.b, 2)
        us = uvstretch.island_stretch(M["V"], M["F"], M["attr"], self.b.parts)
        bad = {k: round(v["p95"], 1) for k, v in us.items() if v["p95"] > 1.3}
        self.assertEqual(bad, {}, bad)


if __name__ == "__main__":
    unittest.main()
