"""Chunk 3: the whole bare base. Poles listed, manifold, mirror plane, limit error, eyes inside the head outline, head > chest, the AD's body numbers (belly, gap, hind column), no folds at level 2."""
import os, sys, unittest, collections, math
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import build, mquality as Q, subdiv as SD, views


def pole_kinds(b, V, F):
    ctx, m = b.ctx, b.ctx["remap"]
    n0 = len(b.cage.V)
    val = Q.valence(F, len(V))
    listed = {}
    for cp in b.caps:
        for k, v in cp.G.items():
            if k in ((cp.na, 0), (cp.na, cp.nb)):
                listed[v] = "cap-corner"
    for name, rec in ctx["info"]["limbs"].items():
        for v in rec["loop"]:
            listed[m[v]] = "socket"
        for k in range(0, 8, 2):
            listed[m[rec["rings"][-1][k]]] = "sole-corner"
        for v in rec["rings"][rec["foot_band_ring"]] + rec["rings"][rec["support_ring"]]:
            listed[m[v]] = "bead-corner"
    for bl in ctx["info"].get("beads", {}).values():
        for bd in bl:
            for v in bd["ins"]:
                listed[v] = "bead-base"
            for v in bd["top"]:
                listed[v] = "bead-top"
    hd = ctx["info"]["head"]
    for v in (hd["loop"][3], hd["loop"][5]):
        listed[m[v]] = "neck-socket"
    for part in ("nose", "muzzle", "chin", "crown"):
        if part not in b.parts:
            continue
        pid = b.parts[part]
        for i in range(n0):
            if b.part[i] == pid:
                listed[i] = "dome"
    ey = ctx["info"]["eye"]
    for v in [ey["centre"]] + ey["loop"] + ey["inset"]:
        listed[v] = "eye"
    unl, kinds = [], collections.Counter()
    extra = [i for i in range(n0) if abs(V[i][1]) > 1e-12]
    for v in range(len(V)):
        if val[v] != 4:
            base = v if v < n0 else extra[v - n0]
            if base in listed:
                kinds[listed[base]] += 1
            else:
                unl.append(v)
    return unl, kinds


class T(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.b = build.make_body(upto="base", crown=False)
        cls.V, cls.F, cls.attr, cls.fp = Q.full_topology(cls.b)
        cls.ctx = cls.b.ctx
        V, F, attr, fp, cr, mir = cls.b.full()
        cls.V2, cls.F2, _, cls.attr2, _ = SD.subdivide(V, F, cr, attr, fp, levels=2)

    def test_manifold_quads_mirror(self):
        m = Q.manifold(self.V, self.F)
        self.assertEqual(m["non_manifold_edges"], 0); self.assertEqual(m["loose_verts"], 0); self.assertEqual(m["inconsistent_winding"], 0)
        self.assertEqual(Q.mirror_plane(self.V)["near_but_off"], 0)

    def test_every_pole_listed(self):
        unl, kinds = pole_kinds(self.b, self.V, self.F)
        print("poles:", dict(kinds))
        self.assertEqual(len(unl), 0, f"{len(unl)} unlisted poles")

    def test_limit_error(self):
        self.assertLessEqual(self.ctx["log"]["limit"]["max_err"], 0.004)

    def test_no_folds_level2(self):
        f = Q.flips(self.V2, self.F2)
        self.assertGreater(f["min_adjacent_normal_dot"], -0.2, f)
        self.assertGreater(f["volume"], 0)

    def test_eye_inside_head_outline(self):
        ey = self.ctx["info"]["eye"]
        V = self.b.cage.arr()
        hd = self.ctx["info"]["head"]
        P = V[ey["centre"]]
        ring = V[[self.ctx["remap"][v] for v in hd["rings"][ey["ring"]]]]
        # inside the head's horizontal slice: |y| smaller than the ring's own half-width at the eye's side
        self.assertLess(abs(P[1]), np.abs(ring[:, 1]).max())
        # and not outside the head silhouette seen from the front: the eye lies within the head's width at its height
        self.assertLess(abs(P[1]) + 0.18, np.abs(ring[:, 1]).max() + 0.05)

    def test_head_larger_than_chest(self):
        V = self.b.cage.arr(); m = self.ctx["remap"]
        hd = self.ctx["info"]["head"]
        hw = max(np.abs(V[[m[v] for v in r]][:, 1]).max() for r in hd["rings"])
        hdp = max(np.ptp(V[[m[v] for v in r]][:, 0]) for r in hd["rings"])
        head_area = math.pi * hw * hdp / 2
        T = self.ctx["T"]
        a = np.linspace(0, 1, 41)
        P = T.point(np.full_like(a, float(T.s_of_x(-0.22))), a)
        chest_area = math.pi * np.abs(P[:, 1]).max() * np.ptp(P[:, 2]) / 2
        print("head slice area", round(head_area, 2), "chest section area", round(chest_area, 2))
        self.assertGreater(head_area, chest_area)

    def test_ad_body_numbers(self):
        V2 = self.V2
        # belly clear between the legs on the centre line
        c = (np.abs(V2[:, 1]) < 0.03) & (V2[:, 0] > -0.95) & (V2[:, 0] < -0.5)
        belly = V2[c][:, 2].min()
        print("belly clearance", round(belly, 3))
        self.assertAlmostEqual(belly, 0.47, delta=0.05)
        # the gap between the near fore and hind feet at the ground
        # the AD's gate: at y 275 of the 304 stand view the near fore leg and the hind leg are about 20 px apart (read on alpha, as measure.py does)
        import gates, views, rig
        R = rig.Rig(self.ctx)
        M = views.level_mesh(self.b, 2)
        Mp = dict(M, V=R.skin(M["V"], R.weights(M["V"], M["attr"]), R.stand_pose()))
        a = gates.stand_view(self.b, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "out"), "_t", mesh=Mp)[304]["alpha"]
        runs = gates.leg_runs_275(a)
        gap = runs[-1][0] - runs[-2][1]
        print("foot gap px at y 275", gap, runs)
        self.assertTrue(14 <= gap <= 27, (gap, runs))
        # the hind leg shows a column under the haunch
        z0 = self.ctx["info"]["limbs"]["hind.L"]["ringinfo"][0]["centre"][2]
        self.assertGreaterEqual(z0, 0.15)

    def test_sole_on_floor_and_inside_footprint(self):
        L, _ = self.b.cage.limit_points()
        self.assertGreaterEqual(L[:, 2].min(), -0.03)
        # the legs stand under the body: the paws' outer edge no wider than the torso's widest ring
        low = self.V2[self.V2[:, 2] < 0.05]
        tw = np.abs(self.b.cage.arr()[[self.ctx["remap"][v] for r in self.ctx["info"]["torso"]["rings"] for v in r if v in self.ctx["remap"]]][:, 1]).max()
        print("paw outer y", round(float(np.abs(low[:, 1]).max()), 3), "torso max y", round(float(tw), 3))
        self.assertLessEqual(float(np.abs(low[:, 1]).max()), tw + 0.02)


if __name__ == "__main__":
    unittest.main()
