"""The AD's gate renders (body-spec s6): the rest cage at the master's 3/4 camera, clay with alpha, at 304 / 96 / 48 (ppH 95 / 30 / 15, framed to the master's feet row), the underside and leg runs at y 275
(measure.py's rows, read on the alpha), the front view. Under the bpy venv."""
import os, sys, math
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import bpyio as B
import views
MASTER = "/home/mb/mb/mp/art/station-masters/pods/adult/mibi-adult-S01-%s.png"
SIZES = {304: (304, 312, 95.0), 96: (96, 88, 30.0), 48: (48, 48, 15.0)}


def load_rgba(p):
    im = bpy.data.images.load(p)
    a = np.array(im.pixels[:], np.float32).reshape(im.size[1], im.size[0], 4)[::-1]
    bpy.data.images.remove(im)
    return a


def render_rgba(M, path, az, el, w, h, centre, ppH, samples=24, color=(0.55, 0.52, 0.50)):
    sc = B.reset()
    sc.render.film_transparent = True
    sc.render.image_settings.color_mode = "RGBA"
    sc.cycles.samples = samples
    B.make_mesh("body", M["V"], M["F"], color=color)
    B.lights(sc, az)
    cam = B.camera(sc, az, el, w, h, centre, ppH=ppH)
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    return load_rgba(path), cam


def bbox(alpha, thr=0.5):
    ys, xs = np.where(alpha > thr)
    return xs.min(), xs.max(), ys.min(), ys.max()


def stand_view(b, outdir, tag, level=2, az=57.5, el=8.0, align_to_master=True, mesh=None):
    """Renders the 3 sizes. The camera centre puts the creature's lowest pixel row and its left edge where the master's are (the master is perspective, we are orthographic: rows differ a little)."""
    M = mesh if mesh is not None else views.level_mesh(b, level)
    out = {}
    for size, (w, h, ppH) in SIZES.items():
        m = load_rgba(MASTER % {304: "304x312", 96: "96x88", 48: "48x48"}[size])
        mb = bbox(m[..., 3])
        c0 = np.array([-0.45, 0.0, 1.1])
        a, cam = render_rgba(M, os.path.join(outdir, f"{tag}-{size}.png"), az, el, w, h, c0, ppH, samples=16)
        xb = bbox(a[..., 3])
        if align_to_master:
            # shift the camera centre in screen px: right = +x on screen
            dx = (mb[0] - xb[0]) if size == 304 else (mb[0] - xb[0])
            dy = (mb[3] - xb[3])
            c1 = c0 - cam["right"] * dx / ppH + cam["up"] * dy / ppH * 1.0
            # the pixel shift moves the image by (dx, dy): the camera moves the other way
            c1 = c0 - cam["right"] * dx / ppH + cam["up"] * dy / ppH
            a, cam = render_rgba(M, os.path.join(outdir, f"{tag}-{size}.png"), az, el, w, h, c1, ppH, samples=48 if size == 304 else 64)
        out[size] = dict(path=os.path.join(outdir, f"{tag}-{size}.png"), alpha=a[..., 3], rgb=a[..., :3], master_alpha=m[..., 3])
    return out


def runs(mask_row):
    r, start = [], None
    for i, v in enumerate(mask_row):
        if v and start is None:
            start = i
        if not v and start is not None:
            r.append((start, i - 1)); start = None
    if start is not None:
        r.append((start, len(mask_row) - 1))
    return r


def underside(alpha, x0=100, x1=260):
    """For each column in [x0, x1] the lowest opaque row (the underside profile)."""
    op = alpha > 0.5
    return {x: (int(np.where(op[:, x])[0].max()) if op[:, x].any() else None) for x in range(x0, x1, 10)}


def leg_runs_275(alpha, y=275):
    return runs(alpha[y] > 0.5)
