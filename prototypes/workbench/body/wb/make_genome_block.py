"""Builds S20's `genome` block (chunk 7) from the gene tables that S20's individuals were drawn from (s20genes) and the typed moves below, and writes it into species_v1/S20.json.
python -m wb.make_genome_block [--check]   (--check only reports whether the file already holds this block)
The limits, types, pools and orders are exactly the tables the twelve were drawn from, so the twelve's cages stay as they were."""
import json
import os
import sys

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BODY)

import genomeapply as GA
import s20genes as GN

FILE = os.path.join(BODY, "species_v1", "S20.json")
EAR = "parts[ear.L].families.*"
TORSO_BODY = dict(item=0, op="<=", ref="spine.loft.regions.body.1")
TORSO_HEAD = dict(item=0, op=">", ref="spine.loft.regions.body.1")
MASS_BODY = dict(item="z", op="<=", ref="spine.loft.regions.body.1")
MASS_HEAD = dict(item="z", op=">", ref="spine.loft.regions.body.1")
GIRTH_SHARE = [0.35 + 0.65 * k / 6 for k in range(1, 7)]       # the tail's girth gene: the root takes 35 % of the change, the stalk under the tip all of it

MOVES = {
    "body.torso-girth": [dict(path="spine.loft.section.stations[*].1", op="scale", where=TORSO_BODY, above=0.05), dict(path="spine.loft.masses[*].rho", op="scale", where=MASS_BODY)],
    "body.head-size": [dict(path="spine.loft.section.stations[*].1", op="scale", where=TORSO_HEAD, above=0.05), dict(path="spine.loft.masses[*].rho", op="scale", where=MASS_HEAD)],
    "body.limb-length": [dict(path="parts[leg.L].chain[*].len", op="scale")],
    "body.limb-girth": [dict(path="parts[leg.L].chain[*].r", op="scale")],
    "body.ear-length": [dict(path=EAR + ".joints[1:].len", op="scale"), dict(path=EAR + ".tubes[*].len", op="scale", max=0.35)],
    "body.ear-girth": [dict(path=EAR + ".joints[*].r", op="scale")],
    "body.ear-splay": [dict(path=EAR + ".plane.yaw", op="add"), dict(path=EAR + ".tubes[*].yaw", op="add")],
    "body.ear-droop": [dict(path=EAR + ".joints[1:].pitch", op="add", share=-1.0)],
    "body.ear-family": [dict(path="parts[ear.L].default", op="set")],
    "body.tail-length": [dict(path="spine.tail.segments[1:5].len", op="scale")],
    "body.tail-girth": [dict(path="spine.tail.root_r", op="scale", share=0.35), dict(path="spine.tail.segments[*].r", op="scale", share=GIRTH_SHARE), dict(path="spine.tail.tip_r", op="scale")],
    "body.tail-curl": [dict(path="spine.tail.segments[3:5].len", op="scale", share=2.5)],
    "body.tail-lift": [dict(path="spine.tail.segments[*].pitch", op="add", share=-1.0)],
}
CONSUMER = {
    "body.tip-size": "the tail-tip family builder (it reads the size from the creature)",
    "body.tail-tip": "the tail-tip family builder (it reads the look from the creature)",
    "movement.cycle-rate": "the rig's clips (motion periods are divided by it)",
}
# loci shared with the pin: the type in the pin's units (value = type * factor) and why a locus that shares an id with the pin is not shared
SHARED = {"growth.exterior-eye-size-ratio": 0.32, "movement.cycle-rate": 1.0}
PIN_NOTES = {
    "growth.exterior-eye-height-ratio": "The pin's eye height is a branch locus of clan C01 (middle or high, 0 to 0.2); S20 moves the eye up and down either way, so it is S20's own.",
    "growth.exterior-eye-spacing-ratio": "The pin's eye spacing is a ratio of 0.40 to 0.55 of the head's width; S20 moves the eyes by an offset in head units, so it is S20's own.",
    "appearance.marking-layout": "The pin's marking layout has two looks (bands, patches); S20 draws six, so it is S20's own until the pin is changed.",
}
CHAPTERS = [("body", "Body"), ("tail", "Tail"), ("face", "Face"), ("coat", "Coat"), ("movement", "Movement")]
CHAPTER_OF = {"body": "body", "ears": "face", "tail": "tail", "face": "face", "coat": "coat"}
FACE_BODY = {"body.ear-length", "body.ear-girth", "body.ear-splay", "body.ear-droop", "body.ear-family"}
UNITS = {"body.ear-splay": "°", "body.ear-droop": "°", "body.tail-lift": "°", "body.tail-curl": "turns", "appearance.body-hue": "°", "appearance.glow-hue": "°",
         "growth.exterior-eye-height-ratio": "H", "growth.exterior-eye-spacing-ratio": "H", "face.mouth-height": "H", "face.whisker-length": "H", "appearance.bib-reach": "H"}
BINS = {"body.tail-length": ["short", "between", "long"], "body.tail-girth": ["slim", "between", "stout"], "body.tail-curl": ["straight", "between", "curled"], "body.tail-lift": ["low", "between", "raised"],
        "body.tip-size": ["small", "between", "large"], "body.torso-girth": ["slim", "between", "round"], "body.head-size": ["small", "between", "big"], "body.limb-length": ["short", "between", "long"],
        "body.limb-girth": ["slim", "between", "sturdy"], "body.ear-length": ["short", "between", "long"], "body.ear-girth": ["slim", "between", "broad"]}
