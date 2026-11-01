"""The torso loft (body-spec s2.2): the spine, the egg section with the masses as target radii (analytic, nothing fitted), the column keys, the grid, the caps, the limit fix."""
import math
import numpy as np
import paths as PA
from body import Body
from caps import HalfCap


def sstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def wcos(u):
    u = np.asarray(u, float)
    return np.where(np.abs(u) < 1, np.cos(np.pi * u / 2) ** 2, 0.0)


class Torso:
    """spec['parts']['torso'] -> the spine Path, section rho(s, around), masses. x -> s through the spine."""

    def __init__(self, spec):
        p = spec["parts"]["torso"]
        self.p = p
        j = p["path"]["joints"]
        P = [[q["at"][0], 0.0, q["at"][1]] for q in j]
        R = [[0.05, 0.05]] * len(P)
        self.path = PA.Path([q["name"] for q in j], P, R, p["path"]["fillet"], up=[0, 0, 1])
        pts = self.path.pts
        # x -> s (the spine runs forward monotonically)
        self.xs = pts[:, 0]
        self.s_of_x = lambda x: np.interp(x, self.xs, self.path.s)
        st = p["section"]["stations"]
        self.st_x = np.array([a[0] for a in st])
        self.st_s = self.s_of_x(self.st_x)
        self.st_r = np.array([a[1] for a in st], float)       # [up, side, down]
        self.exp = p["section"]["exp"]
        self.masses = []
        for m in p["masses"]:
            ds = m["ds"] if isinstance(m["ds"], list) else [m["ds"], m["ds"]]
            self.masses.append(dict(name=m["name"], s=float(self.s_of_x(m["x"])), a=m["around"], rho=m["rho"], ds=ds, da=m["da"]))
        self.ends = (float(self.st_s[0]), float(self.st_s[-1]))

    def axes(self, s):
        s = np.asarray(s, float)
        return np.stack([PA.mono_cubic(self.st_s, self.st_r[:, k], s) for k in range(3)], -1)

    def base_rho(self, s, a):
        ax = self.axes(s)
        th = np.pi * np.asarray(a, float)
        t = 0.5 * (1 - np.cos(th))                          # 0 at the back line, 1 at the belly line: the up half-axis blends into the down one
        h = ax[..., 0] * (1 - t) + ax[..., 2] * t
        e = self.exp
        sn, cs = np.abs(np.sin(th)), np.abs(np.cos(th))
        return (((sn / ax[..., 1]) ** e + (cs / h) ** e) ** (-1.0 / e))

    def rho(self, s, a, masses=True):
        s, a = np.broadcast_arrays(np.asarray(s, float), np.asarray(a, float))
        r = self.base_rho(s, a)
        if masses:
            b = np.zeros_like(r)
            for m in self.masses:
                tgt = m["rho"] - float(self.base_rho(m["s"], m["a"]))
                u = np.where(s < m["s"], (s - m["s"]) / m["ds"][0], (s - m["s"]) / m["ds"][1])
                bump = tgt * wcos(u) * wcos((a - m["a"]) / m["da"])
                b = b + np.maximum(bump, 0)
            r = r + b
        return r

    def point(self, s, a, masses=True):
        """The surface point at arc length s and around a (left half)."""
        s, a = np.broadcast_arrays(np.atleast_1d(np.asarray(s, float)), np.atleast_1d(np.asarray(a, float)))
        pt, T, N, _ = self.path.at(s)
        lat = np.cross(N, T)
        th = np.pi * a
        r = self.rho(s, a, masses)
        P = pt + r[:, None] * (np.cos(th)[:, None] * N + np.sin(th)[:, None] * lat)
        P[a == 0, 1] = 0.0
        P[a == 1, 1] = 0.0
        return P

    def inside(self, X, margin=0.0):
        """True where points X (n,3) are inside the torso section (analytic, in the torso's own polar coordinates about the spine; the caps' ends included)."""
        X = np.atleast_2d(X)
        s = np.interp(X[:, 0], self.xs, self.path.s)
        pt, T, N, _ = self.path.at(s)
        d = X - pt
        lat = np.cross(N, T)
        w, v = (d * N).sum(-1), (d * lat).sum(-1)
        r = np.hypot(w, v)
        a = np.arccos(np.clip(w / np.maximum(r, 1e-12), -1, 1)) / np.pi
        a = np.where(np.abs(X[:, 1]) < 0, 0, a)
        rho = self.rho(s, np.clip(a, 0, 1))
        inx = (X[:, 0] > self.xs[0]) & (X[:, 0] < self.xs[-1])
        return (r < rho - margin) & inx


