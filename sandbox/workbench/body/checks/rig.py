"""The rig checks of the background tier (spec 7 and 9): the tail on the midline in every pose, breathing in the chest and belly only, and the walk's folds, flat feet and weights. Each takes the cage stage's Ctx and a rig of its own plan, and returns a row like the cage checks'.
The biped's rig is the S20 rig (s20rig) on the level-2 mesh, the numbers those of its tests (pass 2, 4 and chunk 6). The quadruped's is qrig on the level-1 mesh: its clips are in `qrig.FRAMES`; its sole level and stance hold are the art direction's numbers (8 degrees, 1 px at the strip's scale).
The proofs are drawn from the numbers, over the plan's clay frame; the clip strips themselves are the render set's."""
import math

import numpy as np

from . import check, row
from . import proof as PR
from .biped import f2
from . import quad as QD

BIPED_RIG = dict(
    midline=0.02,            # the mean sideways offset of the tail's joints (H) in a still pose, and over a whole walk cycle (the sway is symmetric about the midline: its mean is 0)
    breath_still=0.002,      # nothing outside the chest and belly moves more than this (H) at full inhale (pass 2)
    fold_dot=-0.2,           # no adjacent faces fold past a dot of -0.2 (about 100 degrees)
    fold_more=1.25,          # at most a quarter more folded edges than the rest mesh has, and 4
    sole_tilt=10.0,          # degrees a stance sole may tilt from level (chunk 6)
)
QUAD_RIG = dict(
    midline=0.01,            # the quadruped's tail stays in its own plane: its sideways offset in the rear block's frame (H)
    breath_still=0.002,
    fold_dot=-0.2,
    fold_more=1.25,
    sole_tilt=8.0,           # the art direction's: the sole level within 8 degrees on the strip
    hold_px=1.0,             # and a stance foot holding within 1 px
)
CLIPS_BIPED = ("rest", "stand", "breathe", "idle", "waddle")


def _rig(ctx):
    d = ctx.__dict__.setdefault("_rig", {})
    if "r" not in d:
        if QD.is_quad(ctx):
            import qrig as QR
            rig, mesh = QR.rig_of(ctx.body, 1)
            d["r"] = dict(plan="quadruped", rig=rig, V=mesh["V"], F=mesh["F"], part=mesh["part"], W=rig.W)
        else:
            import s20indiv as IN
            import s20rig
            b = ctx.body
            R = s20rig.Rig(b.ctx)
            V, F, at, fp2 = ctx.level(2)
            F = np.array(F, int)
            part = IN.part_of(b, F, fp2, len(V))
            d["r"] = dict(plan="biped", rig=R, V=V, F=F, at=at, part=part, W=R.weights(V, at, part))
    return d["r"]


def _folds(V, E, FA, FB, ok):
    """(smallest dot of adjacent face normals, the number of edges folded past -0.2) of the posed mesh."""
    import s20normals as NM
    n = NM.face_normals(V, E[1])
    d = (n[FA[ok]] * n[FB[ok]]).sum(1)
    return float(d.min()), int((d < BIPED_RIG["fold_dot"]).sum())


def _edges(F):
    import s20normals as NM
    E, FA, FB = NM.edges(F)
    return (E, F), FA, FB, FB >= 0


# ---------------------------------------------------------------------------------------------------------------------------------------------------- the tail's joints in each clip
def tail_tracks_biped(ctx):
    """{clip: [(n, 2) top-view points (x, y) of the tail's joints, one array per frame]}."""
    r = _rig(ctx)
    R = r["rig"]

    def heads(M):
        out = []
        for k in range(1, len(R.tail_P)):
            h = np.append(R.bones[f"tail.{k}"][0], 1.0)
            out.append((M[f"tail.{k}"] @ h)[:3])
        return np.array(out)
    still = dict(rest=R.pose(), stand=R.stand_pose(), breathe=R.pose(head_nod=math.radians(-3.0)), idle=R.pose(tail_sway=0.0, head_nod=math.radians(-3.0), arm=0.0))
    tr = {k: [heads(M)] for k, M in still.items()}
    tr["waddle"] = [heads(R.waddle_pose(i / 16)[0]) for i in range(16)]
    right = heads(R.pose(tail_sway=math.radians(8.0)))[:, 1]
    left = heads(R.pose(tail_sway=-math.radians(8.0)))[:, 1]
    return tr, bool(np.allclose(right, -left, atol=1e-9))


