"""The species file, schema `mb-species/1` (spec 8.2): one JSON file per species, units in H and degrees. Every field has a type, a label, a help line, a stage tag (shape, face, coat, motion, meta) and, where the plan bounds it, a range.
Fields that are not listed are rejected, not ignored: that is how forbidden fields stay out. `validate(doc)` returns every problem as (field path, message), each message naming the field; `to_internal(doc)` gives the file shaped as the cage builder (today's S20 code) reads it,
and `from_internal(v0)` converts today's S20.json into v1. The two are exact inverses: the v1 file builds the same cage, bit for bit. The mesh topology (ring counts, columns, caps) and the hand-sampled section table are not fields yet: until the plan owns them
(chunks 21-22) they travel verbatim in `spine.loft`, `parts[].topology` and `legacy`, typed as free objects, so nothing is lost and nothing is ignored.
What is modelled is what a person or an agent edits: the spine's ranges, the head attachment, the tail (length, root, tip radius, curl), the limbs' chains, the sockets and their joins."""
import contextvars
import copy
import difflib
import json
import os
import re

SCHEMA_V1 = "mb-species/1"            # the fixtures (S20) and the play species (S71-S73) stay on /1
SCHEMA_ID = "mb-species/2"            # every other file: the language fields (family, land, signature, eye count, coat material family) are in, cheeks, eye kinds and free palettes are out
SCHEMAS = (SCHEMA_V1, SCHEMA_ID)
# The plans' bands. The plan modules are chunk 26; until then the numbers live here: the owner's where there is one (tail root 0.45, head attachment), the S20 type's own band (about a third either way) where nobody has given one.
PLANS = {
    "biped": dict(ranges=["head", "neck", "back", "seat", "tail"], range_len=dict(head=(0.7, 1.3), neck=(0.15, 0.4), back=(0.6, 1.2), seat=(0.3, 0.8)), tail_length=(0.6, 1.8), tail_root=(0.1, 0.45), tip_r=(0.02, 0.1),
                  attach="underside", a=(0.2, 0.6), d=(0.0, 0.3), seat_radius=(0.4, 0.7), limb_joints=3,
                  prof_R_scale=(0.8, 1.2), prof_neck_ratio=(0.50, 0.80), prof_chest_front=(0.0, 0.12), prof_rump_gain=(0.0, 0.6)),
    "quadruped": dict(ranges=["head", "neck", "back", "seat", "tail"], range_len=dict(head=(0.7, 1.3), neck=(0.15, 0.4), back=(0.6, 1.8), seat=(0.3, 0.8)), tail_length=(0.6, 2.4), tail_root=(0.1, 0.8), tip_r=(0.02, 0.15),
                      attach="back", a=(0.0, 0.0), d=(0.0, 0.0), seat_radius=(0.4, 0.9), limb_joints=3,
                      prof_R_scale=(0.8, 1.2), prof_neck_ratio=(0.50, 0.80), prof_chest_front=(0.0, 0.12), prof_rump_gain=(0.0, 0.3)),
}
STAGES = ("shape", "face", "coat", "motion", "meta")


def num(label, help, stage="shape", rng=None, unit="H", **kw):
    return dict(type="number", label=label, help=help, stage=stage, range=rng, unit=unit, **kw)


def text(label, help, stage="meta", **kw):
    return dict(type="text", label=label, help=help, stage=stage, **kw)


def free(label, help, stage="shape", **kw):
    return dict(type="free", label=label, help=help, stage=stage, **kw)


def obj(label, help, fields, stage="shape", **kw):
    return dict(type="object", label=label, help=help, stage=stage, fields=fields, **kw)


def vec3(label, help, stage="shape"):
    return dict(type="vec3", label=label, help=help, stage=stage, unit="H")


