"""The mesh body checks (chunk 30): what a sculpt must be before the studio builds a kind from it. Eight checks on a file that has a `mesh` block, all stage `file` (they read the sculpt's own files):
mesh.watertight (no hole, no edge shared by three faces), mesh.budget (12000-20000 triangles), mesh.parts (the body is one piece; signature units and parts are library files), mesh.relief (no groove, ridge or raised ring: the surface against a smoothed copy of itself),
mesh.flat (no colour or normal texture in the source: colour comes from the coat painter), mesh.size (3 MB), mesh.stamp (the sha256 of the GLB and of each part is the one the file pins) and mesh.read (the silhouette against the stand at 304, 96 and 48; amber below 0.82).
They judge a mesh file only; a cage file is never asked. An anchor's signed record for ONE of them turns its red into amber (checks/face.verdict), as for every check.
The names and fail lines are OWED to the copywriter."""
import os

import numpy as np

import meshsource as MS
from . import check, row
from . import proof as PR
from .biped import R, f2
from .face import _band, verdict

READ_MIN = 0.82                    # the silhouette match below which the check is amber (the art desk's stand-view bar)
SIZES = {"304": (304, 312, 95.0), "96": (96, 88, 30.0), "48": (48, 48, 15.0)}
MESH_CHECKS = ("mesh.watertight", "mesh.budget", "mesh.parts", "mesh.relief", "mesh.flat", "mesh.size", "mesh.stamp", "mesh.read")


def _doc(ctx):
    return ctx.doc if isinstance(ctx.doc, dict) else {}


def _cache(ctx):
    return ctx.__dict__.setdefault("_mesh", {})


def sculpt(ctx):
    """The file's sculpt read once per Ctx, or the error that stopped it."""
    d = _cache(ctx)
    if "m" not in d:
        try:
            d["m"] = MS.Mesh(_doc(ctx)["mesh"]["source"])
        except Exception as e:                                      # noqa: BLE001
            d["m"] = e
    if isinstance(d["m"], Exception):
        raise RuntimeError(f"the sculpt cannot be read: {type(d['m']).__name__}: {d['m']}")
    return d["m"]


def welded(ctx):
    d = _cache(ctx)
    if "w" not in d:
        m = sculpt(ctx)
        d["w"] = MS.weld(m.V, m.F)
    return d["w"]


def _frame(ctx):
    d = _cache(ctx)
    if "frame" not in d:
        try:
            import meshbody as MB
            d["frame"] = MB.frame(_doc(ctx))
        except Exception:                                           # noqa: BLE001
            d["frame"] = None
    return d["frame"]


def _proof(ctx, points, color, lines=(), bars=(), az=32):
    """A ring on the clay at each fault point, then the panel."""
    fr = _frame(ctx)
    rings = ""
    if fr and len(points):
        P = PR.projector(az, 10.0, centre=fr["centre"], ppH=PR.PPH * float(fr["scale"]))
        for p in list(points)[:6]:
            x, y = P(np.asarray(p, float))[0]
            rings += PR.ring(x, y, 36, color, 4)
    return dict(mode="clay", az=az, svg=rings + _band(lines=lines, bars=bars))


def _bad(ctx, cid, why, extra=None):
    return row("fail", None, None, why, None, extra)


# ------------------------------------------------------------------------------------------------------------------------------------------------------ 1 mesh.watertight
@check(id="mesh.watertight", name="Watertight body", fail="The sculpt has a hole or a torn edge", stage="file", version=1, part=["body"], fields=["mesh.source"],
       rule=R("2026-11-06 12:00", "The mesh body is one watertight piece: every edge is shared by exactly two faces, so the surface has no hole, and the armature and the coat can be fitted to it."),
       limit=dict(text="0 boundary edges, 0 edges on three or more faces", value=0), az=32)
def c_watertight(ctx):
    V, F = welded(ctx)
    boundary, nonman, _ = MS.topology(F, len(V))
    bad = boundary > 0 or nonman > 0
    pts = []
    if bad:
        E = np.sort(np.vstack([F[:, [0, 1]], F[:, [1, 2]], F[:, [2, 0]]]), axis=1)
        u, cnt = np.unique(E, axis=0, return_counts=True)
        e = u[cnt != 2]
        pts = [V[e].mean(1).mean(0)] if len(e) else []
    why = f"{boundary} open edges and {nonman} edges on three or more faces" if bad else "Closed: every edge has two faces"
    return verdict(ctx, "mesh.watertight", bad, boundary + nonman, 0, why, _proof(ctx, pts, PR.RED if bad else PR.SAGE, bars=[("Torn edges", str(boundary + nonman), min(1.0, (boundary + nonman) / 20), PR.RED if bad else PR.SAGE, 0.0, "none")]), dict(boundary=boundary, nonmanifold=nonman))


