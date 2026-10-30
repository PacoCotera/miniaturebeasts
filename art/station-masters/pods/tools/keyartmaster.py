"""The website's KEY ART master: the loop as one painting, field -> dock -> home (concept art).
The painted raw source/raw/key-art/loop-f.jpg (keyartjobs.py; gen.py) came back as three views side by side; this joins them into one picture, with no paid call:
a multi-band blend over each of the two seams (each view mirrored past its edge, fine detail joined over 24 px, light and colour over up to 900 px),
then a soft wispy band of morning mist over the first seam, the fog drifting in over the doorstep.
usage: python3 -I tools/keyartmaster.py source/raw/key-art/loop-f.jpg source/work/key-art/key-art-loop-master.png"""
import sys, numpy as np
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
im = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
H, W, _ = im.shape
seams = [918, 1834]
def panel(i):
    xs = [0] + seams + [W]; return xs[i], xs[i+1]
def extend(i):
    """the panel extended over the whole width by mirroring at its edges"""
    a, b = panel(i); p = im[:, a:b]; full = np.zeros_like(im)
    full[:, a:b] = p
    for x in range(b, W): full[:, x] = p[:, max(0, (b - a) - 1 - (x - b))]
    for x in range(0, a): full[:, x] = p[:, min(b - a - 1, (a - 1 - x))]
    return full
# simple multi-band: blur-difference bands with growing blend widths
def blur(a, r):
    from scipy.ndimage import gaussian_filter
    return gaussian_filter(a, sigma=(r, r, 0), mode="nearest")
radii = [0, 4, 16, 64, 200]
exts = [extend(i) for i in range(3)]
def masks(width):
    x = np.arange(W)[None, :].repeat(H, 0).astype(np.float32); ms = []
    t1 = np.clip((x - (seams[0] - width/2)) / width, 0, 1); t2 = np.clip((x - (seams[1] - width/2)) / width, 0, 1)
    return [1 - t1, t1 * (1 - t2), t2]
result = np.zeros_like(im)
for k in range(len(radii)):
    r0 = radii[k]; r1 = radii[k+1] if k + 1 < len(radii) else None
    width = [24, 60, 160, 420, 900][k]
    ms = masks(width)
    for i in range(3):
        lo = blur(exts[i], r0) if r0 else exts[i]
        band = lo - blur(exts[i], r1) if r1 else lo
        result += band * ms[i][..., None]
Image.fromarray(np.clip(result, 0, 255).astype(np.uint8)).save(out, quality=95)
# fog drifting in over the doorstep: a soft, wispy band of morning mist over the first seam
from scipy.ndimage import gaussian_filter
res = np.asarray(Image.open(out)).astype(np.float32)
rng = np.random.default_rng(1029)
noise = gaussian_filter(rng.random((H, W)).astype(np.float32), 40); noise = (noise - noise.min()) / (noise.max() - noise.min())
x = np.arange(W)[None, :]; y = np.arange(H)[:, None]
band = np.exp(-((x - seams[0]) / 95.0) ** 2) * (0.30 + 0.45 * noise) * (0.85 + 0.15 * (1 - y / H))
fog = np.array([232, 236, 234], np.float32)
res = res * (1 - band[..., None]) + fog * band[..., None]
Image.fromarray(np.clip(res, 0, 255).astype(np.uint8)).save(out, quality=95)
