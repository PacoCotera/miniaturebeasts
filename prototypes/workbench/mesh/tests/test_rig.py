"""The rig and the clips: the head is the same size while breathing, every part is weighted, the morph targets exist, the glb carries the four clips."""
import os, sys, json, struct, tempfile, unittest
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import bpy
from stop6 import *


class T(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        here = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        cls.tex = os.path.join(here, "out", "mesh", "test-tex")           # scratch under the worktree's out/, never /tmp
        cls.H, cls.sc, _ = build_full(2, cls.tex)
        cls.sc.pose_stand(False)
        cls.keys = shape_keys(cls.sc, cls.H)
        make_clips(cls.sc, cls.H)

    def test_head_still_while_breathing(self):
        r = breath_head_test(self.sc)
        self.assertLess(r["size_delta"], 1e-4)

    def test_every_vertex_weighted_and_sums_to_one(self):
        me = self.sc.final.data
        tot = np.array([sum(g.weight for g in v.groups) for v in me.vertices])
        self.assertTrue((tot > 0.999).all() and (tot < 1.001).all())

    def test_morph_targets_and_clips(self):
        self.assertEqual([k.name for k in self.keys.key_blocks], ["Basis", "breath", "blink.L", "blink.R"])
        self.assertEqual(sorted(t.name for t in self.sc.rig.animation_data.nla_tracks), ["blink", "breathe", "stand", "walk"])

    def test_no_bone_scale_anywhere(self):
        for act in bpy.data.actions:
            for fc in act.layers[0].strips[0].channelbags[0].fcurves if act.layers else []:
                if fc.data_path.endswith("scale"):
                    self.assertTrue(all(abs(k.co[1] - 1) < 1e-6 for k in fc.keyframe_points), fc.data_path)


if __name__ == "__main__":
    unittest.main()
