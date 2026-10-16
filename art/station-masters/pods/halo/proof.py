"""The halo's round 1 proof: each species mist, 50 percent cross-fade and clear, beside the Loika's pod on the bench at 1x (a tile is the bench cropped to (320,150,800,430)). python3 -I halo/proof.py"""
import os, numpy as np
from PIL import Image
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
S = lambda n: Image.open(f"slices/{n}.png").convert("RGBA")
def mix(a, b, t):
    A = np.asarray(a).astype(float); B = np.asarray(b).astype(float); pa = A[..., :3] * A[..., 3:4] / 255; pb = B[..., :3] * B[..., 3:4] / 255
    al = A[..., 3:4] * (1 - t) + B[..., 3:4] * t; pm = pa * (1 - t) + pb * t; rgb = np.where(al > 0, pm / np.maximum(al / 255, 1e-6), 0)
    return Image.fromarray(np.clip(np.dstack([rgb, al]), 0, 255).astype(np.uint8), "RGBA")
def bench(fig):
    cv = Image.new("RGBA", (1024, 600), (16, 26, 36, 255)); cv.alpha_composite(S("room-bench-stage"), (0, 40)); cv.alpha_composite(S("room-shelf"), (488, 368)); cv.alpha_composite(S("room-cradle"), (520, 328))
    cv.alpha_composite(S("pod-large-shadow"), (552, 385)); cv.alpha_composite(S("pod-large-identified"), (560, 216)); cv.alpha_composite(S("room-cradle-front"), (520, 328)); cv.alpha_composite(fig, (368, 232))
    return cv.crop((320, 150, 800, 430)).convert("RGB")
sp = ["S01", "S09", "S12"]; sheet = Image.new("RGB", (3 * 488, 3 * 288), (10, 14, 20))
for r, s in enumerate(sp):
    m, c = S(f"mibi-halo-{s}-128x160-mist"), S(f"mibi-halo-{s}-128x160-clear")
    for k, fig in enumerate((m, mix(m, c, 0.5), c)): sheet.paste(bench(fig), (k * 488 + 4, r * 288 + 4))
sheet.save("halo/halo-round1-1x.png")
