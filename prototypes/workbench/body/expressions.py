"""Chunk 9: expressions. A look the species file can draw has three optional rules (spec 4.2): how its copies show (dominance), the age it shows from (an age gate) and the other looks it needs (a combination).
Only the file's genome block and its `expressions[]` are read here: no build, no render, so every number is instant.

Dominance belongs to the catalogue (owner ruling 1, 2 Nov 2026). The shown look of a shared locus follows the catalogue's operator: one copy is enough (dominant-enable), needs both copies (recessive-enable), the first look
of the pair's order (a pair map), a mean (a blend). A species changes that only by carrying its own **modifier gene**: a locus of the file with `modifier {of, show, order}` and no record in the pin. The modifier is inherited like any
gene: when one copy of it is on, the locus it names shows by the modifier's rule; without it, by the catalogue's.

An expression is {id, label, locus, look, age?: {from, grow}, needs?: [{locus, is | in}], loud?, art?: [stage]}: `look` is the allele (a switch's `on`, a pair's look, a blend's named bin) that, shown, is this expression. The dominance of
an expression is not a field: it is whatever the catalogue or a modifier says for its locus, and the Genes screen reads it from here."""
import math
import numpy as np

STAGES = ("juvenile", "adult", "elder")                    # embryo is not drawn
SHOW = ("dominant", "recessive", "first-ranked", "both")
RULE_OF = {"dominant-enable": "dominant", "recessive-enable": "recessive", "pair-map": "first-ranked", "partition-map": "both"}
RULE_WORDS = {"dominant": "One is enough", "recessive": "Needs both", "first-ranked": "First in the order", "both": "Both show", "mixes": "Mixes"}
LOUD_ORDER = ("glow", "pattern", "emblem", "brow")         # the sampler keeps the first two a mibi would show (s20genes.limit_loud)
MAX_LOUD = 2
EMBER = (10.0, 35.0)                                       # the hue window where a lit tip on a cream belly is the fire-tailed starter's likeness (owner, pass 4)
MOD_PREFIX = "mod."
EXPR_KEYS = {"id", "label", "locus", "look", "age", "needs", "loud", "art", "note"}


def by_locus(g):
    return {e["locus"]: e for e in g["loci"]}


def modifiers(g):
    """target locus -> its modifier genes (entries of the genome block with a `modifier`)."""
    out = {}
    for e in g["loci"]:
        if isinstance(e.get("modifier"), dict):
            out.setdefault(e["modifier"].get("of"), []).append(e)
    return out


def is_modifier(e):
    return isinstance(e.get("modifier"), dict)


def pool_of(e):
    """The looks a locus can show, as the file's limits name them."""
    if e["op"] == "blend":
        return list(e.get("bins") or [])
    return [str(x) for x in e["limits"]]


def _on(c):
    return c in ("on", True)


def active_modifier(g, mods, copies, locus):
    """The first modifier gene of `locus` that is on in these copies (one copy is enough), else None."""
    for m in mods.get(locus, []):
        if any(_on(c) for c in copies.get(m["locus"], ("off", "off"))):
            return m
    return None


def rule_of(g, mods, entry, copies=None):
    """(show, order, modifier id) for a locus: the catalogue's, or the modifier's when the copies carry one. With no copies, the catalogue's."""
    base = RULE_OF.get(entry.get("operator") or ("pair-map" if entry["op"] == "pair-map" else "copy-mean"), "mixes")
    m = active_modifier(g, mods, copies, entry["locus"]) if copies is not None else None
    if m:
        return m["modifier"]["show"], m["modifier"].get("order"), m["locus"]
    return base, entry.get("order"), None


def _t_of(e, c):
    if isinstance(c, (int, float)):
        return float(c)
    return {"low": 0.0, "short": 0.0, "between": 0.5, "high": 1.0, "long": 1.0}.get(c, 0.5)


