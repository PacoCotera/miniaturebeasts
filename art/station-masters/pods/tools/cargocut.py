"""Pass 122: Cargo's crate pieces (Station art director's Cargo brief of Oct 10, cap 13.5 MXN, owner-approved: 2 Pro requests, the held one unspent). One sage moulded field case, the Home bay's object seen closer, with dark rubber corners and an orange seal tag; no wood, rope or planks.
Pro: source/raw/cargo-crate-open.jpg (3:2: the case open, the lid up and back, three fitted worn cut-outs with a little moss and a blank tag in each) and source/raw/cargo-crate-sealed.jpg (an edit of it: the lid shut, the latches closed, an orange seal tag across the seam; the case body registers with the open picture).
By hand: both pictures are keyed from the slate and cut with ONE transform to the layout's crate region 384x256 (station-layouts.md "Cargo": the crate closer at (320, 104, 384, 256)), uniform scale 0.605 chosen so the three cut-outs fall under the pods (88x112 at region x 44, 148 and 252, feet at y 192): crate-closer-open-384x256, crate-closer-sealed-384x256 (so they register pixel for pixel); crate-closer-opening-384x256: the sealed lid lifted 6 px, a dark gap under it, the orange tag torn along a jagged line across the seam; crate-sealed-256x176: the sealed crate reduced uniformly into 256x176; crate-sitting-256x176 and crate-sitting-80x56: the sealed crate with the tag painted out and the gilt sitting glyph (the 24x16 gilt frame of the old crate-sitting) on the lid instead, reduced.
python3 -I tools/cargocut.py -> slices/crate-*.png, marks/cargo-proof-1x.png"""
import os, json, hashlib
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
exec(open("tools/lightfit.py").read(), globals())
def load(n):
    """the crate against the flat slate: the background (and its soft shadow) is every pixel connected to the picture's border that is near the slate in colour (distance under 38) and as blue as it (R-B under -12), so the dark rubber corners, which are close to the slate in brightness but green, stay in; the edge is softened 1 px"""
    a = np.asarray(Image.open(f"source/raw/{n}.jpg").convert("RGB")).astype(float); bg = np.median(np.concatenate([a[:40].reshape(-1, 3), a[:, :40].reshape(-1, 3)]), axis=0)
    d = np.sqrt(((a - bg) ** 2).sum(2)); cand = (d < 38) & ((a[..., 0] - a[..., 2]) < -12); H_, W_ = d.shape; seen = np.zeros((H_, W_), bool); st = [(0, x) for x in range(W_)] + [(H_ - 1, x) for x in range(W_)] + [(y, 0) for y in range(H_)] + [(y, W_ - 1) for y in range(H_)]
    st = [p_ for p_ in st if cand[p_]]
    for p_ in st: seen[p_] = True
    while st:
        y, x = st.pop()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < H_ and 0 <= nx < W_ and cand[ny, nx] and not seen[ny, nx]: seen[ny, nx] = True; st.append((ny, nx))
    al = (~seen).astype(float); al = np.asarray(Image.fromarray((al * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))).astype(float) / 255.0; return a, al
def rgba(a, al): return np.dstack([a, al * 255])
def cut(arr, box, size):
    x0, y0, x1, y1 = box; sub = arr[y0:y1, x0:x1]; pm = np.dstack([sub[..., :3] * sub[..., 3:] / 255.0, sub[..., 3:]]).astype(np.uint8); r = np.asarray(Image.fromarray(pm, "RGBA").resize(size, Image.LANCZOS)).astype(float)
    al = r[..., 3:] / 255.0; return np.dstack([np.where(al > 0.004, r[..., :3] / np.maximum(al, 0.004), 0), r[..., 3:]]).clip(0, 255)
ao, alo = load("cargo-crate-open"); asl, als = load("cargo-crate-sealed"); BOX = (323, 253, 957, 676)              # the common transform: 634 x 423 -> 384 x 256 (scale 0.6057)
# the light, by hand (the art director's targets: within +-4 L* and +-8 key R-B of home-bay-shut: 48.0 L*, key R-B 22, sat <= 35): the opaque pixels' linear light is scaled to a mean L* of 46 (open) and 49 (sealed), and the sealed picture is warmed a little (red up, blue down) so its key R-B reaches 18; the whole sealed picture is graded BEFORE the opening, small and sitting pieces are derived from it
def grade(arr_rgba, target, warm=0.0):
    op = arr_rgba[..., 3] > 128; lin = to_lin(arr_rgba[..., :3]) * (1 + np.array([0.5, 0.0, -0.7]) * warm); lo, hi = 0.3, 3.0
    for _ in range(26):
        g = (lo * hi) ** 0.5
        if lstar(to_srgb(lin * g))[op].mean() < target: lo = g
        else: hi = g
    out = arr_rgba.copy(); out[..., :3] = to_srgb(lin * (lo * hi) ** 0.5); return out
