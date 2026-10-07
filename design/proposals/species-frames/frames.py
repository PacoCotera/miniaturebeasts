#!/usr/bin/env python3
"""Species frames on the real 114-pair authoring catalogue.

Reads the catalogue and resolves every genome through the generator workbench's own
resolver (v1/prototype/generator-workbench, catalogue6 / innate profile), so every
locus id, allele, guard and "switched off" state below comes from the real code.
Writes species-<id>.json beside this file and prints the counts.

    python3 design/proposals/species-frames/frames.py          # write + check
    python3 design/proposals/species-frames/frames.py --check  # check only

Needs node >= 22 (the workbench's own requirement); no npm install is needed.
The schema is described in frames-schema.md.
"""
import json, math, os, random, subprocess, sys
from html import escape
from itertools import combinations_with_replacement
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
WORKBENCH = REPO / "v1/prototype/generator-workbench"
SCHEMA = "mb-species-frame/1"
SAMPLES = int(os.environ.get("FRAME_SAMPLES", 200))  # random individuals per species, each built by the real resolver

# --- the bridge: the workbench resolves genomes; this file only classifies ---------
NODE = r"""
import fs from "node:fs";
import { innateProfilePackage } from "./innate-profile-package.mjs";
import { resolveInnateProfile } from "./innate-profile-adapter.mjs";
const request = JSON.parse(fs.readFileSync(0, "utf8"));
const pkg = innateProfilePackage();
const cat = pkg.catalogue;
const out = {
  catalogue: { id: cat.id, version: cat.version, digest: pkg.foundation.digest,
    families: cat.families.map((f) => f.id),
    loci: cat.loci.map((l) => ({ id: l.id, status: l.status, family: l.family, operator: l.operator,
      alleles: (l.alleles || []).map((a) => ({ id: a.id, value: a.value })), pairMap: l.pairMap ?? null,
      requires: l.requires ?? [], applicability: l.applicability ?? null, label: l.label })) },
  defaults: pkg.defaultGeneration.genome.loci, results: [] };
for (const item of request) {
  const genome = structuredClone(pkg.defaultGeneration.genome);
  Object.assign(genome.loci, item.loci);
  const r = resolveInnateProfile({ catalogue: pkg.foundation, genome, context: pkg.referenceContext, expressionSeed: null });
  if (r.status !== "resolved") { out.results.push({ name: item.name, status: r.status, errors: r.errors }); continue; }
  const row = { name: item.name, status: r.status, scene: r.scene.status };
  if (item.detail) {
    row.facts = r.result.facts.filter((f) => f.copyResolution === "resolved").map((f) => ({ id: f.locusId,
      state: f.state, value: f.value, prerequisites: f.prerequisites, reason: (f.reasons || []).at(-1) || "" }));
    row.brief = r.prompt.description;
    row.nodes = r.result.graph.nodes.filter((n) => n.center && n.radii).map((n) => ({ role: n.role, c: n.center, r: n.radii }));
  }
  out.results.push(row);
}
process.stdout.write(JSON.stringify(out));
"""


def resolve(requests):
    run = subprocess.run(["node", "--input-type=module", "-e", NODE], cwd=WORKBENCH,
                         input=json.dumps(requests), capture_output=True, text=True, check=True)
    return json.loads(run.stdout)


# --- the frame method ---------------------------------------------------------------
# Plan switches decide which owners exist. They are always locked: species-defining
# organization is protected. Part switches turn one small part on or off; a species
# may open them (Pip's crown, any species' markings).
PLAN_SWITCHES = {
    "development.axial-repeat", "development.symmetry", "development.attachment-repeat",
    "development.articulated-chain", "development.membrane-rooting", "development.fin-rooting",
    "development.axial-deformation", "organization.region-depth", "organization.region-layout",
    "organization.body-symmetry", "organization.region-join", "organization.head-module",
    "organization.appendage-role", "organization.appendage-groups", "organization.free-link-count",
    "anatomy.posterior-presence", "anatomy.wing-presence", "anatomy.support-pair-count",
    "appearance.fur-presence", "appearance.anatomical-covering", "appearance.covering-kind",
    "structure.ocular-pair", "cognition.innate-profile-presence",
}
PART_SWITCHES = {
    "anatomy.muzzle-presence", "anatomy.crown-presence", "anatomy.exterior-eye-presence",
    "anatomy.auricular-presence", "anatomy.axial-tail-presence", "appearance.marking-switch",
}
SWITCHES = PLAN_SWITCHES | PART_SWITCHES
ON = {"appearance.marking-switch": "on", "anatomy.muzzle-presence": "on", "anatomy.crown-presence": "on",
      "anatomy.exterior-eye-presence": "on", "anatomy.auricular-presence": "on", "anatomy.axial-tail-presence": "on"}
