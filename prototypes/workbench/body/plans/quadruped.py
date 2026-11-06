"""The quadruped plan: a horizontal spine, the head entered from behind on the spine axis (quadruped.py builds it). Its bands, and its spine view: the path is the cage's own, the knobs ride the top edge of the section table where each moves it, and the camera is the plan's own framing. The families on it are the registry's (trotter, shoulder-heavy, hopper, digger, loaf, bridge, four-wing, glider, shell-carrier); the trotter has the one template, S22's."""
import copy

import numpy as np

NAME = "quadruped"
BANDS = dict(name=NAME, ranges=["head", "neck", "back", "seat", "tail"], range_len=dict(head=(0.7, 1.3), neck=(0.0, 0.2), back=(0.6, 1.8), seat=(0.3, 0.8)), tail_length=(0.6, 2.4), tail_root=(0.1, 0.8), tip_r=(0.02, 0.15),
             attach="back", a=(0.0, 0.0), d=(0.0, 0.0), seat_radius=(0.4, 0.9), limb_joints=3,
             prof_R_scale=(0.8, 1.2), prof_neck_ratio=(0.50, 0.80), prof_chest_front=(0.0, 0.12), prof_rump_gain=(0.0, 0.3))


def quad_knobs(doc):
    """The four profile knobs of the quadruped: where each handle sits on the section table's top edge, the axis a drag moves it along (up) and `gain`, the value a handle moving 1 H up changes by, found by moving the knob a little."""
    import quadruped as QD
    p = QD.params(doc)
    pa = QD._path(doc, p)
    hp = dict(QD.DEFAULT_KNOBS, **((doc["spine"].get("loft") or {}).get("head_profile") or {}))
    u = np.linspace(0.0, p["total"], 1601)
    nk = (u >= p["head"]) & (u <= p["head"] + p["neck"])
    at = dict(R_scale=p["R_head"], neck_ratio=float(u[nk][np.argmin(QD.table(doc, u[nk], p)[0])]), chest_front=p["u_c"] - 0.08, rump_gain=p["u_p"])
    out = []
    for name in ("neck_ratio", "R_scale", "chest_front", "rump_gain"):
        s0 = at[name]
        top = lambda d_: float(QD.table(d_, [s0], QD.params(d_))[1][0])
        h = 0.01 if name in ("neck_ratio", "R_scale") else 0.005
        moved = copy.deepcopy(doc)
        moved["spine"].setdefault("loft", {}).setdefault("head_profile", {})
        moved["spine"]["loft"]["head_profile"] = dict(hp, **{name: float(hp[name]) + h})
        dz = top(moved) - top(doc)
        pt = pa.at([s0])[0][0]
        out.append(dict(name=name, at=[round(float(pt[0]), 5), 0.0, round(float(pt[2]) + top(doc), 5)], axis=[0.0, 0.0, 1.0], gain=round((h / dz) if abs(dz) > 1e-9 else 0.0, 5)))
    return out


def spine(doc):
    """(u, points, knobs, outline, built, camera) of a quadruped file: the plan's spine view."""
    import quadruped as QD
    from wb import spine as SP
    p = QD.params(doc)
    pa = QD._path(doc, p)
    u = np.arange(0.0, p["total"], SP.STEP)
    pts = pa.at(u)[0]
    t = np.linspace(0.0, p["total"], 241)
    top, bot = QD.table(doc, t, p)[1], QD.table(doc, t, p)[2]
    c = pa.at(t)[0]
    outline = dict(back=[[round(float(c[i][0]), 4), round(float(c[i][2] + top[i]), 4)] for i in range(len(t))], front=[[round(float(c[i][0]), 4), round(float(c[i][2] - bot[i]), 4)] for i in range(len(t))])
    fr = QD.frame(doc)
    return u, pts, quad_knobs(doc), outline, True, SP.camera(centre=tuple(fr["centre"]), ppH=SP.HERO[2] * fr["scale"])
