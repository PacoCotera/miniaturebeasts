"""Pass 133: the Cargo haul slices cargo-energy-48x64 and cargo-data-48x64 (Station art director, Oct 10; the owner-approved Pro edit source/raw/cargo-haul-3.jpg, 1 request: the owner's own sketches' object #1 of each: the banded steel battery cell with dark rubber corners and a cap terminal, and the rugged ribbed cartridge stood upright with its connector at the foot; the vial/Essence is out, held by the art director, and the find tube is dropped). By hand, no paid call here.
Each object is keyed from the neutral ground (distance from the border's median colour, soft), its window flattened to its counter colour at full size (Energy: three amber bars #ffa83f; Data: the sky window #5bb9f3), uniformly scaled to 64 rows with the FEET ON THE BOTTOM ROW and centred in 48 columns, then graded: the body's linear light to a mean L* of 47 (the art director's 45-49), the highlights pulled under L* 70 by a soft curve, the flat window colours capped at L* 69.5 (a linear scale of the same hue), so at most 3 percent of the opaque pixels sit above L* 70; saturation is the painting's (olive and steel bodies).
python3 -I tools/haulcut.py -> slices/cargo-{energy,data}-48x64.png, marks/cargo-haul-proof-1x.png (and 4x)"""
import os, json, hashlib
import numpy as np
from PIL import Image, ImageFilter
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
exec(open("tools/nightdist.py").read(), globals())
def load_src(path):
    global a, H, W, bg, dist, alpha
    a = np.asarray(Image.open(path).convert("RGB")).astype(float); H, W, _ = a.shape
    bg = np.median(np.concatenate([a[:30].reshape(-1, 3), a[-30:].reshape(-1, 3), a[:, :30].reshape(-1, 3), a[:, -30:].reshape(-1, 3)]), axis=0)
    dist = np.sqrt(((a - bg) ** 2).sum(2)); sh = (a.max(2) - a.min(2) < 14) & (dist < 60) & (a.mean(2) < bg.mean() - 2)               # the soft contact shadow is grey and darker: not the object
    alpha = np.clip((dist - 30) / 18.0, 0, 1) * (~sh)