def tail_tracks_quad(ctx):
    r = _rig(ctx)
    import qrig as QR
    rig = r["rig"]
    tr = {}
    worst = 0.0
    tail = (rig.attr[:, 1] > rig.p["u_e"] + 0.1) & (rig.part == rig.parts["torso"])
    for name, n in QR.FRAMES.items():
        tr[name] = []
        for i in range(n):
            pose = QR.clip_pose(rig, name, i / n)
            V, M = rig.skin(pose)
            rear_inv = np.linalg.inv(rig.block(pose)["rear"])
            Vt = (rear_inv @ np.hstack([V[tail], np.ones((int(tail.sum()), 1))]).T).T[:, :3]
            worst = max(worst, float(np.abs(Vt[:, 1] - rig.V0[tail][:, 1]).max()), abs(float(Vt[:, 1].mean())))
            pts = [(M[f"tail{k + 1}"] @ np.append(rig.tail0[k], 1.0))[:3] for k in range(3)] + [(M["tail3"] @ np.append(rig.tail0[3], 1.0))[:3]]
            tr[name].append(np.array(pts))
    return tr, worst


def _topview(tracks, x0, y0, w, h, ppH, colors, _unused=None):
    """Small multiples, the tail seen from above running left to right from its root, the midline dashed: one cell per clip."""
    out = []
    n = len(tracks)
    cw = w / n
    for c, (name, frames) in enumerate(tracks.items()):
        cx = x0 + c * cw
        cy = y0 + h / 2
        out.append(PR.line((cx + 4, cy), (cx + cw - 8, cy), "#8a8798", 2, "5 4"))
        root = frames[0][0]
        for k, pts in enumerate(frames):
            P = [(cx + 6 + (root[0] - p[0]) * ppH, cy + (p[1]) * ppH * 2.0) for p in pts]
            out.append(PR.poly(P, colors[0] if len(frames) == 1 else colors[1], 2.5 if len(frames) == 1 else 1.6))
        out.append(PR.label(cx + 4, y0 + h + 22, name, PR.INK, "start", 15, bg=False))
    return out


# ---------------------------------------------------------------------------------------------------------------------------------------------------- tail on the midline
@check(id="midline", name="Tail on the midline", fail="Tail swings to one side in {clip}", stage="rig", version=1, part=["tail"], fields=["motion.walk", "motion.tail_idle", "spine.tail"],
       rule=dict(date="2026-11-02 10:46", words="Tails stay on the midline in every pose; sway is symmetric and spread along the tail; never fix a camera or readability problem by posing the body."),
       limit=dict(text="the tail's joints at the midline in every pose, within 0.02 H on average (the quadruped: in its rear block's own frame, within 0.01 H); a sway symmetric to the left and the right, spread evenly over the joints", value=BIPED_RIG["midline"]), az=90, mode="clay", play=None)
def c_midline(ctx):
    quad = QD.is_quad(ctx)
    if quad:
        tr, worst = tail_tracks_quad(ctx)
        lim_ = QUAD_RIG["midline"]
        bad = []
        sym = True
        meas = f"The tail stays in one plane in all {sum(len(f) for f in tr.values())} poses: at most {worst:.3f} H off the midline in the rear block's own frame, limit {lim_:.2f} H"
        val = f2(worst)
        if worst > lim_:
            bad = [c for c in tr]
            meas = f"Tail is {worst:.3f} H off the midline in the rear block's own frame, limit {lim_:.2f} H"
        lines = [f"{c}: {len(f)} pose{'s' if len(f) > 1 else ''}, tail in its plane" for c, f in tr.items()]
        extra_clip = bad[0] if bad else None
    else:
        tr, sym = tail_tracks_biped(ctx)
        lim_ = BIPED_RIG["midline"]
        off = {}
        for c, frames in tr.items():
            ys = np.array([f[:, 1].mean() for f in frames])
            off[c] = float(abs(ys.mean()))
        bad = [c for c, v in off.items() if v > lim_]
        worst = max(off.values())
        val = f2(worst)
        if bad:
            meas = f"Tail swings to one side in {bad[0]}: its joints sit {off[bad[0]]:.3f} H off the midline on average, limit {lim_:.2f} H"
        elif not sym:
            meas = "The sway is not the same to the left and to the right"
        else:
            meas = f"Mean sideways offset of the tail's joints at most {worst:.3f} H in {len(tr)} clips, limit {lim_:.2f} H; the sway is symmetric"
        lines = [f"{c}: mean {off[c]:.3f} H" + (f" over {len(f)} frames" if len(f) > 1 else "") for c, f in tr.items()]
        extra_clip = bad[0] if bad else None
    fail = bool(bad) or not sym
    proj = QD.proj(ctx, 90) if quad else PR.projector(90)
    out = []
    out += [PR.panel(24, 640, 560, 128), PR.label(36, 664, "Tail from above in each clip (dashed: the midline)", PR.INK, "start", 16, bg=False)]
    out += _topview(tr, 36, 676, 536, 56, 38 if not quad else 30, (PR.BLUE, "#7b93bd"), None)
    first = extra_clip or ""
    return row("fail" if fail else "pass", val, lim_, meas, dict(mode="clay", az=90, svg="".join(out)), dict(fail=(f"Tail swings to one side in {first}" if first else None), clips=list(tr), parts=["tail"] if fail else [], shown=dict(value=f"{worst:.3f} H", limit=f"{lim_:.2f} H")))


