"""SJ-CR1 (art director, ad-create.md, 2026-10-25): the Create stage re-cut to the symmetric opening, by hand, 0 MXN. No paid call, no blur,
no sharpen; grain is kept 1:1 or transplanted 1:1; Pip is reduced, never regenerated.

A1 column map (opening [68, 58, 888, 494])    A2 the old tray cleared     A3 the tray as a 9-slice at screen [276, 240, 472, 288]
A4 chamber-back / chamber-front 472x288       A5 the dish, 152 wide + its front lip     A6 the capsule's contact shadow
A7 Create's own stamp case + front            A8 the capsule shell without its hinge stubs
A9 the founders at 272x280                    A10 the S01 roll pictures (Markings 4, Colour 6)

usage: python3 -I build.py PODS_DIR SG_DIR BASE_PNG
  PODS_DIR  art/station-masters/pods (the slices are written to PODS_DIR/slices, the report to PODS_DIR/create-relayout/build-report.json)
  SG_DIR    station-gate checkout (capsule shell, S01 layered stand)
  BASE_PNG  masters-pods 1cb5b1a2:art/station-masters/pods/slices/room-bench-stage-create.png (sha256 eac3651928c0...), read only
"""
import sys, os, json, hashlib, numpy as np
from PIL import Image
from scipy import ndimage as nd

PODS, SG, BASE = sys.argv[1:4]
SL = os.path.join(PODS, 'slices'); RP = {}
sha = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()
def lin(c): c = np.asarray(c, float) / 255; return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def srgb(l): l = np.clip(l, 0, 1); return np.where(l <= 0.0031308, l * 12.92, 1.055 * l ** (1 / 2.4) - 0.055) * 255
def smooth(t): t = np.clip(t, 0, 1); return t * t * (3 - 2 * t)
def save(a, name, mode=None):
    a = np.clip(np.round(a), 0, 255).astype(np.uint8)
    Image.fromarray(a, mode or ('RGBA' if a.shape[-1] == 4 else 'RGB')).save(os.path.join(SL, name))
RP['inputs'] = {'base': [BASE, sha(BASE)]}
for n in ('chamber-back-400x320.png', 'chamber-front-400x320.png'): RP['inputs'][n] = sha(os.path.join(SL, n))

B0 = np.asarray(Image.open(BASE).convert('RGB')).astype(float)          # base stage, 522 x 1024
H, W = B0.shape[:2]
assert (H, W) == (522, 1024) and RP['inputs']['base'][1].startswith('eac3651928c0')

# ------------------------------------------------------------------------------------------------ A2 (base coordinates)
# the old painted tray: x 312-711, y 191-513. Wall rows 191-499: the wall's own light (normalised gaussian sigma 18 with the box masked out)
# times the base's own grain (high-pass sigma 3, the ratio to its gaussian) transplanted 1:1 from the clean wall of the same rows (x 724-923).
# Bezel rows 500-521: copied row-aligned and 1:1 from x 724-923, gain-matched by the sigma-18 ratio along x, feathered over 8 px outside the box.
BX0, BX1, BY0, BY1 = 309, 716, 191, 514                       # F1 (AD 11:35): the box is x 312-715 plus its left drop-shadow line (309-311), so the old tray's side shadows go too
L0 = lin(B0)
def nconv(img, known, s, trunc=4):
    k = known.astype(float)
    return np.dstack([nd.gaussian_filter(img[..., c] * k, s, mode='constant', truncate=trunc) for c in range(3)]) / np.maximum(nd.gaussian_filter(k, s, mode='constant', truncate=trunc), 1e-300)[..., None]
