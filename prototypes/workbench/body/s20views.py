"""S20 pictures: the 10-angle turnaround (clay + wire) for a Body or for a plain mesh, and quick single views for the builder. Under the bpy venv."""
import os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import views, subdiv as SD

CENTRE = (0.0, 0.0, 1.2)
BUILD = "/home/mb/mb/iwq/results/T-20261101-mesh/newspecies/build"


class MeshBody:
    """A stand-in for Body for a plain quad mesh (V, F): full() as render_views wants it."""
    def __init__(self, V, F):
        self.V, self.F = np.asarray(V, float), [tuple(int(i) for i in f) for f in F]

    def full(self):
        return self.V, self.F, np.zeros((len(self.V), 4)), np.zeros(len(self.F), int), {}, np.arange(len(self.V))


def turnaround(body, outdir, tag="", width=380, height=520, pph=170.0, centre=CENTRE, wire=True, mesh=None, pole_dots=False, level=2):
    res = views.render_views(body, outdir, width=width, height=height, pph=pph, centre=centre, wire=wire, tag=tag, mesh=mesh, pole_dots=pole_dots, level=level)
    return [v[0] for v in views.VIEWS]


def quick(body, outdir, tag="q", azs=((0, 10), (90, 10), (45, 15), (0, -89)), **kw):
    vs = [(f"az{a:03d}_{e}", float(a), float(e)) for a, e in azs]
    return views.render_views(body, outdir, views=vs, tag=tag, **{**dict(width=380, height=520, pph=170.0, centre=CENTRE), **kw})


def read_png(path):
    """A small PNG decoder (8-bit RGB / RGBA, all five filters) -> (h, w, 3) uint8; no PIL."""
    import zlib, struct
    d = open(path, "rb").read()
    pos, idat = 8, b""
    while pos < len(d):
        n, t = struct.unpack(">I4s", d[pos:pos + 8])
        if t == b"IHDR":
            w, h, bd, ct = struct.unpack(">IIBB", d[pos + 8:pos + 18])
        elif t == b"IDAT":
            idat += d[pos + 8:pos + 8 + n]
        pos += 12 + n
    ch = {2: 3, 6: 4}[ct]
    raw = np.frombuffer(zlib.decompress(idat), np.uint8).reshape(h, 1 + w * ch)
    out = np.zeros((h, w * ch), np.int32)
    for y in range(h):
        f, row = raw[y, 0], raw[y, 1:].astype(np.int32)
        prev = out[y - 1] if y else np.zeros(w * ch, np.int32)
        if f == 0:
            cur = row
        elif f == 2:
            cur = (row + prev) & 255
        else:
            cur = np.zeros(w * ch, np.int32)
            for x in range(w * ch):
                a = cur[x - ch] if x >= ch else 0
                c = prev[x - ch] if x >= ch else 0
                b = prev[x]
                if f == 1: pr = a
                elif f == 3: pr = (a + b) // 2
                else:
                    pa_, pb_, pc_ = abs(b - c), abs(a - c), abs(a + b - 2 * c)
                    pr = a if (pa_ <= pb_ and pa_ <= pc_) else (b if pb_ <= pc_ else c)
                cur[x] = (row[x] + pr) & 255
        out[y] = cur
    return out.reshape(h, w, ch)[..., :3].astype(np.uint8)


def montage(paths, out, cols=4):
    """Glue PNG files into one PNG (row-major, `cols` wide); for the builder's own review."""
    import bpyio as B
    ims = [read_png(p) for p in paths]
    h = max(i.shape[0] for i in ims); w = max(i.shape[1] for i in ims)
    rows = (len(ims) + cols - 1) // cols
    canvas = np.full((rows * h, cols * w, 3), 255, np.uint8)
    for k, im in enumerate(ims):
        r, c = divmod(k, cols)
        canvas[r * h:r * h + im.shape[0], c * w:c * w + im.shape[1]] = im
    B.write_png(out, canvas)
