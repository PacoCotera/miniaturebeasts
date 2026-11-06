"""The body checks of the language (chunk 6; codify.md sections 3, 5, 6 and 7): the family's mass, the 15% rule, the feet, the pairs and the twist.
Six checks: body.mass (cage, so the extremes stage runs it at both ends of every shape locus), body.band15, body.feet, body.pairs (file), body.twist (cage: the spine's section frames at rest and at both ends) and body.twist.clip (rig: the blocks' roll in every clip).
They judge a `mb-species/2` file; the fixture (S20, /1) and the play species are skipped (checks/__init__.py). A signed exception for ONE check turns that check's red into amber with the record's reason (checks/face.verdict); every other check applies in full.
The bands are the family's own (the registry's `families[].bands`, read through families/registry.py): head at least 30% of the standing height, neck 0-0.2 H, legs at most a third of the standing height; the design says "tighter where the stand says" and gives no per-family number yet, so every family carries the house bands until the art desk signs tighter ones.
The names and fail lines are OWED to the copywriter."""
import math

import numpy as np

from . import check
from . import proof as PR
from .biped import R, f2
from .face import _band, _proof, verdict

TWIST_DEG = 3.0                         # codify 7 (proposal; the art desk signs the number): the spine's and the torso's section frames twist at most 3 degrees, root to tip
BAND15 = 0.15
SHAPE_LOCI = ("form.head", "form.torso-girth", "form.torso-length", "form.leg-length", "form.leg-girth", "form.tail-length", "form.neck", "form.body")      # the proportions the language lets the genome vary about 15% (section 6); eyes, mouth and ears have their own rules
FOOT_OK = ("pad", "paw", "round")        # the round flat foot with toe pads (the cage builder calls its flat round foot `paw`); no hoof, claw, wedge, web or sucker
FOOT_NO = ("hoof", "claw", "webbed", "web", "wedge", "sucker", "suckers", "talon", "root")


def _doc(ctx):
    return ctx.doc if isinstance(ctx.doc, dict) else {}


def family_bands(ctx):
    """The bands of the file's family from the registry; the house bands when the file names none."""
    from families import registry as FR
    f = FR.get(_doc(ctx).get("family"))
    return (f or {}).get("bands") or dict(headShareMin=0.30, neck=[0.0, 0.2], legShareMax=1 / 3)


def _mesh(ctx):
    """The built body of a sculpt (meshbody.MeshBody) with its armature, or None for any other body."""
    b = ctx.body
    return b if getattr(b, "mesh_body", False) and getattr(b, "rig", None) is not None else None


def _quad(ctx):
    sp = ctx.spec
    return isinstance(sp, dict) and sp.get("plan") == "quadruped"


def _skip(why):
    from . import row
    return row("pass", None, None, why)


# ------------------------------------------------------------------------------------------------------------------------------------------------------ body.mass
@check(id="body.mass", name="Big head, no neck, short legs", fail="The body is {what}", stage="cage", version=1, part=["head", "neck", "legs"], fields=["spine.ranges", "spine.loft.head_profile.R_scale", "parts"],
       rule=R("2026-11-05 21:18", "Big head, no neck, short legs; never lanky. The family's template bands hold: the head at least 30% of the standing height, the neck 0 to 0.2 H (0 is allowed: the head may merge into the body), the legs at most a third of the standing height."),
       limit=dict(text="head at least 0.30 of the standing height · neck 0-0.2 H · legs at most 1/3 of the standing height (the family's bands)", value=None), az=90)
