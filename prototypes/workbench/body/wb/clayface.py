"""The face on the clay: the eyes and the mouth as flat dark shapes lying on the head, from the face decal's placement in the file (face.eyes, face.mouth) and the creature's eye and mouth genes.
Shape only, no coat: round eyes and a gently curved mouth stroke, each a few mm proud of the surface. Returns (V, F) as lists of polygons for the proxy renderer's clay mode. Needs the loft (`G`), the internal spec and the coat values."""
import math

import numpy as np

LIFT = 0.004
_TRI = {}


def _tris(mesh):
    k = id(mesh["V"])
    if k not in _TRI:
        V, F = np.asarray(mesh["V"], float), np.asarray(mesh["F"], int)
        T = np.vstack([F[:, [0, 1, 2]], F[:, [0, 2, 3]]])
        _TRI.clear()
        _TRI[k] = (V[T[:, 0]], V[T[:, 1]] - V[T[:, 0]], V[T[:, 2]] - V[T[:, 0]])
    return _TRI[k]


def snap(mesh, Q, n):
    """Q moved onto the proxy surface along the normal n (the design surface the decal is placed on sits a little under the shipped mesh): the nearest hit of a ray from 0.3 H outside, then LIFT outward."""
    A, E1, E2 = _tris(mesh)
    O = Q + 0.3 * n
    d = -n
    h = np.cross(d, E2)
    det = np.einsum("ij,ij->i", E1, h)
    ok = np.abs(det) > 1e-12
    f = np.where(ok, 1.0 / np.where(ok, det, 1.0), 0.0)
    sv = O - A
    u = f * np.einsum("ij,ij->i", sv, h)
    q = np.cross(sv, E1)
    v = f * (q @ d)
    t = f * np.einsum("ij,ij->i", E2, q)
    hit = ok & (u >= 0) & (v >= 0) & (u + v <= 1) & (t > 0)
    if not hit.any():
        return Q + LIFT * n
    return O + d * t[hit].min() + LIFT * n


def _frame(G, z, a):
    import s20coat as C
    return C.surface_frame(G, z, a)


def _poly(G, z, a, pts, mirror, mesh=None):
    """pts: (dx, dz) in viewer-right and up on the head's left half (mirror=False) or right half (mirror=True): placed on the loft by height and angle (an angle past the front centreline reflects to the other side), lifted along the normal."""
    P, n, up, rgt = _frame(G, z, a)
    e = 1e-3
    a0, a1 = max(a - e, 0.0), min(a + e, 1.0)
    dPda = (G.point(np.array([z]), np.array([a1]))[0] - G.point(np.array([z]), np.array([a0]))[0]) / (a1 - a0)
    La = float(np.linalg.norm(dPda))
    s = 1.0 if float(dPda @ rgt) > 0 else -1.0
    out = []
    for dx, dz in pts:
        ar = a + s * dx / La * (-1.0 if mirror else 1.0)
        side = 1.0 if ar <= 1.0 else -1.0
        aa = ar if ar <= 1.0 else 2.0 - ar
        side = -side if mirror else side
        Q = G.point(np.array([z + dz]), np.array([float(np.clip(aa, 0.0, 1.0))]))[0].copy()
        Q[1] = abs(Q[1]) * side
        nn = np.array([n[0], abs(n[1]) * side, n[2]])
        out.append(snap(mesh, Q, nn) if mesh is not None else Q + LIFT * nn)
    return out


