"""S20 chunk 5: skin and face. UV island stretch (failing rows stay failing and are reported), the blink changes no outline pixel at 304 and 96, the far eye is whole with skin round it in the house three-quarter view at 304, the lantern is >= 40 levels brighter than the coat at 96, the coat zones and palettes."""
import os, sys, unittest
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import bpy
import s20build, s20render as RN, s20uv as UV, s20coat as CT, bpyio as B, gates

AZ, EL = 32.0, 10.0
CEN = {304: (-0.35, 0, 1.3), 96: (-0.35, 0, 1.3), 48: (-0.35, 0, 1.25)}


def lum(rgb):
    return 255.0 * (0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2])


class T(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.b = s20build.make_s20(upto="base")
        cls.g = dict(hue=270.0)
        cls.P = RN.prepare(cls.b, cls.g, level=3)
        out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "out", "s20")
        os.makedirs(out, exist_ok=True)
        cls.out = out

    def test_uv_island_stretch(self):
        import s20tex as TX
        V, F, at, fp2 = __import__("s20p2").level_arrays(self.b, 2)
        uv, isl = TX.face_uv(self.b, V, F, np.asarray(fp2).astype(int), at)
        res = TX.stretch(V, F, uv, isl)
        for k, v in res.items():
            print("island", k, {a: round(c, 2) for a, c in v.items()})
        bad = {k: round(v["p95"], 2) for k, v in res.items() if v["p95"] > 1.3}
        self.assertEqual(bad, {}, bad)

    def test_every_island_has_an_origin(self):
        import s20tex as TX
        V, F, at, fp2 = __import__("s20p2").level_arrays(self.b, 2)
        uv, isl = TX.face_uv(self.b, V, F, np.asarray(fp2).astype(int), at)
        self.assertTrue(set(isl) <= set(TX.ISLAND), set(isl) - set(TX.ISLAND))

    def test_blink_outline_diff_zero(self):
        for size, smp in ((304, 12), (96, 12)):
            ao, _ = RN.render(RN.prepare(self.b, self.g, frame="open"), self.g, os.path.join(self.out, "_o.png"), size, az=AZ, el=EL, centre=CEN[size], samples=smp, floor=False)
            ac, _ = RN.render(RN.prepare(self.b, self.g, frame="closed"), self.g, os.path.join(self.out, "_c.png"), size, az=AZ, el=EL, centre=CEN[size], samples=smp, floor=False)
            ah, _ = RN.render(RN.prepare(self.b, self.g, frame="half"), self.g, os.path.join(self.out, "_h.png"), size, az=AZ, el=EL, centre=CEN[size], samples=smp, floor=False)
            self.assertEqual(int(((ao[..., 3] > 0.5) != (ac[..., 3] > 0.5)).sum()), 0, size)
            self.assertEqual(int(((ao[..., 3] > 0.5) != (ah[..., 3] > 0.5)).sum()), 0, size)
            self.assertGreater(float(np.abs(ao[..., :3] - ac[..., :3]).sum()), 1.0)            # and the frames really differ in colour

    def test_far_eye_whole_with_skin_round_it(self):
        P = self.P
        F = P["fields"]
        a, cam = RN.render(P, self.g, os.path.join(self.out, "_t304.png"), 304, az=AZ, el=EL, centre=CEN[304], samples=12)
        V = P["V"]
        eye = F["eye"] > 0.5
        far = eye & (V[:, 1] < 0)                      # the camera is on the creature's left: the right eye is the far one
        near = eye & (V[:, 1] > 0)
        self.assertTrue(far.any() and near.any())
        # visibility by ray casting from the camera (orthographic: along fwd)
        from mathutils import Vector
        ob = bpy.data.objects["body"]
        fwd = cam["fwd"]
        pts = V[far][::7]
        vis = 0
        for p in pts:
            o = p - fwd * 20.0 + (-fwd) * 0
            hit = ob.ray_cast(Vector((p - fwd * 20.0).tolist()), Vector(fwd.tolist()), distance=40.0)
            if (not hit[0]) or (Vector(hit[1]) - Vector((p - fwd * 20.0).tolist())).length >= 20.0 - 0.01:
                vis += 1
        whole = vis / max(len(pts), 1)
        # skin round it: the eye's pixels, eroded silhouette
        P2, _ = B.project(cam, V[far])
        alpha = a[..., 3] > 0.5
        er = alpha.copy()
        for _ in range(3):
            er = er & np.roll(er, 1, 0) & np.roll(er, -1, 0) & np.roll(er, 1, 1) & np.roll(er, -1, 1)
        px = np.round(P2).astype(int)
        inside = [er[y, x] for x, y in px if 0 <= x < 304 and 0 <= y < 312]
        margin = float(np.mean(inside))
        print("far eye: visible fraction", round(whole, 3), "with 3 px of skin round it", round(margin, 3))
        self.assertGreaterEqual(whole, 0.97)
        self.assertGreaterEqual(margin, 0.99)

    def test_lantern_brighter_than_coat_at_96(self):
        """In the stand pose (the tail on the midline, its crook reaching behind the body so the lantern shows beside it at az 32): the visible lantern pixels are >= 40 levels brighter than the coat's at 96 px."""
        import s20rig
        from mathutils import Vector
        R = s20rig.Rig(self.b.ctx)
        P = RN.prepare(self.b, self.g, level=3, pose=R.stand_pose(), rig=R)
        a, cam = RN.render(P, self.g, os.path.join(self.out, "_t96.png"), 96, az=AZ, el=EL, centre=CEN[96], samples=24)
        pn = self.b.ctx["body_parts"]
        V = P["V"]
        ob = bpy.data.objects["body"]
        fwd = cam["fwd"]
        def visible(sel):
            idx = np.where(sel)[0]
            keep = []
            for i in idx[::3]:
                o = Vector((V[i] - fwd * 20.0).tolist())
                hit = ob.ray_cast(o, Vector(fwd.tolist()), distance=40.0)
                if (not hit[0]) or (Vector(hit[1]) - o).length >= 20.0 - 0.03:
                    keep.append(i)
            return np.array(keep, int)
        tip = (P["part"] == pn["torso"]) & (P["attr"][:, 1] <= self.b.ctx["T"].bulb[0])
        coatsel = (P["part"] == pn["torso"]) & (V[:, 2] > 1.3) & (V[:, 2] < 1.9) & (P["N"][:, 1] > 0.2) & (sum(P["fields"].get(k, 0) for k in ("eye", "mouth", "blush", "mark", "brow")) < 0.01)
        def meanlum(idx):
            p2, depth = B.project(cam, V[idx])
            ok = (p2[:, 0] >= 0) & (p2[:, 0] < 96) & (p2[:, 1] >= 0) & (p2[:, 1] < 88)
            xs, ys = np.round(p2[ok]).astype(int).T
            m = a[ys, xs, 3] > 0.5
            return float(lum(a[ys, xs, :3][m] ** (1 / 2.2)).mean()), int(m.sum())
        (lt, nt), (lc, nc) = meanlum(visible(tip)), meanlum(visible(coatsel))
        print("lantern", round(lt, 1), "(", nt, "px ) coat", round(lc, 1), "(", nc, "px )")
        self.assertGreater(nt, 3)
        self.assertGreaterEqual(lt - lc, 40.0)

    def test_zones_and_layouts(self):
        base = RN.prepare(self.b, dict(hue=270.0), level=2)
        self.assertGreater(base["fields"]["belly"].max(), 0.9)
        self.assertGreater(base["fields"]["ear_inner"].max(), 0.5)
        for lay, key in (("masked", "face"), ("points", "points"), ("banded", "tail_bands"), ("spotted", "spots"), ("capped", "cap")):
            p = RN.prepare(self.b, dict(hue=20.0, layout=lay), level=2)
            self.assertGreater(p["fields"][key].max(), 0.5, lay)
        for pal in (270.0, 180.0, 20.0):
            p = RN.prepare(self.b, dict(hue=pal), level=2)
            self.assertTrue(np.isfinite(p["col"]).all() and p["col"].max() <= 4)

    def test_freckles_brighten_toward_the_tail(self):
        p = RN.prepare(self.b, dict(hue=270.0, freckle_density=0.6), level=3)
        t, m, e = p["fields"]["t"], p["fields"]["freckles"], p["emit"].sum(1)
        head = (t < 0.15) & (m > 0.5); tail = (t > 0.8) & (m > 0.5)
        print("freckle emission, head vs tail", round(float(e[head].mean()) if head.any() else 0, 3), round(float(e[tail].mean()) if tail.any() else 0, 3))
        self.assertGreater(float(e[tail].mean()), float(e[head].mean()) * 1.5 if head.any() else 0)


if __name__ == "__main__":
    unittest.main()
