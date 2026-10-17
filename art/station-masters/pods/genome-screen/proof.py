"""T-20261016-130 proofs at 1x, composed at specs/station-genome-screen-spec.md's rects, labelled inside each image.
- genome-create-S03-1x.png: Create, shape, S03 (8 chapters, 4 look rows). Coat: Colour as the pod is, Trim a blend, Markings the switch with
  its five sleeping loci behind the gate bar, Scales changed (copy 2 chosen, lit, the notch). Face: Crest changed and a first (focused: the
  focus ring; the bay shows its two copies, copy 1 dropped under the veil, copy 2 kept in the mint frame). Legs and tail: Feet inherited-only.
  Movement: four inherited-only, the dotted line to the cross mark. Stamina and Character unread (frost; the gold glint where the pod
  glints). Glow: two self-changing genes, the place badge on the first. The bank: S03's drums from x 240, the focused Crest turned.
- genome-create-S03-clash-1x.png: the same with Crest and Build clashing: the two red rims and the dashed red link.
- genome-incubator-S03-{cool,warm,glowing,ready}-1x.png: the Incubator with the compact screen in the slip's place (88, 96): Stamina just
  cleared (its frost cut to its genes, the 2 px mint pulse), Character and Glow still frost; and the brightness margins, recorded.
Lines (trunk, branches, the dotted and red links, the gate bar and loci dots, the bay's frames, the pulse) are palette rectangles, as the face
draws them. Stand-ins (the build's): the pod (S03's shell from the pod-large layers), the founder (S03's painted adult), the contact shadow,
the bottom line (the golden's), the drum faces without a close-up (left empty), the chapter words, the card and slip words.
usage: python3 -I genome-screen/proof.py SLICES GENOME_DIR GOLDEN_DIR FONTS INCUBATOR_FRAMES_DIR OUT   (run in art/station-masters/pods)"""
import sys, os, json, numpy as np
from PIL import Image, ImageDraw, ImageFont
sl, gd, gold, fonts, incf, out = sys.argv[1:7]; os.makedirs(out, exist_ok=True)
Lo = lambda p: Image.open(p).convert("RGBA")
S = lambda n: Lo(os.path.join(gd, n + ".png")) if os.path.exists(os.path.join(gd, n + ".png")) else Lo(os.path.join(sl, n + ".png"))
F = lambda w, z: ImageFont.truetype(os.path.join(fonts, f"Inter-{w}.ttf"), z)
pal = dict(json.load(open(os.path.join(sl, "../../../../prototypes/ui/palettes/station.json")))["colours"])
C = lambda n: tuple(int(pal[n][i:i + 2], 16) for i in (1, 3, 5))
def lin(c): c = np.asarray(c, float) / 255; return np.where(c <= .04045, c / 12.92, ((c + .055) / 1.055) ** 2.4)
Y = lambda a: lin(a[..., :3]) @ np.array([.2126, .7152, .0722])
LINE, DOT = C("sageD"), C("stone")
def rect(f, x, y, w, h, col): ImageDraw.Draw(f).rectangle([x, y, x + w - 1, y + h - 1], fill=col)
def gene(f, x, y, kind, pair=None, first=False, glint=None, place=None):
    f.alpha_composite(S(f"genome-gene-{kind}-24x24"), (x, y))
    if pair: f.alpha_composite(S(f"genome-pair-{pair}-16x10"), (x + 4, y + 7))
    if first: f.alpha_composite(S("genome-first-10x8"), (x + 16, y))
    if glint: f.alpha_composite(S(f"genome-glint-{glint}-10x10"), (x + 16, y))
    if place: f.alpha_composite(S(f"genome-place-{place}-12x12"), (x + 25, y - 4))
def frost(f, x, y, glint=False):
    f.alpha_composite(S("genome-frost-24x24"), (x, y))
    if glint: f.alpha_composite(S("genome-glint-gold-10x10"), (x + 16, y))
