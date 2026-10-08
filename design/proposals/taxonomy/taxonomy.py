#!/usr/bin/env python3
"""The generative taxonomy on the real 114-pair authoring catalogue.

Generates example species by rule (plan -> family -> species) and builds every one
through the species-frame method (../species-frames/frames.py), which resolves each
genome with the generator workbench's own resolver: 200 random individuals per
species must construct, as for the hopper, puffcap and glowtail. Writes
examples.json and taxonomy.svg beside this file.

    python3 design/proposals/taxonomy/taxonomy.py            # write + check
    python3 design/proposals/taxonomy/taxonomy.py --check    # check only
    python3 design/proposals/taxonomy/taxonomy.py --census   # also recount the plans (slow, ~10 min)

Nothing here names a creature: the namer (an LLM, or a person) receives only the
locked facts in each example's `nameBrief` and returns words; it never adds a locus.
"""
import json, random, sys
from html import escape
from itertools import product
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "species-frames"))
import frames  # noqa: E402  (the frame method: resolver bridge, build, checks)

# --- level 1: body plans. Skeleton switches (segments, symmetry, limbs) plus covering.
COMMON = {
    "development.fin-rooting": "off", "organization.head-module": "head", "structure.ocular-pair": "paired",
    "anatomy.exterior-eye-presence": "on", "cognition.innate-profile-presence": "on",
    "anatomy.posterior-presence": "off", "organization.appendage-groups": "zero", "organization.free-link-count": "one",
}
SKELETONS = {
    "round-walker": dict(name="round walkers", code="B1·L4", states="walk, hop", **{
        "development.axial-repeat": "single", "development.symmetry": "bilateral", "organization.body-symmetry": "bilateral",
        "development.attachment-repeat": "multiple", "development.articulated-chain": "linked",
        "development.membrane-rooting": "off", "development.axial-deformation": "off",
        "organization.region-depth": "one", "organization.region-layout": "serial", "organization.region-join": "broad",
        "organization.appendage-role": "contact", "anatomy.support-pair-count": "two", "anatomy.wing-presence": "off"}),
    "bobber": dict(name="bobbers", code="R1·flaps", states="waddle, bob", **{
        "development.axial-repeat": "single", "development.symmetry": "radial", "organization.body-symmetry": "radial",
        "development.attachment-repeat": "none", "development.articulated-chain": "unlinked",
        "development.membrane-rooting": "on", "development.axial-deformation": "on",
        "organization.region-depth": "one", "organization.region-layout": "serial", "organization.region-join": "broad",
        "organization.appendage-role": "none", "anatomy.support-pair-count": "two", "anatomy.wing-presence": "on"}),
    "long-walker": dict(name="long walkers", code="B2·L4", states="scurry, weave", **{
        "development.axial-repeat": "chain", "development.symmetry": "bilateral", "organization.body-symmetry": "bilateral",
        "development.attachment-repeat": "multiple", "development.articulated-chain": "linked",
        "development.membrane-rooting": "off", "development.axial-deformation": "on",
        "organization.region-depth": "two", "organization.region-layout": "serial", "organization.region-join": "narrow",
        "organization.appendage-role": "contact", "anatomy.support-pair-count": "two", "anatomy.wing-presence": "off"}),
    "swimmer": dict(name="swimmers", code="B3·fins", states="swim, glide, wriggle ashore", **{
        "development.axial-repeat": "chain", "development.symmetry": "bilateral", "organization.body-symmetry": "bilateral",
        "development.attachment-repeat": "none", "development.articulated-chain": "unlinked",
        "development.membrane-rooting": "on", "development.axial-deformation": "on",
        "organization.region-depth": "three", "organization.region-layout": "serial", "organization.region-join": "narrow",
        "organization.appendage-role": "none", "anatomy.support-pair-count": "two", "anatomy.wing-presence": "on"}),
    "flutterer": dict(name="flutterers", code="B3·L6·flaps", states="walk, flutter, hover", **{
        "development.axial-repeat": "chain", "development.symmetry": "bilateral", "organization.body-symmetry": "bilateral",
        "development.attachment-repeat": "multiple", "development.articulated-chain": "linked",
        "development.membrane-rooting": "on", "development.axial-deformation": "off",
        "organization.region-depth": "three", "organization.region-layout": "serial", "organization.region-join": "narrow",
        "organization.appendage-role": "contact", "anatomy.support-pair-count": "three", "anatomy.wing-presence": "on"}),
}
COVERINGS = {
    "skin": {"appearance.fur-presence": "off", "appearance.anatomical-covering": "skin", "appearance.covering-kind": "skin"},
    "scales": {"appearance.fur-presence": "off", "appearance.anatomical-covering": "scales", "appearance.covering-kind": "scales"},
    "fur": {"appearance.fur-presence": "on", "appearance.anatomical-covering": "skin", "appearance.covering-kind": "skin"},
}
FEATURE_SWITCHES = ["anatomy.muzzle-presence", "anatomy.crown-presence", "anatomy.auricular-presence", "anatomy.axial-tail-presence"]

