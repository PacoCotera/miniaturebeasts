"""The composed 450x600 still: the review place (meadow and pond edge), every piece at 1x, in one of the ground's two light states (round 9: ONE lime tile set, two
states through tables, P.rain and P.clear in pal.py): --state rain (the default: the forest-green ground with the storm cast, rain over the view) or --state clear
(the lime ground warmed one step, no rain, the rain over). HUD 32 / view 532 / bottom line 36; the pawn and the mibis never go through a table; the outpost's patch of
grass takes the ground's state; the message box, the name tag, the key caps and the condition bolts from the ui sheet; the page's bitmap font at 2x.
usage: python3 -I compose-still.py WORK_DIR OUT.png [--state rain|clear] [--hut A|B|C|D]"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import pal, quant, font
P = quant.P; C = P.index
work, outp = sys.argv[1], sys.argv[2]
state = sys.argv[sys.argv.index("--state") + 1] if "--state" in sys.argv else "rain"
RAIN = state == "rain"
GDIR, SDIR = "ground", "shore"
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
water = [[(c >= 8 and r >= 9 and not (c == 8 and r == 9)) for c in range(COLS)] for r in range(ROWS)]   # a small pond in the bottom right corner, out of the group's way
rng = np.random.RandomState(7)
vrng = np.random.RandomState(31)
var = [["b" if vrng.rand() < 0.5 else "" for c in range(COLS)] for r in range(ROWS)]   # the water variant of each cell, by a seeded hash
land = {(1, 0): "tall1", (6, 1): "tall2", (3, 2): "flowers1", (8, 5): "flowers2", (0, 7): "tall1", (4, 9): "flowers1", (5, 11): "tall2", (9, 3): "tall1"}
GT = DARK = P.rain if RAIN else P.clear
HUTT = P.ground_rain if RAIN else P.ground_clear    # the outpost's patch of grass takes the ground's state; the thatch and wood do not move
for r in range(ROWS):
    for c in range(COLS):
        if water[r][c]:
            t = ("deep1" if (c >= 9 and r >= 10) else "water1") + var[r][c]
        else:
            m = (water[r - 1][c] if r > 0 else False) * 1 + (water[r][c + 1] if c < COLS - 1 else False) * 2 + (water[r + 1][c] if r < ROWS - 1 else False) * 4 + (water[r][c - 1] if c > 0 else False) * 8
            t = f"shore-{m:02d}-1" if m else land.get((c, r), f"grass{1 + rng.randint(4)}")
        blit(load(GDIR, t) if not t.startswith("shore") else load(SDIR, t), OX + c * TS, OY + r * TS, GT, VIEW)
        if not water[r][c]:   # a land tile with no water on the two sides of a corner but water on that diagonal gets the diagonal corner over it
            def wat(rr, cc): return 0 <= rr < ROWS and 0 <= cc < COLS and water[rr][cc]
            for nm, dr, dc, a, b in (("ne", -1, 1, 1, 2), ("se", 1, 1, 2, 4), ("sw", 1, -1, 4, 8), ("nw", -1, -1, 8, 1)):
                if wat(r + dr, c + dc) and not (m & a) and not (m & b): blit(load(SDIR, f"shore-diag-{nm}-1"), OX + c * TS, OY + r * TS, GT, VIEW)
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
FOLIAGE = None   # art director, round 2: under the storm the canopies keep the G ramp, the lit stones their glow and the outpost its wood and thatch (no cast); the ground, water and plain stones take it
# the staging, after the concept: ONE focal event, the crackling charged stone (its second frame) and the warned strike's ring beside it, with the pawn
# a tile away facing them along the same row, Loika by the pawn; everything else is background and kept small and to the edges
# ONE light direction (from the top left: every shadow falls to the lower right). The event is laid on a diagonal by PLACEMENT, as the concept's is: the tree at the upper left, the pawn and Loika
# at the trunk's edge in the tree's shade, the warned ring on the tile beyond them, the big charged stone at the lower right of the ring
CAN = P.canopy_rain if RAIN else None                  # the bushes one green step deeper in rain
TRT = P.tree_rain if RAIN else None                    # the tree's rain canopy: body pine, clumps forest, leaf only on the clumps' top-left edges
HUT = (OX + int(2.5 * TS), OY + 4 * TS - 2)                 # the hut at the explorer's scale: 144 px = three whole tiles (tile columns 1 to 3), its foot on the bottom of tile row 3
TREE = at(5, 4, 0, 8); PAWN = (TREE[0] + 34, TREE[1] + 40); LOIKA = (TREE[0] + 78, TREE[1] + 46); RING = (7, 6); STONE = at(8, 7, 4, 6)
things = [("props", "stone-charged2", STONE, FOLIAGE), ("pawn", "pawn-right-walk2", PAWN, None), ("tokens", "loika-idle1", LOIKA, None), ("props", "tree", TREE, TRT),
          (("huts", f"hut-{hut}-lit", HUT, DARK) if hut else ("props", "outpost-lit", HUT, HUTT)),
          ("props", "bush", at(7, 1), CAN), ("props", "bush-fruit", at(9, 5), CAN), ("props", "bush-shaken", at(1, 9), CAN),
          ("props", "dew-cup", at(2, 10), GT), ("props", "reeds", at(7, 10, 0, -6), GT), ("props", "stone-step", at(6, 10, 0, -4), GT)]
# shades are Bayer-dithered pools through the ground's shade table, never a hard ellipse with a rim: a 4 x 4 ordered dither whose density falls off from the pool's centre.
# The tree's pool lies under the canopy and to its lower right; the stone and the hut have contact shadows 2 to 3 rows deep to the lower right.
SH = np.array(P.dark if RAIN else P.shade_clear)
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0
def pool(cx, cy, rx, ry, peak=0.95, skew=0.0):
    for yy_ in range(max(VIEW[0], int(cy - ry)), min(VIEW[1], int(cy + ry) + 1)):
        for xx_ in range(max(0, int(cx - rx)), min(W, int(cx + rx) + 1)):
            r = (((xx_ - cx) / rx) ** 2 + ((yy_ - cy) / ry) ** 2) ** .5
            d = peak * max(0.0, 1.0 - r) ** 0.8
            if d > BAYER[yy_ % 4, xx_ % 4] and scr[yy_, xx_] != C["ink"]: scr[yy_, xx_] = SH[scr[yy_, xx_]]
pool(TREE[0] + 38, TREE[1] + 22, 118, 56)
pool(STONE[0] + 12, STONE[1] - 1, 34, 6.5, 0.98)
pool(HUT[0] + 16, HUT[1] - 2, 80, 8.0, 0.98)
blit(load("props", "strike-warn2"), OX + RING[0] * TS, OY + RING[1] * TS, None, VIEW)   # the warned strike lies on its tile, under everything that stands
for group, name, (cx, cy), table in sorted(things, key=lambda t: t[2][1]): sprite(group, name, cx, cy, table)
# the name tag over Loika, the message box at the view's top, the rain over all of it
# the name tag follows design/style-guide/companion-screens.md, "Name tag placement": the clear zone is the token's whole 48 px cell plus any pixel drawn outside it, plus 4 px; the tag (22 px tall)
# goes to the first of below, right, left, above, then below slid sideways, that stays inside the view (x 6 to 444, y 38 to 558) and covers no other creature's clear zone, the pawn, the HUD,
# the bottom line or the message box
tag_w = font.width("Loika", 2) + 12; TH = 22
def zone(foot, name, group):
    sp = load(group, name); ys_, xs_ = np.where(sp >= 0); h_, w_ = sp.shape
    return (foot[0] - max(24, w_ // 2) - 4, foot[1] - max(48, h_) - 4, foot[0] + max(24, w_ // 2) + 4, foot[1] + 4)
LZ = zone(LOIKA, "loika-idle1", "tokens"); PZ = zone(PAWN, "pawn-right-walk2", "pawn")
def hits(r, z): return not (r[2] <= z[0] or r[0] >= z[2] or r[3] <= z[1] or r[1] >= z[3])
MSG = ((W - (font.width("The rain sets in", 2) + 38)) // 2 - 2, VIEW_Y + 6, (W + (font.width("The rain sets in", 2) + 38)) // 2 + 2, VIEW_Y + 42)
def clear(r): return r[0] >= 6 and r[2] <= 444 and r[1] >= 38 and r[3] <= 558 and not hits(r, LZ) and not hits(r, PZ) and not hits(r, MSG)
lcx = LOIKA[0]; cands = [(lcx - tag_w // 2, LZ[3] + 4), (LZ[2] + 4, LOIKA[1] - 24 - TH // 2), (LZ[0] - 4 - tag_w, LOIKA[1] - 24 - TH // 2), (lcx - tag_w // 2, LZ[1] - 4 - TH)]
for sx in range(-120, 121, 2): cands.append((lcx - tag_w // 2 + sx, LZ[3] + 4))
tx = ty = None
for cx_, cy_ in cands:
    if clear((cx_, cy_, cx_ + tag_w, cy_ + TH)): tx, ty = cx_, cy_; break
if tx is not None: nine("slice-name-tag", tx, ty, tag_w, 22); font.draw(scr, "Loika", tx + 6, ty + 2, C["amber"], 2)
rain = load("weather", "rain-left-1")
for r in range(0, VIEW_H + 96, 96):
    for c in range(0, W + 96, 96):
        if RAIN: blit(rain, c, VIEW_Y + r, None, VIEW)
msg = "The rain sets in" if RAIN else "The rain has passed"; mw = font.width(msg, 2) + 16 + 12 + 10; mx, my = (W - mw) // 2, VIEW_Y + 8
nine("slice-message-box", mx, my, mw, 32); blit(load("ui", "icon-storm" if RAIN else "icon-essence"), mx + 10, my + 8); font.draw(scr, msg, mx + 10 + 12 + 10, my + 7, C["bone"], 2)
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
if RAIN:
    bolt = load("ui", "icon-storm"); arrow = load("ui", "cond-storm-right"); ww = 2 * 13 + arrow.shape[1]; wx = W - 8 - ww
    scr[ly + 8:ly + LINE - 6, wx - 9] = C["slate"]
    for i in range(2): blit(bolt, wx + i * 13, ly + 9)
    blit(arrow, wx + 26, ly + 9)
quant.save_indexed(scr, outp); print("wrote", outp)