def face_mesh(G, spec, g, mesh=None):
    f = spec["face"]
    eyes, mouth = f["eyes"], f["mouth"]
    R = float(eyes["r"]) * float(g.get("eye_size", 1.0))
    ez = float(eyes["station"]) + float(g.get("eye_height", 0.0))
    ea = float(eyes["around"]) + float(g.get("eye_spacing", 0.0))
    V, F = [], []

    def add(poly, flip):
        i = len(V)
        V.extend(poly)
        ids = list(range(i, i + len(poly)))
        F.append(ids[::-1] if flip else ids)

    NR, NA = 5, 28                     # rings and spokes: every point of the disc is put on the surface, so it does not sink under the head's bulge between rim points
    pts = [(0.0, 0.0)] + [(R * k / NR * np.cos(t), R * k / NR * np.sin(t)) for k in range(1, NR + 1) for t in np.linspace(0, 2 * np.pi, NA, endpoint=False)]
    for mirror in (False, True):
        P_ = _poly(G, ez, ea, pts, mirror, mesh)
        i = len(V)
        V.extend(P_)
        idx = lambda k, j: i + 1 + (k - 1) * NA + (j % NA)
        for j in range(NA):
            F.append([i, idx(1, j), idx(1, j + 1)] if not mirror else [i, idx(1, j + 1), idx(1, j)])
            for k in range(1, NR):
                q = [idx(k, j), idx(k + 1, j), idx(k + 1, j + 1), idx(k, j + 1)]
                F.append(q if not mirror else q[::-1])
    W = float(mouth["width"]) * float(g.get("mouth_width", 1.0))
    mz = float(mouth["station"]) + float(g.get("mouth_z", 0.0))
    xs = np.linspace(-W / 2, W / 2, 21)
    centre = lambda x: 0.022 * (x / (W / 2)) ** 2 - 0.011      # a gentle smile: the ends sit higher than the middle
    top, bot = [(x, centre(x) + 0.016) for x in xs], [(x, centre(x) - 0.016) for x in xs]
    P_ = _poly(G, mz, 1.0, top + bot, False, mesh)
    i = len(V)
    V.extend(P_)
    n_ = len(xs)
    for j in range(n_ - 1):
        F.append([i + j, i + j + 1, i + n_ + j + 1, i + n_ + j])
    return np.array(V, float), F


# ---------------------------------------------------------------------------------------------------------------------------------------------------------------- the house eye as a decal at stations (mb-species/2)
# The decal code (facedecal.py) takes stations and a mesh and knows nothing of cages. What follows is the cage's side: it reads the file's face (eyes.station, around, r; mouth.station, around, width) and the quadruped plan's section table and says where the stations are.
# A quadruped's eye station is a share of the head's length back from the nose and a place round the ring (0 on the back, 0.5 on the side, 1 under the belly); its radius r is in H. The eyes of a pair are mirrored; a third eye sits on the midline at the pair's height, and a count other than two or three is a level row.
def is_decal_file(spec):
    return isinstance(spec, dict) and spec.get("schema") == "mb-species/2" and spec.get("plan") == "quadruped" and isinstance((spec.get("face") or {}).get("eyes"), dict) and "station" in spec["face"]["eyes"]


def _ring_point(doc, p, u, a):
    import quadruped as Q
    rs, ru, rd = (float(x[0]) for x in Q.table(doc, [u], p))
    c = math.cos(a)
    return np.array([p["x0"] - u, rs * math.sin(a), p["axis_z"] + c * (ru if c >= 0 else rd)])


def _ring_normal(doc, p, u, a, d=1e-3):
    Pu = _ring_point(doc, p, u + d, a) - _ring_point(doc, p, max(u - d, 0.0), a)
    Pa = _ring_point(doc, p, u, a + d) - _ring_point(doc, p, u, a - d)
    n = np.cross(Pu, Pa)
    n /= max(float(np.linalg.norm(n)), 1e-12)
    P = _ring_point(doc, p, u, a)
    return n if float(n @ (P - np.array([P[0], 0.0, p["axis_z"]]))) >= 0 else -n


def quad_guess(doc, g=None):
    """The stations as the file puts them, before they meet the skin: (eyes [(point, normal)], mouth (point, normal), head width). No mesh needed: the file-stage checks read their positions from here. g: eye_size (a multiplier) and eye_spacing (H along the ring), from the creature's genes."""
    import quadruped as Q
    g = g or {}
    p = Q.params(doc)
    f = doc["face"]
    e, m = f["eyes"], f.get("mouth") or {}
    u = float(e["station"]) * p["head"]
    a = float(e["around"]) * math.pi
    ring = max(float(Q.table(doc, [u], p)[0][0]), 1e-3)
    a = a + float(g.get("eye_spacing", 0.0)) / ring
    P, n = _ring_point(doc, p, u, a), _ring_normal(doc, p, u, a)
    pair = [(P, n), (P * [1, -1, 1], n * [1, -1, 1])]
    cnt = int(e.get("count", 2))
    y, z = abs(float(P[1])), float(P[2])
    if cnt == 2:
        eyes = pair
    elif cnt == 3:
        eyes = [pair[0], (np.array([P[0], 0.0, z]), None), pair[1]]
    else:
        ys = [0.0] if cnt == 1 else list(np.linspace(y, -y, cnt))
        eyes = [(np.array([P[0], yy, z]), None) for yy in ys]
    mouth = None
    if m:
        um, am = float(m["station"]) * p["head"], float(m["around"]) * math.pi
        mouth = (_ring_point(doc, p, um, am), _ring_normal(doc, p, um, am))
    return eyes, mouth, 2.0 * p["R_head"]


