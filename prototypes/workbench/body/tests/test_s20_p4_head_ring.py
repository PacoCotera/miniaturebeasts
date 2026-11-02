"""S20 pass 4 step 4 (AD gate on pass 3, mesh quality 1): no band of flattened curvature round the head at the eye line, and no abrupt normals on the head.
Cause (headshape.py): the lower half of the head ball was a superellipse of exponent 2.4 (flat sides about the equator) and the upper half the base table, which left the equator at a slope: a kink at z 1.68 in the profile. Both halves are now ellipses about one equator."""
import os, sys, unittest
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import s20indiv as IN, s20p4 as P4, s20p2 as P2, s20normals as NM


class T(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.items = [IN.make(i) for i in (1, 2, 6, 11)]

    def test_the_section_table_has_no_kink_at_the_equator(self):
        st = self.items[0][1].ctx["spec"]["parts"]["torso"]["section"]["stations"]
        z = np.array([a for a, _ in st]); r = np.array([b[1] for _, b in st])
        k = -(r[2:] - 2 * r[1:-1] + r[:-2]) / ((z[2:] - z[1:-1]) * (z[1:-1] - z[:-2]))
        sel = (z[1:-1] >= 1.5) & (z[1:-1] <= 1.9)
        self.assertGreater(float(k[sel].min()), 1.0, k[sel])                         # concave all through the head ball (it was +6.6 / -10.6 across the old kink)
        self.assertLess(float(np.abs(np.diff(k[sel])).max()), 1.2)                   # and no jump in the curvature from one station to the next

    def test_the_curvature_of_the_head_profile_has_no_flat_band(self):
        for c, b, R in self.items:
            zs, k = P4.head_curvature(b)
            ratio = float(k.min() / np.median(k))
            print("head profile curvature min / median", round(ratio, 2), "min", round(float(k.min()), 2))
            self.assertGreaterEqual(ratio, 0.6)                                      # the pass 3 head: 0.43, a flat band at the eye line and a second one near the brow

    def test_no_abrupt_normals_on_the_head(self):
        for c, b, R in self.items:
            V, F, at, fp = P2.level_arrays(b, 2)
            part = IN.part_of(b, F, fp, len(V))
            m = NM.measure(V, F, at[:, 3])
            E = m["E"]
            zone = (part[E[:, 0]] == b.parts["torso"]) & (part[E[:, 1]] == b.parts["torso"]) & (V[E[:, 0], 2] > 1.30) & (V[E[:, 1], 2] > 1.30) & ~m["crease"]
            face_bad = int((m["ang"][zone] > NM.FACE_MAX).sum())
            g = zone & (m["len"] >= 0.01)                                            # (the micro-edges below 0.01 H have noise-limited vertex normals)
            grad_bad = int((m["grad"][g] > NM.GRAD_MAX).sum())
            print("head edges", int(zone.sum()), "face angle max", round(float(m["ang"][zone].max()), 1), "bad", face_bad, "; gradient bad", grad_bad)
            self.assertEqual(face_bad, 0)
            self.assertEqual(grad_bad, 0)


if __name__ == "__main__":
    unittest.main()
