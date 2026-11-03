"""The game frame of a body-engine species, written from the species file (genome-string proposal B.8 step 2; frames-schema /3).
    python -m wb.frame_writer [--file species_v1/S20.json] [--out frames/species-S20.json] [--samples 200] [--draft]
The v1 file's genome block becomes `frames/species-<id>.json` (`mb-species-frame/3`, `engine: body`): the chapters in ring order, their traits, each open locus with its pool, `band` (or `absolute`), type and order, the type specimen as an
`mb-genome/2`, the pod's four parameters, a placeholder glyph the frame says is one, and `viability`: `samples` genomes drawn from the pools and `samples` children of crosses between them, each built by the body engine and checked by
the workbench's cage checks. Nothing is repaired: a genome that does not build or fails a check is listed in `viability.failures`.
A frame that uses a rule the game's resolver cannot read yet (an age gate, a `needs`, a modifier gene: spec 4.2, owner ruling 1) is refused for a release; `--draft` writes it marked `draft`.
The registry (`prototypes/workbench/frames/`, `index.json`, the stamp's `frames-data.mjs`) is not touched: S20 joins it with ticket G3, which also teaches the registry's tests about a body frame."""
import copy
import json
import os
import subprocess
import sys

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BODY)

import genomeapply as GA
import expressions as X

SCHEMA = "mb-species-frame/3"
FRAMES = os.path.join(BODY, "frames")           # not prototypes/workbench/frames: the form engine's registry tests read every species-*.json there as a roster frame. Ticket G3 moves this file in with the tests that read it
GLYPH = ["#.#.#", ".###.", "#####", ".#.#.", "#...#"]                  # a placeholder, mirrored left to right as the schema asks: the AD redraws it


class Refused(Exception):
    pass


def uses_new_rules(doc):
    """The things in a file the game cannot read yet: age gates, needs and modifier genes."""
    out = []
    for x in doc.get("expressions") or []:
        if x.get("age"):
            out.append(f"{x.get('label', x['id'])} waits for an age")
        if x.get("needs"):
            out.append(f"{x.get('label', x['id'])} needs other looks")
    out += [f"{e['label']} is a modifier gene" for e in doc["genome"]["loci"] if X.is_modifier(e)]
    return out


def traits_of(g, chapter, entries):
    """The traits of a chapter: a record that sleeps rides with the record it waits for, in that trait; every other record leads one."""
    by = {e["locus"]: e for e in entries}
    lead = {}
    for e in entries:
        host = (e.get("requires") or [None])[0] or next(iter(e.get("wakesWhen") or {}), None)
        while host in by and (by[host].get("requires") or by[host].get("wakesWhen")):
            h = by[host]
            host = (h.get("requires") or [None])[0] or next(iter(h.get("wakesWhen") or {}), None)
        lead[e["locus"]] = host if host in by else e["locus"]
    runs = []                                                       # the ring order is the frame's: a trait is a run of neighbours, never a regrouping (the string and the stamp lay the loci in this order)
    for e in entries:
        if runs and lead[e["locus"]] == runs[-1][0]:
            runs[-1][1].append(e["locus"])
        else:
            runs.append((lead[e["locus"]] if lead[e["locus"]] == e["locus"] else e["locus"], [e["locus"]]))
    out = dict((i, (h, ids)) for i, (h, ids) in enumerate(runs))
    traits = []
    for head, ids in out.values():
        h = by[head]
        looks = [str(x) for x in (h["limits"] if h["op"] != "blend" else h.get("bins") or [])]
        traits.append(dict(id=head.split(".")[-1], name=h["label"], loci=ids, looks=looks, nature="doing" if h["kind"] == "heritable-doing" else "look", shapeable=bool(h.get("shapeable", True)), verdict=None))
    return traits


def pool_t(e):
    return [e["band"]["lo"], e["band"]["hi"]] if "band" in e else None


