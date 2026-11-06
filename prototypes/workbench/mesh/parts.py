"""The parts of Loika as quad cages (design §3-§6), in house axes, REST pose, world coordinates (the head's origin is K's centre at kc).
Each builder returns a Cage fitted to the house's field. Head: half chart 9 columns x 8 bands (+ crown cap, collar cap). Torso: half rings of 9 at
9 stations. Leg: 8-point rings, 6 stations. Paw: a dome of 16-point rings on a flat sole, with three extruded beans."""
import math
import numpy as np
from cage import Cage, fit, bisect_ray, grid_faces, coons_cap, ring_cap
from housefield import find_front, to_local, from_local, Rz, sstep

CAGE_A = dict(  # [mesh] numbers that belong to the cage, not to the shape (design §0 item 2, §3.3); the shape's numbers are all the house's
    socket_bump=0.03,            # the crown socket stands this far proud of K's crown (H)
    row_merge=0.035,             # rows closer than this merge (H)
    cap_rim_z=0.44,              # the crown cap's rim row (H, head frame): the design says "about 0.40"; the brow row sits at 0.378
    socket_lid_scale=0.78, socket_floor_scale=0.55,
    chin_row=0.05,               # round 3: the chin's row sits this far under the smile (H); the jaw mass of fc80e5312 hangs the chin lower than the old chart's 0.09
    collar_drop=0.05,            # round 3: the collar row (where the head closes inside the chest) is this far under the chin row: the round dome has its jaw and chin embedded in the chest from about z -0.45
    bean_out=0.075,              # how far a bean stands out of the dome's front (H), the two extrusions together
)


def _dir(phi):
    return np.stack([np.cos(phi), np.sin(phi), np.zeros_like(phi)], -1)


# ================================================================================================ the head
def build_head(H):
    g, rf, K = H.g, H.rf, H.K
    kk = H.house["kinds"]["head"][H.kinds["head"]]
    sb = kk.get("crown-set-back", 0)
    ax = lambda z: np.stack([-sb * np.asarray(z, float), np.zeros_like(np.asarray(z, float)), np.asarray(z, float)], -1)
    d0 = H.dh      # the house head: the skull, the crown's rise, the muzzle and the jaw (the nose, eyes and mouth are the cage's own features)
    C = Cage("head")
    R = g["Reye"]
    zE, yE = g["zEye"], g["yE"]
    # ---- columns: phi from the front centre line, round the left side
    def phi_of(y, z):
        x = float(find_front(d0, y, z))
        return math.atan2(y, x - float(ax(z)[0]))
    nose_half = H.nose["r"][1]
    phis = [0.0, phi_of(nose_half, g["noseCz"]), phi_of(yE - 0.6 * R, zE), phi_of(yE, zE), phi_of(yE + 0.6 * R, zE)]
    phis.append((phis[4] + math.pi / 2) / 2)
    phis += [math.pi / 2, math.radians(125), math.radians(155), math.pi]
    phis = np.array(phis)
    # ---- rows (head frame z), from the crown down
    rows = dict(r0=CAGE_A["cap_rim_z"], r1=zE + R + 0.04, r2=zE + 0.6 * R, r3=zE, r4=g["noseCz"],
                r5=g["noseCz"] - g["noseHalfH"], r6=g["mouthZ"], r7=g["mouthZ"] - CAGE_A["chin_row"], r8=g["mouthZ"] - CAGE_A["chin_row"] - CAGE_A["collar_drop"])
    # r4: the mean of the eye's bottom and the nose centre; r5: the nose's lower edge (the cream's dark muzzle begins there); the design's r5 "below the nose"
    # sits 0.25 gap under it and would be 0.03 from r6, so r5 is the nose's own lower edge
    rows["r4"] = 0.5 * (zE - 0.6 * R + g["noseCz"])
    names = list(rows)
    zs = np.array([rows[n] for n in names])
    for i in range(1, len(zs)):
        assert zs[i - 1] - zs[i] >= CAGE_A["row_merge"] - 1e-9, f"rows {names[i-1]} and {names[i]} are closer than {CAGE_A['row_merge']}: {zs[i-1] - zs[i]:.4f}"
    ring_ids = {}
    for n, z in zip(names, zs):
        o = np.repeat(ax(z)[None], len(phis), 0)
        P = bisect_ray(d0, o, _dir(phis), 0.0, 2.0)
        P[0, 1] = 0.0
        P[-1, 1] = 0.0
        ring_ids[n] = [C.add(p) for p in P]
    grid_faces(C, [ring_ids[n] for n in names], closed=False)
    C.rings = ring_ids
    # ---- caps: the crown (cast up) and the collar (cast down), a 2 x 5 half grid each
    xy = lambda P: P[:, :2]
    up = lambda s: lambda uv, P: bisect_ray(d0, np.column_stack([uv[:, 0], uv[:, 1], np.zeros(len(uv))]), np.tile([0, 0, s], (len(uv), 1)), 0.0, 1.0)
    G = coons_cap(C, ring_ids["r0"], 2, 5, xy, None, up(1.0))
    GC = coons_cap(C, ring_ids["r8"], 2, 5, xy, None, up(-1.0))
    C.crown, C.collar = G, GC
    C.phis, C.rows = phis, dict(zip(names, zs))
    return C