# S03's rows, as the proof's bud has them: (chapter, read, [(kind, pair, first, glint, place) or "frost"/("frost", glint)])
ROWS = [("coat", True, [("open", "front-dim"), ("open", "blend-dim"), ("open", "front-dim", "switch"), ("open-lit", "second-lit")]),
        ("face", True, [("open-lit", "second-lit", "first"), ("open", "front-dim"), ("open", "front-dim")]),
        ("shape", True, [("open", "front-dim"), ("open", "front-dim"), ("open", "front-dim")]),
        ("legs-tail", True, [("open", "front-dim"), ("closed",), ("open", "front-dim"), ("open", "front-dim")]),
        ("movement", True, [("closed",)] * 4),
        ("stamina", False, ["frost-glint", "frost", "frost"]),
        ("character", False, ["frost", "frost"]),
        ("glow", True, [("self", "front-dim", None, None, "meadow"), ("self", "front-dim")])]
def tree(f, ox, oy, gx0, pitch, compact=False, clash=False, rows=ROWS, pulse_row=None):
    tops = [oy + 5 + 34 * i for i in range(len(rows))]; trunk = ox + (30 if not compact else 2)
    rect(f, trunk, tops[0] + 16, 2, tops[-1] - tops[0] + 2, LINE)                    # the trunk
    if not compact:
        Lr = 4; hy = oy + 5 + 34 * Lr - 13; f.alpha_composite(S("genome-hub-S03-24x24"), (ox, hy)); f.alpha_composite(S("genome-lock-8x10"), (ox + 8, hy - 12))
    for i, (ch, read, genes) in enumerate(rows):
        t = tops[i]; n = len(genes); xend = gx0 + pitch * (n - 1) + 24
        rect(f, trunk + 2, t + 15, xend - trunk - 2, 2, LINE)                            # the branch
        if not compact: f.alpha_composite(S(f"rail-emblem-{ch}-{'read' if read else 'unread'}-24x24"), (ox + 36, t + 4))
        for j, g in enumerate(genes):
            x, y = gx0 + pitch * j, t + 4
            if isinstance(g, str): frost(f, x, y, g == "frost-glint"); continue
            kind = g[0]; pr = g[1] if len(g) > 1 else None
            if clash and ((ch == "face" and j == 0) or (ch == "shape" and j == 0)): kind = "open-clash"
            gene(f, x, y, kind, pr, first=(len(g) > 2 and g[2] == "first"), place=(g[4] if len(g) > 4 else None))
            if len(g) > 2 and g[2] == "switch":                                          # the gate bar and the sleeping loci
                if compact: rect(f, x + 25, y + 2, 2, 20, DOT)
                else:
                    rect(f, x + 26, y + 2, 2, 20, DOT)
                    for k in range(5): rect(f, x + 30, y + 3 + 4 * k, 3, 3, DOT)
            if pulse_row == i:                                                           # a chapter just cleared: the 2 px mint pulse
                d = ImageDraw.Draw(f); d.rectangle([x - 2, y - 2, x + 25, y + 25], outline=C("mint"), width=2)
        if ch == "movement":                                                             # toward the Cross: the dotted line, the cross mark
            cx = (720 if not compact else 264); xs = xend + 2
            while xs < cx - 2: rect(f, xs, t + 16, 1, 1, DOT); xs += 3
            f.alpha_composite(S("genome-cross-12x12"), (cx, t + 10))
    if clash and not compact:                                                            # the dashed red link: crest (row 1) to build (row 2)
        a = (gx0, tops[1] + 16); b = (gx0, tops[2] + 16); xm = gx0 - 7
        def dash(x0, y0, x1, y1):
            if y0 == y1:
                for xx in range(min(x0, x1), max(x0, x1), 6): rect(f, xx, y0 - 1, min(4, max(x0, x1) - xx), 2, C("red"))
            else:
                for yy in range(min(y0, y1), max(y0, y1), 6): rect(f, x0 - 1, yy, 2, min(4, max(y0, y1) - yy), C("red"))
        dash(xm, a[1], a[0], a[1]); dash(xm, a[1], xm, b[1]); dash(xm, b[1], b[0], b[1])
    return tops
def pod_s03(w, h):
    g = lambda n: np.asarray(Lo(f"{sl}/pod-large-{n}.png")).astype(float)
    A, B = np.array([0x26, 0x9f, 0xa5], float), np.array([0xe8, 0xb8, 0x3f], float)
    shade = g("shade"); body, acc, pt = g("mask-body")[..., 3] / 255, g("mask-accent")[..., 3] / 255, g("pattern-plates")[..., 3] / 255
    rel = g("pattern-plates-relief")[..., :3].mean(2) / 255
    col = (A * (body * (1 - pt))[..., None] + B * np.minimum(1, acc + pt)[..., None]) * (2 * shade[..., :3] / 255) * (2 * rel[..., None])
    alpha = np.maximum(body, acc) * (shade[..., 3] / 255 > 0)
    return Image.fromarray(np.dstack([np.clip(col, 0, 255), alpha * 255]).astype(np.uint8), "RGBA").resize((w, h), Image.LANCZOS)