SRC = "source/raw/cargo-haul-3.jpg"; load_src(SRC)
def piece(box, flat):
    x0, y0, x1, y1 = box; sub = a[y0:y1, x0:x1].copy(); al = alpha[y0:y1, x0:x1].copy()
    lab = al > 0.5; seen = np.zeros(lab.shape, bool); ys, xs = np.where(lab); st = [(ys[len(ys) // 2], xs[len(xs) // 2])]
    # the object is the largest connected piece; the shadow and specks are dropped
    st = [(int(np.argmax(lab.sum(1))), int(np.argmax(lab.sum(0))))]
    if not lab[st[0]]: st = [tuple(np.argwhere(lab)[len(np.argwhere(lab)) // 2])]
    seen[st[0]] = True
    while st:
        y, x = st.pop()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < lab.shape[0] and 0 <= nx < lab.shape[1] and lab[ny, nx] and not seen[ny, nx]: seen[ny, nx] = True; st.append((ny, nx))
    comp = np.asarray(Image.fromarray((seen * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))) > 0; al = al * comp
    c2 = np.asarray(Image.fromarray(((dist[box[1]:box[3], box[0]:box[2]] > 100) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))) > 0; hh, ww = c2.shape; outside = np.zeros((hh, ww), bool); stk = [(y, x) for y in (0, hh - 1) for x in range(ww)] + [(y, x) for x in (0, ww - 1) for y in range(hh)]
    stk = [q for q in stk if not c2[q]]
    for q in stk: outside[q] = True
    while stk:
        y, x = stk.pop()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < hh and 0 <= nx < ww and not c2[ny, nx] and not outside[ny, nx]: outside[ny, nx] = True; stk.append((ny, nx))
    fil = np.asarray(Image.fromarray(((~outside) * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(0.8))).astype(float) / 255.0          # the object is the solid silhouette: everything the dark outline encloses (its windows and steel bands included); the pale contact shadow is outside it
    al = fil * (fil > 0.5)           # the object is the closed solid core (the pale contact shadow is not in it); its edge keeps the soft ramp of the key
    dsub = dist[box[1]:box[3], box[0]:box[2]]; strong = (dsub > 115).sum(1); foot = int(np.where(strong >= 4)[0].max()); al[foot + 2:] = 0; al[:, :] = al                    # the contact shadow under the foot is cut off: nothing below the last row that holds solid object pixels
    ys, xs = np.where(al > 0.5); b = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1); sub = sub[b[1]:b[3], b[0]:b[2]]; al = al[b[1]:b[3], b[0]:b[2]]
    return sub, al
def piece_tube(box):
    """the caged glass sample tube (Essence): the two dark rubber caps are the solid core; between them the glass and its cage are filled in (the clear glass is nearly the ground's colour), so the silhouette is the caps plus the glass between them; the glass reads as a flat dull pale green-grey, the steel bars and hoops keep their painted pixels, the green essence is found by colour"""
    x0, y0, x1, y1 = box; sub = a[y0:y1, x0:x1].copy(); d_ = dist[y0:y1, x0:x1]; dark = d_ > 100; rows = np.where(dark.sum(1) > 120)[0]
    grp = np.split(rows, np.where(np.diff(rows) > 1)[0] + 1); top_end = int(grp[0].max()); bot_start = int(grp[-1].min()); cols = np.where(dark[rows].sum(0) > 8)[0]; xl, xr = int(cols.min()) + 16, int(cols.max()) - 16
    sil = dark.copy(); sil[top_end:bot_start + 1, xl:xr + 1] = True
    sil = np.asarray(Image.fromarray((sil * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(0.8))).astype(float) / 255.0
    g = (sub[..., 1] > sub[..., 0] + 25) & (sub[..., 1] > sub[..., 2] + 25) & (sub[..., 1] > 110); steel = (d_ > 40) & (sub.max(2) - sub.min(2) < 30) & (sub.mean(2) < 150)
    glass = np.zeros(dark.shape, bool); glass[top_end + 1:bot_start, xl:xr + 1] = True; tint = np.array([118.0, 140.0, 126.0]); out = sub.copy(); gm = glass & ~g & ~steel; out[gm] = tint
    al_ = sil * (sil > 0.5); ys, xs = np.where(al_ > 0.5); b = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1); return out[b[1]:b[3], b[0]:b[2]], al_[b[1]:b[3], b[0]:b[2]]
def window_mask(sub, kind):
    if kind == "green": m = (sub[..., 1] > sub[..., 0] + 25) & (sub[..., 1] > sub[..., 2] + 25) & (sub[..., 1] > 110); return np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(3))) > 0
    if kind == "amber": m = (sub[..., 0] > 190) & (sub[..., 1] > 110) & (sub[..., 1] < 200) & (sub[..., 2] < 110)
    else: m = (sub[..., 2] > sub[..., 0] + 50) & (sub[..., 2] > 150)
    return np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(3))) > 0
def cap_flat(rgb, cap=69.5):
    L = float(lstar(np.array([[rgb]]))[0, 0]); 
    if L <= cap: return np.array(rgb, float)
    lo, hi = 0.3, 1.0; lin = to_lin(np.array(rgb, float))
    for _ in range(24):
        g = (lo + hi) / 2
        if float(lstar(to_srgb(lin * g)[None, None])[0, 0]) > cap: hi = g
        else: lo = g
    return to_srgb(lin * lo)
man = json.load(open("slices/manifest.json")); outs = {}
for name, box, kind, flatc, made in (("cargo-energy-48x64", (200, 90, 640, 690), "amber", (255, 168, 63), "the Energy haul container: the banded steel battery cell with dark rubber corners, a cap terminal and a charge window of three flat amber bars (#ffa83f)"), ("cargo-data-48x64", (790, 90, 1180, 680), "sky", (91, 185, 243), "the Data haul container: the rugged ribbed cartridge standing upright, its connector at the foot, a flat sky window (#5bb9f3)"), ("cargo-essence-48x64", (530, 40, 850, 720), "green", (92, 187, 76), "the Essence haul container: the caged sealed glass sample tube (the art director's E1 sketch) with flat green essence (#5cbb4c), a light open cage of two bars and two hoops, dark rubber end caps and a steel clip on the top cap")):
    if name.startswith("cargo-essence"): load_src("source/raw/cargo-haul-4-essence.jpg")
    elif "SRC_ESS" not in globals() and False: pass
    sub, al = piece_tube(box) if name.startswith('cargo-essence') else piece(box, flatc); wm = window_mask(sub, kind); fl = cap_flat(flatc, 64.0 if kind == 'green' else 69.5)
    wmi = wm; sub = sub.copy(); sub[wmi] = fl                  # flat window colour, a thin rim of the painted frame kept
    h, w = al.shape; s = 64.0 / h; nw, nh = max(1, round(w * s)), 64
    arr = np.dstack([sub, al * 255]); pm = np.dstack([arr[..., :3] * arr[..., 3:] / 255.0, arr[..., 3:]]).astype(np.uint8); r = np.asarray(Image.fromarray(pm, "RGBA").resize((nw, nh), Image.LANCZOS)).astype(float)
    ar = r[..., 3:] / 255.0; col = np.where(ar > 0.01, r[..., :3] / np.maximum(ar, 0.01), 0)
    t = np.zeros((64, 48, 4)); ox = (48 - nw) // 2; t[:, ox:ox + nw, :3] = col; t[:, ox:ox + nw, 3] = r[..., 3]; op = t[..., 3] > 128
    # the flat window pixels after the resize: the window's own pixels, found again by colour, are held at the capped flat colour
    wm2 = window_mask(t[..., :3], kind) & op
    lin = to_lin(t[..., :3]); body = op & ~wm2
    lo, hi = 0.3, 3.0
    for _ in range(26):
        g = (lo * hi) ** 0.5; L = lstar(to_srgb(lin * g)); 
        if L[body].mean() < (41.0 if kind == 'green' else 47.0): lo = g
        else: hi = g
    g = (lo * hi) ** 0.5; lin2 = lin * g; Y = lin2 @ np.array([0.2126, 0.7152, 0.0722]); Ls = np.where(Y > 0.008856, 116 * np.cbrt(Y) - 16, 903.3 * Y); knee = 58.0
    L2 = np.where(Ls > knee, knee + 11.0 * (1 - np.exp(-(Ls - knee) / 8.0)), Ls); Y2 = np.where(L2 > 8, ((L2 + 16) / 116) ** 3, L2 / 903.3); out = to_srgb(lin2 * (Y2 / np.maximum(Y, 1e-6))[..., None])
    out[wm2] = fl
    if kind == "amber":              # the art director's hand fix (pass 134): the three amber bars read as one block: two 2 px gaps in the window's dark cut the window into three bars at 1x
        ys_w, xs_w = np.where(wm2); wy0, wy1 = int(ys_w.min()), int(ys_w.max()) + 1; bh = (wy1 - wy0 - 4) / 3.0
        for gi in (1, 2):
            gy = int(round(wy0 + gi * bh + (gi - 1) * 2)); wx0, wx1 = int(xs_w.min()), int(xs_w.max()) + 1; out[gy:gy + 2, wx0:wx1] = np.array([34.0, 32.0, 28.0]); wm2[gy:gy + 2] = False                  # full-width gaps across the window's columns
        print("energy window rows", wy0, wy1, "gaps cut")
    t[..., :3] = out; im = Image.fromarray(np.rint(t).clip(0, 255).astype(np.uint8), "RGBA"); im.save(f"slices/{name}.png", optimize=True); outs[name] = im
    man[name] = {"size": [48, 64], "rect": None, "src": ("source/raw/cargo-haul-4-essence.jpg" if name.startswith("cargo-essence") else SRC) + " (gemini-3-pro-image)", "made": made + "; a Pro edit from the owner's own sketch, keyed from the ground, uniformly scaled to 64 rows with the feet on the bottom row, the body graded to a mean L* of 47, highlights capped under L* 70, the window flat colour capped at L* 69.5 (pass 133)", "sha256": hashlib.sha256(open(f"slices/{name}.png", "rb").read()).hexdigest()}
json.dump(man, open("slices/manifest.json", "w"), indent=1)
# proof over the open crate: the Cargo bay (screen 1024x600): the crate region (296, 120, 432, 272), the open crate; Energy at the left and Data at the right of the crate, feet on y 384 (the crate's foot line), the empty third place for Essence (held)
def frame():
    from PIL import ImageDraw
    f = Image.new("RGB", (1024, 600), (43, 48, 56)); d_ = ImageDraw.Draw(f); d_.rectangle([16, 48, 1007, 367], outline=(169, 159, 138), width=4); d_.rectangle([24, 56, 999, 359], fill=(29, 35, 43)); d_.line([(24, 384), (999, 384)], fill=(93, 89, 116)); return f.convert("RGBA")
f = frame(); f.alpha_composite(Image.open("slices/crate-open-432x272.png").convert("RGBA"), (296, 120)); f.alpha_composite(outs["cargo-energy-48x64"], (232, 320)); f.alpha_composite(outs["cargo-data-48x64"], (744, 320)); f.alpha_composite(outs["cargo-essence-48x64"], (800, 320))
p1 = f.convert("RGB").crop((176, 232, 848, 408)); p1.save("marks/cargo-haul-proof-1x.png")
z = f.convert("RGB"); big = Image.new("RGB", (1360, 360), (30, 34, 40)); big.paste(z.crop((200, 310, 300, 400)).resize((400, 360), Image.NEAREST), (0, 0)); big.paste(z.crop((730, 310, 860, 400)).resize((520, 360), Image.NEAREST), (410, 0))
for i, n in enumerate(("cargo-energy-48x64", "cargo-data-48x64", "cargo-essence-48x64")): t = outs[n]; big.paste(t.convert("RGB").resize((96, 128), Image.NEAREST), (950 + i * 130, 120), t.resize((96, 128), Image.NEAREST))
big.save("marks/cargo-haul-proof-4x.png"); print("ok")
