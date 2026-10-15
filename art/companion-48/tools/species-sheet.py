"""One review sheet for a species' tokens (C0): every piece at 8x on ink, and at 1x on a 48 px lawn tile beside the pawn (the 48 px pawn frame stands in for c-pawn-32).
usage: python3 -I species-sheet.py [--juv] SPECIES_DIR SPECIES OUT.png LAWN_TILE.png PAWN.png [FAMILY_IDLE.png ...]
(--juv: the juvenile set, c-token-S0n-juv-{idle,alert,huddle,eat-f0,eat-f1} and c-mini-S0n-juv; the family strip is then the signed adult idle beside the juvenile idle)
(the optional idles, S01's and the species' own, are shown side by side at 1x on the lawn so the species read as one family)"""
import os, sys
from PIL import Image, ImageDraw
juv = "--juv" in sys.argv; argv = [a for a in sys.argv if a != "--juv"]
d, sp, out, lawn, pawn = argv[1:6]; family = argv[6:]; J = "-juv" if juv else ""
names = (["idle", "alert", "huddle", "eat-f0", "eat-f1"] if juv else ["idle", "alert", "flee", "huddle", "shake-f0", "shake-f1", "eat-f0", "eat-f1"] + [n for n in ("settle", "curl") if os.path.exists(os.path.join(d, f"c-token-{sp}{J}-{n}-32x32.png"))])
pieces = [(n, Image.open(os.path.join(d, f"c-token-{sp}{J}-{n}-32x32.png")).convert("RGBA")) for n in names] + [("mini", Image.open(os.path.join(d, f"c-mini-{sp}{J}-12x12.png")).convert("RGBA"))]
INK = (26, 23, 37, 255); sc = 8; cell = 32 * sc; G = 8
tile = Image.open(lawn).convert("RGBA"); pw = Image.open(pawn).convert("RGBA")
W = 5 * (cell + G) + G; top = ((len(pieces) + 4) // 5) * (cell + 22) + G
S = Image.new("RGBA", (W, top + 3 * (48 + 4) + 40 + 22 + G + (48 + 36 if family else 0)), INK); dr = ImageDraw.Draw(S)
for i, (n, im) in enumerate(pieces):
    x = G + (i % 5) * (cell + G); y = G + (i // 5) * (cell + 22)
    S.alpha_composite(im.resize((im.width * sc, im.height * sc), Image.NEAREST), (x, y)); dr.text((x, y + cell + 4), f"{sp} {n} at 8x", fill=(220, 216, 234, 255))
y0 = top; dr.text((G, y0 - 2), "at 1x on a 48 px lawn tile beside the pawn (48 px frame as the c-pawn-32 stand-in)", fill=(220, 216, 234, 255)); y0 += 14
x = G
for n, im in pieces:
    t = tile.copy(); t2 = tile.copy()
    S.alpha_composite(t, (x, y0)); S.alpha_composite(t2, (x + 48, y0))
    S.alpha_composite(pw, (x - 6, y0))                                   # the pawn on the left tile
    fx = x + 48 + (48 - im.width) // 2; S.alpha_composite(im, (fx, y0 + 48 - 1 - (31 if im.width == 32 else 11) - (0 if im.width == 32 else 0)) if im.width == 32 else (fx, y0 + 40 - im.height + 6))
    x += 96 + G
    if x + 96 > W: x = G; y0 += 48 + 4
if family:                                                              # the family strip: the idles side by side at 1x, each on its own lawn tile
    y0 += 48 + 8; dr.text((G, y0), "the family at 1x: " + ", ".join((os.path.basename(f).split("-")[2] + (" juv" if "-juv-" in f else "")) for f in family), fill=(220, 216, 234, 255)); y0 += 14; x = G
    for f in family:
        im = Image.open(f).convert("RGBA"); t = tile.copy(); S.alpha_composite(t, (x, y0)); S.alpha_composite(im, (x + (48 - im.width) // 2, y0 + 40 - im.height + 6)); dr.text((x + 14, y0 + 49), os.path.basename(f).split('-')[2] + (' juv' if '-juv-' in f else ''), fill=(220, 216, 234, 255)); x += 48 + 4
S.convert("RGB").save(out); print("wrote", out, S.size)
