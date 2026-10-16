"""icon-cross-16: the clash line's cross on Create's bench (UI/UX, 10-15), in place of the build's red sprite (1.49:1 on the bench).
Two bevelled bars crossed at 45 deg, matte, lit from the top left, in a warm brick red light enough for 3:1 on the bench, over a 1 px dark rim so it reads on the
brown bench at 1x; never glowing. Painted by hand in code with paintkit.py. usage: make-icon-cross.py OUT_DIR"""
import sys, os, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paintkit import *
BRICK = (236, 132, 104); RIM = (24, 17, 15)   # fill 3.15:1 on the bench (non-text 3:1), rim 2.3:1 below it
def bar(c, ang, wid, col, lift):
    a = np.radians(ang); u = (c.xx - 8) * np.cos(a) + (c.yy - 8) * np.sin(a); v = -(c.xx - 8) * np.sin(a) + (c.yy - 8) * np.cos(a)
    m = (np.abs(u) <= 6.2) & (np.abs(v) <= wid / 2); d = np.minimum(6.2 - np.abs(u), wid / 2 - np.abs(v))
    c._put(m, np.clip(d / 1.2, 0, 1) * 1.2 + lift, col)
c = Canvas(16, 16)
bar(c, 45, 4.6, RIM, 0); bar(c, -45, 4.6, RIM, 0)
bar(c, 45, 2.8, BRICK, 1.0); bar(c, -45, 2.8, BRICK, 1.0)
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
c.render().save(os.path.join(out, 'icon-cross-16.png')); c.render(ground=(92, 76, 64)).save(os.path.join(out, 'proof-cross-on-bench.png'))