# ---- the /1 schema: path -> field. Lists name their item fields; `required` lists the keys that must be there. /2 is derived from it below.
SCHEMA_1 = dict(
    schema=dict(type="enum", values=[SCHEMA_V1], label="Schema", help="The schema this file is written in.", stage="meta"),
    id=text("Species id", "S and two digits, unique on the server. A mibi a player keeps is M and four digits.", pattern=r"S\d\d|M\d{4}"),
    name=text("Name", "The species' name, once it has a cleared one."),
    plan=dict(type="enum", values=list(PLANS), label="Body plan", help="The body plan: it fixes the spine's ranges, the head attachment and the limits.", stage="meta"),
    plan_version=dict(type="int", label="Plan version", help="The version of the plan this file was made against.", stage="meta"),
    anchors=dict(type="map", values=["wide", "tight"], label="Anchors", help="How wide each group may vary between individuals. Body and face are always tight.", stage="meta", tight=["body", "face"]),
    spine=obj("Spine", "One path and one loft from the crown to the tail tip, named in ranges.", dict(
        ranges=dict(type="list", label="Ranges", help="The spine's named ranges, in the plan's order, with their lengths.", stage="shape",
                    item=dict(name=text("Range", "The range's name.", stage="shape"), length=num("Length", "The range's length along the spine; the last range runs to the end.", rng=None, nullable=True))),
        head_attach=obj("Head attachment", "Where the head sits on the spine. The kind is the plan's.", dict(
            a=num("Head spine reach", "How far in from the back of the head's depth the spine ends.", rng="a", unit="× depth"), d=num("Head overhang", "How far forward of the spine axis the head's centre lies.", rng="d", unit="× depth"),
            z_under=num("Head underside", "The height of the head's underside, where the spine ends.", rng=(0.9, 1.5))), required=["a", "d", "z_under"]),
        seat=obj("Seat", "The seat's size.", dict(radius=num("Seat radius", "The seat's radius; the tail's root is measured against it.", rng="seat_radius")), required=["radius"]),
        tail=obj("Tail", "The tail range of the spine.", dict(
            length=num("Tail length", "The tail's length along its path; its segments keep their shares.", rng="tail_length"),
            root=num("Tail root", "The root's radius as a share of the seat's radius.", rng="tail_root", unit="× seat"),
            tip_r=num("Tail tip radius", "The radius at the stalk's end.", rng="tip_r"),
            root_at=vec3("Tail root place", "Where the tail leaves the seat."),
            segments=dict(type="list", label="Tail segments", help="The tail's bends, root to tip: each keeps a share of the length.", stage="shape",
                          item=dict(name=text("Segment", "The segment's name.", stage="shape"), share=num("Share", "The segment's share of the tail's length.", rng=(0.01, 0.9), unit=""), pitch=num("Bend", "The segment's pitch.", rng=(-720, 720), unit="°"),
                                    r=dict(type="pair", label="Radius", help="The segment's radius at its start and end.", stage="shape", unit="H"), role=text("Role", "The segment's role.", stage="shape"))),
            fillet=num("Tail roundness", "The path's fillet at the tail's bends.", rng=(0.5, 3.0), unit=""),
            curl=obj("Tail curl", "How far the tail curls.", dict(turns=num("Curl", "Turns of curl at the type.", rng=(-0.5, 1.0), unit="turn"), spread=text("Curl spread", "How the curl is spread along the bends.", stage="shape"), clip=text("Curl clip", "The room rule that clips it.", stage="shape"),
                                                                note=text("Note", "A note.", stage="shape")), required=["turns"]),
            taper=free("Tail taper", "How the tail thins (monotone by construction)."), end=free("Tail end", "How the tail's end is capped."), note=text("Note", "A note.", stage="shape")),
            required=["length", "root", "tip_r", "root_at", "segments"]),
        loft=obj("Spine loft", "The loft's profile knobs, and the section table and mesh topology that travel with them (the table is derived from the knobs; the topology is the plan's, until it owns it).", dict(
            head_profile=obj("Profile", "The knobs that shape the loft's section table: the head ball, the neck band, the chest and the rump. The table is worked out from these and is never edited.", dict(
                R_scale=num("Head size", "The head ball's size, as a share of the base table's.", rng="prof_R_scale", unit="× type"),
                neck_ratio=num("Neck width", "The neck band's radius over the head ball's.", rng="prof_neck_ratio", unit="× head"),
                chest_front=num("Chest swell", "How far the chest's front swells out under the neck band.", rng="prof_chest_front", unit="%"),
                rump_gain=num("Seat fullness", "How far the back swells at the seat, under the tail.", rng="prof_rump_gain", unit="%")), rest=True)), rest=True),
    ), required=["ranges", "head_attach", "seat", "tail", "loft"]),
    skeleton=obj("Skeleton", "The girdles that anchor the limbs.", dict(chest=vec3("Chest joint", "The chest joint, on the back range."), pelvis=vec3("Pelvis joint", "The pelvis joint, in the seat range."),
                                                                         shoulder=vec3("Shoulder joint", "Where the arm's shell sits."), hip=text("Hip joint", "Where the leg's root is taken from.", stage="shape"),
                                                                         chest_at=num("Chest joint on the back", "A quadruped's chest joint: where on the back range it stands, 0 at the neck and 1 at the seat.", rng=(0.0, 1.0), unit=""),
                                                                         pelvis_at=num("Pelvis joint on the seat", "A quadruped's pelvis joint: where on the seat range it stands, 0 at the back and 1 at the tail.", rng=(0.0, 1.0), unit=""),
                                                                         shoulder_off=vec3("Shoulder offset", "A quadruped's shoulder: where the foreleg's root is from the chest joint (x forward, y outward, z up)."),
                                                                         hip_off=vec3("Hip offset", "A quadruped's hip: where the hind leg's root is from the pelvis joint (x forward, y outward, z up)."), note=text("Note", "A note.", stage="shape"))),
    parts=dict(type="list", label="Parts", help="The limbs and appendages, each on a socket.", stage="shape", id_key="id", item=dict(
        id=text("Part", "The part's id.", stage="shape"), kind=dict(type="enum", values=["limb", "appendage"], label="Kind", help="A limb has a chain of joints; an appendage has families.", stage="shape"), parent=text("Parent", "The part it grows from.", stage="shape"),
        label=text("Label", "The part's group.", stage="shape"), socket=obj("Socket", "Where and how the part joins its parent.", dict(join=dict(type="enum", values=["hard", "soft"], label="Join", help="Hard: a separate shell sunk in. Soft: it grows out of the parent's skin. Nothing in between.", stage="shape"),
                                                                                                                                 spec=free("Socket details", "Patch, columns, push and the rest of the socket's numbers.")), required=["join"], rest=True),
        root=free("Root joint", "A limb's root joint: where it is, its radius and its role."), chain=dict(type="list", label="Chain", help="A limb's joints after the root, each with its length, pitch and radius.", stage="shape", item=dict(
            joint=text("Joint", "The joint's name.", stage="shape"), len=num("Length", "The segment's length.", rng=(0.0, 1.5)), pitch=num("Pitch", "The segment's pitch.", rng=(-720, 720), unit="°"), r=dict(type="pair", label="Radius", help="The segment's radius at its start and end.", stage="shape", unit="H"), role=text("Role", "The joint's role.", stage="shape"), apex=text("Bend side", "Which way the joint bends (fwd or back).", stage="shape"))),
        families=free("Families", "An appendage's families and their joints."), default=text("Default look", "The family a new individual starts with.", stage="shape"), mirror=text("Mirror", "lateral or centre.", stage="shape"),
        family=text("Family reference", "A reference into the body plan.", stage="shape"), topology=free("Mesh topology", "Rings, edge length and the rest of the part's topology (the plan will own them)."),
        fillet=num("Roundness", "The path's fillet.", rng=(0.5, 3.0), unit=""), end=free("End", "How the part's end is capped."), plane=free("Plane", "The plane the chain bends in."), note=text("Note", "A note.", stage="shape")),
        required=["id", "kind", "socket"]),
    sockets=dict(type="list", label="Sockets", help="Where attachments grow: each declares a join and the families it allows.", stage="shape", id_key="id", item=dict(id=text("Socket", "The socket's id.", stage="shape"), spec=free("Socket details", "On, station, frame, families, default and shapes.")), required=["id"], rest=True),
    face=free("Face", "Eyes, mouth and cheeks.", stage="face"),
    coat=obj("Coat", "Zones, layouts, palettes and material.", dict(zones=free("Zones", "The coat's zones.", stage="coat"), layouts=free("Layouts", "The coat's layouts.", stage="coat"), palettes=free("Palettes", "The coat's palettes.", stage="coat"), material=free("Material", "The material family and its limits.", stage="coat")), stage="coat"),
    genome=obj("Genome", "The game's species frame: the catalogue pin, the chapters, and each locus with its kind, pool, limits, type and the typed paths it moves.", dict(
        catalogue=free("Catalogue pin", "The catalogue this frame is valid against: id, version and content digest.", stage="meta"), clan=free("Clan", "The species' clan: its branch records are open to it.", stage="meta"),
        borrows=free("Borrowed records", "Branch records of another clan this species lists.", stage="meta"), chapters=free("Chapters", "The chapters the loci are grouped in.", stage="meta"),
        loci=free("Loci", "Each locus: kind, op, limits, type, bins and moves (typed paths into this file).", stage="meta")), stage="meta", required=["catalogue", "chapters", "loci"]),
    expressions=free("Expressions", "The looks the species can draw with their rules: the age a look shows from and the other looks it needs (checked in expressions.py; how copies show is the catalogue's, or a modifier gene's).", stage="meta"),
    variety=free("Variety", "The Variety sheet's rules: how many individuals, the seed, the loci whose looks cycle, the most loud looks one individual shows, and the species rules as data: {id, label, when: [conditions], then: [conditions], fail}. A condition is {field, is | not | in: [lo, hi]} or {any: [conditions]}.", stage="meta"),
    renders=free("Renders", "The render set: {base: 'game-v1', add: {name: {size, style, az, pose, age, kind, from, genome}}}. A species adds to the game's set and never removes from it.", stage="meta"),
    play=free("Play", "What play may change: {toys: [{id, label, hide, narrow}], words: {check: sentence}, state: {gene: value}, starter, name}. A species may relabel a toy, hide it or narrow it, never widen it; `state` is the mibi's own setting of each toy and `name` its own name (checked in wb/play.py).", stage="meta"),
    motion=free("Motion", "Walk, breathe, blink and idle clips.", stage="motion"),
    limits=obj("Limits", "Overrides of the plan's limits. A file may only tighten them, never loosen.", dict(vertices=num("Vertex budget", "Vertices at subdivision level 1.", rng=(1000, 3500), unit=""), balance_margin=num("Balance margin", "Share of the sole in front of the heel.", rng=(0.15, 0.5), unit=""),
                                                                                            tail_side_area=num("Tail side area", "Tail silhouette over the trunk's.", rng=(0.02, 0.25), unit=""), neck_ratio=num("Neck ratio", "Neck over head and chest.", rng=(0.3, 0.85), unit=""),
                                                                                            normal_deg=num("Normal angle", "The steepest edge between faces.", rng=(5, 20), unit="°"))),
    legacy=free("Legacy", "Fields the schema does not model yet and carries unchanged: the house, the frame, the mesh quality numbers, the poles, the appendage rules, the part order.", stage="meta"),
)
REQUIRED_1 = ["schema", "id", "name", "plan", "plan_version", "anchors", "spine", "skeleton", "parts", "sockets", "face", "coat", "genome", "motion", "legacy"]