def label(f, s, y):
    d = ImageDraw.Draw(f); lb = F("Medium", 16); d.rectangle([8, y, 16 + d.textlength(s, font=lb), y + 24], fill=(0, 0, 0)); d.text((12, y + 3), s, font=lb, fill=(255, 255, 255))
def create(clash=False):
    f = Lo(os.path.join(gold, "create", "create-shape.png")); f.alpha_composite(S("create-bench"), (0, 40))
    f.alpha_composite(S("create-port-128x122"), (96, 404)); f.alpha_composite(pod_s03(112, 136), (100, 394))
    f.alpha_composite(S("create-dish-320x28"), (88, 364))
    fa = np.asarray(S("mibi-adult-S03-304x312"))[..., 3]; fb = np.nonzero((fa > 128).any(1))[0].max(); cols = np.nonzero((fa[fb - 20:fb + 1] > 128).any(0))[0]
    yy, xx = np.mgrid[0:600, 0:1024] + .5; e = ((xx - (96 + (cols.min() + cols.max()) / 2)) / ((cols.max() - cols.min()) / 2 + 8)) ** 2 + ((yy - (76 + fb - 2)) / 6) ** 2
    from scipy import ndimage as ndi
    sh = ndi.gaussian_filter((e < 1).astype(float), 2.5) * 0.55; fr = np.asarray(f).astype(float); fr[..., :3] *= (1 - sh)[..., None]; f = Image.fromarray(fr.astype(np.uint8), "RGBA")
    f.alpha_composite(S("mibi-adult-S03-304x312"), (96, 76))
    f.alpha_composite(S("create-genome-screen-512x312"), (424, 80))
    tree(f, 440, 96, 508, 36, clash=clash)
    f.alpha_composite(S("genome-focus-32x32"), (508 - 4, 96 + 5 + 34 + 4 - 4))
    f.alpha_composite(S("trait-S03-crest-low-crest-160x128"), (752, 100)); f.alpha_composite(S("genome-veil-160x128"), (752, 100))
    f.alpha_composite(S("trait-S03-crest-tall-crest-160x128"), (752, 244))
    d = ImageDraw.Draw(f); d.rectangle([752, 244, 752 + 159, 244 + 127], outline=C("mint"), width=2)
    f.alpha_composite(S("genome-pair-second-lit-16x10"), (744 + 80, 96 + 135))
    # the bank (window 240-920): S03's drums, g 8, the chapter gap 24; Crest focused and turned
    drums = [("rest", None), ("rest", None), ("rest", "look-S03-markings-plain-64x64"), ("rest", "look-S03-scales-many-coarse-64x64"),
             ("clash" if clash else "rest", "look-S03-crest-tall-crest-64x64"), ("rest", None), ("rest", None)]
    xs = [240, 328, 416, 504, 608, 696, 784]
    for k, ((st, look), x) in enumerate(zip(drums, xs)):
        if look: f.alpha_composite(S(look), (x + 8, 440))
        f.alpha_composite(S(f"create-drum-{st}"), (x, 424)); f.alpha_composite(S("create-drum-shade-80x96"), (x, 424))
        if k in (3, 4): f.alpha_composite(S("create-drum-notch"), (x + 72, 464))
        if k == 4: f.alpha_composite(S("create-drum-turn-up"), (x + 32, 424)); f.alpha_composite(S("create-drum-turn-down"), (x + 32, 512))
    f.alpha_composite(S("create-bank-more-right"), (904, 424))
    d = ImageDraw.Draw(f)
    for wd, x in (("Coat", 240), ("Face", 608)): d.text((x, 400), wd, font=F("Regular", 16), fill=C("mist"))
    label(f, "PROOF T-20261016-130: Create, S03, shape" + (", Crest and Build clash" if clash else ": a change, a first, Crest focused") + ", 1x. Pod, founder, words: stand-ins", 538)
    return f.convert("RGB")
