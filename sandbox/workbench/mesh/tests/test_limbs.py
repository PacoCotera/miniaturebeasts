"""Round 5, the limbs are round tubes at rest and through the walk (the owner: 'the legs have problems, you flatten the surfaces in unnatural ways'): sections of each leg shell across its axis keep their shape,
section sd ratio never under 0.55 and, posed, never more than 12 % flatter than at rest; and the cage's own rings are round (sd ratio over 0.65) with consistent winding (no twisted ring)."""
import os, sys, math, unittest
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from stop6 import *
from test_toes import eval_verts

LEGS = ("fore.L", "fore.R", "hind.L", "hind.R")


def section_ratio(P, c, a):
    """sd ratio (min/max) of points P in the plane through c perpendicular to axis a."""
    u = np.cross(a, [0, 1, 0.0]); u /= np.linalg.norm(u); v = np.cross(a, u)
    q = np.column_stack([(P - c) @ u, (P - c) @ v])
    w = np.linalg.eigvalsh(np.cov((q - q.mean(0)).T))
    return float(math.sqrt(max(w[0], 0) / w[1]))


class T(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        here = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        cls.H, cls.sc, _ = build_full(3, os.path.join(here, "out", "mesh", "test-tex"))
        cls.sc.pose_stand(False)
        shape_keys(cls.sc, cls.H)
        make_clips(cls.sc, cls.H)
        me = cls.sc.final.data
        cls.part = np.zeros(len(me.vertices), np.int32); me.attributes["_PART"].data.foreach_get("value", cls.part)
        cls.rest = np.array([v.co[:] for v in me.vertices])
        cls.legs = {lg["name"]: lg for lg in cls.H.legs}

    def sections(self, P, name, bone_delta):
        lg = self.legs[name]
        m = self.part == self.sc.part_names.index("leg." + name)
        top, ank = lg["top"], lg["ank"]
        a = (ank - top) / np.linalg.norm(ank - top)
        Rm, tr = bone_delta
        out = []
        for t in (0.15, 0.4, 0.65, 0.9):
            c = top + (ank - top) * t
            sel = m & (np.abs((self.rest - c) @ a) < 0.02)
            self.assertGreater(sel.sum(), 8, f"{name} t={t}")
            out.append(section_ratio(P[sel], Rm @ c + tr, Rm @ a))
        return out

    def test_leg_sections_are_round_at_rest_and_in_the_walk(self):
        rig = self.sc.rig
        ident = (np.eye(3), np.zeros(3))
        rest = {n: self.sections(self.rest, n, ident) for n in LEGS}
        for n, r in rest.items():
            self.assertGreater(min(r), 0.55, f"{n} at rest {np.round(r, 2)}")
        for t in rig.animation_data.nla_tracks:
            t.mute = t.name != "walk"
        for ph in range(8):
            self.sc.scene.frame_set(1 + 3 * ph); bpy.context.view_layer.update()
            P = eval_verts(self.sc.final)
            for n in LEGS:
                tag, side = n.split(".")
                pb = rig.pose.bones[f"{tag}_upper.{side}"]
                M = pb.matrix @ pb.bone.matrix_local.inverted()
                r = self.sections(P, n, (np.array(M.to_3x3()), np.array(M.translation)))
                for a, b in zip(r, rest[n]):
                    self.assertGreater(a, 0.88 * b - 0.02, f"{n} flattened in the walk, phase {ph}: {np.round(r, 2)} against rest {np.round(rest[n], 2)}")

    def test_cage_rings_round_and_untwisted(self):
        from build import make_cages
        cages, _ = make_cages(self.H, join="A", beans=False)
        for c in cages:
            if not c.name.startswith("leg."):
                continue
            V = np.array(c.V); signs = []
            for rn, ids in sorted(c.rings.items()):
                P = V[ids]; cen = P.mean(0)
                w = np.linalg.eigvalsh(np.cov((P[:, :2] - P[:, :2].mean(0)).T))
                self.assertGreater(math.sqrt(w[0] / w[1]), 0.65, f"{c.name} {rn}")      # the elbow's ring is the flattest, 0.70: the house's elbow lump sits behind the axis
                nrm = sum(np.cross(P[i] - cen, P[(i + 1) % 8] - cen) for i in range(8))
                signs.append(float(np.sign(nrm[2])))
            self.assertEqual(len(set(signs)), 1, f"{c.name}: ring winding flips along the leg {signs}")


if __name__ == "__main__":
    unittest.main()
