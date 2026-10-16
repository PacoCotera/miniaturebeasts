"""Pass 99: Home's section column, ten fittings cut from source/raw/home-column-sheet.jpg (one Pro sheet, Station art director's item (b), Oct 10).
Each fitting is found in its grid cell by keying the flat slate ground (soft alpha by colour distance from the ground), trimmed to its box, scaled UNIFORMLY (Lanczos) to fit its slice with 2 px clear, centred on a transparent slice.
python3 -I tools/homecolumn.py -> slices/home-*.png, marks/home-column-proof-1x.png (on the slate of the Station's bays)"""
import os, json, hashlib
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
SRC = "source/raw/home-column-sheet-r2.jpg"; im = Image.open(SRC).convert("RGB"); a = np.asarray(im).astype(float); H, W, _ = a.shape
bg = np.median(np.concatenate([a[:40].reshape(-1, 3), a[-40:].reshape(-1, 3)]), axis=0)
dist = np.sqrt(((a - bg) ** 2).sum(2)); alpha = np.clip((dist - 7) / 26.0, 0, 1)
ITEMS = [("home-bay-shut-176x72", 176, 72), ("home-bay-open-176x72", 176, 72), ("home-well-32x32", 32, 32), ("home-chamber-empty-72x72", 72, 72), ("home-chamber-growing-72x72", 72, 72),
         ("home-chamber-ready-72x72", 72, 72), ("home-cradle-empty-96x72", 96, 72), ("home-cradle-full-96x72", 96, 72), ("home-journal-104x72", 104, 72), ("home-bed-192x56", 192, 56)]
man = json.load(open("slices/manifest.json")); outs = []
def blobs():
    """Connected fittings: the keyed mask on a 4x grid, dilated 1 cell, labelled by flood fill; specks under 40 cells are dropped."""
    from PIL import ImageFilter
    m = Image.fromarray(((alpha > 0.35) * 255).astype(np.uint8)).resize((W // 4, H // 4), Image.BOX).point(lambda v: 255 if v > 40 else 0).filter(ImageFilter.MaxFilter(3)); m = np.asarray(m) > 0
    lab = np.zeros(m.shape, int); n = 0; res = []
    for y, x in zip(*np.where(m)):
        if lab[y, x]: continue
        n += 1; st = [(y, x)]; lab[y, x] = n; cells = []
        while st:
            cy, cx = st.pop(); cells.append((cy, cx))
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = cy + dy, cx + dx
                if 0 <= ny < m.shape[0] and 0 <= nx < m.shape[1] and m[ny, nx] and not lab[ny, nx]: lab[ny, nx] = n; st.append((ny, nx))
        if len(cells) >= 40: res.append(np.array(cells))
    assert len(res) == 10, len(res)
    res.sort(key=lambda c: c[:, 0].mean()); top = sorted(res[:5], key=lambda c: c[:, 1].mean()); bot = sorted(res[5:], key=lambda c: c[:, 1].mean())
    return [(c[:, 1].min() * 4, c[:, 0].min() * 4, (c[:, 1].max() + 1) * 4, (c[:, 0].max() + 1) * 4) for c in top + bot]
BOXES = blobs()
for i, (n, w, h) in enumerate(ITEMS):
    bx = BOXES[i]; sub = alpha[bx[1]:bx[3], bx[0]:bx[2]]; ys, xs = np.where(sub > 0.35); bx = (bx[0] + xs.min(), bx[1] + ys.min(), bx[0] + xs.max() + 1, bx[1] + ys.max() + 1)
    rgba = np.dstack([a, alpha * 255]).clip(0, 255).astype(np.uint8); crop = Image.fromarray(rgba).crop(bx)
    s = min((w - 4) / crop.width, (h - 4) / crop.height); nw, nh = max(1, round(crop.width * s)), max(1, round(crop.height * s))
    pm = crop.copy(); pm = Image.fromarray(np.dstack([np.asarray(pm)[..., :3] * (np.asarray(pm)[..., 3:] / 255.0), np.asarray(pm)[..., 3:]]).astype(np.uint8))  # premultiply for the resize
    sm = np.asarray(pm.resize((nw, nh), Image.LANCZOS)).astype(float); al = sm[..., 3:] / 255.0; col = np.where(al > 0.01, sm[..., :3] / np.maximum(al, 0.01), 0)
    tile = Image.new("RGBA", (w, h), (0, 0, 0, 0)); tile.paste(Image.fromarray(np.dstack([col, sm[..., 3:]]).clip(0, 255).astype(np.uint8)), ((w - nw) // 2, (h - nh) // 2))
    tile.save(f"slices/{n}.png", optimize=True); outs.append((n, tile))
    man[n] = {"size": [w, h], "rect": None, "src": f"{SRC} (gemini-3-pro-image)", "made": f"Home's section column: {n.split('-', 1)[1].rsplit('-', 1)[0].replace('-', ' ')}, cut from one Pro sheet by keying the flat slate ground, trimmed and scaled uniformly (never stretched) to fit {w}x{h}, transparent around it (pass 99, the second sheet)", "sha256": hashlib.sha256(open(f"slices/{n}.png", "rb").read()).hexdigest()}
json.dump(man, open("slices/manifest.json", "w"), indent=1)
sheet = Image.new("RGB", (5 * 216 + 8, 2 * 100 + 8), tuple(int(v) for v in bg))
for i, (n, t) in enumerate(outs): r, c = divmod(i, 5); sheet.paste(t, (4 + c * 216 + (216 - t.width) // 2, 4 + r * 100 + (100 - t.height) // 2), t)
sheet.save("marks/home-column-proof-1x.png"); print([m for m in map(lambda o: o[0], outs)], bg)
