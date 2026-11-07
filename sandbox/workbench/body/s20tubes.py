"""S20 chunk 3: the ears (lateral tubes on sockets). The tail is NOT built here: it is a named range of the one spine and loft (spine.py)."""
import tube
import s20legs


def build_tubes(body, ctx):
    spec = ctx["spec"]
    out = {}
    ear = spec["parts"]["ear.L"]
    fam = ctx["opts"].get("ear", ear["default"])
    ctx["ear_family"] = fam
    if not ear["families"][fam].get("sit"):
        i, c = s20legs.socket_index(spec, "ear", ctx)
        out["ear.L"] = tube.grow_tube(body, ctx, "ear.L", ear, ear["families"][fam], i, c, False)
    arm = spec["parts"]["arm.L"]
    i, c = s20legs.socket_index(spec, "arm", ctx)
    out["arm.L"] = tube.grow_tube(body, ctx, "arm.L", arm, arm["families"][arm["default"]], i, c, False)
    ctx["info"]["tubes"] = out
