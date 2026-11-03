"""S20 shape genes applied to the raw species dict before forward kinematics (chunk 3 uses them for the ear and tail strips; chunk 7 adds the gene table and the individuals).
Conventions follow the design's concept.mjs: a factor of 1 and an offset of 0 are the type specimen exactly. The tail's added curl is clipped by the room rule (tube.clip_curl logic on the added curl only): the curl is shrunk, never the radius, and the clip is logged in parts.tail.clip."""
import copy
import numpy as np
import paths as PA

DEFAULT = dict(torsoGirth=1.0, headSize=1.0, legLen=1.0, legGirth=1.0, ear="prick", earLen=1.0, earGirth=1.0, splay=0.0, droop=0.0,
               tailLen=1.0, tailGirth=1.0, curl=0.0, lift=0.0, tip="lantern", tipSize=1.0)


def _tail_ok(joints, fillet, stations=None, margin=0.32):
    """The room rule (every fillet fits its segments) and, when the body's stations are given, the clearance: the curled tail stays `margin` H behind the body's back wall (beyond the first 0.5 H from its root: that stretch IS the body)."""
    P = PA.fk(joints[0]["at"], joints)
    pts, rep = PA.fillet_path(P, [j["r"] for j in joints], fillet)
    if not all(r["ok"] for r in rep):
        return False
    if stations is not None:
        zs = np.array([a[0] for a in stations]); back = np.array([a[1][0] for a in stations])
        s = PA.arclen(pts)
        rad = PA.mono_cubic(PA.arclen(P), [j["r"][0] for j in joints], s)
        xb = PA.mono_cubic(zs, back, np.clip(pts[:, 2], zs[0], zs[-1]))
        far = (s > 0.5) & (pts[:, 2] > 0.8)                 # the tail's rising curl (its root stretch IS the body)
        if far.any() and ((-pts[far, 0] - rad[far]) - xb[far] < margin).any():
            return False
    return True


def apply_shape(raw, g=None):
    g = {**DEFAULT, **(g or {})}
    g["curl"] = max(g["curl"], -0.03)          # the crook cannot open further than this (an open sweep folds the seat-to-tail seam together with a lift: logged in the sheet)
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
    nj = len(js)
    for k, j in enumerate(js):
        # the girth genes reshape the taper profile, not a uniform tube: the root (fixed by the socket it flows out of) takes 35 % of the change, the stalk under the lantern all of it
        gk = 1.0 + (g["tailGirth"] - 1.0) * (0.35 + 0.65 * k / max(nj - 1, 1))
        j["r"] = [v * gk for v in j["r"]]
        if 1 < k < nj - 1:
            j["len"] *= g["tailLen"]            # the first segment (the root, fixed by the socket) keeps its length; the stem and the hook scale; the last segment holds the hanging bulb and keeps its length
    base_len0 = None
    # the crook (pass 2): the stem rises behind the back, the hook turns away from the body and the bulb hangs. The curl gene opens or tightens the hook: it scales the hook's two bends' segment lengths (1 + 2.5 curl); lift tilts the whole tail.
    # The room rule (every fillet fits its segments) and the clearance from the back wall clip it; the clip is logged.
    hook = [k for k in range(len(js)) if k in (4, 5)]
    base_len = [j.get("len", 0.0) for j in js]
    f = 1.0
    for _ in range(300):
        for k, j in enumerate(js):
            if k > 0:
                j["pitch"] = base[k] - (g["lift"] if k > 1 else 0.0)                 # V4: the lift turns the tail from its second segment on (spine.tail.segments[1:].pitch in the file), so the root does not turn under the seat
            if k in hook:
                j["len"] = base_len[k] * (1.0 + 2.5 * f * g["curl"])
        if g["curl"] == 0 or _tail_ok(js, tail["fillet"], t["section"]["stations"] if g["curl"] > 0 else None, margin=0.08):
            break
        f *= 0.985
    # the room rule for any gene: a fillet's tangent length must fit in half of each neighbouring segment (the last segments in full): a segment is never shorter than its fillets need (the radius is never shrunk); the lengthening is logged
    P_ = PA.fk(js[0]["at"], js)
    _, rep_ = PA.fillet_path(P_, [j["r"] for j in js], tail["fillet"])
    need = [0.0] * len(js)
    for r_ in rep_:
        k_ = r_["joint"]
        t_ = r_["tangent"]
        need[k_] = max(need[k_], t_ / (1.0 if k_ == 1 else 0.5) + 0.004)            # the segment k ends at joint k
        need[k_ + 1] = max(need[k_ + 1], t_ / (1.0 if k_ + 1 == len(js) - 1 else 0.5) + 0.004)
    lengthened = 0.0
    for k_ in range(1, len(js)):
        if js[k_]["len"] < need[k_] - 1e-9:
            lengthened += need[k_] - js[k_]["len"]
            js[k_]["len"] = need[k_] + 1e-4
    tail["room_fix"] = dict(lengthened=lengthened)
    tail["clip"] = dict(requested=g["curl"], applied=g["curl"] * f, factor=f)
    leg = r["parts"]["leg.L"]
    for j in leg["joints"][1:]:
        j["len"] *= g["legLen"]
        j["r"] = [v * g["legGirth"] for v in j["r"]]
    r["_genes"] = g
    return r