# ---- the language registry (framework/language.json, generated from framework/language.mjs): the lands, families, vocabularies, kinds and fixtures the /2 fields are checked against
REGISTRY_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "framework", "language.json")
_REGISTRY = {}


def registry():
    """The language registry, read once. The studio never types its numbers: the lands, families, kinds and the fixture list come from the file the genome line generates."""
    if "r" not in _REGISTRY:
        with open(REGISTRY_PATH) as fh:
            _REGISTRY["r"] = json.load(fh)
    return _REGISTRY["r"]


def is_fixture(species_id):
    """A frozen regression file the registry lists (S20): every language check skips it and it stays on /1."""
    return any(f["id"] == species_id for f in registry()["fixtures"])


def registry_kind(species_id):
    return next((k for k in registry()["kinds"] if k["id"] == species_id), None)


# ---- /2: /1 plus the language. OWED to the copywriter: every label and help line below, and every message in `language_errors`; the field names are the plan's (family, land, signature, face.eyes.count, coat.material.family).
def _schema_2():
    r = registry()
    v = r["vocab"]
    s = copy.deepcopy(SCHEMA_1)
    s["schema"] = dict(type="enum", values=[SCHEMA_ID], label="Schema", help="The schema this file is written in.", stage="meta")
    lang = dict(
        family=dict(type="enum", values=[f["id"] for f in r["families"]], label="Family", help="The build family: it fixes the skeleton. One kind to a family.", stage="meta"),
        land=dict(type="enum", values=[l["id"] for l in r["lands"]], label="Land", help="The land the colours come from. Empty until the kind is set in one.", stage="meta", nullable=True),
        signature=dict(type="object", label="Signature", help="The kind's one signature: its type and where it sits. Empty until one is picked.", stage="shape", nullable=True, fields=dict(
            type=text("Signature type", "What the signature is.", stage="shape"),
            socket=dict(type="enum", values=v["signatureSockets"], label="Signature socket", help="Where the signature sits. Never on the face.", stage="shape"),
            count=free("Signature count", "How many, or the band the count varies in.", stage="shape"),
            curl=free("Signature curl", "How far it bends, or the band the bend varies in.", stage="shape"),
            accent=dict(type="enum", values=["land", "own"], label="Signature accent", help="Whose colour the signature takes: the land's accent, or the kind's own.", stage="coat")), required=["type", "socket"]),
    )
    s = {**{k: s[k] for k in ("schema", "id", "name")}, **lang, **{k: x for k, x in s.items() if k not in ("schema", "id", "name")}}
    s["face"] = obj("Face", "Eyes and mouth. Cheeks and eye kinds are not in this schema.", dict(
        eyes=obj("Eyes", "The house eye, and how many.", dict(
            count=dict(type="enum", values=v["eyeCounts"], label="Eye count", help="Two eyes; three only on Lehten. No locus varies it.", stage="face"),
            station=num("Eye station", "Where along the head the eyes sit.", stage="face", rng=None), around=num("Eye around", "How far round the head the eyes sit.", stage="face", rng=None, unit=""),
            r=num("Eye radius", "The eye's radius.", stage="face", rng=None), iris=free("Iris", "The iris: its share of the disc, the pupil, the value.", stage="face"), catch=free("Highlight", "The eye's highlight.", stage="face"),
            frames=free("Eye frames", "The eye's open, half and closed frames.", stage="face"), default=text("Default eye", "The eye a new individual starts with.", stage="face"),
            attitude=dict(type="enum", values=v["attitudes"], label="Attitude", help="The quiet look the eyes and mouth share: content, curious, deadpan or knowing.", stage="face"),
            lid=free("Lid", "How far the lid closes and the shape of its edge.", stage="face")),
            stage="face", required=["count"], refused=dict(kinds="eye kinds are not a field of mb-species/2: every eye is the house eye (set face.eyes.count)")),
        mouth=free("Mouth", "The mouth and its expressions.", stage="face"), kind=text("Face kind", "How the face is drawn on the body.", stage="face"), on=text("Face part", "The part the face sits on.", stage="face"), island=text("Face island", "The island the face is drawn on.", stage="face")),
        stage="face", required=["eyes"], refused=dict(cheeks="cheeks are not a field of mb-species/2: no blush"))
    s["coat"] = obj("Coat", "Zones, layouts and material. Colour comes from the land, not from a palette.", dict(
        zones=free("Zones", "The coat's zones.", stage="coat"), layouts=free("Layouts", "The coat's layouts.", stage="coat"),
        material=obj("Material", "The material family and its limits.", dict(
            family=dict(type="enum", values=v["coatMaterials"], label="Material family", help="What the coat is made of.", stage="coat"),
            pile=dict(type="enum", values=v["furPiles"], label="Fur pile", help="The kind of fur. Only fur has one.", stage="coat"),
            limits=free("Material limits", "The material's parameter ranges.", stage="coat"), glow=free("Glow", "The glowing part.", stage="coat")), stage="coat", required=["family"])),
        stage="coat", required=["material"], refused=dict(palettes="free palettes are not a field of mb-species/2: colour comes from the land"))
    return s


