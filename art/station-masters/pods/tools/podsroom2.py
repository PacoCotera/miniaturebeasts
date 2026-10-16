"""Pass 93 (second tool): the wells and the column of the Pods room set, cut at size from ONE sheet painting, source/raw/pods-room-sheet.jpg (gemini-3-pro-image, 16:9, 1376x768; nine pieces laid out on the layout guide source/work/guides/sheet-guide.png, which the model followed closely):
  ring-well-{idle,selected,empty}-80x80   round, RGBA (a circular alpha): idle the empty rubber-edged recess, selected the same well with its rim catching more warm light (the focus ring is composed in code over it), empty the unused well with its rubber plug
  ring-hatch-80x56                        RGBA, rounded-rectangle alpha (radius 4): the closed gasketed service hatch
  ring-kin-56x56                          RGBA, round: the small fitted recess
  ring-collection-{idle,closed}-176x176   RGBA, round: the open ring recess at rest, and the same ring closed by its worn rubber cover
  ring-column-112x522                     opaque: a strip of the housing (two rows of screws, a hose clip, a vent)
Each is cropped round its piece's circle (or box) on the sheet and reduced with Lanczos to its size (never enlarged), the alpha a hard-edged circle (or rounded rectangle) feathered 1 px. The chapter arcs stay as they are and sit on top.
Also the composites of the three states at 1024x600 (the stage at (0, 40), the existing frame bars `frame-top-bar-1024x40` and `frame-bottom-line-1024x38`) beside the board's frame 2, and the contact sheet at 1x.
python3 -I tools/podsroom2.py -> slices/ring-well-*.png, ring-hatch-80x56.png, ring-kin-56x56.png, ring-collection-{idle,closed}-176x176.png, ring-column-112x522.png, marks/pods-room-composites-1x.png, marks/pods-room-sheet-1x.png"""
import os, json, hashlib
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
pal = {n: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for n, h in json.load(open("../../../prototypes/ui/palettes/station.json"))["colours"]}
sh = Image.open("source/raw/pods-room-sheet.jpg").convert("RGB")
def disc(cx, cy, r, size):
    box = (cx - r, cy - r, cx + r, cy + r); im = sh.crop(box).resize((size, size), Image.LANCZOS); m = Image.new("L", (size * 4, size * 4), 0); ImageDraw.Draw(m).ellipse([0, 0, size * 4 - 1, size * 4 - 1], fill=255); m = m.resize((size, size), Image.LANCZOS)
    out = im.convert("RGBA"); out.putalpha(m); return out
def rrect(box, w, h, rad):
    im = sh.crop(box).resize((w, h), Image.LANCZOS); m = Image.new("L", (w * 4, h * 4), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, w * 4 - 1, h * 4 - 1], radius=rad * 4, fill=255); m = m.resize((w, h), Image.LANCZOS)
    out = im.convert("RGBA"); out.putalpha(m); return out
pieces = {"ring-well-idle-80x80": (disc(150, 150, 92, 80), "(150, 150) r 92"), "ring-well-selected-80x80": (disc(360, 150, 92, 80), "(360, 150) r 92"), "ring-well-empty-80x80": (disc(570, 150, 92, 80), "(570, 150) r 92"),
          "ring-hatch-80x56": (rrect((688, 71, 912, 229), 80, 56, 4), "box (688, 71, 912, 229)"), "ring-kin-56x56": (disc(1010, 150, 78, 56), "(1010, 150) r 78"),
          "ring-collection-idle-176x176": (disc(200, 500, 168, 176), "(200, 500) r 168"), "ring-collection-closed-176x176": (disc(560, 500, 168, 176), "(560, 500) r 168"),
          "ring-column-112x522": (sh.crop((1223, 68, 1358, 698)).resize((112, 522), Image.LANCZOS), "box (1223, 68, 1358, 698), opaque")}
