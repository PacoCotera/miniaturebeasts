"""Pass 59: the round 1 crops (S01, S12) at all five sizes, re-cut by the owner's rule "the bird head at 75%": each crop's content sits inside the centred 75% of its cell (96x120 in 128x160, 108x132 in 144x176,
78x120 in 104x160, 78x72 in 104x96, 78x48 in 104x64), reduced from the raw painting and never enlarged, on the cell tone (`ground` #162a37, the paper keyed to it); the slice keeps the cell's size. Same regions and key as
traitpics.py (whose key function is reused, with the ground changed). S09 is done in traitpics2.py. python3 -I tools/recut75.py"""
import os, json, hashlib
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
src = open("tools/traitpics.py").read(); ns = {"__file__": os.path.abspath("tools/traitpics.py")}; exec(src[:src.index("os.makedirs(\"traitpics\"")], ns)
GROUND = (22, 42, 55); ns["DEEP"] = GROUND
R, SRC, GROW, key_to_deep, window, slug, looks, SIZES = ns["R"], ns["SRC"], ns["GROW"], ns["key_to_deep"], ns["window"], ns["slug"], ns["looks"], ns["SIZES"]
exec(open("tools/cutfade.py").read(), ns)
fade_cut = ns["fade_cut"]
from PIL import ImageDraw, ImageFilter
def matte(paint):
    """Pass 60, the 128x160 crops of S01 and S12: the ground is only what is connected to the painting's border (the old key took any paper-coloured pixel, so the eye white of S01 came out as holes with a light fringe
    round the iris). Enclosed background (a hole under 4000 px) is restored from the painting, opaque; the edge band (within 2 px of the outside) keeps the old key's partial alpha, with its colour taken from the solid
    pixels beside it (the white fringe on S12's wing edges goes). Returns the keyed RGB on the cell tone and the number of pixels restored."""
    a = np.asarray(paint.convert("RGB")).astype(float); H_, W_ = a.shape[:2]; PAPER = ns["PAPER"]; d = np.abs(a - PAPER).max(2); r = a / PAPER; spread = r.max(2) - r.min(2)
    shadow = (spread < 0.05) & (r.mean(2) < 0.985) & (r.mean(2) > 0.5); alpha0 = np.clip((d - 12) / 26.0, 0, 1); alpha0[shadow] = 0
    bg = (alpha0 < 0.5); seed = np.zeros_like(bg); seed[0, :] = bg[0, :]; seed[-1, :] = bg[-1, :]; seed[:, 0] = bg[:, 0]; seed[:, -1] = bg[:, -1]          # the ground the border reaches: grown inside the background until it stops
    while True:
        grown = (np.asarray(Image.fromarray((seed * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3))) > 127) & bg
        if (grown == seed).all(): break
        seed = grown
    outside = seed; enclosed = bg & ~outside
    # holes: connected components of the enclosed background, kept if under 4000 px
    lab = np.zeros((H_, W_), int); n = 0; restore = np.zeros((H_, W_), bool)
    for y0, x0 in zip(*np.where(enclosed)):
        if lab[y0, x0]: continue
        n += 1; stack = [(y0, x0)]; lab[y0, x0] = n; cells = []
        while stack:
            y, x = stack.pop(); cells.append((y, x))
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                yy, xx = y + dy, x + dx
                if 0 <= yy < H_ and 0 <= xx < W_ and enclosed[yy, xx] and not lab[yy, xx]: lab[yy, xx] = n; stack.append((yy, xx))
        if len(cells) < 4000:
            for y, x in cells: restore[y, x] = True
    alpha = np.where(outside, 0.0, 1.0); band = np.asarray(Image.fromarray((outside * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))) > 127
    alpha = np.where(band & ~outside, alpha0, alpha); alpha[restore] = 1.0
    solid = (~outside) & (~band | (alpha0 >= 0.98)) | restore; col = a.copy(); cnt0 = solid.astype(float)
    for _ in range(3):                                                  # the colour of a partial pixel: the mean of the solid pixels beside it
        pc = np.pad(col * solid[..., None], ((1, 1), (1, 1), (0, 0))); pn = np.pad(solid.astype(float), 1)
        sm = sum(pc[1 + dy:1 + dy + H_, 1 + dx:1 + dx + W_] for dy in (-1, 0, 1) for dx in (-1, 0, 1)); cn = sum(pn[1 + dy:1 + dy + H_, 1 + dx:1 + dx + W_] for dy in (-1, 0, 1) for dx in (-1, 0, 1))
        grow = (~solid) & (cn > 0) & (alpha > 0.02); col[grow] = (sm / np.maximum(cn, 1)[..., None])[grow]; solid = solid | grow
    out = col * alpha[..., None] + np.array(GROUND, float) * (1 - alpha[..., None])
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)), int(restore.sum())
man = json.load(open("slices/manifest.json")); out = []
for sp in ("S01", "S12"):
    d, fn = SRC[sp]; paint = Image.open(os.path.join(GROW, sp, d, fn)).convert("RGB"); W, H = paint.size; keyed = key_to_deep(paint); keyed_m, n_restored = matte(paint); doc = json.load(open(f"traitpics/trait-regions-{sp}.json"))
    for key, rect in R[sp].items():
        ch, tr = key.split("/"); look = looks[sp][key]
        for (tw, th) in SIZES:
            name = f"trait-{sp}-{slug(tr)}-{slug(look)}-{tw}x{th}"
            if name not in man: continue
            cw_, chh_ = round(tw * 0.75), round(th * 0.75); box, flag = window(rect, cw_, chh_, W, H); crop = (keyed_m if (tw, th) == (128, 160) else keyed).crop(box); cw, chh = crop.size
            im = crop.resize((cw_, chh_), Image.LANCZOS) if (cw, chh) != (cw_, chh_) else crop
            edges = []
            if (tw, th) == (128, 160): im, edges = fade_cut(im, GROUND)
            cv = Image.new("RGB", (tw, th), GROUND); cv.paste(im, ((tw - cw_) // 2, (th - chh_) // 2)); cv.save(f"slices/{name}.png", optimize=True)
            man[name]["made"] = man[name]["made"].split(" (pass 5")[0] + f" (pass 59: re-cut by the 75 percent rule: the content in the centred {cw_}x{chh_} at ({(tw - cw_) // 2}, {(th - chh_) // 2}) from a {cw}x{chh} window, reduced and never enlarged, on the cell tone ground #162a37)" + (f"; 128x160 (pass 60): the ground is only what the border reaches ({n_restored} enclosed background px restored from the painting, the edge colour taken from the solid pixels beside it), and a keyed fade (smoothstep, 12 px, finished inside the box) on the straight cut edges: {edges if edges else 'none'}" if (tw, th) == (128, 160) else "")
            man[name]["sha256"] = hashlib.sha256(open(f"slices/{name}.png", "rb").read()).hexdigest()
            doc["traits"][key]["crops"][f"{tw}x{th}"] = {"window": list(box), "source_px": [cw, chh], "slice": name, "flag": flag, "pass_59": f"content {cw_}x{chh_} centred in the cell", **({"keyed_edges": edges} if (tw, th) == (128, 160) else {})}; out.append(name)
    json.dump(doc, open(f"traitpics/trait-regions-{sp}.json", "w"), indent=1)
json.dump(man, open("slices/manifest.json", "w"), indent=1); print(len(out), "slices")