def head_features(H, C):
    """After the fit: the crown socket bump, the eye sockets (inset twice, floor sunk), the mound nose, the smile (design §3.2-§3.3). Everything is placed
    relative to the fitted surface. Returns the feature record (vertex sets for creases, paint attributes and the leaves' root)."""
    g, rf, fp = H.g, H.rf, H.fp
    A = C.arr()
    d0 = H.dh      # the house head: the skull, the crown's rise, the muzzle and the jaw (the nose, eyes and mouth are the cage's own features)
    rid, G = C.rings, C.crown
    feat = {}
    # the crown socket: faces (a = 0, b = 2 and 3) of the crown cap: vertices a 0-1, b 2-4
    sock = [G[(a, b)] for a in (0, 1) for b in (2, 3, 4)]
    for v in sock:
        a = [k for k, i in G.items() if i == v][0][0]
        A[v, 2] += CAGE_A["socket_bump"] * (1.0 if a == 0 else 0.5)
        C.hold.add(v)
    feat["socket_centre"] = G[(0, 3)]
    # the mound nose: the window c0-c1 x r3-r5, raised after the fit along the nose frame's normal (forward, tilted up)
    nf, nr = H.nose["frame"], H.nose["r"]
    amp = rf["nose-relief"] * nr[0]
    for (c, r), w in {(0, "r4"): 1.0, (1, "r4"): 0.45, (0, "r3"): 0.2, (0, "r5"): 0.45, (1, "r3"): 0.0, (1, "r5"): 0.15}.items():
        v = rid[r][c]
        A[v] += nf["n"] * amp * w
        C.hold.add(v)
    feat["nose_window"] = [rid[r][c] for r in ("r3", "r4", "r5") for c in (0, 1)]
    # the smile: row r6; the corner is the column nearest y = mouth-width E / 2, slid to it, set in by the tube, curled up
    mw2, tube = H.mouth["w"] / 2, H.mouth["tube"]
    r6 = rid["r6"]
    for c in (0, 1, 2):
        v = r6[c]
        y = A[v, 1] if c < 2 else mw2
        z = float(H.mouth["zAt"](y))
        x = float(find_front(d0, y, z))
        p = np.array([x, y, z])
        n = H.grad(d0, p[None], 1e-3)[0]
        p = p - n * tube
        A[v] = p
        C.hold.add(v)
        C.tags.setdefault("ink_mouth", {})[v] = 1.0
    for a, b in ((r6[0], r6[1]), (r6[1], r6[2])):
        C.set_crease(a, b, 0.7)
    feat["smile"] = r6[:3]
    # the eye sockets (the left one; the Mirror makes the right): the window c2-c4 x r2-r4, inset twice, the floor sunk along the eye's normal
    e = H.eyes[0]
    win = [[rid[r][c] for c in (2, 3, 4)] for r in ("r2", "r3", "r4")]
    loop0 = [win[0][0], win[0][1], win[0][2], win[1][2], win[2][2], win[2][1], win[2][0], win[1][0]]
    centre = win[1][1]
    cc = A[centre].copy()
    old = [i for i, f in enumerate(C.F) if set(f) <= {v for row in win for v in row} and len(set(f) & set(loop0)) >= 2 and centre in f]
    assert len(old) == 4, f"eye window faces: {len(old)}"
    keep = [f for i, f in enumerate(C.F) if i not in old]
    C.F = keep
    ln, lat, up_ = e["n"], e["lat"], e["up"]
    def shrink(loop, s, push):
        out = []
        for v in loop:
            q = cc + (A[v] - cc) * s
            out.append(C.add(q + ln * push))
        return out
    depth = rf["socket-depth"]
    def circle(loop, r):         # round the loop: the same angles about the eye centre in the eye's plane, one radius
        out = []
        for v in loop:
            d = A[v] - cc
            ang = math.atan2(float(d @ up_), float(d @ lat))
            out.append(C.add(cc + r * (math.cos(ang) * lat + math.sin(ang) * up_)))
        return out
    a_win = 0.6 * g["Reye"]
    loop1 = circle(loop0, a_win * CAGE_A["socket_lid_scale"])    # the lid line
    loop2 = circle(loop0, a_win * CAGE_A["socket_floor_scale"])  # the floor's rim, sunk
    # re-seat each inset ring on the surface (so the dip is a dip of the surface, not a hole in space), then sink the floor
    for loop, push in ((loop1, 0.0), (loop2, -depth)):
        P = np.array([C.V[v] for v in loop])
        S = bisect_surface(H.dK, P, ln)
        for v, s in zip(loop, S):
            C.V[v] = list(s + ln * push)
    A = C.arr()
    A[centre] = bisect_surface(H.dK, A[[centre]], ln)[0] - ln * depth
    C.set_arr(A)
    for l in (loop1, loop2):
        C.hold.update(l)
    C.hold.add(centre)
    n = len(loop0)
    for k in range(n):
        C.face(loop0[k], loop0[(k + 1) % n], loop1[(k + 1) % n], loop1[k])
        C.face(loop1[k], loop1[(k + 1) % n], loop2[(k + 1) % n], loop2[k])
        C.set_crease(loop0[k], loop0[(k + 1) % n], 0.3)
        C.set_crease(loop1[k], loop1[(k + 1) % n], 0.8)
    # the floor: 2 x 2 faces round the centre vertex
    for k in (0, 2, 4, 6):   # corners at loop index 0, 2, 4, 6 (the window's four corners); the floor's quads: corner, edge, centre, edge
        C.face(loop2[k], loop2[(k + 1) % n], centre, loop2[(k - 1) % n])
    # the brow: the rim loop's upper vertices pushed out a little
    for v in loop0[:3]:
        C.V[v] = list(np.array(C.V[v]) + ln * 0.35 * depth)
    feat["eye"] = dict(centre=centre, loop0=loop0, loop1=loop1, loop2=loop2)
    return feat