man = json.load(open("slices/manifest.json"))
WHAT = {"ring-well-idle-80x80": "the well at rest: a matte rubber-edged circular recess in the case, empty", "ring-well-selected-80x80": "the same well with its rubber rim catching more warm light (the focus ring is composed in code over it)", "ring-well-empty-80x80": "the unused well: a smooth rubber plug seated nearly flush",
        "ring-hatch-80x56": "the closed gasketed service hatch in the housing's sage", "ring-kin-56x56": "the small fitted round recess", "ring-collection-idle-176x176": "the open ring recess at rest (the arcs sit on top)", "ring-collection-closed-176x176": "the ring closed by its worn rubber cover", "ring-column-112x522": "a strip of the housing: two rows of screws, a hose clip and a small vent"}
for n, (im, where) in pieces.items():
    im.save(f"slices/{n}.png", optimize=True)
    man[n] = {"size": list(im.size), "rect": man.get(n, {}).get("rect"), "src": "source/raw/pods-room-sheet.jpg (gemini-3-pro-image), " + where, "made": f"the Pods room set (pass 93): {WHAT[n]}; one sheet painting cut at size, reduced with Lanczos, never enlarged" + ("" if im.mode == "RGB" else ", a hard-edged alpha feathered 1 px"),
                     "sha256": hashlib.sha256(open(f"slices/{n}.png", "rb").read()).hexdigest()}
json.dump(man, open("slices/manifest.json", "w"), indent=1)
# composites at 1024x600 and the contact sheet
def comp(stage):
    cv = Image.new("RGBA", (1024, 600), pal["ground"] + (255,)); cv.alpha_composite(Image.open(f"slices/{stage}.png").convert("RGBA"), (0, 40)); cv.alpha_composite(Image.open("slices/frame-bottom-line-1024x38.png").convert("RGBA"), (0, 562)); cv.alpha_composite(Image.open("slices/frame-top-bar-1024x40.png").convert("RGBA"), (0, 0)); return cv.convert("RGB")
board = Image.open("concepts/station-board/frame-2-pods-v2-1024x600.png").convert("RGB")
cs = Image.new("RGB", (1024 * 2 + 12, 600 * 2 + 12), (10, 14, 18))
for i, im in enumerate((board, comp("room-bench-stage-overview"), comp("room-bench-stage-chapter"), comp("room-bench-stage-collection"))): cs.paste(im, ((i % 2) * 1036, (i // 2) * 612))
cs.save("marks/pods-room-composites-1x.png")
sheet = Image.new("RGB", (1100, 640), (10, 14, 18)); x = 8; y = 8
for n in ("ring-well-idle-80x80", "ring-well-selected-80x80", "ring-well-empty-80x80", "ring-hatch-80x56", "ring-kin-56x56"):
    im = Image.open(f"slices/{n}.png").convert("RGBA"); sheet.paste(im, (x, y), im); x += im.width + 16
x = 8; y = 120
for n in ("ring-collection-idle-176x176", "ring-collection-closed-176x176"): im = Image.open(f"slices/{n}.png").convert("RGBA"); sheet.paste(im, (x, y), im); x += 192
sheet.paste(Image.open("slices/ring-column-112x522.png"), (440, 100)); sheet.paste(Image.open("slices/room-cradle.png"), (580, 20)); sheet.paste(Image.open("slices/room-shelf.png"), (580, 140)); sheet.paste(Image.open("slices/room-stamp-case-152x152.png"), (900, 20))
sh2 = Image.open("slices/room-cradle-front.png").convert("RGBA"); bgc = Image.new("RGBA", sh2.size, pal["ground"] + (255,)); bgc.alpha_composite(sh2); sheet.paste(bgc.convert("RGB"), (580, 230)); sheet.paste(Image.open("slices/room-stamp-case-152x152-front.png").convert("RGBA"), (900, 190), Image.open("slices/room-stamp-case-152x152-front.png").convert("RGBA"))
sheet.save("marks/pods-room-sheet-1x.png")