def c_mass(ctx):
    mb = _mesh(ctx)
    if mb is not None:                                                         # a sculpt: the head's share from the head and crown bones' weights, the legs from the underside of the girdles' skin
        head, legs, neck = mb.rig.head_share(mb.Vw), mb.rig.leg_share(mb.Vw), 0.0
        b = family_bands(ctx)
        probs = []
        if head < b["headShareMin"] - 1e-9:
            probs.append(f"head {head:.2f} of the height, at least {b['headShareMin']:.2f}")
        if legs > b["legShareMax"] + 1e-9:
            probs.append(f"legs {legs:.2f} of the height, at most {b['legShareMax']:.2f}")
        bad = bool(probs)
        why = ("Body: " + "; ".join(probs)) if bad else f"Head {head:.2f} of the height, legs {legs:.2f} of the height"
        bars = [("Legs over height", f"{legs:.2f}", legs / (b["legShareMax"] * 1.6), PR.RED if legs > b["legShareMax"] else PR.SAGE, 1 / 1.6, f"limit {b['legShareMax']:.2f}"),
                ("Head over height", f"{head:.2f}", min(1.0, head), PR.RED if head < b["headShareMin"] else PR.SAGE, b["headShareMin"], f"at least {b['headShareMin']:.2f}")]
        return verdict(ctx, "body.mass", bad, f2(head), dict(head=b["headShareMin"], neck=b["neck"], legs=b["legShareMax"]), why, _proof(ctx, 90, PR.RED if bad else PR.SAGE, [], _band(bars=bars)),
                       dict(head=head, neck=neck, legs=legs, what="lanky" if bad else "compact", family=_doc(ctx).get("family")))
    if not _quad(ctx):
        return _skip("No mass measure for this plan yet")
    import quadruped as Q
    V = np.asarray(ctx.mesh["V"], float)
    part, names = np.asarray(ctx.mesh["part"]), ctx.mesh["names"]
    torso = [k for k, v in names.items() if v == "torso"]
    tv = V[np.isin(part, torso)]
    height = float(V[:, 2].max() - V[:, 2].min())
    head = 2.0 * float(Q.params(ctx.doc)["R_head"]) / height
    legs = float(tv[:, 2].min() - V[:, 2].min()) / height
    neck = next((float(r["length"]) for r in _doc(ctx)["spine"]["ranges"] if r["name"] == "neck"), 0.0)
    b = family_bands(ctx)
    probs = []
    if head < b["headShareMin"] - 1e-9:
        probs.append(f"head {head:.2f} of the height, at least {b['headShareMin']:.2f}")
    if not (b["neck"][0] - 1e-9 <= neck <= b["neck"][1] + 1e-9):
        probs.append(f"neck {neck:.2f} H, between {b['neck'][0]:g} and {b['neck'][1]:g}")
    if legs > b["legShareMax"] + 1e-9:
        probs.append(f"legs {legs:.2f} of the height, at most {b['legShareMax']:.2f}")
    bad = bool(probs)
    what = "lanky" if bad else "compact"
    why = ("Body: " + "; ".join(probs)) if bad else f"Head {head:.2f} of the height, neck {neck:.2f} H, legs {legs:.2f} of the height"
    bars = [("Legs over height", f"{legs:.2f}", legs / (b["legShareMax"] * 1.6), PR.RED if legs > b["legShareMax"] else PR.SAGE, 1 / 1.6, f"limit {b['legShareMax']:.2f}"),
            ("Head over height", f"{head:.2f}", min(1.0, head), PR.RED if head < b["headShareMin"] else PR.SAGE, b["headShareMin"], f"at least {b['headShareMin']:.2f}")]
    return verdict(ctx, "body.mass", bad, f2(head), dict(head=b["headShareMin"], neck=b["neck"], legs=b["legShareMax"]), why, _proof(ctx, 90, PR.RED if bad else PR.SAGE, [], _band(bars=bars)),
                   dict(head=head, neck=neck, legs=legs, what=what, family=_doc(ctx).get("family")))


# ------------------------------------------------------------------------------------------------------------------------------------------------------ body.band15
def _shape_loci(doc):
    g = doc.get("genome") if isinstance(doc.get("genome"), dict) else {}
    return [e for e in g.get("loci", []) if isinstance(e, dict) and e.get("locus") in SHAPE_LOCI]


@check(id="body.band15", name="Proportions within 15%", fail="{locus} varies more than 15%", stage="file", version=1, part=[], fields=["genome.loci"],
       rule=R("2026-11-05 21:18", "The genome varies proportions about 15%, never enough to change the build: every shape locus's band is within 0.85 to 1.15 of its type (a `mult` band), or within 15% of the type's value (an `off` or `lin` band)."),
       limit=dict(text="every shape locus's band within 15% of its type", value=BAND15), az=90)