OFF = {k: "off" for k in ON}
DOING_FAMILIES = {"mechanics-movement", "energy-nutrition", "cognition-tendencies"}
FAMILY_ALIAS = {"Structure": "structure", "Appearance": "appearance", "Sensing and signaling": "sensing-signaling"}
RING = ["coat", "face", "shape", "legs-tail", "movement", "stamina", "temperament"]
CHAPTER_NAMES = {"coat": "Coat", "face": "Face", "shape": "Shape", "legs-tail": "Legs & tail",
                 "movement": "Movement", "stamina": "Stamina", "temperament": "Temperament"}
# The older broader records have no compatible consumer in the current construction;
# their owner is read from the catalogue's own `applicability` and `requires`.
APPLICABILITY = {
    "axial": lambda v: v["development.axial-repeat"] > 1,
    "rooted": lambda v: v["development.attachment-repeat"] > 0,
    "articulated": lambda v: v["development.articulated-chain"] > 0,
    "two-link": lambda v: v["development.articulated-chain"] == 2,
    "membrane": lambda v: v["development.membrane-rooting"] is True,
    "fin": lambda v: v["development.fin-rooting"] is True,
    "axial-actuator": lambda v: v["development.axial-deformation"] is True,
    "marked": lambda v: v["appearance.marking-switch"] is True,
    "ocular": lambda v: v["structure.ocular-pair"] is True,
    "scales": lambda v: v["appearance.covering-kind"] == "scales",
    "bilateral": lambda v: v["development.symmetry"] == "bilateral",
    "all": lambda v: True,
}


def h(allele):
    """A locked part is homozygous: both copies equal, so no cross can change it."""
    return [allele, allele]


# --- the three species --------------------------------------------------------------
# Each open trait: (chapter, trait id, player name, loci, player looks, species allele
# pools {locus: [alleles]} or None, shapeable override or None).
HOPPER = dict(
    id="hopper", name="Hopper", plural="hoppers", order=1,
    summary="The starter: Pip as in the approved art. Exactly the five open traits of the Pip proof.",
    plan={
        "development.axial-repeat": "single", "development.symmetry": "bilateral",
        "development.attachment-repeat": "multiple", "development.articulated-chain": "linked",
        "development.membrane-rooting": "off", "development.fin-rooting": "off", "development.axial-deformation": "off",
        "organization.region-depth": "one", "organization.region-layout": "serial", "organization.body-symmetry": "bilateral",
        "organization.region-join": "broad", "organization.head-module": "head", "organization.appendage-role": "contact",
        "organization.appendage-groups": "zero", "organization.free-link-count": "one",
        "anatomy.posterior-presence": "off", "anatomy.wing-presence": "off", "anatomy.support-pair-count": "two",
        "appearance.fur-presence": "off", "appearance.anatomical-covering": "skin", "appearance.covering-kind": "skin",
        "structure.ocular-pair": "paired", "cognition.innate-profile-presence": "on",
        "anatomy.muzzle-presence": "on", "anatomy.exterior-eye-presence": "on", "anatomy.auricular-presence": "off",
        "anatomy.axial-tail-presence": "off",
    },
    fixed={
        "appearance.body-palette": "charcoal", "appearance.underside-palette": "cream",
        "growth.core-half-length": "medium", "growth.core-width-ratio": "high", "growth.core-depth-ratio": "high",
        "growth.head-length-ratio": "large", "growth.head-width-ratio": "high", "growth.head-depth-ratio": "high",
        "growth.head-lift-ratio": "low", "growth.muzzle-projection-ratio": "short", "growth.muzzle-width-ratio": "high",
        "growth.exterior-eye-spacing-ratio": "wide", "anatomy.crown-form": "pointed", "growth.crown-height-ratio": "high",
        "growth.support-drop-ratio": "short", "growth.support-radius-ratio": "stout", "growth.support-splay-ratio": "low",
        "growth.terminal-length-ratio": "broad", "growth.terminal-depth-ratio": "high",
        "anatomy.contact-terminal-form": "pad", "anatomy.region-longitudinal-form": "barrel",
        "appearance.marking-layout": "patches", "appearance.marking-extent": "high", "appearance.marking-scale": "high",
        "appearance.marking-contrast": "high", "cognition.exploration-tendency": "seeking",
        "cognition.arousal-threshold": "low",
    },
    open=[
        ("coat", "markings", "Markings", ["appearance.marking-switch"], ["plain", "pale patches"], None, None),
        ("face", "crown", "Crown", ["anatomy.crown-presence"], ["bare head", "leaf crest"], None, None),
        ("face", "eye-rings", "Eye rings", ["growth.exterior-eye-size-ratio"],
         ["thin rings", "between", "wide pale rings"], None, None),
        ("movement", "drive", "Drive", ["movement.cycle-rate"], ["steady", "between", "bursts"], None, None),
        ("stamina", "efficiency", "Efficiency", ["energy.action-efficiency"],
         ["thrifty", "between", "ordinary"], None, None),
    ],
    sealed={},
    pod=dict(colourPair=["appearance.body-palette:charcoal", "appearance.underside-palette:cream"]),
    glyph=["#.#.#", ".###.", "#####", "#####", "#.#.#"],
    pending=[
        {"trait": "cream belly", "why": "no belly field: ordered colour fields are local, never an inferred underside"},
        {"trait": "orange eyes", "why": "eye rim and pupil are fixed inks"},
        {"trait": "a third crest leaf", "why": "the crown is a pair of head-rooted surfaces"},
    ],
)

