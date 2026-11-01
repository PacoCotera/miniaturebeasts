"""Crown attachments (body-spec s3): closed shapes grown along their own paths on the head's crown socket. A small turtle (the s3.3 grammar: S stem segment, + pitch, & roll, L leaf, [ ] push/pop) writes PATHS;
each path is then swept into closed quads (blade or tube) with its own rings and end caps (poles at the ends, never at the contact), sunk into the head. Families: fan (n leaves), sprout (a stem and two leaves),
bud (a stem, a closed bud and sepals), vine (a curling stem with alternate leaflets). Every Loika has a crown (owner ruling): `crown` is a dict of resolved numbers from creature.json.
Local frame: the head's (x forward, y left, z up), turned to the world by the head pitch. Half model: items on the mirror plane are half shapes (y >= 0); off-plane items are full rings with every vertex y > 0."""
import math
import numpy as np
from housefield import from_local, Ry

DEFAULT = dict(family="fan", count=3, length=1.1, width=1.1, spread=0.0, curl=0.2, seed=41713, lean=0.0)
# the house's fan (crest.leaves): [yoff, len, wid, roll, lean, twist]; symmetric arrangements per count (the master's -62, 8, 66 is hand-drawn asymmetry)
FAN = {3: [(0.0, 0.68, 0.44, 0, -0.22, 0), (0.5, 0.70, 0.42, 64, 0.10, 14)],
       4: [(0.2, 0.68, 0.42, 24, -0.12, 8), (0.5, 0.70, 0.42, 66, 0.10, 16)],
       5: [(0.0, 0.68, 0.44, 0, -0.22, 0), (0.3, 0.66, 0.40, 34, -0.04, 8), (0.5, 0.70, 0.42, 70, 0.10, 18)]}


def unit(v):
    v = np.asarray(v, float)
    return v / np.linalg.norm(v)


class Turtle:
    """State (pos, H heading, L left, U up). Writes items: ('leaf', base, H, across, length, width) and ('stem', pts, radii)."""
    def __init__(self, pos, H=(0, 0, 1.0), L=(0, 1.0, 0), U=(-1.0, 0, 0)):
        self.p, self.H, self.L, self.U = np.array(pos, float), unit(H), unit(L), unit(U)
        self.stack, self.items = [], []

    def rot(self, axis, a):
        c, s = math.cos(a), math.sin(a)
        def R(v, k):
            return v * c + np.cross(k, v) * s + k * (k @ v) * (1 - c)
        k = {"H": self.H, "L": self.L, "U": self.U}[axis]
        for n in ("H", "L", "U"):
            if n != axis:
                setattr(self, n, unit(R(getattr(self, n), k)))

    def pitch(self, deg): self.rot("U", math.radians(deg))        # about the up axis: the heading turns toward the left
    def tilt(self, deg): self.rot("L", math.radians(deg))         # about the left axis: the heading nods (positive: forward = +U direction)
    def roll(self, deg): self.rot("H", math.radians(deg))
    def push(self): self.stack.append((self.p.copy(), self.H.copy(), self.L.copy(), self.U.copy()))
    def pop(self): self.p, self.H, self.L, self.U = self.stack.pop()
    def move(self, l): self.p = self.p + self.H * l


def jit(rng, v, rel): return v * (1 + rel * (2 * rng.random() - 1))


