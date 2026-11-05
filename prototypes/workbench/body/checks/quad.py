"""The quadruped plan's measures for the cage checks (chunk 19): the head, neck and chest, the tail's taper and size, the mesh by range and balance over four soles. Each takes the same Ctx as the biped's and returns the same row, and the biped's check functions hand a quadruped's Ctx to these (checks/biped.py), so a check has one id, one name and one fail line on both plans.
The numbers are the biped's where nobody gave the quadruped its own (marked); the tail's are the quadruped's own, the heavier tail the owner allowed it (decisions 2 Nov 18:26: tail size and balance limits are set per plan).
Everything is read off the cage as built: the radius of each ring is the side-most vertex of the torso's ring, at its arc length along the spine (quadruped.py keys the section table by the same arc length)."""
import numpy as np

from . import row
from . import proof as PR
from .biped import BIPED, SW, f2, lim

QUAD = dict(
    neck_ratio=BIPED["neck_ratio"],            # the biped's: the neck band under 0.85 of the head and of the chest (spec 8.2)
    dome_overhang=BIPED["dome_overhang"],      # the biped's: the head's ball stands 0.12 H or more over the neck band
    tail_side_area=0.4,                        # the quadruped's heavier tail: its side area at most 2/5 of the trunk's (the biped's is 1/4); the plan's band corner (length 2.4, root 0.8, tip 0.15) measures 0.44, so the limit binds before the bands do
    tail_root=0.8,                             # the quadruped's tail root, at most 0.8 of the seat radius (the biped's 0.47); the plan's band in species_v1
    balance_margin=BIPED["balance_margin"],    # the rule asks the centre of mass 15 % of the sole polygon's shorter side inside its edge
)
JUNCTION = 0.005
WORD = dict(nonplanar="bend")              # how a mesh ratio is named on screen
RANGES = ("head", "neck", "back", "seat", "tail")


def is_quad(ctx):
    sp = ctx.spec
    return isinstance(sp, dict) and sp.get("schema") == "mb-species/1" and sp.get("plan") == "quadruped"


def proj(ctx, az=90, el=10.0):
    """The proof frame's projector: the plan's own framing of the long body, as the proxy renderer takes it."""
    import quadruped as Q
    fr = (ctx.mesh or {}).get("frame") if isinstance(ctx.mesh, dict) else None
    fr = fr or Q.frame(ctx.doc)
    return PR.projector(az, el, centre=fr["centre"], ppH=PR.PPH * float(fr["scale"]))


def _cached(ctx, key, fn):
    d = ctx.__dict__.setdefault("_quad", {})
    if key not in d:
        d[key] = fn()
    return d[key]


def torso_faces(ctx):
    """(V, F, attr, torso face mask, torso-only vertices) of the cage, mirrored."""
    import mquality as MQ

    def go():
        b = ctx.body
        V, F, attr, fp = MQ.full_topology(b)
        tor = fp == b.parts["torso"]
        only = np.setdiff1d(np.unique(F[tor]), np.unique(F[~tor]))                      # not the vertices a leg shares with the torso
        return V, F, attr, tor, only
    return _cached(ctx, "faces", go)


def ring_radii(ctx):
    """(s, side radius) of every ring of the torso: the arc length along the spine and the side-most vertex's distance from it (column 4 of the 9 is the side)."""
    def go():
        V, F, attr, tor, only = torso_faces(ctx)
        v = only[np.abs(attr[only, 2] - 0.5) < 1e-6]
        s = np.unique(np.round(attr[v, 1], 6))
        r = np.array([np.abs(V[v[np.abs(attr[v, 1] - x) < 1e-6], 1]).max() for x in s])
        return s, r
    return _cached(ctx, "rings", go)


def range_edges(ctx):
    p = ctx.body.ctx["params"]
    at, out = 0.0, {}
    for n in RANGES[:4]:
        out[n] = (at, at + p[n])
        at += p[n]
    out["seat"] = (out["seat"][0], at - JUNCTION)                        # a ring that lands on the seat's end sits where the rump meets the tail's thin root (the cage dents there a little): it is neither the seat's nor the tail's
    out["tail"] = (at + JUNCTION, p["total"] + 0.01)
    return out


