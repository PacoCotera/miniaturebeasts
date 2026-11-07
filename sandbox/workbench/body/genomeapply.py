"""The genome block of a v1 species file (mb-species/1, spec 4 and 8.2) and the generic apply that replaces `s20genes.apply_shape`.

A locus entry (`genome.loci[]`): one record of the catalogue pin (pin 11; every locus is in the pin, the ids are the pin's):
  locus, label, short, chapter, scope (`trunk`, or `branch`: the species' clan, `genome.clan`, or a record of `genome.borrows`), kind (locked, heritable-look, heritable-doing, sleeping, sealed), op (blend, switch, pair-map, pigment)
  blend:     a position record (the pin's `measure`) carries `band` {form, lo, hi, unit}: how t in [0, 1] becomes a value (form mult | off | lin | int; lo and hi are the values at t = 0 and 1); an absolute record
             (cycle rate, sheen, glow brightness: its copy is the record's own number) carries `absolute` {form, lo, hi, unit}, the pool the type was drawn from, in the record's numbers.
             Both: range (the widest it may be set), type (the type specimen's value), bins [the pin's words, low to high]
  others:    limits = the allowed alleles (ids of the pin's), type = the type's allele, order = how a pair shows (first-ranked wins), map = a switch's off and on values, `operator` (a switch names the pin's: dominant-enable or recessive-enable), weight
  sleeping:  `requires` (the switch records that must show for the record to draw) and `wakesWhen` {record: [looks]}, as the pin has them; the kind is `sleeping`
  moves:     [{path, op: scale | add | set, share, where?, above?, max?, min?}]  typed paths into the v1 file (below); `consumer` names the reader when a locus moves no path yet
Paths: `a.b[sel].c`, dotted; a number indexes a list; `*` in place of a key takes every value of an object; `[sel]` selects list items: `*`, `n`, `a:b` (slice), an id (the item's `id`, `name` or `joint`), or a glob of ids (`*.upper.*`); `@a.b` is never a path segment.
Moves: `scale` multiplies the field (and each number of a list field) by 1 + share * (value / type - 1); `add` adds share * (value - type); `set` writes the value (a switch's map applied). `share` is a number, or one number per selected item.
`where: {item, op, ref}` keeps the items whose `item` (a key or an index) compares with the number at path `ref`; `above` leaves numbers at or below it alone; `min` and `max` clip the new value.
Framework rules that follow the moves stay in code (the room rule that clips the tail's curl, the sitting clip), as the spec keeps them in the plan."""
import copy
import fnmatch
import json
import math
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
KINDS = ("locked", "heritable-look", "heritable-doing", "sleeping", "sealed")
OPS = ("blend", "switch", "pair-map", "pigment")
FORMS = ("mult", "off", "lin", "int")
MOVE_OPS = ("scale", "add", "set")
_PIN = {}


def pin():
    """The catalogue pin (species_v1/catalogue-pin.json, written by wb/make_pin.mjs from framework/catalogue.mjs): id, version and every locus's operator, scope and allele values."""
    if not _PIN:
        with open(os.path.join(HERE, "species_v1", "catalogue-pin.json")) as fh:
            d = json.load(fh)
        _PIN.update(d, by_id={l["id"]: l for l in d["loci"]})
    return _PIN


def pin_locus(i):
    return pin()["by_id"].get(i)


COPY_RULE = {"copy-mean": "mixes", "pair-map": "needs both copies", "dominant-enable": "one copy is enough", "partition-map": "mixes"}


def copy_rule(op_name):
    """The catalogue's words for how two copies show (words.md: One is enough, Needs both, Mixes)."""
    return COPY_RULE.get(op_name, "mixes")


# ----------------------------------------------------------------------------------------------------------------------------- values and t
def value_of(form, lo, hi, t):
    """The locus value at t in [0, 1]. mult: type 1 at t = 0.5, lo ** ((0.5 - t) / 0.5) below, hi ** ((t - 0.5) / 0.5) above; off: type 0, lo * (0.5 - t) / 0.5 below, hi * (t - 0.5) / 0.5 above; lin: lo + (hi - lo) t; int: its round."""
    if form == "mult":
        return lo ** ((0.5 - t) / 0.5) if t <= 0.5 else hi ** ((t - 0.5) / 0.5)
    if form == "off":
        return lo * (0.5 - t) / 0.5 if t <= 0.5 else hi * (t - 0.5) / 0.5
    if form == "lin":
        return lo + (hi - lo) * t
    if form == "int":
        return int(round(lo + (hi - lo) * t))
    raise KeyError(form)


