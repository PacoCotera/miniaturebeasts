"""Assemble Tuliko's (S20) one continuous cage from species/S20.json, chunk by chunk: make_s20(spec, upto) -> Body (limit-fixed). Loika's build.py is untouched."""
import os
import numpy as np
import schema as SC
from body import Body
from gourd import Gourd, build_loft
from spine import SpineLoft, build_spine_loft
from limitfix import limit_fix

S20 = os.path.join(os.path.dirname(os.path.abspath(__file__)), "species", "S20.json")
STAGES = ("loft", "legs", "tubes", "base")


def orient_shells(body):
    """Cage.fix_winding makes each connected piece consistent but only flips the WHOLE cage when its total volume is negative, so a separate closed shell (an arm, the nose, the tip) can be inside out and vanish
    in a back-face-culling viewer. Orient every closed shell by its own signed volume (components found on the full mirrored mesh; the mirror copies follow their originals). Returns the number flipped."""
    c = body.cage
    V, faces, _ = c.full()
    nf = len(c.F)
    parent = {}
    def find(a):
        while parent.setdefault(a, a) != a:
            parent[a] = parent[parent[a]]; a = parent[a]
        return a
    for f in faces:
        for k in range(1, 4):
            ra, rb = find(f[0]), find(f[k])
            if ra != rb:
                parent[ra] = rb
    vol = {}
    for fi, f in enumerate(faces):
        a, b_, c_, d = (V[i] for i in f)
        vol.setdefault(find(f[0]), []).append((fi, float(np.dot(a, np.cross(b_, c_)) + np.dot(a, np.cross(c_, d)))))
    flipped = 0
    for comp, items in vol.items():
        if sum(v for _, v in items) < 0:
            for fi, _ in items:
                if fi < nf:
                    c.F[fi] = tuple(c.F[fi][::-1])
            flipped += 1
    return flipped


def make_s20(spec=None, upto="base", fix=True, **kw):
    if spec is None:
        spec, _ = SC.load(S20)
    body = Body("tuliko")
    G = SpineLoft(spec, tip=kw.get("tip"), tip_size=kw.get("tip_size", 1.0))
    ctx = dict(spec=spec, H=None, T=G, G=G, info={}, log={}, opts=kw)
    ctx["info"]["torso"] = build_spine_loft(body, spec, G)
    stage = STAGES.index(upto)
    if stage >= 1:
        import s20legs
        s20legs.build_legs(body, ctx)
    if stage >= 2:
        import s20tubes
        s20tubes.build_tubes(body, ctx)
    if stage >= 3:
        import s20sitting
        s20sitting.build_sitting(body, ctx)
    body.ctx = ctx
    m, vol = body.finish()
    ctx["remap"] = m
    body.tag = {m[k]: v for k, v in body.tag.items() if k in m}          # tags set before the fit (hard shells) follow the vertex remap
    ctx["shells_flipped"] = orient_shells(body)
    ctx["volume"] = vol
    ctx["body_parts"] = dict(body.parts)
    ctx["n_before_details"] = len(body.cage.V)
    if stage >= 1:
        import beads as BD
        for rec_ in ctx["info"].get("limbs", {}).values():          # the flat sole's rim is a deliberate sharp feature, like the toes: tagged as a crease (the normal test leaves it out)
            for v_ in rec_["rings"][rec_["support_ring"]] + [rec_["sole_centre"]]:
                if v_ in m:
                    body.tag[m[v_]] = 1.0
        BD.add_toe_shells(body, ctx)          # three toe shells per foot, after the fit's frame is known (they follow it by hook)
        body.cage.fix_winding()
        ctx["shells_flipped"] += orient_shells(body)
    if fix:
        for cp in body.caps:              # the cap interiors are fitted to their own spots on the section profile (limit_fix free_caps=False)
            for v in cp.ids:
                body.target[v] = np.array(body.cage.V[v], float)
        if kw.get("corners_free", True):
            for cp in body.caps:
                for k in ((cp.na, 0), (cp.na, cp.nb)):
                    body.target[cp.G[k]] = None
        if kw.get("loops_free", False):
            import mquality as _Q
            val = body.valence()
            recs = list(ctx["info"].get("limbs", {}).values()) + list(ctx["info"].get("tubes", {}).values())
            m = ctx["remap"]
            for rec in recs:
                for v in rec["loop"]:
                    if val[m[v]] == 5:
                        body.target[m[v]] = None
        ctx["log"]["limit"] = limit_fix(body, free_caps=kw.get("free_caps", True))
        if stage >= 1 and kw.get("smooth_junctions", True):
            import relax
            keep = spec["parts"]["torso"].get("junction_keep_above")
            rad = spec["parts"]["torso"].get("junction_radius")
            base_ = dict(keep_above=keep, radius=rad)
            ctx["log"]["junctions"] = relax.smooth_junctions(body, ctx, **{**base_, **kw.get("junction_opts", {})})
            for nm_, o_ in (kw.get("junction_extra") or {"ear.L": dict(iters=100, hops=10), "arm.L": dict(iters=90, hops=9)}).items():       # the ears and arms are thinner than the legs: a second, wider pass on their loops
                ctx["log"]["junctions_" + nm_] = relax.smooth_junctions(body, ctx, only=[nm_], **{**base_, **o_})
            rs_ = spec["parts"]["torso"]["spine"].get("root_smooth")
            if rs_:                                          # the tail's root: the rings that turn the rump into the tail are smoothed (a corner under the root, a knob)
                Gs = ctx["T"]
                lo_, hi_ = Gs.s_root - float(rs_["before"]), Gs.s_root + float(rs_["after"])
                ids_ = [v for v in range(len(body.cage.V)) if body.part[v] == body.parts["torso"] and lo_ <= body.s[v] <= hi_]
                ctx["log"]["root_smooth"] = relax.smooth_junctions(body, ctx, only=[], extra_seeds=ids_, iters=int(rs_["iters"]), hops=int(rs_["hops"]), radius=float(rs_["radius"]), keep_above=spec["parts"]["torso"].get("junction_keep_above"))
            for h in body.hooks:
                h(body)
        if stage >= 1 and kw.get("relax", True):
            import relax
            ctx["log"]["relax"] = relax.tangential_relax(body, ctx, **kw.get("relax_opts", {}))
            for h in body.hooks:
                h(body)
    if kw.get("appendages"):
        import appendages as AP
        ctx["log"]["appendages"] = AP.add_appendages(body, ctx, kw["appendages"])
        ctx["shells_flipped"] += orient_shells(body)
        ctx["body_parts"] = dict(body.parts)
    return body
