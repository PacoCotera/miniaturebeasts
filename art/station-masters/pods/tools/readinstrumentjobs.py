"""Jobs for the READING INSTRUMENT: painted directions of the whole pod reading screen (the Specimen layout: the mibi on the left in the display's light,
the genome on the right as chapter rows, a lit helix between them), then the layers cut from the pick (the empty instrument ground, the helix as a lit object, the ring texture).
For THIS screen the house rule against glow is lifted (the owner wants the screen to glow): warm, soft, never harsh, never horror.
usage: python3 -I tools/readinstrumentjobs.py <set> [ids]   (set: dirs | layers; ids limit the layers written)   -> writes source/work/reading-instrument/jobs-<id>.json, one job each.
Run each with: python3 -I tools/gen.py source/work/reading-instrument/jobs-<id>.json (the Pacific-day total checked before each)."""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
WORK = os.path.join(ROOT, "source/work/reading-instrument"); os.makedirs(WORK, exist_ok=True)
os.makedirs(os.path.join(ROOT, "source/raw/reading-instrument"), exist_ok=True)
MODEL = "gemini-3-pro-image"
OWNER = "/home/user/iwq/results/T-20261026-vivarium/readroom-explore-4/owner-references/"
R_LOIKA = [os.path.join(WORK, "ref-loika-pod.png"),
           "THE CREATURE (project-owned game art): the Loika read in this pod: a small round creature, charcoal head and shoulders, russet-brown body with cream patches, cream belly and muzzle, big amber eyes, four stubby legs with pale toes, three green leaves on its head. Keep its design, proportions and colours exactly; never invent another creature."]
R_LAYOUT = [os.path.join(WORK, "ref-layout.png"),
            "THE PLAN (our current flat mockup of this screen, project-owned): take ONLY the layout: a top bar, a large dark display filling the screen, the creature large in the left half, a column of stacked rounded chapter rows on the right half with small round sockets on each row, a thin line from a point on the creature's head to one row. Do NOT copy its flat look, its text or its icons."]
R_LIGHT = [OWNER + "ref-10.png",
           "THE LIGHT (a reference the owner chose): take how the display GLOWS: the specimen lit by the display's own light, fine ring ticks, soft bloom, depth in the dark glass. Do not take the insect, the colours or the density."]
R_HELIX = [OWNER + "ref-06.png",
           "THE HELIX (a reference the owner chose): take the double helix drawn in light inside the screen, glowing softly. Not the colours, not the layout."]
HEAD = ("Paint the WHOLE screen of a cosy creature-breeding game on a handheld home research station, 16:9, a finished key art of one game screen: the READING SCREEN, "
        "where the player reads the genome of a mibi (a small cute creature) out of a seed pod. It is the nerdy part of the game, an analyser, but warm and loved, a lab that is a home. "
        "The whole picture is ONE glowing display set in a soft matte housing with a thin rim; the display glass has depth: a soft glow from inside, gentle bloom, very fine faint scanlines, light falling off into darker corners, a faint reflection on the glass, light spilling onto the housing rim. "
        "LAYOUT: in the left half, large, the Loika creature from the reference, three-quarter view, standing inside a round SPECIMEN CHAMBER of light drawn on the glass (a soft halo with thin concentric rings and fine ticks, a faint grid on the floor of the light); "
        "its BODY is painted in its true colours and lit by the display's glow with a soft rim light, while its HEAD is still unread: the head is drawn as a translucent SCAN of light (fine contour lines and scanlines, the shape only, no colour of its own). "
        "Between the creature and the right column, a tall vertical DOUBLE HELIX, the hero object: two ribbons of glowing glass twisting round each other with soft rungs, lit from within, with bloom, and along its length it changes colour in four soft bands from top to bottom: coral, sky blue, leaf green, lilac; a thin leader line of light runs from a point on the creature's head to the blue band of the helix, and on to the right. "
        "In the right half, a column of four stacked rounded translucent chapter rows on the glass, one per helix band, each edged in its band's colour, the second row (sky blue) highlighted with a warm amber outline, each row holding two or one small round sockets as glowing rings; the rows are quiet, glass, and EMPTY of writing. ")
TAIL = ("\nNO text, letters, digits, numbers, logos or icons anywhere (the game types its words later); keep the rows and the top bar empty of writing. "
        "Nothing scary: no horror, no flesh, no red alarm, no tentacles; the creature is cute and calm. The glow is soft and warm, never harsh neon. Fill the canvas edge to edge.")
