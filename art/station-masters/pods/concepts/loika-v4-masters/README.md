# The Loika's version 4 masters, T-20261016-200: the five raw sheets (Oct 17)

Raw outputs for the art director to cut and gate, to `results/T-20261016-200/masters-spec.md` (work-queue 24a95147); nothing is cut, signed or placed. Inputs: the bare base keys in `floor/S01/keys/` composed on flat magenta by `floor/S01/guides/compose-m.py` (adult keys at the adult proof scale 1/0.733, juvenile at 1/0.601, as compose.json; feet 20 px above each cell's bottom); the composed inputs are `floor/S01/guides/compose-m-{adult,juvenile,pigments}.png`. The patch shapes come from the accepted Pip pair (`art/miniature-lives/assets/rich-pair-source.png`), used as a shape reference only. Jobs in `source/work/loika-v4-*.json`, calls in `log/calls.jsonl`.

| Sheet | File | What it is |
| --- | --- | --- |
| M1 | `M1-loika-v4-adult-patches-1264x848.jpg` | the six adult base keys (air, anchor, blink, crouch, curl, stand), with pale cream patches |
| M2 | `M2-loika-v4-adult-stripes-1264x848.jpg` | the same six, with stripes |
| M3 | `M3-loika-v4-juvenile-patches-1264x848.jpg` | the five juvenile keys (air, anchor, crouch, curl, stand; sixth cell empty), patches on the dark cap |
| M4 | `M4-loika-v4-juvenile-stripes-1264x848.jpg` | the same five, stripes on the cap |
| M5 | `M5-loika-v4-pigments-1264x848.jpg` | top row: adult anchor and juvenile anchor in russet; bottom row: in ash (#8e98a4) |

**Six requests: the five, plus one retry** (of the two allowed): M3's first try recoloured the juvenile's cream body dark charcoal (it is kept in `superseded/`); the retry told it to keep the cream body and paint the dark cap only, and came back right.

**What to check, honestly:**
- **Registration** is by eye only: poses, positions and outlines of M1 to M5 look identical to the inputs (the air key's painted shadow stays); the cut and the outside-the-coat difference test are yours.
- **M1/M2:** the patch and stripe shapes follow each pose; in the curl and blink keys the marks sit on the visible back. Stripes are on the body only, none on the head or legs.
- **M3:** the patches are broad and some run into the cream body's edge on the cap's lower border; **M4's** stripes cross the cap behind the head, two or three per key.
- **M5:** russet reads as a warm orange-brown, a little bright; ash reads blue-grey. The adult's toe pads came back cream in both rows (as in the base). Each pigment is one key per row, the ramps' ground truth, not a calibrated colour.
- The magenta ground has the base keys' pink fringe at the edges (the base keys' own), so the key needs the same despill as F1 and F2.
