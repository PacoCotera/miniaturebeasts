"""The rule start of M4: the approved render's seedMark (iwq art/compose-all2-v3.js): a pointed almond of two circular arcs,
half-width w 4.2, half-length h 8, arc radius rr = (w^2 + h^2) / (2w), centred on (12, 12), rotated by -pi/5 in canvas terms.
A pixel whose centre lies inside both arcs is the seed; a seed pixel with a 4-neighbour outside is the edge."""
import math
import numpy as np

W, H = 4.2, 8.0
RR = (W * W + H * H) / (2 * W)

def rule(n=24, c=12.0, rot=-math.pi / 5):
    j, i = np.mgrid[0:n, 0:n]
    px, py = i + 0.5 - c, j + 0.5 - c
    # into the almond's frame: undo the canvas rotation
    ca, sa = math.cos(-rot), math.sin(-rot)
    lx = ca * px - sa * py
    ly = sa * px + ca * py
    return (np.hypot(lx - (W - RR), ly) <= RR) & (np.hypot(lx - (RR - W), ly) <= RR)

def edge(m):
    p = np.pad(m, 1)
    return m & (~p[:-2, 1:-1] | ~p[2:, 1:-1] | ~p[1:-1, :-2] | ~p[1:-1, 2:])