known = np.zeros((H, W), bool); known[30:500, 80:938] = True; known[BY0:BY1, BX0:BX1] = False
LFn = nconv(L0, known, 18, 4)
# a normalised gaussian carried far into the box turns into its nearest neighbour (a hard step half way across); so the light of the box is the
# sigma-18 light at its left and right edges (rows by rows), interpolated linearly across it in linear light: the wall's own horizontal fall-off
tx = ((np.arange(W) - (BX0 - 1)) / (BX1 - BX0 + 1)).clip(0, 1)[None, :, None]
LF = LFn[:, BX0 - 1:BX0][:, [0] * W] * (1 - tx) + LFn[:, BX1:BX1 + 1][:, [0] * W] * tx
GR = L0 / np.maximum(np.dstack([nd.gaussian_filter(L0[..., c], 3) for c in range(3)]), 1e-6)      # the base's own grain, as a ratio
strip = GR[:, 724:928]; gt = np.concatenate([strip, strip[:, ::-1]], 1)[:, :BX1 - BX0]                          # 404 columns, the same rows
A = L0.copy()
A[BY0:500, BX0:BX1] = LF[BY0:500, BX0:BX1] * gt[BY0:500]
# bezel rows 500-521
R0, R1, XA, XB = 500, 522, BX0 - 16, BX1 + 16
src = np.tile(np.concatenate([L0[R0:R1, 724:927], L0[R0:R1, 926:723:-1]], 1), (1, 2, 1))[:, :XB - XA]      # (22, 416, 3), row aligned
kb = np.zeros((R1 - R0, W), bool); kb[:, 100:XA - 0] = True; kb[:, XB:920] = True
Tk = np.dstack([nd.gaussian_filter1d(L0[R0:R1, :, c] * kb, 18, axis=1, mode='constant') for c in range(3)]) / np.maximum(nd.gaussian_filter1d(kb.astype(float), 18, axis=1, mode='constant'), 1e-300)[..., None]
tb = ((np.arange(W) - (XA - 1)) / (XB - XA + 1)).clip(0, 1)[None, :, None]
Tn = Tk[:, XA - 1:XA][:, [0] * W] * (1 - tb) + Tk[:, XB:XB + 1][:, [0] * W] * tb          # the same, along the bezel rows
Sn = np.dstack([nd.gaussian_filter1d(src[..., c], 18, axis=1, mode='nearest') for c in range(3)])
gain = Tn[:, XA:XB] / np.maximum(Sn, 1e-6)
xs = np.arange(XA, XB); wx = np.where(xs < BX0, smooth((xs - XA + 1) / 17.0), np.where(xs >= BX1, smooth((XB - xs) / 17.0), 1.0))[None, :, None]
A[R0:R1, XA:XB] = L0[R0:R1, XA:XB] * (1 - wx) + src * gain * wx
# F1: the level of the fill meets the wall beside it: a ratio per row (per row) at each side of the box, carried 10 px into it
rows_ = slice(BY0, R1)
mean6 = lambda M, a, b: M[rows_, a:b].mean(1)
rl = nd.gaussian_filter1d(mean6(A, BX0 - 3, BX0) / np.maximum(mean6(A, BX0, BX0 + 3), 1e-6), 0.6, axis=0, mode='nearest')
rr = nd.gaussian_filter1d(mean6(A, BX1, BX1 + 3) / np.maximum(mean6(A, BX1 - 3, BX1), 1e-6), 0.6, axis=0, mode='nearest')
rl[BY1 - BY0 - 1 + 1:] = 1; rr[BY1 - BY0 - 1 + 1:] = 1                                  # rows 514-521 are the bezel's own (already matched)
for k in range(0, 24):
    A[rows_, BX0 + k] *= (1 + (rl - 1) * np.exp(-k / 6.0)); A[rows_, BX1 - 1 - k] *= (1 + (rr - 1) * np.exp(-k / 6.0))
Bc = srgb(A); Bc[:BY0] = B0[:BY0]; Bc[BY1:] = Bc[BY1:]
untouched = np.ones((H, W), bool); untouched[BY0:500, BX0:BX1] = False; untouched[R0:R1, XA:XB] = False
Bc = np.where(untouched[..., None], B0, Bc)
Bc = np.round(Bc)

