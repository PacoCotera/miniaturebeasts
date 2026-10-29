"""The Bay's painted pieces (ux-bay.md; the art director's sign-off ad-bay-closeup.md sections 1 and 3), cut full size first (owner: "full size, we can
scale them down later and that is cheap, upscaling is not"). Raws: source/raw/masters-bay/{landing-a,landing-b,crate-shut-a,crate-open-a,tag-a,parcel-a,
frame-a,cradle-a}.jpg (landing-a kept, not used). The objects are keyed off their flat magenta ground and unmixed as tools/cupsmasters.py keys, cut to their
ink, laid in their box at the painting's own resolution (the full-size master), then reduced in premultiplied alpha, never enlarged.
The landing: landing-b, a feathered band cut from the plain bench front (as tools/baycut.py cuts) so the bench front and floor fall on the spec's heights,
then cropped to 1024:522 at full size; the right third is the painting's own shade (L* 37 behind the ledger, so its cream paper keeps its edge, sign-off 1.2), given a soft umber cast.
Derived at 0 cost: the lid and body layers of the shut crate, the five tag strings, Home's Bay tile, the pods in the straw.
usage: python3 -I tools/baymasters.py   Writes bay/ (masters, slices, proofs) and bay/bay-cuts.json."""
import os, json, hashlib, colorsys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage as nd
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); RAW = f"{R}/source/raw/masters-bay"; OUT = f"{R}/bay"; os.makedirs(OUT, exist_ok=True)
os.makedirs(f"{OUT}/straw", exist_ok=True)
def f32(im): return np.asarray(im, dtype=np.float32)
def img(a, mode="RGB"): return Image.fromarray(np.clip(a + 0.5, 0, 255).astype(np.uint8), mode)
def premul_resize(im, size):
    a = f32(im); al = a[..., 3:4] / 255.0; pm = np.concatenate([a[..., :3] * al, a[..., 3:4]], -1)
    ch = [f32(Image.fromarray(np.ascontiguousarray(pm[..., i]), "F").resize(size, Image.LANCZOS)) for i in range(4)]
    A = np.clip(ch[3], 0, 255); rgb = np.stack(ch[:3], -1) / np.maximum(A[..., None] / 255.0, 1e-6); rgb[A < 0.5] = 0
    return img(np.concatenate([np.clip(rgb, 0, 255), A[..., None]], -1), "RGBA")
rec = {}
def save(im, name, made, raw=None, sub=""):
    p = f"{OUT}/{sub}{name}.png"; im.save(p, optimize=True)
    rec[sub + name] = {"size": list(im.size), "made": made, "raw": raw, "sha256": hashlib.sha256(open(p, "rb").read()).hexdigest()}
def lin(c): c = c / 255.0; return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def unlin(c): return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.clip(c, 0, None) ** (1 / 2.4) - 0.055) * 255

def key(raw):
    """Straight alpha from the flat magenta ground (m = min(r, b) - g), unmixed (tools/cupsmasters.py). Returns the RGBA cut to its ink, the box, the shape."""
    a = f32(Image.open(f"{RAW}/{raw}.jpg").convert("RGB")); r, g, b = a[..., 0], a[..., 1], a[..., 2]
    m = np.minimum(r, b) - g
    edge = np.concatenate([a[:24, :].reshape(-1, 3), a[:, :24].reshape(-1, 3)]); em = np.concatenate([m[:24, :].ravel(), m[:, :24].ravel()])
    bg = np.median(edge[em > np.percentile(em, 50)], 0); mbg = float(np.median(em[em > np.percentile(em, 50)]))
    al = 1 - np.clip((m - 20) / (mbg - 45), 0, 1)
    lab, n = nd.label(al > 0.5); sizes = nd.sum(np.ones_like(al), lab, range(1, n + 1))
    keep = np.isin(lab, 1 + np.where(sizes >= 0.002 * sizes.max())[0])
    al = al * nd.binary_dilation(keep, iterations=6)
    al[al < 0.03] = 0
    fg = (a - (1 - al[..., None]) * bg) / np.maximum(al[..., None], 1e-3)
    fg = np.where(al[..., None] > 0.97, a, fg)
    fg[..., 0] = np.minimum(fg[..., 0], np.maximum(fg[..., 1] + 70, a[..., 0] * (al > 0.97))); fg[..., 2] = np.minimum(fg[..., 2], np.maximum(fg[..., 1] + 40, a[..., 2] * (al > 0.97)))
    rgba = np.concatenate([np.clip(fg, 0, 255), al[..., None] * 255], -1)
    ys, xs = np.where(al > 0.03); box = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
    return img(rgba, "RGBA").crop(box), box, a.shape[:2]
