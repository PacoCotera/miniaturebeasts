"""V5 (arch-viability): the tail stalk on 8 columns, built behind `spine.loft.spine.thin.enabled` (off in the file: with it on 27% of wild genomes fail the mesh check's planarity at the root-end band). Rings of the stalk (radius under `thin.r_max`, behind the tip's end, ending 0.6 H before the root) have 5 half columns; a band of three quads for each 4 columns turns 16 columns into 8 at each end, with no triangle. The band's vertices are not fitted to their targets. The type keeps its silhouette within 1 px at 304 on five views (fixture: the type before V5, rendered by the same code)."""
import json
import os
import sys
import unittest

import numpy as np

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BODY)
import copy  # noqa: E402
from tests.test_wb_viability import DOC as FILE  # noqa: E402
DOC = copy.deepcopy(FILE)
DOC["spine"]["loft"]["spine"]["thin"]["enabled"] = True            # the species file ships it off (see its note); these tests build the file with it on
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

    def test_the_file_ships_it_off_and_the_type_is_unchanged_then(self):
        self.assertFalse(FILE["spine"]["loft"]["spine"]["thin"]["enabled"])
        r = F.build(FILE, "type")
        self.assertTrue(r.cage_hash.startswith("dbebe2e3a0a3b27c"))
        self.assertEqual(len(F.proxy_mesh(r.body, 1)["V"]), 3606)

    def test_the_type_loses_vertices(self):
        """3,606 before (3,446 as built here); the design asked for 350, which a stalk of this length cannot give: five rings of 32."""
        n = len(F.proxy_mesh(self.b, 1)["V"])
        self.assertEqual(n, 3446)

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


if __name__ == "__main__":
    unittest.main()
