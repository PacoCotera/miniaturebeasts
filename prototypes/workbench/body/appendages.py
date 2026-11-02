"""Face attachment families for the body framework (pass 2, step 11, owner idea): whiskers, fangs, horns and tusks. Each family is a genome-driven set of small closed quad shells on sockets (true appendages: they sit on the surface, so their bases are tagged sharp creases like the
toes; vertex tag 1.0, which the normal test leaves out). A family has presence, count, size (length), curve and colour ranges; a species file says which families it allows (`families` in the species' `appendages` block); horns and tusks are put in place with tests for later species and
are not on Tuliko. Every family takes an `age` input in [0, 1] beside the genes: the genome sets the potential (maximum length, curl, girth, ridge style) and age sets how much of it is expressed (generic: `express(age, ...)`):
  length and curl grow with age with an ease-out; growth ridges are added along the shell, about one per 1/RINGS of age; the tip goes from a blunt nub (young) to a fuller point (adult); old age (> 0.85) adds wear (a blunted tip) and a darker base.
The shells are added AFTER the limit fit, to the finished half cage (the mirror gives the other side): `add_appendages(body, ctx, spec)`. Under numpy only; the family functions return the centre line and radii so the tests can read length and ridge count without a mesh."""
import math
import numpy as np

RINGS = 5            # horn growth ridges at age 1 (about one more ridge per 0.2 of age)
N_AROUND = 6


def ease_out(a):
    a = float(np.clip(a, 0.0, 1.0))
    return 1.0 - (1.0 - a) ** 2


def express(age, young, adult):
    """Interpolate a genome potential: `young` at age 0 and `adult` at age 1, with an ease-out (length and curl grow fast first and settle)."""
    return young + (adult - young) * ease_out(age)


def ridge_count(age):
    """About one growth ridge per 1/RINGS of age: never decreases with age."""
    return int(math.floor(float(np.clip(age, 0, 1)) * RINGS + 1e-9))


def horn_profile(age, length=0.35, girth=0.05, curl=1.0, ridges=True, n=18):
    """The centre line (m, 3) in the shell's local frame (x along the base direction, z up the curve's plane normal), the radii (m,), the ridge count and the wear of a horn of `age`: the genome gives the potential (length, girth, curl in radians at full age)."""
    L = express(age, 0.30 * length, length)
    turn = express(age, 0.25 * curl, curl)                 # the horn curls as it grows
    r0 = express(age, 0.85 * girth, girth)
    s = np.linspace(0.0, 1.0, n)
    ang = turn * s ** 1.3
    # centre line by integrating the heading
    heading = ang
    P = np.zeros((n, 3))
    for i in range(1, n):
        d = (s[i] - s[i - 1]) * L
        h = 0.5 * (heading[i] + heading[i - 1])
        P[i] = P[i - 1] + d * np.array([math.cos(h), 0.0, math.sin(h)])
    tip_blunt = 0.55 - 0.47 * ease_out(age)                 # tip radius over base radius: a blunt nub young, a fuller point adult
    wear = float(np.clip((age - 0.85) / 0.15, 0.0, 1.0))
    tip = tip_blunt + 0.30 * wear                           # old age blunts it again
    rad = r0 * ((1 - s) * (1.0 - 0.15 * s) + tip * s)
    nr = ridge_count(age)
    if ridges and nr > 0:
        for k in range(nr):
            c = (k + 1) / (RINGS + 1.0) * 0.95 + 0.02
            rad = rad * (1.0 + 0.16 * np.exp(-((s - c) / 0.035) ** 2))
    return P, rad, nr, wear


def tusk_profile(age, length=0.20, girth=0.03, curl=0.9, n=14):
    """A tusk: a short curved cone that grows with age (length and curl), pointing out and curving up; no ridges."""
    L = express(age, 0.4 * length, length)
    turn = express(age, 0.3 * curl, curl)
    r0 = express(age, 0.85 * girth, girth)
    s = np.linspace(0.0, 1.0, n)
    ang = turn * s
    P = np.zeros((n, 3))
    for i in range(1, n):
        d = (s[i] - s[i - 1]) * L
        h = 0.5 * (ang[i] + ang[i - 1])
        P[i] = P[i - 1] + d * np.array([math.cos(h), 0.0, math.sin(h)])
    rad = r0 * (1 - 0.88 * s ** 0.9)
    return P, rad