def lay(obj, W, H, x, y):
    c = Image.new("RGBA", (W, H), (0, 0, 0, 0)); c.alpha_composite(obj, (int(round(x)), int(round(y)))); return c
def three(master, name, sizes, made1, raw):
    """Save the full-size master and its reductions (3x, 1x)."""
    save(master, f"{name}-{master.width}x{master.height}", made1, raw)
    for k, sz in sizes: save(premul_resize(master, sz), f"{name}-{sz[0]}x{sz[1]}", f"{k}x, reduced from the master")

# ================= the landing =================
# landing-b at full size (5504x3072). The painting's bench is taller and higher than the layout's; a plain band of the bench front (the painting's
# rows 2123-2565, 442 rows, no seam, no knot) is cut out and its edges blended over 40 rows (baycut.py's feather), then the frame 5000x2549 from
# (100, 80) is the 1024:522 landing: the bench top's standing surface (painting row 1838) falls on the feet line (local 360 = screen 400), the bench
# front on 364-428 (screen 404-468), the floor below. The crop is 5000 wide, so it is reduced (x 0.2048), never enlarged.
A, B, F = 2123, 2565, 40; X0, T0, CW = 100, 80, 5000; CH = round(CW * 522 / 1024)
L = f32(Image.open(f"{RAW}/landing-b.jpg").convert("RGB"))
w = np.linspace(0, 1, F)[None, :, None].transpose(1, 0, 2)
cut = np.concatenate([L[:A], L[A:A + F] * (1 - w) + L[B:B + F] * w, L[B + F:]], 0)
land = cut[T0:T0 + CH, X0:X0 + CW].copy()
s = 1024 / CW
# the right third in shade (sign-off 1.2: the wall behind the ledger [720, 56, 288, 490] a mid umber-grey): the painting's own shade there is L* 37; a soft
# umber cast in linear light (green x 0.96, blue x 0.90 at full) from x 712 to the right edge, fading to none over 712-600, only above the floor (local y <= 428)
H, Wd = land.shape[:2]; xs = np.arange(Wd) * s; ys = np.arange(H) * s                       # master px -> 1x px
fx = np.clip((xs - 600) / 112, 0, 1); fx = fx * fx * (3 - 2 * fx)
fy = 1 - np.clip((ys - 420) / 24, 0, 1)
f = fx[None, :] * fy[:, None]
mul = np.stack([1 - 0.00 * f, 1 - 0.04 * f, 1 - 0.10 * f], -1)          # the painting's own shade is already a mid grey (L* 37 behind the ledger): only an umber cast is added
land = unlin(lin(land) * mul)
LAND = img(land)
three(LAND.convert("RGBA"), "bay-landing", [(3, (3072, 1566)), (1, (1024, 522))],
      "the landing, the Bay's backdrop, master at the painting's own size: landing-b with a 442-row band of the plain bench front cut out and feathered over 40 rows, cropped 5000x2549 from (100, 80); the right third (the painting's own shade, L* 37 behind the ledger) given an umber cast in linear light (green x 0.96, blue x 0.90 at full) from x 712, fading over 600-712, above the floor",
      "source/raw/masters-bay/landing-b.jpg")

