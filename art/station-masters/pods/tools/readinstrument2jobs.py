"""Jobs for the READING INSTRUMENT, pass two: the instrument as a real object (the owner: "you're relying too heavily on glows, many of the examples show also plastic, made the thing real").
The housing is painted as moulded plastic with seams, screws, a matte rubber bezel round the glass, a printed label strip and a recessed lamp channel on its foot lip; the glass is dark and EMPTY,
with reflections and no glow of its own beyond a faint light from inside. Code draws everything on the glass and the lamps' light.
usage: python3 -I tools/readinstrument2jobs.py [ids]   -> writes source/work/reading-instrument/jobs-p2-<id>.json, one job each.
Run each with: python3 -I tools/gen.py source/work/reading-instrument/jobs-p2-<id>.json (the Pacific-day total checked before each)."""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
WORK = os.path.join(ROOT, "source/work/reading-instrument")
MODEL = "gemini-3-pro-image"
OWNER = "/home/user/iwq/results/T-20261026-vivarium/readroom-explore-4/owner-references/"
R_PLASTIC = [OWNER + "ref-01.png", "MATERIALS (a reference the owner chose): take ONLY the moulded plastic: separate housing panels with real bevelled edges, seams between them, small screws, recessed modules, rubbery buttons and small lamp lenses. Do not take its pixel style, its colours, its screens or its density."]
R_MONITOR = [OWNER + "ref-08.png", "MATERIALS (a reference the owner chose): take ONLY the chunky moulded plastic monitor housing: its thick rounded edges, the soft highlight along the bevel, the dark recessed bezel round the screen. Do not take the creature, the colours or the pixel style."]
R_PICK = [os.path.join(WORK, "pick.png"), "THE CURRENT DIRECTION (project-owned): keep its colour of glass (deep blue-green teal) and its calm warmth. Do NOT keep its glowing amber rim line: that rim becomes real plastic and rubber."]
BASE = ("Paint, flat-on and centred, the FRONT of a small home research instrument for a cosy creature-breeding game, a finished painted game asset, filling the canvas edge to edge: "
        "a moulded plastic HOUSING with a large rectangular DISPLAY OPENING. The housing border is narrow on the top and both sides (about 3 percent of the width) and a little deeper at the bottom, where it forms a FOOT LIP about 7 percent of the height. "
        "Inside the opening, a matte black RUBBER BEZEL (soft, slightly rounded, about 1 percent wide, no shine) holds the GLASS. The glass is dark, EMPTY and deep: a deep blue-green teal going near-black at its corners, a very faint even light from inside at its centre, "
        "a soft broad diagonal reflection of a room window across its upper left, a thin bright specular line along the glass's top inner edge where it meets the bezel; nothing drawn on the glass (no grid, no rings, no widgets, no text). "
        "On the housing: real bevelled edges catching a soft top light, a fine parting seam running round the housing just outside the bezel, four small cross-head screws in the corners, slight wear and a fine moulded texture on the plastic, soft ambient occlusion where the bezel meets the plastic. "
        "On the foot lip, from left to right: a recessed printed LABEL STRIP (a blank off-white paper label, slightly matte, set in a shallow recess, about a quarter of the width, no writing), "
        "then a long narrow recessed dark CHANNEL in the middle (empty, for a row of small lamps the game adds), then at the right one small round clear amber LAMP LENS, unlit, in a black rubber grommet, and next to it a tiny round speaker grille of a few holes. "
        "Light: soft and real, a top light from a warm room; the only light that glows is the faint light inside the glass. No neon, no light lines, no bloom on the housing. ")
TAIL = "NO text, letters, digits, logos or icons anywhere. Nothing scary. Fill the canvas edge to edge with the housing: no table, no wall, no background around it."
JOBS = {
 "housing-graphite": "The plastic is a warm dark GRAPHITE grey (like a well-loved piece of lab kit), matte with a slight satin sheen on the bevels; the rubber is black.",
 "housing-sage": "The plastic is a soft muted SAGE-GREY with a warm cast (like a home appliance from a cosy lab), matte with a slight satin sheen on the bevels, a slightly darker grey-green for the foot lip panel; the rubber is black.",
}
for cid, text in JOBS.items():
    if len(sys.argv) > 1 and cid not in sys.argv[1:]: continue
    job = {"name": f"reading-instrument/p2-{cid}", "model": MODEL, "aspect": "16:9", "size": "2K", "tries": 1, "refs": [R_PLASTIC, R_MONITOR, R_PICK], "prompt": BASE + text + "\n" + TAIL}
    json.dump([job], open(os.path.join(WORK, f"jobs-p2-{cid}.json"), "w"), indent=1); print("wrote", f"jobs-p2-{cid}.json")
