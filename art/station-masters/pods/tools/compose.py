"""The proof: the Pods Read screen at 1024x600 from the slices, decided strings typed over them in Inter. python3 -I tools/compose.py"""
import math
from PIL import Image, ImageDraw, ImageFont
FD = "/usr/share/fonts/opentype/inter/"
f16 = ImageFont.truetype(FD + "Inter-Regular.otf", 16); f20 = ImageFont.truetype(FD + "Inter-Medium.otf", 20); f28 = ImageFont.truetype(FD + "Inter-SemiBold.otf", 28)
def S(n): return Image.open(f"slices/{n}.png").convert("RGBA")
cand = Image.open("source/raw/ref-PV-D-r3-a4-1024x600.png").convert("RGBA")
cv = Image.new("RGBA", (1024, 600), (16, 26, 36, 255))
def put(n, x, y): cv.alpha_composite(S(n), (x, y))
CREAM = (241, 235, 223); FOG = (198, 196, 216); MIST = (141, 138, 166); AMBER = (255, 168, 63)
def text(xy, s, font, fill, anchor="la", shadow=True):
    d = ImageDraw.Draw(cv)
    if shadow: d.text((xy[0], xy[1] + 1), s, font=font, fill=(8, 12, 18, 255), anchor=anchor)
    d.text(xy, s, font=font, fill=fill, anchor=anchor)
put("room-bench-stage", 0, 40); put("ring-column", 0, 40)
# wells: current (identified, lit), identified, sealed, three empty
for i in range(6):
    put("ring-well-current" if i == 0 else "ring-well-empty", 40, 52 + 72 * i)
pods = {0: "pod-well-identified", 1: "pod-well-identified", 2: "pod-well-sealed"}
for i, n in pods.items(): put(n, 72 - 16, 84 + 72 * i - 20)
# the progress ring: arcs drawn by the build (a stand-in here, to show the track's room)
d = ImageDraw.Draw(cv)
for i, fills in ((0, (1, 1, 0, 0)), (1, (1, 0, 0, 0))):
    cx, cy = 72, 84 + 72 * i
    for k in range(4):
        a0 = -90 + k * 90 + 6; a1 = a0 + 78
        d.arc([cx - 31, cy - 31, cx + 31, cy + 31], a0, a1, fill=(69, 216, 190, 255) if fills[k] else (93, 89, 116, 255), width=3)
put("ring-hatch", 24, 488)
# rail: Coat focused (lifted 2), Face read, Movement unread, Stamina unread
words = ["Coat", "Face", "Movement", "Stamina"]; states = ["focused", "read", "unread", "unread"]
for i, (w, st) in enumerate(zip(words, states)):
    x = 176 + 120 * i; y = 48 - (2 if st == "focused" else 0)
    put(f"rail-tab-{st}-112x56", x, y)
    text((x + 56, y + 28 + 8), w, f16, CREAM if st != "unread" else (150, 168, 184), "mm")
    for p in range(3): d.rectangle([x + 41 + 10 * p, y + 48, x + 46 + 10 * p, y + 53], fill=(241, 235, 223, 255) if st == "read" or (st == "focused" and p < 2) else None, outline=(93, 89, 116, 255))
d.rounded_rectangle([176 - 4, 46 - 4, 176 + 112 + 3, 46 + 56 + 3], 6, outline=(255, 232, 190, 255), width=2)
# pod stage
put("room-shelf", 576, 392); put("room-cradle", 600, 352); put("pod-large-shadow", 712 - 88, 393); put("pod-large-identified", 632, 208); put("room-cradle-front", 600, 352)
put("plate-name-224x32", 600, 440); text((712, 456), "Loika pod", f28, CREAM, "mm")
put("plate-origin-224x40", 600, 480); text((712, 491), "rock field ·", f16, MIST, "mm"); text((712, 509), "a Tuikis felt safe", f16, MIST, "mm")
put("stamp-label-120x120", 888, 248); cv.alpha_composite(cand.crop((830, 238, 976, 386)).resize((104, 104), Image.NEAREST), (896, 256))
# page, left of the pod
put("page-pane-408x440", 176, 112)
text((192, 120), "Coat", f20, CREAM)
cells = [(192, 160, "read", "Spots", "dots · hides plain"), (384, 160, "read", "Belly", "cream · hides charcoal"), (192, 360, "unread", "Flank", ""), (384, 360, "sealed", "Crest", "")]
pics = [cand.crop((180, 166, 372, 430)).resize((184, 112), Image.LANCZOS), cand.crop((200, 250, 372, 400)).resize((184, 112), Image.LANCZOS)]
for k, (x, y, st, nm, ln) in enumerate(cells):
    if st == "read":
        cv.alpha_composite(pics[k], (x, y)); put("trait-picture-frame-184x112", x, y)
    elif st == "unread": put("trait-picture-frame-184x112-unread", x, y)
    else: put("trait-picture-frame-184x112-sealed", x, y)
    text((x, y + 120), nm, f16, CREAM)
    if ln: text((x, y + 140), ln, f16, FOG)
# top bar and bottom line
put("frame-top-bar-1024x40", 0, 0); put("frame-bottom-line-1024x38", 0, 562)
text((16, 20), "Pods", f20, CREAM, "lm"); text((72, 20), "T5", f16, MIST, "lm")
for x, c, v in ((432, (255, 168, 63), "9"), (496, (91, 185, 243), "4"), (560, (92, 187, 76), "6")):
    d.polygon([(x, 14), (x + 6, 14), (x + 3, 20), (x + 8, 20), (x + 2, 28), (x + 3, 22), (x - 2, 22)] if c[0] == 255 else [(x + 4, 12), (x + 11, 20), (x + 4, 28), (x - 3, 20)], fill=c)
    text((x + 20, 20), v, f16, CREAM, "lm")
text((1008, 20), "Companion away · with Dot", f16, FOG, "rm")
text((16, 581), "✓ Read Face · 2 ◆ · ← Home", f16, CREAM, "lm"); text((512, 581), "identified · rock field", f16, FOG, "mm"); text((1008, 581), "Face glints · something new", f16, AMBER, "rm")
for x in (396, 628): d.line([(x, 571), (x, 591)], fill=(93, 89, 116, 255))
cv.convert("RGB").save("composite-pods-read-1024x600.png")
side = Image.new("RGB", (2058, 600), (30, 30, 30)); side.paste(cv.convert("RGB"), (0, 0)); side.paste(cand.convert("RGB"), (1034, 0)); side.save("composite-vs-candidate.png")