# ------------------------------------------------------------------------------------------------------------------------------------------------------ 2 mesh.budget
@check(id="mesh.budget", name="Triangle budget", fail="The sculpt has {n} triangles, outside the budget", stage="file", version=1, part=["body"], fields=["mesh.source"],
       rule=R("2026-11-06 12:00", "A body sculpt is 12,000 to 20,000 triangles: enough for a smooth silhouette at 304, small enough to rig and ship."),
       limit=dict(text="12,000 to 20,000 triangles", value=list(MS.BUDGET)), az=32)
def c_budget(ctx):
    m = sculpt(ctx)
    n = len(m.F)
    lo, hi = MS.BUDGET
    bad = not (lo <= n <= hi)
    why = f"{n:,} triangles, the budget is {lo:,} to {hi:,}" if bad else f"{n:,} triangles, inside {lo:,} to {hi:,}"
    return verdict(ctx, "mesh.budget", bad, n, [lo, hi], why, _proof(ctx, [], PR.RED if bad else PR.SAGE, bars=[("Triangles", f"{n:,}", n / 24000.0, PR.RED if bad else PR.SAGE, hi / 24000.0, f"at most {hi:,}")]), dict(triangles=n))


# ------------------------------------------------------------------------------------------------------------------------------------------------------ 3 mesh.parts
@check(id="mesh.parts", name="One piece", fail="The sculpt is more than one piece", stage="file", version=1, part=["body"], fields=["mesh.source", "mesh.parts"],
       rule=R("2026-11-06 12:00", "The body GLB holds the body in one piece. A signature unit, a wing, a fin or a tail the sculpt did not have is a library part on its socket, never a piece of the body file; a sculpt that grows a tail the stand does not show is refused."),
       limit=dict(text="one mesh, one connected piece", value=1), az=32)
def c_parts(ctx):
    m = sculpt(ctx)
    V, F = welded(ctx)
    _, _, pieces = MS.topology(F, len(V))
    meshes = len(m.glb.json.get("meshes", []))
    prims = len(m.glb.primitives())
    n = max(pieces, meshes, prims)
    bad = n != 1
    pts = []
    if pieces > 1:
        import collections
        par = np.arange(len(V))

        def find(a):
            while par[a] != a:
                par[a] = par[par[a]]
                a = par[a]
            return a
        for a, b in {tuple(sorted(e)) for e in np.vstack([F[:, [0, 1]], F[:, [1, 2]], F[:, [2, 0]]]).tolist()}:
            ra, rb = find(a), find(b)
            if ra != rb:
                par[ra] = rb
        groups = collections.defaultdict(list)
        for i in np.unique(F):
            groups[find(int(i))].append(int(i))
        small = sorted(groups.values(), key=len)[:-1]
        pts = [V[g].mean(0) for g in small]
    why = f"{pieces} connected pieces in {prims} mesh{'es' if prims != 1 else ''}: the body file is one piece" if bad else "One mesh, one piece"
    return verdict(ctx, "mesh.parts", bad, n, 1, why, _proof(ctx, pts, PR.RED if bad else PR.SAGE, lines=[(f"Pieces {pieces}, meshes {prims}", PR.RED if bad else PR.INK)]), dict(pieces=pieces, meshes=prims))


# ------------------------------------------------------------------------------------------------------------------------------------------------------ 4 mesh.relief
@check(id="mesh.relief", name="Smooth surface", fail="The sculpt carries a groove, ridge or ring", stage="file", version=1, part=["body"], fields=["mesh.source"],
       rule=R("2026-11-06 12:00", "The sculpt is smooth: no carved stripes, grooves, ridges or raised rings. Pile and pattern come from the material and the coat painter, so any relief in the source would be drawn twice."),
       limit=dict(text=f"no run of relief longer than {MS.LINE_MIN} H and {MS.LINE_ASPECT:g} times longer than wide, and no raised ring (the surface against a smoothed copy of itself, {MS.RELIEF_THR} H)", value=0), az=32)
