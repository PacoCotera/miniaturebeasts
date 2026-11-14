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


class TStretch(unittest.TestCase):
    """UV stretch (sigma_max / sigma_min of the 3D -> UV map) on the belly patch and the face only: the coat's two areas the eye reads. (The all-islands p95 of test_s20_skin stays reported there; the toe and the thin tail islands carry it.)"""
    @classmethod
    def setUpClass(cls):
        cls.items = [IN.make(i) for i in (1, 2, 8)]

    def stretch_of(self, b, sel_fn):
        Vf, Ff, attr, fp, cr, mir = b.full()
        V1, F1, _, attr1, fp1 = SD.subdivide(Vf, Ff, cr, attr, fp, levels=TX.SHIP_LEVEL)
        F1 = np.array(F1, int)
        uv, isl = TX.face_uv(b, V1, F1, np.asarray(fp1).astype(int), attr1)
        P = V1[F1]; cen = P.mean(1)
        m = (isl == "torso") & (cen[:, 1] > 0) & sel_fn(cen)
        e3 = np.stack([P[:, 1] - P[:, 0], P[:, 3] - P[:, 0]], 1)
        eu = np.stack([uv[:, 1] - uv[:, 0], uv[:, 3] - uv[:, 0]], 1)
        out = []
        for i in np.where(m)[0]:
            A, B = e3[i], eu[i]
            Mx = B.T @ np.linalg.pinv(A.T)
            sv = np.linalg.svd(Mx, compute_uv=False)
            if sv[1] > 1e-9:
                out.append(sv[0] / sv[1])
        return np.array(out)

    def test_belly_and_face_stretch(self):
        for c, b, R in self.items:
            belly = self.stretch_of(b, lambda cen: (cen[:, 0] > 0.15) & (np.abs(cen[:, 1]) < 0.26) & (cen[:, 2] > 0.30) & (cen[:, 2] < 0.9))
            face = self.stretch_of(b, lambda cen: (cen[:, 0] > 0.25) & (cen[:, 2] > 1.35) & (cen[:, 2] < 2.0))
            print("belly stretch median %.2f p95 %.2f (%d faces); face median %.2f p95 %.2f (%d faces)" % (np.median(belly), np.percentile(belly, 95), len(belly), np.median(face), np.percentile(face, 95), len(face)))
            self.assertGreater(len(belly), 6); self.assertGreater(len(face), 10)
            self.assertLessEqual(float(np.percentile(belly, 95)), 2.0)
            self.assertLessEqual(float(np.percentile(face, 95)), 2.0)
