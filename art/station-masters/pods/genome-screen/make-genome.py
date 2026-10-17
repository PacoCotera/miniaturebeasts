"""T-20261016-130 (specs/station-genome-screen-spec.md; wireframes specs/station-genome-screen/01-07; the CD's specs/slip-visual-intent.md):
the genome screen's masters. By hand in code, no paid call. The style is design/art-direction.md and design/style-guide/README.md: the
Station's rugged matte field gear. The screen is a dark matte slate display let flush into the sage housing with a rubber gasket and screws;
no gloss, glow halo, scanlines, hologram or neon. Marks are lit like the device's own lamps: flat, at most a 1 px soft edge, no bloom. Mint
is the one lit hue; red only for a clash. Nothing here is taken from art/references/genome-field/.
- create-genome-screen-512x312, incubator-genome-screen-208x312: the house device plate (sage bezel 6, radius 10), its well floored in
  slate; a 2 px rubber gasket at (6, 6); the screen 496 x 296 (192 x 296) at (8, 8), recessed (its top and left inner edge in shade), matte
  grain, no picture; four screws in the bezel's corners.
- genome-gene-{open,open-lit,open-clash,closed,self}-24x24: the gene marks without the pair (the pair goes at (4, 7)): open, a ring with three
  tumbler ticks, its inside slate (so the tree's lines stop at it); lit, the ring in mint with the notch 3 x 6 at (21, 9); clash, the ring's rim red (open-lit-clash: a changed gene that clashes, mint under the red rim; T-145); closed, a shut disc with the joined rings
  (inherited-only); self, the shut disc with four step marks (T-138).
- genome-pair-{front,blend,first,second}-{dim,lit}-16x10: the copy pair. Copy 1 bone, copy 2 sand. front: copy 1 solid in front, copy 2 an
  outline behind; blend: one lens, half each; first: copy 1 twice; second: copy 2 twice. dim at the unlit level; lit at full level.
- genome-frost-24x24 (a 20 x 20 chip at (2, 2)), genome-frost-160x128: still a surprise, the house frost on slate.
- genome-hub-{S01..S16}-24x24: the species' own glyph (its frame's 5 x 5 glyph) in a ring; genome-lock-8x10: the lock.
- genome-cross-12x12 (toward the Cross: a small x), genome-glint-gold-12x12 (the chapter's glint, on its emblem) and genome-glint-wish-10x10
  (the house four-point glint), genome-first-10x8 (a point-up triangle, cream with a gold edge, never a star),
  genome-place-{cave,wood,meadow,pond,rock}-10x10 (a trigger place's badge, cut from place-{p}-32x32, named by frame id; T-145) and
  genome-place-storm-10x10 (S16 Phase's storm, painted by hand in the same family; T-145).
- T-20261016-138 (the framework's delta, T-136): genome-gene-only-24x24 and genome-pair-only-16x10 (one look: the ring without ticks, two
  equal fog discs); genome-gene-self-24x24 redrawn as the inherited-only disc with four step marks; the 12 x 12 places and the 10 x 10 gold
  glint withdrawn (not made).
- T-140 (in T-145's round): the lit marks (genome-gene-open-lit, -open-lit-clash, genome-pair-*-lit) on palette: opaque, their soft
  edge one painted ring of aqua, no alpha; genome-key-research-12x12, the Research key's mark on the bay.
- genome-sealed-{crystal,pearl,shard}-24x24 (the find's picture, from find-{f}-112x112), genome-veil-160x128 (the dim veil),
  genome-focus-32x32 (the house focus ring at gene scale: 2 px focus, radius 15).
usage: python3 -I genome-screen/make-genome.py SLICES_DIR FRAMES_DIR OUT_DIR   (run in art/station-masters/pods)"""
import sys, os, json, importlib.util, numpy as np
from PIL import Image
from scipy import ndimage as nd
sl, frames, out = sys.argv[1:4]; os.makedirs(out, exist_ok=True)
sp_ = importlib.util.spec_from_file_location("kit", "device-plate/make-device-plate.py"); kit = importlib.util.module_from_spec(sp_); sp_.loader.exec_module(kit)
pal = dict(json.load(open(os.path.join(sl, "../../../../prototypes/ui/palettes/station.json")))["colours"])
P = lambda n: np.array([int(pal[n][i:i + 2], 16) for i in (1, 3, 5)], float)
def lin(c): c = np.asarray(c, float) / 255; return np.where(c <= .04045, c / 12.92, ((c + .055) / 1.055) ** 2.4)
def srgb(l): l = np.clip(l, 0, 1); return np.where(l <= .0031308, l * 12.92, 1.055 * l ** (1 / 2.4) - .055) * 255
L = np.array([-0.55, -0.62, 0.56]); L /= np.linalg.norm(L)
SLATE = np.array([24, 28, 32], float)                                       # the screen's ground: dark matte slate
DIM_RING = np.array([92, 120, 98], float)                                   # an unlit mark: the sage's own green, dim on slate
made = []
def save(name, rgba):
    Image.fromarray(np.clip(np.rint(rgba), 0, 255).astype(np.uint8), "RGBA").save(os.path.join(out, name + ".png")); made.append(name)
