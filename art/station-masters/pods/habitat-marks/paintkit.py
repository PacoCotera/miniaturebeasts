"""A small hand-painting kit for the Station's matte device pieces: height-field primitives (bevelled boxes, true cylinders,
discs, rings, grooves), shaded lambert from the top left at S x and area-reduced, so edges are soft and the light is one house
light. No specular, nothing lit. Used by the Habitat marks (W1, P1, G1) and the hatch plate (H1)."""
import numpy as np
from PIL import Image
from scipy import ndimage as nd

LIGHT = np.array([-0.55, -0.62, 0.78]); LIGHT /= np.linalg.norm(LIGHT)
SAGE = (88, 99, 83); SAGE_L = (112, 124, 104); SAND = (176, 164, 128); SAND_D = (134, 122, 94); BARK = (92, 70, 52)
RUBBER = (58, 56, 56); INK = (30, 30, 34); LEAF = (86, 122, 70); LEAF_D = (58, 88, 52); BONE = (214, 204, 176); GROUND = (29, 35, 43)

def lin(c): c = np.asarray(c, float) / 255; return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def srgb(l): l = np.clip(l, 0, 1); return np.where(l <= 0.0031308, l * 12.92, 1.055 * l ** (1 / 2.4) - 0.055) * 255

class Canvas:
    def __init__(self, w, h, S=8):
        self.w, self.h, self.S = w, h, S
        self.yy, self.xx = (np.mgrid[0:h * S, 0:w * S].astype(np.float32) + .5) / S
        self.hgt = np.zeros((h * S, w * S), np.float32); self.alb = np.zeros((h * S, w * S, 3), np.float32)
        self.cov = np.zeros((h * S, w * S), bool); self.slots = []
    def _put(self, m, h, col):
        self.hgt[m] = h[m] + 1; self.alb[m] = lin(col); self.cov |= m
    def box(self, x, y, w, h, b, col, depth=1.0):
        X, Y = self.xx, self.yy; m = (X >= x) & (X < x + w) & (Y >= y) & (Y < y + h)
        d = np.minimum.reduce([X - x, x + w - X, Y - y, y + h - Y]); t = np.clip(d / b, 0, 1)
        self._put(m, depth * b * np.sin(t * np.pi / 2), col); return m
    def poly(self, pts, b, col, depth=1.0):
        """a convex polygon (clockwise points), bevelled b px"""
        X, Y = self.xx, self.yy; d = np.full(X.shape, 1e9, np.float32)
        n = len(pts)
        for i in range(n):
            (x0, y0), (x1, y1) = pts[i], pts[(i + 1) % n]; ex, ey = x1 - x0, y1 - y0; L = np.hypot(ex, ey)
            d = np.minimum(d, ((X - x0) * ey - (Y - y0) * ex) / L * -1)
        m = d >= 0; t = np.clip(d / b, 0, 1); self._put(m, depth * b * np.sin(t * np.pi / 2), col); return m
    def cyl_v(self, x, y, w, h, col):
        X, Y = self.xx, self.yy; m = (X >= x) & (X < x + w) & (Y >= y) & (Y < y + h); r = w / 2; t = (X - x - r) / r
        self._put(m, np.sqrt(np.clip(1 - t * t, 0, 1)) * r, col); return m
    def cyl_h(self, x, y, w, h, col):
        X, Y = self.xx, self.yy; m = (X >= x) & (X < x + w) & (Y >= y) & (Y < y + h); r = h / 2; t = (Y - y - r) / r
        self._put(m, np.sqrt(np.clip(1 - t * t, 0, 1)) * r, col); return m
    def disc(self, cx, cy, r, col, lift=2):
        d2 = (self.xx - cx) ** 2 + (self.yy - cy) ** 2; m = d2 <= r * r
        self._put(m, np.sqrt(np.clip(1 - d2 / (r * r), 0, 1)) * r + lift, col); return m
    def ellipse(self, cx, cy, rx, ry, col, lift=1):
        d2 = ((self.xx - cx) / rx) ** 2 + ((self.yy - cy) / ry) ** 2; m = d2 <= 1
        self._put(m, np.sqrt(np.clip(1 - d2, 0, 1)) * min(rx, ry) * .8 + lift, col); return m
    def groove(self, x, y, w, h, col=INK, depth=2.0):
        X, Y = self.xx, self.yy; g = (X >= x) & (X < x + w) & (Y >= y) & (Y < y + h) & self.cov
        self.hgt[g] -= depth; self.alb[g] = lin(col)
    def render(self, shadow=(1.5, 2.0), shadow_k=0.0, ground=None, falloff=0.12):
        S = self.S; H, W = self.h, self.w
        gy, gx = np.gradient(nd.gaussian_filter(self.hgt, S * .35)); gx *= S; gy *= S
        n = np.dstack([-gx, -gy, np.ones_like(gx)]); n /= np.linalg.norm(n, axis=2, keepdims=True)
        shade = 0.30 + 0.70 * np.clip(n @ LIGHT, 0, 1) / LIGHT[2]
        shade *= (1 + falloff / 2) - falloff * (self.xx / W * .5 + self.yy / H * .5)
        col = self.alb * shade[..., None]
        dn = lambda a: a.reshape(H, S, W, S, *a.shape[2:]).mean((1, 3))
        cov = dn(self.cov.astype(np.float32)); c1 = dn(col * self.cov[..., None]) / np.maximum(cov[..., None], 1e-6)
        out = np.zeros((H, W, 4)); out[..., :3] = srgb(c1); out[..., 3] = cov * 255
        if ground is not None:                                     # composite over a ground with a soft cast shadow, for proofs
            g = np.empty((H, W, 3)); g[:] = lin(ground)
            sh = nd.gaussian_filter(nd.shift(cov, shadow, order=1), 1.2)
            g = g * (1 - .5 * sh[..., None]); lc = lin(np.clip(out[..., :3], 0, 255))
            out_rgb = srgb(lc * cov[..., None] + g * (1 - cov[..., None]))
            return Image.fromarray(np.round(out_rgb).astype(np.uint8), 'RGB')
        if shadow_k:                                               # bake a soft contact shadow into the slice's own alpha
            sh = nd.gaussian_filter(nd.shift(cov, shadow, order=1), 1.2) * shadow_k
            a_sh = sh * (1 - cov); tot = cov + a_sh
            rgb = (lin(np.clip(out[..., :3], 0, 255)) * cov[..., None]) / np.maximum(tot[..., None], 1e-6)
            out[..., :3] = srgb(rgb); out[..., 3] = np.clip(tot, 0, 1) * 255
        out[..., 3] = np.where(out[..., 3] < 3, 0, out[..., 3]); out[out[..., 3] == 0, :3] = 0
        return Image.fromarray(np.round(out).astype(np.uint8), 'RGBA')