SCHEMA = _schema_2()                    # the current schema: labels, stages and the form read this
REQUIRED = ["schema", "id", "name", "plan", "family", "land", "signature", "plan_version", "anchors", "spine", "skeleton", "parts", "sockets", "face", "coat", "genome", "motion", "legacy"]
_SCHEMA_OF = {SCHEMA_V1: (SCHEMA_1, REQUIRED_1), SCHEMA_ID: (SCHEMA, REQUIRED)}
_CUR = contextvars.ContextVar("species_schema", default=SCHEMA_V1)


# ----------------------------------------------------------------------------------------------------------------------------------------------------------------- labels
def walk(schema, prefix=""):
    """Every modelled field as (dotted path, field spec); list items appear under `path[]`."""
    for k, f in schema.items():
        p = f"{prefix}{k}"
        yield p, f
        if f["type"] == "object":
            yield from walk(f["fields"], p + ".")
        elif f["type"] == "list" and "item" in f:
            yield from walk(f["item"], p + "[].")


def labels():
    """dotted path (with list items as ids or positions replaced by `*`) -> label: for the page's toasts and forms."""
    return {p.replace("[]", ".*"): f["label"] for p, f in walk(SCHEMA)}


def _match(table, path):
    """The entry of `table` (schema path with `*` for a list item) that a concrete dotted path ('parts.leg.L.chain.1.len': an item may be a position or an id with dots in it) falls under: the full match, else the longest prefix."""
    parts = path.split(".")
    for i in range(len(parts), 0, -1):
        cand = ".".join(parts[:i])
        for key in sorted(table, key=len, reverse=True):
            if re.fullmatch(re.escape(key).replace(r"\*", r"[^.]+(?:\.[^.]+){0,2}"), cand):
                return table[key]
    return None


def label_of(path):
    """The schema's label for a concrete dotted path ('spine.tail.length' -> 'Tail length', 'parts.leg.L.chain.1.len' -> 'Length'), else None."""
    return _match(labels(), path)


def stage_of(path):
    return _match({p.replace("[]", ".*"): f["stage"] for p, f in walk(SCHEMA)}, path)


