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
    # the nose is a soft mound in the loft itself (the torso mass `nose`) with a painted button; the arms are tubes (s20tubes); the tail tip is the bulb of the one spine
    # the tail tip is not a shell any more: it is the bulb on the last stretch of the one spine (spine.SpineLoft.tail_radius)
    ctx["tip_family"] = ctx["T"].tip_family
    ctx["info"]["sitting"] = out