# Pigments in wheel order: a species' colour pool is its family anchor and neighbours on the wheel.
WHEEL = ["marigold", "coral", "raspberry", "plum", "periwinkle", "cobalt", "lagoon", "jade", "russet", "charcoal"]

# --- level 2: families. A plan plus a signature: anchor pigment, covering finish, defining feature.
FAMILIES = {
    # the three species frames already proposed, placed by the same rule
    "trebola": dict(number=1, skeleton="round-walker", covering="skin", anchor="charcoal", second="cream",
                       feature="leaf crest and snout", features={"anatomy.muzzle-presence": "on", "anatomy.crown-presence": "on"},
                       finish={"anatomy.crown-form": "pointed"}, glyphTop=["#.#.#", ".###."]),
    "bonetia": dict(number=2, skeleton="bobber", covering="fur", anchor="coral", second=None,
                      feature="a cap of three flaps", features={}, finish={}, glyphTop=[".###.", "#####"]),
    "fanalia": dict(number=3, skeleton="long-walker", covering="scales", anchor="lagoon", second="milk-mint",
                         feature="a long tail that glows", features={"anatomy.muzzle-presence": "on", "anatomy.crown-presence": "on",
                                                                 "anatomy.axial-tail-presence": "on"},
                         finish={"anatomy.crown-form": "pointed"}, glyphTop=["..#..", ".###."]),
    # generated examples
    "algodina": dict(number=4, skeleton="round-walker", covering="fur", anchor="periwinkle", second="cream",
                      feature="long round ears", features={"anatomy.muzzle-presence": "on", "anatomy.auricular-presence": "on"},
                      finish={"anatomy.auricular-form": "rounded", "growth.auricular-length-ratio": "long",
                              "appearance.fur-flow": "axial"}, glyphTop=["#...#", "##.##"]),
    "aletia": dict(number=5, skeleton="swimmer", covering="scales", anchor="cobalt", second="ice",
                     feature="a back fin and a tail", features={"anatomy.muzzle-presence": "on", "anatomy.crown-presence": "on",
                                                              "anatomy.axial-tail-presence": "on"},
                     finish={"anatomy.crown-form": "pointed", "appearance.anatomical-scale-size": "fine"}, glyphTop=["..#..", ".###."]),
    "volanta": dict(number=6, skeleton="flutterer", covering="skin", anchor="marigold", second="butter",
                       feature="two round feelers and wide flaps", features={"anatomy.crown-presence": "on"},
                       finish={"anatomy.crown-form": "rounded", "growth.crown-height-ratio": "high"}, glyphTop=["#...#", ".#.#."]),
}

