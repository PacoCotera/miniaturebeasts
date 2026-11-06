"""The face checks of the language (codify.md section 3): the house mibi eye, how many, where, how big, how it looks, and what is not on the face.
Ten checks: face.count, face.front, face.on-body, face.flush, face.size, face.row, face.lid, face.mouth, face.clear, face.iris. They judge a `mb-species/2` file only: the fixture (S20, /1) and any older file are skipped (checks/__init__.py).
An anchor is never exempt as a whole: its signed record for ONE check (the registry's `exceptions`, or the file's own `waivers`) turns that check's red into amber with the record's reason, and every other check applies in full.
The names and fail lines are OWED to the copywriter (the language design gives the rules, not the words). The rule words are the language design's own (codify.md section 3, the owner's rulings of 5 Nov).
The file-stage checks read the file alone, with the eyes' places worked out from it (wb/clayface.quad_guess); the cage-stage checks read the decal as it lands on the built skin (facedecal.py), so they judge what is drawn."""
import math

import numpy as np

from . import check, row
from . import proof as PR
from .biped import R, f2

def _house():
    import species_v1 as V1
    return V1.registry()["eye"]


_EYE = _house()
_SZ, _DC = _EYE["size"], _EYE["decal"]
FACE = dict(
    eye_count=(2, 3),                        # the registry's counts: two, three on S15 only (codify 3)
    front_deg=40.0,                          # every eye's normal within 40 degrees of the facing direction
    on_body=0.01,                            # the decal stands off the skin at most 0.01 H
    iris_share=(_DC["irisShare"] - 0.05, _DC["irisShare"] + 0.05),         # the house eye (registry `eye.decal`, art desk 2026-11-06): iris 85% of the disc, give or take 5 points ...
    pupil_share=(_DC["pupilShare"] - 0.05, _DC["pupilShare"] + 0.05),      # ... pupil 70% of the iris, give or take 5 points ...
    size=tuple(_SZ["band"]),                 # eye diameter over the head's width, at both ends of form.eye-size: the registry's band, 0.12-0.24
    genome_var=_SZ["genomeVar"],             # form.eye-size moves the eye by at most 15%, inside the band
    spacing=_SZ["spacingVar"],               # form.eye-spacing: the type's gap +- 15%
    row_tol=0.02,                            # pair mirrored, row level, within 2% of the head's width
    lid_max=0.35,                            # the knowing lid closes at most 35%, straight edge
    mouth_span=0.6,                          # the mouth's width at most 0.6 of the eye span
    iris_pupil_dl=0.30,                      # the iris against the pupil, and the pupil against the face zone: at least 0.30 L each (signed values in the registry's eye block)
)
FLUSH_FIELDS = ("rim", "rims", "socket", "sockets", "bulge", "ring", "rings", "sunken", "dome")          # a flush eye has none of these
BAD_FRAMES = ("sleepy", "droopy", "sad", "tired", "angry", "scared")
CLEAR_KEYS = ("cheeks", "cheek", "blush", "nostril", "nostrils", "nose", "fang", "fangs", "tooth", "teeth", "whisker", "whiskers", "brow", "brows", "muzzle", "lip", "lips")
BAD_MOUTH = ("w", "cat", "frog", "open", "o")
HOSTS = ("head", "torso")
GEOMETRY_EYES = ("stalk", "stalks", "antenna", "antennae", "geometry", "horn")


# ------------------------------------------------------------------------------------------------------------------------------------------------------ what the checks read
def _doc(ctx):
    return ctx.doc if isinstance(ctx.doc, dict) else {}


def _face(ctx):
    f = _doc(ctx).get("face")
    return f if isinstance(f, dict) else {}


def _eyes(ctx):
    e = _face(ctx).get("eyes")
    return e if isinstance(e, dict) else {}


def _mouth(ctx):
    m = _face(ctx).get("mouth")
    return m if isinstance(m, dict) else {}


def _registry_count(ctx):
    import species_v1 as V1
    k = V1.registry_kind(_doc(ctx).get("id"))
    return k["eyes"]["count"] if k else 2


def waiver(ctx, cid):
    """The signed record that excepts this kind from this check, or None: the registry's, then the file's own `waivers`."""
    import species_v1 as V1
    sid = _doc(ctx).get("id")
    for w in V1.registry().get("exceptions", []):
        if w["kind"] == sid and w["check"] == cid:
            return w
    for w in _doc(ctx).get("waivers") or []:
        if isinstance(w, dict) and w.get("check") == cid:
            return w
    return None


def verdict(ctx, cid, bad, value, limit, measure, proof=None, extra=None):
    """pass, or red with the measure, or amber when a signed record for this one check covers the kind."""
    extra = dict(extra or {})
    if not bad:
        return row("pass", value, limit, measure, proof, extra)
    w = waiver(ctx, cid)
    if w is None:
        return row("fail", value, limit, measure, proof, extra)
    extra["waiver"] = dict(w)
    return row("warn", value, limit, f"{measure} (excepted: {w['reason']}; {w['by']}, {w['date']})", proof, extra)


