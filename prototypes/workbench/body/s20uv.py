"""S20 UV islands (chunk 5): analytic, physical-unit coordinates for every part (1 unit = 1 H), their stretch and an atlas picture.
- loft (torso): u = side * arc length round the section from the FRONT line (face and belly mid-island), the seam on the back line; v = arc length up the side profile. The island is bulgy (as wide as the section), so stretch stays near 1.
- tail (centre tube): u = side * angle * ring radius from the dorsal ridge (the seam is the underside); v = arc length along the path.
- legs, ears (lateral tubes): u = angle * ring radius round the tube (seam at ring vertex 0, the inner side), v = arc length. The right side shares the left's island (mirrored).
- sitting domes (arm, nose, tip): u = angle * local ring radius, v = axial arc.
Stretch of a face = sigma_max / sigma_min of the 3D -> UV map; reported per island on the cage faces whose four corners belong to the face's own part (the bridge bands take their coordinates from the other part and are excluded and counted)."""
import math
import numpy as np

ATLAS = 2048
PX_PER_H = 400.0
ISLANDS = {   # name: (x0, y0) of the island's origin in atlas px (u = 0 line, v = 0 line)
    "torso": (1000, 80), "tail": (180, 1500), "leg.L": (700, 1500), "ear.L": (1250, 1500), "arm.L": (1700, 1500), "nose": (1700, 1800), "tail.tip": (1250, 1800)}


def _arc_front(G, z, a):
    """pi * integral from a to 1 of rho(z, t) dt (Simpson, 16 panels), the arc length from the front line."""
    z = np.asarray(z, float); a = np.asarray(a, float)
    n = 16
    t = a[:, None] + (1 - a)[:, None] * np.linspace(0, 1, n + 1)[None]
    r = G.rho(np.repeat(z[:, None], n + 1, 1), t)
    w = np.ones(n + 1); w[1:-1:2] = 4; w[2:-1:2] = 2
    return math.pi * (1 - a) / (3 * n) * (r * w).sum(1)


_MER = {}
UV_MODE = "prop"
UV_C = 0.7


def _merid(G):
    if id(G) not in _MER:
        zs = np.linspace(G.ends[0], G.ends[1], 600)
        r = np.array([float(G.rho(zz, 0.5)) for zz in zs])
        s = np.r_[0, np.cumsum(np.hypot(np.diff(zs), np.diff(r)))]
        _MER[id(G)] = (zs, s)
    return _MER[id(G)]


def torso_island(G, ctx, zmean):
    zs = ctx["spec"]["parts"]["torso"]["rings_z"]
    return "crown" if zmean >= zs[-1] - 1e-6 else ("seat" if zmean <= zs[0] + 1e-6 else "torso")


def _frames(ctx, pname):
    if pname in ("tail", "ear.L"):
        return ctx["info"]["tubes"][pname]["path"]
    if pname == "leg.L":
        return ctx["info"]["limbs"]["leg.L"]["path"]
    return None


def corner_psi(ctx, pname, V, attr):
    """Geometric ring angle of each vertex (so a subdivision average cannot wrap it): tubes from the path frame, domes from the dome's own axis frame."""
    pa = _frames(ctx, pname)
    if pa is not None:
        s = np.clip(attr[:, 1], 0, pa.length)
        pt, T, Nn, Bb = pa.at(s)
        ra, rf = pa.radii(s).T
        d = V - pt
        return np.arctan2((d * Bb).sum(1) / ra, (d * Nn).sum(1) / rf), s
    sit = ctx["info"]["sitting"][pname]
    d = V - np.asarray(sit["c"])
    return np.arctan2(d @ sit["lat"], d @ sit["up"]), np.clip(d @ np.asarray(sit["axis"]) / sit["r"][0], -1, 1)


def corner_uv(ctx, pname, V, attr, side):
    """(u, v) in H for the four (or n) corner vertices V of one face of part `pname`; `side` is +1 left, -1 right (decided by the face). Angles are unwrapped to the face's first corner."""
    G = ctx["T"]
    n = len(V)
    if pname in ("crown", "seat"):                  # the two caps are planar islands: u = x, v = y (both halves in one piece)
        return V[:, 0].copy(), V[:, 1].copy()
    if pname == "torso":
        a = np.arctan2(np.abs(V[:, 1]), -V[:, 0]) / math.pi
        z = np.clip(V[:, 2], G.ends[0] + 1e-6, G.ends[1] - 1e-6)
        zs, s = _merid(G)
        rho = G.rho(z, np.full(len(z), 0.5))
        return side * (1 - a) * math.pi * (UV_C * 0.5 + (1 - UV_C) * rho), np.interp(z, zs, s)
    psi, s = corner_psi(ctx, pname, V, attr)
    if pname in ("tail", "ear.L", "leg.L"):
        pa = _frames(ctx, pname)
        r = pa.radii(s).mean(1)
        if pname == "tail":
            return side * (math.pi / 2 - psi) * r, s
        psi = psi[0] + (psi - psi[0] + math.pi) % (2 * math.pi) - math.pi
        return psi * r, s
    sit = ctx["info"]["sitting"][pname]
    rr = 0.5 * (sit["r"][1] + sit["r"][2]) * np.sqrt(np.clip(1 - s * s, 0, 1))
    if pname == "nose" or pname == "tail.tip":          # half domes on the mirror plane: angle from the top, side by the face
        return side * (math.pi / 2 - psi) * rr, sit["r"][0] * np.arcsin(s)
    psi = psi[0] + (psi - psi[0] + math.pi) % (2 * math.pi) - math.pi
    return psi * rr, sit["r"][0] * np.arcsin(s)


