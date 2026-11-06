"""The facade over today's S20 code: build(spec, genome, stage) -> Result, with a canonical key and every stage timed.
`spec` is the species file as a dict (species/S20.json or a copy of it); `genome` is a genome string (type, seed:N, low:<locus>, high:<locus>) or an individual dict as s20genes draws it.
S20's modules are used as they are; the timing wraps their stage functions for the length of one build and puts them back."""
import contextlib
import copy
import json
import os
import sys
import time

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BODY not in sys.path:
    sys.path.insert(0, BODY)

import numpy as np

from wb import hashing as H

STAGES = ("loft", "legs", "tubes", "base")


class BuildError(Exception):
    """A build or validation failure, with the field when it is known."""
    def __init__(self, message, field=None):
        super().__init__(message)
        self.message, self.field = message, field


def is_quadruped(spec):
    """A v1 file of the quadruped plan: its cage builder reads the file as it is (quadruped.py), not through the biped's converter."""
    return isinstance(spec, dict) and spec.get("schema") in ("mb-species/1", "mb-species/2") and spec.get("plan") == "quadruped"


def is_mesh(spec):
    """A /2 file whose body is a signed sculpt (its `mesh` block), built by meshbody.py and never by a cage builder."""
    return isinstance(spec, dict) and spec.get("schema") == "mb-species/2" and isinstance(spec.get("mesh"), dict)


def internal(spec):
    """The species file as the cage builder reads it. A v1 file (mb-species/1) is converted (species_v1.to_internal); a file in today's shape is used as it is. A v1 file that is not valid is a build error naming its field.
    A quadruped's file is read as it is."""
    import species_v1 as V1
    if not V1.is_v1(spec):
        return spec
    errs = V1.validate(spec)
    if errs:
        raise BuildError(errs[0][1], errs[0][0])
    return spec if (is_quadruped(spec) or is_mesh(spec)) else V1.to_internal(spec)


def quad_check_genome(genome):
    if genome not in (None, "type"):
        raise BuildError(f"genome '{genome}': the quadruped has no genes yet, only the type builds", "genome")


def tables(spec):
    """The file's gene tables in the sampler's ids (s20genes.sampler_tables, from the block's catalogue records) or None for a file without a genome block (today's v0 S20.json, which keeps s20genes' own tables)."""
    import s20genes as GN
    g = spec.get("genome") if isinstance(spec, dict) else None
    return GN.sampler_tables(g) if isinstance(g, dict) and "loci" in g else None


def locus_entry(spec, name):
    g = (spec or {}).get("genome") or {}
    return next((e for e in g.get("loci", []) if e["locus"] == name), None)