def shown(g, mods, entry, copies):
    """The look a locus shows in these copies (a string), whatever sleeps."""
    cs = copies[entry["locus"]]
    op = entry["op"]
    show, order, _ = rule_of(g, mods, entry, copies)
    if op == "blend":
        bins = entry.get("bins")
        if not bins:
            return None
        t = sum(_t_of(entry, c) for c in cs) / 2.0
        return bins[min(len(bins) - 1, int(t * len(bins) - 1e-9)) if t > 0 else 0]
    if op == "switch":
        n = sum(1 for c in cs if _on(c))
        return "on" if (n >= 1 if show == "dominant" else n == 2) else "off"
    ordr = [str(x) for x in (order or entry["limits"])]
    if show == "both":
        return " and ".join(sorted(set(map(str, cs)), key=ordr.index))
    return min(map(str, cs), key=ordr.index)


def asleep(g, by, mods, copies, entry, seen=()):
    """A sleeping record sleeps until the switches it requires show on, or a record it names shows one of the looks that wake it (a record that is itself asleep shows nothing and wakes nothing)."""
    if entry.get("kind") != "sleeping" or entry["locus"] in seen:
        return False

    def look(i):
        o = by.get(i)
        return None if o is None or asleep(g, by, mods, copies, o, (*seen, entry["locus"])) else shown(g, mods, o, copies)
    if any(look(r) != "on" for r in entry.get("requires") or []):
        return True
    ww = entry.get("wakesWhen")
    return bool(ww) and not any(look(i) in looks for i, looks in ww.items() if look(i) is not None)


def looks_of(g, copies):
    """{locus: shown look, or None when it sleeps} for every locus with named looks."""
    by, mods = by_locus(g), modifiers(g)
    return {i: (None if asleep(g, by, mods, copies, e) else shown(g, mods, e, copies)) for i, e in by.items() if not is_modifier(e)}


def need_ok(looks, need):
    v = looks.get(need["locus"])
    return v is not None and (v == need["is"] if "is" in need else v in need["in"])


def stage_ok(expr, stage):
    f = (expr.get("age") or {}).get("from")
    return f is None or STAGES.index(stage) >= STAGES.index(f)


def showing(g, expressions, copies, stage="adult"):
    """The expressions that show in these copies at a life stage: the look shows (its locus awake, the look the shown one), every need is met and the age has come."""
    looks = looks_of(g, copies)
    return [x["id"] for x in expressions if looks.get(x["locus"]) == x["look"] and all(need_ok(looks, n) for n in x.get("needs") or []) and stage_ok(x, stage)]


def grown(expr, stage):
    """How grown a gated look is at a stage, 0 to 1: it grows across the stage the gate names, `age.grow` of the way through it (spec 4.2: a horn grows to full size by mid-adult)."""
    a = expr.get("age")
    if not a:
        return 1.0
    i, j = STAGES.index(a["from"]), STAGES.index(stage)
    if j < i:
        return 0.0
    g = float(a.get("grow", 0.5)) or 0.5
    return min(1.0, ((j - i) + 0.5) / (g * 1.0 + 0.5)) if j == i else 1.0


# ---------------------------------------------------------------------------------------------------------------------------------------------------------------- draws
def type_copies(g):
    import genomeapply as GA
    out = {}
    for e in g["loci"]:
        if e["op"] == "blend":
            t = GA.type_t(e)
            out[e["locus"]] = [t, t]
        else:
            out[e["locus"]] = [e["type"], e["type"]]
    return out


