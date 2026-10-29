"""Register the Bay's pieces (pass 145) in slices/ (copy, manifest, status): the placed 1x and the 3x of every piece cut by tools/baymasters.py.
The full-size masters stay in bay/ (owner: "full size, we can scale them down later"). Rects are ux-bay.md's, relative to the slot's origin where marked
"slot" (slot k at x 24 + 168k, y 248), with the corrections of the art notes. usage: python3 -I tools/register-bay.py"""
import os, re, json, shutil, hashlib
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); S = f"{R}/slices"; O = f"{R}/bay"
man = json.load(open(f"{S}/manifest.json")); st = json.load(open(f"{S}/status.json")); cuts = json.load(open(f"{O}/bay-cuts.json"))["cuts"]
SIGN = "AD 2026-10-29 at 1x (ad-bay-art-notes.md, pass 145)"
PLACE = json.load(open(f"{O}/bay-cuts.json"))["string_place"]
def master(base):   # the full-size master: `<base>-<W>x<H>` with W over 900
    return next(k for k in cuts if k.startswith(base + "-") and re.fullmatch(r"\d+x\d+", k[len(base) + 1:]) and int(k[len(base) + 1:].split("x")[0]) > 900)
PIECES = {   # base: (1x size, 3x size, rect, note)
 "bay-landing": ("1024x522", "3072x1566", [0, 40, 1024, 522], "the Bay's backdrop, the landing: placed at [0, 40] between the bars; bench top's standing surface on the feet line y 400, bench front y 404-468 (labels at 412-456), floor below; window [176, 60, 214, 192]; peg rail [428, 135, 270, 42] with pegs at x 460, 527, 596, 663; the right third (x 712 on) in shade behind the ledger"),
 "bay-crate-shut": ("144x112", "432x336", "slot [+4, +40, 144, 112]", "the field crate, shut: lid and body together; feet on y 400; the crate's ink is 144x93 (rows 19-111), the rope's knot at the box's (101, 47)"),
 "bay-crate-shut-lid": ("144x112", "432x336", "slot [+4, +40, 144, 112]", "the shut crate's lid layer alone, in the same box: the lift rotates it (300 ms) about its back edge, then the open crate replaces both layers"),
 "bay-crate-shut-body": ("144x112", "432x336", "slot [+4, +40, 144, 112]", "the shut crate's body layer alone, in the same box, drawn under the lid layer"),
 "bay-crate-open": ("156x128", "468x384", "slot [+4, +24, 156, 128]", "the field crate, open: the same body with straw, the lid leaning back; registered on the shut crate (left edge, feet on y 400); 156 wide, the lid reaching 9 px past the body into the gap between slots; the straw's surface at slot +68, so the pods stand in the straw rect [+20, +32, 112, 48]"),
 "bay-parcel": ("128x104", "384x312", "slot [+12, +48, 128, 104]", "the portrait parcel in brown paper and twine; its foot on the feet line y 400 (the spec's +32 would float it 16 px)"),
 "bay-frame": ("128x104", "384x312", "slot [+12, +48, 128, 104]", "the bare portrait frame (the parcel unwrapped), the same rect; the portrait is drawn under it, clipped by bay-frame-opening"),
 "bay-frame-opening": ("128x104", "384x312", "slot [+12, +48, 128, 104]", "the frame's opening as a mask (white, alpha): clip the portrait to it and draw it under bay-frame; its bounds at 1x [19, 13, 111, 88] of the box (a slanted quad: the frame leans)"),
 "bay-cradle": ("96x72", "288x216", [479, 150, 96, 72], "the Companion's cradle, empty, hung on the landing's second peg (x 527); the Companion glyph is placed in it by code; absent when the Companion is away (the empty peg)"),
 "bay-home-tile": ("96x72", "288x216", None, "Home's Bay tile: the shut crate on a sliver of the landing's bench in its window light, from the full-size masters"),
}
for t in ("moss", "reed", "slate-blue", "rust-brown", "charcoal"):
    PIECES[f"bay-tag-{t}"] = ("28x40", "84x120", "slot [+91, +87, 28, 40]", f"the luggage tag, {t} string (the {PLACE[t]} walk): its strands meet on row 0 at x 14, hung from the shut crate's rope knot (box (101, 47)); one tag per crate")
n = 0
for base, (s1, s3, rect, note) in PIECES.items():
    m = master(base)
    for sz in (s1, s3):
        i = f"{base}-{sz}"; shutil.copyfile(f"{O}/{i}.png", f"{S}/{i}.png")
        man[i] = {"size": cuts[i]["size"], "rect": rect if sz == s1 else None, "src": f"{cuts[m]['raw']} (painted at 4K; tools/baymasters.py); full-size master bay/{m}.png",
                  "made": cuts[i]["made"], "sha256": hashlib.sha256(open(f"{S}/{i}.png", "rb").read()).hexdigest(), "status": "signed", "signed_in": SIGN}
        st[i] = {"status": "signed", "signed_in": SIGN, "note": note}; n += 1
for k, v in cuts.items():   # the pods in the straw, class `straw`: every kind of the shelf class
    if not k.startswith("straw/"): continue
    i = k.split("/", 1)[1]; shutil.copyfile(f"{O}/{k}.png", f"{S}/{i}.png"); kd = i[len("pod-straw-"):].rsplit("-", 1)[0]
    man[i] = {"size": v["size"], "rect": "slot [+20 + 44j, +32, 40, 48], j 0..2" if i.endswith("40x48") else None, "src": f"shelf/pods/pod-shelf-{kd}-" + ("192x228" if i.endswith("40x48") else "1328x1577") + ".png (tools/baymasters.py)",
              "made": v["made"], "sha256": hashlib.sha256(open(f"{S}/{i}.png", "rb").read()).hexdigest(), "status": "signed", "signed_in": SIGN}
    st[i] = {"status": "signed", "signed_in": SIGN, "note": "a pod standing in the open crate's straw (the straw rect [+20, +32, 112, 48]: up to 3 at a 44 px pitch, then the '+n' slip in the third place); every layer of a kind registers on the identified pod's ink, as the shelf class's layers do; its contact shadow is the placer's"}; n += 1
json.dump(man, open(f"{S}/manifest.json", "w"), indent=1); json.dump(st, open(f"{S}/status.json", "w"), indent=1); print("registered", n)
