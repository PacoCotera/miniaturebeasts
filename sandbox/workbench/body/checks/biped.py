"""The checks of the biped plan for the file and cage stages (spec 9), ported from the S20 tests with the owner's words (decisions.md; date and time as written there). Limits come from the plan (BIPED below) and a species file may only tighten them (`limits`).
Each check function takes a Ctx (the species file as the cage builder reads it, and for cage checks the built body) and returns a row: state, value, limit, the one measure line, a proof (mode, az, svg) and the nav rows it concerns.
Fields are the schema's dotted paths (mb-species/1)."""
import copy
import os
import re

import numpy as np

from . import check, row
from . import proof as PR

# The biped plan's limits. The plan modules are chunk 26; until then they live here, as numbers the owner or the AD gave (marked) or, where nobody gave one, the S20 type's own band (marked "S20 band").
BIPED = dict(
    ranges=["head", "neck", "back", "seat", "tail"],
    range_len=dict(head=(0.7, 1.3), neck=(0.15, 0.4), back=(0.6, 1.2), seat=(0.3, 0.8)),    # S20 band: Tuliko's 0.93, 0.25, 0.87, 0.50 with about a third either way
    tail_side_area=0.25,        # owner, 2 Nov 18:26: side area at most about 1/4 of the trunk
    tail_root=0.45,             # owner: root about 0.45 of the seat radius (the S20 test allows 0.47)
    neck_ratio=0.85,            # spec 8.2: ratio < 0.85 of both head and chest (the concave band)
    dome_overhang=0.12,         # S20 test: the skull overhangs the neck at the back by at least 0.12 H
    balance_margin=0.15,        # S20 test: at least 15 % of the sole length in front of the heel
    verts=3500, verts_warn=3850,    # owner, 2 Nov 23:17: about 3,500; "about" is up to 3,850
    normal_deg=20.0, tail_normal_deg=30.0, stalk_normal_deg=36.0,   # owner, 2 Nov 20:25 (S20 test: 20 degrees, 30 along the tail); the 36 on the 8-column stalk is the lead's ruling of 3 Nov (V9), ratified by the art director's sign of 3 Nov 2026 (ad-viability-2: the five worst stalk bends read as smooth curls at 304)
    head_attach=dict(attach="underside", a=(0.2, 0.6), d=(0.0, 0.3)),
    ratio_along=12.0, ratio_around=10.0, area_ratio=2.5 * 2.0, nonplanar=0.1 * 6.0, ring_ratio=2.2,    # S20 test thresholds for mesh quality by range
)
SW = dict(head="#f2c9a6", neck="#f2e3a0", back="#bcdcae", seat="#a9cfe0", tail="#d4c3ef")


def lim(ctx, name, plan, tighten="min"):
    """A plan limit, tightened (never loosened) by the file's `limits`."""
    v = (ctx.spec.get("limits") or {}).get(name)
    if v is None:
        return plan
    return min(plan, v) if tighten == "min" else max(plan, v)


def fmt(v, n=2):
    return f"{v:,.{n}f}"


def R(date, words):
    return dict(date=date, words=words)


def f2(v):
    return float(np.round(v, 4))


# 1 ------------------------------------------------------------------------------------------------------------------------------------------------------- schema
@check(id="schema", name="Species file", fail="The species file doesn't pass its schema", stage="file", version=1, part=[], fields=[],
       rule=R("2026-11-02 21:26", "Fields that are not listed are rejected, not ignored: the species file must pass its schema."), limit=dict(text="valid", value=None))
def c_schema(ctx):
    import schema as SC
    import species_v1 as V1
    from wb import facade as F
    errs = V1.validate(ctx.doc) if V1.is_v1(ctx.doc) else []
    if errs:
        return row("fail", f"{len(errs)} problem{'s' if len(errs) > 1 else ''}", "valid", errs[0][1] + (f" (and {len(errs) - 1} more)" if len(errs) > 1 else ""), extra=dict(field=errs[0][0]))
    try:
        if not F.is_quadruped(ctx.spec):                                          # a quadruped's file is the v1 file as it is: V1.validate above is its schema
            SC.validate(copy.deepcopy(ctx.spec))
    except Exception as e:                                                       # noqa: BLE001
        return row("fail", str(e), "valid", str(e), extra=dict(field=F._field_of(str(e))))
    return row("pass", "valid", "valid", "The file passes its schema")


# 1b ------------------------------------------------------------------------------------------------------------------------------------------------ expressions
@check(id="express", name="Looks can show", fail="{look} can never show", stage="file", version=1, part=[], fields=["expressions", "genome.loci"],
       rule=R("2026-11-02", "A look is only a look if some mibi inside the limits can show it: every need can be met, no look is unreachable, at most two loud looks show together at the wild rate, the ember rule holds, and a look that waits for an age has art at every age it shows."),
       limit=dict(text="every look can show", value=None))
def c_express(ctx):
    import expressions as X
    if not isinstance(ctx.doc.get("genome"), dict) or "loci" not in ctx.doc["genome"]:
        return row("pass", "no genome", "every look can show", "The file has no genome block, so it has no looks to check")
    probs, facts = X.express_report(ctx.doc)
    n = facts["expressions"]
    if probs:
        return row("fail", f"{len(probs)} problem{'s' if len(probs) > 1 else ''}", "every look can show", probs[0][1] + (f" (and {len(probs) - 1} more)" if len(probs) > 1 else ""), extra=dict(field=probs[0][0]))
    return row("pass", f"{n} expression{'s' if n != 1 else ''}", "every look can show", f"{n} expression{'s' if n != 1 else ''} can show; at most {facts['loud_kept']} loud looks together at the wild rate ({facts['wild_over_loud']:g} % of raw draws would show more)")


# 2 -------------------------------------------------------------------------------------------------------------------------------------------------------- ranges
@check(id="ranges", name="Spine ranges", fail="Spine ranges don't match the plan", stage="file", version=1, part=["head", "neck", "back", "seat", "tail"], fields=["spine.ranges"],
       rule=R("2026-11-02 17:43", "The spine is one object. The neck, back and its parts, and the tail are named segments of one path and one loft, not attached parts."),
       limit=dict(text="head, neck, back, seat, tail, each inside its band", value=None), az=90)