PUFFCAP = dict(
    id="puffcap", name="Puffcap", plural="puffcaps", order=2,
    summary="A radial, capped plan: a round furred body, a face, three flaps for a cap, no legs. It waddles.",
    plan={
        "development.axial-repeat": "single", "development.symmetry": "radial",
        "development.attachment-repeat": "none", "development.articulated-chain": "unlinked",
        "development.membrane-rooting": "on", "development.fin-rooting": "off", "development.axial-deformation": "on",
        "organization.region-depth": "one", "organization.region-layout": "serial", "organization.body-symmetry": "radial",
        "organization.region-join": "broad", "organization.head-module": "head", "organization.appendage-role": "none",
        "organization.appendage-groups": "zero", "organization.free-link-count": "one",
        "anatomy.posterior-presence": "off", "anatomy.wing-presence": "on", "anatomy.support-pair-count": "two",
        "appearance.fur-presence": "on", "appearance.anatomical-covering": "skin", "appearance.covering-kind": "skin",
        "structure.ocular-pair": "paired", "cognition.innate-profile-presence": "on",
        "anatomy.muzzle-presence": "off", "anatomy.crown-presence": "off", "anatomy.exterior-eye-presence": "on",
        "anatomy.auricular-presence": "off", "anatomy.axial-tail-presence": "off",
    },
    fixed={
        "growth.core-half-length": "large", "growth.head-length-ratio": "small", "growth.head-width-ratio": "low",
        "growth.head-depth-ratio": "low", "growth.head-lift-ratio": "low", "growth.exterior-eye-size-ratio": "large",
        "growth.exterior-eye-spacing-ratio": "wide", "appearance.underside-palette": "cream",
        "movement.membrane-stroke": "low", "movement.membrane-coordination": "high",
        "energy.actuator-capacity": "low", "energy.reserve-capacity": "high", "energy.action-efficiency": "low",
    },
    open=[
        ("coat", "colour", "Colour", ["appearance.body-palette"], ["coral", "raspberry", "marigold", "plum", "two side by side"],
         {"appearance.body-palette": ["coral", "raspberry", "marigold", "plum"]}, None),
        ("coat", "spots", "Spots", ["appearance.marking-switch", "appearance.marking-layout", "appearance.marking-extent",
                                    "appearance.marking-scale", "appearance.marking-orientation", "appearance.marking-contrast"],
         ["bare", "bands", "spots", "bands and spots"], None, None),
        ("coat", "fluff", "Fluff", ["appearance.fur-length", "appearance.fur-flow"],
         ["short and straight", "between", "long and swept"], None, None),
        ("shape", "roundness", "Roundness", ["growth.radial-cross-radius"], ["slim", "between", "plump"], None, None),
        ("shape", "body", "Body", ["anatomy.region-longitudinal-form"], ["egg", "barrel", "pear"], None, None),
        ("shape", "cap-size", "Cap size", ["growth.wing-span-ratio", "growth.wing-chord-ratio"],
         ["small cap", "between", "wide cap"], None, None),
        ("shape", "cap-sweep", "Cap sweep", ["growth.wing-sweep-ratio"], ["straight", "between", "swept back"], None, None),
        ("movement", "pace", "Pace", ["movement.cycle-rate"], ["steady", "between", "brisk"], None, None),
        ("movement", "turning", "Turning", ["movement.turn-control"], ["wide turns", "between", "tight turns"], None, None),
        ("movement", "waddle", "Waddle", ["movement.axial-amplitude", "movement.axial-phase"],
         ["slight sway", "between", "big waddle"], None, None),
        ("temperament", "curiosity", "Curiosity", ["cognition.exploration-tendency"], ["reserved", "between", "seeking"], None, None),
        ("temperament", "nerve", "Nerve", ["cognition.arousal-threshold"], ["jumpy", "between", "unflappable"], None, None),
    ],
    sealed={"temperament": "a vybronic crystal, dug up where a puffcap partner sniffs out a buried pod"},
    pod=dict(colourPair=["appearance.body-palette:coral", "appearance.body-palette:marigold"]),
    glyph=[".###.", "#####", "#####", ".#.#.", ".###."],
    pending=[
        {"trait": "a cap on top", "why": "the radial triple of flaps puts one flap under the body; a single dorsal sheet is not in the catalogue"},
        {"trait": "spots on the cap and a cap colour of its own", "why": "markings are primary-body only and a radial plan uses one pigment"},
    ],
)

