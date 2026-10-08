"""Seed 50's raw 64 px Retro Diffusion result beside the edited hut at 3x, so what moved is visible. usage: python3 -I hut-b-vs-raw.py RAW.png EDIT.png OUT.png"""
import sys
from PIL import Image, ImageDraw
raw, edit, out = sys.argv[1:4]; bg = (60, 60, 70)
def up(p): im = Image.open(p).convert("RGBA"); t = Image.new("RGBA", im.size, bg + (255,)); t.alpha_composite(im); return t.convert("RGB").resize((im.width * 3, im.height * 3), Image.NEAREST)
a, b = up(raw), up(edit); W = Image.new("RGB", (a.width + b.width + 30, max(a.height, b.height) + 28), (40, 36, 50)); d = ImageDraw.Draw(W)
W.paste(a, (10, 8)); W.paste(b, (a.width + 20, 8)); d.text((10, a.height + 12), "seed 50, raw 64 px", fill=(220, 216, 234)); d.text((a.width + 20, b.height + 12), "the edit: eave ellipse, logs bowed, side porch, one window, shadow on grass", fill=(220, 216, 234))
W.save(out); print("wrote", out, W.size)
