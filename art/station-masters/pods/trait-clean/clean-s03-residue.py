"""The AD's S03 residue clean (brief boards/station-s03-residue-brief.md as relayed 10-15 05:02; by hand, 0 MXN): 18 trait plates,
trait-S03-{scales-{between,few-fine,many-coarse},claws-{digging-wedges,pads,round-feet}}-{128x160,104x160,104x96}, each cleaned at its own size
(never one size derived from another).
Scales: a pixel is flagged when its saturation (HSV) is under 0.12 and its luma (Rec.709 on the sRGB values) is 25 or more below the 5x5 median of
the luma; each flagged pixel takes the per-channel median of the unflagged pixels of its 7x7 neighbourhood (widened to 9x9, 11x11 only if it has
fewer than 5). The teal-grey scale outlines (saturated, so never flagged) stay.
Claws: a ring pixel is a pale grey one (saturation under 0.15, luma 140 to 205) with the leg's fur (a pale cool pixel, luma over 205) on one side
and its warm highlight (R - B over 12, luma over 215) on the other, both within 2 px (3 px if need be) of it; it takes the mean of the mean fur
colour and the mean highlight colour of that window (the ring pixels themselves left out). The claws and toe lines (darker, teal) stay. Everything else is untouched.
Writes the cleaned PNGs, the changed-pixel counts (log/clean-s03-residue.json), the manifest rows, and trait-clean/before-after-{4x,1x}.png; the
originals are kept in trait-clean/before/. usage (from art/station-masters/pods): python3 -I trait-clean/clean-s03-residue.py"""
import os, json, hashlib, subprocess
import numpy as np
from PIL import Image
from scipy import ndimage as nd
NAMES = [f"trait-S03-{f}-{k}-{s}" for f, ks in (("scales", ("between", "few-fine", "many-coarse")), ("claws", ("digging-wedges", "pads", "round-feet"))) for k in ks for s in ("128x160", "104x160", "104x96")]
def luma(a): return .2126 * a[..., 0] + .7152 * a[..., 1] + .0722 * a[..., 2]
def sat(a): mx = a.max(-1).astype(float); mn = a.min(-1).astype(float); return np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)
def scales(a):
    L = luma(a.astype(float)); flag = (sat(a) < .12) & (L <= nd.median_filter(L, size=5, mode="reflect") - 25); out = a.copy(); H, W = flag.shape
    for y, x in zip(*np.nonzero(flag)):
        for r in (3, 4, 5):
            y0, y1, x0, x1 = max(0, y - r), min(H, y + r + 1), max(0, x - r), min(W, x + r + 1); ok = ~flag[y0:y1, x0:x1]
            if ok.sum() >= 5: out[y, x] = np.median(a[y0:y1, x0:x1][ok], 0).astype(np.uint8); break
    return out
def claws(a):
    L = luma(a.astype(float)); S = sat(a); H, W = L.shape; out = a.copy()
    fur = (L > 205) & ((a[..., 2].astype(int) - a[..., 0]) >= 0); hi = ((a[..., 0].astype(int) - a[..., 2]) > 12) & (L > 215)
    cand = (S < .15) & (L >= 140) & (L <= 205)
    for y, x in zip(*np.nonzero(cand)):
        for r in (2, 3):                                               # the leg's fur on one side, its highlight on the other, in the window round the ring pixel
            y0, y1, x0, x1 = max(0, y - r), min(H, y + r + 1), max(0, x - r), min(W, x + r + 1); f = fur[y0:y1, x0:x1] & ~cand[y0:y1, x0:x1]; h = hi[y0:y1, x0:x1] & ~cand[y0:y1, x0:x1]
            if f.any() and h.any(): out[y, x] = np.round((a[y0:y1, x0:x1][f].mean(0) + a[y0:y1, x0:x1][h].mean(0)) / 2).astype(np.uint8); break
    return out
if __name__ == "__main__":
    os.makedirs("trait-clean/before", exist_ok=True); man = json.load(open("slices/manifest.json")); counts = {}; sheet4 = []; sheet1 = []
    for n in NAMES:
        bp = f"trait-clean/before/{n}.png"
        if not os.path.exists(bp): open(bp, "wb").write(subprocess.run(["git", "show", f"HEAD:art/station-masters/pods/slices/{n}.png"], capture_output=True, check=True).stdout)
        a = np.array(Image.open(bp).convert("RGB")); b = (scales if "scales" in n else claws)(a); ch = (a != b).any(-1); counts[n] = int(ch.sum())
        Image.fromarray(b, "RGB").save(f"slices/{n}.png", optimize=True)
        man[n]["sha256"] = hashlib.sha256(open(f"slices/{n}.png", "rb").read()).hexdigest(); man[n]["status"] = "new"; man[n]["signed_in"] = None; man[n]["status_note"] = "the residue cleaned (10-15)"
        sheet1.append((n, a, b, ch))
    json.dump(man, open("slices/manifest.json", "w"), indent=1); json.dump(counts, open("log/clean-s03-residue.json", "w"), indent=1)
    def sheet(scale, path, crop=None):
        cells = []
        for n, a, b, ch in sheet1:
            if crop and not "128x160" in n: continue
            for im in (a, b): cells.append(Image.fromarray(im, "RGB").resize((im.shape[1] * scale, im.shape[0] * scale), Image.NEAREST))
        cols = 4 if scale == 1 else 2; w = max(c.width for c in cells); h = max(c.height for c in cells)
        rows = (len(cells) + cols - 1) // cols; S = Image.new("RGB", (cols * (w + 6), rows * (h + 6)), (43, 48, 56))
        for i, c in enumerate(cells): S.paste(c, ((i % cols) * (w + 6), (i // cols) * (h + 6)))
        S.save(path)
    sheet(1, "trait-clean/before-after-1x.png")
    # 4x: the defect area of each 128x160 file (the scales' upper left, the claws' leg highlight), before | after, one row per file
    rows = []
    for n, a, b, ch in sheet1:
        if "128x160" not in n: continue
        box = (20, 30, 80, 100) if "scales" in n else (70, 30, 110, 120)
        rows.append([Image.fromarray(im[box[1]:box[3], box[0]:box[2]], "RGB").resize(((box[2] - box[0]) * 4, (box[3] - box[1]) * 4), Image.NEAREST) for im in (a, b)])
    cw = max(r[0].width for r in rows); ch_ = max(r[0].height for r in rows); S = Image.new("RGB", (4 * (cw + 6), 2 * (ch_ + 6) + 6 * 0), (43, 48, 56))
    S = Image.new("RGB", (6 * (cw + 6), 2 * (ch_ + 6)), (43, 48, 56))
    for i, r in enumerate(rows):
        S.paste(r[0], (i * (cw + 6), 0)); S.paste(r[1], (i * (cw + 6), ch_ + 6))
    S.save("trait-clean/before-after-4x.png"); print(counts)
