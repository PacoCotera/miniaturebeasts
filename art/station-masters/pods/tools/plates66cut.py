"""Pass 80: the five S09 repaints (Sheen, Tufts, Carriage, Eyes, Colour; the owner approved up to 36 MXN, run through gen.py, 5 requests) cut the same way as pass 65 (tools/plates75.py) from source/raw/plate66-S09-*.jpg (928x1152), cut to 128x160 as trait-S09-<trait>-<look>-128x160.
The open page's rules: no frame, the cell tone `ground` (22, 42, 55), the content inside the centred 96x120 (the middle 75 percent) at (16, 20), reduced from the painting and never enlarged; the painting's own ground (the border's median colour) is keyed to the
exact ground with a soft edge. Where the painted object runs off the painting's own edge (a cut edge, not a silhouette) the same keyed fade as the crops is applied along it (smoothstep over 12 px, finished inside the box).
python3 -I tools/plates66cut.py"""
import os, json, re, hashlib
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
exec(open("tools/cutfade.py").read(), globals())
GROUND = np.array([22.0, 42.0, 55.0]); slug = lambda s: re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", s.lower())).strip("-")
looks = json.load(open("source/work/looks-S09-type.json")); TRAITS = {"colour": "coat/colour", "sheen": "coat/sheen", "tufts": "coat/fur-reach", "eyes": "face/eyes", "carriage": "legs-tail/tail-curl"}
man = json.load(open("slices/manifest.json")); report = {}
for k, key in TRAITS.items():
    a = np.asarray(Image.open(f"source/raw/plate66-S09-{k}.jpg").convert("RGB")).astype(float); H, W = a.shape[:2]
    if k == "sheen":        # the painting set the wing on a dish: keep only the feathers (blue by b - r > 72, the cream tips by r - b > 25), closed and grown 4 px, everything else back to the painting's ground
        from PIL import ImageFilter
        keep = ((a[..., 2] - a[..., 0] > 72) | (a[..., 0] - a[..., 2] > 25)); m = Image.fromarray((keep * 255).astype(np.uint8))
        for _ in range(16): m = m.filter(ImageFilter.MaxFilter(3))
        for _ in range(16): m = m.filter(ImageFilter.MinFilter(3))
        m = m.filter(ImageFilter.MaxFilter(9)); g0 = np.median(np.concatenate([a[:6].reshape(-1, 3), a[-6:].reshape(-1, 3)]), axis=0)
        a = np.where((np.asarray(m) > 0)[..., None], a, g0)
    b = np.concatenate([a[:6].reshape(-1, 3), a[-6:].reshape(-1, 3), a[:, :6].reshape(-1, 3), a[:, -6:].reshape(-1, 3)]); g0 = np.median(b, axis=0)
    alpha = np.clip((np.abs(a - g0).max(2) - 10) / 24.0, 0, 1); hard = alpha > 0.5; ys, xs = np.where(hard); x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    touch = [n for n, v in (("top", hard[:4].sum()), ("bottom", hard[-4:].sum()), ("left", hard[:, :4].sum()), ("right", hard[:, -4:].sum())) if v >= 8]       # the painted object runs off the painting's edge there
    obj = Image.fromarray(np.clip(a[y0:y1, x0:x1], 0, 255).astype(np.uint8)); al = Image.fromarray((alpha[y0:y1, x0:x1] * 255).astype(np.uint8)); s = min(96 / obj.width, 120 / obj.height); assert s <= 1
    nw, nh = max(1, round(obj.width * s)), max(1, round(obj.height * s)); pm = np.asarray(obj).astype(float) * (np.asarray(al).astype(float)[..., None] / 255)
    pm = Image.fromarray(np.clip(pm, 0, 255).astype(np.uint8)).resize((nw, nh), Image.LANCZOS); alr = al.resize((nw, nh), Image.LANCZOS); A = np.asarray(alr).astype(float)[..., None] / 255; P = np.asarray(pm).astype(float)
    col = np.where(A > 1e-3, P / np.maximum(A, 1e-3), GROUND); out = np.clip(col, 0, 255) * A + GROUND * (1 - A); content = Image.fromarray(np.clip(np.rint(out), 0, 255).astype(np.uint8)); edges = []
    if touch: content, edges = fade_cut(content, tuple(int(v) for v in GROUND), only=touch)
    cell = Image.new("RGB", (128, 160), tuple(int(v) for v in GROUND)); ox, oy = (96 - nw) // 2 + 16, (120 - nh) // 2 + 20; cell.paste(content, (ox, oy))
    if k == "sheen":        # a 4x4 gap between two feather tips at the wing's tip read as a square hole at 1x: a ground pixel with feather on all four sides within 4 px is filled with the mean of the feather pixels round it
        c = np.asarray(cell).astype(int); solid = np.abs(c - GROUND.astype(int)).max(2) > 6; H2, W2 = solid.shape; fill = []
        for y in range(4, H2 - 4):
            for x in range(4, W2 - 4):
                if not solid[y, x] and solid[y, x - 4:x].any() and solid[y, x + 1:x + 5].any() and solid[y - 4:y, x].any() and solid[y + 1:y + 5, x].any(): fill.append((y, x))
        for y, x in fill:
            nb = c[y - 3:y + 4, x - 3:x + 4][solid[y - 3:y + 4, x - 3:x + 4]]; c[y, x] = nb.mean(0)
        for _ in range(3):      # the same gap opens to the wing's right edge: its ground pixels inside the box (96, 88)-(112, 106) take the mean of the feather pixels within 2 px, three sweeps
            solid = np.abs(c - GROUND.astype(int)).max(2) > 6; add = []
            for y in range(88, 106):
                for x in range(96, 112):
                    if not solid[y, x]:
                        nb = c[y - 2:y + 3, x - 2:x + 3][solid[y - 2:y + 3, x - 2:x + 3]]
                        if len(nb) >= 8: add.append((y, x, nb.mean(0)))
            for y, x, v in add: c[y, x] = v
        cell = Image.fromarray(c.astype(np.uint8)); print("sheen holes filled:", len(fill))
    name = f"trait-S09-{k}-{slug(looks[key]['look'])}-128x160"; cell.save(f"slices/{name}.png", optimize=True)
    fin = np.asarray(cell).astype(int); mk = np.abs(fin - GROUND.astype(int)).max(2) > 6; yy, xx = np.where(mk); inside = bool(xx.min() >= 16 and xx.max() < 112 and yy.min() >= 20 and yy.max() < 140)
    report[name] = {"object_px": [int(x1 - x0), int(y1 - y0)], "scale": round(s, 3), "content": [nw, nh], "box": [int(xx.min()), int(yy.min()), int(xx.max() + 1), int(yy.max() + 1)], "inside_96x120": inside, "cut_edges_on_the_painting_border": touch, "faded": [e["edge"] for e in edges]}
    man[name] = {"size": [128, 160], "rect": None, "src": f"source/raw/plate66-S09-{k}.jpg (gemini-3-pro-image)", "made": f"the {looks[key]['name']} plate of the Belatz ({looks[key]['look']}): a Pro repaint (pass 80), its ground keyed to the cell tone `ground` (22, 42, 55), the content reduced (never enlarged, x{s:.3f}) into the centred 96x120 at (16, 20), no frame" + (f"; the object ran off the painting's {', '.join(touch)} edge: a keyed fade (smoothstep, 12 px) along it" if touch else ""), "sha256": hashlib.sha256(open(f"slices/{name}.png", "rb").read()).hexdigest()}
json.dump(man, open("slices/manifest.json", "w"), indent=1); print(json.dumps(report, indent=1))
sh = Image.new("RGB", (5 * 136, 168), (10, 20, 26))
for i, k in enumerate(TRAITS): n = [x for x in report if x.startswith(f"trait-S09-{k}-")][0]; sh.paste(Image.open(f"slices/{n}.png"), (4 + i * 136, 4))
sh.save("proposals/plates66-S09-1x.png"); sh.resize((sh.width * 2, sh.height * 2), Image.NEAREST).save("proposals/plates66-S09-2x.png")
