"""S20 pass 2 (lead, 2 Nov): the arms are nubs, not front legs. The tip stays at belly height, well above the knees (at least 0.35 H above the ground), the arm is at most 0.3 H long from the trunk surface, thick and rounded (root radius at least 0.09 H), and it does not reach past the head's silhouette from the front."""
import os, sys, unittest
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import s20indiv as IN, s20p2 as P2


class T(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.items = [IN.make(i) for i in (1, 2, 5, 8, 12)]

    def arm_numbers(self, b):
        V, F, at, fp2 = P2.level_arrays(b, 2)
        part = IN.part_of(b, F, fp2, len(V))
        arm = (part == b.parts["arm.L"]) & (V[:, 1] > 0)
        tor = part == b.parts["torso"]
        A, Tt = V[arm], V[tor]
        d = np.sqrt(((A[:, None, :] - Tt[None, :, :]) ** 2).sum(2).min(1))
        head_half = float(np.abs(V[(part == b.parts["torso"]) & (V[:, 2] > 1.2)][:, 1]).max())
        return dict(tip_z=float(A[:, 2].min()), length=float(d.max()), reach_y=float(np.abs(A[:, 1]).max()), head_half=head_half)

    def test_arm_tip_is_at_belly_height_above_the_knees(self):
        for i, (c, b, R) in enumerate(self.items):
            n = self.arm_numbers(b)
            print("individual", i, n)
            self.assertGreaterEqual(n["tip_z"], 0.35)

    def test_arm_length_from_the_trunk_surface_at_most_0p3(self):
        c, b, R = self.items[0]
        n = self.arm_numbers(b)
        print("arm length (farthest arm point from the trunk surface)", round(n["length"], 3))
        self.assertLessEqual(n["length"], 0.30)

    def test_arm_is_thick_and_inside_the_head_silhouette(self):
        c, b, R = self.items[0]
        n = self.arm_numbers(b)
        rt = b.ctx["spec"]["parts"]["arm.L"]["families"]["nub"]["joints"]
        self.assertGreaterEqual(rt[0]["r"][0], 0.09)
        self.assertLessEqual(n["reach_y"], n["head_half"] + 0.02)


if __name__ == "__main__":
    unittest.main()