def _surf(ctx):
    import facedecal as FD
    d = ctx.__dict__.setdefault("_face", {})
    if "surf" not in d:
        d["surf"] = FD.Surface(ctx.mesh["V"], ctx.mesh["F"]) if isinstance(ctx.mesh, dict) and "V" in ctx.mesh else None
    return d["surf"]


def _decal_file(ctx):
    from wb import clayface as CF
    return CF.is_decal_file(_doc(ctx))


def stations(ctx):
    """The stations as they land on the built skin: the Ctx's own (a test or a sheet may hand it some), else worked out from the file on the proxy mesh. None when there is no mesh or the file has no eye station."""
    from wb import clayface as CF
    d = ctx.__dict__.setdefault("_face", {})
    if getattr(ctx, "stations", None) is not None:
        return ctx.stations
    if "st" not in d:
        s = _surf(ctx)
        d["st"] = CF.quad_stations(_doc(ctx), s, {}) if (s is not None and _decal_file(ctx)) else None
    return d["st"]


def decal(ctx):
    """(V, F, L) of the decal on the skin, once per Ctx."""
    import facedecal as FD
    from wb import clayface as CF
    d = ctx.__dict__.setdefault("_face", {})
    if "dec" not in d:
        d["dec"] = FD.build(_surf(ctx), stations(ctx), CF.decal_look(_doc(ctx)))
    return d["dec"]


def guess(ctx):
    """(eyes [(point, normal)], mouth, head width) from the file alone, or None for a file with no eye station."""
    from wb import clayface as CF
    if not _decal_file(ctx):
        return None
    d = ctx.__dict__.setdefault("_face", {})
    if "guess" not in d:
        d["guess"] = CF.quad_guess(_doc(ctx))
    return d["guess"]


def _px(ctx, az):
    """(projector, pixels per H) of the proof frame, for the quadruped plan; None for another plan."""
    from . import quad as QD
    if not QD.is_quad(ctx):
        return None
    import quadruped as Q
    fr = (ctx.mesh or {}).get("frame") if isinstance(ctx.mesh, dict) else None
    fr = fr or Q.frame(ctx.doc)
    return QD.proj(ctx, az), PR.PPH * float(fr["scale"])


def _eye_points(ctx):
    st = stations(ctx) if isinstance(ctx.mesh, dict) else None
    if st:
        return [(s["point"], s["size"]) for s in st if s["kind"] == "eye"]
    g = guess(ctx)
    r = float(_eyes(ctx).get("r", 0.09))
    return [(p, r) for p, _ in g[0]] if g else []


def _mouth_point(ctx):
    st = stations(ctx) if isinstance(ctx.mesh, dict) else None
    if st:
        m = [s for s in st if s["kind"] == "mouth"]
        if m:
            return m[0]["point"], m[0]["size"]
    g = guess(ctx)
    if g and g[1]:
        return g[1][0], float(_mouth(ctx).get("width", 0.2))
    return None


def _rings(ctx, az, things, color):
    """Rings round points (the eyes, the mouth) on the proof frame: [(point, radius in H)] -> svg, or "" for a plan without a projector."""
    pj = _px(ctx, az)
    if pj is None or not things:
        return ""
    P, ppH = pj
    out = []
    for p, r in things:
        x, y = P(np.asarray(p, float))[0]
        out.append(PR.ring(x, y, max(16.0, 1.9 * r * ppH + 8), color, 4))
    return "".join(out)


def _bar(i, name, val_text, frac, color, limit_frac=None, limit_text=None):
    """A bar with its name and value above the track and a tick for the limit, the limit's words in the same line (two bars fit the panel: no label under the track)."""
    x, y, w = 40, 664 + 48 * i, 400
    out = [f'<rect x="{x}" y="{y}" width="{w}" height="14" rx="5" fill="#ffffff" stroke="#8a8798" stroke-width="1.5"/>',
           f'<rect x="{x}" y="{y}" width="{max(2.0, max(0.0, min(1.0, frac)) * w):.1f}" height="14" rx="5" fill="{color}"/>']
    if limit_frac is not None:
        lx = x + limit_frac * w
        out.append(PR.line((lx, y - 6), (lx, y + 20), PR.INK, 3))
    text = f"{name}  {val_text}" + (f" · {limit_text}" if limit_text else "")
    out.append(PR.label(x, y - 10, text, PR.INK))
    return "".join(out)


def _band(lines=(), bars=()):
    """The panel under the figure: bars (each with its name and its limit's tick), then plain lines."""
    out = [PR.panel(24, 628, 560, 140)]
    bars = list(bars)[:2]
    for i, b in enumerate(bars):
        out.append(_bar(i, *b))
    y0 = 664 if not bars else (738 if len(bars) == 1 else 9999)
    for k, s in enumerate(lines):
        if y0 + 26 * k < 764:
            out.append(PR.label(40, y0 + 26 * k, s[0], s[1], "start", 19, bg=False))
    return "".join(out)


