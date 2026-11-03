"""V5 (arch-viability): the tail stalk on 8 columns. Rings of the stalk (radius under `thin.r_max`, behind the tip's end, ending 0.6 H before the root) have 5 half columns; a band of three quads for each 4 columns turns 16 columns into 8 at each end, with no triangle. The band's vertices are not fitted to their targets. The type keeps its silhouette within 1 px at 304 on five views (fixture: the type before V5, rendered by the same code)."""
import json
import os
import sys
import unittest

import numpy as np

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BODY)
from tests.test_wb_viability import DOC  # noqa: E402
from wb import facade as F  # noqa: E402
import spine as SP  # noqa: E402
import mquality as Q  # noqa: E402


def dil(m):
    p = np.pad(m, 1)
    o = np.zeros_like(m)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            o |= p[1 + dy:1 + dy + m.shape[0], 1 + dx:1 + dx + m.shape[1]]
    return o


def surface_gap(A, B):
    """The largest distance from a vertex of mesh A to the surface of mesh B (each quad as two triangles, exact point to triangle distance)."""
    VB, FB = np.array(B["V"], float), np.array(B["F"], int)
    T = np.concatenate([FB[:, [0, 1, 2]], FB[:, [0, 2, 3]]])
    a, b, c = VB[T[:, 0]], VB[T[:, 1]], VB[T[:, 2]]
    cen = (a + b + c) / 3
    worst = 0.0
    for p in np.array(A["V"], float):
        near = np.where(np.linalg.norm(cen - p, axis=1) < 0.15)[0]
        if not len(near):
            return float("inf")
        a_, b_, c_ = a[near], b[near], c[near]
        ab, ac, ap = b_ - a_, c_ - a_, p - a_
        n = np.cross(ab, ac)
        n2 = np.maximum((n * n).sum(1), 1e-30)
        d = np.abs((ap * n).sum(1)) / np.sqrt(n2)                                     # to the plane
        u = (np.cross(ap, ac) * n).sum(1) / n2                                        # barycentric coordinates of the projection
        v = (np.cross(ab, ap) * n).sum(1) / n2
        inside = (u >= 0) & (v >= 0) & (u + v <= 1)
        best = np.where(inside, d, np.inf)
        for e0, e1 in ((a_, b_), (b_, c_), (c_, a_)):                                 # else the nearest point of an edge
            ed = e1 - e0
            t = np.clip(((p - e0) * ed).sum(1) / np.maximum((ed * ed).sum(1), 1e-30), 0, 1)
            best = np.minimum(best, np.linalg.norm(p - (e0 + t[:, None] * ed), axis=1))
        worst = max(worst, float(best.min()))
    return worst