# ======================================================================== the generic apply (chunk 7): a gene moves typed paths of the v1 file
SHAPE_KEY = {"form.torso-girth": "torsoGirth", "form.head": "headSize", "form.leg-length": "legLen", "form.leg-girth": "legGirth", "form.ear-kind": "ear", "form.ear-length": "earLen", "form.ear-width": "earGirth",
             "form.ear-splay": "splay", "form.ear-droop": "droop", "form.tail-length": "tailLen", "form.tail-girth": "tailGirth", "form.tail-curl": "curl", "form.tail-carry": "lift"}
COAT_KEY = {"form.eye-size": "eye_size", "form.eye-height": "eye_height", "form.eye-spacing": "eye_spacing", "form.mouth-width": "mouth_width", "form.mouth-height": "mouth_z"}


def apply_genes(doc, g, coat=None):
    """The cage builder's file (today's S20.json shape) from the v1 file `doc` with the genes at the shape values `g` (what `apply_shape` takes) applied by their typed moves.
    The framework rules that follow the moves are the same as apply_shape's: the crook cannot open past -0.03 turns, the tail's curl is clipped by the room rule (looped), a segment is lengthened where its fillets need room, the clip is logged."""
    import genomeapply as GA, species_v1 as V1
    genome = doc["genome"]
    g = {**DEFAULT, **(g or {})}
    g["curl"] = max(g["curl"], -0.03)
    values = {loc: g[k] for loc, k in SHAPE_KEY.items()}
    for loc, k in COAT_KEY.items():
        if coat and k in coat:
            values[loc] = coat[k]
    base = GA.apply_values(doc, genome, values, skip=("form.tail-curl",))
    curl_e = GA.by_locus(genome).get("form.tail-curl")
    f = 1.0
    for _ in range(300):
        d = copy.deepcopy(base)
        if curl_e and g["curl"] != 0:
            GA.apply_locus(d, curl_e, g["curl"] * f)
        r = V1.to_internal(d, check=False)
        tail = r["parts"]["tail"]
        t = r["parts"]["torso"]
        if g["curl"] == 0 or _tail_ok(tail["joints"], tail["fillet"], t["section"]["stations"] if g["curl"] > 0 else None, margin=0.08):
            break
        f *= 0.985
    js = tail["joints"]
    P_ = PA.fk(js[0]["at"], js)
    _, rep_ = PA.fillet_path(P_, [j["r"] for j in js], tail["fillet"])
    need = [0.0] * len(js)
    for r_ in rep_:
        k_ = r_["joint"]
        t_ = r_["tangent"]
        need[k_] = max(need[k_], t_ / (1.0 if k_ == 1 else 0.5) + 0.004)
        need[k_ + 1] = max(need[k_ + 1], t_ / (1.0 if k_ + 1 == len(js) - 1 else 0.5) + 0.004)
    lengthened = 0.0
    for k_ in range(1, len(js)):
        if js[k_]["len"] < need[k_] - 1e-9:
            lengthened += need[k_] - js[k_]["len"]
            js[k_]["len"] = need[k_] + 1e-4
    tail["room_fix"] = dict(lengthened=lengthened)
    tail["clip"] = dict(requested=g["curl"], applied=g["curl"] * f, factor=f)
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
    "body.tail-length": ("mult", 0.8, 1.3, "tail"), "body.tail-girth": ("mult", 0.8, 1.2, "tail"), "body.tail-curl": ("off", -0.03, 0.2, "tail"), "body.tail-lift": ("off", -12.0, 12.0, "tail"), "body.tip-size": ("mult", 0.85, 1.2, "tail"),
    "appearance.coat-value": ("mult", 0.8, 1.2, "coat"), "appearance.bib-reach": ("off", -0.1, 0.12, "coat"), "appearance.glow": ("lin", 0.6, 1.0, "coat"), "skin.grain": ("lin", 0.25, 0.45, "coat"), "skin.sheen": ("lin", 0.2, 0.4, "coat"),
    # the coat's own genes (the owner's steer: the coat is where Tuliko becomes itself)
    "coat.gradient": ("lin", 0.1, 0.5, "coat"), "coat.hue-shift": ("off", -0.06, 0.06, "coat"), "coat.fleck": ("lin", 0.2, 0.8, "coat"), "coat.freckle-density": ("lin", 0.1, 1.0, "coat"),
    "coat.freckle-glow": ("lin", 0.5, 1.0, "coat"), "coat.bleed": ("lin", 0.3, 0.9, "coat"), "coat.rd-scale": ("lin", 0.8, 1.3, "coat"), "coat.rd-contrast": ("lin", 0.6, 1.0, "coat"),
    "coat.rosette": ("lin", 0.0, 1.0, "coat"), "coat.bands": ("int", 3, 7, "coat"), "coat.mark-size": ("lin", 0.07, 0.12, "coat"),
    # the hue gene replaces the three fixed palettes (pass 2): the body hue in degrees, and the firefly glow hue (70-90 on every individual)
    "face.whisker-count": ("int", 0, 3, "face"), "face.whisker-length": ("lin", 0.2, 0.45, "face"), "face.whisker-droop": ("lin", 0.1, 0.5, "face"), "face.whisker-curl": ("lin", 0.0, 0.6, "face"),
    "appearance.body-hue": ("lin", 180.0, 360.0, "coat"), "appearance.glow-hue": ("lin", 60.0, 100.0, "coat"),            # the AD's bands of 2 Nov (ad-hue.md): teal to violet to red, the type 270; lemon to lime to green, the type 80
}
# pair-map loci: alleles with draw weights, and the dominance order the phenotype follows (the first dominant allele of the pair shows)
PAIRS = {
    "body.ear-family": (["prick", "lop", "nub"], [0.4, 0.3, 0.3], ["prick", "nub", "lop"]),                       # frond is cut
    "body.tail-tip": (["lantern", "tuft", "plain"], [0.62, 0.22, 0.16], ["lantern", "tuft", "plain"]),           # lantern dominant in the cross: most Tulikos glow (owner's answer)
    "appearance.marking-layout": (["plain", "masked", "points", "banded", "spotted", "capped"], [0.25, 0.15, 0.15, 0.15, 0.15, 0.15], ["plain", "masked", "points", "banded", "spotted", "capped"]),
    "coat.rd": (["none", "spots", "labyrinth", "rings"], [0.4, 0.25, 0.2, 0.15], ["none", "spots", "labyrinth", "rings"]),
    "coat.mark": (["none", "heart", "star"], [0.5, 0.25, 0.25], ["none", "heart", "star"]),
    "coat.mark-where": (["forehead", "belly"], [0.7, 0.3], ["forehead", "belly"]),            # (pass 4: no cheek emblems, they sat on the blush)
    "coat.glow-pattern": (["none", "belly-arcs"], [0.6, 0.4], ["none", "belly-arcs"]),        # the night-light species' one glowing pattern gene
    "face.expression": (["content", "open"], [0.8, 0.2], ["content", "open"]),
    "face.whisker-glow": (["off", "glow"], [0.85, 0.15], ["off", "glow"]),                     # a rare variant: glowing whisker tips
    "face.fangs": (["none", "fangs"], [0.75, 0.25], ["none", "fangs"]),                        # tiny fangs: about 1 in 4
}
SWITCHES = {"face.blush": 0.8, "coat.brow": 0.25}
TYPE_PAIRS = {"body.ear-family": "prick", "body.tail-tip": "lantern", "appearance.marking-layout": "plain", "coat.rd": "none", "coat.mark": "none", "coat.mark-where": "forehead", "coat.glow-pattern": "none", "face.expression": "content", "face.whisker-glow": "off", "face.fangs": "none"}
TYPE_COAT_T = {"coat.gradient": 0.5, "coat.fleck": 0.5, "coat.freckle-density": 0.5, "coat.freckle-glow": 0.8, "coat.bleed": 0.5}      # the type specimen's modest coat (t of each lin locus)