def resolve_genome(g, spec=None):
    """A genome string or dict -> the individual dict (t, pairs, switches, seed) that s20genes builds from.
    type = the type specimen; seed:N = the variety sheet's individual N (seed:N@S: of the sheet with seed S);
    low:<locus> / high:<locus> = the type with that blend at its low or high limit (t = 0 or 1); allele:<locus>=<allele> = the type with that pair or switch set to an allowed allele;
    value:<locus>=<v> = a blend at a value (the computed fix builds these; the value may lie outside the limits); corner:<loud>+<loud> = the type with those loud genes on (glow, pattern, emblem, brow)."""
    import s20genes as GN, genomeapply as GA
    if isinstance(g, dict):
        return g
    g = g or "type"
    tbl = tables(spec)
    if g == "type":
        return GN.specimen(tbl)
    kind, _, arg = g.partition(":")
    if kind == "seed":
        try:
            n, _, sd = arg.partition("@")                                  # seed:N is individual N of the species' sheet; seed:N@S is individual N of the sheet drawn with seed S
            return GN.draw(int(n), int(sd)) if sd else GN.draw(int(n))
        except ValueError:
            raise BuildError(f"genome '{g}': seed needs a whole number", "genome")
    G = tbl[0] if tbl else GN.GENES
    loci = ", ".join(sorted(GN.RECORD.values())[:6])
    if kind in ("low", "high"):
        ind = GN.specimen(tbl)
        old = GN.SAMPLER_OF.get(arg)
        if old not in G or old in GN.PAIR_RECORD:
            raise BuildError(f"genome '{g}': no blend locus '{arg}' in the file (blends: {loci} ...)", "genome")
        ind["t"][old] = 0.0 if kind == "low" else 1.0
        return GN.limit_loud(ind)
    if kind == "value":
        name, _, v = arg.partition("=")
        ind = GN.specimen(tbl)
        _set_value(ind, tbl, g, name, v)
        return GN.limit_loud(ind)
    if kind == "allele":
        name, _, v = arg.partition("=")
        ind = GN.specimen(tbl)
        _set_allele(ind, spec, tbl, g, name, v)
        return GN.limit_loud(ind)
    if kind == "set":
        # set:<locus>=<value or allele>;<locus>=...  several loci at once: a play mibi's toys (a number sets a blend, anything else an allele)
        ind = GN.specimen(tbl)
        for item in filter(None, arg.split(";")):
            name, _, v = item.partition("=")
            entry = locus_entry(spec, name)
            if entry is not None and entry["op"] != "blend":
                _set_allele(ind, spec, tbl, g, name, v)
            else:
                _set_value(ind, tbl, g, name, v)
        return GN.limit_loud(ind)
    if kind == "pod":
        # pod:<json {copies: {record: [copy, copy]}, set?: {locus: value}}>  a pod of play, or a kept mibi: every record's two copies, and the toys' settings put on top of them
        try:
            o = json.loads(arg)
            ind = GN.individual_of({k: list(v) for k, v in o["copies"].items()}, tbl)
        except (ValueError, KeyError, TypeError) as e:
            raise BuildError(f"genome 'pod:...': the pod's copies are not readable ({type(e).__name__}: {e})", "genome")
        for name, v in sorted((o.get("set") or {}).items()):
            entry = locus_entry(spec, name)
            if entry is not None and entry["op"] != "blend":
                _set_allele(ind, spec, tbl, g, name, v)
            else:
                _set_value(ind, tbl, g, name, v)
        ind.pop("copies", None) if o.get("set") else None
        return ind
    if kind == "corner":
        bad = [x for x in arg.split("+") if x and x not in GN.LOUD]
        if bad:
            raise BuildError(f"genome '{g}': loud genes are {', '.join(GN.LOUD)}", "genome")
        ind = GN.specimen(tbl)
        on = set(x for x in arg.split("+") if x)
        if "glow" in on:
            ind["pairs"]["coat.glow-pattern"] = ["belly-arcs"] * 2
        if "pattern" in on:
            ind["pairs"]["coat.rd"] = ["spots"] * 2
        if "emblem" in on:
            ind["pairs"]["coat.mark"] = ["star"] * 2
        if "brow" in on:
            ind["switches"]["brow"] = True
        return ind
    if kind in ("string", "code"):
        return individual_from_text(g, arg, spec, tbl)
    raise BuildError(f"genome '{g}': use type, seed:N, set:<locus>=<v>;..., string:<G1-...>, code:<S20v1-...>, low:<locus>, high:<locus>, allele:<locus>=<allele>, value:<locus>=<v> or corner:<loud>+<loud>", "genome")


def _set_value(ind, tbl, g, name, v):
    """A blend at a value (the value may lie outside the limits)."""
    import s20genes as GN, genomeapply as GA
    G = tbl[0] if tbl else GN.GENES
    loci = ", ".join(sorted(GN.RECORD.values())[:6])
    old = GN.SAMPLER_OF.get(name)
    if old not in G or old in GN.PAIR_RECORD:
        raise BuildError(f"genome '{g}': no blend locus '{name}' in the file (blends: {loci} ...)", "genome")
    try:
        val = float(v)
    except ValueError:
        raise BuildError(f"genome '{g}': value needs a number after '='", "genome")
    form, lo, hi, _ = G[old]
    ind["t"][old] = GA.t_of(form, lo, hi, val)