# ----------------------------------------------------------------------------------------------------------------------------------------------------------------- validation
def _kind(v):
    return "nothing" if v is None else "true or false" if isinstance(v, bool) else "a number" if isinstance(v, (int, float)) else "text" if isinstance(v, str) else "a list" if isinstance(v, list) else "an object"


def _plan(doc):
    return PLANS.get(doc.get("plan")) if isinstance(doc, dict) else None


def _range(f, plan):
    r = f.get("range")
    if isinstance(r, str):
        return plan.get(r) if plan else None
    return r


def _check(path, v, f, plan, errs):
    t = f["type"]
    if t == "free":
        return
    if v is None and f.get("nullable"):
        return
    if t in ("number", "int"):
        if isinstance(v, bool) or not isinstance(v, (int, float)) or (t == "int" and not isinstance(v, int)):
            errs.append((path, f"{path}: must be {'a whole number' if t == 'int' else 'a number'}, got {_kind(v)}"))
            return
        r = _range(f, plan)
        if r and not (r[0] <= v <= r[1]):
            if f.get("unit") == "%":                                         # a share is said as a percentage: 0.05 is "+5 %"
                errs.append((path, f"{path} is +{v * 100:g} %; the {doc_plan_name(plan)} plan allows +{r[0] * 100:g} to +{r[1] * 100:g} %"))
            else:
                errs.append((path, f"{path} is {v:g}{(' ' + f['unit']) if f.get('unit') else ''}; the {doc_plan_name(plan)} plan allows {r[0]:g} to {r[1]:g}"))
    elif t == "text":
        if not isinstance(v, str):
            errs.append((path, f"{path}: must be text, got {_kind(v)}"))
        elif f.get("pattern") and not re.fullmatch(f["pattern"], v):
            errs.append((path, f"{path}: '{v}' is not a species id (S and two digits, like S20)"))
    elif t == "enum":
        if v not in f["values"]:
            errs.append((path, f"{path}: '{v}' is not one of {', '.join(map(str, f['values']))}"))
    elif t == "vec3":
        if not (isinstance(v, list) and len(v) == 3 and all(isinstance(x, (int, float)) and not isinstance(x, bool) for x in v)):
            errs.append((path, f"{path}: must be three numbers (x, y, z), got {_kind(v)}"))
    elif t == "pair":
        if not (isinstance(v, list) and len(v) == 2 and all(isinstance(x, (int, float)) and not isinstance(x, bool) for x in v)):
            errs.append((path, f"{path}: must be two numbers (start and end), got {_kind(v)}"))
    elif t == "map":
        if not isinstance(v, dict):
            errs.append((path, f"{path}: must be an object of group to {' or '.join(f['values'])}, got {_kind(v)}"))
            return
        for k, x in v.items():
            if x not in f["values"]:
                errs.append((f"{path}.{k}", f"{path}.{k}: '{x}' is not {' or '.join(f['values'])}"))
        for k in f.get("tight", []):
            if v.get(k) != "tight":
                errs.append((f"{path}.{k}", f"{path}.{k}: body and face are always tight, got {v.get(k)!r}"))
    elif t == "object":
        _object(path, v, f, plan, errs)
    elif t == "list":
        if not isinstance(v, list):
            errs.append((path, f"{path}: must be a list, got {_kind(v)}"))
            return
        for i, it in enumerate(v):
            key = it.get(f.get("id_key", "name")) if isinstance(it, dict) else None
            _object(f"{path}.{key if isinstance(key, str) else i}", it, dict(fields=f["item"], required=f.get("required", []), rest=f.get("rest")), plan, errs)


def doc_plan_name(plan):
    return next((k for k, v in PLANS.items() if v is plan), "plan")


def _object(path, v, f, plan, errs):
    if not isinstance(v, dict):
        errs.append((path, f"{path}: must be an object, got {_kind(v)}"))
        return
    fields = f["fields"]
    for k in f.get("required", []):
        if k not in v:
            errs.append((f"{path}.{k}" if path else k, f"{path + '.' if path else ''}{k}: missing (it is required{': ' + fields[k]['help'] if k in fields else ''})"))
    for k, x in v.items():
        if k in f.get("refused", {}):
            errs.append((f"{path}.{k}" if path else k, f"{path + '.' if path else ''}{k}: {f['refused'][k]}"))
        elif k in fields:
            _check(f"{path}.{k}" if path else k, x, fields[k], plan, errs)
        elif not f.get("rest"):
            near = difflib.get_close_matches(k, list(fields), n=1, cutoff=0.6)
            errs.append((f"{path}.{k}" if path else k, f"{path + '.' if path else ''}{k}: not a field of {_CUR.get()}" + (f" (did you mean {path + '.' if path else ''}{near[0]}?)" if near else "") + "; fields that are not listed are rejected"))


