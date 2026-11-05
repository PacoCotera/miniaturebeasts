"""The quadruped plan's cage (chunk 17): ONE loft on a horizontal spine, nose to tail tip, in the plan's named ranges (head, neck, back, seat, tail).
The spine runs along -x from the nose at x0 (+x is the front, as the biped's), level at the axis height, and leaves the seat into the tail, whose segments are the file's (pitch in degrees from +x in the x-z plane, 180 = level and backward). There is no head socket: the head's ball is the
first lobe of the one section table, entered from behind on the spine axis (the neck band is the table's narrowest place, a share of the head's radius), then the chest, the back, the seat and the tail, joined by a smooth union so every join is a fillet.
The section table is worked out here from the file's ranges and four knobs (head size, neck width, chest swell, seat fullness) and is never edited: `table(doc)` gives it at any arc length u, `spine_path(doc)` the path. Rings of 9 half columns run round each section from the back
(around 0) to the belly (around 1); the nose and the tail tip are grid caps. Chunk 18 adds the girdles (a chest joint on the spine in the back range, a pelvis joint in the seat range) and four three-joint legs: the file's two limbs, `fore.L` and `hind.L`, each a 2 x 2 socket patch cut from the loft on the lower
side, a column of hip, knee and ankle (or shoulder, elbow and wrist) and a flat sole, and mirrored to the right. Balance is the centre of mass over the polygon of the four soles.
Units are H; z is up; the half model is y >= 0. `build(doc)` -> Body; `frame(doc)` the camera framing the plan wants."""
import math
import numpy as np
import limbs
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
    rings, infos, faces = [], [], {}
    for s in ss:
        pt, T, N, B = (a[0] for a in pa.at([s]))
        rs, ru, rd = (float(x[0]) for x in table(doc, [s], p))
        dors = np.cos(th)
        P = [pt + np.sin(a) * rs * B + np.cos(a) * (ru if np.cos(a) >= 0 else rd) * N for a in th]
        rings.append([body.add(P[c], "torso", float(s), c / (N_COL - 1), target=P[c], centre=(c in (0, N_COL - 1))) for c in range(N_COL)])
        infos.append(dict(s=float(s), centre=pt, T=T, N=N, B=B, side=rs, up=ru, down=rd))
    for i in range(len(rings) - 1):
        for c in range(N_COL - 1):
            faces[(i, c)] = body.face(rings[i][c], rings[i + 1][c], rings[i + 1][c + 1], rings[i][c + 1], "torso")
    legs = grow_legs(body, doc, p, pa, ss, rings, faces)
    pt0, T0, N0 = infos[0]["centre"], infos[0]["T"], infos[0]["N"]
    pt1, T1 = infos[-1]["centre"], infos[-1]["T"]
    HalfCap(body, rings[0], "torso", pt0, -T0, N0, +1, max(float(infos[0]["s"]), 0.01), flip=True)
    HalfCap(body, rings[-1], "torso", pt1, T1, -infos[-1]["N"], +1, max(float(pa.length - infos[-1]["s"]), 0.01))
    body.ctx = dict(spec=doc, plan="quadruped", params=p, path=pa, stations=list(map(float, ss)), info=dict(rings=infos, limbs=legs), log={}, balance={})
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


# ---------------------------------------------------------------------------------------------------------------------------------------------------------------- girdles and legs (chunk 18)
SOLE_Z = 0.03                       # the ground contact of a sole: its vertices below this height (the support loop sits 0.03 H over the floor, the cap on the floor)
LEG_ON_FLOOR = 0.01                 # how far the sole's end may stand from the floor in the file


class Torso:
    """What the limb builder asks of the torso: its path, and whether a point is inside the loft (the section table, in the spine's own coordinates: the trunk is straight along -x at the axis height)."""
    def __init__(self, doc, p, pa):
        self.doc, self.p, self.path = doc, p, pa

    def inside(self, X, margin=0.0):
        X = np.atleast_2d(np.asarray(X, float))
        p = self.p
        u = np.clip(p["x0"] - X[:, 0], 0.0, p["u_e"])
        rs, ru, rd = table(self.doc, u, p)
        w, v = X[:, 2] - p["axis_z"], np.abs(X[:, 1])
        rw = np.where(w >= 0, ru, rd)
        e = (v / np.maximum(rs - margin, 1e-6)) ** 2 + (w / np.maximum(rw - margin, 1e-6)) ** 2
        return (e < 1.0) & (X[:, 0] < p["x0"]) & (X[:, 0] > p["x0"] - p["u_e"])