def deblack(o, floor=(40, 26, 20)):
    """No pure black in the house: the painting's black gaps (between the slats, under the lid) lifted to a deep umber, the shading kept."""
    a = f32(o); L = a[..., :3].max(-1); k = np.clip((24 - L) / 24, 0, 1)[..., None]
    a[..., :3] = a[..., :3] * (1 - k) + np.array(floor, np.float32) * k + a[..., :3] * k * 0.5; return img(a, "RGBA")

# ================= the field crate, shut: body and lid as separate layers =================
# Uniform scale: the ink (rope handles included) is 4031x2592, so 144 wide is 92.6 tall at 1x; laid in the 144x112 box at the painting's width,
# feet on the last row, the top 19 rows clear. The lid is the board above the painted gap line (ink rows 0-418); the gap and everything below is the body.
o, box, _ = key("crate-shut-a"); o = deblack(o)
S1 = 144 / o.width; Wf, Hf = o.width, round(o.width * 112 / 144); oy = Hf - o.height
GAP = 419                                                     # the first row of the painted gap under the lid (ink rows 419-467 are the gap)
lidm = np.zeros((o.height, o.width), np.float32); lidm[:GAP] = 1
oa = f32(o); lid = oa.copy(); lid[..., 3] *= lidm; body = oa.copy(); body[..., 3] *= 1 - lidm
shut = lay(o, Wf, Hf, 0, oy)
three(shut, "bay-crate-shut", [(3, (432, 336)), (1, (144, 112))], f"the field crate, shut, master at the painting's own size: slatted umber wood, brass corner plates, a hemp rope lashed below the lid with its knot at the front right and a rope handle each side, lit from the upper left; ink {o.width}x{o.height} laid at the box's foot (rows {round(oy*S1)}-111 at 1x), the black gaps lifted to deep umber", "source/raw/masters-bay/crate-shut-a.jpg")
for nm, arr, what in (("bay-crate-shut-lid", lid, "the lid layer alone: the board above the painted gap line, in the same box, so the lift rotates it and it registers on the body"),
                      ("bay-crate-shut-body", body, "the body layer alone: everything from the gap line down, in the same box; under the lid it shows the dark gap as the crate's open top")):
    three(lay(img(arr, "RGBA"), Wf, Hf, 0, oy), nm, [(3, (432, 336)), (1, (144, 112))], what + " (cut at 0 cost from the shut crate)", "source/raw/masters-bay/crate-shut-a.jpg")
KNOT = ((3240 - box[0]) * S1, (oy + 1464 - box[1]) * S1)      # the rope's knot at 1x in the crate's box (the tag hangs from it)

# ================= the field crate, open: the same scale, the body registered on the shut crate's =================
o2, box2, _ = key("crate-open-a"); o2 = deblack(o2)
W1 = 156; Wf2, Hf2 = round(W1 / S1), round(128 / S1)
op = lay(o2, Wf2, Hf2, box2[0] - box[0], Hf2 - o2.height - (box[3] - box2[3]))
three(op, "bay-crate-open", [(3, (468, 384)), (1, (156, 128))], f"the field crate, open, master at the shut crate's scale: the same body with straw heaped to the rim and the lid leaning back behind it; the body registered on the shut crate's (left edge and feet), so placed at the slot's [+4, +24] its feet stand on the same line; 156 wide (the leaning lid reaches 9 px past the body's right edge, into the gap between slots)", "source/raw/masters-bay/crate-open-a.jpg")

