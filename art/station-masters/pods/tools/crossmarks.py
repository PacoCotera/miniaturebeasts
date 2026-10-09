"""Pass 69: the hand-drawn masters of the Cross splice view (origin/design-cross-splice 782d619, prototypes/ui/specs/station/cross.json masters): typed pixel by pixel, no image generator, no API call, never scaled from another size.
Art layer: station.json colours only. One family with the signed line glyphs (mark-line-*): a lit rim top left, a shaded rim bottom right, a body one step darker than the rim, the neutral parts in bone / fog / mist / frostS.
  gates   16x16 and 8x8: pins in at the left, the way out at the right (the wires' rows: chapter view pins 4-5 and 12-13, out 7-8; overview pins 1-2 and 5-6, out 3-4); switch `lilac` (a mux: one of two copies passes), blend `aqua` (a disc: the two merge), settled `bevel`
  ticks   12x8 and 6x4: A's value above the track pointing down, B's below pointing up; `bone`
  wishes  12x12 and 8x8: a four-point glint: lit (yellow, cream core) or hollow (the same glint as an outline in mist; its outline is taken from the typed lit one)
  kin     10x10: the `amber` corner of a seed where a hidden look can surface, at its bottom right corner
  finds   16x16: the crystal, the pearl and the storm-glass shard of the signed 112x112 finds, drawn again at this size
python3 -I tools/crossmarks.py -> slices/cross-*.png and slices/find-*-16x16.png, marks/cross-marks-proof-1x.png and -4x.png"""
import os, json, hashlib
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
pal = {n: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for n, h in json.load(open("../../../prototypes/ui/palettes/station.json"))["colours"]}
def spr(rows, w, h, leg, name):
    assert len(rows) == h, (name, len(rows)); im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    for y, r in enumerate(rows):
        assert len(r) == w, (name, y, len(r), r)
        for x, ch in enumerate(r):
            if ch != ".": im.putpixel((x, y), pal[leg[ch]] + (255,))
    return im
LILAC = {"L": "lilac", "l": "lavender", "p": "plum"}; SETTLED_S = {"L": "bevel", "l": "enamel", "p": "hairline"}
AQUA = {"A": "aqua", "a": "mint", "t": "teal", "d": "tealD"}; SETTLED_B = {"A": "bevel", "a": "enamel", "t": "hairline", "d": "panel"}
# pass 70: the 16x16 gates are filled with the kind's colour (a 1 px outline round a near-black fill showed only the outline at 1x); one detail each: the switch's two pins in and one out, the blend's plus
SWITCH16 = ["................",
            "...lll..........",
            "...lLLll........",
            "...lLLLLll......",
            "LLLlLLLLLLll....",
            "LLLlLLLLLLLLp...",
            "...lLLLLLLLLp...",
            "...lLLLLLLLLpLLL",
            "...lLLLLLLLLpLLL",
            "...lLLLLLLLLp...",
            "...lLLLLLLLLp...",
            "...lLLLLLLpp....",
            "LLLlLLLLpp......",
            "LLLlpppp........",
            "...lpp..........",
            "................"]
BLEND16 = ["................",
           "................",
           "................",
           ".....aaaatt.....",
           "AAAAaAAAAAAt....",
           "AAAaAAAddAAAt...",
           "...aAAAddAAAt...",
           "...aAddddddAtAAA",
           "...aAddddddAtAAA",
           "...aAAAddAAAt...",
           "...aAAAddAAAt...",
           "....aAAAAAAt....",
           "AAAAAtttttt.....",
           "AAAAA...........",
           "................",
           "................"]
# the 8x8 gates are plain filled shapes (on 10 to 16 px rows the shape is the only mark of the splice): a solid lilac triangle pointing right, 7 wide and 8 tall, the wide end toward the parent; a solid aqua 8x8 disc, no plus
SWITCH8 = ["LL......",
           "LLLL....",
           "LLLLLL..",
           "LLLLLLL.",
           "LLLLLLL.",
           "LLLLLL..",
           "LLLL....",
           "LL......"]