# ------------------------------------------------------------------------------------------------ A1: one column map on all 522 rows
CM = list(range(0, 51)) + [51, 51, 52, 52, 53, 53, 54, 54] + list(range(55, 843)) + list(range(845, 970)) + list(range(972, 1024))
assert len(CM) == 1024
S1 = Bc[:, CM]                                   # the cleared base through the column map
S0 = B0[:, CM]                                   # the uncleared base through the map (for the "nothing else changed" diff)
seams = {'left band neighbour max': int(max(np.abs(B0[:, i] - B0[:, i + 1]).sum(-1).max() for i in range(51, 55))),
         'interior seam 842|845': int(np.abs(B0[:, 842] - B0[:, 845]).sum(-1).max()), 'right band seam 969|972': int(np.abs(B0[:, 969] - B0[:, 972]).sum(-1).max())}
RP['A1'] = seams

# ------------------------------------------------------------------------------------------------ A3: the tray, a 9-slice by whole-index maps
T = B0[191:512, 312:712]                         # the base's tray, 321 x 400 (rail rows 306-320 of the box = old 497-511)
H0, W0, H1, W1 = 321, 400, 288, 472
def idxmap(n0, n1, a, b):
    mid = np.round(np.linspace(a, n0 - b - 1, n1 - a - b)).astype(int)
    return np.concatenate([np.arange(a), mid, np.arange(n0 - b, n0)])
ry, rx = idxmap(H0, H1, 24, 24), idxmap(W0, W1, 24, 24)
assert len(ry) == H1 and len(rx) == W1 and ry[273] == 306 and ry[287] == 320
R = T[ry][:, rx]                                 # rims, rails and corners by index: whole rows and columns, no resampling
I0 = lin(T[14:306, 14:386]); LL0 = np.dstack([nd.gaussian_filter(I0[..., c], 3) for c in range(3)])
G0 = (I0 / np.maximum(LL0, 1e-4))[24:-24, 24:-24]                                  # the grain: the ratio of the old interior to its light, from its centre
h1, w1 = H1 - 14 - 15, W1 - 28                                                      # 259 x 444
LL1 = np.dstack([np.asarray(Image.fromarray(LL0[..., c].astype(np.float32), 'F').resize((w1, h1), Image.BICUBIC)) for c in range(3)])
gm = np.concatenate([G0, G0[:, ::-1]], 1); gm = np.concatenate([gm, gm[::-1]], 0)
G1 = np.tile(gm, (3, 3, 1))[:h1, :w1]
I1 = srgb(LL1 * G1)
m = np.zeros((H1, W1)); m[14:14 + h1, 14:14 + w1] = 1
cm = np.ones((H1, W1)); cm[:24, :24] = cm[:24, -24:] = cm[-24:, :24] = cm[-24:, -24:] = 0           # the corners stay 1:1
f = nd.gaussian_filter(m * cm, 1.5) * m * nd.binary_erosion(m, iterations=1)                       # feathered 1.5 px into the rims
full = np.zeros_like(R); full[14:14 + h1, 14:14 + w1] = I1
TR = np.round(R * (1 - f[..., None]) + full * f[..., None])
S2 = S1.copy(); S2[200:488, 276:748] = TR                                                          # stage rows 200-487 = screen 240-527
tray_box = (276, 200, 472, 288)