def _proof(ctx, az, ring_color, things, band):
    return dict(mode="clay", az=az, svg=_rings(ctx, az, things, ring_color) + band)


def _skip(ctx, cid, why):
    return row("pass", None, None, why)


# ------------------------------------------------------------------------------------------------------------------------------------------------------ 1 face.count
@check(id="face.count", name="Eye count", fail="{n} eyes on a kind with {k}", stage="file", version=1, part=["head"], fields=["face.eyes.count"],
       rule=R("2026-11-05 22:33", "Two eyes. Lehten has three in one level row, and it is the only kind with three. No locus may change the count: the count is the kind's, never an individual's."),
       limit=dict(text="the registry's count: two, or three on S15 only", value=2), az=0)
def c_count(ctx):
    n = _eyes(ctx).get("count")
    want = _registry_count(ctx)
    sid = _doc(ctx).get("id")
    bad = n not in FACE["eye_count"] or n != want or (n == 3 and sid != "S15")
    why = f"{n} eye{'s' if n != 1 else ''} in the file, {want} for {sid}" + ("; three eyes belong to S15 only" if n == 3 and sid != "S15" else "")
    things = _eye_points(ctx)
    band = _band(bars=[("Eyes", f"{n} of {want}", (n or 0) / max(want, n or 1, 1), PR.RED if bad else PR.SAGE, want / max(want, n or 1, 1), f"kind has {want}")])
    return verdict(ctx, "face.count", bad, n, want, why, _proof(ctx, 0, PR.RED if bad else PR.SAGE, things, band), dict(count=n, want=want))


# ------------------------------------------------------------------------------------------------------------------------------------------------------ 2 face.front
@check(id="face.front", name="Eyes face front", fail="An eye looks away from the viewer", stage="cage", version=1, part=["head"], fields=["face.eyes.station", "face.eyes.around"],
       rule=R("2026-11-05 21:18", "The eyes face the viewer: every eye's centre within 40 degrees of the way the mibi faces, and every eye in view from the front. An eye on the side of the head is no eye at all."),
       limit=dict(text="every eye within 40° of the facing direction, in view at the front", value=FACE["front_deg"]), az=32)
def c_front(ctx):
    st = stations(ctx)
    if st is None:
        return _skip(ctx, "face.front", "No eye stations in this file yet")
    surf = _surf(ctx)
    cam = np.array([math.cos(math.radians(10)), 0.0, math.sin(math.radians(10))])            # the front view (az 0, elevation 10)
    eyes = [s for s in st if s["kind"] == "eye"]
    want = int(_eyes(ctx).get("count", 2))
    angs, hidden = [], []
    for s in eyes:
        n = s["normal"]
        angs.append(math.degrees(math.acos(float(np.clip(n @ np.array([1.0, 0.0, 0.0]), -1, 1)))))
        seen = float(n @ cam) > 0.0
        if seen:
            t, _ = surf.hit(s["point"] + 0.01 * n, cam)
            seen = t is None
        hidden.append(not seen)
    worst = max(angs) if angs else 0.0
    bad = worst > FACE["front_deg"] or any(hidden) or len(eyes) < want
    why = ("Eye " + ", ".join(f"{k + 1} at {a:.0f}°" for k, a in enumerate(angs)) + f" off the front, limit {FACE['front_deg']:.0f}°") if angs else "No eye landed on the body"
    if any(hidden):
        why += "; " + ", ".join(str(k + 1) for k, h in enumerate(hidden) if h) + " out of view at the front"
    bars = [(f"Eye {k + 1}", f"{a:.0f}° off the front", a / (FACE["front_deg"] * 1.5), PR.RED if a > FACE["front_deg"] or hidden[k] else PR.SAGE, 1 / 1.5, f"limit {FACE['front_deg']:.0f}°") for k, a in list(enumerate(angs))[:2]]
    return verdict(ctx, "face.front", bad, f2(worst), FACE["front_deg"], why, _proof(ctx, 32, PR.RED if bad else PR.SAGE, [(s["point"], s["size"]) for s in eyes], _band(bars=bars)),
                   dict(angles=[f2(a) for a in angs], hidden=hidden))


# ------------------------------------------------------------------------------------------------------------------------------------------------------ 3 face.on-body
@check(id="face.on-body", name="Eyes on the body", fail="An eye sits off the head", stage="cage", version=1, part=["head"], fields=["face.on", "face.kind"],
       rule=R("2026-11-05 21:18", "The eyes are in the body's surface: decals on the head or the torso. No stalks, nothing on antennae or horns, no eye built as its own shape. The decal stands off the skin by at most 0.01 H."),
       limit=dict(text="host head or torso, a decal, at most 0.01 H off the skin", value=FACE["on_body"]), az=32)
