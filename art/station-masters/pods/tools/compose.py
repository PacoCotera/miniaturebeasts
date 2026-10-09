"""The proof: the Pods Read screen at 1024x600 from the slices, decided strings typed over them in Inter. python3 -I tools/compose.py
On the layout of design-pods-relayout 29b6dc9: the well column at 112 with 80x80 ring slices and 32x48 pods, the page 256 wide as one state (a grid of
one to eight traits), the pod the protagonist on axis x 632, the stamp a detail in a 152 px case.
Writes composite-pods-read-1024x600.png (a chapter of four traits, six full tabs), composite-pods-grid-1024x600.png (a chapter of one trait, a seven-chapter
compact rail) and composite-vs-candidate.png."""
from PIL import Image, ImageDraw, ImageFont
FD = "/usr/share/fonts/opentype/inter/"
f16 = ImageFont.truetype(FD + "Inter-Regular.otf", 16); f20 = ImageFont.truetype(FD + "Inter-Medium.otf", 20)
CREAM = (241, 235, 223); FOG = (198, 196, 216); MIST = (141, 138, 166); AMBER = (255, 168, 63); BONE = (241, 235, 223)
cand = Image.open("source/raw/ref-PV-D-r3-a4-1024x600.png").convert("RGBA")
def S(n): return Image.open(f"slices/{n}.png").convert("RGBA")
CID = {'Coat': 'coat', 'Face': 'face', 'Shape': 'shape', 'Legs & Tail': 'legs-tail', 'Legs': 'legs-tail', 'Movement': 'movement', 'Stamina': 'stamina', 'Character': 'character', 'Glow': 'glow', 'Charge': 'charge'}
def compose(traits, rail):
    cv = Image.new("RGBA", (1024, 600), (16, 26, 36, 255)); d = ImageDraw.Draw(cv)
    def put(n, x, y): cv.alpha_composite(S(n), (x, y))
    def text(xy, s, font, fill, anchor="la", shadow=True):
        if shadow: d.text((xy[0], xy[1] + 1), s, font=font, fill=(8, 12, 18, 255), anchor=anchor)
        d.text(xy, s, font=font, fill=fill, anchor=anchor)
    put("room-bench-stage", 0, 40); put("ring-column-112x522", 0, 40)
    # the wells: a ring slice at (24, 44 + 72 i), the pod 32x48 centred in it, the arcs on the inner edge; a glint star at the selected ring's upper right
    pods = {0: "pod-well-identified", 1: "pod-well-identified", 2: "pod-well-sealed"}; lit = {0: (6, 3), 1: (5, 1), 2: (4, 0)}
    for i in range(6):
        y = 44 + 72 * i; sel = i == 0; st = "selected" if sel else "idle"
        put("ring-well-selected-80x80" if sel else "ring-well-idle-80x80", 24, y)
        if i in lit:
            n, k = lit[i]; put(f"ring-arc-{st}-n{n}-track", 24, y)       # selected: the open channel over the solid band; idle: the groove
            for j in range(k): put(f"ring-arc-{st}-n{n}-s{j}", 24, y)    # a read chapter: the solid band (selected) or the dim line (idle)
        if i in pods: put(pods[i], 44, 60 + 72 * i)
    put("glint-star-12x12", 24 + 40 + 30 - 6, 44 + 40 - 30 - 6)
    put("ring-hatch-80x56", 24, 488)
    # the stage: the pod the protagonist on axis x 632
    put("room-shelf", 488, 368); put("room-cradle", 520, 328); put("pod-large-shadow", 632 - 80, 385); put("pod-large-identified", 560, 216); put("room-cradle-front", 520, 328)
    tw = d.textlength("Loika", font=f20); pw = min(224, max(80, -(-int(tw + 24) // 16) * 16)); put(f"plate-name-{pw}x24", 632 - pw // 2, 456); text((632, 468), "Loika", f20, CREAM, "mm")
    text((632, 498), "Found on the rock field,", f16, BONE, "mm"); text((632, 518), "as a Tuikis felt safe.", f16, BONE, "mm")
    put("room-stamp-case-152x152", 856, 232); put("stamp-label-120x120", 872, 248); cv.alpha_composite(Image.open("../../concept-station/pods-v2/layout/stamp-hopper-bench-300.png").convert("RGBA").resize((104, 104), Image.NEAREST), (880, 256)); put("room-stamp-case-152x152-front", 856, 232)
    # the page, 256 wide: one state, a grid of the chapter's traits
    put("page-pane-256x440", 152, 112); text((168, 120), "Coat" if rail == "six" else "Shape", f20, CREAM)
    for k in range(traits): x = 408 - 8 - 12 * (traits - 1 - k) - 16; d.rectangle([x, 128, x + 7, 135], fill=CREAM if k < 2 else None, outline=MIST)
    def namenew(xy, word):      # the name and the new dot centred together: the dot 4 px after the name, its centre on the line's middle (a 20 px line)
        tw = d.textlength(word, font=f16); x0 = int(xy[0] - (tw + 4 + 6) / 2)
        text((x0, xy[1]), word, f16, CREAM); put("page-mark-new-10", int(x0 + tw + 4), xy[1] + 10 - 3)
    pic = lambda w, h, box=(180, 166, 372, 430): cand.crop(box).resize((w, h), Image.LANCZOS)
    if traits == 1:      # one trait: a picture no larger than the pod's box, 144x176, centred in the cell
        px, py = 168 + (224 - 144) // 2, 160 + 40
        cv.alpha_composite(pic(144, 176), (px, py)); put("trait-picture-frame-144x176", px, py); namenew((280, py + 184), "Spots")
    else:
        for k, (cx, cy, st) in enumerate(((168, 160, "read"), (288, 160, "read"), (168, 360, "unread"), (288, 360, "sealed"))[:traits]):
            if st == "read": cv.alpha_composite(pic(104, 160, (180, 166, 372, 430) if k == 0 else (200, 250, 372, 400)), (cx, cy)); put("trait-picture-frame-104x160", cx, cy)
            else: put(f"trait-picture-frame-104x160-{st}", cx, cy)
            (namenew((cx + 52, cy + 164), "Spots") if k == 0 else text((cx, cy + 164), ("Spots", "Belly", "Flank", "Crest")[k], f16, CREAM))
    # the rail: tabs hang from the bar at y 40 and touch along their slants
    if rail == "six": tabs = [("Coat", "focused", 3), ("Face", "read", 3), ("Shape", "unread", 4), ("Legs & Tail", "unread", 3), ("Movement", "sealed", 0), ("Stamina", "unread", 3)]; open_i = None
    else: tabs = [("Coat", "read", 3), ("Face", "read", 3), ("Shape", "focused", 4), ("Legs", "unread", 3), ("Movement", "unread", 3), ("Stamina", "sealed", 0), ("Character", "unread", 3)]; open_i = 2
    x = 152; ring = None
    for i, (word, st, pips) in enumerate(tabs):
        full = rail == "six" or i == open_i; w = 136 if full else 56
        put(f"rail-tab-fill-{'open' if st == 'focused' else st}-{'full-152x40' if full else 'compact-72x40'}", x, 40)
        if st == "focused": ring = (x, w)
        es = "read" if st in ("read", "focused") else st
        pc = CREAM if st in ("read", "focused") else (150, 168, 184)
        if full:
            tw = d.textlength(word, font=f16); bx = x + 76 - (32 + tw) / 2
            if word == "Legs & Tail": text((x + 76, 54), word, f16, pc if st != "sealed" else MIST, "mm")         # the word alone carries it (the leg is being redrawn)
            else: cv.alpha_composite(S(f"rail-emblem-{CID[word]}-{es}-24x24"), (int(bx), 48)); text((bx + 32, 54), word, f16, pc if st != "sealed" else MIST, "lm")
            for p in range(pips): px = int(x + 80 - pips * 4 + 8 * p); d.rectangle([px, 68, px + 5, 73], fill=pc if st in ("read", "focused") and p < 2 else None, outline=pc)
        else:
            if word != "Legs": cv.alpha_composite(S(f"rail-emblem-{CID[word]}-{es}-24x24"), (x + 34 - 12, 44))        # Legs & Tail: no emblem until the art director picks one
            for p in range(min(pips, 4)): px = int(x + 42 - min(pips, 4) * 4 + 8 * p); d.rectangle([px, 72, px + 5, 77], fill=pc if st == "read" else None, outline=pc)
        x += w
    if ring:
        rx, rw = ring; d.line([(rx - 2, 42), (rx + rw + 2, 42), (rx + rw + 20, 84), (rx + 12, 84), (rx - 2, 42)], fill=(255, 232, 190, 255), width=2)
    put("frame-bottom-line-1024x38", 0, 562); cv.alpha_composite(S("frame-top-bar-1024x40"), (0, 0))
    HAIR = (60, 75, 87, 255); ORANGE = (242, 103, 27, 255); STONE = (93, 89, 116, 255)
    # the top bar: where you are, what you hold, who is out, when
    put("frame-room-research-24", 16, 8); text((48, 20), "Pods", f20, CREAM, "lm")
    for xx in (256, 888): d.line([(xx, 8), (xx, 32)], fill=HAIR)
    for xx, c_, v in ((432, (255, 168, 63), "9"), (496, (91, 185, 243), "4"), (560, (92, 187, 76), "6")):      # the holdings: stand-in icons with figures
        d.polygon([(xx, 14), (xx + 6, 14), (xx + 3, 20), (xx + 8, 20), (xx + 2, 28), (xx + 3, 22), (xx - 2, 22)] if c_[0] == 255 else [(xx + 4, 12), (xx + 11, 20), (xx + 4, 28), (xx - 3, 20)], fill=c_); text((xx + 20, 20), v, f16, CREAM, "lm")
    put("frame-companion-outline-16x24", 816, 8); put("frame-lamp-8-stone", 836, 16); put("face-loika-24-away", 856, 8)
    tw5 = d.textlength("5", font=f16); put("frame-sun-16", int(1008 - tw5 - 4 - 16), 12); text((1008, 20), "5", f16, CREAM, "rm")
    # the bottom line: the one action, the context, the notice
    put('frame-cap-confirm-16', 16, 574); text((36, 581), "Read Face", f16, ORANGE, "lm")
    vw = d.textlength("Read Face", font=f16); gx = int(36 + vw + 24)
    d.polygon([(gx + 4, 575), (gx + 11, 582), (gx + 4, 589), (gx - 3, 582)], fill=(91, 185, 243, 255)); text((gx + 18, 581), "2", f16, CREAM, "lm")
    hw = d.textlength("Home", font=f16); hx = int(1008 - hw - 4 - 16); put('frame-cap-back-16', hx, 574); text((1008, 581), "Home", f16, FOG, "rm")
    text((512, 581), "Coat is read" if rail == "six" else "Shape is unread", f16, MIST, "mm")
    nw = d.textlength("something new in Face", font=f16); put("frame-lamp-12-amber", int(904 - nw - 4 - 12), 575); text((904, 581), "something new in Face", f16, AMBER, "rm")
    for xx in (404, 620): d.line([(xx, 571), (xx, 591)], fill=HAIR)
    return cv.convert("RGB")
a = compose(4, "six"); a.save("composite-pods-read-1024x600.png")
compose(1, "compact").save("composite-pods-grid-1024x600.png")
side = Image.new("RGB", (2058, 600), (30, 30, 30)); side.paste(a, (0, 0)); side.paste(cand.convert("RGB"), (1034, 0)); side.save("composite-vs-candidate.png")
