"""S20 balance and tail proportions (owner rules, 1 Nov): the centre of mass (volume centroid of the closed level-2 mesh, uniform density, lantern included) falls inside the support polygon of the two soles, at least 15 % of the sole length in front of the heel edge, for the type, all
twelve individuals and the extreme tail genes; the tail is small for its legs and body (root radius <= 0.47 of the seat's and <= 1.2 x the leg column's, stalk about 0.05 H, lantern no bigger than the ear tip, arc length 1.0-1.2 H, tip no higher than the ears, its side silhouette at most a quarter of the trunk's)."""
import os, sys, json, unittest
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import s20genes as GN, s20indiv as IN, s20balance as BL, views, gates, schema as SC, s20build


class T(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.items = [IN.make(i) for i in range(1, 13)]

    def test_type_and_twelve_individuals_balance(self):
        for i, (c, b, R) in enumerate(self.items, 1):
            m = BL.measure(b)
            print("individual", i, "centre of mass", m["com"].round(3).tolist(), "margin", round(m["margin"], 3), "of the sole length from the heel", b.ctx["balance"])
            self.assertTrue(m["inside"], i)
            self.assertGreaterEqual(m["margin"], 0.15, i)

    def test_extreme_tail_genes_balance(self):
        for sh in (dict(tailLen=1.6, tailGirth=1.3, curl=-0.15), dict(tailLen=1.3, tailGirth=1.2, curl=-0.15),
                   dict(tailLen=1.6, tailGirth=1.3, curl=-0.15, headSize=0.96, torsoGirth=1.04, legLen=0.9), dict(tailLen=1.3, tailGirth=1.2, curl=0.2, tipSize=1.2)):
            c = GN.creature(GN.draw(1)); c["shape"].update(sh)
            b = GN.build_individual(IN.RAW, c)
            m = BL.measure(b)
            print("extreme", sh, "margin", round(m["margin"], 3), b.ctx["balance"])
            self.assertTrue(m["inside"], sh)
            self.assertGreaterEqual(m["margin"], 0.15, sh)

    def test_balance_clip_is_logged_when_it_acts(self):
        c = GN.creature(GN.draw(1)); c["shape"].update(tailLen=4.0, tailGirth=1.2)               # far outside the band: the clip must act, and say so
        b = GN.build_individual(IN.RAW, c)
        lg = b.ctx["balance"]
        print("clip log", lg)
        self.assertTrue(lg["leg_dx"] < 0 or lg["tail_len_factor"] < 1.0)           # the legs moved under the centroid, or the tail was clipped
        m = BL.measure(b)
        self.assertGreaterEqual(m["margin"], 0.15)

    def test_gene_bands_are_the_shifted_ones(self):
        self.assertEqual(GN.GENES["body.tail-girth"][1:3], (0.8, 1.2))
        self.assertEqual(GN.GENES["body.tail-length"][1:3], (0.8, 1.3))

    def test_tail_proportions_of_the_type(self):
        c, b, R = self.items[0]
        G = b.ctx["T"]
        spec = b.ctx["spec"]
        tail = spec["parts"]["tail"]
        root_r = tail["joints"][0]["r"][0]
        seat_r = 0.55
        leg_r = max(j["r"][0] for j in spec["parts"]["leg.L"]["joints"][1:3])
        print("tail root radius", root_r, "seat radius", seat_r, "leg column radius", leg_r)
        self.assertLessEqual(root_r / seat_r, 0.47)
        self.assertLessEqual(root_r, 1.2 * leg_r)
        stalk = tail["joints"][-1]["r"][0]
        self.assertLessEqual(abs(stalk - 0.05), 0.012)
        lan_w = spec["sockets"]["tail.tip"]["shapes"]["lantern"]["width"]
        ear = spec["parts"]["ear.L"]["families"]["prick"]["joints"][-1]["r"]
        print("lantern width", lan_w, "ear tip width", 2 * max(ear))
        self.assertLessEqual(lan_w, 2 * max(ear))
        self.assertAlmostEqual(lan_w, 0.20, delta=0.03)                              # the owner's bulb: 0.26 x 0.20 H
        pa = PA_len(tail)
        print("tail arc length", round(pa, 3))
        self.assertTrue(1.0 <= pa <= 1.2, pa)
        P = np.array(tail["P"])
        self.assertLessEqual(float(P[:, 2].max() + stalk + lan_w / 2), 2.4)           # no higher than the ears' tops

    def test_tail_silhouette_share_at_az090(self):
        """The tail's side silhouette (its range and the lantern) over the trunk's (head, neck, back and seat), in pixels at 304, az 090: at most 1/4."""
        c, b, R = self.items[0]
        G = b.ctx["T"]
        m = views.level_mesh(b, 2)
        F = np.array(m["F"], int)
        sm = m["attr"][F][:, :, 1].mean(1)
        pid = m["fp"].astype(int)
        torso = pid == b.parts["torso"]
        tailsel = torso & (sm < G.s_root + 0.02)                       # the bulb is the last stretch of the loft
        trunk = torso & (sm >= G.s_root + 0.02)
        out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "out")
        os.makedirs(out, exist_ok=True)
        w, h, ppH = gates.SIZES[304]
        areas = []
        for sel, nm in ((tailsel, "tail"), (trunk, "trunk")):
            M = dict(V=m["V"], F=[tuple(f) for f in F[sel]])
            a, cam = gates.render_rgba(M, os.path.join(out, f"_share_{nm}.png"), 90.0, 0.0, w, h, np.array([-0.4, 0, 1.2]), ppH, samples=1)
            areas.append(int((a[..., 3] > 0.5).sum()))
        share = areas[0] / areas[1]
        print("tail", areas[0], "px, trunk", areas[1], "px, share", round(share, 3))
        self.assertLessEqual(share, 0.25)


def PA_len(tail):
    import paths as PA
    P = np.array(tail["P"])
    pts, _ = PA.fillet_path(P, [j["r"] for j in tail["joints"]], tail["fillet"])
    return float(PA.arclen(pts)[-1])


if __name__ == "__main__":
    unittest.main()
