"""The rule start of M5: the approved render's star5 (compose-species.js), outer radius 6, inner 0.45 x 6, first point up, centred on (6, 6);
pixel centre inside -> ink; ink with a 4-neighbour outside -> gold, the rest yellow."""
import math
import numpy as np

def poly(cx=6.0, cy=6.0, r=6.0):
    pts = []
    for i in range(10):
        q = r * 0.45 if i % 2 else r
        an = -math.pi / 2 + i * math.pi / 5
        pts.append((cx + q * math.cos(an), cy + q * math.sin(an)))
    return pts

def inside(pts, x, y):
    """even-odd ray cast"""
    c = False
    for k in range(len(pts)):
        (x1, y1), (x2, y2) = pts[k], pts[k - 1]
        if (y1 > y) != (y2 > y) and x < x1 + (y - y1) * (x2 - x1) / (y2 - y1):
            c = not c
    return c

def rule(n=12):
    P = poly()
    return np.array([[inside(P, i + 0.5, j + 0.5) for i in range(n)] for j in range(n)], bool)

def edge(m):
    p = np.pad(m, 1)
    out4 = ~p[:-2, 1:-1] | ~p[2:, 1:-1] | ~p[1:-1, :-2] | ~p[1:-1, 2:]
    return m & out4