def locus_row(e, chapter):
    pl = GA.pin_locus(e["locus"])
    row = dict(id=e["locus"], family=e["locus"].split(".")[0], scope=e["scope"], switch=e["op"] == "switch", consumer=e.get("consumer") or "; ".join(m["path"] for m in e.get("moves") or []),
               kind=e["kind"], nature="doing" if e["kind"] == "heritable-doing" else "look", chapter=chapter, shapeable=bool(e.get("shapeable", True)), op=e["op"], operator=e.get("operator") or pl["operator"])
    if e["op"] == "blend":
        row.update(alleles=list(e.get("bins") or ["between"]), looks=list(e.get("bins") or []), type=e["type"])
        row["band" if "band" in e else "absolute"] = e.get("band") or e["absolute"]
    else:
        row.update(alleles=[str(x) for x in e["limits"]], looks=[str(x) for x in e["limits"]], type=e["type"])
        if e.get("order"):
            row["order"] = list(e["order"])
        if e.get("weights"):
            row["weights"] = list(e["weights"])
        if e.get("weight") is not None:
            row["weight"] = e["weight"]
    for k in ("requires", "wakesWhen", "borrowed", "loud", "modifier"):
        if e.get(k):
            row[k] = e[k]
    return row


def pod_of(doc):
    import s20coat as CT
    pal = CT.palette_from_hue(270.0, dict(glow_hue=80.0))
    hexof = lambda c: "#%02x%02x%02x" % tuple(int(round(v)) for v in c)
    return dict(sizeClass="medium", proportion="tall", shellPattern="soft ribs", colourPair=[dict(pigment="violet", hex=hexof(pal["base"] if "base" in pal else pal["coat"])), dict(pigment="lantern", hex=hexof(pal["glow"]))])


def build_frame(doc, viability=None, draft=False):
    g = doc["genome"]
    rules = uses_new_rules(doc)
    if rules and not draft:
        raise Refused("this file cannot be written as a release frame: " + "; ".join(rules) + ". The game's resolver does not read age gates, needs or modifier genes yet (spec 4.2); write a draft frame (--draft) or take them out.")
    import s20genes as GN
    heritable = [e for e in g["loci"] if e["kind"] != "locked"]
    chapters = []
    for ch in g["chapters"]:
        es = [e for e in heritable if e["chapter"] == ch["id"]]
        if es:
            chapters.append(dict(id=ch["id"], name=ch["name"], sealed=False, traits=traits_of(g, ch["id"], es)))
    pins = GA.pin()
    ind = GN.specimen()
    typ = {k: list(v) for k, v in GN.genome_of(ind).items()}
    for e in g["loci"]:                                                       # a locus the sampler does not draw (a modifier) sits at its type
        typ.setdefault(e["locus"], [e["type"], e["type"]])
    kinds = [e["kind"] for e in heritable]
    f = dict(
        frameVersion=1, schema=SCHEMA, engine="body",
        species=dict(id=doc["id"], name=doc.get("name") or "Tuliko", plural=doc.get("name") or "Tuliko", order=int(doc["id"][1:]),
                     summary="The first species of the body engine: a biped night-light with a lantern tail. Frame version 1, on catalogue pin 11 (54 records, clan C20 with the brow tufts borrowed from C18)."),
        taxonomy=dict(code=doc["id"], clan=g.get("clan"), plan=doc["plan"], planVersion=doc["plan_version"], speciesNumber=int(doc["id"][1:]), tier="starter"),
        catalogue=dict(id=pins["id"], version=pins["version"], digest=pins.get("digest")),
        plan=dict(engine="body", plan=doc["plan"], planVersion=doc["plan_version"]),
        glyph=GLYPH, glyphNote="A placeholder until the art director draws the mark.",
        pod=pod_of(doc),
        chapters=chapters,
        loci=[locus_row(e, e["chapter"]) for e in heritable],
        pools={e["locus"]: (list(e.get("bins") or []) if e["op"] == "blend" else [str(x) for x in e["limits"]]) for e in heritable},
        locked={}, sealed={},
        counts=dict(open=len(heritable), heritableLook=kinds.count("heritable-look"), heritableDoing=kinds.count("heritable-doing"), sleeping=kinds.count("sleeping"), locked=0, sealed=0,
                    continuous=sum(1 for e in heritable if e["op"] == "blend"), named=sum(1 for e in heritable if e["op"] != "blend"), traits=sum(len(c["traits"]) for c in chapters),
                    byChapter={c["name"]: dict(loci=sum(len(t["loci"]) for t in c["traits"]), traits=len(c["traits"])) for c in chapters}),
        typeSpecimen=dict(genome=dict(schema="mb-genome/2", species=doc["id"], frameVersion=1, loci=typ), brief="The type: every shape and face blend at `between`, the coat at the type's step, prick ears, a lantern tip, blush on, no marks, no pattern, no emblem."),
        viability=viability or dict(sampled=0, constructed=0, crossed=0, crossedBuilt=0, failures=[], rule="not run"),
    )
    if draft:
        f["draft"] = True
        f["draftReasons"] = rules
    if doc.get("expressions") and any(x.get("age") or x.get("needs") for x in doc["expressions"]):
        f["expressions"] = copy.deepcopy(doc["expressions"])
    return f