S = 8
def grid(w, h): y, x = (np.mgrid[0:h * S, 0:w * S] + .5) / S; return y, x
def down(a, w, h): return a.reshape(h, S, w, S, *a.shape[2:]).mean((1, 3))
def layers(w, h, items):
    """items: [(coverage at S x, rgb)], painted in order; returns straight-alpha RGBA at 1x"""
    col = np.zeros((h * S, w * S, 3)); A = np.zeros((h * S, w * S))
    for cov, rgb in items:
        c = np.clip(cov, 0, 1); col = col * (1 - c[..., None]) + lin(rgb)[None, None] * c[..., None]; A = A + c * (1 - A)
    a1 = down(A, w, h); c1 = down(col, w, h) / np.maximum(a1, 1e-6)[..., None]
    return np.dstack([srgb(c1), a1 * 255])
def onpal(rgba, cols):
    """T-140: a lit mark stays on palette. Each pixel is opaque or clear: covered (alpha >= 0.6) takes the nearest of the mark's own palette
    colours; its edge (0.15-0.6) is one ring of aqua (the mint ramp's darker step), painted, not alpha; below that, clear."""
    a = rgba[..., 3] / 255; c = rgba[..., :3]; cols = np.array(cols, float)
    near = cols[np.argmin(((c[:, :, None, :] - cols[None, None]) ** 2).sum(-1), -1)]
    out = np.zeros_like(rgba); full = a >= 0.6; ring = (a >= 0.15) & ~full
    out[full, :3] = near[full]; out[full, 3] = 255; out[ring, :3] = P("aqua"); out[ring, 3] = 255
    return out
soft = lambda d, e=0.6: np.clip(d / e + 0.5, 0, 1)                          # coverage from a signed distance, a 1 px soft edge at most
# ---------- the housings
def housing(W, H, name):
    pl = np.asarray(kit.plate(W, H, bezel=6, radius=10, floor_hex="%02x%02x%02x" % tuple(int(v) for v in SLATE))).astype(float)
    y, x = np.mgrid[0:H, 0:W] + .5
    scr = (x >= 8) & (x < W - 8) & (y >= 8) & (y < H - 8)
    rng = np.random.default_rng(130); g = nd.gaussian_filter(rng.normal(0, 1, (H, W)), 0.8); g = g / g.std()
    base = lin(SLATE) * (1 + 0.035 * g)[..., None]                          # matte grain, never a sheen
    vign = 1 - 0.18 * np.clip(1 - np.minimum.reduce([x - 8, W - 8 - x, y - 8, H - 8 - y]) / 40, 0, 1) ** 2
    inner = 1 - 0.35 * np.exp(-(y - 8) / 2.2) * (y >= 8) - 0.25 * np.exp(-(x - 8) / 2.2) * (x >= 8)   # recessed: its top and left edges in shade
    sc = srgb(base * (vign * inner)[..., None])
    pl[scr, :3] = sc[scr]; pl[scr, 3] = 255
    gas = ((x >= 6) & (x < W - 6) & (y >= 6) & (y < H - 6)) & ~scr      # the rubber gasket, 2 px
    gk = np.where((y < 7) | (x < 7), 0.75, np.where((y >= H - 7) | (x >= W - 7), 1.25, 1.0))
    pl[gas, :3] = srgb(lin([40, 39, 42]) * gk[..., None])[gas]; pl[gas, 3] = 255
    for cx, cy in ((3, 3), (W - 3, 3), (3, H - 3), (W - 3, H - 3)):     # four screws in the bezel's corners, lit from the top left
        yy, xx = (np.mgrid[0:H * S, 0:W * S] + .5) / S
        rr = np.hypot(xx - cx, yy - cy); m = rr < 2.4
        if not m.any(): continue
        nz = np.sqrt(np.clip(1 - (rr / 2.4) ** 2, 0, 1)); n = np.dstack([(xx - cx) / 2.4, (yy - cy) / 2.4, nz])
        lam = np.clip(n @ L, 0, 1) / L[2]; c = lin([150, 154, 150]) * (0.35 + 0.7 * lam)[..., None]
        slot = m & (np.abs((xx - cx) - (yy - cy)) < 0.45); c[slot] = c[slot] * 0.35
        cov = down(m.astype(float), W, H); cc = down(c * m[..., None], W, H) / np.maximum(cov, 1e-6)[..., None]
        k = cov > 0; pl[k, :3] = pl[k, :3] * (1 - cov[k, None]) + srgb(cc)[k] * cov[k, None]
    save(name, pl)
