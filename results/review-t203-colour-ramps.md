# Review: T-203 painted colour ramps — build/t-203-colour-ramps @ f7e6a4b0

Base: station-gate 273881ca. I ran everything in fresh worktrees of both commits (wasm and native face built in each), not from the report.

## Verdict: PASS

## Checks (head vs base)
| check | head | base |
|---|---|---|
| station tests | 478 / 478 | 470 / 470 |
| ui tests | 81 / 81 | 81 / 81 |
| face tests | 483 / 506 (23 Create failures) | 483 / 506 (the same 23) |
| public guard | exit 0 | exit 0 |
| face guard | ok | ok |
| place-masters | 903 placed, 0 problems | 903 placed, 0 problems |
| goldens | home, habitat, idle, vivarium, cargo, library, bench match; pods 8, create 16, incubator 14 fail | the same three fail with the same counts (38 FAIL lines each, same names) |

The pods, create and incubator golden failures and the 23 face Create failures are the base's own, not this change's. The head's home, habitat, idle and vivarium goldens match, so the 76 regenerated PNGs agree with what the code draws here.

## The coats come from the art director's ramp code, not tints
- `ramp_paint` in `tools/make-stand-layers.py` is textually the art director's (`results/T-20261016-200/make-window-masters.py`).
- I re-ran the art director's own function, loaded from the signed script, with the signed `layers/ramps.json` (sha256 1c2555a3…), the signed fur and zone masks, on the committed charcoal base. Compared with the ten committed coat bases (russet, ash, charcoal and russet, charcoal and ash, russet and ash; adult and juvenile): every pixel equal, max difference 0.
- Belly, eyes and crest keep their colour (the recolour goes only through the fur mask); the two-tone goes through the zone mask. Charcoal stays the signed base.

## A version-3 save draws as T-201 did: yes for read chapters, not for unread ones
I compared T-201's stand (273881ca) with this build over 9,600 draws: 400 seeds × marking-switch (on/on, off/off, on/off) × read-all/unread × adult/juvenile × Home and habitat sizes, genomes stamped version 3 with charcoal body-palette.
- Read chapters: 4,800 of 4,800 identical, picture id and pixels.
- Unread chapters: 4,800 of 4,800 differ. An unread chapter draws the common look, and the common colour is "russet and ash" (`stand-looks.json`, unchanged by this build; T-201 had no colour layer so it drew the charcoal base). This is what the ticket asks ("an unread chapter draws the common look"), but it means a v3 save's unread Loika is now drawn russet-and-ash. Not a defect; the lead and game designer should know that unread does not mean charcoal any more.

## The four real pods
`vivarium-four-real-pods-54.png`: four Loikas of four different coats on the Vivarium at 54 — charcoal with patches, russet with stripes, charcoal-and-ash with stripes and patches (bare head), ash with patches — matching the approved window's looks (seeds 165, 168, 10, 116); the test also holds the looks and four distinct pictures. Whether the painting reads as the approved window at this size is the art director's call, not a code check.

## Not covered
- Ring overlays (stand-ins), the sleeper curl and the moving atlases: out of scope, as T-201.
- Whether stripes and patches read apart at 54 px: the ticket leaves that to the art director.

No fix tickets.
