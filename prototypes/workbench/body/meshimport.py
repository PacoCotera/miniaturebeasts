"""`wb mesh import`: a cleaned sculpt becomes a signed mesh source (Blender).
The sculpt is turned to the studio's axes (the creature faces +x, its left is +y, feet on z 0) and scaled to H; the family armature is fitted from the mesh (the four feet are the clusters of the lowest vertices, the spine bones sit on the length
of the body, the socket sits on the head's height profile); Blender's automatic weights are given the family's rules (a leg's weight fades out above its top, a sole is rigid on its paw bone); the GLB is written with no material, no colour or normal
texture and the zone map as an index image; the sidecar pins the sha256 and names the stations, bands, the stand match and the provenance. Nothing is rewritten: a new import is a new version."""
import json
import math
import os
import shutil
import sys
import tempfile

import numpy as np

BODY = os.path.dirname(os.path.abspath(__file__))
if BODY not in sys.path:
    sys.path.insert(0, BODY)
import meshsource as MS

LEG_TOP = 0.32          # a leg's top as a share of the standing height
KNEE, ANKLE = 0.20, 0.09
SOLE = 0.045            # the rigid sole: below this share of the height a leg's vertices are on the paw bone alone
SOCKETS = {"crest": dict(layout="fan", mirror=False)}


def _bpy():
    import bpy
    return bpy


def to_studio(V, rot_z_deg, scale):
    a = math.radians(rot_z_deg)
    R = np.array([[math.cos(a), -math.sin(a), 0], [math.sin(a), math.cos(a), 0], [0, 0, 1.0]])
    return (np.asarray(V, float) @ R.T) * scale, R


def feet_of(V, n=4):
    """The centres of the n lowest blobs: k-means on the vertices in the bottom 6 % of the height."""
    H = V[:, 2].max()
    P = V[V[:, 2] < 0.06 * H][:, :2]
    rng = np.random.default_rng(0)
    C = P[rng.choice(len(P), n, replace=False)]
    for _ in range(60):
        lab = np.argmin(((P[:, None] - C[None]) ** 2).sum(2), 1)
        C = np.array([P[lab == k].mean(0) if (lab == k).any() else C[k] for k in range(n)])
    return C


def fit(V, family="trotter", sockets=("crest",)):
    """The armature of a sculpt in studio axes: {bone: (head, tail, parent)} and the stations that come from the mesh alone (feet, sockets, measures)."""
    H = float(V[:, 2].max())
    x0, x1 = float(V[:, 0].min()), float(V[:, 0].max())
    L = x1 - x0
    mid = V[(V[:, 0] > x0 + 0.3 * L) & (V[:, 0] < x0 + 0.7 * L)]
    zb = float(np.median(mid[:, 2]))
    xf = lambda f: x0 + f * L
    P = lambda x, y, z: np.array([x, y, z], float)
    bones = {}
    bones["rear"] = (P(xf(0.15), 0, zb), P(xf(0.45), 0, zb), None)
    bones["front"] = (P(xf(0.45), 0, zb), P(xf(0.63), 0, zb), "rear")
    bones["head"] = (P(xf(0.62), 0, zb + 0.06 * H), P(x1 - 0.01 * L, 0, zb + 0.14 * H), "front")
    F = feet_of(V)
    order = F[np.lexsort((F[:, 1], F[:, 0]))]               # by x then y: the hind pair, then the fore pair
    hind, fore = order[:2], order[2:]
    feet = {}
    for kind, pair in (("hind", hind), ("fore", fore)):
        for p in sorted(pair, key=lambda q: -q[1]):
            side = "L" if p[1] > 0 else "R"
            parent = "rear" if kind == "hind" else "front"
            fx, fy = float(p[0]), float(p[1])
            top, knee, ankle = LEG_TOP * H, KNEE * H, ANKLE * H
            bones[f"{kind}.upper.{side}"] = (P(fx, fy, top), P(fx, fy, knee), parent)
            bones[f"{kind}.lower.{side}"] = (P(fx, fy, knee), P(fx, fy, ankle), f"{kind}.upper.{side}")
            bones[f"{kind}.paw.{side}"] = (P(fx, fy, ankle), P(fx, fy, 0.0), f"{kind}.lower.{side}")
            feet[f"foot.{kind}.{side}"] = [fx, fy, 0.0]
    # the socket: the head's top, from the height profile (the highest vertices of the head's length)
    hz = V[V[:, 0] > xf(0.55)]
    top = hz[hz[:, 2] > hz[:, 2].max() - 0.04 * H]
    crown = np.array([float(top[:, 0].mean()), 0.0, float(hz[:, 2].max())])
    soc = {}
    for s in sockets:
        bones[f"socket.{s}"] = (crown - P(0, 0, 0.02 * H), crown + P(0, 0, 0.3 * H), "head")
        soc[s] = crown
    return bones, dict(feet=feet, crown=crown, height=H, length=L, x0=x0, x1=x1, axis_z=zb), soc


