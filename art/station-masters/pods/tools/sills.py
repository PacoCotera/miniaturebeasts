"""Pass 58 (round 2 of the sill): every trait picture frame at the live sizes (128x160, 376x264, 184x256, 184x104, 120x96; plain, -unread and -sealed) gets its bottom rail deepened to a 20 px sill between the side rails.
The rails keep their full profile (the left bevel and the right dark rail, every column and alpha as the frame has them) down to the bottom edge; the old bottom rail's two dark rows (h-2, h-1) are kept across the whole width.
Between the rails' inner edges (the first column, from the left past column 3 and from the right, where the rail's alpha is 1 or less) the sill is the rails' body colour, opaque and flat, from row h-20 to h-3, and its top is the top
rail's own inner profile mirrored: the top rail's rows 3 to 10 (the 1 px lit line and the five-to-seven px fall from about 250 to 0 alpha), read at the middle column, laid upward from the sill's top row. No other shade.
The 112x112 find frame is not in the sill spec and is untouched. Run once on the frames build.py writes (or on a checkout of them): python3 -I tools/sills.py"""
import os, json, hashlib
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
SIZES = [(128, 160), (376, 264), (184, 256), (184, 104), (120, 96)]; SILL = 20
man = json.load(open("slices/manifest.json")); done = []; report = {}; PLAIN = {}
for (w, h) in SIZES:
    for suf in ("", "-unread", "-sealed"):
        name = f"trait-picture-frame-{w}x{h}{suf}"; a = np.asarray(Image.open(f"slices/{name}.png").convert("RGBA")).astype(float); out = a.copy(); y0 = h - SILL; ym = h // 2
        pa = np.asarray(Image.open(f"slices/trait-picture-frame-{w}x{h}.png").convert("RGBA"))[ym, :, 3] if not suf else PLAIN[(w, h)]
        PLAIN[(w, h)] = pa; L = next(x for x in range(3, w) if pa[x] <= 1); R = next(x for x in range(w - 4, 0, -1) if pa[x] <= 1) + 1        # the sill spans columns L to R-1, between the rails
        body = a[ym, 1, :3].copy(); mid = w // 2
        for y in range(y0, h - 2):
            out[y, :, :] = a[y0 - 1, :, :]                                                       # the rails: their own profile, carried down unchanged
            out[y, L:R, :3] = body; out[y, L:R, 3] = 255                                          # the sill between them
        for k in range(8):                                                                       # the top rail's inner profile (rows 3 to 10), mirrored upward from the sill's top row
            y = y0 - k
            if y < 0: break
            out[y, L:R, :] = a[3 + k, mid, :] if k else a[3, mid, :]
        out[h - 2:, :, :] = a[h - 2:, :, :]                                                      # the old rail's two dark bottom rows, whole width
        Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA").save(f"slices/{name}.png", optimize=True)
        man[name]["made"] = man[name]["made"].split(" (pass 5")[0] + f" (pass 58: bottom rail deepened to a {SILL} px sill between the side rails (columns {L} to {R - 1}): the rails' body colour {tuple(int(v) for v in body)}, opaque, flat, no ornament; its top edge is the top rail's inner profile mirrored; the rails keep their full profile to the bottom edge, with the old rail's two dark bottom rows)"
        man[name]["sha256"] = hashlib.sha256(open(f"slices/{name}.png", "rb").read()).hexdigest(); done.append(name); report[name] = (L, R)
json.dump(man, open("slices/manifest.json", "w"), indent=1); print(len(done), "frames", {n: v for n, v in report.items() if not n.endswith(("unread", "sealed"))})
