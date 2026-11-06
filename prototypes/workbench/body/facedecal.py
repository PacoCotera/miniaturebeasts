"""The house mibi eye and the mouth as projected decals, placed at stations.
A station is a point on the body's skin, the skin's normal there and a size: an eye station (the eye's radius) or a mouth station (the mouth's width). The decal is drawn flat on the tangent plane of its station and every point is cast onto the skin along the normal, then lifted a few mm:
so it lies on any surface it is handed, a plan's cage today and a sculpted mesh body later. Nothing here knows how a body is built: a surface is a mesh (V, F), and a station comes from whatever knows the body (clayface.py derives them from a cage's file).
The house eye (language: the family mark): a pale disc, an iris of at least 70% of it, a dark pupil of 40-50% of the iris and one highlight at the upper left, flush with the skin (no rim, no socket, no bulge).
Decal layers: disc, iris, pupil, catch, mouth, cheek. `build` returns the polygons of every layer with the layer of each polygon (the clay renderer colours them)."""
import math

import numpy as np

HOUSE = dict(iris=0.74, pupil=0.45, catch_at=(-0.38, 0.40), catch_r=0.20)      # iris share of the disc radius; pupil share of the iris radius; the highlight's centre and radius, in iris radii, viewer's right and up
LAYERS = ("disc", "iris", "pupil", "catch", "mouth", "cheek")
LIFT = dict(disc=0.0030, iris=0.0036, pupil=0.0042, catch=0.0048, mouth=0.0040, cheek=0.0030)      # H over the skin: the layers stack without fighting, the whole decal under 0.005 H
RGB = dict(disc=(0.97, 0.95, 0.88), pupil=(0.05, 0.045, 0.055), catch=(1.0, 1.0, 1.0), mouth=(0.42, 0.15, 0.17), cheek=(0.92, 0.50, 0.56))
IRIS_RGB = dict(amber=(0.80, 0.52, 0.12), honey=(0.84, 0.66, 0.25), olive=(0.45, 0.48, 0.18), moss=(0.30, 0.46, 0.22), hazel=(0.52, 0.36, 0.18),
                teal=(0.16, 0.50, 0.52), slate=(0.34, 0.40, 0.48), violet=(0.46, 0.32, 0.62), copper=(0.70, 0.38, 0.20))
ATTITUDE_LID = dict(content=0.0, curious=0.0, deadpan=0.0, knowing=0.30)         # how far the lid closes (share of the eye's height): only the knowing lid shows, and it stays under 35%
REACH = 0.3


class Surface:
    """A triangle soup of a mesh for casting rays: nearest hit along a direction, with the triangle's outward normal."""
    def __init__(self, V, F):
        V, F = np.asarray(V, float), np.asarray(F, int)
        T = np.vstack([F[:, [0, 1, 2]], F[:, [0, 2, 3]]]) if F.shape[1] == 4 else F
        self.A = V[T[:, 0]]
        self.E1 = V[T[:, 1]] - self.A
        self.E2 = V[T[:, 2]] - self.A
        n = np.cross(self.E1, self.E2)
        self.N = n / np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)
        self.C = self.A + (self.E1 + self.E2) / 3.0

    def near(self, P, reach):
        k = np.linalg.norm(self.C - P, axis=1) < reach
        return k

    def hit(self, O, d, k=None):
        """(t, tri index) of the nearest hit of the ray O + t d among the triangles k (a mask, or all), or (None, None)."""
        sel = np.arange(len(self.A)) if k is None else np.flatnonzero(k)
        A, E1, E2 = self.A[sel], self.E1[sel], self.E2[sel]
        h = np.cross(d, E2)
        det = np.einsum("ij,ij->i", E1, h)
        ok = np.abs(det) > 1e-12
        f = np.where(ok, 1.0 / np.where(ok, det, 1.0), 0.0)
        s = O - A
        u = f * np.einsum("ij,ij->i", s, h)
        q = np.cross(s, E1)
        v = f * (q @ d)
        t = f * np.einsum("ij,ij->i", E2, q)
        good = ok & (u >= 0) & (v >= 0) & (u + v <= 1) & (t > 1e-9)
        if not good.any():
            return None, None
        j = np.flatnonzero(good)[np.argmin(t[good])]
        return float(t[j]), int(sel[j])


