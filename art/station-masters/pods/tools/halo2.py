"""The halo figure, round 2: the light is painted. Each species' silhouette (white on black, source/raw/halo-sil-<S>.png, cut by the tool from the standard painting) went to the image tool
as the reference ("the creature's silhouette as a figure of soft, cool light, lit from the upper left"); its painting (source/raw/halo-<S>-clear.jpg, on black) is keyed out here
(alpha = the brightest channel, colour unpremultiplied), fitted into 112x144 centred in 128x160, brought to the briefed brightness (the peak about 110 grey over black, the figure's mean 45 to 55)
and reduced from 4x with premultiplied alpha. The mist is made from the new clear figure (a diffusion of it) so the two cross-fade cleanly. usage: python3 -I tools/halo2.py"""
import json, os, hashlib, sys
import numpy as np
from PIL import Image, ImageFilter
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
K = 4; W, H = 128 * K, 160 * K; BOX = (112 * K, 144 * K); L3 = np.array([0.299, 0.587, 0.114])
def key(path):
    a = np.asarray(Image.open(path).convert("RGB")).astype(float); A = a.max(2) / 255.0; A = np.clip((A - 0.04) / 0.96, 0, 1)
    C = np.where(A[..., None] > 0.02, a / np.maximum(A[..., None], 0.02), 0); return np.dstack([np.clip(C, 0, 255), A * 255])
def fit(rgba):
    A = rgba[..., 3] > 0.12 * 255; ys, xs = np.where(A); box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1); im = Image.fromarray(np.clip(rgba, 0, 255).astype(np.uint8), "RGBA").crop(box)
    s = min(BOX[0] / im.width, BOX[1] / im.height); im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS); out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    out.paste(im, ((W - im.width) // 2, (H - im.height) // 2)); return np.asarray(out).astype(float)
def grade(rgba, peak=110.0, mean=50.0):
    p = rgba.copy(); a = p[..., 3] / 255.0; luma_full = (p[..., :3] @ L3)
    for gamma in np.linspace(1.0, 16.0, 320):                                            # darken the middle until the figure's mean falls to the brief (a brighter core, a falloff), keeping the peak
        ag = a ** gamma; L = luma_full * ag; g = peak / L.max(); ag2 = np.clip(ag * g, 0, 1); L2 = luma_full * ag2; foot = ag2 > 0.01
        if L2[foot].mean() <= mean: break
    q = p.copy(); q[..., 3] = ag2 * 255; return q
def reduce(rgba):
    p = rgba.copy(); p[..., :3] *= p[..., 3:4] / 255; p = p.reshape(H // K, K, W // K, K, 4).mean((1, 3)); a = p[..., 3:4]
    rgb = np.where(a > 0, p[..., :3] / np.maximum(a / 255, 1e-6), 0); return Image.fromarray(np.clip(np.dstack([rgb, a]), 0, 255).astype(np.uint8), "RGBA")
def mist_of(clear):
    rowmass = clear[..., 3].sum(1); body = np.where(rowmass >= 0.25 * rowmass.max())[0]; fh = (body.max() - body.min() + 1) / K     # the figure's own body height in final px: the rows that carry a quarter of the heaviest row's alpha (tails, antennae and halo left out)
    rad = float(min(6.5, 0.15 * fh))                                                                                      # the blur radius is capped at about 15 percent of that height
    p = clear.copy(); p[..., :3] *= p[..., 3:4] / 255; ch = []
    for c in range(4): ch.append(np.asarray(Image.fromarray(np.clip(p[..., c], 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(rad * K))).astype(float))
    q = np.dstack(ch); a = q[..., 3:4]; rgb = np.where(a > 0, q[..., :3] / np.maximum(a / 255, 1e-6), 0); a = a * (0.42 / max(a.max() / 255, 1e-6)); return np.dstack([rgb, a])
def stats(im):
    a = np.asarray(im).astype(float); L = (a[..., :3] * a[..., 3:4] / 255) @ L3; foot = a[..., 3] > 2; return round(float(L.max()), 1), round(float(L[foot].mean()), 1)
if __name__ == "__main__":
    man = json.load(open("slices/manifest.json"))
    for sp in ("S01", "S09", "S12"):
        clear = grade(fit(key(f"source/raw/halo-{sp}-clear.jpg"))); mist = mist_of(clear)
        for st, arr in (("clear", clear), ("mist", mist)):
            im = reduce(arr); name = f"mibi-halo-{sp}-128x160-{st}"; im.save(f"slices/{name}.png", optimize=True)
            man[name] = {"size": [128, 160], "rect": None, "src": f"halo-{sp}-clear.jpg (the image tool's light figure over the {sp} silhouette)", "made": f"the {sp} halo figure, {st}: " + ("a painted figure of soft cool light, a brighter core in the body's volume falling off into a soft halo, keyed from black and graded to the brief" if st == "clear" else "a diffusion of the clear figure, so the two cross-fade cleanly"), "sha256": hashlib.sha256(open(f"slices/{name}.png", "rb").read()).hexdigest()}
            print(name, "peak grey / mean grey of the figure's pixels:", stats(im))
    json.dump(man, open("slices/manifest.json", "w"), indent=1)