def _set_allele(ind, spec, tbl, g, name, v):
    """A pair or switch locus set to an allowed allele."""
    import s20genes as GN
    entry = locus_entry(spec, name)
    if entry is None or entry["op"] == "blend":
        raise BuildError(f"genome '{g}': no pair or switch locus '{name}' in the file", "genome")
    if v not in entry["limits"]:
        raise BuildError(f"genome '{g}': '{v}' is not an allowed allele of {name} (allowed: {', '.join(map(str, entry['limits']))})", "genome")
    on = v == "on"
    old = GN.SAMPLER_OF.get(name)
    if old in GN.PAIR_RECORD:
        ind["pairs"][old] = [v, v]
    elif name == GN.MARKING_LAYOUT:
        ind["pairs"]["appearance.marking-layout"] = [GN.LAYOUT_BACK.get(v, v)] * 2
    elif name == GN.MARKING_SWITCH:
        lay = [a for a in ind["pairs"]["appearance.marking-layout"] if a != "plain"]
        ind["pairs"]["appearance.marking-layout"] = [lay[0] if lay else "banded"] * 2 if on else ["plain", "plain"]
    elif name == GN.WHISKER_SWITCH:
        none = GN.resolve_locus("face.whisker-count", ind["t"]["face.whisker-count"], (tbl[0] if tbl else GN.GENES)) < 1
        ind["t"]["face.whisker-count"] = 0.0 if not on else 0.4 if none else ind["t"]["face.whisker-count"]
    else:
        sw = next((k for k, (_, rec) in GN.SWITCH_RECORD.items() if rec == name), None)
        pr = next((o for o, (rec, _, _) in GN.PAIR_SWITCH.items() if rec == name), None)
        if sw:
            ind["switches"][sw] = on
        else:
            ind["pairs"][pr] = [GN.PAIR_SWITCH[pr][2 if on else 1]] * 2


def individual_from_text(selector, text, spec=None, tbl=None):
    """`string:G1-S20v1-...` or `code:S20v1-<mask>-...`: the one codec (genome-stamp, through node) reads it; a string of another species or frame version is refused with its stage; a stamp code that leaves a chapter unread starts that chapter at the type."""
    import s20genes as GN
    from wb import frame_writer as FW
    r = FW.node(dict(op="decode", text=text))
    if not r["ok"]:
        raise BuildError(f"genome '{selector[:48]}': {r['detail']}" + (f" ({r['stage']})" if r.get("stage") else ""), "genome")
    sid = (spec or {}).get("species") or "S20"
    if r["id"] != sid or r["version"] != 1:
        raise BuildError(f"genome '{selector[:48]}': this is a {r['name']} of frame version {r['version']}; this file is {sid} (frame version 1)", "genome")
    copies = {k: list(v) for k, v in GN.genome_of(GN.specimen(tbl)).items()}
    copies.update(r["copies"])
    ind = GN.individual_of(copies, tbl)
    ind["from"] = dict(kind=r["kind"], unread=r.get("unread") or [])
    return ind


def genome_copies(ind, spec=None):
    """The two copies of every record of an individual (the catalogue's records, the file's tables)."""
    import s20genes as GN
    tbl = tables(spec)
    return {k: list(v) for k, v in GN.genome_of(ind, tbl).items()}


def cage_inputs(spec, ind):
    """What the cage builder reads from a creature: the shape genes and the appendages (whiskers, fangs). The coat genes are not here, so a palette edit keeps the cage key."""
    import s20genes as GN
    c = GN.creature(ind, tables(spec))
    return c, dict(shape=c["shape"], appendages=c["appendages"])


def cage_key(spec, genome, stage="base"):
    spec = internal(spec)
    if is_quadruped(spec):
        quad_check_genome(genome)
        return H.hash_of("cage", H.framework_id(), dict(plan=spec["plan"], spine=spec["spine"], skeleton=spec.get("skeleton"), parts=spec.get("parts")), stage)
    ind = resolve_genome(genome, spec)
    _, ci = cage_inputs(spec, ind)
    return H.hash_of("cage", H.framework_id(), spec, ci, stage)


