"""Quad cages as numpy arrays, and the inverse fit (design §2.1): move cage vertices until the SUBDIVISION LIMIT surface lands on the house's field.
No Blender in this file, so it is unit-tested in plain Python. Catmull-Clark limit point of a vertex of valence n (closed quad mesh):
    p_inf = (n^2 p + 4 sum(edge neighbours) + sum(face-opposite vertices)) / (n (n + 5))
"""
import numpy as np


class Cage:
    """A part: vertices (N, 3), quad faces (tuples of 4 ints), edge creases {(i, j): sharpness}, attributes per vertex (name -> float array).
    Vertices with y == 0 exactly are on the mirror plane. `mirrored` parts have a mirror image (the Mirror modifier) across y = 0."""

    def __init__(self, name, mirrored=True):
        self.name, self.mirrored = name, mirrored
        self.V = []            # list of 3-lists, appended by add()
        self.F = []
        self.crease = {}
        self.hold = set()      # vertices the fit leaves alone (creased features, inset floors)
        self.tags = {}         # name -> {vertex or face index: value}
        self.rings = {}        # name -> list of vertex indices, for the builders and the pictures

    def add(self, p):
        self.V.append([float(c) for c in p])
        return len(self.V) - 1

    def face(self, *idx):
        assert len(idx) == 4, "quads only"
        self.F.append(tuple(int(i) for i in idx))
        return len(self.F) - 1

    def arr(self):
        return np.array(self.V, float)

    def set_arr(self, A):
        self.V = [list(map(float, a)) for a in A]

    def centre_mask(self, tol=1e-12):
        return np.abs(self.arr()[:, 1]) <= tol if self.mirrored else np.zeros(len(self.V), bool)

    def fix_winding(self):
        """Consistent, outward-facing winding (the limit-point formula needs it): propagate across shared edges, then flip all if the volume is negative."""
        F = [list(f) for f in self.F]
        edge_faces = {}
        for fi, f in enumerate(F):
            for k in range(4):
                edge_faces.setdefault((min(f[k], f[(k + 1) % 4]), max(f[k], f[(k + 1) % 4])), []).append(fi)
        seen = [False] * len(F)
        for s0 in range(len(F)):
            if seen[s0]:
                continue
            seen[s0] = True
            stack = [s0]
            while stack:
                a = stack.pop()
                fa = F[a]
                for k in range(4):
                    u, v = fa[k], fa[(k + 1) % 4]
                    for b in edge_faces[(min(u, v), max(u, v))]:
                        if b == a or seen[b]:
                            continue
                        fb = F[b]
                        same = any(fb[m] == u and fb[(m + 1) % 4] == v for m in range(4))
                        if same:
                            F[b] = fb[::-1]
                        seen[b] = True
                        stack.append(b)
        self.F = [tuple(f) for f in F]
        V, faces, _ = self.full()
        vol = 0.0
        for f in faces:
            a, b, c, d = (V[i] for i in f)
            vol += np.dot(a, np.cross(b, c)) + np.dot(a, np.cross(c, d))
        if vol < 0:
            self.F = [tuple(f[::-1]) for f in self.F]
        return vol

    def compact(self):
        """Drop vertices no face uses, remap faces, creases, holds, tags and named vertex sets. Returns the old-to-new map."""
        used = sorted({i for f in self.F for i in f})
        m = {o: n for n, o in enumerate(used)}
        self.V = [self.V[i] for i in used]
        self.F = [tuple(m[i] for i in f) for f in self.F]
        self.crease = {(min(m[a], m[b]), max(m[a], m[b])): s for (a, b), s in self.crease.items() if a in m and b in m}
        self.hold = {m[i] for i in self.hold if i in m}
        self.tags = {k: {m[i]: v for i, v in d.items() if i in m} for k, d in self.tags.items()}
        if hasattr(self, "wover"):
            self.wover = {m[i]: v for i, v in self.wover.items() if i in m}
        return m

    def set_crease(self, i, j, s):
        self.crease[(min(i, j), max(i, j))] = s

    # ---- the full (mirrored) topology, for the limit points
    def full(self):
        V = self.arr()
        if not self.mirrored:
            return V, list(self.F), np.arange(len(V))
        cm = self.centre_mask()
        mirror = np.arange(len(V))
        extra = np.where(~cm)[0]
        mirror[extra] = len(V) + np.arange(len(extra))
        Vm = V[extra] * np.array([1, -1, 1.0])
        faces = list(self.F) + [tuple(int(mirror[i]) for i in reversed(f)) for f in self.F]
        return np.vstack([V, Vm]), faces, mirror

    def limit_points(self):
        V, faces, _ = self.full()
        n = len(V)
        F = np.array(faces)
        cnt = np.zeros(n)
        se = np.zeros((n, 3))
        sf = np.zeros((n, 3))
        for k in range(4):
            v, nxt, opp = F[:, k], F[:, (k + 1) % 4], F[:, (k + 2) % 4]
            np.add.at(cnt, v, 1.0)
            np.add.at(se, v, V[nxt])
            np.add.at(sf, v, V[opp])
        c = cnt[:, None]
        L = (c * c * V + 4 * se + sf) / (c * (c + 5))
        return L[: len(self.V)], cnt[: len(self.V)]