def _at(ctx, s):
    """The point of the spine at arc length s."""
    return ctx.body.ctx["path"].at([float(s)])[0][0]


# ----------------------------------------------------------------------------------------------------------------------------------------------- head.neck
def head_neck(ctx):
    s, r = ring_radii(ctx)
    rg = range_edges(ctx)
    inr = lambda a, b: (s >= a - 1e-9) & (s <= b + 1e-9)
    head_i = np.where(inr(*rg["head"]))[0]
    neck_i = np.where(inr(rg["head"][0] + 0.9 * (rg["head"][1] - rg["head"][0]), rg["neck"][1]))[0]
    chest_i = np.where(inr(rg["neck"][1], rg["back"][1]))[0]
    ih = head_i[r[head_i].argmax()]
    inn = neck_i[r[neck_i].argmin()]
    ic = chest_i[r[chest_i].argmax()]
    Wh, Wn, Wc = float(r[ih]), float(r[inn]), float(r[ic])
    r_head, r_chest = Wn / Wh, Wn / Wc
    dome = Wh - Wn
    lim_ = lim(ctx, "neck_ratio", QUAD["neck_ratio"])
    wide, flat = max(r_head, r_chest) >= lim_, dome < QUAD["dome_overhang"]
    meas = (f"Neck is {r_head:.2f} of the head and {r_chest:.2f} of the chest, limit {lim_:.2f}" if wide else
            (f"Back of the head overhangs the neck by {dome:.2f} H, needs {QUAD['dome_overhang']:.2f}" if flat else
             f"Neck is {r_head:.2f} of the head and {r_chest:.2f} of the chest (limit {lim_:.2f}); the head overhangs the neck by {dome:.2f} H"))
    bad = wide or flat
    P = proj(ctx)
    ax = ctx.body.ctx["params"]["axis_z"]
    nx = P(_at(ctx, s[inn]) + np.array([0, 0, Wn]))[0]
    cx = P(_at(ctx, s[inn]))[0]
    col = PR.RED if bad else PR.SAGE
    # the radii plotted along the spine, under the figure
    px0, py0, pw, ph = 48, 694, 204, 42
    xs = lambda u: px0 + pw * u / s[-1]
    ys = lambda v: py0 + ph - ph * v / (1.05 * max(float(r.max()), 1e-9))
    pts = [(xs(a), ys(b)) for a, b in zip(s, r)]
    mark = lambda i, name, v, c, dy=-12, anchor="middle": [PR.dot(xs(s[i]), ys(r[i]), 7, c), PR.label(xs(s[i]) + {"end": -8, "start": 8, "middle": 0}[anchor], ys(r[i]) + dy, f"{name} {v:.2f}", c, anchor, 16, bg=False)]
    out = [PR.ring(nx[0], (nx[1] + cx[1]) / 2, 44, col, 4), PR.panel(24, 628, 560, 140), PR.poly(pts, PR.INK, 3),
           PR.label(40, 652, "Side radius along the spine, head to tail (H)", PR.INK, "start", 17, bg=False),
           *mark(ih, "head", Wh, PR.INK, -12, "middle"), *mark(inn, "neck", Wn, PR.RED if wide else PR.INK, 26), *mark(ic, "chest", Wc, PR.INK, -12, "start"),
           PR.label(290, 696, f"Neck {r_head:.2f} of the head", PR.RED if wide else PR.INK, "start", 16, bg=False),
           PR.label(290, 722, f"and {r_chest:.2f} of the chest", PR.RED if wide else PR.INK, "start", 16, bg=False),
           PR.label(290, 752, f"Head overhangs the neck by {dome:.2f} H", PR.RED if flat else PR.INK, "start", 16, bg=False)]
    return row("fail" if bad else "pass", f2(max(r_head, r_chest)), lim_, meas, dict(mode="clay", az=90, svg="".join(out)), dict(fail=("Back of the head is flat" if flat and not wide else None)))


