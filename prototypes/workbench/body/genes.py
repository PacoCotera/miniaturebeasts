"""Genes (body-spec s1.3): a t-vector -> creature.json (every number resolved, no genes left). t in [0, 1] per locus inside the species' sub-band; t = 0.5 is the type specimen, exactly (m = 1, o = 0).
Anchors (owner, 1 Nov): for Loika the COAT and the CROWN are the wide ones; body and face loci are tight bands. The python stub of the Node resolver (the team moves it to Node tomorrow; the test is the same creature.json bytes)."""
import copy, hashlib, json, math
import numpy as np

# locus: (kind, lo, hi, anchor)   mult: m = lo^((0.5 - t) / 0.5) for t <= 0.5 else hi^((t - 0.5) / 0.5);   off: o = lo + (hi - lo) t with lo = -hi (0 at t = 0.5)
GENES = {
    "body.limb-length": ("mult", 0.96, 1.04, "body"),
    "body.limb-girth": ("mult", 0.96, 1.04, "body"),
    "body.torso-length": ("mult", 0.97, 1.03, "body"),
    "body.torso-girth": ("mult", 0.97, 1.04, "body"),
    "growth.exterior-eye-size-ratio": ("mult", 0.94, 1.08, "face"),
    "growth.exterior-eye-height-ratio": ("off", -0.02, 0.02, "face"),
    "face.mouth-width": ("mult", 0.94, 1.08, "face"),
    "face.mouth-height": ("off", -0.02, 0.02, "face"),
    "movement.cycle-rate": ("mult", 0.85, 1.15, "face"),
    "body.crown-length": ("mult", 0.80, 1.30, "crown"),
    "body.crown-width": ("mult", 0.85, 1.25, "crown"),
    "body.crown-spread": ("off", -15.0, 15.0, "crown"),
    "body.crown-curl": ("curl", 0.0, 1.0, "crown"),
    "body.crown-lean": ("off", -12.0, 12.0, "crown"),
    "appearance.coat-value": ("mult", 0.80, 1.30, "coat"),
    "skin.grain": ("lin", 0.35, 0.50, "coat"),
    "skin.sheen": ("lin", 0.15, 0.30, "coat"),
    "appearance.bib-reach": ("off", -0.30, 0.25, "coat"),
    "appearance.socks": ("sock", 0.0, 0.34, "coat"),
}
PALETTES = ["charcoal", "russet", "ash"]
FAMILIES = [("fan", 3), ("fan", 4), ("fan", 5), ("sprout", 3), ("bud", 3)]


def resolve_locus(name, t):
    kind, lo, hi, _ = GENES[name]
    if kind == "mult":
        return lo ** ((0.5 - t) / 0.5) if t <= 0.5 else hi ** ((t - 0.5) / 0.5)
    if kind == "off":
        return lo + (hi - lo) * t if lo < 0 else lo + (hi - lo) * t
    if kind == "curl":
        return 0.4 * t if t <= 0.5 else 0.2 + 1.6 * (t - 0.5)          # 0.2 (today's Loika) at t = 0.5, 0 to 1 over the band
    if kind == "lin":
        return lo + (hi - lo) * t
    if kind == "sock":
        return 0.0 if t < 0.5 else lo + (hi - lo) * (t - 0.5) / 0.5       # socks only on the upper half of the gene
    raise KeyError(kind)


def specimen():
    return dict(t={k: 0.5 for k in GENES}, palette="charcoal", family="fan", count=3, seed=41713)


def draw(i, seed0=2026):
    """Individual i of the variety sheet: 1 is the type specimen; the rest vary the COAT and the CROWN across their bands and the body/face loci inside tight draws."""
    if i == 1:
        return specimen()
    rng = np.random.Generator(np.random.PCG64([seed0, i]))
    t = {}
    for k, (kind, lo, hi, anchor) in GENES.items():
        if anchor in ("coat", "crown"):
            t[k] = float(np.round(rng.random(), 3))
        else:
            t[k] = float(np.round(0.5 + (rng.random() - 0.5) * 0.7, 3))
    fam, cnt = FAMILIES[(i - 2) % len(FAMILIES)]
    return dict(t=t, palette=PALETTES[(i - 1) % 3], family=fam, count=cnt, seed=41713 + 97 * i)


def creature(ind):
    """creature.json: the resolved numbers (canonical: sorted keys, 1e-6 rounding)."""
    v = {k: resolve_locus(k, ind["t"][k]) for k in GENES}
    c = dict(schema="mb-creature/1", species="S01", house="fix9",
             body=dict(limb_length=v["body.limb-length"], limb_girth=v["body.limb-girth"], torso_length=v["body.torso-length"], torso_girth=v["body.torso-girth"]),
             face=dict(eye_size=v["growth.exterior-eye-size-ratio"], eye_height=v["growth.exterior-eye-height-ratio"], mouth_width=v["face.mouth-width"], mouth_z=v["face.mouth-height"]),
             crown=dict(family=ind["family"], count=ind["count"], length=1.1 * v["body.crown-length"], width=1.1 * v["body.crown-width"], spread=v["body.crown-spread"], curl=v["body.crown-curl"], lean=math.radians(v["body.crown-lean"]) * 0.9, seed=ind["seed"]),
             palette=ind["palette"], coat_value=v["appearance.coat-value"],
             zones=dict(bib_reach=v["appearance.bib-reach"], socks=v["appearance.socks"]),
             material=dict(grain=v["skin.grain"], sheen=v["skin.sheen"], roughness=0.66), motion=dict(speed=v["movement.cycle-rate"], walk_period=1.0 / v["movement.cycle-rate"]),
             genes={k: ind["t"][k] for k in sorted(GENES)})
    return canon(c)


def canon(o):
    if isinstance(o, float):
        return round(o, 6)
    if isinstance(o, dict):
        return {k: canon(o[k]) for k in sorted(o)}
    if isinstance(o, list):
        return [canon(x) for x in o]
    return o


def dumps(c):
    return json.dumps(c, sort_keys=True, separators=(",", ":"), ensure_ascii=True)


def digest(c):
    return "S01-" + hashlib.sha256(dumps(c).encode()).hexdigest()[:8]


def apply_to_spec(raw, c):
    """The raw species dict with the body genes applied (before forward kinematics): lengths and girths of the limbs below the mass; the torso's x (about the head, which stays) and girth."""
    s = copy.deepcopy(raw)
    b = c["body"]
    for nm in ("fore.L", "hind.L"):
        js = s["parts"][nm]["joints"]
        for j in js[1:]:
            j["len"] *= b["limb_length"]
            j["r"] = [x * b["limb_girth"] for x in j["r"]]
        js[0]["at"][0] *= b["torso_length"]
    t = s["parts"]["torso"]
    f = b["torso_length"]
    t["rings_x"] = [x * f for x in t["rings_x"]]
    t["section"]["stations"] = [[st[0] * f, st[1]] for st in t["section"]["stations"]]
    for m in t["masses"]:
        m["x"] *= f
    for q in t["path"]["joints"]:
        q["at"][0] *= f
    g = b["torso_girth"]
    for st in t["section"]["stations"]:
        if st[0] < -0.0 and abs(st[1][0]) > 0.06:
            st[1] = [x * g for x in st[1]]
    for m in t["masses"]:
        m["rho"] *= g
    return s


def palette_of(c):
    from skin import PALETTES as P
    base = dict(P[c["palette"]])
    v = c["coat_value"]
    base["coat"] = tuple(int(round(min(255, x * v))) for x in base["coat"])
    return base
