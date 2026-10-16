"""T-20261016-57 (specs/station-dock-arrival-spec.md §1, §1.1; specs/dock-moments.md §5): the Station's dock masters that can be made by hand.
By hand in code, no paid call. The house style: painted light, matte, the house's small-mark look; nothing new.
- cargo-link-light-976x8 at (24, 296), the bay's floor line under the crates' feet: the Caddy's link reaching the bay, as light along the floor.
  A matte pool, not a neon line: a warm-white core on rows 3-4 falling off over the 8 rows, its leading 12 px soft; the build reveals it in 4
  steps of 244 px (one cut each 100 ms).
- mark-home-16 and mark-out-16: who came home and who left. A small sage door (the housing's sage, lit top left) with its dark opening, and a
  bone arrow going in (home) or coming out (out); drawn at 8x, reduced.
- face-{S01,S02,S03}-24: each species' face cut from its signed adult painting (slices/mibi-adult-{S}-304x312), a hand-set square round the
  head and its crown (S01's leaves, S02's cap, S03's antenna), reduced to 24 (never enlarged) with premultiplied alpha.
usage: python3 -I dock/make-dock.py OUT_DIR   (run in art/station-masters/pods)"""
import sys, os, numpy as np
from PIL import Image, ImageDraw
out = sys.argv[1]
def lin(c): c = np.asarray(c, float) / 255; return np.where(c <= .04045, c / 12.92, ((c + .055) / 1.055) ** 2.4)
def srgb(l): l = np.clip(l, 0, 1); return np.where(l <= .0031308, l * 12.92, 1.055 * l ** (1 / 2.4) - .055) * 255
# the link light
W, H = 976, 8; yy, xx = np.mgrid[0:H, 0:W] + .5
a = np.exp(-((yy - 4.0) / 1.6) ** 2) * 0.85 * np.clip(xx / 12, 0, 1)
col = np.dstack([np.full((H, W), 244.), np.full((H, W), 232.), np.full((H, W), 204.)])
Image.fromarray(np.dstack([col, a * 255]).round().astype(np.uint8), "RGBA").save(os.path.join(out, "cargo-link-light-976x8.png"))
# the marks
def mark(name, inward):
    S = 8; im = Image.new("RGBA", (16 * S, 16 * S), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    dx = 6 * S if inward else 1 * S                                          # the door: home on the right, out on the left
    d.rounded_rectangle([dx, 1 * S, dx + 9 * S - 1, 15 * S - 1], radius=2 * S, fill=(98, 102, 79, 255))          # the frame, sage shade
    d.rounded_rectangle([dx, 1 * S, dx + 9 * S - 1, 3 * S], radius=2 * S, fill=(136, 142, 112, 255))              # its lit top
    d.rectangle([dx, 1 * S + S, dx + S, 15 * S - 1], fill=(136, 142, 112, 255))                                  # its lit left
    d.rectangle([dx + 2 * S, 3 * S, dx + 7 * S - 1, 15 * S - 1], fill=(26, 28, 32, 255))                          # the dark opening
    y = 9 * S
    if inward: pts = [(0, y - S), (6 * S, y - S), (6 * S, y - 3 * S), (10 * S, y), (6 * S, y + 3 * S), (6 * S, y + S), (0, y + S)]
    else: pts = [(5 * S, y - S), (11 * S, y - S), (11 * S, y - 3 * S), (15 * S + S // 2, y), (11 * S, y + 3 * S), (11 * S, y + S), (5 * S, y + S)]
    d.polygon(pts, fill=(241, 235, 223, 255))
    sm = im.resize((16, 16), Image.LANCZOS); sm.save(os.path.join(out, name + ".png"))
mark("mark-home-16", True); mark("mark-out-16", False)
# the faces
FACE = {"S01": (18, 15, 218, 215), "S02": (33, 70, 173, 210), "S03": (76, 130, 176, 230)}                      # the head squares, in the 304 x 312 painting
for sp, box in FACE.items():
    a = np.asarray(Image.open(f"slices/mibi-adult-{sp}-304x312.png").convert("RGBA")).astype(float)
    pm = a.copy(); pm[..., :3] *= pm[..., 3:] / 255
    c = Image.fromarray(pm.round().astype(np.uint8), "RGBA").crop(box).resize((24, 24), Image.LANCZOS)
    r = np.asarray(c).astype(float); al = r[..., 3:]; rgb = np.where(al > 0, r[..., :3] * 255 / np.maximum(al, 1), 0)
    Image.fromarray(np.dstack([np.clip(rgb, 0, 255), al]).round().astype(np.uint8), "RGBA").save(os.path.join(out, f"face-{sp}-24.png"))
print("made: cargo-link-light-976x8, mark-home-16, mark-out-16, face-S01-24, face-S02-24, face-S03-24")
