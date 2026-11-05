"""The quadruped plan's cage (chunk 17): ONE loft on a horizontal spine, nose to tail tip, in the plan's named ranges (head, neck, back, seat, tail).
The spine runs along -x from the nose at x0 (+x is the front, as the biped's), level at the axis height, and leaves the seat into the tail, whose segments are the file's (pitch in degrees from +x in the x-z plane, 180 = level and backward). There is no head socket: the head's ball is the
first lobe of the one section table, entered from behind on the spine axis (the neck band is the table's narrowest place, a share of the head's radius), then the chest, the back, the seat and the tail, joined by a smooth union so every join is a fillet.
The section table is worked out here from the file's ranges and four knobs (head size, neck width, chest swell, seat fullness) and is never edited: `table(doc)` gives it at any arc length u, `spine_path(doc)` the path. Rings of 9 half columns run round each section from the back
(around 0) to the belly (around 1); the nose and the tail tip are grid caps. Legs, girdles and balance are the next chunks; the bare base has none.
Units are H; z is up; the half model is y >= 0. `build(doc)` -> Body; `frame(doc)` the camera framing the plan wants."""
import math
import numpy as np
import paths as PA
from body import Body
from caps import HalfCap
from limitfix import limit_fix

N_COL = 9                         # half columns per ring
AXIS_Z = 0.95                     # the spine's height above the floor (the shoulder height of the plan's formula)
RING_STEP = 0.11                  # arc length of the section's outline between two rings
CHEST_OVER_SEAT = 1.3             # the chest's radius over the seat's: the pelvis is 0.7 to 1.0 of the chest, so a seat at +30 % just matches it
NECK_FILLET = 0.16                # the smooth union's width where the head, the neck band and the chest meet
UNDER, OVER = 0.05, 0.05          # the belly side is a little fuller than the back side, from the chest on
DEFAULT_KNOBS = dict(R_scale=1.0, neck_ratio=0.66, chest_front=0.05, rump_gain=0.15)


def _smax(a, b, k):
    h = np.maximum(k - np.abs(a - b), 0.0) / k
    return np.maximum(a, b) + h * h * k * 0.25


def _smooth(t):
    t = np.clip(t, 0.0, 1.0)
    return t * t * (3 - 2 * t)


def params(doc):
    """What the section table is made of, from the file: the range lengths, the knobs, the seat and the tail."""
    sp = doc["spine"]
    L = {r["name"]: r["length"] for r in sp["ranges"]}
    hp = dict(DEFAULT_KNOBS, **{k: v for k, v in ((sp.get("loft") or {}).get("head_profile") or {}).items() if k in DEFAULT_KNOBS})
    tail = sp["tail"]
    seat_r = float(sp["seat"]["radius"])
    p = dict(head=float(L["head"]), neck=float(L["neck"]), back=float(L["back"]), seat=float(L["seat"]), tail=float(tail["length"]), seat_r=seat_r,
             root_r=float(tail["root"]) * seat_r, tip_r=float(tail["tip_r"]), axis_z=float((sp.get("loft") or {}).get("axis_z", AXIS_Z)), **hp)
    p["R_head"] = 0.5 * p["head"] * p["R_scale"]
    p["R_neck"] = p["neck_ratio"] * p["R_head"]
    p["R_chest"] = CHEST_OVER_SEAT * seat_r
    p["trunk"] = p["head"] + p["neck"] + p["back"] + p["seat"]
    p["x0"] = p["trunk"] / 2                                       # the trunk (nose to the end of the seat) is centred on x = 0
    p["u_s"] = p["head"] - 0.05                                                 # where the chest's lobe starts
    p["u_c"] = p["head"] + p["neck"] + 0.25 * p["back"]            # the chest's widest place
    p["u_b"] = p["head"] + p["neck"] + 0.6 * p["back"]             # the belly
    p["u_p"] = p["head"] + p["neck"] + p["back"] + 0.45 * p["seat"]  # the seat's widest place
    p["u_e"] = p["trunk"]                                           # the seat's end, the tail's root
    p["total"] = _path(doc, p).length                              # the tail's bends are filleted, so the spine is a little shorter than the file's lengths added up
    return p


