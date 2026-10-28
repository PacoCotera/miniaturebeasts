"""The curled sleeper's nap master (ad-curl, 2026-10-28): a 304x312 curl key (the stage's own canvas, the creature at its signed stand's scale)
placed in the 96x88 nap frame the way the nap masters are (adult/cut-adults.py, cut-pip.py, juvenile/README.md):
  * one factor per stage from the 304 art: adult x0.276 (the adult family's), juvenile x0.2857 (the placed juvenile naps': S01 54/189, S04 42/147);
  * centred on the figure's own x centre at x 48, its last solid row (alpha >= 200) on row 85 (the frame's "last ink row feet - 3");
  * reduced once with premultiplied Lanczos; alpha below 8 cleared.
The 304 key keeps whatever shadow it has (a species with a layered set carries none: the host lays the stand's curl shadow under it).
usage: python3 -I curlnap.py STAGE IN_304.png OUT_96x88.png [--over LAYER_304.png ...]"""
import sys, numpy as np
from PIL import Image
FACTOR = {"adult": 0.276, "juvenile": 0.2857}
def premul_resize(im, w, h):
    a = np.asarray(im.convert("RGBA")).astype(float); al = a[..., 3:4] / 255
    pm = Image.fromarray(np.dstack([a[..., :3] * al, a[..., 3:]]).clip(0, 255).astype(np.uint8), "RGBA").resize((w, h), Image.LANCZOS)
    p = np.asarray(pm).astype(float); al2 = p[..., 3:4] / 255
    rgb = np.where(al2 > 0, p[..., :3] / np.maximum(al2, 1e-6), 0)
    alpha = np.where(p[..., 3] < 8, 0, p[..., 3])
    return Image.fromarray(np.dstack([rgb.clip(0, 255), alpha]).astype(np.uint8), "RGBA")
def nap(im304, stage, W=96, H=88, feet=85, cx_to=48):
    s = FACTOR[stage]; a = np.asarray(im304)[..., 3]
    solid = a >= 200; ys = np.where(solid.any(1))[0]; xs = np.where(solid.any(0))[0]
    cx, last = (xs.min() + xs.max() + 1) / 2, ys.max()
    small = premul_resize(im304, round(im304.width * s), round(im304.height * s))
    out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ox, oy = round(cx_to - cx * s), round(feet - (last + 0.5) * s + 0.5)
    out.alpha_composite(small, (ox, oy)) if ox >= 0 and oy >= 0 else out.paste(small, (ox, oy), small)
    b = np.asarray(out)[..., 3]; yy = np.where((b >= 200).any(1))[0]
    if len(yy) and yy.max() != feet:   # whole-pixel nudge so the last solid row is exactly the feet row
        o2 = Image.new("RGBA", (W, H), (0, 0, 0, 0)); o2.paste(out, (0, feet - yy.max())); out = o2
    return out
if __name__ == "__main__":
    stage, src, dst = sys.argv[1:4]; im = Image.open(src).convert("RGBA")
    rest = sys.argv[4:]
    for i, f in enumerate(rest):
        if f == "--over": im.alpha_composite(Image.open(rest[i + 1]).convert("RGBA"))
    n = nap(im, stage); n.save(dst)
    a = np.asarray(n)[..., 3]; ys, xs = np.where(a >= 128)
    print(dst, "ink", [int(xs.min()), int(ys.min()), int(xs.max() - xs.min() + 1), int(ys.max() - ys.min() + 1)], "edge alpha", int(a[0].max()), int(a[-1].max()), int(a[:, 0].max()), int(a[:, -1].max()))
