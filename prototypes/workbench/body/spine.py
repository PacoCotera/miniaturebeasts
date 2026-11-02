"""ONE spine, ONE loft (S20, owner ruling 1 Nov): the creature's centre line is a single path from the crown through the head, neck, back and seat, bending back below the seat, out to the lantern stalk. There is no tail part, no tail socket
and no separate grow(): `neck`, `back`, `seat` and `tail` are named arc-length ranges of this one path (labels for the genes, the rig and the Parts colours). One ring sequence runs along it; the section of each ring is cast from the path onto the
design surface: the gourd lobes (gourd.Gourd: egg sections, masses) and the tail's radius profile (a chain of spheres along the same path), joined by a smooth union so the back flows into the tail as a fillet.
Arc length s runs from the lantern stalk (0) to the crown. Ring vertices are placed by ray casting from the path point in the ring plane (the cage is cast on its target, as in the head of Loika's build)."""
import math
import numpy as np
import paths as PA
from gourd import Gourd, SectionCap
from caps import HalfCap


def smin(a, b, k):
    h = np.maximum(k - np.abs(a - b), 0.0) / k
    return np.minimum(a, b) - h * h * k * 0.25


class SpineLoft(Gourd):
    def __init__(self, spec):
        super().__init__(spec)                              # the gourd lobes: sections and masses (the design surface of the body)
        t = spec["parts"]["torso"]
        sp = t["spine"]
        self.sp = sp
        tail = spec["parts"]["tail"]
        body = [[x, 0.0, z] for x, z in sp["body"]]
        arc = []
        if int(sp.get("bend_n", 0)) > 0:                    # an optional circular arc from the vertical run to the tail root (tangent to both)
            E = np.array(tail["P"][0], float); d1 = np.array(tail["P"][1], float) - E
            d1 /= np.linalg.norm(d1)
            th = math.acos(float(np.clip(np.array([0.0, 0.0, -1.0]) @ d1, -1, 1)))
            Rb = -E[0] / (1.0 - math.cos(th))
            y0 = E[2] + Rb * math.sin(th)
            self.bend = dict(R=Rb, theta=th, y0=y0)
            arc = [[-Rb * (1 - math.cos(f)), 0.0, y0 - Rb * math.sin(f)] for f in np.linspace(0.0, th, int(sp["bend_n"]) + 1)[:-1]]
        else:
            self.bend = None
        P = np.array(body + arc + [list(p) for p in tail["P"]], float)
        R = np.array([[r, r] for r in sp["body_r"]] + [[0.04, 0.04]] * len(arc) + [list(r) for r in tail["R"]], float)
        names = ["crown", "K", "waist", "back"][:len(body)] + [f"bend{i}" for i in range(len(arc))] + [j["name"] for j in tail["joints"]]
        self.joint_names = names
        self.n_body = len(body) + len(arc)
        order = slice(None, None, -1)                       # the path runs from the lantern stalk to the crown
        self.pa = PA.Path(names[order], P[order], R[order], tail.get("fillet", sp["fillet"]), up=[0.0, 1.0, 0.0])
        self.path = self.pa
        self.L = self.pa.length
        self.js = list(self.pa.js)
        self.u0 = self.L                                    # s of the crown
        # the tail's radius profile: a dense chain of spheres along the path
        nt = len(tail["P"])
        knots = np.array(self.js[:nt])                      # arc lengths of the tail joints, stalk first
        radii = np.array([r[0] for r in tail["R"]])[::-1]
        self.tail_knots, self.tail_radii = knots, radii
        s = np.arange(0.0, knots[-1] + 0.30, 0.01)
        pt, _, _, _ = self.pa.at(s)
        self.tail_pts, self.tail_r = pt, self.tail_radius(s)
        self.k = sp["union_k"]
        self.s_root = float(self.js[len(tail["P"]) - 1])    # s of the tail root joint (E)
        z = np.array([self.pa.at([x])[0][0][2] for x in np.linspace(0, self.L, 5)])
        self.ranges = sp["ranges"]

    def point(self, z, a, masses=True):
        """The DESIGN body's surface point at height z and around a (the straight gourd the upper loft is cast on); the face, the arms and the nose sit on it."""
        z, a = np.broadcast_arrays(np.atleast_1d(np.asarray(z, float)), np.atleast_1d(np.asarray(a, float)))
        r = self.rho(z, a, masses)
        th = np.pi * a
        P = np.stack([-r * np.cos(th), r * np.sin(th), z], 1)
        P[a == 0, 1] = 0.0; P[a == 1, 1] = 0.0
        return P

    def tail_radius(self, s):
        """The tail's profile as a function of arc length: the joints' radii by a monotone cubic, held at the root's radius beyond it."""
        return PA.mono_cubic(self.tail_knots, self.tail_radii, np.asarray(s, float))

    # -- the design surface: signed distance (approximately)
    def d_body(self, P):
        x, y, z = P[:, 0], P[:, 1], P[:, 2]
        r = np.hypot(x, y)
        a = np.arctan2(np.abs(y), -x) / np.pi
        zc = np.clip(z, self.ends[0], self.ends[1])
        rho = self.rho(zc, a)
        d = (r / np.maximum(rho, 1e-3) - 1.0) * 0.5
        return np.maximum(d, np.maximum(self.ends[0] - z, z - self.ends[1]))

    def d_tail(self, P):
        D = np.linalg.norm(P[:, None, :] - self.tail_pts[None, :, :], axis=2) - self.tail_r[None, :]
        return D.min(1)

    def d(self, P):
        P = np.atleast_2d(P)
        return smin(self.d_body(P), self.d_tail(P), self.k)

    def inside(self, X, margin=0.0):
        return self.d(np.atleast_2d(X)) < -margin

    def cast(self, c, W, tmax=1.8, step=0.02, steps=40):
        """The first exit of each ray from the design surface (the surface is not star-shaped from a path point once the tail curls back toward the body): march in `step`, then bisect."""
        c = np.asarray(c, float)
        ts = np.arange(step, tmax + step, step)
        out = np.zeros((len(W), 3))
        pts = c[None, None, :] + ts[None, :, None] * W[:, None, :]
        dd = self.d(pts.reshape(-1, 3)).reshape(len(W), len(ts))
        for r in range(len(W)):
            ex = np.where(dd[r] > 0)[0]
            if len(ex) == 0:
                raise RuntimeError("a ray never leaves the surface")
            k = int(ex[0])
            lo, hi = (ts[k - 1] if k > 0 else 0.0), ts[k]
            for _ in range(steps):
                m = 0.5 * (lo + hi)
                if float(self.d((c + m * W[r])[None])[0]) < 0:
                    lo = m
                else:
                    hi = m
            out[r] = c + 0.5 * (lo + hi) * W[r]
        return out

    def label_of(self, s):
        """The named range an arc length belongs to (u = distance from the crown)."""
        u = self.L - np.asarray(s, float)
        for nm, (a, b) in self.ranges.items():
            pass
        out = np.empty(np.shape(u), dtype=object)
        for nm, (a, b) in self.ranges.items():
            out[(u >= a) & (u < b)] = nm
        return out

    def stations(self, spec):
        """Ring stations (s values, ascending from the stalk): the cap ring, rings every `ring_gap` along the bend and the tail, then the vertical rings of the file (rings_z) with s from the crown."""
        t = spec["parts"]["torso"]
        gap = self.sp["ring_gap"]
        zs = list(t["rings_z"])
        s_v = [self.L - (2.2 - z) for z in zs]               # the vertical rings
        s_start = 0.06
        s_stop = s_v[0] - 0.55 * gap
        n = max(2, int(round((s_stop - s_start) / gap)))
        s_c = list(np.linspace(s_start, s_stop, n + 1))
        return s_c + s_v


