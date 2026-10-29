"""Register the reading-room dish (pass 144) in slices/ (copy, manifest, status): the placed 1x and the 3x (tools/dishmasters.py).
The full-size master stays in shelf/ (owner: "full size, we can scale them down later"). usage: python3 -I tools/register-dish.py"""
import os, json, shutil, hashlib
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); S = f"{R}/slices"; O = f"{R}/shelf"
man = json.load(open(f"{S}/manifest.json")); st = json.load(open(f"{S}/status.json")); cuts = json.load(open(f"{O}/dish-cuts.json"))
SIGN = "AD 2026-10-29 at 1x (ad-cups/final-notes.md, pass 144)"
MASTER = next(k for k, v in cuts.items() if v.get("raw"))
NOTE = "the reading-room dish (pods-build/ad-review.md B1): placed at [72, 248, 136, 28] on the reading bench, its foot on the bench's feet line (y 276); the pod stands on it"
for i in ("reading-dish-136x28", "reading-dish-408x84"):
    shutil.copyfile(f"{O}/{i}.png", f"{S}/{i}.png")
    man[i] = {"size": cuts[i]["size"], "rect": [72, 248, 136, 28] if i.endswith("136x28") else None, "src": f"source/raw/masters-pods-dish/dish-a.jpg (painted at 4K; tools/dishmasters.py); full-size master shelf/{MASTER}.png",
              "made": cuts[i]["made"], "sha256": hashlib.sha256(open(f"{S}/{i}.png", "rb").read()).hexdigest(), "status": "signed", "signed_in": SIGN}
    st[i] = {"status": "signed", "signed_in": SIGN, "note": NOTE}
json.dump(man, open(f"{S}/manifest.json", "w"), indent=1); json.dump(st, open(f"{S}/status.json", "w"), indent=1); print("registered", 2)