def c_band15(ctx):
    doc = _doc(ctx)
    worst, bad = 0.0, []
    for e in _shape_loci(doc):
        b = e.get("band") or e.get("absolute")
        if not isinstance(b, dict):
            continue
        typ = e.get("type")
        form = b.get("form", "mult")
        if form == "mult":
            spread = max(abs(float(b["lo"]) - 1.0), abs(float(b["hi"]) - 1.0))
        elif isinstance(typ, (int, float)) and typ not in (0, 0.0):
            spread = max(abs(float(b["lo"]) - typ), abs(float(b["hi"]) - typ)) / abs(float(typ))
        else:
            continue
        worst = max(worst, spread)
        if spread > BAND15 + 1e-9:
            bad.append((e["locus"], spread))
    n = len(_shape_loci(doc))
    why = ("; ".join(f"{k} varies {v * 100:.0f}% from its type, limit 15%" for k, v in bad)) if bad else (f"{n} shape locus band{'s' if n != 1 else ''}, the widest {worst * 100:.0f}% from its type" if n else "No shape locus is open: nothing varies yet")
    bars = [("Widest band", f"{worst * 100:.0f}%", worst / (BAND15 * 2), PR.RED if bad else PR.SAGE, 0.5, "limit 15%")]
    return verdict(ctx, "body.band15", bool(bad), f2(worst), BAND15, why, _proof(ctx, 90, PR.RED if bad else PR.SAGE, [], _band(bars=bars)), dict(loci=[k for k, _ in bad], locus=bad[0][0] if bad else None))


# ------------------------------------------------------------------------------------------------------------------------------------------------------ body.feet
@check(id="body.feet", name="Round feet", fail="A foot is a {kind}", stage="file", version=1, part=["legs"], fields=["parts.leg.end.kind", "parts.arm.end.kind"],
       rule=R("2026-11-05 21:18", "Round feet with toe pads: the foot's end kind is a pad, never a hoof, claw, wedge or web; a six-arm's arms end in no suckers."),
       limit=dict(text="every limb ends in a round pad (no hoof, claw, wedge, web or sucker)", value=0), az=90)
def c_feet(ctx):
    found = []
    for p in _doc(ctx).get("parts") or []:
        if not isinstance(p, dict) or p.get("kind") != "limb":
            continue
        k = str((p.get("end") or {}).get("kind", "pad")).lower()
        if k in FOOT_NO or k not in FOOT_OK:
            found.append((p.get("id"), k))
    bad = bool(found)
    why = ("; ".join(f"{i} ends in a {k}" for i, k in found)) if bad else "Every limb ends in a round pad"
    return verdict(ctx, "body.feet", bad, len(found), 0, why, _proof(ctx, 90, PR.RED if bad else PR.SAGE, [], _band(lines=[("Feet: " + (", ".join(f"{i} {k}" for i, k in found) if found else "all pads"), PR.RED if bad else PR.INK)])),
                   dict(parts=[i for i, _ in found], kind=found[0][1] if found else None))


# ------------------------------------------------------------------------------------------------------------------------------------------------------ body.pairs
def _strip(d):
    d = dict(d)
    d.pop("id", None)
    return d


@check(id="body.pairs", name="Paired parts match", fail="{part} does not match its pair", stage="file", version=1, part=["legs"], fields=["parts"],
       rule=R("2026-11-05 21:18", "Legs under the weight, paired parts match: a part named .L and its .R are the same part, mirrored, with identical chains, roots and sockets. A part with no pair is mirrored by the builder."),
       limit=dict(text="every .L part and its .R part identical but for the id", value=0), az=90)
