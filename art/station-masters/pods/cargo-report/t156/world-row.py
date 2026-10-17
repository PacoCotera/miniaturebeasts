# T-20261016-156: the world row drawn into the T-149 proof (exec'd by cargo-report/t149/proof.py with WORLD_HOOK): the sun mark and three
# event tiles at the spec's rects: a storm over the rock field with the partner's face (Phase moved), a mibi grown now able to lead (the
# partner ring, 2 px teal), fruit on 3 bushes in the wood. Stand-ins: the tiles' faint panel (the build's), the who faces (face-*-24 reduced
# from the dock's faces, centred in 32: the 32 px faces are the build's).
yw = Y + 136; TEAL = (0x1f, 0x9d, 0x8f)
f.alpha_composite(Lo(os.path.join(sl, "frame-sun-16.png")), (X + 16, yw + 12))
def tile(k, place, marks, who=None, ring=False):
    tx = X + 40 + 168 * k; d = ImageDraw.Draw(f); d.rounded_rectangle([tx, yw, tx + 151, yw + 39], radius=6, outline=(48, 54, 62), width=1)
    if place: f.alpha_composite(S(place), (tx + 4, yw + 4))
    for i, mk in enumerate(marks): f.alpha_composite(S(mk), (tx + 40 + 20 * i, yw + 8))
    if who:
        fc = Lo(os.path.join(sl, who + ".png")); f.alpha_composite(fc, (tx + 68 + 4, yw + 4 + 4))
        if ring: d = ImageDraw.Draw(f); d.ellipse([tx + 68, yw + 4, tx + 68 + 31, yw + 4 + 31], outline=TEAL, width=2)
tile(0, "place-rock-32x32", ["world-mark-bolt-24x24"], who="face-S03-24")
tile(1, None, ["world-mark-sprout-24x24"], who="face-S01-24", ring=True)
tile(2, "place-wood-32x32", ["world-mark-fruit-24x24"] * 3)
