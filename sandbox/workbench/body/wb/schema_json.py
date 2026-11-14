"""The species file's schema as JSON Schema (draft 2020-12), for the page: `GET /api/schema/mb-species-2` (and -1 for the frozen fixtures).
The studio's schema (species_v1.SCHEMA) is the one source: this only restates it. Each property carries the studio's words (`title` is the label, `description` the help line) and `x-unit`, `x-stage`, `x-range`
(a number pair, or the name of the plan band that bounds it). The plans' bands travel as `x-plans`, so the page checks a field against its own plan without asking. What JSON Schema cannot say rides in `x-` keys:
`x-required` (the keys a cage file and a mesh file each need), `x-refused` (a key the schema names to refuse, with the reason), `x-id-key` (the key that names a list's items) and `x-tight`.
The page's zod schema and TS types are generated from this file at build time (web/scripts/gen-zod.mjs), so forms and types cannot drift from the schema.
    python3 wb/schema_json.py <out dir>      writes mb-species-1.schema.json and mb-species-2.schema.json"""
import json
import os
import sys

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BODY not in sys.path:
    sys.path.insert(0, BODY)

import species_v1 as V1

IDS = {"mb-species-1": V1.SCHEMA_V1, "mb-species-2": V1.SCHEMA_ID}


def _note(f, out):
    out["title"] = f["label"]
    out["description"] = f["help"]
    if f.get("unit"):
        out["x-unit"] = f["unit"]
    out["x-stage"] = f["stage"]
    if f.get("range") is not None:
        out["x-range"] = list(f["range"]) if isinstance(f["range"], (tuple, list)) else f["range"]
    return out


def _fields(fields, required, rest, refused=None):
    o = dict(type="object", properties={k: node(f) for k, f in fields.items()}, additionalProperties=bool(rest))
    if required:
        o["required"] = list(required)
    if refused:
        o["x-refused"] = dict(refused)
    return o


def node(f):
    t = f["type"]
    if t == "number":
        o = dict(type="number")
        if isinstance(f.get("range"), (tuple, list)):
            o["minimum"], o["maximum"] = f["range"]
    elif t == "int":
        o = dict(type="integer")
    elif t == "text":
        o = dict(type="string")
        if f.get("pattern"):
            o["pattern"] = f"^(?:{f['pattern']})$"                 # anchored: the server matches the whole text, the page's regex tests a part
    elif t == "enum":
        o = dict(enum=list(f["values"]))
    elif t in ("vec3", "pair"):
        n = 3 if t == "vec3" else 2
        o = dict(type="array", items=dict(type="number"), minItems=n, maxItems=n)
    elif t == "map":
        o = dict(type="object", additionalProperties=dict(enum=list(f["values"])))
        if f.get("tight"):
            o["x-tight"] = list(f["tight"])
    elif t == "object":
        o = _fields(f["fields"], f.get("required"), f.get("rest"), f.get("refused"))
    elif t == "list":
        o = dict(type="array", items=_fields(f["item"], f.get("required"), f.get("rest")))
        if f.get("id_key"):
            o["x-id-key"] = f["id_key"]
    elif t == "free":
        o = {}
    else:
        raise ValueError(f"unknown field type {t}")
    _note(f, o)
    if f.get("nullable"):
        inner = {k: v for k, v in o.items() if k not in ("title", "description", "x-unit", "x-stage", "x-range")}
        o = {k: v for k, v in o.items() if k in ("title", "description", "x-unit", "x-stage", "x-range")}
        o["anyOf"] = [inner, dict(type="null")]
    return o


def _plans(schema_id):
    out = {}
    for name, bands in V1.PLANS.items():
        b = V1._plans.bands_for(bands, schema_id)
        out[name] = {k: ([v[0], v[1]] if k != "range_len" else {r: [x[0], x[1]] for r, x in v.items()}) for k, v in b.items()
                     if (isinstance(v, tuple) and len(v) == 2 and all(isinstance(x, (int, float)) for x in v)) or k == "range_len"}
        out[name]["name"] = name
        out[name]["ranges"] = list(bands["ranges"])
        out[name]["limb_joints"] = bands["limb_joints"]
        out[name]["attach"] = bands["attach"]
    return out


def json_schema(slug):
    """The JSON Schema of `mb-species-1` or `mb-species-2`."""
    sid = IDS[slug]
    fields, required = V1._SCHEMA_OF[sid]
    o = _fields(fields, [k for k in required if k not in V1.CAGE_FIELDS and k != "mesh"], False)
    o["$schema"] = "https://json-schema.org/draft/2020-12/schema"
    o["$id"] = sid
    o["title"] = "Species file"
    o["description"] = f"A species file, schema {sid}."
    o["x-required"] = dict(cage=list(required), mesh=list(V1.REQUIRED_MESH if sid == V1.SCHEMA_ID else required))
    o["x-plans"] = _plans(sid)
    return o


def dump(out_dir):
    os.makedirs(out_dir, exist_ok=True)
    for slug in IDS:
        with open(os.path.join(out_dir, f"{slug}.schema.json"), "w", encoding="utf-8") as fh:
            json.dump(json_schema(slug), fh, indent=1, ensure_ascii=False, sort_keys=False)
            fh.write("\n")


if __name__ == "__main__":
    dump(sys.argv[1])
