"""Round 5, the toes: every right-side vertex of the body and every right bean is bound to its own side's bones (rounds 1-4 left the right legs on the left bones and put the right bones on the left side, so the
right toes walked against their leg), and on every paw the middle bean is the front-most of the three along the paw's own forward, in the rest pose and through the walk clip."""
import os, sys, unittest
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import bpy
from stop6 import *

PAWS = ("fore.L", "fore.R", "hind.L", "hind.R")


def eval_verts(ob):
    ev = ob.evaluated_get(bpy.context.evaluated_depsgraph_get())
    me = ev.to_mesh()
    P = np.array([v.co[:] for v in me.vertices])
    ev.to_mesh_clear()
    return P


class T(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        here = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        cls.H, cls.sc, _ = build_full(2, os.path.join(here, "out", "mesh", "test-tex"))
        cls.sc.pose_stand(False)
        shape_keys(cls.sc, cls.H)
        make_clips(cls.sc, cls.H)
        cls.legs = {lg["name"]: lg for lg in cls.H.legs}
        ob = cls.sc.final
        cls.groups = {g.index: g.name for g in ob.vertex_groups}
        cls.rest = np.array([v.co[:] for v in ob.data.vertices])
        cls.wt = {n: np.array([next((g.weight for g in v.groups if cls.groups[g.group] == n), 0.0) for v in ob.data.vertices]) for n in
                  [f"{t}_{b}.{s}" for t in ("fore", "hind") for b in ("upper", "lower", "paw") for s in "LR"]}
        nb = len(cls.sc.beans.data.vertices) // 12
        cls.nb = nb
        cls.bean_rest = np.array([v.co[:] for v in cls.sc.beans.data.vertices])
        bg = {g.index: g.name for g in cls.sc.beans.vertex_groups}
        cls.bean_bone = [bg[cls.sc.beans.data.vertices[k * nb].groups[0].group] for k in range(12)]

    def pose(self, ph):
        rig = self.sc.rig
        for t in rig.animation_data.nla_tracks:
            t.mute = t.name != "walk"
        self.sc.scene.frame_set(1 + 3 * ph)
        bpy.context.view_layer.update()

    def delta(self, bone):
        pb = self.sc.rig.pose.bones[bone]
        return np.array((pb.matrix @ pb.bone.matrix_local.inverted()).to_3x3()), np.array((pb.matrix @ pb.bone.matrix_local.inverted()).translation)

    def test_every_vertex_follows_its_own_side(self):
        for n, w in self.wt.items():
            side = n[-1]
            far = (self.rest[:, 1] < -0.02) if side == "L" else (self.rest[:, 1] > 0.02)      # the other side of the creature
            self.assertLess(w[far].max(), 0.05, n)       # no weight on the opposite side's bone (the trunk's blend across the midplane is bounded by the 0.02 band)
        for k, b in enumerate(self.bean_bone):
            self.assertEqual(b, PAWS[k // 3].replace("fore.", "fore_paw.").replace("hind.", "hind_paw."), k)

    def test_middle_bean_is_the_front_of_its_paw_at_rest_and_in_the_walk(self):
        sc, H = self.sc, self.H
        bones = [f"{p.split('.')[0]}_paw.{p[-1]}" for p in PAWS]
        for ph in (None, 0, 1, 2, 3, 4, 5, 6, 7):
            if ph is None:
                reset_pose(sc.rig); bpy.context.view_layer.update()
            else:
                self.pose(ph)
            B = eval_verts(sc.beans); Fv = eval_verts(sc.final)
            for pi, p in enumerate(PAWS):
                lg = self.legs[p]
                Rm, tr = self.delta(bones[pi])
                fwd, lat = Rm @ lg["paw_R"][:, 0], Rm @ lg["paw_R"][:, 1]
                cen = [B[(3 * pi + t) * self.nb:(3 * pi + t + 1) * self.nb].mean(0) for t in range(3)]
                cen_rest = [self.bean_rest[(3 * pi + t) * self.nb:(3 * pi + t + 1) * self.nb].mean(0) for t in range(3)]
                # glued to its own paw: each bean stands where the paw's bone carries its rest place
                for t in range(3):
                    np.testing.assert_allclose(cen[t], Rm @ cen_rest[t] + tr, atol=2e-3, err_msg=f"{p} bean {t} phase {ph}")
                dome = self.wt[bones[pi]] > 0.9
                dc = Fv[dome].mean(0); dc_rest = self.rest[dome].mean(0)
                np.testing.assert_allclose(dc, Rm @ dc_rest + tr, atol=0.02, err_msg=f"{p} dome phase {ph}")
                proj = [(c - dc) @ fwd for c in cen]
                lats = [(c - dc) @ lat for c in cen]
                self.assertGreater(proj[1] - max(proj[0], proj[2]), 0.015, f"{p} middle bean is not the front-most, phase {ph}")
                self.assertGreater(min(proj), -0.0, f"{p} a bean behind the paw's centre, phase {ph}")
                self.assertLess(lats[0] * lats[2], 0, f"{p} the side beans are not on opposite sides, phase {ph}")
                self.assertLess(abs(abs(lats[0]) - abs(lats[2])), 0.06, f"{p} the side beans are not even, phase {ph}")
            if ph is None:       # the right hind paw is the left one's mirror image across the midplane: left-right only, never front-back (the far fore paw stands forward by the house's own step, so it is not an exact image)
                m = np.array([1, -1, 1.0])
                for t in range(3):
                    ca = B[(6 + t) * self.nb:(6 + t + 1) * self.nb].mean(0); cb = B[(9 + t) * self.nb:(9 + t + 1) * self.nb].mean(0)
                    np.testing.assert_allclose(ca * m, cb, atol=1e-6)


if __name__ == "__main__":
    unittest.main()
