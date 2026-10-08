"""The pawn studies sheet: Pawn A to H, each the down walk frame and the right walk frame on a meadow green, at 3x and at 1x, with the study's name, its one-line
art director's critique and the two picks marked. Writes work/pawn-studies-3x.png and work/pawn-studies-1x.png (and the round 6 pawn for reference as 'R6').
usage: python3 -I pawn-studies-sheet.py WORK_DIR"""
import os, sys
from PIL import Image, ImageDraw, ImageFont
work = sys.argv[1]; d_ = os.path.join(work, "pawn-studies")
try: f = ImageFont.load_default(size=13); fb = ImageFont.load_default(size=15); fs = ImageFont.load_default(size=11)
except TypeError: f = fb = fs = ImageFont.load_default()
INFO = {
 "R6": ("Round 6 (reference)", "The owner: too much face, the goggles look floating, the band is too thick, the sideways face looks weird."),
 "A": ("A: deep small face, brow goggles", "Pick 1. The face is a third smaller and sits deep behind a dark rim of hood, so it is hood first; the goggles are anchored (a 1 px strap runs through both lenses), and from the side the brim comes down over the brow with the eye and the nose inside the fur."),
 "B": ("B: face in shadow", "The least face: two eyes and a nose lit in the dark of the hood; it reads as a hooded watcher, close to the dark opening the owner turned down in round 5. Not picked."),
 "C": ("C: goggles over the eyes", "Pick 2. No eyes to get wrong: the lenses are the face, a nose and cheeks below, the strap runs back round the hood; nothing floats, it reads as an aviator in a parka and the side view is the cleanest of the set."),
 "D": ("D: fur collar, no ring", "No ring round the face; the fur is a collar at the neck. It removes the ring the owner found heavy, but the collar reads as a scarf and the face gets no frame. Not picked."),
 "E": ("E: quarter-turned face", "The face is turned to the right (a near eye, a far eye, the nose off-centre): it gives the front view life, but every facing and cycle would need its own turn, and the far eye is one pixel from the edge. Not picked."),
 "F": ("F: thin ring, brow goggles", "Round 6 cut down: a 1 px fur ring with breaks, a 1 px strap through the lenses; the face is still the biggest of the drawn set, so A does the same job better."),
 "G": ("G: Retro Diffusion, brow goggles", "A parka with a small face, goggles on the brow and a fur ring, drawn by the service from round 6's frames; the fur reads as a beard and the side face has a long nose: not a clean read."),
 "H": ("H: Retro Diffusion, shadow", "A faceplate look (a pale rim round a dark opening), more astronaut than parka; the side view has a good gold-trimmed hood but a grey face and a different scale."),
}
PICKS = {"A": 1, "C": 2}
def tile(path, bg):
    im = Image.open(path).convert("RGBA"); t = Image.new("RGBA", (48, 48), bg + (255,)); t.alpha_composite(im); return t.convert("RGB")
order = ["R6", "A", "B", "C", "D", "E", "F", "G", "H"]
for sc, name in ((3, "pawn-studies-3x.png"), (1, "pawn-studies-1x.png")):
    cols = 3; cw = 2 * 48 * sc + 24; rh = 48 * sc + (96 if sc == 3 else 70); rows = (len(order) + cols - 1) // cols
    W = Image.new("RGB", (cols * cw + 10, rows * rh + 10), (40, 36, 50)); d = ImageDraw.Draw(W)
    for i, k in enumerate(order):
        cx, cy = 10 + (i % cols) * cw, 10 + (i // cols) * rh; title, crit = INFO[k]
        a = os.path.join(work, "pawn", "pawn-down-walk2.png") if k == "R6" else os.path.join(d_, f"pawn-{k}-down.png")
        b = os.path.join(work, "round6", "work", "pawn", "pawn-right-walk1.png") if k == "R6" else os.path.join(d_, f"pawn-{k}-side.png")
        if k == "R6": a = os.path.join(work, "..", "round6", "work", "pawn", "pawn-down-walk2.png"); b = os.path.join(work, "..", "round6", "work", "pawn", "pawn-right-walk1.png")
        W.paste(tile(a, (92, 187, 76)), (cx, cy)) if False else None
        for j, pth in enumerate((a, b)):
            t = tile(pth, (92, 187, 76)).resize((48 * sc, 48 * sc), Image.NEAREST); W.paste(t, (cx + j * (48 * sc + 4), cy))
        mark = f"  *PICK {PICKS[k]}*" if k in PICKS else ""
        d.text((cx, cy + 48 * sc + 3), title + mark, fill=(255, 240, 200) if k in PICKS else (220, 216, 234), font=fb if sc == 3 else f)
        if sc == 3:
            words = crit.split(); line = ""; y = cy + 48 * sc + 22
            for w_ in words:
                if d.textlength(line + " " + w_, font=fs) > 2 * 48 * sc + 8: d.text((cx, y), line.strip(), fill=(200, 196, 214), font=fs); y += 13; line = w_
                else: line += " " + w_
            d.text((cx, y), line.strip(), fill=(200, 196, 214), font=fs)
    W.save(os.path.join(work, name)); print("wrote", name, W.size)