# ----------------------------------------------------------------------------------------------------------------------------------------------- tail.taper
def tail_taper(ctx):
    p = ctx.body.ctx["params"]
    s, r = ring_radii(ctx)
    sel = (s >= p["u_e"] + JUNCTION) & (s <= p["total"] - 2 * p["tip_r"])                           # from the seat's end to the stalk before the tip's half ball
    st, rt = s[sel], r[sel]
    rise = rt - np.minimum.accumulate(rt)                                                  # how far a ring stands over the smallest ring before it: a taper never rises
    worst = float(rise.max()) if len(rise) else 0.0
    k = int(rise.argmax()) if len(rise) else 0
    bump = worst > 0.01                                                                   # a ring may read a hair high where the mesh relaxes (0.006 H); a real bulge is more
    meas = (f"Radius grows {worst:.3f} H toward the tip, {st[k]:.2f} H along the spine" if bump else f"Radius only shrinks, from {rt[0]:.2f} H at the root to {rt[-1]:.2f} H at the end")
    P = proj(ctx)
    px0, py0, pw, ph = 48, 676, 360, 58
    rm = float(max(rt.max(), 1e-9))
    pts = [(px0 + pw * (st[i] - st[0]) / max(st[-1] - st[0], 1e-9), py0 + ph - ph * (rt[i] / rm)) for i in range(len(st))]
    tp = P(np.array([_at(ctx, x) for x in np.linspace(p["u_e"], p["total"], 24)]))
    out = [PR.box(tp[:, 0].min(), tp[:, 1].min(), tp[:, 0].max(), tp[:, 1].max(), PR.RED if bump else PR.SAGE), PR.panel(24, 640, 560, 128), PR.poly(pts, PR.RED if bump else PR.INK, 4),
           PR.label(px0, 666, "Tail radius, root to tip (H)", PR.INK, "start", 18, bg=False), PR.label(px0, py0 + ph + 26, "root", PR.INK, "start", 18, bg=False), PR.label(px0 + pw, py0 + ph + 26, "tip", PR.INK, "end", 18, bg=False),
           PR.label(px0 + pw + 24, py0 + 54, f"root {rt[0]:.3f} H", PR.INK, "start", 17, bg=False)]
    if bump:
        out += [PR.dot(pts[k][0], pts[k][1], 8, PR.RED), PR.label(pts[k][0] - 14, pts[k][1] + 26, f"bump {worst:.3f} H", PR.RED, "end")]
    return row("fail" if bump else "pass", f2(worst), 0, meas, dict(mode="clay", az=90, svg="".join(out)))


# ----------------------------------------------------------------------------------------------------------------------------------------------- tail.size
def tail_share(ctx):
    """(tail share of the trunk's side area, tail px, trunk px, tail's faces): the silhouette areas at az 90 of the torso's faces behind the seat's end and in front of it (the legs are not the trunk)."""
    p = ctx.body.ctx["params"]
    m = ctx.mesh
    V, F = np.asarray(m["V"], float), np.asarray(m["F"], int)
    tor = [k for k, v in m["names"].items() if v == "torso"][0]
    cut = p["x0"] - p["u_e"]
    cx = V[F][:, :, 0].mean(1)
    torso = np.asarray(m["part"])[F].astype(int)
    torso = (torso == tor).sum(1) >= 3
    tail_f, trunk_f = torso & (cx < cut), torso & (cx >= cut)
    ppH = 80.0
    x_lo, z_hi = float(V[:, 0].min()) - 0.1, float(V[:, 2].max()) + 0.1
    w, h = int((V[:, 0].max() - x_lo + 0.2) * ppH), int((z_hi + 0.1) * ppH)
    xy = np.stack([(V[:, 0] - x_lo) * ppH, (z_hi - V[:, 2]) * ppH], 1)
    a_tail = int(PR.raster(xy, F[tail_f], w, h).sum())
    a_trunk = int(PR.raster(xy, F[trunk_f], w, h).sum())
    return a_tail / max(a_trunk, 1), a_tail, a_trunk, F[tail_f]


