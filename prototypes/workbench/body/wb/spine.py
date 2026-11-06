"""Chunk 22: the spine on the stage. What the Shape stage draws over the az 90 clay (the range bar along the spine and the profile knobs at the neck, head, chest and rump), worked out from the file and the plan alone: no build, no render.
`spine_view(doc)` answers in the plan's own terms and in the proxy camera's frame, so the page projects it and knows nothing of either plan:
  path    the spine as points [x, y, z] in H from its head end, sampled every 0.025 H, with `u` the arc length from the head end;
  ranges  each range's start and end `u`, the field that holds its length (the tail's is null: it runs to the end) and its swatch;
  knobs   each profile knob: where its handle sits now, the axis a drag moves it along and `gain`, the value a handle moving 1 H along that axis changes by;
  outline the loft's derived section table as two polylines (the back and the front edge), for the thin profile line;
  built   whether the plan has a cage builder yet (both have: the quadruped's bare base is quadruped.py).
A plan is one function that returns (path points, knobs, outline); `PLANS` below is the table of the plan modules' spine views (the plan modules)."""
import copy
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


# ---- the plans own their spine views (the biped and quadruped plan modules); the names stay here for the callers that had them
from plans import MODULES as _PLAN_MODULES                                     # noqa: E402
from plans.biped import BIPED_KNOBS, biped_knobs, biped_path, _edge          # noqa: E402,F401
from plans.quadruped import quad_knobs                                       # noqa: E402,F401

biped = _PLAN_MODULES["biped"].spine
quadruped = _PLAN_MODULES["quadruped"].spine
PLANS = {name: mod.spine for name, mod in _PLAN_MODULES.items()}
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
                           value=L, band=list(V1.plan_for(doc)["range_len"].get(r["name"]) or []) or None, sw=FM.SWATCH.get(r["name"])))
        at = hi
    kn = []
    for k in knobs:
        part = KNOB_RANGE[k["name"]]
        ptr = f"/spine/loft/head_profile/{k['name']}"
        band = V1.plan_for(doc)["prof_" + k["name"]]
        kn.append(dict(k, part=part, id=f"spine.loft.head_profile.{k['name']}", ptr=ptr, value=float(doc["spine"]["loft"]["head_profile"][k["name"]]), band=list(band), unit=FM.spec_at(f"spine.loft.head_profile.{k['name']}").get("unit") or "", label=V1.label_of(f"spine.loft.head_profile.{k['name']}")))
    # tangents at the range ends, for dragging a boundary along the spine
    for r in ranges:
        j = min(len(u) - 1, max(1, int(round(r["hi"] / STEP))))
        t = pts[min(j + 1, len(pts) - 1)] - pts[max(j - 1, 0)]
        n = float(np.linalg.norm(t)) or 1.0
        r["tangent"] = [round(float(x), 5) for x in (t / n)]
    return dict(plan=plan, built=built, camera=cam or camera(), step=STEP, path=[[round(float(x), 4) for x in p] for p in pts], ranges=ranges, knobs=kn, outline=outline)