# --- the shared trait vocabulary: chapter -> trait -> loci, with the field guide's words.
VOCAB = [
    ("coat", "colour", "Colour", ["appearance.body-palette"], None),
    ("coat", "second-colour", "Second colour", ["appearance.underside-palette"], None),
    ("coat", "markings", "Markings", ["appearance.marking-switch", "appearance.marking-layout", "appearance.marking-extent",
                                      "appearance.marking-scale", "appearance.marking-orientation", "appearance.marking-contrast"],
     ["plain", "bands", "spots", "bands and spots"]),
    ("coat", "fluff", "Fluff", ["appearance.fur-length", "appearance.fur-flow"], ["short and straight", "between", "long and swept"]),
    ("coat", "scales", "Scales", ["appearance.anatomical-covering-extent", "appearance.anatomical-scale-size"],
     ["a few fine scales", "between", "many coarse scales"]),
    ("face", "eyes", "Eyes", ["growth.exterior-eye-size-ratio", "growth.exterior-eye-spacing-ratio"], ["small, close", "between", "big, wide"]),
    ("face", "snout", "Snout", ["growth.muzzle-projection-ratio", "growth.muzzle-width-ratio"], ["short, narrow", "between", "long, broad"]),
    ("face", "crown", "Crown", ["growth.crown-height-ratio"], ["low", "between", "tall"]),
    ("face", "ears", "Ears", ["anatomy.auricular-form", "growth.auricular-length-ratio"], ["short, round", "between", "long, pointed"]),
    ("face", "head", "Head", ["growth.head-length-ratio", "growth.head-width-ratio", "growth.head-depth-ratio", "growth.head-lift-ratio"],
     ["small, low", "between", "big, raised"]),
    ("shape", "size", "Size", ["growth.core-half-length"], ["small", "between", "large"]),
    ("shape", "build", "Build", ["growth.core-width-ratio", "growth.core-depth-ratio"], ["slim", "between", "stout"]),
    ("shape", "roundness", "Roundness", ["growth.radial-cross-radius"], ["slim", "between", "plump"]),
    ("shape", "body", "Body", ["anatomy.region-longitudinal-form"], ["egg", "barrel", "pear"]),
    ("shape", "hind-body", "Hind body", ["growth.region-taper"], ["small", "between", "full"]),
    ("shape", "back-line", "Back line", ["growth.region-bend"], ["dipping", "level", "arched"]),
    ("shape", "waist", "Waist", ["growth.join-throat-ratio"], ["thin", "between", "thick"]),
    ("shape", "flaps", "Flaps", ["growth.wing-span-ratio", "growth.wing-chord-ratio", "growth.wing-sweep-ratio"],
     ["small, straight", "between", "wide, swept"]),
    ("legs-tail", "legs", "Legs", ["growth.support-drop-ratio", "growth.support-radius-ratio", "growth.support-splay-ratio"],
     ["short, fine", "between", "long, stout"]),
    ("legs-tail", "feet", "Feet", ["anatomy.contact-terminal-form", "growth.terminal-length-ratio", "growth.terminal-depth-ratio"],
     ["round feet", "pads", "digging wedges"]),
    ("legs-tail", "tail", "Tail", ["growth.axial-tail-length-ratio", "growth.axial-tail-width-ratio"], ["short, thin", "between", "long, thick"]),
    ("legs-tail", "tail-curl", "Tail curl", ["growth.axial-tail-bend"], ["hangs", "straight", "curls up"]),
    ("movement", "pace", "Pace", ["movement.cycle-rate"], ["steady", "between", "quick"]),
    ("movement", "turning", "Turning", ["movement.turn-control"], ["wide turns", "between", "tight turns"]),
    ("movement", "stride", "Stride", ["movement.stride-preference", "movement.contact-phase"], ["short steps", "between", "long steps"]),
    ("movement", "weave", "Weave", ["movement.axial-amplitude", "movement.axial-phase"], ["straight", "between", "big weave"]),
    ("movement", "flap", "Flap", ["movement.membrane-stroke", "movement.membrane-coordination"], ["slow beat", "between", "quick beat"]),
    ("stamina", "strength", "Strength", ["energy.actuator-capacity"], ["light", "between", "strong"]),
    ("stamina", "reserve", "Reserve", ["energy.reserve-capacity"], ["tires soon", "between", "goes long"]),
    ("stamina", "thrift", "Thrift", ["energy.action-efficiency"], ["thrifty", "between", "ordinary"]),
    ("temperament", "curiosity", "Curiosity", ["cognition.exploration-tendency"], ["reserved", "between", "seeking"]),
    ("temperament", "nerve", "Nerve", ["cognition.arousal-threshold"], ["jumpy", "between", "unflappable"]),
]
# How many traits a species leaves open, by tier ("genomes grow with the player").
TIERS = {"starter": (5, 6), "early": (7, 10), "mid": (12, 18), "late": (24, 34)}
FINDS = {"temperament": "a vybronic crystal", "stamina": "a storm-glass shard", "movement": "a tide pearl"}

# --- level 3: species, generated. Only the family, tier, seed and the find are chosen; the rest is rule.
# --- the V1 roster (owner 10-07): 16 species, very different, more big animals, at most two insect-like.
# Placeholder codes: names are the copywriter's (taxonomy section 5). Plan keys as in plans.json:
# segments|layout|symmetry|limbs|feeler groups|feeler links|leg pairs|flaps|covering, plus the size class.
# Example A is a generated frame on the S07 plan; C on the S12 plan; B shows the method on a fish plan that was cut.
ROSTER = [
    ("S01", "C01", "one|serial|bilateral|contact|zero|one|two|off|skin", "medium"),      # frame hopper
    ("S02", "C02", "one|serial|radial|none|zero|one|two|on|fur", "large"),               # frame puffcap
    ("S03", "C03", "two|serial|bilateral|contact|zero|one|two|off|scales", "small"),     # frame glowtail
    ("S04", "C04", "two|serial|bilateral|contact|zero|one|two|off|fur", "medium"),       # cat-like
    ("S05", "C05", "two|serial|bilateral|contact|zero|one|two|off|fur", "medium"),       # fox-like
    ("S06", "C06", "two|serial|bilateral|contact|zero|one|two|off|fur", "medium"),       # raccoon-like
    ("S07", "C07", "one|serial|bilateral|contact|zero|one|two|off|fur", "large"),        # badger- or bear-like
    ("S08", "C08", "two|serial|bilateral|contact|zero|one|two|off|fur", "large"),        # goat- or deer-like
    ("S09", "C09", "two|serial|bilateral|contact|zero|one|one|on|fur", "large"),         # big bird-like flier, one pair of legs (plans.json onePairPlans)
    ("S10", "C10", "three|serial|bilateral|contact|zero|one|two|off|fur", "medium"),     # otter-like swimmer
    ("S11", "C11", "one|serial|bilateral|contact|zero|one|two|off|scales", "large"),     # turtle-like
    ("S12", "C12", "three|serial|bilateral|contact|zero|one|three|on|skin", "small"),    # insect flutterer
    ("S13", "C13", "three|serial|bilateral|contact|zero|one|three|off|scales", "small"), # beetle-like crawler
    ("S14", "C14", "three|serial|bilateral|none|zero|one|two|off|skin", "small"),        # slug
    ("S15", "C15", "two|fan|radial|contact|zero|one|two|off|skin", "medium"),            # walking plant
    ("S16", "C16", "three|fan|bilateral|none|zero|one|two|off|skin", "medium"),          # lightning wisp
]