def tail_size(ctx):
    p = ctx.body.ctx["params"]
    share, a_tail, a_trunk, Ft = tail_share(ctx)
    limit = lim(ctx, "tail_side_area", QUAD["tail_side_area"])
    root_ratio = p["root_r"] / p["seat_r"]
    root_lim = lim(ctx, "tail_root", QUAD["tail_root"])
    big_root = root_ratio > root_lim + 1e-9
    bad = share > limit
    P = proj(ctx)
    q = P(np.asarray(ctx.mesh["V"], float)[np.unique(Ft)])
    out = [PR.box(q[:, 0].min(), q[:, 1].min(), q[:, 0].max(), q[:, 1].max(), PR.RED if bad or big_root else PR.SAGE), PR.panel(24, 628, 560, 140),
           PR.bar(40, 664, 400, 1.0, "Trunk side area", f"{a_trunk / 80 ** 2:.2f} H²", PR.INK),
           PR.bar(40, 712, 400, share / max(limit * 1.3, 1e-9), "Tail", f"{share * 100:.0f}% of the trunk", PR.RED if bad else PR.SAGE, limit / max(limit * 1.3, 1e-9), f"limit {limit * 100:.0f}%")]
    if big_root:
        out.append(PR.label(40, 758, f"Root {root_ratio:.2f} of the seat radius, limit {root_lim:.2f}", PR.RED, "start", 18, bg=False))
    meas = f"Side area {share:.3f} of the trunk, limit {limit:.2f}" + (f"; root {root_ratio:.2f} of the seat radius, limit {root_lim:.2f}" if big_root else "")
    return row("fail" if bad or big_root else "pass", f2(share), limit, meas, dict(mode="clay", az=90, svg="".join(out)), dict(share=share, tail_px=a_tail, trunk_px=a_trunk, root_ratio=root_ratio, limit_text=f"Side area at most {limit:.2f} of the trunk · root at most {root_lim:.2f} of the seat radius"))


# ----------------------------------------------------------------------------------------------------------------------------------------------- mesh
def mesh_quality(ctx):
    """Edge, ring, area and planarity ratios of the loft's quads in each range. The caps at the nose and the tail's tip are grid caps with a topology of their own (every vertex of a cap face sits on the last ring), so only the quads between rings are judged."""
    import mquality as Q
    V, F, attr, tor, only = torso_faces(ctx)
    u = attr[:, 1]
    rg = range_edges(ctx)
    th = dict(area_ratio_max=BIPED["area_ratio"] / 2.0, nonplanar_max=BIPED["nonplanar"] / 6.0)
    loft = tor & ~(np.ptp(u[F], axis=1) < 1e-9)
    rows_, bad = {}, []
    for nm in RANGES:
        lo, hi = rg[nm]
        inside = ((u[F] >= lo - 1e-9) & (u[F] <= hi + 1e-9)).all(1)
        Fr = F[loft & inside]
        along, rnd = [], []
        for f in Fr:
            for k in range(4):
                a, c = int(f[k]), int(f[(k + 1) % 4])
                L = float(np.linalg.norm(V[a] - V[c]))
                (rnd if abs(u[a] - u[c]) < 1e-9 else along).append(L)
        r = dict(faces=len(Fr), along=max(along) / min(along) if along else 1.0, around=max(rnd) / min(rnd) if rnd else 1.0, area=Q.area_ratio(V, Fr), nonplanar=Q.nonplanarity(V, Fr))
        r["bad"] = [k for k, lim_ in (("along", BIPED["ratio_along"]), ("around", BIPED["ratio_around"]), ("area", BIPED["area_ratio"]), ("nonplanar", BIPED["nonplanar"])) if r[k] > lim_]
        rows_[nm] = r
        if r["bad"]:
            bad.append(nm)
    return rows_, bad, V, F, loft, u, rg


