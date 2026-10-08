"""Builds the Mibi 7x9 bitmap face from its hand-written source.

usage:  python3 -I build-mibi.py            (from anywhere)

Reads   ../type/mibi-7x9.txt          one block per glyph, rows of . and #
Writes  ../type/mibi-7x9.png          the sheet: 16 columns of 7x11 cells (the 7x9 body under 2 rows of headroom), indexed
        ../type/mibi-7x9.json         the atlas: code point -> cell, ink offset, ink width, advance, above; the metrics
        ../type/contact-1x.png        the full set and the pangrams, set in the face at 1x, 2x and 3x on a 450 px
        ../type/contact-2x.png        wide screen (the Companion's width), in the 48 colours
        ../type/contact-3x.png

Standard library only. PNGs are written here (indexed, the 48 colours of palette/palette.json as the palette), so
every pixel is a palette index: nothing can be off palette, there is no alpha and no anti-aliasing.

Block format (see the header of the .txt):
    U+0041 A            a header: the code point, the character, optionally adv=N
    .......             then 9 rows of 7 characters, "." empty and "#" ink: rows 0-8, the cap line on row 0
                        An accented letter may carry its mark above the cap line: 10 rows (1 above, the lower-case
                        acute, grave, circumflex and tilde) or 11 rows (2 above, the accented capitals). The line
                        pitch is 11, so those rows are the leading; nothing else may use them.
Column 0 and column 6 are the side bearings and must be empty. Ink lives in columns 1-5.
Advance = (last ink column + 1): the ink extent plus one pixel of tracking, unless the header gives adv=N
(tabular digits and the space). To draw a glyph, put the sheet cell's column 1 on the pen position and its row 2
on the cap line, then move the pen by the advance. The atlas gives the same numbers, and 'above' per glyph.
"""
import json, os, struct, sys, zlib

HERE = os.path.dirname(os.path.abspath(__file__))
TYPE = os.path.join(HERE, "..", "type")
PALETTE = os.path.join(HERE, "..", "palette", "palette.json")
CW, CH, COLS = 7, 9, 16
HEAD = 2                                       # rows above the cap line an accented glyph may use (the leading)
CELL_H = CH + HEAD                             # sheet cell height; the cap line is cell row HEAD
BG, FG = 1, 7                                  # ink and bone, in the signed palette's index order
CAP, XH, ASC, DESC, BASE = 7, 5, 7, 2, 7       # baseline = the row just under the last cap row (row 7 is the first descender row)


# ---------------------------------------------------------------- source
def parse(path):
    glyphs, cur, errors = {}, None, []
    for n, raw in enumerate(open(path, encoding="utf-8").read().split("\n"), 1):
        line = raw.rstrip()
        if not line or line.startswith(";"):
            continue
        if line.startswith("U+"):
            parts = line.split()
            cp = int(parts[0][2:], 16)
            adv = None
            for p in parts[1:]:
                if p.startswith("adv="):
                    adv = int(p[4:])
            if cp in glyphs:
                errors.append("line %d: U+%04X twice" % (n, cp))
            cur = {"cp": cp, "adv": adv, "rows": [], "line": n}
            glyphs[cp] = cur
            continue
        if cur is None:
            errors.append("line %d: row outside a block" % n); continue
        if len(line) != CW or set(line) - set(".#"):
            errors.append("line %d: U+%04X row must be %d characters of . and #: %r" % (n, cur["cp"], CW, line))
        cur["rows"].append(line)
    for cp, g in glyphs.items():
        if len(g["rows"]) not in range(CH, CH + HEAD + 1):
            errors.append("U+%04X (line %d): %d rows, need %d to %d" % (cp, g["line"], len(g["rows"]), CH, CH + HEAD))
            continue
        g["above"] = len(g["rows"]) - CH
        for r in g["rows"]:
            if r[0] == "#" or r[CW - 1] == "#":
                errors.append("U+%04X (line %d): ink in a side bearing column" % (cp, g["line"])); break
    if errors:
        sys.exit("source errors:\n  " + "\n  ".join(errors))
    for g in glyphs.values():
        cols = [x for r in g["rows"] for x, c in enumerate(r) if c == "#"]
        g["ink_x"] = min(cols) if cols else 1
        g["ink_w"] = (max(cols) - min(cols) + 1) if cols else 0
        g["advance"] = g["adv"] if g["adv"] is not None else (max(cols) + 1 if cols else 3)
    return glyphs


# ---------------------------------------------------------------- png (stdlib, indexed)
def png(path, w, h, pix, palette):
    """pix: list of rows of palette indices."""
    def chunk(t, d):
        c = struct.pack(">I", len(d)) + t + d
        return c + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    raw = b"".join(b"\x00" + bytes(r) for r in pix)
    plte = b"".join(bytes(c) for c in palette)
    data = (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 3, 0, 0, 0))
            + chunk(b"PLTE", plte) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))
    open(path, "wb").write(data)