# ------------------------------------------------------------------------------------------------ A5: the dish, 152 wide (paint-dish.py's field, light and AO)
CX, CY, RX, RY = 168.0, 329.0, 73.0, 20.0
S = 4; yy, xx = (np.mgrid[0:H * S, 0:W * S].astype(np.float32) + .5) / S
r = np.sqrt(((xx - CX) / RX) ** 2 + ((yy - CY) / RY) ** 2)
hh = np.where(r < 1, -3.0 * (1 - r ** 2), 0) + 2.0 * np.exp(-((r - 1.0) / 0.07) ** 2)
gy, gx = np.gradient(nd.gaussian_filter(hh, 2)); gx *= S; gy *= S * (RX / RY) * 0.35
n = np.dstack([-gx, -gy, np.ones_like(gx)]); n /= np.linalg.norm(n, axis=2, keepdims=True)
Lv = np.array([-0.55, -0.62, 0.78]); Lv /= np.linalg.norm(Lv)
shade = np.clip(n @ Lv, 0, None) / Lv[2]; ao = 1 - 0.18 * np.clip(-hh / 3, 0, 1)
mult = (shade * ao).reshape(H, S, W, S).mean((1, 3))
near = ((yy > CY) & (r > 0.80) & (r < 1.18)).astype(np.float32).reshape(H, S, W, S).mean((1, 3))
del xx, yy, r, hh, gx, gy, n, shade, ao
S3 = srgb(lin(S2) * mult[..., None]); S3 = np.round(S3)
dish_changed = np.abs(S3 - S2).sum(-1) > 0
fr = np.zeros((48, 152, 4)); fr[..., :3] = S3[308:356, 92:244]
fr[..., 3] = np.clip(nd.gaussian_filter(near[308:356, 92:244], 0.8) * 1.3, 0, 1) * 255
fr[fr[..., 3] < 3] = 0

# ------------------------------------------------------------------------------------------------ A6: the capsule's contact shadow (stage (854, 486), rx 46, ry 4)
yy, xx = np.mgrid[0:H, 0:W] + .5
d = np.sqrt(((xx - 854.0) / 46) ** 2 + ((yy - 486.0) / 4) ** 2)
sm = np.where(d < 1, 0.55 + 0.45 * smooth(d), 1.0)
S4 = np.round(srgb(lin(S3) * sm[..., None]))
shadow_changed = np.abs(S4 - S3).sum(-1) > 0

# ------------------------------------------------------------------------------------------------ A7: Create's own case at screen [780, 104, 152, 152] (stage y 64)
N = 152; SS = 4
cy_, cx_ = (np.mgrid[0:N * SS, 0:N * SS].astype(np.float64) + .5) / SS
def rr_sdf(inset, rad):
    hw = N / 2 - inset
    qx = np.abs(cx_ - N / 2) - (hw - rad); qy = np.abs(cy_ - N / 2) - (hw - rad)
    return np.hypot(np.maximum(qx, 0), np.maximum(qy, 0)) + np.minimum(np.maximum(qx, qy), 0) - rad
sdw = rr_sdf(4.0, 6.0); dd = -sdw                                               # dd > 0 inside the well (4 px in from the box edge)
well = smooth(np.clip(dd / 6.0, 0, 1))                                          # the 6 px smoothstep bevel
hc = -3.0 * well                                                                # 3 px deep
rng = np.random.RandomState(7); wear = nd.gaussian_filter(rng.rand(N, N), 6, mode='wrap'); wear = (wear - wear.min()) / (wear.max() - wear.min())
wear = np.kron(wear, np.ones((SS, SS)))                                        # worn: the lip's height varies slowly along it
lipx = np.clip(sdw / 2.5, 0, 1); lipx = np.where(sdw > 0, np.sin(np.pi * lipx), 0)
hc = hc + 1.0 * lipx * (0.55 + 0.45 * wear)                                     # the 2 px worn lip on the outer edge, outside the well
gyc, gxc = np.gradient(nd.gaussian_filter(hc, 0.9 * SS)); gxc *= SS * 0.5; gyc *= SS * 0.5
nc = np.dstack([-gxc, -gyc, np.ones_like(gxc)]); nc /= np.linalg.norm(nc, axis=2, keepdims=True)
shc = np.clip(nc @ Lv, 0, None) / Lv[2]
floorK = 1 - 0.20 * well                                                        # the well floor x 0.80
mc = (shc * floorK).reshape(N, SS, N, SS).mean((1, 3))
ring = np.zeros((N, N)); ring[1:-1, 1:-1] = 1; mc = 1 + (mc - 1) * ring         # the outer pixel ring is the stage's own
base_case = S4[64:216, 780:932]
CASE = np.round(srgb(lin(base_case) * mc[..., None]))
S5 = S4.copy(); S5[64:216, 780:932] = CASE
case_changed = np.abs(S5 - S4).sum(-1) > 0
fl = rr_sdf(8.0, 6.0); cov = (fl < 0).reshape(N, SS, N, SS).mean((1, 3))
GROUNDC = np.array([0x1d, 0x23, 0x2b], float)
CF = np.zeros((N, N, 4)); CF[..., :3] = GROUNDC; CF[..., 3] = np.round(0.48 * 255 * cov)

