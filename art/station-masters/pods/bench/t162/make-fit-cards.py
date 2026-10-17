"""T-20261016-162 (specs/station-decision-panel-spec.md §1.6, "Fit the upgrade?"; T-159): the panel's two outcomes as things.
- bench-probe-t2-card-128x160, bench-probe-t1-card-128x160: the whole Probe upright in its cradle, tier 2 (the fourth plate, the sand add-on
  module and the side lens) and tier 1, from the same painting as bench-probe-upright-t{1,2}-288x432 (the aligned cut of the cradle edits),
  reduced premultiplied with Lanczos (never enlarged) into 128 x 160 by height, bottom-centred, its foot on the card's floor. One transform for
  both, so they differ only where the part is.
- bench-reach-t2-160, bench-reach-t1-160: a small field map, the Station's dark matte slate display with an 11 x 11 grid of land cells (14
  px, muted meadow, pond, rock and wood tones), the start cell marked at the centre, and the Probe's reach ring round it: tier 1 reaches 2
  cells (its 5 x 5, design/play-manual.md), tier 2 reaches 4 (9 x 9), so the rings' radii are 2.5 and 4.5 cells (35 and 63 px). Tier 2's ring
  is lit mint (2 px, an aqua edge, opaque); tier 1's unlit (mist). No glow.
usage: python3 -I bench/t162/make-fit-cards.py OUT_DIR   (run in art/station-masters/pods)"""
import sys, os, json, numpy as np
from PIL import Image
from scipy import ndimage as nd
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
pal = dict(json.load(open("../../../prototypes/ui/palettes/station.json"))["colours"])
P = lambda n: np.array([int(pal[n][i:i + 2], 16) for i in (1, 3, 5)], float)
ims = {t: np.asarray(Image.open(f"bench/slices/bench-probe-upright-t{t}-288x432.png").convert("RGBA")).astype(float) for t in (1, 2)}
k = 160 / 432; w = round(288 * k)
for t, a in ims.items():
    pm = a.copy(); pm[..., :3] *= a[..., 3:] / 255
    ch = [np.asarray(Image.fromarray(pm[..., c].astype(np.float32), "F").resize((w, 160), Image.LANCZOS)) for c in range(4)]
    al = np.clip(ch[3], 0, 255); rgb = np.stack(ch[:3], -1) / np.maximum(al, 1e-3)[..., None] * 255
    card = np.zeros((160, 128, 4)); ox = (128 - w) // 2; card[:, ox:ox + w, :3] = np.clip(rgb, 0, 255); card[:, ox:ox + w, 3] = al
    card[card[..., 3] < 1] = 0
    Image.fromarray(np.rint(card).astype(np.uint8), "RGBA").save(os.path.join(out, f"bench-probe-t{t}-card-128x160.png"))
# the reach maps
N, C = 160, 14; G = 11; o = (N - G * C) // 2
rng = np.random.default_rng(162); field = nd.gaussian_filter(rng.normal(0, 1, (G, G)), 1.2)
kinds = np.digitize(field, np.quantile(field, [0.18, 0.62, 0.86]))         # pond, meadow, wood, rock
TONE = [P("deepTeal"), P("sageD"), P("forest") * 0.8 + P("ink") * 0.2, P("stone")]
base = np.zeros((N, N, 3)); base[:] = [24, 28, 32]
for i in range(G):
    for j in range(G):
        col = TONE[kinds[i, j]] * 0.55 + np.array([24, 28, 32]) * 0.45
        base[o + i * C + 1:o + (i + 1) * C, o + j * C + 1:o + (j + 1) * C] = col            # a 1 px slate gutter between the cells
cc = o + (G // 2) * C; base[cc + 4:cc + C - 3, cc + 4:cc + C - 3] = P("bone")               # the start cell's mark
yy, xx = np.mgrid[0:N, 0:N] + .5; r = np.hypot(xx - N / 2, yy - N / 2)
def save(name, ring_r, lit):
    img = np.dstack([base.copy(), np.full((N, N), 255.0)])
    band = np.abs(r - ring_r)
    if lit:
        img[band < 1.0, :3] = P("mint"); img[(band >= 1.0) & (band < 1.7), :3] = P("aqua")
    else:
        img[band < 0.8, :3] = P("mist")
    m = np.hypot(xx - N / 2, yy - N / 2)                                   # the map is a rounded display: corners clear
    d = np.minimum.reduce([xx, N - xx, yy, N - yy]); img[(d < 6) & (np.hypot(np.clip(xx, 6, N - 6) - xx, np.clip(yy, 6, N - 6) - yy) > 6), 3] = 0
    Image.fromarray(np.clip(np.rint(img), 0, 255).astype(np.uint8), "RGBA").save(os.path.join(out, name + ".png"))
save("bench-reach-t1-160", 2.5 * C, False); save("bench-reach-t2-160", 4.5 * C, True)
print("made: bench-probe-t1-card-128x160, bench-probe-t2-card-128x160, bench-reach-t1-160, bench-reach-t2-160")
