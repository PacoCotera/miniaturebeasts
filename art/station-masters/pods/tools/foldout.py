"""Pass 78: library-foldout-1008x504 (origin/design-field-guide 2353443f, library.json masters): the fold-out sheet of the Book's second spread: the boards and one page across the gutter, aged paper, no gutter, no marker. DERIVED FROM THE CONCEPT, not from a signed Book master (none exists: the library-book README lists "a painted master" as still lacking).
Taken from the concept plate art/concept-station/library-book/placed/BK-D-r2-a1-stamped-1024x600.png: the brown board rim round the sheet (boards 16 px at the sides and 8 px top and bottom, so the page is the spec's fold-out rect 976x488 at (16, 8) of the sheet, which the layout places at (24, 56) of the screen: sheet origin (8, 48)),
and the cream page toned darker toward its edges. Hand-built from `station.json` colours only (opaque, 1x): boards `bark` with a `soil` outer line, a `clay` lit line top and left and a `soil` shade bottom and right, a sparse grain; the page a tone field (a vignette from the page edge plus slow mottling plus a few flecks) put through the ramp bone, paper, sand, clay by a 4x4 ordered dither;
nothing across the middle (no gutter shade, no crease), no cloth marker, no ornament, no text (the corner lanterns and leaves of the concept are the build's or a later pass's, not here).
python3 -I tools/foldout.py -> slices/library-foldout-1008x504.png, marks/foldout-proof-1x.png"""
import os, json, hashlib, math, random
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
pal = {n: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for n, h in json.load(open("../../../prototypes/ui/palettes/station.json"))["colours"]}
W, H, BX, BY = 1008, 504, 16, 8; rng = np.random.default_rng(78)
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16 + 1 / 32
img = np.zeros((H, W, 3), np.uint8); img[:] = pal["bark"]
# the page's tone: 0 light .. 1 dark
yy, xx = np.mgrid[0:H, 0:W]; px, py = xx - BX, yy - BY; pw, ph = W - 2 * BX, H - 2 * BY
d = np.minimum.reduce([px, py, pw - 1 - px, ph - 1 - py]).astype(float)
vig = np.clip(1 - d / 56, 0, 1) ** 1.8 * 0.42
def smooth_noise(scale, seed):
    r = np.random.default_rng(seed); g = r.random((H // scale + 3, W // scale + 3)); big = np.kron(g, np.ones((scale, scale)))[:H + scale, :W + scale]
    k = np.ones(scale) / scale; big = np.apply_along_axis(lambda v: np.convolve(v, k, "same"), 0, big); big = np.apply_along_axis(lambda v: np.convolve(v, k, "same"), 1, big); return big[:H, :W]
mott = (smooth_noise(64, 1) - 0.5) * 0.14 + (smooth_noise(16, 2) - 0.5) * 0.06
T = np.clip(0.36 + vig + mott, 0, 1)
ramp = [pal["bone"], pal["paper"], pal["sand"], pal["clay"]]; lv = T * 3.0; base = np.floor(lv).astype(int); frac = lv - base
bay = np.tile(BAYER, (H // 4 + 1, W // 4 + 1))[:H, :W]; idx = np.clip(base + (frac > bay), 0, 3)
page = np.zeros((H, W, 3), np.uint8)
for i, c in enumerate(ramp): page[idx == i] = c
fl = rng.random((H, W)); page[(fl < 0.0012) & (d > 3)] = pal["sand"]; page[(fl > 0.9992) & (d > 3)] = pal["bone"]       # a few flecks
inside = (px >= 0) & (px < pw) & (py >= 0) & (py < ph); img[inside] = page[inside]
page_edge = inside & (d < 1); img[page_edge] = pal["clay"]                                                                    # the page block's own edge line
# boards: grain, the outer soil line, the lit line top and left, the shade bottom and right, the soil shadow where the page meets the board
g = rng.random((H, W)); board = ~inside
img[board & (g < 0.07)] = pal["soil"]; img[board & (g > 0.95)] = pal["clay"]
for x in range(W):
    img[0, x] = pal["soil"]; img[H - 1, x] = pal["soil"]; img[1, x] = pal["clay"]; img[H - 2, x] = pal["soil"]
for y in range(H):
    img[y, 0] = pal["soil"]; img[y, W - 1] = pal["soil"]; img[y, 1] = pal["clay"]; img[y, W - 2] = pal["soil"]
for x in range(BX - 1, W - BX + 1): img[BY - 1, x] = pal["soil"]; img[H - BY, x] = pal["soil"]
for y in range(BY - 1, H - BY + 1): img[y, BX - 1] = pal["soil"]; img[y, W - BX] = pal["soil"]
im = Image.fromarray(img); im.save("slices/library-foldout-1008x504.png", optimize=True)
cols = {tuple(c) for c in np.unique(img.reshape(-1, 3), axis=0)}; allowed = set(pal.values()); assert cols <= allowed, cols - allowed
man = json.load(open("slices/manifest.json"))
man["library-foldout-1008x504"] = {"size": [W, H], "rect": [8, 48, W, H], "src": "art/concept-station/library-book/placed/BK-D-r2-a1-stamped-1024x600.png", "made": "DERIVED FROM THE CONCEPT (no signed Book master exists): the boards (16 px at the sides, 8 px top and bottom, bark with a soil outer line and a clay lit line) and one page across the gutter (976x488 at (16, 8), aged: bone, paper, sand, clay by an ordered dither, darker toward the edges), no gutter, no marker, no ornament, no text; palette colours only (pass 78)",
                                 "sha256": hashlib.sha256(open("slices/library-foldout-1008x504.png", "rb").read()).hexdigest()}
json.dump(man, open("slices/manifest.json", "w"), indent=1)
fr = Image.new("RGB", (1024, 600), pal["ground"]); fr.paste(im, (8, 48)); fr.save("marks/foldout-proof-1x.png")
print(len(cols), "colours", sorted(c for c in {n for n, v in pal.items() if tuple(v) in cols}))