# ------------------------------------------------------------------------------------------------ A4: the window pictures, from the new stage
cb = np.asarray(Image.open(os.path.join(SL, 'chamber-back-400x320.png')).convert('RGBA')).astype(float)
cf = np.asarray(Image.open(os.path.join(SL, 'chamber-front-400x320.png')).convert('RGBA')).astype(float)
BK = np.zeros((288, 472, 4)); BK[..., :3] = S5[200:488, 276:748]; BK[..., 3] = 255
BK[:24, :24, 3] = cb[:24, :24, 3]; BK[:24, -24:, 3] = cb[:24, -24:, 3]; BK[-24:, :24, 3] = cb[-24:, :24, 3]; BK[-24:, -24:, 3] = cb[-24:, -24:, 3]
FR = np.zeros((288, 472, 4)); FR[278:288, :, :3] = S5[478:488, 276:748]; FR[278:288, :, 3] = cf[310:320][:, rx, 3]
comp = BK[..., :3] * (BK[..., 3:] / 255) * (1 - FR[..., 3:] / 255) + FR[..., :3] * FR[..., 3:] / 255      # back under front
ok = (BK[..., 3] == 255) | (FR[..., 3] == 255)
RP['A4'] = {'back_corner_alpha_px': int((BK[..., 3] < 255).sum()), 'front_ink_rows': [int(v) for v in np.where(FR[..., 3].max(1) > 0)[0][[0, -1]]],
            'composed_equals_stage_where_alpha_255': int((np.abs(comp - S5[200:488, 276:748])[(BK[..., 3] == 255) & (FR[..., 3] == 0) | (FR[..., 3] == 255)].max() == 0))}

# ------------------------------------------------------------------------------------------------ write the stage and its pieces
out = np.dstack([S5, np.full((H, W), 255.)])
save(out, 'room-bench-stage-create.png'); save(BK, 'chamber-back-472x288.png'); save(FR, 'chamber-front-472x288.png')
save(fr, 'room-cradle-front-create-152x48.png')
save(CASE, 'room-stamp-case-create-152x152.png', 'RGB'); save(CF, 'room-stamp-case-create-152x152-front.png')
STAGE = np.asarray(Image.open(os.path.join(SL, 'room-bench-stage-create.png')).convert('RGB')).astype(float)

# the "nothing else changed" check: against the column-mapped base, nothing changes outside the named boxes
named = np.zeros((H, W), bool)
bx0 = 313; named[BY0:BY1, bx0:bx0 + 407] = True; named[BY0:BY1, 300:316] |= True; named[R0:R1, 290:740] = True    # A2 (mapped) with its 8 px feather
named[200:488, 276:748] = True                                                                                         # A3
named |= dish_changed | shadow_changed | case_changed
diff = np.abs(STAGE - S0).sum(-1) > 0
RP['outside_named_boxes_changed_px'] = int((diff & ~named).sum())
RP['changed_px_by_op'] = {'A2+A3 box': int(diff[BY0:BY1, 276:748].sum()), 'dish': int(dish_changed.sum()), 'shadow': int(shadow_changed.sum()), 'case': int(case_changed.sum())}

