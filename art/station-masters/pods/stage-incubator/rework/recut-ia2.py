"""IA2 (T-20261015-07): room-bench-stage-incubator recut onto the layout spec's grid, same id, 1024x522 at (0, 40); slice y = screen y - 40.
No restyle: the T-01 pixels are moved, never repainted.
1. Tone: the wall under the objects and their shadows (hand rects, grown) is filled harmonically (Laplace, coarse to fine, Neumann
   at the wall's seams) from the bare wall around it; the floor line's row profile (rows 470-506) is put back into the fill.
2. Layers: an object with its cast shadow is every pixel deviating from the tone by more than 3 (mean), ramped to full at 8;
   each pixel goes to the object whose assignment rect holds it. A layer is its deviation from the tone (object, shadow and the grain
   under them).
3. The places the layers leave are repainted as tone + the wall's own grain (high-passed, clamped to 8, from bare wall at an offset);
   everything else stays pixel for pixel. Each layer is laid back at its move on the tone there.
   - The left column (-10, +12) loses 4 riser rows between its two lower clamps (CUT), so its lower part moves (-10, +8).
   - The hoses keep their wall ends; their base ends rise 16 px (the base 456 -> 440) through a vertical shift ramped along the last
     bend only (left: x RAMP_L, right: x RAMP_R).
usage: python3 -I recut-ia2.py STAGE.png OUT.png [DEBUG_DIR]"""
import sys, os, numpy as np
from PIL import Image
from scipy import ndimage as nd

src, out = sys.argv[1:3]; dbg = sys.argv[3] if len(sys.argv) > 3 else None
st = np.asarray(Image.open(src).convert('RGB')).astype(float); H, W = st.shape[:2]
WX0, WX1, WY0, WY1 = 72, 952, 24, 507                 # the wall inside its seams (slice), exclusive ends
win = (slice(WY0, WY1), slice(WX0, WX1))
FILL = [(84, 44, 300, 300), (84, 290, 254, 374), (236, 286, 362, 388), (676, 276, 808, 402), (780, 44, WX1, 224),
        (84, 420, 184, WY1), (764, 420, 862, WY1), (856, 420, WX1, WY1), (WX0, 368, 366, WY1), (632, 368, WX1, WY1)]
# each object's ink now (the spec's screen boxes, grown 4, as slice rects) and its move (dx, dy); the hoses are the rest of the ink
# in their rects. Every layer pixel belongs to the object with the nearest ink (so a shadow goes with the object that casts it).
OBJ = [('col', (94, 48, 231, 356), (-10, 12)), ('LM', (246, 293, 329, 354), (3, -1)), ('RM', (689, 289, 752, 361), (3, 3)),
       ('R', (792, 54, 939, 172), (1, 6)), ('GL', (89, 424, 165, 491), (-5, 3)), ('GR1', (770, 423, 846, 491), (10, 3)),
       ('GR2', (860, 423, 935, 491), (5, 3)), ('hoseL', (WX0, 376, 366, WY1), None), ('hoseR', (632, 376, WX1, WY1), None)]
CUT = 284                  # first of the 4 riser rows taken out (slice), between the clamps at 232 and 303
RAMP_L, RAMP_R, LIFT = (196, 296), (700, 772), 16

def harmonic(t, inside, iters):
    t = t.copy()
    for _ in range(iters):
        p = np.pad(t, ((1, 1), (1, 1), (0, 0)), mode='edge')
        avg = (p[:-2, 1:-1] + p[2:, 1:-1] + p[1:-1, :-2] + p[1:-1, 2:]) / 4
        t[inside] = avg[inside]
    return t
def rs(a, size):
    return np.stack([np.asarray(Image.fromarray(a[..., c].astype(np.float32)).resize(size, Image.BILINEAR)) for c in range(a.shape[2])], -1).astype(float)
