"""T-20261016-130 proofs at 1x (redone for T-20261016-138 against the redrawn wireframes 01, 02 and 06: the real S03 frame), composed at specs/station-genome-screen-spec.md's rects, labelled inside each image.
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
def gene(f, x, y, kind, pair=None, first=False, wish=False, places=()):
    f.alpha_composite(S(f"genome-gene-{kind}-24x24"), (x, y))
    if pair: f.alpha_composite(S(f"genome-pair-{pair}-16x10"), (x + 4, y + 7))
    if wish: f.alpha_composite(S("genome-glint-wish-10x10"), (x + 16, y))
    elif first: f.alpha_composite(S("genome-first-10x8"), (x + 16, y))
    for k, pl_ in enumerate(places): f.alpha_composite(S(f"genome-place-{pl_}-10x10"), (x + 25, y - 2 + 11 * k))
def frost(f, x, y): f.alpha_composite(S("genome-frost-24x24"), (x, y))
# S03's rows from its frame (T-136, wireframe 01): (chapter, read, glint on the chapter, [gene]); a gene is a dict
G = lambda kind, pair=None, **k: dict(kind=kind, pair=pair, **k)
ROWS = [("coat", True, False, [G("open-lit", "first-lit"), G("open", "front-dim"), G("open", "front-dim", switch=True), G("only", "only")]),
        ("face", True, False, [G("open", "front-dim"), G("open-lit", "second-lit", first=True), G("only", "only")]),
        ("shape", True, False, [G("open", "front-dim"), G("only", "only"), G("open", "front-dim", wish=True)]),
        ("legs-tail", True, False, [G("open", "front-dim"), G("closed"), G("only", "only"), G("open", "blend-dim")]),
        ("movement", True, False, [G("closed")] * 4),
        ("stamina", False, True, ["frost"] * 3),
        ("character", False, False, ["frost"] * 2),
        ("glow", True, False, [G("self", places=("cave", "wood")), G("closed")])]
def tree(f, ox, oy, gx0, pitch, compact=False, clash=(), rows=ROWS, pulse_row=None):
    tops = [oy + 5 + 34 * i for i in range(len(rows))]; trunk = ox + (30 if not compact else 2)
    rect(f, trunk, tops[0] + 16, 2, tops[-1] - tops[0] + 2, LINE)                    # the frame line
    if not compact:
        Lr = 4; hy = oy + 5 + 34 * Lr - 13; f.alpha_composite(S("genome-hub-S03-24x24"), (ox, hy)); f.alpha_composite(S("genome-lock-8x10"), (ox + 8, hy - 12))
    for i, (ch, read, glint, genes) in enumerate(rows):
        t = tops[i]; n = len(genes); xend = gx0 + pitch * (n - 1) + 24
        rect(f, trunk + 2, t + 15, xend - trunk - 2, 2, LINE)                            # the chapter line
        if not compact:
            f.alpha_composite(S(f"rail-emblem-{ch}-{'read' if read else 'unread'}-24x24"), (ox + 36, t + 4))
            if glint: f.alpha_composite(S("genome-glint-gold-12x12"), (ox + 36 + 16, t + 4 - 4))   # once per chapter, on its emblem
        elif glint: f.alpha_composite(S("genome-glint-gold-12x12"), (gx0 + 16, t + 4 - 4))           # compact: at the row's first gene
        for j, g in enumerate(genes):
            x, y = gx0 + pitch * j, t + 4
            if g == "frost": frost(f, x, y); continue
            kind = g["kind"]
            if (ch, j) in clash: kind = "open-lit-clash" if kind == "open-lit" else "open-clash"
            gene(f, x, y, kind, g["pair"], first=g.get("first", False), wish=g.get("wish", False), places=(() if compact else g.get("places", ())))
            if g.get("switch") and read:                                                 # the gate bar and the sleeping loci (never on an unread row)
                if compact: rect(f, x + 25, y + 2, 2, 20, DOT)
                else:
                    rect(f, x + 26, y + 2, 2, 20, DOT)
                    for k in range(5): rect(f, x + 30, y + 3 + 4 * k, 3, 3, DOT)
            if pulse_row == i:                                                           # a chapter just cleared: the 2 px mint pulse
                ImageDraw.Draw(f).rectangle([x - 2, y - 2, x + 25, y + 25], outline=C("mint"), width=2)
        last = genes[-1]
        if read and isinstance(last, dict) and last["kind"] == "closed":                 # to the Cross: only from a breed-only last gene
            cx = (720 if not compact else 264); xs = xend + 2
            while xs < cx - 2: rect(f, xs, t + 16, 1, 1, DOT); xs += 3
            f.alpha_composite(S("genome-cross-12x12"), (cx, t + 10))
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
    rows = ROWS if not clash else [r if r[0] != "shape" else ("shape", True, False, [G("open-lit", "second-lit"), G("only", "only"), G("open", "front-dim", wish=True)]) for r in ROWS]
    tree(f, 440, 96, 508, 36, clash=(("face", 1), ("shape", 0)) if clash else (), rows=rows)
    f.alpha_composite(S("genome-focus-32x32"), (508 + 36 - 4, 96 + 5 + 34 + 4 - 4))
    # the bay: S03's Eyes have no picture yet, so each copy's frame shows the gene's mark, centred (spec §2.3, "No picture")
    for yb in (100, 244): rect(f, 752, yb, 160, 128, (30, 35, 40))
    gene(f, 752 + 68, 100 + 52, "open", "first-dim"); f.alpha_composite(S("genome-veil-160x128"), (752, 100))
    gene(f, 752 + 68, 244 + 52, "open-lit", "second-lit")
    d = ImageDraw.Draw(f); d.rectangle([752, 244, 752 + 159, 244 + 127], outline=C("mint"), width=2)
    f.alpha_composite(S("genome-pair-second-lit-16x10"), (744 + 80, 96 + 135))
    f.alpha_composite(S("genome-key-research-12x12"), (744 + 156, 96 + 4))              # T-140: the R mark on the bay
    # the bank (window 240-920): S03's drums, g 8, the chapter gap 24; Crest focused and turned
    if not clash:                                                                   # Coat and Face in the window; Eyes focused
        drums = [(240, "rest", None, False), (328, "rest", None, False), (416, "rest", "look-S03-markings-plain-64x64", False), (504, "rest", "look-S03-scales-between-64x64", False),
                 (608, "rest", "look-S03-crest-between-64x64", False), (696, "rest", None, True), (784, "rest", None, False)]
        notched = (240, 696); focus_x = 696
    else:                                                                           # the tray slid: Face and Shape in view, the clash set red
        f.alpha_composite(S("create-bank-more-left"), (240, 424))
        drums = [(264, "rest", "look-S03-crest-between-64x64", False), (352, "clash", None, True), (440, "rest", None, False),
                 (544, "clash", None, False), (632, "rest", None, False), (720, "rest", None, False)]
        notched = (352, 544); focus_x = 352
    for x, st, look, foc in drums:
        if look: f.alpha_composite(S(look), (x + 8, 440))
        f.alpha_composite(S(f"create-drum-{st}"), (x, 424)); f.alpha_composite(S("create-drum-shade-80x96"), (x, 424))
        if x in notched: f.alpha_composite(S("create-drum-notch"), (x + 72, 464))
        if foc: f.alpha_composite(S("create-drum-turn-up"), (x + 32, 424)); f.alpha_composite(S("create-drum-turn-down"), (x + 32, 512))
    f.alpha_composite(S("create-bank-more-right"), (904, 424))
    d = ImageDraw.Draw(f)
    for wd, x in ((("Coat", 240), ("Face", 608)) if not clash else (("Face", 264), ("Shape", 544))): d.text((x, 400), wd, font=F("Regular", 16), fill=C("mist"))
    bar = f.getpixel((300, 590)); d.rectangle([930, 566, 1016, 594], fill=bar)               # the bottom line's stand-in: "← Tuikis" on S03
    d.text((1008, 579), "Tuikis", font=F("Regular", 16), fill=(0xc6, 0xc4, 0xd8), anchor="rm"); d.text((1008 - 56 - 8, 579), "\u2190", font=F("Regular", 16), fill=(0xc6, 0xc4, 0xd8), anchor="rm")
    if clash:                                                                       # no ✓ cap in clash: Grow it is not offered
        d.rectangle([8, 566, 120, 594], fill=bar); d.text((16, 579), "Grow it", font=F("Regular", 16), fill=C("stone"), anchor="lm")
    label(f, "PROOF T-20261016-145: Create, S03 (its frame), shape" + (": clash set Eyes + Build, tray slid, no Grow" if clash else ": Eyes kept, new to the guide, focused") + ", 1x. Pod, founder, words: stand-ins", 538)
    return f.convert("RGB")
create().save(os.path.join(out, "genome-create-S03-1x.png")); create(True).save(os.path.join(out, "genome-create-S03-clash-1x.png"))
# the Incubator: the compact screen in the slip's place; Stamina just cleared
st = Lo(os.path.join(sl, "incubator-stage.png"))
def inc_rows_for(state):                                                            # Stamina clears at 1/3, Character at 2/3 (k+1)/(n+1)
    st_ = ("stamina", True, False, [G("closed")] * 3) if state != "cool" else ("stamina", False, True, ["frost"] * 3)
    chr_ = ("character", True, False, [G("closed")] * 2) if state in ("glowing", "ready") else ("character", False, True, ["frost"] * 2)
    rows = [st_ if r[0] == "stamina" else chr_ if r[0] == "character" else r for r in ROWS]
    pulse = {"warm": 5, "glowing": 6}.get(state)
    card = {"cool": ("stamina", False, "Stamina", None), "warm": ("stamina", True, "Stamina", "goes long"),
            "glowing": ("character", True, "Character", "unflappable"), "ready": ("character", True, "Character", "unflappable")}[state]
    return rows, pulse, card
meas = {}
for state in ("cool", "warm", "glowing", "ready"):
    f = Lo(os.path.join(incf, f"incubator-b-S03-{state}-1x.png"))
    f.paste(st.crop((88, 56, 310, 464)), (88, 96))                                       # the slip's place (and its overflowing words), back to the stage
    f.alpha_composite(S("incubator-genome-screen-208x312"), (88, 96))
    rows_, pulse_, (ech, eread, cword, clook) = inc_rows_for(state)
    tree(f, 104, 104, 114, 28, compact=True, rows=rows_, pulse_row=pulse_)
    f.alpha_composite(Lo(os.path.join(sl, "incubator-card-ground.png")), (728, 96)); d = ImageDraw.Draw(f)   # the card: the chapter just cleared
    d.text((744, 108), "Just cleared" if eread else "Next to clear", font=F("Regular", 16), fill=C("sand"))
    em = Lo(os.path.join(sl, f"rail-emblem-{ech}-{'read' if eread else 'unread'}-24x24.png")).resize((72, 72), Image.NEAREST)   # doings have no picture: the emblem (§5)
    rect(f, 752, 140, 160, 128, (22, 42, 55)); f.alpha_composite(em, (752 + 44, 140 + 28)); d = ImageDraw.Draw(f)
    d.text((744, 284), cword, font=F("Medium", 16), fill=C("bone"))
    if clook: d.text((744, 308), clook, font=F("Regular", 16), fill=(0x8d, 0x8a, 0xa6))
    a = np.asarray(f.convert("RGB")).astype(float); y = Y(a)
    pod = float(np.percentile(y[144:416, 400:624], 95)); scr = float(np.percentile(y[96:408, 88:296], 95))
    meas[state] = {"pod p95": round(pod, 3), "screen p95": round(scr, 3), "margin": round(pod - scr, 3)}
    label(f, f"PROOF T-20261016-145: the Incubator, S03, {state}: " + {"cool": "Stamina and Character unread", "warm": "Stamina just cleared", "glowing": "Character just cleared", "ready": "every chapter known"}[state] + ", 1x. Card words: stand-ins", 538)
    f.convert("RGB").save(os.path.join(out, f"genome-incubator-S03-{state}-1x.png"))
json.dump(meas, open(os.path.join(out, "brightness.json"), "w"), indent=1); print(json.dumps(meas))
# the mark family at 1x and 4x on the slate, and the chapter emblems checked on the slate (read and unread)
sheet = Image.new("RGBA", (8 + 8 * 34, 8 + 3 * 34 + 8), (24, 28, 32, 255))
fam = [("open", "front-dim"), ("open", "blend-dim"), ("only", "only"), ("open-lit", "second-lit"), ("open-lit", "first-lit"), ("open-clash", "front-dim"), ("closed", None)]
for i, (k, p) in enumerate(fam): gene(sheet, 8 + i * 34, 8, k, p, first=(i == 4))
frost(sheet, 8, 42); gene(sheet, 42, 42, "open", "front-dim", wish=True); sheet.alpha_composite(S("genome-sealed-crystal-24x24"), (76, 42))
sheet.alpha_composite(S("genome-sealed-pearl-24x24"), (110, 42)); gene(sheet, 144, 42, "self", places=("cave", "wood"))
sheet.alpha_composite(S("genome-sealed-shard-24x24"), (178 + 34 + 30, 76)); gene(sheet, 178 + 34 + 64 - 34, 76, "self", places=("storm",)); gene(sheet, 8 + 7 * 34, 8, "open-lit-clash", "second-lit")
sheet.alpha_composite(S("genome-hub-S03-24x24"), (186, 42)); sheet.alpha_composite(S("genome-glint-gold-12x12"), (202, 38)); sheet.alpha_composite(S("genome-cross-12x12"), (216, 48))
sheet.alpha_composite(S("genome-focus-32x32"), (4, 72)); gene(sheet, 8, 76, "open", "front-dim")
for i, pl_ in enumerate(("cave", "wood", "meadow", "pond", "rock", "storm")): sheet.alpha_composite(S(f"genome-place-{pl_}-10x10"), (48 + i * 14, 84))
sheet.convert("RGB").save(os.path.join(out, "genome-marks-1x.png")); sheet.resize((sheet.width * 4, sheet.height * 4), Image.NEAREST).convert("RGB").save(os.path.join(out, "genome-marks-4x.png"))
EMB = ["coat", "face", "shape", "legs-tail", "movement", "stamina", "character", "glow", "charge"]
em = Image.new("RGBA", (8 + len(EMB) * 32, 8 + 2 * 32), (24, 28, 32, 255))
for i, e_ in enumerate(EMB):
    for j, st_ in enumerate(("read", "unread")): em.alpha_composite(S(f"rail-emblem-{e_}-{st_}-24x24"), (8 + i * 32, 8 + j * 32))
em.convert("RGB").save(os.path.join(out, "emblems-on-slate-1x.png")); em.resize((em.width * 3, em.height * 3), Image.NEAREST).convert("RGB").save(os.path.join(out, "emblems-on-slate-3x.png"))
print("sheets written")
# T-20261016-143: Create on S01 for the owner (every drum and the bay with their pictures): shape, Crown changed (leaf crest, lit, the
# notch), focus on Eyes, so the bay shows its two copies (thin rings shown in the mint frame, wide pale rings carried behind the veil)
def pod_s01(w, h):
    g = lambda n: np.asarray(Lo(f"{sl}/pod-large-{n}.png")).astype(float)
    A, B = np.array([0x46, 0x54, 0x59], float), np.array([0xdf, 0xd2, 0xae], float)
    shade = g("shade"); body, acc, pt = g("mask-body")[..., 3] / 255, g("mask-accent")[..., 3] / 255, g("pattern-dots")[..., 3] / 255
    col = (A * (body * (1 - pt))[..., None] + B * np.minimum(1, acc + pt)[..., None]) * (2 * shade[..., :3] / 255)
    alpha = np.maximum(body, acc) * (shade[..., 3] / 255 > 0)
    return Image.fromarray(np.dstack([np.clip(col, 0, 255), alpha * 255]).astype(np.uint8), "RGBA").resize((w, h), Image.LANCZOS)
def create_s01():
    f = Lo(os.path.join(gold, "create", "create-shape.png")); f.alpha_composite(S("create-bench"), (0, 40))
    f.alpha_composite(S("create-port-128x122"), (96, 404)); f.alpha_composite(pod_s01(112, 136), (100, 394))
    f.alpha_composite(S("create-dish-320x28"), (88, 364))
    fa = np.asarray(S("founder-S01-base-304x312"))[..., 3]; fb = np.nonzero((fa > 128).any(1))[0].max(); cols = np.nonzero((fa[fb - 24:fb + 1] > 128).any(0))[0]
    yy, xx = np.mgrid[0:600, 0:1024] + .5; e = ((xx - (96 + (cols.min() + cols.max()) / 2)) / ((cols.max() - cols.min()) / 2 + 8)) ** 2 + ((yy - (76 + fb - 6)) / 8) ** 2
    from scipy import ndimage as ndi
    sh = ndi.gaussian_filter((e < 1).astype(float), 2.5) * 0.55; fr = np.asarray(f).astype(float); fr[..., :3] *= (1 - sh)[..., None]; f = Image.fromarray(fr.astype(np.uint8), "RGBA")
    f.alpha_composite(S("founder-S01-base-304x312"), (96, 76)); f.alpha_composite(S("founder-S01-crown-leaf-crest-304x312"), (96, 76))
    f.alpha_composite(S("create-genome-screen-512x312"), (424, 80))
    rows = [("coat", True, False, [G("open", "front-dim")]),                                  # Markings: a switch with no sleeping loci (no bar)
            ("face", True, False, [G("open-lit", "second-lit"), G("open", "front-dim")]),     # Crown changed (leaf crest kept), Eyes
            ("movement", True, False, [G("closed")]), ("stamina", True, False, [G("closed")])]
    tops = [96 + 5 + 34 * i for i in range(len(rows))]; trunk = 470
    rect(f, trunk, tops[0] + 16, 2, tops[-1] - tops[0] + 2, LINE)
    hy = 96 + 5 + 34 * 2 - 13; f.alpha_composite(S("genome-hub-S01-24x24"), (440, hy)); f.alpha_composite(S("genome-lock-8x10"), (448, hy - 12))
    for i, (ch, read, glint, genes) in enumerate(rows):
        t = tops[i]; xend = 508 + 36 * (len(genes) - 1) + 24
        rect(f, trunk + 2, t + 15, xend - trunk - 2, 2, LINE); f.alpha_composite(S(f"rail-emblem-{ch}-read-24x24"), (476, t + 4))
        for j, g in enumerate(genes): gene(f, 508 + 36 * j, t + 4, g["kind"], g["pair"])
        if genes[-1]["kind"] == "closed":
            xs = xend + 2
            while xs < 718: rect(f, xs, t + 16, 1, 1, DOT); xs += 3
            f.alpha_composite(S("genome-cross-12x12"), (720, t + 10))
    f.alpha_composite(S("genome-focus-32x32"), (544 - 4, tops[1] + 4 - 4))                 # the focus: Eyes
    f.alpha_composite(S("trait-S01-eyes-thin-rings-160x128"), (752, 100))                   # copy 1, shown: the mint frame
    d = ImageDraw.Draw(f); d.rectangle([752, 100, 752 + 159, 100 + 127], outline=C("mint"), width=2)
    f.alpha_composite(S("trait-S01-eyes-wide-pale-rings-160x128"), (752, 244)); f.alpha_composite(S("genome-veil-160x128"), (752, 244))   # copy 2, carried
    f.alpha_composite(S("genome-pair-front-dim-16x10"), (744 + 80, 96 + 135))
    f.alpha_composite(S("genome-key-research-12x12"), (744 + 156, 96 + 4))              # T-140: the R mark on the bay
    # the bank: S01's five drums at the spec's spacing (g 28, the chapter gap 84), each with its close-up and its neighbours' faces
    drums = [(240, "rest", "markings", ["plain", "pale-patches"], 0), (404, "rest", "crown", ["bare-head", "leaf-crest"], 1),
             (512, "rest", "eyes", ["thin-rings", "between", "wide-pale-rings"], 0), (676, "pinned", "drive", None, 0), (840, "pinned", "efficiency", None, 0)]
    for x, st, tr, faces, i in drums:
        look = f"look-S01-{tr}-{faces[i]}-64x64" if faces else f"look-S01-{tr}-64x64"
        f.alpha_composite(S(look), (x + 8, 440)); f.alpha_composite(S(f"create-drum-{st}"), (x, 424))
        if faces and len(faces) > 1:
            pv = S(f"look-S01-{tr}-{faces[(i - 1) % len(faces)]}-64x64"); nx = S(f"look-S01-{tr}-{faces[(i + 1) % len(faces)]}-64x64")
            f.alpha_composite(pv.crop((0, 56, 64, 64)), (x + 8, 432)); f.alpha_composite(nx.crop((0, 0, 64, 8)), (x + 8, 504))
        f.alpha_composite(S("create-drum-shade-80x96"), (x, 424))
        if tr == "crown": f.alpha_composite(S("create-drum-notch"), (x + 72, 464))
        if tr == "eyes": f.alpha_composite(S("create-drum-turn-up"), (x + 32, 424)); f.alpha_composite(S("create-drum-turn-down"), (x + 32, 512))
    d = ImageDraw.Draw(f)
    for wd, x in (("Coat", 240), ("Face", 404), ("Movement", 676), ("Stamina", 840)): d.text((x, 400), wd, font=F("Regular", 16), fill=C("mist"))
    label(f, "PROOF T-20261016-143: Create, S01, shape: Crown changed, Eyes focused (its two copies in the bay), 1x. Pod, words: stand-ins", 538)
    return f.convert("RGB")
create_s01().save(os.path.join(out, "genome-create-S01-1x.png"))
# the S03 proofs stay as the deep-species check: relabel them "not for the owner"
for n in ("genome-create-S03-1x.png", "genome-create-S03-clash-1x.png"):
    im = Image.open(os.path.join(out, n)).convert("RGBA"); label(im, "NOT FOR THE OWNER: S03's looks owed (the deep-species check, T-20261016-143)", 46); im.convert("RGB").save(os.path.join(out, n))
print("S01 proof written")
