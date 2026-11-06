"""The chunk 9 done-picture's file: S20 with the three expressions of spec 4.2 added (a lantern tail, a horn from adult, sparkle spots that need two loci) and one modifier gene on the tail tip. Used by the tests and the sheet;
S20.json itself uses none of them (a species that uses an age gate or `needs` cannot release until the game's resolver reads them: spec 4.2)."""
import copy
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))


def horn_locus():
    return dict(locus="anatomy.horn-presence", label="Horns", short="Horns", chapter="face", scope="branch", borrowed="C08", kind="heritable-look", shapeable=True, op="switch", operator="dominant-enable",
                limits=["off", "on"], type="off", weight=0.2, map={"off": False, "on": True}, moves=[], consumer="the horn family builder (chapter 27)")


def modifier(of="anatomy.tail-tip-form", order=("tuft", "lantern", "plain"), weight=0.25, chapter="legs-tail", label="Tail tip order"):
    return dict(locus="mod.tail-tip-order", label=label, short="Tip order", chapter=chapter, scope="modifier", kind="heritable-look", shapeable=True, op="switch", operator="dominant-enable", limits=["off", "on"], type="off", weight=weight,
                map={"off": False, "on": True}, moves=[], consumer="the cross: a carrier shows the tail tip by this order", modifier=dict(of=of, show="first-ranked", order=list(order)))


def demo(with_modifier=False):
    doc = json.load(open(os.path.join(HERE, "species_v1", "S20.json")))
    g = doc["genome"]
    g["borrows"] = g["borrows"] + ["anatomy.horn-presence"]
    g["loci"].append(horn_locus())
    if with_modifier:
        g["loci"].append(modifier())
    doc["expressions"] = [
        dict(id="lantern-tail", label="Lantern tail", locus="anatomy.tail-tip-form", look="lantern"),
        dict(id="horn", label="Horn", locus="anatomy.horn-presence", look="on", age=dict(**{"from": "adult"}, grow=0.5), art=["adult", "elder"]),
        dict(id="sparkle-spots", label="Sparkle spots", locus="appearance.freckle-glow", look="high", loud=True,
             needs=[dict(locus="appearance.pattern-kind", is_="spots"), dict(locus="anatomy.tail-tip-form", is_="lantern")]),
    ]
    for x in doc["expressions"]:
        for n in x.get("needs", []):
            n["is"] = n.pop("is_")
    return copy.deepcopy(doc)