def c_on_body(ctx):
    f, e = _face(ctx), _eyes(ctx)
    host, kind = f.get("on", "torso"), f.get("kind", "decal")
    geo = [k for k in GEOMETRY_EYES if k in e or k in f]
    probs = []
    if host not in HOSTS:
        probs.append(f"the eyes sit on the {host}, not the head or torso")
    if kind != "decal":
        probs.append(f"the eyes are a {kind}, not a decal")
    if geo:
        probs.append("the file builds " + ", ".join(geo))
    off = 0.0
    st = stations(ctx)
    if st:
        V = decal(ctx)[0]
        off = float(max_off(ctx, V)) if len(V) else 0.0
        if off > FACE["on_body"]:
            probs.append(f"the decal stands {off:.3f} H off the skin, limit {FACE['on_body']}")
    bad = bool(probs)
    why = "; ".join(probs).capitalize() if probs else f"On the {host} as a decal, {off:.3f} H off the skin, limit {FACE['on_body']}"
    bars = [("Off the skin", f"{off:.3f} H", off / (FACE["on_body"] * 1.5), PR.RED if off > FACE["on_body"] else PR.SAGE, 1 / 1.5, f"limit {FACE['on_body']} H")]
    lines = [(f"Host: {host}, drawn as a {kind}", PR.RED if bad else PR.INK)]
    return verdict(ctx, "face.on-body", bad, f2(off), FACE["on_body"], why, _proof(ctx, 32, PR.RED if bad else PR.SAGE, _eye_points(ctx), _band(lines=lines, bars=bars)), dict(host=host, kind=kind, off=off))


def max_off(ctx, V):
    import facedecal as FD
    d = ctx.__dict__.setdefault("_face", {})
    if "off" not in d:
        d["off"] = FD.max_lift(_surf(ctx), V)
    return d["off"].max()


# ------------------------------------------------------------------------------------------------------------------------------------------------------ 4 face.flush
@check(id="face.flush", name="Flush eyes", fail="An eye has a rim or a bulge", stage="file", version=1, part=["head"], fields=["face.eyes.iris", "face.eyes.catch"],
       rule=R("2026-11-06 10:45", "The eyes lie flush: no sockets, no raised rims of skin, no bulges. The house mibi eye is a dark glossy disc with a thin dark rim, the iris 85% of the disc, the pupil 70% of the iris, and one highlight at the upper left about 25% of the pupil. A thin flat pale ring in coat.pale (the pale eye rim) is not a raised rim."),
       limit=dict(text="no raised rim, socket or bulge · iris 0.85 of the disc (0.80-0.90) · pupil 0.70 of the iris (0.65-0.75) · one highlight", value=None), az=0)
def c_flush(ctx):
    e = _eyes(ctx)
    probs = []
    extra_f = [k for k in FLUSH_FIELDS if k in e]
    if extra_f:
        probs.append("has " + ", ".join(extra_f))
    c = e.get("catch", [None])
    n_catch = len(c) if isinstance(c, list) else (1 if c else 0)
    if n_catch != 1:
        probs.append(f"{n_catch} highlights, one wanted")
    iris = e.get("iris") if isinstance(e.get("iris"), dict) else {}
    share, pupil = iris.get("share"), iris.get("pupil")
    if share is not None and not (FACE["iris_share"][0] - 1e-9 <= share <= FACE["iris_share"][1] + 1e-9):
        probs.append(f"iris {share:.2f} of the disc, between {FACE['iris_share'][0]:.2f} and {FACE['iris_share'][1]:.2f}")
    if pupil is not None and not (FACE["pupil_share"][0] - 1e-9 <= pupil <= FACE["pupil_share"][1] + 1e-9):
        probs.append(f"pupil {pupil:.2f} of the iris, between {FACE['pupil_share'][0]:.2f} and {FACE['pupil_share'][1]:.2f}")
    bad = bool(probs)
    why = "The eye " + "; ".join(probs) if probs else f"House eye: iris {share if share is not None else 'default'}, pupil {pupil if pupil is not None else 'default'}, one highlight, nothing raised"
    sh = float(share) if share is not None else _DC["irisShare"]
    bars = [("Iris of the disc", f"{sh:.2f}", sh / 1.0, PR.RED if not (FACE["iris_share"][0] - 1e-9 <= sh <= FACE["iris_share"][1] + 1e-9) else PR.SAGE, _DC["irisShare"], "house 0.85")]
    lines = [("Raised: " + (", ".join(extra_f) if extra_f else "nothing"), PR.RED if extra_f else PR.INK), (f"Highlights: {n_catch}", PR.RED if n_catch != 1 else PR.INK)]
    return verdict(ctx, "face.flush", bad, f2(sh), list(FACE["iris_share"]), why, _proof(ctx, 0, PR.RED if bad else PR.SAGE, _eye_points(ctx), _band(lines=lines, bars=bars)), dict(fields=extra_f, catch=n_catch))


