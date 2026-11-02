"""S20 pass 4 (owner, 2 Nov): the tail stays on the body's midline in rest, stand, idle, breathe and waddle (no yaw hack at the first tail joint), and a sway is spread evenly over every tail joint. The mean lateral offset of the tail joints in every clip's rest frame is about 0."""
import os, sys, math, unittest
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import s20indiv as IN, s20rig


def tail_heads(R, M):
    out = []
    for k in range(1, len(R.tail_P)):
        h = np.append(R.bones[f"tail.{k}"][0], 1.0)
        out.append((M[f"tail.{k}"] @ h)[:3])
    return np.array(out)


class T(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.c, cls.b, cls.R = IN.make(1)

    def test_tail_joints_mean_lateral_offset_is_zero_in_every_clip_rest_frame(self):
        R = self.R
        frames = {"rest": R.pose(), "stand": R.stand_pose(), "breathe": R.pose(head_nod=math.radians(-3.0)), "idle": R.pose(tail_sway=0.0, head_nod=math.radians(-3.0), arm=0.0)}
        for name, M in frames.items():
            y = tail_heads(R, M)[:, 1]
            print(name, "tail joints y", np.round(y, 3).tolist())
            self.assertAlmostEqual(float(y.mean()), 0.0, delta=0.05, msg=name)
            self.assertLess(float(np.abs(y).max()), 0.12, name)
        # the waddle: the tail follows the body's own 4 degree yaw and roll, and sways both ways: over the cycle the mean lateral offset is 0
        ys = np.array([tail_heads(R, R.waddle_pose(i / 16)[0])[:, 1].mean() for i in range(16)])
        print("waddle: mean tail y over the cycle", round(float(ys.mean()), 4), "range", round(float(ys.min()), 3), round(float(ys.max()), 3))
        self.assertAlmostEqual(float(ys.mean()), 0.0, delta=0.02)
        self.assertLess(float(np.abs(ys).max()), 0.25)

    def test_the_sway_is_symmetric_and_spread_over_every_joint(self):
        R = self.R
        n = len(R.tail_P) - 1
        sw = math.radians(8.0)
        right = tail_heads(R, R.pose(tail_sway=sw))[:, 1]
        left = tail_heads(R, R.pose(tail_sway=-sw))[:, 1]
        self.assertTrue(np.allclose(right, -left, atol=1e-9))              # symmetric about the midline
        # spread evenly: every joint after the root turns by the same angle, so the heading change between consecutive segments is the same
        M = R.pose(tail_sway=sw)
        ang = []
        for k in range(1, n + 1):
            ang.append(math.degrees(math.atan2(M[f"tail.{k}"][1, 0], M[f"tail.{k}"][0, 0])))
        d = np.diff([0.0] + ang)
        print("tail joint headings", np.round(ang, 2).tolist())
        self.assertTrue(np.allclose(d, d[0], atol=1e-6), d)                  # no kink at the root: an even turn at each joint
        self.assertAlmostEqual(ang[-1], 8.0, delta=0.01)


if __name__ == "__main__":
    unittest.main()