def _unit(v):
    v = np.asarray(v, float)
    return v / max(float(np.linalg.norm(v)), 1e-12)


def place(surf, P, n, reach=0.3):
    """The point of the skin under P along the normal guess n (cast from `reach` outside), and the skin's outward normal there: (point, normal), or None when the ray misses."""
    n = _unit(n)
    t, j = surf.hit(P + reach * n, -n)
    if t is None:
        return None
    N = surf.N[j] if float(surf.N[j] @ n) >= 0 else -surf.N[j]
    return P + reach * n - t * n, N


def place_along(surf, O, d):
    """The first hit of the ray O + t d on the skin: (point, outward normal), or None."""
    d = _unit(d)
    t, j = surf.hit(O, d)
    if t is None:
        return None
    N = surf.N[j] if float(surf.N[j] @ d) <= 0 else -surf.N[j]
    return O + t * d, N


def station(kind, point, normal, size, sid=None):
    return dict(kind=kind, id=sid or kind, point=np.asarray(point, float), normal=_unit(normal), size=float(size))


def axes(st):
    """(right, up) of a station as a viewer looking at it sees them: up is the world's up on the tangent plane, right is up x normal."""
    n = st["normal"]
    up = np.array([0.0, 0.0, 1.0])
    if abs(float(n @ up)) > 0.97:
        up = np.array([1.0, 0.0, 0.0])
    up = _unit(up - (up @ n) * n)
    return np.cross(up, n), up


def _pts(rad, cx, cz, nr, na):
    return [(cx, cz)] + [(cx + rad * k / nr * math.cos(t), cz + rad * k / nr * math.sin(t)) for k in range(1, nr + 1) for t in np.linspace(0, 2 * math.pi, na, endpoint=False)]


def _disc_faces(i, nr, na):
    idx = lambda k, j: i + 1 + (k - 1) * na + (j % na)
    F = []
    for j in range(na):
        F.append([i, idx(1, j), idx(1, j + 1)])
        for k in range(1, nr):
            F.append([idx(k, j), idx(k + 1, j), idx(k + 1, j + 1), idx(k, j + 1)])
    return F


def project(surf, st, pts2, lift, near):
    """2D points (right, up) on the tangent plane of the station, each cast onto the skin along the normal and lifted: a (m, 3) array. A point whose ray misses is put on the plane (lifted)."""
    right, up = axes(st)
    n = st["normal"]
    out = []
    for x, z in pts2:
        Q = st["point"] + x * right + z * up
        t, j = surf.hit(Q + REACH * n, -n, near)
        if t is None:
            out.append(Q + lift * n)
        else:
            N = surf.N[j] if float(surf.N[j] @ n) >= 0 else -surf.N[j]
            out.append(Q + REACH * n - t * n + lift * N)
    return np.array(out, float)


class Decal:
    def __init__(self):
        self.V, self.F, self.L = [], [], []

    def add(self, layer, P, faces):
        i = len(self.V)
        self.V.extend(P.tolist())
        for f in faces:
            self.F.append([i + int(k) for k in f])
            self.L.append(LAYERS.index(layer))

    def arrays(self):
        return np.array(self.V, float).reshape(-1, 3), self.F, np.array(self.L, int)


def eye_layers(surf, st, look, dec, near):
    """The house eye at an eye station: disc, iris, pupil and the highlight, the lid's straight edge cutting the top of every layer when the look closes it."""
    R = st["size"]
    house = dict(HOUSE, **(look.get("house") or {}))
    lid = float(look.get("lid", 0.0))
    zc = R * (1.0 - 2.0 * lid)
    ri = R * house["iris"]
    rp = ri * house["pupil"]
    cx, cz = house["catch_at"][0] * ri, house["catch_at"][1] * ri
    for layer, rad, c, nr, na in (("disc", R, (0.0, 0.0), 5, 28), ("iris", ri, (0.0, 0.0), 4, 28), ("pupil", rp, (0.0, 0.0), 3, 24), ("catch", house["catch_r"] * ri, (cx, cz), 2, 16)):
        p2 = [(x, min(z, zc)) for x, z in _pts(rad, c[0], c[1], nr, na)]
        dec.add(layer, project(surf, st, p2, LIFT[layer], near), _disc_faces(0, nr, na))


