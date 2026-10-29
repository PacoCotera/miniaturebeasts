"""Register the close-up's art (pass 145, made at no cost) in slices/ (copy, manifest, status): the four room crops (tools/closeupcrops.py), the icon
sheet and the Bay's header glyph (tools/closeupicons.py), the stamp samples, the curls at close-up scale and the 9-slice sprites (tools/closeupsprites.py).
usage: python3 -I tools/register-closeup.py"""
import os, json, shutil, hashlib
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); S = f"{R}/slices"; O = f"{R}/closeup"
man = json.load(open(f"{S}/manifest.json")); st = json.load(open(f"{S}/status.json"))
SIGN = "AD 2026-10-29 at 1x (ad-bay-art-notes.md, pass 145)"
crops = json.load(open(f"{O}/crops.json")); icons = json.load(open(f"{O}/icons/icons.json")); spr = json.load(open(f"{O}/sprites.json"))
def reg(src, i, rect, made, note):
    shutil.copyfile(src, f"{S}/{i}.png")
    man[i] = {"size": list(__import__("PIL.Image", fromlist=["Image"]).open(f"{S}/{i}.png").size), "rect": rect, "src": made, "made": made,
              "sha256": hashlib.sha256(open(f"{S}/{i}.png", "rb").read()).hexdigest(), "status": "signed", "signed_in": SIGN}
    st[i] = {"status": "signed", "signed_in": SIGN, "note": note}
n = 0
for i, v in crops.items():
    reg(f"{O}/{i}.png", i, v["rect"], v["src"] + " (tools/closeupcrops.py)", f"the close-up's picture, the AD's crop: {v['pick']}; the ground plane on picture y 352-412 (screen 400-460), the mibi at the 144 family (about 1.3x the burrow); placed 1:1, its 1 px hairline frame from closeup-hairline-9slice-16x16"); n += 1
WORDS = {"coat": "chapter row, beside 'Coat'", "face": "chapter row, beside 'Face'", "movement": "chapter row, beside 'Movement'", "shape": "chapter row, beside 'Shape'",
         "stamp": "the stamp row, beside 'Stamp' (the same for every mibi)", "cross": "the Cross plate", "portrait": "the Portrait plate (after a sitting, the sitting's painted thumb replaces it)",
         "manage": "the Manage plate", "rename": "the name's detail verb line", "companion": "head, residents, top bar, beside its word", "bonded": "head and mibi form, beside 'bonded'", "held": "a held plate's note, beside the reason"}
for i in icons["icons"]:
    if i.startswith("icon-"):
        k = i[5:].rsplit("-", 1)[0]
        reg(f"{O}/icons/{i}.png", i, None, "drawn by the AD in code at 512, reduced (tools/closeupicons.py)", f"the close-up's icon sheet, {k}: bone, one silhouette, always set beside its word; {WORDS[k]}; checked filled black on white at 1x (closeup/icons/proof-icon-silhouettes-1x.png)")
    else:
        reg(f"{O}/icons/{i}.png", i, None, "drawn by the AD in code at 320, reduced (tools/closeupicons.py)", "the Bay's header glyph (ux-bay.md section 6): a field crate front-on with its lid apart, bone, replacing the house; 20 px in the top bar")
    n += 1
for i in spr["sprites"]:
    base = i.split("/", 1)[1]
    if i.startswith("stamp/"): note = "a sample of the mibi's own stamp at 96 (the stamp detail only): cream paper, scalloped edge, 8x8 cells of 7 px mirrored, on slate; drawn by stamp(code) in tools/closeupsprites.py, which the build ports"
    elif i.startswith("curl/"): note = "the curled sleeper at close-up scale (Tucked away and Coming back): the signed 304 curl key reduced to the 144 family, feet on row 147" + (", with no shadow (the placer's own)" if "noshadow" in i else ", on a code contact shadow")
    else: note = {"closeup-pane-9slice-24x24": "the one slate pane as a 9-slice (slice 2): panel at 92 %, 1 px hairline, 1 px bevel top and left; square corners", "closeup-plate-9slice-32x32": "the slate plate as a 9-slice (slice 8): bar, radius 4 drawn at 8x and reduced (never code-stepped), hairline round, bevel top and left",
                  "closeup-hairline-9slice-16x16": "the 1 px hairline frame as a 9-slice (slice 2), clear inside: the picture's frame and a free place's outline", "closeup-contact-shadow-128x24": "the soft contact shadow under the close-up's mibi (house shadow at 110)", "closeup-contact-shadow-64x16": "the soft contact shadow under a resident's thumb or a small piece"}[base]
    reg(f"{O}/{i}.png", base, None, "code-drawn or reduced at no cost (tools/closeupsprites.py)", note); n += 1
json.dump(man, open(f"{S}/manifest.json", "w"), indent=1); json.dump(st, open(f"{S}/status.json", "w"), indent=1); print("registered", n)