def gradient(f, p, h=1e-3):
    a = f(p + h * np.array([1, -1, -1])); b = f(p + h * np.array([-1, -1, 1])); c = f(p + h * np.array([-1, 1, -1])); e = f(p + h * np.array([1, 1, 1]))
    g = np.stack([a - b - c + e, -a - b + c + e, -a + b - c + e], -1)
    return g / np.maximum(np.linalg.norm(g, axis=-1, keepdims=True), 1e-300)


def fit(cage, field, iters=14, tol=0.004, step_max=0.15, gain=1.0, verbose=False):
    """Inverse fit: each iteration, evaluate the limit point of every cage vertex, step it to the field's zero level along the field's gradient (first-order
    distance), and move the cage vertex by that step. Held vertices stay; centre-line vertices keep y = 0. Returns the residuals (largest, mean) of
    the limit points to the field, in H, over the movable vertices."""
    cm = cage.centre_mask()
    hold = np.zeros(len(cage.V), bool)
    hold[list(cage.hold)] = True
    for it in range(iters + 1):
        L, _ = cage.limit_points()
        d = field(L)
        mov = ~hold
        res = np.abs(d[mov])
        big, mean = (float(res.max()), float(res.mean())) if mov.any() else (0.0, 0.0)
        if verbose:
            print(f"  fit {cage.name} it{it}: max {big:.5f} mean {mean:.5f}")
        if big < tol * 0.5 or it == iters:
            break
        g = gradient(field, L)
        step = np.clip(-d, -step_max, step_max)[:, None] * g * gain
        step[hold] = 0
        step[cm, 1] = 0
        A = cage.arr() + step
        A[cm, 1] = 0.0
        cage.set_arr(A)
    return dict(max=big, mean=mean, iters=it)


def bisect_ray(field, origin, direction, t0=0.0, t1=2.0, steps=40):
    """Point where `field` crosses zero along origin + t direction (inside at t0, outside at t1): vectorised over rows of origin, direction."""
    o, d = np.asarray(origin, float), np.asarray(direction, float)
    a, b = np.full(len(o), t0, float), np.full(len(o), t1, float)
    for _ in range(steps):
        m = (a + b) / 2
        inside = field(o + m[:, None] * d) < 0
        a, b = np.where(inside, m, a), np.where(inside, b, m)
    t = (a + b) / 2
    return o + t[:, None] * d


def grid_faces(cage, rings, closed):
    """Quads between consecutive rings (lists of vertex ids of equal length). closed: rings are loops (full), else open arcs (half rings)."""
    for a, b in zip(rings, rings[1:]):
        n = len(a)
        for k in range(n if closed else n - 1):
            cage.face(a[k], a[(k + 1) % n], b[(k + 1) % n], b[k])


