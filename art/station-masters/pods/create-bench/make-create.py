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
- create-gene-line 24x216: a braided hose from the well's side, bending down into the tray's wall through a boot (T-20261016-69; see its section).
- create-dish 400x28: a moss pad (the vivarium's own painted moss) in a low moulded sage rim.
- create-drum-rest/-pinned/-capped/-clash 80x80: the drum on its axle in a slot (T-20261016-69; see its section), its 64x64 window at (8, 8)
  clear in its middle (the round's fall-off and a 2 px inner shade at partial alpha); pinned: two linked rings engraved in the bottom rim; capped: the frost veil over the window (`frost`, the house's
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
# ---------- create-gene-line 24 x 216 (T-20261016-69): the braided hose leaves the well's side through a sand ferrule at (288, 200), bends
# down (radius 10), runs to the tray with a slight slack, and goes into the tray's top wall through a dark rubber boot (rows 198-216). Its soft
# shadow falls right and down on the bench. The rect's top-left corner touches the well's rim, so the ferrule sits on it.
S2 = 8; Hh, Wh = 216, 24
yy, xx = (np.mgrid[0:Hh * S2, 0:Wh * S2] + .5) / S2
R = 6.5; Y0, BR, XV = 9.0, 10.0, 12.0                                       # hose radius; the line leaves at y 9 (screen 201), bends, runs down x 12
sway = 1.6 * np.sin(np.clip((yy - 24) / 172, 0, 1) * np.pi)                 # a little slack: a hose, not a post
cxv = XV + sway
# distance to the centre line and the position along it (t) for the braid: horizontal stub, quarter arc, vertical run
d_h = np.where(xx <= XV - BR, np.abs(yy - Y0), np.inf)
ang = np.arctan2(yy - (Y0 + BR), xx - (XV - BR))
in_arc = (xx > XV - BR) & (yy < Y0 + BR)
d_a = np.where(in_arc, np.abs(np.hypot(xx - (XV - BR), yy - (Y0 + BR)) - BR), np.inf)
d_v = np.where(yy >= Y0 + BR, np.abs(xx - cxv), np.inf)
d = np.minimum(np.minimum(d_h, d_a), d_v)
t = np.where(d == d_h, xx, np.where(d == d_a, (XV - BR) + BR * (ang + np.pi / 2), (XV - BR) + BR * np.pi / 2 + (yy - Y0 - BR)))
side = np.where(d == d_h, (yy - Y0), np.where(d == d_a, np.hypot(xx - (XV - BR), yy - (Y0 + BR)) - BR, xx - cxv)) / R   # -1..1 across
body = np.abs(side) <= 1
# the normal across the hose, in screen space: for the run it is x; on the stub it is y; on the arc it is radial
ux = np.where(d == d_h, 0.0, np.where(d == d_a, np.cos(ang), 1.0)); uy = np.where(d == d_h, 1.0, np.where(d == d_a, np.sin(ang), 0.0))
sd = np.clip(side, -1, 1); nz = np.sqrt(np.clip(1 - sd ** 2, 0, 1))
lamh = np.clip(np.dstack([ux * sd, uy * sd, nz]) @ L, 0, 1) / L[2]
weave = np.sin((t * 1.25 + side * R * 1.25)) * np.sin((t * 1.25 - side * R * 1.25))       # two strands crossing: the braid
strand = 0.5 + 0.5 * np.sign(weave) * np.abs(weave) ** 0.5
col = RUBBER * (0.42 + 0.75 * lamh)[..., None] * (0.72 + 0.5 * strand)[..., None]
col = col + lin([150, 146, 130]) * (0.10 * strand * np.clip(lamh - 0.6, 0, 1))[..., None]          # a dull glint on the strands' crowns
# the ferrule on the well's side: a sand collar, x 0-6 round the stub, with a groove
fer = (xx < 6.5) & (np.abs(yy - Y0) <= R + 1.4)
fv = np.clip((yy - Y0) / (R + 1.4), -1, 1); lamf = np.clip(np.dstack([np.zeros_like(fv), fv, np.sqrt(np.clip(1 - fv ** 2, 0, 1))]) @ L, 0, 1) / L[2]
col[fer] = (SAND * 0.78 * (0.45 + 0.7 * lamf)[..., None])[fer]
gro = fer & (np.abs(xx - 3.5) < .55); col[gro] *= 0.55
# the boot into the tray: dark rubber, wider than the hose, flaring to the tray's wall, rows 198-216, with two ribs
by = np.clip((yy - 198) / 18, 0, 1); bw = R + 1.2 + 2.6 * by ** 1.5
boot = (yy >= 198) & (np.abs(xx - cxv) <= bw)
bs = np.clip((xx - cxv) / bw, -1, 1); lamb = np.clip(np.dstack([bs, np.zeros_like(bs), np.sqrt(np.clip(1 - bs ** 2, 0, 1))]) @ L, 0, 1) / L[2]
bcol = lin([34, 34, 36]) * (0.5 + 0.7 * lamb)[..., None]
rib = boot & ((np.abs(yy - 203) < .7) | (np.abs(yy - 208.5) < .7)); bcol[rib] *= 1.6
col[boot] = bcol[boot]
a_obj = (body | fer | boot).astype(np.float32)
# its shadow on the bench: the shape shifted 2 right and 2 down, blurred, under it
sh = nd.gaussian_filter(nd.shift(a_obj, (2.2 * S2, 2.2 * S2), order=0), 1.6 * S2) * 0.55
A = np.maximum(a_obj, sh * (1 - a_obj)); C = (col * a_obj[..., None] + lin([10, 10, 12]) * (sh * (1 - a_obj))[..., None])
save("create-gene-line", dn(C, S2) / np.maximum(dn(A, S2), 1e-6)[..., None], dn(A, S2))
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
ms = np.stack([nd.map_coordinates(moss[..., c], [my, mx], order=1, mode="nearest") for c in range(3)], -1)
pad = d_in > 0
mound = np.clip(d_in / 6, 0, 1)
coll[pad] = (lin(ms) * (0.6 + 0.4 * mound)[..., None])[pad]
a = (d_out > 0).astype(np.float32)
save("create-dish", dn(coll * a[..., None], S3) / np.maximum(dn(a, S3), 1e-6)[..., None], dn(a, S3))
# ---------- the drums 80 x 80 (T-20261016-69): a moulded sage drum on a horizontal axle, sitting in a slot of the tray. One face shows in the
# window (64 x 64 at (8, 8), left clear). It reads as a drum by:
# - the round: the 8 px above and below the window are the drum's surface turning away from the eye, lit above and falling into shade below,
#   and the next faces' window edges show there as thin dark slivers, foreshortened, so more faces wait above and below;
# - the grip: ribs across the drum's round (parallel to the axle), closer together as the surface turns away, worn pale at the centre where
#   a thumb turns it;
# - the face: the round's fall-off carried over the window at partial alpha (its middle half clear), so the
#   picture sits on the drum, not in a frame;
# - the axle: the slot's dark cheeks at both ends with the axle's round boss, so it turns about a line across.
S4 = 8; N = 80
yy, xx = (np.mgrid[0:N * S4, 0:N * S4] + .5) / S4
RC = 41.0; th = np.arcsin(np.clip((yy - 40) / RC, -0.999, 0.999))          # the drum's round: the angle of the surface at each row
cheek = (xx < 5) | (xx > 75)                                               # the slot's cheeks at the ends
d_win = rrect_d(xx, yy, 8, 8, 72, 72, 3)
drum_ = ~cheek
# height: the round, the ribs, the window's lip and the next faces' window slivers
ribphase = th / np.radians(6.5)                                            # a rib every 6.5 degrees of turn
ribs = np.where((d_win <= 0) & ((yy < 8) | (yy > 72)), 0.6 * np.cos(ribphase * 2 * np.pi), 0)   # on the round only
nrm = np.dstack([np.zeros_like(th), np.sin(th), np.cos(th)])              # the round's normal (the axle is horizontal)
# ribs bend the normal along y
gy = np.gradient(ribs, axis=0) * S4
nrm = nrm + np.dstack([np.zeros_like(gy), -gy * 0.8, np.zeros_like(gy)]); nrm /= np.linalg.norm(nrm, axis=2, keepdims=True)
lamr = np.clip(nrm @ L, 0, 1) / L[2]
coll = SAGE_SH * (0.30 + 0.85 * lamr)[..., None] * 1.12
sheen = np.clip((nrm @ L - 0.86) / 0.14, 0, 1) * (d_win <= 0)
coll = coll + RIM * (0.35 * sheen)[..., None]
wear = np.exp(-(((xx - 40) / 13) ** 2)) * ((yy < 8) | (yy > 72)) * np.clip(np.cos(ribphase * 2 * np.pi), 0, 1)
coll = coll * (1 - 0.25 * wear[..., None]) + SAND * (0.30 * wear)[..., None]            # the ribs' crowns worn pale where a thumb turns it
# the next faces: their window edges, foreshortened, in the round above and below (dark slivers with a lit lip)
for yc, hgt in ((2.2, 1.4), (77.8, 1.4)):
    sl_ = (np.abs(yy - yc) < hgt / 2) & (xx > 10) & (xx < 70)
    coll[sl_] = coll[sl_] * 0.22
# the window's own lip: lit on its lower edge of the top band (the far wall, facing the key) and in shade on the bottom band
lipT = (yy > 6.6) & (yy < 8) & (xx > 8) & (xx < 72); coll[lipT] = coll[lipT] * 1.25 + RIM[None] * 0.12
lipB = (yy > 72) & (yy < 73.4) & (xx > 8) & (xx < 72); coll[lipB] = coll[lipB] * 0.45
# the ends: the drum's rim meets the slot as a dark gap; the cheeks are the tray's dark rubber, the axle boss lit from the top left
gap = (np.abs(xx - 5) < .7) | (np.abs(xx - 75) < .7)
cv = np.clip((yy - 40) / 40, -1, 1); lamc = np.clip(np.dstack([np.zeros_like(cv), cv * 0.6, np.ones_like(cv)]) @ L, 0, 1) / L[2]
ccol = RUBBER * (0.55 + 0.45 * lamc)[..., None] * 0.9
for cx_ in (2.5, 77.5):
    r = np.hypot(xx - cx_, yy - 40); boss = r < 2.3
    bn = np.dstack([(xx - cx_) / 2.3, (yy - 40) / 2.3, np.sqrt(np.clip(1 - r ** 2 / 2.3 ** 2, 0, 1))])
    lb = np.clip(bn @ L, 0, 1) / L[2]
    ccol[boss] = (SAGE_SH * 0.9 * (0.4 + 0.8 * lb)[..., None])[boss]
coll[cheek] = ccol[cheek]; coll[gap] = lin([12, 12, 14])
# the whole rounds off at the top and bottom edges into the slot's shadow
edge = np.clip(np.minimum(yy, 80 - yy) / 1.6, 0, 1)
coll = coll * (0.35 + 0.65 * edge[..., None])
band = np.where(yy < 40, 0.5 + 0.75 * np.clip(yy / 8, 0, 1), 0.85 - 0.6 * np.clip((yy - 72) / 8, 0, 1))   # the round: bright at the top
coll = np.where(cheek[..., None], coll, coll * band[..., None])                                       # window's lip, dark at the bottom
outline = rrect_d(xx, yy, 0, 0, N, N, 3)
body = (outline > 0) & (d_win <= 0)
wshade = (d_win > 0) & (np.minimum(yy - 8, xx - 8) < 2.2)
# over the window, at partial alpha: the round carried across the face, so the picture sits on the drum (its middle half stays clear)
win = d_win > 0
fall = np.clip((np.abs(yy - 40) - 14) / 18, 0, 1) ** 1.4 * np.where(yy > 40, 0.62, 0.42)       # turning away: more below, away from the key
def drum(kind):
    c = coll.copy(); a = body.astype(np.float32)
    c[win] = lin([10, 12, 14]); a[win] = fall[win]
    c[wshade] = lin([14, 16, 18]); a[wshade] = np.maximum(a[wshade], 0.45 * (1 - np.clip(np.minimum(yy - 8, xx - 8)[wshade] / 2.2, 0, 1)))
    if kind == "pinned":                                                   # two linked rings, engraved on the round below the window
        for cx in (36.5, 43.5):
            r = np.hypot((xx - cx), (yy - 76.2) * 1.6)                       # foreshortened on the round
            e = (np.abs(r - 2.7) < 0.75) & body
            c[e] = c[e] * 0.25
    if kind == "capped":                                                   # the frost veil over the window
        fr = d_win > 0
        rng = np.random.default_rng(80); nse = nd.gaussian_filter(rng.normal(0, 1, fr.shape), 6); nse = nse / nse.std()
        c[fr] = lin(P("frost"))[None] * (0.86 + 0.04 * nse[fr])[..., None] * (1 - 0.18 * ((yy[fr] - 8) / 64))[..., None]
        a[fr] = 0.88
    if kind == "clash":                                                    # a 2 px red line round the drum
        e = (outline > 0) & (outline < 2.0)
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
