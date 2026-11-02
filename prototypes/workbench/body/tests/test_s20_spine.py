"""S20: ONE spine, ONE loft (owner ruling, 1 Nov). The tail is not a part, not a tube and not on a socket: it is the first named arc-length range of the one loft that runs from the lantern stalk through the seat, back, neck and head to the crown. Tests: no tail part, no tail tube, no mirror socket at the tail;
the named ranges label the one path; the path's tangent is continuous from the crown to the stalk; the radius falls monotonically from the seat to the stalk; no line, ridge or rim (every adjacent-normal dot above 0.5 in the neck, back, seat and tail ranges, and a stricter one across the seat-to-tail seam);
the girth genes reshape the taper profile; the tail genes edit only the far range of the same path and profile."""
import os, sys, json, unittest
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import s20build, s20genes, mquality as Q, subdiv as SD, schema as SC, paths as PA

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = json.load(open(os.path.join(os.path.dirname(HERE), "species", "S20.json")))


def build(g=None):
    spec, _ = SC.load(raw=s20genes.apply_shape(RAW, g or {}))
    return s20build.make_s20(spec, upto="base")


def region_dot(b, lo, hi, V2=None, F2=None, a2=None, fp2=None):
    """Smallest adjacent-normal dot (level 2) over the loft's faces whose arc length from the stalk s is in [lo, hi]."""
    if V2 is None:
        Vf, Ff, at, fpp, cr, mir = b.full()
        V2, F2, _, a2, fp2 = SD.subdivide(Vf, Ff, cr, at, fpp, levels=2)
    F2 = np.array(F2)
    n = np.cross(V2[F2[:, 2]] - V2[F2[:, 0]], V2[F2[:, 3]] - V2[F2[:, 1]])
    n /= np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-300)
    sm = a2[F2][:, :, 1].mean(1)
    ok = (fp2 == b.parts["torso"]) & (sm >= lo) & (sm <= hi)
    md, where = 1.0, None
    for e, fs in Q.edge_faces(F2).items():
        if len(fs) == 2 and ok[fs[0]] and ok[fs[1]]:
            d = float(n[fs[0]] @ n[fs[1]])
            if d < md:
                md, where = d, V2[list(e)].mean(0).round(2)
    return md, where