create().save(os.path.join(out, "genome-create-S03-1x.png")); create(True).save(os.path.join(out, "genome-create-S03-clash-1x.png"))
# the Incubator: the compact screen in the slip's place; Stamina just cleared
st = Lo(os.path.join(sl, "incubator-stage.png"))
inc_rows = [r if r[0] != "stamina" else ("stamina", True, [("closed",)] * 3) for r in ROWS]
inc_rows = [r if r[0] != "glow" else ("glow", False, ["frost", "frost"]) for r in inc_rows]
meas = {}
for state in ("cool", "warm", "glowing", "ready"):
    f = Lo(os.path.join(incf, f"incubator-b-S03-{state}-1x.png"))
    f.paste(st.crop((88, 56, 310, 464)), (88, 96))                                       # the slip's place (and its overflowing words), back to the stage
    f.alpha_composite(S("incubator-genome-screen-208x312"), (88, 96))
    tree(f, 104, 104, 114, 28, compact=True, rows=inc_rows, pulse_row=5)
    a = np.asarray(f.convert("RGB")).astype(float); y = Y(a)
    pod = float(np.percentile(y[144:416, 400:624], 95)); scr = float(np.percentile(y[96:408, 88:296], 95))
    meas[state] = {"pod p95": round(pod, 3), "screen p95": round(scr, 3), "margin": round(pod - scr, 3)}
    label(f, f"PROOF T-20261016-130: the Incubator, S03, {state}: the compact screen, Stamina just cleared, 1x. Card, slip words: stand-ins", 538)
    f.convert("RGB").save(os.path.join(out, f"genome-incubator-S03-{state}-1x.png"))
json.dump(meas, open(os.path.join(out, "brightness.json"), "w"), indent=1); print(json.dumps(meas))
# the mark family at 1x and 4x on the slate, and the chapter emblems checked on the slate (read and unread)
sheet = Image.new("RGBA", (8 + 7 * 34, 8 + 3 * 34 + 8), (24, 28, 32, 255))
fam = [("open", "front-dim"), ("open", "blend-dim"), ("open-lit", "second-lit"), ("open-lit", "first-lit"), ("open-clash", "front-dim"), ("closed", None), ("self", "front-dim")]
for i, (k, p) in enumerate(fam): gene(sheet, 8 + i * 34, 8, k, p, first=(i == 3), place=("meadow" if k == "self" else None))
frost(sheet, 8, 42, True); gene(sheet, 42, 42, "open", "front-dim", glint="wish"); sheet.alpha_composite(S("genome-sealed-crystal-24x24"), (76, 42))
sheet.alpha_composite(S("genome-sealed-pearl-24x24"), (110, 42)); sheet.alpha_composite(S("genome-sealed-shard-24x24"), (144, 42))
sheet.alpha_composite(S("genome-hub-S03-24x24"), (178, 42)); sheet.alpha_composite(S("genome-lock-8x10"), (186, 30 + 0)); sheet.alpha_composite(S("genome-cross-12x12"), (212, 48))
sheet.alpha_composite(S("genome-focus-32x32"), (4, 72)); gene(sheet, 8, 76, "open", "front-dim")
for i, pl_ in enumerate(("meadow", "pond", "rock", "wood", "cave")): sheet.alpha_composite(S(f"genome-place-{pl_}-12x12"), (48 + i * 16, 82))
sheet.convert("RGB").save(os.path.join(out, "genome-marks-1x.png")); sheet.resize((sheet.width * 4, sheet.height * 4), Image.NEAREST).convert("RGB").save(os.path.join(out, "genome-marks-4x.png"))
EMB = ["coat", "face", "shape", "legs-tail", "movement", "stamina", "character", "glow", "charge"]
em = Image.new("RGBA", (8 + len(EMB) * 32, 8 + 2 * 32), (24, 28, 32, 255))
for i, e_ in enumerate(EMB):
    for j, st_ in enumerate(("read", "unread")): em.alpha_composite(S(f"rail-emblem-{e_}-{st_}-24x24"), (8 + i * 32, 8 + j * 32))
em.convert("RGB").save(os.path.join(out, "emblems-on-slate-1x.png")); em.resize((em.width * 3, em.height * 3), Image.NEAREST).convert("RGB").save(os.path.join(out, "emblems-on-slate-3x.png"))
print("sheets written")