# ---------------------------------------------------------------------------------------------------------------------------------------------------------------- viability
_DOC = None


def _built(job):
    """One genome built by the body engine and checked by the cage checks: a dict of id, built, the failing check ids, the one line why, the vertex total and per-part counts (level 1), and for each failing check where it failed (the part, the spine range)."""
    i, copies = job
    from wb import facade as F
    import s20genes as GN
    from checks import run as crun
    from checks.ctx import Ctx
    try:
        ind = copies if isinstance(copies, dict) and "pairs" in copies else GN.individual_of(copies)          # copies at the loci, or an individual already (the viability test's fixed genomes)
        r = F.build(_DOC, ind)
        summ = r.summary()
        mesh = F.proxy_mesh(r.body, 1)
        summ["vertices_l1"] = int(len(mesh["V"]))
        rows = crun("cage", Ctx(F.internal(_DOC), r.body, summ, mesh, doc=_DOC))
    except Exception as e:                                                       # noqa: BLE001
        return dict(id=i, built=False, ids=["build"], why=f"{type(e).__name__}: {str(e)[:160]}", verts=0, parts={}, where={})
    bad = [x for x in rows if x["state"] == "fail"]
    parts = next((x["extra"].get("parts_count") for x in rows if x["id"] == "verts"), None) or {}
    where = {}
    for x in bad:
        e = x.get("extra") or {}
        if x["id"] == "normals":
            where["normals"] = dict(parts=e.get("by_part"), ranges=e.get("by_range"), worst=e.get("worst"), s=e.get("s_range"))
        elif x["id"] == "mesh":
            where["mesh"] = dict(ranges=e.get("bad_ranges"), detail={k: v for k, v in (e.get("ranges") or {}).items() if v.get("bad")})
        elif x["id"] == "verts":
            where["verts"] = dict(total=summ["vertices_l1"], parts=parts)
    return dict(id=i, built=True, ids=[x["id"] for x in bad], why="; ".join(f"{x['id']}: {x['measure']}" for x in bad)[:240], verts=int(summ["vertices_l1"]), parts=parts, where=where)


def pass_rates(res):
    """The rate per check over the results of `_built`: how many of all genomes fail each check, and how many pass every check (a genome that does not build fails every check and is counted under `build`)."""
    n = len(res)
    by = {}
    for r in res:
        for k in r["ids"]:
            by[k] = by.get(k, 0) + 1
    ok = sum(1 for r in res if r["built"] and not r["ids"])
    return dict(genomes=n, passAll=ok, passAllRate=round(ok / n, 4) if n else 0.0, failByCheck=by, passRateByCheck={k: round(1 - v / n, 4) for k, v in by.items()},
                verts=_verts_summary(res))


