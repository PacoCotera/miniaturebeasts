"""The hand pass on the pawn from study H: the Retro Diffusion frames (sources/rd-pawn-h, 48 px, remove_bg) taken to the pieces the way study H itself was
snapped, with the consistency pass over them: the stray blobs the service leaves in a frame removed (only the figure's connected mass and what touches it
stays), the palette snap onto the pawn's ramps (orange, wood and fur, ink and white, yellow, skin, lens blue), despeckled, outlined by the ramp rule (one
outline weight for every frame), the trousers made one colour in every facing (the service drew navy in the front and teal in the profile), the ground
shadow one shape under every frame (the service's own is removed and an ellipse of the same two rows set under the feet), the figure set so its lowest
pixel is the cell's foot line (y 46). The left facing is the right mirrored. Frames: down, right, up x walk1..3, creep1..3, react; the originals of H are the
down walk2 and the right walk1.
usage: python3 -I pawn-h-pass.py RD_DIR OUT_DIR"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import quant, pal
P = quant.P; C = P.index; rd, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
allowed = pal.ramp_indices(P, "OWNYRB")
TROU = [C["stone"], C["slate"], C["night"]]   # one trouser ramp in every facing, lighter than the service's navy so the legs read against the shadow
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
# ---- the hand-derived poses, from H's own parts (never from the older pawns): the service keeps the character but barely moves a stride on the front and the
# back, and on a few frames it redraws the character; those poses are made here by moving the parts of the figure on the palette indices.
def fig(idx):
    ys, xs = np.where(idx >= 0); return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
def moved(idx, sel, dx, dy):
    out = idx.copy(); out[sel] = -1
    ys, xs = np.where(sel)
    for y, x in zip(ys, xs):
        if 0 <= y + dy < 48 and 0 <= x + dx < 48: out[y + dy, x + dx] = idx[y, x]
    return out
def walk_op(idx, lift_l=0, lift_r=0, arm_l=0, arm_r=0):
    x0, y0, x1, y1 = fig(idx); H = y1 - y0; cx = (x0 + x1) // 2; yy, xx = np.mgrid[0:48, 0:48]
    legs = (idx >= 0) & (yy >= y0 + int(H * 0.72)); out = idx.copy()
    for sel, lift in ((legs & (xx < cx), lift_l), (legs & (xx >= cx), lift_r)):
        if lift: out = moved(out, sel & (out >= 0), 0, -lift)
    torso = (idx >= 0) & (yy >= y0 + int(H * 0.40)) & (yy < y0 + int(H * 0.72))
    for sel, d in ((torso & (xx < cx - 8), arm_l), (torso & (xx >= cx + 8), arm_r)):
        if d: out = moved(out, sel & (out >= 0), 0, d)
    return out
def crouch_op(idx, n=3, lean=0, lift_l=0, lift_r=0):
    x0, y0, x1, y1 = fig(idx); H = y1 - y0; rows = [y0 + int(H * f) for f in np.linspace(0.58, 0.70, n)]
    keep = [y for y in range(y0, y1) if y not in rows]; out = np.full_like(idx, -1)
    for i, y in enumerate(keep): out[y1 - len(keep) + i] = idx[y]
    if lean:   # the upper body leans forward: the rows above the belt move toward the facing, a little more the higher they are
        top = y1 - len(keep); res = np.full_like(out, -1)
        for y in range(top, y1):
            d = int(round(lean * max(0.0, (top + (y1 - top) * 0.55 - y) / ((y1 - top) * 0.55)))); res[y] = np.roll(out[y], d)
        out = res
    if lift_l or lift_r: out = walk_op(out, lift_l=lift_l, lift_r=lift_r)
    return out
def react_op(idx):
    x0, y0, x1, y1 = fig(idx); H = y1 - y0; cx = (x0 + x1) // 2; yy, xx = np.mgrid[0:48, 0:48]
    torso = (idx >= 0) & (yy >= y0 + int(H * 0.40)) & (yy < y0 + int(H * 0.74)); out = idx.copy()
    for sel, dx in ((torso & (xx < cx - 8), -1), (torso & (xx >= cx + 8), 1)): out = moved(out, sel & (out >= 0), dx, -7)
    return out
frames = {}
raw = lambda facing, st: os.path.join(rd, f"C48-W-r9-{facing}-{st}-rd.png")
orig = {("down", "walk2"): os.path.join(rd, "H-down-original-rd.png"), ("right", "walk1"): os.path.join(rd, "H-right-original-rd.png")}
P_ = {}
for facing in ("down", "right", "up"):
    for st in ("walk1", "walk2", "walk3", "creep1", "creep2", "creep3", "react"):
        f = orig.get((facing, st), raw(facing, st))
        if os.path.exists(f): P_[(facing, st)] = process(f)
# which frames are the service's and which are derived (the service's frame stands where it keeps the character and moves the pose)
CHOICE = {("down", "walk1"): ("walk", ("down", "walk2"), dict(lift_l=3, arm_l=2, arm_r=-2)), ("down", "walk3"): ("walk", ("down", "walk2"), dict(lift_r=3, arm_l=-2, arm_r=2)),
          ("down", "creep1"): ("crouch", ("down", "walk2"), dict(n=3, lift_l=1)), ("down", "creep2"): ("crouch", ("down", "walk2"), dict(n=4)), ("down", "creep3"): ("crouch", ("down", "walk2"), dict(n=3, lift_r=1)),
          ("up", "walk1"): ("walk", ("up", "walk2"), dict(lift_l=3, arm_l=2, arm_r=-2)), ("up", "walk3"): ("walk", ("up", "walk2"), dict(lift_r=3, arm_l=-2, arm_r=2)),
          ("up", "creep1"): ("crouch", ("up", "walk2"), dict(n=3, lift_l=1)), ("up", "creep3"): ("crouch", ("up", "walk2"), dict(n=3, lift_r=1)), ("up", "react"): ("react", ("up", "walk2"), {}),
          ("right", "creep1"): ("crouch", ("right", "walk2"), dict(n=3, lean=1)), ("right", "creep2"): ("crouch", ("right", "walk2"), dict(n=4, lean=1)), ("up", "creep2"): ("crouch", ("up", "walk2"), dict(n=4)), ("right", "creep3"): ("crouch", ("right", "walk3"), dict(n=3, lean=2))}
USE_SERVICE = set(os.environ.get("PAWN_H_SERVICE", "").split(","))   # frames (facing-state) kept from the service although a derivation exists
for (facing, st), (op, src, kw) in CHOICE.items():
    if f"{facing}-{st}" in USE_SERVICE or src not in P_: continue
    P_[(facing, st)] = {"walk": walk_op, "crouch": crouch_op, "react": react_op}[op](P_[src], **kw)
for key, idx in P_.items(): frames[key] = place(idx, lift=2 if key[1] == "react" else 0)
for (facing, st), cell in frames.items():
    quant.save_indexed(cell, os.path.join(out, f"pawn-{facing}-{st}.png"))
    if facing == "right": quant.save_indexed(cell[:, ::-1].copy(), os.path.join(out, f"pawn-left-{st}.png"))
print("pawn from H:", len(frames), "frames (+ the left mirrored)")
