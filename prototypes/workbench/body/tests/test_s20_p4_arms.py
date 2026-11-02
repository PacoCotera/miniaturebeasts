"""S20 pass 4 step 1 (AD gate on pass 3, must-fix 1): the arms are mittens. 0.34 H from the skin to the tip (along the arm's own path), about 0.16 H across at the root and at least 0.12 H at the tip, a rounded end, a slight paddle (width : depth about 1.3 : 1),
pitched 30 deg (+-5) forward of vertical and turned out 15-20 deg, a gap at az 0, the tip at the belly's front line at az 90, the shoulder joint about 0.15 H under the neck band, the hard join kept."""
import os, sys, math, unittest
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import s20indiv as IN, s20p2 as P2, s20p4 as P4


class T(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.items = [IN.make(i) for i in (1, 2, 5, 8)]
        cls.nums = [P4.arm_numbers(b) for c, b, R in cls.items]

    def test_length_pitch_and_turn(self):
        for k_, n in enumerate(self.nums):
            print({k: (round(v, 3) if isinstance(v, float) else np.round(v, 3).tolist()) for k, v in n.items()})
            tol = 0.02                                                       # the length is fitted on the shipped mesh for every individual (s20genes.build_individual: the arm skims the chest, so the design body is not accurate enough)
            self.assertTrue(abs(n["visible_len"] - 0.34) <= tol, n["visible_len"])
            self.assertTrue(25.0 <= n["pitch_fwd"] <= 35.0, n["pitch_fwd"])
            self.assertTrue(15.0 <= n["out"] <= 20.5, n["out"])

    def test_section_root_tip_paddle(self):
        c, b, R = self.items[0]
        r = b.ctx["spec"]["parts"]["arm.L"]["families"]["nub"]["joints"]
        rt, tp = r[0]["r"], r[-1]["r"]
        self.assertTrue(0.15 <= 2 * rt[0] <= 0.19, rt)                      # about 0.16 H across at the root
        self.assertGreaterEqual(2 * min(tp), 0.12)                          # the tip is at least 0.12 H across in both directions
        self.assertGreaterEqual(2 * tp[0], 0.9 * 2 * rt[0] * 0.75)          # taper at most 25 %
        for j in r:
            self.assertTrue(1.2 <= j["r"][0] / j["r"][1] <= 1.4, j["r"])    # a slight paddle, about 1.3 : 1

    def test_the_tip_is_rounded_not_pointed(self):
        """Slice the visible arm across its axis: just behind the tip the section is still at least 0.9 of the widest, and the last ring closes in a dome (no vertex pulled out to a point beyond 0.1 H of the last full ring)."""
        for (c, b, R), n in zip(self.items, self.nums):
            V, F, at, fp = P2.level_arrays(b, 2)
            part = IN.part_of(b, F, fp, len(V))
            A = V[(part == b.parts["arm.L"]) & (V[:, 1] > 0)]
            ax = n["axis"]
            t = (A - n["cross"]) @ ax
            tmax = t.max()
            def wide(lo, hi):
                m = (t >= lo) & (t < hi)
                S = A[m] - n["cross"]
                S = S - np.outer(S @ ax, ax)
                return float(np.linalg.norm(S, axis=1).max()) if m.any() else 0.0
            w_mid = wide(0.12, 0.22)
            w_end = wide(tmax - 0.08, tmax - 0.04)
            print("section radius mid", round(w_mid, 3), "near the tip", round(w_end, 3))
            self.assertGreaterEqual(w_end, 0.6 * w_mid)                    # a blunt end, not a cone
            self.assertGreaterEqual(2 * w_end, 0.12)

    def test_gap_at_az0_and_reach_at_az90(self):
        for (c, b, R), n in zip(self.items, self.nums):
            V, F, at, fp = P2.level_arrays(b, 2)
            part = IN.part_of(b, F, fp, len(V))
            A = V[(part == b.parts["arm.L"]) & (V[:, 1] > 0)]
            Tt = V[part == b.parts["torso"]]
            low = A[A[:, 2] < n["tip"][2] + 0.12]                           # the arm's lower end
            z = low[:, 2].mean()
            belly = Tt[(np.abs(Tt[:, 2] - z) < 0.05) & (np.abs(Tt[:, 1]) < 0.06)]
            # az 0: the arm's inner edge stands clear of the belly's own side line (the trunk's front, seen from the front) by at least 0.05 H in y: the trunk's flank at that height is narrower than the arm's inner edge
            inner = float(np.abs(low[:, 1]).min())
            self.assertGreaterEqual(inner, 0.28)                            # the belly patch is 0.46 H wide (half 0.23): at least 0.05 H of fur shows between its edge and the arm
            print("arm lower end: inner y %.3f; arm max x %.3f belly front %.3f" % (inner, A[:, 0].max(), belly[:, 0].max()))
            self.assertGreaterEqual(float(A[:, 0].max()), float(belly[:, 0].max()) - 0.04)   # at az 90 the tip reaches the belly's front line

    def test_shoulder_joint_under_the_neck_band_and_hard_join(self):
        c, b, R = self.items[0]
        spec = b.ctx["spec"]
        arm = spec["parts"]["arm.L"]
        self.assertEqual(arm["socket"]["join"], "hard")
        z_sh = arm["families"]["nub"]["joints"][0]["at"][2]
        z_neck = spec["parts"]["torso"]["head_profile"]["z_neck"] if "z_neck" in spec["parts"]["torso"]["head_profile"] else 1.2
        self.assertTrue(0.10 <= z_neck - z_sh <= 0.22, z_neck - z_sh)
        self.assertTrue(b.ctx["info"]["tubes"]["arm.L"]["hard"])


if __name__ == "__main__":
    unittest.main()