def roster_check(plans):
    """Every roster plan is one of the census's buildable plans; count what the art must master."""
    built = set(plans["plans"])
    rows = []
    for code, clan, key, size in ROSTER:
        assert key in built, f"{code}: plan {key} is not buildable"
        seg, layout, sym, limbs, groups, links, pairs, flaps, cover = key.split("|")
        rows.append({"species": code, "clan": clan, "plan": key, "size": size,
                     "body": f"{sym} {layout} {seg}", "limbs": limbs, "flaps": flaps, "covering": cover})
    assert len({r["species"] for r in rows}) == len({r["clan"] for r in rows}) == 16
    limb_sets = {r["limbs"] for r in rows if r["limbs"] != "none"} | ({"flaps"} if any(r["flaps"] == "on" for r in rows) else set())
    return {"species": rows, "plans": len({r["plan"] for r in rows}),
            "skeletons": len({r["plan"].rsplit("|", 1)[0] for r in rows}),
            "bodyRigs": len({r["body"] for r in rows}), "limbSets": len(limb_sets),
            "coverings": len({r["covering"] for r in rows}),
            "sizes": {s: sum(r["size"] == s for r in rows) for s in ("small", "medium", "large")}}


EXAMPLES = [
    dict(id="algodina-a", family="algodina", member=1, tier="early", seed=1, sealed=None),
    dict(id="aletia-a", family="aletia", member=1, tier="mid", seed=1, sealed="temperament"),
    dict(id="volanta-a", family="volanta", member=1, tier="late", seed=1, sealed="stamina"),
]


def plan_of(fam):
    f = FAMILIES[fam]
    sk = {k: v for k, v in SKELETONS[f["skeleton"]].items() if "." in k}
    feats = {k: "off" for k in FEATURE_SWITCHES}
    feats.update(f["features"])
    return {**COMMON, **sk, **COVERINGS[f["covering"]], **feats}


def applicable(plan, fixed, cat, defaults):
    """Which vocabulary traits this plan can show: every look drawn, every doing's owner on."""
    loci = {l["id"]: l for l in cat["loci"] if l["status"] == "validated"}
    g = {i: frames.h(plan.get(i) or fixed.get(i) or defaults[i][0]) for i in loci}
    g["appearance.marking-switch"] = ["on", "on"]
    res = frames.resolve([{"name": "probe", "loci": g, "detail": True}])["results"][0]
    assert res["status"] == "resolved" and res["scene"] == "constructed", res
    facts = {f["id"]: f for f in res["facts"]}
    values = {k: v["value"] for k, v in facts.items()}

    def on(i):
        f, l = facts[i], loci[i]
        if f["state"] != "unimplemented":
            return f["state"] == "expressed"
        return frames.APPLICABILITY[l["applicability"] or "all"](values)
    out = []
    for t in VOCAB:
        ids = t[3]
        doing = frames.FAMILY_ALIAS.get(loci[ids[0]]["family"], loci[ids[0]]["family"]) in frames.DOING_FAMILIES
        if all(on(i) and (doing or facts[i]["state"] == "expressed") for i in ids if i != "appearance.marking-switch"):
            out.append(t)
    return out