def keyrb(arr_rgba):
    op = arr_rgba[..., 3] > 128; L_ = lstar(arr_rgba[..., :3]); h_, w_ = L_.shape; q = np.zeros_like(op); q[:h_ // 2, :w_ // 2] = True; qq = op & q
    if qq.sum() < 20: qq = op
    k = arr_rgba[..., :3][qq & (L_ >= np.percentile(L_[qq], 80))].mean(0); return float(k[0] - k[2])
open_r = grade(cut(rgba(ao, alo), BOX, (384, 256)), 46.0); open_r = np.asarray(fit_light(Image.fromarray(open_r.astype(np.uint8), 'RGBA'), soft=True, cap=69.0)[0]).astype(float);      # the paper tags' highlights pulled under L* 70
seal_r = cut(rgba(asl, als), BOX, (384, 256))
for WARM in np.arange(0.0, 1.5, 0.05):
    seal_g = grade(seal_r, 49.0, WARM)
    if keyrb(seal_g) >= 18: break
seal_r = seal_g; print("sealed warmth", round(float(WARM), 2), "key R-B", round(keyrb(seal_r), 1))
man = json.load(open("slices/manifest.json")); outs = {}
def save(n, arr, made, src):
    t = Image.fromarray(arr.astype(np.uint8), "RGBA"); t.save(f"slices/{n}.png", optimize=True); outs[n] = t; man[n] = {"size": list(t.size), "rect": None, "src": src, "made": made + " (pass 122)", "sha256": hashlib.sha256(open(f"slices/{n}.png", "rb").read()).hexdigest()}
S2 = "source/raw/cargo-crate-open.jpg, cargo-crate-sealed.jpg (gemini-3-pro-image)"
save("crate-closer-open-384x256", open_r, "the Cargo crate closer, open: the sage moulded field case with sand latches, a carry handle and dark rubber corners, the lid up and back, three fitted worn cut-outs for the pods (88x112 at region x 44, 148, 252, feet at y 192), each empty with a little moss and a blank tag; a Pro painting keyed from the slate and cut to the layout's 384x256 region (uniform scale)", S2)
save("crate-closer-sealed-384x256", seal_r, "the Cargo crate closer, sealed: the same case, the lid shut, the latches closed, an orange seal tag across the lid seam; a Pro edit of the open picture, cut by the same transform so it registers with it pixel for pixel", S2)
# --- opening: the sealed lid lifted 6 px, the tag torn
rng = np.random.default_rng(41); H, W = 256, 384; SEAM = 207
tag = (seal_r[..., 0] > 190) & (seal_r[..., 1] > 110) & (seal_r[..., 1] < 200) & (seal_r[..., 2] < 120) & (seal_r[..., 3] > 128); ty, tx = np.where(tag); print("tag px", len(ty), (tx.min(), tx.max(), ty.min(), ty.max()) if len(ty) else None)
jag = np.zeros(W); 
if len(tx):
    walk = np.cumsum(rng.integers(-1, 2, tx.max() - tx.min() + 5)); walk = np.convolve(walk - walk.mean(), np.ones(5) / 5, "same"); jag[tx.min() - 2:tx.max() + 3] = np.clip(np.round(walk * 1.5), -4, 4)          # a torn edge: a smoothed random walk, not noise
yy = np.arange(H)[:, None]; seam_y = SEAM + jag[None, :]; upper = yy < seam_y
lift = 6; out = np.zeros_like(seal_r); gap = np.zeros((H, W), bool)
low = np.where(~upper[..., None], seal_r, 0.0); out = low.copy()
up_shift = np.zeros_like(seal_r); up_shift[0:H - lift] = np.where(upper[..., None], seal_r, 0.0)[lift:H]
mask_up = up_shift[..., 3] > 0
gapm = np.zeros((H, W), bool)
for x in range(W):
    ys_ = np.where(upper[:, x] & (seal_r[:, x, 3] > 128))[0]
    if len(ys_): y_top = int(seam_y[0, x]); gapm[y_top - lift:y_top, x] = seal_r[min(y_top + 1, H - 1), x, 3] > 128
dark = np.array([46.0, 40.0, 34.0, 255.0]); gp = gapm & ~(low[..., 3] > 128)
out[gp] = dark
comp = out.copy(); a_u = up_shift[..., 3:] / 255.0; comp[..., :3] = comp[..., :3] * (1 - a_u) + up_shift[..., :3] * a_u; comp[..., 3] = np.maximum(comp[..., 3], up_shift[..., 3])
save("crate-closer-opening-384x256", comp, "the Cargo crate closer, opening: the sealed crate's lid lifted 6 px with a dark gap under it and the orange seal tag torn along a jagged line across the seam, composed by hand from the sealed picture", S2)
# --- the sealed crate reduced to 256x176 (the whole crate, uniform scale)
sa = alo = als; bm = als > 0.6; bm[:, 985:] = False; ys, xs = np.where(bm); bx = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1); w_, h_ = bx[2] - bx[0], bx[3] - bx[1]; s = min(256 / w_, 176 / h_)
def fit_box(arr_rgba, box, TW=256, TH=176, M=8):
    """the whole crate reduced uniformly into TW x TH with M px clear on every side (the art director's return on pass 122: no pods ride on it, so it fits whole)"""
    x0, y0, x1, y1 = box; w, h = x1 - x0, y1 - y0; s_ = min((TW - 2 * M) / float(w), (TH - 2 * M) / float(h)); nw, nh = max(1, round(w * s_)), max(1, round(h * s_)); r = cut(arr_rgba, box, (nw, nh)); t = np.zeros((TH, TW, 4)); oy_ = (TH - nh) // 2; ox_ = (TW - nw) // 2; t[oy_:oy_ + nh, ox_:ox_ + nw] = r; return t, (ox_, oy_, s_)