# ------------------------------------------------------------------------------------------------ A8: the capsule shell, hinge stubs erased
sh_in = os.path.join(SG, 'prototypes/ui/assets/masters/capsule/capsule-shell-145x224.png'); RP['inputs']['capsule-shell-145x224'] = sha(sh_in)
sh = np.asarray(Image.open(sh_in).convert('RGBA')).copy()
def runs(row):
    r_, st = [], None
    for x, v in enumerate(row > 0):
        if v and st is None: st = x
        if not v and st is not None: r_.append((st, x - 1)); st = None
    if st is not None: r_.append((st, len(row) - 1))
    return r_
for y in range(186, 202):                         # the stubs: ink beyond the body's own edge (138 at row 185, 136 at row 202, straight between)
    e = int(round(138 - 2 * (y - 185) / 17))
    sh[y, e + 1:] = 0
for y in range(180, 224):                         # any speck right of the main (longest) run
    rs = runs(sh[y, :, 3]); main = max(rs, key=lambda t: t[1] - t[0]); sh[y, main[1] + 1:] = 0
sh[220:224, 19:107, :3] = sh[219:220, 19:107, :3]                          # F2 (AD 11:35): the Incubator's floor line baked into rows 220-223 takes row 219's RGB, alpha unchanged
bad = sum(int((sh[y, max(runs(sh[y, :, 3]), key=lambda t: t[1] - t[0])[1] + 1:, 3] > 0).sum()) for y in range(180, 224))
LUMF = lambda r_: float((sh[r_, 19:107, :3].astype(float) @ [.2126, .7152, .0722]).mean())
RP['F2_rows_220_223_mean_lum_vs_row_219'] = [round(LUMF(219), 2)] + [round(LUMF(r_), 2) for r_ in range(220, 224)]
RP['A8'] = {'ink_right_of_main_run_rows_180_223': bad, 'pixels_erased': int((np.asarray(Image.open(sh_in).convert('RGBA'))[..., 3] > 0).sum() - (sh[..., 3] > 0).sum())}
Image.fromarray(sh, 'RGBA').save(os.path.join(SL, 'capsule-shell-145x224.png'))

# ------------------------------------------------------------------------------------------------ A9: the founders at 272 x 280
FO = {}
for s in ('S01', 'S02', 'S03', 'S09', 'S13', 'S16'):
    im = Image.open(os.path.join(PODS, 'adult', f'mibi-adult-{s}-304x312.png')).convert('RGBA'); a = np.asarray(im)
    body = a[..., 3] == 255; xs_ = np.where(body.any(0))[0]; cx = (xs_.min() + xs_.max()) / 2; sc = 272 / 304
    p = im.resize((round(im.width * sc), round(im.height * sc)), Image.LANCZOS)         # one LANCZOS reduction of the whole RGBA
    # Pillow resizes RGBA premultiplied
    pa = np.asarray(p).copy(); al = pa[..., 3]
    pa[..., 3] = np.where(al >= 200, 255, np.where(al >= 60, np.minimum(al, 110), 0))
    c = Image.new('RGBA', (272, 280), (0, 0, 0, 0)); off = (round(136 - cx * sc), round(273 - 305 * sc))
    c.alpha_composite(Image.fromarray(pa), off); c.save(os.path.join(SL, f'mibi-adult-{s}-272x280.png'))
    o = np.asarray(c); b = o[..., 3] == 255; ys, xs2 = np.where(b); alv = np.unique(o[..., 3])
    mag = int(((o[..., 3] > 0) & (o[..., 0] > 200) & (o[..., 1] < 60) & (o[..., 2] > 200)).sum())
    FO[s] = {'offset': off, 'body_box': [int(xs2.min()), int(ys.min()), int(xs2.max()), int(ys.max())], 'body_h': int(ys.max() - ys.min() + 1),
             'alpha_values_ok': bool(all(v == 0 or v == 255 or 60 <= v <= 110 for v in alv)), 'magenta_px': mag, 'fits_280': bool(ys.max() < 280 and ys.min() >= 0)}