def weights_rules(V, bones, W, names, H):
    """The family's weight rules on automatic weights W (n, bones): a leg's weight fades out above its top into its parent; below SOLE a leg vertex is on the paw bone alone."""
    ix = {n: i for i, n in enumerate(names)}
    W = W.copy()
    for n in names:
        if ".upper." in n or ".lower." in n or ".paw." in n:
            kind = n.split(".")[0]
            side = n.split(".")[2]
            par = bones[f"{kind}.upper.{side}"][2]
            k = np.clip((LEG_TOP * H - V[:, 2]) / (0.08 * H), 0, 1)
            moved = W[:, ix[n]] * (1 - k)
            W[:, ix[par]] += moved
            W[:, ix[n]] *= k
    for kind in ("fore", "hind"):
        for side in ("L", "R"):
            paw = f"{kind}.paw.{side}"
            a, b = bones[paw][0], bones[paw][1]
            near = (np.hypot(V[:, 0] - a[0], V[:, 1] - a[1]) < 0.16 * H) & (V[:, 2] < SOLE * H)
            for n in names:
                if n != paw and n.startswith(f"{kind}.") and n.endswith("." + side):
                    W[near, ix[n]] = 0
            W[near, ix[paw]] = 1.0
    none = W.sum(1) < 1e-6                                   # a vertex automatic weights left out: the spine bone of its place
    if none.any():
        x0, x1 = V[:, 0].min(), V[:, 0].max()
        f = (V[none, 0] - x0) / max(x1 - x0, 1e-9)
        W[np.where(none)[0], np.where(f < 0.45, ix["rear"], np.where(f < 0.7, ix["front"], ix["head"]))] = 1.0
    s = W.sum(1, keepdims=True)
    return W / np.maximum(s, 1e-9)


def write_png_gray(path, img):
    from wb import pngio
    pngio.write(path, img.astype(np.uint8))