def tail_joints(doc, p):
    """The tail's joint centres in the x-z plane: the root on the spine axis at the seat's end (the file's `root_at` is the biped's field: the trunk is level, so the plan reads the root from the ranges and the axis), then each segment by its share of the length and its pitch."""
    t = doc["spine"]["tail"]
    root = np.array([p["x0"] - p["u_e"], 0.0, p["axis_z"]], float)
    js = [dict(name="root")] + [dict(name=s["name"], len=s["share"] * p["tail"], pitch=s["pitch"]) for s in t["segments"]]
    return PA.fk(root, js), [s["r"] for s in t["segments"]]


def _path(doc, p):
    P, rr = tail_joints(doc, p)
    nose = np.array([p["x0"], 0.0, p["axis_z"]], float)
    pts = [nose] + [x for x in P]
    names = ["nose", "root"] + [s["name"] for s in doc["spine"]["tail"]["segments"]]
    R = [[0.04, 0.04], [p["root_r"], p["root_r"]]] + [list(r) for r in rr]
    return PA.Path(names, pts, R, doc["spine"]["tail"].get("fillet", 1.4), up=[0.0, 0.0, 1.0])


def spine_path(doc, p=None):
    """The spine as a filleted path from the nose (s = 0) along the trunk and out along the tail, and its joints' names."""
    p = p or params(doc)
    pa = _path(doc, p)
    return pa, pa.names


def table(doc, u, p=None):
    """The section table at arc lengths u: (side, up, down) radii, each an array like u. The head ball, the neck band, the chest lobe, the belly, the seat and the tail are one smooth union."""
    p = p or params(doc)
    u = np.atleast_1d(np.asarray(u, float))
    R, Rn = p["R_head"], p["R_neck"]
    head = np.sqrt(np.clip(R * R - (u - R) ** 2, 0.0, None)) * (u <= 2 * R)
    neck = np.where((u >= R) & (u <= p["u_c"]), Rn, 0.0)
    Rc = p["R_chest"]
    t = np.clip((p["u_c"] - u) / max(p["u_c"] - p["u_s"], 1e-9), 0.0, 1.0)
    front = Rc * np.sqrt(np.clip(1 - t * t, 0.0, None)) * (u >= p["u_s"])
    Rp = p["seat_r"]
    knots_u = [p["u_c"], p["u_b"], p["u_p"]]
    knots_r = [Rc, 0.93 * Rc, Rp]
    mid = PA.mono_cubic(np.array(knots_u), np.array(knots_r), np.clip(u, p["u_c"], p["u_p"]))
    e = np.clip((u - p["u_p"]) / max(p["u_e"] - p["u_p"], 1e-9), 0.0, 1.0)
    rump = p["root_r"] + (Rp - p["root_r"]) * np.sqrt(np.clip(1 - e * e, 0.0, None))      # the seat rounds off into the tail's root
    trunk = np.where(u < p["u_c"], front, np.where(u <= p["u_p"], mid, np.where(u <= p["u_e"], rump, 0.0)))
    # the tail: the root's radius to the tip's by a monotone cubic, the last tip_r a half ball
    L, rt = p["total"], p["tip_r"]
    tk = np.array([p["u_e"], 0.5 * (p["u_e"] + L - rt), L - rt])
    tr = np.array([p["root_r"], 0.5 * (p["root_r"] + rt) + 0.02, rt])
    tail = PA.mono_cubic(tk, tr, np.clip(u, tk[0], tk[-1]))
    ball = np.sqrt(np.clip(rt * rt - (u - (L - rt)) ** 2, 0.0, None))
    tail = np.where(u > L - rt, ball, np.where(u >= p["u_e"], tail, 0.0))
    r = _smax(_smax(head, neck, NECK_FILLET), np.maximum(trunk, tail), NECK_FILLET)
    # the knobs that swell: the chest at its front, the seat
    bump = lambda c, w: np.exp(-(((u - c) / w) ** 2))
    r = r * (1 + p["chest_front"] * bump(p["u_c"] - 0.08, 0.35)) * (1 + p["rump_gain"] * bump(p["u_p"], 0.30))
    r = np.where(u <= 0.0, 0.0, r)
    r = np.where(u >= L, 0.0, r)
    bias = _smooth((u - (p["head"] + 0.5 * p["neck"])) / max(p["u_c"] - (p["head"] + 0.5 * p["neck"]), 1e-9)) * (u < p["u_e"])
    return r, r * (1 - OVER * bias), r * (1 + UNDER * bias)


