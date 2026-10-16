"""T-20261016-27 / T-20261016-62 proofs: the Incubator, option B, at 1x for two species (S01 Loika, a dark shell; S03 Tuikis, a light one), in
empty, cool, warm, glowing, ready and hatch-1100, with the masters at the ruling's rects (specs/station-incubator-tabs-ruling.md §2), and the
review's five measures (T-62 step 5).
The composite order (the build's, T-62 step 2): the shell; the step's light (incubator-shell-{step}); the founder's shadow at the ruling's
opacity (cool 0.25, warm 0.45, glowing 0.65, ready 0.8); the seams (ready); the nest's front for the step (incubator-cradle-front-{step}).
Stand-ins, said so on every proof and in the README (they are the build's, not masters):
- the pod at 224 x 272: the species' shell composed by pods.json podLayers.compose from the pod-incubator layers (T-20261016-63, 1:1);
- the founder's shadow: the juvenile's silhouette, fitted to the 160 x 192 shadow box, blurred, at the step's opacity;
- the slip's and the card's content, typed in Inter at the ruling §5 sizes at its longest case (2 found lines, 3 changes, 5 cleared and the
  "still to come" line), ink on the paper; the card's picture is a crop of a signed trait picture at 144 x 128 (the 160 x 128 crop is owed);
- the stamp glyph: S01's, from the batch/B-20261016-1 capture.
Each growing step is also written without the shadow (-noshadow), for the measures.
usage: python3 -I proof.py SLICES_DIR MASTERS_DIR GLYPH.png FONTS_DIR OUT_DIR"""
import sys, os, json, numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage as nd
sl, md, glyph_png, fonts, out = sys.argv[1:6]
os.makedirs(out, exist_ok=True)
def lin(c): c = np.asarray(c, float) / 255; return np.where(c <= .04045, c / 12.92, ((c + .055) / 1.055) ** 2.4)
Y = lambda a: lin(a[..., :3]) @ np.array([.2126, .7152, .0722])
L = lambda p: Image.open(p).convert("RGBA")
F = lambda w, s: ImageFont.truetype(os.path.join(fonts, f"Inter-{w}.ttf"), s)
hexrgb = lambda h: np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], float)
INK, MIST, SAND, BONE = (0x1a, 0x17, 0x25), (0x5a, 0x57, 0x70), (0xe6, 0xc9, 0x8c), (0xf1, 0xeb, 0xdf)
SPECIES = {"S01": ("Loika", "#465459", "#dfd2ae", "dots"), "S03": ("Tuikis", "#269fa5", "#e8b83f", "plates")}
SLIP = {"S01": ["Found at the pond edge,", "as a Loika shook dry.", "Crown: leaf crest", "Eyes: wide pale rings", "Markings: pale patches",
                "Movement: a quick trot", "Stamina: a long day out", "Senses: keen at night", "Habits: digs at dusk", "Voice: a soft chirp", "two still to come"],
        "S03": ["Found under the rock ledge,", "in a dry crack.", "Crest: tall crest", "Scales: many coarse", "Tail: long thick",
                "Movement: a slow wade", "Stamina: steady", "Senses: sharp by day", "Habits: basks at noon", "Voice: a dry rattle", "three still to come"]}
CARD = {"S01": ("Face", "a leaf crest", "trait-S01-crown-leaf-crest-144x176"), "S03": ("Tail", "long and thick", "trait-S03-tail-long-thick-128x160")}
CLS = "incubator" if os.path.exists(f"{sl}/pod-incubator-shade.png") else "large"   # the 224 x 272 class (T-20261016-63), else the large class scaled
def shell(sp):
    _, a, b, pat = SPECIES[sp]
    g = lambda n: np.asarray(L(f"{sl}/pod-{CLS}-{n}.png")).astype(float)
    shade = g("shade"); body, acc = g("mask-body")[..., 3] / 255, g("mask-accent")[..., 3] / 255
    pt = g(f"pattern-{pat}")[..., 3] / 255
    rel = g(f"pattern-{pat}-relief")[..., :3].mean(2) / 255 if os.path.exists(f"{sl}/pod-{CLS}-pattern-{pat}-relief.png") else None
    A, B = hexrgb(a), hexrgb(b)
    col = (A * (body * (1 - pt))[..., None] + B * np.minimum(1, acc + pt)[..., None]) * (2 * shade[..., :3] / 255) * (2 * rel[..., None] if rel is not None else 1.0)
    alpha = np.maximum(body, acc) * (g("shade")[..., 3] / 255 > 0)
    im = Image.fromarray(np.dstack([np.clip(col, 0, 255), alpha * 255]).astype(np.uint8), "RGBA")
    return im if im.size == (224, 272) else im.resize((224, 272), Image.LANCZOS)
