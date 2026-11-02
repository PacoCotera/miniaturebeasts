"""ONE spine, ONE loft (S20, owner ruling 1 Nov): the creature's centre line is a single path from the crown through the head, neck, back and seat, bending back below the seat, out to the lantern stalk. There is no tail part, no tail socket
and no separate grow(): `neck`, `back`, `seat` and `tail` are named arc-length ranges of this one path (labels for the genes, the rig and the Parts colours). One ring sequence runs along it; the section of each ring is cast from the path onto the
design surface: the gourd lobes (gourd.Gourd: egg sections, masses) and the tail's radius profile (a chain of spheres along the same path), joined by a smooth union so the back flows into the tail as a fillet.
Arc length s runs from the lantern stalk (0) to the crown. Ring vertices are placed by ray casting from the path point in the ring plane (the cage is cast on its target, as in the head of Loika's build)."""
import hashlib
import json
import math
from collections import OrderedDict
import numpy as np
import paths as PA
from gourd import Gourd, SectionCap
from caps import HalfCap


_CASTS = OrderedDict()
CAST_STATS = dict(hit=0, miss=0)           # how many cast_rays calls were answered from _CASTS, for the build timings


def smin(a, b, k):
    h = np.maximum(k - np.abs(a - b), 0.0) / k
    return np.minimum(a, b) - h * h * k * 0.25


def tip_profile(shape, size=1.0):
    """The tail-tip family as a radius profile on the last stretch of the one spine (no separate shell): returns (length, Rmax, u_m, neck) of a teardrop or ball that lies on the path from its end. u_m is where the widest point sits (fraction of the length from the end)."""
    L = float(shape["len"]) * size
    R = 0.5 * float(shape["width"]) * size
    return L, R, float(shape.get("u_m", 0.45))