def generate(ex, cat, defaults):
    fam = FAMILIES[ex["family"]]
    plan = plan_of(ex["family"])
    rng = random.Random(f"{ex['family']}:{ex['member']}:{ex['seed']}")
    # family signature first; every other drawable value is fixed by the seed (locked for the species)
    fixed = dict(fam["finish"])
    fixed["appearance.body-palette"] = fam["anchor"]
    if fam["second"]:
        fixed["appearance.underside-palette"] = fam["second"]
    traits = [t for t in applicable(plan, fixed, cat, defaults)
              if t[1] != "size" and t[1] not in ex.get("lockTraits", ())]  # size is locked: the pod's size class
    lo, hi = TIERS[ex["tier"]]
    n = min(len(traits), rng.randint(lo, hi))
    looks = [t for t in traits if t[0] not in ("movement", "stamina", "temperament")]
    doings = [t for t in traits if t[0] in ("movement", "stamina", "temperament")]
    must = [t for t in looks if t[1] == "colour"] if ex["tier"] != "starter" else []
    pick = must + rng.sample([t for t in looks if t not in must], min(len(looks) - len(must), max(0, round(n * 0.65) - len(must))))
    pick += rng.sample(doings, min(len(doings), n - len(pick)))
    if ex["sealed"]:  # a sealed chapter needs at least two traits behind the seal
        pick += [t for t in doings if t[0] == ex["sealed"] and t not in pick][: max(0, 2 - sum(t[0] == ex["sealed"] for t in pick))]
    open_ids = {i for t in pick for i in t[3]}
    for i, l in ((l["id"], l) for l in cat["loci"] if l["status"] == "validated"):
        if i in plan or i in fixed or i in open_ids or i in frames.SWITCHES:
            continue
        if l["operator"] != "partition-map":
            fixed[i] = rng.choice([a["id"] for a in l["alleles"]])
    for i in open_ids:
        fixed.pop(i, None)
    k = WHEEL.index(fam["anchor"]) if fam["anchor"] in WHEEL else 0
    pool = [fam["anchor"]] + [WHEEL[(k + d) % len(WHEEL)] for d in (1, -1, 2)][: rng.randint(1, 3)]
    second = pool[1] if len(pool) > 1 else fam["anchor"]  # pod: family anchor + the species' first neighbour
    opened = []
    for ch, tid, name, ids, words in sorted(pick, key=lambda t: VOCAB.index(t)):
        pools = None
        if tid == "colour":
            pools = {"appearance.body-palette": pool}
            words = pool + ["two side by side"]
        elif tid == "second-colour":
            sec = ["cream", "slate", "milk-mint", "ice", "butter", "peach"]
            pools = {"appearance.underside-palette": [fam["second"]] + rng.sample([p for p in sec if p != fam["second"]], 2)}
            words = pools["appearance.underside-palette"] + ["two side by side"]
        opened.append((ch, tid, name, ids, words, pools, None))
    species_no = fam["number"] * 32 + ex["member"]
    glyph = fam["glyphTop"] + [mirror(rng) for _ in range(3)]
    sp = dict(id=ex["id"], name=ex["id"], plural=ex["id"] + "s", order=0, summary=f"generated: {ex['family']} member {ex['member']}",
              plan=plan, fixed=fixed, open=opened, sealed={ex["sealed"]: FINDS[ex["sealed"]]} if ex["sealed"] else {},
              pod=dict(colourPair=[f"appearance.body-palette:{fam['anchor']}", f"appearance.body-palette:{second}"]),
              glyph=glyph, pending=[])
    frame = frames.build(sp, cat, defaults)
    return sp, frame, species_no


def mirror(rng):
    half = [rng.choice("#.") for _ in range(3)]
    if half == [".", ".", "."]:
        half[2] = "#"
    return "".join(half + half[1::-1])


def name_brief(ex, sp, frame):
    """What the namer may use: locked facts every member shows. Never an open trait's look."""
    fam = FAMILIES[ex["family"]]
    sk = SKELETONS[fam["skeleton"]]
    size = frame["pod"]["sizeClass"]
    return {"plan": f"{sk['name']} ({sk['code']}, {fam['covering']})", "feature": fam["feature"],
            "gait": sk["states"], "size": size, "diet": "fruit" if size in ("medium", "large") else "dew and moss (not yet in the field)",
            "familyColour": fam["anchor"], "forbidden": sorted({t["name"] for c in frame["chapters"] for t in c["traits"]})}


def genotypes(frame):
    """Distinct genotypes (unordered copy pairs) over the open loci: the individuals a species can hold."""
    n = 1
    for r in frame["loci"]:
        if r["kind"] != "locked":
            a = len(r["alleles"])
            n *= a * (a + 1) // 2
    return n


# --- the pan-genome view: which loci a species would carry at all --------------------
PRESENCE = {"development.membrane-rooting", "development.fin-rooting", "development.axial-deformation",
            "development.attachment-repeat", "development.articulated-chain", "anatomy.posterior-presence",
            "anatomy.wing-presence", "appearance.fur-presence", "anatomy.auricular-presence", "anatomy.axial-tail-presence",
            "anatomy.muzzle-presence", "anatomy.crown-presence", "anatomy.exterior-eye-presence", "organization.appendage-groups"}
ABSENT_VALUES = {"off", "none", "absent", "zero", "unlinked"}
# Clan branches: loci the catalogue lacks today, proposed to exist only in one clan (species-frames notYet.pending).
BRANCHES = {"trebola": {"belly field": "locked", "crest leaf count": "locked"},
            "bonetia": {"top cap sheet": "locked", "cap colour": "look", "cap spots": "look"},
            "fanalia": {"glow brightness": "doing", "glow length": "doing", "tail-tip bulb": "locked"}}