def validate(doc):
    """Every problem in the file as [(field path, message)], most structural first. An empty list is a valid file. Each message names the field the way `wb set` writes it."""
    errs = []
    if not isinstance(doc, dict):
        return [("", f"the file must be an object, got {_kind(doc)}")]
    if doc.get("schema") not in SCHEMAS:
        return [("schema", f"schema: must be '{SCHEMA_V1}' or '{SCHEMA_ID}', got {doc.get('schema')!r}")]
    if doc["schema"] == SCHEMA_ID and isinstance(doc.get("id"), str) and is_fixture(doc["id"]):
        return [("schema", f"schema: {doc['id']} is a fixture of the language registry and stays {SCHEMA_V1}")]
    if doc["schema"] == SCHEMA_V1 and isinstance(doc.get("id"), str) and is_fixture(doc["id"]):
        lang = [k for k in ("family", "land", "signature") if k in doc]
        if lang:
            return [(lang[0], f"{lang[0]}: {doc['id']} is a fixture of the language registry; a fixture has no family, land or signature")]
    fields, required = _SCHEMA_OF[doc["schema"]]
    _CUR.set(doc["schema"])
    plan = _plan(doc)
    if doc.get("plan") not in PLANS:
        errs.append(("plan", f"plan: '{doc.get('plan')}' is not a registered plan (have: {', '.join(PLANS)})"))
    _object("", doc, dict(fields=fields, required=required), plan, errs)
    if doc["schema"] == SCHEMA_ID:
        if isinstance(doc.get("signature"), list):
            errs = [e for e in errs if e[0] != "signature"]
        errs += language_errors(doc)
    if plan and isinstance(doc.get("spine"), dict):
        rg = doc["spine"].get("ranges")
        if isinstance(rg, list) and all(isinstance(r, dict) for r in rg):
            names = [r.get("name") for r in rg]
            if names != plan["ranges"]:
                errs.append(("spine.ranges", f"spine.ranges: the {doc_plan_name(plan)} plan's ranges are {', '.join(plan['ranges'])} in that order, got {', '.join(map(str, names))}"))
            else:
                for r in rg:
                    lo_hi = plan["range_len"].get(r["name"])
                    L = r.get("length")
                    if lo_hi and isinstance(L, (int, float)) and not (lo_hi[0] <= L <= lo_hi[1]):
                        errs.append((f"spine.ranges.{r['name']}.length", f"spine.ranges.{r['name']}.length is {L:g} H; the {doc_plan_name(plan)} plan allows {lo_hi[0]:g} to {lo_hi[1]:g}"))
        ha = doc["spine"].get("head_attach")
        if isinstance(ha, dict) and plan["attach"] == "back" and ha.get("a", 0) not in (0, 0.0):
            errs.append(("spine.head_attach.a", "spine.head_attach.a: a quadruped's head is entered from behind on the spine axis, so a is 0"))
        tl = (doc["spine"].get("tail") or {})
        segs = tl.get("segments") if isinstance(tl, dict) else None
        if isinstance(segs, list) and all(isinstance(s, dict) and isinstance(s.get("share"), (int, float)) for s in segs) and segs:
            tot = sum(s["share"] for s in segs)
            if abs(tot - 1.0) > 1e-6:
                errs.append(("spine.tail.segments", f"spine.tail.segments: the shares add up to {tot:.4g}, they must add up to 1"))
    if plan and doc.get("plan") == "biped" and isinstance(doc.get("skeleton"), dict):
        for g in ("chest", "pelvis"):
            if g not in doc["skeleton"]:
                errs.append((f"skeleton.{g}", f"skeleton.{g}: missing (it is required: the {g} joint)"))
    if plan and doc.get("plan") == "quadruped" and isinstance(doc.get("spine"), dict) and isinstance(doc.get("skeleton"), dict) and not errs:
        import quadruped as QD
        errs += QD.girdle_errors(doc)                        # the girdles on the spine in their ranges, the limbs named and standing on the floor
    if "play" in doc and isinstance(doc.get("genome"), dict) and plan:
        from wb import play as PL
        errs += PL.validate(doc)
    for p in (doc.get("parts") or []) if isinstance(doc.get("parts"), list) else []:
        if isinstance(p, dict) and p.get("kind") == "limb":
            ch = p.get("chain")
            if isinstance(ch, list) and plan and len(ch) != plan["limb_joints"]:
                errs.append((f"parts.{p.get('id')}.chain", f"parts.{p.get('id')}.chain: a limb has {plan['limb_joints']} joints after its root, got {len(ch)}"))
    ap = (doc.get("legacy") or {}).get("appendages") if isinstance(doc.get("legacy"), dict) else None
    for fam, v in (ap.items() if isinstance(ap, dict) else []):                  # an appendage family is shown at the body's subdivision level or one level less (a few pixels wide: whiskers, fangs)
        if isinstance(v, dict) and "subdiv_offset" in v and (isinstance(v["subdiv_offset"], bool) or v["subdiv_offset"] not in (0, -1)):
            errs.append((f"legacy.appendages.{fam}.subdiv_offset", f"legacy.appendages.{fam}.subdiv_offset: must be 0 (the body's level) or -1 (one level less), got {v['subdiv_offset']!r}"))
    # a socket's join is the owner's rule (2 Nov 23:02): required, hard or soft, nothing in between
    if isinstance(doc.get("genome"), dict) and not errs:
        import genomeapply as GA
        errs += GA.validate(doc)
    return errs


def language_errors(doc):
    """What the registry adds to a /2 file: a kind it lists keeps its family, land, eye count and coat material (a template with no land yet may set one); one signature, never on the face. A fixture is skipped.
    OWED to the copywriter: these messages."""
    sid = doc.get("id")
    if not isinstance(sid, str) or is_fixture(sid):
        return []
    errs = []
    sig = doc.get("signature")
    if isinstance(sig, list):
        errs.append(("signature", f"signature: a kind has one signature, got {len(sig)}"))
    k = registry_kind(sid)
    if k is None:
        return errs
    if doc.get("family") != k["family"]:
        errs.append(("family", f"family: {sid} is the {k['family']} family in the registry, got {doc.get('family')!r}"))
    if k["land"] is not None and doc.get("land") != k["land"]:
        errs.append(("land", f"land: {sid} lives in {k['land']} in the registry, got {doc.get('land')!r}"))
    cnt = ((doc.get("face") or {}).get("eyes") or {}).get("count") if isinstance(doc.get("face"), dict) and isinstance(doc["face"].get("eyes"), dict) else None
    if cnt in registry()["vocab"]["eyeCounts"] and cnt != k["eyes"]["count"]:
        errs.append(("face.eyes.count", f"face.eyes.count: {sid} has {k['eyes']['count']} eyes in the registry, got {cnt}"))
    mat = ((doc.get("coat") or {}).get("material") or {}).get("family") if isinstance(doc.get("coat"), dict) and isinstance(doc["coat"].get("material"), dict) else None
    if mat in registry()["vocab"]["coatMaterials"] and mat != k["coat"]["material"]:
        errs.append(("coat.material.family", f"coat.material.family: {sid} is {k['coat']['material']} in the registry, got {mat}"))
    return errs


