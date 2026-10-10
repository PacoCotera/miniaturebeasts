"""Pass 57: the round 1 crops (S01, S12) at 128x160 whose creature ran into the bottom 20 px are composed again in the top 140 rows, the bottom 20 left as the deep ground (the frame's sill covers them).
Same region, same key, same rule as traitpics.py (reduced from the raw painting, never enlarged); only the cell the window is fitted to changes (128x140). S01: Markings, Crown, Eyes; S12: Colour, Pattern (plain), Translucency.
The S09 crops are done in traitpics2.py. python3 -I tools/recompose_p57.py"""
import os, json, hashlib
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
src = open("tools/traitpics.py").read(); ns = {"__file__": os.path.abspath("tools/traitpics.py")}; exec(src[:src.index("os.makedirs(\"traitpics\"")], ns)
R, SRC, GROW, key_to_deep, window, slug, looks, DEEP = ns["R"], ns["SRC"], ns["GROW"], ns["key_to_deep"], ns["window"], ns["slug"], ns["looks"], ns["DEEP"]
man = json.load(open("slices/manifest.json")); TARGET = {"S01": ["coat/Markings", "face/Crown", "face/Eyes"], "S12": ["coat/Colour", "coat/Pattern", "coat/Translucency"]}; out = []
for sp, keys in TARGET.items():
    d, fn = SRC[sp]; paint = Image.open(os.path.join(GROW, sp, d, fn)).convert("RGB"); W, H = paint.size; keyed = key_to_deep(paint); doc = json.load(open(f"traitpics/trait-regions-{sp}.json"))
    for key in keys:
        rect = R[sp][key]; ch, tr = key.split("/"); look = looks[sp][key]; box, flag = window(rect, 128, 140, W, H); crop = keyed.crop(box); cw, chh = crop.size
        im = crop.resize((128, 140), Image.LANCZOS) if (cw, chh) != (128, 140) else crop; assert cw >= 128 and chh >= 140 or flag
        cv = Image.new("RGB", (128, 160), tuple(DEEP)); cv.paste(im, (0, 0)); name = f"trait-{sp}-{slug(tr)}-{slug(look)}-128x160"
        if name not in man: continue
        cv.save(f"slices/{name}.png", optimize=True)
        man[name]["made"] = man[name]["made"].split(" (the bottom")[0] + f" (pass 57: re-composed into the top 140 rows from a {cw}x{chh} window, the bottom 20 left empty for the frame's sill)"
        man[name]["sha256"] = hashlib.sha256(open(f"slices/{name}.png", "rb").read()).hexdigest()
        doc["traits"][key]["crops"]["128x160"] = {"window": list(box), "source_px": [cw, chh], "slice": name, "flag": flag, "pass_57": "composed in the top 140 rows"}; out.append(name)
    json.dump(doc, open(f"traitpics/trait-regions-{sp}.json", "w"), indent=1)
json.dump(man, open("slices/manifest.json", "w"), indent=1); print(out)