def whisker_profile(length=0.3, droop=0.3, curl=0.3, n=7, girth=0.011):
    L = float(length)
    s = np.linspace(0.0, 1.0, n)
    P = np.zeros((n, 3))
    P[:, 0] = L * s
    P[:, 2] = -droop * L * s ** 2 + curl * L * 0.5 * s ** 3         # droops, then the tip lifts a little
    rad = girth * (1 - 0.65 * s)
    return P, rad


def fang_profile(length=0.06, girth=0.018, n=4):
    s = np.linspace(0.0, 1.0, n)
    P = np.zeros((n, 3))
    P[:, 0] = length * s
    return P, girth * (1 - 0.92 * s ** 0.8)


# ---------------------------------------------------------------------- shells
def _frame(T, up=(0.0, 0.0, 1.0)):
    T = np.asarray(T, float) / np.linalg.norm(T)
    u = np.asarray(up, float) - (np.asarray(up, float) @ T) * T
    if np.linalg.norm(u) < 1e-6:
        u = np.array([1.0, 0, 0]) - (np.array([1.0, 0, 0]) @ T) * T
    u /= np.linalg.norm(u)
    return T, u, np.cross(T, u)


def place(local_P, origin, axis, up):
    """Rotate a local centre line (x along `axis`, local z along `up` made orthogonal) to the socket: returns world points."""
    ax, u, w = _frame(axis, up)
    return origin + local_P[:, 0:1] * ax + local_P[:, 2:3] * u + local_P[:, 1:2] * w


def sweep_shell(body, part, P, R, n=N_AROUND, tag=1.0, attr_t=True):
    """A closed quad shell along the centre line P (m, 3) with radii R (m,): rings of `n` vertices, a pole vertex at each end (n/2 quads per cap). Returns dict(rings, poles). The vertices get `tag` (base creases for the normal test) and
    attr s = their arc fraction (the coat reads colour from it). The caller keeps y > 0 (the half model)."""
    P = np.asarray(P, float); R = np.asarray(R, float)
    m = len(P)
    T = np.gradient(P, axis=0)
    rings = []
    up = np.array([0.0, 0.0, 1.0])
    for i in range(m):
        t, u, w = _frame(T[i], up)
        up = u
        ids = []
        for k in range(n):
            a = 2 * math.pi * k / n
            p = P[i] + R[i] * (math.cos(a) * u + math.sin(a) * w)
            v = body.add(p, part, i / (m - 1), k / n, target=p)
            body.tag[v] = tag
            ids.append(v)
        rings.append(ids)
    for a_, b_ in zip(rings, rings[1:]):
        for k in range(n):
            body.face(a_[k], a_[(k + 1) % n], b_[(k + 1) % n], b_[k], part)
    poles = []
    for ring, sgn, i in ((rings[0], -1, 0), (rings[-1], 1, m - 1)):
        tdir = T[i] / np.linalg.norm(T[i])
        p = P[i] + sgn * tdir * R[i] * 0.8
        v = body.add(p, part, float(i == m - 1), 0.0, target=p)
        body.tag[v] = tag
        poles.append(v)
        for k in range(0, n, 2):
            if sgn < 0:                                      # the base cap's fan runs the other way round (pass 3: with the tip's order its 48 faces folded against the sides, at every key of the waddle)
                body.face(v, ring[(k + 2) % n], ring[(k + 1) % n], ring[k], part)
            else:
                body.face(ring[k], ring[(k + 1) % n], ring[(k + 2) % n], v, part)
    return dict(rings=rings, poles=poles)


