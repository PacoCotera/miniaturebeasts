"""The painted layer: the glb's margins stand for the sprite's smoothsteps; the cream edge is one smooth curve; the legs of the cage lie on the house's leg field."""
import os, sys, unittest
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from housefield import House, sstep
import paint as PT


class T(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.H = House("S01")

    def test_margin_is_the_smoothstep(self):
        x = np.linspace(-1, 2, 50)
        np.testing.assert_allclose(sstep(0.2, 0.9, x), sstep(-1, 1, PT.margin(0.2, 0.9, x)), atol=1e-12)
        np.testing.assert_allclose(sstep(0.9, 0.2, x), sstep(-1, 1, PT.margin(0.9, 0.2, x)), atol=1e-12)

    def test_body_cream_margin_stands_for_the_product(self):
        H = self.H
        rng = np.random.default_rng(3)
        P = np.column_stack([rng.uniform(-1.6, 0.6, 4000), rng.uniform(-0.8, 0.8, 4000), rng.uniform(0.2, 1.4, 4000)])
        N = rng.normal(size=(4000, 3)); N /= np.linalg.norm(N, axis=1, keepdims=True)
        prod = PT.body_cream(H, P, N)
        marg = sstep(-1, 1, PT.body_cream_margin(H, P, N))
        self.assertLess(np.abs(prod - marg).max(), 0.3)       # where two edges meet the min of margins is not the product
        self.assertLess(np.abs(prod - marg).mean(), 0.01)

    def test_cream_edge_is_one_curve_without_a_kink(self):
        """fix round 7: beyond the mouth corner the edge carries on the smile's slope and eases off it; no step in the slope over 0.4 anywhere on a side."""
        H = self.H
        for sgn in (1, -1):
            ys = sgn * np.linspace(0.0, 0.7, 281)
            q = np.stack([np.zeros_like(ys), ys, np.zeros_like(ys)], -1)
            z = PT.cream_edge_z(H, q)
            slope = np.diff(z) / np.diff(ys)
            self.assertLess(np.abs(np.diff(slope)).max(), 0.4)


if __name__ == "__main__":
    unittest.main()
