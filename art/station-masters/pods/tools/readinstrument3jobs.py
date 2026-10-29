"""Jobs for the READING INSTRUMENT, pass three: one moulded plastic MODULE (the owner: "i liked the plastic frame ... maybe you can split the screen in 3 panels with plastic frames").
One module is painted, flat-on, with a margin of the chassis plate it is mounted in; code nine-slices it three times (the specimen chamber, the gene-tag readout, the chapter in hand), so the three frames are one family.
usage: python3 -I tools/readinstrument3jobs.py [ids]   -> writes source/work/reading-instrument/jobs-p3-<id>.json, one job each.
Run each with: python3 -I tools/gen.py source/work/reading-instrument/jobs-p3-<id>.json (the Pacific-day total checked before each)."""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
WORK = os.path.join(ROOT, "source/work/reading-instrument")
MODEL = "gemini-3-pro-image"
OWNER = "/home/user/iwq/results/T-20261026-vivarium/readroom-explore-4/owner-references/"
R_PLASTIC = [OWNER + "ref-01.png", "MATERIALS (a reference the owner chose): take ONLY the moulded plastic: separate housing panels with real bevelled edges, seams between them, small screws, recessed modules. Do not take its pixel style, its colours, its screens or its density."]
R_HOUSING = [os.path.join(ROOT, "source/raw/reading-instrument/p2-housing-graphite.jpg"), "THE CURRENT HOUSING (project-owned, the owner likes it): match its plastic exactly: the same warm dark graphite, the same satin bevels, the same cross-head screws, the same black rubber bezel and the same dark teal glass with its window reflection."]
BASE = ("Paint, flat-on and centred, ONE small moulded plastic MODULE of a home research instrument for a cosy creature-breeding game, a finished painted game asset: "
        "a square module with a THICK rounded moulded frame (about 7 percent of the width on every side, a little deeper at the bottom), its outer edge softly rounded with a real bevel catching a soft top light, "
        "a fine parting seam running round the frame, a small cross-head screw in each of its four corners, then a matte black RUBBER GASKET (about 1.5 percent, soft, no shine) holding the GLASS. "
        "The glass is dark, EMPTY and deep: a deep blue-green teal going near-black at its corners, a very faint even light from inside, a soft broad diagonal reflection across its upper left, a thin specular line along its top inner edge; nothing drawn on the glass. "
        "The module is MOUNTED in a darker CHASSIS PLATE that shows as an even margin all round it (about 5 percent of the width on every side): the plate is a darker matte graphite with a fine moulded texture, and the module sits slightly raised on it, "
        "with a soft contact shadow under its bottom edge and a thin dark gap between module and plate. The plate's margin is plain (no screws, no features) and even on all four sides so it can be stretched. "
        "Light: soft and real, a top light from a warm room. No neon, no light lines, no bloom. ")
TAIL = "NO text, letters, digits, logos or icons anywhere. The chassis plate fills the canvas edge to edge: no table, no wall, no background."
JOBS = {
 "module-graphite": "The module's plastic is the same warm dark GRAPHITE grey as the reference housing, matte with a slight satin sheen on the bevels; the rubber is black.",
}
for cid, text in JOBS.items():
    if len(sys.argv) > 1 and cid not in sys.argv[1:]: continue
    job = {"name": f"reading-instrument/p3-{cid}", "model": MODEL, "aspect": "1:1", "size": "2K", "tries": 1, "refs": [R_PLASTIC, R_HOUSING], "prompt": BASE + text + "\n" + TAIL}
    json.dump([job], open(os.path.join(WORK, f"jobs-p3-{cid}.json"), "w"), indent=1); print("wrote", f"jobs-p3-{cid}.json")
