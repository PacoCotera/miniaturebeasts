"""The pond in one or two flat tones (owner, 2026-10-10 20:05: "the water in the pond can be 1-2 colors, no need for so many shades").
Every water pixel of the scene becomes one of two tones by its distance from land: a shallow band (the lighter tone) within SHALLOW px
of a bank, the body (the deeper tone) beyond it. The edge detail stays and is not a shade of the water: the foam line and the light
wet line within 2 px of a bank (the scene's own white and pale pixels there) and the bank shadow. The biome palette keeps, for water,
only these: the two tones, the foam white and the wet line. Rewrites the scene and both screens; prints the water colours left.
usage: python3 -I b1-water.py B1_DIR [SHALLOW]"""
import json, os, sys
import numpy as np
from PIL import Image
d = sys.argv[1]; SHALLOW = int(sys.argv[2]) if len(sys.argv) > 2 else 7
cols = json.load(open(os.path.join(d, "biome-meadow.json")))["colours"]
hx = lambda h: tuple(int(h[k:k + 2], 16) for k in (1, 3, 5))
PAL = np.array([hx(c["hex"]) for c in cols]); mat = np.array([c.get("material", "core") for c in cols])
img = np.asarray(Image.open(os.path.join(d, "scene-1x.png")).convert("RGB")).astype(int)
H, W = img.shape[:2]
idx = ((img.reshape(-1, 1, 3) - PAL[None]) ** 2).sum(-1).argmin(1).reshape(H, W)
r, g, b = img[..., 0], img[..., 1], img[..., 2]
foam = (r > 190) & (g > 200) & (b > 200)                   # the foam and the wet line, near-white
water = ((mat[idx] == "water") | ((b > r + 25) & (b >= g - 10)) | ((g > r + 40) & (b > r + 30))) & ~foam   # the pond, teal and navy alike
def components(m, min_px):
    """keep only connected areas of at least min_px (the pond and its arms, not a dark leaf by a bush)"""
    lab = np.zeros(m.shape, int); keep = np.zeros(m.shape, bool); cur = 0
    for y0, x0 in zip(*np.where(m)):
        if lab[y0, x0]: continue
        cur += 1; st = [(y0, x0)]; lab[y0, x0] = cur; pts = []
        while st:
            y, x = st.pop(); pts.append((y, x))
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                yy, xx = y + dy, x + dx
                if 0 <= yy < m.shape[0] and 0 <= xx < m.shape[1] and m[yy, xx] and not lab[yy, xx]: lab[yy, xx] = cur; st.append((yy, xx))
        if len(pts) >= min_px:
            ys, xs = zip(*pts); keep[list(ys), list(xs)] = True
    return keep
water = components(water, 2000)
def grow(m, n):
    m = m.copy()
    for _ in range(n): m[1:] |= m[:-1]; m[:-1] |= m[1:]; m[:, 1:] |= m[:, :-1]; m[:, :-1] |= m[:, 1:]
    return m
land = ~water & ~foam
near = np.zeros((H, W), int) + 99; cur = land.copy()
for k in range(1, SHALLOW + 1):
    nxt = grow(cur, 1); near[nxt & ~cur] = k; cur = nxt
body_ = water & (near > SHALLOW); shallow = water & (near <= SHALLOW) & (near > 2)
# the two tones: the mean of the scene's own body and shallow pixels, snapped to the biome's water colours
wat = [i for i in range(len(cols)) if mat[i] == "water"] or list(range(len(cols)))
def pick(mask):
    m = img[mask].mean(0); return wat[int(((PAL[wat] - m) ** 2).sum(1).argmin())]
deep_i = pick(body_)
lum = lambda i: 0.2126 * PAL[i][0] + 0.7152 * PAL[i][1] + 0.0722 * PAL[i][2]
lighter = sorted([i for i in wat if lum(i) >= lum(deep_i) + 12], key=lum)
shal_i = lighter[0] if lighter else deep_i                  # the shallow tone: the next water colour a clear step lighter
out = idx.copy(); out[body_] = deep_i; out[shallow] = shal_i
edge = water & (near <= 2)                                  # the 2 px under a bank: keep the scene's own foam/wet/bank pixels
out[edge & ~foam] = shal_i
Image.fromarray(PAL[out].astype(np.uint8)).save(os.path.join(d, "scene-1x.png"))
full = Image.open(os.path.join(d, "scene-1x.png"))
px0, py0 = (W - 450) // 2, H - 532 - 40
for nm, (cx, cy) in {"screen-pond": (px0, py0), "screen-cliffs": (20, 60)}.items():
    cr = full.crop((cx, cy, cx + 450, cy + 532)); cr.save(os.path.join(d, f"{nm}-1x.png")); cr.resize((1350, 1596), Image.NEAREST).save(os.path.join(d, f"{nm}-3x.png"))
used_w = sorted(set(out[water | foam].ravel().tolist()))
print("water tones:", cols[deep_i]["hex"], cols[shal_i]["hex"], "| colours on water and foam:", [cols[i]["hex"] for i in used_w])