BLEND8 = ["..AAAA..",
          ".AAAAAA.",
          "AAAAAAAA",
          "AAAAAAAA",
          "AAAAAAAA",
          "AAAAAAAA",
          ".AAAAAA.",
          "..AAAA.."]
BONE = {"w": "white", "b": "bone", "f": "fog"}
TICK_A12 = ["wwwwwwwwwwwf", ".bbbbbbbbbf.", "..bbbbbbbf..", "...bbbbbf...", "....bbbf....", ".....bf.....", ".....bf.....", ".....bf....."]
TICK_B12 = [".....wb.....", ".....wb.....", ".....wb.....", "....wbbf....", "...wbbbbf...", "..wbbbbbbf..", ".wbbbbbbbbf.", "wfffffffffff"]
TICK_A6 = ["wbbbbf", ".bbbf.", "..bf..", "..bf.."]
TICK_B6 = ["..wb..", "..wb..", ".wbbf.", "wfffff"]
WISH = {"y": "yellow", "c": "cream", "a": "amber", "w": "white"}
WISH_LIT12 = [".....cy.....",
              ".....cy.....",
              ".....cy.....",
              "....ycca....",
              "....yccca...",
              "yyyyccwccyyy".replace("yyyyccwccyyy", "yyyyccccyyya"),
              "yyyyccccyyya",
              "....ycccaa..",
              "....yccaa...",
              ".....caa....",
              ".....caa....",
              ".....aa....."]
WISH_LIT8 = ["...cy...",
             "...cy...",
             ".yccya..",
             "yyccyyya",
             ".yccaa..",
             "...ca...",
             "...ca...",
             "...aa..."]
KIN = {"i": "ink", "y": "yellow", "a": "amber", "r": "rust"}
KIN10 = [".........i",
         "........iy",
         ".......iya",
         "......iyaa",
         ".....iyaaa",
         "....iyaaaa",
         "...iyaaaar",
         "..iyaaaaar",
         ".iyaaaaaar",
         "iyrrrrrrrr"]
def outline(im, color):
    """The hollow glint: the pixels of the typed lit one that touch the ground (4-neighbourhood) or the cell's edge, in one colour."""
    w, h = im.size; out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    for y in range(h):
        for x in range(w):
            if im.getpixel((x, y))[3] == 0: continue
            if any(not (0 <= x + dx < w and 0 <= y + dy < h) or im.getpixel((x + dx, y + dy))[3] == 0 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))): out.putpixel((x, y), pal[color] + (255,))
    return out
FINDS = {}
FINDS["crystal"] = (["................",
                     "......ll........",
                     ".....lwwL.......",
                     ".....lwLLp..lL..",
                     ".....lwLLp.lwLL.",
                     "....lwwLLp.lwLLp",
                     "....lwLLLp.lwLLp",
                     "....lwLLLpplLLLp",
                     "....lLLLLppLLLpp",
                     "....lLLLppLLLpp.",
                     "..kkkLLppppppkkk",
                     ".kskskkkkkkkksks",
                     ".ssssksksskssss.",
                     "..sssssssssss...",
                     "................",
                     "................"], {"l": "lavender", "w": "white", "L": "lilac", "p": "plum", "k": "bark", "s": "soil"})
FINDS["pearl"] = (["................",
                   "....ffffffff....",
                   "..ffSSfSSfSSff..",
                   ".fSfSSfSSfSSfSf.",
                   ".fSfSSfSSfSSfSf.",
                   "fSSfSSfSSfSSfSSf",
                   ".ffffffffffffff.",
                   ".ssssswbbssssss.",
                   ".ssssbbbbbsssss.",
                   ".ssssbbbbfsssss.",
                   "..fffbbbffffff..",
                   "...SSSfffSSSS...",
                   "....SSSSSSSS....",
                   ".....ffffff.....",
                   "................",
                   "................"], {"f": "fog", "S": "frostS", "s": "stone", "w": "white", "b": "bone"})
