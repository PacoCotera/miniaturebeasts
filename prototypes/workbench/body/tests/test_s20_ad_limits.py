"""The AD's three limits on a full stack (ad-tuliko-worst.md, 3 Nov 2026): a labyrinth or rings stays on the back and flanks below the shoulder; under a shown pattern the spotted layout's spots and rosettes are not drawn; with the belly arcs showing a belly emblem draws on the forehead."""
import os, sys, unittest
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import s20indiv as IN, s20coat as CT


class T(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.c, cls.b, cls.R = IN.make(1)

    def coat(self, **over):
        G = self.b.ctx["T"]
        zz, aa = np.meshgrid(np.arange(0.3, 2.12, 0.01), np.arange(0.0, 1.0001, 0.01), indexing="ij")
        P = G.point(zz.ravel(), aa.ravel())
        nrm = np.stack([P[:, 0], P[:, 1], np.zeros(len(P))], 1); nrm /= np.maximum(np.linalg.norm(nrm, axis=1, keepdims=True), 1e-9)
        n = len(P)
        at = np.zeros((n, 4)); at[:, 1] = G.L - 0.3; at[:, 2] = aa.ravel()
        g = {**self.c["coat"], **over}
        o = CT.coat(self.b.ctx, P, at, np.zeros(n, int), nrm, at[:, 3], g, "open")
        return P, o["fields"]

    def test_a_labyrinth_and_rings_stay_on_the_back_and_flanks_and_are_faint(self):
        # AD ruling 1 on the play screens: stripes and loops stop at the shoulder (1.18 H), stay off the front third, and a mark is at most 0.55 (finer, in the coat's own hue; the limits are the species file's coat.zones.rd)
        rz = CT.rd_limits(dict(zones={}))
        self.assertEqual((rz["z_max"], rz["front_clear"], rz["cap"]), ([1.05, 1.18], [0.35, 0.55], 0.55))
        for kind in ("labyrinth", "rings"):
            P, F = self.coat(rd=kind, rd_contrast=1.0, rd_scale=1.0)
            z = P[:, 2]
            self.assertLessEqual(float(F["rd"].max()), 0.55 + 1e-9, kind)
            self.assertGreater(float(F["rd"].max()), 0.2, kind)
            self.assertEqual(float(F["rd"][z > 1.18].max()), 0.0, kind)
            self.assertEqual(float(F["rd"][self.theta(P) < 0.35].max()), 0.0, kind)

    def theta(self, P):
        aa = np.tile(np.arange(0.0, 1.0001, 0.01), len(P) // 101)
        return np.abs(np.where(P[:, 1] >= 0, 1.0 - aa, aa - 1.0))

    def test_dots_keep_off_the_face_and_the_file_carries_the_limits(self):
        P, F = self.coat(rd="spots", rd_contrast=1.0, rd_scale=1.0)
        z, th = P[:, 2], self.theta(P)
        self.assertGreater(float(F["rd"][z < 1.05].max()), 0.3, "dots keep their reach on the body")
        self.assertEqual(float(F["rd"][(z > 1.18) & (th < 0.35)].max()), 0.0)
        import json
        for f in ("species_v1/S20.json", "species_play/S71.json", "species_play/S72.json", "species_play/S73.json"):
            d = json.load(open(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), f)))
            self.assertEqual(d["coat"]["zones"]["rd"], dict(CT.RD_LIMITS), f)

    def test_the_spotted_layout_sleeps_under_a_pattern(self):
        P, F = self.coat(layout="spotted", rd="none", rosette=1.0)
        self.assertGreater(F["spots"].max(), 0.5)
        for kind in ("spots", "labyrinth", "rings"):
            P, F = self.coat(layout="spotted", rd=kind, rosette=1.0)
            self.assertNotIn("spots", F, kind)

    def test_a_belly_emblem_moves_to_the_forehead_when_the_arcs_show(self):
        P, F = self.coat(mark="star", mark_where="belly", glow_pattern="belly-arcs")
        z = P[:, 2]
        self.assertGreater(F["mark"].max(), 0.5)
        self.assertEqual(float(F["mark"][z < 1.5].max()), 0.0)
        P, F = self.coat(mark="star", mark_where="belly", glow_pattern="none")
        self.assertGreater(F["mark"][P[:, 2] < 1.2].max(), 0.5)


if __name__ == "__main__":
    unittest.main()