def mesh(ctx):
    rows_, bad, V, F, loft, u, rg = mesh_quality(ctx)
    P = proj(ctx)
    out = []
    for nm in bad:
        lo, hi = rg[nm]
        inside = ((u[F] >= lo - 1e-9) & (u[F] <= hi + 1e-9)).all(1)
        c0 = P(V[np.unique(F[loft & inside])].mean(0))[0]
        out.append(PR.ring(c0[0], c0[1], 46, PR.RED, 4))
    out.append(PR.panel(24, 628, 560, 148))
    out.append(PR.label(36, 650, "Worst ratio in each range (limit)", PR.INK, "start", 17, bg=False))
    for i, (nm, r) in enumerate(rows_.items()):
        y = 676 + 20 * i
        out.append(PR.label(36, y, nm, PR.RED if nm in bad else PR.INK, "start", 18, bg=False))
        out.append(PR.label(104, y, f"along {r['along']:.1f} ({BIPED['ratio_along']:.0f})  around {r['around']:.1f} ({BIPED['ratio_around']:.0f})  area {r['area']:.1f} ({BIPED['area_ratio']:.0f})  bend {r['nonplanar']:.2f} ({BIPED['nonplanar']:.1f})", PR.INK, "start", 15, bg=False))
    meas = (f"{bad[0]}: " + ", ".join(f"{WORD.get(k, k)} {rows_[bad[0]][k]:.2f}" for k in rows_[bad[0]]["bad"])) if bad else "Edge, area and planarity ratios are inside the limits in every range"
    return row("fail" if bad else "pass", len(bad), 0, meas, dict(mode="wire", az=90, svg="".join(out)),
               dict(parts=[], fail=(f"Thin or bent faces in the {bad[0]}" if bad else None), bad_ranges=list(bad), ranges={k: {a: round(float(b_), 3) for a, b_ in v.items() if a != "bad"} | dict(bad=list(v["bad"])) for k, v in rows_.items()}))


# ----------------------------------------------------------------------------------------------------------------------------------------------- balance
def balance(ctx):
    m = ctx.body.ctx["balance"]
    lim_ = lim(ctx, "balance_margin", QUAD["balance_margin"], "max")
    bad = not m["inside"] or m["margin"] < lim_
    P = proj(ctx)
    com = np.asarray(m["com"], float)
    H = np.asarray(m["hull"], float)
    x0, x1 = float(H[:, 0].min()), float(H[:, 0].max())
    a, b, c, c0 = P([x0, 0, 0.0])[0], P([x1, 0, 0.0])[0], P(com)[0], P([com[0], 0, 0.0])[0]
    col = PR.RED if bad else PR.SAGE
    # the four soles' polygon from above, in the panel: x runs along the body as on the figure (the head to the right at az 90 is -x here)
    ex, ey = float(np.ptp(H[:, 0])), float(np.ptp(H[:, 1]))
    sc = min(120.0 / max(ex, 1e-6), 96.0 / max(ey, 1e-6))
    cx0, cy0 = 500.0, 706.0
    top = lambda x, y: (cx0 - (x - float(H[:, 0].mean())) * sc, cy0 + y * sc)
    hull_pts = [top(x, y) for x, y in H]
    out = [PR.line(a, b, col, 10), PR.line(c, c0, PR.INK, 3, "8 6"), PR.dot(c[0], c[1], 9, PR.RED if bad else PR.INK), PR.label(c[0] + 14, c[1] - 6, "centre of mass", PR.INK),
           PR.panel(24, 628, 560, 140), PR.poly(hull_pts, col, 3, "rgba(79,125,68,.18)" if not bad else "rgba(201,52,64,.18)", True)]
    for k, v in m["soles"].items():
        t = top(*v["centre"])
        out.append(PR.dot(t[0], t[1], 6, PR.INK))
    t = top(com[0], com[1])
    out += [PR.dot(t[0], t[1], 8, PR.RED if bad else PR.INK), PR.label(40, 664, "From above: the four soles", PR.INK, "start", 17, bg=False),
            PR.label(40, 700, (f"{m['margin_H']:.2f} H inside the edge" if m["inside"] else f"{-m['margin_H']:.2f} H outside the soles"), col, "start", 18, bg=False),
            PR.label(40, 730, (f"{m['margin'] * 100:.0f}% of the short side (limit {lim_ * 100:.0f}%)" if m["inside"] else f"{-m['margin'] * 100:.0f}% of the short side out \u00b7 needs {lim_ * 100:.0f}% in"), col, "start", 18, bg=False)]
    meas = (f"Centre of mass {m['margin'] * 100:.0f}% of the soles' short side inside their edge, limit {lim_ * 100:.0f}%" if m["inside"] else
            f"Centre of mass {-m['margin'] * 100:.0f}% of the soles' short side outside their edge, needs {lim_ * 100:.0f}% inside")
    r = row("fail" if bad else "pass", f2(m["margin"]), lim_, meas, dict(mode="clay", az=90, svg="".join(out)))
    way = "forwards" if com[0] > float(np.mean(H[:, 0])) else "backwards"
    r["extra"]["fail"] = (f"Tips over {way}" if not m["inside"] else f"Weight too far {'forward' if way == 'forwards' else 'back'}") if bad else None
    return r