# ---- timing: wrap the stage functions of one build
_TARGETS = [
    ("s20build", "build_spine_loft", "loft"), ("s20legs", "build_legs", "legs"), ("s20tubes", "build_tubes", "tubes"), ("s20sitting", "build_sitting", "sitting"),
    ("s20build", "limit_fix", "limit_fix"), ("s20build", "orient_shells", "orient_shells"), ("relax", "smooth_junctions", "junctions"), ("relax", "tangential_relax", "relax"),
    ("beads", "add_toe_shells", "toes"), ("s20balance", "measure", "balance"), ("s20p4", "arm_numbers", "arm_fit"), ("appendages", "add_appendages", "appendages"),
]


def warm():
    """Import everything a build touches (the stage modules, the schema, the cage and subdivision code) so a worker pays for it once at start and not in the first edit's build. Returns the milliseconds it took."""
    import importlib
    t = time.perf_counter()
    for name in sorted({m for m, _, _ in _TARGETS} | {"s20genes", "schema", "s20build", "subdiv", "gltf_out", "caps", "spine", "gourd", "torso", "limitfix", "s20p2", "s20p4", "s20indiv"}):
        importlib.import_module(name)
    return (time.perf_counter() - t) * 1000


@contextlib.contextmanager
def timed(acc):
    """acc: dict name -> [calls, seconds]. Patches the S20 stage functions for the length of the block."""
    import importlib
    saved = []
    for mod, fn, label in _TARGETS:
        m = importlib.import_module(mod)
        orig = getattr(m, fn)

        def make(orig=orig, label=label):
            def w(*a, **k):
                t = time.perf_counter()
                try:
                    return orig(*a, **k)
                finally:
                    r = acc.setdefault(label, [0, 0.0])
                    r[0] += 1
                    r[1] += time.perf_counter() - t
            return w
        setattr(m, fn, make())
        saved.append((m, fn, orig))
    try:
        yield
    finally:
        for m, fn, orig in saved:
            setattr(m, fn, orig)


class Result:
    def __init__(self, **kw):
        self.__dict__.update(kw)

    def summary(self):
        return dict(species=self.species, stage=self.stage, genome=self.genome_hash, key=self.key, cage_hash=self.cage_hash, vertices=self.vertices, faces=self.faces,
                    timings_ms=self.timings_ms, calls=self.calls, parts=self.parts, balance=self.balance, framework=H.framework_id())


def build(spec, genome="type", stage="base"):
    """Build the cage of `spec` for `genome` up to `stage`. Returns a Result with the Body (result.body), the cage hash, the vertex count and the timings in ms."""
    import s20genes as GN, schema as SC, species_v1 as V1
    doc = spec if V1.is_v1(spec) else None
    spec = internal(spec)
    if stage not in STAGES:
        raise BuildError(f"stage '{stage}': one of {', '.join(STAGES)}", "stage")
    if is_mesh(spec):
        return build_mesh(spec, genome, stage)
    if is_quadruped(spec):
        return build_quadruped(spec, genome, stage)
    T = {}
    t0 = time.perf_counter()
    ind = resolve_genome(genome, spec)
    c, ci = cage_inputs(spec, ind)
    T["genome"] = (time.perf_counter() - t0) * 1000
    t = time.perf_counter()
    try:
        SC.validate(copy.deepcopy(spec))
    except SC.SchemaError as e:
        raise BuildError(str(e), _field_of(str(e)))
    T["validate"] = (time.perf_counter() - t) * 1000
    acc = {}
    import spine as SP
    cast0 = dict(SP.CAST_STATS)
    t = time.perf_counter()
    try:
        with timed(acc):
            body = GN.build_individual(spec, c, upto=stage, balance=(stage == "base"), doc=doc)
    except (SC.SchemaError, KeyError, ValueError, AssertionError, IndexError, np.linalg.LinAlgError) as e:
        raise BuildError(f"{type(e).__name__}: {e}", _field_of(str(e)))
    T["cage"] = (time.perf_counter() - t) * 1000
    t = time.perf_counter()
    ch = H.cage_hash(body)
    V, F, *_ = body.full()
    T["hash"] = (time.perf_counter() - t) * 1000
    for k, (n, s) in acc.items():
        T["cage." + k] = s * 1000
    cache = dict(cast_hit=SP.CAST_STATS["hit"] - cast0["hit"], cast_miss=SP.CAST_STATS["miss"] - cast0["miss"])
    T["total"] = (time.perf_counter() - t0) * 1000
    return Result(species=spec.get("species"), stage=stage, body=body, c=c, ind=ind, genome_hash=H.hash_of(ci), key=H.hash_of("cage", H.framework_id(), spec, ci, stage), cage_hash=ch,
                  vertices=len(V), faces=len(F), timings_ms={k: round(v, 1) for k, v in T.items()}, calls=dict({k: n for k, (n, s) in acc.items()}, **cache),
                  parts={k: int(v) for k, v in body.parts.items()}, balance=H._norm(body.ctx.get("balance", {})))


