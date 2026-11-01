"""S20 chunk 4: the sitting shapes, closed domes sunk into the loft (head.sitting_dome for shapes on the mirror line; dome_full for off-plane ones): the arm nubs, the nose button, the tail-tip families (plain, tuft, lantern).
Each shape is placed so a fraction `sink` of its length along its axis lies inside the loft. Every vertex targets itself (they are not fitted to a field)."""
import math
import numpy as np
from head import sitting_dome


def _frame(axis, world_up=(0.0, 0.0, 1.0)):
    axis = np.asarray(axis, float)
    axis = axis / np.linalg.norm(axis)
    up = np.asarray(world_up, float) - (np.asarray(world_up, float) @ axis) * axis
    if np.linalg.norm(up) < 1e-6:
        up = np.array([-1.0, 0, 0]) - (np.array([-1.0, 0, 0]) @ axis) * axis
    up /= np.linalg.norm(up)
    lat = np.cross(up, axis)
    return axis, up, lat


def dome_full(body, part, c, axis, up, lat, rx, ry, rz, us=(-0.8, -0.27, 0.27, 0.8)):
    """A closed ellipsoid-like dome with full 8-rings (every vertex off the mirror plane), one centre vertex at each end (4 quads each)."""
    rings = []
    for u in us:
        k = math.sqrt(1 - u * u)
        ids = []
        for m in range(8):
            ph = 2 * math.pi * m / 8
            p = c + axis * rx * u + lat * ry * k * math.sin(ph) + up * rz * k * math.cos(ph)
            ids.append(body.add(p, part, u, m / 8, target=p))
        rings.append(ids)
    for a_, b_ in zip(rings, rings[1:]):
        for m in range(8):
            body.face(a_[m], a_[(m + 1) % 8], b_[(m + 1) % 8], b_[m], part)
    ends = []
    for ring, sgn in ((rings[0], -1), (rings[-1], 1)):
        p = c + axis * rx * sgn
        cv = body.add(p, part, float(sgn), 0.0, target=p)
        ends.append(cv)
        for m in range(0, 8, 2):
            body.face(ring[m], ring[m + 1], ring[(m + 2) % 8], cv, part)
    return dict(rings=rings, ends=ends, c=c, axis=axis)


def _place(P, axis, rx, sink):
    """The dome centre so that the point `sink` of the way along the shape (from its base) sits at the surface point P."""
    return np.asarray(P, float) + np.asarray(axis, float) * rx * (1 - 2 * sink)


def build_sitting(body, ctx):
    spec, G = ctx["spec"], ctx["T"]
    body._from_local = lambda p: np.asarray(p, float)
    S = spec["sockets"]
    out = {}
    # arms (off the mirror plane: full rings)
    a = S["arm.L"]
    sh = a["shapes"]["nub"]
    P = G.point(np.array([a["station"]]), np.array([a["around"]]))[0]
    ax, up, lat = _frame(sh["axis"])
    rx, ry, rz = sh["r"]
    ctx_arm = dome_full(body, "arm.L", _place(P, ax, rx, sh["sink"]), ax, up, lat, rx, ry, rz)
    ctx_arm.update(sink=sh["sink"], P=P)
    out["arm.L"] = ctx_arm
    # nose button (on the mirror line: half rings)
    n = S["nose"]
    sh = n["shapes"]["button"]
    P = G.point(np.array([n["station"]]), np.array([n["around"]]))[0]
    rx, ry, rz = sh["r"]
    rings = sitting_dome(body, "nose", _place(P, np.array([1.0, 0, 0]), rx, sh["sink"]), np.array([1.0, 0, 0]), np.array([0, 0, 1.0]), np.array([0, 1.0, 0]), rx, ry, rz)
    out["nose"] = dict(rings=rings, P=P, sink=sh["sink"], axis=np.array([1.0, 0, 0]), rx=rx)
    # the tail tip
    fam = ctx["opts"].get("tip", S["tail.tip"]["default"])
    ctx["tip_family"] = fam
    size = float(ctx["opts"].get("tip_size", 1.0))
    sh = S["tail.tip"]["shapes"].get(fam)
    if sh is not None:
        rec = ctx["info"]["tubes"]["tail"]
        pa = rec["path"]
        end = rec["ringinfo"][-1]
        Tg = end["T"]
        tip = end["centre"] + Tg * 0.5 * max(end["ra"], end["rf"])          # inside the tail's closed end
        ax, up, lat = _frame(Tg, (0.0, 0.0, 1.0))
        rx, ry, rz = [v * size for v in sh["r"]]
        c = _place(tip, Tg, rx, sh["sink"])
        # the shape's up is the world's in the tail's mirror plane; lat is the mirror normal (+y) by construction
        lat = np.array([0.0, 1.0, 0.0])
        up = np.cross(ax, lat) * -1.0
        up /= np.linalg.norm(up)
        rings = sitting_dome(body, "tail.tip", c, ax, up, lat, rx, ry, rz)
        rec_t = dict(rings=rings, c=c, axis=ax, rx=rx, sink=sh["sink"], family=fam, emissive=(sh.get("emission") == "glow"), lobes=[])
        if fam == "tuft":
            lr = sh["lobe_r"] * size
            # three lobes round the tip: one up on the mirror line, one each side (the left one here, its mirror image the right)
            front = c + ax * rx
            lobe_up = front - ax * lr * 0.3 + up * ry * 0.55
            r1 = sitting_dome(body, "tail.tip", lobe_up, ax, up, lat, lr, lr, lr)
            lobe_l = front - ax * lr * 0.3 - up * ry * 0.25 + lat * ry * 0.75
            r2 = dome_full(body, "tail.tip", lobe_l, ax, up, lat, lr, lr, lr)
            rec_t["lobes"] = [r1, r2]
        out["tail.tip"] = rec_t
    ctx["info"]["sitting"] = out