def girdle_joints(doc, p=None):
    """The girdle joints on the spine axis: the chest where `skeleton.chest_at` puts it on the back range (0 at the neck, 1 at the seat), the pelvis where `skeleton.pelvis_at` puts it on the seat range. Their positions follow the ranges, so a longer head or neck moves the legs with the trunk."""
    p = p or params(doc)
    sk = doc["skeleton"]
    u_c = p["head"] + p["neck"] + float(sk["chest_at"]) * p["back"]
    u_p = p["head"] + p["neck"] + p["back"] + float(sk["pelvis_at"]) * p["seat"]
    at = lambda u: np.array([p["x0"] - u, 0.0, p["axis_z"]], float)
    return dict(chest=at(u_c), pelvis=at(u_p), u=dict(chest=u_c, pelvis=u_p))


def limb_parts(doc, p=None):
    """The file's limbs, as the limb builder reads them (the biped's internal shape): the root joint at the girdle joint plus the file's offset (the shoulder's or the hip's), the other joints by forward kinematics from it, their radii, and the socket, end and topology."""
    p = p or params(doc)
    g = girdle_joints(doc, p)
    sk = doc["skeleton"]
    out = {}
    for q in doc.get("parts") or []:
        if q.get("kind") != "limb":
            continue
        fore = str(q["id"]).startswith("fore")
        root = dict(q["root"], at=[float(x) for x in g["chest" if fore else "pelvis"] + np.array(sk["shoulder_off" if fore else "hip_off"], float)])
        joints = [root] + [dict(name=c["joint"], **{k: v for k, v in c.items() if k != "joint"}) for c in q["chain"]]
        P = PA.fk(root["at"], joints, plane_yaw=(q.get("plane") or {}).get("yaw", 0.0))
        socket = dict(q["socket"], u=g["u"]["chest" if fore else "pelvis"])                       # the socket is on the ring under the girdle joint
        out[q["id"]] = dict(kind="limb", parent=q.get("parent", "torso"), joints=joints, P=P, R=np.array([j["r"] for j in joints], float), fillet=q.get("fillet", 1.25), edge=(q.get("topology") or {}).get("edge", 0.2),
                            socket=socket, end=dict(q.get("end") or {}), apex=[j.get("apex") for j in joints])
    return out


def girdles(doc, p=None):
    """The two girdles as joints on the spine, and each limb's root (its shoulder or hip) off its girdle, for both sides: {"fore.L": dict(girdle, joint, root), ...}."""
    p = p or params(doc)
    g = girdle_joints(doc, p)
    out = {}
    for name, lp in limb_parts(doc, p).items():
        kind = name.split(".")[0]
        gn = "chest" if kind == "fore" else "pelvis"
        for side, sg in (("L", 1.0), ("R", -1.0)):
            out[f"{kind}.{side}"] = dict(girdle=gn, joint=g[gn], root=np.array(lp["P"][0], float) * np.array([1.0, sg, 1.0]))
    return out


def socket_ring(rings_info, u, n):
    """The torso ring nearest the arc length u, kept away from the end rings (the 2 x 2 patch needs a ring each side of it)."""
    s = np.array([r["s"] for r in rings_info])
    return int(np.clip(np.argmin(np.abs(s - u)), 1, n - 2))


