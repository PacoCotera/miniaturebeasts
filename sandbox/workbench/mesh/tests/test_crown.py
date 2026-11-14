"""Round 5, the crown's direction (the owner: 'check the direction of the crown'): the three leaves are set in the head's own frame. The fan opens across the head (left-right: the side leaves roll out to
their own sides, opposite), the centre leaf leans back toward the nape (the AD's fix 8 ruling: 20-30 degrees in the picture's frame), and the whole crown turns with the head."""
import os, sys, math, unittest
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import bpy
from stop6 import *
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from test_toes import eval_verts


def long_axis(P, base):
    """The leaf's long axis from its vertices, pointing away from its base."""
    c = P.mean(0)
    w, v = np.linalg.eigh(np.cov((P - c).T))
    ax = v[:, -1]
    return ax if (c - base) @ ax > 0 else -ax


class T(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        here = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        cls.H, cls.sc, _ = build_full(2, os.path.join(here, "out", "mesh", "test-tex"))

    def head_frame_axes(self, Rhead):
        """each leaf's long axis in the head's frame: the posed vertices turned back by the head's rotation about K."""
        H = self.H
        out = []
        for ob in self.sc.leaves:
            P = (eval_verts(ob) - H.kc) @ Rhead          # rows: R^T (p - kc)
            out.append(long_axis(P, H.leaves[0]["base"]))
        return out

    def test_leaves_are_set_in_the_head_frame(self):
        H = self.H
        self.sc.pose_stand(False)
        ax = self.head_frame_axes(np.eye(3))
        for a, l in zip(ax, H.leaves):
            self.assertLess(math.degrees(math.acos(np.clip(a @ l["ax"], -1, 1))), 4.0)       # the house's own leaf axis, in the head's frame
        back = [math.degrees(math.atan2(-a[0], a[2])) for a in ax]
        self.assertGreater(back[1], 8.0)                  # the centre leaf leans back (toward -x, the nape), never forward
        self.assertLess(ax[0][1], -0.5); self.assertGreater(ax[2][1], 0.5)      # the side leaves point out to their own sides: right (-y) and left (+y)
        self.assertLess(abs(ax[0][1] + ax[2][1]), 0.1)    # a fan across the head: the two sides mirror each other in y
        # the broad faces of the leaves lie in the fan's plane's neighbourhood: the leaf's thin direction is mostly along the head's x (forward), not across
        for ob in self.sc.leaves:
            P = eval_verts(ob) - H.kc
            w, v = np.linalg.eigh(np.cov((P - P.mean(0)).T))
            self.assertGreater(abs(v[0, 0]), 0.8)         # the thinnest direction is the head's forward axis

    def test_the_stand_pose_leans_the_centre_leaf_back_20_to_30_degrees(self):
        H = self.H
        self.sc.pose_stand(True)
        ax = self.head_frame_axes(np.eye(3))              # world frame here
        back = math.degrees(math.atan2(-ax[1][0], ax[1][2]))
        self.assertGreater(back, 20.0); self.assertLess(back, 30.0)

    def test_the_crown_turns_with_the_head(self):
        H = self.H
        self.sc.pose_stand(False)
        for deg in (35.0, -50.0):
            a = math.radians(deg)
            R = np.array([[math.cos(a), -math.sin(a), 0], [math.sin(a), math.cos(a), 0], [0, 0, 1.0]])
            reset_pose(self.sc.rig); bpy.context.view_layer.update()
            set_world(self.sc.rig.pose.bones["head"], about(H.kc, R))
            ax = self.head_frame_axes(R)
            for x, l in zip(ax, H.leaves):
                self.assertLess(math.degrees(math.acos(np.clip(x @ l["ax"], -1, 1))), 4.0)
        reset_pose(self.sc.rig)


if __name__ == "__main__":
    unittest.main()
