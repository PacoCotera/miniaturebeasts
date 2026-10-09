"""Proof (pass 57): one frame of each live size with a crop or a stand-in card, the seeds and a corner mark on the sill, 1x (and a 2x view). The seed hangs from the sill: its 32x40 master at (P.x + P.w - 32, P.y + P.h - 24)
(hides, right), a second at (P.x, ...) for the blend, the Only base 72x8 at (P.x + P.w/2 - 36, P.y + P.h - 14), the asleep mark 24x16 at the sill's left end as a fit test (its place is open with the art director).
python3 -I tools/proposals_sill.py"""
import os
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
S = lambda n: Image.open(f"slices/{n}.png").convert("RGBA")
f16 = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-Regular.otf", 16); seed = S("mark-seed-32x40"); only = S("mark-only-72x8"); asleep = S("mark-asleep-24x16")
cv = Image.new("RGBA", (1000, 620), (21, 36, 46, 255)); d = ImageDraw.Draw(cv)
def put(x, y, w, h, pic, suf="", marks=("seed",), label=""):
    cv.alpha_composite(pic, (x, y)); cv.alpha_composite(S(f"trait-picture-frame-{w}x{h}{suf}"), (x, y))
    if "seed" in marks: cv.alpha_composite(seed, (x + w - 32, y + h - 24))
    if "blend" in marks: cv.alpha_composite(seed, (x, y + h - 24))
    if "only" in marks: cv.alpha_composite(only, (x + w // 2 - 36, y + h - 14))
    if "asleep" in marks: cv.alpha_composite(asleep, (x + 6, y + h - 18))
    d.text((x, y + h + 6), label or f"{w}x{h}", font=f16, fill=(190, 200, 205, 255))
stand = lambda w, h: S(f"trait-picture-standin-{w}x{h}")
put(16, 16, 128, 160, S("trait-S09-head-between-small-and-large-128x160"), marks=("seed", "asleep"), label="Head, read")
put(160, 16, 128, 160, S("trait-S09-beak-between-128x160"), marks=("seed", "blend"), label="Beak, blend")
put(304, 16, 128, 160, S("trait-S01-eyes-between-small-and-large-128x160"), marks=("only",), label="Eyes, only")
put(448, 16, 128, 160, Image.new("RGBA", (128, 160), (0, 0, 0, 0)), suf="-unread", marks=(), label="unread")
put(592, 16, 128, 160, Image.new("RGBA", (128, 160), (0, 0, 0, 0)), suf="-sealed", marks=(), label="sealed")
put(736, 16, 112, 112, stand(112, 112), marks=(), label="find 112x112")
put(16, 240, 184, 104, stand(184, 104), marks=("seed", "asleep"))
put(216, 240, 120, 96, stand(120, 96), marks=("seed", "only"))
put(352, 240, 184, 256, stand(184, 256), marks=("seed",))
put(560, 240, 376, 264, stand(376, 264), marks=("seed", "blend", "asleep"))
os.makedirs("proposals", exist_ok=True); cv.convert("RGB").save("proposals/sill-proof-1x.png"); cv.convert("RGB").resize((2000, 1240), Image.NEAREST).save("proposals/sill-proof-2x.png")
