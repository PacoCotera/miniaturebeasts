"""S20 pictures: the 10-angle turnaround (clay + wire) for a Body or for a plain mesh, and quick single views for the builder. Under the bpy venv."""
import os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import views, subdiv as SD

CENTRE = (0.0, 0.0, 1.1)
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


def _box(p0, p1, w, h=None):
    """A thin box (V, F quads) along p0 -> p1 of width w (horizontal) and thickness h (vertical)."""
    p0, p1 = np.asarray(p0, float), np.asarray(p1, float)
    d = p1 - p0
    d /= np.linalg.norm(d)
    side = np.cross(d, [0, 0, 1.0])
    if np.linalg.norm(side) < 1e-6:
        side = np.array([1.0, 0, 0])
    side /= np.linalg.norm(side)
    up = np.cross(side, d)
    h = w if h is None else h
    V = []
    for p in (p0, p1):
        for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
            V.append(p + sx * side * w / 2 + sy * up * h / 2)
    F = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    return np.array(V), F


def _join(parts):
    V, F, o = [], [], 0
    for v, f in parts:
        V.append(v)
        F += [tuple(i + o for i in q) for q in f]
        o += len(v)
    return np.vstack(V), F


def balance_marker(bal, z0=0.012):
    """Ground marker of the balance rule: (red) the centre of mass's ground projection as a disc and its vertical line up to the centre; (blue) the support polygon of the soles and the 15 % line at heel + 0.15 sole length."""
    com, H = bal["com"], bal["hull"]
    red, blue = [], []
    c = np.array([com[0], com[1], z0])
    r = 0.05
    ring = [c + [r * np.cos(t), r * np.sin(t), 0] for t in np.linspace(0, 2 * np.pi, 17)[:-1]]
    top = [p + [0, 0, 0.012] for p in ring]
    for k in range(16):
        k2 = (k + 1) % 16
        red.append((np.array([c, ring[k], ring[k2], c + [0, 0, 0.0]]), [(0, 1, 2, 3)]))
    red = [_box(c - [0, 0, 0.0], [com[0], com[1], com[2]], 0.012)]
    red.append(_box([com[0] - 0.07, com[1], z0], [com[0] + 0.07, com[1], z0], 0.035, 0.014))
    red.append(_box([com[0], com[1] - 0.07, z0], [com[0], com[1] + 0.07, z0], 0.035, 0.014))
    red.append(_box([com[0], com[1], com[2] - 0.04], [com[0], com[1], com[2] + 0.04], 0.05))
    n = len(H)
    for i in range(n):
        a, b2 = H[i], H[(i + 1) % n]
        blue.append(_box([a[0], a[1], z0], [b2[0], b2[1], z0], 0.024, 0.014))
    x15 = bal["heel_x"] + 0.15 * bal["sole_len"]
    blue.append(_box([x15, -0.85, z0], [x15, 0.85, z0], 0.012, 0.012))
    return _join(red), _join(blue)


def balance_views(body, bal, outdir, mesh, tag="bal-", width=620, height=420):
    """Ghosted clay side view (az 90) and top view (el 89) with the balance ground marker."""
    import bpy, bpyio as B
    os.makedirs(outdir, exist_ok=True)
    red, blue = balance_marker(bal)
    out = {}
    for name, az, el, centre, pph in (("side", 90.0, 0.0, (-0.1, 0, 1.05), 118.0), ("top", 0.0, 89.0, (-0.2, 0, 0.0), 160.0)):
        sc = B.reset()
        sc.cycles.samples = 128
        ob = B.make_mesh("body", mesh["V"], mesh["F"], color=(0.55, 0.52, 0.50))
        bsdf = ob.data.materials[0].node_tree.nodes["Principled BSDF"]
        bsdf.inputs["Alpha"].default_value = 0.45
        B.make_mesh("com", *red, color=(0.85, 0.08, 0.05), roughness=0.5)
        B.make_mesh("poly", *blue, color=(0.05, 0.25, 0.85), roughness=0.5)
        for o in ("com", "poly"):
            bpy.data.objects[o].data.materials[0].node_tree.nodes["Principled BSDF"].inputs["Emission Color"].default_value = (*((0.85, 0.08, 0.05) if o == "com" else (0.05, 0.25, 0.85)), 1)
            bpy.data.objects[o].data.materials[0].node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = 0.6
        B.lights(sc, az)
        B.camera(sc, az, el, width, height, centre, ppH=pph)
        p = os.path.join(outdir, f"{tag}{name}.png")
        a = B.render_to_array(p)
        B.write_png(p, B.to_srgb8(a))
        out[name] = p
    return out