# column angles at the hip and shoulder stations (the socket columns sit on the masses' lower edges, body-spec s2.2.4: a column through each socket centre)
COLS_HIP = np.array([0, .14, .28, .42, .56, .68, .80, .90, 1.0])
COLS_SH = np.array([0, .14, .28, .42, .57, .72, .84, .92, 1.0])


def column_angles(sx, spec):
    """9 column angles for station x: blended (cosine) between the hip and shoulder layouts, constant outside."""
    p = spec["parts"]["torso"]
    xh, xs = p["rings_x"][1], p["rings_x"][7]
    t = float(sstep(xh, xs, sx))
    return COLS_HIP * (1 - t) + COLS_SH * t




def build_torso(body: Body, spec, T: Torso):
    """Rings at STATION_X (9 columns each), the two grid caps. Returns a dict of ids: rings[i][c], face[(i, c)], caps."""
    n = 9
    rings, ids = [], {}
    for i, x in enumerate(spec["parts"]["torso"]["rings_x"]):
        s = float(T.s_of_x(x))
        a = column_angles(x, spec)
        P = T.point(np.full(n, s), a)
        row = []
        for c in range(n):
            row.append(body.add(P[c], "torso", s, a[c], target=P[c], centre=(c in (0, n - 1))))
        rings.append(row)
    faces = {}
    for i in range(len(rings) - 1):
        for c in range(n - 1):
            faces[(i, c)] = body.face(rings[i][c], rings[i + 1][c], rings[i + 1][c + 1], rings[i][c + 1], "torso")
    caps, endrings = {}, {}
    n = 9
    for name, ring, sgn in (("rump", rings[0], -1), ("brisket", rings[-1], +1)):
        s_ring = body.s[ring[0]]
        s_end = T.ends[0] if sgn < 0 else T.ends[1]
        D = abs(s_end - s_ring)
        # the end ring 0.62 of the way to the end, at the dome's radius there (0.78 of the last ring's: the spec's 0.6 gave a flat cap and a folded corner); then a grid cap over it
        U_END = 0.62
        s_e = s_ring + sgn * U_END * D
        a_e = np.array([body.around[v] for v in ring])
        pt, Tg, Nn, _ = T.path.at([s_e])
        pt, Tg, Nn = pt[0], Tg[0], Nn[0]
        lat = np.cross(Nn, Tg)
        th = np.pi * a_e
        r_last = T.rho(np.full(n, s_ring), a_e)
        P = pt + math.sqrt(1 - U_END ** 2) * r_last[:, None] * (np.cos(th)[:, None] * Nn + np.sin(th)[:, None] * lat)
        er = [body.add(P[c], "torso", s_e, a_e[c], target=P[c], centre=(c in (0, n - 1))) for c in range(n)]
        for c in range(n - 1):
            body.face(ring[c], er[c], er[c + 1], ring[c + 1], "torso")
        endrings[name] = er
        ring = er
        depth = (1 - U_END) * D
        caps[name] = HalfCap(body, ring, "torso", pt, Tg, Nn, sgn, depth, flip=(sgn > 0))
    return dict(rings=rings, faces=faces, caps=caps, endrings=endrings)