def c_ranges(ctx):
    plan = BIPED
    if isinstance(ctx.spec, dict) and ctx.spec.get("schema") in ("mb-species/1", "mb-species/2") and ctx.spec.get("plan") == "quadruped":              # the quadruped's file lists the ranges as {name, length}: the same bands, its own plan's
        import species_v1 as V1
        rg, at = {}, 0.0
        for r in ctx.doc["spine"]["ranges"]:
            end = at + (r["length"] if r["length"] is not None else float(ctx.doc["spine"]["tail"]["length"]))
            rg[r["name"]], at = [at, end], end
        plan = dict(BIPED, ranges=V1.PLANS["quadruped"]["ranges"], range_len=V1.plan_for(ctx.doc)["range_len"])
    else:
        rg = ctx.spec["parts"]["torso"]["spine"]["ranges"]
    names = list(rg)
    bad = []
    if names != plan["ranges"]:
        meas = f"The ranges are {', '.join(names)}; the plan's are {', '.join(plan['ranges'])}"
        return row("fail", len(names), len(plan["ranges"]), meas, PR_ranges(rg, plan["ranges"]), dict(parts=[]))
    lens = {k: rg[k][1] - rg[k][0] for k in names if k != "tail"}
    for k, (lo, hi) in plan["range_len"].items():
        if not lo <= lens[k] <= hi:
            bad.append(k)
    contiguous = all(abs(rg[a][1] - rg[b][0]) < 1e-9 for a, b in zip(names, names[1:]))
    if not contiguous:
        bad.append("gap")
    meas = ("; ".join(f"{k} {lens[k]:.2f} H (band {plan['range_len'][k][0]}-{plan['range_len'][k][1]})" for k in bad if k in lens) + ("; the ranges leave a gap" if "gap" in bad else "")) if bad else \
        "Head " + ", neck ".join([f"{lens['head']:.2f}", f"{lens['neck']:.2f}"]) + f", back {lens['back']:.2f}, seat {lens['seat']:.2f} H, all inside their bands"
    return row("fail" if bad else "pass", f2(sum(lens.values())), "inside the bands", meas, PR_ranges(rg, bad), dict(parts=[b for b in bad if b in names]))


def PR_ranges(rg, bad):
    lens = {k: (v[1] - v[0]) if k != "tail" else 0.6 for k, v in rg.items()}
    tot = sum(lens.values())
    x, y, w = 36.0, 700.0, 536.0
    out = [PR.panel(24, 640, 560, 128)]
    for k, L in lens.items():
        wd = w * L / tot
        col = PR.RED if k in bad or "gap" in bad and False else SW.get(k, "#ddd")
        out.append(f'<rect x="{x:.1f}" y="{y}" width="{wd - 3:.1f}" height="30" rx="5" fill="{col}" stroke="#6b6880" stroke-width="1.5"/>')
        out.append(PR.label(x + wd / 2, y + 58, k, PR.INK, "middle", 18, bg=False))
        out.append(PR.label(x + wd / 2, y - 8, "rest" if k == "tail" else f"{L:.2f} H", PR.RED if k in bad else PR.INK, "middle", 18, bg=False))
        x += wd
    out.append(PR.label(36, 672, "Spine ranges, head to tail (length in H)", PR.INK, "start", 19, bg=False))
    return dict(mode="clay", az=90, svg="".join(out))


# 3 --------------------------------------------------------------------------------------------------------------------------------------------------------- joins
@check(id="joins", name="Joins", fail="{part} join is half-blended", stage="cage", version=1, part=["ears", "arms", "legs"], fields=["parts.ear.L.socket.join", "parts.arm.L.socket.join", "parts.leg.L.socket.join"],
       rule=R("2026-11-02 23:02", "Every attachment is either a hard overlay (a separate shell sunk in, with a clean intersection line, like the toes) or a soft taper (it grows from the parent's skin with a wide filleted base). A half-blend is never allowed. Each socket declares join hard or soft in the species file."),
       limit=dict(text="hard: buried 0.04 H or more and tagged · soft: footprint 1.5-1.8 × the middle, no pinch", value=None), az=32)
def c_joins(ctx):
    from . import quad as QD
    if QD.is_quad(ctx):
        return QD.joins(ctx)
    import s20p2 as P2
    spec = ctx.body.ctx["spec"]
    lines, bad, pts = [], [], []
    for name in ("ear.L", "arm.L", "leg.L"):
        p = spec["parts"][name]
        j = p["socket"].get("join")
        word = name.split(".")[0] + "s"
        if j not in ("soft", "hard"):
            bad.append(word)
            lines.append(f"{word[:-1]}: no join declared")
        elif name in ctx.body.ctx["info"].get("tubes", {}):
            r = P2.ear_join_report(ctx.body, name)
            if j == "hard":
                ok = r["buried"] >= 0.04 and r["tagged"]
                lines.append(f"{word[:-1]}: hard, buried {r['buried']:.3f} H" + ("" if ok else " (needs 0.04)"))
            else:
                ok = 1.5 <= r["ratio"] <= 1.8 and r["narrowest_over_mid"] >= 0.97
                lines.append(f"{word[:-1]}: soft, footprint {r['ratio']:.2f} × (1.5-1.8)" + ("" if ok else ", pinched"))
            if not ok:
                bad.append(word)
        else:
            lines.append(f"{word[:-1]}: {j}")
        fam = p.get("families", {}).get(p.get("default", ""), p)
        at = (fam.get("joints") or p.get("joints"))[0]["at"]
        pts.append((word, np.array(at, float), word in bad))
    Pj = PR.projector(32)
    out = [PR.panel(24, 640, 560, 128)]
    for word, at, isbad in pts:
        x, y = Pj(at)[0]
        out.append(PR.ring(x, y, 30, PR.RED if isbad else PR.SAGE, 4))
        out.append(PR.label(x + 34, y - 30, word[:-1], PR.RED if isbad else PR.INK, "start", 18))
    for i, ln in enumerate(lines):
        out.append(PR.label(36, 672 + 34 * i, ln, PR.RED if i < len(lines) and any(ln.startswith(w[:-1]) for w in bad) else PR.INK, "start", 19, bg=False))
    first = bad[0][:-1] if bad else ""
    buried = [float(x) for x in re.findall(r"buried ([0-9.]+) H", "; ".join(lines))]
    return row("fail" if bad else "pass", len(bad), 0, "; ".join(lines), dict(mode="clay", az=32, svg="".join(out)), dict(parts=bad, fail=(f"{first.capitalize()} join is half-blended" if first else None), shown=dict(value=(" · ".join(f"{x:.3f}" for x in buried) + " H") if buried else "soft", limit="0.04 H")))


