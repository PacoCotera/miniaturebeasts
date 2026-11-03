"""Builds S20's `genome` block (chunk 7, pin 11) from the gene tables that S20's individuals were drawn from (s20genes) and the typed moves below, and writes it into species_v1/S20.json.
python -m wb.make_genome_block [--check]   (--check only reports whether the file already holds this block)
The block names the catalogue's records (genome-string proposal A.3, with the game designer's pin 11 rulings: the whisker switch added, the hue shift folded into the hue, the rosette renamed),
in the frame's ring order, in the chapters coat, face, shape, legs-tail and movement. The bands, types, pools and orders are exactly the tables the twelve were drawn from, so their cages stay as they were."""
import json
import os
import sys

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BODY)

import genomeapply as GA
import s20genes as GN

FILE = os.path.join(BODY, "species_v1", "S20.json")
CLAN = "C20"
BORROWS = ["anatomy.brow-tuft-presence"]                       # C18's brow tufts: the same thing, borrowed through the spec's `borrows` (genome-review change 4)
EAR = "parts[ear.L].families.*"
TORSO_BODY = dict(item=0, op="<=", ref="spine.loft.regions.body.1")
TORSO_HEAD = dict(item=0, op=">", ref="spine.loft.regions.body.1")
MASS_BODY = dict(item="z", op="<=", ref="spine.loft.regions.body.1")
MASS_HEAD = dict(item="z", op=">", ref="spine.loft.regions.body.1")
GIRTH_SHARE = [0.35 + 0.65 * k / 6 for k in range(1, 7)]       # the tail's girth gene: the root takes 35 % of the change, the stalk under the tip all of it

MOVES = {
    "form.torso-girth": [dict(path="spine.loft.section.stations[*].1", op="scale", where=TORSO_BODY, above=0.05), dict(path="spine.loft.masses[*].rho", op="scale", where=MASS_BODY)],
    "form.head": [dict(path="spine.loft.section.stations[*].1", op="scale", where=TORSO_HEAD, above=0.05), dict(path="spine.loft.masses[*].rho", op="scale", where=MASS_HEAD)],
    "form.leg-length": [dict(path="parts[leg.L].chain[*].len", op="scale")],
    "form.leg-girth": [dict(path="parts[leg.L].chain[*].r", op="scale")],
    "form.ear-length": [dict(path=EAR + ".joints[1:].len", op="scale"), dict(path=EAR + ".tubes[*].len", op="scale", max=0.35)],
    "form.ear-width": [dict(path=EAR + ".joints[*].r", op="scale")],
    "form.ear-splay": [dict(path=EAR + ".plane.yaw", op="add"), dict(path=EAR + ".tubes[*].yaw", op="add")],
    "form.ear-droop": [dict(path=EAR + ".joints[1:].pitch", op="add", share=-1.0)],
    "form.ear-kind": [dict(path="parts[ear.L].default", op="set")],
    "form.tail-length": [dict(path="spine.tail.segments[1:5].len", op="scale")],
    "form.tail-girth": [dict(path="spine.tail.root_r", op="scale", share=0.35), dict(path="spine.tail.segments[*].r", op="scale", share=GIRTH_SHARE), dict(path="spine.tail.tip_r", op="scale")],
    "form.tail-curl": [dict(path="spine.tail.segments[3:5].len", op="scale", share=2.5)],
    "form.tail-carry": [dict(path="spine.tail.segments[*].pitch", op="add", share=-1.0)],
}
CONSUMER = {
    "form.tail-tip-size": "the tail-tip family builder (it reads the size from the creature)",
    "anatomy.tail-tip-form": "the tail-tip family builder (it reads the look from the creature)",
    "movement.cycle-rate": "the rig's clips (motion periods are divided by it)",
    "anatomy.whisker-presence": "the whisker appendages (a count of none is the switch off; the sampler's engine turns a count of 1 into 2 a side)",
    "appearance.marking-switch": "the coat resolver, through the creature record: off is the `plain` look (marks need both copies)",
}
# A.3's ring order, five chapters: (record, chapter id)
RING = {
    "coat": ["appearance.body-hue", "appearance.body-value", "appearance.countershade", "appearance.surface-grain", "appearance.sheen", "appearance.fleck", "appearance.cream-extent",
             "appearance.marking-switch", "appearance.marking-layout", "appearance.pattern-kind", "appearance.pattern-scale", "appearance.pattern-contrast", "appearance.marking-rosette", "appearance.band-count",
             "appearance.emblem", "appearance.emblem-place", "appearance.emblem-size", "appearance.freckle-density", "appearance.freckle-glow", "appearance.emission-brightness", "appearance.emission-hue",
             "appearance.lantern-bleed", "appearance.glow-pattern"],
    "face": ["form.eye-size", "form.eye-height", "form.eye-spacing", "form.mouth-width", "form.mouth-height", "appearance.mouth-rest", "appearance.blush", "anatomy.fang-presence", "anatomy.whisker-presence",
             "form.whisker-count", "form.whisker-length", "form.whisker-droop", "form.whisker-curl", "appearance.whisker-glow", "anatomy.brow-tuft-presence", "form.ear-kind", "form.ear-length", "form.ear-width",
             "form.ear-splay", "form.ear-droop"],
    "shape": ["form.head", "form.torso-girth"],
    "legs-tail": ["form.leg-length", "form.leg-girth", "form.tail-length", "form.tail-girth", "form.tail-curl", "form.tail-carry", "anatomy.tail-tip-form", "form.tail-tip-size"],
    "movement": ["movement.cycle-rate"],
}
CHAPTERS = [("coat", "Coat"), ("face", "Face"), ("shape", "Shape"), ("legs-tail", "Legs & tail"), ("movement", "Movement")]
UNITS = {"form.ear-splay": "°", "form.ear-droop": "°", "form.tail-carry": "°", "form.tail-curl": "turns", "appearance.body-hue": "°", "appearance.emission-hue": "°",
         "form.eye-height": "H", "form.eye-spacing": "H", "form.mouth-height": "H", "form.whisker-length": "H", "appearance.cream-extent": "H"}
