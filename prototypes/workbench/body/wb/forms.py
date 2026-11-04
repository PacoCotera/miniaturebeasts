"""Chapter 21: the Shape forms. What the studio's Shape mode shows of a species file, read from the file and the plan alone (no build, no render, so it is instant):
`outline(doc)` is the parts outline (the spine's ranges with their swatches, the sockets and parts nested under the range they grow from, then Coat, Motion and Renders), and `fields_of(doc, part)` is the list
of fields the inspector shows for a part. Every field comes from the schema (`species_v1.SCHEMA`: its label, help, unit and kind) and the plan's band, so a new schema field needs no new form code:
the page maps the field's kind to a control (a number to a number field with its range bar, an enum to a segmented control or a select, a flag to a switch). The value is not sent: the page reads it from the file by `ptr`
and writes it with a JSON patch at the same pointer, which the server validates against the schema and the plan (the message names the field)."""
import math
import os
import sys

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BODY not in sys.path:
    sys.path.insert(0, BODY)

import species_v1 as V1

# The parts outline of each plan: a swatch for each spine range (the colours of the parts picture), and what nests under which range. `match` says where the file keeps the part:
# a part id, a socket id or a top-level key. A row appears only when the file has what it matches. Plan modules own this table from chunk 26.
SWATCH = dict(head="#f2c9a6", neck="#f2e3a0", back="#bcdcae", seat="#a9cfe0", tail="#d4c3ef")
NESTED = {
    "biped": [("ears", "Ears", "head", dict(part="ear.L")), ("crown", "Crown", "head", dict(socket="crown")), ("face", "Face", "head", dict(key="face")),
              ("arms", "Arms", "back", dict(part="arm.L")), ("legs", "Legs", "seat", dict(part="leg.L")), ("tip", "Tip", "tail", dict(socket="tail.tip"))],
}
NESTED["quadruped"] = NESTED["biped"]
SECTIONS = [("coat", "Coat"), ("motion", "Motion"), ("renders", "Renders")]


def _has(doc, m):
    if "part" in m:
        return any(isinstance(p, dict) and p.get("id") == m["part"] for p in doc.get("parts") or [])
    if "socket" in m:
        return any(isinstance(s, dict) and s.get("id") == m["socket"] for s in doc.get("sockets") or [])
    return m["key"] in doc


def outline(doc):
    """The rows of the parts outline: {id, label, kind: range | part | section, under, sw}. Ids are the ones the checks name (head, tail, ears, arms, legs)."""
    plan = V1.PLANS.get(doc.get("plan")) or V1.PLANS["biped"]
    rows = []
    names = [r.get("name") for r in (doc.get("spine") or {}).get("ranges") or [] if isinstance(r, dict)] or plan["ranges"]
    nest = NESTED.get(doc.get("plan"), NESTED["biped"])
    for n in names:
        rows.append(dict(id=n, label=n.capitalize(), kind="range", under=None, sw=SWATCH.get(n)))
        rows += [dict(id=i, label=lab, kind="part", under=n, sw=None) for i, lab, on, m in nest if on == n and _has(doc, m)]
    rows += [dict(id=i, label=lab, kind="section", under=None, sw=None) for i, lab in SECTIONS]
    return rows


# ---------------------------------------------------------------------------------------------- fields
def spec_at(path):
    """The schema's field for a dotted schema path: 'spine.tail.length', 'spine.ranges[].length' (a list's item fields follow `[]`)."""
    cur, node = None, V1.SCHEMA
    for tok in path.replace("[]", ".[]").split("."):
        if tok == "[]":
            node = cur["item"]
        else:
            cur = node[tok]
            node = cur.get("fields") if cur["type"] == "object" else node
    return cur


def nice_step(span):
    """A step a hand can land on: about a hundredth of the band, in 1, 2 or 5 units of a power of ten, never finer than a thousandth."""
    raw = max(span / 120.0, 1e-3)
    p = 10 ** math.floor(math.log10(raw))
    return round(max([m * p for m in (1, 2, 5, 10) if m * p <= raw] or [p]), 6)


def short_label(label, part_label):
    """'Tail root' on the Tail part reads 'Root': the part's name is the title above it. A remainder under three letters ('Head a') keeps the whole label."""
    first, _, rest = label.partition(" ")
    return rest[:1].upper() + rest[1:] if rest and len(rest) >= 3 and first.lower() == part_label.lower() else label


