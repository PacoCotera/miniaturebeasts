"""Pass 65: the S09 per-look plates (Colour, Fluff, Sheen, Feathers, Tufts, Crest, Eyes, Carriage) from the Pro image paintings (source/raw/plate-S09-*.jpg, 928x1152), cut to 128x160 as trait-S09-<trait>-<look>-128x160.
The open page's rules: no frame, the cell tone `ground` (22, 42, 55), the content inside the centred 96x120 (the middle 75 percent) at (16, 20), reduced from the painting and never enlarged; the painting's own ground (the border's median colour) is keyed to the
exact ground with a soft edge. Where the painted object runs off the painting's own edge (a cut edge, not a silhouette) the same keyed fade as the crops is applied along it (smoothstep over 12 px, finished inside the box).
python3 -I tools/plates75.py"""
import os, json, re, hashlib
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
exec(open("tools/cutfade.py").read(), globals())
GROUND = np.array([22.0, 42.0, 55.0]); slug = lambda s: re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", s.lower())).strip("-")
looks = json.load(open("source/work/looks-S09-type.json")); TRAITS = {"colour": "coat/colour", "fluff": "coat/fluff", "sheen": "coat/sheen", "feathers": "coat/feathers", "tufts": "coat/fur-reach", "crest": "face/feather-crest", "eyes": "face/eyes", "carriage": "legs-tail/tail-curl"}
man = json.load(open("slices/manifest.json")); report = {}
for k, key in TRAITS.items():
    a = np.asarray(Image.open(f"source/raw/plate-S09-{k}.jpg").convert("RGB")).astype(float); H, W = a.shape[:2]
    b = np.concatenate([a[:6].reshape(-1, 3), a[-6:].reshape(-1, 3), a[:, :6].reshape(-1, 3), a[:, -6:].reshape(-1, 3)]); g0 = np.median(b, axis=0)
    alpha = np.clip((np.abs(a - g0).max(2) - 10) / 24.0, 0, 1); hard = alpha > 0.5; ys, xs = np.where(hard); x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    touch = [n for n, v in (("top", hard[:4].sum()), ("bottom", hard[-4:].sum()), ("left", hard[:, :4].sum()), ("right", hard[:, -4:].sum())) if v >= 8]       # the painted object runs off the painting's edge there
    obj = Image.fromarray(np.clip(a[y0:y1, x0:x1], 0, 255).astype(np.uint8)); al = Image.fromarray((alpha[y0:y1, x0:x1] * 255).astype(np.uint8)); s = min(96 / obj.width, 120 / obj.height); assert s <= 1
    nw, nh = max(1, round(obj.width * s)), max(1, round(obj.height * s)); pm = np.asarray(obj).astype(float) * (np.asarray(al).astype(float)[..., None] / 255)
    pm = Image.fromarray(np.clip(pm, 0, 255).astype(np.uint8)).resize((nw, nh), Image.LANCZOS); alr = al.resize((nw, nh), Image.LANCZOS); A = np.asarray(alr).astype(float)[..., None] / 255; P = np.asarray(pm).astype(float)
    col = np.where(A > 1e-3, P / np.maximum(A, 1e-3), GROUND); out = np.clip(col, 0, 255) * A + GROUND * (1 - A); content = Image.fromarray(np.clip(np.rint(out), 0, 255).astype(np.uint8)); edges = []
    if touch: content, edges = fade_cut(content, tuple(int(v) for v in GROUND), only=touch)
    cell = Image.new("RGB", (128, 160), tuple(int(v) for v in GROUND)); ox, oy = (96 - nw) // 2 + 16, (120 - nh) // 2 + 20; cell.paste(content, (ox, oy))
    name = f"trait-S09-{k}-{slug(looks[key]['look'])}-128x160"; cell.save(f"slices/{name}.png", optimize=True)
    fin = np.asarray(cell).astype(int); mk = np.abs(fin - GROUND.astype(int)).max(2) > 6; yy, xx = np.where(mk); inside = bool(xx.min() >= 16 and xx.max() < 112 and yy.min() >= 20 and yy.max() < 140)
    report[name] = {"object_px": [int(x1 - x0), int(y1 - y0)], "scale": round(s, 3), "content": [nw, nh], "box": [int(xx.min()), int(yy.min()), int(xx.max() + 1), int(yy.max() + 1)], "inside_96x120": inside, "cut_edges_on_the_painting_border": touch, "faded": [e["edge"] for e in edges]}
    man[name] = {"size": [128, 160], "rect": None, "src": f"source/raw/plate-S09-{k}.jpg (gemini-3-pro-image)", "made": f"the {looks[key]['name']} plate of the Belatz ({looks[key]['look']}): a Pro painting, its ground keyed to the cell tone `ground` (22, 42, 55), the content reduced (never enlarged, x{s:.3f}) into the centred 96x120 at (16, 20), no frame" + (f"; the object ran off the painting's {', '.join(touch)} edge: a keyed fade (smoothstep, 12 px) along it" if touch else ""), "sha256": hashlib.sha256(open(f"slices/{name}.png", "rb").read()).hexdigest()}
json.dump(man, open("slices/manifest.json", "w"), indent=1); print(json.dumps(report, indent=1))
sh = Image.new("RGB", (4 * 136, 2 * 168), (10, 20, 26))
for i, k in enumerate(TRAITS): n = [x for x in report if x.startswith(f"trait-S09-{k}-")][0]; sh.paste(Image.open(f"slices/{n}.png"), (4 + (i % 4) * 136, 4 + (i // 4) * 168))
sh.save("proposals/plates-S09-1x.png"); sh.resize((sh.width * 2, sh.height * 2), Image.NEAREST).save("proposals/plates-S09-2x.png")
