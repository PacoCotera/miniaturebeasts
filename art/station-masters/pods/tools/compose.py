"""The proof: the Pods Read screen at 1024x600 from the slices, decided strings typed over them in Inter. python3 -I tools/compose.py
Writes composite-pods-read-1024x600.png (Picture state, six full tabs), composite-pods-grid-1024x600.png (Grid state, seven chapters
with a compact rail) and composite-vs-candidate.png."""
from PIL import Image, ImageDraw, ImageFont
FD = "/usr/share/fonts/opentype/inter/"
f16 = ImageFont.truetype(FD + "Inter-Regular.otf", 16); f20 = ImageFont.truetype(FD + "Inter-Medium.otf", 20); f28 = ImageFont.truetype(FD + "Inter-SemiBold.otf", 28)
CREAM = (241, 235, 223); FOG = (198, 196, 216); MIST = (141, 138, 166); AMBER = (255, 168, 63); BONE = (241, 235, 223)
cand = Image.open("source/raw/ref-PV-D-r3-a4-1024x600.png").convert("RGBA")
def S(n): return Image.open(f"slices/{n}.png").convert("RGBA")
def compose(state, rail):
    cv = Image.new("RGBA", (1024, 600), (16, 26, 36, 255)); d = ImageDraw.Draw(cv)
    def put(n, x, y): cv.alpha_composite(S(n), (x, y))
    def text(xy, s, font, fill, anchor="la", shadow=True):
        if shadow: d.text((xy[0], xy[1] + 1), s, font=font, fill=(8, 12, 18, 255), anchor=anchor)
        d.text(xy, s, font=font, fill=fill, anchor=anchor)
    put("room-bench-stage", 0, 40); put("ring-column", 0, 40)
    for i in range(6): put("ring-well-current" if i == 0 else "ring-well-empty", 40, 52 + 72 * i)
    for i, n in {0: "pod-well-identified", 1: "pod-well-identified", 2: "pod-well-sealed"}.items(): put(n, 56, 64 + 72 * i)
    for i, fills in ((0, (1, 1, 0, 0)), (1, (1, 0, 0, 0))):
        cx, cy = 72, 84 + 72 * i
        for k in range(4): d.arc([cx - 31, cy - 31, cx + 31, cy + 31], -90 + k * 90 + 6, -90 + k * 90 + 84, fill=(69, 216, 190, 255) if fills[k] else (93, 89, 116, 255), width=3)
    put("ring-hatch", 24, 488)
    # stage
    put("room-shelf", 576, 392); put("room-cradle", 600, 328); put("pod-large-shadow", 712 - 80, 385); put("pod-large-identified", 640, 216); put("room-cradle-front", 600, 328)
    tw = d.textlength("Loika pod", font=f28); pw = min(224, max(96, -(-int(tw + 24) // 16) * 16)); put(f"plate-name-{pw}x32", 712 - pw // 2, 440); text((712, 456), "Loika pod", f28, CREAM, "mm")
    put("plate-origin-224x40", 600, 480); text((712, 491), "rock field ·", f16, BONE, "mm"); text((712, 509), "a Tuikis felt safe", f16, BONE, "mm")
    put("stamp-label-120x120", 888, 248); cv.alpha_composite(cand.crop((830, 238, 976, 386)).resize((104, 104), Image.NEAREST), (896, 256))
    # page
    put("page-pane-408x440", 176, 112)
    text((192, 120), "Coat" if rail == "six" else "Shape", f20, CREAM)    # the heading is the open chapter's word
    for k in range(4):                                   # the 8x8 trait marks, right-aligned at y 128 (stand-ins)
        x = 568 - 8 - 12 * (3 - k); d.rectangle([x, 128, x + 7, 135], fill=CREAM if k < 2 else None, outline=MIST)
    if state == "picture":
        cv.alpha_composite(cand.crop((190, 168, 370, 428)).resize((200, 280), Image.LANCZOS), (280, 176)); put("trait-picture-frame-232x312", 264, 160)
        text((380, 480), "Spots", f16, CREAM, "ma"); text((380, 500), "dots · hides plain", f16, FOG, "ma")
    else:
        cells = [(192, 160, "read", "Spots", "dots · hides plain"), (384, 160, "read", "Belly", "cream · hides charcoal"), (192, 360, "unread", "Flank", ""), (384, 360, "sealed", "Crest", "")]
        pics = [cand.crop((180, 166, 372, 430)).resize((184, 112), Image.LANCZOS), cand.crop((200, 250, 372, 400)).resize((184, 112), Image.LANCZOS)]
        for k, (x, y, st, nm, ln) in enumerate(cells):
            if st == "read": cv.alpha_composite(pics[k], (x, y)); put("trait-picture-frame-184x112", x, y)
            else: put(f"trait-picture-frame-184x112-{st}", x, y)
            text((x, y + 120), nm, f16, CREAM)
            if ln: text((x, y + 140), ln, f16, FOG)
    # rail: tabs hang from the bar at y 40 and touch along their slants
    if rail == "six": tabs = [("Coat", "focused", 3), ("Face", "read", 3), ("Shape", "unread", 4), ("Legs & tail", "unread", 3), ("Movement", "sealed", 0), ("Stamina", "unread", 3)]; open_i = None
    else: tabs = [("Coat", "read", 3), ("Face", "read", 3), ("Shape", "focused", 4), ("Legs", "unread", 3), ("Movement", "unread", 3), ("Stamina", "sealed", 0), ("Character", "unread", 3)]; open_i = 2
    x = 176; ring = None
    for i, (word, st, pips) in enumerate(tabs):
        full = rail == "six" or i == open_i; w = 136 if full else 56
        put(f"rail-tab-{st}-{'full-152x40' if full else 'compact-72x40'}", x, 40)
        if st == "focused": ring = (x, w)
        emb = lambda ex, ey: d.rounded_rectangle([ex, ey, ex + 23, ey + 23], 5, outline=(160, 175, 190, 255) if st != "unread" else (120, 135, 150, 255), width=2)
        pc = CREAM if st in ("read", "focused") else (150, 168, 184)
        if full:
            tw = d.textlength(word, font=f16); bx = x + 76 - (32 + tw) / 2
            emb(int(bx), 48); text((bx + 32, 54), word, f16, pc if st != "sealed" else MIST, "lm")
            cxp = x + 76 + 4; 
            for p in range(pips): px = int(cxp - pips * 4 + 8 * p); d.rectangle([px, 68, px + 5, 73], fill=pc if st in ("read", "focused") and p < 2 else None, outline=pc)
        else:
            emb(x + 34 - 12, 44)
            for p in range(min(pips, 4)): px = int(x + 42 - min(pips, 4) * 4 + 8 * p); d.rectangle([px, 72, px + 5, 77], fill=pc if st == "read" else None, outline=pc)
        x += w
    if ring:                                             # the frame's focus ring in its tab shape (a stand-in for the proof)
        rx, rw = ring; d.line([(rx - 2, 42), (rx + rw + 2, 42), (rx + rw + 20, 84), (rx + 12, 84), (rx - 2, 42)], fill=(255, 232, 190, 255), width=2)
    if rail == "six" and tabs[1][1] == "read": put("rail-tab-unread-compact-72x40", 0, 0) if False else None
    put("frame-top-bar-1024x40", 0, 0) if False else None
    # top bar and bottom line over the rail's roots
    put("frame-bottom-line-1024x38", 0, 562)
    topbar = S("frame-top-bar-1024x40"); under = cv.crop((0, 40, 1024, 41))  # the bar's rule is the tabs' top edge
    cv.alpha_composite(topbar, (0, 0)); put("rail-tab-focused-full-152x40", 0, 0) if False else None
    text((16, 20), "Pods", f20, CREAM, "lm"); text((72, 20), "T5", f16, MIST, "lm")
    for xx, c, v in ((432, (255, 168, 63), "9"), (496, (91, 185, 243), "4"), (560, (92, 187, 76), "6")):
        d.polygon([(xx, 14), (xx + 6, 14), (xx + 3, 20), (xx + 8, 20), (xx + 2, 28), (xx + 3, 22), (xx - 2, 22)] if c[0] == 255 else [(xx + 4, 12), (xx + 11, 20), (xx + 4, 28), (xx - 3, 20)], fill=c)
        text((xx + 20, 20), v, f16, CREAM, "lm")
    text((1008, 20), "Companion away · with Dot", f16, FOG, "rm")
    text((16, 581), "✓ Read Face · 2 ◆ · ← Home", f16, CREAM, "lm"); text((512, 581), "identified · rock field", f16, FOG, "mm"); text((1008, 581), "Face glints · something new", f16, AMBER, "rm")
    for xx in (396, 628): d.line([(xx, 571), (xx, 591)], fill=(93, 89, 116, 255))
    return cv.convert("RGB")
a = compose("picture", "six"); a.save("composite-pods-read-1024x600.png")
compose("grid", "compact").save("composite-pods-grid-1024x600.png")
side = Image.new("RGB", (2058, 600), (30, 30, 30)); side.paste(a, (0, 0)); side.paste(cand.convert("RGB"), (1034, 0)); side.save("composite-vs-candidate.png")