def grow_legs(body, doc, p, pa, stations, rings, faces):
    """The legs: each limb of the file is grown out of the loft by the limb builder (a 2 x 2 socket patch on the lower side, the first ring wholly outside the loft, three joints, a level foot, a flat sole), the half model's side being y >= 0."""
    info = {}
    T = Torso(doc, p, pa)
    ctx = dict(T=T)
    infos = [dict(s=float(s)) for s in stations]
    for name, lp in limb_parts(doc, p).items():
        sk = lp["socket"]
        i = socket_ring(infos, float(sk["u"]), len(rings))
        zend = float(lp["P"][-1][2])
        if abs(zend) > LEG_ON_FLOOR:
            raise ValueError(f"parts.{name}.chain: the sole ends {zend:.3f} H from the floor (it must stand on it, within {LEG_ON_FLOOR} H)")
        info[name] = limbs.grow_limb(body, ctx, name, lp, i, int(sk["col"]), faces, rings)
        info[name]["P"] = lp["P"]
    return info


# ---------------------------------------------------------------------------------------------------------------------------------------------------------------- the skeleton (the girdles' bones) and balance over four soles
def skeleton(doc, p=None):
    """The bones of the quadruped as drawn on the overlay and read by the rig: joints by name (the spine's, the girdles', each leg's) and bones as (name, kind, head joint, tail joint). The spine runs nose, neck base, chest, pelvis, tail root and along the tail; each girdle joint
    sends a short bone to the root of each leg (its shoulder or hip), and each leg is three bones, upper, lower and paw, to its sole."""
    p = p or params(doc)
    ax = p["axis_z"]
    at = lambda u: np.array([p["x0"] - u, 0.0, ax], float)
    g = girdle_joints(doc, p)
    J = {"nose": at(0.0), "neck.top": at(p["head"]), "neck.base": at(p["head"] + p["neck"]), "chest": g["chest"], "pelvis": g["pelvis"], "tail.root": at(p["u_e"])}
    P, _ = tail_joints(doc, p)
    segs = [s["name"] for s in doc["spine"]["tail"]["segments"]]
    for nm, pt in zip(segs, P[1:]):
        J[f"tail.{nm}"] = np.array(pt, float)
    bones = [("head", "spine", "nose", "neck.top"), ("neck", "spine", "neck.top", "neck.base"), ("spine.chest", "spine", "neck.base", "chest"), ("spine.back", "spine", "chest", "pelvis"), ("spine.pelvis", "spine", "pelvis", "tail.root")]
    prev = "tail.root"
    for nm in segs:
        bones.append((f"tail.{nm}", "tail", prev, f"tail.{nm}"))
        prev = f"tail.{nm}"
    for name, lp in limb_parts(doc, p).items():
        kind = name.split(".")[0]
        girdle = "chest" if kind == "fore" else "pelvis"
        names = [j["name"] for j in lp["joints"]]
        for side, sg in (("L", 1.0), ("R", -1.0)):
            pts = np.array(lp["P"], float) * np.array([1.0, sg, 1.0])
            for nm, q in zip(names, pts):
                J[f"{kind}.{nm}.{side}"] = q
            bones.append((f"girdle.{kind}.{side}", "girdle", girdle, f"{kind}.{names[0]}.{side}"))
            for k, bn in enumerate(("upper", "lower", "paw")):
                bones.append((f"{kind}.{bn}.{side}", "leg", f"{kind}.{names[k]}.{side}", f"{kind}.{names[k + 1]}.{side}"))
    return dict(joints=J, bones=bones)


