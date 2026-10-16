"""Pass 138: the art director's hand recut of Home's walk crate (no calls; the Station lead's yes, 2026-10-11).
home-crate-48x40: the signed crate-sealed-256x176 (963f4eab), reduced uniformly (premultiplied Lanczos, never enlarged) to 46 px wide, 1 px clear each side, its feet on the box's bottom row 39, exactly as crate-sitting-48x40 (pass 137), so the walk and sitting crates in Home's bay are one object at one size. Nothing retouched.
python3 -I tools/homecrate48.py [path to the old home-crate-48x40.png, for the proof's before row] -> slices/home-crate-48x40.png, marks/home-crate-recut-proof-1x.png, -4x.png"""
import os, sys, json, hashlib
import numpy as np
from PIL import Image, ImageDraw
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
exec(open("tools/lightfit.py").read(), globals())
def small(src):
    s = np.asarray(Image.open(src).convert("RGBA")).astype(float); ys, xs = np.where(s[..., 3] > 0); sub = s[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    sc = 46.0 / sub.shape[1]; nh = round(sub.shape[0] * sc); pm = np.dstack([sub[..., :3] * sub[..., 3:] / 255.0, sub[..., 3:]]).astype(np.uint8)
    r = np.asarray(Image.fromarray(pm, "RGBA").resize((46, nh), Image.LANCZOS)).astype(float); al = r[..., 3:] / 255.0
    r = np.dstack([np.where(al > 0.004, r[..., :3] / np.maximum(al, 0.004), 0), r[..., 3:]]).clip(0, 255); c = np.zeros((40, 48, 4)); c[40 - nh:40, 1:47] = r; return c, sc, nh
c, sc, nh = small("slices/crate-sealed-256x176.png"); n = "home-crate-48x40"
t = Image.fromarray(np.rint(c).clip(0, 255).astype(np.uint8), "RGBA"); t.save(f"slices/{n}.png", optimize=True)
op = c[..., 3] > 128; L_ = lstar(c[..., :3])[op]; Lc = (float(L_.mean()), float((c[..., 0] - c[..., 2])[op].mean()), float((L_ > 70).mean() * 100))
man = json.load(open("slices/manifest.json"))
man[n] = {"size": [48, 40], "rect": None, "src": "slices/crate-sealed-256x176.png (signed 963f4eab), by hand",
    "made": f"Home's walk crate, the bay's sealed crate (home.json cargo.cratePicture): the signed crate-sealed-256x176 reduced uniformly (scale {sc:.4f}, never enlarged) to 46x{nh}, 1 px clear at each side, the feet on row 39, as crate-sitting-48x40; the orange seal tag kept, nothing retouched (pass 138)",
    "sha256": hashlib.sha256(open(f"slices/{n}.png", "rb").read()).hexdigest(), "status": "signed", "signed_in": "art director, hand recut (pass 138)",
    "status_note": f"signed (art director) at 1x, opaque pixels: L* {Lc[0]:.1f}, mean R-B {Lc[1]:.1f}, {Lc[2]:.1f} percent above L* 70; one object with the sitting crate and Cargo's crates, beside the open bay (pass 137)",
    "replaces": "home-crate-48x40 sha256 87d9a930ffd6 on main (art/station-masters/home-hand/slices, #116, signed): a walk crate typed by hand (source/home_marks.py), flat pixel work that read as another hand beside the painted bay and crates"}
json.dump(man, open("slices/manifest.json", "w"), indent=1)
old = Image.open(sys.argv[1]).convert("RGBA") if len(sys.argv) > 1 else None
bay = Image.open("slices/home-bay-open-176x72.png").convert("RGBA"); sit = Image.open("slices/crate-sitting-48x40.png").convert("RGBA")
def module(crates, walk):
    m = Image.new("RGBA", (320, 88), (43, 48, 56, 255)); d = ImageDraw.Draw(m); d.rectangle([0, 0, 319, 87], outline=(90, 96, 104)); m.alpha_composite(bay, (112, 8))
    for k, kind in enumerate(crates):
        m.alpha_composite(sit if kind == "s" else walk, (112 + 64 * k, 24))
        if kind == "s": d.rectangle([112 + 64 * k + 18, 68, 112 + 64 * k + 29, 79], fill=(120, 180, 210))
    return m
rows = [("w", t), ("ww", t), ("www", t), ("wws", t), ("ws", t)] + ([("wws", old)] if old else [])
P = Image.new("RGBA", (2 * 336 + 8, 3 * 96 + 8), (29, 33, 40, 255))
for i, (cr, w) in enumerate(rows): P.alpha_composite(module(cr, w), (8 + (i % 2) * 336, 8 + (i // 2) * 96))
P.convert("RGB").save("marks/home-crate-recut-proof-1x.png"); P.resize((P.width * 4, P.height * 4), Image.NEAREST).convert("RGB").save("marks/home-crate-recut-proof-4x.png")
print("crate", Lc, "nh", nh, man[n]["sha256"][:12])