# ======================================================================== the catalogue records (genome-string proposal A.3, pin 11)
# The sampler keeps its own ids, tables and random stream. Each of its loci is a record of the catalogue pin; the file's genome block names the records, `sampler_tables` turns a block back
# into the sampler's tables, and `genome_of` turns a drawn individual into two copies per record.
RECORD = {
    "appearance.body-hue": "appearance.body-hue", "appearance.coat-value": "appearance.body-value", "coat.gradient": "appearance.countershade", "skin.grain": "appearance.surface-grain",
    "skin.sheen": "appearance.sheen", "coat.fleck": "appearance.fleck", "appearance.bib-reach": "appearance.cream-extent", "coat.rd-scale": "appearance.pattern-scale",
    "coat.rd-contrast": "appearance.pattern-contrast", "coat.rosette": "appearance.marking-rosette", "coat.bands": "appearance.band-count", "coat.mark-size": "appearance.emblem-size",
    "coat.freckle-density": "appearance.freckle-density", "coat.freckle-glow": "appearance.freckle-glow", "appearance.glow": "appearance.emission-brightness", "appearance.glow-hue": "appearance.emission-hue",
    "coat.bleed": "appearance.lantern-bleed",
    "growth.exterior-eye-size-ratio": "form.eye-size", "growth.exterior-eye-height-ratio": "form.eye-height", "growth.exterior-eye-spacing-ratio": "form.eye-spacing",
    "face.mouth-width": "form.mouth-width", "face.mouth-height": "form.mouth-height", "face.whisker-count": "form.whisker-count", "face.whisker-length": "form.whisker-length",
    "face.whisker-droop": "form.whisker-droop", "face.whisker-curl": "form.whisker-curl",
    "body.ear-length": "form.ear-length", "body.ear-girth": "form.ear-width", "body.ear-splay": "form.ear-splay", "body.ear-droop": "form.ear-droop",
    "body.head-size": "form.head", "body.torso-girth": "form.torso-girth", "body.limb-length": "form.leg-length", "body.limb-girth": "form.leg-girth", "body.tail-length": "form.tail-length",
    "body.tail-girth": "form.tail-girth", "body.tail-curl": "form.tail-curl", "body.tail-lift": "form.tail-carry", "body.tip-size": "form.tail-tip-size", "movement.cycle-rate": "movement.cycle-rate",
}                                                                    # the blends (GENES), but coat.hue-shift: the catalogue has no such record, the adapter folds it into the hue copy
PAIR_RECORD = {"body.ear-family": "form.ear-kind", "body.tail-tip": "anatomy.tail-tip-form", "coat.rd": "appearance.pattern-kind", "coat.mark": "appearance.emblem", "coat.mark-where": "appearance.emblem-place",
               "coat.glow-pattern": "appearance.glow-pattern", "face.expression": "appearance.mouth-rest"}
