"""The Python half of the studio's gene parity dump (tests/test_wb_studio_parity.py): the same structure web/src/engine/parity-dump.mjs prints.
1,000 wild draws (expressions.wild) and 1,000 `seed:N` draws (the S20 sampler's, or a mesh body's wb/variety.mesh_draw read as copies of the file's loci), their looks and how often each look shows, plus the file's freq and Variety numbers."""
import json
import os
import sys

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BODY not in sys.path:
    sys.path.insert(0, BODY)

import expressions as X
import genomeapply as GA
import s20genes as GN
from wb import variety as VY


def counts(looks_list):
    out = {}
    for looks in looks_list:
        for i, v in looks.items():
            k = "asleep" if v is None else v
            c = out.setdefault(i, {})
            c[k] = c.get(k, 0) + 1
    return out


def mesh_copies(doc, i, seed):
    g = doc["genome"]
    vals = VY.mesh_draw(doc, i, seed)
    c = X.type_copies(g)
    for e in g["loci"]:
        if e["locus"] in vals:
            f, lo, hi = GA.blend_map(e)
            t = round(GA.t_of(f, lo, hi, vals[e["locus"]]), 9)
            c[e["locus"]] = [t, t]
    return vals, c


def dump(doc, n=1000):
    g = doc["genome"]
    d = {"id": doc["id"], "loci": len(g["loci"])}
    ws = X.wild(g, n, 20)
    wl = [X.looks_of(g, c) for c in ws]
    d["wild"] = {"genomes": ws, "looks": wl, "counts": counts(wl)}
    draws = None
    if doc["id"] == "S20":
        cs = []
        for i in range(1, n + 1):
            c = X.type_copies(g)
            c.update({k: list(v) for k, v in GN.genome_of(GN.draw(i)).items() if k in c})
            cs.append(c)
        draws = {"genomes": cs, "looks": [X.looks_of(g, c) for c in cs]}
    elif isinstance(doc.get("mesh"), dict) and g["loci"]:
        vs = [mesh_copies(doc, i, (doc.get("variety") or {}).get("seed", VY.DEFAULT["seed"])) for i in range(1, n + 1)]
        draws = {"genomes": [c for _, c in vs], "looks": [X.looks_of(g, c) for _, c in vs], "values": [v for v, _ in vs]}
    if draws:
        draws["counts"] = counts(draws["looks"])
    d["draws"] = draws
    d["freq"] = {k: v for k, v in X.freq(g, doc.get("expressions") or [], 1000, doc_id=doc.get("id")).items()}
    d["sheet"] = VY.sheet(doc)
    return d


FIXTURE = os.path.join(BODY, "wb", "web", "src", "engine", "parity.fixture.json")


def fixture():
    """What the page's vitest checks the engine against without Python: per kind, the look counts of the 1,000 wild and 1,000 `seed:N` draws, the file's freq and Variety numbers, and the first twelve genomes of each draw set.
    test_wb_studio_parity.py fails when this file is not what Python makes today, so the two cannot drift apart."""
    out = {}
    for sid in ("S01", "S20", "S22"):
        d = dump(json.load(open(os.path.join(BODY, "species_v1", f"{sid}.json"))))
        out[sid] = {"wild_counts": d["wild"]["counts"], "wild_first": d["wild"]["genomes"][:12], "draws_counts": d["draws"]["counts"] if d["draws"] else None, "draws_first": d["draws"]["genomes"][:12] if d["draws"] else None,
                    "freq": d["freq"], "sheet": d["sheet"]}
    return json.loads(json.dumps(out))


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "fixture":
        with open(FIXTURE, "w") as fh:
            json.dump(fixture(), fh, sort_keys=True, separators=(",", ":"))
            fh.write("\n")
    else:
        sys.stdout.write(json.dumps(dump(json.load(open(sys.argv[1])), int(sys.argv[2]) if len(sys.argv) > 2 else 1000)))
