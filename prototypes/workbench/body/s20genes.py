"""S20 shape genes applied to the raw species dict before forward kinematics (chunk 3 uses them for the ear and tail strips; chunk 7 adds the gene table and the individuals).
Conventions follow the design's concept.mjs: a factor of 1 and an offset of 0 are the type specimen exactly. The tail's added curl is clipped by the room rule (tube.clip_curl logic on the added curl only): the curl is shrunk, never the radius, and the clip is logged in parts.tail.clip."""
import copy
import numpy as np
import paths as PA

DEFAULT = dict(torsoGirth=1.0, headSize=1.0, legLen=1.0, legGirth=1.0, ear="prick", earLen=1.0, earGirth=1.0, splay=0.0, droop=0.0,
               tailLen=1.0, tailGirth=1.0, curl=0.0, lift=0.0, tip="lantern", tipSize=1.0)


def _tail_ok(joints, fillet):
    P = PA.fk(joints[0]["at"], joints)
    _, rep = PA.fillet_path(P, [j["r"] for j in joints], fillet)
    return all(r["ok"] for r in rep)


def apply_shape(raw, g=None):
    g = {**DEFAULT, **(g or {})}
    r = copy.deepcopy(raw)
    t = r["parts"]["torso"]
    t["section"]["stations"] = [[z, [v * (g["headSize"] if z > t["regions"]["body"][1] else g["torsoGirth"]) if v > 0.05 else v for v in ax]] for z, ax in t["section"]["stations"]]
    for m in t["masses"]:
        m["rho"] *= g["headSize"] if m["z"] > t["regions"]["body"][1] else g["torsoGirth"]
    ear = r["parts"]["ear.L"]
    ear["default"] = g["ear"]
    fam = ear["families"][g["ear"]]
    if not fam.get("sit"):
        fam["plane"]["yaw"] += g["splay"]
        for k, j in enumerate(fam["joints"]):
            if k > 0:
                j["len"] *= g["earLen"]
                j["pitch"] -= g["droop"]
            j["r"] = [v * g["earGirth"] for v in j["r"]]
    else:
        for tb in fam["tubes"]:
            tb["len"] = min(0.35, tb["len"] * g["earLen"]); tb["yaw"] += g["splay"]
    tail = r["parts"]["tail"]
    js = tail["joints"]
    base = [j.get("pitch", 0.0) for j in js]
    for k, j in enumerate(js):
        j["r"] = [v * g["tailGirth"] for v in j["r"]]
        if k > 0:
            j["len"] *= g["tailLen"]
    f = 1.0
    for _ in range(300):
        for k, j in enumerate(js):
            if k > 0:
                j["pitch"] = base[k] - g["lift"] - f * g["curl"] * 360.0 * (k - 1) / 5
        if g["curl"] <= 0 or _tail_ok(js, tail["fillet"]):
            break
        f *= 0.985
    tail["clip"] = dict(requested=g["curl"], applied=g["curl"] * f, factor=f)
    leg = r["parts"]["leg.L"]
    for j in leg["joints"][1:]:
        j["len"] *= g["legLen"]
        j["r"] = [v * g["legGirth"] for v in j["r"]]
    r["_genes"] = g
    return r


# ======================================================================== the gene table and the individuals (chunk 7)
import hashlib, json
import numpy as np

