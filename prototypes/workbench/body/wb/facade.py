"""The facade over today's S20 code: build(spec, genome, stage) -> Result, with a canonical key and every stage timed.
`spec` is the species file as a dict (species/S20.json or a copy of it); `genome` is a genome string (type, seed:N, low:<locus>, high:<locus>) or an individual dict as s20genes draws it.
S20's modules are used as they are; the timing wraps their stage functions for the length of one build and puts them back."""
import contextlib
import copy
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


def resolve_genome(g):
    """A genome string or dict -> the individual dict (t, pairs, switches, seed) that s20genes builds from.
    type = the type specimen; seed:N = the variety sheet's individual N; low:<locus> / high:<locus> = the type with that locus at 0 or 1 (its catalogue ends)."""
    import s20genes as GN
    if isinstance(g, dict):
        return g
    g = g or "type"
    if g == "type":
        return GN.specimen()
    kind, _, arg = g.partition(":")
    if kind == "seed":
        try:
            return GN.draw(int(arg))
        except ValueError:
            raise BuildError(f"genome '{g}': seed needs a whole number", "genome")
    if kind in ("low", "high"):
        ind = GN.specimen()
        if arg not in GN.GENES:
            raise BuildError(f"genome '{g}': no locus '{arg}' (loci: {', '.join(sorted(GN.GENES)[:6])} ...)", "genome")
        ind["t"][arg] = 0.0 if kind == "low" else 1.0
        return GN.limit_loud(ind)
    raise BuildError(f"genome '{g}': use type, seed:N, low:<locus> or high:<locus>", "genome")


def cage_inputs(spec, ind):
    """What the cage builder reads from a creature: the shape genes and the appendages (whiskers, fangs). The coat genes are not here, so a palette edit keeps the cage key."""
    import s20genes as GN
    c = GN.creature(ind)
    return c, dict(shape=c["shape"], appendages=c["appendages"])


def cage_key(spec, genome, stage="base"):
    ind = resolve_genome(genome)
    _, ci = cage_inputs(spec, ind)
    return H.hash_of("cage", H.framework_id(), spec, ci, stage)


# ---- timing: wrap the stage functions of one build
_TARGETS = [
    ("s20build", "build_spine_loft", "loft"), ("s20legs", "build_legs", "legs"), ("s20tubes", "build_tubes", "tubes"), ("s20sitting", "build_sitting", "sitting"),
    ("s20build", "limit_fix", "limit_fix"), ("s20build", "orient_shells", "orient_shells"), ("relax", "smooth_junctions", "junctions"), ("relax", "tangential_relax", "relax"),
    ("beads", "add_toe_shells", "toes"), ("s20balance", "measure", "balance"), ("s20p4", "arm_numbers", "arm_fit"), ("appendages", "add_appendages", "appendages"),
]


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
    import s20genes as GN, schema as SC
    if stage not in STAGES:
        raise BuildError(f"stage '{stage}': one of {', '.join(STAGES)}", "stage")
    T = {}
    t0 = time.perf_counter()
    ind = resolve_genome(genome)
    c, ci = cage_inputs(spec, ind)
    T["genome"] = (time.perf_counter() - t0) * 1000
    t = time.perf_counter()
    try:
        SC.validate(copy.deepcopy(spec))
    except SC.SchemaError as e:
        raise BuildError(str(e), _field_of(str(e)))
    T["validate"] = (time.perf_counter() - t) * 1000
    acc = {}
    t = time.perf_counter()
    try:
        with timed(acc):
            body = GN.build_individual(spec, c, upto=stage, balance=(stage == "base"))
    except (SC.SchemaError, KeyError, ValueError, AssertionError, IndexError, np.linalg.LinAlgError) as e:
        raise BuildError(f"{type(e).__name__}: {e}", _field_of(str(e)))
    T["cage"] = (time.perf_counter() - t) * 1000
    t = time.perf_counter()
    ch = H.cage_hash(body)
    V, F, *_ = body.full()
    T["hash"] = (time.perf_counter() - t) * 1000
    for k, (n, s) in acc.items():
        T["cage." + k] = s * 1000
    T["total"] = (time.perf_counter() - t0) * 1000
    return Result(species=spec.get("species"), stage=stage, body=body, c=c, ind=ind, genome_hash=H.hash_of(ci), key=H.hash_of("cage", H.framework_id(), spec, ci, stage), cage_hash=ch,
                  vertices=len(V), faces=len(F), timings_ms={k: round(v, 1) for k, v in T.items()}, calls={k: n for k, (n, s) in acc.items()},
                  parts={k: int(v) for k, v in body.parts.items()}, balance=H._norm(body.ctx.get("balance", {})))


def _field_of(msg):
    """The dotted field a SchemaError names ('tail: ...' -> 'tail')."""
    head = msg.split(":")[0].strip()
    return head if head and " " not in head else None


def proxy_mesh(body, level=1):
    """The proxy mesh: the cage subdivided to `level`, with the part of each vertex. Returns dict(V, F, part, names)."""
    import subdiv as SD
    Vf, Ff, attr, fp, cr, mir = body.full()
    V, F, _, at, fpp = SD.subdivide(Vf, Ff, cr, attr, fp, levels=level)
    F = np.array(F, int)
    fpp = np.asarray(fpp).astype(int)
    cnt = np.zeros((len(V), len(body.parts) + 1))
    for k in range(4):
        np.add.at(cnt, (F[:, k], fpp), 1.0)
    return dict(V=np.asarray(V, float), F=F, part=cnt.argmax(1), names={int(v): k for k, v in body.parts.items()})