class SpineLoft(Gourd):
    def __init__(self, spec, tip=None, tip_size=1.0):
        super().__init__(spec)                              # the gourd lobes: sections and masses (the design surface of the body)
        self.tip_family = tip or spec["sockets"]["tail.tip"]["default"]
        self.tip_size = float(tip_size)
        shp = spec["sockets"]["tail.tip"]["shapes"].get(self.tip_family)
        self.bulb = tip_profile(shp, self.tip_size) if shp else (0.0, 0.0, 0.5)
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
        if self.bulb[0] > 0:                                # a bend round the bulb must be wider than the bulb: the fillet radius of the last joints counts the bulb's radius (the cross-section never crosses itself on the inside of the bend)
            Pt = np.array(tail["P"], float)
            run = 0.0
            for k in range(len(Pt) - 1, -1, -1):
                if k < len(Pt) - 1:
                    run += float(np.linalg.norm(Pt[k + 1] - Pt[k]))
                if run < self.bulb[0] - 0.02:
                    R[len(P) - len(Pt) + k] = np.maximum(R[len(P) - len(Pt) + k], self.bulb[1])
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
        self.tail_s = s
        rf_ = sp.get("root_flare")                          # pass 4: the root widens sideways only (a soft mound, the way a tail grows out of a seat seen from behind); from the side nothing changes, so the monotone taper holds
        if rf_:
            sr = float(self.js[len(tail["P"]) - 1])
            t_ = np.clip((s - (sr - float(rf_["from"]))) / max(float(rf_["from"]) - float(rf_["to"]), 1e-9), 0.0, 1.0)
            self.tail_e = 1.0 + (float(rf_["E"]) - 1.0) * t_ * t_ * (3 - 2 * t_)
        else:
            self.tail_e = np.ones(len(s))
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

    def depth(self, X):
        """Signed Euclidean depth of points below the design body's skin (positive inside), by the nearest point of a fine cloud of the gourd's surface (the trunk and head, not the tail). The hard joins use it: a shell is 'sunk 0.04-0.055 H' means this number."""
        if not hasattr(self, "_cloud"):
            zs = np.linspace(self.ends[0] + 0.01, self.ends[1] - 0.01, 90)
            aa = np.linspace(0.0, 1.0, 41)
            Z, A = np.meshgrid(zs, aa, indexing="ij")
            P = self.point(Z.ravel(), A.ravel())
            Q = P.copy(); Q[:, 1] *= -1
            self._cloud = np.vstack([P, Q[Q[:, 1] != 0]])
        X = np.atleast_2d(np.asarray(X, float))
        d = np.sqrt(((X[:, None, :] - self._cloud[None]) ** 2).sum(2).min(1))
        ins = self.d_body(X) < 0
        return np.where(ins, d, -d)

    def tail_radius(self, s):
        """The tail's profile as a function of arc length: the joints' radii by a monotone cubic, held at the root's radius beyond it; the last stretch of the one spine is the tip family's bulb (a teardrop or a ball: its own radius profile on the path, so
        it flows out of the stalk with no join at all)."""
        s = np.asarray(s, float)
        r = PA.mono_cubic(self.tail_knots, self.tail_radii, s)
        Lb, Rb, um = self.bulb
        if Lb > 0:
            u = np.clip(s / Lb, 0.0, 1.0)
            neck = float(PA.mono_cubic(self.tail_knots, self.tail_radii, np.array([Lb]))[0])
            low = Rb * np.sqrt(np.clip(1 - ((um - u) / um) ** 2, 0, 1))
            t = np.clip((u - um) / (1 - um), 0, 1)
            up = neck + (Rb - neck) * np.cos(0.5 * np.pi * t) ** 2
            bulb = np.where(u <= um, low, up)
            r = np.where(s <= Lb, bulb, r)
        return r

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
        dd = (P[:, None, :] - self.tail_pts[None, :, :]) * np.stack([np.ones(len(self.tail_e)), 1.0 / self.tail_e, np.ones(len(self.tail_e))], 1)[None]
        D = np.linalg.norm(dd, axis=2) - self.tail_r[None, :]
        return D.min(1)

    def d(self, P):
        P = np.atleast_2d(P)
        return smin(self.d_body(P), self.d_tail(P), self.k)

    def inside(self, X, margin=0.0):
        return self.d(np.atleast_2d(X)) < -margin

    def cast(self, c, W, tmax=1.8, step=0.02, steps=40):
        """The first exit of each ray from the design surface (the surface is not star-shaped from a path point once the tail curls back toward the body): march in `step`, then bisect."""
        W = np.asarray(W, float)
        return self.cast_rays(np.broadcast_to(np.asarray(c, float), W.shape), W, tmax, step, steps)

    def cast_rays(self, C, W, tmax=1.8, step=0.02, steps=40, block=15):
        """cast for many rays at once, each from its own start C[r] along W[r]: the same marching steps, the same bisection, the same numbers as one ray at a time (every point is evaluated by the same element-wise arithmetic);
        the march goes on in blocks of `block` steps and stops for a ray at its first exit, the bisection runs on all rays together."""
        C, W = np.asarray(C, float), np.asarray(W, float)
        key = self._cast_key(C, W, tmax, step, steps)
        hit = _CASTS.get(key)
        if hit is not None:                                 # the same rays on the same design surface (the arm-fit pass, an ear or leg edit, a re-render): the same points
            _CASTS.move_to_end(key)
            CAST_STATS["hit"] += 1
            return hit.copy()
        CAST_STATS["miss"] += 1
        out = self._cast_rays(C, W, tmax, step, steps, block)
        _CASTS[key] = out.copy()
        while len(_CASTS) > 24:
            _CASTS.popitem(last=False)
        return out

    def _cast_key(self, C, W, tmax, step, steps):
        """Everything the signed distance reads, and the rays: the casts of two builds are the same exactly when this is the same."""
        h = hashlib.sha256()
        for a in (C, W, self.tail_pts, self.tail_r, self.tail_e, self.st_s, self.st_r):
            a = np.ascontiguousarray(a, float)
            h.update(str(a.shape).encode() + a.tobytes())
        h.update(json.dumps([self.k, self.ends, self.exp, self.masses, tmax, step, steps], sort_keys=True, default=float).encode())
        return h.digest()

    def _cast_rays(self, C, W, tmax, step, steps, block):
        ts = np.arange(step, tmax + step, step)
        n = len(W)
        k_exit = np.full(n, -1)
        act = np.arange(n)
        for b0 in range(0, len(ts), block):
            if len(act) == 0:
                break
            tb = ts[b0:b0 + block]
            pts = C[act][:, None, :] + tb[None, :, None] * W[act][:, None, :]
            dd = self.d(pts.reshape(-1, 3)).reshape(len(act), len(tb))
            hit = dd > 0
            found = hit.any(1)
            k_exit[act[found]] = b0 + hit[found].argmax(1)
            act = act[~found]
        if (k_exit < 0).any():
            raise RuntimeError("a ray never leaves the surface")
        lo = np.where(k_exit > 0, ts[np.maximum(k_exit - 1, 0)], 0.0)
        hi = ts[k_exit]
        for _ in range(steps):
            m = 0.5 * (lo + hi)
            inside = self.d(C + m[:, None] * W) < 0
            lo = np.where(inside, m, lo)
            hi = np.where(inside, hi, m)
        return C + (0.5 * (lo + hi))[:, None] * W

    def label_of(self, s):
        """The named range an arc length belongs to (u = distance from the crown)."""
        u = self.L - np.asarray(s, float)
        for nm, (a, b) in self.ranges.items():
            pass
        out = np.empty(np.shape(u), dtype=object)
        for nm, (a, b) in self.ranges.items():
            out[(u >= a) & (u < b)] = nm
        if self.bulb[0] > 0:
            out[np.asarray(s, float) <= self.bulb[0]] = "lantern"
        return out

    def stations(self, spec):
        """Ring stations (s values, ascending from the stalk): the cap ring, rings every `ring_gap` along the bend and the tail, then the vertical rings of the file (rings_z) with s from the crown."""
        t = spec["parts"]["torso"]
        gap = self.sp["ring_gap"]
        zs = list(t["rings_z"])
        s_v = [self.L - (2.2 - z) for z in zs]               # the vertical rings
        s_start = float(self.sp.get("tip_ring0", 0.06))
        s_stop = s_v[0] - 0.55 * gap
        gt = float(self.sp.get("ring_gap_tip", gap))         # finer rings along the tail's bends: a ring turns at most about 30 degrees from the one before (rings every gt where the bends are tight, wider as the stem straightens)
        s_c = []
        s = s_start
        while s < s_stop - 0.5 * gt:
            s_c.append(s)
            step_ = gt if s < 0.5 else (gt * 1.3 if s < 0.7 else (gt * 1.6 if s < 0.9 else gap))
            rg_ = self.sp.get("root_ring_gap")
            if rg_ is not None and abs(s - self.s_root) < float(self.sp.get("root_ring_reach", 0.45)):
                step_ = min(step_, float(rg_))                       # finer rings where the rump turns into the tail's root (pass 3: at 0.16 H the lower back was one straight ramp from the seat's bottom to the tail)
            s += step_
        s_c.append(s_stop)
        if len(s_c) > 2 and s_c[-1] - s_c[-2] < 0.5 * gt:
            s_c.pop(-2)
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
    geo = []
    for k, s in enumerate(ss):                                  # the rings' frames and rays first: the casts of all rings then run together
        pt, T, N, B = G.pa.at([s])
        pt, T, N, B = pt[0], T[0], N[0], B[0]
        vertical = k >= len(ss) - nv
        a = column_angles_at(G, float(pt[2]), vertical)
        th = np.pi * a
        W = np.cos(th)[:, None] * B[None] + np.sin(th)[:, None] * N[None]
        geo.append((pt, T, N, B, a, W))
    casts = G.cast_rays(np.concatenate([np.broadcast_to(g[0], g[5].shape) for g in geo]), np.concatenate([g[5] for g in geo]))
    off = 0
    for k, s in enumerate(ss):
        pt, T, N, B, a, W = geo[k]
        P = casts[off:off + len(W)]
        off += len(W)
        sb = float(G.s_root)                                    # beyond the tail's root the rings are exact circles of the radius profile (a cast onto the sphere chain's envelope is irregular, and the limit fit amplifies that into a zigzag); the cast takes over into the body
        rb_ = float(G.sp.get("root_blend", 0.30))
        t_ana = 1.0 - float(np.clip((s - (sb - rb_)) / rb_, 0.0, 1.0))
        if t_ana > 0:
            rad = float(G.tail_radius(np.array([s]))[0])
            ey = float(np.interp(s, G.tail_s, G.tail_e))                  # the root's sideways widening (spine.root_flare): the circle is an ellipse, wider across the body than along it
            P = P * (1 - t_ana) + (pt + rad * W * np.array([1.0, ey, 1.0])) * t_ana
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
