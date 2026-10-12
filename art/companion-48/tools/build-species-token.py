"""C0: a species' 32 px Companion token and 12 px mini on the core 48, from its signed juvenile stand-in (the Station's canon), in place of
the page's code-drawn creature (index.html buildCreature, i-mini). The idle is the stand reduced once by area into the token's box
(feet on row 30, centred, facing the page's way), snapped to the core 48 by the page's 3/4/2 nearest colour among the species' own
ramps, then given the palette's outline rule (1 px in DARK of the part's own colour, one step lighter on the lit top-left side).
The other poses are made from the idle by rule and then hand-cleaned; this writes the idle and the mini, the base for them.
usage: python3 -I build-species-token.py STAND_PNG SPECIES OUT_DIR [--flip]"""
import sys, os, numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pal
P = pal.load()
src, sp, out = sys.argv[1:4]; flip = "--flip" in sys.argv; os.makedirs(out, exist_ok=True)
a = Image.open(src).convert("RGBA"); arr = np.asarray(a); body = arr[..., 3] == 255
ys, xs = np.where(body); crop = a.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
if flip: crop = crop.transpose(Image.FLIP_LEFT_RIGHT)
RAMPS = {"body": ["ink", "night", "slate", "stone"], "cream": ["clay", "sand", "paper", "bone"], "leaf": ["pine", "forest", "leaf", "grass"], "amber": ["rust", "orange", "amber"]}
def token(W, H, feet, maxw, maxh, outline=True):
    sc = min(maxw / crop.width, maxh / crop.height); w, h = max(1, round(crop.width * sc)), max(1, round(crop.height * sc))
    pm = np.asarray(crop).astype(float); pm[..., :3] *= pm[..., 3:] / 255.0
    r = np.asarray(Image.fromarray(pm.astype(np.uint8), "RGBA").resize((w, h), Image.BOX)).astype(float)
    al = r[..., 3]; rgb = np.where(al[..., None] > 0, r[..., :3] * 255.0 / np.maximum(al[..., None], 1), 0)
    keep = al >= 128
    idx = np.full((h, w), -1); flat = rgb[keep].astype(float)
    # each part onto its own ramp of the core 48, by luminance (a plain nearest colour turns charcoal plum and leaves brown)
    import colorsys
    hsv = np.array([colorsys.rgb_to_hsv(*(c / 255)) for c in flat]); L = flat @ [.2126, .7152, .0722]
    RAMPS = {"body": ["ink", "night", "slate", "stone"], "cream": ["clay", "sand", "paper", "bone"], "leaf": ["pine", "forest", "leaf", "grass"], "amber": ["rust", "orange", "amber"]}
    part = np.where((hsv[:, 0] > .15) & (hsv[:, 0] < .45) & (hsv[:, 1] > .3), "leaf", np.where((hsv[:, 0] < .12) & (hsv[:, 1] > .45) & (L > 60), "amber", np.where(L > 120, "cream", "body")))
    out = []
    for c, pt, l in zip(flat, part, L):
        r = [P.index[n] for n in RAMPS[pt]]; rl = np.array([P.rgb[i] @ [.2126, .7152, .0722] for i in r]); out.append(r[int(np.argmin(np.abs(rl - l)))])
    idx[keep] = out
    c = np.full((H, W), -1); x0 = (W - w) // 2; y0 = feet + 1 - h; c[y0:y0 + h, x0:x0 + w] = idx
    # the eye, placed from the stand's own eye (the eye white's centre), which a reduction loses: a dark 2x2 (1x1 under 16 px) with a
    # bone catch-light on its upper-front pixel
    cr = np.asarray(crop).astype(float); f_ = cr[..., :3] / 255; mx, mn = f_.max(-1), f_.min(-1); sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    white = (cr[..., 3] == 255) & (sat < .12) & (f_ @ [.2126, .7152, .0722] > .86)
    from scipy import ndimage as nd_
    lab, n = nd_.label(white)
    if n:
        sizes = nd_.sum(white, lab, range(1, n + 1)); comps = [i + 1 for i in np.argsort(-sizes)[:2]]
        for ci in comps[:1] if W < 16 else comps:
            ey, ex = [v.mean() for v in np.where(lab == ci)]; Y, X = y0 + int(ey * sc), x0 + int(ex * sc)
            if W < 16: c[Y, X] = P.index["ink"]
            else:
                for dy in (0, 1):
                    for dx in (0, 1): c[min(H - 1, Y + dy), min(W - 1, X + dx)] = P.index["ink"]
                c[Y, X + (1 if flip else 0)] = P.index["bone"]
    if outline:                                                          # the palette's outline rule, on the transparent side of each edge pixel
        o = c.copy(); dark = np.array(P.dark)
        for y in range(H):
            for x in range(W):
                if c[y, x] >= 0: continue
                nb = [(y + dy, x + dx) for dy, dx in ((0, 1), (1, 0), (0, -1), (-1, 0)) if 0 <= y + dy < H and 0 <= x + dx < W and c[y + dy, x + dx] >= 0]
                if nb:
                    yy, xx = nb[0]; v = c[yy, xx]; ramp = next((rr for rr in ([P.index[n] for n in x_] for x_ in RAMPS.values()) if v in rr), None)
                    o[y, x] = P.index["ink"] if (ramp is None or ramp[0] != P.index["pine"]) else ramp[0]   # one dark line round the whole silhouette (ink; the crest in pine), never void
        c = o
    return c
def save(c, name, scale=1):
    rgba = np.zeros(c.shape + (4,), np.uint8); m = c >= 0; rgba[m, :3] = P.rgb[c[m]]; rgba[m, 3] = 255
    im = Image.fromarray(rgba, "RGBA"); im.save(os.path.join(out, name + ".png"))
    im.resize((im.width * 8, im.height * 8), Image.NEAREST).save(os.path.join(out, name + "-8x.png"))
save(token(32, 32, 30, 28, 28), f"c-token-{sp}-idle-32x32")
save(token(12, 12, 11, 11, 10), f"c-mini-{sp}-12x12")
print("ok")
