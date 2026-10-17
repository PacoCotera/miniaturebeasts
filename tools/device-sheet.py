#!/usr/bin/env python3
"""The device sheet (T-20261016-167): every Station screen and its key states at 1x, in flow order, on one large PNG, each labelled inside the image.
It reads the committed goldens of the code repository's heads with `git show` (no checkout), as tools/device-sheet.json lists them.

  python3 tools/device-sheet.py OUT.png [--repo PATH] [--fetch] [--cols N] [--only Row,Row] [--proof CELL=PATH ...]

  --repo PATH   the code repository (default: this repository, where the heads are branches)
  --fetch       `git fetch origin` the two batch heads first
  --cols N      frames to a row (default 4, the widest row); a longer family wraps
  --only        draw only these rows, by name (default: all)
  --proof C=P   a proposed proof beside the screen it replaces: the cell C (its id in the JSON, e.g. cargo-report) gets P (a PNG, 1x) to its right, labelled PROPOSED; repeat for more
The sheet is 1x: a frame is 1024 x 600 and is never scaled. Needs Python 3 and Pillow."""
import argparse, io, json, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
FW, FH, GUT, LABEL, ROWHEAD, MARGIN = 1024, 600, 24, 32, 56, 32
BG, INK, DIM, ACC, PROP = (24, 26, 30), (241, 235, 223), (141, 138, 166), (255, 180, 74), (120, 220, 160)

def font(size):
    for p in ("/usr/share/fonts/opentype/inter/Inter-Medium.otf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"):
        if os.path.exists(p): return ImageFont.truetype(p, size)
    return ImageFont.load_default(size)

def golden(repo, ref, path):
    r = subprocess.run(["git", "-C", repo, "show", f"{ref}:prototypes/face/golden/{path}"], capture_output=True)
    if r.returncode != 0: return None
    return Image.open(io.BytesIO(r.stdout)).convert("RGB")

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("out"); ap.add_argument("--repo", default=os.path.join(HERE, ".."))
    ap.add_argument("--fetch", action="store_true"); ap.add_argument("--cols", type=int, default=4)
    ap.add_argument("--only", default=""); ap.add_argument("--proof", action="append", default=[])
    a = ap.parse_args()
    cfg = json.load(open(os.path.join(HERE, "device-sheet.json")))
    if a.fetch:
        for r in cfg["refs"].values(): subprocess.run(["git", "-C", a.repo, "fetch", "-q", "origin", r.replace("origin/", "")], check=True)
    proofs = dict(p.split("=", 1) for p in a.proof)
    known = {c[0] for row in cfg["rows"] for c in row["cells"]}
    for k in proofs:
        if k not in known: sys.exit(f"--proof {k}: no such cell; the cells are: {', '.join(sorted(known))}")
    only = {s.strip() for s in a.only.split(",") if s.strip()}
    rows = [r for r in cfg["rows"] if not only or r["name"] in only]
    if only and len(rows) != len(only): sys.exit(f"--only: the rows are {', '.join(r['name'] for r in cfg['rows'])}")
    F, Fs, Fb = font(20), font(16), font(28)
    # a layout pass: each family wraps at --cols frames; a cell with a proof takes two slots
    lines = []
    for row in rows:
        cur, used = [], 0
        for cell in row["cells"]:
            w = 2 if cell[0] in proofs else 1
            if used + w > a.cols and cur: lines.append((row, cur)); cur, used = [], 0
            cur.append(cell); used += w
        if cur: lines.append((row, cur))
    width = MARGIN * 2 + a.cols * FW + (a.cols - 1) * GUT
    height = MARGIN + sum(ROWHEAD + LABEL + FH + GUT for _ in lines) + MARGIN
    sheet = Image.new("RGB", (width, height), BG); d = ImageDraw.Draw(sheet); y = MARGIN; missing = []; seen = set()
    d.text((MARGIN, 4), "THE STATION AS IT STANDS · 1x · flow order: " + " > ".join(r["name"] for r in rows), font=Fs, fill=DIM)
    for row, cells in lines:
        head = row["name"] + ("" if row["name"] not in seen else " (continued)"); seen.add(row["name"])
        d.text((MARGIN, y + 8), head, font=Fb, fill=ACC); d.text((MARGIN + 400, y + 18), f'from {cfg["refs"][row["ref"]]}', font=Fs, fill=DIM); y += ROWHEAD
        x = MARGIN
        for cid, path, label in cells:
            for kind, src in (("", None), ("PROPOSED", proofs.get(cid))):
                if kind and not src: continue
                im = Image.open(src).convert("RGB") if src else golden(a.repo, cfg["refs"][row["ref"]], path)
                tag = f"{cid} · {label}" if not kind else f"PROPOSED, beside {cid}"
                d.text((x, y + 4), tag, font=F, fill=PROP if kind else INK)
                if im is None: missing.append(f"{cid}: {path} at {cfg['refs'][row['ref']]}"); d.rectangle([x, y + LABEL, x + FW - 1, y + LABEL + FH - 1], outline=DIM); d.text((x + 16, y + LABEL + 16), "golden not found", font=F, fill=DIM)
                else:
                    if im.size != (FW, FH) and not kind: missing.append(f"{cid}: {path} is {im.size}, not {FW}x{FH}")
                    sheet.paste(im, (x, y + LABEL))
                x += FW + GUT
        y += LABEL + FH + GUT
    sheet = sheet.crop((0, 0, width, min(height, y + MARGIN - GUT)))
    sheet.save(a.out, optimize=True)
    print(f"{a.out}: {sheet.width} x {sheet.height}, {sum(len(c) for _, c in lines)} frames{', ' + str(len(proofs)) + ' proposed' if proofs else ''}")
    if missing: print("MISSING:\n  " + "\n  ".join(missing)); sys.exit(1)

main()
