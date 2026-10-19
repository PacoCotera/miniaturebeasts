"""The console's two new pictures for Home (build spec §9), drawn by code in
the Station palette, palette-exact, no anti-aliasing.

  companion-upright-{docked,away}-28x46   the Companion station
  berth-{shut,crate,portrait}-*x24        the Bay station

The Companion follows the house mark (frame-companion-*-16x24 and
mark-out-with-companion-64x96): upright, screen at the top, d-pad and two
buttons on the grip, the knob on the left side. Docked it stands solid in
its cradle with the screen lit; away, the cradle is empty and the device is
the mark's line drawing in mist, as the out-with-companion mark draws it.

The berths follow the Cargo room's masters: the shut berth is the sage
slatted shutter (berth-shut), the waiting berth is the open recess
(berth-recess) holding a sealed crate with the amber underline, and the
portrait berth is the narrower gilt frame (berth-gilt), 18 wide, as the
room's portrait berth is narrower than a crate berth.

    python3 make-console-pictures.py <station.json> <out dir>
"""
import json
import sys
from pathlib import Path

from PIL import Image

PAL = dict(json.loads(Path(sys.argv[1]).read_text())["colours"])
OUT = Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)


def c(name):
    h = PAL[name]
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) + (255,)


class Pic:
    def __init__(self, w, h):
        self.im = Image.new("RGBA", (w, h), (0, 0, 0, 0))

    def px(self, x, y, name):
        self.im.putpixel((x, y), c(name))

    def rect(self, x0, y0, x1, y1, name):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.px(x, y, name)

    def hline(self, x0, x1, y, name):
        self.rect(x0, y, x1, y, name)

    def vline(self, x, y0, y1, name):
        self.rect(x, y0, x, y1, name)

    def box(self, x0, y0, x1, y1, name, cut=1):
        """A 1 px outline with corners cut by `cut` pixels (a round at this size)."""
        self.hline(x0 + cut, x1 - cut, y0, name)
        self.hline(x0 + cut, x1 - cut, y1, name)
        self.vline(x0, y0 + cut, y1 - cut, name)
        self.vline(x1, y0 + cut, y1 - cut, name)
        if cut == 2:
            for x, y in ((x0 + 1, y0 + 1), (x1 - 1, y0 + 1), (x0 + 1, y1 - 1), (x1 - 1, y1 - 1)):
                self.px(x, y, name)

    def save(self, name):
        self.im.save(OUT / f"{name}-{self.im.width}x{self.im.height}.png")
        return self.im


# ---- the Companion, 28 x 46 -------------------------------------------------
# Body x 4..25, y 0..41; cradle rows 42..45; knob on the left at x 2..3.
BX0, BX1, BY0, BY1 = 4, 25, 0, 41
SX0, SX1, SY0, SY1 = 7, 22, 4, 22          # screen bezel
DX, DY = 10, 30                             # d-pad centre
BUTTONS = ((17, 30), (20, 29))              # top-left pixel of each 2 x 2 button


def cradle(p, top, base):
    p.hline(1, 26, 42, top)
    p.hline(2, 25, 43, base)
    p.hline(3, 24, 44, base)


def docked():
    p = Pic(28, 46)
    p.rect(BX0 + 1, BY0 + 1, BX1 - 1, BY1 - 1, "paper")
    p.hline(BX0 + 2, BX1 - 2, BY0 + 1, "bone")            # top light
    p.vline(BX0 + 1, BY0 + 2, BY1 - 2, "bone")            # left light
    p.vline(BX1 - 1, BY0 + 2, BY1 - 1, "sand")            # right shade
    p.hline(BX0 + 2, BX1 - 1, BY1 - 1, "sand")            # foot shade
    p.px(BX1 - 1, BY1 - 1, "clay")
    p.box(BX0, BY0, BX1, BY1, "ink", cut=2)
    # knob, left side
    p.rect(2, 10, 3, 15, "sand")
    p.vline(1, 11, 14, "ink")
    p.hline(2, 3, 9, "ink")
    p.hline(2, 3, 16, "ink")
    # screen: ink bezel, lit sage, one glint
    p.rect(SX0, SY0, SX1, SY1, "ink")
    p.rect(SX0 + 1, SY0 + 1, SX1 - 1, SY1 - 1, "sageD")
    p.hline(SX0 + 1, SX1 - 1, SY0 + 1, "sage")
    p.vline(SX0 + 1, SY0 + 2, SY1 - 1, "sage")
    for i in range(3):
        p.px(SX0 + 3 + i, SY0 + 5 - i, "sage")
    # d-pad and buttons
    p.hline(DX - 2, DX + 2, DY, "slate")
    p.vline(DX, DY - 2, DY + 2, "slate")
    for bx, by in BUTTONS:
        p.rect(bx, by, bx + 1, by + 1, "clay")
    # speaker slots
    for y in (36, 38):
        p.hline(17, 21, y, "sand")
    cradle(p, "bevel", "hairline")
    return p.save("companion-upright-docked")