def grow(crown, seed_digest="S01"):
    """Interpreter: the family's rule -> items (paths). Jitter: angles +-6 deg, lengths +-5 %, PCG64 seeded by (genome digest, socket)."""
    c = {**DEFAULT, **crown}
    rng = np.random.Generator(np.random.PCG64([int(c["seed"]), 7]))
    fam, n = c["family"], int(c["count"])
    items = []
    if fam == "fan":
        rules = FAN[min(max(n, 3), 5)]
        arr = []
        for (yoff, ln, wid, roll, lean, tw) in rules:
            arr.append((yoff, ln, wid, roll, lean, tw))        # left side only: the Mirror makes the right leaf
        for (yoff, ln, wid, roll, lean, tw) in arr:
            t = Turtle((0, yoff * 0.25 + (0.14 if roll != 0 else 0.0), 0))
            a = math.radians(roll + c["spread"] * (1 if roll >= 0 else -1) * (abs(roll) / 64 if roll else 0) + ((rng.random() - .5) * 12 if roll != 0 else 0.0))
            d = np.array([lean + c["lean"], math.sin(a), math.cos(a)])
            across0 = np.array([0, math.cos(a), -math.sin(a)])
            d = unit(d)
            ph = math.radians(tw)
            an0 = unit(np.cross(across0, d))
            across = across0 * math.cos(ph) + an0 * math.sin(ph)
            an = unit(np.cross(across, d))
            items.append(dict(kind="leaf", base=t.p.copy(), H=d, B=across, N=an, length=jit(rng, ln * c["length"], .05), width=jit(rng, wid * c["width"], .05), curl=c["curl"] * 40.0))
    elif fam in ("sprout", "bud", "vine"):
        nseg = {"sprout": 3, "bud": 2, "vine": 5}[fam]
        L0 = {"sprout": 0.55, "bud": 0.30, "vine": 0.40}[fam] * c["length"]
        turn = (c["curl"] * (80 if fam != "vine" else 70 * 1.0))
        t = Turtle((0, 0, 0), H=(-0.15, 0, 1.0))
        pts, rad = [t.p.copy()], [0.10]
        r0 = 0.10
        for k in range(nseg):
            t.move(L0 / nseg * jit(rng, 1, .05))
            t.tilt(-turn / nseg)                       # curl: the stem bends back (toward -x)
            pts.append(t.p.copy()); rad.append(r0 * (1 - 0.3 * (k + 1) / nseg))
            if fam == "vine" and k >= 1:
                t.push(); t.roll(90); t.tilt(-35)
                items.append(dict(kind="leaf", base=t.p.copy() + np.array([0, 0.09, 0]), H=t.H.copy(), B=unit(np.cross(t.H, (0, 0, 1)) + 1e-6), N=unit(np.cross(unit(np.cross(t.H, (0, 0, 1)) + 1e-6), t.H)), length=0.30 * c["length"], width=0.20 * c["width"], curl=10))
                t.pop()
        items.append(dict(kind="stem", pts=np.array(pts), radii=np.array(rad), H=unit(t.H)))
        tip = t.p.copy(); H = t.H.copy()
        if fam == "sprout":
            for sg in (1,):                     # left leaf only: the Mirror makes the right one
                a = math.radians(55 + c["spread"]) * sg
                d = unit(H * math.cos(a) + np.array([0, 1.0, 0]) * math.sin(a) * 1.0 + np.array([0, 0, 0.25]))
                B = unit(np.cross(np.array([-1.0, 0, 0]), d) + 1e-6); N = unit(np.cross(B, d))
                items.append(dict(kind="leaf", base=tip + np.array([0, 0.14 * sg, 0]), H=d, B=np.array([0.0, 1.0, 0.0]) * 0 + unit(np.array([0, 1.0, 0]) - d * d[1]) , N=unit(np.cross(unit(np.array([0, 1.0, 0]) - d * d[1]), d)), length=0.36 * c["length"], width=0.22 * c["width"], curl=10))
        elif fam == "bud":
            items.append(dict(kind="bud", base=tip, H=unit(H), r=(0.13, 0.11, 0.17) , length=0.2))
            for sg, roll in ((0, 0), (1, 70)):
                a = math.radians(roll + sg * c["spread"])
                d = unit(np.array([-0.1, math.sin(a) * 0.7, math.cos(a)]))
                B = unit(np.array([0, math.cos(a), -math.sin(a)])); N = unit(np.cross(B, d))
                items.append(dict(kind="leaf", base=tip + np.array([0, 0.0 if sg == 0 else 0.17 * sg, -0.04]), H=d, B=B, N=N, length=0.30 * c["length"], width=0.15 * c["width"], curl=0))
    return items


def _smoothstep(x): return x * x * (3 - 2 * x)


def sweep(body, part, centres, Ts, Ns, Bs, hw, ht, camber, on_plane, from_l, closed_caps=True, ring_n=None):
    """Closed shape along the path. centres/Ts/Ns/Bs per station (local); hw(s), ht(s) half width (along B) and half thickness (along N). Half rings if on_plane, else full 8 rings (or 6 for thin tubes)."""
    st = []
    nst = len(centres)
    if on_plane:
        psi = np.radians(np.array([-90, -45, 0, 45, 90]) if ring_n in (None, 8) else np.array([-90, -30, 30, 90]))
    else:
        nn = ring_n or 8
        psi = np.radians(np.arange(nn) * 360.0 / nn)
    rings = []
    for k in range(nst):
        ids = []
        for m, ps in enumerate(psi):
            u = hw[k] * math.cos(ps); v = ht[k] * math.sin(ps) + camber[k] * (math.cos(ps) ** 2) * (1 if hw[k] > 0 else 0)
            p = centres[k] + Bs[k] * u + Ns[k] * v
            w = from_l(p)
            ids.append(body.add(w, part, k / max(nst - 1, 1), m / len(psi), target=w, centre=(on_plane and (m in (0, len(psi) - 1)))))
        rings.append(ids)
    for a_, b_ in zip(rings, rings[1:]):
        n = len(a_)
        rng_ = range(n - 1) if on_plane else range(n)
        for m in rng_:
            body.face(a_[m], a_[(m + 1) % n], b_[(m + 1) % n], b_[m], part)
    for ring, sgn, k in ((rings[0], -1, 0), (rings[-1], 1, nst - 1)):
        p = from_l(centres[k] + Ts[k] * sgn * max(hw[k], ht[k]) * 0.6)
        cv = body.add(p, part, float(k > 0), 0.0, target=p, centre=on_plane)
        n = len(ring)
        if on_plane:
            for m in range(0, n - 1, 2) if n == 5 else [0, 1, 2][:n - 2]:
                if n == 5:
                    body.face(ring[m], ring[m + 1], ring[m + 2], cv, part)
            if n == 4:
                body.face(ring[0], ring[1], ring[2], cv, part); body.face(ring[0], ring[2], ring[3], cv, part) if False else None
        else:
            for m in range(0, n, 2):
                body.face(ring[m], ring[(m + 1) % n], ring[(m + 2) % n], cv, part)
    return rings