RP['A9'] = FO

# ------------------------------------------------------------------------------------------------ A10: the S01 roll pictures, from the signed layered stand (traitcut.py's roll form)
D = os.path.join(SG, 'prototypes/ui/assets/stands'); GROUND = np.array([0x16, 0x2a, 0x37], float)
RP['inputs']['stands/index.json'] = sha(os.path.join(D, 'index.json'))
def stand(base='', layers=()):
    c = Image.new('RGBA', (304, 312), (0, 0, 0, 0)); c.alpha_composite(Image.open(os.path.join(D, f'S01-adult-304x312-base{base}.png')).convert('RGBA'))
    RP['inputs'][f'S01-adult-304x312-base{base}.png'] = sha(os.path.join(D, f'S01-adult-304x312-base{base}.png'))
    for l in layers:
        c.alpha_composite(Image.open(os.path.join(D, f'S01-adult-304x312-{l}.png')).convert('RGBA'))
        RP['inputs'][f'S01-adult-304x312-{l}.png'] = sha(os.path.join(D, f'S01-adult-304x312-{l}.png'))
    return c
def rollcut(img, box, name):
    Wd, Hd, bw, bh = 128, 72, 96, 54
    c = img.crop(box).resize((bw, bh), Image.LANCZOS); a = np.asarray(c).astype(float); al = a[..., 3:4] / 255
    a = a[..., :3] * al + GROUND * (1 - al)                                           # the stand's transparent pixels go to the ground
    yy2, xx2 = np.mgrid[:bh, :bw]; dd2 = np.minimum(np.minimum(xx2, bw - 1 - xx2), np.minimum(yy2, bh - 1 - yy2)); f2 = smooth(dd2 / 12)[..., None]
    a = a * f2 + GROUND * (1 - f2); cell = np.tile(GROUND, (Hd, Wd, 1)); cell[9:9 + bh, 16:16 + bw] = a
    Image.fromarray(np.clip(cell, 0, 255).round().astype(np.uint8)).save(os.path.join(SL, name)); return cell
MK = {'plain': (), 'stripes': ('stripes',), 'patches': ('patches',), 'stripes-and-patches': ('patches', 'stripes')}      # stand order: patches 10, stripes 11
CO = {'charcoal': '', 'charcoal-and-russet': '-charcoal-and-russet', 'charcoal-and-ash': '-charcoal-and-ash', 'russet': '-russet', 'russet-and-ash': '-russet-and-ash', 'ash': '-ash'}
cells = {}
for k, ls in MK.items(): cells[k] = rollcut(stand('', ls), (150, 136, 294, 217), f'roll-S01-markings-{k}-128x72.png')
for k, b in CO.items(): cells[k] = rollcut(stand(b, ()), (150, 152, 294, 233), f'roll-S01-colour-{k}-128x72.png')
RP['A10'] = {'distinct_markings': len({cells[k].tobytes() for k in MK}), 'distinct_colour': len({cells[k].tobytes() for k in CO})}

# ------------------------------------------------------------------------------------------------ checks, read back from the written files
import collections
Lm = lambda a: np.asarray(a, float) @ [.2126, .7152, .0722]
ST = np.asarray(Image.open(os.path.join(SL, 'room-bench-stage-create.png')).convert('RGB')).astype(float); LS = Lm(ST)
CK = {}
CK['edge_row_min_lum_x300_724'] = dict(collections.Counter(500 + int(np.argmin(LS[500:514, x - 1:x + 2].mean(1))) for x in range(300, 725)))
CK['edge_row_min_lum_base_x100_300'] = dict(collections.Counter(500 + int(np.argmin(Lm(B0)[500:514, x - 1:x + 2].mean(1))) for x in range(100, 300)))
def shift(a, b, lo, hi):                           # the shift s (in px) with a[x] = b[x - s] best over x in lo..hi (the bezel's own profile)
    pa = Lm(a)[300:340, lo:hi].mean(0); best = None
    for sft in range(-6, 7):
        pb = Lm(b)[300:340, lo - sft:hi - sft].mean(0); e = np.abs(pa - pb).sum()
        if best is None or e < best[0]: best = (e, sft)
    return best[1]