housing(512, 312, "create-genome-screen-512x312"); housing(208, 312, "incubator-genome-screen-208x312")
# ---------- the gene marks, 24 x 24 (centre 12, 12)
y, x = grid(24, 24); r = np.hypot(x - 12, y - 12); ang = np.degrees(np.arctan2(x - 12, -(y - 12))) % 360
ring = lambda r0, r1: np.minimum(soft(r - r0), soft(r1 - r))
def ticks(r0, r1, angles, w=1.6):
    m = np.zeros_like(r)
    for a in angles:
        da = np.radians(a); px, py = np.sin(da), -np.cos(da)
        along = (x - 12) * px + (y - 12) * py; across = np.abs((x - 12) * py - (y - 12) * px)
        m = np.maximum(m, np.minimum(np.minimum(soft(along - r0), soft(r1 - along)), soft(w / 2 - across)))
    return m
TICK = (0, 120, 240)
open_ring = np.maximum(ring(8.6, 10.6), ticks(9.5, 12.0, TICK, w=2.0))
inner = soft(8.9 - r)                                                       # the ring's inside, slate: the branch line stops at the mark
save("genome-gene-open-24x24", layers(24, 24, [(inner, SLATE), (open_ring, DIM_RING)]))
save("genome-gene-only-24x24", layers(24, 24, [(inner, SLATE), (ring(8.6, 10.6), DIM_RING)]))     # T-138: one look, no ticks (it does not turn)
notch = np.minimum(np.minimum(soft(x - 21), soft(24 - x)), np.minimum(soft(y - 9), soft(15 - y)))
save("genome-gene-open-lit-24x24", onpal(layers(24, 24, [(inner, P("ink")), (open_ring, P("mint")), (notch, P("mint"))]), [P("ink"), P("mint")]))
save("genome-gene-open-lit-clash-24x24", onpal(layers(24, 24, [(inner, P("ink")), (open_ring, P("mint")), (notch, P("mint")), (ring(9.0, 11.2), P("red")), (ticks(10.0, 12.0, TICK), P("red"))]), [P("ink"), P("mint"), P("red")]))   # T-145
save("genome-gene-open-clash-24x24", layers(24, 24, [(inner, SLATE), (open_ring, DIM_RING), (ring(9.0, 11.2), P("red")), (ticks(10.0, 12.0, TICK), P("red"))]))
disc = soft(10.6 - r)
jr = lambda cx: np.minimum(soft(np.hypot(x - cx, y - 12) - 2.6), soft(3.9 - np.hypot(x - cx, y - 12)))
save("genome-gene-closed-24x24", layers(24, 24, [(disc, [62, 64, 76]), (np.maximum(jr(10.0), jr(14.0)), P("mist"))]))
steps = np.zeros_like(r)
for cx, cy in ((2.0, 2.0), (22.0, 2.0), (2.0, 22.0), (22.0, 22.0)):
    steps = np.maximum(steps, np.minimum(soft(1.5 - np.abs(x - cx)), soft(1.5 - np.abs(y - cy))))
