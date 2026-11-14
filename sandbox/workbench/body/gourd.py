"""The gourd loft (S20, plan G): ONE loft on a straight vertical spine keyed by z. Head and body are two runs of egg sections joined by a soft waist (a smaller ring on the same loft), so there is no neck socket.
Gourd is Torso with the key axis z (spine arc length s = z, station axes [back, side, front], N = the back direction, `around` 0 = back line, 1 = front line); Loika's Torso is untouched.
Columns come from the file: `column_layouts` (a body layout and a head layout, blended between two heights) and `column_keys` (a column of each layout goes through each socket centre; the test checks it)."""
import math
import numpy as np
import paths as PA
from torso import Torso, sstep
from body import Body
from caps import HalfCap


class Spine:
    """The vertical spine as a Path-like object: s = z, T = +z, N = -x (back), lat = +y."""
    N = np.array([-1.0, 0.0, 0.0])
    T = np.array([0.0, 0.0, 1.0])

    def __init__(self, z0, z1):
        self.length = z1 - z0
        self.z0 = z0

    def at(self, s):
        s = np.atleast_1d(np.asarray(s, float))
        pt = np.zeros((len(s), 3)); pt[:, 2] = s
        T = np.tile(self.T, (len(s), 1)); N = np.tile(self.N, (len(s), 1))
        return pt, T, N, np.cross(T, N)


class Gourd(Torso):
    def __init__(self, spec):
        p = spec["parts"]["torso"]
        assert p["path"].get("key") == "z"
        self.p = p
        j = p["path"]["joints"]
        zs = [q["at"][1] for q in j]
        self.path = Spine(zs[0], zs[-1])
        st = p["section"]["stations"]
        self.st_s = np.array([a[0] for a in st], float)           # key = z = arc length
        self.st_r = np.array([a[1] for a in st], float)           # [back, side, front]
        self.exp = p["section"]["exp"]
        self.masses = []
        for m in p["masses"]:
            ds = m["ds"] if isinstance(m["ds"], list) else [m["ds"], m["ds"]]
            self.masses.append(dict(name=m["name"], s=float(m["z"]), a=m["around"], rho=m["rho"], ds=ds, da=m["da"]))
        self.ends = (float(self.st_s[0]), float(self.st_s[-1]))
        self.layouts = p["column_layouts"]

    def inside(self, X, margin=0.0):
        X = np.atleast_2d(X)
        s = X[:, 2]
        w, v = -X[:, 0], X[:, 1]
        r = np.hypot(w, v)
        a = np.arccos(np.clip(w / np.maximum(r, 1e-12), -1, 1)) / np.pi
        rho = self.rho(np.clip(s, self.ends[0], self.ends[1]), np.clip(a, 0, 1))
        return (r < rho - margin) & (s > self.ends[0]) & (s < self.ends[1])

    def column_angles(self, z):
        lo, hi = self.layouts["blend"]
        t = float(sstep(lo, hi, z))
        return np.array(self.layouts["body"]) * (1 - t) + np.array(self.layouts["head"]) * t

    def z_on_profile(self, x, y, z_lo, z_hi, a_dir=None):
        """The z in [z_lo, z_hi] where the section's own profile passes through the planar point (x, y): rho(z, a) = |(x, y)| along that direction (rho is monotone on a cap's run)."""
        r = math.hypot(x, y)
        a = math.atan2(abs(y), -x) / math.pi if r > 1e-9 else (0.0 if a_dir is None else a_dir)
        f = lambda z: float(self.rho(z, a)) - r
        flo, fhi = f(z_lo), f(z_hi)
        if flo * fhi > 0:
            return z_lo if abs(flo) < abs(fhi) else z_hi
        lo, hi = z_lo, z_hi
        for _ in range(50):
            m = 0.5 * (lo + hi)
            if (f(m) > 0) == (flo > 0):
                lo = m
            else:
                hi = m
        return 0.5 * (lo + hi)


class SectionCap(HalfCap):
    """A grid cap cast on the section's own profile (caps.cap_profile = "section"): the interior is the Coons patch of the ring in its plane (as HalfCap), then each point is lifted to the z where the
    loft's own profile passes over it, so the top stays as round as the loft below it (no plateau, no step at the rim)."""

    def __init__(self, body, ring, part, G, z_ring, z_end, sgn, na=2, nb=4):
        self.G_, self.z_ring, self.z_end = G, z_ring, z_end
        pt = np.array([0.0, 0.0, z_ring])
        super().__init__(body, ring, part, pt, np.array([0.0, 0.0, float(sgn)]), Spine.N, sgn, abs(z_end - z_ring), na=na, nb=nb, flip=(sgn > 0))

    def positions(self, P):
        na, nb = self.na, self.nb
        u, w = self._uv(P)
        UV = np.stack([u, w], -1)
        uv = {}
        for i in range(na + 1):
            uv[(i, 0)] = UV[i]
            uv[(na - i, nb)] = UV[na + nb + i]
        for j in range(nb + 1):
            uv[(na, j)] = UV[na + j]
        s0, s1 = UV[0], UV[-1]
        for j in range(nb + 1):
            uv[(0, j)] = s0 + (s1 - s0) * (j / nb)
        e = lambda a, b: uv[(a, b)]
        for i in range(1, na):
            for j in range(1, nb):
                s, t = i / na, j / nb
                uv[(i, j)] = ((1 - s) * e(0, j) + s * e(na, j) + (1 - t) * e(i, 0) + t * e(i, nb)
                              - ((1 - s) * (1 - t) * e(0, 0) + s * (1 - t) * e(na, 0) + (1 - s) * t * e(0, nb) + s * t * e(na, nb)))
        out = []
        lo, hi = sorted((self.z_ring, self.z_end))
        for k in self.keys:
            a = uv[k]
            q = self.pt + a[0] * self.lat + a[1] * self.Nn          # the point in the ring's plane
            x, y = q[0], q[1]
            z = self.G_.z_on_profile(x, y, lo, hi)
            p = np.array([x, y, z])
            if k[0] == 0:
                p[1] = 0.0
            out.append(p)
        return np.array(out)


def build_loft(body: Body, spec, G: Gourd):
    """The 9-column rings at `rings_z`, the grid caps at the seat and the crown. Returns dict(rings, faces, caps, z)."""
    p = spec["parts"]["torso"]
    n = 9
    rings, faces = [], {}
    zs = p["rings_z"]
    for i, z in enumerate(zs):
        a = G.column_angles(z)
        P = G.point(np.full(n, float(z)), a)
        rings.append([body.add(P[c], "torso", float(z), a[c], target=P[c], centre=(c in (0, n - 1))) for c in range(n)])
    for i in range(len(rings) - 1):
        for c in range(n - 1):
            faces[(i, c)] = body.face(rings[i][c], rings[i + 1][c], rings[i + 1][c + 1], rings[i][c + 1], "torso")
    caps = {}
    caps["seat"] = SectionCap(body, rings[0], "torso", G, float(zs[0]), G.ends[0], -1)
    caps["crown"] = SectionCap(body, rings[-1], "torso", G, float(zs[-1]), G.ends[1], +1)
    return dict(rings=rings, faces=faces, caps=caps, z=list(zs))