def wild(g, n=1000, seed=20, limit=True):
    """n genomes drawn from the pools of the file: each copy of a switch is on by its weight, each copy of a pair map by its weights, a blend is one t on the grid (equal copies). The sampler's rule is kept: of the loud
    looks a draw would show, only the first two stay (the dropped ones are put back to the type, as s20genes.limit_loud does)."""
    import s20genes as GN
    rng = np.random.Generator(np.random.PCG64([seed, 9]))
    typ = type_copies(g)
    out = []
    for _ in range(n):
        c = {}
        for e in g["loci"]:
            i = e["locus"]
            if e["op"] == "blend":
                old = GN.SAMPLER_OF.get(i)
                tight = old in GN.GENES and GN.GENES[old][3] in ("body", "face")            # the body and face anchors are tight: the sampler keeps their blends inside the middle 70 % of the band
                t = GN.grid_t(0.5 + (float(rng.random()) - 0.5) * 0.7 if tight else float(rng.random()))
                c[i] = [t, t]
            elif e["op"] == "switch":
                w = float(e.get("weight", 0.5))
                c[i] = ["on" if rng.random() < w else "off" for _ in (0, 1)]
            else:
                al = [str(a) for a in e["limits"]]
                w = np.array(e.get("weights") or [1.0 / len(al)] * len(al), float)
                c[i] = [str(rng.choice(al, p=w / w.sum())) for _ in (0, 1)]
        out.append(limit_loud(g, c, typ) if limit else c)
    return out


def loud_tags(g, copies):
    looks = looks_of(g, copies)
    typ = looks_of(g, type_copies(g))
    tags = []
    for e in g["loci"]:
        t = e.get("loud")
        if t and looks.get(e["locus"]) not in (None, typ.get(e["locus"])) and t not in tags:
            tags.append(t)
    return sorted(tags, key=lambda t: LOUD_ORDER.index(t) if t in LOUD_ORDER else 99)


def limit_loud(g, copies, typ=None, keep=MAX_LOUD):
    typ = typ or type_copies(g)
    for tag in loud_tags(g, copies)[keep:]:
        for e in g["loci"]:
            if e.get("loud") == tag:
                copies[e["locus"]] = list(typ[e["locus"]])
    return copies


def sheet(g, doc_id=None):
    """The copies of the N individuals on the Variety sheet. Only a species with a sampler has one (S20's twelve)."""
    if doc_id != "S20":
        return None
    import s20genes as GN
    out = []
    for i in range(1, 13):
        c = type_copies(g)                                              # a locus the sampler does not draw (a borrowed record, a modifier) sits at its type
        c.update({k: list(v) for k, v in GN.genome_of(GN.draw(i)).items() if k in c})
        out.append(c)
    return out


ABS_RECORD = {"movement.cycle-rate": (0.6, 1.4), "appearance.sheen": (0.0, 1.0), "appearance.emission-brightness": (0.4, 1.0)}      # the three records whose copy is their own number: the catalogue's range


def _value(record, c):
    """A copy's number: a t for a position record, the record's own number for an absolute one (a named copy is its allele's value in the pin)."""
    import genomeapply as GA
    if isinstance(c, (int, float)):
        return float(c)
    return float({a["id"]: a["value"] for a in GA.pin_locus(record)["alleles"] if "value" in a}[c])


def cross(g, a, b, rng):
    """A child of two genomes: one copy from each parent at every locus; a blend is the mean of the two copies it took, on the 59-step grid, in both copies (the cross, decision 3)."""
    import s20genes as GN
    out = {}
    for e in g["loci"]:
        i = e["locus"]
        ca, cb = a[i][int(rng.integers(2))], b[i][int(rng.integers(2))]
        if e["op"] != "blend":
            out[i] = [ca, cb]
        elif i in ABS_RECORD:
            lo, hi = ABS_RECORD[i]
            k = round(((_value(i, ca) + _value(i, cb)) / 2.0 - lo) / ((hi - lo) / GN.GRID))
            out[i] = [round(lo + k * (hi - lo) / GN.GRID, 6)] * 2
        else:
            t = GN.grid_t((_value(i, ca) + _value(i, cb)) / 2.0)
            out[i] = [t, t]
    return out


def forecast(g, mate_seed=1, seeds=4):
    """The four-seed forecast of the type with a sample mate (a wild draw): four children by fixed seeds, so every share is a quarter (the Cross screen's form)."""
    typ = type_copies(g)
    mate = wild(g, 1, seed=1000 + mate_seed)[0]
    rng = np.random.Generator(np.random.PCG64([20, 4, mate_seed]))
    return [cross(g, typ, mate, rng) for _ in range(seeds)], mate


