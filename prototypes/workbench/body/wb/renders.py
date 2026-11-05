"""Chunk 11: render sets. The species file's `renders` block names a base set (`game-v1`, supplied by the framework) and may add outputs of its own, never remove one:
  "renders": {"base": "game-v1", "add": {"card-plum": {"size": "96x96", "style": "plush", "az": [32], "pose": "calm", "age": "adult", "genome": {"hue": 300}, "kind": "sprite"}}}
Only the file is read here: no build, no render. `expand(doc)` lists every picture the set asks for, one row per variant, each `ready` or `owed` (the species cannot draw that age or pose yet, with the reason).
An output has: size ("WxH", or per age in `sizes`), style, az (list), pose (list), age (list), kind (sprite, strip, layers, glb), from (render | master), `figure` (from master: the figure's height in px per age, crest to feet),
`per` ("expression": one picture per look the file declares), and `where` (what the game does with it)."""
import copy
import re

STYLES = ("plush", "clay", "silhouette", "normal", "parts", "wire")
NOT_YET = ("pixel",)
AGES = ("juvenile", "adult", "elder")
KINDS = ("sprite", "strip", "layers", "glb")
FROM = ("render", "master")
BASE = "game-v1"
OUT_KEYS = {"size", "sizes", "style", "az", "pose", "age", "genome", "kind", "from", "figure", "per", "where", "frames"}
PLACE_304 = "304x312"

# game-v1: the sizes the game draws (stand sizes and places as the game's config and art direction give them)
GAME_V1 = {
    "stand": dict(size=PLACE_304, style=["plush"], pose=["calm", "anchor", "curl", "shake"], age=["adult", "juvenile"], az=[32], kind="layers", **{"from": "render"},
                  where="Habitat, Sitting, hatch hand-off, dock arrival; the master for everything below"),
    "resident": dict(sizes=dict(adult="144x152", juvenile="104x112"), style=["plush"], pose=["calm"], age=["adult", "juvenile"], az=[32], kind="sprite", **{"from": "master"},
                     figure=dict(adult=54, juvenile=40), where="Home, Idle, Vivarium"),
    "habitat": dict(size=PLACE_304, style=["plush"], pose=["calm"], age=["adult", "juvenile"], az=[32], kind="sprite", **{"from": "master"},
                    figure=dict(adult=150, juvenile=110), where="Habitat and Sitting up close"),
    "incubator": dict(size=PLACE_304, style=["plush"], pose=["calm"], age=["juvenile"], az=[32], kind="sprite", **{"from": "master"},
                      figure=dict(juvenile=146), where="Incubator"),
    "sleeper": dict(size="96x88", style=["plush"], pose=["curl"], age=["adult", "juvenile"], az=[32], kind="sprite", **{"from": "render"}, where="Nap and sleep"),
    "card": dict(size="96x96", style=["plush"], pose=["calm"], age=["adult"], az=[32], kind="sprite", **{"from": "render"}, where="Cards"),
    "trait": dict(size="128x160", style=["plush"], pose=["calm"], age=["adult"], az=[32], kind="sprite", **{"from": "render"}, per="expression", where="Trait pictures, the Library figure"),
    "thumb": dict(size="48x48", style=["plush"], pose=["calm"], age=["adult", "juvenile"], az=[32], kind="sprite", **{"from": "render"}, where="Roster, bay, Cross thumbnails, Companion places"),
    "silhouette": dict(size=["304x312", "48x48"], style=["silhouette"], pose=["calm"], age=["adult"], az=[32], kind="sprite", **{"from": "render"}, where="The art pipeline's control set; icon silhouettes; the 48 read"),
    "turn": dict(size=PLACE_304, style=["clay", "plush"], pose=["calm"], age=["adult"], az=[0, 32, 90, 180], kind="sprite", **{"from": "render"}, where="Review; the AD's turnaround"),
    "walk": dict(size=PLACE_304, style=["plush"], pose=["walk"], age=["adult", "juvenile"], az=[32], kind="strip", frames=6, **{"from": "render"}, where="Play's see it move; the gate's motion sheet"),
    "model": dict(style=["plush"], pose=["all clips"], age=["adult"], kind="glb", where="The viewer and the review export"),
}
# what this framework can draw of a set today; a variant outside it is `owed` with the reason
CAN_QUAD = dict(
    ages={"adult": True},
    poses={"calm": True, "anchor": True, "walk": True, "curl": True},         # the quadruped's rig has the clips of wb/clips.py QUAD_CLIPS: walk, breathe, sit, curl (a strip's frames are counted there)
    kinds={"sprite": True, "layers": True, "strip": True},
    why_age="no young body in the species file yet",
    why_pose="no {pose} pose on the quadruped's rig",
    why_kind={"glb": "no model export yet"},
    why_style="the quadruped has no coat yet: only clay and silhouette draw it",
)
CAN = dict(
    ages={"adult": True},
    poses={"calm": True, "anchor": True, "walk": True, "idle": True},         # anchor is the stage's own entry pose: the same pixels as calm until a species cuts more poses; walk and idle are the rig's clips (wb/clips.py)
    kinds={"sprite": True, "layers": True, "strip": True},
    why_age="no young body in the species file yet",
    why_pose="no {pose} pose on the rig yet",
    why_kind={"glb": "no model export yet"},
)


def parse_size(s):
    m = re.fullmatch(r"(\d+)x(\d+)", str(s))
    return (int(m.group(1)), int(m.group(2))) if m else None