def import_sculpt(src, species_id, family, version, out_dir, obj, rot_z=0.0, scale=1.0, albedo=None, eyes=None, mouth_z=None, eye_size=None, stand=None, stand_view=None, provenance=None,
                  sockets=("crest",), log=print):
    """Import the object `obj` of the GLB or blend `src`. Returns the sidecar dict (written next to the GLB in out_dir)."""
    bpy = _bpy()
    from mathutils import Vector
    os.makedirs(out_dir, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    if src.endswith(".blend"):
        bpy.ops.wm.open_mainfile(filepath=src)
    else:
        bpy.ops.import_scene.gltf(filepath=src)
    ob = bpy.data.objects[obj]
    me = ob.data
    mw = ob.matrix_world.copy()
    me.transform(mw)
    ob.parent = None
    ob.matrix_world = ob.matrix_world.__class__.Identity(4)
    for o in list(bpy.data.objects):
        if o != ob:
            bpy.data.objects.remove(o)
    ob.vertex_groups.clear()
    for m in list(ob.modifiers):
        ob.modifiers.remove(m)
    me.materials.clear()
    V0 = np.array([v.co[:] for v in me.vertices])
    V, R = to_studio(V0, rot_z, scale)
    V[:, 2] -= V[:, 2].min()
    for v, p in zip(me.vertices, V):
        v.co = Vector(p.tolist())
    me.update()
    bones, meas, soc = fit(V, family, sockets)
    H = meas["height"]
    names = list(bones)
    # the armature
    ad = bpy.data.armatures.new("rig")
    arm = bpy.data.objects.new("rig", ad)
    bpy.context.scene.collection.objects.link(arm)
    bpy.context.view_layer.objects.active = arm
    arm.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    for n in names:
        h, t, par = bones[n]
        b = ad.edit_bones.new(n)
        b.head, b.tail = Vector(h.tolist()), Vector(t.tolist())
        if par:
            b.parent = ad.edit_bones[par]
        b.use_connect = False
    bpy.ops.object.mode_set(mode="OBJECT")
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.parent_set(type="ARMATURE_AUTO")
    gi = {g.index: g.name for g in ob.vertex_groups}
    W = np.zeros((len(V), len(names)))
    for v in me.vertices:
        for e in v.groups:
            if gi[e.group] in names:
                W[v.index, names.index(gi[e.group])] = e.weight
    empty = int((W.sum(1) < 1e-6).sum())
    W = weights_rules(V, bones, W, names, H)
    for g in list(ob.vertex_groups):
        ob.vertex_groups.remove(g)
    vg = {n: ob.vertex_groups.new(name=n) for n in names}
    for i in range(len(V)):
        for k in np.where(W[i] > 1e-3)[0]:
            vg[names[k]].add([i], float(W[i, k]), "REPLACE")
    # the GLB
    glb = os.path.join(out_dir, f"{species_id}-m{version}.glb")
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    arm.select_set(True)
    bpy.ops.export_scene.gltf(filepath=glb, use_selection=True, export_format="GLB", export_materials="NONE", export_image_format="NONE", export_normals=True, export_texcoords=True, export_skins=True,
                              export_animations=False, export_apply=False, export_yup=True, export_extras=False)
    # the zone map from the painted albedo (UV space)
    uv = np.array([l.uv[:] for l in me.uv_layers[0].data]) if me.uv_layers else None
    zinfo = None
    if albedo and uv is not None:
        tri = np.array([p.vertices[:] for p in me.polygons])
        loops = np.array([p.loop_indices[:] for p in me.polygons])
        uvf = uv[loops]                                           # (faces, 3, 2)
        Z = _zone_from(albedo, uvf, V[tri], H)
        tmp = os.path.join(tempfile.mkdtemp(), "z.png")
        write_png_gray(tmp, Z)
        MS.add_zone_map(glb, open(tmp, "rb").read(), dict(size=int(Z.shape[0]), values={"0": "coat", "1": "cream", "2": "toe pad", "3": "eye ring", "4": "eye disc"}, source="uv index image"))
        shutil.rmtree(os.path.dirname(tmp))
        zinfo = dict(size=int(Z.shape[0]), shares={k: round(float((Z == i).mean()), 4) for i, k in enumerate(("coat", "cream", "toe pad", "eye ring", "eye disc"))})
    # the stations
    G = MS.Glb(glb)
    Vg, Fg, _ = G.triangles()
    T = Vg[Fg]
    st = dict(eyes=[], mouth=None, sockets=[], feet=[dict(id=k, point=[round(float(x), 5) for x in v]) for k, v in meas["feet"].items()])
    if eyes:
        for k, (p, n) in enumerate(eyes):
            pp, _ = to_studio(np.array(p), rot_z, scale)
            nn = R @ np.array(n)
            nn /= np.linalg.norm(nn)
            pp[2] -= V0[:, 2].min() * scale
            st["eyes"].append(dict(id=f"eye.{'L' if pp[1] > 0 else 'R'}", point=[round(float(x), 5) for x in pp], normal=[round(float(x), 5) for x in nn], radius=None))
    head_w = _head_width(Vg, st, meas)
    if eye_size is not None:
        for e in st["eyes"]:
            e["radius"] = round(float(eye_size) * head_w / 2, 5)
    if mouth_z is not None:
        hit = _ray_front(T, mouth_z * scale)
        if hit is not None:
            span = 2 * abs(st["eyes"][0]["point"][1]) if st["eyes"] else head_w
            st["mouth"] = dict(point=[round(float(x), 5) for x in hit[0]], normal=[round(float(x), 5) for x in hit[1]], width=round(0.35 * span, 5))
    for s in sockets:
        c = soc[s]
        st["sockets"].append(dict(id=s, bone=f"socket.{s}", point=[round(float(x), 5) for x in c], frame=dict(up=[0, 0, 1], forward=[1, 0, 0]), layout=SOCKETS[s]["layout"], mirror=SOCKETS[s]["mirror"]))
    tris = len(Fg)
    nz = W[:, names.index("head")].sum() / len(V)
    bands = dict(standing_height=round(H, 5), length=round(meas["length"], 5), head_width=round(head_w, 5), leg_length=round(LEG_TOP * H, 5), leg_share=round(LEG_TOP, 4), head_share=round(float(nz), 4), axis_z=round(meas["axis_z"], 5))
    sc = dict(schema=MS.SCHEMA_MESH, id=f"{species_id}-m{version}", species=species_id, version=version,
              glb=dict(file=os.path.basename(glb), sha256=MS.sha256_file(glb), bytes=os.path.getsize(glb), triangles=int(tris)),
              family=family, armature=dict(version=MS.ARMATURES[family]["version"], bones=names, tail=False, auto_weights_empty=empty), zones=zinfo,
              stations=st, bands=bands, scale=dict(to_H=scale, rot_z=rot_z), read=dict(stand={}, view=stand_view, scores={}), provenance=provenance or {})
    if stand:
        sc["read"]["stand"] = stand
    MS.write_json(os.path.join(out_dir, f"{species_id}-m{version}.json"), sc)
    log(f"{species_id}-m{version}: {tris} triangles, {os.path.getsize(glb)} bytes, {len(names)} bones, {empty} vertices without automatic weights")
    return sc


def _zone_from(albedo, uvf, Vf, H, size=1024):
    from wb import pngio
    a = pngio.read(albedo)[..., :3].astype(float)
    step = a.shape[0] // size
    a = a[::step, ::step][:size, :size]
    pal = np.array([(48, 42, 49), (234, 210, 174), (210, 178, 138), (194, 123, 51), (116, 67, 26), (22, 16, 14), (255, 248, 238)], float)
    cls = np.array([0, 1, 3, 4, 4, 4, 4])
    z = cls[np.argmin(((a[:, :, None, :] - pal[None, None]) ** 2).sum(3), 2)].astype(np.uint8)
    low = np.zeros((size, size), bool)
    for q, v in zip(uvf, Vf):
        if v[:, 2].mean() < 0.075 * H:
            xs, ys = q[:, 0] * size, (1 - q[:, 1]) * size
            low[int(max(ys.min() - 1, 0)):int(min(ys.max() + 1, size - 1)) + 1, int(max(xs.min() - 1, 0)):int(min(xs.max() + 1, size - 1)) + 1] = True
    z[(z == 1) & low] = 2
    return z


def _head_width(V, st, meas):
    z = st["eyes"][0]["point"][2] if st["eyes"] else meas["axis_z"] + 0.1 * meas["height"]
    sel = V[(V[:, 0] > meas["x0"] + 0.62 * meas["length"]) & (abs(V[:, 2] - z) < 0.06 * meas["height"])]
    return float(sel[:, 1].max() - sel[:, 1].min()) if len(sel) else 0.5


def _ray_front(T, z):
    """The first hit of a ray along -x at height z on the midline: (point, normal)."""
    O = np.array([T[..., 0].max() + 1.0, 0.0, z])
    d = np.array([-1.0, 0, 0])
    E1, E2 = T[:, 1] - T[:, 0], T[:, 2] - T[:, 0]
    h = np.cross(d, E2)
    det = np.einsum("ij,ij->i", E1, h)
    ok = np.abs(det) > 1e-12
    f = np.where(ok, 1 / np.where(ok, det, 1), 0)
    s = O - T[:, 0]
    u = f * np.einsum("ij,ij->i", s, h)
    q = np.cross(s, E1)
    v = f * (q @ d)
    t = f * np.einsum("ij,ij->i", E2, q)
    hit = ok & (u >= 0) & (v >= 0) & (u + v <= 1) & (t > 0)
    if not hit.any():
        return None
    k = np.where(hit)[0][np.argmin(t[hit])]
    n = np.cross(E1[k], E2[k])
    n /= np.linalg.norm(n)
    if n @ d > 0:
        n = -n
    return O + d * t[k], n


def export_part(src, obj, part_id, version, out_dir, length_axis=2, sidecar=None, log=print):
    """A part GLB from one object of `src`: its mesh in its own frame (root at the origin), scaled to unit length along `length_axis`, no material, UVs kept. Returns the GLB path."""
    bpy = _bpy()
    from mathutils import Vector
    os.makedirs(out_dir, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=src)
    ob = bpy.data.objects[obj]
    me = ob.data
    V = np.array([v.co[:] for v in me.vertices])
    s = 1.0 / (V[:, length_axis].max() - V[:, length_axis].min())
    for v in me.vertices:
        v.co = Vector((np.array(v.co[:]) * s).tolist())
    me.update()
    me.materials.clear()
    ob.parent = None
    ob.matrix_world = ob.matrix_world.__class__.Identity(4)
    for o in list(bpy.data.objects):
        if o != ob:
            bpy.data.objects.remove(o)
    glb = os.path.join(out_dir, f"{part_id}-p{version}.glb")
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.export_scene.gltf(filepath=glb, use_selection=True, export_format="GLB", export_materials="NONE", export_image_format="NONE", export_normals=True, export_texcoords=True, export_skins=False,
                              export_animations=False, export_yup=True, export_extras=False)
    return glb, float(s)


def main(argv=None):
    import argparse
    ap = argparse.ArgumentParser(prog="wb mesh import")
    ap.add_argument("src")
    ap.add_argument("--species", required=True)
    ap.add_argument("--family", default="trotter")
    ap.add_argument("--object", required=True)
    ap.add_argument("--version", type=int, default=1)
    ap.add_argument("--out", default="")
    ap.add_argument("--scale", type=float, default=1.0)
    ap.add_argument("--rot-z", type=float, default=0.0)
    ap.add_argument("--albedo", default="")
    ap.add_argument("--provenance", default="")
    a = ap.parse_args(argv)
    out = a.out or MS.mesh_dir_of(a.species)
    prov = json.load(open(a.provenance)) if a.provenance else {}
    import_sculpt(a.src, a.species, a.family, a.version, out, a.object, rot_z=a.rot_z, scale=a.scale, albedo=a.albedo or None, provenance=prov)
    return 0


if __name__ == "__main__":
    sys.exit(main())


def record_scores(species_path):
    """Write the silhouette match of the built kind into its sculpt's sidecar (`read.scores`): the numbers mesh.read repeats on every run."""
    from checks import mesh as CM
    doc = json.load(open(species_path))
    sc_path = MS.abspath(doc["mesh"]["source"])
    sc = MS.load_json(sc_path)
    sc["read"]["scores"] = {k: round(v, 3) for k, v in CM.read_scores(doc).items()}
    MS.write_json(sc_path, sc)
    return sc["read"]["scores"]
