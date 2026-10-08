"""The art director's hand pass on single pieces, scripted so it can be re-run: thin grass2's repeating motif, redraw the dew
cup so it reads at 1x, and take the stones from the Retro Diffusion results. (The pawn is drawn by pawn-draw.py.)
usage: python3 -I hand-pass.py WORK_DIR"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import quant
from pb import PB, C
P = quant.P; work = sys.argv[1]
def load(g, n): return quant.quantize(np.asarray(Image.open(os.path.join(work, g, n + ".png")).convert("RGBA")))
def save(idx, g, n): quant.save_indexed(idx, os.path.join(work, g, n + ".png"))
# ---- grass2: the long bar, the bracket and the ramp of dark pixels that repeat on the grid are broken into small clumps
g = load("ground", "grass2"); N = 48
vals, cnt = np.unique(g, return_counts=True); base = vals[np.argmax(cnt)]
dark = np.isin(g, [C["forest"], C["pine"], C["leaf"]]) & (g != base)
def components(m):
    seen = np.zeros_like(m); out = []
    for y0, x0 in zip(*np.where(m)):
        if seen[y0, x0]: continue
        st, comp = [(y0, x0)], []; seen[y0, x0] = True
        while st:
            y, x = st.pop(); comp.append((y, x))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < m.shape[0] and 0 <= xx < m.shape[1] and m[yy, xx] and not seen[yy, xx]: seen[yy, xx] = True; st.append((yy, xx))
        out.append(np.array(comp).T)
    return out
for ys, xs in components(dark):
    if len(xs) >= 12:   # the large shapes go, inside the box clear of the two outer pixels (the join with the next tile)
        ins = (xs >= 2) & (xs < N - 2) & (ys >= 2) & (ys < N - 2); g[ys[ins], xs[ins]] = base
rng = np.random.RandomState(2)
for _ in range(7):   # small clumps of two to four pixels in their place, away from the border band
    x, y = rng.randint(7, N - 9), rng.randint(7, N - 9)
    for dx, dy in [(0, 0), (1, 0), (0, 1), (1, 1)][: rng.randint(2, 5)]:
        if g[y + dy, x + dx] == base: g[y + dy, x + dx] = C["leaf"] if rng.rand() < 0.7 else C["forest"]
save(g, "ground", "grass2")
# ---- dew cup: a curled leaf holding a pool of dew, 32 x 24, lit from the top left; a spark of dew beside it
W_, H_ = 32, 24; pb = PB(W_, H_); yy, xx = np.mgrid[0:H_, 0:W_]
def ell(cx, cy, rx, ry): return ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2
leaf = ell(15, 13, 14, 8.5) <= 1; rim = leaf & (ell(15, 13, 14, 8.5) > 0.62)
pool = ell(14, 12, 8, 4) <= 1
for y in range(H_):
    for x in range(W_):
        if not leaf[y, x]: continue
        col = C["grass"]
        if y > 14: col = C["leaf"]
        if y > 18: col = C["forest"]
        if rim[y, x] and y < 12: col = C["sprout"]
        if rim[y, x] and x < 8 and y < 14: col = C["lime"]
        pb.set(x, y, col)
for y in range(H_):
    for x in range(W_):
        if pool[y, x]:
            e = ((x - 14) / 8) ** 2 + ((y - 12) / 4) ** 2; col = C["river"]
            if e > 0.72: col = C["sea"]
            if e < 0.5 and y < 12: col = C["sky"]
            pb.set(x, y, col)
for x, y, c in ((10, 10, "ice"), (11, 10, "white"), (9, 11, "ice"), (17, 13, "sky"), (22, 5, "ice"), (26, 8, "white")): pb.set(x, y, C[c])
idx = pb.p.copy(); idx = quant.outline(idx)
bb = quant.bbox((idx >= 0) * 255); x0, y0, x1, y1 = bb; save(idx[y0:y1, x0:x1], "props", "dew-cup")
# ---- the stones: the Retro Diffusion results (work/props-rd) taken to the pieces. The art director's hand on each state:
# plain: a ground shadow; warm: the outer orange halo that the snap left is taken off and the core's glow kept (yellow centre,
# amber, orange rim) with a warm spill on the ground; charged: the teal specks are removed and a jagged bolt of white with ice
# beside it drawn across the stone, branches and sparks off the silhouette; step: the stepping stone with a dark water line.
def line(a, b):
    (x0, y0), (x1, y1) = a, b; n = max(abs(x1 - x0), abs(y1 - y0), 1)
    return [(round(x0 + (x1 - x0) * i / n), round(y0 + (y1 - y0) * i / n)) for i in range(n + 1)]
def shadow(idx, dx=2, h=3):
    H_, W_ = idx.shape; out = np.full((H_ + h, W_ + dx + 2), -1, dtype=idx.dtype); out[:H_, 1:W_ + 1] = idx
    ys, xs = np.where(idx >= 0); x0, x1 = xs.min() + 1, xs.max() + 1; yb = ys.max()
    for r in range(h):
        for x in range(x0 + r + 1, x1 + dx + 1 - r):
            if out[yb - 1 + r, x] < 0 and r >= 1: out[yb - 1 + r, x] = C["slate"]
    return out
for name in ("stone", "stone-plain2", "stone-warm1", "stone-warm2", "stone-charged1", "stone-charged2", "stone-step"):
    s = quant.quantize(np.asarray(Image.open(os.path.join(work, "props-rd", name + "-rd.png")).convert("RGBA"))); H_, W_ = s.shape
    if "charged" not in name: s = np.where(np.isin(s, [C["white"], C["bone"], C["paper"], C["cream"]]), C["fog"], s)   # no bright dashes on a plain stone: two of them read as eyes
    sil = s >= 0; rng = np.random.RandomState(abs(hash(name)) % 1000 if False else sum(map(ord, name)))
    if "warm" in name:
        # heat inside rock, not a glow: both frames are the plain stone (stone-plain2) silhouette (any warm pixels would be filled from the
        # neighbouring rock), and a thin jagged vein drawn across it: frame 1 (warm1) a dim rust vein with a few orange pixels, frame 2
        # (warm2) the same vein a step brighter with amber and a yellow spark at two points. No halo, no round core, no ground spill.
        base = quant.quantize(np.asarray(Image.open(os.path.join(work, "props-rd", "stone-plain2-rd.png")).convert("RGBA"))); H_, W_ = base.shape
        warmset = [C[n] for n in ("rust", "orange", "amber", "gold", "yellow", "cream", "clay", "peach", "coral", "red")]
        base = np.where(np.isin(base, [C["white"], C["bone"], C["paper"], C["cream"]]), C["fog"], base)
        rock = np.where(np.isin(base, warmset), -2, base)
        for _ in range(6):   # fill the removed pixels from the rock beside them
            for y in range(H_):
                for x in range(W_):
                    if rock[y, x] == -2:
                        nb = [rock[yy, xx] for yy in range(max(y - 1, 0), min(y + 2, H_)) for xx in range(max(x - 1, 0), min(x + 2, W_)) if rock[yy, xx] >= 0]
                        if nb: rock[y, x] = max(set(nb), key=nb.count)
        rock = np.where(rock == -2, C["rock"], rock)
        sil = rock >= 0; ys, xs = np.where(sil); y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
        rg = np.random.RandomState(7); pts = [(x0 + (x1 - x0) * 0.30, y0 + 4)]
        for t in (0.25, 0.5, 0.75, 1.0): pts.append((x0 + (x1 - x0) * (0.30 + 0.45 * t) + rg.randint(-2, 3), y0 + 4 + (y1 - y0 - 8) * t))
        path = [q for a_, b_ in zip(pts[:-1], pts[1:]) for q in line((int(a_[0]), int(a_[1])), (int(b_[0]), int(b_[1])))]
        # the vein is a little crooked: a one-pixel jog every few pixels
        path = [(x + (1 if (i // 4) % 2 else 0), y) for i, (x, y) in enumerate(path)]
        branch = [q for q in line((path[len(path) // 2][0], path[len(path) // 2][1]), (path[len(path) // 2][0] - 5, path[len(path) // 2][1] + 5))]
        s = rock.copy()
        dim = name == "stone-warm1"
        for i, (x, y) in enumerate(path):
            if 0 <= y < H_ and 0 <= x < W_ and sil[y, x]: s[y, x] = C["rust"] if (dim or i % 3) else C["orange"]
        for i, (x, y) in enumerate(path):
            if 0 <= y < H_ and 0 <= x < W_ and sil[y, x] and i % 5 == 2: s[y, x] = C["orange"] if dim else C["amber"]
        for i, (x, y) in enumerate(branch):
            if 0 <= y < H_ and 0 <= x < W_ and sil[y, x] and i > 0: s[y, x] = C["rust"]
        if not dim:
            for i in (len(path) // 3, 2 * len(path) // 3):
                x, y = path[i]
                if sil[y, x]: s[y, x] = C["yellow"]
        s = shadow(s)
    elif "charged" in name:
        s = np.where(np.isin(s, [C["tealD"], C["teal"], C["aqua"], C["mint"]]), C["rock"], s)
        ys, xs = np.where(sil); top, bot = ys.min() + 2, ys.max() - 3; mid = (xs.min() + xs.max()) // 2
        pts = [(mid + rng.randint(-3, 4), top)]
        for yv in np.linspace(top, bot, 5)[1:]: pts.append((int(mid + rng.randint(-5, 6)), int(yv)))
        path = [p for a, b in zip(pts[:-1], pts[1:]) for p in line(a, b)]
        big = np.full((H_ + 8, W_ + 8), -1, dtype=s.dtype); big[4:4 + H_, 4:4 + W_] = s
        for x, y in path:
            for dx, dy in ((-1, 0), (1, 0)):
                if 0 <= y + 4 < big.shape[0] and big[y + 4, x + 4 + dx] >= 0 and big[y + 4, x + 4 + dx] not in (C["white"],): big[y + 4, x + 4 + dx] = C["ice"]
        for x, y in path:
            if big[y + 4, x + 4] >= 0: big[y + 4, x + 4] = C["white"]
        bx, by = pts[2]; br = line((bx, by), (bx + (6 if rng.rand() < 0.5 else -6), by + 4))   # a branch
        for x, y in br:
            if 0 <= y + 4 < big.shape[0] and 0 <= x + 4 < big.shape[1] and big[y + 4, x + 4] >= 0: big[y + 4, x + 4] = C["sky"]
        for _ in range(5):   # sparks beside the stone
            x, y = int(rng.randint(2, W_ + 6)), int(rng.randint(3, H_ + 2))
            if big[y, x] < 0 and (big[max(y - 1, 0):y + 2, max(x - 2, 0):x + 3] >= 0).any(): big[y, x] = C["ice"]
        if name == "stone-charged2":   # frame 2 crackles: a cage of lightning branches off the whole silhouette (not one thin vein): seven zigzag arms, white core and ice flank, a spark at each tip
            big = np.pad(big, 11, constant_values=-1); sl = big >= 0; yy_, xx_ = np.where(sl); cxs, cys = xx_.mean(), yy_.mean(); rb = np.random.RandomState(9)
            for ang in (-170, -135, -95, -55, -15, 25, 160):
                a_ = np.radians(ang); dx_, dy_ = np.cos(a_), np.sin(a_)
                px_, py_ = cxs, cys
                while 0 <= int(py_) < big.shape[0] and 0 <= int(px_) < big.shape[1] and sl[int(py_), int(px_)]: px_ += dx_ * .5; py_ += dy_ * .5
                x, y = int(round(px_ - dx_)), int(round(py_ - dy_)); L = 9 + int(rb.randint(0, 4)); jag = 1
                for k in range(L):
                    if 0 <= y < big.shape[0] and 0 <= x < big.shape[1]:
                        if big[y, x] < 0 or big[y, x] != C["white"]: big[y, x] = C["white"]
                        for fx, fy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                            if 0 <= y + fy < big.shape[0] and 0 <= x + fx < big.shape[1] and big[y + fy, x + fx] < 0 and abs(fx) + abs(fy) == 1 and (k + fx + fy) % 2 == 0: big[y + fy, x + fx] = C["ice"]
                    px_ += dx_ * 1.0; py_ += dy_ * 1.0
                    if k % 2 == 1: jag = -jag; px_ += -dy_ * 1.6 * jag; py_ += dx_ * 1.6 * jag     # the zigzag
                    x, y = int(round(px_)), int(round(py_))
                if 0 <= y < big.shape[0] and 0 <= x < big.shape[1] and big[y, x] < 0: big[y, x] = C["sky"]
        s = shadow(big)
    elif name == "stone-step":
        s = np.pad(s, ((0, 2), (0, 0)), constant_values=-1); yb = np.where(s >= 0)[0].max()
        for x in np.where(s[yb] >= 0)[0]: s[yb + 1, x] = C["sea"]
    else:
        s = shadow(s)
    bb = quant.bbox((s >= 0) * 255); x0, y0, x1, y1 = bb; save(s[y0:y1, x0:x1], "props", name)
print("hand pass: stones x 7")