def girdle_errors(doc):
    """What a quadruped's girdles must be, as [(field, message)]: the chest joint on the back range and the pelvis joint on the seat range (a share from 0 to 1), a shoulder and a hip offset for the limbs, every limb one of `fore.L` and `hind.L` with its sole on the floor. Empty when the file has no limbs."""
    errs = []
    limbs_ = [q for q in (doc.get("parts") or []) if isinstance(q, dict) and q.get("kind") == "limb"]
    sk = doc.get("skeleton") or {}
    mine = any(str(q.get("id", "")).startswith(("fore", "hind")) for q in limbs_) or any(k in sk for k in ("chest_at", "pelvis_at", "shoulder_off", "hip_off"))
    if not limbs_ or not mine:
        return errs                                                 # a file that has not begun to use the quadruped's girdles (a stand-in plan with another plan's limbs) is not judged by them
    for key, what, rng in (("chest_at", "chest joint", "back"), ("pelvis_at", "pelvis joint", "seat")):
        v = sk.get(key)
        if not isinstance(v, (int, float)) or isinstance(v, bool):
            errs.append((f"skeleton.{key}", f"skeleton.{key}: missing (it is required for a quadruped's limbs: where the {what} stands on the {rng} range, 0 to 1)"))
        elif not 0.0 <= v <= 1.0:
            errs.append((f"skeleton.{key}", f"skeleton.{key} is {v:g}; the {what} stands on the {rng} range, between 0 and 1"))
    for key, what in (("shoulder_off", "foreleg's root from the chest joint"), ("hip_off", "hind leg's root from the pelvis joint")):
        if not (isinstance(sk.get(key), (list, tuple)) and len(sk[key]) == 3):
            errs.append((f"skeleton.{key}", f"skeleton.{key}: missing (it is required for a quadruped's limbs: where the {what} is, x y z in H)"))
    if errs:
        return errs
    try:
        p = params(doc)
    except (KeyError, TypeError, ValueError):
        return errs
    for q in limbs_:
        if q.get("id") not in ("fore.L", "hind.L"):
            errs.append((f"parts.{q.get('id')}", f"parts.{q.get('id')}: a quadruped's limbs are fore.L and hind.L (the left side, mirrored to the right)"))
            continue
        try:
            z = float(limb_parts(doc, p)[q["id"]]["P"][-1][2])
        except (KeyError, TypeError, ValueError, IndexError):
            continue
        if abs(z) > LEG_ON_FLOOR:
            errs.append((f"parts.{q['id']}.chain", f"parts.{q['id']}.chain: the sole ends {z:.3f} H from the floor (it must stand on it, within {LEG_ON_FLOOR} H)"))
    return errs


def hull_margin(H, c):
    """The least distance from the point c to the sides of the convex polygon H (counter-clockwise), positive inside."""
    n = len(H)
    d = []
    for i in range(n):
        a, b = H[i], H[(i + 1) % n]
        e = b - a
        d.append(float((e[0] * (c[1] - a[1]) - e[1] * (c[0] - a[0])) / np.hypot(*e)))
    return min(d)


def balance(body, V2=None, F2=None, part2=None):
    """Balance over four soles (the owner's rule that a mibi must not fall over, for the quadruped): the centre of mass is the volume centroid of the closed level-2 mesh (uniform density, the tail counts), and its ground projection must fall inside the polygon of the four soles
    with room to spare. `margin` is the least distance to the polygon's sides over the polygon's shorter side (its length or its width); the rule asks for at least 0.15, as the biped's asks 15 % of the sole in front of the heel."""
    import s20balance as SB
    import subdiv as SD
    if V2 is None:
        Vf, Ff, at, fpp, cr, mir = body.full()
        V2, F2, _, a2, fp2 = SD.subdivide_body(body, Vf, Ff, cr, at, fpp, levels=2)
        F2 = np.array(F2, int)
        cnt = np.zeros((len(V2), len(body.parts) + 1))
        for k in range(4):
            np.add.at(cnt, (F2[:, k], np.asarray(fp2).astype(int)), 1.0)
        part2 = cnt.argmax(1)
    com, vol = SB.centroid(V2, F2)
    legs = np.isin(part2, [body.parts[n] for n in body.parts if n != "torso"])
    soles = {}
    for n, i in body.parts.items():
        if n == "torso":
            continue
        pts = V2[(part2 == i) & (V2[:, 2] < SOLE_Z)]
        for side, sel in (("L", pts[:, 1] > 0), ("R", pts[:, 1] < 0)):
            soles[f"{n.split('.')[0]}.{side}"] = pts[sel][:, :2]
    P = np.vstack(list(soles.values()))
    H = SB.hull(P)
    ext = (float(P[:, 0].max() - P[:, 0].min()), float(P[:, 1].max() - P[:, 1].min()))
    m = hull_margin(H, com[:2])
    return dict(com=com, volume=vol, hull=H, soles={k: dict(centre=v.mean(0), n=int(len(v))) for k, v in soles.items()}, length=ext[0], width=ext[1], margin_H=float(m), margin=float(m / min(ext)), inside=bool(m > 0))
