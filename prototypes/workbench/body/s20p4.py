"""Pass 4 helpers: measurements on the shipped (level-2) mesh. Under the bpy venv."""
import os, sys, math
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import s20indiv as IN, s20p2 as P2


class Torso:
    """The trunk's level-2 surface (torso part only) as a BVH: inside() by ray parity, dist() to the surface."""
    def __init__(self, b, level=2, part_name="torso"):
        from mathutils.bvhtree import BVHTree
        V, F, at, fp = P2.level_arrays(b, level)
        part = IN.part_of(b, F, fp, len(V))
        self.V, self.F, self.part, self.b = V, F, part, b
        Fa = np.array(F, int)
        m = np.isin(fp, [b.parts[part_name]]) if False else None
        fpart = part[Fa[:, 0]]
        self.mask = fpart == b.parts[part_name]
        tris = []
        for f in Fa[self.mask]:
            tris += [tuple(f[[0, 1, 2]]), tuple(f[[0, 2, 3]])]
        self.tree = BVHTree.FromPolygons([tuple(v) for v in V.tolist()], tris, all_triangles=True)

    def dist(self, p):
        from mathutils import Vector
        r = self.tree.find_nearest(Vector(p))
        return float(r[3]) if r[0] is not None else 9.0

    def inside(self, p):
        from mathutils import Vector
        n = 0
        o = Vector(p); d = Vector((0.0, 0.31, 0.95)).normalized()
        for _ in range(40):
            r = self.tree.ray_cast(o, d)
            if r[0] is None:
                break
            n += 1
            o = r[0] + d * 1e-4
        return n % 2 == 1


def arm_path(b):
    rec = b.ctx["info"]["tubes"]["arm.L"]
    return rec["path"], rec


def arm_numbers(b, T=None):
    """visible arm: skin crossing along the path to the tip surface; path directions; section sizes by slices across the axis."""
    T = T or Torso(b)
    pa, rec = arm_path(b)
    L = pa.length
    ss = np.linspace(0.0, L, 300)
    pts = pa.at(ss)[0]
    ins = np.array([T.inside(tuple(p)) for p in pts])
    sc = float(ss[np.where(ins)[0].max()]) if ins.any() else 0.0
    rt = float(max(pa.radii([L])[0]))
    vis = L + 0.85 * rt - sc
    cross = pa.at([sc])[0][0]
    tipc = pa.at([L])[0][0]
    ax = tipc - cross; ax = ax / np.linalg.norm(ax)
    return dict(visible_len=vis, cross=cross, tip=tipc, axis=ax, pitch_fwd=math.degrees(math.atan2(ax[0], -ax[2])), out=math.degrees(math.asin(ax[1])), sc=sc, L=L)