def add_shell(body, ctx, family, name, P, R, **info):
    """Register `name` as a part of the body and sweep its shell; the record goes to ctx['info']['appendages'][name]."""
    P = np.array(P, float)
    P[:, 1] = np.maximum(P[:, 1], 0.004)
    rec = sweep_shell(body, name, P, R)
    rec.update(family=family, P=P, R=np.asarray(R, float), **info)
    ctx.setdefault("info", {}).setdefault("appendages", {})[name] = rec
    return rec


def centre_length(P):
    return float(np.linalg.norm(np.diff(np.asarray(P, float), axis=0), axis=1).sum())


# ---------------------------------------------------------------------- the species' families
def add_appendages(body, ctx, opts):
    """opts: dict(whiskers=dict(count, length, droop, curl, glow), fangs=int, horn=dict(...), tusk=dict(...)). Sockets are on the loft's own surface (G.point at height z, around a); positions in H. Returns the log."""
    G = ctx["T"]
    log = {}
    w = opts.get("whiskers")
    if w and w.get("count", 0) > 0:
        n = int(w["count"])
        zs = np.linspace(1.50, 1.43, n) if n > 1 else [1.46]
        for k in range(n):
            a = 0.955 - 0.012 * k
            Pt = G.point(np.array([zs[k]]), np.array([a]))[0]
            spread = (k - (n - 1) / 2.0) * 0.22                      # fan the whiskers: up, level, down
            ax = np.array([0.25, 1.0, 0.0]) / np.linalg.norm([0.25, 1.0])
            ax = ax + np.array([0.0, 0.0, spread * 0.8])
            loc, rad = whisker_profile(w.get("length", 0.3), w.get("droop", 0.3), w.get("curl", 0.3))
            Pw = place(loc, Pt - 0.015 * ax / np.linalg.norm(ax), ax, np.array([0.0, 0.0, 1.0]))
            add_shell(body, ctx, "whisker", f"whisker.{k}", Pw, rad, glow=bool(w.get("glow", False)))
        log["whiskers"] = n
    f = int(opts.get("fangs", 0))
    if f > 0:
        for k in range(min(f, 2)):
            a = 0.972 - 0.012 * k
            Pt = G.point(np.array([1.435]), np.array([a]))[0]
            loc, rad = fang_profile(opts.get("fang_length", 0.06))
            Pf = place(loc, Pt + np.array([0.0, 0.0, 0.005]), np.array([0.0, 0.1, -1.0]), np.array([1.0, 0.0, 0.0]))
            add_shell(body, ctx, "fang", f"fang.{k}", Pf, rad)
        log["fangs"] = min(f, 2)
    h = opts.get("horn")
    if h:
        loc, rad, nr, wear = horn_profile(h.get("age", 1.0), h.get("length", 0.35), h.get("girth", 0.05), h.get("curl", 1.0))
        base = np.array(h.get("at", [0.05, 0.2, 2.05]))
        Ph = place(loc, base, np.array(h.get("axis", [0.0, 0.35, 1.0])), np.array([-1.0, 0.0, 0.0]) if h.get("curl_back", True) else np.array([1.0, 0.0, 0.0]))
        add_shell(body, ctx, "horn", "horn.0", Ph, rad, age=h.get("age", 1.0), ridges=nr, wear=wear)
        log["horn"] = dict(age=h.get("age", 1.0), length=centre_length(Ph), ridges=nr, wear=wear)
    t = opts.get("tusk")
    if t:
        loc, rad = tusk_profile(t.get("age", 1.0), t.get("length", 0.2), t.get("girth", 0.03), t.get("curl", 0.9))
        base = np.array(t.get("at", [0.5, 0.2, 1.38]))
        Pt_ = place(loc, base, np.array(t.get("axis", [0.5, 0.35, -1.0])), np.array([1.0, 0.0, 0.0]))
        add_shell(body, ctx, "tusk", "tusk.0", Pt_, rad, age=t.get("age", 1.0))
        log["tusk"] = dict(age=t.get("age", 1.0), length=centre_length(Pt_))
    return log
