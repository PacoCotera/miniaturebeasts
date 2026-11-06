"""Chunk 10: the Variety sheet. N individuals of a species, drawn from the file's own rules (the `variety` block), with a count of how often each look shows on this sheet, in wild pods and in a cross.
Only the file is read here: no build, no render, so every number is instant. The tiles are renders of `seed:N@S` genomes, cached like any other (the server's variety job). The species rules are data in the file:
{id, label, when: [conditions], then: [conditions], fail}. A rule applies to an individual when every `when` condition holds; it is broken when a `when` holds and some `then` condition does not.
A condition is {field, is: x} | {field, not: x} | {field, in: [lo, hi]} | {any: [conditions]}. The fields are an individual's resolved numbers and names: its creature record (shape and coat, flat), the hue in degrees (`hue`), and `belly` (dark or light)."""
import os
import sys

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BODY not in sys.path:
    sys.path.insert(0, BODY)

DEFAULT = dict(n=12, seed=2026, cycle=[], hue_wheel=True, max_loud=2, species_rules=[])
N_MAX = 48


def settings(doc, n=None, seed=None):
    """The file's `variety` block with its defaults; n and seed may be overridden (a new sheet)."""
    v = dict(DEFAULT, **(doc.get("variety") or {}))
    if n is not None:
        v["n"] = int(n)
    if seed is not None:
        v["seed"] = int(seed)
    v["n"] = max(1, min(int(v["n"]), N_MAX))
    return v


def selector(i, seed, file_seed):
    """The genome selector of individual i: `seed:i` for the file's own seed, `seed:i@S` for another."""
    return f"seed:{i}" if int(seed) == int(file_seed) else f"seed:{i}@{int(seed)}"


def fields(ind):
    """An individual's resolved fields: shape and coat flat, the hue in degrees and the belly (dark or light, by the coat's own warm window)."""
    import s20genes as GN, s20coat as CO
    c = GN.creature(ind)
    f = {**c["shape"], **c["coat"]}
    h = (float(c["coat"]["hue"]) + 360.0 * float(c["coat"].get("hue_shift", 0.0))) % 360.0
    f["hue"] = round(h, 3)
    f["belly"] = "dark" if CO.hue_window(h) else "light"
    f["loud"] = GN.loud_genes(ind)
    return f


def holds(cond, f):
    if "any" in cond:
        return any(holds(c, f) for c in cond["any"])
    v = f.get(cond["field"])
    if "in" in cond:
        lo, hi = cond["in"]
        return isinstance(v, (int, float)) and lo <= v <= hi
    if "not" in cond:
        return v != cond["not"]
    return v == cond.get("is")


def broken(rule, f):
    """True when the rule applies to this individual and one of its `then` conditions fails."""
    return all(holds(c, f) for c in rule.get("when", [])) and not all(holds(c, f) for c in rule.get("then", []))


def validate(doc):
    """Problems of the `variety` block as (path, message); each names the field."""
    errs = []
    v = doc.get("variety")
    if v is None:
        return errs
    if not isinstance(v, dict):
        return [("variety", "the variety block is an object with n, seed, cycle, max_loud and species_rules")]
    n = v.get("n", DEFAULT["n"])
    if not isinstance(n, int) or isinstance(n, bool) or not 1 <= n <= N_MAX:
        errs.append(("variety.n", f"n is a whole number from 1 to {N_MAX}"))
    if "seed" in v and (not isinstance(v["seed"], int) or isinstance(v["seed"], bool)):
        errs.append(("variety.seed", "seed is a whole number"))
    ids = {e.get("locus") for e in (doc.get("genome") or {}).get("loci", []) if isinstance(e, dict)}
    for i, l in enumerate(v.get("cycle") or []):
        if ids and l not in ids:
            errs.append((f"variety.cycle[{i}]", f"no locus '{l}' in the genome block"))
    ml = v.get("max_loud", DEFAULT["max_loud"])
    if not isinstance(ml, int) or isinstance(ml, bool) or ml < 0:
        errs.append(("variety.max_loud", "max_loud is a whole number, 0 or more"))

    def cond(c, path):
        if not isinstance(c, dict):
            errs.append((path, "a condition is an object: {field, is | not | in} or {any: [...]}"))
        elif "any" in c:
            if not isinstance(c["any"], list) or not c["any"]:
                errs.append((path + ".any", "any is a list of conditions"))
            else:
                for j, x in enumerate(c["any"]):
                    cond(x, f"{path}.any[{j}]")
        elif not isinstance(c.get("field"), str) or not any(k in c for k in ("is", "not", "in")):
            errs.append((path, "a condition names a field and one of is, not or in"))
        elif "in" in c and not (isinstance(c["in"], list) and len(c["in"]) == 2 and all(isinstance(x, (int, float)) for x in c["in"])):
            errs.append((path + ".in", "in is [low, high]"))
    seen = set()
    for i, r in enumerate(v.get("species_rules") or []):
        p = f"variety.species_rules[{i}]"
        if not isinstance(r, dict) or not r.get("id"):
            errs.append((p, "a species rule has an id, when, then and fail"))
            continue
        if r["id"] in seen:
            errs.append((p + ".id", f"rule id '{r['id']}' is used twice"))
        seen.add(r["id"])
        if not r.get("fail"):
            errs.append((p + ".fail", "a species rule says in words what breaking it looks like"))
        for k in ("when", "then"):
            if not isinstance(r.get(k), list) or not r[k]:
                errs.append((f"{p}.{k}", f"{k} is a list of conditions"))
            else:
                for j, c in enumerate(r[k]):
                    cond(c, f"{p}.{k}[{j}]")
    return errs


