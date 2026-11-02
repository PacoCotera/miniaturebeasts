"""S20 pass 4 step 5 (belly patch crispness): the loft's UV is the true surface distance on the body (the belly was painted at 212 px per H against 400 because the rings are tilted planes of the spine), the seat and the tail are their own island, and every island lies inside the atlas and clear of every other."""
import os, sys, unittest
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import s20indiv as IN, s20tex as TX, subdiv as SD


class T(unittest.TestCase):
    def test_islands_inside_the_atlas_and_disjoint(self):
        for i in (1, 2, 5, 8, 12):
            c, b, R = IN.make(i)
            Vf, Ff, attr, fp, cr, mir = b.full()
            V1, F1, _, attr1, fp1 = SD.subdivide(Vf, Ff, cr, attr, fp, levels=TX.SHIP_LEVEL)
            F1 = np.array(F1, int)
            uv, isl = TX.face_uv(b, V1, F1, np.asarray(fp1).astype(int), attr1)
            names = sorted(set(isl))
            masks = {}
            for nm in names:
                q = uv[isl == nm]
                self.assertGreaterEqual(float(q.min()), 0.0, (i, nm, "outside the atlas"))
                self.assertLessEqual(float(q.max()), TX.SIZE, (i, nm, "outside the atlas"))
                face, tri, bary = TX.rasterize(q / 4.0, 512)
                masks[nm] = face >= 0
            for a in range(len(names)):
                for k in range(a + 1, len(names)):
                    ov = int((masks[names[a]] & masks[names[k]]).sum())
                    self.assertLessEqual(ov, 6, (i, names[a], names[k], ov))              # (a texel row or two of edge touching at 512 px)

    def test_torso_faces_are_not_folded_over_the_belly_and_head(self):
        c, b, R = IN.make(1)
        Vf, Ff, attr, fp, cr, mir = b.full()
        V1, F1, _, attr1, fp1 = SD.subdivide(Vf, Ff, cr, attr, fp, levels=TX.SHIP_LEVEL)
        F1 = np.array(F1, int)
        uv, isl = TX.face_uv(b, V1, F1, np.asarray(fp1).astype(int), attr1)
        e = np.stack([uv[:, 1] - uv[:, 0], uv[:, 3] - uv[:, 0]], 1)
        det = e[:, 0, 0] * e[:, 1, 1] - e[:, 0, 1] * e[:, 1, 0]
        cen = V1[F1].mean(1)
        m = (isl == "torso") & (cen[:, 1] > 0) & (cen[:, 0] > 0.0)                 # the front of the body: belly, chest, face
        self.assertEqual(int((np.sign(det[m]) != np.sign(np.median(det[m]))).sum()), 0)


if __name__ == "__main__":
    unittest.main()