def t_of(form, lo, hi, v):
    """The inverse of value_of (t may leave [0, 1] for a value outside the limits: the extremes stage and the computed fix build such values)."""
    if form == "mult":
        return 0.5 - 0.5 * math.log(v) / math.log(lo) if v <= 1 else 0.5 + 0.5 * math.log(v) / math.log(hi)
    if form == "off":
        if v == 0:
            return 0.5
        return 0.5 - 0.5 * v / lo if v < 0 else 0.5 + 0.5 * v / hi
    return (v - lo) / (hi - lo)


def tables(genome):
    """(GENES, PAIRS, SWITCHES, TYPE) as s20genes reads them, from the file's genome block.
    GENES: locus -> (form, lo, hi, anchor); PAIRS: locus -> (alleles, weights, order); SWITCHES: locus -> draw weight; TYPE: locus -> type value (blends) or allele (pairs)."""
    G, P, S, T = {}, {}, {}, {}
    for e in genome["loci"]:
        i = e["locus"]
        if e["op"] == "blend":
            G[i] = (*blend_map(e), e["chapter"])
            T[i] = e["type"]
        elif e["op"] == "switch":
            S[i] = e.get("weight", 0.5)
            T[i] = e["type"]
        else:
            P[i] = (list(e["limits"]), list(e.get("weights") or [1.0 / len(e["limits"])] * len(e["limits"])), list(e.get("order") or e["limits"]))
            T[i] = e["type"]
    return G, P, S, T


def blend_map(e):
    """(form, lo, hi) of a blend locus: the frame's `band`, or an absolute record's own `absolute` pool."""
    b = e.get("band") or e["absolute"]
    return b["form"], b["lo"], b["hi"]


def type_t(entry):
    """t of the type specimen at a blend locus."""
    f, lo, hi = blend_map(entry)
    if f == "mult":
        return 0.5
    if f == "off":
        return 0.5
    return round(t_of(f, lo, hi, entry["type"]), 9)


def by_locus(genome):
    return {e["locus"]: e for e in genome["loci"]}


# ----------------------------------------------------------------------------------------------------------------------------- paths
_SEG = re.compile(r"([^.\[\]]+)|\[([^\]]*)\]")


def parse(path):
    """'spine.tail.segments[1:5].share' -> ['spine', 'tail', 'segments', ('sel', '1:5'), 'share']."""
    out = []
    for m in _SEG.finditer(path):
        out.append(m.group(1) if m.group(1) is not None else ("sel", m.group(2)))
    return out


def _ident(item):
    if isinstance(item, dict):
        return item.get("id") or item.get("name") or item.get("joint")
    return None


def _select(lst, sel):
    """Indexes of `lst` a selector picks."""
    n = len(lst)
    if sel == "*":
        return list(range(n))
    if re.fullmatch(r"-?\d+", sel):
        k = int(sel)
        return [k % n] if n and -n <= k < n else []
    if re.fullmatch(r"-?\d*:-?\d*", sel):
        a, b = sel.split(":")
        return list(range(n))[slice(int(a) if a else None, int(b) if b else None)]
    if any(c in sel for c in "*?"):                                    # a glob of ids: rig.bones[*.upper.*] takes every upper leg bone
        return [i for i, it in enumerate(lst) if isinstance(_ident(it), str) and fnmatch.fnmatchcase(_ident(it), sel)]
    return [i for i, it in enumerate(lst) if _ident(it) == sel]


def _get(doc, path):
    cur = doc
    for seg in parse(path):
        if isinstance(seg, tuple):
            raise KeyError(path)
        cur = cur[int(seg)] if isinstance(cur, list) else cur[seg]
    return cur


