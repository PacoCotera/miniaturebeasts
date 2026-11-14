"""The extremes stage (spec 4.1): every locus's limits built on the clay at both ends, and the corners of the loud genes, each put through the cage checks.
`list_ends(spec)` names the builds; `judge(rows, base)` says whether an end fails (a check that passes at the type and fails there: the type's own failings are not the locus's); `bisect_fix` finds the highest passing value of a failing end."""
import itertools

RANK = dict(pass_=0, warn=1, fail=2)
LOUD = ("glow", "pattern", "emblem", "brow")


def rank(state):
    return {"pass": 0, "warn": 1, "fail": 2}.get(state, 2)


def list_ends(spec, only=None):
    """[{id, locus, end (low | high | allele | corner), genome, value, label}]: both ends of each blend, each other allowed allele of a pair or switch, and every combination of one or two loud genes.
    `only`: a list of locus ids to build just those (and no corners)."""
    out = []
    for e in spec["genome"]["loci"]:
        i = e["locus"]
        if only and i not in only:
            continue
        if e["op"] == "blend":
            b = e.get("band") or e["absolute"]
            for end, v in (("low", b["lo"]), ("high", b["hi"])):
                out.append(dict(id=f"{i}:{end}", locus=i, end=end, genome=f"{end}:{i}", value=v, label=e["label"]))
        else:
            for a in e["limits"]:
                if a != e["type"]:
                    out.append(dict(id=f"{i}:{a}", locus=i, end="allele", genome=f"allele:{i}={a}", value=a, label=e["label"]))
    for n in (() if only else (1, 2)):
        for combo in itertools.combinations(LOUD, n):
            out.append(dict(id="corner:" + "+".join(combo), locus=None, end="corner", genome="corner:" + "+".join(combo), value="+".join(combo), label="Loud genes"))
    return out


def judge(rows, base):
    """(state, fails): the rows that fail here and pass at the type (`base`: check id -> state). state is fail when there is one, else pass."""
    fails = [r for r in rows if rank(r["state"]) == 2 and rank(base.get(r["id"], "pass")) < 2]
    return ("fail" if fails else "pass"), fails


def summary_row(r):
    """The part of a check row an end keeps: id, the fail line, the measure, the value and the limit."""
    return dict(id=r["id"], fail=(r.get("extra") or {}).get("fail"), measure=r.get("measure"), value=r.get("value"), limit=r.get("limit"))


def round_toward(v, ref, places=2):
    """v rounded to `places` decimals toward `ref` (the passing side), so the computed fix never sits on the failing side of the highest passing value."""
    k = 10 ** places
    import math
    return (math.floor(v * k) if v >= ref else math.ceil(v * k)) / k


def bisect_fix(entry, end, fails_at, steps=5, grid=6):
    """The highest value up to which everything passes, for a failing end. The cage is not monotonic in a gene (S20's tail length creases leg.L at 1.1, not at 1.19, again at 1.25), so the walk from the type to the end samples `grid` evenly spaced values first,
    stops at the first that fails, then halves the gap `steps` times. fails_at(value) -> bool builds that value and says whether it fails. Returns dict(value, path, end), or None when nothing between the type and the end passes at two decimals."""
    typ = entry["type"]
    b = entry.get("band") or entry["absolute"]
    v_end = b["hi"] if end == "high" else b["lo"]
    if b["form"] == "int":
        return None
    ok, bad = typ, v_end
    for k in range(1, grid + 1):
        v = typ + (v_end - typ) * k / (grid + 1)
        if fails_at(v):
            bad = v
            break
        ok = v
    for _ in range(steps):
        mid = (ok + bad) / 2
        if fails_at(mid):
            bad = mid
        else:
            ok = mid
    cand = round_toward(ok, typ)
    for _ in range(4):
        if (cand - typ) * (1 if end == "high" else -1) <= 0.0:
            return None
        if not fails_at(cand):
            key = "band" if "band" in entry else "absolute"
            return dict(value=cand, path=f"genome.loci.{entry['locus']}.{key}.{'hi' if end == 'high' else 'lo'}", end=end)
        cand = round(cand - 0.01 * (1 if end == "high" else -1), 2)
    return None