FINDS["shard"] = (["..........f.....",
                   ".........fwm....",
                   ".........fwm....",
                   "........fwSSm...",
                   ".......fwwSSm...",
                   ".......fwwSm....",
                   "......fwwSSm....",
                   "......fwwSSSm...",
                   ".....fwwSSSSm...",
                   ".....fwSSSSSm...",
                   "....fwSSSSSSm...",
                   "....fSSSSSSSm...",
                   ".....kkkkkkk....",
                   "...kkokkkkokkk..",
                   "..ooooooooooooo.",
                   "................"], {"f": "fog", "w": "white", "S": "frostS", "m": "mist", "k": "bark", "o": "soil"})
NAMES = {}
def add(name, im): NAMES[name] = im
add("cross-gate-switch-16x16", spr(SWITCH16, 16, 16, LILAC, "sw16")); add("cross-gate-switch-16x16-settled", spr(SWITCH16, 16, 16, SETTLED_S, "sw16s"))
add("cross-gate-blend-16x16", spr(BLEND16, 16, 16, AQUA, "bl16")); add("cross-gate-blend-16x16-settled", spr(BLEND16, 16, 16, SETTLED_B, "bl16s"))
add("cross-gate-switch-8x8", spr(SWITCH8, 8, 8, LILAC, "sw8")); add("cross-gate-blend-8x8", spr(BLEND8, 8, 8, AQUA, "bl8"))
add("cross-tick-a-12x8", spr(TICK_A12, 12, 8, BONE, "ta12")); add("cross-tick-b-12x8", spr(TICK_B12, 12, 8, BONE, "tb12")); add("cross-tick-a-6x4", spr(TICK_A6, 6, 4, BONE, "ta6")); add("cross-tick-b-6x4", spr(TICK_B6, 6, 4, BONE, "tb6"))
lit12 = spr(WISH_LIT12, 12, 12, WISH, "wl12"); lit8 = spr(WISH_LIT8, 8, 8, WISH, "wl8")
add("cross-wish-lit-12x12", lit12); add("cross-wish-hollow-12x12", outline(lit12, "mist")); add("cross-wish-lit-8x8", lit8); add("cross-wish-hollow-8x8", outline(lit8, "mist"))
add("cross-kin-surface-10x10", spr(KIN10, 10, 10, KIN, "kin"))
for k, (rows, leg) in FINDS.items(): add(f"find-{k}-16x16", spr(rows, 16, 16, leg, k))
MADE = {"cross-gate-switch-16x16": "the Cross chapter view's switch gate (pass 70): a mux, a trapezoid filled solid lilac with a lavender lit rim and a plum shade, its one detail the pins: two in at rows 4-5 and 12-13, one out at rows 7-8",
        "cross-gate-switch-16x16-settled": "the same shape in bevel (enamel lit rim, hairline shade), for a trait that is one look or missing",
        "cross-gate-blend-16x16": "the Cross chapter view's blend gate (pass 70): a disc filled solid aqua with a mint lit rim and a teal shade, its one detail a plus in tealD, the pins in and the way out as stubs",
        "cross-gate-blend-16x16-settled": "the same shape in bevel", "cross-gate-switch-8x8": "the overview's switch gate (pass 70): a plain solid lilac triangle pointing right, 7 wide and 8 tall, the wide end toward the parent", "cross-gate-blend-8x8": "the overview's blend gate (pass 70): a plain solid aqua 8x8 disc, no plus",
        "cross-tick-a-12x8": "parent A's value above the track: a bone pointer pointing down, a white lit top, a fog shade", "cross-tick-b-12x8": "parent B's value below the track: a bone pointer pointing up, a white lit left edge, a fog base",
        "cross-tick-a-6x4": "the overview's A tick, 6x4", "cross-tick-b-6x4": "the overview's B tick, 6x4",
        "cross-wish-lit-12x12": "a pinned trait a child can reach: a four-point glint in yellow with a cream core and an amber shade (also the rail's glint on Cross)", "cross-wish-hollow-12x12": "a pinned trait no child of this pair can reach: the lit glint's outline in mist, empty inside",
        "cross-wish-lit-8x8": "the overview's lit wish, 8x8", "cross-wish-hollow-8x8": "the overview's hollow wish, 8x8", "cross-kin-surface-10x10": "the amber corner of a seed where a hidden look can surface: a right-triangle at the bottom right, an ink keyline on its slope, a yellow lit edge, amber body, rust outer edges",
        "find-crystal-16x16": "the vybronic crystal of the signed 112x112 find, drawn again at 16 px: two lavender and lilac shards on dark earth", "find-pearl-16x16": "the tide pearl, drawn again at 16 px (pass 71): an open shell: a ribbed fan for the upper valve tipped back (frostS with fog ribs), a shallow dish for the lower, and a bright 5x5 bone pearl with one white highlight sitting proud on the dish's rim",
        "find-shard-16x16": "the storm-glass shard, drawn again at 16 px (pass 71): a jagged frostS shard, its point tilted 2 px right of the mound's centre, one flat white facet on its left, a notch in its right side, a mist shade, on a mound of dark earth"}