def first_error(doc):
    e = validate(doc)
    return e[0] if e else None


# ----------------------------------------------------------------------------------------------------------------------------------------------------------------- converter
def r9(x):
    return round(float(x), 9)


def from_internal(d):
    """Today's S20.json (mb-body/1) -> a v1 document. The inverse of to_internal."""
    d = copy.deepcopy(d)
    order = list(d["parts"])
    torso, tail = d["parts"].pop("torso"), d["parts"].pop("tail")
    rg = torso["spine"].pop("ranges")
    seat_r = 0.55
    ha = torso.pop("head_attach")
    skel = torso.pop("skeleton")
    legacy = dict(frame=d["frame"], unit=d["unit"], house=d["house"], plan_code=d["plan"], poles=d["poles"], mesh_quality=d["mesh_quality"], appendages=d["appendages"], join_rule=d["join_rule"],
                  all_part_order=order, top_order=list(d), torso_parent=torso.pop("parent"), torso_kind=torso.pop("kind"), tail_label=tail.pop("label"), tail_kind=tail.pop("kind"),
                  tail_parent=tail.pop("parent", None))
    js = tail.pop("joints")
    total = sum(j["len"] for j in js[1:])
    tl = dict(length=r9(total), root=r9(js[0]["r"][0] / seat_r), tip_r=js[-1]["r"][0], root_at=js[0]["at"], segments=[], **{k: tail[k] for k in ("fillet", "curl", "taper", "end", "note") if k in tail})
    legacy["tail_root_joint"] = {k: v for k, v in js[0].items() if k not in ("at", "r")}
    legacy["tail_extra"] = {k: v for k, v in tail.items() if k not in tl}
    legacy["tail_root_r"] = js[0]["r"]
    for j in js[1:]:
        s = dict(name=j["name"], share=r9(j["len"] / total), pitch=j["pitch"], r=j["r"])
        if "role" in j:
            s["role"] = j["role"]
        tl["segments"].append(s)
    if "curl" in tl:
        c = tl["curl"]
        tl["curl"] = dict(turns=c["turns_type"], **{k: v for k, v in c.items() if k != "turns_type"})
    parts = []
    for k, p in d["parts"].items():
        q = dict(id=k, kind="limb" if p["kind"] == "limb" else "appendage")
        for key in ("parent", "label", "socket", "families", "default", "mirror", "family", "fillet", "end", "plane", "note"):
            if key in p:
                q[key] = p[key]
        if p["kind"] == "limb":
            root = dict(p["joints"][0])
            q["root"] = root
            q["chain"] = [dict(joint=j["name"], **{kk: vv for kk, vv in j.items() if kk != "name"}) for j in p["joints"][1:]]
        q["topology"] = {kk: p[kk] for kk in ("ring", "edge") if kk in p}
        extra = {kk: vv for kk, vv in p.items() if kk not in ("kind", "parent", "label", "socket", "families", "default", "mirror", "family", "fillet", "end", "plane", "note", "joints", "ring", "edge")}
        if extra:
            q["topology"]["extra"] = extra
        parts.append(q)
    sockets = [dict(id=k, spec=v) for k, v in d["sockets"].items()]
    doc = dict(schema=SCHEMA_V1, id=d["species"], name=d["name"], plan=d["body_plan"], plan_version=1, anchors=d["anchors"],
               spine=dict(ranges=[dict(name=k, length=None if k == "tail" else r9(v[1] - v[0])) for k, v in rg.items()], head_attach=dict(a=ha["a"], d=ha["d"], z_under=ha["z_under"]), seat=dict(radius=seat_r), tail=tl, loft=torso),
               skeleton=skel, parts=parts, sockets=sockets, face=d["face"], coat=dict(zones=d["zones"], layouts=d["layouts"], palettes=d["palettes"], material=d["material"]), genome=None, motion=d["motion"], legacy=legacy)
    legacy["genome_v0"] = dict(genes=d["genes"], counts=d["counts"])
    legacy["head_attach_extra"] = {k: v for k, v in ha.items() if k not in ("a", "d", "z_under", "attach")}
    legacy["tail_range_end"] = rg["tail"][1]
    assert rg["head"][0] == 0.0 and all(abs(rg[a][1] - rg[b][0]) < 1e-9 for a, b in zip(list(rg), list(rg)[1:])), "the ranges are not contiguous"
    from wb import make_genome_block as MG
    doc["genome"] = MG.block()
    doc["expressions"] = copy.deepcopy(MG.EXPRESSIONS)
    doc["variety"] = copy.deepcopy(MG.VARIETY)
    doc["renders"] = copy.deepcopy(MG.RENDERS)
    return doc


def materialise(doc):
    """A working copy of a v1 file with the tail's derived fields written out: each segment's `len` (share x length, to 9 places: what the cage builder is given) and the root's radii `root_r`.
    Genes move these (a gene scales a segment's length, not its share of a total that would then no longer add up to 1), and the working copy gives the same numbers apply_shape worked on."""
    d = copy.deepcopy(doc)
    t, lg = d["spine"]["tail"], d["legacy"]
    for s in t["segments"]:
        s["len"] = r9(s["share"] * t["length"])
    seat_r = d["spine"]["seat"]["radius"]
    t["root_r"] = list(lg["tail_root_r"]) if abs(t["root"] - lg["tail_root_r"][0] / seat_r) < 1e-9 else [r9(t["root"] * seat_r)] * 2
    return d


