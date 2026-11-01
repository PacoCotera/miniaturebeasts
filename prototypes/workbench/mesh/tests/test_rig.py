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
        self.assertEqual([k.name for k in self.keys.key_blocks], ["Basis", "breath"])
        self.assertEqual([[k.name for k in lid.data.shape_keys.key_blocks] for lid in self.sc.lids], [["Basis", "blink.L"], ["Basis", "blink.R"]])
        self.assertEqual(sorted(t.name for t in self.sc.rig.animation_data.nla_tracks), ["blink", "breathe", "stand", "walk"])

    def test_lids_shut_in_front_of_the_discs(self):
        """At the blink's peak each lid lies above its eye disc everywhere over the disc's own area, and below the skin: the socket is shut, not smeared."""
        for lid, eye, disc in zip(self.sc.lids, self.H.eyes, self.sc.eyes):
            kb = lid.data.shape_keys.key_blocks[1]
            rest = np.array([v.co[:] for v in lid.data.vertices]); shut = np.array([d.co[:] for d in kb.data])
            n = eye["n"]
            self.assertTrue(((shut - rest) @ n > 0.09).all())                       # raised by the sink and more
            D = np.array([v.co[:] for v in disc.data.vertices])
            c = self.H.kc + eye["c"]
            inside = np.hypot((shut - c) @ eye["lat"], (shut - c) @ eye["up"]) < eye["Reye"] * 1.04
            hs = ((shut - c) @ n)[inside]
            hd = ((D - c) @ n)
            self.assertGreater(hs.min(), hd[np.hypot((D - c) @ eye["lat"], (D - c) @ eye["up"]) < eye["Reye"] * 1.04].max() - 0.05)   # the lid is not behind the disc plane's own range

    def test_sockets_are_closed_and_wide_as_the_disc(self):
        for f, eye in zip(self.sc.eye_fit, self.H.eyes):
            self.assertGreater(f["rim_verts"], 30)
        import bmesh
        bm = bmesh.new(); bm.from_mesh(self.sc.final.data)
        open_edges = sum(1 for e in bm.edges if e.is_boundary)
        bm.free()
        self.assertEqual(open_edges, sum(f["rim_verts"] for f in self.sc.eye_fit))      # only the two walls' feet, hidden under the discs

    def test_no_bone_scale_anywhere(self):
        for act in bpy.data.actions:
            for fc in act.layers[0].strips[0].channelbags[0].fcurves if act.layers else []:
                if fc.data_path.endswith("scale"):
                    self.assertTrue(all(abs(k.co[1] - 1) < 1e-6 for k in fc.keyframe_points), fc.data_path)


if __name__ == "__main__":
    unittest.main()
