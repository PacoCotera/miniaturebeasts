"""T-20261016-41 (Create, the gene bench; specs/station-create-bench-spec.md §2, §3, §7): the bench and its parts. By hand in code, no paid call.
The concept's mood note (specs/create-concept.md): a workbench in warm daylight, the accepted Pods housing and bench; the drums moulded field-gear
polymer in the housing's sage, rounded and handled, worn where a thumb turns them; their windows recessed and lit from the top left; matte;
every object casting a soft shadow onto the bench. The house rules hold: one key light from the top left, no gloss, no chrome, no glow.
- create-bench 1024x522 at (0, 40): the calm Pods ground (incubator-b/make-stage.py --ground: Pods' clean stage, the sage bezel pixel for
  pixel, the floor in its own tone and grain) with three moulded recesses: the well's seat (a soft round seat under the well, centre (192, 152)
  in the slice, r 98), the dish's cut-out (a capsule 400 x 28 at (312, 332)), the tray (848 x 122 at (88, 368), corners 12), each 2-3 px deep,
  its near wall in shade and its far wall catching the light, its floor the bench x0.62 (the tray x0.55).
- create-well 192x192: Pods' fitted well (ring-collection-idle's piece of the Pods room sheet, source/raw/pods-room-sheet.jpg, (200, 500) r 168)
  cut at 192 the way tools/podsroom2.py cuts it (reduced with Lanczos, never enlarged; a round alpha feathered 1 px).
- create-gene-line 24x216: a braided hose (the guide's material), its weave diagonal, lambert round its section, sand ferrules at both ends.
- create-dish 400x28: a moss pad (the vivarium's own painted moss) in a low moulded sage rim.
- create-drum-rest/-pinned/-capped/-clash 80x80: the drum, its 64x64 window at (8, 8) left clear (a 2 px inner shade on its top and left
  walls at partial alpha); pinned: two linked rings engraved in the bottom rim; capped: the frost veil over the window (`frost`, the house's
  frost); clash: a 2 px `red` line round the rim.
- create-drum-notch 12x8 (`cream`), create-drum-turn-up/-down 16x8 (`bone` triangles, engraved shade), create-bank-more-left/-right 16x80 (a soft
  fall into shade at the tray's edge and a `mist` chevron).
usage: python3 -I create-bench/make-create.py SLICES_DIR GROUND.png VIVARIUM_DAY.png OUT_DIR"""
import sys, os, json, numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as nd
sl, ground_png, viv, out = sys.argv[1:5]
pal = dict(json.load(open(os.path.join(sl, "../../../../prototypes/ui/palettes/station.json")))["colours"])
P = lambda n: [int(pal[n][i:i + 2], 16) for i in (1, 3, 5)]
def lin(c): c = np.asarray(c, float) / 255; return np.where(c <= .04045, c / 12.92, ((c + .055) / 1.055) ** 2.4)
def srgb(l): l = np.clip(l, 0, 1); return np.where(l <= .0031308, l * 12.92, 1.055 * l ** (1 / 2.4) - .055) * 255
L = np.array([-0.55, -0.62, 0.56]); L /= np.linalg.norm(L)
SAGE_MID, SAGE_SH = lin([136, 142, 112]), lin([98, 102, 79]); RIM = lin([204, 211, 181]); SAND = lin([196, 178, 140]); RUBBER = lin([46, 45, 48])
def shade_of(h, S):
    gy, gx = np.gradient(nd.gaussian_filter(h, S * .45)); gx *= S; gy *= S
    n = np.dstack([-gx, -gy, np.ones_like(gx)]); n /= np.linalg.norm(n, axis=2, keepdims=True)
    return np.clip(n @ L, 0, 1) / L[2], n
def save(name, rgb_lin, a):
    img = np.dstack([srgb(rgb_lin), np.clip(a, 0, 1) * 255]); img[a <= 0] = 0
    Image.fromarray(np.clip(np.rint(img), 0, 255).astype(np.uint8), "RGBA").save(os.path.join(out, name + ".png")); return img
