"""The candidate ground: the meadow set one or two steps deeper into forest green (not teal), with tufts. Each meadow tile (grass x4, tall x2, flowers x2) is
remapped on the G ramp (grass -> leaf, leaf -> forest, forest -> pine, sprout -> grass, lime -> sprout: the body and its shade a step deeper, the light
strokes a step deeper too so they still read as blades), the grass tiles get tufts of three blades in sprout over grass at hashed positions kept away from the
outer 4 px (so the tiles still join), and the other ground tiles (sand, water, shallows, shade) are copied unchanged; the shore set is then cut again from
these (build-shore.py). usage: python3 -I ground-forest.py GROUND_DIR OUT_DIR"""
import os, shutil, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import quant
P = quant.P; C = P.index; gd, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
for f in os.listdir(gd):
    if f.endswith(".png"): shutil.copy(os.path.join(gd, f), os.path.join(out, f))
LUT = {C["grass"]: C["leaf"], C["leaf"]: C["forest"], C["forest"]: C["pine"], C["sprout"]: C["grass"], C["lime"]: C["sprout"]}
for n in ["grass1", "grass2", "grass3", "grass4", "tall1", "tall2", "flowers1", "flowers2"]:
    idx = quant.quantize(np.asarray(Image.open(os.path.join(gd, n + ".png")).convert("RGBA")))
    idx = np.vectorize(lambda v: LUT.get(v, v))(idx)
    if n.startswith("grass"):
        rg = np.random.RandomState(sum(map(ord, n))); pts = []
        for _ in range(300):
            x, y = int(rg.randint(5, 42)), int(rg.randint(6, 43))
            if all(abs(x - px) + abs(y - py) > 9 for px, py in pts): pts.append((x, y))
            if len(pts) == 7: break
        for x, y in pts:   # a tuft: three blades of sprout and grass over a dark root
            for dx, dy, c in ((0, 0, "forest"), (-1, -1, "grass"), (0, -1, "sprout"), (1, -1, "grass"), (-1, -2, "sprout"), (1, -2, "sprout"), (0, -2, "grass")):
                idx[y + dy, x + dx] = C[c]
    quant.save_indexed(idx, os.path.join(out, n + ".png"))
print("forest meadow set, 8 tiles")
