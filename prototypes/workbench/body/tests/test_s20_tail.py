"""S20 tail root (owner ruling, 1 Nov): the tail is the body continued, not a tube plugged into the rump. The root is the widest point and the radius falls steadily to a thin stalk under the lantern; no crease at the root (the dihedral between adjacent faces round the root stays within 60 degrees: min dot > 0.5); the girth genes scale the taper profile."""
import os, sys, json, unittest
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import s20build, s20genes, mquality as Q, subdiv as SD, schema as SC

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = json.load(open(os.path.join(os.path.dirname(HERE), "species", "S20.json")))


def build(g=None):
    spec, _ = SC.load(raw=s20genes.apply_shape(RAW, g or {}))
    return s20build.make_s20(spec, upto="base")


def root_dot(b, rad=0.45):
    """Smallest dot of adjacent face normals (level 2) over the edges within `rad` of the tail's first ring: the loft round the socket, the transition bands, the first rings."""
    Vf, Ff, at, fpp, cr, mir = b.full()
    V2, F2, _, a2, fp2 = SD.subdivide(Vf, Ff, cr, at, fpp, levels=2)
    F2 = np.array(F2)
    c = b.ctx["info"]["tubes"]["tail"]["ringinfo"][0]["centre"]
    n = np.cross(V2[F2[:, 2]] - V2[F2[:, 0]], V2[F2[:, 3]] - V2[F2[:, 1]])
    n /= np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-300)
    md = 1.0
    for e, fs in Q.edge_faces(F2).items():
        if len(fs) == 2 and np.linalg.norm(V2[list(e)].mean(0) - c) < rad:
            md = min(md, float(n[fs[0]] @ n[fs[1]]))
    return md, V2, a2


class T(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.b = build()

    def test_root_has_no_crease(self):
        md, _, _ = root_dot(self.b)
        print("tail root min dot", round(md, 3))
        self.assertGreater(md, 0.5)

    def test_root_has_no_crease_across_the_girth_and_length_genes(self):
        for g in (dict(tailGirth=1.3), dict(tailGirth=0.8), dict(tailLen=1.6, curl=0.2), dict(tailLen=0.7, tailGirth=1.2)):
            md, _, _ = root_dot(build(g))
            print("tail root min dot", g, round(md, 3))
            self.assertGreater(md, 0.5, g)

    def test_radius_non_increasing_from_root_to_stalk(self):
        for g in (dict(), dict(tailGirth=1.3), dict(tailGirth=0.8)):
            b = build(g)
            ri = b.ctx["info"]["tubes"]["tail"]["ringinfo"]
            r = [max(x["ra"], x["rf"]) for x in ri]
            self.assertTrue(all(r[k + 1] <= r[k] + 1e-9 for k in range(len(r) - 1)), (g, r))
            # and on the surface: the tail part's distance from its path, binned along the path, never grows
            pa = b.ctx["info"]["tubes"]["tail"]["path"]
            md, V2, a2 = root_dot(b)
            sel = (np.rint(a2[:, 0]).astype(int) == b.parts["tail"]) & (a2[:, 1] > ri[0]["s"]) & (a2[:, 1] < pa.length - 0.05)
            P, s = V2[sel], a2[sel, 1]
            pt, T, N, B = pa.at(s)
            d = np.linalg.norm(P - pt, axis=1)
            bins = np.linspace(ri[0]["s"], pa.length - 0.05, 9)
            prof = [float(np.median(d[(s >= lo) & (s < hi)])) for lo, hi in zip(bins, bins[1:])]
            print("surface radius by arc", g, [round(x, 3) for x in prof])
            self.assertTrue(all(prof[k + 1] <= prof[k] * 1.03 for k in range(len(prof) - 1)), (g, prof))

    def test_root_is_the_widest_and_the_stalk_is_thin(self):
        ri = self.b.ctx["info"]["tubes"]["tail"]["ringinfo"]
        self.assertGreaterEqual(ri[0]["ra"], 0.24)
        self.assertLessEqual(ri[-1]["ra"], 0.09)
        self.assertGreater(ri[0]["ra"] / ri[-1]["ra"], 2.5)

    def test_girth_genes_scale_the_taper_profile(self):
        base = s20genes.apply_shape(RAW, {})["parts"]["tail"]["joints"]
        fat = s20genes.apply_shape(RAW, dict(tailGirth=1.3))["parts"]["tail"]["joints"]
        ratio = [f["r"][0] / b_["r"][0] for f, b_ in zip(fat, base)]
        print("girth x1.3 per joint", [round(x, 3) for x in ratio])
        self.assertAlmostEqual(ratio[0], 1.105, 6)               # the root, fixed by the socket, takes 35 % of the change
        self.assertAlmostEqual(ratio[-1], 1.3, 6)               # the stalk all of it: a fat tail has a shallower taper
        self.assertTrue(all(ratio[k + 1] >= ratio[k] - 1e-9 for k in range(len(ratio) - 1)))


if __name__ == "__main__":
    unittest.main()