def rrect_d(xx, yy, x0, y0, x1, y1, r):
    """signed distance inside a rounded rectangle (positive inside)"""
    cx = np.clip(xx, x0 + r, x1 - r); cy = np.clip(yy, y0 + r, y1 - r)
    return r - np.hypot(xx - cx, yy - cy)
# ---------- create-bench
g = np.asarray(Image.open(ground_png).convert("RGBA")).astype(float); H, W = g.shape[:2]; S = 4
Y4, X4 = (np.mgrid[0:H * S, 0:W * S] + .5) / S
seat_d = 98 - np.hypot(X4 - 192, Y4 - 152)
dish_d = rrect_d(X4, Y4, 312, 332, 712, 360, 14)
tray_d = rrect_d(X4, Y4, 88, 368, 936, 490, 12)
def recess(d, depth, wall):
    return -depth * np.clip(d / wall, 0, 1) * (d > 0)
h = recess(seat_d, 1.5, 3.0) + recess(dish_d, 2.0, 1.5) + recess(tray_d, 3.0, 2.0)
lam, _ = shade_of(h, S)
dn = lambda img, s=S: img.reshape(img.shape[0] // s, s, img.shape[1] // s, s, *img.shape[2:]).mean((1, 3))
ins = {k: dn((d > 0).astype(np.float32)) for k, d in (("seat", seat_d), ("dish", dish_d), ("tray", tray_d))}
lam1 = dn(np.where(h < 0, lam, 1.0).astype(np.float32))
k = np.ones((H, W)); k = k * (1 - ins["seat"] * 0.18) * (1 - ins["dish"] * 0.38) * (1 - ins["tray"] * 0.45)
k = k * np.where((ins["seat"] + ins["dish"] + ins["tray"]) > 0, lam1, 1.0)
lip = dn((((seat_d <= 0) & (seat_d > -1.2)) | ((dish_d <= 0) & (dish_d > -1.2)) | ((tray_d <= 0) & (tray_d > -1.2))).astype(np.float32))
b = lin(g[..., :3]) * k[..., None] * (1 - 0.2 * lip[..., None])
save("create-bench", b, np.ones((H, W)))
# ---------- create-well (Pods' room sheet, cut at 192 as podsroom2.py cuts the 176)
sheet = Image.open(os.path.join(sl, "../source/raw/pods-room-sheet.jpg")).convert("RGB")
im = sheet.crop((200 - 168, 500 - 168, 200 + 168, 500 + 168)).resize((192, 192), Image.LANCZOS)
m = Image.new("L", (768, 768), 0); ImageDraw.Draw(m).ellipse([0, 0, 767, 767], fill=255); m = m.resize((192, 192), Image.LANCZOS)
w = im.convert("RGBA"); w.putalpha(m); w.save(os.path.join(out, "create-well.png"))
# ---------- create-gene-line 24 x 216: braided hose, centre x 12, radius 7, sand ferrules (rows 0-14 and 202-216)
S2 = 8; Hh, Wh = 216, 24
yy, xx = (np.mgrid[0:Hh * S2, 0:Wh * S2] + .5) / S2
R = 7.0; u = (xx - 12) / R; body = np.abs(u) <= 1
nz = np.sqrt(np.clip(1 - u ** 2, 0, 1)); nrm = np.dstack([u, np.zeros_like(u), nz])
lamh = np.clip(nrm @ L, 0, 1) / L[2]
weave = (np.sin((yy * 0.9 + xx * 1.6) * 1.1) * np.sin((yy * 0.9 - xx * 1.6) * 1.1))                      # a diagonal braid
col = RUBBER * (0.55 + 0.6 * lamh)[..., None] * (1 + 0.22 * weave)[..., None]
fer = ((yy < 14) | (yy > Hh - 14)) & (np.abs(u) <= 1.25)
uf = np.clip((xx - 12) / 8.75, -1, 1); lamf = np.clip(np.dstack([uf, np.zeros_like(uf), np.sqrt(np.clip(1 - uf ** 2, 0, 1))]) @ L, 0, 1) / L[2]
col[fer] = (SAND * 0.75 * (0.5 + 0.65 * lamf)[..., None])[fer]
groove = fer & ((np.abs(yy - 5) < .6) | (np.abs(yy - (Hh - 5)) < .6))
col[groove] = col[groove] * 0.6
a = (body | fer).astype(np.float32)
save("create-gene-line", dn(col * a[..., None], S2) / np.maximum(dn(a, S2), 1e-6)[..., None], dn(a, S2))
# ---------- create-dish 400 x 28: moss in a low sage rim
S3 = 4; Hd, Wd = 28, 400
yy, xx = (np.mgrid[0:Hd * S3, 0:Wd * S3] + .5) / S3
d_out = rrect_d(xx, yy, 0, 0, Wd, Hd, 14); d_in = rrect_d(xx, yy, 4, 3, Wd - 4, Hd - 4, 11)
rim = (d_out > 0) & (d_in <= 0)
hd = np.where(rim, 2.2 * np.sin(np.clip(d_out / 4, 0, 1) * np.pi), 0)
lamd, _ = shade_of(hd, S3)
sheen = np.clip(lamd - 1, 0, 0.6)
coll = SAGE_SH * (0.55 + 0.6 * lamd)[..., None] + RIM * sheen[..., None] * 0.6
V = np.asarray(Image.open(viv).convert("RGB")).astype(float)
moss = np.vstack([V[466:500, 760:984]] * 1)                                  # the vivarium's moss bed, 224 x 34
mx = 223.99 - np.abs((xx % 447.98) - 223.99)                     # the moss mirrored, never repeated with a seam
my = np.clip((yy - 3) / 21 * 33.99, 0, 33.99)
ms = np.stack([nd.map_coordinates(moss[..., c], [my, mx], order=1) for c in range(3)], -1)
pad = d_in > 0
mound = np.clip(d_in / 6, 0, 1)
coll[pad] = (lin(ms) * (0.6 + 0.4 * mound)[..., None])[pad]
a = (d_out > 0).astype(np.float32)
save("create-dish", dn(coll * a[..., None], S3) / np.maximum(dn(a, S3), 1e-6)[..., None], dn(a, S3))
# ---------- the drums 80 x 80
S4 = 8; N = 80
yy, xx = (np.mgrid[0:N * S4, 0:N * S4] + .5) / S4
d_out = rrect_d(xx, yy, 0, 0, N, N, 10); d_win = rrect_d(xx, yy, 8, 8, 72, 72, 4)
body = (d_out > 0) & (d_win <= 0)
cyl = np.cos(np.clip((yy - 40) / 40, -1, 1) * np.pi / 2.2)                   # a drum on a horizontal axis: its face rounds away top and bottom
hdr = 3 * np.sin(np.clip(d_out / 3, 0, 1) * np.pi / 2) * (0.6 + 0.4 * cyl) + np.where(d_win <= 0, 1.2 * np.clip(-d_win / 2, 0, 1), 0)
lamr, n = shade_of(hdr, S4)
lamr = lamr * (0.72 + 0.28 * (1 - np.abs(yy - 30) / 50))                      # the key from above on the drum's round
sheen = np.clip((n @ L - L[2]) / (1 - L[2]), 0, 1) * (d_out < 3)
wear = np.exp(-(((xx - 40) / 14) ** 2)) * ((yy < 6) | (yy > 74))             # worn where a thumb turns it: the top and bottom edges' centres
coll = SAGE_SH * (0.5 + 0.62 * lamr)[..., None] * 1.1 + RIM * (0.9 * sheen)[..., None]
coll = coll * (1 - 0.3 * wear[..., None]) + SAND * (0.42 * wear)[..., None]
# the window's recess: clear, with a 2 px shade on its top and left walls inside it (partial alpha)
wshade = (d_win > 0) & (np.minimum(yy - 8, xx - 8) < 2.2)
def drum(kind):
    c = coll.copy(); a = body.astype(np.float32)
    c[wshade] = lin([14, 16, 18]); a[wshade] = 0.45 * (1 - np.clip(np.minimum(yy - 8, xx - 8)[wshade] / 2.2, 0, 1))
    if kind == "pinned":                                                   # two linked rings, engraved in the bottom rim's centre
        for cx in (36.5, 43.5):
            r = np.hypot(xx - cx, yy - 76)
            e = (np.abs(r - 2.6) < 0.8) & body
            c[e] = c[e] * 0.28
            lit = (np.abs(r - 3.5) < 0.45) & ((yy - 76) + (xx - cx) > 0.5) & body   # the engraving's lower-right lip catching the light
            c[lit] = c[lit] * 1.45
    if kind == "capped":                                                   # the frost veil over the window
        fr = d_win > 0
        rng = np.random.default_rng(80); nse = nd.gaussian_filter(rng.normal(0, 1, fr.shape), 6); nse = nse / nse.std()
        c[fr] = lin(P("frost"))[None] * (0.86 + 0.04 * nse[fr])[..., None] * (1 - 0.18 * ((yy[fr] - 8) / 64))[..., None]
        a[fr] = 0.88
    if kind == "clash":                                                    # a 2 px red line round the rim
        e = (d_out > 0) & (d_out < 2.0)
        c[e] = lin(P("red")); a[e] = 1.0
    return save(f"create-drum-{kind}", dn(c * a[..., None], S4) / np.maximum(dn(a, S4), 1e-6)[..., None], dn(a, S4))
for kd in ("rest", "pinned", "capped", "clash"): drum(kd)
# ---------- the small marks
def mark(name, w, h, poly, colour, engrave=True):
    Sx = 8; img = Image.new("L", (w * Sx, h * Sx), 0); ImageDraw.Draw(img).polygon([(x * Sx, y * Sx) for x, y in poly], fill=255)
    m = np.asarray(img.resize((w, h), Image.LANCZOS)).astype(float) / 255
    c = np.broadcast_to(lin(colour), (h, w, 3)).copy()
    if engrave:                                                            # a 1 px shade on its lower right, as engraved
        sh = np.clip(nd.shift(m, (1, 1), order=0) - m, 0, 1)
        A = np.maximum(m, sh * 0.5); C = (c * m[..., None] + lin([20, 20, 22]) * (sh * 0.5 * (1 - m))[..., None]) / np.maximum(A, 1e-6)[..., None]
        return save(name, C, A)
    return save(name, c, m)
mark("create-drum-notch", 12, 8, [(0, 0), (12, 0), (8, 7), (4, 7)], P("cream"))
mark("create-drum-turn-up", 16, 8, [(8, 0.5), (15, 7), (1, 7)], P("bone"))
mark("create-drum-turn-down", 16, 8, [(1, 0.5), (15, 0.5), (8, 7)], P("bone"))
for side in ("left", "right"):
    w, h = 16, 80; xx1 = np.arange(w)[None, :] + .5
    fall = (1 - xx1 / w) if side == "left" else (xx1 / w)
    A = np.broadcast_to(fall ** 1.6 * 0.55, (h, w)).copy(); C = np.broadcast_to(lin([10, 12, 14]), (h, w, 3)).copy()
    chev = Image.new("L", (w * 8, h * 8), 0); dr = ImageDraw.Draw(chev)
    pts = [(10, 32), (5, 40), (10, 48)] if side == "left" else [(6, 32), (11, 40), (6, 48)]
    dr.line([(x * 8, y * 8) for x, y in pts], fill=255, width=14, joint="curve")
    cm = np.asarray(chev.resize((w, h), Image.LANCZOS)).astype(float) / 255
    C = C * (1 - cm[..., None]) + lin(P("mist"))[None, None] * cm[..., None]; A = np.maximum(A, cm)
    save(f"create-bank-more-{side}", C, A)
print("made:", sorted(f[:-4] for f in os.listdir(out) if f.startswith("create-")))