def bisect_surface(dK, P, n):
    """The point on K's surface along the line through P in direction n (inside at -0.4, outside at +0.4)."""
    a, b = np.full(len(P), -0.4), np.full(len(P), 0.4)
    for _ in range(40):
        m = (a + b) / 2
        inside = dK(P + m[:, None] * n) < 0
        a, b = np.where(inside, m, a), np.where(inside, b, m)
    return P + ((a + b) / 2)[:, None] * n


# ================================================================================================ the torso
def build_torso(H, n_st=21, even=False):    # round 4: 21 stations (9 in round 3): fix 8 pulls the pelvis 0.24 S forward, and the fore and hind legs' ports (2 x 2 faces each) need two stations between them
    C = Cage("torso")
    pc, pr, cc, cr = H.pelvis["c"], H.pelvis["r"], H.chest["c"], H.chest["r"]
    x0, x1 = pc[0] - pr[0], cc[0] + cr[0]
    fld = H.dTorso
    xs = x0 + (x1 - x0) * (1 - np.cos(np.pi * (np.arange(n_st) + 1) / (n_st + 1))) / 2
    if even:        # round 5: stations at equal arc length along the torso's profile (the cosine spacing crowds the rings at both ends: edge ratio 11.7 at level 3)
        xf = np.linspace(x0, x1, 400)
        rr = []
        for x in xf:
            zin = pc[2] + (cc[2] - pc[2]) * float(np.clip((x - pc[0]) / (cc[0] - pc[0]), 0, 1))
            r = bisect_ray(fld, np.array([[x, 0, zin], [x, 0, zin]]), np.array([[0, 1.0, 0], [0, 0, 1.0]]), 0, 1.5)
            rr.append((r[0, 1] + (r[1, 2] - zin)) / 2 if fld(np.array([[x, 0, zin]]))[0] < 0 else 0.0)
        rr = np.array(rr); s_ = np.concatenate([[0], np.cumsum(np.hypot(np.diff(xf), np.diff(rr)))])
        xs = np.interp((np.arange(n_st) + 1) / (n_st + 1) * s_[-1], s_, xf)
    th = np.pi * np.arange(9) / 8
    rings = []
    for x in xs:
        zin = pc[2] + (cc[2] - pc[2]) * float(np.clip((x - pc[0]) / (cc[0] - pc[0]), 0, 1))
        top = bisect_ray(fld, np.array([[x, 0, zin]]), np.array([[0, 0, 1.0]]), 0, 1.5)[0, 2]
        bot = bisect_ray(fld, np.array([[x, 0, zin]]), np.array([[0, 0, -1.0]]), 0, 1.5)[0, 2]
        zc = (top + bot) / 2
        D = np.stack([np.zeros(9), np.sin(th), np.cos(th)], -1)
        P = bisect_ray(fld, np.tile([x, 0, zc], (9, 1)), D, 0, 1.2)
        P[0, 1] = P[-1, 1] = 0.0
        rings.append([C.add(p) for p in P])
    grid_faces(C, rings, closed=False)
    yz = lambda P: P[:, 1:3]
    def cast(sign):
        return lambda uv, P: bisect_ray(fld, np.column_stack([np.full(len(uv), P[:, 0].mean()), uv[:, 0], uv[:, 1]]), np.tile([sign, 0, 0], (len(uv), 1)), 0, 1.0)
    C.cap_rear = coons_cap(C, rings[0], 2, 4, yz, None, cast(-1.0))
    C.cap_front = coons_cap(C, rings[-1], 2, 4, yz, None, cast(1.0))
    C.rings = {f"st{i}": r for i, r in enumerate(rings)}
    C.stations_x = xs
    return C


