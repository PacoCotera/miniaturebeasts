"""Pass 137: the art director's hand recut of Home's bay and the small sitting crate (0 MXN, no calls), for the architect's unplaced-masters refresh (r2, section 4).
1. home-bay-open-176x72, home-bay-shut-176x72: the module's bay ground at its exact region (home.json regions.cargo.bay [112, 8, 176, 72], screen (800, 56, 176, 72)), no case in it. The column's sibling of the signed chamber (home-chamber-empty-72x72): a sage plate with screws, a grey metal framed recess, the warm dim interior, and a sage moulded floor with three crate places under UI/UX's crate rects (bay x 0, 64, 128; y 16 to 56, so the feet stand on the floor's line at y 56), two metal posts between the places (bay x 54-58, 118-122, seen between the crates), the plate plain under the crates where the sitting lamps go (bay (18 + 64k, 60, 12, 12)) and plain behind the waiting mark (bay (76, 24, 24, 24)). The shut bay is the same plate and frame, a sage roller shutter over the recess with a sand pull, registered pixel for pixel. Drawn at 4x and reduced with Lanczos, a fine seeded matte grain (about +-1.5 L) laid over at 1x.
2. crate-sitting-48x40: the signed crate-sitting-256x176 (963f4eab), reduced uniformly (premultiplied Lanczos, never enlarged) to 46 px wide, 1 px clear each side, its feet on the box's bottom row as the walk crate home-crate-48x40; nothing retouched (the plate reads at 1x as reduced).
python3 -I tools/homebayrecut.py [path to home-crate-48x40.png, for the proof] -> slices/home-bay-{open,shut}-176x72.png, slices/crate-sitting-48x40.png, marks/home-bay-recut-proof-1x.png, marks/home-bay-recut-proof-4x.png"""
import os, json, hashlib
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
exec(open("tools/lightfit.py").read(), globals())
Z = 4; W, H = 176, 72

def grad(c0, c1, w, h, axis="xy"):
    """a smooth ramp from c0 at the top left to c1 at the bottom right (the light from the top left)"""
    yy, xx = np.mgrid[0:h, 0:w].astype(float); t = (xx / max(w - 1, 1) * 0.45 + yy / max(h - 1, 1) * 0.55) if axis == "xy" else (yy / max(h - 1, 1))
    return np.array(c0, float)[None, None] * (1 - t[..., None]) + np.array(c1, float)[None, None] * t[..., None]

def rr(mask_w, mask_h, box, r):
    m = Image.new("L", (mask_w, mask_h), 0); ImageDraw.Draw(m).rounded_rectangle([box[0] * Z, box[1] * Z, box[2] * Z - 1, box[3] * Z - 1], radius=r * Z, fill=255); return np.asarray(m).astype(float) / 255.0

def put(img, mask, col):
    col = np.asarray(col, float)
    if col.ndim == 1: col = col[None, None]
    img[...] = img * (1 - mask[..., None]) + col * mask[..., None]

def band(box):
    m = np.zeros((H * Z, W * Z)); m[box[1] * Z:box[3] * Z, box[0] * Z:box[2] * Z] = 1; return m

def base_plate():
    """the sage plate, its bevel, the metal frame of the recess, the screws: shared by open and shut so they register"""
    img = grad((150, 154, 128), (104, 110, 90), W * Z, H * Z); alpha = rr(W * Z, H * Z, (0, 0, 176, 72), 3)
    put(img, band((0, 0, 176, 1)) * alpha, (178, 179, 154)); put(img, band((0, 0, 1, 72)) * alpha, (170, 172, 148))      # lit top and left edge
    put(img, band((0, 71, 176, 72)) * alpha, (62, 70, 58)); put(img, band((175, 0, 176, 72)) * alpha, (70, 78, 66))      # shade at the bottom and right
    fo = rr(W * Z, H * Z, (3, 4, 173, 60), 3); fi = rr(W * Z, H * Z, (6, 7, 170, 57), 2)
    put(img, fo, grad((146, 145, 134), (88, 90, 82), W * Z, H * Z, "y"))                                                  # the grey metal frame, as the chamber's window frame
    put(img, fo * band((3, 4, 173, 5)), (176, 174, 162)); put(img, fo * band((3, 4, 4, 60)), (160, 158, 146))              # its lit outer lip
    put(img, fo * band((3, 59, 173, 60)), (60, 62, 56)); put(img, fo * band((172, 4, 173, 60)), (66, 68, 62))
    put(img, fo * band((5, 6, 171, 7)) * (1 - fi), (72, 74, 68))                                                          # the inner edge of the frame, in shade
    for cx in (6.5, 169.5):                                                                                               # two screws on the plate below the frame, clear of the lamps
        m = Image.new("L", (W * Z, H * Z), 0); d = ImageDraw.Draw(m); d.ellipse([(cx - 2) * Z, (66 - 2) * Z, (cx + 2) * Z, (66 + 2) * Z], fill=255); sm = np.asarray(m) / 255.0
        put(img, sm, (64, 66, 58)); m2 = Image.new("L", (W * Z, H * Z), 0); ImageDraw.Draw(m2).ellipse([(cx - 1.2) * Z, (66 - 1.2) * Z, (cx + 1.0) * Z, (66 + 1.0) * Z], fill=255)
        put(img, np.asarray(m2) / 255.0, (122, 122, 112)); put(img, np.asarray(m2) / 255.0 * band((0, 63, 176, 66)) * band((0, 0, int(cx), 72)), (160, 158, 146))
    return img, alpha, fi

