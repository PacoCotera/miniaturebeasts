"""T-20261016-160 (T-158's size tiers, specs/station-genome-screen-spec.md §2.1a): the genome mark family drawn again at 32, 40 and 48 px
(tiers M, L and XL), each drawn at its size from the same shapes as the 24 px family in make-genome.py, never scaled from a bitmap: every
coordinate and stroke is the 24 px drawing's times k = m / 24, rendered at 8x and reduced. The lit marks are on palette as at 24 (T-140).
- genome-gene-{open,only,open-lit,open-clash,open-lit-clash,closed,self}-{m}x{m}
- genome-pair-{front,blend,first,second}-{dim,lit}-{w}x{h} and genome-pair-only-{w}x{h} (w, h = 16k, 10k; placed at (4k, 7k) in the gene)
- genome-frost-{m}x{m}; genome-glint-gold-{12k}; genome-glint-wish-{10k}; genome-first-{10k}x{8k}
- genome-hub-{S01..S16}-{m}x{m}; genome-focus-{m+8}x{m+8} (the house ring: 2 px focus, radius (m + 8) / 2 - 1)
- rail-emblem-{chapter}-{unread,read,sealed}-{m}x{m}: the emblems drawn at size by their own manner (emblems/build.py: one cut, the lit
  edge on the top and left walls one palette step lighter, no anti-aliasing): the 24 px drawing's shape (source/*.txt, # and +) traced
  smoothly to m and thresholded, then its top- and left-facing edge pixels lit; unread mist + fog edge, read bone + white edge, sealed mist.
Place badges, the cross mark, the lock, the bar and the dots keep their sizes (spec).
usage: python3 -I genome-screen/make-genome-tiers.py SLICES_DIR FRAMES_DIR OUT_DIR   (run in art/station-masters/pods)"""
import sys, os, json, numpy as np
from PIL import Image
from scipy import ndimage as nd
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "make-genome.py")).read()
head = src[src.index("import sys, os, json"):src.index("# ---------- the housings")]
g = {"__name__": "tiers"}; exec(compile(head, "make-genome.py (helpers)", "exec"), g)
sl, frames, out = g["sl"], g["frames"], g["out"]
layers, onpal, soft, P, save, lin, SLATE, DIM_RING, S = (g[k] for k in ("layers", "onpal", "soft", "P", "save", "lin", "SLATE", "DIM_RING", "S"))
def grid(w, h): yy, xx = (np.mgrid[0:h * S, 0:w * S] + .5) / S; return yy, xx
for m in (32, 40, 48):
    k = m / 24; c = m / 2
    y, x = grid(m, m); r = np.hypot(x - c, y - c)
    ring = lambda r0, r1: np.minimum(soft(r - r0 * k), soft(r1 * k - r))
    def ticks(r0, r1, angles, w=2.0):
        mm = np.zeros_like(r)
        for a in angles:
            da = np.radians(a); px, py = np.sin(da), -np.cos(da)
            along = (x - c) * px + (y - c) * py; across = np.abs((x - c) * py - (y - c) * px)
            mm = np.maximum(mm, np.minimum(np.minimum(soft(along - r0 * k), soft(r1 * k - along)), soft(w * k / 2 - across)))
        return mm
    TICK = (0, 120, 240)
    open_ring = np.maximum(ring(8.6, 10.6), ticks(9.5, 12.0, TICK)); inner = soft(8.9 * k - r)
    notch = np.minimum(np.minimum(soft(x - 21 * k), soft(m - x)), np.minimum(soft(y - 9 * k), soft(15 * k - y)))
    save(f"genome-gene-open-{m}x{m}", layers(m, m, [(inner, SLATE), (open_ring, DIM_RING)]))
    save(f"genome-gene-only-{m}x{m}", layers(m, m, [(inner, SLATE), (ring(8.6, 10.6), DIM_RING)]))
    save(f"genome-gene-open-lit-{m}x{m}", onpal(layers(m, m, [(inner, P("ink")), (open_ring, P("mint")), (notch, P("mint"))]), [P("ink"), P("mint")]))
    save(f"genome-gene-open-lit-clash-{m}x{m}", onpal(layers(m, m, [(inner, P("ink")), (open_ring, P("mint")), (notch, P("mint")), (ring(9.0, 11.2), P("red")), (ticks(10.0, 12.0, TICK), P("red"))]), [P("ink"), P("mint"), P("red")]))
    save(f"genome-gene-open-clash-{m}x{m}", layers(m, m, [(inner, SLATE), (open_ring, DIM_RING), (ring(9.0, 11.2), P("red")), (ticks(10.0, 12.0, TICK), P("red"))]))
    jr = lambda cx: np.minimum(soft(np.hypot(x - cx * k, y - c) - 2.6 * k), soft(3.9 * k - np.hypot(x - cx * k, y - c)))
    save(f"genome-gene-closed-{m}x{m}", layers(m, m, [(soft(10.6 * k - r), [62, 64, 76]), (np.maximum(jr(10.0), jr(14.0)), P("mist"))]))
    steps = np.zeros_like(r)
    for cx, cy in ((2.0, 2.0), (22.0, 2.0), (2.0, 22.0), (22.0, 22.0)):
        steps = np.maximum(steps, np.minimum(soft(1.5 * k - np.abs(x - cx * k)), soft(1.5 * k - np.abs(y - cy * k))))
    save(f"genome-gene-self-{m}x{m}", layers(m, m, [(soft(9.6 * k - r), [62, 64, 76]), (np.maximum(jr(10.0), jr(14.0)), P("mist")), (steps, [70, 84, 76])]))
    # the pair
    pw, ph = round(16 * k), round(10 * k); y, x = grid(pw, ph); cy = ph / 2
    dsc = lambda cx, rr=3.9: soft(rr * k - np.hypot(x - cx * k, y - cy))
    outl = lambda cx, rr=3.9: np.minimum(soft(np.hypot(x - cx * k, y - cy) - (rr - 1.1) * k), soft(rr * k - np.hypot(x - cx * k, y - cy)))
    edge = lambda cx, rr=3.9: soft((rr + 0.9) * k - np.hypot(x - cx * k, y - cy))
    B1, B2 = P("bone"), P("sand")
    for lvl, kk in (("dim", 0.62), ("lit", 1.0)):
        lit = lvl == "lit"; G0 = P("ink") if lit else SLATE
        c1, c2 = B1 * kk + SLATE * (1 - kk), B2 * kk + SLATE * (1 - kk)
        fin = (lambda rr_, cols: onpal(rr_, cols)) if lit else (lambda rr_, cols: rr_)
        pc = [P("bone"), P("sand"), P("ink")]
        save(f"genome-pair-front-{lvl}-{pw}x{ph}", fin(layers(pw, ph, [(outl(10.8), c2), (edge(6.0), G0), (dsc(6.0), c1)]), pc))
        lens = soft((1 - np.hypot((x - pw / 2) / (6.8 * k), (y - cy) / (4.2 * k))) * 4.2 * k); seam = soft(0.45 * k - np.abs(x - pw / 2))
        save(f"genome-pair-blend-{lvl}-{pw}x{ph}", fin(layers(pw, ph, [(lens * (x < pw / 2), c1), (lens * (x >= pw / 2), c2), (np.minimum(lens, seam), G0)]), pc))
        save(f"genome-pair-first-{lvl}-{pw}x{ph}", fin(layers(pw, ph, [(dsc(10.8), c1 * (0.9 if not lit else 1)), (edge(5.2), G0), (dsc(5.2), c1)]), pc))
        save(f"genome-pair-second-{lvl}-{pw}x{ph}", fin(layers(pw, ph, [(dsc(10.8), c2 * (0.9 if not lit else 1)), (edge(5.2), G0), (dsc(5.2), c2)]), pc))
    cf = P("fog") * 0.62 + SLATE * 0.38
    save(f"genome-pair-only-{pw}x{ph}", layers(pw, ph, [(dsc(10.8), cf), (edge(5.2), SLATE), (dsc(5.2), cf)]))
    # frost (the 24's recipe at m: a chip inset 2k, radius 3k)
    yy, xx = np.mgrid[0:m, 0:m] + .5; ins, rad = 2 * k, 3 * k
    cxx = np.clip(xx, ins + rad, m - ins - rad); cyy = np.clip(yy, ins + rad, m - ins - rad)
    d = rad - np.hypot(xx - cxx, yy - cyy); a = np.clip(d + 0.5, 0, 1)
    rng = np.random.default_rng(m * m); n = nd.gaussian_filter(rng.normal(0, 1, (m, m)), (1.0, 2.5)); n = n / n.std()
    streak = 0.5 + 0.5 * np.sin((xx + yy) * 0.9 / k)
    col = lin(P("frostS")) * (0.80 + 0.05 * n + 0.06 * streak)[..., None] * (1 - 0.12 * (yy / m))[..., None]
    col[(d > 0) & (d < 1.2)] = lin(P("frostD"))[None] * 0.95
    save(f"genome-frost-{m}x{m}", np.dstack([g["srgb"](col), a * 0.92 * 255]))
    # glints and the first mark
    for name, base, colr in (("gold", 12, "gold"), ("wish", 10, "yellow")):
        q = round(base * k); y, x = grid(q, q); dx, dy = np.abs(x - q / 2) / (q / 2 - 0.1), np.abs(y - q / 2) / (q / 2 - 0.1)
        save(f"genome-glint-{name}-{q}x{q}", layers(q, q, [(soft((1 - (dx ** (2 / 3) + dy ** (2 / 3))) * q / 2.5), P(colr))]))
    fw, fh = round(10 * k), round(8 * k); y, x = grid(fw, fh)
    tri = lambda inset: soft(np.minimum((7.4 * k - inset) - y, ((y - 0.6 * k) * 4.4 - np.abs(x - fw / 2) * 6.8) / 8.1 - inset))
    save(f"genome-first-{fw}x{fh}", layers(fw, fh, [(tri(0), P("gold") * 0.75), (tri(1.0 * k), P("cream"))]))
    # hubs: each species' glyph in a ring
    y, x = grid(m, m); r = np.hypot(x - c, y - c)
    for p in sorted(f for f in os.listdir(frames) if f.startswith("species-S") and f.endswith(".json")):
        fr = json.load(open(os.path.join(frames, p))); sid = fr["species"]["id"]; cells = np.zeros_like(r)
        for gy, row in enumerate(fr["glyph"]):
            for gx, ch in enumerate(row):
                if ch == "#":
                    ccx, ccy = c + (3 * gx + 1.5 - 7.5) * k, c + (3 * gy + 1.5 - 7.5) * k
                    cells = np.maximum(cells, np.minimum(soft(1.25 * k - np.abs(x - ccx)), soft(1.25 * k - np.abs(y - ccy))))
        save(f"genome-hub-{sid}-{m}x{m}", layers(m, m, [(soft(11.8 * k - r), [34, 40, 44]), (ring(10.2, 11.8), DIM_RING), (cells, P("bone") * 0.85 + SLATE * 0.15)]))
    # the focus ring: the house ring, 2 px, round the mark with 4 px to spare
    q = m + 8; y, x = grid(q, q); rf = np.hypot(x - q / 2, y - q / 2)
    save(f"genome-focus-{q}x{q}", layers(q, q, [(np.minimum(soft(rf - (q / 2 - 2)), soft(q / 2 - rf)), P("focus"))]))
    # the emblems, at size by their own manner
    PAL = json.load(open(os.path.join(sl, "../../../../prototypes/ui/palettes/station.json"))); LIGHTER = PAL["lighter"]
    STATES = {"unread": ("mist", True), "read": ("bone", True), "sealed": ("mist", False)}
    for cid in ("coat", "face", "shape", "legs-tail", "movement", "stamina", "character", "glow", "charge"):
        rows = [l.rstrip("\n") for l in open(os.path.join("emblems", "source", cid + ".txt"), encoding="utf-8") if not l.startswith(";") and l.strip()]
        mask = np.array([[ch != "." for ch in rw] for rw in rows], float)
        up = nd.zoom(nd.gaussian_filter(mask, 0.6), m / 24, order=3) > 0.42                      # the shape traced smoothly to m
        lit = up & (~np.pad(up, ((1, 0), (0, 0)))[:-1] | ~np.pad(up, ((0, 0), (1, 0)))[:, :-1])
        for st, (base, haslit) in STATES.items():
            img = np.zeros((m, m, 4)); img[up, :3] = P(base); img[up, 3] = 255
            if haslit: img[lit, :3] = P(LIGHTER[base])
            save(f"rail-emblem-{cid}-{st}-{m}x{m}", img)
print(len(g["made"]), "made")
