"""Round 3, legs (AD item 13): the evaluated surface of the joined torso-and-legs cage lies on the house's leg field, not inside it. Round 2's mean was -0.006 H on every leg (the 8-point rings sag between
their vertices) and went as far in as -0.08 H at the elbow."""
import os, sys, unittest
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from test_blender import subsurf_eval
from housefield import House, uround
from build import make_cages


class T(unittest.TestCase):
    def test_legs_lie_on_the_field(self):
        H = House("S01")
        cages, _ = make_cages(H, join="B", beans=False)
        V, faces, _ = cages[1].full()
        out = subsurf_eval(V, faces, 3, limit=True)
        d = H.dTorso(out)
        for lg in H.legs:
            d = uround(d, lg["d_column"](out), H.uB)
        for lg in H.legs:
            m = (np.hypot(out[:, 0] - lg["cx"], out[:, 1] - lg["y"]) < 0.3) & (out[:, 2] < lg["top"][2] - 0.1) & (out[:, 2] > 0.1)
            self.assertGreater(m.sum(), 500)
            self.assertLess(abs(d[m].mean()), 0.005, lg["name"])        # round 2: -0.006
            self.assertLess((d[m] < -0.04).mean(), 0.08, lg["name"])    # the deep sags are the hidden underside and the bridge, not the columns


if __name__ == "__main__":
    unittest.main()