# locus: (kind, lo, hi, anchor)   mult: type 1 at t = 0.5, lo ** ((0.5 - t) / 0.5) below, hi ** ((t - 0.5) / 0.5) above;
#                                  off:  type 0 at t = 0.5, lo * (0.5 - t) / 0.5 below, hi * (t - 0.5) / 0.5 above (the band need not be symmetric);   lin: lo + (hi - lo) t;   int: round of lin
GENES = {
    "body.torso-girth": ("mult", 0.95, 1.06, "body"), "body.head-size": ("mult", 0.96, 1.05, "body"), "body.limb-length": ("mult", 0.9, 1.1, "body"), "body.limb-girth": ("mult", 0.94, 1.08, "body"),
    "growth.exterior-eye-size-ratio": ("mult", 0.92, 1.1, "face"), "growth.exterior-eye-height-ratio": ("off", -0.03, 0.03, "face"), "growth.exterior-eye-spacing-ratio": ("off", -0.03, 0.03, "face"),
    "face.mouth-width": ("mult", 0.9, 1.12, "face"), "face.mouth-height": ("off", -0.02, 0.02, "face"), "movement.cycle-rate": ("mult", 0.85, 1.15, "face"),
    "body.ear-length": ("mult", 0.7, 1.5, "ears"), "body.ear-girth": ("mult", 0.85, 1.2, "ears"), "body.ear-splay": ("off", -20.0, 20.0, "ears"), "body.ear-droop": ("off", -15.0, 15.0, "ears"),
    "body.tail-length": ("mult", 0.7, 1.6, "tail"), "body.tail-girth": ("mult", 0.8, 1.3, "tail"), "body.tail-curl": ("off", -0.15, 0.45, "tail"), "body.tail-lift": ("off", -20.0, 20.0, "tail"), "body.tip-size": ("mult", 0.8, 1.3, "tail"),
    "appearance.coat-value": ("mult", 0.8, 1.2, "coat"), "appearance.bib-reach": ("off", -0.1, 0.12, "coat"), "appearance.glow": ("lin", 0.6, 1.0, "coat"), "skin.grain": ("lin", 0.25, 0.45, "coat"), "skin.sheen": ("lin", 0.2, 0.4, "coat"),
    # the coat's own genes (the owner's steer: the coat is where Tuliko becomes itself)
    "coat.gradient": ("lin", 0.1, 0.5, "coat"), "coat.hue-shift": ("off", -0.06, 0.06, "coat"), "coat.fleck": ("lin", 0.2, 0.8, "coat"), "coat.freckle-density": ("lin", 0.1, 1.0, "coat"),
    "coat.freckle-glow": ("lin", 0.5, 1.0, "coat"), "coat.bleed": ("lin", 0.3, 0.9, "coat"), "coat.rd-scale": ("lin", 0.8, 1.3, "coat"), "coat.rd-contrast": ("lin", 0.35, 0.7, "coat"),
    "coat.rosette": ("lin", 0.0, 1.0, "coat"), "coat.bands": ("int", 3, 7, "coat"), "coat.mark-size": ("lin", 0.07, 0.12, "coat"),
}
# pair-map loci: alleles with draw weights, and the dominance order the phenotype follows (the first dominant allele of the pair shows)
PAIRS = {
    "body.ear-family": (["prick", "lop", "nub"], [0.4, 0.3, 0.3], ["prick", "nub", "lop"]),                       # frond is cut
    "body.tail-tip": (["lantern", "tuft", "plain"], [0.62, 0.22, 0.16], ["lantern", "tuft", "plain"]),           # lantern dominant in the cross: most Tulikos glow (owner's answer)
    "appearance.body-palette": (["dusk", "lagoon", "ember"], [1 / 3, 1 / 3, 1 / 3], ["dusk", "lagoon", "ember"]),
    "appearance.marking-layout": (["plain", "masked", "points", "banded", "spotted", "capped"], [0.25, 0.15, 0.15, 0.15, 0.15, 0.15], ["plain", "masked", "points", "banded", "spotted", "capped"]),
    "coat.rd": (["none", "spots", "labyrinth", "rings"], [0.4, 0.25, 0.2, 0.15], ["none", "spots", "labyrinth", "rings"]),
    "coat.mark": (["none", "heart", "star"], [0.5, 0.25, 0.25], ["none", "heart", "star"]),
    "coat.mark-where": (["forehead", "cheek", "belly"], [0.5, 0.3, 0.2], ["forehead", "cheek", "belly"]),
}
SWITCHES = {"face.blush": 0.8, "coat.brow": 0.25}
TYPE_PAIRS = {"body.ear-family": "prick", "body.tail-tip": "lantern", "appearance.body-palette": "dusk", "appearance.marking-layout": "plain", "coat.rd": "none", "coat.mark": "none", "coat.mark-where": "forehead"}
TYPE_COAT_T = {"coat.gradient": 0.5, "coat.fleck": 0.5, "coat.freckle-density": 0.5, "coat.freckle-glow": 0.8, "coat.bleed": 0.5}      # the type specimen's modest coat (t of each lin locus)


def resolve_locus(name, t):
    kind, lo, hi, _ = GENES[name]
    if kind == "mult":
        return lo ** ((0.5 - t) / 0.5) if t <= 0.5 else hi ** ((t - 0.5) / 0.5)
    if kind == "off":
        return lo * (0.5 - t) / 0.5 if t <= 0.5 else hi * (t - 0.5) / 0.5
    if kind == "lin":
        return lo + (hi - lo) * t
    if kind == "int":
        return int(round(lo + (hi - lo) * t))
    raise KeyError(kind)


def specimen():
    t = {k: 0.5 for k in GENES}
    t.update(TYPE_COAT_T)
    t["appearance.glow"] = 0.8
    t["skin.grain"] = 0.5; t["skin.sheen"] = 0.5
    t["coat.bands"] = 0.5; t["coat.mark-size"] = 0.5; t["coat.rd-scale"] = 0.5; t["coat.rd-contrast"] = 0.5; t["coat.rosette"] = 0.0
    return dict(t=t, pairs={k: [v, v] for k, v in TYPE_PAIRS.items()}, switches=dict(blush=True, brow=False), seed=20)