# T-138: self-changing is the inherited-only mark (the shut disc, the joined rings) with four step marks round it, always unlit here
save("genome-gene-self-24x24", layers(24, 24, [(soft(9.6 - r), [62, 64, 76]), (np.maximum(jr(10.0), jr(14.0)), P("mist")), (steps, [70, 84, 76])]))
# ---------- the copy pair, 16 x 10: two copies side by side, the front one edged in slate so the two never merge
y, x = grid(16, 10)
dsc = lambda cx, rr=3.9: soft(rr - np.hypot(x - cx, y - 5))
outl = lambda cx, rr=3.9: np.minimum(soft(np.hypot(x - cx, y - 5) - (rr - 1.1)), soft(rr - np.hypot(x - cx, y - 5)))
edge = lambda cx, rr=3.9: soft(rr + 0.9 - np.hypot(x - cx, y - 5))      # the slate edge round the front copy
B1, B2 = P("bone"), P("sand")
for lvl, k in (("dim", 0.62), ("lit", 1.0)):
    lit = lvl == "lit"; G0 = P("ink") if lit else SLATE                   # lit: on palette (T-140); dim: unchanged
    c1, c2 = B1 * k + SLATE * (1 - k), B2 * k + SLATE * (1 - k)
    fin = (lambda r, cols: onpal(r, cols)) if lit else (lambda r, cols: r)
    pc = [P("bone"), P("sand"), P("ink")]
    save(f"genome-pair-front-{lvl}-16x10", fin(layers(16, 10, [(outl(10.8), c2), (edge(6.0), G0), (dsc(6.0), c1)]), pc))
    lens = soft((1 - np.hypot((x - 8) / 6.8, (y - 5) / 4.2)) * 4.2); seam = soft(0.45 - np.abs(x - 8))
    save(f"genome-pair-blend-{lvl}-16x10", fin(layers(16, 10, [(lens * (x < 8), c1), (lens * (x >= 8), c2), (np.minimum(lens, seam), G0)]), pc))
    save(f"genome-pair-first-{lvl}-16x10", fin(layers(16, 10, [(dsc(10.8), c1 * (0.9 if not lit else 1)), (edge(5.2), G0), (dsc(5.2), c1)]), pc))
    save(f"genome-pair-second-{lvl}-16x10", fin(layers(16, 10, [(dsc(10.8), c2 * (0.9 if not lit else 1)), (edge(5.2), G0), (dsc(5.2), c2)]), pc))
cf = P("fog") * 0.62 + SLATE * 0.38                                       # T-138: one look, two equal fog discs, unlit
save("genome-pair-only-16x10", layers(16, 10, [(dsc(10.8), cf), (edge(5.2), SLATE), (dsc(5.2), cf)]))
# ---------- frost
def frost(w, h, inset, rad, name):
    yy, xx = np.mgrid[0:h, 0:w] + .5
    cx = np.clip(xx, inset + rad, w - inset - rad); cy = np.clip(yy, inset + rad, h - inset - rad)
    d = rad - np.hypot(xx - cx, yy - cy); a = np.clip(d + 0.5, 0, 1)
    rng = np.random.default_rng(w * h); n = nd.gaussian_filter(rng.normal(0, 1, (h, w)), (1.0, 2.5)); n = n / n.std()
    streak = 0.5 + 0.5 * np.sin((xx + yy) * 0.9)                           # the frost's grain, faint diagonal
    c = lin(P("frostS")) * (0.80 + 0.05 * n + 0.06 * streak)[..., None] * (1 - 0.12 * (yy / h))[..., None]
    edge = (d > 0) & (d < 1.2); c[edge] = lin(P("frostD"))[None] * 0.95
    save(name, np.dstack([srgb(c), a * 0.92 * 255]))