def _verts_summary(res):
    import numpy as np
    ok = [r for r in res if r["built"]]
    if not ok:
        return {}
    v = np.array([r["verts"] for r in ok], float)
    names = sorted({k for r in ok for k in r["parts"]})
    part = {k: dict(mean=round(float(np.mean([r["parts"].get(k, 0) for r in ok])), 1), max=max(r["parts"].get(k, 0) for r in ok)) for k in names}
    return dict(median=int(np.median(v)), p5=int(np.percentile(v, 5)), p95=int(np.percentile(v, 95)), max=int(v.max()), within3500=round(float((v <= 3500).mean()), 4), within3850=round(float((v <= 3850).mean()), 4), byPart=part)


def jobs_of(doc, samples=200, seed=20):
    """The frame writer's genomes: `samples` drawn from the pools, then `samples` children of crosses between them, as (name, copies) in order."""
    import numpy as np
    g = doc["genome"]
    drawn = X.wild(g, 2 * samples, seed=seed + 1)
    rng = np.random.Generator(np.random.PCG64([seed, 11]))
    kids = [X.cross(g, drawn[2 * k], drawn[2 * k + 1], rng) for k in range(samples)]
    return [(f"sampled {k + 1}", c) for k, c in enumerate(drawn[:samples])] + [(f"crossed {k + 1}", c) for k, c in enumerate(kids)]


def run_all(doc, samples=200, workers=None, seed=20, only=None):
    """The built-and-checked results of `samples` genomes drawn from the pools and `samples` children of crosses between them (the frame writer's exact genomes), in order: sampled first, then crossed. `only` is a list of genome names to build (the rest are drawn, not built)."""
    import multiprocessing as mp
    global _DOC
    _DOC = doc
    jobs = jobs_of(doc, samples, seed)
    if only is not None:
        jobs = [j for j in jobs if j[0] in set(only)]
    workers = workers or max(1, min(10, (os.cpu_count() or 2) - 2))
    with mp.get_context("fork").Pool(min(workers, max(1, len(jobs)))) as pool:
        return pool.map(_built, jobs, chunksize=4)


def viability_block(res, samples):
    """The frame's `viability` block from the results of `_built` (sampled first, then crossed)."""
    count = lambda kind, pred: sum(1 for r in res if r["id"].startswith(kind) and pred(r["built"], r["ids"]))
    rates = pass_rates(res)
    fails = [dict(genome=r["id"], checks=r["ids"], why=r["why"], where=r["where"]) for r in res if r["ids"]]
    return dict(sampled=samples, constructed=count("sampled", lambda b, ids: b), passed=count("sampled", lambda b, ids: b and not ids), crossed=samples, crossedBuilt=count("crossed", lambda b, ids: b),
                crossedPassed=count("crossed", lambda b, ids: b and not ids), failuresByCheck=rates["failByCheck"], passRate=rates["passAllRate"], passRateByCheck=rates["passRateByCheck"], vertices=rates["verts"],
                failures=fails[:40], failureCount=len(fails),
                rule="random copies from the species pools at every open locus (the body and face anchors tight), and children of crosses between them (their blends on the step); each built by the body engine and checked by the cage checks of the workbench. `constructed` counts builds with no error, `passed` those with no failing check")


def run_viability(doc, samples=200, workers=None, seed=20):
    """`samples` genomes drawn from the pools and `samples` children of crosses between them, each built and checked. Returns the frame's `viability` block."""
    return viability_block(run_all(doc, samples, workers, seed), samples)


