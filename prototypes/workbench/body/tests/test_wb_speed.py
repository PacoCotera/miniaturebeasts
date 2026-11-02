"""Workbench chunk 3S: the cage got faster without changing. Each fast path is checked against the plain formula it replaced, bit for bit, and the twelve individuals' cages against their baseline hashes."""
import os, sys, json, unittest
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
sys.path.insert(0, HERE)
import paths as PA, subdiv as SD, relax as RX
from subdiv_first_version import subdivide_ref
from wb import hashing as H

SPEC = json.load(open(os.path.join(os.path.dirname(HERE), "species", "S20.json")))


def mono_plain(x, y, q):
    """mono_cubic as it was before the slopes were cached."""
    x, y = np.asarray(x, float), np.asarray(y, float)
    h = np.diff(x)
    d = np.diff(y) / h
    if len(x) == 2:
        m = np.array([d[0], d[0]])
    else:
        m = np.r_[d[0], [(0 if d[i - 1] * d[i] <= 0 else 2 / (1 / d[i - 1] + 1 / d[i])) for i in range(1, len(d))], d[-1]]
    q = np.clip(np.asarray(q, float), x[0], x[-1])
    i = np.clip(np.searchsorted(x, q) - 1, 0, len(h) - 1)
    t = (q - x[i]) / h[i]
    h00, h10, h01, h11 = 2 * t ** 3 - 3 * t ** 2 + 1, t ** 3 - 2 * t ** 2 + t, -2 * t ** 3 + 3 * t ** 2, t ** 3 - t ** 2
    return h00 * y[i] + h10 * h[i] * m[i] + h01 * y[i + 1] + h11 * h[i] * m[i + 1]


def cast_plain(G, c, w, tmax=1.8, step=0.02, steps=40):
    """One ray as G.cast did it: march in `step` to the first exit, then bisect, one point per distance call."""
    ts = np.arange(step, tmax + step, step)
    dd = G.d((c[None, :] + ts[:, None] * w[None, :]))
    k = int(np.where(dd > 0)[0][0])
    lo, hi = (ts[k - 1] if k > 0 else 0.0), ts[k]
    for _ in range(steps):
        m = 0.5 * (lo + hi)
        if float(G.d((c + m * w)[None])[0]) < 0:
            lo = m
        else:
            hi = m
    return c + 0.5 * (lo + hi) * w


def cube(n=1):
    V = np.array([[x, y, z] for z in (0, 1) for y in (0, 1) for x in (0, 1)], float)
    F = [(0, 2, 3, 1), (4, 5, 7, 6), (0, 1, 5, 4), (2, 6, 7, 3), (0, 4, 6, 2), (1, 3, 7, 5)]
    return V, F


def grid(nx, ny):
    V = np.array([[i, j, 0.1 * np.sin(i + 2 * j)] for j in range(ny + 1) for i in range(nx + 1)], float)
    F = [(j * (nx + 1) + i, j * (nx + 1) + i + 1, (j + 1) * (nx + 1) + i + 1, (j + 1) * (nx + 1) + i) for j in range(ny) for i in range(nx)]
    return V, F


def same(a, b):
    return (np.array_equal(a[0], b[0]) and [tuple(x) for x in a[1]] == [tuple(x) for x in b[1]] and list(a[2].items()) == list(b[2].items())
            and (a[3] is None and b[3] is None or np.array_equal(a[3], b[3])) and (a[4] is None and b[4] is None or (np.array_equal(a[4], b[4]) and a[4].dtype == b[4].dtype)))


