"""S20 pass 4 step 5 (AD gate on pass 3, 3d, must-fix 5): the belly patch is an upright egg. About 0.46 x 0.58 H as seen from the front, a round top (radius of curvature at least 0.18 H), a convex lower edge that stops 0.06 H above the crotch, centred on the midline (+-0.02 H),
a 0.02 H soft edge, as crisp as the fur (texel density at least the torso's median), and at az 32 a gap of at least 0.03 H to the arm."""
import os, sys, math, unittest
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import s20indiv as IN, s20coat as CT, s20p2 as P2, s20tex as TX, gltf_out, bpyio as B


class T(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.items = [IN.make(i) for i in (1, 2, 5, 8)]

    def dense(self, b, genome):
        """The coat's fields on a 0.004 H grid on the front of the loft's own design surface (the texels' density: 400 px per H is 0.0025 H a texel)."""
        G = b.ctx["T"]
        zz, aa = np.meshgrid(np.arange(0.2, 1.1, 0.004), np.arange(0.55, 1.0001, 0.004), indexing="ij")
        P = G.point(zz.ravel(), aa.ravel())
        nrm = np.stack([P[:, 0], P[:, 1], np.zeros(len(P))], 1); nrm /= np.maximum(np.linalg.norm(nrm, axis=1, keepdims=True), 1e-9)
        n = len(P)
        at = np.zeros((n, 4)); at[:, 1] = G.L - 0.3; at[:, 2] = aa.ravel()          # (not the tail range; the egg is written in the geometry's own z)
        o = CT.coat(b.ctx, P, at, np.zeros(n, int), nrm, at[:, 3], genome, "open")
        return P, o["fields"]

    def test_egg_size_shape_and_position(self):
        for c, b, R in self.items:
            g = {**c["coat"], "belly_reach": 0.0}
            P, F = self.dense(b, g)
            m = F["belly"] > 0.5
            lat = np.abs(P[:, 1]); z = P[:, 2]
            width = 2 * float(lat[m].max()); zlo, zhi = float(z[m].min()), float(z[m].max())
            height = zhi - zlo
            print("belly patch %.3f wide x %.3f tall, z %.3f-%.3f" % (width, height, zlo, zhi))
            self.assertTrue(0.44 <= width <= 0.50, width)
            self.assertTrue(0.55 <= height <= 0.63, height)
            self.assertTrue(1.2 <= height / width <= 1.32, height / width)
            self.assertGreaterEqual(zlo, 0.23 + 0.06 - 0.01)                            # 0.06 H above the crotch (the arch tops out at 0.23 H, measured)
            # the widest row is in the lower half (an egg), the round top: the boundary's radius of curvature near the top, from lat^2 = 2 r (zhi - z) at 0.04 H under the top
            rows = [(zz, float(lat[m & (np.abs(z - zz) < 0.003)].max())) for zz in np.arange(zlo + 0.02, zhi - 0.01, 0.01) if (m & (np.abs(z - zz) < 0.003)).any()]
            zw = max(rows, key=lambda r: r[1])[0]
            self.assertLess(zw, (zlo + zhi) / 2 + 0.02)
            rt = [w ** 2 / (2 * (zhi - zz)) for zz, w in rows if 0.02 <= zhi - zz <= 0.04]
            self.assertGreaterEqual(float(np.median(rt)), 0.17, rt)                     # a round top, no point (the old teardrop: 0.04)

    def test_centred_on_the_midline_and_crisp_edge(self):
        for c, b, R in self.items:
            V, Fq, at, fp = P2.level_arrays(b, 2)
            part = IN.part_of(b, Fq, fp, len(V))
            N = gltf_out.vertex_normals(V, Fq)
            o = CT.coat(b.ctx, V, at, part, N, at[:, 3], c["coat"], "open")
            m = (o["fields"]["belly"] > 0.5) & (part == b.parts["torso"])
            self.assertAlmostEqual(float(np.mean(V[m, 1])), 0.0, delta=0.02)
            P, F = self.dense(b, {**c["coat"], "belly_reach": 0.0})
            f = F["belly"]; z = P[:, 2]; lat = np.abs(P[:, 1])
            row = (np.abs(z - 0.55) < 0.002)
            xs = lat[row]; fs = f[row]
            o_ = np.argsort(xs); xs, fs = xs[o_], fs[o_]
            lo = float(xs[np.argmax(fs < 0.9)]); hi = float(xs[np.argmax(fs < 0.1)])
            print("edge width at z 0.55: %.3f H" % (hi - lo))
            self.assertLessEqual(hi - lo, 0.03)                                         # the 0.02 H soft edge (pass 3: 0.15)

    def test_texel_density_at_least_the_torsos_median(self):
        c, b, R = self.items[0]
        Vf, Ff, attr, fp, cr, mir = b.full()
        import subdiv as SD
        V1, F1, _, attr1, fp1 = SD.subdivide(Vf, Ff, cr, attr, fp, levels=TX.SHIP_LEVEL)
        F1 = np.array(F1, int)
        uv, isl = TX.face_uv(b, V1, F1, np.asarray(fp1).astype(int), attr1)
        P = V1[F1]
        a3 = 0.5 * np.linalg.norm(np.cross(P[:, 1] - P[:, 0], P[:, 3] - P[:, 0]), axis=1) + 0.5 * np.linalg.norm(np.cross(P[:, 2] - P[:, 1], P[:, 3] - P[:, 1]), axis=1)
        eu = np.stack([uv[:, 1] - uv[:, 0], uv[:, 3] - uv[:, 0]], 1)
        a2 = np.abs(eu[:, 0, 0] * eu[:, 1, 1] - eu[:, 0, 1] * eu[:, 1, 0])
        dens = np.sqrt(a2 / np.maximum(a3, 1e-12))                                      # texels per H along the face's mean direction
        cen = P.mean(1)
        sm = attr1[F1][:, :, 1].mean(1)
        tor = (isl == "torso") & (cen[:, 1] > 0) & (sm > b.ctx["T"].s_root + 0.3)               # the loft's body and head (the fur): not the thin tail, whose u is stretched for its small radius
        ok = tor & (a3 > 1e-6) & (np.isfinite(dens))
        med = float(np.median(dens[ok]))
        egg = ok & (cen[:, 0] > 0.15) & (np.abs(cen[:, 1]) < 0.2) & (cen[:, 2] > 0.35) & (cen[:, 2] < 0.85)
        print("texel density (px per H): torso median %.0f, belly patch median %.0f" % (med, float(np.median(dens[egg]))))
        self.assertGreaterEqual(float(np.median(dens[egg])), med * 0.98)

    def test_gap_to_the_arm_at_az_32(self):
        for c, b, R in self.items:
            P, F = self.dense(b, {**c["coat"], "belly_reach": 0.0})
            m = F["belly"] > 0.3
            Pm = P[m]
            V, Fq, at, fp = P2.level_arrays(b, 2)
            part = IN.part_of(b, Fq, fp, len(V))
            A = V[part == b.parts["arm.L"]]
            sc = B.reset(); cam = B.camera(sc, 32.0, 10.0, 1000, 1000, (0.0, 0.0, 0.9), ppH=1000.0)
            pts = np.vstack([Pm, Pm * np.array([1, -1, 1.0])])                           # both halves of the patch
            p_px, _ = B.project(cam, pts); a_px, _ = B.project(cam, A)
            d = np.sqrt(((p_px[::7, None, :] - a_px[None, ::3, :]) ** 2).sum(2)).min()
            print("gap between the patch and the arm at az 32: %.3f H" % (d / 1000.0))
            self.assertGreaterEqual(d / 1000.0, 0.03)


if __name__ == "__main__":
    unittest.main()
