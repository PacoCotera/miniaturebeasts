"""G1: mark-guide-16, 16x16 after the species line: the field guide's door mark, a small closed field guide: a bark cover with
a sand page block showing at the right edge, a spine at the left, and a pressed leaf in low relief on the cover. Matte, top-left
light, a soft contact shadow baked. usage: make-guide-mark.py OUT_DIR"""
import sys, os, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paintkit import *

c = Canvas(16, 16)
c.box(3.5, 2, 10.5, 12.5, 1.0, BONE)                    # the page block, seen at the right and bottom edge
c.box(2, 1.2, 11, 12.4, 1.4, BARK)                      # the cover
c.box(2, 1.2, 2.2, 12.4, 1.0, SAND_D)                   # the spine band
a = np.radians(-35); X = c.xx - 8.6; Y = c.yy - 7.6
u = X * np.cos(a) + Y * np.sin(a); v = -X * np.sin(a) + Y * np.cos(a); d2 = (u / 3.0) ** 2 + (v / 1.5) ** 2; m = d2 <= 1
c._put(m, np.sqrt(np.clip(1 - d2, 0, 1)) * 1.4 + 2.2, LEAF)   # the pressed leaf on the cover
if __name__ == "__main__":
    out = sys.argv[1]; os.makedirs(out, exist_ok=True)
    c.render(shadow_k=0.4, shadow=(.8, 1.0)).save(os.path.join(out, 'mark-guide-16.png'))
    c.render(ground=(43, 48, 56), shadow=(.8, 1.0)).save(os.path.join(out, 'proof-guide-on-panel.png'))