# ------------------------------------------------------------------------------------------------------------------------------------------------------ 5 face.size
def eye_ratio(doc):
    """Eye diameter over head width at the type, or None for a plan with no head width yet."""
    from wb import clayface as CF
    if not CF.is_decal_file(doc):
        return None
    eyes, _, W = CF.quad_guess(doc)
    return 2.0 * float(doc["face"]["eyes"]["r"]) / W


def _ends(doc, name):
    for e in (doc.get("genome") or {}).get("loci", []) if isinstance(doc.get("genome"), dict) else []:
        if e.get("locus") == name:
            b = e.get("band") or e.get("absolute")
            return (float(b["lo"]), float(b["hi"])) if b else None
    return None


@check(id="face.size", name="Eye size", fail="Eyes too {size} for the head", stage="extremes", version=1, part=["head"], fields=["face.eyes.r", "genome.loci.form.eye-size", "genome.loci.form.eye-spacing"],
       rule=R("2026-11-06 10:45", "The eye's diameter is 0.12 to 0.24 of the head's width, house default 0.18, and each kind's own default comes from its stand. The genome moves it by at most 15% (never out of that band), and the type's gap by at most 15%."),
       limit=dict(text="eye diameter 0.12-0.24 of the head's width at both ends of form.eye-size · form.eye-size within 15% of the type · spacing within 15% of the type's gap", value=list(FACE["size"])), az=0)
def c_size(ctx):
    doc = _doc(ctx)
    ratio = eye_ratio(doc)
    if ratio is None:
        return _skip(ctx, "face.size", "No head width for this plan yet")
    lo, hi = _ends(doc, "form.eye-size") or (1.0, 1.0)
    ends = [("low", ratio * lo), ("type", ratio), ("high", ratio * hi)]
    out = [(n, v) for n, v in ends if not (FACE["size"][0] - 1e-9 <= v <= FACE["size"][1] + 1e-9)]
    from wb import clayface as CF
    sp = _ends(doc, "form.eye-spacing")
    gap0 = 2.0 * abs(float(CF.quad_guess(doc)[0][0][0][1]))
    gaps = []
    if sp:
        for end, off in (("close", sp[0]), ("wide", sp[1])):
            g = 2.0 * abs(float(CF.quad_guess(doc, {"eye_spacing": off})[0][0][0][1]))
            gaps.append((end, g / gap0 - 1.0))
    badgap = [(n, d) for n, d in gaps if abs(d) > FACE["spacing"] + 1e-9]
    badvar = [(n, m - 1.0) for n, m in (("low", lo), ("high", hi)) if abs(m - 1.0) > FACE["genome_var"] + 1e-9]       # the genome moves the eye by at most 15%
    bad = bool(out or badgap or badvar)
    one = lo == hi                                                          # no band on the file: the type is the only size
    where = "" if one else " at the " + "/".join(n for n, _ in out) + " end"
    probs = ([f"are {out[0][1]:.3f} of the head's width{where}, between {FACE['size'][0]} and {FACE['size'][1]}"] if one and out else
             [f"at the {n} end are {v:.3f} of the head's width, between {FACE['size'][0]} and {FACE['size'][1]}" for n, v in out]) + [f"at the {n} end sit {d * 100:+.0f}% from the type's gap, limit 15%" for n, d in badgap] + [f"the {n} end of form.eye-size moves the eye {d * 100:+.0f}% from the type, limit 15%" for n, d in badvar]
    why = ("Eyes " + "; ".join(probs)) if probs else ("Eye " + (f"type {ratio:.3f}" if one else ", ".join(f"{n} {v:.3f}" for n, v in ends)) + " of the head's width")
    worst = max(ends, key=lambda t: abs(t[1] - 0.18))[1]
    top = FACE["size"][1] * 1.4
    vs = [v for _, v in ends]
    span_txt = f"{min(vs):.3f}-{max(vs):.3f}" if max(vs) - min(vs) > 5e-4 else f"{vs[1]:.3f}"
    bars = [("Eye over head width", span_txt, worst / top, PR.RED if out or badvar else PR.SAGE, FACE["size"][1] / top, "limit 0.12-0.24")]
    lines = [("Spacing " + (", ".join(f"{n} {d * 100:+.0f}%" for n, d in gaps) + " of the gap, limit 15%" if gaps else "at the type's gap"), PR.RED if badgap else PR.INK)]
    return verdict(ctx, "face.size", bad, f2(worst), list(FACE["size"]), why, _proof(ctx, 0, PR.RED if bad else PR.SAGE, _eye_points(ctx), _band(lines=lines, bars=bars)),
                   dict(size="big" if worst > FACE["size"][1] else "small", ends=[(n, f2(v)) for n, v in ends], spacing=[(n, f2(d)) for n, d in gaps]))


# ------------------------------------------------------------------------------------------------------------------------------------------------------ 6 face.row
@check(id="face.row", name="Eye row", fail="Eyes are off their row", stage="cage", version=1, part=["head"], fields=["face.eyes.station", "face.eyes.around"],
       rule=R("2026-11-05 21:18", "Placement and spacing are the species' face. A pair of eyes is mirrored about the midline, three eyes sit in one level row, and the eyes agree to within 2% of the head's width."),
       limit=dict(text="pair mirrored about the midline, row level, within 2% of the head's width", value=FACE["row_tol"]), az=0)