def c_pairs(ctx):
    parts = {p.get("id"): p for p in _doc(ctx).get("parts") or [] if isinstance(p, dict)}
    off = []
    for i, p in parts.items():
        if isinstance(i, str) and i.endswith(".L"):
            q = parts.get(i[:-2] + ".R")
            if q is not None and _strip(p) != _strip(q):
                off.append(i[:-2])
    bad = bool(off)
    why = ("Pairs that differ: " + ", ".join(off)) if bad else "Every pair matches (a lone .L part is mirrored by the builder)"
    return verdict(ctx, "body.pairs", bad, len(off), 0, why, _proof(ctx, 90, PR.RED if bad else PR.SAGE, [], _band(lines=[("Pairs off: " + (", ".join(off) if off else "none"), PR.RED if bad else PR.INK)])), dict(parts=off, part=off[0] if off else None))


# ------------------------------------------------------------------------------------------------------------------------------------------------------ body.twist
def _roll_deg(Rm):
    """The roll of a block's 3x3 rotation: how far its own side axis (y) leans out of the horizontal, in degrees. A block that only pitches (about y) or yaws (about z) keeps it level; a twist about the spine tips it."""
    return math.degrees(math.asin(max(-1.0, min(1.0, float(Rm[2, 1])))))


@check(id="body.twist", name="No twisted body", fail="The spine twists {deg} degrees", stage="cage", version=1, part=["head", "neck", "back", "seat", "tail"], fields=["spine", "skeleton"],
       rule=R("2026-11-05 20:05", "No twisted bodies: the spine's and the torso's section frames turn about the spine axis at most 3 degrees, root to tip, at rest and at both ends of every shape locus (the art desk signs the number)."),
       limit=dict(text="section frames twist at most 3° about the spine axis, root to tip", value=TWIST_DEG), az=32)
def c_twist(ctx):
    mb = _mesh(ctx)
    if mb is not None:                                                         # a sculpt: the front block's roll against the rear block's, at rest (the bone scales never turn a block)
        tw = mb.rig.twist_deg(mb.mats)
        bad = tw > TWIST_DEG + 1e-9
        bars = [("Twist root to tip", f"{tw:.2f}\u00b0", tw / (TWIST_DEG * 2), PR.RED if bad else PR.SAGE, 0.5, f"limit {TWIST_DEG:g}\u00b0")]
        return verdict(ctx, "body.twist", bad, f2(tw), TWIST_DEG, f"The front block rolls {tw:.2f}\u00b0 against the rear block, limit {TWIST_DEG:g}\u00b0", _proof(ctx, 32, PR.RED if bad else PR.SAGE, [], _band(bars=bars)), dict(deg=f"{tw:.1f}", twist=tw))
    if not _quad(ctx):
        return _skip("No twist measure for this plan yet")
    pa = ctx.body.ctx["path"]
    s = np.linspace(0.0, float(pa.length), 160)
    Bs = pa.at(s)[3]
    roll = np.degrees(np.arcsin(np.clip(Bs[:, 1], -1, 1)))                   # how far the frame's third axis leans out of the plane the spine lies in, about the spine
    tw = float(roll.max() - roll.min())
    bad = tw > TWIST_DEG + 1e-9
    why = f"Section frames twist {tw:.2f}° about the spine, root to tip, limit {TWIST_DEG:g}°"
    bars = [("Twist root to tip", f"{tw:.2f}°", tw / (TWIST_DEG * 2), PR.RED if bad else PR.SAGE, 0.5, f"limit {TWIST_DEG:g}°")]
    return verdict(ctx, "body.twist", bad, f2(tw), TWIST_DEG, why, _proof(ctx, 32, PR.RED if bad else PR.SAGE, [], _band(bars=bars)), dict(deg=f"{tw:.1f}", twist=tw))


@check(id="body.twist.clip", name="No twist in motion", fail="The body twists {deg} degrees in {clip}", stage="rig", version=1, part=["back", "seat", "tail"], fields=["motion"],
       rule=R("2026-11-05 20:05", "No twisted bodies, in every clip: the front block, the rear block and the tail's bones keep their roll about the spine within 3 degrees of one another in every key frame."),
       limit=dict(text="blocks and tail bones within 3° of roll of one another in every key frame of every clip", value=TWIST_DEG), az=32)
