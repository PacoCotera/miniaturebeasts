"""Round 5, join C's path mechanism (anatomy-lessons.md §3.3): the rotation-minimizing frame does not twist (leftover roll between rings under 1 degree on a bent, leaning path) and a ring's frame
stays perpendicular to the tangent; the C builder runs, every ring has 8 vertices and the bands are quads."""
import os, sys, math, unittest
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import bpy
from limbs import rmf
from housefield import House
from build import make_cages


class T(unittest.TestCase):
    def test_rmf_has_no_twist(self):
        s = np.linspace(0, 1, 40)
        P = np.column_stack([0.5 * s + 0.2 * np.sin(3 * s), 0.1 * s, -0.8 * s + 0.1 * np.cos(4 * s)])
        T_, N, B = rmf(P)
        for i in range(len(P) - 1):
            self.assertAlmostEqual(float(N[i] @ T_[i]), 0.0, places=6)
            # the frame's turn about the tangent between rings: the part of N[i+1] left after the minimal rotation taking T[i] to T[i+1]
            ax = np.cross(T_[i], T_[i + 1]); sn = np.linalg.norm(ax)
            Nr = N[i] if sn < 1e-12 else N[i] * math.cos(math.asin(min(1, sn))) + np.cross(ax / sn, N[i]) * sn + (ax / sn) * ((ax / sn) @ N[i]) * (1 - math.cos(math.asin(min(1, sn))))
            twist = math.degrees(math.acos(np.clip(Nr @ N[i + 1], -1, 1)))
            self.assertLess(twist, 1.0)

    def test_join_c_builds_with_8_vertex_rings(self):
        H = House("S01")
        cages, _ = make_cages(H, join="C", beans=False)
        c = cages[1]
        for name, rings in c.legrings.items():
            self.assertTrue(all(len(r) == 8 for r in rings), name)
            self.assertGreaterEqual(len(rings), 6, name)
        self.assertTrue(all(len(f) == 4 for f in c.F))


if __name__ == "__main__":
    unittest.main()
