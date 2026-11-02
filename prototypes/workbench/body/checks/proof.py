"""Proof pictures: the house camera's projection and the little SVG vocabulary a check draws with. A proof is an SVG overlay on the 608 x 624 proxy frame of the check's own mode and angle:
a ringed crop, a labelled chart, the traced contact. Every number on it carries a label (owner ruling, 2 Nov: the bars carry their names). Text is 19 px on the 608 frame, which shows at about 15 px on the hero."""
import html
import math

import numpy as np

W, H, PPH = 608, 624, 190.0           # the proxy frame at 608
BAND = 156                            # a proof picture is the frame with this band under the figure, where its charts sit: nothing covers the mibi
CENTRE = np.array([-0.35, 0.0, 1.3])
RED, INK, SAGE, AMBER, BLUE = "#c93440", "#1f1c29", "#4f7d44", "#d98a1c", "#2c5fa8"


def basis(az, el):
    a, e = math.radians(az), math.radians(el)
    pos_dir = np.array([math.cos(a) * math.cos(e), math.sin(a) * math.cos(e), math.sin(e)])
    fwd = -pos_dir
    up0 = np.array([0, 0, 1.0]) if abs(el) < 80 else np.array([-math.cos(a) * np.sign(el), -math.sin(a) * np.sign(el), 0.0])
    right = np.cross(fwd, up0)
    right /= np.linalg.norm(right)
    return right, np.cross(right, fwd), fwd


def projector(az, el=10.0, w=W, h=H, ppH=PPH):
    """world (n, 3) -> pixel (n, 2) at the house camera of the frame (orthographic, the proxy renderer's own)."""
    right, up, _ = basis(float(az), el)

    def P(X):
        X = np.atleast_2d(np.asarray(X, float)) - CENTRE
        return np.stack([w / 2 + (X @ right) * ppH, h / 2 - (X @ up) * ppH], 1)
    return P


def esc(s):
    return html.escape(str(s))


def ring(x, y, r, color=RED, w=4):
    return f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="{r:.1f}" ry="{r:.1f}" fill="none" stroke="{color}" stroke-width="{w}"/>'


def line(a, b, color=INK, w=3, dash=None):
    d = f' stroke-dasharray="{dash}"' if dash else ""
    return f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}" stroke="{color}" stroke-width="{w}"{d} stroke-linecap="round"/>'


def poly(pts, color=INK, w=3, fill="none", close=False):
    p = " ".join(f"{x:.1f},{y:.1f}" for x, y in pts)
    return f'<{"polygon" if close else "polyline"} points="{p}" fill="{fill}" stroke="{color}" stroke-width="{w}" stroke-linejoin="round"/>'


def dot(x, y, r=6, color=INK):
    return f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r}" fill="{color}" stroke="#fff" stroke-width="2"/>'


def label(x, y, s, color=INK, anchor="start", size=19, bg=True):
    """Text on a pale pill so it reads on grey clay. (x, y) is the left (or middle, or right) of the text's baseline."""
    wd = len(str(s)) * size * 0.56 + 14
    x0 = x if anchor == "start" else (x - wd / 2 if anchor == "middle" else x - wd)
    box = f'<rect x="{x0 - 4:.1f}" y="{y - size:.1f}" width="{wd:.1f}" height="{size + 9}" rx="6" fill="rgba(255,255,255,.92)"/>' if bg else ""
    return f'{box}<text x="{x0 + 3:.1f}" y="{y:.1f}" font-size="{size}" font-weight="500" fill="{color}">{esc(s)}</text>'


def bar(x, y, w, frac, name, value_text, color=INK, limit_frac=None, limit_text=None):
    """A labelled bar on a pale panel: the name on the left of the track, the value after it, and a tick for the limit with its own label."""
    out = [f'<rect x="{x}" y="{y}" width="{w}" height="14" rx="5" fill="#ffffff" stroke="#8a8798" stroke-width="1.5"/>',
           f'<rect x="{x}" y="{y}" width="{max(2.0, min(1.0, frac) * w):.1f}" height="14" rx="5" fill="{color}"/>']
    if limit_frac is not None:
        lx = x + limit_frac * w
        out.append(line((lx, y - 7), (lx, y + 21), INK, 3))
        out.append(label(lx, y + 40, limit_text or "limit", INK, "middle"))
    out.append(label(x, y - 10, f"{name}  {value_text}", INK))
    return "".join(out)


def panel(x, y, w, h):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="12" fill="rgba(255,255,255,.88)" stroke="#bdb6a6" stroke-width="1.5"/>'


def box(x0, y0, x1, y1, color=RED, w=4, pad=14):
    """A rounded ring around a crop, clamped inside the frame."""
    x0, y0, x1, y1 = max(8, x0 - pad), max(8, y0 - pad), min(W - 8, x1 + pad), min(H - 8, y1 + pad)
    return f'<rect x="{x0:.1f}" y="{y0:.1f}" width="{x1 - x0:.1f}" height="{y1 - y0:.1f}" rx="26" fill="none" stroke="{color}" stroke-width="{w}"/>'


def svg(inner, w=W, h=H + BAND):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" font-family="Inter, system-ui, Helvetica, Arial, sans-serif">{inner}</svg>'


def raster(Pxy, F, w, h):
    """Filled mask of quads projected to pixels (w, h): each quad as two triangles, an edge-function test over the triangle's bounding box. For silhouette areas without a renderer."""
    mask = np.zeros((h, w), bool)
    for q in F:
        for tri in ((q[0], q[1], q[2]), (q[0], q[2], q[3])):
            a, b, c = Pxy[tri[0]], Pxy[tri[1]], Pxy[tri[2]]
            x0, x1 = int(max(0, math.floor(min(a[0], b[0], c[0])))), int(min(w - 1, math.ceil(max(a[0], b[0], c[0]))))
            y0, y1 = int(max(0, math.floor(min(a[1], b[1], c[1])))), int(min(h - 1, math.ceil(max(a[1], b[1], c[1]))))
            if x1 < x0 or y1 < y0:
                continue
            xs, ys = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
            d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
            if abs(d) < 1e-12:
                continue
            l1 = ((b[1] - c[1]) * (xs - c[0]) + (c[0] - b[0]) * (ys - c[1])) / d
            l2 = ((c[1] - a[1]) * (xs - c[0]) + (a[0] - c[0]) * (ys - c[1])) / d
            inside = (l1 >= -1e-9) & (l2 >= -1e-9) & (1 - l1 - l2 >= -1e-9)
            mask[y0:y1 + 1, x0:x1 + 1] |= inside
    return mask