def draw(i, seed0=2026):
    """Individual i of the variety sheet: 1 is the type specimen; the rest draw every locus (body and face inside tight bands, ears, tail and coat across theirs) and the alleles from the weights above."""
    if i == 1:
        return specimen()
    rng = np.random.Generator(np.random.PCG64([seed0, i]))
    t = {}
    for k, (kind, lo, hi, anchor) in GENES.items():
        if anchor in ("body", "face"):
            t[k] = float(np.round(0.5 + (rng.random() - 0.5) * 0.7, 3))
        else:
            t[k] = float(np.round(rng.random(), 3))
    pairs = {}
    for k, (al, w, dom) in PAIRS.items():
        pairs[k] = [str(rng.choice(al, p=w)), str(rng.choice(al, p=w))]
    sw = dict(blush=bool(rng.random() < SWITCHES["face.blush"]), brow=bool(rng.random() < SWITCHES["coat.brow"]))
    return dict(t=t, pairs=pairs, switches=sw, seed=int(rng.integers(1, 10 ** 6)))


def phenotype(pair_name, pair):
    al, w, dom = PAIRS[pair_name]
    return min(pair, key=lambda a: dom.index(a))


def creature(ind):
    """creature.json: every number resolved, no genes left but the record of them (canonical: sorted keys, 1e-6 rounding)."""
    v = {k: resolve_locus(k, ind["t"][k]) for k in GENES}
    ph = {k: phenotype(k, ind["pairs"][k]) for k in PAIRS}
    c = dict(schema="mb-creature/1", species="S20",
             shape=dict(torsoGirth=v["body.torso-girth"], headSize=v["body.head-size"], legLen=v["body.limb-length"], legGirth=v["body.limb-girth"], ear=ph["body.ear-family"], earLen=v["body.ear-length"],
                        earGirth=v["body.ear-girth"], splay=v["body.ear-splay"], droop=v["body.ear-droop"], tailLen=v["body.tail-length"], tailGirth=v["body.tail-girth"], curl=v["body.tail-curl"],
                        lift=v["body.tail-lift"], tip=ph["body.tail-tip"], tipSize=v["body.tip-size"]),
             coat=dict(palette=ph["appearance.body-palette"], layout=ph["appearance.marking-layout"], coat_value=v["appearance.coat-value"], belly_reach=v["appearance.bib-reach"], glow=v["appearance.glow"],
                       grain=v["skin.grain"], sheen=v["skin.sheen"], gradient=v["coat.gradient"], hue_shift=v["coat.hue-shift"], fleck=v["coat.fleck"], freckle_density=v["coat.freckle-density"],
                       freckle_glow=v["coat.freckle-glow"], bleed=v["coat.bleed"], rd=ph["coat.rd"], rd_scale=v["coat.rd-scale"], rd_contrast=v["coat.rd-contrast"], rosette=v["coat.rosette"] if ph["appearance.marking-layout"] == "spotted" else 0.0,
                       bands=v["coat.bands"], brow=1.0 if ind["switches"]["brow"] else 0.0, mark=ph["coat.mark"], mark_where=ph["coat.mark-where"], mark_size=v["coat.mark-size"], blush=bool(ind["switches"]["blush"]),
                       eye_size=v["growth.exterior-eye-size-ratio"], eye_height=v["growth.exterior-eye-height-ratio"], eye_spacing=v["growth.exterior-eye-spacing-ratio"], mouth_width=v["face.mouth-width"],
                       mouth_z=v["face.mouth-height"], seed=int(ind["seed"])),
             motion=dict(speed=v["movement.cycle-rate"], walk_period=0.9 / v["movement.cycle-rate"]),
             genes=dict(t={k: ind["t"][k] for k in sorted(ind["t"])}, pairs={k: ind["pairs"][k] for k in sorted(ind["pairs"])}, switches=ind["switches"]),
             notes=dict(torso_length="the body-height gene is not applied (it would move every ring and socket); the type's 1.0 is kept", frond="the frond ear family and the cowlick are not built"))
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
    return "S20-" + hashlib.sha256(dumps(c).encode()).hexdigest()[:8]


def build_individual(raw, c, upto="base"):
    """Body of one creature from its creature.json (the species raw dict, the shape genes applied, the loft/legs/tubes/sitting builders)."""
    import schema as SC, s20build
    spec, _ = SC.load(raw=apply_shape(raw, c["shape"]))
    return s20build.make_s20(spec, upto=upto, ear=c["shape"]["ear"], tip=c["shape"]["tip"], tip_size=c["shape"]["tipSize"])