def pan_genome(frame, clan):
    """Trunk loci this species has (a drawn or acting part it owns) plus its clan's branch.
    Absent: a part the plan never has (owner off, or its presence switch off), and older records
    nothing draws yet. Open part switches keep their copies: sleeping is not absent."""
    absent = {"owner-off": 0, "presence-off": 0, "no-consumer": 0}
    trunk_locked = trunk_open = 0
    for r in frame["loci"]:
        if r["kind"] != "locked":
            trunk_open += 1
        elif r["lockReason"] == "owner-off":
            absent["owner-off"] += 1
        elif r["lockReason"] == "switch" and r["id"] in PRESENCE and r["copies"][0] in ABSENT_VALUES:
            absent["presence-off"] += 1
        elif r["lockReason"] == "no-consumer":
            absent["no-consumer"] += 1
        else:
            trunk_locked += 1
    br = BRANCHES.get(clan, {})
    br_open = sum(1 for k in br.values() if k != "locked")
    return {"trunkLocked": trunk_locked, "trunkOpen": trunk_open, "branch": len(br), "branchOpen": br_open,
            "genome": trunk_locked + trunk_open + len(br), "open": trunk_open + br_open, "absent": absent}


def census(cat, defaults):
    """Every canonical plan (skeleton switch combination with a head), built once through the resolver."""
    base = {**COMMON, **SKELETONS["round-walker"]}
    base = {k: v for k, v in base.items() if "." in k}
    seen, reqs = set(), []
    for depth, layout, sym, role, groups, links, pairs, wing, cover, tail in product(
            ["one", "two", "three"], ["serial", "fan"], ["bilateral", "radial"], ["none", "free", "contact"],
            ["one", "two", "three"], ["one", "two"], ["two", "three"], ["off", "on"], list(COVERINGS), ["off", "on"]):
        if depth == "one":
            layout = "serial"
        if role != "free":
            groups, links = "zero", "one"
        if role != "contact" or sym == "radial":
            pairs = "two"
        key = (depth, layout, sym, role, groups, links, pairs, wing, cover)
        if (key, tail) in seen:
            continue
        seen.add((key, tail))
        p = dict(base)
        p.update({"organization.region-depth": depth, "organization.region-layout": layout, "organization.body-symmetry": sym,
                  "development.symmetry": sym, "organization.appendage-role": role, "organization.appendage-groups": groups,
                  "organization.free-link-count": links, "anatomy.support-pair-count": pairs, "anatomy.wing-presence": wing,
                  "anatomy.axial-tail-presence": tail, **COVERINGS[cover]})
        reqs.append({"name": "|".join(key + (tail,)), "loci": {k: frames.h(v) for k, v in p.items()}})
    rows = []
    for i in range(0, len(reqs), 400):
        rows += frames.resolve(reqs[i:i + 400])["results"]
    built = {}
    for r in rows:
        key = r["name"].rsplit("|", 1)[0]
        ok = r["status"] == "resolved" and r.get("scene") == "constructed"
        built[key] = built.get(key, False) or ok
    plans = sorted(k for k, ok in built.items() if ok)
    skel = sorted({k.rsplit("|", 1)[0] for k in plans})
    return {"rule": "segments x symmetry x limbs (none, feelers 1-3 groups x 1-2 links, legs 2 or 3 pairs) x flaps x covering, "
                    "head on, built once with tail off and once on; a plan counts if either builds",
            "tried": len(built), "built": len(plans), "skeletonsBuilt": len(skel), "plans": plans}


# --- the figure ------------------------------------------------------------------------
INK, MUTED, BG = "#2e2e2e", "#6f6a5e", "#f7f4ec"


