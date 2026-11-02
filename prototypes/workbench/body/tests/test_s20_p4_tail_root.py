"""S20 pass 4 step 7 (AD gate on pass 3, mesh quality 2): the tail root from behind is a soft mound with a concave fillet into the seat, not a peg. The root widens SIDEWAYS only (spine.root_flare), so from the side the monotone taper holds: root width at the seat at least 1.8 x the mid-stalk width, a concave fillet of radius at least 0.06 H in the plan contour, no step in it."""
import os, sys, unittest
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import s20indiv as IN, s20p4 as P4, s20p2 as P2


class T(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.items = [IN.make(i) for i in (1, 4, 8, 12)]

    def widths(self, b):
        info = b.ctx["info"]["torso"]; m = b.ctx["remap"]; Vc = np.array(b.cage.V, float)
        return np.array([(ri["s"], 2 * float(np.abs(Vc[[m[v] for v in ring if v in m]][:, 1]).max()), float(np.ptp(Vc[[m[v] for v in ring if v in m]][:, 2]))) for ring, ri in zip(info["rings"], info["ring_info"])])

    def test_root_width_at_the_seat_and_a_monotone_widening(self):
        for c, b, R in self.items:
            w = self.widths(b)
            stalk = float(w[(w[:, 0] >= 0.35) & (w[:, 0] <= 0.5)][:, 1].max())
            seat = float(np.interp(b.ctx["T"].s_root - 0.235, w[:, 0], w[:, 1]))            # the ring where the tail leaves the seat, 0.235 H of arc before the root joint (the loft then flares into the body)
            print("lateral width: mid-stalk %.3f, at the seat %.3f, ratio %.2f" % (stalk, seat, seat / stalk))
            self.assertGreaterEqual(seat / stalk, 1.8)
            tail = w[(w[:, 0] >= 0.4) & (w[:, 0] <= b.ctx["T"].s_root)]
            self.assertTrue(np.all(np.diff(tail[:, 1]) >= -0.003), tail[:, 1])             # the widening is a fillet into the body: from the stalk to the seat the width only grows

    def test_concave_fillet_radius_and_no_peg_step_in_the_plan_contour(self):
        for c, b, R in self.items[:2]:
            V, F, at, fp = P2.level_arrays(b, 2)
            band = (V[:, 2] > 0.55) & (V[:, 2] < 0.95)
            xs = np.arange(-1.0, -0.25, 0.02)
            yw = np.array([np.abs(V[band & (np.abs(V[:, 0] - x) < 0.015)][:, 1]).max() if (band & (np.abs(V[:, 0] - x) < 0.015)).any() else np.nan for x in xs])
            ok = ~np.isnan(yw); x, y = xs[ok], yw[ok]
            sel = x > -0.92
            ys = np.convolve(y, np.ones(3) / 3, mode="same")
            d1 = np.gradient(ys, x); d2 = np.gradient(d1, x)
            rad = np.where(d2 > 0.3, (1 + d1 ** 2) ** 1.5 / np.maximum(d2, 1e-9), np.inf)
            r_min = float(np.min(rad[2:-2][sel[2:-2]]))
            step = float(np.abs(np.diff(y[sel])).max())
            print("plan contour: smallest concave radius %.3f H, largest step per 0.02 H %.3f" % (r_min, step))
            self.assertGreaterEqual(r_min, 0.06)
            self.assertLess(step, 0.05)                                                     # no peg end: the contour has no step where the tail meets the seat


if __name__ == "__main__":
    unittest.main()