GLOWTAIL = dict(
    id="glowtail", name="Glowtail", plural="glowtails", order=3,
    summary="A tailed, scaled burrower: a low two-part body, four short legs, a crest, a long tail that carries the glow.",
    plan={
        "development.axial-repeat": "chain", "development.symmetry": "bilateral",
        "development.attachment-repeat": "multiple", "development.articulated-chain": "linked",
        "development.membrane-rooting": "off", "development.fin-rooting": "off", "development.axial-deformation": "on",
        "organization.region-depth": "two", "organization.region-layout": "serial", "organization.body-symmetry": "bilateral",
        "organization.region-join": "narrow", "organization.head-module": "head", "organization.appendage-role": "contact",
        "organization.appendage-groups": "zero", "organization.free-link-count": "one",
        "anatomy.posterior-presence": "off", "anatomy.wing-presence": "off", "anatomy.support-pair-count": "two",
        "appearance.fur-presence": "off", "appearance.anatomical-covering": "scales", "appearance.covering-kind": "scales",
        "structure.ocular-pair": "paired", "cognition.innate-profile-presence": "on",
        "anatomy.muzzle-presence": "on", "anatomy.crown-presence": "on", "anatomy.exterior-eye-presence": "on",
        "anatomy.auricular-presence": "off", "anatomy.axial-tail-presence": "on",
    },
    fixed={
        "growth.core-half-length": "small", "growth.head-length-ratio": "medium", "growth.head-width-ratio": "high",
        "growth.head-depth-ratio": "high", "growth.head-lift-ratio": "low", "anatomy.crown-form": "pointed",
        "growth.join-throat-ratio": "broad", "growth.support-splay-ratio": "high",
        "anatomy.region-cross-exponent": "round", "anatomy.region-longitudinal-form": "tapered",
    },
    open=[
        ("coat", "colour", "Colour", ["appearance.body-palette"], ["lagoon", "jade", "marigold", "periwinkle", "two side by side"],
         {"appearance.body-palette": ["lagoon", "jade", "marigold", "periwinkle"]}, None),
        ("coat", "leg-colour", "Leg colour", ["appearance.underside-palette"], ["milk-mint", "cream", "ice", "slate", "two side by side"],
         {"appearance.underside-palette": ["milk-mint", "cream", "ice", "slate"]}, None),
        ("coat", "markings", "Markings", ["appearance.marking-switch", "appearance.marking-layout", "appearance.marking-extent",
                                          "appearance.marking-scale", "appearance.marking-orientation", "appearance.marking-contrast"],
         ["plain", "stripes", "spots", "stripes and spots"], None, None),
        ("coat", "scales", "Scales", ["appearance.anatomical-covering-extent", "appearance.anatomical-scale-size"],
         ["a few fine scales", "between", "many coarse scales"], None, None),
        ("face", "crest", "Crest", ["growth.crown-height-ratio"], ["low crest", "between", "tall crest"], None, None),
        ("face", "eyes", "Eyes", ["growth.exterior-eye-size-ratio", "growth.exterior-eye-spacing-ratio"],
         ["small, close", "between", "big, wide"], None, None),
        ("face", "snout", "Snout", ["growth.muzzle-projection-ratio", "growth.muzzle-width-ratio"],
         ["short, narrow", "between", "long, broad"], None, None),
        ("shape", "build", "Build", ["growth.core-width-ratio", "growth.core-depth-ratio"], ["slim", "between", "stout"], None, None),
        ("shape", "hind-body", "Hind body", ["growth.region-taper"], ["small", "between", "full"], None, None),
        ("shape", "back-line", "Back line", ["growth.region-bend"], ["dipping", "level", "arched"], None, None),
        ("legs-tail", "legs", "Legs", ["growth.support-drop-ratio", "growth.support-radius-ratio"],
         ["short, fine", "between", "long, stout"], None, None),
        ("legs-tail", "claws", "Claws", ["anatomy.contact-terminal-form", "growth.terminal-length-ratio", "growth.terminal-depth-ratio"],
         ["round feet", "pads", "digging wedges"], None, False),
        ("legs-tail", "tail", "Tail", ["growth.axial-tail-length-ratio", "growth.axial-tail-width-ratio"],
         ["short, thin", "between", "long, thick"], None, None),
        ("legs-tail", "tail-curl", "Tail curl", ["growth.axial-tail-bend"], ["hangs", "straight", "curls up"], None, None),
        ("movement", "pace", "Pace", ["movement.cycle-rate"], ["steady", "between", "quick"], None, None),
        ("movement", "stride", "Stride", ["movement.stride-preference", "movement.contact-phase"],
         ["short steps", "between", "long steps"], None, None),
        ("movement", "weave", "Weave", ["movement.axial-amplitude", "movement.axial-phase"],
         ["straight scurry", "between", "weaving glide"], None, None),
        ("movement", "turning", "Turning", ["movement.turn-control"], ["wide turns", "between", "tight turns"], None, None),
        ("stamina", "strength", "Strength", ["energy.actuator-capacity"], ["light", "between", "strong"], None, None),
        ("stamina", "reserve", "Reserve", ["energy.reserve-capacity"], ["tires soon", "between", "goes long"], None, None),
        ("stamina", "thrift", "Thrift", ["energy.action-efficiency"], ["thrifty", "between", "ordinary"], None, None),
        ("temperament", "curiosity", "Curiosity", ["cognition.exploration-tendency"], ["reserved", "between", "seeking"], None, None),
        ("temperament", "nerve", "Nerve", ["cognition.arousal-threshold"], ["jumpy", "between", "unflappable"], None, None),
    ],
    sealed={},
    overrides={"claws": "breeding only: the claws are how a glowtail digs, a field ability, so they change like a doing"},
    pod=dict(colourPair=["appearance.body-palette:lagoon", "appearance.body-palette:marigold"]),
    glyph=["..#..", ".###.", "..#..", "..#..", "#####"],
    pending=[
        {"trait": "glow", "chapter": "Glow (after Temperament)", "kind": "heritable-doing",
         "why": "no emission locus yet; until one exists every glowtail glows gold at dusk as part of the frame"},
        {"trait": "a glowing bulb at the tail tip", "why": "the axial tail tapers to a point; a tip bulb is not in the catalogue"},
    ],
)
SPECIES = [HOPPER, PUFFCAP, GLOWTAIL]