def mesh_individual(doc, genome):
    """The file of a mesh body with a genome's values applied (genomeapply moves on rig.bones and keys): `type`; `low:<locus>` and `high:<locus>` (the band's ends); `value:<locus>=<v>` (a value, also past the band: the range's ends);
    `seed:N` and `seed:N@S` (the Variety sheet's individual N, wb/variety.mesh_draw); `set:<locus>=<v>;<locus>=<v>`. Returns (file, {locus: value})."""
    import genomeapply as GA
    if isinstance(genome, dict):
        values = dict(genome)
    elif genome in (None, "type"):
        return doc, {}
    else:
        by = {e["locus"]: e for e in (doc.get("genome") or {}).get("loci", [])}
        kind, _, arg = genome.partition(":")
        try:
            if kind in ("low", "high"):
                b = by[arg]["band"]
                values = {arg: b["lo" if kind == "low" else "hi"]}
            elif kind == "value":
                name, _, v = arg.partition("=")
                values = {name: float(v)}
            elif kind == "set":
                values = {k.partition("=")[0]: float(k.partition("=")[2]) for k in arg.split(";") if k}
            elif kind == "seed":
                from wb import variety as VY
                n, _, sd = arg.partition("@")
                values = VY.mesh_draw(doc, int(n), int(sd) if sd else VY.settings(doc)["seed"])
            else:
                raise KeyError(kind)
        except (KeyError, ValueError):
            raise BuildError(f"genome '{genome}': a mesh body builds `type`, `low:<locus>`, `high:<locus>`, `value:<locus>=<v>`, `set:<locus>=<v>;...` and `seed:N` (loci: {', '.join(sorted(by))})", "genome")
    by = {e["locus"]: e for e in (doc.get("genome") or {}).get("loci", [])}
    unknown = [k for k in values if k not in by]
    if unknown:
        raise BuildError(f"genome: no locus '{unknown[0]}' in the file (loci: {', '.join(sorted(by))})", "genome")
    d = copy.deepcopy(doc)
    for k, v in values.items():
        GA.apply_locus(d, by[k], v)
    return d, values


def build_mesh(doc, genome="type", stage="base"):
    """The body of a mesh file: its sculpt and the library parts at their sockets (meshbody.py), with the genome's moves applied to the file's rig and keys first."""
    import meshbody as MB
    t0 = time.perf_counter()
    doc, values = mesh_individual(doc, genome)
    try:
        body = MB.body_of(doc) if not values else MB.MeshBody(doc)
    except (KeyError, ValueError, OSError, AssertionError, IndexError) as e:
        raise BuildError(f"{type(e).__name__}: {e}", "mesh")
    T = dict(mesh=(time.perf_counter() - t0) * 1000, total=(time.perf_counter() - t0) * 1000)
    V = body.Vw
    return Result(species=doc.get("id"), stage=stage, body=body, c={}, ind=values, genome_hash=H.hash_of("type", sorted(values.items())), key=H.hash_of("mesh", H.framework_id(), body.digest(), stage), cage_hash=body.digest(), vertices=len(V), faces=len(body.Fw),
                  timings_ms={k: round(v, 1) for k, v in T.items()}, calls={}, parts={k: int(v) for k, v in body.parts.items()}, balance=H._norm(body.ctx.get("balance", {})))