def load_palette():
    d = json.load(open(PALETTE, encoding="utf-8"))
    cols = d["colours"]
    assert len(cols) == 48
    return [tuple(c["rgb"]) for c in cols], {c["name"]: c["index"] for c in cols}


# ---------------------------------------------------------------- sheet and atlas
def build_sheet(glyphs, palette):
    order = sorted(glyphs)
    nrows = (len(order) + COLS - 1) // COLS
    W, H = COLS * CW, nrows * CELL_H
    pix = [[BG] * W for _ in range(H)]
    atlas = {}
    for i, cp in enumerate(order):
        col, row = i % COLS, i // COLS
        g = glyphs[cp]
        for y, r in enumerate(g["rows"]):
            for x, c in enumerate(r):
                if c == "#":
                    pix[row * CELL_H + HEAD - g["above"] + y][col * CW + x] = FG
        atlas[str(cp)] = {"char": chr(cp), "hex": "U+%04X" % cp, "cell": [col, row], "x": col * CW, "y": row * CELL_H,
                          "advance": g["advance"], "ink_x": g["ink_x"], "ink_w": g["ink_w"], "above": g["above"]}
    png(os.path.join(TYPE, "mibi-7x9.png"), W, H, pix, palette)
    meta = {
        "font": "Mibi 7x9",
        "source": "type/mibi-7x9.txt, built by tools/build-mibi.py",
        "image": "mibi-7x9.png",
        "image_size": [W, H],
        "cell": {"w": CW, "h": CELL_H, "cap_line_row": HEAD},
        "columns": COLS,
        "rows": nrows,
        "count": len(order),
        "palette": {"file": "../palette/palette.json", "background": BG, "ink": FG,
                    "note": "two of the 48 colours; read the sheet as a mask: index %d is ink" % FG},
        "metrics": {"cap_height": CAP, "x_height": XH, "ascender": ASC, "descender": DESC,
                    "baseline_y": CAP, "line_height": CH, "headroom": HEAD, "tracking": 1, "space_advance": glyphs[32]["advance"],
                    "digit_advance": glyphs[48]["advance"], "side_bearing": 1,
                    "recommended_line_pitch": 11},
        "draw": "put the cell's column 1 on the pen x (the cell starts at pen_x - 1), the cell's row 2 on the cap line "
                "(the cell starts 2 font px above it); then pen_x += advance. 'above' is how many of the 2 headroom rows a "
                "glyph inks (accent marks only): a text slot keeps 2 font px clear above its first cap line. "
                "Scale by whole numbers only (2x or 3x on the Companion).",
        "glyphs": atlas,
    }
    # glyphs sorted by code point already; keep the file readable
    with open(os.path.join(TYPE, "mibi-7x9.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=1)
        f.write("\n")
    return order


# ---------------------------------------------------------------- text setting (for the contact sheets)
class Canvas:
    def __init__(self, w, h, fill):
        self.w, self.h = w, h
        self.p = [[fill] * w for _ in range(h)]

    def rect(self, x, y, w, h, c):
        for yy in range(max(0, y), min(self.h, y + h)):
            row = self.p[yy]
            for xx in range(max(0, x), min(self.w, x + w)):
                row[xx] = c

    def glyph(self, g, x, y, s, c):
        """Draw a glyph with its cell column 1 on x (so the cell starts at x - s), cap line at y."""
        for ry, r in enumerate(g["rows"]):
            for rx, ch in enumerate(r):
                if ch == "#":
                    self.rect(x + (rx - 1) * s, y + (ry - g["above"]) * s, s, s, c)


def width(glyphs, text, s):
    w = sum(glyphs.get(ord(ch), glyphs[ord("?")])["advance"] for ch in text)
    return max(0, (w - 1)) * s


def draw_text(cv, glyphs, text, x, y, s, c):
    for ch in text:
        g = glyphs.get(ord(ch), glyphs[ord("?")])
        if ch != " ":
            cv.glyph(g, x, y, s, c)
        x += g["advance"] * s
    return x


def wrap(glyphs, text, maxw, s):
    """Greedy wrap on spaces; a word longer than a line breaks between characters."""
    lines, cur = [], ""
    for word in text.split(" "):
        t = word if not cur else cur + " " + word
        if width(glyphs, t, s) <= maxw:
            cur = t; continue
        if cur:
            lines.append(cur); cur = ""
        if width(glyphs, word, s) <= maxw:
            cur = word; continue
        for ch in word:
            if width(glyphs, cur + ch, s) > maxw:
                lines.append(cur); cur = ch
            else:
                cur += ch
    if cur:
        lines.append(cur)
    return lines


ASCII = "".join(chr(c) for c in range(0x21, 0x7F))
SYMBOLS = "·×÷−–—…’‘“”«»¡¿°§✓✕←→↑↓▶◀▲▼★♥◆❀⚡"
LOW_ACC = "áàâäéèêëíìîïóòôöúùûüñÿçœ"
CAP_ACC = "ÁÀÂÄÉÈÊËÍÌÎÏÓÒÔÖÚÙÛÜÑŸÇŒ"
ACC_WORDS = ["sûr goût fête côte l'âme · comía país año niño · déjà où", "ÉTÉ · Él · ÁRBOL · À bientôt · ÎLE · ÑANDÚ · Ève · ÇA"]
PANGRAMS = [
    ("English", "The quick brown fox jumps over the lazy dog. Sphinx of black quartz, judge my vow."),
    ("Spanish", "El veloz murciélago hindú comía feliz cardillo y kiwi. ¡Qué ñandú tan ágil! Jovencillo emponzoñado de whisky: ¡qué figurota exhibe!"),
    ("French", "Voix ambiguë d'un cœur qui, au zéphyr, préfère les jattes de kiwis. Portez ce vieux whisky au juge blond qui fume. Où est l'âme du naïf Noël, à Noël ?"),
]
STRINGS = [   # strings the Companion page sets today, with the decided symbols
    "✓ Choose Weather · ← back",
    "meadow · surveyed 2/4 · 3 to take: fruit · dew · tuft",
    "Explored 12 of 320 cells",
    "Energy 08 · Data 14 · Essence 03 · T7",
    "◀ west · ▶ east · … · 3 ⚡ · 2 ◆ · 1 ❀",
    "Shield 3/3 · Probe tier 2 · −1 · +4 · 100%",
    "Fig's portrait has come · see it at the Station",
]
DIGITS = ["0123456789", "1111111111", "0000000000", "8888888888", "1234567890"]


def contact(glyphs, order, palette, names, s):
    W, M = 450, 8
    inner = W - 2 * M
    ink, night, slate, mist, bone, orange = (names[n] for n in ("ink", "night", "slate", "mist", "bone", "orange"))
    pitch = 11 * s                       # the kit's pitch: cap line to cap line, 11 font px
    items = []                           # (kind, payload)

    def label(t):
        items.append(("label", t))

    def block(t, c=bone):
        for ln in wrap(glyphs, t, inner, s):
            items.append(("line", ln, c))

    label("Mibi 7x9 at %d× · %d glyphs · 450 px wide" % (s, len(order)))
    items.append(("sheet", None))
    label("Printable ASCII")
    block(ASCII)
    label("Digits, tabular: columns line up")
    for d in DIGITS:
        block(d)
    label("Spanish and French, lower case")
    block(LOW_ACC)
    label("Spanish and French, capitals")
    block(CAP_ACC)
    label("Accents in words")
    for t in ACC_WORDS:
        block(t)
    label("Decided symbols")
    block(SYMBOLS)
    for name, t in PANGRAMS:
        label("Pangram, " + name)
        block(t)
    label("Strings the Companion sets")
    for t in STRINGS:
        block(t)

    # layout
    lab_s = 2
    lab_pitch = 11 * lab_s
    sheet_w, sheet_h = COLS * CW * s, ((len(order) + COLS - 1) // COLS) * CELL_H * s
    head = HEAD * s                      # the first line under a label keeps its headroom clear of the label
    H = M
    for it in items:
        if it[0] == "label":
            H += lab_pitch + 4 + head
        elif it[0] == "line":
            H += pitch
        else:
            H += sheet_h + 6
        if it[0] == "line":
            pass
    H += M + 8
    cv = Canvas(W, H, ink)
    y = M
    for it in items:
        if it[0] == "label":
            y += 6 if y > M else 0
            draw_text(cv, glyphs, it[1], M, y, lab_s, mist)
            y += lab_pitch + 4 + head - (6 if y > M else 0)
        elif it[0] == "line":
            draw_text(cv, glyphs, it[1], M, y, s, it[2])
            y += pitch
        else:
            # the sheet: cells on alternating night / ink so the grid shows at every scale
            for i, cp in enumerate(order):
                col, row = i % COLS, i // COLS
                cx, cy = M + col * CW * s, y + row * CELL_H * s
                cv.rect(cx, cy, CW * s, CELL_H * s, night if (col + row) % 2 == 0 else ink)
                g = glyphs[cp]
                for ry, r in enumerate(g["rows"]):
                    for rx, ch in enumerate(r):
                        if ch == "#":
                            cv.rect(cx + rx * s, cy + (HEAD - g["above"] + ry) * s, s, s, bone)
            y += sheet_h + 6
    png(os.path.join(TYPE, "contact-%dx.png" % s), W, H, cv.p, palette)
    return W, H


def main():
    palette, names = load_palette()
    glyphs = parse(os.path.join(TYPE, "mibi-7x9.txt"))
    need = [32, ord("?")]
    for n in need:
        if n not in glyphs:
            sys.exit("U+%04X must be in the source" % n)
    missing = [chr(c) for c in range(0x20, 0x7F) if c not in glyphs]
    if missing:
        sys.exit("printable ASCII incomplete: " + "".join(missing))
    order = build_sheet(glyphs, palette)
    print("sheet: %d glyphs, %d columns" % (len(order), COLS))
    for s in (1, 2, 3):
        w, h = contact(glyphs, order, palette, names, s)
        print("contact-%dx.png %dx%d" % (s, w, h))


if __name__ == "__main__":
    main()