def c_relief(ctx):
    d = _cache(ctx)
    if "feat" not in d:
        m = sculpt(ctx)
        d["feat"] = MS.relief_features(m.V, m.F)
    feat = d["feat"]
    bad = bool(feat)
    top = feat[0] if feat else None
    pts = [np.array(f["centre"]) for f in feat[:3]]
    why = f"A {top['kind']} {top['length']:.2f} H long and {top['width']:.2f} H wide stands more than {MS.RELIEF_THR} H off the smoothed surface" if bad else f"No groove, ridge or ring over {MS.RELIEF_THR} H"
    L = top["length"] if top else 0.0
    return verdict(ctx, "mesh.relief", bad, f2(L), MS.LINE_MIN, why, _proof(ctx, pts, PR.RED if bad else PR.SAGE, bars=[("Longest groove or ring", f"{L:.2f} H", L / (MS.LINE_MIN * 2), PR.RED if bad else PR.SAGE, 0.5, f"under {MS.LINE_MIN} H")]), dict(features=feat[:5]))


# ------------------------------------------------------------------------------------------------------------------------------------------------------ 5 mesh.flat
@check(id="mesh.flat", name="No baked colour", fail="The sculpt carries a colour or normal texture", stage="file", version=1, part=["body"], fields=["mesh.source"],
       rule=R("2026-11-06 12:00", "The source has no colour texture and no normal map. Colour comes from the coat painter and the pile from the material library; the one image in the file is the zone map."),
       limit=dict(text="no colour, normal, emissive or metal-rough texture; no image but the zone map", value=0), az=32)
def c_flat(ctx):
    m = sculpt(ctx)
    bad_list = m.glb.flat_faults()
    bad = bool(bad_list)
    why = ("Baked: " + "; ".join(bad_list)) if bad else "No colour or normal texture"
    return verdict(ctx, "mesh.flat", bad, len(bad_list), 0, why, _proof(ctx, [], PR.RED if bad else PR.SAGE, lines=[((bad_list[0] if bad else "No texture on any material"), PR.RED if bad else PR.INK)]), dict(faults=bad_list))


# ------------------------------------------------------------------------------------------------------------------------------------------------------ 6 mesh.size
@check(id="mesh.size", name="File size", fail="The sculpt file is too big", stage="file", version=1, part=["body"], fields=["mesh.source"],
       rule=R("2026-11-06 12:00", "A body GLB is at most 3 MB and a part at most 1 MB: the repository holds signed sources, never raw generations."),
       limit=dict(text="body at most 3 MB, a part at most 1 MB", value=MS.MAX_BYTES), az=32)
def c_size(ctx):
    m = sculpt(ctx)
    n = os.path.getsize(m.glb_path)
    bad_parts = []
    for pe in _doc(ctx)["mesh"].get("parts", []):
        sc = MS.load_json(pe["part"])
        pb = os.path.getsize(os.path.join(os.path.dirname(MS.abspath(pe["part"])), sc["glb"]["file"]))
        if pb > MS.MAX_PART_BYTES:
            bad_parts.append(f"{sc['id']} {pb / 1048576:.2f} MB")
    bad = n > MS.MAX_BYTES or bool(bad_parts)
    why = (f"{n / 1048576:.2f} MB, the limit is 3 MB" if n > MS.MAX_BYTES else "Part over 1 MB: " + ", ".join(bad_parts)) if bad else f"{n / 1048576:.2f} MB, inside 3 MB"
    return verdict(ctx, "mesh.size", bad, round(n / 1048576, 3), 3, why, _proof(ctx, [], PR.RED if bad else PR.SAGE, bars=[("File", f"{n / 1048576:.2f} MB", n / (6 * 1048576.0), PR.RED if bad else PR.SAGE, 0.5, "at most 3 MB")]), dict(bytes=n))


# ------------------------------------------------------------------------------------------------------------------------------------------------------ 7 mesh.stamp
@check(id="mesh.stamp", name="Pinned sculpt", fail="The sculpt is not the one the file pins", stage="file", version=1, part=["body"], fields=["mesh.source", "mesh.sha256", "mesh.parts"],
       rule=R("2026-11-06 12:00", "The species file pins the sha256 of its sculpt and of each part. A changed sculpt is a changed file: it voids the Gate's signature and retakes the goldens, with the change named."),
       limit=dict(text="the GLB's sha256 equals the sidecar's and the file's pin, for the body and each part", value=None), az=32)
