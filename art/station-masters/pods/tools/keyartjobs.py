"""Jobs for the website's KEY ART (approved by the owner, 2026-10-29): the loop as one painting, field -> dock -> home, read left to right,
in the house style of the existing homepage concept art (the kit's real device designs, the Loika, warm light). Concept art: captioned so on the page.
usage: python3 -I tools/keyartjobs.py [ids]   -> writes source/work/key-art/jobs-<id>.json, one job each.
Run each with: python3 -I tools/gen.py source/work/key-art/jobs-<id>.json (the Pacific-day total checked before each request).
Budget for the job: 40 MXN, hard stop at 60 (about 4 MXN a 2K try)."""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
WORK = os.path.join(ROOT, "source/work/key-art")
MODEL = "gemini-3-pro-image"
SITE = "/home/user/website/website/assets/"          # the public site's committed concept art (build/website-1029 at 10ccb4ff)
R_KIT = [SITE + "hero-kit-v2.webp", "THE KIT (project concept art, the house style): match all three devices exactly as drawn here: the sage-green landscape STATION with orange corner bumpers, its cross, four coloured keys and orange Confirm; the warm stone portrait COMPANION with charcoal bumpers, its cross, teal Call, grey Back, orange Confirm and the braided wrist strap; the warm stone CADDY dock with two cradles, its wide grey e-paper panel and its printer slot. Take the materials, the soft window light and the warm wooden table. Do not copy its screens or its lettering."]
R_FIELD = [SITE + "companion-map-hands.webp", "THE COMPANION IN THE FIELD (project concept art): the same handheld held in two relaxed hands outdoors, shallow depth of field. Take the hands, the device and the photographic feel; not its screen text."]
R_HOME = [SITE + "station-research-hands-2026-10.webp", "THE STATION AT HOME (project concept art): the same sage Station in warm lamp light on a wooden table at dusk. Take the device, the lamp light and the mood; not its screen text."]
R_PIP = [SITE + "tree-pip.webp", "PIP, A LOIKA (the game's creature): a squat charcoal quadruped with a cream belly, large orange eyes with cream rings, a crown of three green leaves, short ears. Any creature in the picture is a Loika like this one."]
STYLE = ("A Miniature Beasts product concept photograph in the house style of the references: realistic matte 3D-printed plastic devices, soft real light, shallow depth of field, saturated and playful colour "
         "(clear greens, teal, warm orange, cream), cosy and warm, never grimy, never sepia. Concept photograph, not CAD, not an illustration. ")
LOOP = ("ONE continuous wide picture that reads LEFT TO RIGHT as the game's loop, FIELD -> DOCK -> HOME, three zones flowing into each other with no borders, no panels and no split lines. "
        "LEFT THIRD, THE FIELD: outdoors in a soft morning fog over a green meadow, a hand holds the warm stone Companion; its small screen shows a bright pixel-art map half hidden under purple-grey fog. "
        "In the grass at the hand's feet a small rounded seed-pod, plum sized, warm green with a faint three-leaf mark, glints in a ray of light. "
        "MIDDLE THIRD, THE DOCK: the meadow runs up to an open garden door; just inside, on a warm wooden table in the doorway light, the stone Caddy dock; a hand is seating the Companion into its cradle, the cradle glowing softly mint; "
        "the Caddy's grey e-paper panel is lit but shows only two simple grey bars and two small grey squares (no readable text). "
        "RIGHT THIRD, HOME: a cosy room in warm lamp light at dusk, the sage Station standing on the same table; its screen shows a little painted room of moss and roots with two Loika, an adult and a small juvenile, side by side. "
        "A faint path of light or a worn footpath curls from the room back out through the door to the meadow, so the loop closes. "
        "The devices are the same size relation as in the kit reference, all three clearly visible. Light goes from cool fog daylight at left to warm amber lamp light at right. ")
TAIL = "NO text, letters, digits, logos, wordmarks, QR codes or barcodes anywhere: the devices' wordmark plates are blank. No people beyond hands and wrists. No paper coming out of the printer."
R_A = [os.path.join(ROOT, "source/raw/key-art/loop-a.jpg"), "THE PICTURE TO REWORK (pass one): keep its three devices exactly as they are drawn here, their screens, the hands, the foggy meadow, the open garden door, the wooden table, the lamp and the light."]
REWORK = ("Rework the supplied pass-one picture into ONE CONTINUOUS PAINTING with no seams: it now looks like three photographs side by side, with two hard vertical split lines; remove both. "
          "Make it one space seen by one camera: the room's wooden table runs from the middle to the right edge; the open garden door sits behind the Caddy, and through it and to its left the same foggy meadow continues out to the left edge, "
          "where the hand holds the Companion in the wet grass outside. The fog of the left side drifts in through the door and thins as the lamp light warms the right side. "
          "Keep the Caddy with the Companion being seated into its glowing mint cradle (its e-paper panel showing only grey bars), and the sage Station on the table at right with the two Loika on its screen. "
          "The pod in the grass is warm GREEN with a faint three-leaf mark, not gold. The soft trail of light starts at the Station, passes the Caddy and runs out through the door into the meadow to the pod, closing the loop. ")