def c_row(ctx):
    st = stations(ctx)
    g = guess(ctx)
    if st is None or g is None:
        return _skip(ctx, "face.row", "No eye stations in this file yet")
    W = g[2]
    eyes = sorted([s for s in st if s["kind"] == "eye"], key=lambda s: float(s["point"][1]))
    if len(eyes) < 2:
        return verdict(ctx, "face.row", len(eyes) == 0, 0.0, FACE["row_tol"], f"{len(eyes)} eye on the body: no row to judge", _proof(ctx, 0, PR.SAGE, [(s["point"], s["size"]) for s in eyes], _band()), {})
    P = np.array([s["point"] for s in eyes])
    level = float(np.ptp(P[:, 2])) / W
    mirror = max(abs(float(P[i, 1] + P[-1 - i, 1])) for i in range(len(P) // 2 + 1)) / W
    depth = max(abs(float(P[i, 0] - P[-1 - i, 0])) for i in range(len(P) // 2)) / W if len(P) > 1 else 0.0
    mid = abs(float(P[len(P) // 2, 1])) / W if len(P) % 2 else 0.0
    worst = max(level, mirror, depth, mid)
    bad = worst > FACE["row_tol"]
    why = f"Row off level by {level * 100:.1f}%, mirror off by {mirror * 100:.1f}%, front-to-back off by {depth * 100:.1f}% of the head's width, limit {FACE['row_tol'] * 100:.0f}%"
    top = FACE["row_tol"] * 3
    bars = [("Off level", f"{level * 100:.1f}% of head width", level / top, PR.RED if level > FACE["row_tol"] else PR.SAGE, 1 / 3, "limit 2%"),
            ("Off mirror", f"{max(mirror, mid) * 100:.1f}% of head width", max(mirror, mid) / top, PR.RED if max(mirror, mid) > FACE["row_tol"] else PR.SAGE, 1 / 3, "limit 2%")]
    return verdict(ctx, "face.row", bad, f2(worst), FACE["row_tol"], why, _proof(ctx, 0, PR.RED if bad else PR.SAGE, [(s["point"], s["size"]) for s in eyes], _band(bars=bars)), dict(level=level, mirror=mirror, depth=depth))


# ------------------------------------------------------------------------------------------------------------------------------------------------------ 7 face.lid
@check(id="face.lid", name="Lids", fail="A lid droops", stage="file", version=1, part=["head"], fields=["face.eyes.attitude", "face.eyes.lid", "face.eyes.frames"],
       rule=R("2026-11-05 21:18", "A quiet attitude only: content, curious, deadpan or knowing. The knowing lid closes at most 35% of the eye and its edge is straight. No sleepy, droopy or sad frames."),
       limit=dict(text="lid closes at most 35%, straight edge, no sleepy, droopy or sad frame", value=FACE["lid_max"]), az=0)
def c_lid(ctx):
    import facedecal as FD
    import species_v1 as V1
    e = _eyes(ctx)
    att = e.get("attitude", "content")
    lid = e.get("lid") if isinstance(e.get("lid"), dict) else {}
    closes = float(lid["closes"]) if "closes" in lid else FD.ATTITUDE_LID.get(att, 0.0)
    edge = lid.get("edge", "straight")
    frames = [str(x) for x in (e.get("frames") or [])]
    badf = [x for x in frames if x in BAD_FRAMES]
    probs = []
    if att not in V1.registry()["vocab"]["attitudes"]:
        probs.append(f"attitude {att!r} is not content, curious, deadpan or knowing")
    if closes > FACE["lid_max"] + 1e-9:
        probs.append(f"the lid closes {closes * 100:.0f}%, limit {FACE['lid_max'] * 100:.0f}%")
    if edge != "straight":
        probs.append(f"the lid's edge is {edge}, not straight")
    if badf:
        probs.append("frames: " + ", ".join(badf))
    bad = bool(probs)
    why = ("The eye: " + "; ".join(probs)) if probs else f"Attitude {att}, lid closes {closes * 100:.0f}% with a straight edge, limit {FACE['lid_max'] * 100:.0f}%"
    bars = [("Lid closed", f"{closes * 100:.0f}%", closes / (FACE["lid_max"] * 1.4), PR.RED if closes > FACE["lid_max"] else PR.SAGE, 1 / 1.4, "limit 35%")]
    return verdict(ctx, "face.lid", bad, f2(closes), FACE["lid_max"], why, _proof(ctx, 0, PR.RED if bad else PR.SAGE, _eye_points(ctx), _band(lines=[(f"Attitude {att}; frames {', '.join(frames) or 'none'}", PR.RED if badf else PR.INK)], bars=bars)), dict(attitude=att, closes=closes))


# ------------------------------------------------------------------------------------------------------------------------------------------------------ 8 face.mouth
@check(id="face.mouth", name="Mouth", fail="The mouth is not one small closed curve", stage="file", version=1, part=["head"], fields=["face.mouth"],
       rule=R("2026-11-05 21:18", "One small curved smile: closed at rest, one curve, no wide frog mouth and no cat's 'w'. The mouth is at most 0.6 of the span between the eyes."),
       limit=dict(text="one curve, closed at rest, width at most 0.6 of the eye span", value=FACE["mouth_span"]), az=0)
def c_mouth(ctx):
    m = _mouth(ctx)
    if not m:
        return _skip(ctx, "face.mouth", "No mouth in this file yet")
    shape, rest = str(m.get("shape", "curve")), str(m.get("rest", "closed"))
    g = guess(ctx)
    span = 2.0 * abs(float(g[0][0][0][1])) if g and len(g[0]) >= 2 else None
    w = float(m.get("width", 0.0))
    probs = []
    if shape in BAD_MOUTH or shape != "curve":
        probs.append(f"the shape is {shape}, not one curve")
    if rest != "closed" or m.get("open"):
        probs.append(f"the mouth is {rest} at rest")
    if span and w > FACE["mouth_span"] * span + 1e-9:
        probs.append(f"width {w:.2f} H is {w / span:.2f} of the eye span, limit {FACE['mouth_span']}")
    bad = bool(probs)
    why = ("The mouth: " + "; ".join(probs)) if probs else f"One curve, closed, width {w:.2f} H" + (f" = {w / span:.2f} of the eye span, limit {FACE['mouth_span']}" if span else "")
    frac = w / span if span else 0.0
    mp = _mouth_point(ctx)
    bars = [("Mouth over eye span", f"{frac:.2f}", frac / (FACE["mouth_span"] * 1.5), PR.RED if span and frac > FACE["mouth_span"] else PR.SAGE, 1 / 1.5, "limit 0.60")]
    return verdict(ctx, "face.mouth", bad, f2(frac), FACE["mouth_span"], why, _proof(ctx, 0, PR.RED if bad else PR.SAGE, [(mp[0], max(mp[1] * 0.7, 0.06))] if mp else [], _band(lines=[(f"Shape {shape}, {rest} at rest", PR.RED if shape != "curve" or rest != "closed" else PR.INK)], bars=bars)),
                   dict(shape=shape, rest=rest, width=w, span=span))


# ------------------------------------------------------------------------------------------------------------------------------------------------------ 9 face.clear
def _find(d, path=""):
    out = []
    if isinstance(d, dict):
        for k, v in d.items():
            if str(k).lower() in CLEAR_KEYS:
                out.append(path + str(k))
            out += _find(v, path + str(k) + ".")
    elif isinstance(d, list):
        for i, v in enumerate(d):
            out += _find(v, path)
    return out


@check(id="face.clear", name="Clear face", fail="The face has a {thing}", stage="file", version=1, part=["head"], fields=["face"],
       rule=R("2026-11-05 21:18", "Light, not heavy: no muzzle, pet nose, lips, teeth, brows, whiskers or fangs, and no blush, no nostril dots. The face is two eyes and one small mouth."),
       limit=dict(text="no cheeks, blush, nostrils, nose, muzzle, lips, teeth, brows, whiskers or fangs", value=0), az=0)
def c_clear(ctx):
    found = _find(_face(ctx), "face.")
    zones = (_doc(ctx).get("coat") or {}).get("zones")
    if isinstance(zones, dict):
        found += ["coat.zones." + z for z in zones if any(t in str(z).lower() for t in ("muzzle", "blush", "nostril", "nose"))]
    bad = bool(found)
    thing = "blush" if any(k.endswith("cheeks") or k.endswith("blush") or k.endswith("cheek") for k in found) else (found[0].split(".")[-1] if found else "")
    why = ("Found " + ", ".join(found)) if found else "Two eyes and a mouth, nothing else"
    st = stations(ctx) if isinstance(ctx.mesh, dict) else None
    marks = [(s["point"], s["size"]) for s in (st or []) if s["kind"] == "cheek"] or _eye_points(ctx)
    return verdict(ctx, "face.clear", bad, len(found), 0, why, _proof(ctx, 0, PR.RED if bad else PR.SAGE, marks, _band(lines=[("Found: " + (", ".join(found) if found else "nothing"), PR.RED if bad else PR.INK)])), dict(found=found, thing=thing))


# ------------------------------------------------------------------------------------------------------------------------------------------------------ 10 face.iris
def _oklab_L(rgb):
    c = np.asarray(rgb, float)
    c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    l, m, s = np.cbrt(np.array([0.4122214708, 0.5363325363, 0.0514459929]) @ c), np.cbrt(np.array([0.2119034982, 0.6806995451, 0.1073969566]) @ c), np.cbrt(np.array([0.0883024619, 0.2817188376, 0.6299787005]) @ c)
    return float(0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s)


ZONES = {"S01": ("cream ring", "#DFD2AE"),          # a kind whose eyes sit in a fixed pale ring: the ring is the face zone the pupil is judged in (Loika's cream)
         "S17": ("own colour (marigold)", "#E8B83F"), "S18": ("own colour (periwinkle)", "#8B7DD8"), "S19": ("own colour (lagoon)", "#269FA5")}          # a kind with its own body colour (its coat.land record): that colour is the zone


def _oklab_L_hex(h):
    h = h.lstrip("#")
    return _oklab_L([int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)])


def iris_judgement(kind_id, colour, land_id):
    """The signed iris rule for one kind and colour: the iris against the pupil, and the pupil against the face zone (the kind's body colour, or its fixed ring), each at least 0.30 L in OKLab.
    A kind that carries the pale eye rim passes the second through the rim. Returns a dict, or None when the kind has no land to read a body colour from."""
    import species_v1 as V1
    eye = V1.registry()["eye"]
    land = next((l for l in V1.registry()["lands"] if l["id"] == land_id), None)
    k = V1.registry_kind(kind_id) or {}
    if land is None and kind_id not in ZONES:
        return None
    pupil = _oklab_L_hex(eye["pupilHex"])
    iris = _oklab_L_hex(eye["irisSwatch"].get(colour, eye["irisSwatch"]["hazel"]))
    if kind_id in ZONES:
        zone_name, zone_L = ZONES[kind_id][0], _oklab_L_hex(ZONES[kind_id][1])
    else:
        zone_name, zone_L = land["body"]["name"], float(land["body"]["oklch"]["L"])
    rim = bool((k.get("eyes") or {}).get("paleRim"))
    rim_L = float(eye["paleRim"]["L"])
    d_iris, d_zone, d_rim = abs(iris - pupil), abs(zone_L - pupil), abs(rim_L - pupil)
    zone_ok = d_zone >= FACE["iris_pupil_dl"] - 1e-9 or (rim and d_rim >= FACE["iris_pupil_dl"] - 1e-9)
    return dict(kind=kind_id, colour=colour, iris_L=iris, pupil_L=pupil, zone=zone_name, zone_L=zone_L, d_iris=d_iris, d_zone=d_zone, rim=rim, d_rim=d_rim if rim else None,
                iris_ok=d_iris >= FACE["iris_pupil_dl"] - 1e-9, zone_ok=zone_ok, ok=(d_iris >= FACE["iris_pupil_dl"] - 1e-9) and zone_ok)


@check(id="face.iris", name="Iris colour", fail="Iris or pupil too close to what is behind it", stage="coat", version=2, part=["head"], fields=["face.eyes.iris.colour", "land"],
       rule=R("2026-11-06 16:20", "The iris colour varies, and it always reads: the iris is at least 0.30 lighter or darker than the pupil, and the pupil at least 0.30 from the face zone it sits in (the kind's body colour, or Loika's cream ring); a kind with the pale eye rim passes the second through its rim."),
       limit=dict(text="iris against pupil, and pupil against the face zone, each at least 0.30 in lightness (OKLab L)", value=FACE["iris_pupil_dl"]), az=0)
def c_iris(ctx):
    doc = _doc(ctx)
    name = (_eyes(ctx).get("iris") or {}).get("colour", "hazel")
    j = iris_judgement(doc.get("id"), name, doc.get("land"))
    if j is None:
        return _skip(ctx, "face.iris", "No land yet: the iris is judged against the body when the kind is set in one")
    bad = not j["ok"]
    worst = min(j["d_iris"], j["d_zone"] if not (j["rim"] and j["zone_ok"]) else max(j["d_zone"], j["d_rim"]))
    through = " (through the pale rim)" if j["rim"] and j["d_zone"] < FACE["iris_pupil_dl"] - 1e-9 and j["zone_ok"] else ""
    why = f"{name.capitalize()} iris L {j['iris_L']:.2f} against pupil {j['pupil_L']:.2f}: {j['d_iris']:.2f}; pupil against {j['zone']} L {j['zone_L']:.2f}: {j['d_zone']:.2f}{through}; limit {FACE['iris_pupil_dl']}"
    bars = [("Iris against pupil", f"{j['d_iris']:.2f} L", j["d_iris"] / (FACE["iris_pupil_dl"] * 2), PR.RED if not j["iris_ok"] else PR.SAGE, 0.5, "at least 0.30"),
            ("Pupil against face zone", f"{j['d_zone']:.2f} L", j["d_zone"] / (FACE["iris_pupil_dl"] * 2), PR.RED if not j["zone_ok"] else PR.SAGE, 0.5, "at least 0.30")]
    return verdict(ctx, "face.iris", bad, f2(worst), FACE["iris_pupil_dl"], why, _proof(ctx, 0, PR.RED if bad else PR.SAGE, _eye_points(ctx), _band(bars=bars)), dict(iris_L=j["iris_L"], zone_L=j["zone_L"], judgement=j))
