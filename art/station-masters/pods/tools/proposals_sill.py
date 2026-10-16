"""Proof (pass 58, round 2), 1x with a 2x view, built from the spec at origin/design-pods-marks 428ec819 (pods.json page.marks.sill): valid states only. Every mark sits on the sill:
seed (right; hides), blend (both seeds), Only (centred, [P.x + P.w/2 - 36, P.y + P.h - 14]), asleep (centred, [P.x + P.w/2 - 12, P.y + P.h - 18], no seeds, no Only), breed-to-change (centred between the seeds,
[P.x + P.w/2 - 14, P.y + P.h - 18]), and the shared sill (breed at P.x + 6, Only at P.x + P.w - 78) at 128 and 120; "Leaf covering" after the amber lamp in a 120 cell (lamp at (cell.x, line y + 4), name at cell.x + 16,
line y = P.y + P.h + 8) with both seeds, the test case of the seed column. Frames: plain, unread and sealed. python3 -I tools/proposals_sill.py"""
import os
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
S = lambda n: Image.open(f"slices/{n}.png").convert("RGBA")
f16 = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-Regular.otf", 16); f12 = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-Regular.otf", 12)
seed, only, asleep, breed, lamp = S("mark-seed-32x40"), S("mark-only-72x8"), S("mark-asleep-24x16"), S("mark-breed-28x16"), S("frame-lamp-12-amber")
cv = Image.new("RGBA", (1120, 640), (21, 36, 46, 255)); d = ImageDraw.Draw(cv)
def put(x, y, w, h, pic, marks=(), suf="", label="", name=None):
    cv.alpha_composite(pic, (x, y)); cv.alpha_composite(S(f"trait-picture-frame-{w}x{h}{suf}"), (x, y))
    for m in marks:
        if m == "seed": cv.alpha_composite(seed, (x + w - 32, y + h - 24))
        if m == "blend": cv.alpha_composite(seed, (x + w - 32, y + h - 24)); cv.alpha_composite(seed, (x, y + h - 24))
        if m == "only": cv.alpha_composite(only, (x + w // 2 - 36, y + h - 14))
        if m == "asleep": cv.alpha_composite(asleep, (x + w // 2 - 12, y + h - 18))
        if m == "breed": cv.alpha_composite(breed, (x + w // 2 - 14, y + h - 18))
        if m == "breed-shared": cv.alpha_composite(breed, (x + 6, y + h - 18))
        if m == "only-shared": cv.alpha_composite(only, (x + w - 78, y + h - 14))
    ly = y + h + 8
    if name: cv.alpha_composite(lamp, (x, ly + 4)); d.text((x + 16, ly), name, font=f16, fill=(241, 235, 223, 255))
    d.text((x, y + h + 34 if name else y + h + 8), label or f"{w}x{h}", font=f12, fill=(150, 165, 172, 255))
st = lambda w, h: S(f"trait-picture-standin-{w}x{h}"); blank = lambda w, h: Image.new("RGBA", (w, h), (0, 0, 0, 0))
put(16, 16, 128, 160, S("trait-S09-head-between-small-and-large-128x160"), ("seed",), label="seed (hides)")
put(160, 16, 128, 160, S("trait-S09-beak-between-128x160"), ("blend",), label="blend")
put(304, 16, 128, 160, S("trait-S01-eyes-between-small-and-large-128x160"), ("only",), label="Only")
put(448, 16, 128, 160, S("trait-S09-crown-tall-128x160"), ("asleep",), label="asleep, centred")
put(592, 16, 128, 160, S("trait-S12-colour-marigold-128x160"), ("blend", "breed"), label="breed, between the seeds")
put(736, 16, 128, 160, S("trait-S09-tail-between-128x160"), ("breed-shared", "only-shared"), label="shared sill, 128")
put(880, 16, 120, 96, st(120, 96), ("breed-shared", "only-shared"), label="shared sill, 120")
put(160, 400, 128, 160, blank(128, 160), (), suf="-unread", label="unread, no marks")
put(16, 240, 120, 96, st(120, 96), ("blend",), label="Leaf covering, both seeds", name="Leaf covering")
put(160, 240, 184, 104, st(184, 104), ("blend", "breed"), label="184x104")
put(368, 240, 184, 256, st(184, 256), ("seed",), label="184x256")
put(576, 240, 376, 264, st(376, 264), ("blend", "only"), label="376x264")
put(16, 400, 128, 160, blank(128, 160), (), suf="-sealed", label="sealed, no marks")
os.makedirs("proposals", exist_ok=True); cv.convert("RGB").save("proposals/sill-proof-1x.png"); cv.convert("RGB").resize((2240, 1280), Image.NEAREST).save("proposals/sill-proof-2x.png")