D = np.zeros((H, W), bool)
for x0, y0, x1, y1 in FILL: D[y0:y1, x0:x1] = True
lp = nd.gaussian_filter(st, (1.5, 1.5, 0))
prof = np.zeros(H)                                    # the floor line: rows 470-506 minus their vertical low-pass, on bare wall
band = lp[:, 380:620].mean((1, 2)); prof[470:WY1] = (band - nd.gaussian_filter1d(band, 8))[470:WY1]
def tone(D):
    lw = (lp - prof[:, None, None])[win]; ins = D[win]
    sh = (lw.shape[1] // 4, lw.shape[0] // 4)
    small = rs(lw, sh); ins_s = rs(ins[..., None] * 255.0, sh)[..., 0] > 0
    small = harmonic(np.where(ins_s[..., None], small.mean((0, 1)), small), ins_s, 4000)
    T = lp.copy(); T[win] = harmonic(np.where(ins[..., None], rs(small, lw.shape[1::-1]), lw), ins, 600) + prof[win[0], None, None]
    return np.where(D[..., None], T, lp)
def inkof(T, D):
    r = (st + 1) / (T + 1)
    return nd.binary_opening((((r.max(-1) - r.min(-1)) > 0.14) | (r.mean(-1) > 1.15)) & (np.abs(st - T).mean(-1) > 12) & D, iterations=1)
T = tone(D)
# the floor pocket at the right (the dark ground under the hose and the gauges) is the wall there, not a shadow: in BR the
# fill takes only each object's ink grown 14 (gauges) or 24 (the hose), so the pocket stays put and only the objects and their near shadows move
BR = (632, 376, WX1, WY1)
br = np.zeros((H, W), bool); br[BR[1]:BR[3], BR[0]:BR[2]] = True
ink0 = inkof(T, D) & br; gauges = np.zeros((H, W), bool)
for n_, (x0, y0, x1, y1), mv_ in OBJ:
    if n_ in ('GR1', 'GR2'): gauges[y0:y1, x0:x1] = True
D = (D & ~br) | ((nd.binary_dilation(ink0 & gauges, iterations=14) | nd.binary_dilation(ink0 & ~gauges, iterations=24)) & br)
T = tone(D)

# layers
dev = np.abs(st - T).mean(-1)
wfull = np.clip((dev - 3) / 5, 0, 1); wfull = np.maximum(wfull, nd.gaussian_filter(wfull, 1.0)) * D
ink = inkof(T, D)
lab = np.zeros((H, W), int)
for i, (n, (x0, y0, x1, y1), mv) in enumerate(OBJ):
    sub = lab[y0:y1, x0:x1]; sub[(sub == 0) & ink[y0:y1, x0:x1]] = i + 1
dist = np.stack([nd.distance_transform_edt(lab != i + 1) for i in range(len(OBJ))])
own = np.exp(-(dist - dist.min(0)) / 4.0); own /= own.sum(0)       # soft: shadows that meet are shared, not cut
delta = st - T
Wsrc = wfull * np.clip((56 - nd.distance_transform_edt(~ink)) / 16, 0, 1)   # a shadow is within 40 px of its object (fading to 56)

# grain from bare wall at an offset
hp = np.clip(st - nd.gaussian_filter(st, (3, 3, 0)), -8, 8)
bare = ~nd.binary_dilation(D, iterations=3); bare[:WY0] = bare[WY1:] = False; bare[:, :WX0] = bare[:, WX1:] = False
G = np.zeros_like(st); got = np.zeros((H, W), bool)
for dy, dx in [(0, 300), (0, -300), (0, 220), (0, -220), (-120, 0), (120, 0), (-200, 160), (-200, -160), (0, 400), (0, -400)]:
    sh_hp = np.roll(hp, (dy, dx), (0, 1)); ok = np.roll(bare, (dy, dx), (0, 1)) & ~got
    G[ok] = sh_hp[ok]; got |= ok
canvas = st * (1 - Wsrc[..., None]) + (T + G) * Wsrc[..., None]

def shift(a, dx, dy):
    o = np.zeros_like(a); y0, y1 = max(0, dy), min(H, H + dy); x0, x1 = max(0, dx), min(W, W + dx)
    o[y0:y1, x0:x1] = a[y0 - dy:y1 - dy, x0 - dx:x1 - dx]; return o

ACC = np.zeros((H, W)); DEL = np.zeros_like(st)
def add(d, w, dx, dy, ys=None):
    global ACC, DEL
    d2, w2 = shift(d, dx, dy), shift(w, dx, dy)
    if ys is not None: w2[:ys[0]] = 0; w2[ys[1]:] = 0; d2[:ys[0]] = 0; d2[ys[1]:] = 0
    ACC += w2; DEL += d2
for i, (n, rect, mv) in enumerate(OBJ):
    w = Wsrc * own[i]; d = delta * w[..., None]
    if n == 'col':
        dx, dy = mv
        # the upper part (above CUT) moves (dx, dy); the lower part (from CUT + 4) moves (dx, dy - 4)
        wu, du = w.copy(), d.copy(); wu[CUT:] = 0; du[CUT:] = 0; add(du, wu, dx, dy, (0, CUT + dy))
        wl, dl = w.copy(), d.copy(); wl[:CUT + 4] = 0; dl[:CUT + 4] = 0; add(dl, wl, dx, dy - 4, (CUT + dy, H))
    elif mv is not None:
        add(d, w, *mv)
    else:
        x = np.arange(W, dtype=float)
        if n == 'hoseL': t = np.clip((x - RAMP_L[0]) / (RAMP_L[1] - RAMP_L[0]), 0, 1)
        else: t = np.clip((RAMP_R[1] - x) / (RAMP_R[1] - RAMP_R[0]), 0, 1)
        s_ = LIFT * t * t * (3 - 2 * t)                # the lift at each column
        yy, xx = np.mgrid[0:H, 0:W].astype(float); sy = yy + s_[None, :]
        dw = np.stack([nd.map_coordinates(d[..., c], [sy, xx], order=1, mode='constant') for c in range(3)], -1)
        ww = nd.map_coordinates(w, [sy, xx], order=1, mode='constant')
        add(dw, ww, 0, 0)
m = np.zeros((H, W), bool); m[win] = True
A = np.clip(ACC, 0, 1) * m; DEL *= m[..., None]
# where layers cover, the tone plus their summed deviation (a pixel shared by two shadows takes both shares)
canvas = canvas * (1 - A[..., None]) + T * A[..., None] + DEL
placed = ACC
res = np.clip(np.round(canvas), 0, 255).astype(np.uint8)
Image.fromarray(res).save(out)
if dbg:
    os.makedirs(dbg, exist_ok=True); np.save(os.path.join(dbg, 'tone.npy'), T)
    Image.fromarray(np.clip(T, 0, 255).astype(np.uint8)).save(os.path.join(dbg, 'tone.png'))
    Image.fromarray((np.clip(Wsrc, 0, 1) * 255).astype(np.uint8)).save(os.path.join(dbg, 'layers-before.png'))
    Image.fromarray((np.clip(placed, 0, 1) * 255).astype(np.uint8)).save(os.path.join(dbg, 'layers-after.png'))
    print('overlap px (placed > 1.05):', int((placed > 1.05).sum()))