def _pct(k, n):
    return round(100.0 * k / n, 1) if n else 0.0


def freq(g, expressions, n=1000, seed=20, doc_id=None):
    """How often each look shows, in the three groups of spec 4.2: wild (n genomes from the pools), this sheet (the Variety sheet's individuals) and a cross (the four-seed forecast of the type with a sample mate), in percent.
    Per locus: its looks and 'asleep'. Per expression: the share showing at each life stage."""
    kids, _ = forecast(g)
    groups = dict(wild=wild(g, n, seed), sheet=sheet(g, doc_id), cross=kids)
    by, mods = by_locus(g), modifiers(g)
    out = dict(n={k: (len(v) if v else 0) for k, v in groups.items()}, loci={}, expressions={})
    seen = {k: [looks_of(g, c) for c in v] for k, v in groups.items() if v}
    for i, e in by.items():
        if is_modifier(e) or (e["op"] == "blend" and not e.get("bins")):
            continue
        looks = pool_of(e)
        row = dict(looks=looks, rule=rule_of(g, mods, e)[0], rule_words=RULE_WORDS[rule_of(g, mods, e)[0]], modifiers=[m["locus"] for m in mods.get(i, [])])
        for k, vs in seen.items():
            cnt = {a: 0 for a in looks}
            cnt["asleep"] = 0
            for v in vs:
                x = v[i]
                if x is None:
                    cnt["asleep"] += 1
                else:
                    cnt[x] = cnt.get(x, 0) + 1
            row[k] = {a: _pct(c, len(vs)) for a, c in cnt.items() if c or a in looks}
        out["loci"][i] = row
    for x in expressions:
        row = dict(label=x.get("label") or x["id"], locus=x["locus"], look=x["look"], age=(x.get("age") or {}).get("from"), needs=x.get("needs") or [], loud=bool(x.get("loud")))
        for k, cs in groups.items():
            if not cs:
                continue
            row[k] = {st: _pct(sum(1 for c in cs if x["id"] in showing(g, expressions, c, st)), len(cs)) for st in STAGES}
        out["expressions"][x["id"]] = row
    return out