# ----------------------------------------------------------------------------------------------------------------------------------------------- joins, head.attach, limbs (chunk 20 step 0: every check runs on the quadruped)
LEG_REACH = 0.7                 # a quadruped's number (the biped has no such measure): a leg's root stands within 0.7 H of its girdle joint (S22's are 0.56 and 0.54)
LEG_PINCH = 0.8                 # a quadruped's number: the narrowest ring between the socket and the middle of the leg is at least 0.8 of the middle's width (the biped's rule is for ears: "no pinch below the middle")
LEGS = ("fore.L", "hind.L")


def leg_join_report(ctx, name):
    """What the soft join of a leg is, from the cage: the socket loop's width along the body, the leg's first ring and its middle ring widths (also along the body), and the narrowest of the rings from the socket to the middle over the middle's width."""
    b = ctx.body
    rec = b.ctx["info"]["limbs"][name]
    Vc, m = b.cage.arr(), b.ctx["remap"]
    loop = [m[v] for v in rec["loop"] if v in m]
    rings = [[m[v] for v in r if v in m] for r in rec["rings"]]
    w = lambda ids: float(np.ptp(Vc[ids][:, 0]))
    foot, ws = w(loop), [w(r) for r in rings]
    mid = ws[len(ws) // 2]
    return dict(footprint=foot, first=ws[0], mid=mid, pinch=min([foot] + ws[: len(ws) // 2 + 1]) / mid, narrow=min(ws[: len(ws) // 2 + 1]) / mid, centre=np.asarray(Vc[loop]).mean(0))


def joins(ctx):
    spec = ctx.body.ctx["spec"]
    parts = {q["id"]: q for q in spec["parts"] if q.get("kind") == "limb"}
    lines, bad, pts = [], [], []
    for name in LEGS:
        j = (parts[name].get("socket") or {}).get("join")
        word = "foreleg" if name.startswith("fore") else "hind leg"
        if j not in ("soft", "hard"):
            bad.append(word)
            lines.append(f"{word}: no join declared")
        elif j == "soft":
            r = leg_join_report(ctx, name)
            ok = r["narrow"] >= LEG_PINCH and r["first"] >= r["footprint"] - 1e-9
            lines.append(f"{word}: soft, grows from a {r['footprint']:.2f} H patch to {r['first']:.2f} H wide" + ("" if ok else (f", pinched to {r['narrow']:.2f} of its middle (needs {LEG_PINCH:.1f})" if r["narrow"] < LEG_PINCH else ", narrower than its patch")))
            if not ok:
                bad.append(word)
            pts.append((word, r["centre"], not ok))
        else:
            lines.append(f"{word}: {j}")
    P = proj(ctx, 90, 10.0)
    out = [PR.panel(24, 640, 560, 128)]
    for word, c0, isbad in pts:
        x, y = P(c0)[0]
        out.append(PR.ring(x, y, 30, PR.RED if isbad else PR.SAGE, 4))
    for i, ln in enumerate(lines):
        out.append(PR.label(36, 672 + 34 * i, ln, PR.RED if bad and any(ln.startswith(w) for w in bad) else PR.INK, "start", 19, bg=False))
    first = bad[0] if bad else ""
    return row("fail" if bad else "pass", len(bad), 0, "; ".join(lines), dict(mode="clay", az=90, svg="".join(out)), dict(parts=bad, fail=(f"{first.capitalize()} join is half-blended" if first else None)))


def head_attach(ctx):
    sp = ctx.body.ctx["spec"]
    ha = sp["spine"]["head_attach"]
    p = ctx.body.ctx["params"]
    probs = []
    if abs(float(ha.get("a", 0.0))) > 1e-9:
        probs.append(f"a {ha.get('a')}: a quadruped's head is entered from behind, a is 0")
    if abs(float(ha.get("d", 0.0))) > 1e-9:
        probs.append(f"d {ha.get('d')}: a quadruped's head is entered from behind, d is 0")
    dz = abs(float(ha.get("z_under", p["axis_z"])) - p["axis_z"])
    if dz > 0.05:
        probs.append(f"the head is {dz:.2f} H off the spine axis (0.05 at most)")
    P = proj(ctx)
    pts = np.array([_at(ctx, x) for x in np.linspace(0, p["head"] + p["neck"] + 0.1, 12)])
    xy = P(pts)
    ball = P(_at(ctx, p["R_head"]))[0]
    out = [PR.poly(xy, PR.BLUE, 5), PR.ring(ball[0], ball[1], 40, PR.RED if probs else PR.SAGE, 4), PR.dot(ball[0], ball[1], 7, PR.INK), PR.label(ball[0] + 46, ball[1] - 16, "head, entered from behind", PR.INK), PR.label(xy[len(xy) // 2][0], xy[len(xy) // 2][1] + 34, "spine axis", PR.BLUE, "middle")]
    return row("fail" if probs else "pass", f2(abs(float(ha.get("a", 0.0)))), "0", "; ".join(probs) if probs else f"From behind on the spine axis at {p['axis_z']:.2f} H, a {float(ha.get('a', 0.0)):.2f}, d {float(ha.get('d', 0.0)):.2f}", dict(mode="clay", az=90, svg="".join(out)))


def limbs(ctx):
    import quadruped as Q
    doc = ctx.doc
    p = ctx.body.ctx["params"]
    g = Q.girdle_joints(doc, p)
    lp = Q.limb_parts(doc, p)
    probs, pts = [], []
    for name in LEGS:
        k = "chest" if name.startswith("fore") else "pelvis"
        word = "Foreleg" if name.startswith("fore") else "Hind leg"
        l = lp[name]
        root = np.asarray(l["P"][0], float)
        off = float(np.linalg.norm(root - g[k]))
        side = float(Q.table(doc, [g["u"][k]], p)[0][0])
        n3 = len(l["joints"]) - 1
        if n3 != 3:
            probs.append((word, f"the {word.lower()} has {n3} bones, shoulder-elbow-wrist (hip-knee-ankle) need 3"))
        elif off > LEG_REACH:
            probs.append((word, f"{word.lower()} root is {off:.2f} H from its girdle joint, limit {LEG_REACH:.1f}"))
        elif abs(root[1]) > side:
            probs.append((word, f"{word.lower()} root stands {abs(root[1]) - side:.2f} H outside the body at its girdle"))
        pts.append((word, k, g[k], root, off))
    P = proj(ctx)
    out = []
    for word, k, gj, root, off in pts:
        a, c = P(gj)[0], P(root)[0]
        out += [PR.dot(a[0], a[1], 8, PR.INK), PR.line(a, c, PR.RED if probs else PR.INK, 3, "6 5"), PR.dot(c[0], c[1], 7, PR.RED if probs else PR.INK), PR.label(a[0], a[1] - 18, k, PR.INK, "middle"), PR.label(c[0] + 12, c[1] + 30, f"{word.lower()} {off:.2f} H", PR.INK, "start")]
    out = [PR.panel(24, 700, 560, 68), PR.label(36, 742, f"each root within {LEG_REACH:.1f} H of its girdle joint, under the body", PR.INK, "start", 18, bg=False)] + out
    first = probs[0] if probs else None
    return row("fail" if probs else "pass", len(probs), 0, first[1] if first else "Shoulders and hips are on their girdles: three bones to each foot, the chest joint on the back range, the pelvis joint on the seat range",
               dict(mode="clay", az=90, svg="".join(out)), dict(fail=(f"{first[0]} floats off its girdle" if first else None), parts=["legs"] if probs else []))