def targets(doc, path, where=None):
    """The (container, key, selection position list) places a path reaches: [(container, key, k)] with k the index of the item chosen by the first list selector (for per-item shares), or None."""
    segs = parse(path)
    out = []

    def walk(cur, i, first_idx, item_cur):
        if i == len(segs) - 1 and not isinstance(segs[i], tuple):
            key = segs[i]
            if isinstance(cur, list):
                key = int(key)
                if not -len(cur) <= key < len(cur):
                    return
            elif not isinstance(cur, dict) or key not in cur:
                return
            out.append((cur, key, first_idx))
            return
        seg = segs[i]
        if isinstance(seg, tuple):
            if not isinstance(cur, list):
                return
            for k, idx in enumerate(_select(cur, seg[1])):
                walk(cur[idx], i + 1, k if first_idx is None else first_idx, cur[idx] if item_cur is None else item_cur)
            return
        if isinstance(cur, list):
            try:
                walk(cur[int(seg)], i + 1, first_idx, item_cur)
            except (ValueError, IndexError):
                return
        elif isinstance(cur, dict) and seg == "*":
            for v in list(cur.values()):
                walk(v, i + 1, first_idx, item_cur)
        elif isinstance(cur, dict) and seg in cur:
            walk(cur[seg], i + 1, first_idx, item_cur)

    walk(doc, 0, None, None)
    return out


def _where_ok(doc, item, w):
    f = w["item"]
    v = item[int(f)] if isinstance(item, list) else item[f]
    ref = _get(doc, w["ref"]) if isinstance(w["ref"], str) else w["ref"]
    return {"<=": v <= ref, ">=": v >= ref, "<": v < ref, ">": v > ref, "==": v == ref}[w["op"]]


def _targets_where(doc, move):
    """Targets of a move, the `where` filter applied to the item the first list selector chose."""
    segs = parse(move["path"])
    w = move.get("where")
    if not w:
        return targets(doc, move["path"])
    # walk to the first selector, filter its items, then continue on the rest of the path under each kept item
    first = next(i for i, s in enumerate(segs) if isinstance(s, tuple))
    head = ".".join(s for s in segs[:first] if not isinstance(s, tuple))
    lst = _get(doc, head)
    keep = [i for i in _select(lst, segs[first][1]) if _where_ok(doc, lst[i], w)]
    tail = "".join(f"[{s[1]}]" if isinstance(s, tuple) else f".{s}" for s in segs[first + 1:]).lstrip(".")
    out = []
    for k, i in enumerate(keep):
        for c, key, _ in targets(lst[i], tail):
            out.append((c, key, k))
    return out


def resolves(doc, move):
    """Whether a move's path reaches at least one field of the file."""
    try:
        return bool(_targets_where(doc, move))
    except (KeyError, ValueError, TypeError, IndexError, StopIteration):
        return False


def _num(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool)


def _apply_one(old, move, new_value, typ, delta, share, above, direct):
    op = move["op"]
    if isinstance(old, list):
        return [_apply_one(v, move, new_value, typ, delta, share, above, direct) if _num(v) else v for v in old]
    if not _num(old):
        return old
    if above is not None and not old > above:
        return old
    if op == "scale":
        v = old * (new_value / typ if direct else 1.0 + share * delta)        # a whole-share move multiplies by value / type (exact, no 1 + (f - 1) round trip)
    elif op == "add":
        v = old + share * delta
    else:
        v = new_value
    if "max" in move:
        v = min(move["max"], v)
    if "min" in move:
        v = max(move["min"], v)
    return v


def apply_move(doc, entry, move, value):
    """Apply one move of a locus at `value` to `doc` (in place)."""
    ts = _targets_where(doc, move)
    typ = entry.get("type")
    sh = move.get("share", 1.0)
    rel = move["op"] == "scale" and _num(value) and _num(typ) and typ != 0         # a scale is the value over the type (the type is 1 for a factor locus, so the move is the factor itself)
    delta = (value / typ - 1.0 if rel else value - typ) if _num(value) and _num(typ) else 0.0
    direct = rel and sh == 1
    for pos, (cont, key, k) in enumerate(ts):
        s = sh[k if k is not None else pos] if isinstance(sh, list) else sh
        if move["op"] == "set":
            v = entry.get("map", {}).get(value, value) if not _num(value) else value
            cont[key] = v
        else:
            cont[key] = _apply_one(cont[key], move, value, typ, delta, s, move.get("above"), direct)


def apply_locus(doc, entry, value):
    for mv in entry.get("moves", []):
        apply_move(doc, entry, mv, value)


