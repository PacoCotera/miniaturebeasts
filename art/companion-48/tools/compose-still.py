"""The composed 450x600 still: the review place (meadow and pond edge) in a storm, every piece at 1x.
HUD 32 / view 532 / bottom line 36; the ground and props through the STORM table (round 2: a blue cast, no DARK
step; --light plain for no table, --light dark for round 1's DARK step), the pawn and the mibis never; rain over
the view; the message box, the name tag, the key caps and the condition bolts from the ui sheet; the page's
bitmap font at 2x. usage: python3 -I compose-still.py WORK_DIR OUT.png [--light storm|plain|dark] [--hut A|B|C|D]"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import pal, quant, font
P = quant.P; C = P.index
work, outp = sys.argv[1], sys.argv[2]
light = sys.argv[sys.argv.index("--light") + 1] if "--light" in sys.argv else "storm"
hut = sys.argv[sys.argv.index("--hut") + 1] if "--hut" in sys.argv else None   # a hut option (A to D) in place of the outpost
def load(group, name):
    im = Image.open(os.path.join(work, group, name + ".png")).convert("RGBA"); return quant.quantize(np.asarray(im))
W, H, HUD, LINE = 450, 600, 32, 36; VIEW_Y, VIEW_H = HUD, H - HUD - LINE
scr = np.full((H, W), C["ink"], dtype=np.int64)
def blit(idx, x, y, table=None, clip=None):
    h, w = idx.shape
    src = idx if table is None else np.where(idx >= 0, np.array(table)[np.maximum(idx, 0)], -1)
    for yy in range(h):
        sy = y + yy
        if sy < 0 or sy >= H or (clip and not (clip[0] <= sy < clip[1])): continue
        for xx in range(w):
            sx = x + xx
            if 0 <= sx < W and src[yy, xx] >= 0: scr[sy, sx] = src[yy, xx]
def nine(name, x, y, w, h, corner=5):
    s = load("ui", name); S = s.shape[0]; mid = S - 2 * corner
    for yy in range(h):
        for xx in range(w):
            sx = xx if xx < corner else S - (w - xx) if xx >= w - corner else corner + (xx - corner) % mid
            sy = yy if yy < corner else S - (h - yy) if yy >= h - corner else corner + (yy - corner) % mid
            if s[sy, sx] >= 0 and 0 <= y + yy < H and 0 <= x + xx < W: scr[y + yy, x + xx] = s[sy, sx]
VIEW = (VIEW_Y, VIEW_Y + VIEW_H)
# ---- the place: 10 x 12 tiles, pond at the bottom right, cropped to the view
COLS, ROWS, TS = 10, 12, 48; OX, OY = -15, VIEW_Y - 22
water = [[(c >= 6 and r >= 7 and not (c == 6 and r == 7) and not (c == 6 and r == 11)) for c in range(COLS)] for r in range(ROWS)]
rng = np.random.RandomState(7)
vrng = np.random.RandomState(31)
var = [["b" if vrng.rand() < 0.5 else "" for c in range(COLS)] for r in range(ROWS)]   # the water variant of each cell, by a seeded hash
land = {(1, 0): "tall1", (6, 1): "tall2", (3, 2): "flowers1", (8, 5): "flowers2", (0, 7): "tall1", (4, 9): "flowers1", (5, 11): "tall2", (9, 3): "tall1"}
DARK = {"storm": P.storm, "plain": None, "dark": P.dark}[light]
for r in range(ROWS):
    for c in range(COLS):
        if water[r][c]:
            t = ("deep1" if (c >= 8 and r >= 9) else "water1") + var[r][c]
        else:
            m = (water[r - 1][c] if r > 0 else False) * 1 + (water[r][c + 1] if c < COLS - 1 else False) * 2 + (water[r + 1][c] if r < ROWS - 1 else False) * 4 + (water[r][c - 1] if c > 0 else False) * 8
            t = f"shore-{m:02d}-1" if m else land.get((c, r), f"grass{1 + rng.randint(4)}")
        blit(load("ground", t) if not t.startswith("shore") else load("shore", t), OX + c * TS, OY + r * TS, DARK, VIEW)
        if not water[r][c]:   # a land tile with no water on the two sides of a corner but water on that diagonal gets the diagonal corner over it
            def wat(rr, cc): return 0 <= rr < ROWS and 0 <= cc < COLS and water[rr][cc]
            for nm, dr, dc, a, b in (("ne", -1, 1, 1, 2), ("se", 1, 1, 2, 4), ("sw", 1, -1, 4, 8), ("nw", -1, -1, 8, 1)):
                if wat(r + dr, c + dc) and not (m & a) and not (m & b): blit(load("shore", f"shore-diag-{nm}-1"), OX + c * TS, OY + r * TS, DARK, VIEW)
# the deep water: a soft wavy edge instead of a tile boundary, deep1 drawn over the water where the pond falls away
for r in range(ROWS):
    for c in range(COLS):
        if not water[r][c] or c < 7 or r < 8: continue
        deep = load("ground", "deep1" + var[r][c]); tile = np.full((TS, TS), -1, dtype=np.int64)
        for yy in range(TS):
            for xx in range(TS):
                gx, gy = c * TS + xx, r * TS + yy
                if (gx - 7 * TS) + (gy - 8 * TS) + 6 * np.sin(gx / 11.0) + 5 * np.sin(gy / 9.0) > 2.2 * TS: tile[yy, xx] = deep[yy, xx]
        blit(tile, OX + c * TS, OY + r * TS, DARK, VIEW)
# ripples: sparse overlay sprites, never part of a tile: one candidate per 3x3 block of tiles from a seeded hash, only where the
# whole ring lies over water, so none repeats on the tile grid and none sits twice on the same spot
rrng = np.random.RandomState(48)
for br in range(0, ROWS, 3):
    for bc in range(0, COLS, 3):
        size, ox, oy, keep = 1 + rrng.randint(3), rrng.randint(0, 3 * TS), rrng.randint(0, 3 * TS), rrng.rand() < 0.75
        if not keep: continue
        rip = load("ripples", f"ripple-{size}-1"); h_, w_ = rip.shape
        x0, y0 = bc * TS + ox - w_ // 2, br * TS + oy - h_ // 2
        cells = {(int(yy // TS), int(xx // TS)) for yy in (y0, y0 + h_ - 1) for xx in (x0, x0 + w_ - 1)}
        if all(0 <= rr < ROWS and 0 <= cc < COLS and water[rr][cc] for rr, cc in cells): blit(rip, OX + x0, OY + y0, DARK, VIEW)
# ---- props by foot point (tile column, row, piece) and the pawn and mibis, sorted by foot
def sprite(group, name, cx, cy, table=None):
    idx = load(group, name); ys, xs = np.where(idx >= 0); fy = ys.max() + 1
    blit(idx, cx - idx.shape[1] // 2, cy - fy, table, VIEW)
def at(c, r, dx=0, dy=0): return OX + c * TS + TS // 2 + dx, OY + r * TS + TS - 2 + dy
FOLIAGE = None if light == "storm" else DARK   # art director, round 2: under the storm the canopies keep the G ramp and the lit stones their glow (no cast); the ground, water, plain stones and huts take it
things = [("props", "tree", at(2, 3, 0, 8), FOLIAGE), ("props", "bush", at(4, 1), FOLIAGE), ("props", "bush-fruit", at(7, 3), FOLIAGE), ("props", "bush-shaken", at(1, 8), FOLIAGE),
          ("props", "stone", at(5, 4), DARK), ("props", "stone-warm1", at(8, 4), FOLIAGE), ("props", "stone-charged1", at(3, 10), FOLIAGE),
          (("huts", f"hut-{hut}-lit", at(8, 1, 0, 6), DARK) if hut else ("props", "outpost-lit", at(8, 1, 0, 4), DARK)), ("props", "pod", at(1, 5), DARK), ("props", "dew-cup", at(5, 8), DARK), ("props", "reeds", at(9, 7, 0, -6), DARK), ("props", "stone-step", at(7, 10, 0, -4), DARK), ("props", "stone-plain2", at(6, 2, 8, 0), DARK),
          ("pawn", "pawn-down-walk2", at(4, 6), None), ("tokens", "loika-idle1", at(2, 6), None), ("tokens", "placeholder-S02", at(1, 10), None)]
blit(load("props", "strike-warn1"), OX + 6 * TS, OY + 5 * TS, None, VIEW)   # the warned strike lies on its tile, under everything that stands
for group, name, (cx, cy), table in sorted(things, key=lambda t: t[2][1]): sprite(group, name, cx, cy, table)
# the name tag over Loika, the message box at the view's top, the rain over all of it
tag_w = font.width("Loika", 2) + 12; tx, ty = at(2, 6)[0] - tag_w // 2, at(2, 6)[1] - 40 - 24
nine("slice-name-tag", tx, ty, tag_w, 22); font.draw(scr, "Loika", tx + 6, ty + 2, C["amber"], 2)
rain = load("weather", "rain-left-1")
for r in range(0, VIEW_H + 96, 96):
    for c in range(0, W + 96, 96): blit(rain, c, VIEW_Y + r, None, VIEW)
msg = "The rain sets in"; mw = font.width(msg, 2) + 16 + 12 + 10; mx, my = (W - mw) // 2, VIEW_Y + 8
nine("slice-message-box", mx, my, mw, 32); blit(load("ui", "icon-storm"), mx + 10, my + 8); font.draw(scr, msg, mx + 10 + 12 + 10, my + 7, C["bone"], 2)
# ---- HUD: shield plates, pod slots, the partner, then right-aligned counters, world turn, battery, radio
scr[HUD - 1, :] = C["night"]
for i in range(3): blit(load("ui", "icon-shield"), 6 + i * 19, 8)
blit(load("ui", "icon-pod"), 68, 8); blit(load("ui", "icon-free-slot"), 88, 8)
blit(load("ui", "icon-bond"), 112, 8); font.draw(scr, "Loika", 132, 7, C["amber"], 2)
rx = W - 6; rad = load("ui", "icon-radio"); rx -= rad.shape[1]; blit(rad, rx, 11); rx -= 6
bat = load("ui", "icon-battery"); rx -= bat.shape[1]; blit(bat, rx, 11); rx -= 10
lbl = "T5"; rx -= font.width(lbl, 2); font.draw(scr, lbl, rx, 7, C["fog"], 2); rx -= 18; blit(load("ui", "icon-world-turn"), rx, 8); rx -= 12
for icon, val in [("icon-essence", "2"), ("icon-data", "3"), ("icon-energy", "7")]:
    rx -= font.width(val, 2); font.draw(scr, val, rx, 7, C["bone"], 2); rx -= 19; blit(load("ui", icon), rx, 8); rx -= 8
# ---- the bottom line: [cap ✓ Call · cap ← Station] | Pond edge | storm bolts and drift
ly = H - LINE; scr[ly, :] = C["night"]; x = 8
cap = load("ui", "cap-confirm"); blit(cap, x, ly + 6); x += cap.shape[1] + 5; font.draw(scr, "Call", x, ly + 10, C["bone"], 2); x += font.width("Call", 2) + 7
font.draw(scr, "·", x, ly + 10, C["slate"], 2); x += font.width("·", 2) + 7
cap = load("ui", "cap-back"); blit(cap, x, ly + 6); x += cap.shape[1] + 3; font.draw(scr, "Station", x, ly + 10, C["fog"], 2); x += font.width("Station", 2)
x += 8; scr[ly + 8:ly + LINE - 6, x] = C["slate"]; x += 9
font.draw(scr, "Pond edge", x, ly + 10, C["mist"], 2)
bolt = load("ui", "icon-storm"); arrow = load("ui", "cond-storm-right"); ww = 2 * 13 + arrow.shape[1]; wx = W - 8 - ww
scr[ly + 8:ly + LINE - 6, wx - 9] = C["slate"]
for i in range(2): blit(bolt, wx + i * 13, ly + 9)
blit(arrow, wx + 26, ly + 9)
quant.save_indexed(scr, outp); print("wrote", outp)