# --- classification -------------------------------------------------------------------
def looks_for(locus, pool):
    op, alleles = locus["operator"], {a["id"]: a["value"] for a in locus["alleles"]}
    pairs = list(combinations_with_replacement(pool, 2))
    if op == "partition-map":
        return [a if a == b else f"{a} and {b}" for a, b in pairs]
    if op == "copy-mean":
        seen, out = set(), []
        for a, b in pairs:
            m = round((alleles[a] + alleles[b]) / 2, 4)
            if m not in seen:
                seen.add(m)
                out.append(a if a == b else f"between {a} and {b}")
        return out
    if op == "pair-map":
        out = []
        for a, b in pairs:
            key = "|".join(sorted([a, b]))
            v = locus["pairMap"][key]
            v = {True: "on", False: "off"}.get(v, v) if isinstance(v, bool) else v
            if str(v) not in out:
                out.append(str(v))
        return out
    if op in ("dominant-enable", "recessive-enable"):
        return pool[:]
    raise ValueError(op)


def build(sp, cat, defaults):
    loci = {l["id"]: l for l in cat["loci"] if l["status"] == "validated"}
    assert len(loci) == 114, len(loci)
    allele_ids = {i: [a["id"] for a in l["alleles"]] for i, l in loci.items()}
    trait_of, pools = {}, {}
    for ch, tid, tname, ids, tl, pool, shp in sp["open"]:
        for i in ids:
            assert i in loci, f"{sp['id']}: unknown locus {i}"
            assert i not in trait_of, f"{sp['id']}: {i} in two traits"
            assert i not in PLAN_SWITCHES, f"{sp['id']}: plan switch {i} cannot be opened"
            trait_of[i] = (ch, tid)
            pools[i] = (pool or {}).get(i, allele_ids[i])
            assert set(pools[i]) <= set(allele_ids[i]), i
    for i in list(sp["plan"]) + list(sp["fixed"]):
        assert i in loci, f"{sp['id']}: unknown locus {i}"
        assert i not in trait_of, f"{sp['id']}: {i} is both fixed and open"
    # locked copies: plan + fixed + catalogue default starting copy, always homozygous
    locked = {}
    for i in loci:
        if i in trait_of:
            continue
        a = sp["plan"].get(i) or sp["fixed"].get(i) or defaults[i][0]
        locked[i] = h(a)
    open_switches = [i for i in trait_of if i in PART_SWITCHES]

    def genome(state, rng=None):
        g = dict(locked)
        for i in trait_of:
            if rng:
                g[i] = [rng.choice(pools[i]), rng.choice(pools[i])]
            elif i in open_switches:
                g[i] = h((ON if state == "on" else OFF)[i])
            else:
                g[i] = h(pools[i][0])
        return g

    rng = random.Random(sp["id"])
    reqs = [{"name": "all-on", "loci": genome("on"), "detail": True},
            {"name": "all-off", "loci": genome("off"), "detail": True}]
    reqs += [{"name": f"sample-{n}", "loci": genome(None, rng)} for n in range(SAMPLES)]
    res = resolve(reqs)["results"]
    for r in res:
        assert r["status"] == "resolved" and r["scene"] == "constructed", (sp["id"], r["name"], r.get("errors"))
    on = {f["id"]: f for f in res[0]["facts"]}
    off = {f["id"]: f for f in res[1]["facts"]}
    assert set(on) == set(loci)

    def active(facts, i):
        f, l = facts[i], loci[i]
        if f["state"] != "unimplemented":
            return f["state"] == "expressed"
        # A broader record with no current consumer: its owner is the catalogue's own
        # `applicability` (its `requires` also lists value inputs, which are not owners).
        app = l["applicability"] or "all"
        if app not in APPLICABILITY:
            raise ValueError(f"{i}: applicability {app}")
        return APPLICABILITY[app]({k: v["value"] for k, v in facts.items()})

    def guard(i):
        f = on[i]
        if f["state"] != "unimplemented":
            return f["reason"] if f["state"] == "inactive" else "drawn by the current construction"
        app = loci[i]["applicability"] or "all"
        return (f"no consumer yet (behaviour layer)" if FAMILY_ALIAS.get(loci[i]["family"], loci[i]["family"]) in DOING_FAMILIES
                else "no consumer yet in the current construction") + (
            "" if app == "all" else f"; owner is catalogue applicability '{app}', " + ("on" if active(on, i) else "off here"))

    rows, chapters_used = [], {}
    for i, l in loci.items():
        fam = FAMILY_ALIAS.get(l["family"], l["family"])
        doing = fam in DOING_FAMILIES
        on_active, off_active = active(on, i), active(off, i)
        row = {"id": i, "family": fam, "switch": i in SWITCHES}
        if i in trait_of:
            ch, tid = trait_of[i]
            assert on_active, f"{sp['id']}: open locus {i} is switched off by the frame (an invisible trait)"
            if not doing:
                assert on[i]["state"] == "expressed", f"{sp['id']}: look {i} has no drawing consumer"
            nature = "doing" if doing else "look"
            trait = next(t for t in sp["open"] if t[1] == tid)
            shapeable = (nature == "look") if trait[6] is None else trait[6]
            if ch in sp["sealed"]:
                kind = "sealed"
            elif not off_active and i not in open_switches:
                kind = "sleeping"
            else:
                kind = f"heritable-{nature}"
            row.update(kind=kind, nature=nature, chapter=ch, trait=tid, shapeable=shapeable,
                       alleles=pools[i], looks=looks_for(l, pools[i]))
            chapters_used.setdefault(ch, []).append(i)
        else:
            if not on_active:
                why = "owner-off"
            elif i in SWITCHES:
                why = "switch"
            elif on[i]["state"] == "unimplemented" and not doing:
                why = "no-consumer"
            else:
                why = "fixed"
            row.update(kind="locked", lockReason=why, chapter=None, trait=None, shapeable=False,
                       copies=locked[i], looks=looks_for(l, [locked[i][0]]))
            assert locked[i][0] == locked[i][1]
        row["guard"] = guard(i)
        if row["kind"] == "sleeping":
            switch = next(j for j in sp["open"] if j[1] == row["trait"])[3]
            switch = next((j for j in switch if j in open_switches), open_switches[0])
            row["guard"] = f"asleep in any individual whose {switch} is off; drawn when it is on"
        rows.append(row)

    # chapters in ring order, traits in listed order
    chapters = []
    for ch in RING:
        traits = [t for t in sp["open"] if t[0] == ch]
        if not traits:
            continue
        chapters.append({
            "id": ch, "name": CHAPTER_NAMES[ch], "sealed": ch in sp["sealed"],
            **({"opensWith": sp["sealed"][ch]} if ch in sp["sealed"] else {}),
            "traits": [{"id": t[1], "name": t[2], "loci": t[3], "looks": t[4],
                        "nature": next(r["nature"] for r in rows if r["id"] == t[3][0]),
                        "shapeable": next(r["shapeable"] for r in rows if r["id"] == t[3][0]),
                        **({"override": sp["overrides"][t[1]]} if t[1] in sp.get("overrides", {}) else {})}
                       for t in traits]})

    # pod parameters from the frame
    plan = {**sp["plan"], **sp["fixed"]}
    size = {"small": "small", "medium": "medium", "large": "large"}[locked["growth.core-half-length"][0]]
    nodes = res[0]["nodes"]
    xs = [n["c"][0] + s * max(n["r"]) for n in nodes for s in (-1, 1)]
    zs = [n["c"][2] + s * max(n["r"]) for n in nodes for s in (-1, 1)]
    ratio = (max(zs) - min(zs)) / (max(xs) - min(xs))
    if plan["organization.body-symmetry"] == "radial":
        shell = "segments"
    elif plan["appearance.fur-presence"] == "on":
        shell = "soft ribs"
    elif plan["appearance.anatomical-covering"] == "scales":
        shell = "plates"
    else:
        shell = "smooth dots"
    hexes = {}
    for l in loci.values():
        if l["operator"] == "partition-map":
            for a in l["alleles"]:
                hexes[f"{l['id']}:{a['id']}"] = a["value"]
    colour_pair = [{"pigment": p.split(":")[1], "hex": hexes[p]} for p in sp["pod"]["colourPair"]]
    g = sp["glyph"]
    assert len(g) == 5 and all(len(r) == 5 and r == r[::-1] and set(r) <= {"#", "."} for r in g), sp["id"]

    def count(pred):
        return sum(1 for r in rows if pred(r))
    counts = {
        "locked": count(lambda r: r["kind"] == "locked"),
        "lockedBy": {k: count(lambda r, k=k: r.get("lockReason") == k) for k in ["switch", "owner-off", "fixed", "no-consumer"]},
        "heritableLook": count(lambda r: r["kind"] == "heritable-look"),
        "heritableDoing": count(lambda r: r["kind"] == "heritable-doing"),
        "sleeping": count(lambda r: r["kind"] == "sleeping"),
        "sealed": count(lambda r: r["kind"] == "sealed"),
        "byChapter": {c["name"]: {"loci": len(chapters_used[c["id"]]), "traits": len(c["traits"])} for c in chapters},
        "traits": sum(len(c["traits"]) for c in chapters),
        "fieldGuideLooks": sum(len(r["looks"]) for r in rows if r["kind"] != "locked"),
        "ringBitsPerTrack": sum(math.ceil(math.log2(len(allele_ids[r["id"]]))) for r in rows if r["kind"] != "locked"),
    }
    counts["total"] = counts["locked"] + counts["heritableLook"] + counts["heritableDoing"] + counts["sleeping"] + counts["sealed"]
    assert counts["total"] == 114 and sum(counts["lockedBy"].values()) == counts["locked"]
    fams = {FAMILY_ALIAS.get(l["family"], l["family"]) for l in loci.values()}
    not_yet = {"domains": [f for f in cat["families"] if f not in fams],
               "drafts": [l["id"] for l in cat["loci"] if l["status"] == "draft"],
               "pending": sp["pending"]}
    return {
        "schema": SCHEMA,
        "species": {"id": sp["id"], "name": sp["name"], "plural": sp["plural"], "order": sp["order"], "summary": sp["summary"]},
        "catalogue": {"id": cat["id"], "version": cat["version"], "foundationDigest": cat["digest"],
                      "pairs": len(loci), "drafts": len(not_yet["drafts"])},
        "glyph": g,
        "pod": {"sizeClass": size, "proportion": "tall" if ratio >= 0.75 else "squat",
                "heightToLength": round(ratio, 2), "shellPattern": shell, "colourPair": colour_pair},
        "chapters": chapters,
        "counts": counts,
        "notYet": not_yet,
        "typeSpecimen": {"genome": "every open part switch on, other open parts at the first allele of the species pool",
                         "brief": res[0]["brief"]},
        "viability": {"sampled": SAMPLES, "constructed": sum(1 for r in res[2:] if r["scene"] == "constructed"),
                      "rule": "random copies from the species pools at every open locus; built by the workbench resolver"},
        "loci": rows,
    }


