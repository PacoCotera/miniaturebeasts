"""Register the remaining Pods screen art (pass 143) in slices/ (copy, manifest, status): the lantern and fern overlays, the put-away jar, the bred-true seal
(tools/cupsmasters.py) and the pod masters cut to the niche, class `shelf` 64x76 (tools/nichepods.py). The full-size masters stay in shelf/ and shelf/pods/
(owner: "full size, we can scale them down later"); slices/ gets the placed 1x and the 3x. usage: python3 -I tools/register-cups.py"""
import os, json, shutil, hashlib
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); S = f"{R}/slices"; O = f"{R}/shelf"
man = json.load(open(f"{S}/manifest.json")); st = json.load(open(f"{S}/status.json"))
cups = json.load(open(f"{O}/cups-cuts.json")); pods = json.load(open(f"{O}/pods/cuts.json"))
SIGN = "AD 2026-10-29 at 1x (ad-cups/final-notes.md, pass 143)"
RAW = {"pods-lantern": "source/raw/masters-pods-cups/lantern-a.jpg", "pods-fern": "source/raw/masters-pods-cups/fern-a.jpg",
       "jar-putaway": "source/raw/masters-pods-cups/jar-a.jpg", "seal-bredtrue": "source/raw/masters-pods-cups/seal-c.jpg"}
MASTER = {fam: next(k for k, v in cups.items() if k.startswith(fam) and v.get("raw")) for fam in RAW}
NOTE = {"pods-lantern": "the cabinet's lantern overlay (ux-pods-inventory.md; ad-signoff 3.2): placed at [0, 92, 96, 160], over the strip and niches, under the labels and marks",
        "pods-fern": "the cabinet's fern overlay (ux-pods-inventory.md; ad-signoff 3.2): placed at [568, 358, 120, 200], over the strip and niches, under the labels and marks",
        "jar-putaway": "the put-away jar (ad-signoff 1.5): the 24 px glyph in the manager's Tucked away header; the 96 px master",
        "seal-bredtrue": "the bred-true seal (ad-signoff 2.8, ux-breeding.md): 96 in the hatch beat, 48 on the look's picture, 24 and 12 on the track, rows and cards"}
ids = []
for i in ("pods-lantern-96x160", "pods-lantern-288x480", "pods-fern-120x200", "pods-fern-360x600", "jar-putaway-96x96", "jar-putaway-24x24",
          "seal-bredtrue-96x96", "seal-bredtrue-48x48", "seal-bredtrue-24x24", "seal-bredtrue-12x12"):
    fam = next(k for k in RAW if i.startswith(k)); shutil.copyfile(f"{O}/{i}.png", f"{S}/{i}.png")
    src = f"{RAW[fam]} (painted at 4K; tools/cupsmasters.py); full-size master shelf/{MASTER[fam]}.png"
    man[i] = {"size": cups[i]["size"], "rect": None, "src": src, "made": cups[i]["made"], "sha256": hashlib.sha256(open(f"{S}/{i}.png", "rb").read()).hexdigest(), "status": "signed", "signed_in": SIGN}
    st[i] = {"status": "signed", "signed_in": SIGN, "note": NOTE[fam]}; ids.append(i)
for n, v in pods.items():
    if not (v["size"] in ([64, 76], [192, 228])): continue
    i = n; kind = n[len("pod-shelf-"):].replace("-192x228", ""); shutil.copyfile(f"{R}/{v['file']}", f"{S}/{i}.png")
    src = f"source/raw/pod-loika|identified|band.jpg (the painted pod raws; tools/nichepods.py, the build's own pods() at the niche box); full-size master shelf/pods/pod-shelf-{kind}-1328x1577.png"
    man[i] = {"size": v["size"], "rect": [76, 14, 64, 76] if v["size"] == [64, 76] else None, "src": src, "made": v["made"].replace("uniform scale", "uniform scale (the pod's ink 64x71), cut to the niche box 64x76"),
              "sha256": hashlib.sha256(open(f"{S}/{i}.png", "rb").read()).hexdigest(), "status": "signed", "signed_in": SIGN}
    st[i] = {"status": "signed", "signed_in": SIGN, "note": "the shelf pod class (ux-pods-inventory.md: the pod at the card's [+76, +14, 64, 76], the niche's [+12, +6]; feet on the niche's row 82, on pod-niche-shadow); every kind of the collection class"}
    ids.append(i)
json.dump(man, open(f"{S}/manifest.json", "w"), indent=1); json.dump(st, open(f"{S}/status.json", "w"), indent=1); print("registered", len(ids))