man = json.load(open("slices/manifest.json"))
for name, im in NAMES.items():
    im.save(f"slices/{name}.png", optimize=True)
    man[name] = {"size": list(im.size), "rect": None, "src": "typed by hand", "made": MADE.get(name, name) + "; typed pixel by pixel at this size (pass 69), never scaled; art layer, station.json colours only", "sha256": hashlib.sha256(open(f"slices/{name}.png", "rb").read()).hexdigest()}
json.dump(man, open("slices/manifest.json", "w"), indent=1)
# proof: each at 1x on the Cross's ground (the bench ground #162a37) beside 16 px Inter, and 4x
GROUND = pal["ground"]; f16 = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-Regular.otf", 16); f12 = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-Regular.otf", 12)
order = list(NAMES); W = 720; H = 40 + 28 * len(order) // 2 + 120
sheet = Image.new("RGBA", (W, H), GROUND + (255,)); d = ImageDraw.Draw(sheet)
for i, n in enumerate(order):
    col, row = i % 2, i // 2; x = 12 + col * 360; y = 8 + row * 28; im = NAMES[n]; sheet.alpha_composite(im, (x, y + (24 - im.height) // 2)); d.text((x + 36, y + 12), n.replace("cross-", ""), font=f12, fill=(141, 138, 166, 255), anchor="lm")
y0 = 8 + ((len(order) + 1) // 2) * 28 + 8; d.text((12, y0 + 10), "Roundness", font=f16, fill=pal["bone"] + (255,), anchor="lm"); x = 12 + d.textlength("Roundness", font=f16) + 6
for n in ("cross-wish-lit-12x12", "cross-gate-switch-16x16", "cross-gate-blend-16x16", "cross-tick-a-12x8", "cross-tick-b-12x8", "cross-kin-surface-10x10", "find-crystal-16x16", "find-pearl-16x16", "find-shard-16x16"): im = NAMES[n]; sheet.alpha_composite(im, (int(x), y0 + (20 - im.height) // 2)); x += im.width + 8
sheet = sheet.crop((0, 0, W, y0 + 24)); os.makedirs("marks", exist_ok=True); sheet.convert("RGB").save("marks/cross-marks-proof-1x.png"); sheet.convert("RGB").resize((sheet.width * 4, sheet.height * 4), Image.NEAREST).save("marks/cross-marks-proof-4x.png"); print(len(NAMES), "masters")
