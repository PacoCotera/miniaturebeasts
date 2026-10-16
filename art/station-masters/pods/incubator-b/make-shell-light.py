"""T-20261016-27 (Incubator option B; specs/station-incubator-tabs-ruling.md §4, §8): the shell light overlays at the Incubator's pod size,
224 x 272: incubator-shell-cool, -warm, -glowing, -seams, -crack-1, -crack-2. By hand in code, no paid call. Placed over the shell 1:1,
never tinted; the build places one step at a time (cool f < 1/3, warm < 2/3, glowing; ready = glowing + seams; hatch 600 crack-1, 800 crack-2).
They work on every species' shell: the pod renderer draws every species from one set of layers per size class, so all shells of a class
share one silhouette and one set of seams. The overlays are cut from that silhouette:
- the shell (mask-body + mask-accent) and its seams (where the straps and the cap meet the panels: the 1.6 px line where the two masks meet) of the
  class given (default: large, 144 x 176), redrawn at 224 x 272 as smooth curves (the alpha bicubic on an 8x grid, thresholded, box-reduced),
  never scaled pixels. Re-run this on the class the build finally uses at 224 x 272 (no class at that size exists today: see the result).
- the light: the candling lens under the nest, below the shell's foot. Each step is that light seen through the shell: strongest at the foot
  and the centre line, falling off upward and toward the sides, inside the shell only. cool: a pale cool white, <= 14 %; warm: amber, <= 30 %;
  glowing: amber, <= 48 %, a brighter core low in the shell.
- seams: the light breaking through the gaps, a warm cream line with a 1 px glow on the shell beside it (ready).
- crack-1: broken stretches of the upper seams opened (a dark fissure, its lower lip lit by the light inside); crack-2: longer stretches down
  the seams, wider. Never a whole seam: no outline (the style has no ink outlines).
usage: python3 -I make-shell-light.py SLICES_DIR OUT_DIR [class]"""
import sys, os, numpy as np
from PIL import Image
from scipy import ndimage as nd
sl, out = sys.argv[1:3]; cls = sys.argv[3] if len(sys.argv) > 3 else "large"
W, H, S = 224, 272, 8
def lin(c): c = np.asarray(c, float) / 255; return np.where(c <= .04045, c / 12.92, ((c + .055) / 1.055) ** 2.4)
def srgb(l): l = np.clip(l, 0, 1); return np.where(l <= .0031308, l * 12.92, 1.055 * l ** (1 / 2.4) - .055) * 255
al = lambda n: np.asarray(Image.open(f"{sl}/pod-{cls}-{n}.png").convert("RGBA"))[..., 3].astype(float) / 255
body, acc, full = al("mask-body"), al("mask-accent"), al("identified")
h0, w0 = full.shape
yy, xx = (np.mgrid[0:H * S, 0:W * S] + .5) / S
sy, sx = yy / H * h0 - .5, xx / W * w0 - .5
up = lambda a: nd.map_coordinates(nd.gaussian_filter(a, 0.35), [sy, sx], order=3, mode="constant")
shell = up(full) > 0.5
B, A_ = up(body) > 0.5, up(acc) > 0.5
gap = shell & nd.binary_dilation(B, iterations=int(0.8 * S)) & nd.binary_dilation(A_, iterations=int(0.8 * S))   # the seams: where the straps and cap meet the panels, a 1.6 px line
dn = lambda img: img.reshape(H, S, W, S, *img.shape[2:]).mean((1, 3))
shell1 = dn(shell.astype(np.float32))
# the light from below the foot: a source at (112, 300) (the lens, under the nest), seen through the shell
ys, xs = np.nonzero(shell); foot = ys.max() / S
d = np.hypot((xx - W / 2) / 1.25, (yy - (foot + 28)))
side = np.exp(-((xx - W / 2) / (W * 0.42)) ** 2)
def light(reach, core):
    f = np.exp(-np.clip(d - 28, 0, None) / reach) * side
    if core: f = f + 0.6 * np.exp(-(((xx - W / 2) / 40) ** 2 + ((yy - (foot - 70)) / 46) ** 2))
    return np.clip(f, 0, 1)
def overlay(colour, amax, f, mask):
    a = dn((f * mask).astype(np.float32)) * amax
    img = np.zeros((H, W, 4)); img[..., :3] = np.array(colour, float); img[..., 3] = a * 255; img[img[..., 3] <= 0] = 0
    return np.clip(np.rint(img), 0, 255).astype(np.uint8)
res = {
    "incubator-shell-cool": overlay([226, 232, 236], 0.14, light(70, False), shell),
    "incubator-shell-warm": overlay([255, 205, 128], 0.30, light(110, False), shell),
    "incubator-shell-glowing": overlay([255, 196, 110], 0.48, light(170, True), shell),
}
# the seams lit: the gap line itself, and a 1 px glow on the shell beside it
gl = nd.binary_dilation(gap, iterations=S) & shell & ~gap
sa = dn(gap.astype(np.float32)) * 0.92 + dn(gl.astype(np.float32)) * 0.35
seam = np.zeros((H, W, 4)); seam[..., :3] = [255, 222, 160]; seam[..., 3] = np.clip(sa, 0, 1) * 255; seam[seam[..., 3] <= 0] = 0
res["incubator-shell-seams"] = np.clip(np.rint(seam), 0, 255).astype(np.uint8)
# the cracks: a seam opened into a fissure: its core dark, its lower lip lit by the light inside
rngc = np.random.default_rng(600)
stretch = nd.gaussian_filter(rngc.normal(0, 1, (H * S, W * S)), 7 * S); stretch = (stretch - stretch.mean()) / stretch.std()
def crack(region, width, keep):
    g = gap & region & (stretch > np.quantile(stretch, 1 - keep))           # broken stretches of the seam, never a whole outline
    g = nd.binary_erosion(g, iterations=int(0.4 * S)) | (g & nd.binary_erosion(gap, iterations=int(0.6 * S)))
    core = nd.binary_dilation(g, iterations=int(width * S / 2)) & shell
    lip = nd.binary_dilation(core, iterations=S) & ~core & shell & (np.roll(core, -S, 0) | np.roll(core, -S, 1))   # the lip below and right
    c = np.zeros((H * S, W * S, 3)); A = np.zeros((H * S, W * S))
    c[core] = [34, 22, 14]; A[core] = 1.0
    c[lip] = [255, 214, 150]; A[lip] = 0.75
    a1 = dn(A); c1 = dn(c * A[..., None]) / np.maximum(a1, 1e-6)[..., None]
    img = np.dstack([c1, a1 * 255]); img[a1 <= 0] = 0
    return np.clip(np.rint(img), 0, 255).astype(np.uint8)
res["incubator-shell-crack-1"] = crack(yy < foot * 0.45, 0.8, 0.45)
res["incubator-shell-crack-2"] = crack(yy < foot * 0.85, 1.3, 0.62)
for n, im in res.items():
    Image.fromarray(im, "RGBA").save(os.path.join(out, n + ".png")); print(n, "max alpha", int(im[..., 3].max()), "px", int((im[..., 3] > 0).sum()))
Image.fromarray((shell1 * 255).astype(np.uint8)).save(os.path.join(out, "incubator-shell-mask-224x272.png"))   # the silhouette the overlays were cut from (a working file)
print("shell ink", shell1.sum().round(), "seam px", int(dn(gap.astype(np.float32)).sum()))