class T(unittest.TestCase):
    def test_monotone_cubic_cached_and_column_forms_are_the_plain_formula(self):
        rng = np.random.default_rng(1)
        for n in (2, 3, 7, 40):
            x = np.sort(rng.random(n)) + np.arange(n) * 0.01
            Y = rng.random((n, 3)) * np.array([1, 5, -2])
            Y[:, 2] = np.sort(Y[:, 2])
            for q in (rng.random(50) * 1.3 - 0.1, rng.random((4, 6)), float(rng.random()), np.array([x[0], x[-1], x[n // 2]])):
                cols = PA.mono_cubic_cols(x, Y, q)
                for k in range(3):
                    p = mono_plain(x, Y[:, k], q)
                    self.assertTrue(np.array_equal(PA.mono_cubic(x, Y[:, k], q), p))
                    self.assertTrue(np.array_equal(cols[..., k], p))

    def test_neighbour_mean_is_the_mean_of_each_list(self):
        rng = np.random.default_rng(2)
        n = 300
        nbr = [np.array(sorted(rng.choice(n, size=int(rng.integers(1, 12)), replace=False)), int) for _ in range(n)]
        A = rng.normal(size=(n, 3))
        M = RX.neighbour_mean(nbr)(A)
        self.assertTrue(np.array_equal(M, np.array([A[nb].mean(0) for nb in nbr])))

    def test_subdivision_array_form_is_the_loop_form(self):
        rng = np.random.default_rng(3)
        V, F = cube()
        Vj = V + rng.normal(size=V.shape) * 0.05
        cases = [
            (V, F, None, None, None), (Vj, F, {}, None, None),
            (Vj, F, {(0, 1): 2, (1, 3): 1, (2, 3): 3}, rng.random((8, 2)), np.arange(6)),                     # creases, attributes, a face id
            (Vj, F, {(a, b): 2 for a, b in ((0, 1), (0, 2), (0, 4))}, None, None),                              # three sharp edges at a corner
            (Vj, F, {(0, 1): 2, (0, 2): 2}, None, np.arange(6) * 0.5),                                          # two at a vertex, a float face attribute
            (Vj, F, {(a, b): 3 for a, b in ((0, 1), (1, 3), (3, 2), (2, 0))}, None, None),                       # a creased loop, deeper than one level
        ]
        for V_, F_ in (grid(5, 4), grid(1, 1)):                                                                 # open meshes: boundary edges
            cases.append((V_, F_, None, rng.random((len(V_), 1)), np.arange(len(F_))))
        Vn = np.array([[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [1, 0, 1], [1, 1, 1], [-1, 0, 0.5], [-1, 1, 0.5], [3, 3, 3]], float)       # three quads on one edge, an unused vertex
        Fn = [(0, 1, 2, 3), (1, 4, 5, 2), (0, 3, 7, 6), (1, 2, 5, 4)]
        cases.append((Vn, Fn, None, None, None))
        for i, (V_, F_, cr, at, fa) in enumerate(cases):
            for L in (1, 2, 3):
                import warnings
                with warnings.catch_warnings():
                    warnings.simplefilter("ignore")
                    a = subdivide_ref(V_, F_, cr, at, fa, levels=L)
                    b = SD.subdivide(V_, F_, cr, at, fa, levels=L)
                self.assertTrue(same(a, b) or np.isnan(a[0]).any(), f"case {i} level {L}")
                if np.isnan(a[0]).any():
                    self.assertTrue(np.array_equal(np.isnan(a[0]), np.isnan(b[0])))
                    self.assertTrue(np.array_equal(a[0][~np.isnan(a[0])], b[0][~np.isnan(b[0])]))

    def test_rays_cast_together_land_where_they_land_one_at_a_time(self):
        import schema as SC
        from spine import SpineLoft
        spec, _ = SC.load(raw=SPEC)
        G = SpineLoft(spec)
        ss = G.stations(spec)
        C, W = [], []
        for s in (ss[0], ss[len(ss) // 3], ss[len(ss) // 2], ss[-5], ss[-1]):
            pt, T_, N, B = G.pa.at([s])
            th = np.pi * np.linspace(0, 1, 9)
            C.append(np.broadcast_to(pt[0], (9, 3)))
            W.append(np.cos(th)[:, None] * B[0][None] + np.sin(th)[:, None] * N[0][None])
        C, W = np.concatenate(C), np.concatenate(W)
        together = G.cast_rays(C, W)
        for r in range(0, len(W), 4):
            self.assertTrue(np.array_equal(together[r], cast_plain(G, C[r], W[r])))

    def test_a_cached_cast_is_the_cast_and_a_changed_surface_is_a_miss(self):
        import copy, schema as SC
        import spine as SP
        spec, _ = SC.load(raw=SPEC)
        G = SP.SpineLoft(spec)
        pt, T_, N, B = G.pa.at([G.stations(spec)[3]])
        th = np.pi * np.linspace(0, 1, 9)
        W = np.cos(th)[:, None] * B[0][None] + np.sin(th)[:, None] * N[0][None]
        C = np.broadcast_to(pt[0], W.shape)
        h0, m0 = SP.CAST_STATS["hit"], SP.CAST_STATS["miss"]
        a = G.cast_rays(C, W)
        b = SP.SpineLoft(spec).cast_rays(C, W)                       # a second loft object of the same file: a hit
        self.assertTrue(np.array_equal(a, b))
        self.assertEqual((SP.CAST_STATS["hit"] - h0, SP.CAST_STATS["miss"] - m0), (1, 1))
        b[0, 0] = 99.0                                               # the caller's copy is its own
        self.assertTrue(np.array_equal(a, G.cast_rays(C, W)))
        raw2 = copy.deepcopy(SPEC)
        raw2["parts"]["torso"]["masses"][0]["rho"] += 0.02           # a different body: a different key
        G2 = SP.SpineLoft(SC.load(raw=raw2)[0])
        m1 = SP.CAST_STATS["miss"]
        G2.cast_rays(C, W)
        self.assertEqual(SP.CAST_STATS["miss"], m1 + 1)

    def test_the_twelve_individuals_keep_their_cage_hashes(self):
        import s20genes as GN
        base = json.load(open(os.path.join(HERE, "fixtures", "wb_s20_twelve.json")))["hashes"]
        got = {str(i): H.cage_hash(GN.build_individual(SPEC, GN.creature(GN.draw(i)))) for i in range(1, 13)}
        self.assertEqual(got, base)


if __name__ == "__main__":
    unittest.main()