# ---------------------------------------------------------------------------------------------------------------------------------------------------------------- strings
def node(req, frame_file=None):
    env = dict(os.environ, **({"WB_FRAME_FILE": os.path.abspath(frame_file)} if frame_file else {}))
    p = subprocess.run(["node", os.path.join(BODY, "wb", "stringio.mjs")], input=json.dumps(req), capture_output=True, text=True, timeout=120, cwd=BODY, env=env)
    if p.returncode != 0:
        raise RuntimeError(f"the string codec failed: {p.stderr.strip()[:300]}")
    return json.loads(p.stdout)


def write(doc, path=None, samples=200, draft=False, workers=None, keep_viability=False, results=None):
    path = path or os.path.join(FRAMES, f"species-{doc['id']}.json")
    errs = GA.validate(doc)
    if errs:
        raise Refused(f"the file has {len(errs)} problem(s), the first: {errs[0][1]}")
    via = None
    if keep_viability and os.path.exists(path):                                  # the same file, only the frame's layout changed: the builds are the same builds
        via = json.load(open(path)).get("viability")
    if results is not None:                                                       # the results of a run already made on this file (`--from-json`)
        via = viability_block(results, samples)
    f = build_frame(doc, via or (run_viability(doc, samples, workers) if samples else None), draft)

    def save():
        with open(path, "w") as fh:
            json.dump(f, fh, indent=1, ensure_ascii=False)
            fh.write("\n")
    save()
    r = node(dict(op="encode", copies=f["typeSpecimen"]["genome"]["loci"]), path)                  # the codec reads the file just written
    if not r["ok"]:
        raise Refused(f"the frame does not encode its own type: {r['detail']}")
    f["counts"].update(typeString=r["string"], stringLength=r["length"], typeStampCode=r["code"])
    save()
    return f, path


def main(argv=None):
    import argparse
    ap = argparse.ArgumentParser(prog="wb frame")
    ap.add_argument("--file", default=os.path.join(BODY, "species_v1", "S20.json"))
    ap.add_argument("--out", default="")
    ap.add_argument("--samples", type=int, default=200, help="genomes drawn and children crossed for the viability block (0: skip)")
    ap.add_argument("--workers", type=int, default=0)
    ap.add_argument("--draft", action="store_true")
    ap.add_argument("--viability-json", default="", help="build and check the genomes only, write every genome's result and the rate per check to this file, write no frame")
    ap.add_argument("--from-json", default="", help="write the frame from the results of a `--viability-json` run on this same file (with the same --samples), instead of building the genomes again")
    ap.add_argument("--keep-viability", action="store_true", help="reuse the viability block of the frame already written (only when the file's genomes have not changed)")
    a = ap.parse_args(argv)
    with open(a.file) as fh:
        doc = json.load(fh)
    if a.viability_json:
        res = run_all(doc, a.samples, a.workers or None)
        rates = pass_rates(res)
        with open(a.viability_json, "w") as fh:
            json.dump(dict(samples=a.samples, rates=rates, results=res), fh)
        print(json.dumps({k: v for k, v in rates.items() if k != "verts"}), json.dumps({k: v for k, v in rates["verts"].items() if k != "byPart"}), sep="\n")
        return 0
    try:
        f, path = write(doc, a.out or None, a.samples, a.draft, a.workers or None, a.keep_viability, json.load(open(a.from_json))["results"] if a.from_json else None)
    except Refused as e:
        print(f"wb frame: {e}", file=sys.stderr)
        return 2
    v = f["viability"]
    print(f"{path}: {f['counts']['open']} open loci in {len(f['chapters'])} chapters; built {v['constructed']}/{v['sampled']} sampled and {v['crossedBuilt']}/{v['crossed']} crossed, passing every cage check {v.get('passed', 0)} and {v.get('crossedPassed', 0)} (rate {v.get('passRate')}; failing checks: {v.get('failuresByCheck')}); the type's string is {f['counts']['stringLength']} characters")
    print(f["counts"]["typeString"])
    return 0


if __name__ == "__main__":
    sys.exit(main())