# ================= the luggage tag: the paper brought to cream, the string recoloured in five earth colours =================
o3, box3, _ = key("tag-a"); a = f32(o3); r, g, b = a[..., 0], a[..., 1], a[..., 2]
sm = np.clip(((b - np.maximum(r, g)) - 8) / 30, 0, 1)        # the string (painted one clear blue so it can be recoloured)
paper = (a[..., 3] > 250) & (sm == 0); paper[: int(o3.height * 0.3)] = False
pm = lin(a[paper][:, :3]).mean(0); gain = lin(np.array([228., 210., 178.])) / pm           # the painting's salmon cast brought to warm buff paper
a[..., :3] = unlin(lin(a[..., :3]) * gain) * (1 - sm[..., None]) + a[..., :3] * sm[..., None]
ls = (a[..., :3] @ np.array([0.3, 0.59, 0.11], np.float32)); lmean = float(ls[sm > 0.9].mean())
STRINGS = {"moss": (104, 116, 70), "reed": (166, 150, 100), "slate-blue": (88, 108, 132), "rust-brown": (142, 82, 54), "charcoal": (64, 62, 60)}
PLACE = {"moss": "wood", "reed": "meadow", "slate-blue": "pond", "rust-brown": "cave", "charcoal": "rock"}
s3 = 40 / o3.height; Wf3 = round(28 / s3)
for nm, col in STRINGS.items():
    t = a.copy(); shade = (ls / lmean)[..., None]
    t[..., :3] = a[..., :3] * (1 - sm[..., None]) + np.clip(np.array(col, np.float32) * shade, 0, 255) * sm[..., None]
    three(lay(img(t, "RGBA"), Wf3, o3.height, (Wf3 - o3.width) / 2, 0), f"bay-tag-{nm}", [(3, (84, 120)), (1, (28, 40))],
          f"the luggage tag, {nm} string (the {PLACE[nm]} walk), master at the painting's own size: a blank buff paper tag with clipped corners and a ringed hole, its string's two strands meeting on row 0 at the box's centre (the knot it hangs from); the paper's salmon cast brought to buff (linear gain to mean (228, 210, 178)), the painted blue string recoloured to {col} by its own shading (at 0 cost)", "source/raw/masters-bay/tag-a.jpg")

# ================= the portrait parcel and the bare frame (128x104, feet on the last row, centred) =================
def boxed(o, W, H, name, made, raw, sizes):
    s_ = min(W / o.width, H / o.height); Wm, Hm = round(W / s_), round(H / s_)
    m = lay(o, Wm, Hm, (Wm - o.width) / 2, Hm - o.height); three(m, name, sizes, made, raw); return m, s_
o4, _, _ = key("parcel-a")
boxed(o4, 128, 104, "bay-parcel", "the portrait parcel, master at the painting's own size: a flat parcel in brown kraft paper tied with hemp twine in a small bow, standing on its edge leaning back a touch, lit from the upper left; centred, its foot on the last row", "source/raw/masters-bay/parcel-a.jpg", [(3, (384, 312)), (1, (128, 104))])
o5, _, _ = key("frame-a")
fr, s5 = boxed(o5, 128, 104, "bay-frame", "the bare portrait frame (the parcel unwrapped), master at the painting's own size: a plain umber frame with a thin aged-brass inner lip, standing, leaning a touch; its opening is clear (the portrait is placed under it by code, clipped by bay-frame-opening)", "source/raw/masters-bay/frame-a.jpg", [(3, (384, 312)), (1, (128, 104))])
fa = f32(fr)[..., 3] / 255; solid = nd.binary_fill_holes(fa > 0.5); hole = solid & (fa < 0.5)
hole = nd.binary_dilation(hole, iterations=12)                # under the lip a little, so the portrait has no gap at its edge
om = np.zeros(fa.shape + (4,), np.float32); om[..., :3] = 255; om[..., 3] = hole * 255
three(img(om, "RGBA"), "bay-frame-opening", [(3, (384, 312)), (1, (128, 104))], "the frame's opening as a mask (white, alpha = the opening grown 12 master px under the lip): the placer clips the portrait to it and draws it under bay-frame (at 0 cost)", "source/raw/masters-bay/frame-a.jpg")
ys_, xs_ = np.where(hole); OPEN = [round(xs_.min() * s5), round(ys_.min() * s5), round((xs_.max() + 1) * s5), round((ys_.max() + 1) * s5)]

# ================= the Companion's cradle (96x72, the strap's loop on row 0) =================
o6, _, _ = key("cradle-a")
s6 = min(96 / o6.width, 72 / o6.height); Wm, Hm = round(96 / s6), round(72 / s6)
three(lay(o6, Wm, Hm, (Wm - o6.width) / 2, 0), "bay-cradle", [(3, (288, 216)), (1, (96, 72))], "the Companion's cradle, master at the painting's own size: a small umber wooden tray lined with worn leather, two brass rivets, hung by a leather strap loop whose top is row 0 (the peg); empty (the Companion is placed in it by code)", "source/raw/masters-bay/cradle-a.jpg")

