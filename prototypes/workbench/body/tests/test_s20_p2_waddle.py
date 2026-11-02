"""S20 pass 2, AD item 3: no hip folds in the waddle. Zero edges with an adjacent-normal dot below -0.2 at every waddle key, for the type and for all twelve individuals (the level-2 posed mesh)."""
import os, sys, unittest
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import s20indiv as IN, s20p2 as P2, s20normals as NM, s20rig


class T(unittest.TestCase):
    def test_no_fold_below_minus_0p2_at_any_key_for_the_twelve(self):
        for i in range(1, 13):
            c, b, R = IN.make(i)
            V, F, at, fp2 = P2.level_arrays(b, 2)
            part = IN.part_of(b, F, fp2, len(V))
            W = R.weights(V, at, part)
            E, FA, FB = NM.edges(F)
            ok = FB >= 0
            res = []
            for ph in s20rig.WALK_KEYS:
                M, st = R.waddle_pose(ph)
                Vp = R.skin(V, W, M)
                fn = NM.face_normals(Vp, F)
                d = (fn[FA[ok]] * fn[FB[ok]]).sum(1)
                res.append((round(float(d.min()), 2), int((d < -0.2).sum())))
            print("individual", i, "waddle keys (min dot, folded edges)", res)
            self.assertEqual(sum(n for _, n in res), 0, (i, res))


if __name__ == "__main__":
    unittest.main()