def stations(doc, p=None, step=RING_STEP):
    """The rings' arc lengths: equal steps along the outline of the section table (so rings crowd where the section turns fast: the nose, the neck band, the seat, the tip), the first and last close to the poles."""
    p = p or params(doc)
    u = np.linspace(0.0, p["total"], 4001)
    r = table(doc, u, p)[0]
    s = np.r_[0.0, np.cumsum(np.hypot(np.diff(u), np.diff(r)))]
    n = max(int(round(s[-1] / step)), 8)
    q = np.linspace(0.0, s[-1], n + 1)[1:-1]                      # the poles themselves are caps
    st = np.interp(q, s, u)
    return st


def build(doc, step=RING_STEP):
    """The cage of a quadruped file: Body (limit-fixed), with ctx holding the path, the stations and the plan's parameters."""
    p = params(doc)
    pa, names = spine_path(doc, p)
    ss = stations(doc, p, step)
    # the path is longer than the table's total by the fillets' shortening of the bends: the table is keyed by the path's arc length
    body = Body("quadruped")
    th = np.pi * np.linspace(0.0, 1.0, N_COL)
    rings, infos = [], []
    for s in ss:
        pt, T, N, B = (a[0] for a in pa.at([s]))
        rs, ru, rd = (float(x[0]) for x in table(doc, [s], p))
        dors = np.cos(th)
        P = [pt + np.sin(a) * rs * B + np.cos(a) * (ru if np.cos(a) >= 0 else rd) * N for a in th]
        rings.append([body.add(P[c], "torso", float(s), c / (N_COL - 1), target=P[c], centre=(c in (0, N_COL - 1))) for c in range(N_COL)])
        infos.append(dict(s=float(s), centre=pt, T=T, N=N, B=B, side=rs, up=ru, down=rd))
    for i in range(len(rings) - 1):
        for c in range(N_COL - 1):
            body.face(rings[i][c], rings[i + 1][c], rings[i + 1][c + 1], rings[i][c + 1], "torso")
    pt0, T0, N0 = infos[0]["centre"], infos[0]["T"], infos[0]["N"]
    pt1, T1 = infos[-1]["centre"], infos[-1]["T"]
    HalfCap(body, rings[0], "torso", pt0, -T0, N0, +1, max(float(infos[0]["s"]), 0.01), flip=True)
    HalfCap(body, rings[-1], "torso", pt1, T1, -infos[-1]["N"], +1, max(float(pa.length - infos[-1]["s"]), 0.01))
    body.ctx = dict(spec=doc, plan="quadruped", params=p, path=pa, stations=list(map(float, ss)), info=dict(rings=infos), log={}, balance={})
    m, vol = body.finish()
    body.tag = {m[k]: v for k, v in body.tag.items() if k in m}
    from s20build import orient_shells
    body.ctx["shells_flipped"] = orient_shells(body)
    body.ctx["remap"] = m
    body.ctx["volume"] = vol
    body.ctx["body_parts"] = dict(body.parts)
    for cp in body.caps:
        for v in cp.ids:
            body.target[v] = np.array(body.cage.V[v], float)
    for cp in body.caps:
        for k in ((cp.na, 0), (cp.na, cp.nb)):
            body.target[cp.G[k]] = None
    body.ctx["log"]["limit"] = limit_fix(body, free_caps=True)
    return body


def frame(doc, margin=0.10):
    """The camera framing of the plan, as the proxy renderer takes it: the centre of the body's extent and a scale on the house's pixels per H (1 at most), so the whole length from the nose to the tail's end fits across a plate at 304 with a margin on each side (the house plate is 3.2 H wide)."""
    p = params(doc)
    pa = _path(doc, p)
    x_lo, x_hi = float(pa.pts[:, 0].min()) - 0.1, p["x0"] + 0.1
    z_lo, z_hi = 0.0, float(max(pa.pts[:, 2].max() + 0.2, p["axis_z"] + p["R_head"]))
    fit = (304.0 / 95.0) * (1 - 2 * margin) / (x_hi - x_lo)
    return dict(centre=[round(0.5 * (x_lo + x_hi), 4), 0.0, round(0.5 * (z_lo + z_hi) + 0.05, 4)], scale=round(min(1.0, fit), 4))