def build_quadruped(doc, genome="type", stage="base"):
    """The quadruped's cage (quadruped.py): the horizontal spine in the plan's ranges, the girdles and four legs, and its balance over the four soles. Its genes come with a later chunk."""
    import quadruped as Q
    quad_check_genome(genome)
    t0 = time.perf_counter()
    try:
        body = Q.build(doc)
    except (KeyError, ValueError, AssertionError, IndexError, np.linalg.LinAlgError) as e:
        raise BuildError(f"{type(e).__name__}: {e}", _field_of(str(e)))
    T = dict(cage=(time.perf_counter() - t0) * 1000)
    ch = H.cage_hash(body)
    V, F, *_ = body.full()
    key = cage_key(doc, genome, stage)
    t1 = time.perf_counter()
    body.ctx["balance"] = Q.balance(body)                          # the centre of mass over the four soles' polygon
    T["balance"] = (time.perf_counter() - t1) * 1000
    T["total"] = (time.perf_counter() - t0) * 1000
    return Result(species=doc.get("id"), stage=stage, body=body, c={}, ind={}, genome_hash=H.hash_of("type"), key=key, cage_hash=ch, vertices=len(V), faces=len(F), timings_ms={k: round(v, 1) for k, v in T.items()},
                  calls={}, parts={k: int(v) for k, v in body.parts.items()}, balance=H._norm(body.ctx.get("balance", {})))


def check_rows(doc, stages=("file", "cage", "rig", "coat")):
    """The rows of the file and cage checks on a species file, built in this process (no server, no pictures): what `wb new` and the framework tests read."""
    from checks import run as crun
    from checks.ctx import Ctx
    spec = internal(doc)
    rows = []
    if "file" in stages:
        rows += crun("file", Ctx(spec, doc=doc))
    if any(s_ in stages for s_ in ("cage", "rig", "coat")):
        r = build(doc, "type", "base")
        mesh = proxy_mesh(r.body, 1)
        if is_mesh(spec):
            import meshbody as MB
            mesh["frame"] = MB.frame(spec)
        elif is_quadruped(spec):
            import quadruped as Q
            mesh["frame"] = Q.frame(spec)
        cx = Ctx(spec, r.body, dict(vertices_l1=len(mesh["V"])), mesh, doc=doc)
        for st in ("cage", "rig", "coat"):
            if st in stages:
                rows += crun(st, cx)
    return rows


def _field_of(msg):
    """The dotted field a SchemaError names ('tail: ...' -> 'tail')."""
    head = msg.split(":")[0].strip()
    return head if head and " " not in head else None


def proxy_mesh(body, level=1):
    """The proxy mesh: the cage subdivided to `level`, with the part of each vertex. Returns dict(V, F, part, names)."""
    if getattr(body, "mesh_body", False):
        return body.proxy(with_parts=False)                    # a sculpt's surface is the file's own: the face decal is drawn on the body, not on its parts
    import subdiv as SD
    Vf, Ff, attr, fp, cr, mir = body.full()
    V, F, _, at, fpp = SD.subdivide_body(body, Vf, Ff, cr, attr, fp, levels=level)
    F = np.array(F, int)
    fpp = np.asarray(fpp).astype(int)
    cnt = np.zeros((len(V), len(body.parts) + 1))
    for k in range(4):
        np.add.at(cnt, (F[:, k], fpp), 1.0)
    return dict(V=np.asarray(V, float), F=F, part=cnt.argmax(1), names={int(v): k for k, v in body.parts.items()})
