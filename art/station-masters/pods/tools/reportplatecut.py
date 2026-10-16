"""Pass 140 (the art director's AR5 heights note; no paid call): cargo-report-plate-560x{h}, h = 128 to 280 by 8 (20 files), derived from
slices/cargo-report-plate-560x288.png by a middle band cut: a band of 288 - h rows centred on row 168 (inside the well floor, below where the rows
sit) is removed, feathered over 8 rows: the band's first 8 rows (the 8 rows above the cut, which the cut takes) fade linearly into the 8 rows below it, as
tools/baycut.py does for the bay. Rows 0-24 and the last 24 rows are never cut. Alpha kept (blended with the colour, premultiplied). One sheet of all 21 at 1x on the
shut door. usage (from art/station-masters/pods): python3 -I tools/reportplatecut.py"""
import json, hashlib
import numpy as np
from PIL import Image
src = Image.open("slices/cargo-report-plate-560x288.png").convert("RGBA"); a = np.asarray(src).astype(float); H, W = a.shape[:2]; assert (W, H) == (560, 288)
pm = a.copy(); pm[..., :3] *= a[..., 3:4] / 255.0                                  # premultiplied, so a seam never bleeds colour from a clear pixel
man = json.load(open("slices/manifest.json")); F = 8; outs = {"cargo-report-plate-560x288": src}
for h in range(128, 281, 8):
    k = H - h; t0 = 168 - k // 2; t1 = t0 + k
    assert t0 >= 24 and t1 + F <= H - 24, (h, t0, t1)                                  # the moulding, corners and lips stay whole
    r = np.linspace(0, 1, F)[:, None, None]                                            # as baycut.py: the band's first 8 rows fade into the 8 rows below it
    blend = pm[t0:t0 + F] * (1 - r) + pm[t1:t1 + F] * r
    b = np.concatenate([pm[:t0], blend, pm[t1 + F:]], 0); assert b.shape[0] == h
    al = b[..., 3:4]; rgb = np.where(al > 0, b[..., :3] * 255.0 / np.maximum(al, 1e-6), 0)
    out = np.concatenate([np.clip(np.round(rgb), 0, 255), np.round(al)], -1).astype(np.uint8)
    n = f"cargo-report-plate-560x{h}"; im = Image.fromarray(out, "RGBA"); im.save(f"slices/{n}.png", optimize=True); outs[n] = im
    man[n] = {"size": [560, h], "rect": None, "src": "derived from cargo-report-plate-560x288 by a middle band cut",
              "made": f"the Cargo report plate at {h} rows: {k} rows removed from the well floor (rows {t0}-{t1 - 1} of the 288), the cut's first 8 rows and the 8 rows below it blended linearly across the seam (the band's first 8 rows fade into the 8 rows below it, as baycut.py does); rows 0-24 and the last 24 rows whole; alpha kept (pass 140)",
              "sha256": hashlib.sha256(open(f"slices/{n}.png", "rb").read()).hexdigest()}
json.dump(man, open("slices/manifest.json", "w"), indent=1)
door = Image.open("slices/cargo-bay-shut-976x304.png").convert("RGBA"); names = ["cargo-report-plate-560x%d" % h for h in range(128, 289, 8)]
cols = 3; rows = (len(names) + cols - 1) // cols; S = Image.new("RGB", (cols * 984 + 8, rows * 312 + 8), (43, 48, 56))
for i, n in enumerate(names):
    p = door.copy(); p.alpha_composite(outs[n], ((976 - 560) // 2, 8)); S.paste(p.convert("RGB"), (8 + (i % cols) * 984, 8 + (i // cols) * 312))
S.save("marks/cargo-report-heights-1x.png"); print(len(names), S.size)