MARKING_SWITCH, MARKING_LAYOUT = "appearance.marking-switch", "appearance.marking-layout"                  # the sampler's one layout pair (with `plain`) is a switch and a layout
PAIR_SWITCH = {"face.fangs": ("anatomy.fang-presence", "none", "fangs"), "face.whisker-glow": ("appearance.whisker-glow", "off", "glow")}           # a two-allele pair that is a recessive switch
SWITCH_RECORD = {"blush": ("face.blush", "appearance.blush"), "brow": ("coat.brow", "anatomy.brow-tuft-presence")}
WHISKER_SWITCH = "anatomy.whisker-presence"
SWITCH_DRAW_RECORDS = {MARKING_SWITCH, WHISKER_SWITCH, *(v[0] for v in PAIR_SWITCH.values()), *(v[1] for v in SWITCH_RECORD.values())}
FOLDED = "coat.hue-shift"
LAYOUT_ALLELE = {"banded": "bands"}                                  # the sampler's name -> the catalogue's
LAYOUT_BACK = {v: k for k, v in LAYOUT_ALLELE.items()}
SAMPLER_OF = {**{v: k for k, v in RECORD.items()}, **{v: k for k, v in PAIR_RECORD.items()}}       # a record's sampler id, for the blends and the plain pairs


def sampler_tables(genome):
    """(GENES, PAIRS, SWITCHES, TYPE) in the sampler's ids, from a file's genome block (records of the catalogue). The hue shift is the sampler's own and stays as drawn (the coat does not move the cage)."""
    import genomeapply as GA
    G, P, S, T = GA.tables(genome)
    g, p, s, t = {}, {}, {}, {}
    for old, new in RECORD.items():
        if new in G:
            g[old] = (*G[new][:3], GENES[old][3])
            t[old] = T[new]
    g[FOLDED] = GENES[FOLDED]
    t[FOLDED] = 0.0
    for old, new in PAIR_RECORD.items():
        if new in P:
            p[old] = P[new]
            t[old] = T[new]
    if MARKING_LAYOUT in P:
        al, w, dom = P[MARKING_LAYOUT]
        w_on = S.get(MARKING_SWITCH, 0.75)
        p["appearance.marking-layout"] = (["plain"] + [LAYOUT_BACK.get(a, a) for a in al], [1.0 - w_on] + [x * w_on for x in w], ["plain"] + [LAYOUT_BACK.get(a, a) for a in dom])
        t["appearance.marking-layout"] = "plain" if T.get(MARKING_SWITCH) == "off" else LAYOUT_BACK.get(T[MARKING_LAYOUT], T[MARKING_LAYOUT])
    for old, (new, a_off, a_on) in PAIR_SWITCH.items():
        if new in S:
            p[old] = ([a_off, a_on], [1.0 - S[new], S[new]], [a_off, a_on])
            t[old] = a_on if T[new] == "on" else a_off
    for key, (old, new) in SWITCH_RECORD.items():
        if new in S:
            s[old] = S[new]
            t[old] = T[new]
    return g, p, s, t


def genome_of(ind, tbl=None):
    """The adapter: an individual as the sampler draws it -> a genome of the catalogue's records, two copies each ({record: [copy, copy]}; a continuous copy is t, or the record's own number
    for the three absolute records; a t that is a bin exactly is that bin's id). The copies are not on the blend grid yet (the string writer quantizes them). The hue shift is folded into the hue
    copy. A whisker count of none is the switch off/off, and the sleeping whisker records sit at `between`. A `plain` marking is the switch off with a layout copy (the other copy's, else bands)."""
    import genomeapply as GA
    if ind.get("copies"):
        return {k: list(v) for k, v in ind["copies"].items()}
    G = tbl[0] if tbl else GENES
    out = {}

    def t_copy(record, t):
        t = round(float(t), 6)
        named = {a["value"]: a["id"] for a in GA.pin_locus(record)["alleles"]}
        return named.get(t, t)

    def put(record, value):
        out[record] = [value, value]

    for old, new in RECORD.items():
        t = ind["t"][old]
        if old == "appearance.body-hue" and FOLDED in ind["t"]:                  # the shift is a fraction of the circle (value of the `off` form); the hue copy takes it, kept inside the band
            f_, lo_, hi_, _ = G[old]
            shift = 360.0 * resolve_locus(FOLDED, ind["t"][FOLDED], {**G, FOLDED: GENES[FOLDED]})
            t = min(max((resolve_locus(old, t, G) + shift - lo_) / (hi_ - lo_), 0.0), 1.0)
        if old in ABSOLUTE:
            f, lo, hi, _ = G[old]
            v = round(GA.value_of(f, lo, hi, t), 6)
            if new == "movement.cycle-rate" and v == 1.0:               # the type's rate, 1.0, is the mean of the bins low and high, not a step: its copies are low and high
                out[new] = ["low", "high"]
            else:
                put(new, v)
        else:
            put(new, t_copy(new, t))
    none = int(round(GA.value_of(*G["face.whisker-count"][:3], ind["t"]["face.whisker-count"]))) < 1
    put(WHISKER_SWITCH, "off" if none else "on")
    if none:
        for r in ("form.whisker-count", "form.whisker-length", "form.whisker-droop", "form.whisker-curl"):
            put(r, "between")
    for old, new in PAIR_RECORD.items():
        out[new] = list(ind["pairs"][old])
    lay = list(ind["pairs"]["appearance.marking-layout"])
    shown = [LAYOUT_ALLELE.get(a, a) for a in lay if a != "plain"]
    out[MARKING_SWITCH] = ["off", "off"] if "plain" in lay else ["on", "on"]
    out[MARKING_LAYOUT] = [LAYOUT_ALLELE.get(a, a) if a != "plain" else (shown[0] if shown else "bands") for a in lay]
    for old, (new, a_off, a_on) in PAIR_SWITCH.items():
        out[new] = ["on" if a == a_on else "off" for a in ind["pairs"][old]]
    for key, (old, new) in SWITCH_RECORD.items():
        out[new] = ["on", "on"] if ind["switches"][key] else ["off", "off"]
    return out


