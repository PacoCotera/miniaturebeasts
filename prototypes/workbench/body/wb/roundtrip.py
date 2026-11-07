"""The round-trip fixtures of R3: S01 (a mesh body), S22 and S20 as the species_v1 folder holds them, and each broken copy as a few edits with the field paths the server's `validate` names for it.
The page's zod schema (web/src/lib/speciesSchema.ts) must accept the three good files and refuse every broken copy at the same fields (web/src/lib/speciesSchema.test.ts reads web/src/generated/roundtrip.json and the
species files themselves); tests/test_wb_schema_json.py keeps that file equal to what this makes.
An edit is ["set", "dotted.path", value] or ["del", "dotted.path"]; a list item is its position.
    python3 wb/roundtrip.py <out file>"""
import copy
import json
import os
import sys

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BODY not in sys.path:
    sys.path.insert(0, BODY)

import species_v1 as V1


def load(sid):
    with open(os.path.join(BODY, "species_v1", f"{sid}.json"), encoding="utf-8") as fh:
        return json.load(fh)


def _walk(d, path):
    cur = d
    toks = path.split(".")
    for t in toks[:-1]:
        cur = cur[int(t)] if isinstance(cur, list) else cur[t]
    return cur, toks[-1]


def apply(d, edits):
    for e in edits:
        cur, k = _walk(d, e[1])
        key = int(k) if isinstance(cur, list) else k
        if e[0] == "set":
            cur[key] = e[2]
        else:
            del cur[key]
    return d


# (name, base species, edits). Each copy breaks one thing; the expected fields are what the server says.
BROKEN = [
    ("tail-too-long", "S22", [["set", "spine.tail.length", 9]]),
    ("tail-root-low", "S22", [["set", "spine.tail.root", 0.01]]),
    ("unknown-field", "S22", [["set", "spine.tail.lenght", 1]]),
    ("not-a-number", "S22", [["set", "spine.seat.radius", "wide"]]),
    ("bad-enum", "S22", [["set", "anchors.body", "loose"]]),
    ("missing-coat", "S22", [["del", "coat"]]),
    ("refused-cheeks", "S22", [["set", "face.cheeks", {"blush": 1}]]),
    ("refused-palettes", "S22", [["set", "coat.palettes", {}]]),
    ("bad-id", "S22", [["set", "id", "X1"]]),
    ("vec3-short", "S22", [["set", "skeleton.chest", [1, 2]]]),
    ("tail-shares", "S22", [["set", "spine.tail.segments.0.share", 0.5], ["set", "spine.tail.segments.1.share", 0.5]]),
    ("neck-out-of-band", "S22", [["set", "spine.ranges.1.length", 2.5]]),
    ("eye-count", "S22", [["set", "face.eyes.count", 5]]),
    ("mesh-bone-text", "S01", [["set", "rig.bones.0.len", "long"]]),
    ("mesh-key-text", "S01", [["set", "keys.0.amount", "most"]]),
    ("mesh-and-cage", "S01", [["set", "spine", {"ranges": []}]]),
    ("mesh-no-sha", "S01", [["del", "mesh.sha256"]]),
    ("fixture-neck", "S20", [["set", "spine.ranges.1.length", 0.05]]),
    ("fixture-unknown", "S20", [["set", "tail", 1]]),
]


def build():
    from wb import forms as FM
    out = dict(good=["S01", "S20", "S22"], forms_S01=FM.forms(load("S01")), broken=[])
    for name, base, edits in BROKEN:
        d = apply(copy.deepcopy(load(base)), edits)
        out["broken"].append(dict(name=name, base=base, edits=edits, server=[[p, m] for p, m in V1.validate(d)]))
    return out


if __name__ == "__main__":
    with open(sys.argv[1], "w", encoding="utf-8") as fh:
        json.dump(build(), fh, indent=1, ensure_ascii=False)
        fh.write("\n")