def _field(doc, part_label, ptr, dotted, schema_path, label=None, rng=None):
    spec = spec_at(schema_path)
    plan = V1.PLANS.get(doc.get("plan")) or V1.PLANS["biped"]
    full = label or spec["label"]
    out = dict(id=dotted, ptr=ptr, label=short_label(full, part_label), full=full, help=spec.get("help", ""), type=spec["type"], unit=spec.get("unit") or "")
    if spec["type"] in ("number", "int"):
        r = rng if rng is not None else V1._range(spec, plan)
        out["range"] = [r[0], r[1]] if r else None
        out["step"] = 1 if spec["type"] == "int" else (nice_step(r[1] - r[0]) if r else 0.01)
    elif spec["type"] == "enum":
        out["options"] = list(spec["values"])
    return out


def fields_of(doc, part):
    """The fields the inspector shows for a part of the outline, in the order they read: [{id, ptr, label, full, help, type, unit, range, step}]. A part the file does not have, or one with nothing modelled yet, has none."""
    plan = V1.PLANS.get(doc.get("plan")) or V1.PLANS["biped"]
    sp = doc.get("spine") or {}
    ranges = [r.get("name") for r in sp.get("ranges") or [] if isinstance(r, dict)]
    lab = part.capitalize()
    out = []
    if part in ranges:
        i = ranges.index(part)
        if (sp["ranges"][i] or {}).get("length") is not None:
            out.append(_field(doc, lab, f"/spine/ranges/{i}/length", f"spine.ranges.{part}.length", "spine.ranges[].length", label=f"{lab} length", rng=plan["range_len"].get(part)))
        if part == "head":
            out += [_field(doc, lab, f"/spine/head_attach/{k}", f"spine.head_attach.{k}", f"spine.head_attach.{k}") for k in ("a", "d", "z_under")]
        if part == "seat":
            out.append(_field(doc, lab, "/spine/seat/radius", "spine.seat.radius", "spine.seat.radius"))
        if part == "tail":
            out += [_field(doc, lab, "/spine/tail/length", "spine.tail.length", "spine.tail.length"), _field(doc, lab, "/spine/tail/root", "spine.tail.root", "spine.tail.root"),
                    _field(doc, lab, "/spine/tail/tip_r", "spine.tail.tip_r", "spine.tail.tip_r"), _field(doc, lab, "/spine/tail/curl/turns", "spine.tail.curl.turns", "spine.tail.curl.turns"),
                    _field(doc, lab, "/spine/tail/fillet", "spine.tail.fillet", "spine.tail.fillet")]
        return out
    nest = {i: m for i, _, _, m in NESTED.get(doc.get("plan"), NESTED["biped"])}
    m = nest.get(part)
    if m and "part" in m:
        parts = doc.get("parts") or []
        k = next((i for i, p in enumerate(parts) if isinstance(p, dict) and p.get("id") == m["part"]), None)
        if k is not None:
            pid = m["part"]
            out.append(_field(doc, lab, f"/parts/{k}/fillet", f"parts.{pid}.fillet", "parts[].fillet"))
            for j, c in enumerate(parts[k].get("chain") or []):
                if isinstance(c, dict) and isinstance(c.get("len"), (int, float)):
                    out.append(_field(doc, lab, f"/parts/{k}/chain/{j}/len", f"parts.{pid}.chain.{c.get('joint', j)}.len", "parts[].chain[].len", label=f"{str(c.get('joint', j)).capitalize()} length"))
    return out


# ---------------------------------------------------------------------------------------------- chunk 21B: sockets, joins and families
# Which locus holds how often each family shows (the weights of its pair-map), for a part or socket of the outline.
FAMILY_LOCUS = {"ears": "form.ear-kind", "tip": "anatomy.tail-tip-form"}
# The play surface (spec 2.3): the toy a part feeds, its picture chips (the family and the short word play shows) and its size slider (the field that moves). The words are `pl.toy.*` of the copywriter's list.
PLAY = {
    "ears": dict(toy="Ears", chips={"prick": "pointy", "lop": "floppy", "nub": "nubs"}, slider="/genome/loci/{locus:form.ear-length}/type"),
    "tip": dict(toy="Tail", chips={"lantern": "lantern", "tuft": "tuft", "plain": "plain"}, slider="/spine/tail/length"),
    "tail": dict(toy="Tail", chips={"lantern": "lantern", "tuft": "tuft", "plain": "plain"}, slider="/spine/tail/length"),
}
PLAY_STEPS = 7


def _socket_index(doc, sid):
    return next((i for i, s in enumerate(doc.get("sockets") or []) if isinstance(s, dict) and s.get("id") == sid), None)


def _locus_index(doc, locus):
    loci = (doc.get("genome") or {}).get("loci") or []
    return next((i for i, l in enumerate(loci) if isinstance(l, dict) and l.get("locus") == locus), None)


def _part_index(doc, pid):
    return next((i for i, p in enumerate(doc.get("parts") or []) if isinstance(p, dict) and p.get("id") == pid), None)