def individual_of(copies, tbl=None):
    """The inverse of `genome_of`: a genome of the catalogue's records (two copies each) -> the individual the sampler's tables and the builders read (t, pairs, switches, seed). A blend's two copies are mixed (their mean); a pair
    is as its copies say; a switch shows on with one copy on. A marking copy is `plain` where its switch copy is off, so a layout carried under `plain` is not drawn (it is the same mibi to look at). The hue shift is zero, a whisker
    switch that is off puts the count at none. The coat's seed is not genetic: it is taken from the copies, so one genome always draws the same coat."""
    import genomeapply as GA
    G = tbl[0] if tbl else GENES
    pinv = lambda r: {a["id"]: a["value"] for a in GA.pin_locus(r)["alleles"] if "value" in a}

    def value(record, c):
        return float(c) if isinstance(c, (int, float)) else float(pinv(record)[c])

    t = {FOLDED: 0.5}
    for old, new in RECORD.items():
        a, b = (value(new, c) for c in copies[new])
        if old in ABSOLUTE:
            f, lo, hi, _ = G[old]
            t[old] = round(GA.t_of(f, lo, hi, (a + b) / 2.0), 9)
        else:
            t[old] = round((a + b) / 2.0, 9)
    on = lambda c: c == "on"
    if not any(on(c) for c in copies[WHISKER_SWITCH]):
        t["face.whisker-count"] = 0.0
    pairs = {old: list(copies[new]) for old, new in PAIR_RECORD.items()}
    sw = copies[MARKING_SWITCH]
    pairs["appearance.marking-layout"] = [LAYOUT_BACK.get(l, l) if on(s) else "plain" for s, l in zip(sw, copies[MARKING_LAYOUT])]
    for old, (new, a_off, a_on) in PAIR_SWITCH.items():
        pairs[old] = [a_on if on(c) else a_off for c in copies[new]]
    switches = {key: any(on(c) for c in copies[new]) for key, (old, new) in SWITCH_RECORD.items()}
    seed = int(hashlib.sha256(json.dumps(copies, sort_keys=True).encode()).hexdigest()[:8], 16) % 999999 + 1
    return dict(t=t, pairs=pairs, switches=switches, seed=seed, copies={k: list(v) for k, v in copies.items()})          # the exact copies ride along: a genome read from a string writes back as it was


ABSOLUTE = ("movement.cycle-rate", "skin.sheen", "appearance.glow")             # the three records whose copy is the record's own number


def resolve_locus(name, t, G=None):
    kind, lo, hi, _ = (G or GENES)[name]
    if kind == "mult":
        return lo ** ((0.5 - t) / 0.5) if t <= 0.5 else hi ** ((t - 0.5) / 0.5)
    if kind == "off":
        return lo * (0.5 - t) / 0.5 if t <= 0.5 else hi * (t - 0.5) / 0.5
    if kind == "lin":
        return lo + (hi - lo) * t
    if kind == "int":
        return int(round(lo + (hi - lo) * t))
    raise KeyError(kind)


def specimen(tbl=None):
    """The type specimen. With the file's tables (genomeapply.tables) its values are the file's types; without, the tables this module was written with."""
    if tbl is not None:
        import genomeapply as GA
        G, P, S, T = tbl
        t = {k: (0.5 if f in ("mult", "off") else round(GA.t_of(f, lo, hi, T[k]), 9)) for k, (f, lo, hi, _) in G.items()}
        return dict(t=t, pairs={k: [T[k], T[k]] for k in P}, switches=dict(blush=T.get("face.blush") == "on", brow=T.get("coat.brow") == "on"), seed=20)
    t = {k: 0.5 for k in GENES}
    t.update(TYPE_COAT_T)
    t["appearance.glow"] = 0.8
    t["face.whisker-count"] = 0.0
    t["appearance.body-hue"] = 0.5; t["appearance.glow-hue"] = 0.5
    t["skin.grain"] = 0.5; t["skin.sheen"] = 0.5
    t["coat.bands"] = 0.5; t["coat.mark-size"] = 0.5; t["coat.rd-scale"] = 0.5; t["coat.rd-contrast"] = 0.5; t["coat.rosette"] = 0.0
    to_grid(t)
    return dict(t=t, pairs={k: [v, v] for k, v in TYPE_PAIRS.items()}, switches=dict(blush=True, brow=False), seed=20)



