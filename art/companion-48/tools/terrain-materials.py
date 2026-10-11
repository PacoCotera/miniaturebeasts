"""Terrain materials for the grass slice, from the paid sources, made to repeat and snapped to the 48 colours.

  face-rock.png    the Retro Diffusion rock face (sources/t-rock-rd.png), made to repeat left to right (a cross-fade with itself
                   rolled by half a tile, so the rolled copy's seam sits where the original is fully shown), restricted to the
                   rock, grass and earth ramps
  face-rock2.png   a second Retro Diffusion rock (sources/t-rock2-rd.png), its edge bands faded into the first rock's edges so either
                   joins the other
  planks.png       the Retro Diffusion planks (sources/t-planks-rd.png), made to repeat both ways
  water1..3.png    crops of the Gemini painting's stream (sources/terrain-grass-cliffs-a1.jpg), area-averaged to 48 px, made to
                   repeat both ways, restricted to the B ramp. The two Retro Diffusion water tiles came back as one flat colour
                   and are not used.
usage: python3 -I terrain-materials.py SOURCES_DIR OUT_DIR"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import pal, quant
P = quant.P
src, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)

def rgb(p): return np.asarray(Image.open(p).convert("RGB")).astype(np.float64)
def wrap(f, axis):
    """cross-fade a tile with itself rolled by half: weight 1 for the original at the centre, 0 at the edges."""
    n = f.shape[axis]; r = np.roll(f, n // 2, axis=axis)
    w = 1 - np.abs(np.arange(n) - (n - 1) / 2) / ((n - 1) / 2)          # 1 at the centre, 0 at both edges
    w = np.clip(w * 1.6, 0, 1)
    w = w[None, :, None] if axis == 1 else w[:, None, None]
    return f * w + r * (1 - w)
def snap(f, ramps): return quant.quantize(np.dstack([np.clip(f, 0, 255).astype(np.uint8), np.full(f.shape[:2], 255, np.uint8)]), pal.ramp_indices(P, ramps))
def save(idx, n): P.to_image(idx).save(os.path.join(out, n + ".png"))

rock = wrap(rgb(os.path.join(src, "t-rock-rd.png")), 1)
r = snap(rock, "NKGW"); save(r, "face-rock")
# the second rock (another crop of the painting, its own seed): its 10 px edge bands fade into the first rock's own edge columns,
# so rock|rock2, rock2|rock and rock2|rock2 all join as rock|rock does
rock2 = wrap(rgb(os.path.join(src, "t-rock2-rd.png")), 1)
for i in range(10):
    t = i / 10
    rock2[:, i] = rock[:, i] * (1 - t) + rock2[:, i] * t
    rock2[:, 47 - i] = rock[:, 47 - i] * (1 - t) + rock2[:, 47 - i] * t
save(snap(rock2, "NKGW"), "face-rock2")
pl = wrap(wrap(rgb(os.path.join(src, "t-planks-rd.png")), 1), 0); save(snap(pl, "W"), "planks")
paint = Image.open(os.path.join(src, "terrain-grass-cliffs-a1.jpg")).convert("RGB")
for i, (x, y) in enumerate(((290, 790), (470, 800), (640, 820)), 1):          # stream crops clear of the bank, bridge and foam
    crop = np.asarray(paint.crop((x, y, x + 73, y + 73)).resize((48, 48), Image.BOX)).astype(np.float64)
    save(snap(wrap(wrap(crop, 1), 0), "B"), f"water{i}")
print("materials written to", out)