# ---------------------------------------------------------------------------------------------------------------------------------------------------------------- the file
def validate(doc):
    """Problems of `expressions[]` and of the modifier genes as (path, message): each names the field. The catalogue's own loci are checked in genomeapply; here, only what chunk 9 adds."""
    errs = []
    g = doc.get("genome") or {}
    loci = [e for e in g.get("loci", []) if isinstance(e, dict)]
    by = {e.get("locus"): e for e in loci}
    for e in loci:
        m = e.get("modifier")
        if m is None:
            continue
        lab = f"genome.loci[{e.get('locus')}]"
        if not (isinstance(m, dict) and set(m) <= {"of", "show", "order"}):
            errs.append((f"{lab}.modifier", f"{lab}.modifier: {{of, show, order}}"))
            continue
        t = by.get(m.get("of"))
        if t is None or is_modifier(t):
            errs.append((f"{lab}.modifier.of", f"{lab}.modifier.of: '{m.get('of')}' is not a shared locus of this file"))
            continue
        if t["op"] == "blend":
            errs.append((f"{lab}.modifier.of", f"{lab}.modifier.of: '{t['locus']}' is a blend; a blend mixes its copies and has no dominance to change"))
        ok = {"switch": ("dominant", "recessive"), "pair-map": ("first-ranked",), "pigment": ("both",)}.get(t["op"], ())
        if m.get("show") not in ok:
            errs.append((f"{lab}.modifier.show", f"{lab}.modifier.show: '{m.get('show')}' does not fit {t['locus']}, a {t['op']} (use {' or '.join(ok)})"))
        if t["op"] == "pair-map" and sorted(map(str, m.get("order") or [])) != sorted(map(str, t["limits"])):
            errs.append((f"{lab}.modifier.order", f"{lab}.modifier.order: the order lists every look of {t['locus']} once ({', '.join(map(str, t['limits']))})"))
        if e.get("op") != "switch" or e.get("operator") != "dominant-enable":
            errs.append((f"{lab}.op", f"{lab}.op: a modifier is a switch that one copy turns on (op switch, operator dominant-enable)"))
        if not str(e["locus"]).startswith(MOD_PREFIX):
            errs.append((f"{lab}.locus", f"{lab}.locus: a modifier's id begins '{MOD_PREFIX}' (the catalogue has no such record)"))
    ex = doc.get("expressions")
    if ex is None:
        return errs
    if not isinstance(ex, list):
        return errs + [("expressions", "expressions: must be a list")]
    seen = set()
    for n, x in enumerate(ex):
        lab = f"expressions[{x.get('id') if isinstance(x, dict) and x.get('id') else n}]"
        if not isinstance(x, dict):
            errs.append((f"expressions[{n}]", f"expressions[{n}]: must be an object"))
            continue
        for k in x:
            if k not in EXPR_KEYS:
                errs.append((f"{lab}.{k}", f"{lab}.{k}: not a field of an expression ({', '.join(sorted(EXPR_KEYS))}); how copies show is the catalogue's, or a modifier gene's, never an expression's" if k == "show" else f"{lab}.{k}: not a field of an expression ({', '.join(sorted(EXPR_KEYS))})"))
        if not x.get("id") or x["id"] in seen:
            errs.append((lab, f"{lab}: an expression needs its own id" if not x.get("id") else f"{lab}: the id appears twice"))
        seen.add(x.get("id"))
        e = by.get(x.get("locus"))
        if e is None:
            errs.append((f"{lab}.locus", f"{lab}.locus: '{x.get('locus')}' is not a locus of this file"))
        elif str(x.get("look")) not in pool_of(e):
            errs.append((f"{lab}.look", f"{lab}.look: '{x.get('look')}' is not a look of {x['locus']} (looks: {', '.join(pool_of(e))})"))
        a = x.get("age")
        if a is not None and not (isinstance(a, dict) and a.get("from") in STAGES[1:] + ("juvenile",) and set(a) <= {"from", "grow"} and 0 < a.get("grow", 0.5) <= 1):
            errs.append((f"{lab}.age", f"{lab}.age: {{from: {', '.join(STAGES)}, grow: 0 to 1 across the stage}}"))
        for k, nd in enumerate(x.get("needs") or []):
            nl = f"{lab}.needs[{k}]"
            ne = by.get(nd.get("locus")) if isinstance(nd, dict) else None
            if ne is None:
                errs.append((nl, f"{nl}.locus: '{nd.get('locus') if isinstance(nd, dict) else nd}' is not a locus of this file"))
            elif ("is" in nd) == ("in" in nd):
                errs.append((nl, f"{nl}: name one of 'is' (a look) or 'in' (a list of looks)"))
            else:
                bad = [v for v in ([nd["is"]] if "is" in nd else list(nd["in"])) if str(v) not in pool_of(ne)]
                if bad:
                    errs.append((nl, f"{nl}: '{bad[0]}' is not a look of {ne['locus']} (looks: {', '.join(pool_of(ne))})"))
    return errs


def reachable(g, expressions, locus, look, seen=()):
    """Can some genome inside the pools show `look` at `locus`? (homozygous in the look, with every switch it requires on and a look that wakes it showing.) Returns (ok, why)."""
    by, mods = by_locus(g), modifiers(g)
    e = by.get(locus)
    if e is None or look not in pool_of(e):
        return False, f"{locus} has no look '{look}' in the pool"
    if locus in seen:
        return True, ""
    for r in e.get("requires") or []:
        if r in by:
            ok, why = reachable(g, expressions, r, "on", (*seen, locus))
            if not ok:
                return False, f"it needs {by[r].get('label', r)} on, which {why}"
    ww = e.get("wakesWhen")
    if ww:
        tried = []
        for i, looks in ww.items():
            if i in by:
                for lk in looks:
                    ok, why = reachable(g, expressions, i, lk, (*seen, locus))
                    if ok:
                        return True, ""
                    tried.append(why)
        return False, f"nothing that wakes it can show ({tried[0] if tried else 'no waking look is in the pool'})"
    return True, ""