# 4 ------------------------------------------------------------------------------------------------------------------------------------------------------------ head.attach
@check(id="head.attach", name="Head on the spine", fail="Head sits off the end of the spine", stage="cage", version=1, part=["head"], fields=["spine.head_attach.a", "spine.head_attach.d", "spine.head_attach.z_under"],
       rule=R("2026-11-02 23:57", "The head sits at the end of the spine on top of the neck, and its attachment follows the body plan."),
       limit=dict(text="biped: underside; a 0.2-0.6, d 0-0.3 of the head's depth", value=None), az=90)
def c_head_attach(ctx):
    from . import quad as QD
    if QD.is_quad(ctx):
        return QD.head_attach(ctx)
    import headshape as HS
    spec = ctx.body.ctx["spec"]
    ha = spec["parts"]["torso"]["head_attach"]
    pl = BIPED["head_attach"]
    g = HS.head_geometry(spec)
    probs = []
    if ha.get("attach") != pl["attach"]:
        probs.append(f"attaches at the {ha.get('attach')}, the biped plan's is the {pl['attach']}")
    if not pl["a"][0] <= ha.get("a", -1) <= pl["a"][1]:
        probs.append(f"a {ha.get('a')} is outside {pl['a'][0]}-{pl['a'][1]}")
    if not pl["d"][0] <= ha.get("d", -1) <= pl["d"][1]:
        probs.append(f"d {ha.get('d')} is outside {pl['d'][0]}-{pl['d'][1]}")
    pz = g["pivot"][2]
    if not 1.15 < pz < 1.4:
        probs.append(f"the pivot is at {pz:.2f} H, the neck's top is 1.15-1.40")
    G = ctx.G
    pts = G.pa.at(np.linspace(0, G.L, 40))[0]
    Pj = PR.projector(90)
    xy = Pj(pts)
    px, py = Pj(np.array(g["pivot"]))[0]
    out = [PR.poly(xy, PR.BLUE, 5), PR.ring(px, py, 24, PR.RED if probs else PR.SAGE, 4), PR.dot(px, py, 7, PR.INK),
           PR.label(px + 30, py - 12, f"head pivot  a {g['a']:.2f}, d {g['d']:.2f}", PR.INK), PR.label(xy[len(xy) // 2][0] + 20, xy[len(xy) // 2][1], "spine", PR.BLUE)]
    return row("fail" if probs else "pass", f2(g["a"]), "0.2-0.6", "; ".join(probs) if probs else f"Underside, a {g['a']:.2f}, d {g['d']:.2f}, pivot at {pz:.2f} H", dict(mode="clay", az=90, svg="".join(out)))


# 5 -------------------------------------------------------------------------------------------------------------------------------------------------------- head.neck
@check(id="head.neck", name="Head, neck and chest", fail="Neck band too wide", stage="cage", version=1, part=["head", "neck"], fields=["spine.ranges", "spine.loft.head_profile"],
       rule=R("2026-11-02 23:38", "Head, neck and torso need a clearer transition even when they are one skin: a round head with an under-curve at the jaw and cheeks, a short concave neck band narrower than both, then the shoulders and chest. (And 2026-11-02 01:01: the back of the head must be a full round dome, never flattened into the neck.)"),
       limit=dict(text="neck under 0.85 of the head and of the chest; the back of the head overhangs the neck by 0.12 H or more", value=BIPED["neck_ratio"]), az=90,
       play="My head needs a neck to sit on.")
def c_head_neck(ctx):
    from . import quad as QD
    if QD.is_quad(ctx):
        return QD.head_neck(ctx)
    import s20p2 as P2, s20p3 as P3
    n = P3.head_numbers(ctx.body)
    V, F, at, fp2 = ctx.level(2)
    Vt = V[(np.rint(at[:, 0]).astype(int) == 0) & (at[:, 1] >= ctx.G.s_root + 0.02)]          # the head, neck and trunk: not a long tail curling up behind the head
    back = lambda z: float(-Vt[np.abs(Vt[:, 2] - z) < 0.015, 0].min())
    dome = back(1.62) - back(1.24)
    r_head, r_chest = n["neck_w"] / n["head_w"], n["neck_w"] / n["body_w"]
    lim_ = lim(ctx, "neck_ratio", BIPED["neck_ratio"])
    wide, flat = max(r_head, r_chest) >= lim_, dome < BIPED["dome_overhang"]
    meas = (f"Neck is {r_head:.2f} of the head and {r_chest:.2f} of the chest, limit {lim_:.2f}" if wide else
            (f"Back of the head overhangs the neck by {dome:.2f} H, needs {BIPED['dome_overhang']:.2f}" if flat else f"Neck is {r_head:.2f} of the head and {r_chest:.2f} of the chest (limit {lim_:.2f}); the skull overhangs by {dome:.2f} H"))
    Pj = PR.projector(90)
    nx = float(np.mean(Vt[np.abs(Vt[:, 2] - n["neck_z"]) < 0.03, 0]))
    cx, cy = Pj(np.array([nx, 0, n["neck_z"]]))[0]
    bad = wide or flat
    out = [PR.ring(cx, cy, 44, PR.RED if bad else PR.SAGE, 4), PR.panel(24, 628, 560, 140),
           PR.bar(40, 664, 300, 1.0, "head", f"{n['head_w']:.2f} H", PR.INK),
           PR.bar(40, 712, 300, n["neck_w"] / n["head_w"], "neck", f"{n['neck_w']:.2f} H", PR.RED if wide else PR.INK, lim_, f"limit {lim_:.2f} of head"),
           PR.label(370, 690, f"neck is {r_head:.2f} of the head", PR.RED if wide else PR.INK, "start", 17, bg=False), PR.label(370, 722, f"and {r_chest:.2f} of the chest", PR.RED if wide else PR.INK, "start", 17, bg=False),
           PR.label(370, 760, f"skull overhangs {dome:.2f} H", PR.RED if flat else PR.INK, "start", 17, bg=False)]
    st = "fail" if bad else "pass"
    return row(st, f2(max(r_head, r_chest)), lim_, meas, dict(mode="clay", az=90, svg="".join(out)), dict(fail=("Back of the head is flat" if flat and not wide else None)))


# 5b ------------------------------------------------------------------------------------------------------------------------------------------------------ head.size
# The head's share of the standing height, H over S (the art director's chibi bands, per plan): H is the head ball's height from its chin pole to the crown, S the floor to the crown.
HS_BANDS = dict(biped=(0.35, 0.5), quadruped=(0.45, 0.6))


@check(id="head.size", name="Head height", fail="Head {size} for the body", stage="cage", version=2, part=["head"], fields=["spine.loft.head_profile.R_scale", "spine.head_attach.z_under", "parts.leg.L.chain"],
       rule=R("2026-11-04", "Head size is the chibi read itself: the head is the biggest mass, and its height over the standing height stays in the plan's band (biped 0.35 to 0.5, quadruped 0.45 to 0.6), as the game designer ruled on 4 Nov from the art director's chibi bands."),
       limit=dict(text="head height over standing height: biped 0.35-0.5, quadruped 0.45-0.6", value=None), az=90)
def c_head_size(ctx):
    import headshape as HS
    plan = (ctx.doc or {}).get("plan") if isinstance(ctx.doc, dict) else None
    plan = plan if plan in HS_BANDS else "biped"
    lo, hi = HS_BANDS[plan]
    V, F, at, fp = ctx.level(2)
    crown = float(V[np.rint(at[:, 0]).astype(int) == ctx.body.parts["torso"]][:, 2].max())             # the head's crown, ears and crests left out
    prof = {**HS.DEFAULTS, **(ctx.body.ctx["spec"]["parts"]["torso"].get("head_profile") or {})}
    chin = float(prof["zc"]) - float(prof["b_dn"])
    floor = float(V[:, 2].min())
    S_, H_ = crown - floor, crown - chin
    r = H_ / S_
    bad = not lo <= r <= hi
    Pj = PR.projector(90)
    left = float(Pj(V)[:, 0].max()) + 30                                    # the bracket stands in the margin right of the body and the tail
    ay_, by_, fy_ = (float(Pj(np.array([0.0, 0.0, z]))[0][1]) for z in (crown, chin, floor))
    col = PR.RED if bad else PR.SAGE
    out = [PR.line((left - 14, y), (left + 14, y), PR.INK, 3) for y in (ay_, by_, fy_)] + [PR.line((left, ay_), (left, by_), col, 7), PR.line((left, by_ + 8), (left, fy_), PR.BLUE, 3, "8 6"),
           PR.label(left + 18, (ay_ + by_) / 2 + 6, f"{H_:.2f} H", col, "start"), PR.label(left + 18, (by_ + fy_) / 2 + 6, f"{S_ - H_:.2f} H", PR.INK, "start"),
           PR.panel(24, 628, 560, 140), PR.bar(40, 676, 400, r / 0.7, f"head {H_:.2f} H over standing height {S_:.2f} H  =  {r:.2f}", "", col, hi / 0.7, f"{plan}: {lo:.2f} to {hi:.2f}")]
    size = "too small" if r < lo else "too big"
    meas = f"Head {r:.2f} of the height \u00b7 the {plan} plan allows {lo:.2f} to {hi:.2f}"
    return row("fail" if bad else "pass", f2(r), f"{lo:.2f}-{hi:.2f}", meas, dict(mode="clay", az=90, svg="".join(out)), dict(head=H_, height=S_, band=[lo, hi], plan=plan, fail=(f"Head {size} for the body" if bad else None)))


# 6 -------------------------------------------------------------------------------------------------------------------------------------------------------- tail.taper
@check(id="tail.taper", name="Tail taper", fail="Tail bulges on the way down", stage="cage", version=1, part=["tail"], fields=["spine.tail.segments", "spine.tail.taper", "spine.tail.root", "spine.tail.tip_r"],
       rule=R("2026-11-02 01:01", "Tails taper monotonically from root to tip, with no bulge, pinch and bulge again (\"looks like stuffed intestines, not cute\"); the seat flows into the tail root as one soft curve."),
       limit=dict(text="the radius only grows from the stalk to the root; the root is at least 1.8 × the stalk", value=0), az=90,
       play="My tail likes to get thinner at the end.")
def c_tail_taper(ctx):
    from . import quad as QD
    if QD.is_quad(ctx):
        return QD.tail_taper(ctx)
    G = ctx.G
    s = np.arange(G.bulb[0] + 0.02, G.s_root, 0.01)
    r = G.tail_radius(s)
    d = np.diff(r)
    worst = float(max(0.0, -d.min())) if len(d) else 0.0
    k = int(d.argmin()) if len(d) else 0
    bump = worst > 1e-9
    spec = ctx.body.ctx["spec"]
    tj = spec["parts"]["tail"]["joints"]
    ratio = float(tj[0]["r"][0] / tj[-1]["r"][0])
    fillet_bad = ratio < 1.8
    bad = bump or fillet_bad
    meas = (f"Radius drops {worst:.3f} H going toward the root at {s[k]:.2f} H from the stalk" if bump else
            (f"Root is only {ratio:.1f} × the stalk, needs 1.8" if fillet_bad else f"The radius only grows toward the root; the root is {ratio:.1f} × the stalk"))
    px0, py0, pw, ph = 48, 676, 360, 58
    rm = float(max(r.max(), 1e-9))
    pts = [(px0 + pw * (s[i] - s[0]) / (s[-1] - s[0] + 1e-9), py0 + ph - ph * (r[i] / rm)) for i in range(len(s))]
    Pj = PR.projector(90)
    tp = Pj(np.array(G.tail_pts)[::6])
    cx, cy = tp.mean(0)
    out = [PR.box(tp[:, 0].min(), tp[:, 1].min(), tp[:, 0].max(), tp[:, 1].max(), PR.RED if bad else PR.SAGE), PR.panel(24, 640, 560, 128), PR.poly(pts, PR.RED if bump else PR.INK, 4),
           PR.label(px0, 666, "radius along the tail (H)", PR.INK, "start", 18, bg=False), PR.label(px0, py0 + ph + 26, "stalk (tip)", PR.INK, "start", 18, bg=False), PR.label(px0 + pw, py0 + ph + 26, "root", PR.INK, "end", 18, bg=False),
           PR.label(px0 + pw + 24, py0 + 30, f"root {r.max():.3f} H", PR.INK, "start", 17, bg=False)]
    if bump:
        out += [PR.dot(pts[k][0], pts[k][1], 8, PR.RED), PR.label(pts[k][0] + 12, pts[k][1] - 10, "bump", PR.RED)]
    return row("fail" if bad else "pass", f2(worst), 0, meas, dict(mode="clay", az=90, svg="".join(out)))


# 7 ---------------------------------------------------------------------------------------------------------------------------------------------------------- tail.size
@check(id="tail.size", name="Tail size", fail="Tail too big for the body", stage="cage", version=1, part=["tail"], fields=["spine.tail.length", "spine.tail.root", "spine.tail.tip_r"],
       rule=R("2026-11-02 18:26", "The S20 tail is too big for its legs and body. The tail is scaled to the creature: root about 0.45 of the seat radius, a thin stalk, the bulb about eye size, side area at most about 1/4 of the trunk."),
       limit=dict(text="Side area at most 0.25 of the trunk · root at most 0.47 of the seat radius", value=BIPED["tail_side_area"]), az=90,
       play="Any more tail and I'd tip over backwards!")
def c_tail_size(ctx):
    from . import quad as QD
    if QD.is_quad(ctx):
        return QD.tail_size(ctx)
    G, b = ctx.G, ctx.body
    V, F, at, fp = ctx.level(1)
    F = np.array(F, int)
    sm = at[F][:, :, 1].mean(1)
    torso = np.asarray(fp).astype(int) == b.parts["torso"]
    tail_f, trunk_f = torso & (sm < G.s_root + 0.02), torso & (sm >= G.s_root + 0.02)
    P304 = PR.projector(90, 0.0, 304, 312, 95.0)
    xy = P304(V)
    a_tail, a_trunk = int(PR.raster(xy, F[tail_f], 304, 312).sum()), int(PR.raster(xy, F[trunk_f], 304, 312).sum())
    share = a_tail / max(a_trunk, 1)
    limit = lim(ctx, "tail_side_area", BIPED["tail_side_area"])
    spec = b.ctx["spec"]
    root_r = spec["parts"]["tail"]["joints"][0]["r"][0]
    root_ratio = root_r / 0.55
    bad = share > limit
    Pj = PR.projector(90)
    q = Pj(V[np.unique(F[tail_f])])
    cx, cy, rr = float(q[:, 0].mean()), float(q[:, 1].mean()), max(36.0, float(max(np.ptp(q[:, 0]), np.ptp(q[:, 1])) * 0.62))
    out = [PR.box(q[:, 0].min(), q[:, 1].min(), q[:, 0].max(), q[:, 1].max(), PR.RED if bad else PR.SAGE), PR.panel(24, 628, 560, 140),
           PR.bar(40, 664, 400, 1.0, "trunk", f"{a_trunk:,} px", PR.INK),
           PR.bar(40, 712, 400, share, "tail", f"{share * 100:.0f}% of the trunk", PR.RED if bad else PR.SAGE, limit, f"limit {limit * 100:.0f}%")]
    meas = f"Side area {share:.3f} of the trunk, limit {limit:.2f}" + (f"; root {root_ratio:.2f} of the seat radius" if root_ratio > 0.47 else "")
    return row("fail" if bad or root_ratio > 0.47 else "pass", f2(share), limit, meas, dict(mode="clay", az=90, svg="".join(out)), dict(share=share, tail_px=a_tail, trunk_px=a_trunk, root_ratio=root_ratio, limit_text=f"Side area at most {limit:.2f} of the trunk · root at most 0.47 of the seat radius"))


# 8 ---------------------------------------------------------------------------------------------------------------------------------------------------------- balance
@check(id="balance", name="Balance", fail="Tips over at {end}", stage="cage", version=1, part=["legs"], fields=["parts.leg.L.chain", "spine.tail.length", "skeleton.pelvis"],
       rule=R("2026-11-02 18:25", "Balance is a body rule. The centre of mass, the volume centroid including tails and tips, must project inside the soles' support polygon with margin, for every individual at the extreme genes too. Fix it with anatomy (tail weight, spine lean, leg placement), not by sliding the feet."),
       limit=dict(text="the centre of mass inside the soles, at least 15 % of the sole length in front of the heel (the type; the extremes are checked in chunk 8)", value=BIPED["balance_margin"]), az=90,
       play="Whoa, I need my feet under me.")
def c_balance(ctx):
    from . import quad as QD
    if QD.is_quad(ctx):
        return QD.balance(ctx)
    import s20balance as BL
    m = BL.measure(ctx.body)
    lim_ = lim(ctx, "balance_margin", BIPED["balance_margin"], "max")
    bad = not m["inside"] or m["margin"] < lim_
    end = "the heel" if m["margin"] < lim_ else "the toe"
    com = m["com"]
    Pj = PR.projector(90)
    h, t, c, c0 = Pj(np.array([m["heel_x"], 0, 0.0]))[0], Pj(np.array([m["toe_x"], 0, 0.0]))[0], Pj(com)[0], Pj(np.array([com[0], 0, 0.0]))[0]
    col = PR.RED if bad else PR.SAGE
    out = [PR.line(h, t, col, 10), PR.line(c, c0, PR.INK, 3, "8 6"), PR.dot(c[0], c[1], 9, PR.RED if bad else PR.INK),
           PR.label(c[0] + 14, c[1] - 6, "centre of mass", PR.INK),
           PR.label(min(h[0], t[0]) - 8, h[1] + 34, "toe" if t[0] < h[0] else "heel", PR.INK, "end"), PR.label(max(h[0], t[0]) + 8, h[1] + 34, "heel" if t[0] < h[0] else "toe", PR.INK, "start"),
           PR.label(c0[0] - 70, c0[1] + 72, f"margin {m['margin'] * 100:.0f}% of the sole (limit {lim_ * 100:.0f}%)", col, "start")]
    meas = f"Centre of mass {m['margin'] * 100:.0f}% of the sole length in front of the heel, limit {lim_ * 100:.0f}%" + ("" if m["inside"] else "; outside the soles")
    r = row("fail" if bad else "pass", f2(m["margin"]), lim_, meas, dict(mode="clay", az=90, svg="".join(out)))
    r["extra"]["fail"] = f"Tips over at {end}" if bad else None
    return r


# 9 ------------------------------------------------------------------------------------------------------------------------------------------------------------- limbs
@check(id="limbs", name="Shoulders and hips", fail="{limb} floats off its girdle", stage="cage", version=1, part=["arms", "legs"], fields=["skeleton", "parts.arm.L.families", "parts.leg.L.chain"],
       rule=R("2026-11-02 02:07", "Rigs must have shoulders and hips. Arm and leg chains must not float: a shoulder girdle (a chest joint on the spine, a clavicle to each shoulder joint) and a pelvis (a seat joint, a hip bone to each hip joint) anchor the limbs. Limb sockets are placed from those joints, so the mesh follows the skeleton. (And 2026-11-02 10:35: legs are hip, knee, ankle; arms must match: shoulder, elbow, wrist.)"),
       limit=dict(text="each limb has three joints and its root on its girdle joint · the chest joint is on the back range", value=None), az=32)
def c_limbs(ctx):
    from . import quad as QD
    if QD.is_quad(ctx):
        return QD.limbs(ctx)
    spec = ctx.body.ctx["spec"]
    sk = spec["parts"]["torso"]["skeleton"]
    arm = spec["parts"]["arm.L"]
    fam = arm["families"][arm["default"]]
    leg = spec["parts"]["leg.L"]
    probs = []
    hip_at = np.array(leg["joints"][0]["at"], float)
    arm_at = np.array(fam["joints"][0]["at"], float)
    sh = np.array(sk["shoulder"], float)
    if np.abs(arm_at - sh).max() > 1e-6:
        probs.append(("Arm", f"arm root is {np.abs(arm_at - sh).max():.3f} H from the shoulder joint"))
    nlegs = len([j for j in leg["joints"] if j["name"] in ("hip", "knee", "ankle")])
    if nlegs != 3:
        probs.append(("Leg", f"the leg has {nlegs} of hip, knee, ankle"))
    narm = len(fam["joints"]) - 1
    if narm < 3:
        probs.append(("Arm", f"the arm has {narm} segments, shoulder, elbow, wrist need 3"))
    ch = float(sk["chest"][2])
    if not 0.9 <= ch <= 1.17:
        probs.append(("Chest", f"the chest joint is at {ch:.2f} H, the top of the back is 0.90-1.17"))
    if "pelvis" not in sk:
        probs.append(("Pelvis", "no pelvis joint"))
    Pj = PR.projector(32)
    out = []
    for name, col in (("leg.L", PR.BLUE), ("arm.L", PR.BLUE)):
        p = spec["parts"][name]
        P = np.array((p.get("P") or p["families"][p["default"]]["P"]), float)
        for sgn in (1, -1):
            Q = P * np.array([1, sgn, 1])
            out.append(PR.poly(Pj(Q), col if sgn == 1 else "#7b93bd", 5))
            for x, y in Pj(Q)[:3]:
                out.append(PR.dot(x, y, 6, PR.RED if probs else PR.INK))
    chest, pelvis = np.array(sk["chest"], float), np.array(sk["pelvis"], float)
    for gp, nm, other in ((chest, "chest", sh), (pelvis, "pelvis", hip_at)):
        a = Pj(gp)[0]
        out.append(PR.dot(a[0], a[1], 8, PR.INK))
        out.append(PR.label(a[0] - 14, a[1] + 30, nm, PR.INK, "end"))
        for sgn in (1, -1):
            o = Pj(other * np.array([1, sgn, 1]))[0]
            out.append(PR.line(a, o, PR.INK, 3, "6 5"))
    sx, sy = Pj(sh)[0]
    hx, hy = Pj(hip_at)[0]
    out += [PR.label(sx + 12, sy - 14, "shoulder", PR.INK), PR.label(hx + 12, hy + 30, "hip", PR.INK)]
    first = probs[0] if probs else None
    return row("fail" if probs else "pass", len(probs), 0, first[1] if first else "Shoulders and hips are on their girdles: arm roots at the shoulder joint, legs hip-knee-ankle, chest on the back range",
               dict(mode="clay", az=32, svg="".join(out)), dict(fail=(f"{first[0]} floats off its girdle" if first else None), parts=["arms"] if first and first[0] == "Arm" else ["legs"] if probs else [], shown=dict(value=f"chest {ch:.2f} H", limit="0.90-1.17 H")))


# 10 ------------------------------------------------------------------------------------------------------------------------------------------------------------ verts
@check(id="verts", name="Vertex budget", fail="{n} vertices, over 3,500", stage="cage", version=1, part=[], fields=["spine.loft.rings_z", "spine.loft.edge", "parts.leg.L.topology"],
       rule=R("2026-11-02 23:17", "'15,000 vertices for a simple creature? you're crazy. simplify the mesh.' Budget: a shipped creature mesh is at most about 3,500 vertices (subdivision level 1 of a lean cage, smooth normals). Finer detail goes to the texture or a baked normal map."),
       limit=dict(text="3,500 or fewer · amber up to 3,850 · fails above", value=BIPED["verts"]), az=32, mode="wire")
def c_verts(ctx):
    n = int(ctx.summ["vertices_l1"])
    lim_ = int(lim(ctx, "vertices", BIPED["verts"]))
    warn = int(round(lim_ * BIPED["verts_warn"] / BIPED["verts"]))
    st = "pass" if n <= lim_ else ("warn" if n <= warn else "fail")
    part, names = np.asarray(ctx.mesh["part"], int), ctx.mesh["names"]
    cnt = {names.get(int(p), str(p)): int((part == p).sum()) for p in sorted(set(part.tolist()))}
    col = PR.RED if st == "fail" else PR.AMBER if st == "warn" else PR.INK
    out = [PR.panel(24, 640, 560, 128), PR.label(40, 668, f"vertices per part: total {n:,} (limit {lim_:,})", col, "start", 19, bg=False)]
    for i, (k, v) in enumerate(sorted(cnt.items(), key=lambda kv: -kv[1])[:9]):
        out.append(PR.label(40 + 184 * (i % 3), 704 + 30 * (i // 3), f"{k} {v:,}", PR.INK, "start", 18, bg=False))
    meas = f"{n:,} vertices at subdivision level 1, limit {lim_:,}" + (f" (amber up to {warn:,})" if st != "pass" else "")
    r = row(st, n, lim_, meas, dict(mode="wire", az=32, svg="".join(out)), dict(parts_count=cnt))
    r["extra"]["fail"] = f"{n:,} vertices, over {lim_:,}"
    return r


# 11 ------------------------------------------------------------------------------------------------------------------------------------------------------------ normals
@check(id="normals", name="Smooth normals", fail="Sharp crease in {part}", stage="cage", version=1, part=[], fields=["spine.loft.junction_radius", "spine.loft.section", "parts.arm.L.socket"],
       rule=R("2026-11-02 20:25", "Normals must never change abruptly. A junction is either a deliberate sharp crease (like the toes) or a smooth filleted transition. This is tested for every species."),
       limit=dict(text="no visible edge over 20° between faces at level 2 (30° along the tail, 36° on the tail's 8-column stalk rings); tagged creases, the underside and the hard-overlay shells excepted. Level 2 is where the crease rule is read, on a surface close to the limit one; the mesh ships at level 1, whose edges are twice as long, so 20° at level 2 is about 40° at level 1 (60° on the tail). The 36° on the stalk is the art director's sign of 3 Nov 2026 (ad-viability-2), at level 2 on the 8-column stalk rings only; it does not rise", value=BIPED["normal_deg"]), az=32, mode="normal")
def c_normals(ctx):
    from . import quad as QD
    if QD.is_quad(ctx):
        return QD.normals(ctx)
    import s20indiv as IN, s20normals as NM
    b = ctx.body
    V, F, at, fp2 = ctx.level(int(os.environ.get("WB_NORMALS_LEVEL", "2")))                  # the owner's rule is held at level 2; WB_NORMALS_LEVEL=1 measures the shipped level once (the harness, not a gate)
    F = np.array(F, int)
    part = IN.part_of(b, F, fp2, len(V))
    m = NM.measure(V, F, at[:, 3])
    E, mid = m["E"], m["mid"]
    vn = NM.vertex_normals(V, F)
    nz = 0.5 * (vn[E[:, 0], 2] + vn[E[:, 1], 2])
    under = (nz < -0.35) | ((mid[:, 2] < 0.32) & (np.abs(mid[:, 1]) < 0.40))          # the underside and the arch between the legs are seen only from below
    s_edge = 0.5 * (at[E[:, 0], 1] + at[E[:, 1], 1])
    tail = (part[E[:, 0]] == b.parts["torso"]) & (s_edge <= ctx.G.s_root)
    vis = ~under & ~m["crease"]
    lim_ = lim(ctx, "normal_deg", BIPED["normal_deg"])
    stalk = np.zeros(len(E), bool)                                                      # edges between rings of 5 half columns (the 8-column stalk, V5): their L2 edges are longer round the bends
    rg = b.ctx["info"]["torso"]
    ks = [k for k, r in enumerate(rg["rings"]) if len(r) == 5]
    if ks:
        lo_s, hi_s = min(rg["ring_s"][k] for k in ks), max(rg["ring_s"][k] for k in ks)
        stalk = tail & (s_edge >= lo_s - 1e-6) & (s_edge <= hi_s + 1e-6)
    bad = vis & np.where(stalk, m["ang"] > BIPED["stalk_normal_deg"], np.where(tail, m["ang"] > BIPED["tail_normal_deg"], m["ang"] > lim_))
    names = {v: k for k, v in b.parts.items()}
    by = {names[int(p)]: int((bad & (part[E[:, 0]] == p)).sum()) for p in set(part[E[:, 0]][bad])}
    n = int(bad.sum())
    worst = float(m["ang"][vis].max())
    Pj = PR.projector(32)
    out = []
    idx = np.where(bad)[0][:600]
    for i in idx:
        a, c = Pj(V[E[i, 0]])[0], Pj(V[E[i, 1]])[0]
        out.append(PR.line(a, c, PR.RED, 4))
    out.append(PR.panel(24, 640, 560, 100))
    out.append(PR.label(40, 682, f"{n} edges over {lim_:.0f}° (red on the picture)", PR.RED if n else PR.INK, "start", 19, bg=False))
    out.append(PR.label(40, 718, f"steepest visible edge {worst:.1f}°", PR.INK, "start", 19, bg=False))
    where = max(by, key=by.get) if by else ""
    meas = f"{n} visible edges over {lim_:.0f}° (steepest {worst:.1f}°)" + (f"; most in {where}" if where else "")
    where_u = {}                                                                     # where along the spine the failing edges lie, by range name: the harness records it for each failing genome
    if n:
        u_bad = ctx.G.L - np.clip(s_edge[bad], 0, ctx.G.L)
        for nm_, (lo_, hi_) in ctx.G.ranges.items():
            k_ = int(((u_bad >= lo_ - 1e-9) & (u_bad <= hi_ + 1e-9)).sum())
            if k_:
                where_u[nm_] = k_
    r = row("fail" if n else "pass", n, 0, meas, dict(mode="normal", az=32, svg="".join(out)), dict(parts=[], fail=(f"Sharp crease in {where}" if where else None), by_part=by, by_range=where_u, worst=round(worst, 2), s_range=([round(float(s_edge[bad].min()), 3), round(float(s_edge[bad].max()), 3)] if n else None), shown=dict(value=f"{worst:.1f}°", limit=f"{lim_:.0f}°")))
    return r


# 12 -------------------------------------------------------------------------------------------------------------------------------------------------------------- mesh
@check(id="mesh", name="Mesh quality", fail="Thin or bent faces in the {range}", stage="cage", version=1, part=[], fields=["spine.loft.rings_z", "spine.loft.column_layouts", "spine.loft.edge"],
       rule=R("2026-11-01 13:40", "'You're smashing blobs.' The mesh body is to be box-modelled as one continuous cage grown from the skeleton: one continuous all-quad surface with edge flow from torso into limbs."),
       limit=dict(text="edge-length, face-area and planarity ratios by spine range inside the species file's mesh_quality", value=None), az=32, mode="wire")
def c_mesh(ctx):
    from . import quad as QD
    if QD.is_quad(ctx):
        return QD.mesh(ctx)
    import mquality as Q
    b = ctx.body
    V, F, attr, fp = Q.full_topology(b)
    G = ctx.G
    F = np.array(F, int)
    u = G.L - np.clip(attr[:, 1], 0, G.L)
    th = b.ctx["spec"]["mesh_quality"]
    info, remap = b.ctx["info"]["torso"], b.ctx["remap"]
    ringof = {}
    for k, r in enumerate(info["rings"]):
        for c_, v in enumerate(r):
            if v in remap:
                ringof[remap[v]] = (k, c_)
    out, rows_, bad = [], {}, []
    Pj = PR.projector(32)
    for nm in ("neck", "back", "seat", "tail"):
        lo, hi = G.ranges[nm]
        torso = fp == b.parts["torso"]
        inside = ((u[F] >= lo - 1e-9) & (u[F] <= hi + 1e-9)).all(1)
        Fr = F[torso & inside]
        along, rnd = [], []
        for f in Fr:
            for k in range(4):
                a, c = int(f[k]), int(f[(k + 1) % 4])
                if a in ringof and c in ringof:
                    L = float(np.linalg.norm(V[a] - V[c]))
                    (along if ringof[a][0] != ringof[c][0] else rnd).append(L)
        r = dict(faces=len(Fr), along=max(along) / min(along) if along else 1.0, around=max(rnd) / min(rnd) if rnd else 1.0, area=Q.area_ratio(V, Fr), nonplanar=Q.nonplanarity(V, Fr))
        r["bad"] = [k for k, lim_ in (("along", BIPED["ratio_along"]), ("around", BIPED["ratio_around"]), ("area", th["area_ratio_max"] * 2.0), ("nonplanar", th["nonplanar_max"] * 6.0)) if r[k] > lim_]
        rows_[nm] = r
        if r["bad"]:
            bad.append(nm)
            c0 = Pj(V[np.unique(Fr)].mean(0))[0]
            out.append(PR.ring(c0[0], c0[1], 46, PR.RED, 4))
    out.append(PR.panel(24, 640, 560, 132))
    out.append(PR.label(36, 664, "worst ratios by range (limit)", PR.INK, "start", 17, bg=False))
    for i, (nm, r) in enumerate(rows_.items()):
        out.append(PR.label(36, 692 + 26 * i, f"{nm}", PR.RED if nm in bad else PR.INK, "start", 18, bg=False))
        out.append(PR.label(110, 692 + 26 * i, f"edge {r['along']:.1f} ({BIPED['ratio_along']:.0f})  ring {r['around']:.1f} ({BIPED['ratio_around']:.0f})  area {r['area']:.1f} ({th['area_ratio_max'] * 2:.0f})  flat {r['nonplanar']:.2f} ({th['nonplanar_max'] * 6:.1f})", PR.INK, "start", 15, bg=False))
    meas = (f"{bad[0]}: " + ", ".join(f"{k} {rows_[bad[0]][k]:.2f}" for k in rows_[bad[0]]['bad'])) if bad else "Edge, area and planarity ratios are inside the limits in every range"
    return row("fail" if bad else "pass", len(bad), 0, meas, dict(mode="wire", az=32, svg="".join(out)), dict(parts=[], fail=(f"Thin or bent faces in the {bad[0]}" if bad else None), bad_ranges=list(bad), ranges={k: {a: round(float(b_), 3) for a, b_ in v.items() if a != "bad"} | dict(bad=list(v["bad"])) for k, v in rows_.items()}))


# 13 ------------------------------------------------------------------------------------------------------------------------------------------------------- limits (the extremes stage)
@check(id="limits", name="Both ends", fail="{trait} fails at its {end} end", stage="extremes", version=1, part=[], fields=["genome.loci"],
       rule=R("2026-11-02 18:25", "Balance, folds, tail scale, normals, the head-neck transition and the vertex count hold for every individual at the extreme genes too: each locus's limits are built at both ends on the clay, with the corners of the loud genes."),
       limit=dict(text="every locus builds and passes at both ends of its limits, and at the corners of the loud genes", value=0), az=32)
def c_limits(ctx):
    ends = ctx.ends or []
    bad = [e for e in ends if e["state"] == "fail"]
    n_cages = len({e.get("cage") for e in ends})
    if not bad:
        return row("pass", 0, 0, f"{len(ends)} ends and corners build and pass ({n_cages} distinct cages)")
    e = bad[0]
    unit = e.get("unit") or ""
    f0 = e["fails"][0]
    what = "Loud genes" if e["end"] == "corner" else e["label"]
    where = f"at {e['value']:g}{unit if unit in ('×', '°', '') else ' ' + unit}" if isinstance(e["value"], (int, float)) else f"at {e['value']}"
    line = f"{what} fails at its {e['end']} end" if e["end"] in ("low", "high") else f"{what} fails with {e['value']}"
    meas = f"{where}: {f0['fail'] or f0['id']}" + (f" ({f0['measure']})" if f0.get("measure") else "") + (f"; {len(bad) - 1} more end{'s' if len(bad) > 2 else ''} fail" if len(bad) > 1 else "")
    r = row("fail", len(bad), 0, meas, e.get("proof"), dict(fail=line, ends=[x["id"] for x in bad]))
    return r


from . import rig, coat  # noqa: E402,F401  (the rig and coat checks of the background tier)