SHORT = {"appearance.body-hue": "Hue", "appearance.body-value": "Value", "appearance.emission-hue": "Glow hue", "appearance.cream-extent": "Cream reach", "appearance.marking-layout": "Layout",
         "appearance.marking-switch": "Marks", "anatomy.tail-tip-form": "Tip", "form.tail-tip-size": "Tip size", "appearance.surface-grain": "Grain", "anatomy.whisker-presence": "Whiskers"}
LOUD = {"appearance.glow-pattern": "glow", "appearance.pattern-kind": "pattern", "appearance.marking-layout": "pattern", "appearance.emblem": "emblem", "anatomy.brow-tuft-presence": "brow"}
# the switches: record -> (the sampler's draw weight of `on`, the type's allele)
SWITCH_DRAW = {"appearance.marking-switch": (0.75, "off"), "appearance.blush": (0.8, "on"), "anatomy.fang-presence": (0.25, "off"), "anatomy.whisker-presence": (5 / 6, "off"),
               "appearance.whisker-glow": (0.15, "off"), "anatomy.brow-tuft-presence": (0.25, "off")}


EXPRESSIONS = [dict(id="lantern-tail", label="Lantern tail", locus="anatomy.tail-tip-form", look="lantern")]       # S20's own looks need no rule beyond the catalogue's (the order lantern, tuft, plain); a species with age gates or needs lists them here


