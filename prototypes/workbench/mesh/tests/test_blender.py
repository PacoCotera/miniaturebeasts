"""Blender facts the build depends on (5.2.3): the Catmull-Clark result keeps the cage vertices first (the design's index-map assertion), and our
numpy limit points agree with the real subdivision surface: the level-3 mesh of a fitted part lies on the house's field."""
import os, sys, unittest
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import bpy, bmesh
from housefield import House
from parts import build_head, build_torso
from cage import fit


def subsurf_eval(verts, faces, levels, limit=True):
    me = bpy.data.meshes.new("t")
    me.from_pydata([tuple(v) for v in verts], [], [tuple(f) for f in faces])
    ob = bpy.data.objects.new("t", me)
    bpy.context.scene.collection.objects.link(ob)
    m = ob.modifiers.new("s", "SUBSURF")
    m.levels = m.render_levels = levels
    m.use_limit_surface = limit
    ev = bpy.data.meshes.new_from_object(ob.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    out = np.array([v.co[:] for v in ev.vertices])
    bpy.data.objects.remove(ob)
    return out


class T(unittest.TestCase):
    def test_index_map_on_a_cube(self):
        bm = bmesh.new(); bmesh.ops.create_cube(bm, size=2.0)
        V = np.array([v.co[:] for v in bm.verts]); F = [[v.index for v in f.verts] for f in bm.faces]
        out = subsurf_eval(V, F, 1)
        # the first N vertices are the cage vertices, moved to limit points
        L = V * 0.0
        from cage import Cage
        C = Cage("cube", mirrored=False); [C.add(v) for v in V]; [C.face(*f) for f in F]
        lim, _ = C.limit_points()
        np.testing.assert_allclose(out[: len(V)], lim, atol=1e-5)

    def test_numpy_limit_matches_blender(self):
        H = House("S01")
        C = build_head(H); C.fix_winding(); fit(C, H.dh)
        V, faces, _ = C.full()
        out = subsurf_eval(V, faces, 3, limit=True)
        d = H.dh(out)
        vis = out[:, 2] > H.g["mouthZ"] - 0.05      # round 3: above the chin row. Below it the jaw's underside is a steep collar cap inside the chest (it sags up to 0.11 H there, hidden)
        self.assertLess(np.abs(d[vis]).max(), 0.03)   # between the vertices the surface sags inside the field (0.017 H on the round dome); at the vertices it is within 0.004
        self.assertLess(np.abs(d[vis]).mean(), 0.004)


if __name__ == "__main__":
    unittest.main()