def look_words(v, locus, look):
    """[label, short word, plural] of a look as the file names it (`variety.look_words`), or None."""
    w = ((v.get("look_words") or {}).get(locus) or {}).get(look)
    return list(w) if isinstance(w, (list, tuple)) and len(w) in (2, 3) else None


def _label(g, expressions, locus, look, words=None):
    if words:
        return words[0]
    x = next((x for x in expressions if x["locus"] == locus and x["look"] == look), None)
    if x:
        return x.get("label") or x["id"]
    e = next((e for e in g["loci"] if e["locus"] == locus), {})
    return f"{str(look).replace('-', ' ').capitalize()} · {e.get('short', locus)}"


def sheet(doc, n=None, seed=None, wild_n=1000):
    """The Variety sheet of a file: its individuals (with their looks, loud looks and any broken rule), the looks with how often each shows, and the rules. None for a species with no sampler."""
    import expressions as X, s20genes as GN
    g = doc.get("genome")
    if doc.get("id") != "S20" or not isinstance(g, dict) or "loci" not in g:
        return None
    v = settings(doc, n, seed)
    expressions = doc.get("expressions") or []
    by = X.by_locus(g)
    typ = X.type_copies(g)
    file_seed = (doc.get("variety") or {}).get("seed", DEFAULT["seed"])
    inds, copies = [], []
    for i in range(1, v["n"] + 1):
        ind = GN.draw(i, v["seed"])
        c = dict(typ)
        c.update({k: list(x) for k, x in GN.genome_of(ind).items() if k in c})
        f = fields(ind)
        fails = [dict(rule=r["id"], label=r.get("label") or r["id"], words=r["fail"]) for r in v["species_rules"] if broken(r, f)]
        if len(f["loud"]) > v["max_loud"]:
            fails.append(dict(rule="loud", label="Loud traits", words=f"{len(f['loud'])} loud traits, limit {v['max_loud']}"))
        looks = X.looks_of(g, c)
        inds.append(dict(n=i, genome=selector(i, v["seed"], file_seed), hue=f["hue"], loud=f["loud"], looks=looks, fails=fails))
        copies.append(c)
    fq = X.freq(g, expressions, wild_n, doc_id="S20")
    rows = []
    for locus in v["cycle"]:
        e = by.get(locus)
        if e is None or X.is_modifier(e):
            continue
        fl = fq["loci"].get(locus) or {}
        for look in X.pool_of(e):
            if look == "none":
                continue
            who = [x["n"] for x in inds if x["looks"].get(locus) == look]
            xs = [x for x in expressions if x["locus"] == locus and x["look"] == look]
            x = xs[0] if xs else None
            age = (x.get("age") or {}).get("from") if x else None
            rows.append(dict(id=f"{locus}={look}", locus=locus, look=look, label=_label(g, expressions, locus, look, look_words(v, locus, look)), short=(look_words(v, locus, look) or [None, str(look).replace('-', ' ')])[1], trait=(v.get('trait_words') or {}).get(locus) or e.get('short', locus), count=len(who), who=who, age=age,
                             wild=(fl.get("wild") or {}).get(look, 0.0), cross=(fl.get("cross") or {}).get(look, 0.0), cross_of=fq["n"]["cross"], rule=fl.get("rule_words"), order=e.get("order"), modifiers=fl.get("modifiers") or []))
    for x in expressions:
        if x["locus"] in v["cycle"] or not (x.get("age") or x.get("needs")):
            continue
        xf = fq["expressions"][x["id"]]
        who = [i["n"] for i, c in zip(inds, copies) if x["id"] in X.showing(g, expressions, c, (x.get("age") or {}).get("from", "adult"))]
        rows.append(dict(id=f"expr:{x['id']}", locus=x["locus"], look=x["look"], label=x.get("label") or x["id"], short=str(x["look"]).replace("-", " "), trait=(v.get("trait_words") or {}).get(x["locus"]) or (by.get(x["locus"]) or {}).get("short", x["locus"]), count=len(who), who=who, age=(x.get("age") or {}).get("from"),
                         wild=xf["wild"].get((x.get("age") or {}).get("from", "adult"), 0.0), cross=xf["cross"].get((x.get("age") or {}).get("from", "adult"), 0.0), cross_of=fq["n"]["cross"], rule=None, order=None, modifiers=[]))
    return dict(n=v["n"], seed=v["seed"], file_seed=file_seed, max_loud=v["max_loud"], wild_n=wild_n, individuals=inds, looks=rows,
                rules=[dict(id=r["id"], label=r.get("label") or r["id"], fail=r["fail"], broken=[i["n"] for i, c in zip(inds, copies) if any(f["rule"] == r["id"] for f in i["fails"])]) for r in v["species_rules"]],
                failing=[i["n"] for i in inds if i["fails"]])
