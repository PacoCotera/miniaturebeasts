"""S20 chunk 3: the tail (centre tube on the mirror) and the ears (lateral tubes), from the file."""
import tube


def build_tubes(body, ctx):
    spec = ctx["spec"]
    t = spec["parts"]["torso"]
    zs = t["rings_z"]
    out = {}
    tail = spec["parts"]["tail"]
    out["tail"] = tube.grow_tube(body, ctx, "tail", tail, tail, zs.index(tail["socket"]["station"]), 0, True)
    ear = spec["parts"]["ear.L"]
    fam = ctx["opts"].get("ear", ear["default"])
    ctx["ear_family"] = fam
    if not ear["families"][fam].get("sit"):
        k = t["column_keys"]["ear"]
        out["ear.L"] = tube.grow_tube(body, ctx, "ear.L", ear, ear["families"][fam], zs.index(k["station"]), k["col"], False)
    ctx["info"]["tubes"] = out