# ================================================================================================ a leg (left side) and its paw
def build_leg(H, lg, even=False):
    k = H.S
    C = Cage("leg." + lg["name"], mirrored=False)
    top, ank, mc, mr = lg["top"], lg["ank"], lg["mass_c"], lg["mass"]
    elz = lg["el_c"][2]
    zs = [top[2] + 0.5 * mr[2], top[2], top[2] - 0.25 * (top[2] - ank[2]), elz, ank[2] + 0.5 * (elz - ank[2]), ank[2]]
    if even:      # round 5: equal spacing in z from the ankle to the top of the mass (the ring spacing of rounds 1-4 ran from 0.04 to 0.21 H on a hind leg: edge ratio 7 at level 3)
        zs = list(np.linspace(zs[0], zs[-1], 5))
    th = 2 * np.pi * np.arange(8) / 8
    D = np.stack([np.cos(th), np.sin(th), np.zeros(8)], -1)
    fld = lg["d_column"]
    rings = []
    for z in zs:
        t = float(np.clip((top[2] - z) / (top[2] - ank[2]), 0, 1))
        c = np.array([top[0] + (ank[0] - top[0]) * t, top[1] + (ank[1] - top[1]) * t, z])
        P = bisect_ray(fld, np.tile(c, (8, 1)), D, 0, 0.9)
        rings.append([C.add(p) for p in P])
    grid_faces(C, rings, closed=True)
    cast = lambda s: lambda uv, P: bisect_ray(fld, np.tile(P.mean(0), (len(uv), 1)), np.tile([0, 0, s], (len(uv), 1)), 0, 1.0)
    C.cap_top = ring_cap(C, rings[0], 2, cast(1.0))
    C.cap_bottom = ring_cap(C, rings[-1][::-1], 2, cast(-1.0))
    C.rings = {f"L{i}": r for i, r in enumerate(rings)}
    if even:
        sst = lambda a, b, x: float(np.clip((x - a) / (b - a), 0, 1) ** 2 * (3 - 2 * np.clip((x - a) / (b - a), 0, 1)))
        C.ring_w = {f"L{i}": (1 - sst(elz - 0.08, elz + 0.08, z), sst(elz - 0.08, elz + 0.08, z)) for i, z in enumerate(zs)}      # the upper bone above the elbow, the lower below, blended across it
        C.ring_w = {n: (u, l) for n, (l, u) in C.ring_w.items()}
    return C


def build_paw(H, lg):
    k = H.S
    C = Cage("paw." + lg["name"], mirrored=False)
    rx, ry, rz = H.pawR
    c0, Rp = lg["paw_c"], lg["paw_R"]
    hh = 2 * rz
    zf = [0.09, 0.50, 0.72, 0.90]                     # sole rim, band-1 top (a bean is as tall as wide), shoulder, top rim (fractions of h) [mesh]
    N = 16
    th = np.arange(N) * 2 * np.pi / N                 # vertex 0 is on the paw's front (local +x): the middle bean is faces -1 and 0
    rings = []
    for f in zf:
        zl = f * hh - rz
        s = math.sqrt(max(1e-9, 1 - (zl / rz) ** 2))
        Pl = np.stack([rx * s * np.cos(th), ry * s * np.sin(th), np.full(N, zl)], -1)
        P = from_local(c0, Rp, Pl)
        rings.append([C.add(p) for p in P])
    grid_faces(C, rings, closed=True)
    fld = lg["d_paw"]
    # the flat sole: a 4 x 4 cap at z = 0; the dome's top: a 4 x 4 cap cast up onto the ellipsoid
    def sole(uv, P):
        return np.column_stack([uv[:, 0], uv[:, 1], np.zeros(len(uv))])
    top_cast = lambda uv, P: bisect_ray(fld, np.column_stack([uv[:, 0], uv[:, 1], np.full(len(uv), c0[2])]), np.tile([0, 0, 1.0], (len(uv), 1)), 0, 0.5)
    C.cap_sole = ring_cap(C, rings[0][::-1], 4, sole)
    C.cap_top = ring_cap(C, rings[-1], 4, top_cast)
    for v in rings[0]:
        C.hold.add(v)
    for v in C.cap_sole.values():
        C.hold.add(v)
    C.rings = {f"P{i}": r for i, r in enumerate(rings)}
    C.N = N
    return C


