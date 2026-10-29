"""Register the Pods shelf and reading-room masters (tools/shelfmasters.py, shelf/) in slices/ (copy, manifest, status), ad-cups/final-notes.md.
The full-size masters stay in shelf/ (owner: "full size, we can scale them down later"); slices/ gets the placed 1x and the 3x/2x. usage: python3 -I tools/register-shelf.py"""
import os, json, shutil, hashlib
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); S = f"{R}/slices"; O = f"{R}/shelf"
man = json.load(open(f"{S}/manifest.json")); st = json.load(open(f"{S}/status.json")); cuts = json.load(open(f"{O}/cuts.json"))
SIGN = "AD 2026-10-29 at 1x (ad-cups/final-notes.md)"
RAW = {"cabinet": "source/raw/masters-pods-shelf/strip-a.jpg", "pod-niche-husk": "source/raw/masters-pods-shelf/husk-a.jpg", "pod-niche-shadow": None,
       "pod-niche": "source/raw/masters-pods-shelf/niche-b.jpg", "reading": "source/raw/masters-pods-shelf/bench-b.jpg"}
MASTER = {"cabinet": "cabinet-strip-4704x1596", "pod-niche-husk": "pod-niche-husk-2536x2536", "pod-niche-shadow": "pod-niche-shadow-2624x2624",
          "pod-niche": "pod-niche-2624x2624", "reading": "reading-bench-5243x3072"}
IDS = ["cabinet-strip-672x228", "cabinet-strip-2016x684", "pod-niche-88x88", "pod-niche-264x264", "pod-niche-husk-88x88", "pod-niche-husk-264x264",
       "pod-niche-shadow-88x88", "pod-niche-shadow-264x264", "reading-bench-1024x600", "reading-bench-1024x520", "reading-bench-2048x1200"]
for i in IDS:
    fam = next(k for k in ("pod-niche-husk", "pod-niche-shadow", "pod-niche", "cabinet", "reading") if i.startswith(k))
    shutil.copyfile(f"{O}/{i}.png", f"{S}/{i}.png"); sha = hashlib.sha256(open(f"{S}/{i}.png", "rb").read()).hexdigest()
    src = (f"{RAW[fam]} (painted at 4K; tools/shelfmasters.py)" if RAW[fam] else "tools/shelfmasters.py (code-drawn)") + f"; full-size master shelf/{MASTER[fam]}.png"
    man[i] = {"size": cuts[i]["size"], "rect": None, "src": src, "made": cuts[i]["made"], "sha256": sha, "status": "signed", "signed_in": SIGN}
    st[i] = {"status": "signed", "signed_in": SIGN, "note": "Pods shelf masters, pass 142 (direction 2, ux-pods-inventory.md)"}
json.dump(man, open(f"{S}/manifest.json", "w"), indent=1); json.dump(st, open(f"{S}/status.json", "w"), indent=1); print("registered", len(IDS))
