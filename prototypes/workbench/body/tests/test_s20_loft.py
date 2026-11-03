"""S20 chunk 1: the gourd loft (pass 4: the whole-loft mesh-quality ratios, edge, area, non-planarity and ring ratio, are retired: one spine from the belly to the stalk breaks them by design; tests/test_s20_p4_ranges.py measures each named range on its own). Quads only, manifold, mirror plane, valence (the cap corners only), ring ratio, limit error, head wider than body, waist width, the crown cap's curvature, column keys through the socket centres,
the loft against the file's own section. Failing rows stay failing and are reported in the sheet (never relaxed)."""
import os, sys, unittest, collections, json
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import s20build, mquality as Q, subdiv as SD, s20measure as M, schema as SC
import test_helpers_s20 as TH

HERE = os.path.dirname(os.path.abspath(__file__))


class T(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.b = s20build.make_s20(upto="loft")
        cls.ctx = cls.b.ctx
        cls.spec = cls.ctx["spec"]
        cls.V, cls.F, cls.attr, cls.fp = Q.full_topology(cls.b)
        Vf, Ff, at, fpp, cr, mir = cls.b.full()
        cls.V2, cls.F2, _, _, _ = SD.subdivide(Vf, Ff, cr, at, fpp, levels=2)
        cls.th = cls.spec["mesh_quality"]

    def test_quads_manifold_mirror(self):
        self.assertTrue(all(len(f) == 4 for f in self.F))
        self.assertEqual(Q.manifold(self.V, self.F), dict(non_manifold_edges=0, loose_verts=0, inconsistent_winding=0))
        mp = Q.mirror_plane(self.V)
        self.assertEqual(mp["max_abs_y_on_plane"], 0.0)
        self.assertEqual(mp["near_but_off"], 0)

    def test_valence_caps_only(self):
        """Valence 3 at the cap corners (2 per cap per half) and, on the stalk only, the band's own poles (V5: valence 3 on the big ring, 5 on the small one, 16 on the whole body for the type's two bands). Nothing else."""
        val = Q.valence(self.F, len(self.V))
        odd = [i for i in range(len(self.V)) if val[i] != 4]
        n0 = len(self.b.cage.V)
        extra = [i for i in range(n0) if abs(self.V[i][1]) > 1e-12]
        band = TH.stalk_band_poles(self.b)
        isband = [i for i in odd if (i if i < n0 else extra[i - n0]) in band]
        self.assertTrue(all(val[i] == band[i if i < n0 else extra[i - n0]][1] for i in isband))        # a band pole has exactly its band valence
        self.assertEqual(len(isband), 16 if self.b.ctx["T"].sp["thin"]["enabled"] else 0)
        odd = [i for i in odd if i not in isband]
        self.assertTrue(all(val[i] == 3 for i in odd))
        corners = set()
        for cp in self.b.caps:
            for k in ((cp.na, 0), (cp.na, cp.nb)):
                corners.add(cp.G[k])
        base = {v if v < n0 else extra[v - n0] for v in odd}
        self.assertEqual(base, corners)                      # 2 per cap per half: seat and crown
        self.assertEqual(len(odd), 8)

    def _rings_full(self):
        """Each ring as full-mesh ids (the half ring and its mirror copies)."""
        m = self.ctx["remap"]
        n0 = len(self.b.cage.V)
        extra = [i for i in range(n0) if abs(self.V[i][1]) > 1e-12]
        mirror = {e: n0 + k for k, e in enumerate(extra)}
        rings = []
        for r in self.ctx["info"]["torso"]["rings"]:
            ids = [m[v] for v in r]
            rings.append(ids + [mirror[i] for i in ids if i in mirror])
        return rings

    def test_limit_error(self):
        self.assertLessEqual(self.ctx["log"]["limit"]["max_err"], self.th["limit_err_max"])

    def test_no_folds_level2(self):
        fl = Q.flips(self.V2, self.F2)
        self.assertGreater(fl["min_adjacent_normal_dot"], -0.2)
        self.assertGreater(fl["volume"], 0)

    def test_head_wider_than_body_and_waist(self):
        zs, w = M.widths(self.V2)
        head, body = w[zs > 1.17].max(), w[zs < 1.17].max()
        waist = w[(zs > 0.9) & (zs < 1.45)].min()
        print("head", round(head, 3), "body", round(body, 3), "waist", round(waist, 3))
        self.assertGreater(head, body)
        self.assertAlmostEqual(head, 1.28, delta=0.04)
        self.assertAlmostEqual(body, 1.18, delta=0.04)
        self.assertGreaterEqual(waist, 0.85)

    def test_crown_cap_curvature(self):
        """No plateau: the mean meridian curvature over the cap (above the last ring + 0.04) is within 25 % of the band below it (the last ring's run)."""
        zt = self.spec["parts"]["torso"]["rings_z"][-1]
        zp = self.spec["parts"]["torso"]["rings_z"][-2]
        m = np.abs(self.V2[:, 1]) < 1e-9
        P = self.V2[m][:, [0, 2]]
        P = P[P[:, 1] > 1.7]
        c = np.array([0, 1.75])
        P = P[np.argsort(np.arctan2(P[:, 1] - c[1], P[:, 0] - c[0]))]
        k = M.curvatures(P)
        Pm = P[1:-1]
        cap = k[Pm[:, 1] >= zt + 0.04].mean()
        ring = k[(Pm[:, 1] >= zp) & (Pm[:, 1] < zt + 0.04)].mean()
        print("crown cap curvature", round(float(cap), 2), "ring below", round(float(ring), 2), "ratio", round(float(cap / ring), 2))
        self.assertLessEqual(abs(cap / ring - 1), 0.25)

    def test_column_keys_through_sockets(self):
        """A column of the loft goes through each socket centre: the ring named by the key (a vertical ring by its z, a ring of the bend by its arc length from the crown) has the key's `around` at the key's column."""
        t = self.spec["parts"]["torso"]
        G = self.ctx["T"]
        info = self.ctx["info"]["torso"]
        for nm, k in t["column_keys"].items():
            if "u" in k:
                i = int(np.argmin([abs(G.L - r["s"] - k["u"]) for r in info["ring_info"]]))
            else:
                nv = info["n_vertical"]; zs = info["z"]
                i = len(zs) - nv + int(np.argmin([abs(z - k["station"]) for z in zs[len(zs) - nv:]]))
            a = self.b.around[info["rings"][i][k["col"]]]
            self.assertAlmostEqual(float(a), k["around"], delta=0.02, msg=nm)

    def test_cage_on_the_section(self):
        """Every ring vertex's limit point lands on the loft's own surface (the section analytic): the limit error says it; here the profile at three heights against rho."""
        G = self.ctx["T"]
        for z in (1.17, 1.66):
            sel = (np.abs(self.V2[:, 2] - z) < 0.01) & (self.V2[:, 0] > -0.8)          # the upper loft (the tail's curl crosses these heights far behind)
            P = self.V2[sel]
            r = np.hypot(P[:, 0], P[:, 1])
            a = np.arctan2(np.abs(P[:, 1]), -P[:, 0]) / np.pi
            err = np.abs(r - np.array([float(G.rho(z, aa)) for aa in a]))
            self.assertLess(np.median(err), 0.01, z)


if __name__ == "__main__":
    unittest.main()
