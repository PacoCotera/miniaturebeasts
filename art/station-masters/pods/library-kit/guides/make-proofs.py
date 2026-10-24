"""The 1x proofs the art director signs from (library-kit/proof/), with a x4 nearest copy of each small one.
Reads the masters from ../slices, the placed references from station-gate (SG, REV) and the approved render from the internal work-queue (IWQ)."""
import io, json, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from kitlib import SLICES, PROOF, IWQ, pal, sg_bytes, sg_image, sha, measures_update

P = pal()
BAR = (35, 41, 47)
FONT = ImageFont.truetype(io.BytesIO(sg_bytes("prototypes/ui/fonts/inter/src/Inter-Regular-tnum.ttf")), 12)
FONT_S = ImageFont.truetype(io.BytesIO(sg_bytes("prototypes/ui/fonts/inter/src/Inter-Regular-tnum.ttf")), 11)
RENDER = os.path.join(IWQ, "results/T-20261017-library/art/library-all-v5.png")
M = json.load(open(os.path.join(os.path.dirname(__file__), "measures.json")))
made = {}

def sl(name, mode="RGBA"): return Image.open(os.path.join(SLICES, name + ".png")).convert(mode)
def out(img, name, x4=True):
    img = img.convert("RGB"); p = os.path.join(PROOF, name + "-1x.png"); img.save(p, optimize=True); made[name + "-1x.png"] = list(img.size)
    if x4:
        img.resize((img.width * 4, img.height * 4), Image.NEAREST).save(os.path.join(PROOF, name + "-x4.png"), optimize=True); made[name + "-x4.png"] = [img.width * 4, img.height * 4]
def text(d, xy, s, fill=P["fog"], f=None): d.text(xy, s, font=f or FONT, fill=fill)
def disc(d, x, y, fill, fill2=None):
    """a 16 px found disc stand-in, 1-bit: pixel centres within 8 of the box centre; fill2 makes the right half a second colour"""
    for j in range(16):
        for i in range(16):
            if (i + 0.5 - 8) ** 2 + (j + 0.5 - 8) ** 2 <= 64:
                d.point((x + i, y + j), fill=fill2 if (fill2 and i >= 8) else fill)

# 1. ground-1x: M1 at (0, 40) of a 1024 x 600 frame, beside the approved render's open stage cropped to the same rect, the measures under both
g = sl("library-ground-1024x522", "RGB"); ren = Image.open(RENDER).convert("RGB")
m1 = M["M1_library_ground_1024x522"]
rows = [("measure", "exit", "M1 as measured"),
        ("mean per channel", "33, 27, 26 +-1", ", ".join(f"{v:.2f}" for v in m1["mean_per_channel"])),
        ("centre 64 x 64 mean", "+3 +-1", f"{m1['centre_64_mean']:+.2f}"),
        ("corner 32 x 32 means", "-1 +-1", ", ".join(f"{v:+.2f}" for v in m1["corner_32_means"].values())),
        ("sigma of R - 33 - round(V)", "1.9 to 2.1", f"{m1['sigma_R_minus_33_minus_roundV']:.3f}"),
        ("max |offset|, clamped", "<= 8, <= 0.05 %", f"{m1['max_abs_offset']}, {m1['clamped_pct']:.4f} %"),
        ("R-33 = G-27 = B-26", "every pixel", "yes" if m1["channels_locked"] else "NO"),
        ("raw sigma tooth, fibre", "1.63, 1.02 (AD run)", f"{m1['raw_sigma_tooth']:.2f}, {m1['raw_sigma_fibre']:.2f}")]
c = Image.new("RGB", (2 * 1024 + 16, 600 + 24 + 18 * len(rows) + 16), P["libWell"]); d = ImageDraw.Draw(c)
for k, src in enumerate((g, ren.crop((0, 40, 1024, 562)))):
    x0 = k * (1024 + 16)
    d.rectangle([x0, 0, x0 + 1023, 39], fill=BAR); d.rectangle([x0, 562, x0 + 1023, 599], fill=BAR)
    c.paste(src, (x0, 40))
    text(d, (x0 + 16, 13), "library-ground-1024x522 at (0, 40)" if k == 0 else "approved render library-all-v5.png, the open stage (0, 40, 1024, 522)")
