"""Assemble Loika's one continuous cage from the species file, chunk by chunk. make_body(spec, H, upto) -> Body (limit-fixed)."""
import numpy as np
import schema as SC
from body import Body
from torso import Torso, build_torso
from limitfix import limit_fix


def make_body(spec=None, H=None, upto="torso", fix=True, beads=True, crown=None):
    if spec is None:
        spec, H = SC.load()
    body = Body()
    T = Torso(spec)
    info = dict(torso=build_torso(body, spec, T))
    ctx = dict(spec=spec, H=H, T=T, info=info, log={})
    if upto in ("legs", "base", "all"):
        import limbs
        limbs.build_limbs(body, ctx)
    if upto in ("base", "all"):
        import head
        head.build_head(body, ctx)
        if crown is not False:             # every Loika has a crown (owner ruling); crown=False is the bare test body
            import crown as CR
            CR.build_crown(body, ctx, crown or {})
    body.ctx = ctx
    m, vol = body.finish()
    ctx["remap"] = m
    ctx["volume"] = vol
    ctx["body_parts"] = dict(body.parts)
    ctx["n_before_details"] = len(body.cage.V)
    if upto in ("legs", "base", "all") and beads:
        import beads as BD
        BD.add_beads(body, ctx)
        if upto in ("base", "all"):
            import eyes as EY
            EY.add_eyes(body, ctx)
        body.cage.fix_winding()
    if fix:
        ctx["log"]["limit"] = limit_fix(body)
    return body
