"""Reading-room v2 concepts: full-size crops to the screen's 1024:600, then the 1x frames and contact sheets (0 MXN).
Full size first: each raw (5504x3072) is cropped centred to 1024:600 at its own resolution (concepts/readroom/<id>-full.jpg), then reduced
once to 1024x600 (Lanczos, never enlarged). The 1x frame gets the build's chrome in code (top bar [0,0,1024,40], foot [0,562,1024,38]),
wood plates for the buttons (umber, brass hairline, bevel) and the section 2 words typed in Inter, placed per frame where the painting left room.
usage: python3 -I tools/readroomsheets.py"""
import os, json
from PIL import Image, ImageDraw, ImageFont, ImageFilter
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
RAW = os.path.join(ROOT, "source/raw/concepts-readroom"); FULL = os.path.join(ROOT, "concepts/readroom")
SHEETS = "/home/user/iwq/results/T-20261026-vivarium/readroom-concepts"
INTER = "/usr/share/fonts/opentype/inter/Inter-%s.otf"; SYM = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
SYMS = set("◆◀▶▲▼✓←❀−")
BAR, CREAM, FOG, INK, DATA = (29, 35, 43), (244, 233, 212), (176, 166, 156), (74, 52, 36), (120, 190, 240)

def font(px, w="Regular"): return ImageFont.truetype(INTER % w, px)
def sym(px): return ImageFont.truetype(SYM, px)
def runs(s):
    out = []
    for ch in s:
        k = ch in SYMS
        if out and out[-1][0] == k: out[-1][1] += ch
        else: out.append([k, ch])
    return out
def width(s, px, w="Regular"): return sum((sym(px) if k else font(px, w)).getlength(t) for k, t in runs(s))
def text(d, xy, s, px, fill, w="Regular", anchor="l", shadow=True):
    x, y = xy; tw = width(s, px, w)
    if anchor == "c": x -= tw / 2
    if anchor == "r": x -= tw
    for k, t in runs(s):
        f = sym(px) if k else font(px, w); col = DATA if (k and t.strip() == "◆") else fill
        if shadow: d.text((x + 1, y + 1), t, font=f, fill=(20, 14, 10, 170))
        d.text((x, y), t, font=f, fill=col); x += f.getlength(t)
def plate(d, r, label, px=15, focus=False):
    x, y, w, h = r
    d.rounded_rectangle([x, y, x + w, y + h], 4, fill=(84, 56, 38), outline=(176, 140, 76))
    d.line([x + 3, y + 1, x + w - 3, y + 1], fill=(132, 96, 64)); d.line([x + 3, y + h - 1, x + w - 3, y + h - 1], fill=(52, 34, 24))
    if focus: d.rounded_rectangle([x - 4, y - 4, x + w + 4, y + h + 4], 6, outline=(255, 230, 173), width=2)
    lines = label.split("\n"); lh = px + 3; y0 = y + (h - lh * len(lines)) / 2 - 1
    for i, l in enumerate(lines): text(d, (x + w / 2, y0 + i * lh), l, px, CREAM, "Medium", "c")
def chrome(d, left, mid, foot):
    d.rectangle([0, 0, 1024, 40], fill=BAR); d.rectangle([0, 562, 1024, 600], fill=BAR)
    text(d, (16, 10), left, 18, CREAM, "Medium", shadow=False); text(d, (512, 11), mid, 16, CREAM, "Medium", "c", shadow=False)
    text(d, (16, 572), foot[0], 15, CREAM, shadow=False); text(d, (512, 572), foot[1], 15, FOG, anchor="c", shadow=False)
    text(d, (1008, 572), foot[2], 15, CREAM, anchor="r", shadow=False)

def full_crop(n):
    os.makedirs(FULL, exist_ok=True); p = os.path.join(FULL, f"{n}-full.jpg")
    im = Image.open(os.path.join(RAW, f"{n}.jpg")).convert("RGB"); w, h = im.size; nw = round(h * 1024 / 600); x = (w - nw) // 2
    c = im.crop((x, 0, x + nw, h))
    if not os.path.exists(p): c.save(p, quality=95)
    return c

