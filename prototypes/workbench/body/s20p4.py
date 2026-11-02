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


# ---- step 2: the seat S-profile (AD gate on pass 3, 3a) ----
def rear_contour(b, level=2, zmax=1.0, step=0.01, V2=None, F2=None):
    """The rear silhouette (min x over the whole body, y free) at heights zs, from the edge crossings of the level-2 faces (not the vertices: a long quad has none in the slice). Returns zs, xr."""
    if V2 is None:
        V2, F2, at, fp = P2.level_arrays(b, level)
    Fa = np.array(F2, int)
    E = np.concatenate([Fa[:, [0, 1]], Fa[:, [1, 2]], Fa[:, [2, 3]], Fa[:, [3, 0]]])
    A, B = V2[E[:, 0]], V2[E[:, 1]]
    zs = np.arange(0.0, zmax, step)
    xr = np.full(len(zs), np.nan)
    for i, z in enumerate(zs):
        m = ((A[:, 2] - z) * (B[:, 2] - z)) <= 0
        m &= A[:, 2] != B[:, 2]
        if not m.any():
            continue
        t = (z - A[m, 2]) / (B[m, 2] - A[m, 2])
        xr[i] = (A[m, 0] + t * (B[m, 0] - A[m, 0])).min()
    return zs, xr


def seat_numbers(b, root=(-0.42, 0.72)):
    """The AD's seat S-profile numbers on the rear silhouette (y free). heel = the rear of the foot (mean over z 0.02-0.10); back_angle_deg = the least-squares line of the back of the leg over z 0.05-0.25, from vertical;
    tuck = the concavity depth at z 0.25-0.30 below the chord from the leg's back (z 0.20) to the dome (z 0.40); the dome's rearmost point = the rearmost contour point under the tail (z 0.35 up to the tail's underside, the first jump of more
    than 0.15 H in x above z 0.5, minus 0.03); outside_line = how far that point lies behind the straight line from the heel to the tail's root joint; lumbar = the contour above the dome apex: the second difference in x (it must bend back out toward the tail, >= 0)."""
    zs, xr = rear_contour(b)
    jump = np.where((np.abs(np.diff(xr)) > 0.15) & (zs[1:] > 0.5))[0]
    zt = float(zs[jump[0]]) if len(jump) else 0.9
    heel = float(np.nanmean(xr[(zs >= 0.02) & (zs <= 0.10)]))
    low = (zs >= 0.05) & (zs <= 0.25)
    sl = np.polyfit(zs[low], xr[low], 1)[0]
    ang = float(np.degrees(np.arctan(abs(sl))))
    ch = lambda z: float(np.interp(z, [0.20, 0.40], [np.interp(0.20, zs, xr), np.interp(0.40, zs, xr)]))
    tuck = float(max(np.interp(z, zs, xr) - ch(z) for z in (0.25, 0.275, 0.30)))
    dome = (zs >= 0.35) & (zs <= zt - 0.03)
    iz = int(np.nanargmin(np.where(dome, xr, 9.0)))
    rear_z, rear_x = float(zs[iz]), float(xr[iz])
    line_x = heel + (root[0] - heel) * (rear_z - 0.05) / (root[1] - 0.05)
    return dict(heel=heel, back_angle_deg=ang, tuck=tuck, rear_z=rear_z, rear_x=rear_x, behind_heel=heel - rear_x, outside_line=line_x - rear_x, tail_z=zt, x_at_025=float(np.interp(0.25, zs, xr)), x_at_030=float(np.interp(0.30, zs, xr)))
