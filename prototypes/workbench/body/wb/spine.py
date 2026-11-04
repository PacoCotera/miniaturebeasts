"""Chunk 22: the spine on the stage. What the Shape stage draws over the az 90 clay (the range bar along the spine and the profile knobs at the neck, head, chest and rump), worked out from the file and the plan alone: no build, no render.
`spine_view(doc)` answers in the plan's own terms and in the proxy camera's frame, so the page projects it and knows nothing of either plan:
  path    the spine as points [x, y, z] in H from its head end, sampled every 0.025 H, with `u` the arc length from the head end;
  ranges  each range's start and end `u`, the field that holds its length (the tail's is null: it runs to the end) and its swatch;
  knobs   each profile knob: where its handle sits now, the axis a drag moves it along and `gain`, the value a handle moving 1 H along that axis changes by;
  outline the loft's derived section table as two polylines (the back and the front edge), for the thin profile line;
  built   whether the plan has a cage builder yet. The quadruped's has not (chunks 17-20): its path and knobs come from the plan's own formula and nothing is drawn over a clay.
A plan is one function that returns (path points, knobs, outline); `PLANS` below is the table the plan modules own from chunk 26."""
import math
import os
import sys

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BODY not in sys.path:
    sys.path.insert(0, BODY)

import numpy as np

import species_v1 as V1
from wb import forms as FM

# The hero's camera (the proxy's house camera at 608: 190 px per H, elevation 10, the centre the proxy looks at). It is repeated here because the proxy needs Blender and this module does not; a test compares the two.
HERO = (608, 624, 190.0)
EL = 10.0
CENTRE = (-0.35, 0.0, 1.3)
STEP = 0.025


def basis(az, el):
    a, e = math.radians(az), math.radians(el)
    pos_dir = np.array([math.cos(a) * math.cos(e), math.sin(a) * math.cos(e), math.sin(e)])
    fwd = -pos_dir
    right = np.cross(fwd, np.array([0, 0, 1.0]))
    right /= np.linalg.norm(right)
    return right, np.cross(right, fwd)


def camera(az=90.0, centre=CENTRE, ppH=None):
    right, up = basis(az, EL)
    w, h, house = HERO
    return dict(az=az, el=EL, w=w, h=h, ppH=ppH or house, centre=list(centre), right=[round(float(x), 6) for x in right], up=[round(float(x), 6) for x in up])


# ---- the biped: the spine runs from the crown down through the head, neck, back and seat and out along the tail (the one path the cage is lofted on)
def biped_path(doc):
    import paths as PA
    d = V1.to_internal(doc, check=False)
    t, tail = d["parts"]["torso"], d["parts"]["tail"]
    sp = t["spine"]
    js = tail["joints"]
    tailP = PA.fk(np.array(js[0]["at"], float), js)
    body = [[x, 0.0, z] for x, z in sp["body"]]
    P = np.array(body + [list(p) for p in tailP], float)
    R = np.array([[r, r] for r in sp["body_r"]] + [list(j["r"]) for j in js], float)
    names = ["crown", "K", "waist", "back"][:len(body)] + [j["name"] for j in js]
    order = slice(None, None, -1)
    pa = PA.Path(names[order], P[order], R[order], tail.get("fillet", sp["fillet"]), up=[0.0, 1.0, 0.0])      # as the cage builder lays it: from the stalk to the crown
    u = np.arange(0.0, pa.length, STEP)
    pts = pa.at(pa.length - u)[0]
    return u, pts


# the stations the knobs sit at: the height of the table row each knob moves and the edge of the section it reads (the front of the chest, the back of the rump)
BIPED_KNOBS = dict(neck_ratio=(1.2, "front"), R_scale=(1.68, "front"), chest_front=(0.96, "front"), rump_gain=(0.46, "back"))


def _edge(rows, z, edge):
    zs = np.array([r[0] for r in rows])
    ax = np.array([r[1] for r in rows])
    if edge == "front":
        return float(np.interp(z, zs, ax[:, 2]))
    return -float(np.interp(z, zs, ax[:, 0]))


def biped_knobs(doc):
    import headshape as HS
    loft = doc["spine"]["loft"]
    hp, base = loft["head_profile"], loft["section"]["stations_base"]
    rows = HS.stations(base, **hp)
    out = []
    for name, (z, edge) in BIPED_KNOBS.items():
        if name not in hp:
            continue
        v = float(hp[name])
        h = 0.01 if name in ("neck_ratio", "R_scale") else 0.005
        moved = HS.stations(base, **{**hp, name: v + h})
        dx = _edge(moved, z, edge) - _edge(rows, z, edge)
        out.append(dict(name=name, z=z, edge=edge, x=_edge(rows, z, edge), gain=(h / dx) if abs(dx) > 1e-9 else 0.0))
    return rows, out