def interior(img, fi):
    """the open bay: the warm dim back wall, the posts, the sage floor and its three places"""
    yy, xx = np.mgrid[0:H * Z, 0:W * Z].astype(float) / Z
    wall = np.array((52, 50, 42), float)[None, None] + np.array((40, 30, 18), float)[None, None] * np.clip(1 - np.hypot((xx - 88) / 95, (yy - 20) / 30), 0, 1)[..., None] ** 1.5   # a warm fall of light from the top centre, never a glow
    wall = wall * (0.72 + 0.28 * np.clip((yy - 7) / 6, 0, 1))[..., None]                                              # the shade under the frame's top lip
    wall = wall * (0.80 + 0.20 * np.clip((xx - 6) / 5, 0, 1))[..., None]                                              # and inside its left side (the light is top left)
    put(img, fi * band((6, 7, 170, 46)), wall)
    floor = grad((134, 136, 112), (104, 108, 88), W * Z, H * Z, "y"); fl = fi * band((6, 45, 170, 57))
    put(img, fl, floor); put(img, fi * band((6, 45, 170, 46)), (46, 48, 40))                                          # the join of wall and floor
    put(img, fi * band((6, 46, 170, 47)), (148, 150, 126))                                                            # the floor's lit back edge
    for cx in (24, 88, 152):                                                                                           # the three places: shallow moulded pads under the crates, lit from the top left
        x0, x1 = cx - 19, cx + 19
        put(img, band((x0, 48, x1, 55)) * fi, (114, 118, 96)); put(img, band((x0, 48, x1, 49)) * fi, (84, 88, 72)); put(img, band((x0, 48, x0 + 1, 55)) * fi, (90, 94, 78))
        put(img, band((x0, 54, x1, 55)) * fi, (140, 142, 118)); put(img, band((x1 - 1, 48, x1, 55)) * fi, (132, 134, 112))
    for px in (54, 118):                                                                                               # the posts between the places, the frame's metal
        put(img, band((px, 7, px + 4, 46)), grad((132, 131, 120), (84, 86, 78), W * Z, H * Z, "y")); put(img, band((px, 7, px + 1, 46)), (160, 158, 146)); put(img, band((px + 3, 7, px + 4, 46)), (58, 60, 54))
        put(img, band((px - 2, 44, px + 6, 47)), (112, 112, 102)); put(img, band((px - 2, 44, px + 6, 45)), (150, 148, 136)); put(img, band((px - 2, 46, px + 6, 47)), (64, 66, 58))
        put(img, band((px + 4, 9, px + 6, 44)) * fi, (40, 38, 32))                                                    # the post's shadow on the wall, to the right
    put(img, fi * band((6, 56, 170, 57)), (150, 152, 128))                                                            # the floor's front edge, lit

def shutter(img, fi):
    """the shut bay: a sage roller shutter over the recess, slats every 5 px, a heavier bottom bar with a sand pull"""
    slat = grad((156, 160, 134), (112, 118, 96), W * Z, H * Z, "xy"); put(img, fi * band((6, 7, 170, 57)), slat)
    for y in range(7, 52, 5):
        put(img, fi * band((6, y, 170, y + 1)), (172, 174, 150)); put(img, fi * band((6, y + 4, 170, y + 5)), (78, 84, 70))
    put(img, fi * band((6, 7, 170, 9)) * 0.55, (40, 42, 36))                                                          # the frame's lip shades the top slat
    put(img, fi * band((6, 52, 170, 57)), grad((140, 144, 120), (100, 106, 86), W * Z, H * Z, "y")); put(img, fi * band((6, 52, 170, 53)), (176, 176, 152)); put(img, fi * band((6, 56, 170, 57)), (70, 76, 64))
    m = rr(W * Z, H * Z, (78, 53, 98, 56), 1); put(img, m, (198, 182, 142)); put(img, m * band((78, 53, 98, 54)), (226, 214, 180)); put(img, m * band((78, 55, 98, 56)), (138, 124, 92))

