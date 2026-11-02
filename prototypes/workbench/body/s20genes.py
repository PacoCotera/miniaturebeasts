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
                j["pitch"] = base[k] - g["lift"]
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
    "appearance.body-hue": ("lin", 0.0, 360.0, "coat"), "appearance.glow-hue": ("lin", 70.0, 90.0, "coat"),
}
# pair-map loci: alleles with draw weights, and the dominance order the phenotype follows (the first dominant allele of the pair shows)
PAIRS = {
    "body.ear-family": (["prick", "lop", "nub"], [0.4, 0.3, 0.3], ["prick", "nub", "lop"]),                       # frond is cut
    "body.tail-tip": (["lantern", "tuft", "plain"], [0.62, 0.22, 0.16], ["lantern", "tuft", "plain"]),           # lantern dominant in the cross: most Tulikos glow (owner's answer)
    "appearance.marking-layout": (["plain", "masked", "points", "banded", "spotted", "capped"], [0.25, 0.15, 0.15, 0.15, 0.15, 0.15], ["plain", "masked", "points", "banded", "spotted", "capped"]),
    "coat.rd": (["none", "spots", "labyrinth", "rings"], [0.4, 0.25, 0.2, 0.15], ["none", "spots", "labyrinth", "rings"]),
    "coat.mark": (["none", "heart", "star"], [0.5, 0.25, 0.25], ["none", "heart", "star"]),
    "coat.mark-where": (["forehead", "cheek", "belly"], [0.5, 0.3, 0.2], ["forehead", "cheek", "belly"]),
    "coat.glow-pattern": (["none", "belly-arcs", "constellation"], [0.34, 0.33, 0.33], ["none", "belly-arcs", "constellation"]),        # the night-light species' one glowing pattern gene
    "face.expression": (["content", "open"], [0.8, 0.2], ["content", "open"]),
    "face.whisker-glow": (["off", "glow"], [0.85, 0.15], ["off", "glow"]),                     # a rare variant: glowing whisker tips
    "face.fangs": (["none", "fangs"], [0.75, 0.25], ["none", "fangs"]),                        # tiny fangs: about 1 in 4
}
SWITCHES = {"face.blush": 0.8, "coat.brow": 0.25}
TYPE_PAIRS = {"body.ear-family": "prick", "body.tail-tip": "lantern", "appearance.marking-layout": "plain", "coat.rd": "none", "coat.mark": "none", "coat.mark-where": "forehead", "coat.glow-pattern": "none", "face.expression": "content", "face.whisker-glow": "off", "face.fangs": "none"}
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
    t["face.whisker-count"] = 0.0
    t["appearance.body-hue"] = 270.0 / 360.0; t["appearance.glow-hue"] = 0.5
    t["skin.grain"] = 0.5; t["skin.sheen"] = 0.5
    t["coat.bands"] = 0.5; t["coat.mark-size"] = 0.5; t["coat.rd-scale"] = 0.5; t["coat.rd-contrast"] = 0.5; t["coat.rosette"] = 0.0
    return dict(t=t, pairs={k: [v, v] for k, v in TYPE_PAIRS.items()}, switches=dict(blush=True, brow=False), seed=20)


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
    pairs["coat.glow-pattern"] = [["none", "belly-arcs", "constellation"][(i - 1) % 3]] * 2                 # the sheet cycles the glowing pattern gene
    pairs["face.expression"] = ["open"] * 2 if i in (4, 9) else ["content"] * 2
    t["face.whisker-count"] = [0.0, 0.4, 0.7, 1.0][(i - 1) % 4] if i != 1 else 0.0               # the sheet shows 0, 1 .. 3 whiskers a side
    pairs["face.whisker-glow"] = ["glow"] * 2 if i == 6 else ["off"] * 2
    pairs["face.fangs"] = ["fangs"] * 2 if i in (3, 8, 11) else ["none"] * 2                          # and shows the open-mouth expression twice
    sw = dict(blush=bool(rng.random() < SWITCHES["face.blush"]), brow=bool(rng.random() < SWITCHES["coat.brow"]))
    return dict(t=t, pairs=pairs, switches=sw, seed=int(rng.integers(1, 10 ** 6)))


def phenotype(pair_name, pair):
    al, w, dom = PAIRS[pair_name]
    return min(pair, key=lambda a: dom.index(a))


def creature(ind):
    """creature.json: every number resolved, no genes left but the record of them (canonical: sorted keys, 1e-6 rounding)."""
    v = {k: resolve_locus(k, ind["t"][k]) for k in GENES}
    ph = {k: phenotype(k, ind["pairs"][k]) for k in PAIRS}
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
             appendages=dict(whiskers=dict(count=int(v["face.whisker-count"]), length=v["face.whisker-length"], droop=v["face.whisker-droop"], curl=v["face.whisker-curl"], glow=ph["face.whisker-glow"] == "glow"),
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


def build_individual(raw, c, upto="base", balance=True):
    """Body of one creature from its creature.json (the species raw dict, the shape genes applied, the loft/legs/tubes/sitting builders), then the balance rule (owner, 1 Nov: the centre of mass must fall inside the support polygon of the soles,
    at least 15 % of the sole length in front of the heel). The anatomy fixes, in order: the legs move under the centroid (the hip x, up to 0.12 H back toward it: the heel edge follows the hip), then the tail's length is clipped (x0.92 a step, down to x0.6). What was done is logged in b.ctx['balance']."""
    import schema as SC, s20build, s20balance
    shape = dict(c["shape"])
    log = dict(leg_dx=0.0, tail_len_factor=1.0, steps=0, arm_bias=0.0)
    arm_target = float(raw["parts"]["arm.L"]["families"][raw["parts"]["arm.L"]["default"]].get("measured_len", 0.0))     # pass 4: the arm's visible length is measured on the shipped mesh (from the skin to the tip) and fitted to this number
    arm_pass = 0
    for step in range(16):
        g = dict(shape)
        g["tailLen"] = shape["tailLen"] * log["tail_len_factor"]
        r = apply_shape(raw, g)
        r["parts"]["leg.L"]["joints"][0]["at"][0] += log["leg_dx"]
        if log["arm_bias"]:
            fa_ = r["parts"]["arm.L"]["families"][r["parts"]["arm.L"]["default"]]
            fa_["visible_len"] = float(fa_["visible_len"]) + log["arm_bias"]
        spec, _ = SC.load(raw=r)
        b = s20build.make_s20(spec, upto=upto, ear=c["shape"]["ear"], tip=c["shape"]["tip"], tip_size=c["shape"]["tipSize"], appendages=c.get("appendages") if upto == "base" else None)
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