def to_internal(doc, check=True):
    """A v1 document -> the dict the cage builder reads (today's S20.json shape). Raises ValueError naming the field when the file is not valid. `check=False` skips the validation: the generic apply converts a file whose genes have moved fields past their bands."""
    errs = validate(doc) if check else []
    if errs:
        raise ValueError(errs[0][1])
    doc = copy.deepcopy(doc)
    lg = doc["legacy"]
    sp = doc["spine"]
    torso = dict(kind=lg["torso_kind"], parent=lg["torso_parent"], **sp["loft"])
    rngs, at = {}, 0.0
    for r in sp["ranges"]:
        end = lg["tail_range_end"] if r["length"] is None else r9(at + r["length"])
        rngs[r["name"]] = [at, end]
        at = end
    torso["spine"]["ranges"] = rngs
    torso["head_attach"] = dict(attach=_plan(doc)["attach"], **lg["head_attach_extra"], a=sp["head_attach"]["a"], d=sp["head_attach"]["d"], z_under=sp["head_attach"]["z_under"])
    torso["skeleton"] = doc["skeleton"]
    # the segments' lengths: share x length, rounded to 9 places (a file edits `length`; the shares keep the tail's shape)
    t = sp["tail"]
    seat_r = sp["seat"]["radius"]
    root_r = t["root_r"] if "root_r" in t else lg["tail_root_r"] if abs(t["root"] - lg["tail_root_r"][0] / seat_r) < 1e-9 else [r9(t["root"] * seat_r)] * 2
    joints = [{**lg["tail_root_joint"], "at": t["root_at"], "r": root_r}]
    for i, s in enumerate(t["segments"]):
        j = dict(name=s["name"], len=s["len"] if "len" in s else r9(s["share"] * t["length"]), pitch=s["pitch"], r=list(s["r"]))
        if "role" in s:
            j["role"] = s["role"]
        joints.append(j)
    joints[-1]["r"] = [t["tip_r"], t["tip_r"]] if abs(t["tip_r"] - joints[-1]["r"][0]) > 1e-12 else joints[-1]["r"]
    tail = dict(kind=lg["tail_kind"], label=lg["tail_label"], joints=joints)
    for k in ("fillet", "curl", "taper", "end", "note"):
        if k in t:
            tail[k] = t[k]
    if "curl" in tail:
        c = dict(tail["curl"])
        tail["curl"] = dict(turns_type=c.pop("turns"), **c)
    tail.update(lg["tail_extra"])
    if lg.get("tail_parent") is not None:
        tail["parent"] = lg["tail_parent"]
    pdict = {}
    for q in doc["parts"]:
        p = dict(kind="limb" if q["kind"] == "limb" else "tube")
        for key in ("parent", "label"):
            if key in q:
                p[key] = q[key]
        p.update({k: v for k, v in q["topology"].items() if k != "extra"})
        for key in ("socket", "families", "default", "mirror", "family", "fillet", "end", "plane", "note"):
            if key in q:
                p[key] = q[key]
        if q["kind"] == "limb":
            p["joints"] = [q["root"]] + [dict(name=c["joint"], **{k: v for k, v in c.items() if k != "joint"}) for c in q["chain"]]
        p.update(q["topology"].get("extra", {}))
        pdict[q["id"]] = p
    parts = {}
    for k in lg["all_part_order"]:
        parts[k] = torso if k == "torso" else tail if k == "tail" else pdict[k]
    d = dict(schema="mb-body/1", species=doc["id"], name=doc["name"], plan=lg["plan_code"], frame=lg["frame"], unit=lg["unit"], house=lg["house"], anchors=doc["anchors"], parts=parts,
             sockets={s["id"]: s["spec"] for s in doc["sockets"]}, face=doc["face"], zones=doc["coat"]["zones"], layouts=doc["coat"]["layouts"], palettes=doc["coat"]["palettes"], material=doc["coat"]["material"],
             genes=lg["genome_v0"]["genes"], counts=lg["genome_v0"]["counts"], motion=doc["motion"], poles=lg["poles"], mesh_quality=lg["mesh_quality"], appendages=lg["appendages"], join_rule=lg["join_rule"], body_plan=doc["plan"])
    out = {k: d[k] for k in lg["top_order"]}
    out["genome"] = doc["genome"]                       # the typed genome block travels with the file the cage builder reads
    if "limits" in doc:
        out["limits"] = doc["limits"]
    return out


def is_v1(spec):
    """A species file of either schema (/1 for the fixtures and play species, /2 for the rest)."""
    return isinstance(spec, dict) and spec.get("schema") in SCHEMAS


# ----------------------------------------------------------------------------------------------------------------------------------------------------------------- plan templates
TEMPLATES = {"quadruped": "templates/quadruped.json"}          # a plan's template: a bare base that passes every check (the biped's is S20 itself until its plan module, chunk 26)


def template(plan):
    """The plan's template file as it is stored, or None when the plan has none yet."""
    rel = TEMPLATES.get(plan)
    if rel is None:
        return None
    import json
    import os
    with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "species_v1", rel)) as fh:
        return json.load(fh)


def new_from_template(species_id, plan):
    """A new species file from the plan's template: the same bare base with its own id and no name yet. Raises ValueError with the words to say when it cannot."""
    if not re.fullmatch(r"S\d\d", str(species_id)):
        raise ValueError(f"'{species_id}' is not a species id. An id is S and two digits, like S23.")
    doc = template(plan)
    if doc is None:
        raise ValueError(f"The {plan} plan has no template yet.")
    doc["id"], doc["name"] = species_id, ""
    return doc