def figure(examples, plans):
    rows = [  # plan, family, species (name, open traits, sealed, status)
        ("round-walker", "trebola", [("S01 (hopper)", 5, "", "frame"), ("2nd member", None, "", "")]),
        ("round-walker", "algodina", [("A, S07 plan", None, "", "gen")]),
        ("bobber", "bonetia", [("S02 (puffcap)", 12, "Nature", "frame"), ("2nd member", None, "", "")]),
        ("long-walker", "fanalia", [("S03 (glowtail)", 23, "", "frame"), ("2nd member", None, "", "")]),
        ("swimmer", "aletia", [("B, a cut plan", None, "", "gen")]),
        ("flutterer", "volanta", [("C, S12 plan", None, "", "gen")]),
    ]
    gen = {e["family"]: e for e in examples}
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 H" width="1000" height="H" font-family="system-ui, sans-serif">',
           f'<style>text{{fill:{INK}}}.h{{font-size:15px;font-weight:600}}.l{{font-size:13px;font-weight:600}}.t{{font-size:12px}}.s{{font-size:11px;fill:{MUTED}}}</style>',
           f'<rect width="100%" height="100%" fill="{BG}"/>',
           '<text x="24" y="26" class="h">The generative taxonomy: each level is read off the locked frame, never picked before it (Proposal)</text>']
    cols = [(24, "Body plan", ["segments · symmetry · limbs · covering", f"{plans['built']} build in the catalogue"]),
            (284, "Clan", ["plan + anchor colour + covering finish", "+ a defining feature (and its branch loci)"]),
            (560, "Species", ["own frame: fixed parts, open chapters,", "colour pool, sealed chapter and its find"]),
            (840, "Individuals", ["copies at the open parts"])]
    for x, head, subs in cols:
        out.append(f'<text x="{x}" y="56" class="l">{head}</text>')
        for k, sub in enumerate(subs):
            out.append(f'<text x="{x}" y="{72 + 14 * k}" class="s">{escape(sub)}</text>')
    y, last_plan = 104, None
    for plan, fam, species in rows:
        f = FAMILIES[fam]
        sk = SKELETONS[plan]
        h = 30 * len(species) + 10
        if plan != last_plan:
            out.append(f'<rect x="24" y="{y}" width="220" height="{h - 6}" rx="6" fill="#e9e3d6"/>'
                       f'<text x="34" y="{y + 20}" class="t" style="font-weight:600">{escape(sk["name"])}</text>'
                       f'<text x="34" y="{y + 36}" class="s">{escape(sk["code"])} · {escape(sk["states"])}</text>')
        else:
            out.append(f'<line x1="134" y1="{y - 16}" x2="134" y2="{y + 8}" stroke="{MUTED}" stroke-dasharray="3 3"/>')
        out.append(f'<line x1="244" y1="{y + 18}" x2="284" y2="{y + 18}" stroke="{MUTED}"/>')
        hexes = {"charcoal": "#3b3a40", "coral": "#f0775e", "lagoon": "#269fa5", "periwinkle": "#8b93e0", "cobalt": "#3c63c8", "marigold": "#e8b83f"}
        out.append(f'<rect x="284" y="{y}" width="250" height="{h - 6}" rx="6" fill="#fff" stroke="#d8d1c2"/>'
                   f'<rect x="294" y="{y + 10}" width="14" height="14" rx="3" fill="{hexes[f["anchor"]]}"/>'
                   f'<text x="316" y="{y + 22}" class="t" style="font-weight:600">{ {"trebola": "C01", "bonetia": "C02", "fanalia": "C03", "algodina": "C07 type", "aletia": "cut", "volanta": "C12 type"}.get(fam, fam)}</text>'
                   f'<text x="294" y="{y + 40}" class="s">{escape(f["covering"])} · {escape(f["feature"])}</text>')
        for j, (name, n, sealed, kind) in enumerate(species):
            sy = y + j * 30
            e = gen.get(fam) if kind == "gen" else None
            if e:
                n, sealed = e["traits"], e["sealedChapter"] or ""
            fill = "#fff" if kind else BG
            dash = '' if kind else ' stroke-dasharray="4 3"'
            out.append(f'<line x1="534" y1="{y + 18}" x2="560" y2="{sy + 14}" stroke="{MUTED}"/>'
                       f'<rect x="560" y="{sy}" width="260" height="26" rx="5" fill="{fill}" stroke="#d8d1c2"{dash}/>')
            label = name if kind else "a later member, same rule"
            sealed = {"Temperament": "Ways", "Nature": "Ways"}.get(sealed, sealed)
            detail = (f"{n} traits" + (f" · {sealed} sealed" if sealed else "")) if kind else ""
            out.append(f'<text x="570" y="{sy + 17}" class="t"{"" if kind else f" style=\"fill:{MUTED}\""}>{escape(label)}</text>'
                       f'<text x="650" y="{sy + 17}" class="s">{escape(detail)}</text>')
            if kind:
                g = e["genotypes"] if e else {"S01 (hopper)": 243, "S02 (puffcap)": 23245229340, "S03 (glowtail)": 480302832950397187200}.get(name)  # from the frames
                if g:
                    out.append(f'<line x1="820" y1="{sy + 13}" x2="840" y2="{sy + 13}" stroke="{MUTED}"/>'
                               f'<text x="846" y="{sy + 17}" class="s">{fmt(g)} genotypes</text>')
        y += h
        last_plan = plan
    y += 14
    for line in [
        "Breeding stays inside one species box. A clan is a resemblance (face part, anchor colour, pod pattern, stamp border half), never a breeding group.",
        f"Catalogue6: {plans['built']} of {plans['tried']} plans build ({plans['skeletonsBuilt']} skeletons × 3 coverings); 360 to 1,440 clan signatures per plan.",
        "S01 to S03 are the species-frames files hopper, puffcap and glowtail (working ids); A to C are generated here (examples.json). V1 roster: §3.",
        "Generated by taxonomy.py through the species-frame method and the workbench resolver; every species built 200 random individuals.",
    ]:
        out.append(f'<text x="24" y="{y}" class="s">{escape(line)}</text>')
        y += 16
    out.append("</svg>")
    return "\n".join(out).replace("H", str(y + 4), 2) + "\n"


