"""Pass 139 proof: the crates before and after the fringe cleaning, with their shadows, on the Cargo bay floor (cargo-bay-992x320) at 1x and 4x.
usage: python3 -I tools/cratefringe_proof.py"""
from PIL import Image
bay = Image.open("slices/cargo-bay-992x320.png").convert("RGBA")
ld = lambda n, d="slices": Image.open(f"{d}/{n}.png").convert("RGBA")
FEET = 282
def scene(after, crates, big=False):
    f = bay.copy()
    for n, x, top_ink, shn in crates:                    # a crate's ink bottom row on the feet line; its shadow centred on the feet line, drawn under it
        c = ld(n, "slices" if after else "source/work/cargo-before-139")
        if after and shn: s = ld(shn); f.alpha_composite(s, (x, FEET - s.height // 2))
        f.alpha_composite(c, (x, FEET - top_ink))
    return f
S256 = [("crate-sealed-256x176", 64, 163, "crate-shadow-256x24"), ("crate-sitting-256x176", 384, 163, "crate-shadow-256x24"), ("crate-sealed-256x176", 704, 163, "crate-shadow-256x24")]
panels = [("three 256 crates", S256)] + [(n, [(n, 280, 266, "crate-shadow-432x24")]) for n in ("crate-sealed-432x272", "crate-opening-432x272", "crate-open-432x272")]
W, Hh = 992, 320
sheet = Image.new("RGB", (2 * W + 16, len(panels) * (Hh + 8)), (43, 48, 56))
for i, (name, cr) in enumerate(panels):
    for j, after in enumerate((False, True)): sheet.paste(scene(after, cr).convert("RGB"), (j * (W + 16), i * (Hh + 8)))
sheet.save("marks/crate-fringe-shadow-1x.png")
# 4x: the rim of each crate (the top-left corner and the lower right), before | after, on the bay floor
crops = []
for name, cr in panels:
    n, x, ti, _ = cr[0]; a = [scene(False, cr), scene(True, cr)]
    for box in ((x, FEET - ti, x + 96, FEET - ti + 64), (x + (256 if "256" in n else 432) - 96, FEET - 64 - 4, x + (256 if "256" in n else 432), FEET + 12)):
        crops.append([im.crop(box).resize((384, 4 * (box[3] - box[1])), Image.NEAREST) for im in a])
rows = [(c[0], c[1]) for c in crops]
H4 = sum(r[0].height + 6 for r in rows); S4 = Image.new("RGB", (2 * 384 + 12, H4), (43, 48, 56)); y = 0
for b, a in rows: S4.paste(b.convert("RGB"), (0, y)); S4.paste(a.convert("RGB"), (396, y)); y += b.height + 6
S4.save("marks/crate-fringe-shadow-4x.png"); print(sheet.size, S4.size)