sg_full = rgba(asl, als); sg_full[..., :3] = to_srgb(to_lin(sg_full[..., :3]) * (1 + np.array([0.5, 0.0, -0.7]) * WARM)); sg_full = grade(sg_full, 49.0, 0.0); sealed_small, _ = fit_box(sg_full, bx)
save("crate-sealed-256x176", sealed_small, "the sealed Cargo crate for the bay's places, 256x176: the whole sealed crate reduced uniformly into the box with 8 px clear on every side (never enlarged)", S2)
# --- the sitting crate: the tag painted out, the gilt sitting glyph on the lid
asit = sg_full.copy(); ta = (asit[..., 0] > 185) & (asit[..., 1] > 105) & (asit[..., 1] < 205) & (asit[..., 2] < 125) & (asit[..., 3] > 128)
ta = np.asarray(Image.fromarray((ta * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(15))) > 0; good = (asit[..., 3] > 128) & ~ta
fillc = asit[..., :3].copy(); have = good.copy()
for _ in range(40):
    pad = np.pad(fillc, ((1, 1), (1, 1), (0, 0)), mode="edge"); hp = np.pad(have, 1); acc = np.zeros_like(fillc); cnt = np.zeros(have.shape)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            mm = hp[1 + dy:1 + dy + have.shape[0], 1 + dx:1 + dx + have.shape[1]]; acc += pad[1 + dy:1 + dy + have.shape[0], 1 + dx:1 + dx + have.shape[1]] * mm[..., None]; cnt += mm
    new_ = (~have) & (cnt > 0) & (asit[..., 3] > 128) | ((~have) & (cnt > 0) & ta); fillc[new_] = acc[new_] / cnt[new_][:, None]; have = have | new_
asit[..., :3][ta & (asit[..., 3] > 128)] = fillc[ta & (asit[..., 3] > 128)]
# the tag's lower half lies over the handle (source rows under 590): there the pixels come from the mirror image of the handle about the case's centre line (x 636), which is symmetric, so no smear is left
CXM = 636.0; yy_s, xx_s = np.mgrid[0:asit.shape[0], 0:asit.shape[1]]; lowm = ta & (asit[..., 3] > 128) & (yy_s >= 590); mx_ = np.clip(np.rint(2 * CXM - xx_s[lowm]).astype(int), 0, asit.shape[1] - 1); srcm = ~ta[yy_s[lowm], mx_]
ysel, xsel = yy_s[lowm][srcm], xx_s[lowm][srcm]; asit[ysel, xsel, :3] = asit[ysel, mx_[srcm], :3]
tcx, tcy = (np.where(tag)[1].mean() / 384.0 if len(tx) else 0.5), 0
ys_t, xs_t = np.where(ta & (asit[..., 3] > 128)); gx, gy = int(xs_t.mean()), int(ys_t.min() + 4) if len(ys_t) else (700, 560)
print("glyph centre at source", gx, gy)
sit0, (ox, oy, sc) = fit_box(asit, bx); nh_ = (bx[3] - bx[1]) * sc
def plate(W_, H_, cx_, cy_, pw, ph, scale):
    """a small matte brass plate (gold frame, a panel inside, lit from the top left): pw x ph px on a W_ x H_ canvas, drawn at 8x and reduced; a hairline shade at the bottom and right, a lit edge at the top and left"""
    Z = 8; G_ = Image.new("RGBA", (W_ * Z, H_ * Z), (0, 0, 0, 0)); d_ = ImageDraw.Draw(G_); X0_, Y0_ = (cx_ - pw / 2.0) * Z, (cy_ - ph / 2.0) * Z; X1_, Y1_ = (cx_ + pw / 2.0) * Z, (cy_ + ph / 2.0) * Z; r_ = max(1.0, ph * 0.12) * Z
    d_.rounded_rectangle([X0_, Y0_, X1_, Y1_], radius=r_, fill=(150, 110, 44, 255))                                  # the shade body
    d_.rounded_rectangle([X0_, Y0_, X1_ - Z * max(0.6, ph * 0.045), Y1_ - Z * max(0.6, ph * 0.045)], radius=r_, fill=(196, 152, 64, 255))   # the lit frame
    fw = max(2.0, ph * 0.19) * Z; d_.rounded_rectangle([X0_ + fw, Y0_ + fw, X1_ - fw - Z * 0.5, Y1_ - fw - Z * 0.5], radius=r_ * 0.5, fill=(112, 80, 36, 255))   # the panel inside, a deeper brass
    d_.line([(X0_ + r_, Y0_ + Z * 0.5), (X1_ - r_ - Z, Y0_ + Z * 0.5)], fill=(226, 190, 104, 255), width=max(1, int(Z * max(0.5, ph * 0.04)))); d_.line([(X0_ + Z * 0.5, Y0_ + r_), (X0_ + Z * 0.5, Y1_ - r_ - Z)], fill=(226, 190, 104, 255), width=max(1, int(Z * max(0.5, ph * 0.04))))
    return G_.resize((W_, H_), Image.LANCZOS)
lidx = ox + (bx[2] - bx[0]) * sc / 2.0 + 1; lidy = oy + 0.40 * nh_
base = Image.fromarray(sit0.astype(np.uint8), "RGBA"); base.alpha_composite(plate(256, 176, lidx, lidy, 48, 32, 1.0)); sit = np.asarray(base).astype(float)
save("crate-sitting-256x176", sit, "the sitting Cargo crate, 256x176: the whole sealed crate (8 px clear on every side) with the tag painted out (the handle part from its mirror image) and a small matte brass plate (gold frame, a panel inside, 48x32, lit from the top left) on the lid instead; replaces the old teal crate-sitting-80x56 look", S2)
s80_0, (ox8, oy8, sc8) = fit_box(asit, bx, 80, 56, 2); b80 = Image.fromarray(s80_0.astype(np.uint8), "RGBA"); b80.alpha_composite(plate(80, 56, ox8 + (bx[2] - bx[0]) * sc8 / 2.0 + 0.5, oy8 + 0.40 * (bx[3] - bx[1]) * sc8, 24, 16, 1.0))
save("crate-sitting-80x56", np.asarray(b80).astype(float), "the sitting Cargo crate for Home's bay, 80x56: the whole sealed crate (2 px clear) with the tag painted out and the small brass plate (24x16, the old glyph's size) on the lid; it replaces the old teal crate-sitting-80x56 of pass 89", S2)
json.dump(man, open("slices/manifest.json", "w"), indent=1)
# proof: sealed, opening and open on the layout's region (the walls are the slate), three placeholder pods in the open crate, beside Home's bay crates
P = Image.new("RGB", (3 * 392 + 8 + 200, 270 + 8 + 60 + 80), (60, 66, 76)); x = 4
for n in ("crate-closer-sealed-384x256", "crate-closer-opening-384x256", "crate-closer-open-384x256"):
    t = outs[n].copy()
    if n.endswith("open-384x256"):
        pods = Image.new("RGBA", (384, 256), (0, 0, 0, 0)); dp = ImageDraw.Draw(pods)
        for px in (44, 148, 252): dp.rounded_rectangle([px, 80, px + 87, 191], radius=30, fill=(222, 178, 130, 255))
        base_ = Image.new("RGBA", (384, 256), (0, 0, 0, 0)); base_.alpha_composite(t); t = base_
        # the pods stand in the cut-outs: drawn above the cut-outs' back, below the tray's front lip (the lip is not separate here, so they are shown translucent)
        pods.putalpha(pods.getchannel("A").point(lambda v: int(v * 0.55))); t.alpha_composite(pods)
    P.paste(t.convert("RGB"), (x, 4), t); x += 392
y = 270
for i, k in enumerate(("home-bay-shut-176x72", "home-bay-open-176x72")): b = Image.open(f"slices/{k}.png").convert("RGBA"); P.paste(b.convert("RGB"), (4 + i * 184, y + 4), b)
for i, k in enumerate(("crate-sealed-256x176", "crate-sitting-256x176")): b = outs[k]; P.paste(b.convert("RGB").resize((128, 88)), (380 + i * 136, y + 4), b.resize((128, 88)))
b = outs["crate-sitting-80x56"]; P.paste(b.convert("RGB"), (660, y + 4), b); P.save("marks/cargo-proof-1x.png"); print("ok")