# ---------------------------------------------------------------------------------------------------------------------------------------------------- breathing
@check(id="breath", name="Breathing", fail="Breathing moves the {part}", stage="rig", version=1, part=[], fields=["motion.breathe"],
       rule=dict(date="2026-11-02", words="Breathing inflates only the chest and belly, as a radial offset in the section plane of the one spine, not a scale of the whole body."),
       limit=dict(text="at full inhale nothing outside the chest and belly moves more than 0.002 H, and no fold appears", value=BIPED_RIG["breath_still"]), az=90, mode="clay", play=None)
def c_breath(ctx):
    r = _rig(ctx)
    quad = r["plan"] == "quadruped"
    lim_ = QUAD_RIG["breath_still"] if quad else BIPED_RIG["breath_still"]
    V, F, part = r["V"], r["F"], r["part"]
    names = {v: k for k, v in ctx.body.parts.items()}
    if quad:
        import qrig as QR
        rig = r["rig"]
        Vp, _ = rig.skin(QR.clip_pose(rig, "breathe", 0.5))
        dV = Vp - rig.V0
        u = rig.attr[:, 1]
        lo, hi = rig.p["head"] + rig.p["neck"], rig.p["head"] + rig.p["neck"] + rig.p["back"] + 0.12
        inside = (part == rig.parts["torso"]) & (u >= lo - 1e-9) & (u <= hi + 1e-9)
        region = "chest and belly"
    else:
        R = r["rig"]
        dV = R.breath(V, r["at"], part, 1.0)
        G = ctx.body.ctx["T"]
        u = G.L - np.clip(r["at"][:, 1], 0, G.L)
        pb = ctx.body.ctx["body_parts"]
        inside = (part == pb["torso"]) & (u > 0.75) & (u < 2.0)
        inside |= (part == pb["arm.L"]) if "arm.L" in pb else False                                           # the arms ride the chest
        Vp = V + dV
    mv = np.linalg.norm(dV, axis=1)
    outside = ~inside
    worst = float(mv[outside].max()) if outside.any() else 0.0
    moved_in = float(mv[inside].max())
    byp = {}
    for p_, k in names.items():
        sel = outside & (part == p_)
        if sel.any():
            byp[k] = float(mv[sel].max())
    head_part = max(byp, key=byp.get) if byp else ""
    where = ""
    if worst > lim_:
        if quad:
            lo_, hi_ = lo, hi
            uo = u[outside & (mv > lim_)]
            where = "head and neck" if float(uo.mean()) < lo_ else "seat and tail"
            if any(part[outside & (mv > lim_)] != rig.parts["torso"]):
                where = names[int(part[outside & (mv > lim_)][0])]
        else:
            where = head_part
    ed = _edges(F)
    E, FA, FB, ok = ed[0][0], ed[1], ed[2], ed[3]
    d0, f0 = _folds(V, ed[0], FA, FB, ok)
    d1, f1 = _folds(Vp, ed[0], FA, FB, ok)
    fold_bad = d1 <= BIPED_RIG["fold_dot"] and d1 < d0 - 0.05
    bad = worst > lim_ or fold_bad
    if worst > lim_:
        meas = f"Breathing moves the {where}: {worst:.3f} H, limit {lim_:.3f} H"
    elif fold_bad:
        meas = f"A fold appears at full inhale (adjacent faces at a dot of {d1:.2f}, {d0:.2f} at rest)"
    else:
        meas = f"Full inhale moves the {region if quad else 'chest and belly'} up to {moved_in:.3f} H and nothing else more than {worst:.3f} H (limit {lim_:.3f} H); no fold, steepest dot {d1:.2f}"
    P = QD.proj(ctx, 90) if quad else PR.projector(90)
    idx = np.where(mv > 0.0006)[0]
    if len(idx) > 500:
        idx = idx[np.linspace(0, len(idx) - 1, 500).astype(int)]
    out = []
    mx = max(float(mv.max()), 1e-9)
    for i in idx:
        x, y = P(V[i])[0]
        t = float(mv[i]) / mx
        col = "#%02x%02x%02x" % (int(255 * min(1, 2 * t)), int(255 * (1 - abs(2 * t - 1)) * 0.75), int(255 * max(0, 1 - 2 * t)))
        out.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="3.2" fill="{col}" fill-opacity="0.85"/>')
    out += [PR.panel(24, 640, 560, 100), PR.label(36, 666, "Displacement at full inhale (blue small, red large)", PR.INK, "start", 17, bg=False),
            PR.label(36, 696, f"largest move in the chest and belly {moved_in:.3f} H", PR.INK, "start", 16, bg=False),
            PR.label(36, 722, f"largest move anywhere else {worst:.3f} H (limit {lim_:.3f} H)", PR.RED if worst > lim_ else PR.INK, "start", 16, bg=False)]
    return row("fail" if bad else "pass", f2(worst), lim_, meas, dict(mode="clay", az=90, svg="".join(out)),
               dict(fail=(f"Breathing moves the {where or head_part}" if bad else None), parts=[where or head_part] if bad and (where or head_part) else [], moved=round(moved_in, 4), shown=dict(value=f"{worst:.3f} H", limit=f"{lim_:.3f} H")))


