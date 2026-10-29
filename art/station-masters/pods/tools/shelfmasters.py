"""The Pods shelf and reading-room masters (ux-pods-inventory.md section 1 and 4, ad-signoff.md section 3), cut from the paintings of this pass.
Full size first (owner: "full size, we can scale them down later and that is cheap, upscaling is not"): every piece is kept at the largest size the
painting gives, then reduced (never enlarged) to the 3x and 1x the placer uses. usage: python3 -I tools/shelfmasters.py
Writes shelf/ (masters, slices, proofs). Raws: source/raw/masters-pods-shelf/{strip-a,niche-b,husk-a,bench-b}.jpg."""
import os, json, hashlib
import numpy as np
from PIL import Image
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); RAW = f"{R}/source/raw/masters-pods-shelf"; OUT = f"{R}/shelf"
os.makedirs(OUT, exist_ok=True)
def f32(im): return np.asarray(im, dtype=np.float32)
def img(a, mode="RGB"): return Image.fromarray(np.clip(a + 0.5, 0, 255).astype(np.uint8), mode)
def lanczos(im, size): return im.resize(size, Image.LANCZOS)
def premul_resize(im, size):
    """RGBA reduction in premultiplied alpha (no dark or light fringe)."""
    a = f32(im); al = a[..., 3:4] / 255.0; pm = np.concatenate([a[..., :3] * al, a[..., 3:4]], -1)
    ch = [f32(lanczos(Image.fromarray(np.ascontiguousarray(pm[..., i]), "F"), size)) for i in range(4)]
    A = np.clip(ch[3], 0, 255); rgb = np.stack(ch[:3], -1) / np.maximum(A[..., None] / 255.0, 1e-6)
    rgb[A < 0.5] = 0
    return img(np.concatenate([np.clip(rgb, 0, 255), A[..., None]], -1), "RGBA")
rec = {}
def save(im, name, made):
    p = f"{OUT}/{name}.png"; im.save(p, optimize=True); rec[name] = {"size": list(im.size), "made": made, "sha256": hashlib.sha256(open(p, "rb").read()).hexdigest()}

# ---------- 1. the cabinet strip: one period of strip-a, tiles vertically with no seam ----------
# Measured on the raw (row means): board 1 top 548, board bottom / ledge 1382, ledge underside ends 1600, board 2 top 2356 (period 1808).
# Master scale 7 px per layout px (so the plaster is 1:1 and nothing is enlarged): layout bands plaster 0-2, board 2-98, ledge 98-122, plaster 122-228.
S = Image.open(f"{RAW}/strip-a.jpg").convert("RGB"); F = 7; Wm = 672 * F
src = S.crop((0, 0, Wm, S.height))
def band(y0, y1, h): return lanczos(src.crop((0, y0, Wm, y1)), (Wm, h))
B1, LG, UD, B2 = 548, 1382, 1600, 2356
top = band(B2 - 2 * F, B2, 2 * F)                       # the plaster just above board 2, so the tile's bottom row runs on into its top row
board = band(B1, LG, 96 * F)                            # 834 rows -> 672 (the grain runs across, so the squash does not show)
ledge = band(LG, UD, 24 * F)                            # 218 -> 168
plaster = band(UD, B2 - 2 * F, 106 * F)                 # 742 -> 742, 1:1
strip = Image.new("RGB", (Wm, 228 * F)); y = 0
for part in (top, board, ledge, plaster): strip.paste(part, (0, y)); y += part.height
save(strip, f"cabinet-strip-{Wm}x{228 * F}", "the master: one period of the painted cabinet (plaster, umber back-board, ledge, plaster), seamless vertically, 7x")
save(lanczos(strip, (2016, 684)), "cabinet-strip-2016x684", "3x, reduced from the master")
strip1 = lanczos(strip, (672, 228)); save(strip1, "cabinet-strip-672x228", "1x, the placed tile")

# ---------- 2. the niche: the mouth plus a 2 px rim, feathered to transparent, graded to the strip's board ----------
board_mean = f32(S)[700:1300, 500:4700].reshape(-1, 3).mean(0)
def niche(raw, c, r, name, made):
    im = Image.open(f"{RAW}/{raw}.jpg").convert("RGB"); a = f32(im)
    ring = np.hypot(*np.meshgrid(np.arange(im.width) - c[0], np.arange(im.height) - c[1]))
    rim = a[(ring > r * 1.04) & (ring < r * 1.10)].mean(0)
    a = a * (board_mean / rim)                          # the same wood as the strip at the rim, the whole picture graded alike
    half = round(r * 88 / 84)                           # 88 px slice: the 84 px mouth and a 2 px rim each side
    box = (c[0] - half, c[1] - half, c[0] + half, c[1] + half)
    rgb = img(a).crop(box); rr = ring[box[1]:box[3], box[0]:box[2]]
    alpha = np.clip((half - rr) / (half - r * 1.005), 0, 1) ** 1.2 * 255  # opaque to just past the mouth, fading over the rim
    m = Image.merge("RGBA", (*rgb.split(), img(alpha, "L")))
    save(m, f"{name}-{m.width}x{m.height}", made + ", the master at full size")
    save(premul_resize(m, (264, 264)), f"{name}-264x264", made + ", 3x")
    s1 = premul_resize(m, (88, 88)); save(s1, f"{name}-88x88", made + ", 1x, the placed slice"); return s1