def coons_cap(cage, ring, na, nb, to_plane, from_plane, cast, flip=False):
    """Close a half ring (2 na + nb + 1 vertices, from the mirror line round to the mirror line) with an na x nb half grid, as in the design's crown cap.
    Interior vertices come from a Coons patch of the ring in the plane given by to_plane(P) -> (N, 2), then are cast onto the surface by cast(uv, ring_pts)
    -> (N, 3). Returns the new vertex ids as a dict (a, b) -> id (the boundary entries refer to the ring)."""
    assert len(ring) == 2 * na + nb + 1
    P = cage.arr()[ring]
    UV = to_plane(P)
    G = {}
    for i in range(na + 1):
        G[(i, 0)] = ring[i]
        G[(na - i, nb)] = ring[na + nb + i]
    for j in range(nb + 1):
        G[(na, j)] = ring[na + j]
    uv = {}
    for i in range(na + 1):
        uv[(i, 0)] = UV[i]
        uv[(na - i, nb)] = UV[na + nb + i]
    for j in range(nb + 1):
        uv[(na, j)] = UV[na + j]
    # the mirror line: a = 0, from the ring's first vertex to its last
    s0, s1 = UV[0], UV[-1]
    for j in range(nb + 1):
        uv[(0, j)] = s0 + (s1 - s0) * (j / nb)
    # Coons: P(s, t) = (1-s) C0(t) + s C1(t) + (1-t) D0(s) + t D1(s) - bilinear corners, with s = a/na along a, t = b/nb along b
    def edge(a, b):
        return uv[(a, b)]
    for i in range(1, na + 1):
        for j in range(1, nb):
            if (i, j) in uv and i == na:
                continue
            s, t = i / na, j / nb
            c = ((1 - s) * edge(0, j) + s * edge(na, j) + (1 - t) * edge(i, 0) + t * edge(i, nb)
                 - ((1 - s) * (1 - t) * edge(0, 0) + s * (1 - t) * edge(na, 0) + (1 - s) * t * edge(0, nb) + s * t * edge(na, nb)))
            uv[(i, j)] = c
    keys = [(i, j) for i in range(na) for j in range(1, nb)]
    pts = cast(np.array([uv[k] for k in keys]), P)
    for k, p in zip(keys, pts):
        if k[0] == 0:
            p = np.array([p[0], 0.0, p[2]])
        G[k] = cage.add(p)
    for i in range(na):
        for j in range(nb):
            q = (G[(i, j)], G[(i + 1, j)], G[(i + 1, j + 1)], G[(i, j + 1)])
            cage.face(*(q[::-1] if flip else q))
    return G


def ring_cap(cage, ring, n, cast):
    """Close a full ring of 4 n vertices with an n x n... grid: n=2 for 8 vertices (one interior vertex), n=4 for 16 (a 3 x 3 interior). The interior is a
    bilinear blend of the ring's corners (the ring is split in 4 sides of n edges), then cast(P, ring_pts) -> (N, 3)."""
    assert len(ring) == 4 * n
    P = cage.arr()[ring]
    corner = lambda i: P[(i * n) % len(ring)]
    side = lambda s, k: P[(s * n + k) % len(ring)]
    G = {}
    for k in range(n):
        G[(k, 0)] = ring[k]
        G[(n, k)] = ring[n + k]
        G[(n - k, n)] = ring[2 * n + k]
        G[(0, n - k)] = ring[3 * n + k]
    G[(n, 0)] = ring[n]
    G[(n, n)] = ring[2 * n]
    G[(0, n)] = ring[3 * n]
    keys = [(i, j) for i in range(1, n) for j in range(1, n)]
    pts = []
    for (i, j) in keys:
        s, t = i / n, j / n
        a = (1 - s) * side(3, n - j) + s * side(1, j)           # across, along the two sides parallel to a
        b = (1 - t) * side(0, i) + t * side(2, n - i)
        c = (1 - s) * (1 - t) * corner(0) + s * (1 - t) * corner(1) + s * t * corner(2) + (1 - s) * t * corner(3)
        pts.append(a + b - c)
    pts = cast(np.array(pts), P) if keys else []
    for k, p in zip(keys, pts):
        G[k] = cage.add(p)
    for i in range(n):
        for j in range(n):
            cage.face(G[(i, j)], G[(i + 1, j)], G[(i + 1, j + 1)], G[(i, j + 1)])
    return G
