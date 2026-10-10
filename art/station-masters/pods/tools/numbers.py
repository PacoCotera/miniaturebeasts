"""The 1x numbers beside each painted slice (the programme lead's rule of Oct 10: nothing is signed without them), measured the art director's way: mean L*; the key light = the brightest 20 percent (by L*) of the top-left quarter, as mean RGB and R-B; mean saturation (HSV S x 100).
python3 -I tools/numbers.py [slice ids...] -> a table (default: the Vivarium, near and Home glass sets)"""
import os, sys
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
exec(open("tools/dawntint.py").read(), globals())
ids = sys.argv[1:] or [f"{b}-{k}-{s}" for b, s in (("idle-vivarium", "1024x568"), ("vivarium-near", "544x408"), ("home-glass", "640x488")) for k in ("day", "dusk", "dawn", "night")]
print("| slice | mean L* | key RGB | key R-B | sat |\n| --- | --- | --- | --- | --- |")
for n in ids:
    m = measures(Image.open(f"slices/{n}.png").convert("RGB")); print(f"| `{n}` | {m['mean L*']} | {tuple(m['key RGB'])} | {m['key R-B']} | {m['sat']} |")