def island_stretch_cage(b):
    """Per island: median / p95 / max stretch over the cage faces whose corners all belong to the face's own part, and the number of excluded bridge faces."""
    ctx = b.ctx
    V = b.cage.arr()
    attr = np.array([b.part, b.s, b.around, np.zeros(len(V))], float).T
    attr[:, 3] = [b.tag.get(i, 0.0) for i in range(len(V))]
    pn = {v: k for k, v in b.parts.items()}
    res = {}
    stats = {}
    for fi, f in enumerate(b.cage.F):
        name = pn[b.face_part[fi]]
        vs = list(f)
        own = all(b.part[v] == b.face_part[fi] for v in vs)
        st = stats.setdefault(name, dict(vals=[], bridge=0))
        if not own:
            st["bridge"] += 1
            continue
        P = V[vs]
        sd = 1.0 if P[:, 1].mean() >= 0 else -1.0
        if name in ("leg.L", "ear.L", "arm.L") and sd < 0:
            continue
        u, v = corner_uv(ctx, name, P, attr[vs], np.full(4, sd))
        # the face's two edge directions in 3D and in UV
        e3 = np.array([P[1] - P[0], P[3] - P[0]]); euv = np.array([[u[1] - u[0], v[1] - v[0]], [u[3] - u[0], v[3] - v[0]]])
        if abs(np.linalg.det(euv)) < 1e-10:
            continue
        J = np.linalg.solve(euv, e3)
        sv = np.linalg.svd(J, compute_uv=False)
        if sv[1] > 1e-9:
            st["vals"].append(sv[0] / sv[1])
    for k, st in stats.items():
        if st["vals"]:
            a = np.array(st["vals"])
            res[k] = dict(median=float(np.median(a)), p95=float(np.percentile(a, 95)), max=float(a.max()), faces=int(len(a)), bridge=st["bridge"])
    return res


def island_stretch_mesh(b, level=2):
    """The same on the subdivided mesh (smooth surface, the quads the coat is painted on): faces whose four vertices are all of the face's part."""
    import subdiv as SD
    ctx = b.ctx
    Vf, Ff, attr, fp, cr, mir = b.full()
    V2, F2, _, attr2, fp2 = SD.subdivide(Vf, Ff, cr, attr, fp, levels=level)
    F2 = np.array(F2, int)
    pn = {v: k for k, v in b.parts.items()}
    pid = np.rint(attr[:, 0]).astype(int)
    # a vertex's part at level 2: the part of the faces around it (majority)
    cnt = np.zeros((len(V2), len(b.parts) + 1))
    for k in range(4):
        np.add.at(cnt, (F2[:, k], fp2.astype(int)), 1.0)
    vpart = cnt.argmax(1)
    res = {}
    vals = {}
    for fi, f in enumerate(F2):
        pf = int(fp2[fi])
        if not all(vpart[v] == pf and cnt[v].max() == cnt[v].sum() for v in f):
            continue                              # a face on a part boundary
        name = pn[pf]
        P = V2[f]
        if (attr2[f][:, 3] > 0.01).any():
            continue                                  # toe beads
        if name == "torso":
            name = torso_island(ctx["T"], ctx, float(P[:, 2].mean()))
        elif name in ("tail", "ear.L", "leg.L"):
            pa = _frames(ctx, name)
            sm = attr2[f][:, 1]
            first = (ctx["info"]["tubes"][name] if name != "leg.L" else ctx["info"]["limbs"]["leg.L"])["first_s"]
            if sm.mean() > pa.length - 0.07 or sm.min() < first - 1e-6:
                continue                              # the pole cap and the bridge bands (their coordinates belong to the loft)
        elif name in ("arm.L", "nose", "tail.tip"):
            sm = attr2[f][:, 1]
            if np.abs(sm).max() > 0.8:
                continue                              # the pole fans
        sd = 1.0 if P[:, 1].mean() >= 0 else -1.0
        if name in ("leg.L", "ear.L", "arm.L") and sd < 0:
            continue
        u, v = corner_uv(ctx, name, P, attr2[f], np.full(4, sd))
        e3 = np.array([P[1] - P[0], P[3] - P[0]]); euv = np.array([[u[1] - u[0], v[1] - v[0]], [u[3] - u[0], v[3] - v[0]]])
        if abs(np.linalg.det(euv)) < 1e-12:
            continue
        J = np.linalg.solve(euv, e3)
        sv = np.linalg.svd(J, compute_uv=False)
        if sv[1] > 1e-9:
            vals.setdefault(name, []).append(sv[0] / sv[1])
    for k, a in vals.items():
        a = np.array(a)
        res[k] = dict(median=float(np.median(a)), p95=float(np.percentile(a, 95)), p99=float(np.percentile(a, 99)), max=float(a.max()), faces=int(len(a)))
    return res


