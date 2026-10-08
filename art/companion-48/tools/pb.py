"""A small pixel buffer for scripted pieces (icons, caps, 9-slices, masks): the page's PB in Python.

Indices are palette indices, -1 transparent. Fills are flat; no anti-aliasing anywhere.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import pal
P = pal.load()
C = P.index


class PB:
    def __init__(self, w, h, fill=-1):
        self.w, self.h = w, h
        self.p = np.full((h, w), fill, dtype=np.int64)

    def set(self, x, y, c):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < self.w and 0 <= y < self.h: self.p[y, x] = c

    def get(self, x, y):
        return self.p[y, x] if 0 <= x < self.w and 0 <= y < self.h else -1

    def rect(self, x, y, w, h, c):
        x0, y0, x1, y1 = max(0, x), max(0, y), min(self.w, x + w), min(self.h, y + h)
        if x1 > x0 and y1 > y0: self.p[y0:y1, x0:x1] = c

    def ell(self, cx, cy, rx, ry, c, sh=None, clip=None):
        """Flat ellipse; sh=[light, shade] adds a lit top-left band and a shaded bottom-right band."""
        for y in range(self.h):
            for x in range(self.w):
                dx, dy = (x + .5 - cx) / rx, (y + .5 - cy) / ry
                d = dx * dx + dy * dy
                if d <= 1 and (clip is None or clip(x, y)):
                    col = c
                    if sh:
                        if dx + dy < -.9 and d > .25: col = sh[0]
                        elif dx + dy > .9 and d > .4: col = sh[1]
                    self.p[y, x] = col

    def poly(self, pts, c):
        n = len(pts)
        for y in range(self.h):
            yy = y + .5; xs = []
            for i in range(n):
                (x0, y0), (x1, y1) = pts[i], pts[(i + 1) % n]
                if (y0 <= yy < y1) or (y1 <= yy < y0):
                    xs.append(x0 + (yy - y0) * (x1 - x0) / (y1 - y0))
            xs.sort()
            for i in range(0, len(xs) - 1, 2):
                for x in range(int(np.ceil(xs[i] - .5)), int(np.floor(xs[i + 1] - .5)) + 1):
                    if 0 <= x < self.w: self.p[y, x] = c

    def line(self, x0, y0, x1, y1, c):
        n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
        for i in range(n):
            t = i / max(1, n - 1); self.set(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, c)

    def outline(self, col=None):
        """The outline rule (quant.outline) or a single given colour on every edge pixel."""
        import quant
        if col is None: self.p = quant.outline(self.p); return self
        h, w = self.h, self.w; src = self.p.copy()
        for y in range(h):
            for x in range(w):
                if src[y, x] < 0: continue
                if y == 0 or x == 0 or y == h - 1 or x == w - 1 or src[y - 1, x] < 0 or src[y + 1, x] < 0 or src[y, x - 1] < 0 or src[y, x + 1] < 0:
                    self.p[y, x] = col
        return self

    def flip(self):
        o = PB(self.w, self.h); o.p = self.p[:, ::-1].copy(); return o

    def save(self, path):
        import quant
        quant.save_indexed(self.p, path)


def rounded_panel(w, h, fill, border=None, r=4):
    """The page's panel(): a rounded box (radius 4 as 2-1-0 corner steps) with an optional 1 px border."""
    pb = PB(w, h)
    def box(x, y, w, h, c):
        pb.rect(x + 2, y, w - 4, h, c); pb.rect(x + 1, y + 1, w - 2, h - 2, c); pb.rect(x, y + 2, w, h - 4, c)
    if border is not None: box(0, 0, w, h, border); box(1, 1, w - 2, h - 2, fill)
    else: box(0, 0, w, h, fill)
    return pb
