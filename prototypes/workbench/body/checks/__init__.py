"""The check registry (spec 9): each check is a registered function with an id, the owner rule it enforces (the decisions.md date and its words), its stage, a version, the limit, the measure and a proof picture.
Names and fail lines are words.md 5.12. A check function takes a Ctx and returns a Row; the registry runs a stage and stamps each row with the check's identity."""
import hashlib
import json

REGISTRY = []                  # the checks, in the order the drawer lists them
VERSION_SALT = "checks-12"      # bump to re-measure everything


class Check:
    def __init__(self, id, name, fail, stage, rule, limit, part, fields, fn, version=1, play=None, az=90, mode="clay", sources=()):
        self.id, self.name, self.fail, self.stage, self.rule, self.limit, self.part, self.fields = id, name, fail, stage, rule, limit, part, list(fields)
        self.fn, self.version, self.play, self.az, self.mode, self.sources = fn, version, play, az, mode, tuple(sources)

    def meta(self):
        """What the page needs to say about the check before it has a result: the owner's words, the limit, the fields that drive it, where it shows."""
        return dict(id=self.id, name=self.name, fail=self.fail, stage=self.stage, version=self.version, rule=self.rule, limit=self.limit, part=self.part, fields=self.fields,
                    play=self.play, az=self.az, mode=self.mode, sources=list(self.sources))


FACE_CHECKS = ("face.count", "face.front", "face.on-body", "face.flush", "face.size", "face.row", "face.lid", "face.mouth", "face.clear", "face.iris")          # the language's face checks: they judge a mb-species/2 file of any plan
BODY_CHECKS = ("body.mass", "body.band15", "body.feet", "body.pairs", "body.twist", "body.twist.clip")          # the language's body checks: they judge a mb-species/2 file
QUAD_CHECKS = ("schema", "express", "ranges", "joins", "head.attach", "head.neck", "tail.taper", "tail.size", "balance", "limbs", "verts", "normals", "mesh", "midline", "breath", "waddle") + FACE_CHECKS + BODY_CHECKS          # what judges a quadruped's bare base: its file, its ranges, the head, neck and chest, the tail, balance over four soles, the vertex count and the mesh by range


MESH_CHECKS = ("mesh.watertight", "mesh.budget", "mesh.parts", "mesh.relief", "mesh.flat", "mesh.size", "mesh.stamp", "mesh.read")          # a mesh file's own: the sculpt's files judged before the studio builds from them
MESH_BODY_CHECKS = ("body.mass", "body.band15", "body.twist", "body.twist.clip", "balance", "rig.splay")          # the body checks that read a sculpt's armature (chunk 31): the head and leg shares, the proportion bands, the twist at rest and in the walk, balance over the soles, and the feet under the hips
MESH_FILE_CHECKS = ("schema",) + MESH_CHECKS + FACE_CHECKS + MESH_BODY_CHECKS          # what judges a file whose body is a sculpt (no cage, no spine, no limbs to measure)
MESH_ONLY = ("rig.splay",)                                                                  # a check no other plan is asked


def check(**kw):
    def deco(fn):
        REGISTRY.append(Check(fn=fn, **kw))
        return fn
    return deco


def by_id(i):
    return next(c for c in REGISTRY if c.id == i)


def stages(stage):
    """The stage names a request covers: file, cage, extremes, or all (file then cage: the extremes stage builds about fifty cages, so it runs when asked)."""
    return {"file": ("file",), "cage": ("cage",), "rig": ("rig",), "coat": ("coat",), "extremes": ("extremes",), "all": ("file", "cage", "rig", "coat")}[stage]


def version_id(stage="all"):
    """A hash of the ids and versions of the checks a stage runs: part of every result's cache key."""
    from . import biped, face, body, mesh  # noqa: F401  (the registry fills when the checks are imported: a key made before that would differ from one made after)
    s = [(c.id, c.version, c.stage) for c in REGISTRY if c.stage in stages(stage)]
    return hashlib.sha256(json.dumps([VERSION_SALT, s]).encode()).hexdigest()[:12]


def row(state, value, limit, measure, proof=None, extra=None):
    """state: pass | warn | fail. value and limit are numbers or short text; measure is the one line under the fail line ("Side area 0.29 of the trunk, limit 0.25")."""
    return dict(state=state, value=value, limit=limit, measure=measure, proof=proof, extra=extra or {})


def run(stage, ctx, only=None):
    """Run the checks of one stage ("file" or "cage") on a Ctx. A check that raises is a row with state "fail" and the error as its measure, never a crash."""
    from . import biped, face, body, mesh  # noqa: F401  (registers the checks)
    out = []
    lang = isinstance(ctx.doc, dict) and ctx.doc.get("schema") == "mb-species/2"            # the language checks judge a /2 file; the fixture and the older files are skipped
    quad = isinstance(ctx.spec, dict) and ctx.spec.get("schema") in ("mb-species/1", "mb-species/2") and ctx.spec.get("plan") == "quadruped"      # a quadruped's own file (the cage builder reads it as it is)
    sculpt = isinstance(ctx.doc, dict) and isinstance(ctx.doc.get("mesh"), dict)
    for c in REGISTRY:
        if c.stage != stage or (only and c.id not in only):
            continue
        if (c.id in MESH_CHECKS or c.id in MESH_ONLY) and not sculpt:
            continue                                              # the mesh checks judge a mesh file only
        if sculpt and c.id not in MESH_FILE_CHECKS:
            continue
        if (c.id in FACE_CHECKS or c.id in BODY_CHECKS or c.id in MESH_ONLY) and not lang:
            continue
        if quad and not sculpt and c.id not in QUAD_CHECKS:
            continue                                                  # the biped's measures read the biped's body; the quadruped's own come with its checks
        try:
            r = c.fn(ctx)
        except Exception as e:                                   # noqa: BLE001
            r = row("fail", None, c.limit.get("text") if isinstance(c.limit, dict) else None, f"{type(e).__name__}: {e}")
        r.update(id=c.id, stage=c.stage, version=c.version)
        out.append(r)
    return out


def metas():
    from . import biped, face, body, mesh  # noqa: F401
    return [c.meta() for c in REGISTRY]