frost(24, 24, 2, 3, "genome-frost-24x24"); frost(160, 128, 0, 4, "genome-frost-160x128")
# ---------- the species' hubs: its own glyph in a ring
y, x = grid(24, 24); r = np.hypot(x - 12, y - 12)
for p in sorted(f for f in os.listdir(frames) if f.startswith("species-S") and f.endswith(".json")):
    fr = json.load(open(os.path.join(frames, p))); sid = fr["species"]["id"]; gl = fr["glyph"]
    cells = np.zeros_like(r)
    for gy, row in enumerate(gl):
        for gx, ch in enumerate(row):
            if ch == "#":
                cx, cy = 12 - 7.5 + 3 * gx + 1.5, 12 - 7.5 + 3 * gy + 1.5
                cells = np.maximum(cells, np.minimum(soft(1.25 - np.abs(x - cx)), soft(1.25 - np.abs(y - cy))))
    save(f"genome-hub-{sid}-24x24", layers(24, 24, [(soft(11.8 - r), [34, 40, 44]), (ring(10.2, 11.8), DIM_RING), (cells, P("bone") * 0.85 + SLATE * 0.15)]))
# ---------- the lock, 8 x 10
y, x = grid(8, 10)
body = np.minimum(np.minimum(soft(x - 0.5), soft(7.5 - x)), np.minimum(soft(y - 4.5), soft(9.5 - y)))
sh = np.minimum(np.minimum(soft(np.hypot(x - 4, y - 4.6) - 1.6), soft(2.9 - np.hypot(x - 4, y - 4.6))), soft(4.8 - y))
key = np.minimum(soft(0.7 - np.abs(x - 4)), np.minimum(soft(y - 6.2), soft(8.2 - y)))
save("genome-lock-8x10", layers(8, 10, [(np.maximum(body, sh), P("mist")), (key, SLATE)]))
# ---------- toward the Cross, 12 x 12: a small x
y, x = grid(12, 12)
xm = np.maximum(soft(0.8 - np.abs((x - 6) - (y - 6)) / 1.414), soft(0.8 - np.abs((x - 6) + (y - 6)) / 1.414)) * soft(4.2 - np.hypot(x - 6, y - 6))
save("genome-cross-12x12", layers(12, 12, [(xm, P("mist"))]))
# ---------- the glints: the house four-point glint (an astroid, as glint-star-12x12). T-138: the gold one is the chapter's, 12 x 12 on its
# emblem (never on a gene); the wish glint stays 10 x 10 on a gene
y, x = grid(10, 10); dx, dy = np.abs(x - 5) / 4.9, np.abs(y - 5) / 4.9
save("genome-glint-wish-10x10", layers(10, 10, [(soft((1 - (dx ** (2 / 3) + dy ** (2 / 3))) * 4.0), P("yellow"))]))
y, x = grid(12, 12); dx, dy = np.abs(x - 6) / 5.9, np.abs(y - 6) / 5.9
save("genome-glint-gold-12x12", layers(12, 12, [(soft((1 - (dx ** (2 / 3) + dy ** (2 / 3))) * 4.8), P("gold"))]))
# ---------- the first mark, 10 x 8: a point-up triangle in cream with a gold edge (never a star)
y, x = grid(10, 8)
tri = lambda inset: soft(np.minimum(7.4 - inset - y, ((y - 0.6) * 4.4 - np.abs(x - 5) * 6.8) / 8.1 - inset))
save("genome-first-10x8", layers(10, 8, [(tri(0), P("gold") * 0.75), (tri(1.0), P("cream"))]))
# ---------- the place badges, 10 x 10 (T-138), cut from the signed place pictures: one per trigger place, stacked at (25, -2 + 11k)
y, x = grid(10, 10); circ = soft(4.6 - np.hypot(x - 5, y - 5)); rim = np.minimum(soft(np.hypot(x - 5, y - 5) - 4.0), circ)
for kind, pl_ in (("cave", "cave"), ("wood", "wood"), ("meadow", "meadow"), ("pond", "pond"), ("rock", "rock")):   # T-145: named by frame id
    im = np.asarray(Image.open(os.path.join(sl, f"place-{pl_}-32x32.png")).convert("RGB").resize((10 * S, 10 * S), Image.LANCZOS)).astype(float)
    col = lin(im) * (1 - rim[..., None] * 0.6); a1 = down(circ, 10, 10); c1 = down(col * circ[..., None], 10, 10) / np.maximum(a1, 1e-6)[..., None]
    save(f"genome-place-{kind}-10x10", np.dstack([srgb(c1), a1 * 255]))