def quad_stations(doc, surf, g=None):
    """[station] of a quadruped's face on the skin of `surf` (a facedecal.Surface of its proxy mesh): the eyes (each with its radius, the file's r times the eye-size gene), the mouth, and the cheeks of a file that still carries a blush."""
    import facedecal as FD
    g = g or {}
    eyes, mouth, _ = quad_guess(doc, g)
    f = doc["face"]
    r = float(f["eyes"]["r"]) * float(g.get("eye_size", 1.0))
    out = []
    for k, (P, n) in enumerate(eyes):
        if n is None:
            hit = FD.place_along(surf, np.array([P[0] + 2.0, P[1], P[2]]), np.array([-1.0, 0.0, 0.0]))
        else:
            hit = FD.place(surf, P, n)
        if hit is not None:
            out.append(FD.station("eye", hit[0], hit[1], r, f"eye.{k}"))
    if mouth is not None:
        hit = FD.place(surf, *mouth)
        if hit is not None:
            out.append(FD.station("mouth", hit[0], hit[1], float(f["mouth"]["width"]) * float(g.get("mouth_width", 1.0)), "mouth"))
    ch = f.get("cheeks")
    if isinstance(ch, dict) and "r" in ch:
        for st in [s for s in out if s["kind"] == "eye" and abs(float(s["point"][1])) > 1e-3]:
            right, up = FD.axes(st)
            side = 1.0 if float(st["point"][1]) > 0 else -1.0
            Q_ = st["point"] - 1.7 * st["size"] * up + side * 0.3 * st["size"] * np.array([0.0, 1.0, 0.0])
            hit = FD.place(surf, Q_ + 0.0 * st["normal"], st["normal"])
            if hit is not None:
                out.append(FD.station("cheek", hit[0], hit[1], float(ch["r"]), "cheek." + st["id"]))
    return out


def decal_look(doc):
    """The look the file gives the decal: the iris colour by name, the lid by attitude (or the file's own), the cheeks if it carries them."""
    import facedecal as FD
    f = doc["face"]
    e = f["eyes"]
    lid = (e.get("lid") or {}).get("closes")
    look = dict(iris=(e.get("iris") or {}).get("colour", "hazel"), lid=float(lid) if lid is not None else FD.ATTITUDE_LID.get(e.get("attitude", "content"), 0.0))
    iris = e.get("iris") or {}
    house = {k: iris[k] for k in ("share", "pupil") if k in iris}
    if house:
        look["house"] = dict(iris=house.get("share", FD.HOUSE["iris"]), pupil=house.get("pupil", FD.HOUSE["pupil"]))
    if isinstance(f.get("cheeks"), dict) and "r" in f["cheeks"]:
        look["cheeks"] = f["cheeks"]
    m = f.get("mouth") or {}
    if m.get("rest", "closed") != "closed" or m.get("open"):
        look["mouth_open"] = 0.3
    return look


def decal_face(doc, mesh, g=None, stations=None):
    """(V, F, L, rgb) of the house face of a quadruped file on its proxy mesh: the decal's polygons, the layer of each and the layers' colours."""
    import facedecal as FD
    surf = FD.Surface(mesh["V"], mesh["F"])
    st = stations if stations is not None else quad_stations(doc, surf, g)
    look = decal_look(doc)
    V, F, L = FD.build(surf, st, look)
    return V, F, L, FD.layer_rgb(look)