class T(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.b = build()
        cls.G = cls.b.ctx["T"]
        cls.info = cls.b.ctx["info"]["torso"]

    def test_no_tail_part_no_tail_tube_no_tail_socket(self):
        self.assertNotIn("tail", self.b.parts)
        self.assertNotIn("tail", self.b.ctx["info"]["tubes"])
        self.assertNotIn("tail", self.b.ctx["spec"]["sockets"])
        self.assertEqual(self.b.ctx["spec"]["parts"]["tail"]["kind"], "spine-range")
        self.assertFalse(any(k.startswith("tail") and k != "tail.tip" for k in self.b.parts))        # only the lantern bulb is an appendage

    def test_ranges_are_labels_on_the_one_path(self):
        rs = self.G.ranges
        self.assertEqual(list(rs), ["head", "neck", "back", "seat", "tail"])
        edges = [rs[k] for k in rs]
        self.assertTrue(all(edges[i][1] == edges[i + 1][0] for i in range(len(edges) - 1)))
        lab = self.G.label_of(self.info["ring_s"])
        self.assertEqual(lab[0], "tail"); self.assertEqual(lab[-1], "head")
        order = [list(rs).index(x) for x in lab[::-1]]
        self.assertEqual(order, sorted(order))                      # head to tail along the arc length, never back

    def test_one_ring_sequence_cage_loft(self):
        rings = self.info["rings"]
        self.assertTrue(all(len(r) == 9 for r in rings))
        faces = self.info["faces"]
        self.assertEqual(len(faces), (len(rings) - 1) * 8)           # every ring joined to the next, no socket and no half loop anywhere on the spine
        self.assertEqual(sorted(self.info["caps"]), ["crown", "tip"])

    def test_tangent_continuous_from_crown_to_stalk(self):
        pa = self.G.pa
        T = pa.T
        ang = np.degrees(np.arccos(np.clip((T[1:] * T[:-1]).sum(1), -1, 1)))
        print("largest turn between dense path samples (deg)", round(float(ang.max()), 2))
        self.assertLess(ang.max(), 6.0)
        # and the curvature has no jump larger than the room rule allows: the bend through the seat is one circular arc tangent to the vertical run
        self.assertAlmostEqual(float(abs(T[-1] @ np.array([0, 0, 1.0]))), 1.0, 6)
        # the path leans back from the waist through the seat in two gentle bends: no turn between rings (0.1 H apart) beyond 30 degrees
        ring_T = np.array([r["T"] for r in self.info["ring_info"]])
        turn = np.degrees(np.arccos(np.clip((ring_T[1:] * ring_T[:-1]).sum(1), -1, 1)))
        print("largest turn between adjacent rings (deg)", round(float(turn.max()), 1))
        self.assertLess(turn.max(), 30.0)

    def test_radius_non_increasing_from_the_seat_to_the_stalk(self):
        """The tail's design radius (a monotone cubic through the joints' radii) never rises toward the stalk; the measured surface, its distance from the path binned along the arc, never grows either."""
        G = self.G
        s = np.linspace(0.0, G.s_root, 60)
        r = G.tail_radius(s)
        self.assertTrue(np.all(np.diff(r) >= -1e-9))                  # stalk (s = 0) to root: non-decreasing, i.e. non-increasing from root to stalk
        Vf, Ff, at, fpp, cr, mir = self.b.full()
        V2, F2, _, a2, fp2 = SD.subdivide(Vf, Ff, cr, at, fpp, levels=2)
        sel = (fp2[np.minimum(np.arange(len(V2)), len(fp2) - 1)] >= 0)
        sv = a2[:, 1]
        tor = np.rint(a2[:, 0]).astype(int) == self.b.parts["torso"]
        m = tor & (sv > 0.12) & (sv < G.s_root + 0.25)
        pt, T, N, B = G.pa.at(sv[m])
        d = np.linalg.norm(V2[m] - pt, axis=1)
        bins = np.linspace(0.12, G.s_root + 0.25, 11)
        prof = [float(np.median(d[(sv[m] >= lo) & (sv[m] < hi)])) for lo, hi in zip(bins, bins[1:])]
        print("surface radius by arc from the stalk", [round(x, 3) for x in prof])
        self.assertTrue(all(prof[k + 1] >= prof[k] * 0.97 for k in range(len(prof) - 1)))      # from the stalk toward the seat the radius only grows

    def test_no_line_ridge_or_rim_between_the_seat_and_the_stalk(self):
        Vf, Ff, at, fpp, cr, mir = self.b.full()
        V2, F2, _, a2, fp2 = SD.subdivide(Vf, Ff, cr, at, fpp, levels=2)
        G = self.G
        for nm, (lo_u, hi_u) in G.ranges.items():
            if nm in ("head",):
                continue
            lo, hi = G.L - min(hi_u, G.L), G.L - lo_u
            md, where = region_dot(self.b, lo, hi, V2, F2, a2, fp2)
            print("range", nm, "min dot", round(md, 3), where)
            self.assertGreater(md, 0.5, (nm, where))
        # the seat-to-tail seam itself: the stricter bar
        seam = G.s_root
        md, where = region_dot(self.b, seam - 0.5, seam + 0.5, V2, F2, a2, fp2)
        print("seat to tail seam min dot", round(md, 3), where)
        self.assertGreater(md, 0.8, where)

    def test_tail_genes_edit_only_the_far_range_of_the_same_path(self):
        base = s20genes.apply_shape(RAW, {})
        g = s20genes.apply_shape(RAW, dict(curl=0.15, tailLen=1.3, tailGirth=1.2))
        self.assertEqual(base["parts"]["torso"]["spine"], g["parts"]["torso"]["spine"])           # the body's side of the one path is untouched
        self.assertEqual(base["parts"]["torso"]["section"], g["parts"]["torso"]["section"])
        self.assertEqual(base["parts"]["tail"]["joints"][0]["at"], g["parts"]["tail"]["joints"][0]["at"])      # the root stays
        self.assertNotEqual(base["parts"]["tail"]["joints"][3]["pitch"], g["parts"]["tail"]["joints"][3]["pitch"])

    def test_girth_genes_reshape_the_taper_profile(self):
        base = s20genes.apply_shape(RAW, {})["parts"]["tail"]["joints"]
        fat = s20genes.apply_shape(RAW, dict(tailGirth=1.3))["parts"]["tail"]["joints"]
        ratio = [f["r"][0] / b_["r"][0] for f, b_ in zip(fat, base)]
        self.assertAlmostEqual(ratio[0], 1.105, 6)
        self.assertAlmostEqual(ratio[-1], 1.3, 6)
        self.assertTrue(all(ratio[k + 1] >= ratio[k] - 1e-9 for k in range(len(ratio) - 1)))

    def test_seam_stays_smooth_across_the_genes(self):
        for g in (dict(tailGirth=1.3), dict(tailGirth=0.8), dict(tailLen=1.6, curl=0.2), dict(tailLen=0.7, tailGirth=1.2), dict(curl=-0.1, lift=15)):
            b = build(g)
            md, where = region_dot(b, b.ctx["T"].s_root - 0.5, b.ctx["T"].s_root + 0.5)
            print("seam min dot", g, round(md, 3))
            self.assertGreater(md, 0.7, (g, where))

    def test_tail_range_outside_the_face_cone(self):
        K = np.array([0.0, 0.0, 1.68])
        Vf, Ff, at, fpp, cr, mir = self.b.full()
        tor = np.rint(at[:, 0]).astype(int) == self.b.parts["torso"]
        sel = tor & (at[:, 1] < self.G.s_root)
        P = Vf[sel] - K
        ang = np.degrees(np.arccos(np.clip(P[:, 0] / np.linalg.norm(P, axis=1), -1, 1)))
        self.assertTrue((ang > 35).all(), ang.min())


if __name__ == "__main__":
    unittest.main()