for i, rw in enumerate(rows):
    for j, s in enumerate(rw): text(d, (16 + j * 260, 612 + 18 * i), s, fill=P["bone"] if i == 0 else P["fog"])
out(c, "ground", x4=False)

# 2. ground-sheet-seam-1x: the sheet rect [16, 40, 664, 522] cut from M1's own pixels and pasted back; outlined in the second copy
fr = Image.new("RGB", (1024, 600), BAR); fr.paste(g, (0, 40))
sheet = fr.crop((16, 40, 16 + 664, 40 + 522)); fr2 = fr.copy(); fr2.paste(sheet, (16, 40))
seam_diff = int((np.asarray(fr2).astype(int) != np.asarray(fr).astype(int)).any(-1).sum())
c = Image.new("RGB", (2 * 1024 + 16, 600), P["libWell"]); c.paste(fr2, (0, 0))
o = fr2.copy(); od = ImageDraw.Draw(o); od.rectangle([16 - 1, 40 - 1, 16 + 664, 40 + 522], outline=P["focus"]); c.paste(o, (1040, 0))
d = ImageDraw.Draw(c); text(d, (16, 13), f"sheet [16, 40, 664, 522] pasted back from the ground's own pixels: {seam_diff} px differ")
text(d, (1056, 13), "the same, the sheet rect outlined 1 px outside (focus), for finding it")
out(c, "ground-sheet-seam", x4=False)

# 3. marks: the 16 species at 10 and 15 on libPanel, libQuiet and libGround, beside the placed mark-species-SNN-24x24
surf = [("libPanel", P["libPanel"]), ("libQuiet", P["libQuiet"]), ("libGround", P["libGround"])]
RH = 30; c = Image.new("RGB", (40 + 3 * 52 + 8 + 40, 22 + 16 * RH + 6), P["libWell"]); d = ImageDraw.Draw(c)
for k, (n, col) in enumerate(surf): text(d, (40 + k * 52 + 2, 4), n, f=FONT_S)
text(d, (40 + 3 * 52 + 8, 4), "24", f=FONT_S)
placed = {}
for r in range(16):
    sid = f"S{r + 1:02d}"; y = 22 + r * RH
    text(d, (6, y + 8), sid, f=FONT_S)
    for k, (n, col) in enumerate(surf):
        x = 40 + k * 52; d.rectangle([x, y, x + 47, y + RH - 3], fill=col)
        m10, m15 = sl(f"species-mark-{sid}-10"), sl(f"species-mark-{sid}-15")
        c.paste(m10, (x + 6, y + 8), m10); c.paste(m15, (x + 24, y + 6), m15)
    im24, h24 = sg_image(f"prototypes/ui/assets/masters/pods/mark-species-{sid}-24x24.png"); im24 = im24.convert("RGBA"); placed[sid] = h24
    x = 40 + 3 * 52 + 8; d.rectangle([x - 2, y - 1, x + 25, y + 26], fill=P["libPanel"]); c.paste(im24, (x, y), im24)
out(c, "marks")

# 4. seed: four unmet wells (152 x 152, kit_bezel radius 6, fill libWell, bevel void, lip libPanel) with the seed at (64, 64), on the ground;
#    beside them the approved render's unmet cell (render cell 4: 520, 56)
seed = sl("library-seed-24x24", "RGB")
W4 = 16 + 4 * 168 + 152 + 16
c = Image.new("RGB", (W4, 152 + 40 + 20), P["libGround"]); c.paste(g.crop((0, 0, W4 - 168, 152 + 40)), (0, 20))
d = ImageDraw.Draw(c)
for k in range(4):
    x, y = 16 + 168 * k, 36
    d.rounded_rectangle([x, y, x + 151, y + 151], radius=6, fill=P["libWell"], outline=P["void"])   # bevel void
    d.line([x + 6, y + 152, x + 145, y + 152], fill=P["libPanel"])                                    # lip: 1 px libPanel hairline at the foot
    c.paste(seed, (x + 64, y + 64))