def fmt(n):
    if n < 10_000:
        return f"{n:,}"
    e = len(str(n)) - 1
    return f"{n / 10 ** e:.1f}×10^{e}"


def main():
    check = "--check" in sys.argv
    base = frames.resolve([])
    cat, defaults = base["catalogue"], base["defaults"]
    plans_path = HERE / "plans.json"
    if "--census" in sys.argv or not plans_path.exists():
        plans_path.write_text(json.dumps(census(cat, defaults), indent=1) + "\n")
    plans = json.loads(plans_path.read_text())
    roster = roster_check(plans)
    print(f"roster: {roster['plans']} plans, {roster['skeletons']} skeletons, {roster['bodyRigs']} body rigs, {roster['limbSets']} limb sets, {roster['coverings']} coverings, {roster['sizes']}")
    out = []
    for ex in EXAMPLES:
        rejected = []
        while True:  # rule 6: a seed whose individuals don't all build is skipped, never repaired
            try:
                sp, frame, number = generate(ex, cat, defaults)
                break
            except AssertionError as err:
                why = str(err)
                rejected.append({"seed": ex["seed"], "locked": list(ex.get("lockTraits", ())), "why": why[:160]})
                assert len(rejected) < 40, rejected
                # A trait whose copies don't all build is locked for the species (never repaired); else the next seed.
                culprit = next((t for t, word in [("eyes", "eye"), ("head", "eye"), ("snout", "muzzle"), ("feet", "terminal")]
                                if word in why and t not in ex.get("lockTraits", ())), None)
                if culprit:
                    ex = {**ex, "lockTraits": [*ex.get("lockTraits", ()), culprit]}
                else:
                    ex = {**ex, "seed": ex["seed"] + 1, "lockTraits": []}
        c = frame["counts"]
        sealed = next((ch["name"] for ch in frame["chapters"] if ch["sealed"]), None)
        out.append({
            "id": ex["id"], "family": ex["family"], "speciesNumber": number, "tier": ex["tier"], "seed": ex["seed"], "lockedByCheck": list(ex.get("lockTraits", ())), "attemptsRejected": rejected,
            "plan": SKELETONS[FAMILIES[ex["family"]]["skeleton"]]["code"] + " · " + FAMILIES[ex["family"]]["covering"],
            "traits": c["traits"], "chapters": {k: v["traits"] for k, v in c["byChapter"].items()}, "sealedChapter": sealed,
            "opensWith": FINDS.get(ex["sealed"]) if ex["sealed"] else None,
            "openTraits": [t["name"] for ch in frame["chapters"] for t in ch["traits"]],
            "locked": c["locked"], "lookTraits": sum(1 for ch in frame["chapters"] for t in ch["traits"] if t["nature"] == "look"),
            "fieldGuideLooks": c["fieldGuideLooks"], "genotypes": genotypes(frame),
            "colourPool": next((t["looks"][:-1] for ch in frame["chapters"] for t in ch["traits"] if t["id"] == "colour"), [FAMILIES[ex["family"]]["anchor"]]),
            "pod": frame["pod"], "glyph": frame["glyph"], "viability": frame["viability"],
            "nameBrief": name_brief(ex, sp, frame), "brief": frame["typeSpecimen"]["brief"],
            "_pan": pan_genome(frame, ex["family"]),
        })
        print(f"{ex['id']}: seed {ex['seed']} ({len(rejected)} skipped) #{number} {out[-1]['plan']} | traits {c['traits']} {out[-1]['chapters']} sealed {sealed} | "
              f"genotypes {fmt(out[-1]['genotypes'])} | pod {frame['pod']['sizeClass']} {frame['pod']['proportion']} "
              f"{frame['pod']['shellPattern']} | viable {frame['viability']['constructed']}/{frame['viability']['sampled']}")
        print("   brief:", frame["typeSpecimen"]["brief"])
    pan = {}
    for sid, clan in [("hopper", "trebola"), ("puffcap", "bonetia"), ("glowtail", "fanalia")]:
        pan[sid] = pan_genome(json.loads((HERE.parent / "species-frames" / f"species-{sid}.json").read_text()), clan)
    for e, ex in zip(out, EXAMPLES):
        pan[e["id"]] = e.pop("_pan")
    for k, v in pan.items():
        print(f"pan-genome {k}: {v}")
    for name, text in [("examples.json", json.dumps({"schema": "mb-taxonomy-examples/1", "examples": out, "panGenome": pan, "roster": roster}, indent=1, ensure_ascii=False) + "\n"),
                       ("taxonomy.svg", figure(out, plans))]:
        path = HERE / name
        if check:
            assert path.read_text() == text, f"{name} is stale: run taxonomy.py"
        else:
            path.write_text(text)
    print(f"plans: {plans['built']} of {plans['tried']} build; {'ok' if check else 'written'}")


if __name__ == "__main__":
    main()
