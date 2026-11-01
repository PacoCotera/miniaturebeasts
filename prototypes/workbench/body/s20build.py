"""Assemble Tuliko's (S20) one continuous cage from species/S20.json, chunk by chunk: make_s20(spec, upto) -> Body (limit-fixed). Loika's build.py is untouched."""
import os
import numpy as np
import schema as SC
from body import Body
from gourd import Gourd, build_loft
from limitfix import limit_fix

S20 = os.path.join(os.path.dirname(os.path.abspath(__file__)), "species", "S20.json")
STAGES = ("loft", "legs", "tubes", "base")


def make_s20(spec=None, upto="base", fix=True, **kw):
    if spec is None:
        spec, _ = SC.load(S20)
    body = Body("tuliko")
    G = Gourd(spec)
    ctx = dict(spec=spec, H=None, T=G, G=G, info={}, log={}, opts=kw)
    ctx["info"]["torso"] = build_loft(body, spec, G)
    stage = STAGES.index(upto)
    if stage >= 1:
        import s20legs
        s20legs.build_legs(body, ctx)
    body.ctx = ctx
    m, vol = body.finish()
    ctx["remap"] = m
    ctx["volume"] = vol
    ctx["body_parts"] = dict(body.parts)
    ctx["n_before_details"] = len(body.cage.V)
    if fix:
        for cp in body.caps:              # the cap interiors are fitted to their own spots on the section profile (limit_fix free_caps=False)
            for v in cp.ids:
                body.target[v] = np.array(body.cage.V[v], float)
        if kw.get("corners_free", True):
            for cp in body.caps:
                for k in ((cp.na, 0), (cp.na, cp.nb)):
                    body.target[cp.G[k]] = None
        ctx["log"]["limit"] = limit_fix(body, free_caps=kw.get("free_caps", True))
    return body