def c_stamp(ctx):
    m = sculpt(ctx)
    doc = _doc(ctx)["mesh"]
    got = m.sha
    probs = []
    if got != doc.get("sha256"):
        probs.append(f"the file pins {str(doc.get('sha256'))[:8]}, the sculpt is {got[:8]}")
    if got != m.sc["glb"]["sha256"]:
        probs.append(f"the sidecar names {m.sc['glb']['sha256'][:8]}, the sculpt is {got[:8]}")
    if os.path.getsize(m.glb_path) != m.sc["glb"]["bytes"]:
        probs.append("the sidecar's size is not the file's")
    for pe in doc.get("parts", []):
        sc = MS.load_json(pe["part"])
        g = MS.sha256_file(os.path.join(os.path.dirname(MS.abspath(pe["part"])), sc["glb"]["file"]))
        if g != pe.get("sha256") or g != sc["glb"]["sha256"]:
            probs.append(f"part {sc['id']}: the pin, the sidecar and the file are not the same sha")
    bad = bool(probs)
    why = "; ".join(probs) if bad else f"{m.sc['id']} {got[:8]}: the pin, the sidecar and the file agree"
    return verdict(ctx, "mesh.stamp", bad, len(probs), 0, why, _proof(ctx, [], PR.RED if bad else PR.SAGE, lines=[(probs[0] if bad else f"sha {got[:16]}", PR.RED if bad else PR.INK)]), dict(sha=got))


# ------------------------------------------------------------------------------------------------------------------------------------------------------ 8 mesh.read
def read_scores(doc, body=None, sizes=SIZES):
    """The silhouette match of the built body (with its parts) against the stand at each size: {size: IoU of the two masks fitted to their bounding boxes}."""
    import meshbody as MB
    from wb import pngio
    b = body or MB.MeshBody(doc)
    m = b.mesh
    rd = m.sc["read"]
    stand = rd.get("stand") or {}
    fr = MB.frame(doc)
    T = b.tris()
    out = {}
    for k, (w, h, ppH) in sizes.items():
        path = os.path.join(m.dir, (stand.get("files") or {}).get(k, ""))
        if not os.path.isfile(path):
            continue
        st = pngio.read(path)[..., 3] > 200
        mk = MS.silhouette(T, float(rd["view"]["az"]), float(rd["view"]["el"]), (w, h), ppH * float(fr["scale"]), np.array(fr["centre"], float))
        out[k] = MS.iou(MS.bbox_norm(mk), MS.bbox_norm(st))
    return out


@check(id="mesh.read", name="Reads as the stand", fail="The silhouette drifts from the stand", stage="file", version=1, part=["body"], fields=["mesh.source"],
       rule=R("2026-11-06 12:00", "The built kind reads as its stand: the silhouette of the sculpt with its parts, seen from the stand's view at 304, 96 and 48, matches the stand's. Below 0.82 at any size the check is amber."),
       limit=dict(text=f"silhouette match at least {READ_MIN} at 304, 96 and 48", value=READ_MIN), az=32)
def c_read(ctx):
    d = _cache(ctx)
    if "scores" not in d:
        d["scores"] = read_scores({k: v for k, v in _doc(ctx).items() if k not in ("rig", "keys")})              # the stand is the type: an individual's proportions are its genome's, not the sculpt's
    sc = d["scores"]
    if not sc:
        return row("pass", None, READ_MIN, "No stand files named in the sidecar: nothing to match against")
    worst = min(sc.values())
    low = worst < READ_MIN - 1e-9
    txt = ", ".join(f"{k} {v:.3f}" for k, v in sc.items())
    why = f"Silhouette match {txt}; amber below {READ_MIN}" if low else f"Silhouette match {txt}"
    bars = [("Match at " + k, f"{v:.3f}", v, PR.AMBER if v < READ_MIN else PR.SAGE, READ_MIN, f"at least {READ_MIN}") for k, v in sc.items()][:2]
    return row("warn" if low else "pass", f2(worst), READ_MIN, why, _proof(ctx, [], PR.AMBER if low else PR.SAGE, lines=[("304 " + f"{sc.get('304', 0):.3f}  96 {sc.get('96', 0):.3f}  48 {sc.get('48', 0):.3f}", PR.INK)], bars=bars), dict(scores=sc))
