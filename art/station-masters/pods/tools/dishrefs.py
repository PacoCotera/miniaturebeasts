"""The reference picture for the reading-room dish (ad-review.md of the built Pods screens, B1: a 136x28 dish at [72, 248], cut from the bench
master's wood and brass in the lamp's light), a project-owned crop of the signed pass 142 bench: the brass lamp, its pool and the umber bench top.
usage: python3 -I tools/dishrefs.py   (writes source/work/masters-pods-dish/ref-bench-lamp.jpg)"""
import os
from PIL import Image
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); W = f"{R}/source/work/masters-pods-dish"; os.makedirs(W, exist_ok=True)
os.makedirs(f"{R}/source/raw/masters-pods-dish", exist_ok=True)
k = 5243 / 1024
bench = Image.open(f"{R}/shelf/reading-bench-5243x3072.png").convert("RGB")
bench.crop((0, round(40 * k), round(420 * k), round(340 * k))).resize((1400, 1000), Image.LANCZOS).save(f"{W}/ref-bench-lamp.jpg", quality=92)   # the lamp, its pool on the bench top (y 262-305), the wood
print("refs written")