# ---------------------------------------------------------------------------------------------------------------------------------------------------- the walk
@check(id="waddle", name="Waddle", fail="Feet lift in the waddle", stage="rig", version=1, part=["legs"], fields=["motion.walk", "parts.leg.L", "parts.fore.L", "parts.hind.L"],
       rule=dict(date="2026-11-02 20:16", words="The waddle must not fold the hips or the waist: no fold sharper than the rest mesh has at the walk's key poses, the feet flat on the floor in stance, and every vertex weighted to the bones by weights that add up to one."),
       limit=dict(text="the weights add up to 1 at every vertex and none is negative; no fold sharper than a dot of -0.2 and no more than a quarter more folded edges than at rest; every stance sole level within 10 degrees (the quadruped: 8 degrees, and a stance foot holding within 1 px)", value=BIPED_RIG["sole_tilt"]), az=90, mode="clay", play=None)
def c_waddle(ctx):
    r = _rig(ctx)
    quad = r["plan"] == "quadruped"
    lim_t = QUAD_RIG["sole_tilt"] if quad else BIPED_RIG["sole_tilt"]
    W, V, F, part = r["W"], r["V"], r["F"], r["part"]
    wsum_err = float(np.abs(W.sum(1) - 1).max())
    wmin = float(W.min())
    ed = _edges(F)
    FA, FB, ok = ed[1], ed[2], ed[3]
    d0, f0 = _folds(V, ed[0], FA, FB, ok)
    rows_, tilt_worst, hold_worst, dmin, fmax = [], 0.0, 0.0, 1.0, 0
    ik = []
    if quad:
        import qrig as QR
        import quadruped as Q
        rig = r["rig"]
        pxh = 95.0 * float(((ctx.mesh or {}).get("frame") or Q.frame(ctx.body.ctx["spec"]))["scale"])                    # px per H on the 304 strip
        nums = QR.walk_numbers(rig, pxh)
        keys = range(0, QR.FRAMES["walk"], 3)
        for i, rw in enumerate(nums):
            for fr in rw:
                tilt_worst = max(tilt_worst, abs(fr["angle"]))
                if fr["ground"]:
                    hold_worst = max(hold_worst, fr["hold"])
        for i in keys:
            Vp, M = rig.skin(QR.clip_pose(rig, "walk", i / QR.FRAMES["walk"]))
            d, f = _folds(Vp, ed[0], FA, FB, ok)
            dmin, fmax = min(dmin, d), max(fmax, f)
            rows_.append((i, max(abs(fr["angle"]) for fr in nums[i]), f))
            ik.append([np.array(M[f"{k}.ik.{s}"]) for k, s in QR.FEET])
        bend_ok = True
    else:
        import s20rig
        R = r["rig"]
        pn = ctx.body.ctx["body_parts"]
        lo = part == pn["leg.L"]
        sole = lo & (V[:, 2] < 0.035)
        for ph in s20rig.WALK_KEYS:
            M, st = R.waddle_pose(ph)
            Vp = R.skin(V, W, M)
            d, f = _folds(Vp, ed[0], FA, FB, ok)
            dmin, fmax = min(dmin, d), max(fmax, f)
            tmax = 0.0
            for sd, sg in (("L", 1), ("R", -1)):
                if not st[sd]:
                    continue
                P = Vp[sole & (np.sign(V[:, 1]) == sg)]
                c = P - P.mean(0)
                _, _, vt = np.linalg.svd(c, full_matrices=False)
                tmax = max(tmax, math.degrees(math.acos(min(1.0, abs(vt[-1][2])))))
            tilt_worst = max(tilt_worst, tmax)
            rows_.append((ph, tmax, f))
        bend_ok = True
    allowed = f0 * BIPED_RIG["fold_more"] + 4
    probs = []
    if wsum_err > 1e-6 or wmin < -1e-9:
        probs.append("weights")
    if dmin <= BIPED_RIG["fold_dot"]:
        probs.append("folds")
    if fmax > allowed:
        probs.append("more folds")
    if tilt_worst > lim_t:
        probs.append("soles")
    if quad and hold_worst > QUAD_RIG["hold_px"]:
        probs.append("hold")
    bad = bool(probs)
    wording = {"weights": "the weights do not add up to 1", "folds": f"a fold at a dot of {dmin:.2f}", "more folds": f"{fmax} folded edges, {f0} at rest", "soles": f"a sole is {tilt_worst:.1f} degrees off level, limit {lim_t:.0f}", "hold": f"a stance foot slides {hold_worst:.1f} px, limit {QUAD_RIG['hold_px']:.0f}"}
    meas = ("Feet lift in the waddle: " + "; ".join(wording[p] for p in probs)) if bad else (f"Soles level within {tilt_worst:.1f} degrees (limit {lim_t:.0f})" + (f", stance feet holding within {hold_worst:.1f} px" if quad else "") +
                                                                                      f"; weights add up to 1; {fmax} folded edges at most, {f0} at rest; steepest dot {dmin:.2f}")
    P = QD.proj(ctx, 90) if quad else PR.projector(90)
    out = []
    if quad:
        cols = (PR.BLUE, "#d98a1c", "#4f7d44", "#8a4fa8")
        for k, pts_list in enumerate(ik):
            for j, A in enumerate(pts_list):
                pp = P(A)
                out.append(PR.poly(pp[:3], cols[k % 4] if j < 2 else "#8a8798", 3))
                out.append(PR.dot(pp[3][0], pp[3][1], 5, cols[k % 4]))
    else:
        import s20rig
        for k, ph in enumerate(s20rig.WALK_KEYS):
            M, st = R.waddle_pose(ph)
            Vp = R.skin(V, W, M)
            for sd, sg in (("L", 1), ("R", -1)):
                Ps = P(Vp[sole & (np.sign(V[:, 1]) == sg)])
                out.append(PR.poly(np.array([Ps[Ps[:, 0].argmin()], Ps[Ps[:, 0].argmax()]]), (PR.BLUE, "#d98a1c", "#4f7d44", "#8a4fa8")[k], 4))
    lines = [f"key {i + 1}: sole tilt {t:.1f}°, {f} folded edges" for i, (_, t, f) in enumerate(rows_)]
    out += [PR.panel(24, 640, 560, 128), PR.label(36, 664, f"Four key frames: sole tilt and folded edges ({f0} at rest, limit {int(allowed)})", PR.INK, "start", 16, bg=False)]
    for i, ln in enumerate(lines[:4]):
        out.append(PR.label(36 + 280 * (i % 2), 696 + 28 * (i // 2), ln, PR.INK, "start", 15, bg=False))
    out.append(PR.label(36, 756, f"weights add up to 1 within {wsum_err:.0e}; the smallest is {wmin:.3f}", PR.INK, "start", 15, bg=False))
    shown = dict(value=f"{tilt_worst:.1f}°", limit=f"{lim_t:.0f}°")
    return row("fail" if bad else "pass", f2(tilt_worst), lim_t, meas, dict(mode="clay", az=90, svg="".join(out)), dict(fail=("Feet lift in the waddle" if bad else None), parts=["legs"] if bad else [], folds=dict(rest=f0, worst=fmax, dot=round(dmin, 3)), shown=shown))
