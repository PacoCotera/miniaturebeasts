"""Build, rig and render one creature from its creature.json. Under the bpy venv. Returns the artefacts and the per-stage timings."""
import os, sys, json, time, hashlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import schema as SC, build, rig, genes, render_skin as RS, subdiv as SD, gltf_out, views


def build_creature(c):
    t0 = time.time()
    with open(SC.SPECIES) as fh:
        raw = json.load(fh)
    raw = genes.apply_to_spec(raw, c)
    spec, H = SC.load(raw=raw)
    cr = dict(c["crown"])
    b = build.make_body(spec, H, upto="base", crown=cr)
    R = rig.Rig(b.ctx)
    return b, R, time.time() - t0


def render_individual(c, outdir, tag, sizes=(304, 96), samples=None):
    b, R, t_build = build_creature(c)
    Mp = R.stand_pose()
    pal = genes.palette_of(c)
    out = dict(t_build=t_build, digest=genes.digest(c), files={}, t_render={})
    for s in sizes:
        t0 = time.time()
        cen = RS.aligned_centre(b, R, Mp, s)
        p = os.path.join(outdir, f"{tag}-{s}.png")
        a, _ = RS.render_skin(b, R, Mp, p, s, centre=cen, palette=pal, zones=c["zones"], material=c["material"], face=c["face"], samples=samples or (64 if s == 304 else 64))
        out["files"][s] = p; out["t_render"][s] = time.time() - t0
    return b, R, out