def mouth_layer(surf, st, look, dec, near):
    """The mouth: one curved stroke, its ends up (a small smile), closed."""
    W = st["size"]
    amp = float(look.get("curve", 0.11)) * W
    t = float(look.get("mouth_open", 0.0)) * W or 0.08 * W              # a closed mouth is a thin stroke; a file that opens it gets a wide dark gape (the check names it)
    xs = np.linspace(-W / 2, W / 2, 21)
    c = lambda x: amp * (x / (W / 2)) ** 2 - amp / 2
    top, bot = [(x, c(x) + t) for x in xs], [(x, c(x) - t) for x in xs]
    n = len(xs)
    faces = [[j, j + 1, n + j + 1, n + j] for j in range(n - 1)]
    dec.add("mouth", project(surf, st, top + bot, LIFT["mouth"], near), faces)


def cheek_layer(surf, st, look, dec, near):
    r = float(look["cheeks"]["r"])
    dec.add("cheek", project(surf, st, _pts(r, 0.0, 0.0, 3, 20), LIFT["cheek"], near), _disc_faces(0, 3, 20))


def build(surf, stations, look=None):
    """The decal's polygons: (V, F, L) with the layer index (into LAYERS) of every polygon. `look`: lid (share closed), curve (the mouth's bend), cheeks (dict r: only a file that still carries a blush), house (overrides of HOUSE)."""
    look = look or {}
    dec = Decal()
    for st in stations:
        near = surf.near(st["point"], 3.0 * st["size"] + 0.25)
        {"eye": eye_layers, "mouth": mouth_layer, "cheek": cheek_layer}[st["kind"]](surf, st, look, dec, near)
    return dec.arrays()


def layer_rgb(look=None):
    """The colour of each layer (LAYERS order): the iris from the look's name or rgb."""
    look = look or {}
    iris = look.get("iris_rgb") or IRIS_RGB.get(look.get("iris"), IRIS_RGB["hazel"])
    return [RGB["disc"], iris, RGB["pupil"], RGB["catch"], RGB["mouth"], RGB["cheek"]]


def max_lift(surf, V):
    """How far each decal vertex stands off the skin: the distance to the nearest skin triangle plane point, found as the nearest centroid-cast along the triangle's own normal (cheap and conservative for a decal that lies on it)."""
    V = np.asarray(V, float)
    out = np.zeros(len(V))
    for i, p in enumerate(V):
        k = surf.near(p, 0.35)
        if not k.any():
            out[i] = 9.9
            continue
        sel = np.flatnonzero(k)
        d = np.einsum("ij,ij->i", p - surf.A[sel], surf.N[sel])
        # project onto each plane and keep planes whose foot lies inside the triangle
        foot = p - d[:, None] * surf.N[sel]
        e1, e2, w = surf.E1[sel], surf.E2[sel], foot - surf.A[sel]
        d11, d12, d22 = np.einsum("ij,ij->i", e1, e1), np.einsum("ij,ij->i", e1, e2), np.einsum("ij,ij->i", e2, e2)
        w1, w2 = np.einsum("ij,ij->i", w, e1), np.einsum("ij,ij->i", w, e2)
        den = np.maximum(d11 * d22 - d12 * d12, 1e-18)
        u, v = (d22 * w1 - d12 * w2) / den, (d11 * w2 - d12 * w1) / den
        inside = (u >= -0.02) & (v >= -0.02) & (u + v <= 1.02)
        out[i] = float(np.abs(d[inside]).min()) if inside.any() else 9.9
    return out