def away():
    p = Pic(28, 46)
    ln = "mist"
    p.box(BX0, BY0, BX1, BY1, ln, cut=2)
    p.box(SX0, SY0, SX1, SY1, ln, cut=0)
    p.hline(DX - 2, DX + 2, DY, ln)
    p.vline(DX, DY - 2, DY + 2, ln)
    for bx, by in BUTTONS:
        p.px(bx, by + 1, ln)
        p.px(bx + 1, by, ln)
    p.vline(2, 11, 14, ln)
    p.px(3, 10, ln)
    p.px(3, 15, ln)
    # the empty cradle, then the mark's dotted ground under it
    p.hline(1, 26, 42, "bevel")
    for x in range(3, 25, 2):
        p.px(x, 44, "hairline")
    return p.save("companion-upright-away")


# ---- the berths, 26 x 24 (portrait 18 x 24) --------------------------------
def berth_frame(p, edge="hairline"):
    w, h = p.im.size
    p.box(0, 0, w - 1, h - 1, edge, cut=1)


def shut():
    p = Pic(26, 24)
    p.rect(1, 1, 24, 22, "sageD")
    p.rect(1, 1, 24, 2, "bar")                            # lintel
    y = 3
    while y + 2 <= 22:                                    # 3-row slats
        p.hline(1, 24, y, "sage")
        p.hline(1, 24, y + 1, "sageD")
        p.hline(1, 24, y + 2, "ground")
        y += 3
    p.hline(1, 24, 22, "sageD")
    berth_frame(p)
    return p.save("berth-shut")


def crate():
    p = Pic(26, 24)
    # the open recess: soil back, bark sill
    p.rect(1, 1, 24, 18, "soil")
    p.rect(1, 1, 24, 2, "ink")
    p.rect(1, 19, 24, 20, "bark")
    # the sealed crate, 20 x 13, sitting on the sill (rows 6..18)
    x0, y0, x1, y1 = 3, 6, 22, 18
    p.rect(x0 + 1, y0 + 1, x1 - 1, y1 - 1, "gold")
    p.hline(x0 + 2, x1 - 2, y0 + 1, "yellow")             # lid light
    p.hline(x0 + 1, x1 - 1, y0 + 5, "bark")               # lid seam
    p.hline(x0 + 2, x1 - 2, y0 + 6, "yellow")
    p.box(x0, y0, x1, y1, "ink", cut=1)
    for x in (x0 + 4, x1 - 4):                            # ribs
        p.vline(x, y0 + 1, y1 - 1, "bark")
    for x in (x0 + 2, x1 - 3):                            # latches
        p.rect(x, y0 + 4, x + 1, y0 + 6, "ink")
    p.hline(x0 + 7, x1 - 7, y0 + 9, "ink")                # handle
    p.px(x0 + 7, y0 + 8, "ink")
    p.px(x1 - 7, y0 + 8, "ink")
    p.rect(x0 + 8, y0 + 2, x1 - 8, y0 + 3, "bone")        # label plate
    # the amber underline: unopened
    p.rect(1, 21, 24, 22, "amber")
    berth_frame(p)
    return p.save("berth-crate")


def portrait():
    p = Pic(18, 24)
    w, h = 18, 24
    p.rect(1, 1, w - 2, h - 2, "gold")
    p.hline(2, w - 3, 1, "yellow")
    p.vline(1, 2, h - 3, "yellow")
    p.hline(2, w - 2, h - 2, "bark")
    p.vline(w - 2, 2, h - 2, "bark")
    p.box(0, 0, w - 1, h - 1, "ink", cut=1)
    # the mat and the covered portrait inside
    p.rect(3, 3, w - 4, h - 4, "soil")
    p.box(3, 3, w - 4, h - 4, "bark", cut=0)
    p.rect(5, 5, w - 6, h - 6, "clay")
    p.hline(5, w - 6, 5, "sand")
    p.vline(5, 6, h - 6, "sand")
    return p.save("berth-portrait")


if __name__ == "__main__":
    for make in (docked, away, shut, crate, portrait):
        make()