def build_crown(body, ctx, crown=None):
    H = ctx["H"]
    crown = {**DEFAULT, **(crown or {})}
    kc = H.kc
    Rfa = ctx["info"]["head"]["Rfa"]
    from_l = lambda p: from_local(kc, Rfa, p)
    root_local = np.array(H.rig["crest"]["root"], float)
    items = grow(crown)
    out = []
    for it in items:
        if it["kind"] == "leaf":
            L, W = it["length"], it["width"]
            H0, B0, N0 = it["H"], it["B"], it["N"]
            base = root_local + it["base"] - H0 * 0.07            # sunk into the crown
            fr = np.array([0.0, 0.09, 0.22, 0.4, 0.6, 0.78, 0.92, 1.0])
            fr = fr[:-1] if False else fr
            s = fr * (L + 0.07) - 0.0
            cent, Ts, Ns, Bs, hw, ht, cam = [], [], [], [], [], [], []
            for f in fr:
                ss = f * L
                bend = math.radians(it["curl"]) * f * f                # the blade bends back (toward -x) with its curl
                Tg = unit(H0 * math.cos(bend) - np.array([1.0, 0, 0]) * 0 + N0 * 0 - np.array([0.0, 0, 0]) + (np.array([-1.0, 0, 0]) * math.sin(bend)))
                pos = base + H0 * ss * 1.0 + np.array([-1.0, 0, 0]) * (0.5 * L * math.sin(bend) * f)
                Bk = unit(B0 - Tg * (B0 @ Tg)); Nk = unit(np.cross(Bk, Tg))
                w = 0.5 * W * max(math.sin(math.pi * min(max(f, 0.03), 0.985)), 0.0) ** 0.62
                cent.append(pos); Ts.append(Tg); Bs.append(Bk); Ns.append(Nk)
                hw.append(max(w, 0.07 if f < 0.2 else 0.05)); ht.append(0.035 + 0.02 * math.sin(math.pi * f)); cam.append(0.045 * math.sin(math.pi * f))
            on_plane = abs(it["base"][1]) < 1e-9 and abs(B0[0]) < 1e-9 and abs(B0[2] * 0 + (B0 @ np.array([0, 0, 1.0]))) < 1e-9 + 1.0 and abs(B0[0]) < 1e-6 and abs(N0[1]) < 1e-6
            # a centre leaf is symmetric only if its across axis is +y and its path is in the xz plane
            on_plane = bool(abs(it["base"][1]) < 1e-9 and abs(H0[1]) < 1e-6 and abs(B0[0]) < 1e-6 and abs(B0[2]) < 1e-6)
            if on_plane:
                for a in (Bs, Ns, Ts):
                    pass
            rings = sweep(body, "crown", cent, Ts, Ns, Bs, hw, ht, cam, on_plane, from_l)
            out.append(dict(kind="leaf", on_plane=on_plane, centres=np.array(cent), length=L))
        elif it["kind"] == "stem":
            P = root_local + it["pts"] - np.array([0, 0, 0.06])
            nP = len(P)
            Ts = [unit(P[min(i + 1, nP - 1)] - P[max(i - 1, 0)]) for i in range(nP)]
            Ns = []
            for T_ in Ts:
                n_ = unit(np.array([-1.0, 0, 0]) - T_ * (np.array([-1.0, 0, 0]) @ T_)); Ns.append(n_)
            Bs = [np.cross(N_, T_) for N_, T_ in zip(Ns, Ts)]
            Bs = [unit(b_) for b_ in Bs]
            Bs = [b_ * (1 if b_[1] >= 0 else -1) for b_ in Bs]
            rad = it["radii"]
            sweep(body, "crown", list(P), Ts, Ns, Bs, list(rad), list(rad), [0] * nP, True, from_l)
            out.append(dict(kind="stem", centres=P, on_plane=True))
        elif it["kind"] == "bud":
            c = root_local + it["base"] + it["H"] * 0.05
            H0 = it["H"]; rx, ry, rz = it["r"]
            Nn = unit(np.array([-1.0, 0, 0]) - H0 * (np.array([-1.0, 0, 0]) @ H0)); Bb = unit(np.cross(Nn, H0)); Bb = Bb * (1 if Bb[1] >= 0 else -1)
            us = [-0.85, -0.5, 0.0, 0.5, 0.85]
            cent = [c + H0 * rz * u for u in us]
            hw = [ry * math.sqrt(1 - u * u) for u in us]; ht = [rx * math.sqrt(1 - u * u) for u in us]
            sweep(body, "crown", cent, [H0] * 5, [Nn] * 5, [Bb] * 5, hw, ht, [0] * 5, True, from_l)
            out.append(dict(kind="bud", centres=np.array(cent), on_plane=True))
    ctx["info"]["crown"] = dict(items=out, params=crown, n=len(out))
    return out