sl_, sr_ = shift(ST, B0, 46, 80), shift(ST, B0, 940, 975)
CK['opening'] = {'left_edge_shift': sl_, 'right_edge_shift': sr_, 'left_edge_x': 64 + sl_, 'right_edge_x_exclusive': 954 + sr_, 'width': 890 - sl_ + sr_ - 0 if False else (954 + sr_) - (64 + sl_), 'rect_screen': [64 + sl_, 58, (954 + sr_) - (64 + sl_), 494]}
r300 = LS[300]; c512 = LS[:, 512]
CK['tray_box_by_luminance_edges'] = {'x0': int(270 + np.argmax(np.diff(r300[270:290]) > 20) + 1), 'x1_last_bright': int(735 + np.where(r300[735:755] > 100)[0].max()),
                                      'y0_stage': int(190 + np.argmax(np.diff(c512[190:210]) > 20) + 1), 'y1_last_bright_stage': int(480 + np.where(c512[480:495] > 100)[0].max())}
hp = lambda im: im - nd.gaussian_filter(im, 3)
old_i = hp(Lm(B0))[205:497, 326:698]; new_i = hp(LS)[214 + 0:473 + 0, 290:734]
CK['interior_highpass_std'] = {'old': round(float(old_i[24:-24, 24:-24].std()), 3), 'new': round(float(hp(LS)[200 + 14 + 24:200 + 14 + 259 - 24, 276 + 14 + 24:276 + 14 + 444 - 24].std()), 3)}
dl = np.abs(mult - 1)
for t in (0.03, 0.08):
    ys_, xs_ = np.where(dl > t); CK[f'dish_ink_box_|mult-1|>{t}_screen'] = [int(xs_.min()), int(ys_.min() + 40), int(xs_.max() - xs_.min() + 1), int(ys_.max() - ys_.min() + 1)]
CK['case_outer_ring_vs_stage_max_diff'] = float(np.abs(ST[64:216, 780:932] - S4[64:216, 780:932])[np.pad(np.zeros((150, 150), bool), 1, constant_values=True)].max())
CK['capsule_foot_shadow_changed_px_box_screen'] = [int(np.where(shadow_changed)[1].min()), int(np.where(shadow_changed)[0].min() + 40), int(np.where(shadow_changed)[1].max()), int(np.where(shadow_changed)[0].max() + 40)]
dd_ = np.abs(S3 - S2).sum(-1)
for t in (10, 25, 32, 40):
    ys_, xs_ = np.where(dd_ > t); CK[f'dish_ink_box_diff>{t}_screen'] = [int(xs_.min()), int(ys_.min() + 40), int(xs_.max() - xs_.min() + 1), int(ys_.max() - ys_.min() + 1)]
colstep = lambda x: float(np.abs(LS[488:512, x] - LS[488:512, x - 1]).mean()) if False else float(np.abs(ST[488:512, x] - ST[488:512, x - 1]).sum(-1).mean())
CK['F1_column_step_rows_488_511_x714_719'] = {x: round(float(np.abs((ST[488:512, x] - ST[488:512, x - 1]).mean(0)).sum()), 2) for x in range(714, 720)}
CK['F1_column_step_rows_488_511_x312_318'] = {x: round(float(np.abs((ST[488:512, x] - ST[488:512, x - 1]).mean(0)).sum()), 2) for x in range(312, 319)}
RP['checks'] = CK
json.dump(RP, open(os.path.join(PODS, 'create-relayout', 'build-report.json'), 'w'), indent=1, default=str)
print(json.dumps(RP, indent=1, default=str))
