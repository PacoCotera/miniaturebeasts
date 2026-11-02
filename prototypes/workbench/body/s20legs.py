"""S20 legs (chunk 2): Loika's leg builder unchanged in method (limbs.grow_limb: a 2 x 2 socket patch cut from the loft, its 8-loop pushed out and bridged to the first ring wholly outside the loft, a flat sole, three toe beads),
with the socket read from the file: the station and column of `column_keys.leg` instead of limbs.SOCKETS."""
import numpy as np
import limbs


def socket_index(spec, key, ctx):
    """The ring and column of a socket's centre: a vertical ring by its z (`station`), a ring of the bend or tail by its arc length from the crown (`u`)."""
    k = spec["parts"]["torso"]["column_keys"][key]
    info, G = ctx["info"]["torso"], ctx["T"]
    if "u" in k:
        i = int(np.argmin([abs(G.L - r["s"] - k["u"]) for r in info["ring_info"]]))
    else:
        nv = info["n_vertical"]
        zs = info["z"]
        i = len(zs) - nv + int(np.argmin([abs(z - k["station"]) for z in zs[len(zs) - nv:]]))
    return i, k["col"]


def build_legs(body, ctx):
    spec = ctx["spec"]
    tinfo = ctx["info"]["torso"]
    i, c = socket_index(spec, "leg", ctx)
    rec = limbs.grow_limb(body, ctx, "leg.L", spec["parts"]["leg.L"], i, c, tinfo["faces"], tinfo["rings"])
    ctx["info"]["limbs"] = {"leg.L": rec}