# --- the figure: one bar of 114 per species ----------------------------------------
COLOURS = {"switch": "#77736a", "owner-off": "#b9b4a8", "fixed": "#d3cdbf", "no-consumer": "#e6e1d6",
           "coat": "#c0558a", "face": "#d08a2a", "shape": "#4f8f5b", "legs-tail": "#2f8f9a",
           "movement": "#4a6fc0", "stamina": "#8a5cc0", "temperament": "#a0624a"}
LOCK_WORDS = {"switch": "plan switches", "owner-off": "switched off here", "fixed": "fixed by the species",
              "no-consumer": "carried, not drawn yet"}


def figure(frames):
    unit, x0, w = 7.2, 120, None
    out = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 {H}" width="1000" height="{H}" font-family="system-ui, sans-serif">',
           '<style>.bg{fill:#f7f4ec}text{fill:#2e2e2e}.h{font-size:15px;font-weight:600}.t{font-size:12px}.s{font-size:11px;fill:#6f6a5e}</style>',
           '<rect width="100%" height="100%" class="bg"/>',
           '<text x="30" y="26" class="h">Three species frames on the 114 paired loci of the authoring catalogue (Proposal)</text>',
           '<defs>' + "".join(
               f'<pattern id="z-{k}" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">'
               f'<rect width="5" height="5" fill="#f7f4ec"/><line x1="0" y1="0" x2="0" y2="5" stroke="{c}" stroke-width="2.4"/></pattern>'
               for k, c in COLOURS.items()) + '</defs>']
    y = 52
    for f in frames:
        rows = f["loci"]
        order = [("locked", k) for k in LOCK_WORDS] + [(None, c) for c in RING]
        x = x0
        g = f["glyph"]
        for gy, line in enumerate(g):
            for gx, ch in enumerate(line):
                if ch == "#":
                    out.append(f'<rect x="{30 + gx * 7}" y="{y + 4 + gy * 7}" width="6" height="6" fill="#2e2e2e"/>')
        for i, sw in enumerate(f["pod"]["colourPair"]):
            out.append(f'<rect x="{30 + i * 18}" y="{y + 44}" width="16" height="10" fill="{sw["hex"]}"/>')
        out.append(f'<text x="70" y="{y + 18}" class="t" style="font-weight:600">{f["species"]["name"]}</text>')
        for kind, key in order:
            if kind == "locked":
                n = sum(1 for r in rows if r.get("lockReason") == key)
                parts = [(n, COLOURS[key], False)]
            else:
                ch = [r for r in rows if r["chapter"] == key]
                parts = [(sum(1 for r in ch if r["kind"] in ("heritable-look", "heritable-doing")), COLOURS[key], False),
                         (sum(1 for r in ch if r["kind"] == "sleeping"), f"url(#z-{key})", False),
                         (sum(1 for r in ch if r["kind"] == "sealed"), f"url(#z-{key})", True)]
            for n, fill, sealed in parts:
                if not n:
                    continue
                stroke = 'stroke="#2e2e2e" stroke-width="2"' if sealed else 'stroke="#f7f4ec"'
                out.append(f'<rect x="{x:.1f}" y="{y}" width="{n * unit:.1f}" height="30" fill="{fill}" {stroke}/>')
                if n * unit >= 18:
                    dark = kind == "locked" and key in ("fixed", "no-consumer")
                    out.append(f'<text x="{x + n * unit / 2:.1f}" y="{y + 20}" class="t" text-anchor="middle" '
                               f'style="fill:{"#2e2e2e" if dark or fill.startswith("url") else "#fff"}">{n}</text>')
                x += n * unit
        c = f["counts"]
        heritable = 114 - c["locked"]
        chapters = " · ".join(f'{escape(k)} {v["traits"]}' for k, v in c["byChapter"].items())
        sealed = [ch["name"] for ch in f["chapters"] if ch["sealed"]]
        out.append(f'<text x="{x0}" y="{y + 46}" class="s">locked {c["locked"]} · heritable {heritable} in {c["traits"]} traits: '
                   f'{chapters}{" (sealed: " + ", ".join(sealed) + ")" if sealed else ""} · pod {f["pod"]["sizeClass"]}, '
                   f'{f["pod"]["proportion"]}, {f["pod"]["shellPattern"]}</text>')
        y += 74
    lx = x0
    for key, word in LOCK_WORDS.items():
        out.append(f'<rect x="{lx}" y="{y}" width="12" height="12" fill="{COLOURS[key]}"/><text x="{lx + 16}" y="{y + 10}" class="s">{word}</text>')
        lx += 150
    y += 20
    lx = x0
    for key in RING:
        out.append(f'<rect x="{lx}" y="{y}" width="12" height="12" fill="{COLOURS[key]}"/><text x="{lx + 16}" y="{y + 10}" class="s">{escape(CHAPTER_NAMES[key])}</text>')
        lx += 95
    out.append(f'<rect x="{lx}" y="{y}" width="12" height="12" fill="url(#z-coat)"/><text x="{lx + 16}" y="{y + 10}" class="s">sleeping</text>')
    out.append(f'<rect x="{lx + 80}" y="{y}" width="12" height="12" fill="url(#z-temperament)" stroke="#2e2e2e" stroke-width="2"/>'
               f'<text x="{lx + 96}" y="{y + 10}" class="s">sealed</text>')
    y += 30
    out.append(f'<text x="30" y="{y}" class="s">Not in the bars: 6 draft loci and four domains with no loci yet (maintenance, affinities, '
               f'reproduction, fantastic physiology), shown as "not yet".</text>')
    y += 16
    out.append(f'<text x="30" y="{y}" class="s">At left: the draft 5×5 glyph and the pod colour pair. Generated by frames.py from the workbench resolver.</text>')
    out.append("</svg>")
    return "\n".join(out).replace("{H}", str(y + 16)) + "\n"


