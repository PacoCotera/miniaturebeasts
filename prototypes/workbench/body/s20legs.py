"""S20 legs (chunk 2): Loika's leg builder unchanged in method (limbs.grow_limb: a 2 x 2 socket patch cut from the loft, its 8-loop pushed out and bridged to the first ring wholly outside the loft, a flat sole, three toe beads),
with the socket read from the file: the station and column of `column_keys.leg` instead of limbs.SOCKETS."""
import limbs


def socket_index(spec, key):
    t = spec["parts"]["torso"]
    k = t["column_keys"][key]
    return t["rings_z"].index(k["station"]), k["col"]


def build_legs(body, ctx):
    spec = ctx["spec"]
    tinfo = ctx["info"]["torso"]
    i, c = socket_index(spec, "leg")
    rec = limbs.grow_limb(body, ctx, "leg.L", spec["parts"]["leg.L"], i, c, tinfo["faces"], tinfo["rings"])
    ctx["info"]["limbs"] = {"leg.L": rec}
