"""Assemble Loika's one continuous cage from the species file, chunk by chunk. make_body(spec, H, upto) -> Body (limit-fixed)."""
import numpy as np
import schema as SC
from body import Body
from torso import Torso, build_torso
from limitfix import limit_fix


def make_body(spec=None, H=None, upto="torso", fix=True, beads=True):
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
    body.ctx = ctx
    m, vol = body.finish()
    ctx["remap"] = m
    ctx["volume"] = vol
    if fix:
        ctx["log"]["limit"] = limit_fix(body)
    if upto in ("legs", "base", "all") and beads:
        import beads as BD
        BD.add_beads(body, ctx)
        body.fix_winding_again = True
        body.cage.fix_winding()
    return body