def grain(n):
    """a fine matte grain, about +-1.5 in light, seeded and softened 0.6 px (a tiled high-pass of the sheet was tried and showed its repeat at 1x)"""
    rng = np.random.default_rng(n); g = rng.normal(0, 1.0, (H, W)); g = np.asarray(Image.fromarray(np.clip(g * 40 + 128, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))).astype(float)
    g = (g - g.mean()) / max(g.std(), 1e-6) * 1.2; return np.clip(g, -3, 3)

def reduce(img, alpha):
    pm = np.dstack([img * alpha[..., None], alpha * 255]).clip(0, 255).astype(np.uint8); r = np.asarray(Image.fromarray(pm, "RGBA").resize((W, H), Image.LANCZOS)).astype(float)
    al = r[..., 3:] / 255.0; return np.dstack([np.where(al > 0.004, r[..., :3] / np.maximum(al, 0.004), 0), r[..., 3:]]).clip(0, 255)

man = json.load(open("slices/manifest.json")); outs = {}
def save(n, arr, made, src, note):
    t = Image.fromarray(np.rint(arr).clip(0, 255).astype(np.uint8), "RGBA"); t.save(f"slices/{n}.png", optimize=True); outs[n] = t
    prev = man.get(n, {}); e = {"size": list(t.size), "rect": None, "src": src, "made": made + " (pass 137)", "sha256": hashlib.sha256(open(f"slices/{n}.png", "rb").read()).hexdigest(), "status": "signed", "signed_in": "art director, hand recut (pass 137)", "status_note": note}
    if prev.get("sha256"): e["replaces"] = f"{n} sha256 {prev['sha256'][:12]} ({prev.get('signed_in', '')}): {prev.get('made', '')[:120]}"
    man[n] = e
G = grain(137)
for state in ("open", "shut"):
    img, alpha, fi = base_plate(); (interior if state == "open" else shutter)(img, fi); t = reduce(img, alpha); t[..., :3] = (t[..., :3] + G[..., None]).clip(0, 255)
    outs[f"home-bay-{state}-176x72"] = t
L = {}
for state in ("open", "shut"):
    t = outs[f"home-bay-{state}-176x72"]; op = t[..., 3] > 128; L[state] = (float(lstar(t[..., :3])[op].mean()), float((t[..., 0] - t[..., 2])[op].mean()), float((lstar(t[..., :3])[op] > 70).mean() * 100))
SRCB = "by hand, no source picture: drawn at 4x and reduced; colours from the signed home-chamber-empty-72x72 (its plate, window frame and warm interior)"
save("home-bay-open-176x72", outs["home-bay-open-176x72"], "Home's Cargo bay, open and empty: the module's bay ground at its region (home.json cargo.bay, screen 800,56,176,72), no case: a sage plate with two screws, a grey metal framed recess (3,4)-(173,60), the warm dim back wall, two metal posts at x 54 and 118 between the places, a sage moulded floor (y 45-57) with three shallow places under the crate rects (x 0, 64, 128, 48x40, feet on y 56); the plate plain under the crates for the sitting lamps (18+64k, 60) and behind the waiting mark (76, 24)", SRCB,
     f"signed (art director) at 1x, opaque pixels: L* {L['open'][0]:.1f}, mean R-B {L['open'][1]:.1f}, {L['open'][2]:.1f} percent above L* 70; the column's sibling of the chamber, the walk and sitting crates stand on its floor line")
save("home-bay-shut-176x72", outs["home-bay-shut-176x72"], "Home's Cargo bay, shut (away, no sitting crate): the same plate, frame and screws as home-bay-open-176x72, registered pixel for pixel, a sage roller shutter over the recess (slats every 5 px, the light from the top left) with a sand pull at x 78-98", SRCB,
     f"signed (art director) at 1x, opaque pixels: L* {L['shut'][0]:.1f}, mean R-B {L['shut'][1]:.1f}, {L['shut'][2]:.1f} percent above L* 70; registers with the open bay outside the recess")

