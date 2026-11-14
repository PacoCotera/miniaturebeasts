"""The AD's outline gates (ad-gate-body-1.md): at 304, house 3/4, the right edge x at rows y 160/200/240/275 (master 255/272/280/282) and the top of the body y at columns x 200/220/240/260/280 (master 131/135/145/166/240), read from alpha;
the bare base (no crown, no leaves). The master's leaves are masked out by colour. Our render is aligned to the master's feet row and left edge, as the AD's crops are."""
import os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gates

ROWS = (160, 200, 240, 275)
COLS = (200, 220, 240, 260, 280)
MASTER_RIGHT = (255, 272, 280, 282)
MASTER_TOP = (131, 135, 145, 166, 240)


def read(alpha, rgb=None, leaves=False):
    op = alpha > 0.5
    if rgb is not None and not leaves:
        r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
        leaf = (g >= r - 0.055) & (g > b + 0.055)
        op = op & ~leaf
    right = [int(np.where(op[y])[0].max()) if op[y].any() else None for y in ROWS]
    top = [int(np.where(op[:, x])[0].min()) if op[:, x].any() else None for x in COLS]
    return right, top


def master():
    m = gates.load_rgba(gates.MASTER % "304x312")
    return read(m[..., 3], m[..., :3])


def evaluate(sv_alpha):
    right, top = read(sv_alpha)
    er = [None if v is None else v - m for v, m in zip(right, MASTER_RIGHT)]
    et = [None if v is None else v - m for v, m in zip(top, MASTER_TOP)]
    return right, top, er, et
