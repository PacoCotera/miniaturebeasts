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
man = json.load(open("slices/manifest.json")); out = []
for sp in ("S01", "S12"):
    d, fn = SRC[sp]; paint = Image.open(os.path.join(GROW, sp, d, fn)).convert("RGB"); W, H = paint.size; keyed = key_to_deep(paint); doc = json.load(open(f"traitpics/trait-regions-{sp}.json"))
    for key, rect in R[sp].items():
        ch, tr = key.split("/"); look = looks[sp][key]
        for (tw, th) in SIZES:
            name = f"trait-{sp}-{slug(tr)}-{slug(look)}-{tw}x{th}"
            if name not in man: continue
            cw_, chh_ = round(tw * 0.75), round(th * 0.75); box, flag = window(rect, cw_, chh_, W, H); crop = keyed.crop(box); cw, chh = crop.size
            im = crop.resize((cw_, chh_), Image.LANCZOS) if (cw, chh) != (cw_, chh_) else crop
            cv = Image.new("RGB", (tw, th), GROUND); cv.paste(im, ((tw - cw_) // 2, (th - chh_) // 2)); cv.save(f"slices/{name}.png", optimize=True)
            man[name]["made"] = man[name]["made"].split(" (pass 5")[0] + f" (pass 59: re-cut by the 75 percent rule: the content in the centred {cw_}x{chh_} at ({(tw - cw_) // 2}, {(th - chh_) // 2}) from a {cw}x{chh} window, reduced and never enlarged, on the cell tone ground #162a37)"
            man[name]["sha256"] = hashlib.sha256(open(f"slices/{name}.png", "rb").read()).hexdigest()
            doc["traits"][key]["crops"][f"{tw}x{th}"] = {"window": list(box), "source_px": [cw, chh], "slice": name, "flag": flag, "pass_59": f"content {cw_}x{chh_} centred in the cell"}; out.append(name)
    json.dump(doc, open(f"traitpics/trait-regions-{sp}.json", "w"), indent=1)
json.dump(man, open("slices/manifest.json", "w"), indent=1); print(len(out), "slices")
