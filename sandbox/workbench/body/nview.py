"""The Normal view, drawn in numpy (no Blender): orthographic, view-space smooth vertex normals as colour (0.5 + 0.5 n, x right, y up, z toward the viewer, the same as three.js's MeshNormalMaterial that the owner reads in the viewer's Normal mode),
a z-buffer, optional cage-wire and crease overlay. Camera conventions follow bpyio.camera (azimuth 0 = the front, +x; 90 = the creature's left, +y; elevation up)."""
import math
import numpy as np
import s20normals as NM


def basis(az, el):
    a, e = math.radians(az), math.radians(el)
    pos_dir = np.array([math.cos(a) * math.cos(e), math.sin(a) * math.cos(e), math.sin(e)])
    fwd = -pos_dir
    up0 = np.array([0, 0, 1.0]) if abs(el) < 80 else np.array([-math.cos(a) * np.sign(el), -math.sin(a) * np.sign(el), 0.0])
    right = np.cross(fwd, up0); right /= np.linalg.norm(right)
    up = np.cross(right, fwd)
    return right, up, fwd


def render(V, F, vn=None, az=0.0, el=10.0, centre=(0, 0, 1), ppH=100.0, w=400, h=400, bg=(236, 233, 226), tris=None):
    """Returns (rgb uint8 (h,w,3), depth (h,w), px (n,2) screen positions, vdepth (n,)). F are quads."""
    V = np.asarray(V, float)
    F = np.asarray(F, int)
    if vn is None:
        vn = NM.vertex_normals(V, F)
    right, up, fwd = basis(az, el)
    d = V - np.asarray(centre, float)
    sx = (d @ right) * ppH + w / 2.0
    sy = h / 2.0 - (d @ up) * ppH
    dep = d @ fwd
    nv = np.stack([vn @ right, vn @ up, -(vn @ fwd)], 1)
    col = np.clip(0.5 + 0.5 * nv, 0, 1)
    T = np.concatenate([F[:, [0, 1, 2]], F[:, [0, 2, 3]]])
    img = np.tile(np.array(bg, float), (h, w, 1))
    zb = np.full((h, w), 1e9)
    for t in T:
        a, b_, c = t
        x0, x1 = min(sx[a], sx[b_], sx[c]), max(sx[a], sx[b_], sx[c])
        y0, y1 = min(sy[a], sy[b_], sy[c]), max(sy[a], sy[b_], sy[c])
        ix0, ix1 = max(int(math.floor(x0)), 0), min(int(math.ceil(x1)), w - 1)
        iy0, iy1 = max(int(math.floor(y0)), 0), min(int(math.ceil(y1)), h - 1)
        if ix0 > ix1 or iy0 > iy1:
            continue
        den = (sy[b_] - sy[c]) * (sx[a] - sx[c]) + (sx[c] - sx[b_]) * (sy[a] - sy[c])
        if abs(den) < 1e-12:
            continue
        X, Y = np.meshgrid(np.arange(ix0, ix1 + 1) + 0.5, np.arange(iy0, iy1 + 1) + 0.5)
        l1 = ((sy[b_] - sy[c]) * (X - sx[c]) + (sx[c] - sx[b_]) * (Y - sy[c])) / den
        l2 = ((sy[c] - sy[a]) * (X - sx[c]) + (sx[a] - sx[c]) * (Y - sy[c])) / den
        l3 = 1 - l1 - l2
        m = (l1 >= -1e-6) & (l2 >= -1e-6) & (l3 >= -1e-6)
        if not m.any():
            continue
        z = l1 * dep[a] + l2 * dep[b_] + l3 * dep[c]
        sub = zb[iy0:iy1 + 1, ix0:ix1 + 1]
        upd = m & (z < sub)
        if not upd.any():
            continue
        cc = l1[..., None] * col[a] + l2[..., None] * col[b_] + l3[..., None] * col[c]
        n = np.linalg.norm(cc * 2 - 1, axis=2, keepdims=True)
        sub[upd] = z[upd]
        img[iy0:iy1 + 1, ix0:ix1 + 1][upd] = cc[upd] * 255.0
        zb[iy0:iy1 + 1, ix0:ix1 + 1] = sub
    return np.clip(img, 0, 255).astype(np.uint8), zb, np.stack([sx, sy], 1), dep


def overlay_wire(img, zb, px, dep, E, color=(20, 60, 160), alpha=0.8, tol=0.02):
    """Draw the edges E (pairs of vertex indices) into img, only where the line is not hidden by the z-buffer (depth within `tol` of the buffer)."""
    h, w, _ = img.shape
    out = img.astype(np.float32)
    for a, b in E:
        p0, p1 = px[a], px[b]
        n = int(max(abs(p1[0] - p0[0]), abs(p1[1] - p0[1])) * 1.5) + 2
        t = np.linspace(0, 1, n)
        x = p0[0] + (p1[0] - p0[0]) * t
        y = p0[1] + (p1[1] - p0[1]) * t
        z = dep[a] + (dep[b] - dep[a]) * t
        xi, yi = np.floor(x).astype(int), np.floor(y).astype(int)
        ok = (xi >= 0) & (xi < w) & (yi >= 0) & (yi < h)
        xi, yi, z = xi[ok], yi[ok], z[ok]
        vis = z <= zb[yi, xi] + tol
        out[yi[vis], xi[vis]] = out[yi[vis], xi[vis]] * (1 - alpha) + np.array(color, np.float32) * alpha
    return out.astype(np.uint8)


def edges_of(F):
    E, _, _ = NM.edges(F)
    return E


def render_cage(Vcage, Fcage, V, F, vn, **kw):
    """Normal view of the level mesh with the CAGE's edges drawn over it (Vcage must live in the same positions as the cage: the caller passes the cage's own vertices)."""
    img, zb, px, dep = render(V, F, vn, **kw)
    return img


def montage(imgs, cols=3, pad=4, bg=(255, 255, 255)):
    h, w, _ = imgs[0].shape
    rows = (len(imgs) + cols - 1) // cols
    out = np.full((rows * (h + pad) + pad, cols * (w + pad) + pad, 3), bg, np.uint8)
    for i, im in enumerate(imgs):
        r, c = divmod(i, cols)
        out[pad + r * (h + pad): pad + r * (h + pad) + h, pad + c * (w + pad): pad + c * (w + pad) + w] = im
    return out