# ================= Home's Bay tile, 96x72: the shut crate on a sliver of bench, from the full-size masters, reduced =================
LM = Image.open(f"{OUT}/bay-landing-5000x2549.png").convert("RGBA"); kL = 5000 / 1024
cr = shut.resize((round(144 * kL), round(112 * kL)), Image.LANCZOS)                  # the crate master (4031 wide) reduced to the landing master's scale (703)
tile = LM.copy(); sh = Image.new("L", tile.size, 0); d = ImageDraw.Draw(sh)
cx0 = round(32 * kL); d.ellipse([cx0 + round(4 * kL), round(354 * kL), cx0 + round(140 * kL), round(364 * kL)], fill=120)
sh = sh.filter(ImageFilter.GaussianBlur(4 * kL)); dark = Image.new("RGBA", tile.size, (30, 20, 14, 255)); dark.putalpha(sh); tile.alpha_composite(dark)
tile.alpha_composite(cr, (cx0, round(248 * kL)))
win = (round(8 * kL), round(250 * kL), round(200 * kL), round(394 * kL))             # 192x144 at 1x around the crate, its feet near the foot with a sliver of the bench front
tm = tile.crop(win); save(tm, f"bay-home-tile-{tm.width}x{tm.height}", "Home's Bay tile, master: the shut crate standing on the landing's bench in its window light, with a code contact shadow, from the full-size masters (at 0 cost)", "source/raw/masters-bay/landing-b.jpg + crate-shut-a.jpg")
save(premul_resize(tm, (288, 216)), "bay-home-tile-288x216", "3x, reduced from the master"); save(premul_resize(tm, (96, 72)), "bay-home-tile-96x72", "1x, reduced from the master: Home's Bay tile")

# ================= the pods in the straw, 40x48 (3x 120x144): every kind of the shelf class, reduced from pod-shelf-<kind> =================
# One transform for every layer of a kind, from the identified pod's ink (so the layers register): the ink centred, its feet on the last row.
P = f"{R}/shelf/pods"; KINDS = sorted(n[len("pod-shelf-"):-len("-192x228.png")] for n in os.listdir(P) if n.endswith("-192x228.png"))
def straw(src, W, H, ref):
    im = Image.open(src).convert("RGBA"); al = f32(Image.open(ref).convert("RGBA"))[..., 3]
    ys, xs = np.where(al > 8); bx = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1); bw, bh = bx[2] - bx[0], bx[3] - bx[1]
    k = min(W / bw, H / bh); tw, th = round(bw * k), round(bh * k)
    part = premul_resize(im.crop(bx), (tw, th)); return lay(part, W, H, (W - tw) / 2, H - th)
for kd in KINDS:
    save(straw(f"{P}/pod-shelf-{kd}-192x228.png", 40, 48, f"{P}/pod-shelf-identified-192x228.png"), f"pod-straw-{kd}-40x48", f"the pod in the crate's straw ({kd}), 1x: reduced from pod-shelf-{kd}-192x228 (never from the 64x76 slice), the ink centred in 40x48, feet on the last row (at 0 cost)", sub="straw/")
    save(straw(f"{P}/pod-shelf-{kd}-1328x1577.png", 120, 144, f"{P}/pod-shelf-identified-1328x1577.png"), f"pod-straw-{kd}-120x144", f"3x, reduced from the full-size shelf master", sub="straw/")
json.dump({"cuts": rec, "knot_1x": [round(KNOT[0], 1), round(KNOT[1], 1)], "frame_opening_1x": OPEN, "strings": STRINGS, "string_place": PLACE}, open(f"{OUT}/bay-cuts.json", "w"), indent=1)
print("knot", KNOT, "opening", OPEN, len(rec))