# ======================================================================== the 59-step grid (genome-string proposal A.6, W9)
# A string holds a blend on the grid of `BLEND_STEPS` = 59 steps (genome-stamp codec): t = k / 59, or the named bin `between` (0.5), with t = 0 and t = 1 the bins `low` and `high`. The three absolute records
# (the cycle rate, the sheen, the glow's brightness) sit on the same grid over the catalogue's own range. The twelve are drawn on the grid; a bred child's copies are, in the game, always on it.
GRID = 59
ABS_RANGE = {"movement.cycle-rate": (0.6, 1.4), "skin.sheen": (0.0, 1.0), "appearance.glow": (0.4, 1.0)}          # the catalogue's values of the three absolute records (pin 11)


def grid_t(t):
    """The nearest allowed t: a step k / 59 (0 and 1 are the bins low and high), or 0.5 (the bin between)."""
    k = min(max(int(round(t * GRID)), 0), GRID)
    g = round(k / GRID, 6)
    return 0.5 if abs(t - 0.5) <= abs(t - g) else g


def grid_abs(name, t, G=None):
    """t for the nearest step of the record's own range that lies inside the sampler's band (the type's own value, t = 0.5, is the bin pair low/high or between and is kept)."""
    if abs(t - 0.5) < 1e-9 and name == "movement.cycle-rate":
        return t
    import math
    import genomeapply as GA
    G = G or GENES
    f, lo, hi, _ = G[name]
    c_lo, c_hi = ABS_RANGE[name]
    step = (c_hi - c_lo) / GRID
    v0, v1 = resolve_locus(name, 0.0, G), resolve_locus(name, 1.0, G)
    v = resolve_locus(name, t, G)
    k = round((v - c_lo) / step)
    k = min(max(k, math.ceil((min(v0, v1) - c_lo) / step - 1e-9)), math.floor((max(v0, v1) - c_lo) / step + 1e-9))
    return round(GA.t_of(f, lo, hi, round(c_lo + k * step, 6)), 9)


def to_grid(t, G=None):
    """Move every blend t of an individual onto the grid, in place (the hue shift has no record: it is folded before this)."""
    for k in list(t):
        if k == FOLDED:
            continue
        t[k] = grid_abs(k, t[k], G) if k in ABS_RANGE else grid_t(t[k])
    return t


HUE_STEP = {2: 44, 3: 47, 4: 59, 5: 53, 6: 12, 7: 36, 8: 25, 9: 0, 10: 4, 11: 17, 12: 20}       # ad-hue.md: the twelve's effective hues on the new band, as steps of 59 (59 and 0 are the bins high and low)

EARS = ["lop", "nub", "prick"]
TIPS = ["lantern", "lantern", "tuft", "lantern", "lantern", "plain", "lantern", "lantern", "tuft", "lantern", "lantern"]


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
    # the variety sheet is structured: ear families and palettes cycle, the tip is mostly the (dominant) lantern with a tuft and a plain tip as rarer finds
    pairs["body.ear-family"] = [EARS[(i - 2) % 3]] * 2
    t["appearance.body-hue"] = float(np.round(((270.0 + 30.0 * (i - 1) + 14.0 * (rng.random() - 0.5)) % 360.0) / 360.0, 3))          # twelve hues round the wheel, 30 degrees apart (the type is violet)
    tipk = TIPS[(i - 2) % len(TIPS)]
    pairs["body.tail-tip"] = [tipk, tipk] if tipk != "lantern" else ["lantern", str(rng.choice(["lantern", "tuft", "plain"]))]
    pairs["coat.glow-pattern"] = [["none", "belly-arcs", "none"][(i - 1) % 3]] * 2                 # the sheet shows the glowing pattern (the firefly arcs) on every third individual; the constellation is retired (pass 4: it did not register at 96 px)
    pairs["face.expression"] = ["open"] * 2 if i in (4, 9) else ["content"] * 2
    t["face.whisker-count"] = [0.0, 0.4, 0.7, 1.0][(i - 1) % 4] if i != 1 else 0.0               # the sheet shows 0, 1 .. 3 whiskers a side
    pairs["face.whisker-glow"] = ["glow"] * 2 if i == 6 else ["off"] * 2
    pairs["face.fangs"] = ["fangs"] * 2 if i in (3, 8, 11) else ["none"] * 2                          # and shows the open-mouth expression twice
    sw = dict(blush=bool(rng.random() < SWITCHES["face.blush"]), brow=bool(rng.random() < SWITCHES["coat.brow"]))
    t["appearance.body-hue"] = HUE_STEP[i] / GRID if i in HUE_STEP else t["appearance.body-hue"]          # the AD's hues on the band (the sheet's old hue and its shift are folded: the shift is zero)
    t["coat.hue-shift"] = 0.5
    t["appearance.glow-hue"] = round(0.25 + 0.5 * t["appearance.glow-hue"], 6)                          # the glow keeps its degrees (70-90) on the wider band (60-100)
    to_grid(t)
    ind = dict(t=t, pairs=pairs, switches=sw, seed=int(rng.integers(1, 10 ** 6)))
    return limit_loud(ind)