# --- 2. the sitting crate at Home's 48x40
s = np.asarray(Image.open("slices/crate-sitting-256x176.png").convert("RGBA")).astype(float); ys, xs = np.where(s[..., 3] > 0); bx = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
sub = s[bx[1]:bx[3], bx[0]:bx[2]]; sc = 46.0 / sub.shape[1]; nw, nh = 46, round(sub.shape[0] * sc)
pm = np.dstack([sub[..., :3] * sub[..., 3:] / 255.0, sub[..., 3:]]).astype(np.uint8); r = np.asarray(Image.fromarray(pm, "RGBA").resize((nw, nh), Image.LANCZOS)).astype(float)
al = r[..., 3:] / 255.0; r = np.dstack([np.where(al > 0.004, r[..., :3] / np.maximum(al, 0.004), 0), r[..., 3:]]).clip(0, 255)
c = np.zeros((40, 48, 4)); c[40 - nh:40, 1:1 + nw] = r
save("crate-sitting-48x40", c, f"the sitting Cargo crate at Home's crate size (home.json cargo.sittingCrates asset, sitting.json): the signed crate-sitting-256x176 reduced uniformly (scale {sc:.4f}, never enlarged) to 46x{nh}, 1 px clear at each side, the feet on the box's bottom row as home-crate-48x40; nothing retouched: the 48x32 brass plate reduces to a 10x7 mark that reads at 1x; replaces crate-sitting-80x56 for Home",
     "slices/crate-sitting-256x176.png (signed 963f4eab), by hand", "")
t = c; op = t[..., 3] > 128; Lc = (float(lstar(t[..., :3])[op].mean()), float((t[..., 0] - t[..., 2])[op].mean()), float((lstar(t[..., :3])[op] > 70).mean() * 100))
man["crate-sitting-48x40"]["status_note"] = f"signed (art director) at 1x, opaque pixels: L* {Lc[0]:.1f}, mean R-B {Lc[1]:.1f}, {Lc[2]:.1f} percent above L* 70; the 256 crate reduced, the plate a 10x7 brass mark; inside the crate band (L* 48.0 +-4, mean R-B 13.5 +-8)"
if "crate-sitting-80x56" in man:
    man["crate-sitting-80x56"]["status"] = "withdrawn"; man["crate-sitting-80x56"]["status_note"] = "withdrawn (art director, pass 137): no region is 80x56; Home's and the Sitting's crate is 48x40 (home.json cargo.crate, sitting.json); replaced by crate-sitting-48x40. The file stays as the record"
json.dump(man, open("slices/manifest.json", "w"), indent=1)

# --- proofs: the module at 1x on the module panel with 0..3 crates (walk and sitting), open and shut, and 4x
import sys
walk = Image.open(sys.argv[1]).convert("RGBA") if len(sys.argv) > 1 else None   # the walk crate home-crate-48x40 (main, art/station-masters/home-hand/slices), for the proof only
def module(state, crates):
    m = Image.new("RGBA", (320, 88), (43, 48, 56, 255)); d = ImageDraw.Draw(m); d.rectangle([0, 0, 319, 87], outline=(90, 96, 104)); m.alpha_composite(outs[f"home-bay-{state}-176x72"], (112, 8))
    for k, kind in enumerate(crates):
        p = outs["crate-sitting-48x40"] if kind == "s" else walk
        if p is not None: m.alpha_composite(p, (112 + 64 * k, 24))
        if kind == "s": d.rectangle([112 + 64 * k + 18, 68, 112 + 64 * k + 29, 79], fill=(120, 180, 210))
    return m
rows = [("open", ""), ("open", "w"), ("open", "ww"), ("open", "www"), ("open", "wws"), ("shut", ""), ("open", "s")]
P = Image.new("RGBA", (2 * 336 + 8, 4 * 96 + 8), (29, 33, 40, 255))
for i, (st, cr) in enumerate(rows): P.alpha_composite(module(st, cr), (8 + (i % 2) * 336, 8 + (i // 2) * 96))
P.alpha_composite(outs["crate-sitting-48x40"], (8 + 336 + 8, 8 + 3 * 96 + 8)); P.alpha_composite(Image.open("slices/crate-sitting-80x56.png").convert("RGBA"), (8 + 336 + 72, 8 + 3 * 96 + 8))
P.convert("RGB").save("marks/home-bay-recut-proof-1x.png"); P.resize((P.width * 4, P.height * 4), Image.NEAREST).convert("RGB").save("marks/home-bay-recut-proof-4x.png")
print("L", L, "crate", Lc, "nh", nh)
