"""Grid caps on a half ring (body-spec s2.2.5: the end ring then a 2 x 4 grid per half; the ring runs from the mirror line round to the mirror line, 2 na + nb + 1 = 9 vertices).
The interior is a Coons patch of the ring in the ring's own plane (lat, N), cast onto a dome along T: it is RE-PLACED from the current ring each limit-fix step, so the cap never
fights the ring that the compensation moves (the fix targets only vertices that are not cap interiors)."""
import numpy as np


class HalfCap:
    def __init__(self, body, ring, part, pt, Tg, Nn, sgn, depth, na=2, nb=4, flip=False):
        self.ring, self.na, self.nb, self.sgn, self.depth = list(ring), na, nb, sgn, depth
        self.pt, self.Tg, self.Nn = np.asarray(pt, float), np.asarray(Tg, float), np.asarray(Nn, float)
        self.lat = np.cross(self.Nn, self.Tg)
        assert len(ring) == 2 * na + nb + 1
        P = body.cage.arr()[ring]
        u, w = self._uv(P)
        self.ry, self.rz, self.wc = u.max(), 0.5 * (w.max() - w.min()), 0.5 * (w.max() + w.min())
        self.keys = [(i, j) for i in range(na) for j in range(1, nb)]
        pos = self.positions(P)
        self.G = {}
        for i in range(na + 1):
            self.G[(i, 0)] = ring[i]
            self.G[(na - i, nb)] = ring[na + nb + i]
        for j in range(nb + 1):
            self.G[(na, j)] = ring[na + j]
        self.G[(0, 0)], self.G[(0, nb)] = ring[0], ring[-1]
        self.ids = []
        for k, p in zip(self.keys, pos):
            self.G[k] = body.add(p, part, 0.0, 0.0, target=None, centre=(k[0] == 0))
            self.ids.append(self.G[k])
        G = self.G
        for i in range(na):
            for j in range(nb):
                q = (G[(i, j)], G[(i + 1, j)], G[(i + 1, j + 1)], G[(i, j + 1)])
                body.face(*(q[::-1] if flip else q), part)
        body.caps = getattr(body, "caps", []) + [self]

    def _uv(self, P):
        d = P - self.pt
        return d @ self.lat, d @ self.Nn

    def positions(self, P):
        """Interior positions (len(keys), 3) from the ring points P (the 2 na + nb + 1 ring vertices, 3D)."""
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
        for k in self.keys:
            a = uv[k]
            q = np.clip((a[0] / self.ry) ** 2 + ((a[1] - self.wc) / self.rz) ** 2, 0, 1)
            off = self.sgn * self.depth * np.cos(np.pi / 2 * np.sqrt(q)) ** 2
            p = self.pt + a[0] * self.lat + a[1] * self.Nn + off * self.Tg
            if k[0] == 0:
                p[1] = 0.0
            out.append(p)
        return np.array(out)

    def replace(self, body):
        A = body.cage.arr()
        A[self.ids] = self.positions(A[self.ring])
        body.cage.set_arr(A)