def c_twist_clip(ctx):
    mb = _mesh(ctx)
    if mb is not None:                                                         # a sculpt: the walk's twelve keys on the armature
        import meshrig as MR
        worst = 0.0
        for k in range(MR.FRAMES):
            _, mats, _ = mb.rig.walk(k, mb.doc.get("rig"), mb.keys)
            worst = max(worst, mb.rig.twist_deg(mats))
        bad = worst > TWIST_DEG + 1e-9
        bars = [("Worst roll", f"{worst:.2f}\u00b0", worst / (TWIST_DEG * 2), PR.RED if bad else PR.SAGE, 0.5, f"limit {TWIST_DEG:g}\u00b0")]
        return verdict(ctx, "body.twist.clip", bad, f2(worst), TWIST_DEG, f"Blocks twist {worst:.2f}\u00b0 of one another at most (in walk), limit {TWIST_DEG:g}\u00b0", _proof(ctx, 32, PR.RED if bad else PR.SAGE, [], _band(bars=bars)), dict(deg=f"{worst:.1f}", clip="walk"))
    if not _quad(ctx):
        return _skip("No twist measure for this plan yet")
    from .rig import _rig
    import qrig as QR
    rig = _rig(ctx)["rig"]
    worst, where = -1.0, None
    for name, n in QR.FRAMES.items():
        for k in range(n):
            M = rig.block(QR.clip_pose(rig, name, k / n))
            rolls = [_roll_deg(m[:3, :3]) for m in M.values()]
            d = max(rolls) - min(rolls)
            if d > worst:
                worst, where = d, name
    worst = max(worst, 0.0)
    bad = worst > TWIST_DEG + 1e-9
    why = f"Blocks twist {worst:.2f}° of one another at most (in {where}), limit {TWIST_DEG:g}°" if where else "No clip to judge"
    bars = [("Worst roll", f"{worst:.2f}°", worst / (TWIST_DEG * 2), PR.RED if bad else PR.SAGE, 0.5, f"limit {TWIST_DEG:g}°")]
    return verdict(ctx, "body.twist.clip", bad, f2(worst), TWIST_DEG, why, _proof(ctx, 32, PR.RED if bad else PR.SAGE, [], _band(bars=bars)), dict(deg=f"{worst:.1f}", clip=where))


# ------------------------------------------------------------------------------------------------------------------------------------------------------ rig.splay
SPLAY = 0.03                              # the feet stay under their hips: sideways, at most 0.03 H from where the stand has them, in every key of the walk


@check(id="rig.splay", name="Feet under the hips", fail="A foot leaves its hip in {clip}", stage="rig", version=1, part=["legs"], fields=["rig.bones", "motion"],
       rule=R("2026-11-06 12:00", "The feet stay under the hips in every key of every clip: a foot's sideways offset from its hip changes by at most 0.03 H from the stand's. A strong key must not splay a leg."),
       limit=dict(text="every foot within 0.03 H sideways of where the stand has it under its hip, in every walk key", value=SPLAY), az=0)
def c_splay(ctx):
    mb = _mesh(ctx)
    if mb is None:
        return _skip("No splay measure for this body")
    import meshrig as MR
    keys, worst, at = [], 0.0, 0
    for k in range(MR.FRAMES):
        V, mats, _ = mb.rig.walk(k, mb.doc.get("rig"), mb.keys)
        sp = mb.rig.splay(V, mats)
        bal = mb.rig.balance(V)
        keys.append(dict(key=k, splay=round(sp, 4), balance_margin=round(bal["margin"], 3), balance_inside=bal["inside"], feet_down=bal["down"]))
        if sp > worst:
            worst, at = sp, k
    bad = worst > SPLAY + 1e-9
    why = f"Feet stay within {worst:.3f} H of their hips (key {at} of the walk), limit {SPLAY:g} H"
    bars = [("Worst splay", f"{worst:.3f} H", worst / (SPLAY * 2), PR.RED if bad else PR.SAGE, 0.5, f"limit {SPLAY:g} H")]
    return verdict(ctx, "rig.splay", bad, round(worst, 4), SPLAY, why, _proof(ctx, 0, PR.RED if bad else PR.SAGE, [], _band(bars=bars)), dict(clip="walk", keys=keys, worst_key=at))
