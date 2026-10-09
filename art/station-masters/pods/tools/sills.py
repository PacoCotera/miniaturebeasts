"""Pass 57: the sill. Every trait picture frame at the live sizes (128x160, 376x264, 184x256, 184x104, 120x96; plain, -unread and -sealed; and the 112x112 find frame, plain only) gets its bottom rail deepened to a 20 px
sill: the frame's own material (the side rails' body colour), opaque, flat, a 1 px lit edge along its top (the colour of the frame's inner lit line), no ornament; the bottom outer edge, the side rails and the window above are the
existing pixels. A 10 px inner shade (the one the frame has on its other three edges) is added above the sill's lit edge. Ids and sizes unchanged. Run after tools/build.py frames(): python3 -I tools/sills.py"""
import os, json, hashlib
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
SIZES = [(128, 160), (376, 264), (184, 256), (184, 104), (120, 96), (112, 112)]; SILL = 20
man = json.load(open("slices/manifest.json")); done = []
for (w, h) in SIZES:
    for suf in ("", "-unread", "-sealed"):
        if (w, h) == (112, 112) and suf: continue
        name = f"trait-picture-frame-{w}x{h}{suf}"; a = np.asarray(Image.open(f"slices/{name}.png").convert("RGBA")).astype(float)
        body = a[h // 2, 1, :3].copy(); lit = a[3, w // 2, :3].copy(); y0 = h - SILL                   # the side rail's body colour; the frame's inner lit line (the top rail's)
        side = a[y0 - 1].copy()                                                                    # the side rails as they are just above the sill
        out = a.copy()
        for y in range(y0, h - 1):
            out[y, :, :3] = body; out[y, :, 3] = 255; out[y, :3] = side[:3]; out[y, w - 3:] = side[w - 3:]   # flat body; the side rails carried down unchanged
        out[y0, 3:w - 3, :3] = lit                                                                  # the 1 px lit edge along the sill's top
        out[h - 1, :, 3] = 255                                                                      # the bottom outer edge keeps its pixels
        for k in range(10):                                                                         # the inner shade above the sill, as on the other three edges
            y = y0 - 1 - k
            if y < 0: break
            al = (np.clip(1 - (k + 1) / 10.0, 0, 1) ** 2) * 0.45; x0, x1 = 4, w - 4
            for x in range(x0, x1): out[y, x, :3] = out[y, x, :3] * (1 - al) + np.array([6.0, 14.0, 22.0]) * al; out[y, x, 3] = max(out[y, x, 3], al * 255)
        Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA").save(f"slices/{name}.png", optimize=True)
        man[name]["made"] = man[name]["made"].split(" (pass 57")[0] + f" (pass 57: bottom rail deepened to a {SILL} px sill: the rails' body colour {tuple(int(v) for v in body)}, opaque, flat, a 1 px lit edge {tuple(int(v) for v in lit)}, no ornament; a 10 px inner shade above it)"
        man[name]["sha256"] = hashlib.sha256(open(f"slices/{name}.png", "rb").read()).hexdigest(); done.append(name)
json.dump(man, open("slices/manifest.json", "w"), indent=1); print(len(done), "frames")