LOUD = ("glow", "pattern", "emblem", "brow")          # in the order they are kept: at most two loud genes per individual (AD gate on pass 3, 5)


def loud_genes(ind):
    """The loud genes an individual shows, from coat pattern (a reaction-diffusion pattern or a banded / spotted / capped layout), glow pattern, emblem and brow."""
    ph = {k: phenotype(k, ind["pairs"][k]) for k in PAIRS}
    out = []
    if ph["coat.glow-pattern"] != "none":
        out.append("glow")
    if ph["coat.rd"] != "none" or ph["appearance.marking-layout"] in ("banded", "spotted", "capped"):
        out.append("pattern")
    if ph["coat.mark"] != "none":
        out.append("emblem")
    if ind["switches"].get("brow"):
        out.append("brow")
    return out


def limit_loud(ind):
    """Drop loud genes beyond the first two (glow, pattern, emblem, brow in that order of keeping): the dropped gene is switched off, not rerolled, so the rest of the individual stays as drawn."""
    for g in loud_genes(ind)[2:]:
        if g == "glow":
            ind["pairs"]["coat.glow-pattern"] = ["none", "none"]
        elif g == "pattern":
            ind["pairs"]["coat.rd"] = ["none", "none"]; ind["pairs"]["appearance.marking-layout"] = ["plain", "plain"]
        elif g == "emblem":
            ind["pairs"]["coat.mark"] = ["none", "none"]
        else:
            ind["switches"]["brow"] = False
    return ind


def phenotype(pair_name, pair, P=None):
    al, w, dom = (P or PAIRS)[pair_name]
    return min(pair, key=lambda a: dom.index(a))


def creature(ind, tbl=None):
    """creature.json: every number resolved, no genes left but the record of them (canonical: sorted keys, 1e-6 rounding). `tbl`: the file's tables (genomeapply.tables); without it the module's own."""
    G, P = (tbl[0], tbl[1]) if tbl else (GENES, PAIRS)
    G = {**G, FOLDED: G.get(FOLDED, GENES[FOLDED])}
    v = {k: resolve_locus(k, ind["t"][k], G) for k in G}
    ph = {k: phenotype(k, ind["pairs"][k], P) for k in P}
    clamped = v["body.head-size"] < 0.97 * v["body.torso-girth"]
    if clamped:                                    # mass order: the head stays the wider mass (head 1.276 H, body 1.199 H at the type)
        v["body.head-size"] = 0.97 * v["body.torso-girth"]
    c = dict(schema="mb-creature/1", species="S20",
             shape=dict(torsoGirth=v["body.torso-girth"], headSize=v["body.head-size"], legLen=v["body.limb-length"], legGirth=v["body.limb-girth"], ear=ph["body.ear-family"], earLen=v["body.ear-length"],
                        earGirth=v["body.ear-girth"], splay=v["body.ear-splay"], droop=v["body.ear-droop"], tailLen=v["body.tail-length"], tailGirth=v["body.tail-girth"], curl=v["body.tail-curl"],
                        lift=v["body.tail-lift"], tip=ph["body.tail-tip"], tipSize=v["body.tip-size"]),
             coat=dict(glow_pattern=ph["coat.glow-pattern"], expression=ph["face.expression"], hue=v["appearance.body-hue"], glow_hue=v["appearance.glow-hue"], layout=ph["appearance.marking-layout"], coat_value=v["appearance.coat-value"], belly_reach=v["appearance.bib-reach"], glow=v["appearance.glow"],
                       grain=v["skin.grain"], sheen=v["skin.sheen"], gradient=v["coat.gradient"], hue_shift=v["coat.hue-shift"], fleck=v["coat.fleck"], freckle_density=v["coat.freckle-density"],
                       freckle_glow=v["coat.freckle-glow"], bleed=v["coat.bleed"], rd=ph["coat.rd"], rd_scale=v["coat.rd-scale"], rd_contrast=v["coat.rd-contrast"], rosette=v["coat.rosette"] if ph["appearance.marking-layout"] == "spotted" else 0.0,
                       bands=v["coat.bands"], brow=1.0 if ind["switches"]["brow"] else 0.0, mark=ph["coat.mark"], mark_where=ph["coat.mark-where"], mark_size=v["coat.mark-size"], blush=bool(ind["switches"]["blush"]),
                       eye_size=v["growth.exterior-eye-size-ratio"], eye_height=v["growth.exterior-eye-height-ratio"], eye_spacing=v["growth.exterior-eye-spacing-ratio"], mouth_width=v["face.mouth-width"],
                       mouth_z=v["face.mouth-height"], seed=int(ind["seed"])),
             appendages=dict(whiskers=dict(count=(lambda n_: 0 if n_ < 1 else max(n_, 2))(int(v["face.whisker-count"])), length=v["face.whisker-length"], droop=v["face.whisker-droop"], curl=v["face.whisker-curl"], glow=ph["face.whisker-glow"] == "glow"),
                             fangs=(1 + int(ind["seed"]) % 2) if ph["face.fangs"] == "fangs" else 0),
             motion=dict(speed=v["movement.cycle-rate"], walk_period=0.9 / v["movement.cycle-rate"]),
             genes=dict(t={k: ind["t"][k] for k in sorted(ind["t"])}, pairs={k: ind["pairs"][k] for k in sorted(ind["pairs"])}, switches=ind["switches"]),
             notes=dict(head_size_clamped=bool(clamped), torso_length="the body-height gene is not applied (it would move every ring and socket); the type's 1.0 is kept", frond="the frond ear family and the cowlick are not built"))
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