def needs_conflict(expressions, x):
    """Two needs on one locus that no single look satisfies, or a need that contradicts the expression's own look."""
    want = {x["locus"]: {x["look"]}}
    for nd in x.get("needs") or []:
        v = {str(nd["is"])} if "is" in nd else set(map(str, nd["in"]))
        want[nd["locus"]] = want[nd["locus"]] & v if nd["locus"] in want else v
    bad = [i for i, v in want.items() if not v]
    return bad[0] if bad else None


def express_report(doc, n=1000):
    """The expression checks that need no build (spec 4.2): every `needs` can be met within the limits; no look is unreachable; at most two loud looks show together at the wild rate; the ember rule holds; an age-gated look has art
    at every stage it shows. Returns (problems [(field, line)], facts)."""
    g = doc["genome"]
    ex = doc.get("expressions") or []
    by = by_locus(g)
    probs = []
    for x in ex:
        lab = f"expressions[{x['id']}]"
        bad = needs_conflict(ex, x)
        ok, why = reachable(g, ex, x["locus"], x["look"])
        if bad:
            probs.append((f"{lab}.needs", f"{x.get('label', x['id'])} can never show: it needs {by[bad]['label']} to be two looks at once"))
            continue
        if not ok:
            probs.append((f"{lab}.look", f"{x.get('label', x['id'])} can never show: {why}"))
            continue
        for k, nd in enumerate(x.get("needs") or []):
            looks = [str(nd["is"])] if "is" in nd else list(map(str, nd["in"]))
            if not any(reachable(g, ex, nd["locus"], lk)[0] for lk in looks):
                probs.append((f"{lab}.needs[{k}]", f"{x.get('label', x['id'])} can never show: it needs {by[nd['locus']]['label']} to show {' or '.join(looks)}, which no copies inside the limits give"))
        if x.get("age"):
            st = STAGES[STAGES.index(x["age"]["from"]):]
            miss = [s for s in st if s not in (x.get("art") or [])]
            if miss:
                probs.append((f"{lab}.art", f"{x.get('label', x['id'])} has no art at {miss[0]}, where it shows"))
    for i, e in by.items():                                                               # no look unreachable: every look of a pair or switch the file opens can be shown
        if is_modifier(e) or e["op"] == "blend":
            continue
        for lk in pool_of(e):
            ok, why = reachable(g, ex, i, lk)
            if not ok:
                probs.append((f"genome.loci[{i}]", f"{e['label']}: the look '{lk}' can never show: {why}"))
                break
    ws = wild(g, n, limit=False)                                                          # the raw draws: how often the pools alone would show more than two loud looks (the sampler's rule then keeps two)
    over = sum(1 for c in ws if len(loud_tags(g, c)) > MAX_LOUD)
    kept = max(len(loud_tags(g, limit_loud(g, dict(c)))) for c in ws)
    if kept > MAX_LOUD:
        probs.append(("variety.max_loud", f"{kept} loud looks show together at the wild rate; the limit is {MAX_LOUD}"))
    ember = False
    hue = by.get("appearance.body-hue")
    if hue and hue.get("band") and "anatomy.tail-tip-form" in by and "lantern" in pool_of(by["anatomy.tail-tip-form"]):
        lo, hi = hue["band"]["lo"], hue["band"]["hi"]
        ember = lo <= hi and max(lo, EMBER[0]) <= min(hi, EMBER[1])
        if ember:
            probs.append(("genome.loci[appearance.body-hue].band", f"The ember rule: the hue band {lo:g} to {hi:g} reaches {EMBER[0]:g} to {EMBER[1]:g}, where a lit tip makes the fire-tailed starter's likeness"))
    return probs, dict(wild_over_loud=_pct(over, len(ws)), loud_kept=kept, wild=len(ws), expressions=len(ex), ember=bool(ember))