JOBS = {
 # 16:9, the How it plays header; framing at eye level across the table
 "loop-a": "Camera at table height, a wide 35 mm view, gentle depth of field so the three zones stay readable.",
 # the same scene seen a little from above, more like a diorama
 "loop-b": "Camera slightly above, looking down about 20 degrees, like a cosy diorama; the table runs the whole width and the meadow grass spills onto its left end.",
}
EDIT = ("Use case: precise edit of the supplied pass-one picture. PRESERVE EVERY PIXEL of its three devices, their screens, the hands, the camera, the framing, the colours and the light; change only what follows. "
        "1. Remove the TWO hard vertical seams that make it look like three photographs side by side: across the first seam, the morning fog of the meadow drifts on into the doorway, so the grass and the garden door become one view; "
        "across the second seam, the same wooden table and the same wall continue from the doorway into the lamp-lit room, the light warming gradually from cool at left to amber at right. No line, edge or frame may remain between the zones. "
        "2. The pod in the grass becomes warm sage GREEN with a faint embossed three-leaf mark (shape and size unchanged, still glinting). "
        "3. The soft trail of light on the table continues past the Caddy, out through the doorway and across the grass to the pod, so the loop closes. ")
R_A_DEV = [os.path.join(ROOT, "source/raw/key-art/loop-a.jpg"), "THE DEVICES AND SCREENS (pass one): paint the three devices EXACTLY like these, with these screens: the warm stone Companion with its fogged pixel map in two hands; the stone Caddy with its mint-lit cradle and grey e-paper bars, the Companion with Pip on screen being seated into it; the sage Station with orange bumpers, its keys, and the two Loika (adult and juvenile) in a mossy root room on its screen. Do NOT copy its layout: it is three photographs side by side, which is wrong."]
R_C_COMP = [os.path.join(ROOT, "source/raw/key-art/loop-c.jpg"), "THE COMPOSITION ONLY (pass three): take ONLY this single continuous space and camera: the foggy meadow at left seen through and beside an open garden door, one wooden table running from the doorway to a lamp at right, a glowing trail. Its devices and its screen are WRONG: ignore them entirely."]
ONE = ("ONE single photograph of ONE continuous space, taken by one camera in one moment: not a triptych, not a collage, no panels, no vertical split lines. "
       "Left: outdoors in the foggy morning meadow just beyond an open garden door, two hands hold the Companion (its fogged pixel map on screen); a small sage-green seed-pod with a faint three-leaf mark glints in the grass below. "
       "Middle: through the doorway, on a warm wooden table that starts at the door, the Caddy, with the Companion seated into its mint-lit cradle. "
       "Right: the same table continues into the lamp-lit room, the sage Station standing on it, two Loika on its screen. "
       "A soft trail of warm light runs from the Station, past the Caddy, out through the doorway to the pod, closing the loop. Light: cool fog daylight at left warming to amber lamp light at right. ")
SCENE = ("One single wide photograph of one real place, one camera, one moment (never a triptych, a collage or panels side by side). "
         "We stand on a cottage's garden doorstep at dawn, the wide-open double door at the left of the frame, the wet meadow and soft morning fog outside, the cosy room inside at the right. "
         "Outside on the grass at the left, close to the camera, two hands hold the Companion with its fogged pixel map on screen, and a small sage-green seed-pod glints in the grass by the doorstep. "
         "Inside, one long warm wooden table starts at the doorway and runs to the right: near the door, the Caddy dock, the Companion with Pip on screen seated in its mint-lit cradle; further right under a warm table lamp, the sage Station, two Loika in a mossy root room on its screen. "
         "The fog drifts in over the doorstep; the light warms from cool dawn at left to amber lamplight at right. ")
JOBS_REWORK = {"loop-c": ("REWORK", "Camera at table height, a wide 35 mm view."), "loop-d": ("EDIT", ""), "loop-e": ("ONE", ""), "loop-f": ("SCENE", "")}
for cid, (kind, text) in JOBS_REWORK.items():
    if len(sys.argv) > 1 and cid not in sys.argv[1:]: continue
    job = {"name": f"key-art/{cid}", "model": MODEL, "aspect": "16:9", "size": "2K", "tries": 1, "refs": {"REWORK": [R_A, R_KIT, R_PIP], "EDIT": [R_A], "ONE": [R_KIT, R_A_DEV, R_C_COMP, R_PIP], "SCENE": [R_KIT, R_A_DEV, R_PIP]}[kind],
           "prompt": {"REWORK": STYLE + REWORK + text, "EDIT": EDIT, "ONE": STYLE + ONE, "SCENE": STYLE + SCENE}[kind] + "\n" + TAIL}
    json.dump([job], open(os.path.join(WORK, f"jobs-{cid}.json"), "w"), indent=1); print("wrote", f"jobs-{cid}.json")
for cid, text in JOBS.items():
    if len(sys.argv) > 1 and cid not in sys.argv[1:]: continue
    job = {"name": f"key-art/{cid}", "model": MODEL, "aspect": "16:9", "size": "2K", "tries": 1, "refs": [R_KIT, R_FIELD, R_HOME, R_PIP], "prompt": STYLE + LOOP + text + "\n" + TAIL}
    json.dump([job], open(os.path.join(WORK, f"jobs-{cid}.json"), "w"), indent=1); print("wrote", f"jobs-{cid}.json")
