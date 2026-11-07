"""The inverse fit converges on a test ellipsoid, within 0.004 H, and every part of Loika fits its field."""
import os, sys, unittest
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from housefield import House, sd_ellipsoid
from parts import build_head, build_torso, build_leg, build_paw
from cage import fit


class T(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.H = House("S01")

    def test_test_ellipsoid(self):
        r = (0.9, 0.5, 0.4)
        fld = lambda p: sd_ellipsoid(p, r)
        H = self.H
        H2 = type("X", (), {})()
        H2.pelvis, H2.chest = dict(c=np.array([-0.3, 0, 0.0]), r=np.array(r)), dict(c=np.array([0.3, 0, 0.0]), r=np.array(r))
        H2.dTorso = lambda p: np.minimum(sd_ellipsoid(p - H2.pelvis["c"], r), sd_ellipsoid(p - H2.chest["c"], r))
        C = build_torso(H2)
        res = fit(C, H2.dTorso)
        self.assertLess(res["max"], 0.004)

    def test_parts_fit(self):
        H = self.H
        C = build_head(H); C.fix_winding()
        self.assertLess(fit(C, H.d0)["max"], 0.004)
        T_ = build_torso(H); T_.fix_winding()
        self.assertLess(fit(T_, H.dTorso)["max"], 0.004)
        lg = H.legs[0]
        L = build_leg(H, lg); L.fix_winding()
        self.assertLess(fit(L, lg["d_column"])["max"], 0.004)
        P = build_paw(H, lg); P.fix_winding()
        self.assertLess(fit(P, lg["d_paw"])["max"], 0.004)

    def test_quads_and_mirror_plane(self):
        C = build_head(self.H)
        self.assertTrue(all(len(f) == 4 for f in C.F))
        V = C.arr()
        self.assertTrue((np.abs(V[C.centre_mask()][:, 1]) == 0).all())
        self.assertGreater(C.centre_mask().sum(), 10)


if __name__ == "__main__":
    unittest.main()
