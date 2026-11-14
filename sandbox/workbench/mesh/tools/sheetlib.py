"""Small helpers for the sheets: HTML pages with real text (DejaVu Sans, >= 14 px), marching-squares contours as SVG, base64 images."""
import base64, os, subprocess
import numpy as np

CSS = """body{font-family:'DejaVu Sans',sans-serif;font-size:15px;color:#222;background:#f4f3f0;margin:18px;line-height:1.35}
h1{font-size:22px;margin:0 0 4px}h2{font-size:17px;margin:14px 0 4px}.sub{color:#555;margin-bottom:10px}
.row{display:flex;flex-wrap:wrap;gap:18px;align-items:flex-start}.cell{background:#fff;border:1px solid #ccc;padding:8px}
.cell img{image-rendering:pixelated;display:block}.cap{font-size:14px;color:#333;margin-top:4px;max-width:620px}
table{border-collapse:collapse;font-size:14px}td,th{border:1px solid #ccc;padding:3px 8px;text-align:left}code{font-family:'DejaVu Sans Mono',monospace;font-size:14px}
.warn{color:#a02020}.ok{color:#1a6a2a}"""


def b64(path):
    with open(path, "rb") as fh:
        return "data:image/png;base64," + base64.b64encode(fh.read()).decode()


def page(title, body, path):
    with open(path, "w") as fh:
        fh.write(f"<!doctype html><html><head><meta charset='utf-8'><title>{title}</title><style>{CSS}</style></head><body>{body}</body></html>")


def shot(html, png, width=1500):
    subprocess.run(["node", os.path.join(os.path.dirname(os.path.abspath(__file__)), "shot.mjs"), html, png, str(width)], check=True)


def contour_segments(f, x0, x1, z0, z1, n=240):
    """Marching squares of f(P) = 0 on a plane grid given as f(X, Z) -> values; returns a list of ((xa, za), (xb, zb)) segments."""
    xs, zs = np.linspace(x0, x1, n), np.linspace(z0, z1, n)
    X, Z = np.meshgrid(xs, zs)
    V = f(X, Z)
    segs = []
    def interp(pa, pb, va, vb):
        t = va / (va - vb)
        return (pa[0] + (pb[0] - pa[0]) * t, pa[1] + (pb[1] - pa[1]) * t)
    for j in range(n - 1):
        for i in range(n - 1):
            c = [(xs[i], zs[j], V[j, i]), (xs[i + 1], zs[j], V[j, i + 1]), (xs[i + 1], zs[j + 1], V[j + 1, i + 1]), (xs[i], zs[j + 1], V[j + 1, i])]
            pts = []
            for a in range(4):
                p, q = c[a], c[(a + 1) % 4]
                if (p[2] < 0) != (q[2] < 0):
                    pts.append(interp(p[:2], q[:2], p[2], q[2]))
            if len(pts) == 2:
                segs.append((pts[0], pts[1]))
            elif len(pts) == 4:
                segs.append((pts[0], pts[1]))
                segs.append((pts[2], pts[3]))
    return segs


def svg_segments(segs, sx, sz, ox, oz, color, width=1.6):
    """Segments to SVG path data (x right, z up): scale and offset to pixels."""
    d = "".join(f"M{ox + a[0] * sx:.1f},{oz - a[1] * sz:.1f}L{ox + b[0] * sx:.1f},{oz - b[1] * sz:.1f}" for a, b in segs)
    return f"<path d='{d}' stroke='{color}' stroke-width='{width}' fill='none'/>"