def founder_shadow(sp, opacity):
    j = L(f"{sl}/mibi-juvenile-{sp}-304x312.png"); a = np.asarray(j)[..., 3].astype(float) / 255
    ys, xs = np.nonzero(a > 0.5); crop = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    k = min(160 / crop.shape[1], 192 / crop.shape[0]); im = Image.fromarray((crop * 255).astype(np.uint8)).resize((max(1, int(crop.shape[1] * k)), max(1, int(crop.shape[0] * k))), Image.LANCZOS)
    P = 16; m = np.zeros((192 + 2 * P, 160 + 2 * P)); h, w = im.size[1], im.size[0]
    m[P + 192 - h:P + 192, P + (160 - w) // 2:P + (160 - w) // 2 + w] = np.asarray(im) / 255
    sil = m > 0.5
    m = nd.gaussian_filter(m, 3) * opacity
    return Image.fromarray(np.dstack([np.full(m.shape + (3,), [36, 22, 14]), m * 255]).astype(np.uint8), "RGBA"), sil
def ring(f, closed=False):
    r = np.asarray(L(f"{md}/incubator-ring-{'closed' if closed else 'fill'}.png")).copy()
    if not closed:
        yy, xx = np.mgrid[0:400, 0:400] + .5; ang = np.degrees(np.arctan2(xx - 200, -(yy - 200))) % 360
        r[((ang - 228) % 360) > 264 * f] = 0
    return Image.fromarray(r, "RGBA")
glyph = L(glyph_png)
STEP = {"cool": ("cool", 0.25, 0.2), "warm": ("warm", 0.45, 0.5), "glowing": ("glowing", 0.65, 0.8), "ready": ("glowing", 0.8, 1.0)}
def slip_text(f, sp):
    dr = ImageDraw.Draw(f); x, y = 104, 112; lines = SLIP[sp]; over = []
    def put(s, font, fill, pitch):
        nonlocal y
        if dr.textlength(s, font=font) > 176: over.append(s)
        dr.text((x, y), s, font=font, fill=fill); y += pitch
    put(SPECIES[sp][0], F("Medium", 20), INK, 32)
    put(lines[0], F("Regular", 16), MIST, 24); put(lines[1], F("Regular", 16), MIST, 24); y += 8
    put("Your changes", F("Medium", 16), INK, 24)
    for s in lines[2:5]: put(s, F("Regular", 16), INK, 24)
    y += 8; put("Cleared while growing", F("Medium", 16), INK, 24)
    for s in lines[5:10]: put(s, F("Regular", 16), INK, 24)
    put(lines[10], F("Regular", 16), MIST, 24)
    return over
def card_text(f, sp):
    word, look, pic = CARD[sp]; dr = ImageDraw.Draw(f)
    dr.text((744 + 1, 108 + 1), "Just cleared", font=F("Regular", 16), fill=(10, 10, 12)); dr.text((744, 108), "Just cleared", font=F("Regular", 16), fill=SAND)
    p = L(f"{sl}/{pic}.png"); p = p.crop(((p.width - 144) // 2, (p.height - 128) // 2, (p.width - 144) // 2 + 144, (p.height - 128) // 2 + 128))
    f.alpha_composite(p, (752 + 8, 140)); dr = ImageDraw.Draw(f)
    dr.text((744, 284), word, font=F("Medium", 16), fill=BONE); dr.text((744, 308), look, font=F("Regular", 16), fill=(0x8d, 0x8a, 0xa6))
def frame(sp, state, shadow=True):
    f = Image.new("RGBA", (1024, 600), (29, 35, 43, 255)); f.alpha_composite(L(f"{md}/incubator-stage.png"), (0, 40))
    regions = {}; sil_abs = None
    def put(name, im, xy):                                                 # each region is what shows of it: a later object takes its pixels
        f.alpha_composite(im, xy); a = np.zeros((600, 1024), bool); a[xy[1]:xy[1] + im.size[1], xy[0]:xy[0] + im.size[0]] = np.asarray(im)[..., 3] > 128
        for k in regions: regions[k] &= ~a
        regions[name] = regions.get(name, np.zeros((600, 1024), bool)) | a
    if state == "empty":
        put("cradle", L(f"{md}/incubator-cradle-empty.png"), (392, 392)); return f, regions, None, []
    if state != "hatch-1100":
        light, op, fill = STEP[state]
        put("ring", ring(fill, closed=(state == "ready")), (312, 88))
        put("cradle", L(f"{md}/incubator-cradle-{light}.png"), (392, 392))
        pod = shell(sp); pod.alpha_composite(L(f"{md}/incubator-shell-{light}.png"))       # the shell, then its light
        if shadow:
            sh, sil = founder_shadow(sp, op); pod.alpha_composite(sh, (32 - 16, 48 - 16))   # then the founder's shadow over the light
            sil_abs = np.zeros((600, 1024), bool); sil_abs[144 + 48:144 + 48 + 192, 400 + 32:400 + 32 + 160] = sil[16:-16, 16:-16]
        if state == "ready": pod.alpha_composite(L(f"{md}/incubator-shell-seams.png"))
        pod = Image.fromarray(np.dstack([np.asarray(pod)[..., :3], np.asarray(shell(sp))[..., 3]]), "RGBA")
        put("pod", pod, (400, 144))
        f.alpha_composite(L(f"{md}/incubator-cradle-front-{light}.png"), (392, 392))
    else:
        put("cradle", L(f"{md}/incubator-cradle-empty.png"), (392, 392))
        put("juvenile", L(f"{sl}/mibi-juvenile-{sp}-304x312.png"), (360, 144))
    put("slip", L(f"{md}/slip-208x408.png"), (88, 96)); over = slip_text(f, sp)
    if state != "hatch-1100": put("card", L(f"{md}/incubator-card-ground.png"), (728, 96)); card_text(f, sp)
    put("stamp", L(f"{sl}/stamp-plate-120x120.png"), (772, 352)); f.alpha_composite(glyph, (772 + 20, 352 + 20)); regions["stamp"][352:472, 772:892] = True
    return f, regions, sil_abs, over
arr = lambda f: np.asarray(f.convert("RGB")).astype(float)
report, overs = {}, set()
for sp in SPECIES:
    fr = {}
    for state in ("empty", "cool", "warm", "glowing", "ready", "hatch-1100"):
        f, reg, sil, ov = frame(sp, state); overs |= set(ov)
        f.convert("RGB").save(f"{out}/incubator-b-{sp}-{state}-1x.png"); fr[state] = (arr(f), reg, sil)
        if state in ("cool", "warm", "glowing"):
            g, _, _, _ = frame(sp, state, shadow=False); g.convert("RGB").save(f"{out}/incubator-b-{sp}-{state}-noshadow-1x.png"); fr[state + "-ns"] = (arr(g), None, None)
    m = {}
    box = lambda a: a[144:416, 400:624]
    for st in ("cool", "warm", "glowing", "ready"):
        a = fr[st][0]; y = Y(a); top, bot = y[144:280, 400:624].mean(), y[280:416, 400:624].mean()
        b = a[280:416, 400:624]; m[f"{st}: top / bottom mean"] = [round(float(top), 3), round(float(bot), 3)]
        m[f"{st}: bottom R-B"] = round(float(b[..., 0].mean() - b[..., 2].mean()), 1)
        m[f"{st}: moss band mean"] = round(float(y[400:440, 400:624].mean()), 3)
        reg = fr[st][1]; p = {k: float(np.percentile(y[v], 95)) for k, v in reg.items() if v.any()}
        m[f"{st}: pod p95 - highest other"] = round(p["pod"] - max(v for k, v in p.items() if k != "pod"), 3)
    ns = {s: box(fr[s + "-ns"][0]) for s in ("cool", "warm", "glowing")}
    m["steps: cool->warm mean abs /255"] = round(float(np.abs(ns["warm"] - ns["cool"]).mean()), 1)
    m["steps: warm->glowing mean abs /255"] = round(float(np.abs(ns["glowing"] - ns["warm"]).mean()), 1)
    m["lamp: moss glowing / cool"] = round(m["glowing: moss band mean"] / m["cool: moss band mean"], 2)
    sil = fr["warm"][2]; d = np.abs(fr["warm"][0] - fr["warm-ns"][0]).mean(2)
    m["shadow: warm, with vs without, inside the silhouette, mean abs /255"] = round(float(d[sil].mean()), 1)
    report[sp] = m
report["slip lines over 176 px"] = sorted(overs)
print(json.dumps(report, indent=1)); json.dump(report, open(f"{out}/measures.json", "w"), indent=1)