WORDS = {"short": "Short", "length": "Length"}
LOUD = {"coat.glow-pattern": "glow", "coat.rd": "pattern", "appearance.marking-layout": "pattern", "coat.mark": "emblem", "coat.brow": "brow"}


NAMES = {"growth.exterior-eye-size-ratio": ("Eye size", "Eye size"), "growth.exterior-eye-height-ratio": ("Eye height", "Eye height"), "growth.exterior-eye-spacing-ratio": ("Eye spacing", "Eye spacing"),
         "movement.cycle-rate": ("Cycle rate", "Cycle rate"), "appearance.body-hue": ("Body hue", "Hue"), "appearance.glow-hue": ("Glow hue", "Glow hue"), "appearance.coat-value": ("Coat value", "Value"),
         "appearance.bib-reach": ("Belly reach", "Belly reach"), "appearance.marking-layout": ("Marking layout", "Layout"), "body.ear-family": ("Ear family", "Ear family"), "body.tail-tip": ("Tail tip", "Tip"),
         "body.tip-size": ("Tip size", "Tip size"), "skin.grain": ("Skin grain", "Grain"), "skin.sheen": ("Skin sheen", "Sheen")}


def label_of(i, ch):
    if i in NAMES:
        return NAMES[i]
    name = i.split(".", 1)[1].replace("-", " ")
    full = name[0].upper() + name[1:]
    short = name
    for w in ("tail ", "face ", "coat ", "body "):
        if short.startswith(w) and len(short) > len(w):
            short = short[len(w):]
            break
    return full, short[0].upper() + short[1:]


def block():
    pin = GA.pin()
    loci = []
    order = list(GN.GENES) + [k for k in GN.PAIRS] + list(GN.SWITCHES)
    spec = GN.specimen()
    for i in order:
        anchor = None
        if i in GN.GENES:
            form, lo, hi, anchor = GN.GENES[i]
        elif i in GN.PAIRS:
            anchor = "coat"
        ch = CHAPTER_OF.get(anchor, "coat")
        if i in FACE_BODY:
            ch = "face"
        if i.startswith("face.") or i.startswith("growth.exterior"):
            ch = "face"
        if i.startswith("body.tail") or i == "body.tip-size":
            ch = "tail"
        if i == "movement.cycle-rate":
            ch = "movement"
        full, short = label_of(i, ch)
        pl = GA.pin_locus(i)
        e = dict(locus=i, label=full, short=short, chapter=ch, scope="own", kind="heritable-doing" if i == "movement.cycle-rate" else "heritable-look", shapeable=True)
        if anchor:
            e["anchor"] = anchor
        if i in GN.GENES:
            e.update(op="blend", form=form, unit=UNITS.get(i, "×" if form == "mult" else ""), limits=[lo, hi])
            tt = spec["t"][i]
            typ = 1.0 if form == "mult" else 0.0 if form == "off" else round(GA.value_of(form, lo, hi, tt), 9)
            if form == "int":
                typ = int(typ)
            e["type"] = typ
            span = hi - lo
            e["range"] = [round(max(lo - span / 2, 0.1) if form == "mult" else lo - span / 2, 4), round(hi + span / 2, 4)]
            if i == "body.tail-length":
                e["range"] = [0.5, 2.0]
            if i in BINS:
                e["bins"] = BINS[i]
            if i in SHARED:
                e["scope"] = "shared"
                lo_c = min(a["value"] for a in pl["alleles"] if "value" in a)
                hi_c = max(a["value"] for a in pl["alleles"] if "value" in a)
                e["catalogue"] = dict(range=[lo_c, hi_c], type=SHARED[i], operator=pl["operator"])
        elif i in GN.PAIRS:
            al, w, dom = GN.PAIRS[i]
            e.update(op="pair-map", limits=list(al), weights=list(w), order=list(dom), type=GN.TYPE_PAIRS[i])
        else:
            e.update(op="switch", limits=["off", "on"], type="on" if i == "face.blush" else "off", weight=GN.SWITCHES[i], map={"off": False, "on": True})
        if pl is not None and e["scope"] == "own":
            e["pin_note"] = PIN_NOTES.get(i, "The pin has a locus with this id; S20's differs, so it is S20's own.")
        if i in LOUD:
            e["loud"] = LOUD[i]
        mv = MOVES.get(i)
        if mv:
            e["moves"] = mv
        else:
            e["moves"] = []
            e["consumer"] = CONSUMER.get(i) or ("the cage builder, through the creature record" if i in ("body.tail-tip",) else "the coat resolver, through the creature record (coat plug-ins arrive in chunk 28)")
            if i == "face.blush" or i.startswith("face.mouth") or i.startswith("growth.exterior-eye"):
                e["consumer"] = "the face decal, through the creature record"
        loci.append(e)
    return dict(catalogue=dict(id=pin["id"], version=pin["version"]), chapters=[dict(id=c, name=n) for c, n in CHAPTERS], loci=loci)


def main():
    with open(FILE) as fh:
        doc = json.load(fh)
    b = block()
    if "--check" in sys.argv:
        print("same" if doc["genome"] == b else "differs")
        return
    legacy = doc["legacy"]
    if "genes" in doc["genome"]:
        legacy["genome_v0"] = dict(genes=doc["genome"]["genes"], counts=doc["genome"]["counts"])
    doc["genome"] = b
    with open(FILE, "w") as fh:
        json.dump(doc, fh, indent=1)
        fh.write("\n")
    errs = GA.validate(doc)
    print(len(b["loci"]), "loci;", len(errs), "problems")
    for p, m in errs[:20]:
        print(" ", m)


if __name__ == "__main__":
    main()