_REF = {}


def ring_ref(raw):
    """The type's path length (`raw` is the species at its type values): the body's ring layout is the type's, laid from the crown, so a tail gene cannot slide a ring past a limb socket."""
    import json as _j, schema as SC
    from spine import SpineLoft
    k = _j.dumps([raw["parts"]["tail"], raw["parts"]["torso"]["spine"], raw["parts"]["torso"].get("rings_z")], sort_keys=True, default=str)
    if k not in _REF:
        spec0, _ = SC.load(raw=raw)
        _REF[k] = float(SpineLoft(spec0).L)
    return _REF[k]


def tip_size_of(raw, shape):
    """The tip's size as built: the gene's multiplier, held at the family's `max_size` where the species file sets one (the tuft's flare warps the mesh above 1.1)."""
    shp = (((raw.get("sockets") or {}).get("tail.tip") or {}).get("shapes") or {}).get(shape["tip"]) or {}
    return min(float(shape["tipSize"]), float(shp.get("max_size", 99.0)))


def tail_len_min(raw, shape):
    """The shortest tail a tip allows (the species file's `sockets.tail.tip.min_tail`): a big tip on the shortest tail folds into the seat, so the tail length multiplier is held at base + slope x (the tip's radius - from_radius), never above cap (the type's own length). 0 when the file sets none."""
    sk = (raw.get("sockets") or {}).get("tail.tip") or {}
    mt, shp = sk.get("min_tail"), (sk.get("shapes") or {}).get(shape["tip"])
    if not mt or not shp:
        return 0.0
    R = 0.5 * float(shp["width"]) * tip_size_of(raw, shape)
    return min(float(mt.get("cap", 9.9)), float(mt["base"]) + float(mt["slope"]) * max(0.0, R - float(mt["from_radius"])))


def build_individual(raw, c, upto="base", balance=True, doc=None):
    """Body of one creature from its creature.json (the species raw dict, the shape genes applied, the loft/legs/tubes/sitting builders), then the balance rule (owner, 1 Nov: the centre of mass must fall inside the support polygon of the soles,
    at least 15 % of the sole length in front of the heel). The anatomy fixes, in order: the legs move under the centroid (the hip x, up to 0.12 H back toward it: the heel edge follows the hip), then the tail's length is clipped (x0.92 a step, down to x0.6). What was done is logged in b.ctx['balance']."""
    import schema as SC, s20build, s20balance
    shape = dict(c["shape"])
    log = dict(leg_dx=0.0, tail_len_factor=1.0, steps=0, arm_bias=0.0)
    arm_target = float(raw["parts"]["arm.L"]["families"][raw["parts"]["arm.L"]["default"]].get("measured_len", 0.0))     # pass 4: the arm's visible length is measured on the shipped mesh (from the skin to the tip) and fitted to this number
    arm_pass = 0
    for step in range(16):
        g = dict(shape)
        g["tailLen"] = max(shape["tailLen"] * log["tail_len_factor"], tail_len_min(raw, shape))
        r = apply_genes(doc, g, c["coat"]) if doc is not None else apply_shape(raw, g)
        r["parts"]["leg.L"]["joints"][0]["at"][0] += log["leg_dx"]
        if log["arm_bias"]:
            fa_ = r["parts"]["arm.L"]["families"][r["parts"]["arm.L"]["default"]]
            fa_["visible_len"] = float(fa_["visible_len"]) + log["arm_bias"]
        spec, _ = SC.load(raw=r)
        b = s20build.make_s20(spec, upto=upto, ear=c["shape"]["ear"], tip=c["shape"]["tip"], tip_size=tip_size_of(raw, c["shape"]), appendages=c.get("appendages") if upto == "base" else None, ring_ref=ring_ref(raw))
        if not balance or upto != "base":
            return b
        m = s20balance.measure(b)
        log["margin"] = m["margin"]; log["inside"] = m["inside"]; log["com"] = [float(x) for x in m["com"]]; log["steps"] = step
        if m["margin"] >= 0.15 + 0.03 and m["inside"]:
            if arm_target > 0 and arm_pass < 2:                      # the balance is settled: fit the arm's visible length on the real mesh (the trunk's surface differs from the design body by a few cm where the arm skims it)
                import s20p4 as P4
                vis = P4.arm_numbers(b)["visible_len"]
                log["arm_len"] = vis
                if abs(vis - arm_target) > 0.012:
                    log["arm_bias"] += arm_target - vis
                    arm_pass += 1
                    continue
            break
        if log["leg_dx"] > -0.12 + 1e-9:
            log["leg_dx"] = max(-0.12, log["leg_dx"] - 0.04)
        elif log["tail_len_factor"] > 0.6:
            log["tail_len_factor"] = round(log["tail_len_factor"] * 0.92, 4)
        else:
            break
    b.ctx["balance"] = log
    return b
