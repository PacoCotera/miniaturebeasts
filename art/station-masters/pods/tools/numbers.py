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
    im_ = Image.open(f"slices/{n}.png")
    if im_.mode == "RGBA":      # transparent pieces: only the opaque pixels (alpha over 50 percent) count, the key light taken in the top-left quarter of the piece
        r_ = np.asarray(im_).astype(float); op_ = r_[..., 3] > 128; L_ = lstar(r_[..., :3]); h_, w_ = L_.shape; q = np.zeros_like(op_); q[:h_ // 2, :w_ // 2] = True; qq = op_ & q
        key = r_[..., :3][qq & (L_ >= np.percentile(L_[qq], 80))].mean(0); mx = r_[..., :3][op_].max(1); mn = r_[..., :3][op_].min(1)
        m = {"mean L*": round(float(L_[op_].mean()), 1), "key RGB": [int(round(v)) for v in key], "key R-B": int(round(key[0] - key[2])), "sat": int(round(((mx - mn) / np.maximum(mx, 1)).mean() * 100))}
    else: m = measures(im_.convert("RGB"))
    print(f"| `{n}` | {m['mean L*']} | {tuple(m['key RGB'])} | {m['key R-B']} | {m['sat']} |")