def apply_values(doc, genome, values, skip=()):
    """The v1 file `doc` with every locus of the genome block moved to its value (`values`: locus -> value; a locus not in it stays at its type). Returns a deep copy; `skip` names loci left for the caller (the curl, whose room rule is a loop)."""
    import species_v1 as V1
    r = V1.materialise(doc)
    for e in genome["loci"]:
        i = e["locus"]
        if i in skip or i not in values or not e.get("moves"):
            continue
        apply_locus(r, e, values[i])
    return r


# ----------------------------------------------------------------------------------------------------------------------------- validation
OP_OF = {"copy-mean": "blend", "pair-map": "pair-map", "dominant-enable": "switch", "recessive-enable": "switch"}
KNOWN = {"locus", "label", "short", "chapter", "scope", "kind", "op", "operator", "band", "absolute", "range", "limits", "type", "bins", "order", "weights", "map", "moves", "consumer", "shapeable", "note",
         "weight", "loud", "requires", "wakesWhen", "borrowed", "modifier"}


def _check_form(errs, label, key, b, e):
    """The checks of a blend's band (or an absolute pool): form, lo and hi, the type and the range."""
    if not (isinstance(b, dict) and b.get("form") in FORMS):
        errs.append((f"{label}.{key}", f"{label}.{key}: {{form: one of {', '.join(FORMS)}, lo, hi, unit}}"))
        return False
    lo, hi = b.get("lo"), b.get("hi")
    if not (_num(lo) and _num(hi) and lo < hi):
        errs.append((f"{label}.{key}", f"{label}.{key}: lo and hi are two numbers, low below high"))
        return False
    if not _num(e.get("type")):
        errs.append((f"{label}.type", f"{label}.type: the type's value, a number"))
        return False
    rg = e.get("range")
    if not (isinstance(rg, list) and len(rg) == 2 and all(_num(x) for x in rg)):
        errs.append((f"{label}.range", f"{label}.range: two numbers, the widest the locus may be set"))
    elif lo < rg[0] - 1e-9 or hi > rg[1] + 1e-9:
        errs.append((f"{label}.{key}", f"{label}.{key}: {lo} to {hi} lies outside the range {rg[0]} to {rg[1]}"))
    if not lo <= e["type"] <= hi:
        errs.append((f"{label}.type", f"{label}.type: {e['type']} lies outside the band {lo} to {hi}"))
    if b["form"] == "mult" and (lo <= 0 or not (lo <= 1 <= hi)):
        errs.append((f"{label}.{key}", f"{label}.{key}: a mult locus needs 0 < lo <= 1 <= hi"))
    if b["form"] == "off" and not (lo <= 0 <= hi):
        errs.append((f"{label}.{key}", f"{label}.{key}: an off locus needs lo <= 0 <= hi"))
    return True


