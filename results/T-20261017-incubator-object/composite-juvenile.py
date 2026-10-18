# Hatch now: replace the studio's redrawn creature with the signed juvenile S01 master, reduced once and never mirrored,
# feet on the moss where the painted one stood, warmed slightly to the capsule's lamp. The painted creature is fully
# covered by the master's figure (checked by eye at 3x).
import sys, numpy as np
from PIL import Image
src, juv, dst = sys.argv[1:4]
im = Image.open(src).convert('RGBA'); j = Image.open(juv).convert('RGBA')
bb = j.getbbox(); fig = j.crop(bb)
H = 166; k = H / fig.height; fig = fig.resize((round(fig.width * k), H), Image.LANCZOS)
a = np.asarray(fig).astype(float); a[..., :3] *= np.array([1.06, 0.98, 0.86]); a[..., :3] *= 0.93   # the lamp's warmth
fig = Image.fromarray(a.clip(0, 255).astype(np.uint8), 'RGBA')
cx, foot = 528, 419
from PIL import ImageDraw, ImageFilter                             # a soft contact shadow on the moss, under the feet
sh = Image.new('L', im.size, 0); ImageDraw.Draw(sh).ellipse((cx - 70, foot - 9, cx + 66, foot + 7), fill=120)
sh = sh.filter(ImageFilter.GaussianBlur(6)); dark = Image.new('RGBA', im.size, (20, 14, 8, 255)); dark.putalpha(sh)
im.alpha_composite(dark)
im.alpha_composite(fig, (cx - fig.width // 2, foot - fig.height))
im.convert('RGB').save(dst)
