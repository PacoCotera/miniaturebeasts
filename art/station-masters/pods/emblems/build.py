"""Chapter emblems, round 2: the picked motifs hand-pixelled, one drawing per chapter in source/*.txt, drawn at 24x24 on the Station palette (62 colours), never reduced.

usage:  python3 -I build.py            (from anywhere)
Writes  round1/emblems-sheet.png       indexed sheet: nine chapters by option A and B in unread, read and sealed (PLTE = the 62 colours in file order,
                                       index 62 transparent), round1/emblems-atlas.json (rects, colours, hashes), round1/contact-1x.png, contact-2x.png

Standard library only. The manner: one 2 px cut, at most three strokes, 1 px inner detail only where it reads at 1x; the lit edge (top and left)
one palette step lighter; no fill, no outline, no glow. Unread: mist with a fog edge. Read: bone with a white edge. Sealed: mist, flat.
Pixels are palette colours or empty: nothing can be off palette, there is no anti-aliasing and no dither.
"""
import json, math, os, struct, zlib, hashlib
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, "round2")
PAL = json.load(open(os.path.join(HERE, "..", "..", "..", "..", "prototypes", "ui", "palettes", "station.json")))
NAMES = [n for n, _ in PAL["colours"]]; RGB = [tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for _, h in PAL["colours"]]
LIGHTER = PAL["lighter"]; N = 24; T = 62
STATES = {"unread": ("mist", True), "read": ("bone", True), "sealed": ("mist", False)}   # colour, lit edge

# ---------- the drawings: explicit pixel data, one text file per emblem in source/ ('#' base colour, '+' lit edge, '.' empty)
CHAPTERS = [("coat", "Coat"), ("face", "Face"), ("shape", "Shape"), ("legs-tail", "Legs & tail"), ("movement", "Movement"), ("stamina", "Stamina"), ("character", "Character"), ("glow", "Glow"), ("charge", "Charge")]
def load_emblem(cid):
    rows = [l.rstrip("\n") for l in open(os.path.join(HERE, "source", cid + ".txt"), encoding="utf-8") if not l.startswith(";") and l.strip()]
    assert len(rows) == N and all(len(r) == N and set(r) <= set("#+.") for r in rows), cid + ": the drawing must be 24 rows of 24 of # + ."
    return rows

def render(rows, state):
    base, lit = STATES[state]; bi = NAMES.index(base); li = NAMES.index(LIGHTER[base])
    return [[T if ch == "." else (li if (ch == "+" and lit) else bi) for ch in r] for r in rows]

# ---------- indexed PNG writer (standard library)
def png(path, w, h, rows, palette=True):
    def chunk(t, d): return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
    raw = b"".join(b"\x00" + bytes(r) for r in rows)
    plte = b"".join(bytes(c) for c in RGB) + bytes((0, 0, 0)); trns = bytes([255] * 62 + [0])
    open(path, "wb").write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 3, 0, 0, 0)) + chunk(b"PLTE", plte) + chunk(b"tRNS", trns) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))
def scale(rows, k): return [[v for v in r for _ in range(k)] for r in rows for _ in range(k)]

def main():
    out = os.path.join(HERE, "round2"); os.makedirs(out, exist_ok=True); slices = os.path.join(HERE, "..", "slices"); GAP = 2
    states = list(STATES); W = len(states) * (N + GAP) + GAP; H = len(CHAPTERS) * (N + GAP) + GAP; sheet = [[T] * W for _ in range(H)]; atlas = {}; manifest = {}
    for r, (cid, word) in enumerate(CHAPTERS):
        rows = load_emblem(cid)
        for k, s in enumerate(states):
            g = render(rows, s); x0 = GAP + k * (N + GAP); y0 = GAP + r * (N + GAP)
            for y in range(N): sheet[y0 + y][x0:x0 + N] = g[y]
            name = f"rail-emblem-{cid}-{s}-24x24"; png(os.path.join(slices, name + ".png"), N, N, g)
            h = hashlib.sha256(open(os.path.join(slices, name + ".png"), "rb").read()).hexdigest()
            atlas[name] = {"rect": [x0, y0, N, N], "sha256": h}
            manifest[name] = {"size": [N, N], "rect": None, "src": "emblems/source/" + cid + ".txt", "made": "hand-pixelled at 24x24 on the Station palette (indexed, 62 colours, index 62 transparent); state = colour only", "sha256": h, "policy": "stationChrome", "status": "round 2, for the art director's sign-off"}
    png(os.path.join(out, "emblems-sheet.png"), W, H, sheet); png(os.path.join(out, "contact-1x.png"), W, H, sheet); png(os.path.join(out, "contact-2x.png"), W * 2, H * 2, scale(sheet, 2))
    json.dump({"palette": {"file": "prototypes/ui/palettes/station.json", "colours": 62, "transparentIndex": 62}, "columns": states, "rows": [c[0] for c in CHAPTERS], "sprites": atlas, "manifest": manifest, "status": "round 2: the picked motifs hand-pixelled, three states each"}, open(os.path.join(out, "emblems-atlas.json"), "w"), indent=1)
    mp = os.path.join(slices, "manifest.json"); m = json.load(open(mp)); m.update({k: {kk: vv for kk, vv in v.items() if kk in ("size", "rect", "src", "made", "sha256")} for k, v in manifest.items()}); json.dump(m, open(mp, "w"), indent=1)
    print("sheet", W, H, len(atlas), "sprites")
if __name__ == "__main__": main()