def column_angles_at(G, center_z, vertical):
    if not vertical:
        return np.array(G.layouts["body"], float)
    return G.column_angles(center_z)


def build_spine_loft(body, spec, G):
    """The one ring sequence: 9 half columns per ring, rings from the stalk's cap ring to the crown, a grid cap at each end. Returns dict(rings, faces, caps, ring_s, ring_z, vertical)."""
    n = 9
    ss = G.stations(spec)
    nv = len(spec["parts"]["torso"]["rings_z"])
    rings, rz, info = [], [], []
    for k, s in enumerate(ss):
        pt, T, N, B = G.pa.at([s])
        pt, T, N, B = pt[0], T[0], N[0], B[0]
        vertical = k >= len(ss) - nv
        a = column_angles_at(G, float(pt[2]), vertical)
        th = np.pi * a
        W = np.cos(th)[:, None] * B[None] + np.sin(th)[:, None] * N[None]
        P = G.cast(pt, W)
        P[a == 0, 1] = 0.0; P[a == 1, 1] = 0.0
        rings.append([body.add(P[c], "torso", float(s), a[c], target=P[c], centre=(c in (0, n - 1))) for c in range(n)])
        rz.append(float(pt[2])); info.append(dict(s=float(s), centre=pt, T=T, N=N, B=B))
    faces = {}
    for i in range(len(rings) - 1):
        for c in range(n - 1):
            faces[(i, c)] = body.face(rings[i][c], rings[i + 1][c], rings[i + 1][c + 1], rings[i][c + 1], "torso")
    caps = {}
    # the crown: the section cap of the gourd (the top of the vertical run)
    caps["crown"] = SectionCap(body, rings[-1], "torso", G, rz[-1], G.ends[1], +1)
    # the lantern stalk end: a grid cap on the first ring, along the path's outward direction
    P0 = np.array([body.cage.V[v] for v in rings[0]])
    pt, T, N, B = info[0]["centre"], info[0]["T"], info[0]["N"], info[0]["B"]
    rr = float(np.max(np.linalg.norm(P0 - pt, axis=1)))
    caps["tip"] = HalfCap(body, rings[0], "torso", pt, T, B, -1, G.sp["cap_depth"] * rr, flip=True)
    side = [float(body.cage.V[r[4]][1]) if abs(body.cage.V[r[4]][1]) > 1e-9 else 0.3 for r in rings]
    return dict(rings=rings, faces=faces, caps=caps, z=rz, ring_info=info, ring_s=list(ss), n_vertical=nv, ring_side=[float(np.linalg.norm(np.array(body.cage.V[r[4]]) - info[k]["centre"])) for k, r in enumerate(rings)])