xr = 16 + 168 * 4; c.paste(ren.crop((520, 56, 672, 208)), (xr, 36))
text(d, (16, 3), "library-seed-24x24 at (64, 64) of four unmet wells", f=FONT_S); text(d, (xr, 3), "render v5, unmet cell (520, 56)", f=FONT_S)
out(c, "seed")

# 5. wish: the shelf wish row stand-in on libPanel, screen x 780-850, y 74-206: four discs at (800, 94 + 24k) with the star at (810, 88 + 24k)
star = sl("wish-mark-12"); ring = sl("look-disc-open-16")
X0, Y0 = 780, 74
c = Image.new("RGB", (90, 146), P["libPanel"]); d = ImageDraw.Draw(c)
kinds = [("dark", P["soil"], None), ("light", P["bone"], None), ("two-colour", P["clay"], P["river"]), ("open", None, None)]
for k, (n, f1, f2) in enumerate(kinds):
    dx, dy = 800 - X0, 94 + 24 * k - Y0
    if f1: disc(d, dx, dy, f1, f2)
    else: c.paste(ring, (dx, dy), ring)
    c.paste(star, (810 - X0, 88 + 24 * k - Y0), star)
    text(d, (dx + 26, dy + 1), n, f=FONT_S)
out(c, "wish")

# 6. sitting: nine at a 20 px pitch on libPanel, beside sitting-frame-held-48x40 and berth-portrait-held-18x24 (its window)
sit = sl("library-sitting-16x12", "RGB")
held, hh = sg_image("prototypes/ui/assets/masters/pods/sitting-frame-held-48x40.png"); held = held.convert("RGBA")
bp, bh = sg_image("prototypes/ui/assets/masters/home/berth-portrait-18x24.png"); bpa = np.array(bp.convert("RGBA"))
for yy in range(5, 19):          # the art director's rule (ad-berth-curl 1a): sand and clay inside local 5-12 x 5-18 become ground
    for xx in range(5, 13):
        if tuple(bpa[yy, xx, :3]) in (P["sand"], P["clay"]): bpa[yy, xx, :3] = P["ground"]
bph = Image.fromarray(bpa, "RGBA")
ad_proof = os.path.join(IWQ, "results/T-20261023-post-library/ad-berth/proof-berth-portrait-held-18x24.png")
bph_equals_ad = bool((np.asarray(Image.open(ad_proof).convert("RGBA")) == bpa).all())
c = Image.new("RGB", (16 + 176 + 24 + 48 + 16 + 18 + 16, 80), P["libPanel"]); d = ImageDraw.Draw(c)
for k in range(9): c.paste(sit, (16 + 20 * k, 40))
c.paste(held, (16 + 176 + 24, 26), held); c.paste(bph, (16 + 176 + 24 + 48 + 16, 34), bph)
text(d, (16, 6), "9 x library-sitting-16x12, pitch 20", f=FONT_S); text(d, (16 + 176 + 24, 6), "held 48x40, berth held", f=FONT_S)
out(c, "sitting")

# 7. ring: M6 on libPanel beside a 16 px found disc
c = Image.new("RGB", (72, 40), P["libPanel"]); d = ImageDraw.Draw(c)
c.paste(ring, (14, 12), ring); disc(d, 42, 12, P["clay"])
out(c, "ring")

measures_update("proofs", {"files": made, "ground_sheet_seam_px_differ": seam_diff,
    "render": "iwq results/T-20261017-library/art/library-all-v5.png", "render_sha256": sha(open(RENDER, "rb").read()),
    "placed_marks_sha256": placed, "sitting_frame_held_48x40_sha256": hh, "berth_portrait_18x24_sha256": bh,
    "berth_portrait_held_18x24": "derived in the proof by the art director's rule (ad-berth-curl 1a) from berth-portrait-18x24; equals the art director's review proof ad-berth/proof-berth-portrait-held-18x24.png: " + str(bph_equals_ad)})
print(made, seam_diff, bph_equals_ad)
