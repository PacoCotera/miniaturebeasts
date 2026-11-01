"""Chunk 4: the rig. Weights sum to 1; stand pose from the house numbers; walk: paw orientation table (16 frames), apexes keep their side, left/right mirror within 1 degree, no sinking through the floor; folds at the four key poses (reported against the rest mesh, the spec's absolute test is kept)."""
import os, sys, math, unittest
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import build, rig, subdiv as SD, mquality as Q


def table(R, ctx):
    rows = []
    for i in range(16):
        ph = i / 16
        M, stance = R.walk_pose(ph)
        rows.append((ph, stance))
    return rows


class T(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.b = build.make_body(upto="base")
        cls.R = rig.Rig(cls.b.ctx)
        V, F, attr, fp, cr, mir = cls.b.full()
        cls.V2, cls.F2, _, cls.attr2, _ = SD.subdivide(V, F, cr, attr, fp, levels=2)
        cls.W = cls.R.weights(cls.V2, cls.attr2)

    def test_weights_unit_and_bone_count(self):
        self.assertLess(float(np.abs(self.W.sum(1) - 1).max()), 1e-9)
        self.assertGreaterEqual(self.W.min(), 0)
        self.assertEqual(len(self.R.bones), 5 + 12)

    def test_paw_orientation_16_frames(self):
        R = self.R
        for i in range(16):
            ph = i / 16
            for key, off in ((("fore", "L"), 0.0), (("hind", "R"), 0.0), (("fore", "R"), 0.5), (("hind", "L"), 0.5)):
                u = (ph + off) % 1.0
                M, _ = R.walk_pose(ph)
                kind, side = key
                Mp = M[f"{kind}.paw.{side}"]
                fwd = Mp[:3, :3] @ np.array([1.0, 0, 0])
                up = Mp[:3, :3] @ np.array([0, 0, 1.0])
                yaw = math.degrees(math.atan2(fwd[1], fwd[0]))
                self.assertLessEqual(abs(yaw), 10.0)                           # forward axis within 10 deg of body forward (the paw-turn is in the rings)
                self.assertGreater(fwd[0], 0)                                   # toes never point backward
                if u < 0.6:
                    self.assertLessEqual(math.degrees(math.acos(np.clip(up[2], -1, 1))), 10.0)    # sole level in stance

    def test_left_right_mirror(self):
        R = self.R
        for i in range(16):
            ph = i / 16
            M0, _ = R.walk_pose(ph)
            M1, _ = R.walk_pose((ph + 0.5) % 1.0)
            for kind in ("fore", "hind"):
                for part in ("upper", "lower", "paw"):
                    par = lambda M, side: M[f"{kind}.{ {'upper': 'upper', 'lower': 'upper', 'paw': 'lower'}[part] }.{side}"] if part != 'upper' else M['spine.chest' if kind == 'fore' else 'spine.pelvis']
                    a = np.linalg.inv(par(M0, 'L')) @ M0[f"{kind}.{part}.L"]; b = np.linalg.inv(par(M1, 'R')) @ M1[f"{kind}.{part}.R"]
                    # a half cycle apart the two sides trade places: the same rotation angle (about y)
                    ang = lambda m: math.degrees(math.atan2(m[0, 2], m[0, 0]))
                    self.assertLessEqual(abs(ang(a) - ang(b)), 1.0)

    def test_apexes_keep_side(self):
        R = self.R
        for kind in ("fore", "hind"):
            rest = R.rest_dirs(kind)
            s_el = np.sign(math.sin(rest[1] - rest[0]))
            s_wr = np.sign(math.sin(rest[2] - rest[1]))
            worst = []
            for i in range(32):
                ph = i / 32
                for off in (0.0, 0.5):
                    u = (ph + off) % 1
                    if u < 0.6:
                        dx, lf, pp = 0.16 - 0.32 * u / 0.6, 0.0, 0.0
                    else:
                        w = (u - 0.6) / 0.4
                        dx, lf, pp = -0.16 + 0.32 * w, 0.08 * math.sin(math.pi * w), math.radians(14) * math.sin(math.pi * w)
                    a = R.ik_leg(kind, dx, lf, pp)
                    self.assertEqual(np.sign(math.sin(a[1] - a[0])), s_el, (kind, "elbow/knee flipped", ph))
                    worst.append(np.sign(math.sin(a[2] - a[1])) == s_wr)
            print(kind, "wrist/hock apex kept in", sum(worst), "of", len(worst))
            self.assertTrue(all(worst), (kind, "wrist/hock apex flipped"))

    def test_feet_do_not_sink(self):
        for ph in (0.0, 0.25, 0.5, 0.75):
            M, _ = self.R.walk_pose(ph)
            z = self.R.skin(self.V2, self.W, M)[:, 2].min()
            self.assertGreaterEqual(z, -0.03, (ph, z))

    def test_stand_pose_numbers(self):
        H = self.b.ctx["H"]
        M = self.R.stand_pose()
        head = M["head"]
        yaw = math.degrees(math.atan2(head[1, 0], head[0, 0]))
        self.assertAlmostEqual(yaw, H.pose["headYawSigned"], delta=0.5)
        z = self.R.skin(self.V2, self.W, M)[:, 2].min()
        self.assertGreaterEqual(z, -0.03)

    def test_folds_at_walk_keys(self):
        rest = Q.flips(self.V2, self.F2)["min_adjacent_normal_dot"]
        print("rest min dot", round(rest, 2))
        for ph in rig.WALK_KEYS:
            M, _ = self.R.walk_pose(ph)
            f = Q.flips(self.R.skin(self.V2, self.W, M), self.F2)
            print("key", ph, "min dot", round(f["min_adjacent_normal_dot"], 2), "vol", round(f["volume"], 2))
            self.assertGreater(f["volume"], 0)
            self.assertGreater(f["min_adjacent_normal_dot"], -0.2)       # the spec's absolute test (it fails at rest too: chunk 3's folds)


if __name__ == "__main__":
    unittest.main()