def biped(doc):
    u, pts = biped_path(doc)
    rows, ks = biped_knobs(doc)
    knobs = [dict(name=k["name"], at=[round(k["x"], 5), 0.0, k["z"]], axis=[1.0, 0.0, 0.0], gain=round(k["gain"], 5)) for k in ks]
    outline = dict(back=[[round(-r[1][0], 4), r[0]] for r in rows], front=[[round(r[1][2], 4), r[0]] for r in rows])
    return u, pts, knobs, outline, True, None


# ---- the quadruped: a horizontal spine, the head entered from behind on the spine axis. No cage builder yet, so the path is the plan's own formula (a straight run at the shoulder height, head at the front) and the
# knobs sit above the axis; nothing is drawn over a clay. The same function returns the real path once chunk 17 builds one.
QUAD_AXIS_Z = 0.95


def quadruped(doc):
    sp = doc["spine"]
    lens = [r.get("length") for r in sp["ranges"]]
    total = sum(x for x in lens if x) + float((sp.get("tail") or {}).get("length", 1.0))
    u = np.arange(0.0, total, STEP)
    x0 = CENTRE[0] + total / 2
    pts = np.stack([x0 - u, np.zeros_like(u), np.full_like(u, QUAD_AXIS_Z)], 1)
    knobs, at = [], 0.0
    hp = (sp.get("loft") or {}).get("head_profile") or {}
    for r in sp["ranges"]:
        name = r["name"]
        k = FM.KNOB_OF.get(name)
        L = r.get("length")
        if k in hp and L:
            band = V1.PLANS["quadruped"]["prof_" + k]
            r_axis = 0.3 + 0.35 * float(hp[k]) / max(band[1], 1e-9)                   # the radius the handle rides at: a share of the band, in H
            knobs.append(dict(name=k, at=[round(x0 - at - L / 2, 5), 0.0, round(QUAD_AXIS_Z + r_axis, 5)], axis=[0.0, 0.0, 1.0], gain=round(band[1] / 0.35, 5)))
        at += L or 0.0
    ppH = min(HERO[2], HERO[0] * 0.64 / total)                                           # until the plan frames its own clay, the spine is fitted to the left of the plate, the names' column free on the right
    return u, pts, knobs, None, False, camera(centre=(x0 - total / 2 - 0.1 * HERO[0] / ppH, 0.0, QUAD_AXIS_Z + 0.2), ppH=ppH)


PLANS = dict(biped=biped, quadruped=quadruped)
KNOB_RANGE = {v: k for k, v in FM.KNOB_OF.items()}


def spine_view(doc):
    plan = doc.get("plan")
    fn = PLANS.get(plan)
    if fn is None:
        return None
    u, pts, knobs, outline, built, cam = fn(doc)
    total = float(u[-1]) + STEP if len(u) else 0.0
    ranges, at = [], 0.0
    for i, r in enumerate(doc["spine"]["ranges"]):
        L = r.get("length")
        hi = total if L is None else at + float(L)
        ranges.append(dict(name=r["name"], lo=round(at, 5), hi=round(hi, 5), id=f"spine.ranges.{r['name']}.length" if L is not None else None, ptr=f"/spine/ranges/{i}/length" if L is not None else None,
                           value=L, band=list(V1.PLANS[plan]["range_len"].get(r["name"]) or []) or None, sw=FM.SWATCH.get(r["name"])))
        at = hi
    kn = []
    for k in knobs:
        part = KNOB_RANGE[k["name"]]
        ptr = f"/spine/loft/head_profile/{k['name']}"
        band = V1.PLANS[plan]["prof_" + k["name"]]
        kn.append(dict(k, part=part, id=f"spine.loft.head_profile.{k['name']}", ptr=ptr, value=float(doc["spine"]["loft"]["head_profile"][k["name"]]), band=list(band), unit=FM.spec_at(f"spine.loft.head_profile.{k['name']}").get("unit") or ""))
    # tangents at the range ends, for dragging a boundary along the spine
    for r in ranges:
        j = min(len(u) - 1, max(1, int(round(r["hi"] / STEP))))
        t = pts[min(j + 1, len(pts) - 1)] - pts[max(j - 1, 0)]
        n = float(np.linalg.norm(t)) or 1.0
        r["tangent"] = [round(float(x), 5) for x in (t / n)]
    return dict(plan=plan, built=built, camera=cam or camera(), step=STEP, path=[[round(float(x), 4) for x in p] for p in pts], ranges=ranges, knobs=kn, outline=outline)