PX = 380.0
ORIGIN = {"torso": (1000, 1230), "crown": (1850, 220), "seat": (1850, 640), "tail": (300, 1330), "leg.L": (650, 1330), "ear.L": (1330, 1330), "arm.L": (1750, 1330), "tail.tip": (1350, 1750), "nose": (1750, 1750)}


def atlas_mesh(ctx, parts, prep):
    """The level-3 faces as a flat mesh in atlas px (one vertex per face corner, so seams are real): returns (verts (m,3), faces, colours (m,3) linear, emission)."""
    V, F, attr, part, col, emit = prep["V0"], np.array(prep["F"], int), prep["attr"], prep["part"], prep["col"], prep["emit"]
    pn = {v: k for k, v in parts.items()}
    verts, faces, cols, ems = [], [], [], []
    for fi, f in enumerate(F):
        P = V[f]
        pf = np.bincount(part[f]).argmax()
        name = pn.get(int(pf), "torso")
        sd = 1.0 if P[:, 1].mean() >= 0 else -1.0
        if name in ("leg.L", "ear.L", "arm.L") and sd < 0:
            continue
        if name == "torso":
            name = torso_island(ctx["T"], ctx, float(P[:, 2].mean()))
        if name not in ORIGIN:
            continue
        try:
            u, v = corner_uv(ctx, name, P, attr[f], np.full(4, sd))
        except Exception:
            continue
        if name in ("leg.L", "ear.L", "arm.L"):
            pa = _frames(ctx, name)
            C = 2 * math.pi * (pa.radii(np.clip(attr[f][:, 1], 0, pa.length)).mean() if pa is not None else 0.12)
            if pa is None:
                sit = ctx["info"]["sitting"][name]; C = 2 * math.pi * 0.5 * (sit["r"][1] + sit["r"][2]) * 0.8
            u = u - np.floor(u.mean() / C) * C
        x0, y0 = ORIGIN[name]
        x = x0 + u * PX
        y = y0 - v * PX if name == "torso" else y0 + v * PX          # the loft reads head up; tubes run root (top) to tip
        base = len(verts)
        for k in range(4):
            verts.append((x[k], 2048.0 - y[k], 0.0)); cols.append(col[f[k]]); ems.append(emit[f[k]])
        faces.append((base, base + 1, base + 2, base + 3))
    return np.array(verts), faces, np.array(cols), np.array(ems)


def render_atlas(ctx, parts, prep, path, size=1400):
    import bpy, bpyio as B
    verts, faces, cols, ems = atlas_mesh(ctx, parts, prep)
    sc = B.reset()
    sc.render.film_transparent = False
    sc.cycles.samples = 1
    sc.render.resolution_x = sc.render.resolution_y = size
    me = bpy.data.meshes.new("uv")
    me.from_pydata([tuple(v) for v in verts], [], faces)
    me.update()
    ca = me.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
    ca.data.foreach_set("color", np.hstack([np.clip(cols + ems * 0.6, 0, 1), np.ones((len(cols), 1))]).ravel())
    m = bpy.data.materials.new("uvm"); m.use_nodes = True
    nt = m.node_tree
    for n_ in list(nt.nodes):
        nt.nodes.remove(n_)
    at = nt.nodes.new("ShaderNodeAttribute"); at.attribute_name = "Col"
    em = nt.nodes.new("ShaderNodeEmission")
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(at.outputs["Color"], em.inputs["Color"]); nt.links.new(em.outputs["Emission"], out.inputs["Surface"])
    me.materials.append(m)
    ob = bpy.data.objects.new("uv", me); sc.collection.objects.link(ob)
    w = bpy.data.worlds.new("w"); w.use_nodes = True
    w.node_tree.nodes["Background"].inputs["Color"].default_value = (0.84, 0.83, 0.80, 1); w.node_tree.nodes["Background"].inputs["Strength"].default_value = 1.0
    sc.world = w
    cam = bpy.data.cameras.new("c"); cam.type = "ORTHO"; cam.ortho_scale = 2048.0
    co = bpy.data.objects.new("c", cam); sc.collection.objects.link(co); sc.camera = co
    co.location = (1024.0, 1024.0, 10.0); co.rotation_euler = (0, 0, 0)         # looking down -Z; the mesh's y is flipped so the atlas reads top-down
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
