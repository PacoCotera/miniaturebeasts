"""The art director's hand pass on single pieces, scripted so it can be re-run: thin grass2's repeating motif, redraw the dew
cup so it reads at 1x, and derive the creep frames from the walk frames as a crouch (shorter body, head forward).
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
# ---- creep: the walk frames as a crouch. Rows are cut from the body (below the head) so the figure stands lower, then the
# upper part is shifted toward the facing; the foot stays at y 46.
for facing in ("down", "up", "left", "right"):
    for k in (1, 2, 3):
        w = load("pawn", f"pawn-{facing}-walk{k}"); bb = quant.bbox((w >= 0) * 255); x0, y0, x1, y1 = bb; fig = w[y0:y1, x0:x1]; h = fig.shape[0]
        head = int(h * 0.42); keep = list(range(h)); cuts = [head + 3, head + 7, head + 11]
        rows = [r for r in range(h) if r not in cuts]; fig2 = fig[rows]; h2 = fig2.shape[0]
        lean = {"left": -1, "right": 1}.get(facing, 0); fig2 = np.pad(fig2, ((0, 0), (4, 4)), constant_values=-1); out = np.full_like(fig2, -1)
        for r in range(h2):
            sh = lean * (2 if r < head else (1 if r < head + 8 else 0)); out[r] = np.roll(fig2[r], sh) if sh else fig2[r]
        if facing in ("down", "up") and k != 2: out = np.roll(out, 1 if k == 1 else -1, axis=1)   # the crouch rocks side to side
        cell = np.full(w.shape, -1, dtype=w.dtype); fy = 46; cell[fy - h2:fy, x0 - 4:x0 - 4 + out.shape[1]] = out
        save(cell, "pawn", f"pawn-{facing}-creep{k}")
print("hand pass: grass2, dew-cup, creep x 12")
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
    sil = s >= 0; rng = np.random.RandomState(abs(hash(name)) % 1000 if False else sum(map(ord, name)))
    if "warm" in name:
        warm = np.isin(s, [C["rust"], C["orange"], C["amber"], C["gold"], C["yellow"], C["cream"]])
        # the outer ring: warm pixels within 2 px of the silhouette edge go back to stone
        edge = np.zeros_like(sil)
        for y in range(H_):
            for x in range(W_):
                if sil[y, x] and any(not (0 <= y + dy < H_ and 0 <= x + dx < W_) or not sil[y + dy, x + dx] for dy in range(-2, 3) for dx in range(-2, 3)): edge[y, x] = True
        s = np.where(warm & edge, C["rock"], s)
        # the core's colours by the distance from its centre: yellow, amber, orange, rust
        ys, xs = np.where(np.isin(s, [C["rust"], C["orange"], C["amber"], C["gold"], C["yellow"], C["cream"]]))
        if len(xs):
            cx, cy = np.median(xs), np.median(ys); rr = max(np.hypot(xs - cx, ys - cy).max(), 1)
            for y, x in zip(ys, xs):
                d = np.hypot(x - cx, y - cy) / rr; s[y, x] = C["cream"] if d < 0.25 else (C["yellow"] if d < 0.5 else (C["amber"] if d < 0.72 else (C["orange"] if d < 0.9 else C["rust"])))
        s = shadow(s)
        yb = np.where(s >= 0)[0].max()   # a warm spill on the ground: two clay pixels either side under the stone
        xs2 = np.where(s[yb] >= 0)[0]; s[yb, max(xs2.min() - 1, 0)] = C["clay"]; s[yb, min(xs2.max() + 1, s.shape[1] - 1)] = C["clay"]
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
        s = shadow(big)
    elif name == "stone-step":
        s = np.pad(s, ((0, 2), (0, 0)), constant_values=-1); yb = np.where(s >= 0)[0].max()
        for x in np.where(s[yb] >= 0)[0]: s[yb + 1, x] = C["sea"]
    else:
        s = shadow(s)
    bb = quant.bbox((s >= 0) * 255); x0, y0, x1, y1 = bb; save(s[y0:y1, x0:x1], "props", name)
print("hand pass: stones x 7")