def validate(doc):
    """Problems of the genome block as (path, message), each message naming the field. Needs the pin."""
    g = doc.get("genome")
    errs = []
    if not isinstance(g, dict):
        return [("genome", "genome: the genome block is missing")]
    import species_v1 as V1
    full = doc
    try:
        doc = V1.materialise(doc)
    except (KeyError, TypeError, IndexError, ZeroDivisionError):
        doc = full
    cat = g.get("catalogue")
    p = pin()
    if not isinstance(cat, dict) or cat.get("id") != p["id"] or cat.get("version") != p["version"]:
        errs.append(("genome.catalogue", f"genome.catalogue: the pin is {p['id']}@{p['version']}; a frame is valid only against its pin (this file says {cat.get('id') if isinstance(cat, dict) else cat}@{cat.get('version') if isinstance(cat, dict) else ''})"))
    elif p.get("digest") and cat.get("digest") != p["digest"]:
        errs.append(("genome.catalogue.digest", f"genome.catalogue.digest: the pin's content digest is {p['digest'][:8]}...; this file says {str(cat.get('digest'))[:8]}..."))
    clan, borrows = g.get("clan"), g.get("borrows") or []
    loci = g.get("loci")
    if not isinstance(loci, list):
        return errs + [("genome.loci", "genome.loci: must be a list of loci")]
    seen = {}
    chapters = {c.get("id"): c for c in g.get("chapters", [])}
    ids = {e.get("locus") for e in loci if isinstance(e, dict)}
    for n, e in enumerate(loci):
        base = f"genome.loci[{n}]"
        i = e.get("locus")
        label = f"genome.loci[{i}]" if i else base
        if not i or not isinstance(i, str):
            errs.append((base, f"{base}.locus: a locus needs its id"))
            continue
        if i in seen:
            errs.append((label, f"{label}: the locus appears twice"))
        seen[i] = n
        for k in e:
            if k not in KNOWN:
                errs.append((f"{label}.{k}", f"{label}.{k}: not a field of a locus (fields: {', '.join(sorted(KNOWN)[:8])} ...)"))
        if e.get("kind") not in KINDS:
            errs.append((f"{label}.kind", f"{label}.kind: '{e.get('kind')}' is not one of {', '.join(KINDS)}"))
        if e.get("op") not in OPS:
            errs.append((f"{label}.op", f"{label}.op: '{e.get('op')}' is not one of {', '.join(OPS)}"))
            continue
        if "modifier" in e:                                                       # chapter 9: a species' own modifier gene is not a record of the pin; the expressions module checks what it changes
            if e.get("scope") != "modifier":
                errs.append((f"{label}.scope", f"{label}.scope: a modifier gene's scope is 'modifier' (this file says '{e.get('scope')}')"))
            if e.get("chapter") not in chapters:
                errs.append((f"{label}.chapter", f"{label}.chapter: '{e.get('chapter')}' is not one of the chapters ({', '.join(map(str, chapters))})"))
            if e.get("limits") != ["off", "on"] or e.get("type") not in ("off", "on"):
                errs.append((f"{label}.limits", f"{label}.limits: a modifier is off or on (limits [off, on], and a type of one of them)"))
            if not isinstance(e.get("moves"), list) or (not e["moves"] and not e.get("consumer")):
                errs.append((f"{label}.moves", f"{label}.moves: empty, so the locus needs a `consumer` that names who reads it"))
            continue
        pl = pin_locus(i)
        if pl is None:
            errs.append((f"{label}.locus", f"{label}.locus: '{i}' is not a record of the catalogue pin ({p['id']}@{p['version']}); every locus of a frame is a record of the pin"))
            continue
        if e.get("scope") == "own":
            errs.append((f"{label}.scope", f"{label}.scope: there are no species-own loci; '{i}' is a {pl['scope']} record of the pin, so its scope is '{pl['scope']}'"))
        elif e.get("scope") != pl["scope"]:
            errs.append((f"{label}.scope", f"{label}.scope: '{i}' is a {pl['scope']} record in the pin (this file says '{e.get('scope')}')"))
        elif pl["scope"] == "branch" and pl["clan"] != clan and i not in borrows:
            errs.append((f"{label}.scope", f"{label}.scope: '{i}' is a record of clan {pl['clan']}; this species is {clan or 'of no clan'} (genome.clan) and does not borrow it (genome.borrows)"))
        want = OP_OF.get(pl["operator"])
        if want and e["op"] != want:
            errs.append((f"{label}.op", f"{label}.op: the pin's operator for {i} is {pl['operator']}, which is a {want}, not a {e['op']}"))
            continue
        if e["op"] == "switch" and e.get("operator") != pl["operator"]:
            errs.append((f"{label}.operator", f"{label}.operator: a switch names its catalogue operator; the pin's for {i} is {pl['operator']} (this file says {e.get('operator')})"))
        if e.get("chapter") not in chapters:
            errs.append((f"{label}.chapter", f"{label}.chapter: '{e.get('chapter')}' is not one of the chapters ({', '.join(map(str, chapters))})"))
        # a record sleeps behind the switches of its `requires` that this frame opens (a switch the frame locks on, such as the eyes', does not put anything to sleep), or until its `wakesWhen` looks show
        req = [r for r in (pl.get("requires") or []) if r in ids]
        want_sleep = dict(requires=req or None, wakesWhen=pl.get("wakesWhen") or None)
        if (req or pl.get("wakesWhen")) and e.get("kind") != "sleeping":
            errs.append((f"{label}.kind", f"{label}.kind: the pin puts {i} to sleep (it needs {', '.join(req or list(pl['wakesWhen']))}), so its kind is 'sleeping'"))
        for key, w in want_sleep.items():
            if w != (e.get(key) or None):
                errs.append((f"{label}.{key}", f"{label}.{key}: the pin's is {json.dumps(w)}; a frame carries it as the pin has it (this file says {json.dumps(e.get(key) or None)})"))
        for r in list(pl.get("wakesWhen") or {}):
            if r not in ids:
                errs.append((f"{label}.wakesWhen", f"{label}.wakesWhen: {i} wakes on {r}, which is not a locus of this frame, so it could never wake"))
        for lab, a, b in p.get("lookPairs", []):
            if i == b and a in seen:
                errs.append((label, f"{label}: '{lab}' is already open as {a}; a frame opens one record per look, not both {a} and {b}"))
            if i == a and b in seen:
                errs.append((label, f"{label}: '{lab}' is already open as {b}; a frame opens one record per look, not both {b} and {a}"))
        lim = e.get("limits")
        if e["op"] == "blend":
            position = pl.get("measure") == "position"
            vals = [a["value"] for a in pl["alleles"] if "value" in a]
            if position:
                if "absolute" in e:
                    errs.append((f"{label}.absolute", f"{label}.absolute: {i} is a position record, so its size is a `band`"))
                if "band" not in e:
                    errs.append((f"{label}.band", f"{label}.band: each continuous locus carries a band {{form, lo, hi, unit}}: what t stands for in this species"))
                    continue
                if not _check_form(errs, label, "band", e["band"], e):
                    continue
            else:
                if "band" in e:
                    errs.append((f"{label}.band", f"{label}.band: {i} is in the record's own units (its copy is the number), so it has no band"))
                if "absolute" not in e or not _check_form(errs, label, "absolute", e["absolute"], e):
                    if "absolute" not in e:
                        errs.append((f"{label}.absolute", f"{label}.absolute: {i} is an absolute record: the pool the type was drawn from, {{form, lo, hi, unit}}, in the record's numbers"))
                    continue
                a = e["absolute"]
                if vals and (a["lo"] < min(vals) - 1e-9 or a["hi"] > max(vals) + 1e-9):
                    errs.append((f"{label}.absolute", f"{label}.absolute: {a['lo']} to {a['hi']} lies outside the pin's range for {i}, {min(vals)} to {max(vals)}"))
        else:
            if not (isinstance(lim, list) and lim and all(isinstance(x, (str, bool)) for x in lim)):
                errs.append((f"{label}.limits", f"{label}.limits: the allowed alleles, a list of names"))
                continue
            if e.get("type") not in lim:
                errs.append((f"{label}.type", f"{label}.type: '{e.get('type')}' is not one of the allowed alleles"))
            if e["op"] == "pair-map" and e.get("order") is not None and sorted(map(str, e["order"])) != sorted(map(str, lim)):
                errs.append((f"{label}.order", f"{label}.order: must rank exactly the allowed alleles"))
            extra = [a for a in lim if a not in [x["id"] for x in pl["alleles"]]]
            if extra:
                errs.append((f"{label}.limits", f"{label}.limits: {', '.join(map(str, extra))} {'is' if len(extra) == 1 else 'are'} not alleles of {i} in the pin"))
        mv = e.get("moves")
        if not isinstance(mv, list):
            errs.append((f"{label}.moves", f"{label}.moves: a list (empty when the locus moves no path)"))
            continue
        if not mv and not e.get("consumer"):
            errs.append((f"{label}.moves", f"{label}.moves: empty, so the locus needs a `consumer` that names who reads it"))
        for m, mvv in enumerate(mv):
            mp = f"{label}.moves[{m}]"
            if not isinstance(mvv, dict) or mvv.get("op") not in MOVE_OPS or not isinstance(mvv.get("path"), str):
                errs.append((mp, f"{mp}: a move is {{path, op: {' | '.join(MOVE_OPS)}, share}}"))
                continue
            if not resolves(doc, mvv):
                errs.append((f"{mp}.path", f"{mp}.path: '{mvv['path']}' does not resolve in the file"))
            if mvv["op"] != "set" and e["op"] != "blend":
                errs.append((f"{mp}.op", f"{mp}.op: only a blend can scale or add; this locus is {e['op']}"))
            if mvv["op"] == "set" and e["op"] == "blend":
                errs.append((f"{mp}.op", f"{mp}.op: a blend scales or adds; set is for switches and pairs"))
    import expressions as EX
    from wb import variety as VY, renders as RS
    return errs + EX.validate(full) + [(p_, f"{p_}: {m}") for p_, m in VY.validate(full)] + [(p_, f"{p_}: {m}") for p_, m in RS.validate(full)]
