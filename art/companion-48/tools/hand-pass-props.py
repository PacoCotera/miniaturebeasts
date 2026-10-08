"""The art director's hand pass on the bushes and the outposts, taken from the Retro Diffusion results (work/props-rd).
Bushes: the silhouette and the leaf texture of the result are kept; the volume is re-lit as a dome from the top left (a normal
from the silhouette's ellipse), and the value (the dome 55 %, the result's own leaf texture 45 %) is cut into four steps of the G
ramp (forest, leaf, grass, sprout), pine on the rim; the fruit are redrawn as 3 x 3 apples (peach catch-light, red, wine
shade); a shadow under it. Outposts: see the functions below.
usage: python3 -I hand-pass-props.py WORK_DIR"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import quant
P = quant.P; C = P.index; work = sys.argv[1]
def load(n): return quant.quantize(np.asarray(Image.open(os.path.join(work, "props-rd", n + "-rd.png")).convert("RGBA")))
def save(idx, n):
    bb = quant.bbox((idx >= 0) * 255); x0, y0, x1, y1 = bb; quant.save_indexed(idx[y0:y1, x0:x1], os.path.join(work, "props", n + ".png"))
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
def shadow(idx, dx=2, h=3):
    H_, W_ = idx.shape; out = np.full((H_ + h, W_ + dx + 2), -1, dtype=idx.dtype); out[:H_, 1:W_ + 1] = idx
    ys, xs = np.where(idx >= 0); x0, x1 = xs.min() + 1, xs.max() + 1; yb = ys.max(); inset = (x1 - x0) // 8
    for r in range(h):
        for x in range(x0 + inset + r + 1, x1 + dx + 1 - inset - r):
            if out[yb - 1 + r, x] < 0 and r >= 1: out[yb - 1 + r, x] = C["slate"]
    return out
G = [C["pine"], C["forest"], C["leaf"], C["grass"], C["sprout"], C["lime"]]
def bush(name, fruit=False):
    s = load(name); H_, W_ = s.shape; comps = sorted(components(s >= 0), key=lambda c: -len(c[0])); main = np.zeros((H_, W_), bool); main[comps[0][0], comps[0][1]] = True
    flecks = [c for c in comps[1:] if 2 <= len(c[0]) <= 40]                 # the leaves flying off a shaken bush
    ys, xs = np.where(main); cx, cy = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2; rx, ry = (xs.max() - xs.min() + 1) / 2, (ys.max() - ys.min() + 1) / 2
    # the leaf texture: the position of each pixel's colour in the G ramp, smoothed; where the result is not green (a berry) take its neighbours'
    tex = np.zeros((H_, W_)); ok = np.zeros((H_, W_), bool)
    for i, g in enumerate(G): tex[s == g] = i; ok[s == g] = True
    tex2 = tex.copy()
    for y in range(H_):
        for x in range(W_):
            if main[y, x]:
                nb = [tex[yy, xx] for yy in range(max(y - 1, 0), min(y + 2, H_)) for xx in range(max(x - 1, 0), min(x + 2, W_)) if ok[yy, xx]]
                tex2[y, x] = np.mean(nb) if nb else 2
    tn = (tex2 - tex2[main].min()) / max(np.ptp(tex2[main]), 1e-6)
    out = np.full((H_, W_), -1, dtype=np.int64)
    L = np.array([-0.45, -0.55, 0.70]); L /= np.linalg.norm(L)
    for y, x in zip(*np.where(main)):
        u, v = (x + 0.5 - cx - 0.5) / rx, (y + 0.5 - cy - 0.5) / ry; r2 = min(u * u + v * v, 1.0); nz = np.sqrt(1 - r2)
        lit = max(0.0, u * L[0] + v * L[1] + nz * L[2]); val = 0.55 * lit + 0.45 * tn[y, x]
        out[y, x] = G[1] if val < 0.30 else (G[2] if val < 0.52 else (G[3] if val < 0.76 else G[4]))
    # leaf clumps: the brightest texture pixels on the lit half get a sprout tip, the darkest a pine notch (the result's leaves, kept)
    hi = main & (tn > 0.82) & (np.mgrid[0:H_, 0:W_][1] < cx + rx * 0.3); lo = main & (tn < 0.10) & (np.mgrid[0:H_, 0:W_][0] > cy - ry * 0.3)
    out[hi & (out == G[3])] = G[4]; out[lo & (out == G[1])] = G[0]
    out = quant.outline(out)
    if fruit:
        rg = np.random.RandomState(sum(map(ord, name)))
        pts = []
        for _ in range(400):
            fx, fy = int(rg.randint(int(cx - rx * 0.7), int(cx + rx * 0.7))), int(rg.randint(int(cy - ry * 0.6), int(cy + ry * 0.5)))
            if main[fy - 1:fy + 2, fx - 1:fx + 2].all() and all(abs(fx - px) + abs(fy - py) > 8 for px, py in pts): pts.append((fx, fy))
            if len(pts) == 5: break
        for fx, fy in pts:
            for dx, dy, c in ((0, -1, "red"), (1, -1, "red"), (-1, 0, "red"), (0, 0, "red"), (1, 0, "wine"), (-1, 1, "red"), (0, 1, "wine"), (1, 1, "wine"), (-1, -1, "peach")):
                out[fy + dy, fx + dx] = C[c]
            out[fy - 2, fx] = C["forest"]   # the stalk
    for comp in flecks:
        for y, x in zip(*comp): out[y, x] = C["sprout"] if x < cx else C["grass"]
    out = shadow(out); save(out, name)
for nm, fr in (("bush", False), ("bush-fruit", True), ("bush-shaken", False)):
    if os.path.exists(os.path.join(work, "props-rd", nm + "-rd.png")): bush(nm, fr)
# ---- the outposts: a small built shelter. The silhouette and the strand structure of the result are kept; the colour is redone by role
# (the result's palette snap left green and purple strays in the thatch): the roof is a dome of thatch cut into four W-ramp steps (the dome
# 50 %, the result's own strand texture 50 %), the eaves a dark row, the walls vertical planks in two tones, and the door by state:
# lit: an open doorway full of light (cream core, yellow, amber, a dark frame) and a spill of light on the ground; dark: a closed plank door
# with a latch; dark2: the dark state one step down the ramp (the night version, a lamp-less door).
W_RAMPS = {"lit": ("sand", "clay", "bark", "soil"), "dark": ("sand", "clay", "bark", "soil"), "dark2": ("clay", "bark", "soil", "ink")}
def hut(name, state):
    s = load(name); H_, W_ = s.shape; comps = sorted(components(s >= 0), key=lambda c: -len(c[0])); main = np.zeros((H_, W_), bool); main[comps[0][0], comps[0][1]] = True
    ys, xs = np.where(main); y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max(); cx = (x0 + x1) / 2; rx = (x1 - x0 + 1) / 2
    roof_end = y0 + int(0.60 * (y1 - y0 + 1)); roofh = roof_end - y0
    luma = np.array([0.2126 * P.rgb[i][0] + 0.7152 * P.rgb[i][1] + 0.0722 * P.rgb[i][2] if i >= 0 else 0 for i in range(-1, 48)])  # index -1 -> luma 0
    lu = luma[s + 1]; tex = np.zeros((H_, W_))
    for y in range(H_):
        for x in range(W_):
            if main[y, x]:
                nb = [lu[yy, xx] for yy in range(max(y - 1, 0), min(y + 2, H_)) for xx in range(max(x - 1, 0), min(x + 2, W_)) if main[yy, xx]]; tex[y, x] = np.mean(nb)
    rr = main & (np.mgrid[0:H_, 0:W_][0] < roof_end); tn = (tex - tex[rr].min()) / max(np.ptp(tex[rr]), 1e-6)
    r_ = [C[n] for n in W_RAMPS[state]]; out = np.full((H_, W_), -1, dtype=np.int64)
    for y, x in zip(*np.where(main)):
        if y < roof_end:   # the roof: a dome lit from the top left
            u = (x + 0.5 - cx) / rx; v = (y - roof_end + roofh * 0.45) / (roofh * 0.9); nz = np.sqrt(max(0.0, 1 - min(u * u + v * v, 1)))
            lit = max(0.0, u * -0.45 + v * -0.55 + nz * 0.70); val = 0.5 * lit + 0.5 * tn[y, x]
            k = 3 if val < 0.28 else (2 if val < 0.50 else (1 if val < 0.72 else 0))
            if y > y0 + 4 and (y - y0 + int(abs(u) ** 2 * 3)) % 4 == 0: k = min(k + 1, 3)                    # the courses of thatch: a darker row, bowed with the dome
            elif y > y0 + 3 and (x * 7 + y * 3) % 11 == 0: k = max(k - 1, 0)                                   # a lighter strand tick here and there
            out[y, x] = r_[k]
        elif y == roof_end: out[y, x] = r_[3]                                         # the dark row under the eaves
        else:             # the walls: planks, a plank line every five pixels, lighter on the left
            plank = ((x - x0) % 5 == 0)
            out[y, x] = r_[3] if plank else (r_[1] if x < cx else r_[2])
    wall_top = roof_end + 2; dh = min(10, y1 - wall_top); dx0 = int(cx) - 4; dx1 = int(cx) + 3
    if state == "lit":
        for y in range(y1 - dh, y1 + 1):
            for x in range(dx0, dx1 + 1):
                if y == y1 - dh and x in (dx0, dx1): continue                              # the arch's corners
                edge = x in (dx0, dx1) or y == y1 - dh
                d = abs(x - (dx0 + dx1) / 2) / 4.0 + (y1 - y) / (dh + 1.0) * 0.6
                out[y, x] = C["soil"] if edge else (C["cream"] if d < 0.45 else (C["yellow"] if d < 0.75 else C["amber"]))
        out = quant.outline(out)
        sp = np.full((H_ + 3, W_), -1, dtype=np.int64); sp[:H_] = out
        for r_i, (hw, col) in enumerate(((7, "paper"), (5, "cream"))):                        # the spill of light on the ground
            for x in range(int(cx) - hw, int(cx) + hw):
                if sp[y1 + 1 + r_i, x] < 0: sp[y1 + 1 + r_i, x] = C[col]
        out = sp
    else:
        door = (C["bark"], C["soil"]) if state == "dark" else (C["soil"], C["ink"])
        for y in range(y1 - dh, y1 + 1):
            for x in range(dx0, dx1 + 1):
                if y == y1 - dh and x in (dx0, dx1): continue
                out[y, x] = door[1] if (x in (dx0, dx1) or y == y1 - dh or (x - dx0) % 3 == 0) else door[0]
        out[y1 - dh // 2, dx1 - 1] = C["gold"] if state == "dark" else C["bark"]            # the latch
        out = quant.outline(out)
    out = shadow(out) if state != "lit" else out
    save(out, name)
for nm, st in (("outpost-lit", "lit"), ("outpost-dark", "dark"), ("outpost-dark2", "dark2")):
    if os.path.exists(os.path.join(work, "props-rd", nm + "-rd.png")): hut(nm, st)
print("hand pass props: bushes, outposts")