DIRS = {
 "dir-a-lamp": "DIRECTION: THE LAMP LAB. Colour harmony: a deep warm plum-teal glass, the light of a pink-and-amber evening lamp; the display glows rose and peach at its centre and falls off to deep teal at the corners; the housing is a soft cream-pink matte plastic with rounded corners, like a beloved home appliance; the specimen chamber's halo is warm peach. Cosy, like a pink home lab by a window at dusk.",
 "dir-b-scope": "DIRECTION: THE SCOPE. Colour harmony: a deep blue-green glass lit in teal with amber accents, like a fine analyser; a large scope ring of fine amber ticks behind the creature, a soft teal grid across the whole glass, warm amber light pooled under the creature; the housing is dark matte graphite with a warm amber light line along its rim. Calm, precise, warm.",
 "dir-c-dusk": "DIRECTION: THE DUSK DISPLAY. Colour harmony: a deep indigo-violet glass lit with soft rose and gold; the specimen chamber is a cylinder of rose light rising from a glowing round pad under the creature; faint horizontal scan bands drift across the glass; the housing is matte slate-violet with a soft rose glow spilling onto it. Dreamy and soft.",
}
LAYERS = {
 # the empty instrument: the same display with nothing on it, the ground every state is drawn on
 "ground": ("Paint the SAME screen as the first reference image, at the same framing and in the same light, but EMPTY: remove the creature, the helix, the leader line, the chapter rows and the sockets and anything in the top bar. "
            "Keep ONLY the instrument: the housing and its rim, the glowing display glass with its depth, soft inner glow, bloom, fine faint scanlines and light falloff to the corners, and the specimen chamber of light on the left (its soft halo, the thin concentric rings and fine ticks, the faint grid on its floor) now empty, ready for a creature to stand in it. "
            "The right half of the glass is a calm, slightly darker empty area where the game will draw its rows. No text, digits, icons or widgets. Same colours, same light, same finish."),
 # second pass: the first ground came back too pale and milky for cream words to sit on, and its baked chamber ring cannot follow the creature's zoom
 "ground-open": ("Paint the SAME instrument as the first reference image, same framing, same housing and amber rim line, but the display is EMPTY and DEEPER: "
            "a dark blue-green glass (deep teal, much darker than a sky, so that cream writing will read on it anywhere), lit from inside by a soft warm amber glow pooled low in the left third (where a creature will stand) and a faint cool teal bloom high in the centre, falling off to near-black teal in the corners; "
            "very fine faint horizontal scanlines over all the glass, a soft fine grid barely visible, a faint diagonal reflection on the glass, a little amber light spilling onto the inner edge of the housing. "
            "NO ring, no chamber, no circle, no floor grid, no creature, no helix, no rows, no widgets, no text, digits or icons: only the glowing empty glass in its housing."),
 "helix": ("Paint ONE straight vertical DOUBLE HELIX, centred, running the full height of the canvas, on a PURE BLACK background, as a lit object for a game screen. "
           "Two smooth ribbons of frosted glowing glass twist round each other at an even pitch (about six full turns over the height), with thin soft rungs between them; the ribbon in front is brighter and wider, the one behind dimmer and thinner; "
           "each ribbon has a bright specular core and a soft bloom around it; the light is NEUTRAL WHITE with no colour of its own (the game tints it); the helix is perfectly regular from top to bottom so it can be repeated. Nothing else: no particles, no text, no background, no frame."),
 "rings": ("Paint a set of instrument light textures on a PURE BLACK background, neutral white light only (the game tints them), square: in the centre a large SCOPE RING made of three thin concentric rings of light, the outer one made of very fine regular tick marks, a few short arc segments between them, soft bloom, faint; "
           "the whole ring is clean, round, centred and fills most of the canvas, delicate and fine like the rings of an analyser display. No text, digits, icons, particles, or anything else."),
}
which = sys.argv[1] if len(sys.argv) > 1 else "dirs"
if which == "dirs":
    for cid, text in DIRS.items():
        job = {"name": f"reading-instrument/{cid}", "model": MODEL, "aspect": "16:9", "size": "2K", "tries": 1, "refs": [R_LOIKA, R_LAYOUT, R_LIGHT, R_HELIX], "prompt": HEAD + text + TAIL}
        json.dump([job], open(os.path.join(WORK, f"jobs-{cid}.json"), "w"), indent=1); print("wrote", f"jobs-{cid}.json")
else:
    PICK = os.path.join(WORK, "pick.png")
    for cid, text in LAYERS.items():
        if len(sys.argv) > 2 and cid not in sys.argv[2:]: continue
        refs = [[PICK, "THE PICKED DIRECTION (project-owned): the screen whose instrument, light and colours this layer must match."]]
        aspect = {"ground": "16:9", "ground-open": "16:9", "helix": "9:16", "rings": "1:1"}[cid]
        job = {"name": f"reading-instrument/layer-{cid}", "model": MODEL, "aspect": aspect, "size": "2K", "tries": 1, "refs": refs, "prompt": text}
        json.dump([job], open(os.path.join(WORK, f"jobs-layer-{cid}.json"), "w"), indent=1); print("wrote", f"jobs-layer-{cid}.json")
