"""The hand pass on the pawn from study H: the Retro Diffusion frames (sources/rd-pawn-h, 48 px, remove_bg) taken to the pieces the way study H itself was
snapped, with the consistency pass over them: the stray blobs the service leaves in a frame removed (only the figure's connected mass and what touches it
stays), the palette snap onto the pawn's ramps (orange, wood and fur, ink and white, yellow, skin, lens blue), despeckled, outlined by the ramp rule (one
outline weight for every frame), the trousers made one colour in every facing (the service drew navy in the front and teal in the profile), the ground
shadow one shape under every frame (the service's own is removed and an ellipse of the same two rows set under the feet), the figure set so its lowest
pixel is the cell's foot line (y 46). The left facing is the right mirrored. Frames: down, right, up x walk1..3, creep1..3, react; the originals of H are the
down walk2 and the right walk1. Round 10: the strides and the raised arms are drawn by tools/pawn_limbs.py (H's head, torso and pack as one block, legs, boots and arms by hand on the indices).
usage: python3 -I pawn-h-pass.py RD_DIR OUT_DIR"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import quant, pal
P = quant.P; C = P.index; rd, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
allowed = pal.ramp_indices(P, "OWNYRB")
TROU = [C["stone"], C["slate"], C["night"]]   # one trouser ramp in every facing, lighter than the service's navy so the legs read against the shadow
# round 9: the coat one step lighter so it leaves the ground's grey on both light states (orange, luma 127, shared the rain ground's grey): amber body, orange shade, yellow light
COAT = list(range(len(P.names))); COAT[C["orange"]] = C["amber"]; COAT[C["rust"]] = C["orange"]; COAT[C["amber"]] = C["yellow"]
def largest(idx):
    m = idx >= 0; seen = np.zeros_like(m); comps = []
    for y0, x0 in zip(*np.where(m)):
        if seen[y0, x0]: continue
        st, comp = [(y0, x0)], []; seen[y0, x0] = True
        while st:
            y, x = st.pop(); comp.append((y, x))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < m.shape[0] and 0 <= xx < m.shape[1] and m[yy, xx] and not seen[yy, xx]: seen[yy, xx] = True; st.append((yy, xx))
        comps.append(np.array(comp))
    big = max(comps, key=len); keep = np.zeros_like(m); keep[big[:, 0], big[:, 1]] = True; return keep
def process(f):
    rgba = np.asarray(Image.open(f).convert("RGBA")).copy()
    idx = quant.quantize(rgba, allowed, alpha_thresh=110)
    idx = np.where(largest(idx), idx, -1)
    idx = np.where(idx >= 0, np.array(COAT)[np.maximum(idx, 0)], -1)
    idx = quant.despeckle(idx, 1); idx = quant.outline(idx)
    ys, xs = np.where(idx >= 0); y1 = ys.max() + 1
    # the trousers: every dark cool pixel in the legs' rows (the lower 30 % of the figure, above the boots) one colour set, by luminance
    H = ys.max() - ys.min() + 1; lowrows = ys.min() + int(H * 0.68)
    cool = {C[n] for n in ("tealD", "teal", "deep", "sea", "night", "slate", "ink", "stone", "plumD", "plum")}
    for y, x in zip(*np.where(np.isin(idx, list(cool)))):
        if y >= lowrows and y < y1 - 3:
            lum = 0.2126 * P.rgb[idx[y, x]][0] + 0.7152 * P.rgb[idx[y, x]][1] + 0.0722 * P.rgb[idx[y, x]][2]
            idx[y, x] = TROU[0] if lum > 70 else (TROU[1] if lum > 38 else TROU[2])
    return idx
def place(idx, lift=0):
    # the service's own ground shadow (dark pixels in the bottom two rows that are not boot colours) is dropped, then one shadow is set
    ys, xs = np.where(idx >= 0); x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    boots = {C["soil"], C["bark"], C["clay"], C["sand"], C["ink"], C["night"]}
    crop = idx[y0:y1, x0:x1].copy()
    for r in (crop.shape[0] - 1, crop.shape[0] - 2):
        for x in range(crop.shape[1]):
            if crop[r, x] in (C["night"], C["slate"], C["stone"]) and r > crop.shape[0] - 3: crop[r, x] = -1
    ys2, xs2 = np.where(crop >= 0); crop = crop[:ys2.max() + 1]; h, w = crop.shape
    cell = np.full((48, 48), -1, dtype=idx.dtype); ox = (48 - w) // 2; oy = 46 - 2 - h + 2 - 0      # the boots end on y 45; the shadow's two rows lie under and between the feet
    oy = 45 - h + 1 - 0
    oy = 44 - h + 1                                                                                     # the lowest boot pixel is row 44; rows 44 and 45 carry the shadow
    lift = max(0, min(lift, oy)); oy = max(oy, 0)
    cell[oy - lift:oy - lift + h, ox:ox + w] = crop[:48 - (oy - lift)]
    cx = ox + w // 2; yy, xx = np.mgrid[0:48, 0:48]
    sh = ((xx - cx) / 10.0) ** 2 + ((yy - 44.5) / 1.6) ** 2 <= 1
    cell[sh & (cell < 0)] = C["night"]
    return cell
# ---- the strides, drawn by hand on the palette indices (tools/pawn_limbs.py): H's head, torso and pack are kept as one block, the legs, boots and arms are drawn
import pawn_limbs as L
frames = {}
raw = lambda facing, st: os.path.join(rd, f"C48-W-r9-{facing}-{st}-rd.png")
orig = {("down", "walk2"): os.path.join(rd, "H-down-original-rd.png"), ("right", "walk1"): os.path.join(rd, "H-right-original-rd.png")}
P_ = {}
for facing in ("down", "right", "up"):
    for st in ("walk1", "walk2", "walk3", "creep1", "creep2", "creep3", "react"):
        f = orig.get((facing, st), raw(facing, st))
        if os.path.exists(f): P_[(facing, st)] = process(f)
for key, idx in P_.items(): frames[key] = place(idx, lift=2 if key[1] == "react" else 0)
def cells(facing, st): return frames[(facing, st)]
down, upb, side = L.ruff_front(frames[("down", "walk2")]), L.ruff_back(frames[("up", "walk2")]), frames[("right", "walk1")].copy()
D = dict(leg_top=33, left_x=19, right_x=25, boot_rows=(43, 46)); U = dict(leg_top=34, left_x=19, right_x=25, boot_rows=(43, 46))   # the front sole on row 45, the back sole (lifted 2) on row 43, both on the shadow
xx_, yy_ = np.meshgrid(np.arange(48), np.arange(48))
for facing, base, S in (("down", down, D), ("up", upb, U)):
    for st, kw in (("walk2", dict()), ("walk1", dict(body_dy=1, r_dy=-2, r_dx=1, arm_l=2, arm_r=-2)), ("walk3", dict(body_dy=1, l_dy=-2, l_dx=1, arm_l=-2, arm_r=2)),
                   ("creep1", dict(body_dy=3, l_dy=-2, l_dx=1, r_dx=1, top_dy=1 if facing == "down" else 0)), ("creep2", dict(body_dy=2, l_dx=1, r_dx=1, top_dy=1 if facing == "down" else 0)),
                   ("creep3", dict(body_dy=3, r_dy=-2, l_dx=1, r_dx=1, top_dy=1 if facing == "down" else 0))):          # knees bent forward, not out (no knee out), a one-row bob on creep2
        frames[(facing, st)] = L.fb_pose(base, **S, **kw)
bu = upb.copy(); bu[(yy_ >= 19) & ((xx_ <= 16) | (xx_ >= 31))] = -1                      # up react: the sleeves are taken off and drawn again raised
r = L.fb_pose(bu, **U, body_dy=-2, l_dy=-2, r_dy=-2, arms=(24, 24)); L.limb(r, [(16, 21), (13, 16), (12, 11)], 4); L.limb(r, [(31, 21), (34, 16), (35, 11)], 4); frames[("up", "react")] = r
# right: the passing pose, the second contact (the near leg forward), the creeps with bent knees and the hood three rows down, and the react from H's own head and torso
SD = lambda **k: L.side_pose(side, **k)
def SW(sw, **k):                                                      # a side frame with the near sleeve in the coat's orange shade down the hip and the mitten showing 2 px past the coat's edge: forward (+) or back (-)
    r = SD(**k); by = k.get("body_dy", 0)
    for y in range(26, 32):
        for x in (28, 29):
            if r[y + by, x] >= 0: r[y + by, x] = C["orange"]
    mx = 32 if sw > 0 else 15
    for dy in (0, 1):
        for dx in (0, 1): r[30 + by + dy, mx + dx] = C["bark"] if dy == 0 else C["soil"]
    return r
frames[("right", "walk1")] = SW(2, far=[(23, 34), (27, 38), (29, 41)], far_ankle=(29, 41), near=[(22, 34), (18, 38), (17, 41)], near_ankle=(17, 41))   # walk3's open V with the legs swapped, both soles on row 43
frames[("right", "walk2")] = SW(2, body_dy=-1, far=[(24, 33), (24, 36), (25, 38)], far_ankle=(25, 39), near=[(23, 33), (23, 37), (23, 41)], near_ankle=(23, 41))   # the passing pose: the far foot under the hip, its sole two rows off the ground, behind the planted leg
frames[("right", "walk3")] = SW(-2, far=[(23, 34), (19, 38), (17, 41)], far_ankle=(17, 41), near=[(22, 34), (26, 38), (29, 41)], near_ankle=(29, 41))
def crouch(bd, lean, near_ax, far_ax):                                # creeps: hood three rows down, the top half leaned toward the facing, knees bent FORWARD of the ankles, a one-row bob (bd)
    h = 34 + bd; km = (h + 41) // 2
    return SW(0, body_dy=bd, lean=lean, near=[(22, h), (near_ax + 4, km), (near_ax, 41)], near_ankle=(near_ax, 41), far=[(23, h), (far_ax + 4, km), (far_ax, 41)], far_ankle=(far_ax, 41))
frames[("right", "creep1")] = crouch(3, 3, 26, 18); frames[("right", "creep2")] = crouch(2, 2, 24, 22); frames[("right", "creep3")] = crouch(3, 3, 18, 26)
r = SD(body_dy=-2, far=[(23, 32), (24, 36), (24, 39)], far_ankle=(24, 39), near=[(22, 32), (22, 36), (22, 39)], near_ankle=(22, 39))
L.limb(r, [(30, 23), (35, 18), (36, 12)], 3); L.limb(r, [(18, 21), (13, 17), (12, 11)], 3); frames[("right", "react")] = r
dr = frames[("down", "react")].copy(); dr[dr == C["fog"]] = C["sand"]; dr[38:] = -1                                          # down react: the plank under the feet (a skateboard) is out; the legs and boots are drawn again, a clean hop over the shadow
frames[("down", "react")] = L.fb_pose(dr, leg_top=31, left_x=18, right_x=26, boot_rows=(40, 43), arms=(47, 47))
for (facing, st), cell in frames.items():
    quant.save_indexed(cell, os.path.join(out, f"pawn-{facing}-{st}.png"))
    if facing == "right": quant.save_indexed(cell[:, ::-1].copy(), os.path.join(out, f"pawn-left-{st}.png"))
print("pawn from H:", len(frames), "frames (+ the left mirrored)")