# Per frame: where the painting left room for the words (1x, measured on each painting). A word list per state follows section 2.
FRAMES = {
 "a-unread-c": dict(pod=322, y=466, cre=(610, 498), origin=(186, 186, "pond meadow ·", "as a Loika shook dry", "wall"), kin=(102, 282), goal=(519, 226)),
 "a-read-f":   dict(pod=322, y=466, cre=(552, 450), origin=(186, 186, "pond meadow ·", "as a Loika shook dry", "wall"), kin=(102, 282), goal=(519, 226), rows=(640, 470)),
 "a-full-d":   dict(pod=322, y=478, cre=(552, 466), origin=(186, 186, "pond meadow ·", "as a Loika shook dry", "wall"), kin=(102, 282), goal=(519, 226)),
 "b-unread-c": dict(pod=512, y=486, cre=(760, 490), origin=(64, 206, "pond meadow · as a", "Loika shook dry"), kin=(130, 300), goal=(822, 202)),
 "b-read-d":   dict(pod=380, y=458, cre=(1008, 500, "r"), origin=(98, 172, "pond meadow · as a", "Loika shook dry"), kin=(132, 266), goal=(842, 212), rows=(640, 476)),
 "b-full-c":   dict(pod=512, y=478, cre=(760, 452), origin=(124, 202, "", ""), kin=(306, 250), goal=(830, 218)),
 "c-unread-c": dict(pod=385, y=440, cre=(740, 476), origin=(64, 186, "pond meadow · as a", "Loika shook dry"), kin=(272, 166), goal=(833, 196)),
 "c-read-c":   dict(pod=410, y=420, cre=(620, 472), origin=(102, 172, "pond meadow · as a", "Loika shook dry"), kin=(142, 266), goal=(810, 216), rows=(700, 420)),
 "c-full-c":   dict(pod=512, y=478, cre=(720, 430), origin=(102, 190, "", ""), kin=(306, 210), goal=(836, 186)),
}
STATE = {
 "unread": dict(top="◆ 8   ❀ 9", page="Coat · something new here", under="russet, ash, or a look not seen yet", button="Read Coat ◆2",
                cre="four pages still inside the pod", goal="your goal · pale patches", row=("Swap pod", "Let go", "Grow it · learns Face"), foot=("✓ Read Coat", "", "← Pods")),
 "read":   dict(top="◆ 6  −2 ◆   ❀ 9", page="Coat · read", under="your goal: it carries pale", button="Read Face ◆1 · it glints",
                cre="three pages still inside", goal="carries pale", rows=("Colour · russet and ash  new", "hides ash · one is enough"),
                row=("Swap pod", "Let go", "Grow it · learns Face"), foot=("✓ Read Face", "Coat is read · Face glints", "← Pods")),
 "full":   dict(top="◆ 3   ❀ 9", page="Coat · read", under="known in full", button="Grow it", cre="", goal="breeds true for pale",
                row=("Swap pod", "Let go", "Shape it"), foot=("✓ Grow it", "every page is read", "← Pods")),
}
def frame_1x(n):
    im = full_crop(n).resize((1024, 600), Image.LANCZOS).convert("RGBA"); clean = im.copy()
    f = FRAMES[n]; s = STATE[n.split("-")[1]]; d = ImageDraw.Draw(im, "RGBA")
    chrome(d, "Pods / Loika", s["top"], s["foot"])
    text(d, (f["pod"], f["y"]), s["page"], 18, CREAM, "Medium", "c")
    text(d, (f["pod"], f["y"] + 22), s["under"], 15, CREAM, anchor="c")
    bw = max(160, round(width(s["button"], 16, "Medium")) + 40)
    plate(d, (f["pod"] - bw // 2, f["y"] + 46, bw, 30), s["button"], 16, focus=True)
    if s["cre"]: c = f["cre"]; text(d, c[:2], s["cre"], 15, FOG, anchor=c[2] if len(c) > 2 else "c")
    if "rows" in f and "rows" in s:
        for i, l in enumerate(s["rows"]): text(d, (f["rows"][0], f["rows"][1] + 20 * i), l, 15, CREAM)
    ox, oy, o1, o2 = f["origin"][:4]; wall = len(f["origin"]) > 4
    if o1:
        if wall: text(d, (ox, oy), o1, 13, CREAM); text(d, (ox, oy + 16), o2, 13, CREAM)
        else: text(d, (ox, oy), o1, 12, INK, "Medium", shadow=False); text(d, (ox, oy + 14), o2, 12, INK, "Medium", shadow=False)
    text(d, f["kin"], "its kin · compare", 13, CREAM)
    text(d, f["goal"], s["goal"], 13, CREAM, anchor="c")
    ry = 526; a, b, c = s["row"]
    plate(d, (16, ry, 96, 28), a, 14); plate(d, (118, ry, 76, 28), b, 14)
    cw = round(width(c, 14, "Medium")) + 32; plate(d, (1008 - cw, ry, cw, 28), c, 14)
    return clean, im

def compare_1x(n):
    im = full_crop(n).resize((1024, 600), Image.LANCZOS).convert("RGBA"); clean = im.copy(); d = ImageDraw.Draw(im, "RGBA")
    chrome(d, "Pods / Loika · compare", "◆ 8   ❀ 9", ("✓ Take to the reading room", "two differ in Coat · ▲▼ other pages", "← reading room"))
    text(d, (290, 104), "Loika · on the bench", 15, CREAM, anchor="c"); text(d, (735, 104), "Loika · its kin · ◀▶ another", 15, CREAM, anchor="c")
    text(d, (40, 300), "Coat", 18, CREAM, "Medium"); text(d, (40, 322), "two differ", 15, FOG)
    rows = [("patches", "Pattern", "patches", False), ("russet · hides ash", "Colour", "ash · hides nothing", True), ("short", "Length", "short", False),
            ("thick", "Density", "sleek", True), ("pale tips", "Tips", "pale tips", False), ("not read", "Sheen", "not read", False)]
    for i, (l, t, r, diff) in enumerate(rows):
        y = [308, 340, 375, 408, 443, 478][i]; col = INK if diff else (112, 98, 84)
        text(d, (374, y), l, 14, col, "Medium" if diff else "Regular", shadow=False)
        text(d, (548, y - (0 if diff else 6)), t, 14, col, "Medium", "c", shadow=False)
        if not diff: text(d, (548, y + 9), "same" if l != "not read" else "", 11, (112, 98, 84), anchor="c", shadow=False)
        text(d, (646, y), r, 14, col, "Medium" if diff else "Regular", shadow=False)
    plate(d, (20, 470, 196, 44), "Take to the\nreading room", 14, focus=True); plate(d, (808, 470, 196, 44), "Take its kin to\nthe reading room", 14)
    return clean, im

def sheet(name, cells, title_px=16):
    """cells: [(caption, clean, worded)]: the paintings on the top row, the same frames with the words on the bottom row, at 1x."""
    g = 24; cw, ch = 1024, 600; W = g + len(cells) * (cw + g); H = 40 + ch + 36 + ch + g
    sh = Image.new("RGB", (W, H), (24, 26, 30)); d = ImageDraw.Draw(sh)
    for i, (cap, clean, worded) in enumerate(cells):
        x = g + i * (cw + g); text(d, (x, 12), cap, title_px, CREAM, "Medium", shadow=False)
        sh.paste(clean.convert("RGB"), (x, 40)); text(d, (x, 40 + ch + 10), "with the words, chrome and plates in code", 13, FOG, shadow=False)
        sh.paste(worded.convert("RGB"), (x, 40 + ch + 36))
    os.makedirs(SHEETS, exist_ok=True); sh.save(os.path.join(SHEETS, name)); return name

if __name__ == "__main__":
    made = []
    for d, label in (("a", "A · the lamp and the glass (pick)"), ("b", "B · the bell jar"), ("c", "C · the field book")):
        ids = {"a": ["a-unread-c", "a-read-f", "a-full-d"], "b": ["b-unread-c", "b-read-d", "b-full-c"], "c": ["c-unread-c", "c-read-c", "c-full-c"]}[d]
        caps = ["a pod set down, full of unread shapes", "the read: a look lifts onto the creature, the hidden copy turns", "known in full: clear glass, the creature whole, the stamp"]
        cells = [(f"{label} · {c}  [{n}]", *frame_1x(n)) for n, c in zip(ids, caps)]
        made.append(sheet(f"readroom-{d}-contact-1x.png", cells))
        for n, (_, clean, worded) in zip(ids, cells): worded.convert("RGB").save(os.path.join(SHEETS, f"{n}-words-1x.png"))
    clean, worded = compare_1x("a-compare-d")
    made.append(sheet("readroom-a-compare-contact-1x.png", [("A · Compare: two pods on the bench over one shared table  [a-compare-d]", clean, worded)]))
    worded.convert("RGB").save(os.path.join(SHEETS, "a-compare-d-words-1x.png"))
    # every raw at 1x, used or not, so the rejected tries are seen too
    allraw = sorted(f[:-4] for f in os.listdir(RAW) if f.endswith(".jpg")); g = 16; tw, th = 512, 300; cols = 4
    rows = (len(allraw) + cols - 1) // cols; sh = Image.new("RGB", (g + cols * (tw + g), g + rows * (th + 34 + g)), (24, 26, 30)); d = ImageDraw.Draw(sh)
    for i, n in enumerate(allraw):
        x = g + (i % cols) * (tw + g); y = g + (i // cols) * (th + 34 + g)
        sh.paste(full_crop(n).resize((tw, th), Image.LANCZOS), (x, y + 26)); text(d, (x, y + 4), n, 14, CREAM, shadow=False)
    sh.save(os.path.join(SHEETS, "readroom-every-raw-half.png")); made.append("readroom-every-raw-half.png")
    json.dump({"made": made, "raws": allraw}, open(os.path.join(FULL, "sheets.json"), "w"), indent=1); print("\n".join(made))