# T-20261016-145: the storm (S16 Phase's trigger, selfChanging.storm), in the badge family: the same round cut and rim, painted by hand (no
# storm painting exists): a low slate sky, a dark cloud mass over it, rain falling and one pale flash
yy, xx = (np.mgrid[0:10 * S, 0:10 * S] + .5) / S
rng = np.random.default_rng(16); n = nd.gaussian_filter(rng.normal(0, 1, yy.shape), S * 0.6); n /= n.std()
sky = lin([120, 134, 160]) * (0.80 + 0.30 * (yy / 10))[..., None]
cloud = np.clip((5.0 - yy + 0.9 * n) / 1.2, 0, 1)                           # the cloud mass in the upper half, its lower edge ragged
col = sky * (1 - cloud[..., None]) + lin([30, 32, 42]) * (0.85 + 0.25 * np.clip(-n, 0, 1))[..., None] * cloud[..., None]
rain = (np.abs(((xx + yy * 0.35) % 2.2) - 1.1) < 0.18) & (yy > 4.6)
col[rain] = col[rain] * 0.6 + lin([150, 162, 180]) * 0.4
fl = (np.abs((xx - 5.2) - 0.55 * np.where(yy < 6.4, yy - 4.4, 2 * (6.4 - 4.4) - (yy - 4.4))) < 0.42) & (yy > 4.2) & (yy < 8.4)
col[fl] = lin([236, 236, 214])                                             # the flash
col = col * (1 - rim[..., None] * 0.6) if rim.shape == col.shape[:2] else col
a1 = down(circ, 10, 10); c1 = down(col * circ[..., None], 10, 10) / np.maximum(a1, 1e-6)[..., None]
save("genome-place-storm-10x10", np.dstack([srgb(c1), a1 * 255]))
# ---------- the sealed finds, 24 x 24, from the signed find pictures
for f_ in ("crystal", "pearl", "shard"):
    im = Image.open(os.path.join(sl, f"find-{f_}-112x112.png")).convert("RGBA"); a = np.asarray(im).astype(float); pm = a.copy(); pm[..., :3] *= a[..., 3:] / 255
    ch = [np.asarray(Image.fromarray(pm[..., c].astype(np.float32), "F").resize((24, 24), Image.LANCZOS)) for c in range(4)]
    al = np.clip(ch[3], 0, 255); rgb = np.stack(ch[:3], -1) / np.maximum(al, 1e-3)[..., None] * 255
    gd = np.abs(rgb - P("ground")).max(2); al = al * np.clip((gd - 10) / 30, 0, 1)        # the picture's cell ground keyed out
    save(f"genome-sealed-{f_}-24x24", np.dstack([np.clip(rgb, 0, 255), al]))
# ---------- the Research key's mark, 12 x 12 (T-140): the shell's own key icon (shell-key-research-24, pixel art) reduced 2:1 by keeping
# a pixel where any of its 2 x 2 is set, so its strokes hold; its own colour; on the bay's top right (156, 4)
KEY = os.path.join(frames, "..", "..", "ui", "assets", "masters", "shell", "shell-key-research-24.png")
ka = np.asarray(Image.open(KEY).convert("RGBA")).astype(float)
kb = ka.reshape(12, 2, 12, 2, 4); m2 = (kb[..., 3] > 128).any((1, 3))
kc = np.where(m2[..., None], kb[..., :3].max((1, 3)), 0); save("genome-key-research-12x12", np.dstack([kc, m2 * 255.0]))
# ---------- the veil, 160 x 128, and the focus ring, 32 x 32
save("genome-veil-160x128", np.dstack([np.broadcast_to(SLATE, (128, 160, 3)), np.full((128, 160), 0.62 * 255)]))
y, x = grid(32, 32); rf = np.hypot(x - 16, y - 16)
save("genome-focus-32x32", layers(32, 32, [(np.minimum(soft(rf - 14.0), soft(16.0 - rf)), P("focus"))]))
print(len(made), "made:", ", ".join(made))
