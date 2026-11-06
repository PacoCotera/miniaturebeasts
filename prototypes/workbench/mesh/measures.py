"""Measures taken ON THE MESH (design §11), in the stand view, for report.json and the sheets. House ranges are read from the house file's rules."""
import math
import numpy as np
import bpy
from housefield import Ry


def eye_widths(sc):
    """The two eyes' discs (radius Riris, in each eye's own plane, on the posed head) projected to the screen: width of each, far over near."""
    H = sc.H
    right, up, toward = sc.basis()
    out = []
    for e in H.eyes:
        t = np.linspace(0, 2 * np.pi, 90, endpoint=False)
        loc = e["c"][None] + e["Riris"] * (np.cos(t)[:, None] * e["lat"] + np.sin(t)[:, None] * e["up"])
        P = H.kc + (loc) @ H.Rh.T
        c = H.kc + e["c"] @ H.Rh.T
        out.append(dict(side=e["side"], width=float(np.ptp(P @ right)), depth=float(c @ toward), centre_screen=(float(c @ right), float(c @ up))))
    near = max(out, key=lambda d: d["depth"])
    far = min(out, key=lambda d: d["depth"])
    return dict(near=near, far=far, ratio=far["width"] / near["width"], far_higher_by=far["centre_screen"][1] - near["centre_screen"][1])


def head_vertices(sc):
    """Evaluated vertices (posed as currently set) split by the head's vertex group."""
    dg = bpy.context.evaluated_depsgraph_get()
    ev = sc.half.evaluated_get(dg)
    me = ev.to_mesh()
    names = {g.index: g.name for g in ev.vertex_groups}
    P = np.array([v.co[:] for v in me.vertices])
    ishead = np.array([any(names[g.group] == "head" and g.weight > 0.5 for g in v.groups) for v in me.vertices])
    istorso = np.array([any(names[g.group] in ("chest", "spine", "pelvis") and g.weight > 0.5 for g in v.groups) for v in me.vertices])
    ev.to_mesh_clear()
    return P, ishead, istorso


def chin_overhang(sc):
    """The head square on the body (no yaw, no roll; the chin-up pitch kept), at the jaw's height: the head's front minus the chest's front, centre line."""
    H = sc.H
    sc.pose_stand(True, Rh=Ry(-math.radians(H.pose["pitch"])))
    P, ish, ist = head_vertices(sc)
    zw = H.kc[2] - 0.5 + H.rig["chin-height"]
    sl = (np.abs(P[:, 1]) < 0.05) & (np.abs(P[:, 2] - zw) < 0.03)
    hf = P[sl & ish][:, 0].max()
    cf = P[sl & ist][:, 0].max()
    sc.pose_stand(True)
    return float(hf - cf)


def silhouette_profile(alpha, fractions=(0.7, 0.85, 0.95)):
    """backLine on an alpha mask (rows x cols, True = creature): the top edge at fractions of the width, as (top - floor) / stature."""
    cols = np.where(alpha.any(0))[0]
    tops = np.array([np.argmax(alpha[:, c]) if alpha[:, c].any() else -1 for c in range(alpha.shape[1])])
    floor = alpha.shape[0] - np.argmax(alpha[::-1].any(1)) - 1
    crown = tops[cols].min()
    stature = floor - crown
    a0, a1 = cols[0], cols[-1] + 1
    return {f: float((floor - tops[int(a0 + f * (a1 - a0))]) / stature) for f in fractions}
