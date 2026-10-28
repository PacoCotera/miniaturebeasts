"""Register the 2026-10-28 species art in slices/ (copy, manifest, status), ad-curl.md: the round-3 adult stand-ins (and the signed round-1 S09/S13/S16,
never placed), the full-size curl masters (owner 10-28: "full size, we can scale them down later"), the S02/S03 held habit keys, the bud shapes,
dock faces and Library plates derived at 0 MXN. The 96x88 curl naps stay in curl/ as derived files only. usage: python3 -I register-r3.py"""
import os, json, shutil, hashlib, glob
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); S = f"{R}/slices"
man = json.load(open(f"{S}/manifest.json")); st = json.load(open(f"{S}/status.json"))
SIGN = "AD 2026-10-28 at 1x (ad-curl.md)"; n = 0
def reg(src, id_, w, h, srcnote, made, note):
    global n
    dst = f"{S}/{id_}.png"; shutil.copyfile(f"{R}/{src}", dst); sha = hashlib.sha256(open(dst, "rb").read()).hexdigest()
    man[id_] = {"size": [w, h], "rect": None, "src": srcnote, "made": made, "sha256": sha, "status": "signed", "signed_in": SIGN}
    st[id_] = {"status": "signed", "signed_in": SIGN, "note": note}; n += 1
for sp in ["S04", "S05", "S06", "S07", "S08", "S10", "S11", "S12", "S14", "S15"]:
    for w, h in [(304, 312), (144, 152), (96, 88), (48, 48)]:
        reg(f"adult/mibi-adult-{sp}-{w}x{h}.png", f"mibi-adult-{sp}-{w}x{h}", w, h, f"source/raw/mibi-adult-{sp}-r3a.jpg (gemini-3-pro-image; rig, silhouette and the signed juvenile; tools/adultjobs.py)",
            f"{sp}'s adult stand-in, round 3, the bare base, cut by adult/cut-adults.py (height = juvenile / 0.67, feet 305), {w}x{h} reduced from the 304", "round 3 adult stand-in (owner 10-28: complete the species art)")
for sp in ["S09", "S13", "S16"]:
    for w, h in [(304, 312), (144, 152), (96, 88), (48, 48)]:
        reg(f"adult/mibi-adult-{sp}-{w}x{h}.png", f"mibi-adult-{sp}-{w}x{h}", w, h, "adult/ (round 1-2, signed 10-11), now registered for placement", f"{sp}'s signed adult stand-in, {w}x{h}", "signed 10-11 in adult/, never placed; place with its curl")
for f in sorted(glob.glob(f"{R}/curl/keys/*-curl-304x312.png")):
    b = os.path.basename(f)[:-4]
    reg(f"curl/keys/{b}.png", b, 304, 312, "curl/manifest.json (Pro paintings 10-28, or S01's layered curl pose)", "the curled sleeper at full size: the stand's own 304x312 frame and scale, house shadow baked (S01: none, the layered curl shadow)", "full-size curl master; the 96x88 nap in curl/ is a derived reduction")
for f in sorted(glob.glob(f"{R}/habits/keys/*-304x312.png")):
    b = os.path.basename(f)[:-4]
    reg(f"habits/keys/{b}.png", b, 304, 312, "habits/cuts.json (Pro, tools/habitjobs.py; S03 glow halo rebuilt by tools/glowfix.py)", "a held habit key at full size, the signed master's scale (tools/curlcut.py POSE 1.0, tools/habitfix.py)", "held habit key: the Sitting pose card's 'habit key owed' for S02 and S03")
for sp in ["S02", "S04", "S05", "S06", "S07", "S08", "S09", "S10", "S11", "S12", "S13", "S14", "S15", "S16"]:
    reg(f"bud/bud-shape-{sp}-112x112.png", f"bud-shape-{sp}-112x112", 112, 112, f"juvenile/mibi-juvenile-{sp}-304x312.png (the signed stand-in, figure alone)", "flat silhouette in bark #7d5435, the 96x96 ink box centred in 112x112, reduced only, soft 2 px edge (bud/cut-bud-shapes.py)", "0 MXN")
for f in sorted(glob.glob(f"{R}/dock/faces-r3/*.png")):
    b = os.path.basename(f)[:-4]
    reg(f"dock/faces-r3/{b}.png", b, 24, 24, "tools/facesmore.py", "the face: head and crown cut from the signed adult painting, reduced to 24 (dock/make-dock.py's rule)", "0 MXN")
for f in sorted(glob.glob(f"{R}/library-spread/plates-r3/*.png")):
    b = os.path.basename(f)[:-4]
    reg(f"library-spread/plates-r3/{b}.png", b, 80, 96, "tools/platesmore.py (make-spread.py plate() on the signed adult painting)", "the found plate: the painted type tipped in on a printed plate ground with a soft contact shadow", "0 MXN")
json.dump(man, open(f"{S}/manifest.json", "w"), indent=1); json.dump(st, open(f"{S}/status.json", "w"), indent=1); print("registered", n)