def look_names(doc, locus, ids):
    """The copywriter's name for each look of a trait ({id: [label, short word]}), from the file's own look words; a look it has no words for is left out and the page spells the id."""
    words = ((doc.get("variety") or {}).get("look_words") or {}).get(locus) or {}
    return {i: list(words[i]) for i in ids if isinstance(words.get(i), list) and len(words[i]) == 2}


def socket_fields(doc, part):
    """The join of the part's socket (hard or soft, nothing in between), the socket's default family and how often each family shows. A part's socket is the `socket` of the part (limbs and appendages) or an entry of `sockets` (crown, tail tip)."""
    lab = part.capitalize()
    nest = {i: m for i, _, _, m in NESTED.get(doc.get("plan"), NESTED["biped"])}
    m = nest.get(part)
    out = []
    if not m:
        return out
    if "part" in m:
        k = _part_index(doc, m["part"])
        if k is not None and isinstance((doc["parts"][k].get("socket") or {}).get("join"), str):
            out.append(_field(doc, lab, f"/parts/{k}/socket/join", f"parts.{m['part']}.socket.join", "parts[].socket.join", label="Join"))
    sid = {"ears": "ear.L"}.get(part, m.get("socket"))
    k = _socket_index(doc, sid) if sid else None
    if k is not None:
        spec = doc["sockets"][k].get("spec") or {}
        fam = spec.get("families")
        if isinstance(fam, list) and len(fam) > 1 and spec.get("default") in fam:
            d = spec_at("parts[].default")
            out.append(dict(id=f"sockets.{sid}.default", ptr=f"/sockets/{k}/spec/default", label="Default family", full="Default family", help=d["help"], type="enum", unit="", options=list(fam),
                            names=look_names(doc, FAMILY_LOCUS.get(part), fam)))
    loc = FAMILY_LOCUS.get(part)
    li = _locus_index(doc, loc) if loc else None
    if li is not None:
        l = doc["genome"]["loci"][li]
        if isinstance(l.get("weights"), list) and len(l["weights"]) == len(l.get("limits") or []):
            out.append(dict(id=f"genome.loci.{loc}.weights", ptr=f"/genome/loci/{li}/weights", label="How often", full=f"{l.get('label', loc)}, how often each shows", help="How often each family shows in wild draws.", type="weights", unit="", options=list(l["limits"]), names=look_names(doc, loc, l["limits"])))
    return out


def play_of(doc, part):
    """What the player sees of a part: the toy's head, its picture chips (the families the socket allows that play has a word for, the one in force marked) and the slider with its 7 steps. None when no toy reads this part."""
    p = PLAY.get(part)
    if not p:
        return None
    chips = []
    nest = {i: m for i, _, _, m in NESTED.get(doc.get("plan"), NESTED["biped"])}
    m = nest.get(part, {})
    sid = {"ears": "ear.L"}.get(part, m.get("socket", "tail.tip" if part == "tail" else None))
    k = _socket_index(doc, sid) if sid else None
    spec = (doc["sockets"][k].get("spec") or {}) if k is not None else {}
    fam = [f for f in spec.get("families") or [] if f in p["chips"]]
    names = look_names(doc, FAMILY_LOCUS.get(part) or ("anatomy.tail-tip-form" if part == "tail" else None), fam)
    chips = [dict(family=f, word=names[f][1] if f in names else p["chips"][f], on=f == spec.get("default"), ptr=f"/sockets/{k}/spec/default") for f in fam]
    sl = p["slider"]
    if "{locus:" in sl:
        loc = sl[sl.index("{locus:") + 7:sl.index("}")]
        li = _locus_index(doc, loc)
        if li is None:
            ptr, rng = None, None
        else:
            l = doc["genome"]["loci"][li]
            ptr = f"/genome/loci/{li}/type"
            rng = (l.get("band") or l.get("absolute") or {})
            rng = [rng.get("lo"), rng.get("hi")] if rng else l.get("range")
    else:
        ptr = sl
        plan = V1.PLANS.get(doc.get("plan")) or V1.PLANS["biped"]
        r = V1._range(spec_at("spine.tail.length"), plan)
        rng = [r[0], r[1]] if r else None
    return dict(toy=p["toy"], chips=chips, slider=dict(ptr=ptr, range=rng, steps=PLAY_STEPS) if ptr and rng else None)


def forms(doc):
    """Everything Shape mode needs of a file: the outline and each part's fields (the socket's join, default family and family weights after the numbers), and what the player sees of it."""
    rows = outline(doc)
    return dict(plan=doc.get("plan"), outline=rows, parts={r["id"]: dict(label=r["label"], kind=r["kind"], fields=fields_of(doc, r["id"]) + socket_fields(doc, r["id"]), play=play_of(doc, r["id"])) for r in rows if r["kind"] != "section"})
