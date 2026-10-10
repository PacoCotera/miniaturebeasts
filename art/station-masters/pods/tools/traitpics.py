"""Trait pictures (Brief 2): crop regions from the standard painting, not painted close-ups. python3 -I tools/traitpics.py
Per species a `traitpics/trait-regions-<SNN>.json`: one crop rectangle per body trait (hand-placed for round 1, on the painting's own pixels; the rig's index pass would place them exactly), the
look the genome gives (framework/describe.mjs `lookOf`, run on the individual's genome), and for each target size the crop actually taken. Slices
`trait-<SNN>-<trait>-<look>-<w>x<h>` at 128x160, 144x176, 104x160, 104x96, 104x64: each re-framed from the region at its own proportions, reduced from the raw painting (600x620) and never enlarged
(a part smaller than the cell is flagged, and the crop then shows its surroundings at 1:1). The painting's paper ground is keyed to the pane's deep ground; the shadow on the paper is dropped with it."""
import json, os, re, hashlib
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT); REPO = os.path.abspath(os.path.join(ROOT, "..", "..", ".."))
GROW = os.path.join(REPO, "prototypes/workbench/grow/out")
SRC = {"S01": ("07bef58c9d38d564", "station-side-600x620.png"), "S09": ("3982a7117cfa0fc3", "station-side-600x620.png"), "S12": ("2af58fb73ac5cbbd", "station-portrait-600x620.png")}
SIZES = [(128, 160), (144, 176), (104, 160), (104, 96), (104, 64)]
DEEP = (14, 28, 36); PAPER = np.array([246.0, 243.0, 236.0])
R = {   # chapter/trait -> (x0, y0, x1, y1) on the painting, hand-placed (round 1)
 "S09": {"coat/Colour": (295, 285, 435, 465), "coat/Fluff": (395, 205, 525, 335), "coat/Sheen": (200, 285, 300, 400), "coat/Feathers": (165, 95, 355, 310), "coat/Tufts": (30, 190, 125, 275), "coat/Trim": (205, 395, 330, 565),
         "face/Head": (480, 190, 600, 350), "face/Beak": (545, 255, 600, 315), "face/Crest": (480, 125, 560, 215), "face/Crown": (470, 195, 570, 255), "face/Eyes": (535, 225, 585, 275),
         "shape/Waist": (310, 330, 420, 420), "shape/Topline": (200, 260, 420, 325), "shape/Haunch": (200, 285, 310, 400), "shape/Body": (290, 285, 440, 470), "shape/Build": (150, 250, 450, 470),
         "legs-tail/Carriage": (130, 250, 300, 360), "legs-tail/Tail": (30, 185, 215, 335)},
 "S01": {"coat/Markings": (100, 300, 370, 480), "face/Crown": (275, 50, 445, 170), "face/Eyes": (385, 180, 470, 260)},
 "S12": {"coat/Colour": (230, 360, 470, 470), "coat/Translucency": (300, 100, 560, 350), "coat/Pattern": (370, 365, 470, 460), "coat/Trim": (230, 440, 540, 560), "shape/Haunch": (360, 440, 550, 545)},
}
looks = json.load(open("source/work/looks.json"))
slug = lambda s: re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", s.lower())).strip("-")
man = json.load(open("slices/manifest.json"))
def key_to_deep(img):
    a = np.asarray(img.convert("RGB")).astype(float); d = np.abs(a - PAPER).max(2); r = a / PAPER; spread = r.max(2) - r.min(2)
    shadow = (spread < 0.05) & (r.mean(2) < 0.985) & (r.mean(2) > 0.5)                          # the paper's soft cast shadow
    alpha = np.clip((d - 12) / 26.0, 0, 1); alpha[shadow] = 0
    # a creature pixel keeps its colour; paper and shadow become the deep ground, edges blend
    out = a * alpha[..., None] + np.array(DEEP) * (1 - alpha[..., None]); return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))
def window(rect, tw, th, W, H):
    x0, y0, x1, y1 = rect; ratio = tw / th; w = max(x1 - x0, (y1 - y0) * ratio); h = w / ratio
    flag = None
    if w < tw or h < th: flag = f"the part is {x1 - x0}x{y1 - y0} px, smaller than the {tw}x{th} cell: shown with its surroundings at 1:1, not enlarged"; w, h = float(tw), float(th)
    if w > W or h > H:
        s = min(W / w, H / h); w, h = w * s, h * s; flag = (flag or "") + " (the window was cut to the painting's edge)"
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2; bx = min(max(cx - w / 2, 0), W - w); by = min(max(cy - h / 2, 0), H - h)
    return (int(round(bx)), int(round(by)), int(round(bx + w)), int(round(by + h))), flag
os.makedirs("traitpics", exist_ok=True); n_sl = 0
for sp, regs in R.items():
    d, fn = SRC[sp]; paint = Image.open(os.path.join(GROW, sp, d, fn)).convert("RGB"); W, H = paint.size; keyed = key_to_deep(paint)
    doc = {"species": sp, "painting": f"prototypes/workbench/grow/out/{sp}/{d}/{fn}", "size": [W, H], "note": "hand-placed rectangles on the standard painting for round 1; the rig's index pass would place them exactly", "traits": {}}
    for key, rect in regs.items():
        ch, tr = key.split("/"); look = looks[sp][key]; ent = {"chapter": ch, "trait": tr, "look": look, "rect": list(rect), "crops": {}}
        for (tw, th) in SIZES:
            box, flag = window(rect, tw, th, W, H); crop = keyed.crop(box); cw, chh = crop.size
            im = crop.resize((tw, th), Image.LANCZOS) if (cw, chh) != (tw, th) else crop
            if cw < tw or chh < th: flag = (flag or "") + " ENLARGED"
            name = f"trait-{sp}-{slug(tr)}-{slug(look)}-{tw}x{th}"; im.save(f"slices/{name}.png", optimize=True)
            man[name] = {"size": [tw, th], "rect": None, "src": f"{sp} standard painting, region {list(rect)} of {W}x{H}", "made": f"the {tr} of the {sp} individual ({look}) as a crop of the standard painting re-framed to {tw}x{th} from a {cw}x{chh} window ({'reduced' if (cw, chh) != (tw, th) else '1:1'}, never enlarged), paper ground keyed to the deep ground" + (f"; FLAG: {flag}" if flag else ""), "sha256": hashlib.sha256(open(f"slices/{name}.png", "rb").read()).hexdigest()}
            ent["crops"][f"{tw}x{th}"] = {"window": list(box), "source_px": [cw, chh], "slice": name, "flag": flag}; n_sl += 1
        doc["traits"][key] = ent
    json.dump(doc, open(f"traitpics/trait-regions-{sp}.json", "w"), indent=1)
json.dump(man, open("slices/manifest.json", "w"), indent=1)
print(n_sl, "slices")
flags = [(sp, k, s, v["flag"]) for sp in R for k, e in json.load(open(f"traitpics/trait-regions-{sp}.json"))["traits"].items() for s, v in e["crops"].items() if v["flag"]]
print(len(flags), "flagged crops (a part smaller than its cell)"); print([f[:3] for f in flags][:12])