def as_list(x):
    return list(x) if isinstance(x, (list, tuple)) else [x]


def block(doc):
    """The file's renders block with its default (the base set alone)."""
    r = (doc or {}).get("renders")
    return r if isinstance(r, dict) else dict(base=BASE, add={})


def validate(doc):
    """Problems of the renders block as (path, message); each names the field."""
    r = doc.get("renders")
    if r is None:
        return []
    if not isinstance(r, dict):
        return [("renders", "renders is an object with base and add")]
    errs = []
    for k in r:
        if k not in ("base", "add"):
            errs.append((f"renders.{k}", f"{k} is not a field of renders (base, add)"))
    if r.get("base", BASE) != BASE:
        errs.append(("renders.base", f"base is '{BASE}', the only set the framework supplies"))
    add = r.get("add", {})
    if not isinstance(add, dict):
        return errs + [("renders.add", "add is an object of named outputs")]
    for name, o in add.items():
        p = f"renders.add.{name}"
        if name in GAME_V1:
            errs.append((p, f"'{name}' is in {BASE}: a species can add to the set, never remove or replace an output"))
        if not isinstance(o, dict):
            errs.append((p, f"{name} is an object with size, style, az, pose, age and kind"))
            continue
        for k in o:
            if k not in OUT_KEYS:
                errs.append((f"{p}.{k}", f"{k} is not a field of a render output ({', '.join(sorted(OUT_KEYS))})"))
        szs = as_list(o["size"]) if "size" in o else list((o.get("sizes") or {}).values()) if isinstance(o.get("sizes"), dict) else []
        if not szs and o.get("kind") != "glb":
            errs.append((f"{p}.size", "size is WxH, for example 96x96"))
        for s in szs:
            if parse_size(s) is None:
                errs.append((f"{p}.size", f"size '{s}' is WxH, for example 96x96"))
        for s in as_list(o.get("style", "plush")):
            if s in NOT_YET:
                errs.append((f"{p}.style", f"style '{s}' is not ready: it waits for the Companion's signed colours and the art director's ruling"))
            elif s not in STYLES:
                errs.append((f"{p}.style", f"style '{s}': one of {', '.join(STYLES)}"))
        for a in as_list(o.get("az", [32])):
            if isinstance(a, bool) or not isinstance(a, (int, float)):
                errs.append((f"{p}.az", f"az is an angle in degrees or a list of them, got {a!r}"))
        for a in as_list(o.get("age", "adult")):
            if a not in AGES:
                errs.append((f"{p}.age", f"age '{a}': one of {', '.join(AGES)}"))
        if o.get("kind", "sprite") not in KINDS:
            errs.append((f"{p}.kind", f"kind '{o.get('kind')}': one of {', '.join(KINDS)}"))
        if o.get("from", "render") not in FROM:
            errs.append((f"{p}.from", f"from '{o.get('from')}': render or master"))
        if o.get("from") == "master" and not isinstance(o.get("figure"), dict):
            errs.append((f"{p}.figure", "a picture made from the master needs figure, the figure's height in px per age"))
    return errs


def outputs(doc):
    """The set's outputs by name: the base, then the file's own."""
    out = copy.deepcopy(GAME_V1)
    for name, o in (block(doc).get("add") or {}).items():
        out[name] = o
    return out


def expand(doc, expressions=None):
    """Every variant the set asks for. Each row: output, variant (the file stem), style, age, pose, az, size (w, h), kind, from, figure, genome, where, state (ready | owed), why."""
    expressions = expressions if expressions is not None else list((doc or {}).get("expressions") or [])
    rows = []
    can = CAN_QUAD if (doc or {}).get("plan") == "quadruped" else CAN
    for name, o in outputs(doc).items():
        ages = as_list(o.get("age", "adult"))
        for age in ages:
            sz = (o.get("sizes") or {}).get(age) or o.get("size")
            if o.get("sizes") and age not in o["sizes"]:
                continue
            szl = as_list(sz) if sz else [None]
            for style in as_list(o.get("style", "plush")):
                for pose in as_list(o.get("pose", "calm")):
                    for az in as_list(o.get("az", [32])):
                        picks = [None]
                        if o.get("per") == "expression":
                            picks = [e["id"] for e in expressions] or [None]
                        for pick, sz1 in ((p_, s_) for p_ in picks for s_ in szl):
                            kind = o.get("kind", "sprite")
                            why = None
                            if age not in can["ages"]:
                                why = can["why_age"]
                            elif kind in can["why_kind"]:
                                why = can["why_kind"][kind]
                            elif pose not in can["poses"]:
                                why = can["why_pose"].format(pose=pose)
                            elif can.get("why_style") and style not in ("clay", "silhouette"):
                                why = can["why_style"]
                            stem = "-".join(str(x) for x in (age, pose, f"az{az}" if len(as_list(o.get("az", [32]))) > 1 else None, style if len(as_list(o.get("style", ["plush"]))) > 1 else None, sz1 if len(szl) > 1 else None, pick) if x)
                            rows.append(dict(output=name, variant=stem, style=style, age=age, pose=pose, az=az, size=parse_size(sz1) if sz1 else None, kind=kind, **{"from": o.get("from", "render")},
                                             figure=(o.get("figure") or {}).get(age), genome=o.get("genome", "type"), look=pick, where=o.get("where", ""),
                                             state="owed" if why else "ready", why=why))
    return rows


def not_yet(doc):
    return [dict(style=s, why="waits for the Companion's signed colours and the art director's ruling on pixel art from renders") for s in NOT_YET]