n1 = niche("niche-b", (2030, 2075), 1252, "pod-niche", "the one painted niche, empty: front-on, plain mouth, no groove, no ring; transparent outside the 2 px rim")
h1 = niche("husk-a", (2054, 2054), 1210, "pod-niche-husk", "the niche holding the dried husk (the dried-pod visit), same cut as the empty niche")

# ---------- 3. the pod's contact shadow in the niche (by hand): the pod box is [+12, +6, 64, 76], feet on row 82 ----------
def shadow(n):
    k = n / 88; yy, xx = np.mgrid[0:n, 0:n] + 0.5
    e = np.hypot((xx - 44 * k) / (27 * k), (yy - 81 * k) / (5.5 * k))
    occ = np.hypot((xx - 44 * k) / (36 * k), (yy - 60 * k) / (34 * k))      # the pod keeps the lantern's light off the back
    al = 150 * np.clip(1 - e, 0, 1) ** 1.6 + 40 * np.clip(1 - occ, 0, 1) ** 2
    out = np.zeros((n, n, 4), np.float32); out[..., :3] = (38, 24, 18); out[..., 3] = al
    return img(out, "RGBA")
for n in (2624, 264, 88): save(shadow(n), f"pod-niche-shadow-{n}x{n}", "the pod's soft contact shadow and back occlusion, laid on the niche under the pod (code-drawn by this tool, no painting)")

# ---------- 4. the reading bench backdrop: bench-b cropped to 1024:600, never enlarged; the maroon wood graded to umber ----------
Bn = Image.open(f"{RAW}/bench-b.jpg").convert("RGB"); a = f32(Bn)
ramp = np.clip((np.arange(Bn.height) - 1300) / 120.0, 0, 1)[:, None]          # from the bench top down
a[..., 2] *= 1 - 0.16 * ramp; a[..., 1] *= 1 + 0.03 * ramp
w = round(Bn.height * 1024 / 600); x0 = (Bn.width - w) // 2
bench = img(a).crop((x0, 0, x0 + w, Bn.height))
save(bench, f"reading-bench-{bench.width}x{bench.height}", "the reading room's backdrop, master at full size (1024:600), the bench's front graded from maroon to umber (blue x0.84, green x1.03)")
b1 = lanczos(bench, (1024, 600)); save(b1, "reading-bench-1024x600", "1x, the whole screen (the bars are drawn over rows 0-39 and 562-599)")
save(lanczos(bench, (2048, 1200)), "reading-bench-2048x1200", "2x")
save(b1.crop((0, 40, 1024, 560)), "reading-bench-1024x520", "1x, the band between the bars (rows 40-559 of the 1024x600)")

# ---------- proofs ----------
pod = Image.open(f"{R}/slices/pod-collection-identified.png").crop((0, 14, 88, 112)); pod = premul_resize(pod, (64, 71))
sh = Image.open(f"{OUT}/pod-niche-shadow-88x88.png")
grid = Image.new("RGBA", (672, 466));
for yy in range(0, 466 + 228, 228): grid.paste(strip1, (0, yy - 0))
grid = grid.crop((0, 0, 672, 466))
for row in range(3):
    for col in range(3):
        ox, oy = col * 228, row * 228
        if oy + 8 >= 466: continue
        state = (row * 3 + col) % 4
        grid.alpha_composite(h1 if state == 3 else n1, (ox + 64, oy + 8))
        if state in (1, 2):
            grid.alpha_composite(sh, (ox + 64, oy + 8)); grid.alpha_composite(pod, (ox + 76, oy + 14 + 5))
proof = Image.new("RGBA", (1024, 600), (29, 35, 43, 255)); proof.alpha_composite(grid, (16, 92))
proof.save(f"{OUT}/proof-inventory-1x.png")
tile3 = Image.new("RGB", (672, 228 * 3))
for i in range(3): tile3.paste(strip1, (0, 228 * i))
tile3.save(f"{OUT}/proof-strip-tiled-1x.png")
rb = b1.copy().convert("RGBA"); bar = Image.new("RGBA", (1024, 40), (29, 35, 43, 255)); rb.alpha_composite(bar, (0, 0)); rb.alpha_composite(Image.new("RGBA", (1024, 38), (29, 35, 43, 255)), (0, 562))
big = premul_resize(Image.open(f"{R}/slices/pod-collection-identified.png").crop((0, 14, 88, 112)), (120, 134)); rb.alpha_composite(big, (80, 276 - 134))
rb.save(f"{OUT}/proof-reading-bench-1x.png")
json.dump(rec, open(f"{OUT}/cuts.json", "w"), indent=1); print(json.dumps({k: v["size"] for k, v in rec.items()}))
