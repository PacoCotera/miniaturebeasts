# Hatch now: replace the studio's redrawn creature with the signed juvenile S01 master (reduced once, never mirrored),
# relit to the capsule's roof lamp so the painted mibi and the painted scene read as one world:
#   warm light from above falling to shade underneath, a warm rim on the top edges (crest leaves, head, back),
#   a contact shadow and occlusion on the moss, and the feet sunk into the moss (the scene's own grass blades in front).
import sys, numpy as np
from PIL import Image, ImageDraw, ImageFilter
src, juv, dst = sys.argv[1:4]
scene = Image.open(src).convert('RGBA'); orig = np.asarray(scene).astype(float)
j = Image.open(juv).convert('RGBA'); fig = j.crop(j.getbbox())
H = 166; fig = fig.resize((round(fig.width * H / fig.height), H), Image.LANCZOS)
a = np.asarray(fig).astype(float); h, w = a.shape[:2]; al = a[..., 3] / 255
# 1. light from above: warm and a touch brighter at the top, falling to shade at the belly and feet
t = np.linspace(0, 1, h)[:, None, None]
gain = 1.10 - 0.38 * t ** 1.4
warm = np.array([1.08, 0.99, 0.84])
a[..., :3] = a[..., :3] * gain * warm
# 2. a warm rim on the top edges: pixels whose upper neighbours are transparent
up = np.zeros_like(al)
for d in (1, 2, 3):
    up = np.maximum(up, np.pad(al, ((d, 0), (0, 0)))[:-d] < 0.2)
rim = (al > 0.5) * up
rim = np.asarray(Image.fromarray((rim * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.0))).astype(float) / 255
a[..., :3] = a[..., :3] * (1 - 0.55 * rim[..., None]) + np.array([255, 222, 170]) * 0.55 * rim[..., None]
fig = Image.fromarray(a.clip(0, 255).astype(np.uint8), 'RGBA')
cx, foot = 528, 421
x0, y0 = cx - w // 2, foot - h
# 3. contact shadow and occlusion on the moss
sh = Image.new('L', scene.size, 0); d = ImageDraw.Draw(sh)
d.ellipse((cx - 78, foot - 12, cx + 74, foot + 9), fill=185)       # the body's shadow from the lamp above
d.ellipse((cx - 50, foot - 8, cx + 46, foot + 4), fill=230)        # occlusion right under the body
sh = sh.filter(ImageFilter.GaussianBlur(7)); dark = Image.new('RGBA', scene.size, (18, 12, 6, 255)); dark.putalpha(sh)
scene.alpha_composite(dark)
scene.alpha_composite(fig, (x0, y0))
# 4. the feet sunk into the moss: the scene's own lit grass blades come back in front over the feet's lowest rows
out = np.asarray(scene).astype(float)
band = slice(foot - 10, foot + 3); xs = slice(x0, x0 + w)
o = orig[band, xs, :3]; L = o @ np.array([0.3, 0.59, 0.11])
local = np.asarray(Image.fromarray(L.astype(np.uint8)).filter(ImageFilter.BoxBlur(4))).astype(float)
blade = np.clip((L - local - 4) / 18, 0, 1)                          # the brighter strands in the moss
fade = np.clip((np.arange(o.shape[0]) - 2) / 6, 0, 1)[:, None]       # stronger toward the ground line
fa = np.zeros(o.shape[:2]); fy0 = foot - 10 - y0
fa[:, :] = al[np.clip(np.arange(fy0, fy0 + o.shape[0]), 0, h - 1)][:, :o.shape[1]]
shadow_k = 1 - np.asarray(sh)[band, xs].astype(float) / 255 * 0.93   # the blades sit in the same shadow
m = (blade * fade * (fa > 0.3))[..., None]                           # only over the feet themselves
out[band, xs, :3] = out[band, xs, :3] * (1 - m) + o * shadow_k[..., None] * m
Image.fromarray(out[..., :3].clip(0, 255).astype(np.uint8)).save(dst)
