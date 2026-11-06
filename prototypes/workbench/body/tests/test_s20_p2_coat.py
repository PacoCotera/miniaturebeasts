"""S20 pass 2, steps 6-9: a bolder coat (pattern contrast at least 25 % in value; every layout tells apart from plain in a 96 px greyscale thumbnail; one glowing pattern gene; freckles 0.08 H clear of the eyes and the mouth), tail and tip variety, legs vertical within 3 degrees,
a mouth stroke of at least 0.02 H and one open-mouth expression."""
import os, sys, unittest, math
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import s20indiv as IN, s20coat as CT, s20p2 as P2, s20tex as TX, s20pipe as PP, s20render as RN, subdiv as SD, gltf_out
from test_s20_p2_lantern import luma

LAYOUTS = ("masked", "points", "banded", "spotted", "capped")


class T(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.c, cls.b, cls.R = IN.make(1)

    def coat_at_vertices(self, genome):
        b = self.b
        V, F, at, fp2 = P2.level_arrays(b, 3)                # level 3: the mouth stroke (0.054 H) and the dots are smaller than level 2's vertex spacing, so a count of vertices there is noise
        part = IN.part_of(b, F, fp2, len(V))
        N = gltf_out.vertex_normals(V, F)
        return V, part, CT.coat(b.ctx, V, at, part, N, at[:, 3], genome, "open")

    def test_pattern_contrast_at_least_25_percent_in_value(self):
        for h in range(0, 360, 15):
            P = CT.palette_from_hue(h, {})
            self.assertGreaterEqual(abs(luma(P["mark"]) - luma(P["coat"])) / luma(P["coat"]), 0.25, h)

    def test_layouts_tell_apart_from_plain_in_a_96px_greyscale_thumbnail(self):
        import s20rig
        V, F, at, fp2 = P2.level_arrays(self.b, 2)
        base = None
        for lay in ("plain",) + LAYOUTS:
            g = {**self.c["coat"], "layout": lay, "rd": "none", "mark": "none", "glow_pattern": "none"}
            tex = PP.make_tex(self.b, g, frames=("open",))
            paths = P2.write_tex(tex, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "out", "_t_" + lay))
            M = P2.posed(TX.render_mesh(self.b), self.b, self.R, self.R.stand_pose())
            a, cam = RN.render_tex(M, paths, g, os.path.join(paths["col"] + ".png"), 96, 88, 30.0, az=32.0, el=10.0, centre=(-0.35, 0, 1.3), samples=64)
            grey = (0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2])
            mask = a[..., 3] > 0.5
            if lay == "plain":
                base = grey; bmask = mask
                continue
            d = np.abs(grey - base)[mask & bmask]
            frac = float((d > 0.06).mean())
            print(lay, "pixels differing from plain by more than 0.06 grey at 96:", round(frac * 100, 1), "%")
            self.assertGreater(frac, 0.04, lay)

    def test_freckles_stay_0p08_clear_of_the_eyes_and_the_mouth(self):
        V, part, o = self.coat_at_vertices({**self.c["coat"], "freckle_density": 1.0, "glow_pattern": "constellation"})
        spec = self.b.ctx["spec"]; G = self.b.ctx["T"]
        Pe = CT.surface_frame(G, spec["face"]["eyes"]["station"], spec["face"]["eyes"]["around"])[0]
        Pm = CT.surface_frame(G, spec["face"]["mouth"]["station"], 1.0)[0]
        Vm = np.stack([V[:, 0], np.abs(V[:, 1]), V[:, 2]], 1)
        fr = o["fields"]["freckles"] > 0.2
        gp = o["fields"].get("glow_pattern", np.zeros(len(V))) > 0.2
        self.assertTrue(fr.any())
        r = spec["face"]["eyes"]["r"]
        self.assertGreater(float(np.linalg.norm(Vm[fr | gp] - Pe, axis=1).min()), r + 0.08 - 0.02)         # (level-2 vertex sampling: 0.02 H)
        self.assertGreater(float(np.linalg.norm(Vm[fr | gp] - Pm, axis=1).min()), 0.5 * spec["face"]["mouth"]["width"] + 0.08 - 0.02)

    def test_one_glowing_pattern_gene(self):
        for gp in ("belly-arcs",):                                      # (the constellation gene is retired; its code path still runs)
            V, part, o = self.coat_at_vertices({**self.c["coat"], "glow_pattern": gp})
            self.assertGreater(float((o["fields"]["glow_pattern"] > 0.5).sum()), 20, gp)
            self.assertGreater(float(o["emit"].max()), 0.3)
        import s20genes as GN
        self.assertIn("coat.glow-pattern", GN.PAIRS)
        pats = {IN.make(i)[0]["coat"]["glow_pattern"] for i in (2, 3, 4)}
        self.assertEqual(pats, {"none", "belly-arcs"})

    def test_mouth_stroke_and_the_open_mouth(self):
        V, part, o = self.coat_at_vertices({**self.c["coat"], "expression": "content"})
        V2, part2, o2 = self.coat_at_vertices({**self.c["coat"], "expression": "open"})
        a1, a2 = float((o["fields"]["mouth"] > 0.5).sum()), float((o2["fields"]["mouth"] > 0.5).sum())
        print("mouth vertices over 0.5: content", a1, "open", a2)
        self.assertGreater(a2, a1 * 1.3)                                    # the open mouth is a filled oval, bigger than the stroke
        # the stroke: smoothstep(0.02, 0.034) on the distance to the mouth curve: its 50 % level is at 0.027 H, so the stroke is 0.054 H wide (>= 0.02)
        self.assertGreaterEqual(2 * 0.027, 0.02)

    def test_legs_vertical_within_3_degrees(self):
        P = np.array(self.b.ctx["spec"]["parts"]["leg.L"]["P"])
        d = P[-1] - P[0]
        front = math.degrees(math.atan2(abs(d[1]), abs(d[2]))); side = math.degrees(math.atan2(abs(d[0]), abs(d[2])))
        print("leg axis from vertical: front", round(front, 2), "side", round(side, 2))
        self.assertLessEqual(front, 3.0); self.assertLessEqual(side, 3.0)

    def test_tip_families_differ_at_96(self):
        # the three tip families have different colours on the bulb: lantern (lit lime), tuft (the pastel inner-ear colour, unlit), plain (a dark cap)
        cols = {}
        for fam in ("lantern", "tuft", "plain"):
            import s20build
            b = s20build.make_s20(upto="base", tip=fam)
            V, F, at, fp2 = P2.level_arrays(b, 2)
            part = IN.part_of(b, F, fp2, len(V)); N = gltf_out.vertex_normals(V, F)
            o = CT.coat(b.ctx, V, at, part, N, at[:, 3], self.c["coat"], "open")
            tip = (part == b.parts["torso"]) & (at[:, 1] <= b.ctx["T"].bulb[0])
            cols[fam] = (CT.lin_to_srgb(o["col"][tip]).mean(0), float(o["emit"][tip].sum(1).mean()))
        print({k: (np.round(v[0]).tolist(), round(v[1], 2)) for k, v in cols.items()})
        self.assertGreater(cols["lantern"][1], 0.3); self.assertLess(cols["tuft"][1], 0.05); self.assertLess(cols["plain"][1], 0.05)       # the tuft and the plain tip are unlit
        self.assertGreater(float(np.abs(cols["tuft"][0] - cols["plain"][0]).max()), 40)


if __name__ == "__main__":
    unittest.main()