def paw_beans(H, lg, C, fitted_field):
    """After the fit: three beans, each a 2-face strip of band P0-P1, extruded twice (0.55 of the depth scaled to 0.9, then 0.45 scaled to 0.55). The
    middle bean is faces -1 and 0 (centred on the paw's front); the side beans are faces 2, 3 and -4, -3 (+-67.5 deg, where the house's toes sit); the grooves
    are faces 1 and -2. The middle bean is 1.12 x the others. Old faces replaced by walls and a 2-quad cap."""
    N = C.N
    r0, r1 = C.rings["P0"], C.rings["P1"]
    A = C.arr()
    tr = H.rig["toe-radii"]
    k = H.S
    bean_h = 2 * tr[2] * k
    depth = CAGE_A["bean_out"]
    face_of = {frozenset((r0[j % N], r0[(j + 1) % N], r1[(j + 1) % N], r1[j % N])): j % N for j in range(N)}
    drop = set()
    new_faces = []
    out = {}
    for name, js, size in (("mid", (-1, 0), 1.12), ("right", (2, 3), 1.0), ("left", (-4, -3), 1.0)):
        quads = [(r0[j % N], r0[(j + 1) % N], r1[(j + 1) % N], r1[j % N]) for j in js]
        for q in quads:
            drop.add(frozenset(q))
        ja, jb = js[0], js[1] + 1                                   # the strip runs from vertex ja to vertex jb (3 vertices)
        loop = [r0[ja % N], r0[(ja + 1) % N], r0[jb % N], r1[jb % N], r1[(ja + 1) % N], r1[ja % N]]
        P = A[loop]
        cen = P.mean(0)
        nrm = np.cross(P[2] - P[0], P[5] - P[0])
        nrm /= np.linalg.norm(nrm)
        if np.dot(nrm, cen - lg["paw_c"]) < 0:
            nrm = -nrm
        cur = loop
        for d, sc in ((0.55 * depth * size, 0.9), (0.45 * depth * size, 0.62)):
            Pc = np.array([C.V[v] for v in cur])
            cc = Pc.mean(0)
            q = [C.add(cc + (p - cc) * sc + nrm * d) for p in Pc]
            for v in q:
                C.tags.setdefault("toe", {})[v] = 1.0
            for a in range(6):
                new_faces.append((cur[a], cur[(a + 1) % 6], q[(a + 1) % 6], q[a]))
            cur = q
        new_faces.append((cur[0], cur[1], cur[4], cur[5]))
        new_faces.append((cur[1], cur[2], cur[3], cur[4]))
        out[name] = dict(base=loop, tip=cur)
        for a in range(6):
            C.set_crease(loop[a], loop[(a + 1) % 6], 0.6)
        for v in loop + cur:
            C.hold.add(v)
            C.tags.setdefault("toe", {})[v] = 1.0
    for js in ((1,), (-2,)):                                       # the grooves: pulled in a little, vertical edges creased
        j = js[0]
        quad = (r0[j % N], r0[(j + 1) % N], r1[(j + 1) % N], r1[j % N])
        for v in quad:
            C.tags.setdefault("toe", {})[v] = 0.75
        C.set_crease(quad[1], quad[2], 0.8)
        C.set_crease(quad[0], quad[3], 0.8)
        for v in (quad[2], quad[3]):
            n = A[v] - lg["paw_c"]
            n[2] = 0
            n /= np.linalg.norm(n)
            C.V[v] = list(np.array(C.V[v]) - n * 0.008)
    C.F = [f for f in C.F if frozenset(f) not in drop] + new_faces
    C.beans = out
    C.bean_height = bean_h
    return out