def main():
    check = "--check" in sys.argv
    base = resolve([])
    cat, defaults = base["catalogue"], base["defaults"]
    frames = []
    for sp in SPECIES:
        frame = build(sp, cat, defaults)
        frames.append(frame)
        path = HERE / f"species-{sp['id']}.json"
        text = json.dumps(frame, indent=1, ensure_ascii=False) + "\n"
        if check:
            assert path.read_text() == text, f"{path.name} is stale: run frames.py"
        else:
            path.write_text(text)
        c = frame["counts"]
        print(f"{sp['name']}: locked {c['locked']} {c['lockedBy']} | look {c['heritableLook']} doing {c['heritableDoing']}"
              f" sleeping {c['sleeping']} sealed {c['sealed']} = {c['total']} | traits {c['traits']}"
              f" | chapters {c['byChapter']} | looks {c['fieldGuideLooks']} bits/track {c['ringBitsPerTrack']}"
              f" | pod {frame['pod']} | viable {frame['viability']['constructed']}/{frame['viability']['sampled']}")
        print("   not yet:", frame["notYet"]["domains"], len(frame["notYet"]["drafts"]), "drafts")
        print("   brief:", frame["typeSpecimen"]["brief"])
    svg, path = figure(frames), HERE / "frames.svg"
    if check:
        assert path.read_text() == svg, "frames.svg is stale: run frames.py"
    else:
        path.write_text(svg)
    print("ok" if check else "written")


if __name__ == "__main__":
    main()