class TestThinStalk(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.r = F.build(DOC, "type")
        cls.b = cls.r.body
        cls.G = cls.b.ctx["T"]
        cls.ss = np.array(cls.G.stations(cls.b.ctx["spec"]))
        cls.thin = SP.thin_rings(cls.G, cls.ss)
        cls.rings = cls.b.ctx["info"]["torso"]["rings"]

    def test_the_stalk_rings_have_five_half_columns_and_the_rest_nine(self):
        self.assertEqual([len(r) for r in self.rings], [5 if t else 9 for t in self.thin])
        self.assertGreaterEqual(sum(self.thin), 5)
        k = [i for i, t in enumerate(self.thin) if t]
        self.assertEqual(k, list(range(k[0], k[-1] + 1)))                    # one stalk, two bands

    def test_the_type_loses_vertices(self):
        """3,606 before (3,446 as built here); the design asked for 350, which a stalk of this length cannot give: five rings of 32."""
        n = len(F.proxy_mesh(self.b, 1)["V"])
        self.assertEqual(n, 3382)                                  # 3,446 until the cat ear of 3 Nov 2026

    def test_the_cage_has_no_triangle_and_irregular_vertices_only_in_the_bands(self):
        V, Fc, attr, fp, cr, mir = self.b.full()
        Fa = np.array(Fc, int)
        self.assertEqual(Fa.shape[1], 4)
        val = Q.valence(Fa, len(V))
        k = [i for i, t in enumerate(self.thin) if t]
        band = set()
        m = self.b.ctx["remap"]
        for i in (k[0] - 1, k[0], k[-1], k[-1] + 1):
            for v in self.rings[i]:
                band.add(int(m[v]))
                band.add(int(mir[m[v]]))
        torso = np.array(self.b.part) == self.b.parts["torso"]
        s_ = np.array(self.b.s)
        lo, hi = self.ss[k[0] - 1] - 1e-6, self.ss[k[-1] + 1] + 1e-6
        odd = [v for v in range(len(self.b.part)) if torso[v] and lo <= s_[v] <= hi and val[v] in (3, 5) and v not in band and int(mir[v]) not in band]
        self.assertEqual(odd, [])
        inside = [v for v in band if val[v] in (3, 5)]
        self.assertGreaterEqual(len(inside), 2 * 2 * 2)                    # A2 (3) and M1 (5) of each patch, two patches a side, two bands

    def test_the_band_vertices_are_not_targeted(self):
        k = [i for i, t in enumerate(self.thin) if t]
        for i in (k[0], k[-1]):
            m = self.b.ctx["remap"]
            self.assertTrue(all(self.b.target[m[v]] is None for v in self.rings[i]))

    def test_tail_checks_pass(self):
        from checks import run as crun
        from checks.ctx import Ctx
        summ = self.r.summary()
        mesh = F.proxy_mesh(self.b, 1)
        summ["vertices_l1"] = len(mesh["V"])
        rows = {x["id"]: x for x in crun("cage", Ctx(F.internal(DOC), self.b, summ, mesh, doc=DOC))}
        for c in ("tail.taper", "tail.size", "normals", "mesh", "verts"):
            self.assertEqual(rows[c]["state"], "pass", (c, rows[c]["measure"]))

    def test_the_silhouette_stays_within_one_pixel_at_304_on_five_views(self):
        import nview
        import gltf_out
        old = np.load(os.path.join(BODY, "tests", "fixtures", "wb_s20_type_silhouettes_v4.npz"))
        m = F.proxy_mesh(self.b, 1)
        V, Fc = m["V"], np.array(m["F"])
        vn = gltf_out.vertex_normals(V, Fc)
        for az in (0, 90, 45, 180, 135):
            img, _, _, _ = nview.render(V, Fc, vn, az, 8.0, (-0.2, 0.0, 1.15), 130.0, 320, 320)
            new = np.abs(img.astype(int) - np.array([236, 233, 226])).sum(2) > 6
            x = old[str(az)]
            self.assertEqual(int((x & ~dil(new)).sum()) + int((new & ~dil(x)).sum()), 0, az)


def _band_worst(item):
    """The worst nonplanarity of the band's quads of one genome, as the cage lists them (the mesh check reads the fourth vertex against the plane of the first three)."""
    name, settings = item
    from tests.test_wb_viability import individual
    b = F.build(DOC, individual(*settings)).body
    V, Fc = np.array(b.cage.V), np.array(b.cage.F)
    ids = [v for k, v in b.ctx["info"]["torso"]["faces"].items() if len(k) == 3 and k[1] == "band"]
    return name, max(Q.nonplanarity(V, [Fc[i]]) for i in ids)


class TestBandListing(unittest.TestCase):
    """V8: the middle quad of a 16 to 8 band is a dart (three vertices on the full ring, one on the stalk ring), and the mesh check measures the fourth listed vertex against the plane of the first three. The root band's dart used to start at the stalk vertex (up to 0.89 against the limit 0.6); it is listed from the full ring now, as the tip band lists it: the same cycle and winding (0.42 at most)."""

    def test_every_band_quad_as_listed_is_within_0p45_on_the_forty_fixed_genomes(self):
        import multiprocessing as mp
        from tests.test_wb_viability import cases
        with mp.get_context("fork").Pool(min(6, os.cpu_count() or 2)) as pool:
            res = dict(pool.map(_band_worst, [(n, s) for n, s in cases().items()], chunksize=2))
        self.assertEqual(len(res), 40)
        self.assertLessEqual(max(res.values()), 0.45, sorted(res.items(), key=lambda kv: -kv[1])[:3])

    def test_the_type_surface_is_within_0p001_of_the_first_build_of_the_stalk(self):
        """The first build listed the root dart from the stalk vertex (M1 A1 A2 A3), the same cycle as now (A3 M1 A1 A2). The limit fit and the relax read face order, so the cage moves a little; the type's L1 surface stays within 0.001 of V5 as first built."""
        new = F.proxy_mesh(F.build(DOC, "type").body, 1)
        orig = SP.band_faces

        def old_order(body, big, small, big_first):
            out = []
            for p in range(2):
                A = [big[4 * p + j] for j in range(5)]
                M = [small[2 * p + j] for j in range(3)]
                qs = ([(A[0], M[0], M[1], A[1]), (A[1], M[1], A[3], A[2]), (A[3], M[1], M[2], A[4])] if big_first
                      else [(M[0], A[0], A[1], M[1]), (M[1], A[1], A[2], A[3]), (M[1], A[3], A[4], M[2])])
                out += [body.face(*q, "torso") for q in qs]
            return out
        SP.band_faces = old_order
        try:
            old = F.proxy_mesh(F.build(DOC, "type").body, 1)
        finally:
            SP.band_faces = orig
        self.assertEqual(len(old["V"]), len(new["V"]))
        self.assertLess(max(surface_gap(new, old), surface_gap(old, new)), 0.001)


if __name__ == "__main__":
    unittest.main()