def block():
    pin = GA.pin()
    spec = GN.specimen()
    ids = {r for chapter in RING.values() for r in chapter}
    loci = []
    for ch, records in RING.items():
        for i in records:
            pl = GA.pin_locus(i)
            label = pl["label"][0].upper() + pl["label"][1:]
            kind = "heritable-doing" if pl["nature"] == "doing" else "heritable-look"
            e = dict(locus=i, label=label, short=SHORT.get(i, label), chapter=ch, scope=pl["scope"], kind=kind, shapeable=True)
            if pl["scope"] == "branch" and pl["clan"] != CLAN:
                e["borrowed"] = pl["clan"]
            req = [r for r in (pl.get("requires") or []) if r in ids]
            if req or pl.get("wakesWhen"):
                e["kind"] = "sleeping"
                if req:
                    e["requires"] = req
                if pl.get("wakesWhen"):
                    e["wakesWhen"] = pl["wakesWhen"]
            old = GN.SAMPLER_OF.get(i)
            if old in GN.GENES and i in GN.RECORD.values():
                form, lo, hi, _ = GN.GENES[old]
                e["op"] = "blend"
                unit = UNITS.get(i, "×" if form == "mult" else "")
                pool = dict(form=form, lo=lo, hi=hi, unit=unit)
                e["absolute" if old in GN.ABSOLUTE else "band"] = pool
                typ = 1.0 if form == "mult" else 0.0 if form == "off" else round(GA.value_of(form, lo, hi, spec["t"][old]), 9)
                e["type"] = int(typ) if form == "int" else typ
                span = hi - lo
                e["range"] = [round(max(lo - span / 2, 0.1) if form == "mult" else lo - span / 2, 4), round(hi + span / 2, 4)]
                if i == "form.tail-length":
                    e["range"] = [0.5, 2.0]
                if pl.get("measure") == "position":
                    e["bins"] = [a["id"] for a in pl["alleles"]]
            elif i in GN.SWITCH_DRAW_RECORDS:
                w, t = SWITCH_DRAW[i]
                e.update(op="switch", operator=pl["operator"], limits=["off", "on"], type=t, weight=w, map={"off": False, "on": True})
            elif i == GN.MARKING_LAYOUT:
                al, w, dom = GN.PAIRS["appearance.marking-layout"]
                keep = [a for a in al if a != "plain"]
                e.update(op="pair-map", limits=[GN.LAYOUT_ALLELE.get(a, a) for a in keep], weights=[round(w[al.index(a)] / 0.75, 6) for a in keep], order=[GN.LAYOUT_ALLELE.get(a, a) for a in dom if a != "plain"], type="bands")
            else:
                al, w, dom = GN.PAIRS[old]
                e.update(op="pair-map", limits=list(al), weights=list(w), order=list(dom), type=GN.TYPE_PAIRS[old])
            if i in LOUD:
                e["loud"] = LOUD[i]
            mv = MOVES.get(i)
            if mv:
                e["moves"] = mv
            else:
                e["moves"] = []
                e["consumer"] = CONSUMER.get(i) or ("the face decal, through the creature record" if i.startswith(("form.eye", "form.mouth", "appearance.blush", "appearance.mouth")) else "the coat resolver, through the creature record (coat plug-ins arrive in chunk 28)")
            loci.append(e)
    return dict(catalogue=dict(id=pin["id"], version=pin["version"], digest=pin["digest"]), clan=CLAN, borrows=list(BORROWS), chapters=[dict(id=c, name=n) for c, n in CHAPTERS], loci=loci)


def main():
    with open(FILE) as fh:
        doc = json.load(fh)
    b = block()
    if "--check" in sys.argv:
        print("same" if doc["genome"] == b and doc.get("expressions") == EXPRESSIONS else "differs")
        return
    legacy = doc["legacy"]
    if "genes" in doc["genome"]:
        legacy["genome_v0"] = dict(genes=doc["genome"]["genes"], counts=doc["genome"]["counts"])
    doc["genome"] = b
    doc["expressions"] = EXPRESSIONS
    with open(FILE, "w") as fh:
        json.dump(doc, fh, indent=1)
        fh.write("\n")
    errs = GA.validate(doc)
    print(len(b["loci"]), "loci;", len(errs), "problems")
    for p, m in errs[:20]:
        print(" ", m)


if __name__ == "__main__":
    main()
