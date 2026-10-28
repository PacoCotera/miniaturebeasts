"""The Library's found plates for the other 12 species (ad-curl, 2026-10-28): library-spread/make-spread.py's plate() unchanged, on each species'
signed adult painting (adult/mibi-adult-SXX-304x312: the round-1 and round-3 stand-ins), downsampled, never enlarged.
usage: python3 -I platesmore.py OUT_DIR"""
import sys, os, numpy as np
from PIL import Image
out = sys.argv[1]; R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def save(a, n): Image.fromarray(np.clip(np.round(a), 0, 255).astype(np.uint8), 'RGBA' if a.shape[-1] == 4 else 'RGB').save(os.path.join(out, n + '.png'))
src = open(f"{R}/library-spread/make-spread.py").read(); exec(src[src.index("def plate(src_rgba, n):"):src.index("for n in ('S01', 'S02', 'S03'):")])
for n in ["S04", "S05", "S06", "S07", "S08", "S10", "S11", "S12", "S13", "S14", "S15", "S16"]:
    plate(np.asarray(Image.open(f"{R}/adult/mibi-adult-{n}-304x312.png").convert("RGBA")), n)
print("made plates")
